"""Re-OCR specific PDFs that were scanned upside-down or sideways.

Tesseract's image_to_osd() returns the rotation of the page text.
We rotate the rendered image by that angle BEFORE running OCR proper.

Targeted at the small set of papers identified as 0-question after the
first OCR pass — usually because the page was upside-down.

Usage:
    python tools/reocr_rotated.py "Law Sgt 2018.pdf" "Law Cpl 2018.pdf" ...
    python tools/reocr_rotated.py --auto    # find 0-char .txt files in exam-papers
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
from io import BytesIO
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "source-docs"
SOURCE_ROOT = Path(r"D:\Treavajo\new standing orders")
TESS = Path(r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if TESS.exists():
    pytesseract.pytesseract.tesseract_cmd = str(TESS)

OCR_DPI = 300
OCR_LANG = "eng"


def find_source_pdf(stem_query: str) -> Path | None:
    """Look up the original PDF in the manifest."""
    manifest = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))
    q = stem_query.lower().strip()
    if q.endswith(".pdf"):
        q = q[:-4]
    for r in manifest["records"]:
        src = r["source"]
        if Path(src).stem.lower() == q or q in Path(src).name.lower():
            full = SOURCE_ROOT / src
            if full.exists():
                return full
    return None


def detect_rotation(img: Image.Image) -> int:
    """Return rotation in degrees needed to make text upright (0/90/180/270)."""
    try:
        osd = pytesseract.image_to_osd(img)
        m = re.search(r"Rotate:\s*(\d+)", osd)
        if m:
            return int(m.group(1))
    except Exception:
        pass
    return 0


def ocr_page(img: Image.Image) -> str:
    return pytesseract.image_to_string(img, lang=OCR_LANG, config="--oem 3 --psm 6")


def reocr_pdf(pdf: Path) -> tuple[list[str], int]:
    pages: list[str] = []
    rotations: list[int] = []
    doc = fitz.open(str(pdf))
    try:
        for pg in doc:
            pix = pg.get_pixmap(dpi=OCR_DPI, alpha=False)
            img = Image.open(BytesIO(pix.tobytes("png")))
            rot = detect_rotation(img)
            rotations.append(rot)
            if rot:
                img = img.rotate(-rot, expand=True)  # rotate counter-clockwise
            pages.append(ocr_page(img))
    finally:
        doc.close()
    chars = sum(len(p) for p in pages)
    print(f"    rotations applied: {rotations}  chars: {chars}")
    return pages, chars


def update_existing_outputs(stem_query: str, pages: list[str], chars: int,
                             pdf: Path, src_rel: str) -> bool:
    """Find an existing .txt/.json in source-docs/exam-papers (or anywhere)
    matching this stem and overwrite. Otherwise write a new pair."""
    candidates = list(ROOT.rglob(f"{stem_query}*.txt"))
    # Filter to files whose name (without our 8-char hash suffix) matches
    body = "\n\n--- page break ---\n\n".join(pages)

    # Try to locate the prior generated .txt by exact stem
    target_txt = None
    target_json = None
    if candidates:
        # Prefer one whose stem == stem_query (no hash suffix)
        for c in candidates:
            if c.stem == stem_query:
                target_txt = c
                break
        if target_txt is None:
            target_txt = candidates[0]
        target_json = target_txt.with_suffix(".json")

    if target_txt is None:
        target_dir = ROOT / "exam-papers"
        target_dir.mkdir(exist_ok=True)
        target_txt = target_dir / f"{stem_query}.txt"
        target_json = target_dir / f"{stem_query}.json"

    target_txt.write_text(body, encoding="utf-8")
    meta = {
        "source": src_rel,
        "ok": True,
        "pages": len(pages),
        "chars_total": chars,
        "chars_per_page": chars // max(1, len(pages)),
        "verdict": "OCR",
        "category": "exam-papers",
        "subcategory": "rotation-fixed",
        "txt_out": f"exam-papers/{target_txt.name}",
        "ocr": {"engine": "tesseract", "lang": OCR_LANG, "dpi": OCR_DPI,
                "rotation_aware": True},
        "page_text": pages,
    }
    target_json.write_text(json.dumps(meta, ensure_ascii=False, indent=2),
                           encoding="utf-8")
    print(f"    wrote: {target_txt.relative_to(ROOT)}")
    return True


def find_zero_char_papers() -> list[str]:
    """Return PDF stems of exam-papers .txt files with <500 useful chars or
    obviously gibberish."""
    out = []
    GIBBERISH_RE = re.compile(r"\b(syxeur|aouayjo|aouajzjo|aduayjo|stew)\b",
                              re.IGNORECASE)
    for txt in (ROOT / "exam-papers").glob("*.txt"):
        try:
            content = txt.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        sz = len(content)
        if sz < 500:
            out.append(txt.stem)
            continue
        # Heuristic: gibberish patterns we observed (words with backwards letters
        # like "aouayjo" = "offence" reversed) appearing 5+ times = upside-down OCR
        if len(GIBBERISH_RE.findall(content)) >= 5:
            out.append(txt.stem)
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("targets", nargs="*",
                    help="PDF filenames or stems to re-OCR")
    ap.add_argument("--auto", action="store_true",
                    help="auto-detect 0-char/gibberish files in exam-papers")
    args = ap.parse_args()

    targets = list(args.targets)
    if args.auto:
        targets.extend(find_zero_char_papers())
        targets = sorted(set(targets))

    if not targets:
        print("No targets. Pass filenames/stems or use --auto.")
        return 1

    print(f"Re-OCRing {len(targets)} paper(s) with rotation detection...")
    print()
    started = time.time()
    ok = fail = 0

    for i, t in enumerate(targets, 1):
        print(f"[{i}/{len(targets)}] {t}")
        pdf = find_source_pdf(t)
        if pdf is None:
            print(f"    ! could not find source PDF in manifest")
            fail += 1
            continue
        try:
            pages, chars = reocr_pdf(pdf)
        except Exception as e:
            print(f"    ! OCR failed: {e}")
            fail += 1
            continue

        # Find which manifest record this matches to get src_rel
        src_rel = str(pdf.relative_to(SOURCE_ROOT)).replace("\\", "/")
        update_existing_outputs(t, pages, chars, pdf, src_rel)
        ok += 1

    print()
    print(f"Done. ok={ok} fail={fail} elapsed={(time.time()-started)/60:.1f} min")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
