"""Optimize the user-supplied generated-2 pack without changing source images."""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
catalog_path = root / "assets/catalog/curated.json"
catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
entries = []
for source in sorted((root / "assets/images/generated-2").glob("*.png")):
    image = Image.open(source).convert("RGBA")
    assert image.width <= 4096 and image.height <= 4096
    asset_id = "paper." + source.stem
    target = root / f"stories/house/media/{asset_id}.webp"
    image.save(target, "WEBP", quality=90, method=6, exact=True)
    alpha = image.getchannel("A").getextrema()
    if alpha[0] < 255:
        assert Image.open(target).getchannel("A").getextrema() == alpha
    role = "background" if source.stem.startswith("background-") else "foreground" if source.stem.startswith("foreground-") else "midground"
    entries.append({
        "id": asset_id, "title": source.stem.replace("-", " ").capitalize(),
        "originalPath": source.relative_to(root).as_posix(),
        "optimizedPath": target.relative_to(root).as_posix(), "mediaType": "image",
        "sourceCollection": "generated-2", "creator": "User-supplied illustration pack",
        "technical": {"width": image.width, "height": image.height, "alpha": image.getchannel("A").getextrema()[0] < 255},
        "verified": {"provenance": "local-file", "license": "not-provider-verified"},
        "rights": {"officialStoryUse": "allowed", "thirdPartyResourceUse": "prohibited", "providerVerifiedLicense": None,
                   "userAuthorization": "User explicitly supplied generated-2 and requested its use in the story and editor gallery."},
        "suggested": {"roles": ["book illustration"], "themes": ["sketch", "paper", source.stem.split("-")[0]], "layerRoles": [role]},
        "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
        "runtimeSha256": hashlib.sha256(target.read_bytes()).hexdigest(), "runtimeBytes": target.stat().st_size,
    })
assert len(entries) == 26, "Review the new source pack before changing its allowlist"
catalog["entries"] = [entry for entry in catalog["entries"] if not entry["id"].startswith("paper.")] + entries
catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"images": len(entries), "runtimeBytes": sum(entry["runtimeBytes"] for entry in entries), "sourcesUnchanged": True}))
