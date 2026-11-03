"""Fetch the pinned official components and their license; no assets or external runtime scripts."""
from pathlib import Path
import hashlib
import json
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
REVISION="4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4"
catalog=json.loads((ROOT/"assets/catalog/animations.json").read_text(encoding="utf-8"))
destination=ROOT/"src/features/presentation/react-bits/vendor"
destination.mkdir(parents=True,exist_ok=True)
manifest=[]
for entry in catalog["entries"]:
    if entry["category"]!="react-bits":continue
    source=entry["source"].split(REVISION+"/")[1].replace("src/ts-default/","src/content/").replace(".tsx",".jsx")
    for relative in [source,source.replace(".jsx",".css")]:
        url=f"https://raw.githubusercontent.com/DavidHDev/react-bits/{REVISION}/{relative}"
        with urllib.request.urlopen(url,timeout=30) as response: data=response.read()
        target=destination/Path(relative).name
        target.write_bytes(data)
        manifest.append({"file":target.name,"source":url,"sha256":hashlib.sha256(data).hexdigest()})
for entry in catalog["entries"]:
    if entry["category"]!="react-bits":continue
    name=entry["name"].replace(" ","")
    old=(destination/(name+".tsx")).resolve()
    assert old.is_relative_to(destination.resolve())
    old.unlink(missing_ok=True)
    (destination/(name+".d.ts")).write_text('import type { ComponentType } from "react";\ndeclare const component: ComponentType<Record<string, unknown>>;\nexport default component;\n')
with urllib.request.urlopen(f"https://raw.githubusercontent.com/DavidHDev/react-bits/{REVISION}/LICENSE.md",timeout=30) as response:
    (destination/"LICENSE.md").write_bytes(response.read())
(destination/"provenance.json").write_text(json.dumps({"revision":REVISION,"files":manifest},indent=2)+"\n")
print(f"Vendored {len(manifest)//2} official components at {REVISION}")
