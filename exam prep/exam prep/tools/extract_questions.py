"""Extract numbered exam questions from every .txt file in source-docs/exam-papers/.

Outputs:
  source-docs/practice-bank/raw_questions.json  — structured catalog
  source-docs/practice-bank/raw_questions.md    — human-readable index
  source-docs/practice-bank/by-paper.md         — per-paper question listing

Schema (raw_questions.json):
{
  "generated_at": "...",
  "paper_count": N,
  "question_count": N,
  "papers": [
    {
      "paper_id": "sgt-law-2021",
      "filename": "Sgt Law 2021.txt",
      "subject": "Law",
      "rank": "Sergeant",
      "year": 2021,
      "verdict": "TEXT" | "OCR",
      "questions": [
        { "qid": "sgt-law-2021-q1", "number": 1, "marks": 10,
          "text": "...", "section": "A",
          "type": "essay" | "list" | "definition" | "scenario" | "mcq" | "fill-blank",
          "topic_tags": ["Firearms Act", "Sexual Offences Act"] }
      ]
    }
  ]
}
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "source-docs"
EXAM_DIR = ROOT / "exam-papers"
OUT_DIR = ROOT / "practice-bank"


# ---- Header detection ----------------------------------------------------- #
HEADER_END_PATTERNS = [
    r"^\s*SECTION\s+[A-Z0-9]+",
    r"^\s*Section\s+[A-Z0-9]+",
    r"^\s*1[\.)]\s+\S",  # bare "1." starting a question
    r"^\s*[IlT][\.)]\s+\S",  # OCR may give "I." or "l." instead of "1."
]
HEADER_END_RE = re.compile("|".join(HEADER_END_PATTERNS), re.IGNORECASE)

QUESTION_NUM_RE = re.compile(
    r"^\s*"
    r"(?:\(\s*(\d{1,2})\s*\)|(\d{1,2})[\.,)])"   # "(1)" or "( 1 )" or "1." or "1)"
    r"\s+(.+)$"
)
# OCR sometimes turns "1." into "I." or "l." or "T." — handle the most common
QUESTION_OCR_FALLBACK_RE = re.compile(r"^\s*([IlT])[\.,)]\s+(.+)$")
# MCQ option lines:  "(A) ..." or "(A.) ..."
MCQ_OPTION_RE = re.compile(r"^\s*\(?([A-D])[\.)\s]\s*(.+)$")
# Mark allocations
MARKS_RE = re.compile(r"\((\d{1,2})\s*marks?\)", re.IGNORECASE)
# "SECTION A" or "Section 1A - Procedural" or just "Section B"
SECTION_RE = re.compile(r"^\s*SECTION\s+([A-Z0-9]+)(?:\s*[-:]?\s*(.*))?$",
                        re.IGNORECASE)
PAGE_BREAK_RE = re.compile(r"^\s*---\s*page break\s*---\s*$", re.IGNORECASE)
# Leading scanner garbage on each line (pipe characters, dashes, dots, colons,
# tildes left over from table-cell OCR)
LEADING_NOISE_RE = re.compile(r"^[\s\|\.\:\;\-_~`'\"\\\/]+")
TRAILING_NOISE_RE = re.compile(r"[\s\|\\]+$")


# ---- Filename parsing ----------------------------------------------------- #
def parse_paper_meta(filename: str) -> dict:
    name = filename.replace(".txt", "")
    n = name.lower()

    # Year
    year_match = re.search(r"\b(19|20)\d{2}\b", name)
    year = int(year_match.group()) if year_match else None

    # Rank
    if "sergeant" in n or " sgt" in n or n.startswith("sgt") \
            or re.search(r"\bsgt\b", n):
        rank = "Sergeant"
    elif "corporal" in n or " cpl" in n or n.startswith("cpl") \
            or re.search(r"\bcpl\b", n):
        rank = "Corporal"
    elif "inspector" in n:
        rank = "Inspector"
    else:
        rank = "Unknown"

    # Subject
    if re.search(r"\bduties\b", n):
        subject = "Police Duties"
    elif re.search(r"\blaw\b", n):
        subject = "Law"
    elif "supervision" in n or "management" in n:
        subject = "Police Supervision/Management"
    elif "communication" in n:
        subject = "Business Communication"
    else:
        subject = "Unknown"

    # Slug for stable IDs
    slug_parts = []
    if rank != "Unknown":
        slug_parts.append(rank.lower())
    if subject != "Unknown":
        slug_parts.append(re.sub(r"[/ ]+", "-", subject.lower()))
    if year:
        slug_parts.append(str(year))
    if not slug_parts:
        slug_parts.append(re.sub(r"[^a-z0-9]+", "-", n).strip("-")[:40])
    slug = "-".join(slug_parts)

    return {"rank": rank, "subject": subject, "year": year, "slug": slug}


# ---- Topic tagging -------------------------------------------------------- #
TOPIC_PATTERNS: list[tuple[str, list[str]]] = [
    ("Firearms Act",            ["firearm", "ammunition", "fua", "ful"]),
    ("Sexual Offences Act",     ["sexual offences", "rape", "indecent assault",
                                 "child pornography", "incest"]),
    ("Domestic Violence Act",   ["domestic violence", "protection order"]),
    ("Dangerous Drugs Act",     ["dangerous drug", "marijuana", "cocaine",
                                 "trafficking in", "narcotic"]),
    ("Offences Against the Person Act", ["murder", "manslaughter", "wounding",
                                          "assault occasioning", "assault by beating",
                                          "kidnapping"]),
    ("Larceny / Property",      ["larceny", "stealing", "burglary", "robbery",
                                 "house breaking", "praedial"]),
    ("Summary Courts Act",      ["summary courts", "justice of the peace",
                                 "magistrate"]),
    ("Bail Act",                ["bail "]),
    ("Police Service Act",      ["police service act", "powers of constable",
                                 "powers of police"]),
    ("Constitution",            ["constitution", "section 4", "section 5",
                                 "fundamental rights"]),
    ("PSR — Conduct/Discipline", ["psr", "police service regulations",
                                   "disciplinary", "reg 150", "reg 142"]),
    ("Standing Orders",         ["standing order", "s.o.", "station diary"]),
    ("Judges' Rules",           ["judges rule", "judges' rule", "judge's rule",
                                 "caution"]),
    ("Evidence",                ["dying declaration", "identification evidence",
                                 "r v turnbull", "admissibility"]),
    ("Procedure / Charges",     ["procedure ", "modify the charge", "preferred",
                                 "court"]),
    ("Crime scene / SOCO",      ["crime scene", "exhibits", "chain of custody",
                                 "soco"]),
    ("Management — Leadership", ["leadership", "leader style", "contingency",
                                 "proactive leader"]),
    ("Management — Motivation", ["maslow", "herzberg", "mcgregor", "motivat"]),
    ("Management — Planning",   ["strategic plan", "operational plan",
                                 "tactical plan"]),
    ("Management — Communication", ["hierarchical communication",
                                     "obstacle to good communication",
                                     "communication"]),
    ("Management — Decision Making", ["decision making", "decision-making",
                                      "alternative solutions"]),
]


def tag_topics(text: str) -> list[str]:
    t = text.lower()
    out = []
    for label, kws in TOPIC_PATTERNS:
        if any(k in t for k in kws):
            out.append(label)
    return out


def classify_qtype(text: str) -> str:
    t = text.lower()
    # Hint: MCQ are detected separately by structural parsing
    if re.search(r"\b(state|list|name|identify)\b", t[:120]):
        return "list"
    if re.search(r"\b(define|definition|what is meant by|explain the term|"
                 r"meaning of)\b", t[:200]):
        return "definition"
    if re.search(r"\bdiscuss\s+fully\b", t):
        return "scenario"
    if re.search(r"\b(advise|advise the|advise him|state your responsibility|"
                 r"how would you|what would you|what action)\b", t):
        return "scenario"
    if re.search(r"\b(blank|reproduce.*complete|fill.*spaces|partial definition)\b", t):
        return "fill-blank"
    if re.search(r"\b(explain|describe|outline)\b", t[:120]):
        return "explain"
    return "essay"


# ---- Body cleaning -------------------------------------------------------- #
def denoise_line(line: str) -> str:
    """Strip OCR scanner cruft from the start/end of a line."""
    s = LEADING_NOISE_RE.sub("", line)
    s = TRAILING_NOISE_RE.sub("", s)
    return s


def cut_header(lines: list[str]) -> list[str]:
    """Drop the front-matter header up to the first SECTION or first '1.'."""
    for i, line in enumerate(lines):
        if HEADER_END_RE.match(line):
            return lines[i:]
    return lines


def strip_page_breaks(lines: list[str]) -> list[str]:
    return [l for l in lines if not PAGE_BREAK_RE.match(l)]


def clean_text(text: str) -> str:
    # Collapse whitespace inside lines but keep paragraph breaks
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Drop scanner cruft like "| |", standalone single OCR garbage chars
    text = re.sub(r"^\s*\|\s*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\s*\|\s*", " ", text)  # OCR table-cell pipes
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ---- Main extraction ------------------------------------------------------ #
def extract_questions_from_paper(text: str, paper_meta: dict) -> list[dict]:
    """Walk the paper text and return a list of question dicts."""
    lines = text.split("\n")
    lines = strip_page_breaks(lines)
    # Denoise every line BEFORE header-cut so the patterns can hit
    lines = [denoise_line(l) for l in lines]
    lines = cut_header(lines)

    questions: list[dict] = []
    current_section = None
    current_q: dict | None = None
    buffer: list[str] = []

    def flush_current():
        nonlocal current_q, buffer
        if current_q is None:
            return
        body = clean_text("\n".join(buffer))
        if not body or len(body) < 12:
            current_q = None
            buffer = []
            return
        # Marks
        marks_matches = MARKS_RE.findall(body)
        marks = sum(int(m) for m in marks_matches) if marks_matches else None
        # Topic + type
        topics = tag_topics(body)
        qtype = classify_qtype(body)
        current_q.update({
            "text": body,
            "marks": marks,
            "section": current_section,
            "type": qtype,
            "topic_tags": topics,
        })
        questions.append(current_q)
        current_q = None
        buffer = []

    last_n = 0
    for line in lines:
        if not line.strip():
            if current_q is not None:
                buffer.append(line)
            continue

        sec_m = SECTION_RE.match(line)
        if sec_m:
            flush_current()
            current_section = sec_m.group(1)
            continue

        # Try regular numbered question
        m = QUESTION_NUM_RE.match(line)
        n = None
        rest = None
        if m:
            n = int(m.group(1) or m.group(2))
            rest = m.group(3)
        else:
            # OCR fallback for "1.", "10." misread as "I.", "l.", "T."
            mo = QUESTION_OCR_FALLBACK_RE.match(line)
            if mo and last_n == 0:
                # Only treat as Q1 if we haven't seen a numbered question yet
                n = 1
                rest = mo.group(2)

        # Reasonable next-number constraint: must be 1..20 and roughly sequential
        # (allows skipping for sub-parts but rejects random small ints in body)
        if n is not None and 1 <= n <= 30 and (n == last_n + 1 or n == 1 or n == last_n):
            # Treat as start of a new question (or restart of one within section)
            if n == last_n and current_q is not None:
                # duplicate — skip
                buffer.append(line)
                continue
            flush_current()
            current_q = {
                "qid": f"{paper_meta['slug']}-q{n}",
                "number": n,
            }
            buffer = [rest if rest else ""]
            last_n = n
            continue

        if current_q is not None:
            buffer.append(line)

    flush_current()
    return questions


# ---- MCQ extraction (special) -------------------------------------------- #
def extract_mcqs_from_paper(text: str, paper_meta: dict) -> list[dict]:
    """For MCQ-style papers, parse Q + A/B/C/D options."""
    lines = text.split("\n")
    lines = strip_page_breaks(lines)
    lines = [denoise_line(l) for l in lines]
    lines = cut_header(lines)

    mcqs: list[dict] = []
    current_q: dict | None = None
    options: dict[str, list[str]] = {}
    current_letter: str | None = None
    last_n = 0

    def flush_mcq():
        nonlocal current_q, options, current_letter
        if current_q is None:
            return
        opts = {k: clean_text(" ".join(v)) for k, v in options.items()}
        if len(opts) < 2:
            # Not really an MCQ
            current_q = None
            options = {}
            current_letter = None
            return
        current_q["options"] = opts
        current_q["text"] = clean_text(current_q["text"])
        current_q["topic_tags"] = tag_topics(current_q["text"]
                                             + " " + " ".join(opts.values()))
        mcqs.append(current_q)
        current_q = None
        options = {}
        current_letter = None

    for line in lines:
        s = line.strip()
        if not s:
            continue

        m = QUESTION_NUM_RE.match(line)
        if m:
            n = int(m.group(1) or m.group(2))
            if 1 <= n <= 30 and (n == last_n + 1 or n == 1):
                flush_mcq()
                current_q = {
                    "qid": f"{paper_meta['slug']}-mcq{n}",
                    "number": n,
                    "type": "mcq",
                    "marks": 1,
                    "text": m.group(3),
                }
                last_n = n
                current_letter = None
                continue

        opt = MCQ_OPTION_RE.match(line)
        if opt and current_q is not None:
            current_letter = opt.group(1).upper()
            options.setdefault(current_letter, []).append(opt.group(2))
            continue

        if current_q is not None:
            if current_letter is not None:
                options[current_letter].append(s)
            else:
                current_q["text"] += " " + s

    flush_mcq()
    return mcqs


def looks_like_mcq_paper(text: str) -> bool:
    return bool(re.search(r"MULTIPLE\s+CHOICE\s+QUESTION", text, re.IGNORECASE)) \
        and len(MCQ_OPTION_RE.findall(text[:500])) >= 0  # weak; combined w/ keyword


# ---- Driver --------------------------------------------------------------- #
def main() -> int:
    if not EXAM_DIR.exists():
        print(f"FATAL: {EXAM_DIR} missing")
        return 2
    OUT_DIR.mkdir(exist_ok=True)

    papers = []
    total_questions = 0
    total_mcqs = 0

    for txt in sorted(EXAM_DIR.glob("*.txt")):
        meta = parse_paper_meta(txt.name)
        text = txt.read_text(encoding="utf-8", errors="ignore")
        verdict = "TEXT"
        sib_json = txt.with_suffix(".json")
        if sib_json.exists():
            try:
                m = json.loads(sib_json.read_text(encoding="utf-8"))
                verdict = m.get("verdict", "TEXT")
            except Exception:
                pass

        questions = extract_questions_from_paper(text, meta)

        # If the paper looks like an MCQ paper, run the MCQ parser too
        # and attach as a separate "mcqs" list
        mcqs: list[dict] = []
        if looks_like_mcq_paper(text):
            mcqs = extract_mcqs_from_paper(text, meta)

        paper_record = {
            "paper_id": meta["slug"],
            "filename": txt.name,
            "subject": meta["subject"],
            "rank": meta["rank"],
            "year": meta["year"],
            "verdict": verdict,
            "question_count": len(questions),
            "mcq_count": len(mcqs),
            "questions": questions,
            "mcqs": mcqs,
        }
        papers.append(paper_record)
        total_questions += len(questions)
        total_mcqs += len(mcqs)

    out = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "paper_count": len(papers),
        "question_count": total_questions,
        "mcq_count": total_mcqs,
        "papers": papers,
    }

    (OUT_DIR / "raw_questions.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    # Human-readable Markdown index
    md = [
        f"# TTPS Past Papers — Question Index\n",
        f"_Generated {out['generated_at']}._\n",
        f"\n**{len(papers)} papers · {total_questions} long-form questions"
        f" · {total_mcqs} MCQs extracted**\n\n",
        "| Paper | Subject | Rank | Year | Long-form Qs | MCQs |\n",
        "|---|---|---|---|---|---|\n",
    ]
    for p in sorted(papers, key=lambda p: (p["rank"], p["subject"], p["year"] or 0)):
        md.append(f"| `{p['filename']}` | {p['subject']} | {p['rank']} | "
                  f"{p['year'] or '?'} | {p['question_count']} | {p['mcq_count']} |\n")
    (OUT_DIR / "raw_questions.md").write_text("".join(md), encoding="utf-8")

    # Per-paper detail file
    detail = ["# Per-Paper Question Detail\n\n"]
    for p in sorted(papers, key=lambda p: (p["rank"], p["subject"], -(p["year"] or 0))):
        detail.append(f"## {p['filename']} — {p['rank']} {p['subject']} "
                      f"{p['year'] or ''}  \n")
        detail.append(f"_{p['question_count']} long-form · {p['mcq_count']} "
                      f"MCQ · verdict={p['verdict']}_\n\n")
        for q in p["questions"]:
            tags = ", ".join(q.get("topic_tags") or []) or "_no tags_"
            marks = f"({q.get('marks')} marks)" if q.get("marks") else ""
            sect = f" [§{q['section']}]" if q.get("section") else ""
            preview = (q.get("text") or "")[:240].replace("\n", " ")
            detail.append(f"- **Q{q['number']}**{sect} {marks} `{q['type']}` "
                          f"_tags: {tags}_  \n  {preview}\n")
        if p["mcqs"]:
            detail.append("\n**MCQs:**\n")
            for q in p["mcqs"][:5]:  # show first 5 only in summary
                preview = (q.get("text") or "")[:140].replace("\n", " ")
                detail.append(f"- **MCQ{q['number']}**: {preview}\n")
            if len(p["mcqs"]) > 5:
                detail.append(f"- _...and {len(p['mcqs']) - 5} more MCQs_\n")
        detail.append("\n")
    (OUT_DIR / "by-paper.md").write_text("".join(detail), encoding="utf-8")

    # Console summary
    print(f"Extracted from {len(papers)} papers:")
    print(f"  long-form questions: {total_questions}")
    print(f"  MCQs:                {total_mcqs}")
    print()
    print(f"Output:")
    print(f"  {OUT_DIR / 'raw_questions.json'}")
    print(f"  {OUT_DIR / 'raw_questions.md'}")
    print(f"  {OUT_DIR / 'by-paper.md'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
