"""Reclassify extracted documents into proper categories.

The first-pass extractor put everything in the past-papers folder into "exams",
but that folder actually contains the official PSR 2007, Police Service Act,
TTPS Strategic Plan 2025-2027, training manuals, AND past exam papers.

This script:
  1. Reads every .json under source-docs/
  2. Re-classifies based on filename + content sniff (first 600 chars)
  3. Moves the .txt + .json into the right category folder
  4. Writes a per-category INVENTORY.md and an updated content-index.json
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent / "source-docs"

# Final folder structure we want
FINAL_DIRS = ["standing-orders", "psr-2007", "acts", "strategic-plans",
              "manuals", "dept-orders", "exam-papers", "ttps-misc",
              "case-law", "other"]


def classify(name: str, sample: str) -> str:
    """Return one of FINAL_DIRS based on filename + first-600-char sample."""
    n = name.lower()
    s = sample.lower()

    # 1. Top-level Standing Orders
    if re.match(r"^so\s*\d", n) or n.startswith("toc"):
        return "standing-orders"

    # 2. The complete PSR 2007 itself
    if "police service regulation" in n or "police service regulation" in s[:300]:
        return "psr-2007"

    # 3. Acts (statutes)
    if re.search(r"\bact\b", n) and any(k in n for k in [
            "police service act", "srp act", "summary offences",
            "sexual offences", "dangerous drugs", "firearm", "domestic violence",
            "offences against the person", "anti-gang", "anti gang", "cannabis",
            "evidence act", "bail act", "children act", "police complaints",
            "trafficking in persons", "anti-terrorism", "anti terrorism",
            "proceeds of crime", "mental health act", "indictable offences",
    ]):
        return "acts"
    if "criminal procedure rules" in n:
        return "acts"

    # 4. Strategic / operational plans
    if "strategic plan" in n or "operating plan" in n:
        return "strategic-plans"

    # 5. Authoritative training / reference manuals
    if any(k in n for k in [
            "police duties i", "police duties ii", "police duties manual",
            "supervision, management", "supervisory management",
            "accounting manual", "fraud and money laundering",
            "criminal procedure rules manual",
    ]):
        return "manuals"

    # 6. Departmental Orders (two filename conventions)
    #    a) Newer: "131-2024 PT II ..." (digit-dash-year prefix)
    if re.match(r"^\d{1,3}\s*[-–]\s*20\d{2}", n):
        return "dept-orders"
    #    b) Older: "DO 49-2010 ..." or "DO75-2016"
    if re.match(r"^do\s*\d", n):
        return "dept-orders"

    # 7. Actual past exam papers
    #    Patterns observed: "1 Sgt Law 2013", "Corporal Police Duties 2017",
    #    "Sergeant Police Duties I 2022", "Law Question Cpl10", "Law Cpl 2013",
    #    "Law questions Sgt", "3 Sgt Law 2011 (1)"
    if (
        re.search(r"\b(sgt|sergeant|cpl|corporal|inspector)\b", n)
        and re.search(r"\b(law|duties|police)\b", n)
    ) or re.match(r"^\d+\s+(sgt|sergeant|cpl|corporal)\b", n) \
       or "law question" in n or "law questions" in n \
       or re.search(r"\b(promotion|examination)\b.*\b20\d{2}\b", n):
        return "exam-papers"
    if "promotion" in s[:400] and "examination" in s[:400]:
        return "exam-papers"

    # 8. Other TTPS / policing references that don't fit elsewhere
    if any(k in n for k in ["ttps", "trinidad and tobago police"]):
        return "ttps-misc"

    return "other"


def slugify_for_inventory(name: str) -> str:
    return re.sub(r"\s+", " ", name).strip()


def main() -> int:
    if not ROOT.exists():
        print(f"FATAL: {ROOT} does not exist; run extract_corpus.py first")
        return 2

    # Collect everything
    json_files = list(ROOT.rglob("*.json"))
    json_files = [j for j in json_files if j.name != "manifest.json"
                  and j.name != "content-index.json"]
    print(f"Reclassifying {len(json_files)} documents...")

    # Build target dirs
    for d in FINAL_DIRS:
        (ROOT / d).mkdir(exist_ok=True)

    moved = 0
    by_cat: dict[str, list[dict]] = defaultdict(list)

    for j in json_files:
        try:
            meta = json.loads(j.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"  skip (bad json) {j.name}: {e}")
            continue

        source_name = Path(meta.get("source", j.name)).name
        sample = ""
        if meta.get("page_text"):
            sample = (meta["page_text"][0] or "")[:600]
        cat = classify(source_name, sample)

        # Move .txt + .json to ROOT/<cat>/
        txt = j.with_suffix(".txt")
        target_dir = ROOT / cat
        new_json = target_dir / j.name
        new_txt = target_dir / txt.name

        if j.parent != target_dir:
            try:
                if new_json.exists():
                    new_json.unlink()
                if new_txt.exists():
                    new_txt.unlink()
                j.rename(new_json)
                if txt.exists():
                    txt.rename(new_txt)
                moved += 1
            except Exception as e:
                print(f"  move failed {j.name}: {e}")
                continue
        else:
            new_json = j
            new_txt = txt

        # Update meta with new category
        meta["category"] = cat
        meta["txt_out"] = str(new_txt.relative_to(ROOT)).replace("\\", "/")
        new_json.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

        by_cat[cat].append({
            "filename": new_txt.name,
            "source": meta.get("source"),
            "verdict": meta.get("verdict"),
            "pages": meta.get("pages"),
            "chars_total": meta.get("chars_total", 0),
        })

    # Clean up old empty subdirs (DO, exams, SO, ttps from first-pass layout)
    for d in ["DO", "exams", "SO", "ttps"]:
        old = ROOT / d
        if old.exists() and not any(old.iterdir()):
            old.rmdir()

    # Write per-category INVENTORY.md
    for cat, items in by_cat.items():
        # Sort by verdict order (TEXT, OCR, MIXED, SCAN), then filename
        verdict_order = {"TEXT": 0, "OCR": 1, "MIXED": 2, "SCAN": 3}
        items.sort(key=lambda x: (verdict_order.get(x["verdict"], 9), x["filename"].lower()))
        text_count = sum(1 for i in items if i["verdict"] == "TEXT")
        ocr_count = sum(1 for i in items if i["verdict"] == "OCR")
        scan_count = sum(1 for i in items if i["verdict"] == "SCAN")
        mixed_count = sum(1 for i in items if i["verdict"] == "MIXED")
        lines = [f"# {cat} ({len(items)} files)\n\n"]
        lines.append(f"_TEXT: {text_count} | OCR: {ocr_count} | "
                     f"MIXED: {mixed_count} | SCAN-only: {scan_count}_\n\n")
        if text_count:
            lines.append("## Extractable (TEXT)\n\n")
            for i in items:
                if i["verdict"] != "TEXT":
                    continue
                lines.append(f"- `{i['filename']}` — {i['pages']} pages, "
                             f"{i['chars_total']:,} chars\n")
            lines.append("\n")
        if ocr_count:
            lines.append("## OCR'd (Tesseract)\n\n")
            for i in items:
                if i["verdict"] != "OCR":
                    continue
                lines.append(f"- `{i['filename']}` — {i['pages']} pages, "
                             f"{i['chars_total']:,} chars (OCR)\n")
            lines.append("\n")
        if mixed_count:
            lines.append("## Mixed — partial extraction\n\n")
            for i in items:
                if i["verdict"] != "MIXED":
                    continue
                lines.append(f"- `{i['filename']}` — {i['pages']} pages, "
                             f"{i['chars_total']:,} chars\n")
            lines.append("\n")
        if scan_count:
            lines.append("## Scanned — still needs OCR\n\n")
            for i in items:
                if i["verdict"] != "SCAN":
                    continue
                lines.append(f"- `{i['filename']}` — {i['pages']} pages\n")
            lines.append("\n")
        (ROOT / cat / "INVENTORY.md").write_text("".join(lines), encoding="utf-8")

    # Top-level content index
    index = {
        "categories": {
            cat: {
                "total": len(items),
                "text": sum(1 for i in items if i["verdict"] == "TEXT"),
                "ocr": sum(1 for i in items if i["verdict"] == "OCR"),
                "scan": sum(1 for i in items if i["verdict"] == "SCAN"),
                "mixed": sum(1 for i in items if i["verdict"] == "MIXED"),
                "text_chars": sum(i["chars_total"] for i in items if i["verdict"] == "TEXT"),
                "ocr_chars": sum(i["chars_total"] for i in items if i["verdict"] == "OCR"),
            }
            for cat, items in by_cat.items()
        },
        "total_files": sum(len(v) for v in by_cat.values()),
    }
    (ROOT / "content-index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Print summary
    print()
    print(f"Moved/updated {moved} files")
    print()
    print(f"{'CATEGORY':<18} {'TEXT':>5} {'OCR':>5} {'MIXED':>6} {'SCAN':>5} "
          f"{'TOTAL':>6}  {'TEXT KB':>9}  {'OCR KB':>9}")
    print("-" * 85)
    grand_text = grand_ocr = grand_total = 0
    grand_text_kb = grand_ocr_kb = 0.0
    for cat in FINAL_DIRS:
        c = index["categories"].get(cat)
        if not c:
            continue
        print(f"{cat:<18} {c['text']:>5} {c['ocr']:>5} {c['mixed']:>6} "
              f"{c['scan']:>5} {c['total']:>6}  {c['text_chars']/1024:>9.1f}  "
              f"{c['ocr_chars']/1024:>9.1f}")
        grand_text += c["text"]; grand_ocr += c["ocr"]; grand_total += c["total"]
        grand_text_kb += c["text_chars"] / 1024
        grand_ocr_kb += c["ocr_chars"] / 1024
    print("-" * 85)
    print(f"{'TOTAL':<18} {grand_text:>5} {grand_ocr:>5} {'':>6} {'':>5} "
          f"{grand_total:>6}  {grand_text_kb:>9.1f}  {grand_ocr_kb:>9.1f}")
    print()
    print(f"Output: {ROOT}")
    print(f"  content-index.json")
    print(f"  <category>/INVENTORY.md   (per-category file listing)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
