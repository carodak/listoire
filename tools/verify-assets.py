"""Check source extraction reports, catalog identities and the built publication allowlist."""
from pathlib import Path
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
def load(path): return json.loads((ROOT / path).read_text(encoding="utf-8"))
for name in ["audio", "images", "animations", "curated"]:
    entries = load(f"assets/catalog/{name}.json")["entries"]
    assert len({entry["id"] for entry in entries}) == len(entries), f"Duplicate {name} ID"
    if name in ("audio", "images"):
        assert not load(f"assets/catalog/{name}.json")["technicalErrors"]
        for entry in entries: assert (ROOT / entry["originalPath"]).is_file(), entry["originalPath"]
animations = load("assets/catalog/animations.json")["entries"]
assert len(animations) == 25
assert sum(entry["status"] == "lazy-integrated" for entry in animations) == 14
assert sum(entry["status"] == "implemented" for entry in animations) == 11
vendor = ROOT / "src/features/presentation/react-bits/vendor"
provenance = load("src/features/presentation/react-bits/vendor/provenance.json")
assert len(provenance["files"]) == 28
for entry in provenance["files"]:
    assert hashlib.sha256((vendor/entry["file"]).read_bytes()).hexdigest() == entry["sha256"], entry["file"]
report = load("assets/catalog/extraction-report.json")["archives"]
archives = list((ROOT / "assets/images/heritage-library").rglob("*.zip"))
assert all(entry["status"] in ("extracted", "already-extracted", "extracted-source-removed") for entry in report)
assert len(report) == len(list((ROOT / "assets/images/heritage-library").rglob(".listoire-extracted.json")))
curated = {entry["id"]: entry for entry in load("assets/catalog/curated.json")["entries"]}
expected = set()
for locale in ("en", "fr"):
    bundle = load(f"public/stories/house/{locale}.json")
    referenced = {scene[key] for scene in bundle["scenes"].values() for key in ("image", "sound") if key in scene}
    referenced.add(bundle["examination"]["image"])
    referenced.add(bundle["character"]["portrait"])
    for scene in bundle["scenes"].values():
        for event in scene.get("events", []):
            action = event["action"]
            if action["kind"] == "audio": referenced.add(action["assetId"])
            if action["kind"] == "effect" and "image" in action["effect"]: referenced.add(action["effect"]["image"])
    for clip in bundle.get("narration", []): referenced.add(clip["assetId"])
    assert referenced == {entry["id"] for entry in bundle["assets"]}
    for asset in bundle["assets"]:
        entry = curated[asset["id"]]
        assert entry["rights"]["officialStoryUse"] == "allowed"
        if asset["type"] == "image":
            assert entry["originalPath"].startswith("assets/images/")
            assert not entry["originalPath"].startswith("assets/images/reference-house/")
        for path in [entry["originalPath"], entry["optimizedPath"], "public/stories/house/"+asset["path"], "dist/stories/house/"+asset["path"]]:
            actual = hashlib.sha256((ROOT/path).read_bytes()).hexdigest()
            assert actual == entry["sourceSha256" if path == entry["originalPath"] else "runtimeSha256"], path
        expected.add(asset["path"])
actual = {path.relative_to(ROOT/"dist/stories/house").as_posix() for path in (ROOT/"dist/stories/house/media").rglob("*") if path.is_file()}
assert actual == expected, (actual, expected)
assert not (ROOT / "dist/stories/foundation/en.json").exists()
assert not (ROOT / "dist/assets/catalog").exists()
assert not any(path.suffix.lower() in (".wav", ".zip") for path in (ROOT/"dist").rglob("*"))
print(json.dumps({"completedExtractions":len(report),"sourceArchivesAvailable":len(archives),"sourceArchivesRemovedByUser":sum(entry["status"]=="extracted-source-removed" for entry in report),"extractionFailures":0,"effectEntries":25,"publishedMediaFiles":len(expected),"publishedMediaBytes":sum((ROOT/"dist/stories/house"/path).stat().st_size for path in expected)}))
