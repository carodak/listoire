"""Local source-library extraction and technical inventory; never a reader dependency."""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import wave
import zipfile

ROOT = Path(__file__).resolve().parents[1]
LIBRARY = ROOT / "assets/images/heritage-library"
CATALOG = ROOT / "assets/catalog"


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def archive_targets(archive, destination):
    """Validate the entire directory before any writes, including Windows aliases."""
    seen = set()
    targets = []
    for entry in archive.infolist():
        name = entry.filename.replace("\\", "/")
        parts = PurePosixPath(name).parts
        if (not parts or name.startswith("/") or any(
            p in ("..", ".", ".listoire-extracted.json") or p.endswith(".listoire-part") or any(c in p for c in ':<>"|?*') or p.rstrip(" .") != p or
            p.split(".")[0].upper() in {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)], *[f"LPT{i}" for i in range(1, 10)]}
            for p in parts
        ) or stat.S_ISLNK(entry.external_attr >> 16) or entry.flag_bits & 1):
            raise ValueError(f"Unsafe archive member: {entry.filename}")
        target = destination.joinpath(*parts)
        if not target.resolve().is_relative_to(destination.resolve()):
            raise ValueError(f"Archive escapes destination: {entry.filename}")
        key = str(target).casefold()
        if key in seen:
            raise ValueError(f"Case-insensitive collision: {entry.filename}")
        seen.add(key)
        targets.append((entry, target))
    return targets


def extract(library=LIBRARY, catalog=CATALOG):
    results = []
    sources = sorted(library.rglob("*.zip"))
    scheduled = set(sources)
    for source in sources:
        try:
            destination = source.with_suffix("")
            if not destination.resolve().is_relative_to(library.resolve()):
                raise ValueError("Invalid extraction root")
            marker = destination / ".listoire-extracted.json"
            signature = {"size": source.stat().st_size, "mtimeNs": source.stat().st_mtime_ns}
            with zipfile.ZipFile(source) as archive:
                targets = archive_targets(archive, destination)
                required = sum(e.file_size for e, t in targets if not e.is_dir() and not t.exists())
                required += max((e.file_size for e, t in targets if not e.is_dir() and t.exists()), default=0)
                if shutil.disk_usage(library).free < required + 512 * 1024 * 1024:
                    raise OSError("Insufficient free disk space (including 512 MiB reserve)")
                recorded = json.loads(marker.read_text()) if marker.exists() else None
                valid_sizes = all(t.exists() and (e.is_dir() or t.stat().st_size == e.file_size) for e, t in targets)
                if recorded == signature and valid_sizes:
                    status = "already-extracted"
                else:
                    for entry, target in targets:
                        if entry.is_dir():
                            target.mkdir(parents=True, exist_ok=True)
                            continue
                        target.parent.mkdir(parents=True, exist_ok=True)
                        # Streaming through ZipFile validates each member's CRC before replacement.
                        temporary = target.with_name(target.name + ".listoire-part")
                        if not temporary.resolve().is_relative_to(destination.resolve()):
                            raise ValueError("Temporary archive target escapes destination")
                        with archive.open(entry) as incoming, temporary.open("wb") as outgoing:
                            shutil.copyfileobj(incoming, outgoing)
                        temporary.replace(target)
                    write_json(marker, signature)
                    status = "extracted"
                results.append({"archive": source.relative_to(library).as_posix(), "status": status, "files": sum(not e.is_dir() for e, _ in targets), "expandedBytes": sum(e.file_size for e, _ in targets)})
                for nested in sorted(destination.rglob("*.zip")):
                    if nested not in scheduled:
                        scheduled.add(nested)
                        sources.append(nested)
        except (OSError, ValueError, zipfile.BadZipFile, RuntimeError) as error:
            results.append({"archive": source.relative_to(library).as_posix(), "status": "failed", "error": str(error)})
        if len(results) % 25 == 0:
            print(f"Archives: {len(results)}", flush=True)
    for marker in sorted(library.rglob(".listoire-extracted.json")):
        archive = marker.parent.with_name(marker.parent.name + ".zip")
        if not archive.exists():
            results.append({"archive": archive.relative_to(library).as_posix(), "status": "extracted-source-removed", "evidence": "completed extraction marker; original archive subsequently removed by user", "sourceSignature": json.loads(marker.read_text())})
    write_json(catalog / "extraction-report.json", {"archives": results})
    print(json.dumps({"archives": len(results), "failed": sum(r["status"] == "failed" for r in results)}))
    return not any(r["status"] == "failed" for r in results)


def inventory():
    from PIL import Image
    for kind, folder in [("audio", ROOT / "assets/audio"), ("images", ROOT / "assets/images")]:
        entries = []
        errors = []
        for path in sorted(folder.rglob("*")):
            if not path.is_file() or path.name.startswith(".listoire") or path.suffix.lower() == ".zip" or "reference-house" in path.relative_to(folder).parts:
                continue
            relative = path.relative_to(ROOT).as_posix()
            technical = {"format": path.suffix.lower().lstrip("."), "bytes": path.stat().st_size}
            media_type = "audio" if path.suffix.lower() in (".wav", ".mp3", ".flac", ".ogg") else "image" if path.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".gif", ".tif", ".tiff") else "document"
            try:
                if path.suffix.lower() == ".wav":
                    with wave.open(str(path)) as sound:
                        technical.update(duration=sound.getnframes()/sound.getframerate(), sampleRate=sound.getframerate(), channels=sound.getnchannels(), bitsPerSample=sound.getsampwidth()*8)
                elif media_type == "image":
                    with Image.open(path) as image:
                        technical.update(width=image.width, height=image.height, aspectRatio=round(image.width/image.height, 5), colorMode=image.mode)
            except Exception as error:
                try:
                    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=sample_rate,channels,bits_per_raw_sample", "-of", "json", str(path)], check=True, capture_output=True, text=True)
                    probe = json.loads(result.stdout)
                    stream = probe["streams"][0]
                    technical.update(duration=float(probe["format"]["duration"]), sampleRate=int(stream["sample_rate"]), channels=stream["channels"], bitsPerSample=int(stream.get("bits_per_raw_sample") or 32))
                except Exception as fallback:
                    errors.append({"path": relative, "error": str(error), "fallbackError": str(fallback)})
            collection = path.relative_to(folder).parts[0]
            entries.append({"id": f"{kind}." + hashlib.sha256(relative.encode()).hexdigest()[:20], "originalPath": relative, "optimizedPath": None, "mediaType": media_type, "sourceCollection": collection, "technical": technical, "verified": {"provenance": "local-file", "classification": "unreviewed", "license": "unverified"}, "suggested": {"roles": [], "themes": [], "moods": [], "tags": []}, "rights": {"officialStoryUse": "unverified", "thirdPartyResourceUse": "unverified"}})
        write_json(CATALOG / f"{kind}.json", {"schemaVersion": 1, "entries": entries, "technicalErrors": errors})
        print(f"{kind}: {len(entries)} files, {len(errors)} technical errors", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["extract", "inventory", "all"])
    args = parser.parse_args()
    okay = extract() if args.command in ("extract", "all") else True
    if args.command in ("inventory", "all"):
        inventory()
    raise SystemExit(0 if okay else 1)
