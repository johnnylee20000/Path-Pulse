# Cursor handoff — TTPS Sergeant Exam Prep

Single-page **Vite + React** study app for Trinidad & Tobago Police Service promotion prep (Standing Orders, PSR 2007, legislation notes, past papers, departmental orders, practice).

## Repo layout (Path-Pulse monorepo)

This app lives at **`exam prep/exam prep/`** inside **`johnnylee20000/Path-Pulse`**. Vercel (or any host) must use **Root Directory = `exam prep/exam prep`** (relative to repo root).

**Do not** re-init a nested `.git` inside this folder — the parent repo must track these files as a normal tree (a nested `.git` turns the app into an empty submodule on clone).

## Commands

```bash
cd "exam prep/exam prep"   # from repo root; path has a space in "exam prep"
npm install
npm run dev                 # http://127.0.0.1:5173 (default Vite)
npm run build               # output: dist/
npm run preview             # local production preview
```

Regenerate **question chunks**, **model-answer bank**, and **material refs/gaps** after changing `past-questions.json`, hints, or adding SO/Act/DO sources:

```bash
python tools/build_enriched_question_bank.py
python tools/build_dept_orders_index.py    # after adding files under source-docs/dept-orders/
```

Legacy script (hints only, no chunks/coverage): `python tools/build_model_answer_bank.py` — **prefer** `build_enriched_question_bank.py`.

## Key source files

| Area | Path |
|------|------|
| UI / routing / screens | `src/App.jsx` (large single file) |
| Past paper bank (imported) | `src/data/past-questions.json` |
| Split chunks + `material_refs` / `material_gaps` | `src/data/question-chunks.json` |
| Model answers by track (duties / law / management) | `src/data/question-bank-model-answers.json` |
| Keyword study hints | `src/data/sergeant-model-hints.json` |
| DO search index | `src/data/dept-orders-index.json` |
| External corpus pointer (paths may be machine-specific) | `src/data/external-corpus-summary.json` |
| Authoritative text extracts | `source-docs/` (standing-orders, psr-2007, acts, dept-orders, strategic-plans, exam-papers, …) |

## Cursor rules

- **`.cursor/rules/exam-prep-materials.mdc`** — use `question-chunks.json` and `source-docs/` before inventing citations; surface **gaps** from `material_gaps` when primary text is missing.

## Vercel

- **`vercel.json`** — `buildCommand` / `outputDirectory: dist` / SPA rewrite to `index.html`.
- Dashboard: import **Path-Pulse**, set root to **`exam prep/exam prep`**, build **`npm run build`**.

## Product notes

- **Past papers** UI lists **chunks** (compound OCR questions are split heuristically); each card can show repo **sources** vs **missing** material on reveal.
- **MCQs** in the bank do **not** include official answer keys — UI says to verify from the paper PDF.
- Bundle is large (~3–4 MB JS) because JSON corpora are imported statically; acceptable for now; could code-split later.

## Agent transcripts

Parent chat transcripts (if configured) live under the user’s Cursor projects folder as described in system instructions — not in this repo.
