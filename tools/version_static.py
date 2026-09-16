"""Create content-hashed CSS/JS copies and update base.html references.

Run after changing base.css or the three application JS files:
    python tools/version_static.py
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STATIC = ROOT / "expenses" / "static" / "expenses"
TEMPLATE = ROOT / "expenses" / "templates" / "expenses" / "base.html"
ASSETS = [
    ("css", "base.css"),
    ("js", "ledger.js"),
    ("js", "charts.js"),
    ("js", "drawer.js"),
]


def hashed_copy(folder: str, filename: str) -> str:
    source = STATIC / folder / filename
    data = source.read_bytes()
    digest = hashlib.sha256(data).hexdigest()[:12]
    stem = source.stem
    suffix = source.suffix
    target_name = f"{stem}.{digest}{suffix}"

    for old in source.parent.glob(f"{stem}.*{suffix}"):
        if old.name != filename and re.fullmatch(rf"{re.escape(stem)}\.[a-f0-9]{{12}}{re.escape(suffix)}", old.name):
            old.unlink()

    (source.parent / target_name).write_bytes(data)
    return target_name


def main() -> None:
    names = {(folder, filename): hashed_copy(folder, filename) for folder, filename in ASSETS}
    html = TEMPLATE.read_text(encoding="utf-8")
    for folder, filename in ASSETS:
        hashed = names[(folder, filename)]
        pattern = rf"expenses/{folder}/{re.escape(Path(filename).stem)}(?:\.[a-f0-9]{{12}})?{re.escape(Path(filename).suffix)}"
        html = re.sub(pattern, f"expenses/{folder}/{hashed}", html)
    TEMPLATE.write_text(html, encoding="utf-8")
    for (folder, filename), hashed in names.items():
        print(f"{folder}/{filename} -> {folder}/{hashed}")


if __name__ == "__main__":
    main()
