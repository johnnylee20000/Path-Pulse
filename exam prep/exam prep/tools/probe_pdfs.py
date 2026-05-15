"""Probe a sample of PDFs to determine if they are text-based or scanned images.

Heuristic: a text PDF yields meaningful character count per page.
A scanned PDF typically yields 0 or very few characters per page.
"""
from __future__ import annotations
import sys
from pathlib import Path
import pypdf

ROOT = Path(r"D:\Treavajo\new standing orders")

SAMPLES = [
    # Standing Orders (top level) - varied sizes
    "SO 18-Wanted Persons.pdf",                # 18 KB - tiny
    "SO 22-Licensed Premises.pdf",             # 23 KB
    "SO 38-Charge Room.pdf",                   # 23 KB
    "SO 32-Statements.pdf",                    # 39 KB
    "SO 33-Mentally Ill Persons.pdf",          # 16 KB
    "SO 02-Distribution of Personnel.pdf",     # 303 KB - mid
    "SO 13-Inspection + Visits.pdf",           # 730 KB - large
    "SO 44-Motor Vehicles + Road Traffic Control.pdf",  # 708 KB
    # Departmental Orders (in past papers folder)
    r"caselaws and other information used in policing\past papers for exams\131-2024 PT II Amendment to SO 43 and DO 107-2021.pdf",
    r"caselaws and other information used in policing\past papers for exams\167-2023 PT II Use of Body Worn Cameras.pdf",
    r"caselaws and other information used in policing\past papers for exams\186-2022 PT. II DNA Samples.pdf",
    # Past exam papers
    r"caselaws and other information used in policing\past papers for exams\1 Police Duties Sgt 2011.pdf",
    r"caselaws and other information used in policing\past papers for exams\2 Sgt Law 2012.pdf",
    # TTPS Documents
    r"caselaws and other information used in policing\TTPS Documents\Criminal Procedure Rules Manual presentation.pdf",
]

def probe(p: Path) -> dict:
    try:
        reader = pypdf.PdfReader(str(p))
        pages = len(reader.pages)
        sample_text = ""
        chars_total = 0
        # extract text from up to 3 pages and aggregate
        for i, page in enumerate(reader.pages[:3]):
            t = page.extract_text() or ""
            chars_total += len(t)
            if i == 0:
                sample_text = t[:160].replace("\n", " ")
        chars_per_page = chars_total / max(min(pages, 3), 1)
        verdict = "TEXT" if chars_per_page > 200 else ("MIXED" if chars_per_page > 30 else "SCAN")
        return {
            "ok": True,
            "pages": pages,
            "chars_per_page": int(chars_per_page),
            "verdict": verdict,
            "sample": sample_text,
        }
    except Exception as e:
        return {"ok": False, "error": f"{type(e).__name__}: {e}"}

def fmt_size(p: Path) -> str:
    s = p.stat().st_size
    if s < 1024:
        return f"{s} B"
    if s < 1024 * 1024:
        return f"{s/1024:.1f} KB"
    return f"{s/(1024*1024):.1f} MB"

def main() -> int:
    print(f"{'VERDICT':<7} {'PAGES':>5} {'C/PAGE':>7} {'SIZE':>10}  FILE")
    print("-" * 100)
    for rel in SAMPLES:
        p = ROOT / rel
        if not p.exists():
            print(f"{'MISS':<7} {'':>5} {'':>7} {'':>10}  {rel}")
            continue
        r = probe(p)
        if not r["ok"]:
            print(f"{'ERR':<7} {'':>5} {'':>7} {fmt_size(p):>10}  {p.name}  -- {r['error']}")
            continue
        print(f"{r['verdict']:<7} {r['pages']:>5} {r['chars_per_page']:>7} {fmt_size(p):>10}  {p.name}")
        if r["sample"]:
            print(f"        sample: {r['sample']!r}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
