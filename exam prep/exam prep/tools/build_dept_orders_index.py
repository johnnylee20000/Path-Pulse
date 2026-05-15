r"""Build a compact JSON index of Departmental Orders for the React app (no full page_text)."""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DO_DIR = REPO / "source-docs" / "dept-orders"
OUT = REPO / "src" / "data" / "dept-orders-index.json"

DO_FN = re.compile(r"^DO\s+(\d+)\s*-\s*(\d{4})\s*(.*)\.json$", re.IGNORECASE)


def preview_from(obj: dict, limit: int = 520) -> str:
    pts = obj.get("page_text") or []
    blob = "\n".join(str(p) for p in pts[:2]) if pts else ""
    blob = " ".join(blob.split())
    if len(blob) > limit:
        return blob[: limit - 1] + "…"
    return blob


def main() -> None:
    rows = []
    for p in sorted(DO_DIR.glob("*.json"), key=lambda x: x.name.lower()):
        if p.name.upper() == "INVENTORY.MD":
            continue
        m = DO_FN.match(p.name)
        if not m:
            continue
        num, year, rest = m.group(1), m.group(2), m.group(3).strip()
        title = rest.replace("_", " ").strip() or p.stem
        try:
            obj = json.loads(p.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        rows.append(
            {
                "id": p.stem,
                "do_num": int(num),
                "year": int(year),
                "title": title,
                "pages": obj.get("pages"),
                "verdict": obj.get("verdict"),
                "chars_total": obj.get("chars_total"),
                "preview": preview_from(obj),
            }
        )
    rows.sort(key=lambda r: (-r["year"], -r["do_num"]))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"generated_from": str(DO_DIR), "count": len(rows), "orders": rows}, indent=2),
        encoding="utf-8",
    )
    print(f"Wrote {OUT} ({len(rows)} orders)")


if __name__ == "__main__":
    main()
