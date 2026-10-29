"""Audit approved images for technical quality and near-duplicates.

Requires Pillow: pip install Pillow
Usage: python tools/audit_dataset.py --input dataset/accepted.csv --output dataset/quality_report.csv
This report does NOT verify copyright, license, or semantic quality.
"""
import argparse
import csv
from pathlib import Path
from PIL import Image, ImageStat, UnidentifiedImageError

def dhash(im):
    gray = im.convert("L").resize((9, 8))
    pixels = list(gray.getdata())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | int(pixels[y * 9 + x] > pixels[y * 9 + x + 1])
    return bits

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--min-side", type=int, default=512)
    parser.add_argument("--near-threshold", type=int, default=5)
    args = parser.parse_args()
    if args.min_side < 1 or not 0 <= args.near_threshold <= 64:
        parser.error("Invalid quality thresholds")
    accepted_csv = Path(args.input).resolve()
    report = Path(args.output).resolve()
    report.parent.mkdir(parents=True, exist_ok=True)
    seen = []
    output_rows = []
    with accepted_csv.open(newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            image_path = Path(row.get("imported_path", ""))
            if not image_path.is_absolute():
                image_path = (accepted_csv.parent / image_path).resolve()
            result = {"imported_path": str(image_path), "width": "", "height": "",
                      "grayscale": "", "contrast_stddev": "", "near_duplicate_of": "",
                      "review_status": ""}
            try:
                with Image.open(image_path) as img:
                    img.verify()
                with Image.open(image_path) as img:
                    img.load()
                    w, h = img.size
                    result["width"], result["height"] = w, h
                    rgb = img.convert("RGB")
                    result["grayscale"] = "yes" if all(abs(r-g) <= 3 and abs(g-b) <= 3 for r,g,b in rgb.resize((32,32)).getdata()) else "no"
                    result["contrast_stddev"] = round(ImageStat.Stat(img.convert("L").resize((128,128))).stddev[0], 2)
                    hsh = dhash(img)
                    for previous_hash, previous_path in seen:
                        if (hsh ^ previous_hash).bit_count() <= args.near_threshold:
                            result["near_duplicate_of"] = previous_path
                            break
                    seen.append((hsh, str(image_path)))
                    result["review_status"] = "review" if min(w, h) < args.min_side or result["near_duplicate_of"] else "technical_pass"
            except (OSError, ValueError, UnidentifiedImageError) as e:
                result["review_status"] = "unreadable"
                result["error"] = str(e)
            output_rows.append(result)
    fields = ["imported_path", "width", "height", "grayscale", "contrast_stddev",
              "near_duplicate_of", "review_status", "error"]
    with report.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(output_rows)
    print(f"Audited {len(output_rows)} images; report: {report}")

if __name__ == "__main__":
    main()
