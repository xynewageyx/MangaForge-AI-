"""Import locally supplied, explicitly licensed images into a reviewable dataset.

Usage: python tools/licensed_dataset_importer.py --manifest manifest.csv --output dataset
Manifest columns: path,source_url,license,commercial_allowed,ai_training_allowed,attribution
Only rows with both permissions set to yes are imported.
"""
import argparse
import csv
import hashlib
import shutil
from pathlib import Path

ALLOWED = {"yes", "true", "1"}
FIELDS = ["path", "source_url", "license", "commercial_allowed", "ai_training_allowed", "attribution"]
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", default="dataset")
    args = parser.parse_args()
    manifest = Path(args.manifest).resolve()
    output = Path(args.output)
    images = output / "images"
    images.mkdir(parents=True, exist_ok=True)
    accepted, rejected, hashes = [], [], set()
    with manifest.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        missing = set(FIELDS) - set(reader.fieldnames or [])
        if missing:
            raise ValueError(f"Missing columns: {sorted(missing)}")
        for row in reader:
            source = (manifest.parent / row["path"]).resolve()
            reason = None
            if row["commercial_allowed"].strip().lower() not in ALLOWED or row["ai_training_allowed"].strip().lower() not in ALLOWED:
                reason = "permission_not_confirmed"
            elif not row["license"].strip() or not row["source_url"].strip():
                reason = "missing_provenance"
            elif source.suffix.lower() not in {".png", ".jpg", ".jpeg", ".webp"} or not source.is_file():
                reason = "missing_or_unsupported_file"
            if not reason:
                digest = hashlib.sha256(source.read_bytes()).hexdigest()
                if digest in hashes:
                    reason = "duplicate"
                else:
                    hashes.add(digest)
                    target = images / f"{digest[:20]}{source.suffix.lower()}"
                    shutil.copy2(source, target)
                    row["imported_path"] = str(target)
                    row["sha256"] = digest
                    accepted.append(row)
            if reason:
                row["rejection_reason"] = reason
                rejected.append(row)
    for name, rows, columns in [
        ("accepted.csv", accepted, FIELDS + ["imported_path", "sha256"]),
        ("rejected.csv", rejected, FIELDS + ["rejection_reason"]),
    ]:
        with (output / name).open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
    print(f"Accepted: {len(accepted)} | Rejected: {len(rejected)}")
if __name__ == "__main__":
    main()
