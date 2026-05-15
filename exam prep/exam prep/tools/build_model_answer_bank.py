#!/usr/bin/env python3
"""
Build grouped question bank with one model-answer block per bank item (essay + MCQ).

**Prefer** `tools/build_enriched_question_bank.py` — it splits compound OCR, adds
`question-chunks.json`, material refs/gaps, and overwrites this file.

Reads:
  src/data/past-questions.json
  src/data/sergeant-model-hints.json

Writes:
  src/data/question-bank-model-answers.json

Grouping:
  Police Duties -> duties
  Law -> law
  Police Supervision/Management, Business Communication -> management
  Unknown -> heuristic from paper_id / text
"""
from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PAST = ROOT / "src" / "data" / "past-questions.json"
HINTS = ROOT / "src" / "data" / "sergeant-model-hints.json"
OUT = ROOT / "src" / "data" / "question-bank-model-answers.json"

MAX_HINT_BLOCKS = 4

SO_RE = re.compile(
    r"(?:standing\s+order|stand(?:ing)?\s*order|s\.?\s*o\.?\s*)[\s:]*(\d{1,3})\b",
    re.I,
)
REG_RE = re.compile(
    r"(?:reg(?:ulation)?s?\.?|reg\.?)\s*(\d{1,3})\b",
    re.I,
)
SEC_RE = re.compile(
    r"section\s*(\d+[a-z]?)\s*(?:\(?\s*(\d+)\s*\)?)?\s*(?:of\s+the\s+)?([A-Za-z][A-Za-z\s\.\'\-]{4,80}?)(?:\s+Act|\s+Chap|\s+Chapter|,|\.)",
    re.I,
)
DO_RE = re.compile(r"(?:departmental\s+order|d\.?\s*o\.?)\s*(\d+)\s*/\s*(\d{2,4})", re.I)


def extract_citations(text: str) -> dict[str, list[str]]:
    t = text or ""
    sos = sorted({f"S.O. {m.group(1)}" for m in SO_RE.finditer(t)})
    regs = sorted({f"Reg {m.group(1)}" for m in REG_RE.finditer(t)})
    secs: list[str] = []
    for m in SEC_RE.finditer(t):
        sn = m.group(1) or ""
        sub = m.group(2)
        act = (m.group(3) or "").strip()
        if sub:
            secs.append(f"Section {sn}({sub}) {act}".strip())
        else:
            secs.append(f"Section {sn} {act}".strip())
    dos = sorted({f"DO {m.group(1)}/{m.group(2)}" for m in DO_RE.finditer(t)})
    return {"standing_orders": sos[:12], "regulations": regs[:12], "act_sections": secs[:12], "dept_orders": dos[:8]}


def subject_to_track(subject: str, paper_id: str, text: str) -> str:
    s = (subject or "").strip()
    pid = (paper_id or "").lower()
    t = (text or "").lower()
    if s == "Law":
        return "law"
    if s in ("Police Supervision/Management", "Business Communication"):
        return "management"
    if s == "Police Duties":
        return "duties"
    if "law" in pid:
        return "law"
    if "management" in pid or "supervision" in pid:
        return "management"
    if "duties" in pid or "police-duties" in pid:
        return "duties"
    if any(k in t for k in ("murder", "larceny", "bail act", "section ", "offence", "mens rea", "actus")):
        return "law"
    if any(k in t for k in ("leadership", "motivation", "planning", "strategic", "posdcorb", "herzberg")):
        return "management"
    return "duties"


def haystack(text: str, tags: list) -> str:
    parts = [text or ""]
    if tags:
        parts.append(" ".join(str(x) for x in tags))
    return " ".join(parts).lower()


def find_hints(blocks: list, text: str, tags: list, limit: int) -> list:
    hay = haystack(text, tags or [])
    hits: list = []
    for block in blocks:
        kws = block.get("keywords") or []
        if not kws or not block.get("bullets"):
            continue
        for kw in kws:
            if str(kw).lower() in hay:
                hits.append(block)
                break
        if len(hits) >= limit:
            break
    return hits


def paper_title(p: dict) -> str:
    r = p.get("rank") or ""
    s = p.get("subject") or ""
    y = p.get("year")
    return f"{r} {s} {y}".strip()


def synthesize_long(
    q: dict,
    paper: dict,
    track: str,
    hints: list,
) -> str:
    marks = q.get("marks")
    rank = paper.get("rank") or "Sergeant"
    year = paper.get("year")
    subj = paper.get("subject") or ""
    mtxt = f"{marks} marks" if marks is not None else "the marks shown on the paper"

    lines: list[str] = []
    lines.append(
        f"**Model answer (draft)** — {rank}, {subj} ({year}), ~{mtxt}. "
        f"In the exam, replace this sketch with verbatim rules from the official Standing Orders, Acts, and PSR."
    )
    cite = extract_citations(q.get("text") or "")
    flat_cites = []
    flat_cites.extend(cite["standing_orders"])
    flat_cites.extend(cite["regulations"])
    flat_cites.extend(cite["dept_orders"])
    flat_cites.extend(cite["act_sections"])
    if flat_cites:
        lines.append("")
        lines.append(
            "**Authorities named or implied in this OCR stem (verify numbers):** "
            + "; ".join(dict.fromkeys(flat_cites))
        )

    lines.append("")
    lines.append("**Recommended structure**")
    if track == "law":
        lines.append(
            "1. Name the statute/offence/procedure requested and its policy purpose in one sentence.\n"
            "2. State the legal rule: elements, subsections, or statutory list the question asks for—use the paper’s numbering (a), (b).\n"
            "3. If a problem scenario is given, apply each rule to the facts in the same order as the marks.\n"
            "4. Finish with a short conclusion (liable / not liable; charge appropriate; bail considerations) as required."
        )
    elif track == "management":
        lines.append(
            "1. Define the management/leadership/communication concept in clear everyday language.\n"
            "2. Cite the framework or author expected by the syllabus (where relevant) and contrast alternatives if asked.\n"
            "3. Give at least one practical TTPS illustration (briefing, discipline, change, welfare, community contact).\n"
            "4. For evaluate/compare items, balance strengths and limits before a reasoned conclusion."
        )
    else:
        lines.append(
            "1. Open by identifying your role (Sergeant / SDO) and the operational or custody context.\n"
            "2. For each Standing Order, DO, PSR regulation, or Act limb, state the rule then translate it into what officers must actually do.\n"
            "3. Cover documentation (Diary, registers), supervision, safety, and escalation to senior command where the stem implies it.\n"
            "4. Mirror the paper’s (a)/(b) split so markers can tick every allocation line."
        )

    if hints:
        lines.append("")
        lines.append("**Content you should expand into full prose (keyword-matched outlines)**")
        for h in hints:
            lines.append(f"- **{h.get('title', 'Topic')}**")
            for b in h.get("bullets") or []:
                lines.append(f"  - {b}")
    else:
        lines.append("")
        lines.append(
            "**No keyword outline matched this OCR.** Pull every explicit citation in the question "
            "(S.O. number, Reg number, Act + section) and draft one numbered paragraph per citation."
        )

    lines.append("")
    lines.append(
        "_OCR in the past paper text can corrupt citations. Cross-check all numbers and names against consolidated legislation and the current S.O. volume before memorising._"
    )
    return "\n".join(lines)


def synthesize_mcq(q: dict, paper: dict, track: str, hints: list) -> str:
    opts = q.get("options") or {}
    stem = q.get("text") or ""
    low = stem.lower()

    lines: list[str] = []
    lines.append(
        f"**Model reasoning (MCQ)** — {paper_title(paper)}. "
        "The scraped bank does not store the official answer key; use elimination from your notes, then confirm from the source paper if needed."
    )
    lines.append("")
    for k in ("A", "B", "C", "D"):
        if k in opts and opts[k]:
            lines.append(f"- **{k}.** {opts[k]}")
    lines.append("")

    if " not " in low or "except" in low or "not among" in low:
        lines.append(
            "**Technique:** For NOT/EXCEPT questions, discard options that faithfully describe the textbook concept; "
            "the outlier is often vague, punitive, or unrelated to the definition (e.g. blaming a person instead of analysing a problem)."
        )
    elif "two" in low and ("following" in low or "pillars" in low or "new" in low):
        lines.append(
            "**Technique:** List questions—reconcile the stem with the exact wording of the current TTPS Strategic / Operating Plan documents; "
            "two correct facts may only appear together in one option."
        )
    else:
        lines.append(
            "**Technique:** Map the stem to your one-page summary for that topic; eliminate options that contradict core definitions."
        )

    if hints:
        lines.append("")
        lines.append("**Related topic reminders**")
        for h in hints[:2]:
            lines.append(f"- {h.get('title', '')}: " + "; ".join((h.get("bullets") or [])[:2]))

    return "\n".join(lines)


def main() -> None:
    past = json.loads(PAST.read_text(encoding="utf-8"))
    hint_doc = json.loads(HINTS.read_text(encoding="utf-8"))
    blocks = hint_doc.get("by_keyword") or []

    out_tracks: dict[str, list] = {"duties": [], "law": [], "management": []}

    for paper in past.get("papers") or []:
        pid = paper.get("paper_id") or ""
        ptitle = paper_title(paper)

        for q in paper.get("questions") or []:
            text = q.get("text") or ""
            track = subject_to_track(paper.get("subject") or "", pid, text)
            hints = find_hints(blocks, text, q.get("topic_tags") or [], MAX_HINT_BLOCKS)
            model = synthesize_long(q, paper, track, hints)
            out_tracks[track].append(
                {
                    "qid": q.get("qid"),
                    "kind": "long",
                    "track": track,
                    "paper_id": pid,
                    "paper_title": ptitle,
                    "rank": paper.get("rank"),
                    "year": paper.get("year"),
                    "subject": paper.get("subject"),
                    "number": q.get("number"),
                    "marks": q.get("marks"),
                    "type": q.get("type"),
                    "topic_tags": q.get("topic_tags") or [],
                    "question_text": text,
                    "hint_titles": [h.get("title") for h in hints],
                    "model_answer": model,
                }
            )

        for q in paper.get("mcqs") or []:
            text = q.get("text") or ""
            track = subject_to_track(paper.get("subject") or "", pid, text)
            hints = find_hints(blocks, text, q.get("topic_tags") or [], MAX_HINT_BLOCKS)
            model = synthesize_mcq(q, paper, track, hints)
            out_tracks[track].append(
                {
                    "qid": q.get("qid"),
                    "kind": "mcq",
                    "track": track,
                    "paper_id": pid,
                    "paper_title": ptitle,
                    "rank": paper.get("rank"),
                    "year": paper.get("year"),
                    "subject": paper.get("subject"),
                    "number": q.get("number"),
                    "marks": q.get("marks"),
                    "type": "mcq",
                    "topic_tags": q.get("topic_tags") or [],
                    "question_text": text,
                    "options": q.get("options"),
                    "hint_titles": [h.get("title") for h in hints],
                    "model_answer": model,
                }
            )

    counts = {k: len(v) for k, v in out_tracks.items()}
    total = sum(counts.values())

    payload = {
        "version": 1,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": {"past_questions": str(PAST.name), "hints": str(HINTS.name)},
        "disclaimer": (
            "Each entry is one bank question (OCR text preserved). Model answers are study scaffolding: "
            "structure, technique, and keyword-matched outlines—not official mark schemes. "
            "Verify every statutory and S.O. reference in primary materials."
        ),
        "counts_by_track": counts,
        "total_questions": total,
        "tracks": out_tracks,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} — {total} items: duties={counts['duties']} law={counts['law']} management={counts['management']}")


if __name__ == "__main__":
    main()
