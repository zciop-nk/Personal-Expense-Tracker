"""Build the browser bundle from maintainable source modules, then version assets."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / "expenses" / "static" / "expenses" / "js"
PARTS = [
    JS / "src" / "ledger-core.js",
    JS / "src" / "ledger-filters.js",
    JS / "src" / "ledger-form.js",
    JS / "src" / "ledger-mobile.js",
]


def main():
    bundle = "\n\n".join(part.read_text(encoding="utf-8") for part in PARTS).rstrip() + "\n"
    (JS / "ledger.js").write_text(bundle, encoding="utf-8")
    subprocess.run([sys.executable, str(ROOT / "tools" / "version_static.py")], check=True)
    print("Built ledger.js from 4 source modules.")


if __name__ == "__main__":
    main()
