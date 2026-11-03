"""Resume verified official model files using bounded HTTP ranges (no Hub runtime required)."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import shutil
import time
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "assets/narration/models"
REVISION = "5bb1f6ee58e50c3b8d408bc82a6d3740c2db6e18"
CHUNK = 8 * 1024 * 1024


def get(url, headers=None):
    return urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=30)


def download(name, metadata):
    target = (MODELS / "multilingual-v3" / name).resolve()
    assert target.is_relative_to(MODELS.resolve())
    expected = metadata["lfs"]["sha256"]
    if target.exists() and hashlib.file_digest(target.open("rb"), "sha256").hexdigest() == expected:
        return
    size = metadata["size"]
    parts = target.parent / ".parts" / name
    parts.mkdir(parents=True, exist_ok=True)
    url = f"https://huggingface.co/ResembleAI/chatterbox/resolve/{REVISION}/{name}"

    def part(index):
        start = index * CHUNK
        end = min(size, start + CHUNK) - 1
        path = parts / str(index)
        if path.exists() and path.stat().st_size == end - start + 1:
            return
        for attempt in range(4):
            try:
                with get(url, {"Range": f"bytes={start}-{end}"}) as response:
                    assert response.status == 206 and response.headers["Content-Range"] == f"bytes {start}-{end}/{size}"
                    data = response.read(CHUNK + 1)
                assert len(data) == end - start + 1
                path.write_bytes(data)
                if index % 16 == 0:
                    print(name, "part", index, "of", (size + CHUNK - 1) // CHUNK, flush=True)
                return
            except Exception:
                if attempt == 3:
                    raise
                time.sleep(attempt + 1)
    count = (size + CHUNK - 1) // CHUNK
    with ThreadPoolExecutor(max_workers=4) as executor:
        list(executor.map(part, range(count)))
    temporary = target.with_suffix(target.suffix + ".pending")
    with temporary.open("wb") as output:
        for index in range(count):
            with (parts / str(index)).open("rb") as source:
                shutil.copyfileobj(source, output)
    with temporary.open("rb") as source:
        assert hashlib.file_digest(source, "sha256").hexdigest() == expected, "Official model hash mismatch"
    temporary.replace(target)
    print("Verified", name, size, expected, flush=True)


if __name__ == "__main__":
    with get(f"https://huggingface.co/api/models/ResembleAI/chatterbox/revision/{REVISION}?blobs=true") as response:
        entries = {entry["rfilename"]: entry for entry in json.load(response)["siblings"]}
    for name in ["ve.pt", "s3gen.pt", "t3_mtl23ls_v3.safetensors"]:
        download(name, entries[name])
    catalog = ROOT / "assets/catalog/narration-models.json"
    records = json.loads(catalog.read_text(encoding="utf-8"))
    records["models"] = [entry for entry in records["models"] if entry["id"] != "multilingual-v3"]
    records["models"].append({"id": "multilingual-v3", "repo": "ResembleAI/chatterbox", "revision": REVISION, "path": "assets/narration/models/multilingual-v3", "license": "MIT"})
    catalog.write_text(json.dumps(records, indent=2) + "\n", encoding="utf-8")
