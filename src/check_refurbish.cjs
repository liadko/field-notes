const { chromium } = require("playwright");
const { pathToFileURL } = require("node:url");
const { mkdir } = require("node:fs/promises");
const { join } = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");

(async () => {
  const screenshots = join(os.tmpdir(), "fieldnotes-review");
  await mkdir(screenshots, { recursive: true });
  const browser = await chromium.launch({
    channel: "chrome",
    headless: process.env.FIELDNOTES_HEADED !== "1",
  });
  try {
    for (const width of [1280, 400]) {
      const page = await browser.newPage({
        viewport: { width, height: 950 },
        hasTouch: width === 400,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      async function open(module) {
        await page.goto(
          pathToFileURL(join(process.cwd(), "dist", module + ".html")).href,
        );
        assert.equal(
          await page
            .locator(".fieldnotes-bar nav [aria-current]")
            .getAttribute("href"),
          module + ".html",
        );
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
      }
      const snap = (name) =>
        page.screenshot({
          path: join(screenshots, name + "-" + width + ".png"),
          fullPage: true,
          animations: "disabled",
        });
      await open("geography");
      await page.locator("#region").selectOption("Europe");
      await page
        .getByRole("button", { name: "Hot & cold", exact: true })
        .click();
      assert.equal(await page.locator(".tiny-target").count(), 0);
      await snap("europe-hot-cold");
      await page
        .getByRole("button", { name: "Find countries", exact: true })
        .click();
      assert(
        await page.evaluate(() =>
          [...document.querySelectorAll(".tiny-target")].every(
            (el) => byCode.get(el.dataset.code).region === "Europe",
          ),
        ),
      );
      const before = await page.locator(".tiny-target").count();
      for (let i = 0; i < 4; i++)
        await page
          .getByRole("button", { name: "Zoom in", exact: true })
          .click();
      assert(
        (await page.locator(".tiny-target").count()) < before,
        "callouts should drop with zoom",
      );
      await page
        .getByRole("button", { name: "Reset map view", exact: true })
        .click();
      const wrong = page
        .locator(".country.pickable")
        .filter({ has: page.locator("title") });
      assert((await wrong.count()) > 3);
      await page.evaluate(() => {
        target = byCode.get("FRA");
      });
      await page.locator("#map").scrollIntoViewIfNeeded();
      async function clickCountry(code) {
        const point = await page.evaluate((countryCode) => {
          const shape = [
            ...document.querySelectorAll(".country.pickable"),
          ].find((el) => el.__data__.country.cca3 === countryCode);
          const { left, top, right, bottom } = shape.getBoundingClientRect();
          for (
            let y = Math.max(0, top);
            y < Math.min(innerHeight, bottom);
            y += 2
          ) {
            for (
              let x = Math.max(0, left);
              x < Math.min(innerWidth, right);
              x += 2
            ) {
              const px = Math.round(x),
                py = Math.round(y);
              if (
                [
                  [0, 0],
                  [-3, 0],
                  [3, 0],
                  [0, -3],
                  [0, 3],
                ].every(
                  ([dx, dy]) =>
                    document.elementFromPoint(px + dx, py + dy) === shape,
                )
              )
                return { x: px, y: py };
            }
          }
        }, code);
        assert(point, code + " should have a clickable position");
        if (width === 400) await page.touchscreen.tap(point.x, point.y);
        else await page.mouse.click(point.x, point.y);
      }
      for (let i = 0; i < 3; i++) await clickCountry("DEU");
      assert.equal(
        await page.evaluate(() => misses),
        3,
        "each tap should count",
      );
      assert(await page.locator(".country.hint-pulse").count());
      await snap("europe-find-hint");
      const map = page.locator("#map");
      assert(
        await map.evaluate(
          (node) =>
            !node.dispatchEvent(
              new MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
              }),
            ),
        ),
      );
      assert(
        await map.evaluate(
          (node) =>
            getComputedStyle(node).webkitTapHighlightColor ===
            "rgba(0, 0, 0, 0)",
        ),
      );
      assert(
        await page
          .locator(".tiny-target .helper-dot")
          .first()
          .evaluate(
            (node) => getComputedStyle(node.parentNode).outlineStyle === "none",
          ),
      );
      await clickCountry("FRA");
      assert.match(
        await page.locator("#stat").innerText(),
        /1 \/ \d+ found · 0 unassisted/,
      );
      await page.getByRole("button", { name: "Explore", exact: true }).click();
      await page.getByRole("button", { name: "Globe", exact: true }).click();
      await page.locator("#map").scrollIntoViewIfNeeded();
      const box = await page.locator("#map").boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const beforeRotation = await page.evaluate(() => globeRotation[0]);
      await page.mouse.down();
      await page.mouse.move(
        box.x + box.width / 2 + 75,
        box.y + box.height / 2 + 20,
        { steps: 8 },
      );
      await page.mouse.up();
      assert.notEqual(
        await page.evaluate(() => globeRotation[0]),
        beforeRotation,
      );
      assert.equal(await page.locator(".country.selected").count(), 0);
      assert(await page.locator("#map.suppress-hover").count());
      await open("israel");
      assert.equal(await page.locator("html").getAttribute("dir"), "ltr");
      await snap("israel-library");
      await page
        .getByRole("button", { name: /Which is farther north/ })
        .click();
      assert.equal(
        await page.locator("[lang=he][dir=rtl] #answers").count(),
        1,
      );
      await page.locator("#answers button").first().click();
      assert.equal(await page.locator(".comparison-map circle").count(), 2);
      assert.equal(await page.locator("button.answer-correct").count(), 1);
      await snap("israel-north-answer");
      await page.locator("#back").click();
      await page
        .getByRole("button", { name: /Who was prime minister/ })
        .click();
      const year = Number(
        (await page.locator(".panel h2").innerText()).match(/\d{4}/)[0],
      );
      const leader = await page.evaluate(
        (year) => pms[leaderQuestions.find((q) => q[0] === year)[1]][0],
        year,
      );
      for (const option of await page.locator("#answers button").all()) {
        if ((await option.textContent()) !== leader) await option.click();
      }
      assert.equal(
        await page.locator("#answers .hint-pulse").innerText(),
        leader,
      );
      await page.getByRole("button", { name: leader, exact: true }).click();
      assert.equal(await page.locator("#next button").count(), 1);
      await open("brain");
      await page.getByRole("button", { name: /Match the role/ }).click();
      const role = await page.evaluate(() => deck[index].role);
      for (const option of await page.locator("#answers button").all()) {
        if ((await option.textContent()) !== role) await option.click();
      }
      assert(await page.locator(".hint-pulse").count());
      await page.getByRole("button", { name: role, exact: true }).click();
      assert.equal(await page.locator(".answer-diagram .selected").count(), 1);
      await snap("brain-answer");
      await open("elementle");
      await snap("elements-header");
      assert.deepEqual(errors, []);
      await page.close();
      console.log(
        width + "px Chrome: geography, Israel, Brain and shared header passed",
      );
    }
    console.log("Screenshots: " + screenshots);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
