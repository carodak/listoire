"""Local Chatterbox generation, exact-text cache, publication manifest and loopback preview."""
import argparse
import base64
import copy
import gc
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import threading
import unicodedata
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/narration"
CACHE = BASE / "cache"
os.environ.setdefault("HF_HOME", str(BASE / "models/cache"))
os.environ.setdefault("TORCH_HOME", str(BASE / "models/torch"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
os.environ.setdefault("HF_HUB_DISABLE_XET", "1")
CONFIG = json.loads((ROOT / "tools/narration-voices.json").read_text(encoding="utf-8"))
LOCK = threading.Lock()


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def effective_settings(model_id, overrides=None):
    settings = CONFIG["settings"]
    parameters = {"temperature": settings["nanoTemperature"]} if model_id == "nano" else {name: settings[name] for name in ["exaggeration", "cfg_weight", "temperature"]}
    applied = {"seed": settings["seed"], "mp3Kbps": settings["mp3Kbps"], "parameters": parameters}
    if overrides:
        applied["seed"] = overrides["seed"]
        applied["parameters"]["temperature"] = overrides["temperature"]
        if model_id != "nano":
            applied["parameters"].update(exaggeration=overrides["exaggeration"], cfg_weight=overrides["cfgWeight"])
        applied["pitch"] = overrides["pitch"]
    return applied


def cache_key(segment, voice, model):
    return sha(json.dumps({"segmentId": segment["segmentId"], "text": unicodedata.normalize("NFC", segment["text"]), "locale": segment["locale"], "voice": {key: voice[key] for key in ["id", "model", "reference"]}, "model": {"repo": model.get("repo", ""), "revision": model["revision"]}, "settings": effective_settings(voice["model"], voice.get("settings")), "source": CONFIG["sourceRevision"], **({"settingsKey": voice["settingsKey"]} if "settingsKey" in voice else {})}, sort_keys=True, ensure_ascii=False).encode())


def current_entries(entries, segments, models):
    variants = {(segment["locale"], segment["segmentId"], segment["spokenTextDigest"]): segment for segment in segments}
    current = {}
    for entry in entries:
        clip = entry["clip"]
        segment = variants.get((clip["locale"], clip["segmentId"], clip["spokenTextDigest"]))
        voice = next((voice for voice in CONFIG["voices"] if voice["id"] == clip["voiceId"]), None)
        model = next((model for model in models if voice and model["id"] == voice["model"]), None)
        if segment and voice and model and entry["key"] == cache_key(segment, voice, model):
            current[entry["key"]] = entry
    return current


def voice_for(locale, requested=None):
    voices = [voice for voice in CONFIG["voices"] if locale in voice["locales"]]
    return next(voice for voice in voices if voice["id"] == requested) if requested else voices[0]


def authorized_segment(payload):
    _, voice = authoring_segment(payload)
    text = unicodedata.normalize("NFC", payload["text"])
    segment = next((entry for entry in read(BASE / "segments.json")["segments"] if entry["locale"] == payload["locale"] and entry["segmentId"] == payload["segmentId"] and entry["text"] == text), None)
    if not segment:
        raise ValueError("Text is not an exported Ink variant; rerun narration:export")
    return segment, voice


def authoring_segment(payload):
    required = {"storyId", "locale", "segmentId", "text", "voiceId"}
    if not isinstance(payload, dict) or not required <= payload.keys() or payload.keys() - required - {"profile", "settings", "settingsKey"} or payload["storyId"] != "house":
        raise ValueError("Unknown editor narration request")
    if not isinstance(payload["text"], str) or not 1 <= len(payload["text"]) <= 10000:
        raise ValueError("Editor narration text is outside bounds")
    if not isinstance(payload["segmentId"], str) or not re.fullmatch(r"[a-z][a-z0-9.-]{0,119}", payload["segmentId"]):
        raise ValueError("Invalid editor segment ID")
    text = unicodedata.normalize("NFC", payload["text"])
    if payload["locale"] not in ("en", "fr"):
        raise ValueError("Unsupported narration language")
    profile = payload.get("profile")
    if profile:
        if not isinstance(profile, dict) or profile.keys() - {"id", "label", "model", "reference"} or profile.get("id") != payload["voiceId"] or not re.fullmatch(r"[a-z][a-z0-9.-]{0,100}", profile["id"]):
            raise ValueError("Invalid voice profile")
        if profile.get("model") not in (("nano", "multilingual-v3") if payload["locale"] == "en" else ("multilingual-v3",)):
            raise ValueError("Unsupported voice model")
        reference = profile.get("reference")
        if reference:
            validate_reference(reference)
            voice = {"id": profile["id"], "model": profile["model"], "reference": sha(reference["data"].encode()), "example": reference}
        else:
            voice = dict(voice_for(payload["locale"], profile["id"]))
            if voice["model"] != profile["model"]:
                raise ValueError("Voice model does not match")
    else:
        voice = dict(voice_for(payload["locale"], payload["voiceId"]))
    if "settings" in payload:
        limits = {"temperature": (.1, 2), "exaggeration": (0, 2), "cfgWeight": (0, 1), "seed": (0, 2147483647), "pitch": (-12, 12)}
        settings = payload["settings"]
        if not isinstance(settings, dict) or settings.keys() != limits.keys() or any(type(settings[name]) not in (int, float) or not low <= settings[name] <= high for name, (low, high) in limits.items()) or not isinstance(settings["seed"], int):
            raise ValueError("Invalid speech settings")
        voice["settings"] = settings
    if "settingsKey" in payload:
        if not isinstance(payload["settingsKey"], str) or not re.fullmatch(r"[a-f0-9]{64}", payload["settingsKey"]):
            raise ValueError("Invalid settings digest")
        voice["settingsKey"] = payload["settingsKey"]
    return {"locale": payload["locale"], "segmentId": payload["segmentId"], "text": text, "spokenTextDigest": sha(text.encode())}, voice


def validate_reference(reference):
    if not isinstance(reference, dict) or reference.keys() != {"name", "data", "rights"} or not isinstance(reference["rights"], str) or not 1 <= len(reference["rights"].strip()) <= 500 or not isinstance(reference["name"], str) or not 1 <= len(reference["name"]) <= 120:
        raise ValueError("Voice reference needs permission and a filename")
    data = reference["data"]
    if not isinstance(data, str) or len(data) > 6_800_000:
        raise ValueError("Voice reference exceeds 5 MB")
    match = re.fullmatch(r"data:audio/(mpeg|wav);base64,([A-Za-z0-9+/=]+)", data)
    if not match:
        raise ValueError("Voice reference must be MP3 or WAV")
    decoded = base64.b64decode(match[2], validate=True)
    if not 1 <= len(decoded) <= 5_000_000:
        raise ValueError("Voice reference exceeds 5 MB")
    return ("mp3" if match[1] == "mpeg" else "wav"), decoded


def reference_file(reference):
    format_name, data = validate_reference(reference)
    directory = CACHE / "references"
    directory.mkdir(parents=True, exist_ok=True)
    source = directory / f"{sha(data)}.{format_name}"
    source.write_bytes(data)
    # Force an audio demuxer so uploaded bytes cannot resolve playlists or external URLs.
    probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-protocol_whitelist", "file,pipe", "-f", format_name, "-show_entries", "format=duration", "-of", "json", str(source)], timeout=10))
    duration = float(probe.get("format", {}).get("duration", 0))
    if not 6 <= duration <= 30:
        source.unlink(missing_ok=True)
        raise ValueError("Voice reference must be between 6 and 30 seconds")
    destination = source.with_suffix(".condition.wav")
    subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-y", "-protocol_whitelist", "file,pipe", "-f", format_name, "-i", str(source), "-t", "30", "-ac", "1", "-ar", "24000", "-af", "loudnorm=I=-23:TP=-2:LRA=7", str(destination)], check=True, capture_output=True, timeout=15)
    return str(destination)


class Generator:
    def __init__(self):
        self.model = None
        self.model_id = None

    def load(self, voice):
        if self.model_id == voice["model"]:
            return
        import torch
        self.model = None
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch.set_num_threads(min(8, os.cpu_count() or 4))
        location = BASE / "models" / voice["model"]
        if voice["model"] == "nano":
            from chatterbox.tts_turbo import ChatterboxTurboTTS
            self.model = ChatterboxTurboTTS.from_local(location, device=device, nano=True)
        else:
            from chatterbox.mtl_tts import ChatterboxMultilingualTTS
            from chatterbox.models.tokenizers import tokenizer
            from unittest.mock import patch
            # shortcut: upstream eagerly loads Chinese-only resources; remove when EN/FR initialization is lazy.
            with patch.object(tokenizer, "ChineseCangjieConverter", return_value=None):
                self.model = ChatterboxMultilingualTTS.from_local(location, device=device, t3_model="v3")
        self.model_id = voice["model"]
        self.default_conditioning = copy.deepcopy(self.model.conds)
        print(f"Loaded {self.model_id} on {device}", flush=True)

    def generate(self, segment, voice):
        model = next(model for model in read(ROOT / "assets/catalog/narration-models.json")["models"] if model["id"] == voice["model"])
        key = cache_key(segment, voice, model)
        CACHE.mkdir(parents=True, exist_ok=True)
        metadata = CACHE / f"{key}.json"
        mp3 = CACHE / f"{key}.mp3"
        if metadata.exists() and mp3.exists():
            cached = read(metadata)
            if sha(mp3.read_bytes()) == cached["clip"]["audioDigest"]:
                return cached
        self.load(voice)
        import numpy as np
        import soundfile as sf
        import torch
        applied = effective_settings(voice["model"], voice.get("settings"))
        torch.manual_seed(applied["seed"])
        arguments = dict(applied["parameters"])
        if voice["model"] != "nano": arguments["language_id"] = segment["locale"]
        self.model.conds = copy.deepcopy(self.default_conditioning)
        if "example" in voice:
            arguments["audio_prompt_path"] = reference_file(voice["example"])
            # Nano's NumPy loudness scaling promotes float32 to float64; references are normalized above.
            if voice["model"] == "nano": arguments["norm_loudness"] = False
        with torch.inference_mode():
            waveform = self.model.generate(segment["text"], **arguments)
        samples = waveform.detach().cpu().numpy().reshape(-1)
        duration = len(samples) / self.model.sr
        if not np.isfinite(samples).all() or not 0.2 <= duration <= 180 or np.max(np.abs(samples)) < 0.001:
            raise ValueError("Generated waveform is empty, non-finite, silent or outside duration bounds")
        wav = CACHE / f"{key}.wav"
        sf.write(wav, samples, self.model.sr, subtype="PCM_16")
        temporary = CACHE / f"{key}.pending.mp3"
        pitch_factor = 2 ** (applied.get("pitch", 0) / 12)
        filters = f"asetrate={self.model.sr * pitch_factor},aresample=44100,atempo={1 / pitch_factor},loudnorm=I=-20:TP=-2:LRA=7"
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-ar", "44100", "-af", filters, "-codec:a", "libmp3lame", "-b:a", f"{applied['mp3Kbps']}k", str(temporary)], check=True)
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(temporary), "-f", "null", "-"], check=True, capture_output=True)
        temporary.replace(mp3)
        probe = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(mp3)]))
        clip = {"segmentId": segment["segmentId"], "locale": segment["locale"], "voiceId": voice["id"], "spokenTextDigest": segment["spokenTextDigest"], "assetId": "narration." + key, "audioDigest": sha(mp3.read_bytes()), "durationMs": round(float(probe["format"]["duration"]) * 1000), "marks": [], "approval": {"status": "preview", "reviewer": "Automated waveform/decode checks; human listening pending", "rightsReference": f"{model['repo']} MIT; provider built-in conditioning; locally authored Ink"}}
        if "settingsKey" in voice:
            clip["settingsKey"] = voice["settingsKey"]
        if "example" in voice:
            clip["approval"]["rightsReference"] = f"{model['repo']} MIT; voice reference: {voice['example']['rights']}; locally authored Ink"
        result = {"key": key, "clip": clip, "originalPath": wav.relative_to(ROOT).as_posix(), "optimizedPath": mp3.relative_to(ROOT).as_posix(), "model": model, "settings": applied, "sourceRevision": CONFIG["sourceRevision"]}
        write(metadata, result)
        print(f"Generated {segment['locale']} {segment['segmentId']} {duration:.1f}s ({voice['id']})", flush=True)
        return result


def prepare(args):
    source = read(BASE / "segments.json")
    manifest_path = BASE / "publication.json"
    previous = read(manifest_path) if manifest_path.exists() else {"clips": []}
    clips = current_entries(previous["clips"], source["segments"], read(ROOT / "assets/catalog/narration-models.json")["models"])
    generator = Generator()
    segments = [segment for segment in source["segments"] if args.locale == "both" or segment["locale"] == args.locale]
    if args.limit:
        segments = segments[:args.limit]
    for segment in segments:
        result = generator.generate(segment, voice_for(segment["locale"], args.voice))
        clips[result["key"]] = result
        write(manifest_path, {"storyId": "house", "inkDigests": source["inkDigests"], "clips": list(clips.values())})
        write(ROOT / "assets/catalog/narration-output.json", {"storyId": "house", "inkDigests": source["inkDigests"], "clips": list(clips.values())})
        for entry in clips.values():
            shutil.copyfile(ROOT / entry["optimizedPath"], ROOT / "stories/house/media" / f"narration.{entry['key']}.mp3")
        write(ROOT / "stories/house/narration.json", {"inkDigests": source["inkDigests"], "clips": [{"key": entry["key"], "clip": entry["clip"]} for entry in clips.values()]})


def download():
    from huggingface_hub import HfApi, snapshot_download
    path = ROOT / "assets/catalog/narration-models.json"
    records = read(path)["models"] if path.exists() else []
    for name, repo, patterns in [("nano", "ResembleAI/chatterbox-nano", ["*.safetensors", "*.json", "*.txt", "conds.pt", "*.model", "LICENSE*"]), ("multilingual-v3", "ResembleAI/chatterbox", ["ve.pt", "s3gen.pt", "t3_mtl23ls_v3.safetensors", "grapheme_mtl_merged_expanded_v1.json", "conds.pt", "Cangjie5_TC.json", "LICENSE*"])]:
        record = next((record for record in records if record["id"] == name), None)
        if not record:
            record = {"id": name, "repo": repo, "revision": HfApi(token=False).model_info(repo).sha, "path": f"assets/narration/models/{name}", "license": "MIT"}
            records.append(record)
        snapshot_download(repo, revision=record["revision"], allow_patterns=patterns, local_dir=ROOT / record["path"], token=False, max_workers=2)
        write(path, {"models": records})


def serve():
    generator = Generator()
    class Handler(BaseHTTPRequestHandler):
        def allowed(self):
            host = urlparse("http://" + self.headers.get("Host", "")).hostname
            origin = self.headers.get("Origin")
            return host in ("127.0.0.1", "localhost") and (not origin or urlparse(origin).hostname in ("127.0.0.1", "localhost"))

        def respond(self, status, data, content_type="application/json"):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "no-store" if content_type == "application/json" else "private, max-age=31536000, immutable")
            self.end_headers()
            try:
                self.wfile.write(data)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def do_POST(self):
            if not self.allowed() or self.path not in ("/api/narration", "/api/narration/editor-preview") or self.headers.get("Content-Type") != "application/json":
                self.respond(403, b'{}'); return
            try:
                size = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                self.respond(400, b'{}'); return
            if not 0 < size <= 7_000_000:
                self.respond(413, b'{}'); return
            try:
                authorize = authoring_segment if self.path.endswith("/editor-preview") else authorized_segment
                segment, voice = authorize(json.loads(self.rfile.read(size)))
                if not LOCK.acquire(timeout=2):
                    self.respond(429, b'{}'); return
                try:
                    result = generator.generate(segment, voice)
                finally:
                    LOCK.release()
                self.respond(200, json.dumps({"clip": result["clip"], "audioPath": f"/api/narration/audio/{result['key']}.mp3"}).encode())
            except (ValueError, StopIteration, KeyError, TypeError):
                self.respond(400, b'{}')
            except Exception as error:
                print(type(error).__name__, str(error), flush=True)
                self.respond(503, b'{"error":"Local generation unavailable"}')

        def do_GET(self):
            match = re.fullmatch(r"/api/narration/audio/([a-f0-9]{64})\.mp3", self.path)
            file = CACHE / f"{match[1]}.mp3" if match else None
            if self.allowed() and file and file.is_file():
                self.respond(200, file.read_bytes(), "audio/mpeg")
            else:
                self.respond(404, b'{}')
    print("Local narration preview listening on http://127.0.0.1:8765 (Ctrl+C to stop)", flush=True)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    server.daemon_threads = True
    try:
        server.serve_forever()
    finally:
        server.server_close()


def verify():
    source = read(BASE / "segments.json")
    publication = read(BASE / "publication.json") if (BASE / "publication.json").exists() else {"clips": []}
    publication["clips"] = list(current_entries(publication["clips"], source["segments"], read(ROOT / "assets/catalog/narration-models.json")["models"]).values())
    missing = []
    checked = set()
    for segment in source["segments"]:
        voice = voice_for(segment["locale"])
        entry = next((entry for entry in publication["clips"] if all(entry["clip"][key] == value for key, value in {"segmentId": segment["segmentId"], "locale": segment["locale"], "spokenTextDigest": segment["spokenTextDigest"], "voiceId": voice["id"]}.items())), None)
        if not entry:
            missing.append(f"{segment['locale']}:{segment['segmentId']}"); continue
        file = ROOT / entry["optimizedPath"]
        assert sha(file.read_bytes()) == entry["clip"]["audioDigest"], file
        subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", str(file), "-f", "null", "-"], check=True, capture_output=True)
        checked.add(entry["key"])
    print(json.dumps({"expectedDefaultVoiceVariants": len(source["segments"]), "verifiedClips": len(checked), "missing": missing, "humanListeningReview": "pending"}))
    return not missing


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["download", "prepare", "serve", "verify"])
    parser.add_argument("--locale", choices=["en", "fr", "both"], default="both")
    parser.add_argument("--voice")
    parser.add_argument("--limit", type=int)
    arguments = parser.parse_args()
    if arguments.command == "download": download()
    elif arguments.command == "prepare": prepare(arguments)
    elif arguments.command == "verify": raise SystemExit(0 if verify() else 1)
    else: serve()
