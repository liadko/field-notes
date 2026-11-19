const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(pathToFileURL(process.cwd() + "/dist/geography.html").href);
  await p.getByRole("button", { name: "Globe", exact: true }).click();
  const before = await p.evaluate(() => globeRotation.slice());
  const box = await p.locator("#map").boundingBox();
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await p.mouse.down();
  await p.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 30, {
    steps: 8,
  });
  await p.mouse.up();
  const after = await p.evaluate(() => globeRotation.slice());
  if (Math.abs(after[0] - before[0]) < 10)
    throw Error("Globe drag failed " + before + " " + after);
  await p.locator("#region").selectOption("Americas");
  if (!(await p.evaluate(() => globeRotation[0] === 85)))
    throw Error("Americas");
  await p.locator("#region").selectOption("Europe");
  await p.getByLabel("Search a country").fill("Malta");
  await p.getByLabel("Search a country").dispatchEvent("change");
  if (!(await p.locator(".capital-label").count()))
    throw Error("Malta capital");
  if (errors.length) throw Error(errors.join("\n"));
  console.log(
    "Globe actual drag, Americas centering, Malta search and capital OK",
  );
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
