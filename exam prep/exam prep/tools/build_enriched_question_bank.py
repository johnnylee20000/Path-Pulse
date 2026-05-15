#!/usr/bin/env python3
"""
Split compound OCR questions into chunks, resolve material coverage against
repo source-docs, attach model-answer scaffolding, and emit JSON for the app.

Reads:
  src/data/past-questions.json
  src/data/sergeant-model-hints.json
  src/data/dept-orders-index.json
  source-docs/psr-2007/POLICE SERVICE REGULATIONS 2007.json
  source-docs/standing-orders/SO *.json
  source-docs/acts/* (inventory)
  source-docs/strategic-plans/*.json

Writes:
  src/data/question-chunks.json          — one row per chunk (split or whole)
  src/data/question-bank-model-answers.json — same shape as before; keyed by chunk_id

Re-run after changing past-questions, hints, or adding SO/Act files:
  python tools/build_enriched_question_bank.py
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import build_model_answer_bank as mb  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
PAST = ROOT / "src" / "data" / "past-questions.json"
HINTS = ROOT / "src" / "data" / "sergeant-model-hints.json"
DEPT_INDEX = ROOT / "src" / "data" / "dept-orders-index.json"
PSR_JSON = ROOT / "source-docs" / "psr-2007" / "POLICE SERVICE REGULATIONS 2007.json"
OUT_CHUNKS = ROOT / "src" / "data" / "question-chunks.json"
OUT_MODEL = ROOT / "src" / "data" / "question-bank-model-answers.json"

MIN_SPLIT_CHARS = 700
MAX_HINT_BLOCKS = 4

# New question often starts as "12. Word..." after "(10 marks)" even without newline (OCR).
SPLIT_CANDIDATE = re.compile(r"(?<![0-9])(?=(?:[1-9]\d?)\s*\.\s+[A-Za-z\"\'\(])")


def _split_boundary_ok(text: str, pos: int) -> bool:
    if pos < 1:
        return False
    win = text[max(0, pos - 120) : pos].lower()
    if "marks" in win or "mark)" in win or "mark s" in win:
        return True
    if "end of paper" in win or win[max(0, len(win) - 20) :].strip().startswith("end"):
        return True
    if "\n\n" in text[max(0, pos - 40) : pos]:
        return True
    return False


def split_compound_question(text: str) -> list[str]:
    t = (text or "").strip()
    if len(t) < MIN_SPLIT_CHARS:
        return [t] if t else [""]
    breaks = sorted(
        {m.start() for m in SPLIT_CANDIDATE.finditer(t) if m.start() > 500 and _split_boundary_ok(t, m.start())}
    )
    if not breaks:
        parts = [p.strip() for p in re.split(r"\n(?=\s*\d{1,2}\s*[\.)]\s+[A-Za-z\"\'\(])", t) if p.strip()]
        if len(parts) > 1:
            while len(parts) >= 2 and len(parts[0]) < 180:
                parts[0] = (parts[0] + " " + parts[1]).strip()
                del parts[1]
            return parts if parts else [t]
        return [t]
    pieces: list[str] = []
    prev = 0
    for b in breaks + [len(t)]:
        piece = t[prev:b].strip()
        if len(piece) > 50:
            pieces.append(piece)
        prev = b
    while len(pieces) >= 2 and len(pieces[0]) < 180:
        pieces[0] = (pieces[0] + " " + pieces[1]).strip()
        del pieces[1]
    return pieces if pieces else [t]


ACT_STOP = frozenset(
    "the and with from that this for under section chapter".split()
)


def load_so_index() -> dict[int, str]:
    out: dict[int, str] = {}
    so_dir = ROOT / "source-docs" / "standing-orders"
    if not so_dir.is_dir():
        return out
    for p in so_dir.glob("SO *.json"):
        m = re.match(r"SO\s+(\d+)-", p.name, re.I)
        if m:
            out[int(m.group(1))] = str(p.relative_to(ROOT)).replace("\\", "/")
    return out


def load_psr_blob() -> str:
    if not PSR_JSON.is_file():
        return ""
    try:
        doc = json.loads(PSR_JSON.read_text(encoding="utf-8"))
        pages = doc.get("page_text") or []
        return "\n".join(str(x) for x in pages)
    except OSError:
        return ""


def load_act_files() -> list[Path]:
    d = ROOT / "source-docs" / "acts"
    if not d.is_dir():
        return []
    return list(d.glob("*.txt")) + list(d.glob("*.json"))


def load_strategic_files() -> list[str]:
    d = ROOT / "source-docs" / "strategic-plans"
    if not d.is_dir():
        return []
    return [str(p.relative_to(ROOT)).replace("\\", "/") for p in d.glob("*.json")]


def load_dept_orders() -> list[dict]:
    if not DEPT_INDEX.is_file():
        return []
    doc = json.loads(DEPT_INDEX.read_text(encoding="utf-8"))
    return doc.get("orders") or []


def so_numbers_from_citations(cite: dict) -> list[int]:
    nums: list[int] = []
    for label in cite.get("standing_orders") or []:
        m = re.search(r"(\d{1,3})", str(label))
        if m:
            nums.append(int(m.group(1)))
    return sorted(set(nums))


def reg_numbers_from_citations(cite: dict) -> list[int]:
    nums: list[int] = []
    for label in cite.get("regulations") or []:
        m = re.search(r"(\d{1,3})", str(label))
        if m:
            nums.append(int(m.group(1)))
    return sorted(set(nums))


def parse_do_tokens(cite: dict) -> list[tuple[int, int | None]]:
    out: list[tuple[int, int | None]] = []
    for label in cite.get("dept_orders") or []:
        m = re.search(r"DO\s+(\d+)\s*/\s*(\d{2,4})", str(label), re.I)
        if m:
            num = int(m.group(1))
            yraw = m.group(2)
            year = int(yraw) if len(yraw) == 4 else (2000 + int(yraw) if int(yraw) < 100 else int(yraw))
            out.append((num, year))
    return out


def match_act_path(sec_label: str, act_files: list[Path]) -> Path | None:
    words = [
        w
        for w in re.findall(r"[A-Za-z]{4,}", sec_label)
        if w.lower() not in ACT_STOP
    ]
    if not words:
        return None
    best: Path | None = None
    best_score = 0
    for p in act_files:
        stem = p.stem.lower().replace("_", " ")
        score = sum(1 for w in words if w.lower() in stem)
        if score > best_score:
            best_score = score
            best = p
    return best if best_score else None


def regulation_in_psr(blob: str, reg_num: int) -> bool:
    if not blob:
        return False
    low = blob.lower()
    return (
        f"regulation {reg_num}" in low
        or f"regulations {reg_num}" in low
        or re.search(rf"\breg\.?\s*{reg_num}\b", low) is not None
    )


def resolve_material(
    chunk_text: str,
    cite: dict,
    so_index: dict[int, str],
    psr_blob: str,
    act_files: list[Path],
    dept_orders: list[dict],
    strategic_paths: list[str],
) -> tuple[list[dict], list[dict]]:
    refs: list[dict] = []
    gaps: list[dict] = []

    for n in so_numbers_from_citations(cite):
        path = so_index.get(n)
        if path:
            refs.append(
                {
                    "category": "standing_order",
                    "id": f"S.O. {n}",
                    "source_path": path,
                    "note": "Full text in JSON page_text — cite exact subsection in your answer.",
                }
            )
        else:
            gaps.append(
                {
                    "category": "standing_order",
                    "need": f"Standing Order {n} (JSON under source-docs/standing-orders/)",
                    "reason": "Not found in project SO index — add SO extract or fix OCR citation.",
                }
            )

    for reg in reg_numbers_from_citations(cite):
        if psr_blob and regulation_in_psr(psr_blob, reg):
            refs.append(
                {
                    "category": "psr",
                    "id": f"Regulation {reg}",
                    "source_path": "source-docs/psr-2007/POLICE SERVICE REGULATIONS 2007.json",
                    "note": "Search page_text for this regulation number; quote operative sub-rules.",
                }
            )
        else:
            gaps.append(
                {
                    "category": "psr",
                    "need": f"PSR 2007 Regulation {reg} (verify chapter in POLICE SERVICE REGULATIONS 2007.json)",
                    "reason": "Reg number not located in bundled PSR text (OCR stem may be wrong).",
                }
            )

    for sec_label in cite.get("act_sections") or []:
        p = match_act_path(sec_label, act_files)
        if p:
            refs.append(
                {
                    "category": "act",
                    "id": sec_label[:120],
                    "source_path": str(p.relative_to(ROOT)).replace("\\", "/"),
                    "note": "Partial extract only — confirm against laws.gov.tt consolidated Act.",
                }
            )
        else:
            gaps.append(
                {
                    "category": "act",
                    "need": f"Act extract in source-docs/acts/ matching: {sec_label[:100]}",
                    "reason": "No act file in repo matched this stem (only a few acts are bundled).",
                }
            )

    for do_num, year in parse_do_tokens(cite):
        hit = None
        for o in dept_orders:
            if int(o.get("do_num") or -1) != do_num:
                continue
            if year is None or int(o.get("year") or 0) == year:
                hit = o
                break
            hit = hit or o
        if hit:
            refs.append(
                {
                    "category": "dept_order",
                    "id": hit.get("id") or f"DO {do_num}",
                    "source_path": "source-docs/dept-orders/ (see src/data/dept-orders-index.json)",
                    "note": f"Indexed preview available; full JSON under dept-orders for DO {do_num}.",
                }
            )
        else:
            gaps.append(
                {
                    "category": "dept_order",
                    "need": f"Departmental Order {do_num}/{year or '??'} JSON under source-docs/dept-orders/",
                    "reason": "Not in dept-orders-index — add file and run tools/build_dept_orders_index.py",
                }
            )

    low = chunk_text.lower()
    if any(k in low for k in ("strategic plan", "operating plan", "pillar", "pride", "ttps")):
        if strategic_paths:
            for sp in strategic_paths[:3]:
                refs.append(
                    {
                        "category": "strategic_plan",
                        "id": Path(sp).stem,
                        "source_path": sp,
                        "note": "Use exact pillar names / dates from this file for management answers.",
                    }
                )
        else:
            gaps.append(
                {
                    "category": "strategic_plan",
                    "need": "Strategic / Operating Plan JSON under source-docs/strategic-plans/",
                    "reason": "Question references TTPS strategy but no strategic plan JSON found.",
                }
            )

    return refs, gaps


def chunk_id_for(paper_id: str, parent_qid: str, part: int) -> str:
    safe = re.sub(r"[^\w\-]+", "-", f"{paper_id}:{parent_qid}:p{part}")
    return safe.strip("-")


def main() -> None:
    past = json.loads(PAST.read_text(encoding="utf-8"))
    hint_doc = json.loads(HINTS.read_text(encoding="utf-8"))
    blocks = hint_doc.get("by_keyword") or []

    so_index = load_so_index()
    psr_blob = load_psr_blob()
    act_files = load_act_files()
    dept_orders = load_dept_orders()
    strategic_paths = load_strategic_files()

    chunks_out: list[dict] = []
    tracks: dict[str, list] = {"duties": [], "law": [], "management": []}

    for paper in past.get("papers") or []:
        pid = paper.get("paper_id") or ""
        ptitle = mb.paper_title(paper)

        for q in paper.get("questions") or []:
            text = q.get("text") or ""
            parts = split_compound_question(text)
            tags = q.get("topic_tags") or []
            parent_qid = q.get("qid") or f"{pid}-q{q.get('number')}"

            for part_i, part_text in enumerate(parts):
                cid = chunk_id_for(pid, parent_qid, part_i)
                track = mb.subject_to_track(paper.get("subject") or "", pid, part_text)
                cite = mb.extract_citations(part_text)
                refs, gaps = resolve_material(
                    part_text, cite, so_index, psr_blob, act_files, dept_orders, strategic_paths
                )
                hints = mb.find_hints(blocks, part_text, tags, MAX_HINT_BLOCKS)
                q_stub = {**q, "text": part_text}
                model = mb.synthesize_long(q_stub, paper, track, hints)
                if refs:
                    model += "\n\n**Material located in this repo (read these paths in Cursor):**\n"
                    for r in refs[:12]:
                        model += f"- {r.get('category')} `{r.get('source_path')}` — {r.get('id')}\n"
                if gaps:
                    model += "\n\n**You are missing (add or mount, then rebuild index):**\n"
                    for g in gaps[:12]:
                        model += f"- [{g.get('category')}] {g.get('need')} — _{g.get('reason')}_\n"

                row = {
                    "chunk_id": cid,
                    "parent_qid": parent_qid,
                    "paper_id": pid,
                    "paper_title": ptitle,
                    "part_index": part_i,
                    "part_count": len(parts),
                    "kind": "long",
                    "track": track,
                    "rank": paper.get("rank"),
                    "year": paper.get("year"),
                    "subject": paper.get("subject"),
                    "number": q.get("number"),
                    "marks": q.get("marks"),
                    "type": q.get("type"),
                    "topic_tags": tags,
                    "question_text": part_text,
                    "citations": cite,
                    "material_refs": refs,
                    "material_gaps": gaps,
                    "hint_titles": [h.get("title") for h in hints],
                    "model_answer": model,
                }
                chunks_out.append(row)
                tracks[track].append(
                    {
                        "qid": cid,
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
                        "topic_tags": tags,
                        "question_text": part_text,
                        "parent_qid": parent_qid,
                        "part_index": part_i,
                        "hint_titles": [h.get("title") for h in hints],
                        "material_refs": refs,
                        "material_gaps": gaps,
                        "model_answer": model,
                    }
                )

        for q in paper.get("mcqs") or []:
            text = q.get("text") or ""
            parent_qid = q.get("qid") or f"{pid}-mcq{q.get('number')}"
            cid = chunk_id_for(pid, parent_qid, 0)
            track = mb.subject_to_track(paper.get("subject") or "", pid, text)
            cite = mb.extract_citations(text)
            tags = q.get("topic_tags") or []
            refs, gaps = resolve_material(text, cite, so_index, psr_blob, act_files, dept_orders, strategic_paths)
            hints = mb.find_hints(blocks, text, tags, MAX_HINT_BLOCKS)
            model = mb.synthesize_mcq(q, paper, track, hints)
            if refs:
                model += "\n\n**Material located in this repo:**\n"
                for r in refs[:8]:
                    model += f"- `{r.get('source_path')}` — {r.get('id')}\n"
            if gaps:
                model += "\n\n**You are missing:**\n"
                for g in gaps[:8]:
                    model += f"- [{g.get('category')}] {g.get('need')}\n"

            row = {
                "chunk_id": cid,
                "parent_qid": parent_qid,
                "paper_id": pid,
                "paper_title": ptitle,
                "part_index": 0,
                "part_count": 1,
                "kind": "mcq",
                "track": track,
                "rank": paper.get("rank"),
                "year": paper.get("year"),
                "subject": paper.get("subject"),
                "number": q.get("number"),
                "marks": q.get("marks"),
                "type": "mcq",
                "topic_tags": tags,
                "question_text": text,
                "options": q.get("options"),
                "citations": cite,
                "material_refs": refs,
                "material_gaps": gaps,
                "hint_titles": [h.get("title") for h in hints],
                "model_answer": model,
            }
            chunks_out.append(row)
            tracks[track].append(
                {
                    "qid": cid,
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
                    "topic_tags": tags,
                    "question_text": text,
                    "options": q.get("options"),
                    "parent_qid": parent_qid,
                    "part_index": 0,
                    "hint_titles": [h.get("title") for h in hints],
                    "material_refs": refs,
                    "material_gaps": gaps,
                    "model_answer": model,
                }
            )

    counts = {k: len(v) for k, v in tracks.items()}
    total_chunks = len(chunks_out)

    chunks_payload = {
        "version": 2,
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "disclaimer": (
            "Chunks split heuristically from OCR; verify boundaries against the PDF. "
            "material_refs list repo files to open; material_gaps list what is still missing."
        ),
        "total_chunks": total_chunks,
        "counts_by_track": {k: sum(1 for c in chunks_out if c["track"] == k) for k in tracks},
        "chunks": sorted(
            chunks_out,
            key=lambda c: (c.get("paper_id") or "", c.get("number") or 0, c.get("part_index") or 0),
        ),
    }
    OUT_CHUNKS.write_text(json.dumps(chunks_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    model_payload = {
        "version": 2,
        "generated_at": chunks_payload["generated_at"],
        "source": {
            "past_questions": str(PAST.name),
            "hints": str(HINTS.name),
            "chunks": str(OUT_CHUNKS.name),
        },
        "disclaimer": (
            "Per-chunk model answers with repo material pointers and explicit gaps. "
            "Not official mark schemes — confirm citations in primary law and S.O. volumes."
        ),
        "counts_by_track": counts,
        "total_questions": sum(counts.values()),
        "tracks": tracks,
    }
    OUT_MODEL.write_text(json.dumps(model_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {OUT_CHUNKS} — {total_chunks} chunks")
    print(f"Wrote {OUT_MODEL} — duties={counts['duties']} law={counts['law']} management={counts['management']}")


if __name__ == "__main__":
    main()
