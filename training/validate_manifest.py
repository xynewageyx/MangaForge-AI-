#!/usr/bin/env python3
"""Validate metadata for a future MangaForge image fine-tuning dataset."""
import json
import pathlib
import sys

REQUIRED = {"id", "image_path", "source", "license", "creator", "permission_confirmed", "split", "caption"}
SPLITS = {"train", "validation", "test"}
SOURCES = {"own", "licensed"}

def validate(path):
    errors = []
    seen = set()
    count = 0
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        count += 1
        try:
            item = json.loads(line)
        except json.JSONDecodeError as exc:
            errors.append(f"line {line_no}: invalid JSON ({exc.msg})")
            continue
        if not isinstance(item, dict):
            errors.append(f"line {line_no}: expected object")
            continue
        missing = REQUIRED - item.keys()
        if missing:
            errors.append(f"line {line_no}: missing {', '.join(sorted(missing))}")
            continue
        identifier = item["id"]
        if not isinstance(identifier, str) or not identifier.strip() or identifier in seen:
            errors.append(f"line {line_no}: invalid or duplicate id")
        else:
            seen.add(identifier)
        if item["source"] not in SOURCES or item["split"] not in SPLITS:
            errors.append(f"line {line_no}: invalid source or split")
        if item["permission_confirmed"] is not True:
            errors.append(f"line {line_no}: usage permission not confirmed")
        for key in ("image_path", "license", "creator", "caption"):
            if not isinstance(item[key], str) or not item[key].strip():
                errors.append(f"line {line_no}: empty {key}")
        if item["source"] == "licensed" and not item.get("license_url"):
            errors.append(f"line {line_no}: licensed entry requires license_url")
        image_path = item["image_path"]
        if isinstance(image_path, str) and (image_path.startswith("/") or ".." in pathlib.PurePosixPath(image_path).parts):
            errors.append(f"line {line_no}: image_path must be relative without '..'")
    return count, errors

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("Usage: python training/validate_manifest.py MANIFEST.jsonl")
    file = pathlib.Path(sys.argv[1])
    if not file.is_file():
        sys.exit(f"Manifest not found: {file}")
    count, errors = validate(file)
    for error in errors:
        print("ERROR:", error)
    print(f"Checked {count} entries; {len(errors)} error(s).")
    sys.exit(1 if errors else 0)
