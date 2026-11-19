const { chromium } = require('playwright');
const { pathToFileURL } = require('url');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  for (const width of [1200, 400]) {
    const page = await browser.newPage({viewport:{width,height:800}}), errors=[];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(process.cwd()+'/dist/geography.html').href);
    await page.waitForSelector('.country');
    await page.getByRole('button',{name:'Name countries'}).click();
    await page.locator('#entry').fill('France'); await page.locator('#form button').click();
    if (!await page.locator('#feedback').innerText().then(t => t.includes('France'))) throw Error('Country naming failed');
    await page.locator('.country-chip img').evaluate(image => image.decode());
    await page.getByRole('button',{name:'Border routes'}).click();
    if (!(await page.locator('#prompt').innerText()).includes('→')) throw Error('Route generation failed');
    const guess = page.locator('#entry');
    await guess.focus();
    if (await page.locator('.country-suggestions').isVisible()) throw Error('Empty suggestions opened');
    await guess.fill('a');
    const options = page.locator('#entry-suggestions [role=option]');
    if (await options.count() !== 5) throw Error('Suggestions are not limited to five');
    const first = await options.first().innerText();
    await guess.press('ArrowDown');
    await guess.press('Enter');
    if (await guess.inputValue() !== first || await page.locator('.country-suggestions').isVisible())
      throw Error('Suggestion selection failed');
    await page.getByRole('button',{name:'Route study'}).click();
    await page.locator('#entry').fill('France'); await page.locator('#destination').fill('Germany'); await page.locator('#form button').click();
    if (!(await page.locator('#feedback').innerText()).includes('1 crossings')) throw Error('Route study failed');
    if (await page.locator('.country-chip img').count() !== 2) throw Error('Missing route flags');
    await page.getByRole('button',{name:'Hot & cold'}).click();
    await page.locator('#entry').fill('France'); await page.locator('#form button').click();
    if (!(await page.locator('#feedback').innerText()).includes('km') && !(await page.locator('#feedback').innerText()).includes('found it')) throw Error('Hot and cold failed');
    await page.getByRole('button',{name:'Top ten'}).click();
    await page.locator('#entry').fill('India'); await page.locator('#form button').click();
    if (!(await page.locator('#feedback').innerText()).includes('India')) throw Error('Top ten failed');
    await page.getByRole('button',{name:'Find countries'}).click();
    await page.locator('#region').selectOption({label:'Europe'});
    if (!(await page.locator('#prompt').innerText()).length) throw Error('Country finding failed');
    await page.getByRole('button',{name:'Globe',exact:true}).click();
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw Error('Horizontal overflow at '+width);
    if (errors.length) throw Error(errors.join('\n'));
    console.log(width + 'px: country naming, route, globe, overflow and errors OK');
    await page.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
