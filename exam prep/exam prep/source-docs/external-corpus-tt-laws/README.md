# External corpus: T&T laws & promotion exams

Indexed from: `D:\T&T LAWS AND PROMOTION EXAMS`
Generated (UTC): `2026-05-13T18:00:22.341033+00:00`
Total files: **1984**

## Official sources (current consolidated law)

- [Digital Legislative Library (consolidated Acts & subsidiary legislation)](https://laws.gov.tt/)
- [Acts of Parliament (Parliament of Trinidad and Tobago)](https://www.ttparliament.org/publications/acts-of-parliament/)

## Top folders by file count

- `criminal law 3` — 883 files
- `laws` — 628 files
- `cases` — 318 files
- `STANDING ORDERS` — 65 files
- `documents-to charge` — 63 files
- `sgt exam questions` — 13 files
- `Syllabus and questions, notes Promo Exam` — 10 files
- `(root files)` — 4 files

## Staleness / refresh

- Folder copies of the Police Service Act and PSR 2007 (often dated 2006–2011 on disk) are useful for study but may not reflect later amendments. Compare section numbers and headings against the Digital Legislative Library.
- Exam syllabi and past papers are valid as historical papers; promotion criteria and Service policy can change — cross-check current Standing Orders and Departmental Orders in your Service channels.

## Regenerating

From the `exam prep` folder:

```bash
python tools/index_external_corpus.py
```

Full file list: `INVENTORY.json` (large). App UI uses `src/data/external-corpus-summary.json`.
