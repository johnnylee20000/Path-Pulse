"""Extract text from every PDF in the source corpus.

Outputs into <repo>/source-docs/ a FLAT category-based structure:
  SO/      = top-level Standing Orders
  DO/      = Departmental Orders (PT II circulars in past-papers folder)
  exams/   = past exam papers
  caselaw/ = case law and other legal materials, by short category
  ttps/    = TTPS Documents
  other/   = anything that doesn't match a known category

For each PDF we write:
  <name>.txt   = clean extracted text (joined across pages with form-feed)
  <name>.json  = { source, pages, chars_total, chars_per_page, verdict, page_text: [...] }

Files are classified TEXT / MIXED / SCAN by char-density heuristic.
SCAN files still get a .json (with verdict=SCAN, empty body) and are listed
in NEEDS-OCR.md for the OCR pass.

Incomplete .crdownload files are listed in BROKEN-DOWNLOADS.md.

A top-level manifest.json records every file processed.

Long Windows paths are handled by using the \\?\ prefix on output writes.
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import time
from pathlib import Path

import pypdf

SRC_ROOT = Path(r"D:\Treavajo\new standing orders")
OUT_ROOT = Path(__file__).resolve().parent.parent / "source-docs"

INVALID = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
WS = re.compile(r"\s+")

MAX_STEM_LEN = 90  # safe within MAX_PATH given short category folders


# ---------- categorisation ----------

# DO filename pattern: starts with 1-3 digits, then dash, then 4-digit year
DO_PAT = re.compile(r"^\d{1,3}\s*-\s*20\d{2}", re.IGNORECASE)

# SO filename pattern (top-level only): SO 01..SO 55, TOC
SO_PAT = re.compile(r"^(SO\s*\d{1,2}|TOC)", re.IGNORECASE)

# Past exam paper pattern: digit/word + Sgt + Law/Duties + year
EXAM_PAT = re.compile(
    r"\b(Sgt|Sergeant|Cpl|Inspector)\b.*\b20\d{2}\b|"
    r"\b20\d{2}\b.*\b(EXAMINATION|PROMOTION|Sgt|Sergeant|Cpl|Inspector)\b|"
    r"^\d+\s+(Police\s+Duties|Sgt\s+Law|Cpl\s+Law)\b",
    re.IGNORECASE,
)

# Caselaw subfolder names get short abbreviations
CASELAW_FOLDER_MAP = {
    "constitutional motions": "constmotion",
    "cost": "cost",
    "criminal": "criminal",
    "delay": "delay",
    "employment": "employment",
    "false imprisonment": "falseimprison",
    "firearm": "firearm",
    "summary cases under the fredom of in": "foi",
    "industrial cases": "industrial",
    "cases under review": "review",
    "reasonable expectation": "reasexpect",
    "promotion cases": "promotion",
    "relef from sanctions": "sanctions",
    "leave": "leave",
    "srp and regualr": "srp",
}


def classify_file(pdf_path: Path) -> tuple[str, str]:
    """Return (category, sub) where sub may be empty."""
    rel = pdf_path.relative_to(SRC_ROOT)
    parts = rel.parts
    name = pdf_path.name

    # Top-level files: should be SO ##.pdf or TOC.pdf
    if len(parts) == 1:
        if SO_PAT.match(name):
            return ("SO", "")
        return ("other", "")

    # Inside the caselaws tree
    if len(parts) >= 2 and parts[0].lower().startswith("caselaws"):
        if len(parts) >= 3:
            sub = parts[1].lower().strip()
            short = CASELAW_FOLDER_MAP.get(sub, re.sub(r"[^a-z0-9]+", "", sub)[:14])
            inner = parts[2]
            # Inside past papers for exams: split into DO vs exam paper
            if sub == "past papers for exams":
                if DO_PAT.match(inner):
                    return ("DO", "")
                if EXAM_PAT.search(inner):
                    return ("exams", "")
                # Anything else in the past-papers folder -> exams pile
                return ("exams", "")
            if sub == "ttps documents":
                return ("ttps", "")
            return ("caselaw", short)

    return ("other", "")


def safe_stem(stem: str) -> str:
    """Make a Windows-safe, length-bounded stem; preserve uniqueness with a hash if truncated."""
    cleaned = INVALID.sub("_", stem)
    cleaned = WS.sub(" ", cleaned).strip().rstrip(".")
    if len(cleaned) <= MAX_STEM_LEN:
        return cleaned
    h = hashlib.md5(stem.encode("utf-8")).hexdigest()[:6]
    return cleaned[: MAX_STEM_LEN - 8].rstrip() + "~" + h


def long_path(p: Path) -> str:
    """Return a Windows long-path string for `p` using the \\?\ prefix."""
    s = str(p.resolve())
    if sys.platform == "win32" and not s.startswith("\\\\?\\"):
        if s.startswith("\\\\"):
            return "\\\\?\\UNC\\" + s.lstrip("\\")
        return "\\\\?\\" + s
    return s


def write_text_long(p: Path, content: str) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(long_path(p), "w", encoding="utf-8", newline="\n") as f:
        f.write(content)


def classify_verdict(chars_per_page: float) -> str:
    if chars_per_page > 200:
        return "TEXT"
    if chars_per_page > 30:
        return "MIXED"
    return "SCAN"


def extract_one(pdf_path: Path) -> dict:
    rel = pdf_path.relative_to(SRC_ROOT).as_posix()
    record: dict = {
        "source": rel,
        "size_bytes": pdf_path.stat().st_size,
        "ok": False,
    }
    try:
        reader = pypdf.PdfReader(str(pdf_path))
    except Exception as e:
        record["error"] = f"open: {type(e).__name__}: {e}"
        return record

    pages_text: list[str] = []
    try:
        for p in reader.pages:
            try:
                pages_text.append(p.extract_text() or "")
            except Exception as e:
                pages_text.append(f"<<EXTRACT_ERROR: {type(e).__name__}: {e}>>")
    except Exception as e:
        record["error"] = f"iterate: {type(e).__name__}: {e}"
        return record

    chars_total = sum(len(t) for t in pages_text)
    page_count = len(pages_text)
    cpp = chars_total / max(page_count, 1)
    verdict = classify_verdict(cpp)

    cat, sub = classify_file(pdf_path)
    out_dir = OUT_ROOT / cat / sub if sub else OUT_ROOT / cat
    stem = safe_stem(pdf_path.stem)
    txt_path = out_dir / f"{stem}.txt"
    json_path = out_dir / f"{stem}.json"

    body = "\n\n\f\n\n".join(pages_text)
    write_text_long(txt_path, body)
    write_text_long(json_path, json.dumps({
        "source": rel,
        "size_bytes": record["size_bytes"],
        "pages": page_count,
        "chars_total": chars_total,
        "chars_per_page": int(cpp),
        "verdict": verdict,
        "category": cat,
        "subcategory": sub,
        "txt_out": str(txt_path.relative_to(OUT_ROOT)).replace("\\", "/"),
        "page_text": pages_text,
    }, ensure_ascii=False, indent=2))

    record.update({
        "ok": True,
        "pages": page_count,
        "chars_total": chars_total,
        "chars_per_page": int(cpp),
        "verdict": verdict,
        "category": cat,
        "subcategory": sub,
        "txt_out": str(txt_path.relative_to(OUT_ROOT)).replace("\\", "/"),
    })
    return record


def main() -> int:
    if not SRC_ROOT.exists():
        print(f"FATAL: source root not found: {SRC_ROOT}")
        return 2

    OUT_ROOT.mkdir(parents=True, exist_ok=True)

    started = time.time()
    pdfs = sorted(SRC_ROOT.rglob("*.pdf"))
    crdownloads = sorted(SRC_ROOT.rglob("*.crdownload"))

    print(f"Source root  : {SRC_ROOT}")
    print(f"Output root  : {OUT_ROOT}")
    print(f"PDFs found   : {len(pdfs)}")
    print(f".crdownload  : {len(crdownloads)} (broken downloads, skipped)")
    print()

    records: list[dict] = []
    counts = {"TEXT": 0, "MIXED": 0, "SCAN": 0, "ERROR": 0}
    cat_counts: dict[str, int] = {}

    for i, pdf in enumerate(pdfs, 1):
        rec = extract_one(pdf)
        records.append(rec)

        if not rec.get("ok"):
            counts["ERROR"] += 1
        else:
            counts[rec["verdict"]] += 1
            cat_counts[rec["category"]] = cat_counts.get(rec["category"], 0) + 1

        if i % 25 == 0 or i == len(pdfs):
            tag = rec.get("verdict", "ERROR")
            print(f"  [{i:>3}/{len(pdfs)}] {tag:<6} {pdf.name[:70]}")

    elapsed = time.time() - started

    manifest = {
        "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "source_root": str(SRC_ROOT),
        "pdfs_processed": len(pdfs),
        "crdownloads_skipped": len(crdownloads),
        "verdict_counts": counts,
        "category_counts": cat_counts,
        "elapsed_seconds": round(elapsed, 2),
        "records": records,
    }
    write_text_long(OUT_ROOT / "manifest.json",
                    json.dumps(manifest, ensure_ascii=False, indent=2))

    needs_ocr = [r for r in records if r.get("ok") and r["verdict"] == "SCAN"]
    mixed = [r for r in records if r.get("ok") and r["verdict"] == "MIXED"]
    errs = [r for r in records if not r.get("ok")]

    md = ["# PDFs requiring OCR (scanned, no embedded text)\n",
          f"_Generated {manifest['generated_at']}._\n\n",
          f"**{len(needs_ocr)} files** need OCR before they can be ingested.\n\n"]
    by_cat: dict[str, list] = {}
    for r in needs_ocr:
        by_cat.setdefault(r.get("category", "other"), []).append(r)
    for cat in sorted(by_cat):
        md.append(f"## {cat} ({len(by_cat[cat])} files)\n\n")
        for r in sorted(by_cat[cat], key=lambda x: x["source"]):
            md.append(f"- `{r['source']}` ({r['pages']} pages, {r['size_bytes']/1024:.1f} KB)\n")
        md.append("\n")
    if mixed:
        md.append("## Possibly mixed (some text, mostly scan) - review manually\n\n")
        for r in sorted(mixed, key=lambda x: x["source"]):
            md.append(f"- `{r['source']}` ({r['pages']} pages, {r['chars_per_page']} chars/page)\n")
        md.append("\n")
    if errs:
        md.append("## Failed to open\n\n")
        for r in errs:
            md.append(f"- `{r['source']}` - {r.get('error', 'unknown error')}\n")
    write_text_long(OUT_ROOT / "NEEDS-OCR.md", "".join(md))

    md = ["# Broken / incomplete downloads\n",
          f"_Generated {manifest['generated_at']}._\n\n",
          "These `.crdownload` files are partial Chrome downloads. Re-download the originals.\n\n"]
    for cr in crdownloads:
        rel = cr.relative_to(SRC_ROOT).as_posix()
        md.append(f"- `{rel}` ({cr.stat().st_size/1024:.1f} KB)\n")
    write_text_long(OUT_ROOT / "BROKEN-DOWNLOADS.md", "".join(md))

    print()
    print("=" * 60)
    print(f"Done in {elapsed:.1f}s")
    print(f"  TEXT  : {counts['TEXT']:>4} files (extracted cleanly)")
    print(f"  MIXED : {counts['MIXED']:>4} files (some text, may need OCR)")
    print(f"  SCAN  : {counts['SCAN']:>4} files (scans, need OCR)")
    print(f"  ERROR : {counts['ERROR']:>4} files (failed to open)")
    print()
    print("By category:")
    for c in sorted(cat_counts):
        print(f"  {c:<10} {cat_counts[c]}")
    print()
    print(f"Output: {OUT_ROOT}")
    print("  manifest.json")
    print(f"  NEEDS-OCR.md  ({len(needs_ocr)} files)")
    print(f"  BROKEN-DOWNLOADS.md  ({len(crdownloads)} files)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
