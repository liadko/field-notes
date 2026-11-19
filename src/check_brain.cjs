const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const os = require("os");
const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  for (const width of [1280, 400]) {
    const page = await browser.newPage({
      viewport: { width, height: 900 },
      hasTouch: width === 400,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(pathToFileURL(process.cwd() + "/dist/brain.html").href);
    assert((await page.locator(".activity").count()) === 6, "Activity library");
    await page.screenshot({
      path: os.tmpdir() + "/brain-home-" + width + ".png",
    });
    await page.locator("#start").click();
    await page.getByRole("button", { name: "Inside", exact: true }).click();
    await page
      .getByRole("button", { name: "6. Amygdala", exact: true })
      .click();
    assert(
      (await page.locator(".panel h2").innerText()) === "Amygdala",
      "Internal region selection",
    );
    assert(
      (await page.locator(".selected").count()) === 1,
      "Selected highlight",
    );
    await page.screenshot({
      path: os.tmpdir() + "/brain-inside-" + width + ".png",
    });
    await page.locator("#back").click();
    await page.locator(".activity").nth(1).click();
    const target = await page.evaluate(() => {
      const r = deck[index];
      return {
        id: r.id,
        number:
          regions.filter((x) => x.view === r.view).findIndex((x) => x === r) +
          1,
      };
    });
    await page
      .locator(".region-list")
      .getByRole("button", { name: "Region " + target.number, exact: true })
      .click();
    assert(
      (await page.locator("#feedback").innerText()).startsWith("Found it"),
      "Locate answer",
    );
    assert((await page.evaluate(() => score)) === 1, "Locate scoring");
    await page.locator("#back").click();
    await page.locator(".activity").nth(2).click();
    const clueAnswer = await page.evaluate(() => deck[index].name);
    await page
      .getByRole("button", { name: "A little hint", exact: true })
      .click();
    await page
      .locator("#answers")
      .getByRole("button", { name: clueAnswer, exact: true })
      .click();
    assert(
      (await page.evaluate(() => score)) === 0,
      "Hint should exclude first-try score",
    );
    await page.locator("#back").click();
    await page.locator(".activity").nth(3).click();
    const role = await page.evaluate(() => deck[index].role);
    await page
      .locator("#answers")
      .getByRole("button", { name: role, exact: true })
      .click();
    assert(
      (await page.locator("#feedback").innerText()).startsWith("Correct"),
      "Function matching",
    );
    await page.locator("#back").click();
    await page.locator(".activity").nth(4).click();
    await page
      .locator("#answers")
      .getByRole("button", { name: "Cortisol", exact: true })
      .click();
    assert(
      (await page.locator("#feedback").innerText()).startsWith("Not yet"),
      "Pathway wrong turn",
    );
    for (const name of [
      "Hypothalamus",
      "Pituitary gland",
      "Adrenal glands",
      "Cortisol",
    ])
      await page
        .locator("#answers")
        .getByRole("button", { name, exact: true })
        .click();
    assert(
      (await page.locator(".chain-step.filled").count()) === 4,
      "Pathway completion",
    );
    assert(
      (await page.locator("#feedback").innerText()).includes("1 wrong turns"),
      "Pathway mistakes",
    );
    await page.screenshot({
      path: os.tmpdir() + "/brain-pathway-" + width + ".png",
    });
    await page.locator("#back").click();
    await page.locator(".activity").nth(5).click();
    const myth = await page.evaluate(() => deck[index].answer);
    const hasDiagram = await page.evaluate(() => Boolean(deck[index].landmark));
    await page
      .getByRole("button", {
        name: myth ? "Accurate" : "Misleading or false",
        exact: true,
      })
      .click();
    assert((await page.evaluate(() => score)) === 1, "Myth scoring");
    assert(
      (await page.locator(".answer-diagram svg").count()) === Number(hasDiagram),
      "Myth landmark diagram",
    );
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
      "Horizontal overflow",
    );
    assert(!errors.length, errors.join("\n"));
    console.log(
      width +
        "px: atlas, internal selection, region location, hints, function quiz, pathway, myths and overflow OK",
    );
    await page.close();
  }
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
