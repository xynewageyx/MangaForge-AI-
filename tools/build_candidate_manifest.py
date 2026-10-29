"""Build a candidate manifest from local images; never infer usage rights.

Run: python tools/build_candidate_manifest.py --input /content/images --output /content/manifest.csv
Review each row and enter a verified license, source URL, and permission flags.
"""
import argparse
import csv
from pathlib import Path

EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
FIELDS = ["path", "source_url", "license", "commercial_allowed", "ai_training_allowed", "attribution", "category"]

def category_for(name):
    name = name.lower()
    keywords = {
        "action": ("fight", "battle", "combat", "action"),
        "character": ("face", "portrait", "character"),
        "background": ("landscape", "city", "background"),
        "effects": ("magic", "effect", "spell"),
        "panel": ("panel", "page", "comic"),
    }
    return next((category for category, words in keywords.items() if any(word in name for word in words)), "unclassified")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    root = Path(args.input).resolve()
    if not root.is_dir():
        p.error("Input directory does not exist")
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(x for x in root.rglob("*") if x.is_file() and x.suffix.lower() in EXTENSIONS)
    with output.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        for path in files:
            writer.writerow({"path": str(path), "source_url": "", "license": "",
                             "commercial_allowed": "no", "ai_training_allowed": "no",
                             "attribution": "", "category": category_for(path.name)})
    print(f"Created {len(files)} candidates in {output}; none approved by default")

if __name__ == "__main__":
    main()
