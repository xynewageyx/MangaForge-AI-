#!/usr/bin/env python3
"""Validate a MangaForge ImageFolder dataset without downloading models."""
import argparse
import json
from pathlib import Path

EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

def validate(root: Path) -> tuple[int, list[str]]:
    issues = []
    metadata = root / "metadata.jsonl"
    if not metadata.is_file():
        return 0, ["metadata.jsonl fehlt"]
    seen = set()
    count = 0
    for line_number, line in enumerate(metadata.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        try:
            item = json.loads(line)
        except json.JSONDecodeError:
            issues.append(f"Zeile {line_number}: ungueltiges JSON")
            continue
        filename = item.get("file_name")
        caption = item.get("text")
        license_id = item.get("license")
        source = item.get("source")
        if not isinstance(filename, str) or not filename or Path(filename).name != filename or Path(filename).suffix.lower() not in EXTENSIONS:
            issues.append(f"Zeile {line_number}: ungueltiger Dateiname")
            continue
        if filename in seen:
            issues.append(f"Zeile {line_number}: doppelter Dateiname")
        seen.add(filename)
        if not (root / filename).is_file():
            issues.append(f"Zeile {line_number}: Bild fehlt: {filename}")
        if not isinstance(caption, str) or len(caption.strip()) < 10:
            issues.append(f"Zeile {line_number}: Bildbeschreibung fehlt/zu kurz")
        if not isinstance(license_id, str) or not license_id.strip():
            issues.append(f"Zeile {line_number}: Lizenzangabe fehlt")
        if not isinstance(source, str) or not source.strip():
            issues.append(f"Zeile {line_number}: Herkunft fehlt")
        count += 1
    for image in root.iterdir():
        if image.is_file() and image.suffix.lower() in EXTENSIONS and image.name not in seen:
            issues.append(f"Bild ohne Metadaten: {image.name}")
    if count == 0:
        issues.append("Datensatz ist leer")
    return count, issues

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset", type=Path, help="Ordner mit Bildern und metadata.jsonl")
    args = parser.parse_args()
    count, issues = validate(args.dataset)
    print(f"MangaForge: {count} Datensaetze geprueft")
    for issue in issues:
        print("FEHLER:", issue)
    raise SystemExit(1 if issues else 0)
