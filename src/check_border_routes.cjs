const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { pathToFileURL } = require("node:url");
const vm = require("node:vm");
const os = require("node:os");
const { chromium } = require("playwright");

const rules = vm.runInNewContext(
  readFileSync("web/border-routes.js", "utf8") +
    "\n({borderGraph, borderRound})",
);
const cities = rules.borderGraph([
  ["start", ["a", "b", "detour"]],
  ["a", ["c", "detour"]],
  ["b", ["c"]],
  ["c", ["end"]],
  ["end", []],
  ["detour", ["dead-end"]],
  ["dead-end", []],
]);
const round = rules.borderRound(cities, "start", "end");
assert.equal(round.shortestRoutes().total, 2);
assert.equal(round.guess("c").kind, "later");
assert.equal(round.path.at(-1), "start");
assert.equal(round.guess("dead-end").kind, "far");
assert.equal(round.guess("detour").kind, "near");
assert.equal(round.path.at(-1), "detour");
assert.equal(round.guess("a").kind, "optimal");
assert.equal(round.guess("c").kind, "optimal");
assert.equal(round.path.at(-1), "end");
assert.equal(round.complete, true);

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({
      viewport: { width: 400, height: 850 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const load = (name) =>
      page.goto(pathToFileURL(process.cwd() + "/dist/" + name + ".html").href);
    await load("geography");
    await page.locator("#region").selectOption("Europe");
    await page
      .getByRole("button", { name: "Border routes", exact: true })
      .click();
    await page.evaluate(() => {
      start = byCode.get("DNK");
      finish = byCode.get("UKR");
      journey = borderRound(worldBorders, "DNK", "UKR");
      update();
      draw();
    });
    await page.locator("#entry").fill("Australia");
    await page.locator("#entry").press("Enter");
    assert(await page.locator("#map .country[data-route-feedback=far]").count() > 0);
    const locate = page.getByRole("button", { name: "Locate Australia" });
    if (await locate.count()) await locate.click();
    assert.equal(
      await page
        .locator(".journey-guess-marker[data-route-feedback=far]")
        .count(),
      1,
    );
    await page.getByRole("button", { name: "Reset map view" }).click();
    await page.locator("#entry").fill("Poland");
    await page.locator("#entry").press("Enter");
    assert.equal(
      await page.locator("#map .country[data-route-feedback=later]").count(),
      1,
    );
    // Activate the remaining countries via their map shapes.
    for (const country of ["Germany", "Poland"])
      await page
        .locator("#map")
        .getByRole("button", { name: country, exact: true })
        .first()
        .press("Enter");
    assert.deepEqual(await page.locator(".journey-token").allTextContents(), [
      "🔴",
      "🟢",
      "✅",
      "✅",
    ]);
    assert.deepEqual(await page.locator(".journey-stop").allTextContents(), [
      "Denmark",
      "Germany",
      "Poland",
      "Ukraine",
    ]);
    assert.equal(await page.locator("#form").count(), 0);
    const alternative = page.locator(".journey-alternative").first();
    assert.equal(
      await alternative.textContent(),
      "Denmark → Germany → Poland → Ukraine",
    );
    await alternative.click();
    assert.equal(await alternative.getAttribute("aria-pressed"), "true");
    const offscreenLeg = await page.evaluate(() => {
      const origin = document.querySelector(".journey-stop-dot");
      const x = Number(origin.getAttribute("cx")),
        y = Number(origin.getAttribute("cy"));
      mapTransform = d3.zoomIdentity
        .translate(150 - x * 14, 100 - y * 14)
        .scale(14);
      svg.property("__zoom", mapTransform);
      draw();
      const map = document.querySelector("#map");
      const line = map.querySelector(".journey-connection");
      return {
        visibleDots: map.querySelectorAll(".journey-stop-dot").length,
        extendsPastEdge:
          line.getBoundingClientRect().right >
          map.getBoundingClientRect().right,
      };
    });
    assert(offscreenLeg.visibleDots < 4 && offscreenLeg.extendsPastEdge);
    await page.screenshot({
      path: os.tmpdir() + "/fieldnotes-world-route.png",
      fullPage: true,
      animations: "disabled",
    });

    await load("israel");
    await page.getByRole("button", { name: /City border routes/ }).click();
    await page.locator("#city-tier").selectOption("10");
    await page.screenshot({
      path: os.tmpdir() + "/fieldnotes-israel-route.png",
      animations: "disabled",
    });
    const targetNames = await page.evaluate(() => {
      const route = cityJourney.shortestRoutes(1).routes[0];
      return route.slice(1, -1).map((id) => cityName(id));
    });
    assert(targetNames.length > 0);
    for (const city of targetNames) {
      await page
        .locator("#map")
        .getByRole("button", { name: city, exact: true })
        .press("Enter");
    }
    assert.equal(await page.locator(".journey-finish").count(), 1);
    assert.equal(await page.locator("#travel-form").isVisible(), false);
    assert.equal(await page.locator("#map.journey-arrived").count(), 1);
    assert(
      (await page.locator(".journey-token").allTextContents()).every(
        (token) => token === "✅",
      ),
    );
    const [prompt, map] = await Promise.all([
      page.locator("#travel-prompt").boundingBox(),
      page.locator("#map").boundingBox(),
    ]);
    assert(map.y - (prompt.y + prompt.height) < 80);
    assert.deepEqual(errors, []);
    console.log(
      "Detours, equivalent shortest routes, Denmark → Ukraine, Israel Top 10 and mobile prompt passed",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
