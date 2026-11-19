"""Build the offline brain learning module, without external runtime dependencies."""
import json
import re
from pathlib import Path
from shared_ui import shared_ui

ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / 'web/templates/brain.html.in').read_text(encoding='utf-8')
html = html.replace('/*__GAME__*/', (ROOT / 'web/brain.js').read_text(encoding='utf-8'))
data = json.loads((ROOT / 'data/brain.json').read_text(encoding='utf-8'))
assert len({r['id'] for r in data['regions']}) == len(data['regions'])
assert all(r['source'] in data['sources'] for r in data['regions'])
html = re.sub(r'/\*__BRAIN__\*/\s*null', lambda _: json.dumps(data, ensure_ascii=False).replace('</', '<\\/'), html)
assert '/*__' not in html
html = shared_ui(html, "brain")
(ROOT / 'dist/brain.html').write_text(html, encoding='utf-8')
print('wrote dist/brain.html')
