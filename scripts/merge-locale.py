#!/usr/bin/env python3
"""Deep-merge additive keys into the locale files, preserving existing values.

Used when a new screen introduces strings. Never overwrites an existing key --
translations already reviewed by a human win over anything generated later.
"""
import json, sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
locales = root / "packages" / "i18n" / "src" / "locales"


def merge(base, extra, path=""):
    added = []
    for key, value in extra.items():
        here = f"{path}.{key}" if path else key
        if isinstance(value, dict):
            node = base.setdefault(key, {})
            if not isinstance(node, dict):
                raise SystemExit(f"type clash at {here}")
            added += merge(node, value, here)
        elif key not in base:
            base[key] = value
            added.append(here)
    return added


def apply(name, extra):
    target = locales / name
    data = json.loads(target.read_text(encoding="utf-8"))
    added = merge(data, extra)
    target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{name}: +{len(added)} key(s)")
    return added


if __name__ == "__main__":
    patch = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    apply("ur.json", patch["ur"])
    apply("en.json", patch["en"])
