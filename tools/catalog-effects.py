"""Reproduce the development-only effect catalog from inspected official source."""
import json
from pathlib import Path
import re
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
cache = ROOT / ".fallow"
cache.mkdir(exist_ok=True)
pinned = "4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4"
tree_file = cache / "react-bits-tree.json"
if not tree_file.exists():
    with urllib.request.urlopen(f"https://api.github.com/repos/DavidHDev/react-bits/git/trees/{pinned}?recursive=1", timeout=30) as response:
        tree_file.write_bytes(response.read())
tree = json.loads(tree_file.read_text())
revision = tree["sha"]
assert revision == pinned, "Official component verification must use the pinned revision"
entries = []
native = [
    ("fade-in", "Fade In", "Reveal an illustration softly", ["arrival", "revelation"], {"duration": "milliseconds"}, "implemented"),
    ("fade-out", "Fade Out", "Withdraw an image", ["departure", "ending"], {}, "cataloged"),
    ("crossfade", "Crossfade", "Blend between two scenes", ["transition", "memory"], {}, "cataloged"),
    ("screen-shake", "Screen Shake", "Brief disruptive motion", ["impact", "alarm"], {}, "cataloged"),
    ("light-flicker", "Flash / Light Flicker", "A moment of unstable light", ["revelation", "storm"], {}, "cataloged"),
    ("slow-zoom", "Slow Zoom / Ken Burns", "Move closer to an image detail", ["discovery", "contemplation"], {"scale": "1–3", "duration": "milliseconds"}, "implemented"),
    ("camera-pan", "Camera Pan", "Move across an illustration", ["examination", "exploration"], {"x": "percent (-25 to 25)", "y": "percent (-25 to 25)", "duration": "milliseconds"}, "implemented"),
    ("parallax", "Parallax", "Separate movement across depth layers", ["exploration", "travel"], {}, "cataloged"),
    ("rain-overlay", "Rain Overlay", "Procedural rain over a scene", ["weather", "melancholy"], {}, "cataloged"),
    ("fog-overlay", "Fog / Smoke Overlay", "Procedural drifting mist", ["mystery", "dream"], {}, "cataloged"),
    ("cinematic-wipe", "Cinematic Wipe", "Reveal a scene through a moving edge", ["transition", "travel"], {}, "cataloged"),
]
for effect_id, name, description, purposes, parameters, status in native:
    entries.append({"id": effect_id, "name": name, "category": "core", "description": description, "narrativePurposes": purposes, "themes": [], "moods": [], "implementationType": "native-waapi-css", "supportedParameters": parameters, "dependencies": [], "status": status, "rendering": "DOM; no external textures", "accessibility": "Decorative only; reduced motion uses static final state; cancel on passage exit", "mobileCost": "Unmeasured; transform/opacity effects are the initial low-cost candidates", "runtimeId": "camera-zoom" if effect_id == "slow-zoom" else effect_id if status == "implemented" else None})
names = ["LightRays", "Lightning", "Particles", "DarkVeil", "MagicRings", "Noise", "RippleDistortion", "Aurora", "SideRays", "LightPillar", "SplashCursor", "GridDistortion", "PrismaticBurst", "GhostFibers"]
purposes = [["revelation", "hope"], ["storm", "alarm"], ["magic", "atmosphere"], ["mystery", "dream"], ["magic", "ritual"], ["memory", "unease"], ["water", "uncertainty"], ["wonder", "night"], ["revelation", "daylight"], ["magic", "arrival"], ["play", "interaction"], ["uncertainty", "dream"], ["magic", "celebration"], ["spectral", "mystery"]]
descriptions = ["Animated light shafts", "Branching lightning bolts", "Drifting particle field", "Flowing dark shader veil", "Animated concentric rings", "Procedural visual grain", "Interactive image ripples", "Layered aurora color bands", "Light shafts from a side", "A glowing vertical light pillar", "Pointer-driven fluid trails", "Image grid warping", "Radiating colored light burst", "Flowing luminous fibers"]
for name, purpose in zip(names, purposes):
    paths = [x["path"] for x in tree["tree"] if x["path"].endswith("/" + name + ".tsx") and "/ts-default/" in x["path"]]
    source_file = cache / f"{name}.tsx"
    if paths and not source_file.exists():
        with urllib.request.urlopen(f"https://raw.githubusercontent.com/DavidHDev/react-bits/{pinned}/{paths[0]}", timeout=30) as response:
            source_file.write_bytes(response.read())
    source = source_file.read_text(encoding="utf-8") if paths else ""
    imports = re.findall(r"from ['\"]([^.'\"][^'\"]*)['\"]", source)
    parameters = dict(re.findall(r"^  (\w+)\?: ([^;\n]+);", source, re.M))
    parameters = {k: v for k, v in parameters.items() if k not in ("className", "style")}
    webgl = "webgl" in source.lower() or "ogl" in imports
    effect_id = re.sub(r"(?<!^)([A-Z])", r"-\1", name).lower()
    entries.append({"id": "react-bits."+effect_id, "name": re.sub(r"(?<!^)([A-Z])", r" \1", name), "category": "react-bits", "description": "Official " + name + " presentation component; source inspected, not installed", "narrativePurposes": purpose, "themes": [], "moods": [], "implementationType": "react-webgl" if webgl else "react-canvas", "supportedParameters": parameters, "dependencies": sorted(set(imports)), "status": "available-not-installed" if paths else "unavailable", "source": f"https://github.com/DavidHDev/react-bits/blob/{revision}/{paths[0]}" if paths else None, "verifiedRevision": revision, "license": "MIT + Commons Clause; component redistribution/hosted-tool restrictions", "licenseSource": f"https://github.com/DavidHDev/react-bits/blob/{revision}/LICENSE.md", "rendering": "WebGL canvas and animation frames" if webgl else "Canvas and animation frames", "accessibility": "Decorative aria-hidden canvas, static fallback, pause when hidden, honor reduced motion; Lightning requires flash-risk review; preserve text/input contrast", "mobileCost": "Potential sustained GPU/battery cost; profile on devices, cap pixel ratio and pause offscreen. Not measured in Phase 2."})
assert len(entries) == 25 and len({e["id"] for e in entries}) == 25
for entry in entries:
    entry["themes"] = ["general", *entry["narrativePurposes"][:1]]
    entry["moods"] = entry["narrativePurposes"][1:]
for entry, description in zip(entries[11:], descriptions):
    entry["description"] = description
contracts = (ROOT / "src/contracts/effects.ts").read_text(encoding="utf-8")
for entry in entries:
    if entry["category"] == "core":
        entry["status"] = "implemented"
        entry["runtimeId"] = entry["id"]
        entry["supportedParameters"] = {"duration": "0–10000 ms", "delay": "0–5000 ms", "target": "image | canvas", **entry["supportedParameters"]}
    else:
        shape = re.search(r'rb\("'+re.escape(entry["id"])+r'", \{(.*?)\n  \}\)', contracts, re.S)
        assert shape, entry["id"]
        entry["officialParameters"] = entry["supportedParameters"]
        entry["supportedParameters"] = dict(re.findall(r'^    (\w+): (.+),$', shape[1], re.M))
        entry["status"] = "lazy-integrated"
        entry["source"] = entry["source"].replace("src/ts-default/", "src/content/").replace(".tsx", ".jsx")
        entry["accessibility"] += "; unavailable/hidden/constrained GPU uses the static illustration"
        entry["mobileCost"] = "GPU effects disabled below 700px, on save-data/low-core devices or without WebGL2; bounded DPR/quality; physical-device profiling remains required"
        entry["localProvenance"] = "src/features/presentation/react-bits/vendor/provenance.json"
        entry["runtimeId"] = entry["id"]
(ROOT / "assets/catalog/animations.json").write_text(json.dumps({"schemaVersion": 1, "verifiedOn": "2026-11-02", "entries": entries}, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"Cataloged {len(entries)} effects; {len(names)} official components available")
