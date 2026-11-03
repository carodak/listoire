export type AudioChannel = "sfx" | "ambience" | "music" | "narration";
export type PlaybackResult = "ended" | "blocked" | "aborted" | "error" | "timeout" | "unavailable";
export interface Playback {
  finished: Promise<PlaybackResult>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
}
interface Track {
  channel: AudioChannel;
  audio: HTMLAudioElement;
  gain: number;
  paused: boolean;
  stop: () => void;
  pause: () => void;
  resume: () => void;
}

export class AudioManager {
  private readonly tracks = new Set<Track>();
  private readonly volumes: Record<AudioChannel, number> = {
    sfx: 0.65,
    ambience: 0.3,
    music: 0.3,
    narration: 0.8,
  };
  private muted = false;
  private ducked = false;
  private paused = false;
  private speech: Playback | null = null;
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
              (this.ducked && ["music", "ambience"].includes(track.channel) ? 0.25 : 1),
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
    this.ducked = value;
    this.applyVolumes();
  }
  setRate(rate: number) {
    for (const track of this.tracks)
      if (track.channel === "narration")
        track.audio.playbackRate = Math.max(0.5, Math.min(2, rate));
  }

  play({
    url,
    channel,
    signal,
    loop = false,
    rate = 1,
    onTime,
    replace = true,
    maxMs = 120000,
    gain = 1,
  }: {
    url: string;
    channel: AudioChannel;
    signal: AbortSignal;
    loop?: boolean;
    rate?: number;
    onTime?: (seconds: number) => void;
    replace?: boolean;
    maxMs?: number;
    gain?: number;
  }): Playback {
    if (replace && channel !== "sfx") this.stopChannel(channel);
    const existing = [...this.tracks].filter((track) => track.channel === channel);
    if (existing.length >= (channel === "sfx" ? 4 : 2)) existing[0]?.stop();
    let resolve!: (result: PlaybackResult) => void;
    const finished = new Promise<PlaybackResult>((done) => {
      resolve = done;
    });
    let audio: HTMLAudioElement;
    try {
      audio = this.factory(url);
    } catch {
      resolve("unavailable");
      return { finished, stop() {}, pause() {}, resume() {}, seek() {} };
    }
    let settled = false;
    const finish = (result: PlaybackResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(startTimer);
      clearTimeout(deadline);
      audio.pause();
      signal.removeEventListener("abort", abort);
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("error", error);
      audio.removeEventListener("timeupdate", time);
      this.tracks.delete(track);
      resolve(result);
    };
    const attempt = () => {
      if (settled || this.paused) return;
      startTimer = setTimeout(() => finish("timeout"), 4000);
      if (!loop)
        deadline = setTimeout(() => finish("timeout"), Math.max(1000, Math.min(180000, maxMs)));
      void audio
        .play()
        .then(() => {
          clearTimeout(startTimer);
          if (settled) audio.pause();
        })
        .catch(() => finish("blocked"));
    };
    const abort = () => finish("aborted");
    const ended = () => finish("ended");
    const error = () => finish("error");
    const time = () => onTime?.(audio.currentTime);
    const track: Track = {
      channel,
      audio,
      gain,
      paused: this.paused,
      stop: abort,
      pause: () => {
        track.paused = true;
        clearTimeout(startTimer);
        clearTimeout(deadline);
        audio.pause();
      },
      resume: () => {
        track.paused = false;
        attempt();
      },
    };
    let startTimer: ReturnType<typeof setTimeout> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    audio.loop = loop;
    audio.playbackRate = Math.max(0.5, Math.min(2, rate));
    this.tracks.add(track);
    this.applyVolumes();
    audio.addEventListener("ended", ended);
    audio.addEventListener("error", error);
    audio.addEventListener("timeupdate", time);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    else attempt();
    return {
      finished,
      stop: abort,
      pause: track.pause,
      resume: track.resume,
      seek: (seconds) => {
        if (!settled && Number.isFinite(seconds))
          audio.currentTime = Math.max(
            0,
            Math.min(Number.isFinite(audio.duration) ? audio.duration : seconds, seconds),
          );
      },
    };
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
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started) / Math.max(1, duration));
      if (incoming) incoming.gain = progress * gain;
      for (const track of old) track.gain = 1 - progress;
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
    void transport.finished.then(() => {
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
  ): Playback {
    this.speech?.stop();
    const synth = globalThis.speechSynthesis;
    const voice = synth
      ?.getVoices()
      .find((voice) => voice.lang.toLowerCase().startsWith(locale.toLowerCase()));
    if (!synth || !voice || typeof SpeechSynthesisUtterance === "undefined" || signal.aborted)
      return {
        finished: Promise.resolve("unavailable"),
        stop() {},
        pause() {},
        resume() {},
        seek() {},
      };
    const utterance = new SpeechSynthesisUtterance(text);
    this.utterance = utterance;
    utterance.volume = this.muted ? 0 : this.volumes.narration;
    utterance.voice = voice;
    utterance.lang = locale;
    utterance.rate = Math.max(0.5, Math.min(2, rate));
    let resolve!: (result: PlaybackResult) => void;
    let settled = false;
    const finished = new Promise<PlaybackResult>((done) => {
      resolve = done;
    });
    const cleanup = (result: PlaybackResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", stop);
      utterance.onboundary = null;
      utterance.onend = null;
      utterance.onerror = null;
      this.speech = null;
      this.utterance = null;
      resolve(result);
    };
    const stop = () => {
      if (settled) return;
      cleanup("aborted");
      synth.cancel();
    };
    let remaining = Math.min(180000, Math.max(12000, text.length * 200));
    let started = performance.now();
    let paused = false;
    const timeout = () => {
      cleanup("timeout");
      synth.cancel();
    };
    let timer = setTimeout(timeout, remaining);
    utterance.onboundary = (event) => {
      if (!settled) onBoundary(event.charIndex, event.charLength || 0);
    };
    utterance.onend = () => cleanup("ended");
    utterance.onerror = () => cleanup("error");
    signal.addEventListener("abort", stop, { once: true });
    const transport = {
      finished,
      stop,
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
      seek() {},
    };
    this.speech = transport;
    try {
      synth.speak(utterance);
      if (this.paused) transport.pause();
    } catch {
      cleanup("blocked");
    }
    return transport;
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
  }
}
