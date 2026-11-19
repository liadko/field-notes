"""Bake elements.csv, strategies.json, groups.py and findings.html into elementle.html.

Usage: python src/build_html.py
"""

import csv
import json
from pathlib import Path
from shared_ui import shared_ui

from groups import groups_json

HERE = Path(__file__).parent
ROOT = HERE.parent
NUMERIC = {"number", "period", "group", "xpos", "ypos"}
OPTIONAL_INT = {"year"}
FLOATS = {"atomic_mass", "density", "melt_k", "boil_k", "electronegativity"}


def load_elements() -> list[dict]:
    rows = []
    for r in csv.DictReader((ROOT / "data" / "elements.csv").open(encoding="utf-8")):
        for k in NUMERIC:
            r[k] = int(r[k])
        for k in OPTIONAL_INT:
            r[k] = int(r[k]) if r[k] != "" else None
        for k in FLOATS:
            r[k] = float(r[k]) if r[k] != "" else ""
        rows.append(r)
    return rows


def main() -> None:
    html = (ROOT / "web" / "templates" / "elementle.html.in").read_text(encoding="utf-8")
    elements = json.dumps(load_elements(), ensure_ascii=False, separators=(",", ":"))
    photos = (ROOT / "data" / "element-photos.json").read_text(encoding="utf-8")
    strategies = (ROOT / "data" / "strategies.json").read_text(encoding="utf-8")
    findings = (ROOT / "web" / "findings.html").read_text(encoding="utf-8")
    # "</" must not appear inside the inline script.
    html = html.replace("/*__ELEMENTS__*/null", elements.replace("</", "<\\/"))
    html = html.replace("/*__ELEMENT_PHOTOS__*/null", photos.replace("</", "<\\/"))
    html = html.replace("/*__STRATEGIES__*/null", strategies.replace("</", "<\\/"))
    html = html.replace("/*__GROUPS__*/null", groups_json().replace("</", "<\\/"))
    html = html.replace("<!--__FINDINGS__-->", findings)
    out = ROOT / "dist" / "elementle.html"
    html = shared_ui(html, "elementle")
    out.write_text(html, encoding="utf-8")
    print(f"wrote {out} ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main()
