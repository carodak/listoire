import { defaultVolumes } from "../../contracts/presentation.ts";
export type AudioChannel = "sfx" | "ambience" | "music" | "narration";
export type PlaybackResult = "ended" | "blocked" | "aborted" | "error" | "timeout" | "unavailable";
interface SpeechControls {
  stop: () => void;
  pause: () => void;
  resume: () => void;
}
interface PlayOptions {
  url: string;
  channel: AudioChannel;
  signal: AbortSignal;
  loop?: boolean;
  rate?: number;
  onTime?: (seconds: number) => void;
  replace?: boolean;
  gain?: number;
  fadeMs?: number;
}
interface TrackHost {
  isPaused: () => boolean;
  applyVolumes: () => void;
  settle: (result: PlaybackResult) => void;
}
const clampRate = (rate: number) => Math.max(0.5, Math.min(2, rate));
/** A playing track that makes no progress this long (stalled, never starts, no "ended") gives up. */
const STALL_MS = 15000;

export class AudioManager {
  private readonly tracks = new Set<PlayingTrack>();
  private readonly volumes: Record<AudioChannel, number> = { ...defaultVolumes };
  private muted = false;
  private ducked = false;
  private musicGain = 1;
  private duckTimer: ReturnType<typeof setTimeout> | undefined;
  private paused = false;
  private narrationRate: number | null = null;
  private speech: SpeechControls | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private readonly factory: (url: string) => HTMLAudioElement;
  constructor(factory: (url: string) => HTMLAudioElement = (url) => new Audio(url)) {
    this.factory = factory;
  }

  private applyVolumes() {
    if (this.utterance) this.utterance.volume = this.muted ? 0 : this.volumes.narration;
    for (const track of this.tracks)
      track.audio.volume = this.muted
        ? 0
        : Math.min(
            1,
            track.gain *
              this.volumes[track.channel] *
              (["music", "ambience"].includes(track.channel) ? this.musicGain : 1),
          );
  }
  setVolume(channel: AudioChannel, volume: number) {
    this.volumes[channel] = Math.max(0, Math.min(1, volume));
    this.applyVolumes();
  }
  setMuted(value: boolean) {
    this.muted = value;
    this.applyVolumes();
  }
  setDucking(value: boolean) {
    if (this.ducked === value) return;
    this.ducked = value;
    clearTimeout(this.duckTimer);
    const from = this.musicGain;
    const to = value ? 0.25 : 1;
    const start = performance.now();
    const tick = () => {
      const fraction = Math.min(1, (performance.now() - start) / 600);
      this.musicGain = from + (to - from) * (fraction * fraction * (3 - 2 * fraction));
      this.applyVolumes();
      if (fraction < 1) this.duckTimer = setTimeout(tick, 24);
    };
    tick();
  }
  setRate(rate: number) {
    this.narrationRate = clampRate(rate);
    for (const track of this.tracks)
      if (track.channel === "narration") track.audio.playbackRate = this.narrationRate;
  }

  play(options: PlayOptions): Promise<PlaybackResult> {
    const { channel, replace = true, rate = 1 } = options;
    if (replace && channel !== "sfx") this.stopChannel(channel);
    const existing = [...this.tracks].filter((track) => track.channel === channel);
    if (existing.length >= (channel === "sfx" ? 4 : 2)) existing[0]?.stop();
    let audio: HTMLAudioElement;
    try {
      audio = this.factory(options.url);
    } catch {
      return Promise.resolve("unavailable");
    }
    return new Promise((resolve) => {
      const track = new PlayingTrack(audio, options, {
        isPaused: () => this.paused,
        applyVolumes: () => this.applyVolumes(),
        settle: (result) => {
          this.tracks.delete(track);
          resolve(result);
        },
      });
      audio.playbackRate = clampRate(channel === "narration" ? (this.narrationRate ?? rate) : rate);
      this.tracks.add(track);
      this.applyVolumes();
      track.start();
    });
  }

  crossfade(
    channel: "music" | "ambience",
    url: string,
    signal: AbortSignal,
    duration = 800,
    gain = 1,
    loop = true,
  ) {
    const old = [...this.tracks].filter((track) => track.channel === channel);
    const transport = this.play({ url, channel, signal, loop, replace: false, gain: 0 });
    const incoming = [...this.tracks].find(
      (track) => track.channel === channel && !old.includes(track),
    );
    const startingGains = old.map((track) => track.gain);
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started) / Math.max(1, duration));
      if (incoming) incoming.gain = progress * gain;
      old.forEach((track, index) => {
        track.gain = startingGains[index]! * (1 - progress);
      });
      this.applyVolumes();
      if (progress < 1 && !signal.aborted) timer = setTimeout(tick, 32);
      else old.forEach((track) => track.stop());
    };
    const cancel = () => {
      clearTimeout(timer);
      old.forEach((track) => track.stop());
    };
    signal.addEventListener("abort", cancel, { once: true });
    tick();
    void transport.then(() => {
      cancel();
      signal.removeEventListener("abort", cancel);
    });
    return transport;
  }

  speak(
    text: string,
    locale: string,
    rate: number,
    signal: AbortSignal,
    onBoundary: (index: number, length: number) => void,
    selection?: { uri: string; pitch?: number },
  ): Promise<PlaybackResult> {
    this.speech?.stop();
    const synth = globalThis.speechSynthesis;
    const available = synth
      ?.getVoices()
      .filter((voice) => voice.lang.toLowerCase().startsWith(locale.toLowerCase()));
    const voice = available?.find((voice) => voice.voiceURI === selection?.uri) ?? available?.[0];
    if (!synth || !voice || typeof SpeechSynthesisUtterance === "undefined" || signal.aborted)
      return Promise.resolve("unavailable");
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.volume = this.muted ? 0 : this.volumes.narration;
    utterance.voice = voice;
    utterance.lang = locale;
    utterance.pitch = Math.pow(2, (selection?.pitch ?? 0) / 12);
    utterance.rate = this.narrationRate ?? clampRate(rate);
    const timeoutMs = Math.min(180000, Math.max(12000, text.length * 200));
    return new Promise((resolve) => {
      const transport = speechTransport(
        synth,
        utterance,
        signal,
        onBoundary,
        timeoutMs,
        (result) => {
          this.speech = null;
          this.utterance = null;
          resolve(result);
        },
      );
      this.speech = transport;
      try {
        // Browsers can retain their paused flag after canceling the previous page.
        if (!this.paused) synth.resume();
        synth.speak(utterance);
        if (this.paused) transport.pause();
      } catch {
        transport.settle("blocked");
      }
    });
  }

  pause() {
    this.paused = true;
    for (const track of this.tracks) track.pause();
    this.speech?.pause();
  }
  resume() {
    this.paused = false;
    for (const track of this.tracks) track.resume();
    this.speech?.resume();
  }
  stopChannel(channel: AudioChannel) {
    for (const track of [...this.tracks]) if (track.channel === channel) track.stop();
    if (channel === "narration") this.speech?.stop();
  }
  stopAll() {
    for (const track of [...this.tracks]) track.stop();
    this.speech?.stop();
    this.setDucking(false);
  }
  dispose() {
    this.stopAll();
    clearTimeout(this.duckTimer);
  }
}

class PlayingTrack {
  readonly channel: AudioChannel;
  gain: number;
  paused: boolean;
  private settled = false;
  private watchdog: ReturnType<typeof setInterval> | undefined;
  private envelope: ReturnType<typeof setInterval> | undefined;
  private progressTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    readonly audio: HTMLAudioElement,
    private readonly options: PlayOptions,
    private readonly host: TrackHost,
  ) {
    this.channel = options.channel;
    this.gain = options.fadeMs ? 0 : (options.gain ?? 1);
    this.paused = host.isPaused();
    audio.loop = options.loop ?? false;
  }

  start() {
    this.audio.addEventListener("ended", this.ended);
    this.audio.addEventListener("error", this.error);
    this.audio.addEventListener("timeupdate", this.time);
    this.options.signal.addEventListener("abort", this.stop, { once: true });
    if (this.options.signal.aborted) this.stop();
    else this.attempt();
  }
  readonly stop = () => this.finish("aborted");
  private readonly ended = () => this.finish("ended");
  private readonly error = () => this.finish("error");
  private readonly time = () => this.options.onTime?.(this.audio.currentTime);

  pause() {
    this.paused = true;
    clearInterval(this.watchdog);
    clearInterval(this.envelope);
    clearInterval(this.progressTimer);
    this.audio.pause();
  }
  resume() {
    this.paused = false;
    this.attempt();
  }

  private finish(result: PlaybackResult) {
    if (this.settled) return;
    this.settled = true;
    this.pause();
    this.options.signal.removeEventListener("abort", this.stop);
    this.audio.removeEventListener("ended", this.ended);
    this.audio.removeEventListener("error", this.error);
    this.audio.removeEventListener("timeupdate", this.time);
    this.host.settle(result);
  }

  private attempt() {
    if (this.settled || this.host.isPaused()) return;
    const { fadeMs, onTime } = this.options;
    this.watch();
    if (fadeMs) this.envelope = setInterval(this.updateGain, 32);
    void this.audio
      .play()
      .then(() => {
        if (this.settled || this.paused) this.audio.pause();
        else if (onTime) {
          clearInterval(this.progressTimer);
          this.time();
          this.progressTimer = setInterval(this.time, 40);
        }
      })
      .catch(() => this.finish("blocked"));
  }

  /**
   * Media time, not wall time: a slow start, a slowed-down voice or a long track keep playing;
   * only a track whose position stops moving for STALL_MS is given up.
   */
  private watch() {
    clearInterval(this.watchdog);
    let position = this.audio.currentTime;
    let idle = 0;
    this.watchdog = setInterval(() => {
      idle = this.audio.currentTime === position ? idle + 1000 : 0;
      position = this.audio.currentTime;
      if (idle >= STALL_MS) this.finish("timeout");
    }, 1000);
  }

  private readonly updateGain = () => {
    const { audio } = this;
    const { loop, gain = 1, fadeMs = 0 } = this.options;
    const remaining =
      Number.isFinite(audio.duration) && !loop
        ? Math.max(0, audio.duration - audio.currentTime)
        : Infinity;
    this.gain =
      gain * Math.min(1, (audio.currentTime * 1000) / fadeMs, (remaining * 1000) / fadeMs);
    this.host.applyVolumes();
  };
}

function speechTransport(
  synth: SpeechSynthesis,
  utterance: SpeechSynthesisUtterance,
  signal: AbortSignal,
  onBoundary: (index: number, length: number) => void,
  timeoutMs: number,
  resolve: (result: PlaybackResult) => void,
) {
  let settled = false;
  let paused = false;
  let remaining = timeoutMs;
  let started = performance.now();
  const settle = (result: PlaybackResult) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    signal.removeEventListener("abort", stop);
    utterance.onboundary = null;
    utterance.onend = null;
    utterance.onerror = null;
    resolve(result);
  };
  const cancel = (result: PlaybackResult) => {
    if (settled) return;
    settle(result);
    synth.cancel();
  };
  const stop = () => cancel("aborted");
  const timeout = () => cancel("timeout");
  let timer = setTimeout(timeout, remaining);
  utterance.onboundary = (event) => {
    if (!settled) onBoundary(event.charIndex, event.charLength || 0);
  };
  utterance.onend = () => settle("ended");
  utterance.onerror = () => settle("error");
  signal.addEventListener("abort", stop, { once: true });
  return {
    stop,
    settle,
    pause: () => {
      if (paused || settled) return;
      paused = true;
      remaining -= performance.now() - started;
      clearTimeout(timer);
      synth.pause();
    },
    resume: () => {
      if (!paused || settled) return;
      paused = false;
      started = performance.now();
      timer = setTimeout(timeout, Math.max(1, remaining));
      synth.resume();
    },
  };
}
