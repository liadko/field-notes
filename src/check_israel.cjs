const { chromium } = require("playwright");
const { pathToFileURL } = require("url");
const os = require("os");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME_PATH ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  for (const width of [1280, 400]) {
    const p = await b.newPage({
      viewport: { width, height: 900 },
      hasTouch: width === 400,
    });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(pathToFileURL(process.cwd() + "/dist/israel.html").href);
    if ((await p.locator("html").getAttribute("dir")) !== "ltr")
      throw Error("LTR shell missing");
    if ((await p.locator(".activity").count()) !== 9) throw Error("catalog");
    await p.screenshot({
      path: os.tmpdir() + "/israel-home-" + width + ".png",
    });
    await p.locator(".activity").first().click();
    for (const tier of [10, 30, 50]) {
      await p.locator("#city-tier").selectOption(String(tier));
      if ((await p.locator("#city-options option").count()) !== tier)
        throw Error("Wrong city tier size");
      if ((await p.locator("#map .city").count()) !== tier)
        throw Error("Map ignored city tier");
    }
    await p.locator("#city-tier").selectOption("Infinity");
    await p.locator("#search").fill("נס ציונה");
    await p.locator("#search").dispatchEvent("change");
    if (!(await p.locator("#prompt").innerText()).includes("נס ציונה"))
      throw Error("Hebrew search");
    await p.screenshot({ path: os.tmpdir() + "/israel-map-" + width + ".png" });
    await p.locator("#search").fill("Jerusalem");
    await p.locator("#search").dispatchEvent("change");
    await p.locator(".city-photo img").evaluate((image) => image.decode());
    await p.locator("#zoom-in").click();
    await p.locator("#fit").click();
    await p.locator("#back").click();
    await p.getByRole("button", { name: /Place a city/ }).click();
    for (const area of ["north", "center", "south", "all"]) {
      await p.locator("#area").selectOption(area);
      const state = await p.evaluate(() => {
        const eligible = cities.filter(({ latitude }) => {
          if (region === "north") return latitude > 32.5;
          if (region === "south") return latitude < 31.5;
          if (region === "center") return latitude >= 31.5 && latitude <= 32.5;
          return true;
        });
        const options = [...document.querySelector("#city-tier").options];
        return {
          total: eligible.length,
          tiers: options.map((option) => option.value),
          allLabel: options.at(-1).textContent,
          expected: eligible.slice(0, 10).map((city) => city.geonameid),
          actual: placementRun.cities.map((city) => city.geonameid),
        };
      });
      const tiers = [10, 20, 30, 50].filter((tier) => tier < state.total);
      if (
        state.tiers.join() !== [...tiers, "Infinity"].join() ||
        !state.allLabel.includes(String(state.total)) ||
        state.actual.length !== Math.min(10, state.total) ||
        !state.actual.every((id) => state.expected.includes(id))
      )
        throw Error("Incorrect local city ranking or tier menu for " + area);
    }
    await p.locator("#area").selectOption("north");
    await p.locator("#city-tier").selectOption("20");
    if (await p.evaluate(() => placementRun.cities.length !== 20))
      throw Error("North did not start a 20-city run");
    await p.locator("#area").selectOption("south");
    if ((await p.locator("#city-tier").inputValue()) !== "Infinity")
      throw Error("Unavailable tier did not show the regional total");
    await p.locator("#area").selectOption("all");
    if ((await p.locator("#city-tier").inputValue()) !== "20")
      throw Error("Available tier was not restored");
    await p.locator("#city-tier").selectOption("10");
    if ((await p.locator("#placement-clock").innerText()) !== "0:00")
      throw Error("Placement timer started before Play");
    await p.locator("#placement-play").click();
    await p
      .getByRole("button", { name: "לגלות את המיקום", exact: true })
      .click();
    if ((await p.locator(".reveal").count()) !== 1) throw Error("reveal");
    await p.getByRole("button", { name: "עיר אחרת", exact: true }).click();
    const map = p.locator("#map");
    await map.scrollIntoViewIfNeeded();
    const box = await map.boundingBox();
    const tap = (x, y) =>
      width === 400 ? p.touchscreen.tap(x, y) : p.mouse.click(x, y);
    if (await p.locator("#map circle.city").count())
      throw Error("Map shows city dots");
    await tap(box.x + 8, box.y + Math.min(box.height / 2, 150));
    if (await p.evaluate(() => round !== 0 || cityMisses !== 0))
      throw Error("Distant tap was scored");
    const wrongCity = await p.evaluate(
      () => cityPool().find((city) => city !== target).geonameid,
    );
    const wrongPoint = await p.evaluate((id) => {
      const city = cityById.get(id);
      return projection([city.longitude, city.latitude]);
    }, wrongCity);
    for (let i = 0; i < 3; i++)
      await tap(box.x + wrongPoint[0], box.y + wrongPoint[1]);
    if ((await p.locator("path.reveal.hint-pulse").count()) !== 1)
      throw Error("Missing boundary hint");
    const point = await p.evaluate(() =>
      projection([target.longitude, target.latitude]),
    );
    const previous = await p.locator("#prompt").innerText();
    await tap(box.x + point[0], box.y + point[1]);
    if ((await p.locator("path.reveal:not(.hint-pulse)").count()) !== 1)
      throw Error("Boundary pick did not complete the question");
    await p.waitForFunction(
      (he) => document.querySelector("#prompt").textContent !== he,
      previous,
    );
    if (await p.evaluate(() => score !== 0 || round !== 4))
      throw Error("Hint scoring changed");

    // Tap just outside Jerusalem's visible polygon to exercise snapping.
    const near = await p.evaluate(() => {
      target = cityPool().find((city) => !discoveredCities.has(city.geonameid));
      document.querySelector("#prompt").textContent = target.he;
      const path = document.querySelector(
        '[data-city="' + target.geonameid + '"]',
      );
      const bounds = path.ownerSVGElement.getBoundingClientRect();
      for (let offset = 0; offset < path.getTotalLength(); offset += 2) {
        const edge = path.getPointAtLength(offset);
        for (const [dx, dy] of [
          [-2, 0],
          [2, 0],
          [0, -2],
          [0, 2],
        ]) {
          const x = Math.round(bounds.x + edge.x + dx);
          const y = Math.round(bounds.y + edge.y + dy);
          const underneath = document.elementFromPoint(x, y);
          if (
            path.ownerSVGElement.contains(underneath) &&
            !underneath.closest(".city") &&
            !path.isPointInFill(new DOMPoint(x - bounds.x, y - bounds.y))
          )
            return [x, y];
        }
      }
      throw Error("No exposed boundary point");
    });
    const snapped = await p.locator("#prompt").innerText();
    await tap(...near);
    await p.waitForFunction(
      (he) => document.querySelector("#prompt").textContent !== he,
      snapped,
    );
    if (await p.evaluate(() => score !== 1 || round !== 5))
      throw Error("Near-miss tap did not snap");
    await map.screenshot({
      path: os.tmpdir() + "/israel-boundaries-" + width + ".png",
    });

    await p.locator("#placement-mode").selectOption("blind");
    if ((await map.locator(".city-hidden").count()) !== 10)
      throw Error("Blind mode leaked outlines");
    await p.locator("#placement-play").click();
    await map.scrollIntoViewIfNeeded();
    let blindBox = await map.boundingBox();
    for (let i = 0; i < 3; i++) {
      await tap(
        blindBox.x + 8,
        blindBox.y + Math.min(blindBox.height / 2, 150),
      );
    }
    if (!(await p.locator("#feedback").innerText()).includes("ק״מ"))
      throw Error("Missing blind distance feedback");
    if (
      (await map.locator(".city-hidden").count()) !== 10 ||
      (await map.locator(".reveal").count())
    )
      throw Error("Blind misses exposed a boundary");
    const discoveries = width === 400 ? 10 : 2;
    for (let found = 1; found <= discoveries; found++) {
      await map.scrollIntoViewIfNeeded();
      blindBox = await map.boundingBox();
      const blindPoint = await p.evaluate(() =>
        projection([target.longitude, target.latitude]),
      );
      const blindPrompt = await p.locator("#prompt").innerText();
      await tap(blindBox.x + blindPoint[0], blindBox.y + blindPoint[1]);
      if (!(await p.locator("#feedback").innerText()).includes("בול"))
        throw Error(
          "Blind tap missed " +
            blindPrompt +
            ": " +
            (await p.locator("#feedback").innerText()) +
            JSON.stringify({
              before: blindBox,
              intended: blindPoint,
              after: await map.boundingBox(),
              actual: await map
                .locator(".guess")
                .evaluate((node) => [
                  node.getAttribute("cx"),
                  node.getAttribute("cy"),
                ]),
            }),
        );
      await p.waitForFunction(
        (he) => document.querySelector("#prompt").textContent !== he,
        blindPrompt,
      );
      if (
        (await map.locator(".city-discovered").count()) !== found ||
        (await map.locator(".city-hidden").count()) !== 10 - found
      )
        throw Error("Blind discovery did not persist");
    }
    if (discoveries === 10) {
      if (!(await p.locator("#prompt").innerText()).includes("כל הערים נמצאו"))
        throw Error("Blind round did not finish");
      await p.getByRole("button", { name: /סיבוב חדש/ }).click();
      if ((await map.locator(".city-hidden").count()) !== 10)
        throw Error("Blind reset left city outlines");
    }
    await p.locator("#placement-mode").selectOption("all");
    if ((await map.locator(".city").count()) <= 10)
      throw Error("All-border view still hides cities outside the quiz tier");
    if (await p.evaluate(() => placementRun.cities.length !== 10))
      throw Error("All-border view changed the quiz tier");
    if (width === 1280) {
      await p.locator("#placement-play").click();
      const questions = new Set();
      for (let i = 0; i < 10; i++) {
        await map.scrollIntoViewIfNeeded();
        const bounds = await map.boundingBox();
        const point = await p.evaluate(() =>
          projection([target.longitude, target.latitude]),
        );
        const prompt = await p.locator("#prompt").innerText();
        if (questions.has(prompt))
          throw Error("City repeated within a completed Top 10 run");
        questions.add(prompt);
        await tap(bounds.x + point[0], bounds.y + point[1]);
        await p.waitForFunction(
          (he) => document.querySelector("#prompt").textContent !== he,
          prompt,
        );
      }
      if (!(await p.locator("#placement-clock").getAttribute("datetime")))
        throw Error("Run did not show elapsed time");
      const saved = await p.evaluate(
        () => JSON.parse(localStorage.getItem(placementHistoryKey))[0],
      );
      if (
        saved.mode !== "all" ||
        saved.count !== 10 ||
        saved.attempts !== 10 ||
        saved.elapsed <= 0
      )
        throw Error("Completed run had an incorrect history entry");
      await p.reload();
      await p.getByRole("button", { name: /Place a city/ }).click();
      await p.getByRole("button", { name: "היסטוריית סיבובים" }).click();
      if (
        !(await p.locator(".placement-history-row").innerText()).includes(
          "כל גבולות הערים",
        )
      )
        throw Error("Run history did not survive reload");
      await p.getByRole("button", { name: "סגירה" }).click();
    }

    await p.locator("#back").click();
    await p.getByRole("button", { name: /Which is farther north/ }).click();
    await p.locator("#city-tier").selectOption("10");
    const eligible = await p.evaluate(() =>
      cities.slice(0, 10).map((c) => c.he),
    );
    const answers = await p.locator("#answers button").allTextContents();
    if (!answers.every((answer) => eligible.includes(answer)))
      throw Error("Direction quiz ignored city tier");
    await p.locator("#answers button").first().click();
    if (!(await p.locator("#feedback").innerText()).includes("צפונית"))
      throw Error("direction quiz");
    await p.locator("#back").click();
    await p.getByRole("button", { name: /Prime ministers/ }).click();
    for (const leader of await p.locator("#timeline button").all()) {
      await leader.click();
      await p.locator("#event-profile img").evaluate((image) => image.decode());
      if (!(await p.locator(".leader-review p").innerText()))
        throw Error("Missing prime-minister fact");
    }
    await p.getByRole("button", { name: "משה שרת", exact: true }).click();
    if (!(await p.locator("#event-date").innerText()).includes("1954"))
      throw Error("history");
    await p.screenshot({
      path: os.tmpdir() + "/israel-portrait-" + width + ".png",
    });
    await p.locator("#back").click();
    await p.getByRole("button", { name: /Who was prime minister/ }).click();
    const year = Number(
      (await p.locator(".panel h2").innerText()).match(/\d{4}/)[0],
    );
    const leader = await p.evaluate(
      (y) => pms[leaderQuestions.find((q) => q[0] === y)[1]][0],
      year,
    );
    if (await p.locator("#next img").count())
      throw Error("Portrait gave away the answer");
    await p.getByRole("button", { name: leader, exact: true }).click();
    await p.locator("#next img").evaluate((image) => image.decode());
    if (!(await p.locator("#next button").count())) throw Error("history quiz");
    await p.locator("#back").click();
    await p.getByRole("button", { name: /Build a majority/ }).click();
    await p.locator("#parties button").first().click();
    if (!(await p.locator("#total").innerText()).startsWith("31"))
      throw Error("party seats");
    await p.locator("#back").click();
    await p.getByRole("button", { name: /Major roads/ }).click();
    await p.getByLabel("בחירת כביש").selectOption("2");
    if (!(await p.locator(".road").count())) throw Error("road layer missing");
    if (
      await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)
    )
      throw Error("overflow");
    if (errors.length) throw Error(errors.join("\n"));
    console.log(
      width +
        "px Hebrew catalog, city search, reveal, quizzes, timeline and seat activities OK",
    );
    await p.close();
  }
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
