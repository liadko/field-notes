import re
from pathlib import Path
from shared_ui import shared_ui

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'web/templates/israel.html.in').read_text(encoding='utf-8')
assets = {
    '/*__GAME__*/': 'web/israel-app.js',
    '/*__CITY_BORDERS__*/null': 'data/israel-city-borders.json',
    '/*__MUNICIPALITIES__*/null': 'data/israel-municipalities.geojson',
    '/*__CITIES__*/null': 'data/israel-cities.json',
    '/*__ROADS__*/null': 'data/israel-roads.geojson',
    '/*__WORLD__*/null': 'data/world-50m.json',
    '/*__D3__*/': 'web/d3.min.js',
    '/*__TOPO__*/': 'web/topojson.min.js',
    '/*__LEADER_PORTRAITS__*/null': 'data/leader-portraits.json',
    '/*__CITY_PHOTOS__*/null': 'data/israel-city-photos.json',
}
for key, filename in assets.items():
    value = (ROOT / filename).read_text(encoding='utf-8')
    pattern = re.escape(key[:-4]) + r'\s*null' if key.endswith('null') else re.escape(key)
    html = re.sub(pattern, lambda _: value.replace('</', '<\\/'), html)
assert '/*__' not in html, 'Unresolved build marker'
html = shared_ui(html, "israel")
(ROOT / 'dist/israel.html').write_text(html, encoding='utf-8')
print('wrote dist/israel.html')
