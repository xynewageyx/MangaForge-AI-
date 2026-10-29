"""Discover Openverse CC0/PDM candidates, without downloading or approving images.

Usage: python tools/discover_openverse.py --output candidates.csv --pages 2
Openverse metadata is NOT proof of copyright status or AI training permission.
Respect API rate limits and verify each original landing page before import.
"""
import argparse
import csv
import json
import time
import urllib.parse
import urllib.request

QUERIES = [
    "manga drawing", "comic illustration", "ink drawing", "samurai illustration",
    "woodblock print warrior", "japanese landscape art", "comic action pose",
    "character sketch", "line art portrait", "fantasy illustration",
    "traditional japanese art", "black white illustration",
]
FIELDS = ["id", "query", "title", "creator", "license", "license_url",
          "source_url", "image_url", "width", "height", "attribution",
          "commercial_allowed", "ai_training_allowed", "review_status"]

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--output", default="openverse_candidates.csv")
    p.add_argument("--pages", type=int, default=2)
    p.add_argument("--delay", type=float, default=1.5)
    args = p.parse_args()
    if not 1 <= args.pages <= 20 or args.delay < 1:
        p.error("Use 1-20 pages per query and a delay of at least 1 second")
    seen, rows = set(), []
    for query in QUERIES:
        for page in range(1, args.pages + 1):
            params = urllib.parse.urlencode({"q": query, "license": "cc0,pdm",
                                             "page": page, "page_size": 20,
                                             "mature": "false"})
            req = urllib.request.Request("https://api.openverse.org/v1/images/?" + params,
                                         headers={"User-Agent": "MangaForgeDatasetResearch/0.1 (metadata-only)"})
            try:
                with urllib.request.urlopen(req, timeout=25) as response:
                    data = json.load(response)
            except Exception as e:
                print("Request failed:", query, page, str(e))
                time.sleep(args.delay)
                continue
            for item in data.get("results", []):
                identifier = item.get("id")
                if not identifier or identifier in seen:
                    continue
                seen.add(identifier)
                rows.append({
                    "id": identifier, "query": query, "title": item.get("title", ""),
                    "creator": item.get("creator", ""), "license": item.get("license", ""),
                    "license_url": item.get("license_url", ""),
                    "source_url": item.get("foreign_landing_url", ""),
                    "image_url": item.get("url", ""), "width": item.get("width", ""),
                    "height": item.get("height", ""), "attribution": item.get("attribution", ""),
                    "commercial_allowed": "no", "ai_training_allowed": "no",
                    "review_status": "needs_manual_rights_review"
                })
            time.sleep(args.delay)
    with open(args.output, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Found {len(rows)} unique candidates; zero automatically approved")

if __name__ == "__main__":
    main()
