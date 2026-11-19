"""Insert the common navigation and interaction styles into each module."""
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent / "web"
MODULES = {"elementle": "Elements", "geography": "Geography", "israel": "Israel", "brain": "Brain"}


def shared_ui(html: str, active: str) -> str:
    links = []
    for module, label in MODULES.items():
        current = ' aria-current="page"' if module == active else ""
        links.append(f'<a href="{module}.html"{current}>{label}</a>')
    nav = (
        '<header class="fieldnotes-bar" lang="en" dir="ltr">'
        '<a class="fieldnotes-brand" href="index.html">Fieldnotes</a>'
        '<nav aria-label="Experiences">' + "".join(links) + '</nav></header>'
    )
    css = (WEB / "shared.css").read_text(encoding="utf8")
    script = (WEB / "feedback.js").read_text(encoding="utf8")
    if active in {"geography", "israel"}:
        css += (WEB / "border-routes.css").read_text(encoding="utf8")
        script += "\n" + (WEB / "border-routes.js").read_text(encoding="utf8")
    return html.replace("<!--FIELDNOTES_NAV-->", f"<style>{css}</style>{nav}<script>{script}</script>")
