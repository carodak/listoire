"""Prepare the supplied sketch pack and local Sonniss library; leave sources untouched."""
import concurrent.futures
import hashlib
import json
from pathlib import Path
import re
import subprocess

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "assets/images/sketch-pack"
CACHE = ROOT / ".fallow/library-cache"
CATALOG = ROOT / "assets/catalog/curated.json"
FFMPEG = Path.home() / "AppData/Local/Programs/MediaTools/bin/ffmpeg.exe"


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def prepare(entry, previous):
    source = (ROOT / entry["originalPath"]).resolve()
    assert source.is_relative_to((ROOT / "assets").resolve()) and source.is_file()
    target = ROOT / entry["optimizedPath"]
    target.parent.mkdir(parents=True, exist_ok=True)
    signature = digest(source)
    old = previous.get(entry["id"], {})
    if not target.exists() or old.get("sourceSha256") != signature:
        if entry["mediaType"] == "image":
            with Image.open(source) as original:
                image = original.convert("RGBA")
                image.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
                image.save(target, "WEBP", quality=88, method=6, exact=True)
                entry["technical"] = {"width": image.width, "height": image.height,
                                      "alpha": image.getchannel("A").getextrema()[0] < 255}
        else:
            subprocess.run([str(FFMPEG), "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
                            "-vn", "-map_metadata", "-1", "-codec:a", "libmp3lame", "-b:a", "96k",
                            "-ac", "2", "-ar", "44100", str(target)], check=True, capture_output=True)
    elif entry["mediaType"] == "image":
        entry["technical"] = old["technical"]
    return {**entry, "sourceSha256": signature, "runtimeSha256": digest(target),
            "runtimeBytes": target.stat().st_size}


def entries():
    catalog = json.loads((PACK / "catalog/asset_catalog.json").read_text(encoding="utf-8"))
    for asset in catalog["assets"]:
        source = (PACK / asset["file_path"]).resolve()
        assert source.is_relative_to(PACK.resolve())
        asset_id = "sketch." + source.stem.replace("_", "-")
        role = {"foreground": "foreground", "background": "background"}.get(asset["category"], "midground")
        yield {
            "id": asset_id, "sourceId": asset["id"], "title": asset["name"],
            "description": asset["description"], "originalPath": source.relative_to(ROOT).as_posix(),
            "optimizedPath": f".fallow/library-cache/images/{asset_id}.webp",
            "runtimePath": f"media/{asset_id}.webp", "mediaType": "image",
            "sourceCollection": "sketch-pack", "category": asset["category"], "creator": "User-supplied sketch pack",
            "verified": {"provenance": "supplied-catalogue", "license": "not-provider-verified"},
            "rights": {"officialStoryUse": "allowed", "thirdPartyResourceUse": "prohibited",
                       "providerVerifiedLicense": None,
                       "userAuthorization": "User supplied sketch-pack and requested replacing the image gallery with this pack."},
            "suggested": {"roles": asset["narrative_uses"], "themes": asset["universes"] + asset["tags"], "layerRoles": [role]},
            "composition": asset.get("composition"), "compatibleWith": asset.get("compatible_with", []),
        }
    audio = json.loads((ROOT / "assets/catalog/audio.json").read_text(encoding="utf-8"))
    for asset in audio["entries"]:
        if asset["mediaType"] != "audio":
            continue
        assert asset["originalPath"].startswith("assets/audio/se/Sonniss.com-GDC2026-")
        asset_id = asset["id"]
        name = Path(asset["originalPath"]).stem
        collection = Path(asset["originalPath"]).parent.name
        words = re.findall(r"[a-z]{3,}", (name + " " + collection).lower())
        role = "ambience" if any(word in words for word in ["ambience", "ambient", "loop", "walla"]) else "sound effect"
        yield {
            **asset, "title": name, "description": collection,
            "optimizedPath": f".fallow/library-cache/audio/{asset_id}.mp3",
            "runtimePath": f"media/{asset_id}.mp3", "sourceCollection": "Sonniss GDC 2026",
            "verified": {"provenance": "local-file", "license": "Sonniss GameAudioGDC EULA 2.0",
                         "evidence": ["https://sonniss.com/gdc-bundle-license/"]},
            "rights": {"officialStoryUse": "allowed", "thirdPartyResourceUse": "prohibited", "aiTraining": "prohibited"},
            "suggested": {"roles": [role], "themes": list(dict.fromkeys(words)), "layerRoles": []},
        }


def main():
    previous = json.loads(CATALOG.read_text(encoding="utf-8"))
    old = {entry["id"]: entry for entry in previous["entries"]}
    selected = list(entries())
    assert len({entry["id"] for entry in selected}) == len(selected)
    assert sum(entry["mediaType"] == "image" for entry in selected) == 181
    assert sum(entry["mediaType"] == "audio" for entry in selected) == 344
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        prepared = list(pool.map(lambda entry: prepare(entry, old), selected))
    target = CATALOG.with_suffix(".tmp")
    scores = [entry for entry in previous["entries"] if entry["sourceCollection"] == "Original score"]
    target.write_text(json.dumps({"schemaVersion": 1, "entries": prepared + scores}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    target.replace(CATALOG)
    print(json.dumps({"images": 181, "sounds": 344, "bytes": sum(x["runtimeBytes"] for x in prepared),
                      "sourceFilesChanged": False, "publication": "Only story-referenced files may be published."}))


if __name__ == "__main__":
    main()
