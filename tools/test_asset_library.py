import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import zipfile

spec = importlib.util.spec_from_file_location("asset_library", Path(__file__).with_name("asset-library.py"))
library = importlib.util.module_from_spec(spec)
spec.loader.exec_module(library)


class ExtractionTests(unittest.TestCase):
    def test_nested_archives_are_discovered_in_the_same_run(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            inner = io.BytesIO()
            with zipfile.ZipFile(inner, "w") as stream: stream.writestr("image.txt", b"inner resource")
            with zipfile.ZipFile(root / "outer.zip", "w") as stream: stream.writestr("nested/inner.zip", inner.getvalue())
            self.assertTrue(library.extract(root, root / "catalog"))
            self.assertEqual((root / "outer/nested/inner/image.txt").read_bytes(), b"inner resource")
            self.assertTrue((root / "outer/nested/inner.zip").exists())

    def test_nested_extraction_is_idempotent_and_preserves_zip(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            archive = root / "collection.zip"
            with zipfile.ZipFile(archive, "w") as stream:
                stream.writestr("nested/folder/picture.png", b"original-quality")
            original = archive.read_bytes()
            self.assertTrue(library.extract(root, root / "catalog"))
            target = root / "collection/nested/folder/picture.png"
            modified = target.stat().st_mtime_ns
            self.assertTrue(library.extract(root, root / "catalog"))
            self.assertEqual(target.stat().st_mtime_ns, modified)
            self.assertEqual(target.read_bytes(), b"original-quality")
            self.assertEqual(archive.read_bytes(), original)

    def test_unsafe_paths_and_case_collisions_are_rejected_before_writing(self):
        for names in [["../outside.txt"], ["C:/outside.txt"], ["/outside.txt"], ["valid.txt", "VALID.txt"], ["CON.txt"], ["name. /file"]]:
            with self.subTest(names=names), tempfile.TemporaryDirectory() as folder:
                root = Path(folder)
                with zipfile.ZipFile(root / "unsafe.zip", "w") as stream:
                    for name in names: stream.writestr(name, b"unsafe")
                self.assertFalse(library.extract(root, root / "catalog"))
                self.assertFalse((root / "unsafe").exists())

    def test_corrupted_archive_is_reported_and_other_archives_continue(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "broken.zip").write_bytes(b"invalid archive")
            with zipfile.ZipFile(root / "good.zip", "w") as stream: stream.writestr("okay.txt", b"okay")
            self.assertFalse(library.extract(root, root / "catalog"))
            report = json.loads((root / "catalog/extraction-report.json").read_text())
            self.assertEqual([row["status"] for row in report["archives"]], ["failed", "extracted"])

    def test_disk_space_is_checked_before_extraction(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            with zipfile.ZipFile(root / "test.zip", "w") as stream: stream.writestr("large.txt", b"data")
            with patch.object(library.shutil, "disk_usage", return_value=type("Disk", (), {"free": 0})()):
                self.assertFalse(library.extract(root, root / "catalog"))
            self.assertFalse((root / "test").exists())


if __name__ == "__main__":
    unittest.main()
