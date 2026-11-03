"""Optimize only the explicit curated house allowlist; original collections are read-only."""
import hashlib
import json
from pathlib import Path
import subprocess
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
catalog_path = ROOT / "assets/catalog/curated.json"
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
for entry in catalog["entries"]:
    if entry["rights"]["officialStoryUse"] != "allowed":
        continue
    original = (ROOT / entry["originalPath"]).resolve()
    target = (ROOT / entry["optimizedPath"]).resolve()
    if not original.is_relative_to(ROOT / "assets") or not target.is_relative_to(ROOT / "stories/house/media"):
        raise ValueError("Asset path outside declared source/output roots")
    target.parent.mkdir(parents=True, exist_ok=True)
    if entry["mediaType"] == "image":
        with Image.open(original) as image:
            image.thumbnail(tuple(entry.get("maxDimensions", [1200, 720])))
            image.save(target, "WEBP", quality=86, method=6)
    else:
        duration = entry["excerptSeconds"]
        subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(original), "-t", str(duration), "-vn", "-ac", "1", "-ar", "44100", "-af", f"afade=t=in:d=0.05,afade=t=out:st={max(0, duration-0.25)}:d=0.25", "-codec:a", "libmp3lame", "-b:a", "80k", str(target)], check=True)
    with original.open("rb") as source:
        entry["sourceSha256"] = hashlib.file_digest(source, "sha256").hexdigest()
    entry["runtimeSha256"] = hashlib.sha256(target.read_bytes()).hexdigest()
    entry["runtimeBytes"] = target.stat().st_size
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"Prepared {len(catalog['entries'])} explicitly selected story resources")
