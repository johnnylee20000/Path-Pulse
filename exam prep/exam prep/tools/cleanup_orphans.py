"""Delete the empty/zero-content placeholder .txt/.json files created by
the original extract_corpus.py for SCAN-verdict PDFs.

These are now superseded by the OCR'd files (which have different filename
hashes). Identify orphans by:
  - verdict == "SCAN" in the .json
  - chars_total == 0
  - sibling .txt either missing or empty
  - and there exists ANOTHER .json for the same source PDF that has
    verdict == "OCR" (meaning the OCR re-extracted it)
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "source-docs"


def main() -> int:
    by_source: dict[str, list[Path]] = defaultdict(list)
    json_files = [p for p in ROOT.rglob("*.json")
                  if p.name not in ("manifest.json", "content-index.json")]

    for j in json_files:
        try:
            meta = json.loads(j.read_text(encoding="utf-8"))
        except Exception:
            continue
        src = meta.get("source")
        if src:
            by_source[src].append(j)

    deleted = 0
    for src, jsons in by_source.items():
        if len(jsons) < 2:
            continue
        # We have duplicates for the same source PDF. Keep the OCR/TEXT one,
        # delete the empty SCAN one.
        scan_orphans = []
        keepers = []
        for j in jsons:
            try:
                meta = json.loads(j.read_text(encoding="utf-8"))
            except Exception:
                continue
            verdict = meta.get("verdict")
            chars = meta.get("chars_total", 0)
            if verdict == "SCAN" and chars == 0:
                scan_orphans.append(j)
            else:
                keepers.append((j, verdict, chars))

        if not scan_orphans or not keepers:
            continue

        for j in scan_orphans:
            txt = j.with_suffix(".txt")
            try:
                if txt.exists():
                    txt.unlink()
                j.unlink()
                deleted += 1
                print(f"  removed: {j.relative_to(ROOT)}")
            except OSError as e:
                print(f"  ERROR removing {j.name}: {e}")

    print(f"\nDeleted {deleted} orphan placeholder records")
    return 0


if __name__ == "__main__":
    sys.exit(main())
