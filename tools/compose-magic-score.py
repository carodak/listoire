"""Compose two original, deterministic celesta/pad loops for the Orée chapter."""
import hashlib
import json
from pathlib import Path
import subprocess
import wave

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / ".fallow/library-cache/music"
RATE = 22050
FFMPEG = Path.home() / "AppData/Local/Programs/MediaTools/bin/ffmpeg.exe"


def note(track, midi, start, duration, gain, bell=False):
    count = min(int(duration * RATE), len(track) - int(start * RATE))
    if count <= 0:
        return
    t = np.arange(count) / RATE
    frequency = 440 * 2 ** ((midi - 69) / 12)
    if bell:
        signal = sum(weight * np.sin(2 * np.pi * frequency * partial * t) * np.exp(-t * decay)
                     for partial, weight, decay in [(1, 1, 1.5), (2.01, .25, 2.5), (2.756, .12, 3.5)])
        envelope = np.minimum(1, t / .008)
    else:
        signal = sum(np.sin(2 * np.pi * frequency * (1 + detune) * t) for detune in [-.002, 0, .002]) / 3
        signal += .15 * np.sin(2 * np.pi * frequency * 2 * t)
        envelope = np.minimum(1, t / 1.2) * np.minimum(1, np.maximum(0, (duration - t) / 1.8))
    offset = int(start * RATE)
    track[offset:offset + count] += gain * envelope * signal


def compose(name, tension):
    duration = 32 if tension else 64
    track = np.zeros(duration * RATE, dtype=np.float64)
    chords = [[50, 57, 61, 66], [47, 54, 57, 62], [43, 50, 57, 59], [45, 52, 57, 61]]
    for bar in range(duration // 8):
        chord = chords[bar % len(chords)]
        if tension:
            chord = [45, 52, 58, 64] if bar % 2 else [47, 54, 60, 65]
        for pitch in chord:
            note(track, pitch, bar * 8, 9, .025)
        melody = [0, 2, 1, 3, 2, 1] if not tension else [0, 2, 0, 3]
        for beat, index in enumerate(melody):
            note(track, chord[index] + 24, bar * 8 + beat * 1.15 + .4, 3.5, .048 if not tension else .028, True)
    left, right = track.copy(), track.copy()
    for delay, gain in [(.19, .17), (.37, .12), (.61, .08), (.93, .045)]:
        shift = int(delay * RATE)
        left[shift:] += track[:-shift] * gain
        right[shift + 53:] += track[:-shift - 53] * gain
    stereo = np.stack([left, right], axis=1)
    stereo *= .27 / max(.27, float(np.max(np.abs(stereo))))
    fade = np.minimum(1, np.arange(len(track)) / RATE) * np.minimum(1, np.arange(len(track))[::-1] / RATE)
    stereo *= fade[:, None]
    assert np.isfinite(stereo).all() and .003 < np.sqrt(np.mean(stereo ** 2)) < .2
    OUT.mkdir(parents=True, exist_ok=True)
    wav = OUT / f"{name}.wav"
    with wave.open(str(wav), "wb") as sound:
        sound.setnchannels(2)
        sound.setsampwidth(2)
        sound.setframerate(RATE)
        sound.writeframes((stereo * 32767).astype('<i2').tobytes())
    target = OUT / f"{name}.mp3"
    subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav),
                    "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "128k", str(target)], check=True)
    return {
        "id": name, "title": "The missing note" if tension else "Tomorrow there will be a lesson",
        "description": "Original celesta and soft pad score composed for Orée.",
        "mediaType": "audio", "sourceCollection": "Original score", "creator": "Listoire",
        "originalPath": "tools/compose-magic-score.py", "optimizedPath": target.relative_to(ROOT).as_posix(),
        "runtimePath": f"media/{name}.mp3", "technical": {"duration": duration, "sampleRate": RATE, "channels": 2},
        "verified": {"provenance": "original-procedural-composition", "license": "original-work"},
        "rights": {"officialStoryUse": "allowed", "thirdPartyResourceUse": "prohibited"},
        "suggested": {"roles": ["music"], "themes": ["magic", "school", "tension" if tension else "wonder"], "layerRoles": []},
        "sourceSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "runtimeSha256": hashlib.sha256(target.read_bytes()).hexdigest(), "runtimeBytes": target.stat().st_size,
    }


if __name__ == "__main__":
    entries = [compose("oree.wonder", False), compose("oree.silence", True)]
    path = ROOT / "assets/catalog/curated.json"
    catalog = json.loads(path.read_text(encoding="utf-8"))
    catalog["entries"] = [entry for entry in catalog["entries"] if entry["sourceCollection"] != "Original score"] + entries
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"originalScores": len(entries), "seconds": 96}))
