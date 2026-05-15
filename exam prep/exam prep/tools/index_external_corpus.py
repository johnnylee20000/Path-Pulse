r"""Index a local exam-prep folder (PDFs, Word, RTF, etc.) for the TTPS prep app.

Default root: D:\T&T LAWS AND PROMOTION EXAMS

Writes:
  source-docs/external-corpus-tt-laws/INVENTORY.json — full file list + folder stats
  source-docs/external-corpus-tt-laws/README.md — human notes + official sources
  src/data/external-corpus-summary.json — small bundle for the React app

Usage:
  python tools/index_external_corpus.py
  python tools/index_external_corpus.py "D:\\Other\\Folder"
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

DEFAULT_ROOT = Path(r"D:\T&T LAWS AND PROMOTION EXAMS")

REPO = Path(__file__).resolve().parent.parent
OUT_DIR = REPO / "source-docs" / "external-corpus-tt-laws"
SUMMARY_OUT = REPO / "src" / "data" / "external-corpus-summary.json"

OFFICIAL_LINKS = [
    {
        "label": "Digital Legislative Library (consolidated Acts & subsidiary legislation)",
        "url": "https://laws.gov.tt/",
    },
    {
        "label": "Acts of Parliament (Parliament of Trinidad and Tobago)",
        "url": "https://www.ttparliament.org/publications/acts-of-parliament/",
    },
]


def folder_key(rel: Path) -> str:
    parts = rel.parts
    if not parts:
        return "(root)"
    # Root-level files bucket together (not a folder named like the file)
    if len(parts) == 1:
        return "(root files)"
    return parts[0]


def main() -> int:
    root = Path(sys.argv[1]).expanduser() if len(sys.argv) > 1 else DEFAULT_ROOT
    if not root.is_dir():
        print(f"Skip: not a directory: {root}", file=sys.stderr)
        # Still write a stub summary so the app does not break offline
        stub = {
            "rootPath": str(root),
            "indexed": False,
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "error": "Directory not found — connect drive or update path in tools/index_external_corpus.py",
            "totalFiles": 0,
            "byExtension": {},
            "topFolders": [],
            "topLevel": [],
            "paths": [],
            "officialSources": OFFICIAL_LINKS,
            "stalenessNotes": [],
        }
        SUMMARY_OUT.parent.mkdir(parents=True, exist_ok=True)
        SUMMARY_OUT.write_text(json.dumps(stub, indent=2), encoding="utf-8")
        return 1

    by_ext: Counter[str] = Counter()
    folder_counts: defaultdict[str, int] = defaultdict(int)
    files_out: list[dict] = []

    for p in root.rglob("*"):
        if not p.is_file():
            continue
        try:
            rel = p.relative_to(root)
        except ValueError:
            continue
        ext = p.suffix.lower() or "(no extension)"
        by_ext[ext] += 1
        folder_counts[folder_key(rel)] += 1
        try:
            st = p.stat()
            mtime = datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat()
            size = st.st_size
        except OSError:
            mtime = ""
            size = 0
        files_out.append(
            {
                "path": rel.as_posix(),
                "ext": ext,
                "size": size,
                "mtime": mtime,
            }
        )

    total = len(files_out)
    top_folders = sorted(folder_counts.items(), key=lambda x: -x[1])[:30]

    inventory = {
        "rootPath": str(root),
        "indexed": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "totalFiles": total,
        "byExtension": dict(sorted(by_ext.items(), key=lambda x: -x[1])),
        "folderFileCounts": {k: folder_counts[k] for k, _ in top_folders},
        "files": files_out,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    inv_path = OUT_DIR / "INVENTORY.json"
    inv_path.write_text(json.dumps(inventory, indent=2), encoding="utf-8")

    staleness = [
        "Folder copies of the Police Service Act and PSR 2007 (often dated 2006–2011 on disk) are useful for study but may not reflect later amendments. Compare section numbers and headings against the Digital Legislative Library.",
        "Exam syllabi and past papers are valid as historical papers; promotion criteria and Service policy can change — cross-check current Standing Orders and Departmental Orders in your Service channels.",
    ]

    readme = OUT_DIR / "README.md"
    readme.write_text(
        "\n".join(
            [
                "# External corpus: T&T laws & promotion exams",
                "",
                f"Indexed from: `{root}`",
                f"Generated (UTC): `{inventory['generatedAt']}`",
                f"Total files: **{total}**",
                "",
                "## Official sources (current consolidated law)",
                "",
                *[f"- [{x['label']}]({x['url']})" for x in OFFICIAL_LINKS],
                "",
                "## Top folders by file count",
                "",
                *[f"- `{name}` — {n} files" for name, n in top_folders[:20]],
                "",
                "## Staleness / refresh",
                "",
                *[f"- {s}" for s in staleness],
                "",
                "## Regenerating",
                "",
                "From the `exam prep` folder:",
                "",
                "```bash",
                "python tools/index_external_corpus.py",
                "```",
                "",
                "Full file list: `INVENTORY.json` (large). App UI uses `src/data/external-corpus-summary.json`.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    top_level = sorted(root.iterdir(), key=lambda x: x.name.lower())
    top_level_meta = []
    for x in top_level:
        if x.is_file():
            try:
                st = x.stat()
                top_level_meta.append(
                    {
                        "name": x.name,
                        "ext": x.suffix.lower(),
                        "size": st.st_size,
                        "mtime": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc).isoformat(),
                    }
                )
            except OSError:
                top_level_meta.append({"name": x.name, "ext": x.suffix.lower(), "size": 0, "mtime": ""})
        else:
            n = sum(1 for _ in x.rglob("*") if _.is_file())
            top_level_meta.append({"name": x.name + "/", "fileCount": n})

    paths = sorted(f["path"] for f in files_out)

    summary = {
        "rootPath": str(root),
        "indexed": True,
        "generatedAt": inventory["generatedAt"],
        "totalFiles": total,
        "byExtension": dict(sorted(by_ext.items(), key=lambda x: -x[1])),
        "topFolders": [{"name": n, "files": c} for n, c in top_folders],
        "topLevel": top_level_meta,
        "paths": paths,
        "officialSources": OFFICIAL_LINKS,
        "stalenessNotes": staleness,
    }
    SUMMARY_OUT.parent.mkdir(parents=True, exist_ok=True)
    SUMMARY_OUT.write_text(json.dumps(summary, indent=2), encoding="utf-8")

    print(f"Wrote {inv_path} ({total} files)")
    print(f"Wrote {readme}")
    print(f"Wrote {SUMMARY_OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
