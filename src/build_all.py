"""Build every module and the browser entry pages. Run from any directory."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
for script in ['build_html.py', 'build_geography.py', 'build_israel.py', 'build_brain.py']:
    subprocess.run([sys.executable, str(ROOT / 'src' / script)], cwd=ROOT, check=True)

home = (ROOT / 'web/home.html.in').read_text(encoding='utf-8')
for path, prefix in [(ROOT / 'index.html', 'dist/'), (ROOT / 'dist/index.html', ''), (ROOT / 'web/index.html', '../dist/')]:
    path.write_text(home.replace('__PREFIX__', prefix), encoding='utf-8')

# Preserve the URLs someone may already have bookmarked. These files are
# runnable entry points; unbuilt source templates live under templates/*.in.
for entry, target in [('elementle', 'elementle'), ('template', 'elementle'), ('geography', 'geography'), ('israel', 'israel'), ('brain', 'brain')]:
    url = f'../dist/{target}.html'
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening {target.title()}</title>
<meta http-equiv="refresh" content="0;url={url}">
<script>location.replace(new URL("{url}", location.href).href);</script>
</head><body><p><a href="{url}">Open {target.title()}</a></p></body></html>
'''
    (ROOT / 'web' / f'{entry}.html').write_text(page, encoding='utf-8')
print('wrote launch pages: index.html, web/index.html, dist/index.html')
