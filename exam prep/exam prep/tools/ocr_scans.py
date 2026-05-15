"""OCR every PDF flagged SCAN in source-docs/manifest.json.

Pipeline:
  1. Render each PDF page with PyMuPDF (fitz) at 300 DPI.
  2. OCR the rendered image with Tesseract via pytesseract.
  3. Write the combined text to <category>/<short_name>.txt
     and a sibling .json with metadata (verdict="OCR").
  4. Re-uses the same classify() logic as reclassify.py so the OCR'd
     files land in the correct final folder (dept-orders, exam-papers, etc.).

Usage:
    python tools/ocr_scans.py            # process all SCAN records
    python tools/ocr_scans.py --limit 5  # just the first 5 (smoke test)
    python tools/ocr_scans.py --only DO  # only files manifest categorised as DO
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from io import BytesIO
from pathlib import Path

import fitz                       # PyMuPDF
import pytesseract
from PIL import Image

# ----- Paths --------------------------------------------------------------- #
HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "source-docs"
SOURCE_ROOT = Path(r"D:\Treavajo\new standing orders")

# Tesseract install discovered earlier
TESS_PATH = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if TESS_PATH.exists():
    pytesseract.pytesseract.tesseract_cmd = str(TESS_PATH)

# OCR settings
OCR_DPI = 300            # 300 dpi gives Tesseract a fair shake on small print
OCR_LANG = "eng"
OCR_CONFIG = "--oem 3 --psm 6"   # LSTM engine, single uniform block


# ----- Classification (mirrors reclassify.py) ------------------------------ #
FINAL_DIRS = ["standing-orders", "psr-2007", "acts", "strategic-plans",
              "manuals", "dept-orders", "exam-papers", "ttps-misc",
              "case-law", "other"]


def classify(name: str, sample: str = "") -> str:
    n = name.lower()
    s = sample.lower()
    if re.match(r"^so\s*\d", n) or n.startswith("toc"):
        return "standing-orders"
    if "police service regulation" in n or "police service regulation" in s[:300]:
        return "psr-2007"
    if re.search(r"\bact\b", n) and any(k in n for k in [
            "police service act", "srp act", "summary offences",
            "sexual offences", "dangerous drugs", "firearm", "domestic violence",
            "offences against the person", "anti-gang", "anti gang", "cannabis",
            "evidence act", "bail act", "children act", "police complaints",
            "trafficking in persons", "anti-terrorism", "anti terrorism",
            "proceeds of crime", "mental health act", "indictable offences"]):
        return "acts"
    if "criminal procedure rules" in n:
        return "acts"
    if "strategic plan" in n or "operating plan" in n:
        return "strategic-plans"
    if any(k in n for k in [
            "police duties i", "police duties ii", "police duties manual",
            "supervision, management", "supervisory management",
            "accounting manual", "fraud and money laundering",
            "criminal procedure rules manual"]):
        return "manuals"
    if re.match(r"^\d{1,3}\s*[-\u2013]\s*20\d{2}", n):
        return "dept-orders"
    if re.match(r"^do\s*\d", n):
        return "dept-orders"
    if (re.search(r"\b(sgt|sergeant|cpl|corporal|inspector)\b", n)
            and re.search(r"\b(law|duties|police)\b", n)) \
            or re.match(r"^\d+\s+(sgt|sergeant|cpl|corporal)\b", n) \
            or "law question" in n or "law questions" in n \
            or re.search(r"\b(promotion|examination)\b.*\b20\d{2}\b", n):
        return "exam-papers"
    if "promotion" in s[:400] and "examination" in s[:400]:
        return "exam-papers"
    if any(k in n for k in ["ttps", "trinidad and tobago police"]):
        return "ttps-misc"
    return "other"


# ----- Filename safety ----------------------------------------------------- #
SAFE_RE = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def safe_filename(stem: str, max_len: int = 90) -> str:
    out = SAFE_RE.sub(" ", stem)
    out = re.sub(r"\s+", " ", out).strip()
    if len(out) > max_len:
        # Keep a hash so we don't clash on truncation
        import hashlib
        h = hashlib.sha1(stem.encode("utf-8")).hexdigest()[:6]
        out = out[:max_len - 8] + "~" + h
    return out


def long_path(p: Path) -> str:
    r"""Wrap with \\?\ on Windows so MAX_PATH (260) doesn't bite."""
    s = str(p.resolve())
    if os.name == "nt" and not s.startswith("\\\\?\\"):
        return "\\\\?\\" + s
    return s


# ----- Core ---------------------------------------------------------------- #
def ocr_pdf(pdf_path: Path) -> tuple[list[str], int]:
    """Return (page_texts, total_chars). Empty list on failure."""
    pages: list[str] = []
    try:
        doc = fitz.open(str(pdf_path))
    except Exception as e:
        print(f"    ! cannot open: {e}")
        return [], 0
    try:
        for page in doc:
            pix = page.get_pixmap(dpi=OCR_DPI, alpha=False)
            img = Image.open(BytesIO(pix.tobytes("png")))
            text = pytesseract.image_to_string(img, lang=OCR_LANG, config=OCR_CONFIG)
            pages.append(text)
    finally:
        doc.close()
    total = sum(len(p) for p in pages)
    return pages, total


def process_one(rec: dict, skip_existing: bool = True) -> dict:
    """Worker function. Pure function so it pickles cleanly across processes."""
    if TESS_PATH.exists():
        pytesseract.pytesseract.tesseract_cmd = str(TESS_PATH)

    src_rel = rec["source"]
    src_pdf = SOURCE_ROOT / src_rel
    src_name = Path(src_rel).name
    target_cat = classify(src_name)
    target_dir = ROOT / target_cat
    target_dir.mkdir(exist_ok=True)
    stem = safe_filename(Path(src_name).stem)
    txt_path = target_dir / f"{stem}.txt"
    json_path = target_dir / f"{stem}.json"

    result = {"source": src_rel, "name": src_name, "category": target_cat,
              "status": "", "pages": 0, "chars": 0, "elapsed": 0.0, "error": ""}

    if skip_existing and txt_path.exists():
        try:
            if txt_path.stat().st_size > 100:
                result["status"] = "skip"
                return result
        except OSError:
            pass

    if not src_pdf.exists():
        result["status"] = "missing"
        result["error"] = "source pdf not found"
        return result

    t0 = time.time()
    try:
        pages, chars = ocr_pdf(src_pdf)
    except Exception as e:
        result["status"] = "fail"
        result["error"] = f"ocr exception: {e}"
        return result
    dt = time.time() - t0
    if not pages:
        result["status"] = "fail"
        result["error"] = "no pages produced"
        return result

    body = "\n\n--- page break ---\n\n".join(pages)
    try:
        with open(long_path(txt_path), "w", encoding="utf-8") as f:
            f.write(body)
        meta = {
            "source": src_rel,
            "size_bytes": rec.get("size_bytes"),
            "ok": True,
            "pages": len(pages),
            "chars_total": chars,
            "chars_per_page": chars // max(1, len(pages)),
            "verdict": "OCR",
            "category": target_cat,
            "subcategory": "",
            "txt_out": f"{target_cat}/{txt_path.name}",
            "ocr": {"engine": "tesseract", "lang": OCR_LANG,
                    "dpi": OCR_DPI, "config": OCR_CONFIG,
                    "elapsed_sec": round(dt, 2)},
            "page_text": pages,
        }
        with open(long_path(json_path), "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)
    except OSError as e:
        result["status"] = "fail"
        result["error"] = f"write failed: {e}"
        return result

    result.update(status="ok", pages=len(pages), chars=chars, elapsed=round(dt, 1))
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0,
                    help="process only the first N scan records (debug)")
    ap.add_argument("--only", type=str, default="",
                    help="only manifest.category matching this value")
    ap.add_argument("--workers", type=int, default=3,
                    help="number of parallel OCR workers (default 3)")
    ap.add_argument("--no-skip", action="store_true",
                    help="re-OCR even if output already exists")
    args = ap.parse_args()

    manifest_path = ROOT / "manifest.json"
    if not manifest_path.exists():
        print(f"FATAL: {manifest_path} missing")
        return 2
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = [r for r in manifest["records"] if r.get("verdict") == "SCAN"]
    if args.only:
        records = [r for r in records if r.get("category") == args.only]
    if args.limit:
        records = records[:args.limit]

    skip_existing = not args.no_skip

    print(f"OCRing {len(records)} scanned PDFs at {OCR_DPI} dpi "
          f"with {args.workers} workers")
    print(f"Tesseract: {TESS_PATH}")
    print()

    started = time.time()
    done = skipped = failed = missing = 0
    total_chars = 0
    log_lines = []

    with ProcessPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(process_one, rec, skip_existing): rec
                   for rec in records}
        for i, fut in enumerate(as_completed(futures), 1):
            try:
                r = fut.result()
            except Exception as e:
                failed += 1
                print(f"  [{i}/{len(records)}] worker crashed: {e}")
                continue

            if r["status"] == "skip":
                skipped += 1
                tag = "skip"
            elif r["status"] == "ok":
                done += 1
                total_chars += r["chars"]
                tag = f"ok   {r['pages']:>3}pp {r['chars']:>6}c {r['elapsed']:>5.1f}s"
            elif r["status"] == "missing":
                missing += 1
                tag = "MISSING"
            else:
                failed += 1
                tag = f"FAIL ({r['error']})"

            elapsed = time.time() - started
            attempted = max(1, done + failed + missing)
            avg = elapsed / attempted if (done + failed + missing) else 0
            remain_count = len(records) - i
            eta_min = (remain_count * avg) / 60 if avg else 0
            line = (f"  [{i:>3}/{len(records)}] {tag:<32} "
                    f"{r['category']:<14} {r['name'][:60]}  eta {eta_min:.1f}m")
            print(line, flush=True)
            log_lines.append(line)

    print()
    print(f"Done. ok={done} skipped={skipped} failed={failed} missing={missing} "
          f"chars={total_chars:,} elapsed={(time.time()-started)/60:.1f} min")
    # Save a run log next to source-docs for debugging / re-runs
    (ROOT / "OCR-RUN.log").write_text("\n".join(log_lines), encoding="utf-8")
    return 0 if (failed + missing) == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
