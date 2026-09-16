"""Small CSS regression audit for the SSEUM design system.

It does not decide visual correctness. It prevents the old pattern of silently
adding more duplicate selector blocks and !important declarations without
noticing the cost.
"""
from collections import Counter
from pathlib import Path
import re
import sys

import tinycss2

ROOT = Path(__file__).resolve().parents[1]
CSS = ROOT / "expenses" / "static" / "expenses" / "css" / "base.css"
MAX_IMPORTANT = 188
MAX_DUPLICATE_SCOPE_GROUPS = 140


def collect(rules, counter, scope="root"):
    for rule in rules:
        if rule.type == "qualified-rule":
            selector = tinycss2.serialize(rule.prelude).strip()
            counter[(scope, selector)] += 1
        elif rule.type == "at-rule" and rule.content is not None and rule.lower_at_keyword in {"media", "supports"}:
            label = f"{scope}|{rule.lower_at_keyword} {tinycss2.serialize(rule.prelude).strip()}"
            nested = tinycss2.parse_rule_list(rule.content, skip_comments=True, skip_whitespace=True)
            collect(nested, counter, label)


def main():
    text = CSS.read_text(encoding="utf-8")
    rules = tinycss2.parse_stylesheet(text, skip_comments=True, skip_whitespace=True)
    counter = Counter()
    collect(rules, counter)
    duplicates = {key: count for key, count in counter.items() if count > 1}
    important = len(re.findall(r"!important\b", text))

    print(f"CSS lines: {len(text.splitlines())}")
    print(f"!important: {important} / baseline {MAX_IMPORTANT}")
    print(f"duplicate selector+scope groups: {len(duplicates)} / baseline {MAX_DUPLICATE_SCOPE_GROUPS}")

    failed = important > MAX_IMPORTANT or len(duplicates) > MAX_DUPLICATE_SCOPE_GROUPS
    if failed:
        print("Design-system CSS debt increased. Edit the existing component rule instead of appending an override.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
