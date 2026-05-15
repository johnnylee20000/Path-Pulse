"""Summarise the manifest: per-category breakdown of TEXT vs SCAN, biggest items, etc."""
from __future__ import annotations
import json
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "source-docs"
m = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))

records = m["records"]
print(f"Total PDFs processed: {len(records)}")
print(f"Verdicts: {m['verdict_counts']}")
print()

# Per-category × verdict matrix
matrix: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
text_chars: dict[str, int] = defaultdict(int)
for r in records:
    if not r.get("ok"):
        continue
    cat = r.get("category", "?")
    matrix[cat][r["verdict"]] += 1
    if r["verdict"] == "TEXT":
        text_chars[cat] += r["chars_total"]

print(f"{'CATEGORY':<10} {'TEXT':>5} {'MIXED':>6} {'SCAN':>5} {'TOTAL':>6}  {'TEXT KB':>8}")
print("-" * 55)
for cat in sorted(matrix):
    row = matrix[cat]
    total = sum(row.values())
    print(f"{cat:<10} {row['TEXT']:>5} {row['MIXED']:>6} {row['SCAN']:>5} {total:>6}  {text_chars[cat]/1024:>8.1f}")

print()
print("=== DO files that DID extract text (full list) ===")
do_text = [r for r in records if r.get("category") == "DO" and r["verdict"] == "TEXT"]
for r in sorted(do_text, key=lambda x: x["source"]):
    name = Path(r["source"]).name
    print(f"  {r['chars_total']:>6} chars  {name}")

print()
print(f"=== EXAM papers with text (top 30 by size) ===")
exam_text = sorted([r for r in records if r.get("category") == "exams" and r["verdict"] == "TEXT"],
                   key=lambda x: -x["chars_total"])
for r in exam_text[:30]:
    name = Path(r["source"]).name
    print(f"  {r['chars_total']:>6} chars  {name}")

print()
print(f"Total text-only exams: {len(exam_text)}")
print(f"Total text-only DOs:   {len(do_text)}")
