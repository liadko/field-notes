const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const { createServer } = require('node:http');
const { readFile } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

const root = process.cwd();
const ready = {
  elementle: () => typeof ELEMENTS !== 'undefined' && ELEMENTS.length === 118,
  geography: () => document.querySelectorAll('.country').length > 100 && document.querySelector('#modes').children.length === 8,
  israel: () => document.querySelectorAll('.activity').length === 9,
  brain: () => document.querySelectorAll('.activity').length === 6,
};
(async () => {
  const server = createServer(async (req, res) => {
    try {
      const filename = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
      if (!filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
      const body = await readFile(filename);
      res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(body);
    } catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    for (const transport of ['file', 'http']) {
      const url = filename => transport === 'file' ? pathToFileURL(path.join(root, filename)).href : `http://127.0.0.1:${server.address().port}/${filename}`;
      const page = await browser.newPage({ viewport: { width: 400, height: 900 } });
      const errors = []; page.on('pageerror', e => errors.push(e.message));
      for (const [entry, module] of [['web/geography.html', 'geography'], ['web/israel.html', 'israel'], ['web/brain.html', 'brain'], ['web/template.html', 'elementle'], ['web/elementle.html', 'elementle']]) {
        await page.goto(url(entry));
        await page.waitForURL(u => u.pathname.endsWith('/dist/' + module + '.html'));
        await page.waitForFunction(ready[module]);
        if (module === 'geography') await page.screenshot({ path: path.join(os.tmpdir(), 'fixed-source-geography-' + transport + '.png') });
      }
      for (const entry of ['index.html', 'web/index.html', 'dist/index.html']) {
        for (const module of Object.keys(ready)) {
          await page.goto(url(entry));
          await page.locator(`a[href$="${module}.html"]`).click();
          await page.waitForFunction(ready[module]);
        }
      }
      if (errors.length) throw Error(errors.join('\n'));
      console.log(`${transport}: all source-page redirects and all three launch-page module links initialized successfully`);
      await page.close();
    }
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exit(1); });
