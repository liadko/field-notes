import re
"""Build the self-contained geography experience from local assets."""
from pathlib import Path
from shared_ui import shared_ui
import json
import csv

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'web/templates/geography.html.in').read_text(encoding='utf-8')
countries = json.loads((ROOT / 'data/countries.json').read_text(encoding='utf-8'))
population = {}
with (ROOT / 'data/population.csv').open(encoding='utf-8-sig', newline='') as source:
    for row in csv.DictReader(source):
        if row['Value'] and (row['Country Code'] not in population or int(row['Year']) > population[row['Country Code']][0]):
            population[row['Country Code']] = (int(row['Year']), int(float(row['Value'])))
for country in countries:
    if country.get('cca3') in population:
        country['population'] = population[country['cca3']][1]
keys = ['name', 'cca2', 'cca3', 'ccn3', 'capital', 'region', 'subregion', 'borders', 'population', 'area', 'latlng', 'altSpellings', 'independent']
countries = [{k: c[k] for k in keys if k in c} for c in countries]
assets = {
    '/*__GAME__*/': (ROOT / 'web/geography.js').read_text(encoding='utf-8'),
    '/*__CAPITALS__*/null': (ROOT / 'data/capitals.geojson').read_text(encoding='utf-8'),
    '/*__D3__*/': (ROOT / 'web/d3.min.js').read_text(encoding='utf-8'),
    '/*__TOPO__*/': (ROOT / 'web/topojson.min.js').read_text(encoding='utf-8'),
    '/*__WORLD__*/null': (ROOT / 'data/world-50m.json').read_text(encoding='utf-8'),
    '/*__COUNTRIES__*/null': json.dumps(countries, ensure_ascii=False, separators=(',', ':')),
    '/*__FLAGS__*/null': (ROOT / 'data/country-flags.json').read_text(encoding='utf-8'),
}
for marker, value in assets.items():
    pattern = re.escape(marker[:-4]) + r'\s*null' if marker.endswith('null') else re.escape(marker)
    html = re.sub(pattern, lambda m: value.replace('</', '<\\/'), html)
assert '/*__' not in html, 'Unresolved build marker'
html = shared_ui(html, "geography")
flag_license = (ROOT / 'data/FLAGS-LICENSE').read_text(encoding='utf-8')
html = html.replace('</body>', f'<!-- flag-icons license\n{flag_license}\n--></body>')
(ROOT / 'dist').mkdir(exist_ok=True)
(ROOT / 'dist/geography.html').write_text(html, encoding='utf-8')
print('wrote dist/geography.html')
