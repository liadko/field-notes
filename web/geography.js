const topology = /*__WORLD__*/ null,
  countries = /*__COUNTRIES__*/ null;
const features = topojson.feature(
  topology,
  topology.objects.countries,
).features;
const byCode = new Map(countries.map((c) => [c.cca3, c]));
const countryFlags = /*__FLAGS__*/ null;
function countryFlag(country) {
  const src = countryFlags[country?.cca2?.toLowerCase()];
  if (!src) return null;
  const flag = document.createElement("img");
  flag.className = "country-flag";
  flag.alt = "";
  flag.width = 24;
  flag.height = 18;
  flag.src = src;
  return flag;
}
function labelCountry(parent, country) {
  const flag = countryFlag(country);
  parent.textContent = name(country);
  if (flag) parent.prepend(flag);
}
function showCountryChips(parent, codes) {
  parent.replaceChildren();
  for (const code of codes) {
    const chip = document.createElement("span");
    chip.className = "country-chip";
    labelCountry(chip, byCode.get(code));
    parent.append(chip);
  }
}
const byNumber = new Map(
  countries.filter((c) => c.ccn3).map((c) => [+c.ccn3, c]),
);
features.forEach((f) => {
  f.country = byNumber.get(+f.id);
});
const mapped = features.filter((f) => f.country);
for (const feature of mapped) {
  feature.center = d3.geoCentroid(feature);
  const simplifyRing = (ring) => {
    if (ring.length < 36) return ring;
    const result = [ring[0]];
    for (const point of ring.slice(1, -1)) {
      const last = result.at(-1);
      if (Math.hypot(point[0] - last[0], point[1] - last[1]) >= 0.35)
        result.push(point);
    }
    return result.length >= 3 ? [...result, ring[0]] : ring;
  };
  const { type, coordinates } = feature.geometry;
  feature.preview = {
    type,
    coordinates:
      type === "Polygon"
        ? coordinates.map(simplifyRing)
        : coordinates.map((polygon) => polygon.map(simplifyRing)),
  };
}
const independent = countries.filter((c) => c.independent && c.cca3);
const $ = (id) => document.getElementById(id);
const modes = [
  "Explore",
  "Find countries",
  "Name countries",
  "Capitals",
  "Border routes",
  "Route study",
  "Hot & cold",
  "Top ten",
];
let mode = modes[0],
  region = "World",
  projectionMode = "map",
  target,
  start,
  finish,
  found,
  guesses,
  journey,
  routePreview,
  routeEffect,
  score,
  attempts,
  mapTransform = d3.zoomIdentity,
  globeRotation = [-15, -15];
const svg = d3
  .select("#map")
  .on("contextmenu", (event) => event.preventDefault());
const capitals = /*__CAPITALS__*/ null;
let selected = null,
  streak = 0,
  misses = 0,
  wrongCode = null,
  review = null,
  frame;
const inRegion = (c) => region === "World" || c.region === region;
const canPick = (c) =>
  (mode === "Border routes" && journey && !journey.complete) ||
  (inRegion(c) &&
    (mode === "Explore" ||
      (mode === "Find countries" && c.independent && !found.has(c.cca3))));
function markFeedback(tone) {
  const feedback = $("feedback");
  feedback.dataset.tone = tone;
  animateFeedback(feedback);
}
const aliases = {
  uk: "GBR",
  britain: "GBR",
  greatbritain: "GBR",
  usa: "USA",
  america: "USA",
  southkorea: "KOR",
  northkorea: "PRK",
  ivorycoast: "CIV",
  czechrepublic: "CZE",
  turkey: "TUR",
  burma: "MMR",
  congokinshasa: "COD",
  drc: "COD",
  congobrazzaville: "COG",
  uae: "ARE",
  easttimor: "TLS",
};
const name = (c) => c.name.common;
const normalize = (s) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
const random = (a) => a[Math.floor(Math.random() * a.length)];
function pool() {
  return independent.filter((c) => region === "World" || c.region === region);
}
function mappedPool() {
  const codes = new Set(mapped.map((f) => f.country.cca3));
  return pool().filter((c) => codes.has(c.cca3));
}
function match(value, candidates = countries) {
  const n = normalize(value);
  return candidates.find(
    (c) =>
      aliases[n] === c.cca3 ||
      [name(c), c.name.official, c.cca3, ...(c.altSpellings || [])].some(
        (s) => normalize(s) === n,
      ),
  );
}

function addCountrySuggestions(input, candidates) {
  input.autocomplete = "off";
  input.id ||= "country-search";
  const list = document.createElement("div");
  list.id = input.id + "-suggestions";
  list.className = "country-suggestions";
  list.setAttribute("role", "listbox");
  list.setAttribute("aria-label", "Matching countries");
  input.after(list);
  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  let matches = [];
  let active = -1;

  function highlight(index) {
    active = index;
    for (const [i, option] of Array.from(list.children).entries()) {
      option.setAttribute("aria-selected", String(i === active));
    }
    if (active < 0) input.removeAttribute("aria-activedescendant");
    else input.setAttribute("aria-activedescendant", list.children[active].id);
  }
  function close() {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    highlight(-1);
  }
  function choose(country) {
    input.value = name(country);
    close();
    if (mode === "Explore") input.dispatchEvent(new Event("change"));
  }
  function updateSuggestions() {
    const query = normalize(input.value);
    if (!query) {
      list.replaceChildren();
      close();
      return;
    }
    const exact = match(input.value, candidates);
    matches = candidates
      .map((country) => {
        const label = normalize(name(country));
        const rank =
          country === exact
            ? 0
            : label.startsWith(query)
              ? 1
              : label.includes(query)
                ? 2
                : country.altSpellings?.some((alias) =>
                      normalize(alias).startsWith(query),
                    )
                  ? 3
                  : 4;
        return { country, rank };
      })
      .filter((result) => result.rank < 4)
      .sort(
        (a, b) =>
          a.rank - b.rank || name(a.country).localeCompare(name(b.country)),
      )
      .slice(0, 5)
      .map((result) => result.country);
    list.replaceChildren();
    matches.forEach((country, index) => {
      const option = document.createElement("div");
      option.id = list.id + "-" + index;
      option.setAttribute("role", "option");
      option.textContent = name(country);
      option.onpointerdown = (event) => event.preventDefault();
      option.onclick = () => choose(country);
      list.append(option);
    });
    if (!matches.length) return close();
    highlight(-1);
    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  close();
  input.addEventListener("input", updateSuggestions);
  input.addEventListener("focus", updateSuggestions);
  input.addEventListener("blur", (event) => {
    // Keep the layout steady between pressing and releasing the submit button.
    if (event.relatedTarget?.type !== "submit") close();
  });
  input.form?.addEventListener("submit", close);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !list.hidden) {
      event.preventDefault();
      close();
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (list.hidden) updateSuggestions();
      if (list.hidden) return;
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      highlight(
        active < 0
          ? step === 1
            ? 0
            : matches.length - 1
          : (active + step + matches.length) % matches.length,
      );
    }
    if (event.key === "Enter" && !list.hidden && active >= 0) {
      event.preventDefault();
      choose(matches[active]);
    }
  });
}
const worldBorders = borderGraph(
  countries.map((c) => [c.cca3, c.borders || []]),
);
const countryName = (code) => name(byCode.get(code));
function shortest(a, b) {
  if (!borderDistances(worldBorders, b).has(a)) return null;
  return borderRound(worldBorders, a, b).shortestRoutes(1).routes[0];
}
function chooseJourney() {
  const origins = d3.shuffle(
    pool().filter((c) => worldBorders.get(c.cca3).size),
  );
  for (const origin of origins) {
    const distances = borderDistances(worldBorders, origin.cca3);
    const goals = pool().filter((c) => {
      const steps = distances.get(c.cca3);
      return steps >= 2 && steps <= 6;
    });
    if (goals.length) {
      start = origin;
      finish = random(goals);
      return borderRound(worldBorders, start.cca3, finish.cca3);
    }
  }
  start = finish = null;
  return null;
}
function guessBorder(code) {
  if (!journey || journey.complete) return;
  const previousLength = journey.path.length;
  const result = code ? journey.guess(code) : null;
  if (result) routeEffect = { result, previousLength };
  const feedback = $("feedback");
  feedback.textContent = result
    ? borderFeedback(journey, result, countryName, "en")
    : "Choose a different country on the map or by name.";
  animateFeedback(
    feedback,
    result
      ? { optimal: "right", later: "right", near: "hint", far: "wrong" }[
          result.kind
        ]
      : "neutral",
  );
  update();
  draw();
}
function choices() {
  $("modes").replaceChildren();
  modes.forEach((m) => {
    const button = document.createElement("button");
    button.textContent = m;
    button.className = mode === m ? "active" : "";
    button.setAttribute("aria-pressed", mode === m);
    button.onclick = () => {
      mode = m;
      reset();
    };
    $("modes").append(button);
  });
  $("flat").className = projectionMode === "map" ? "active" : "";
  $("globe").className = projectionMode === "globe" ? "active" : "";
  $("flat").setAttribute("aria-pressed", projectionMode === "map");
  $("globe").setAttribute("aria-pressed", projectionMode === "globe");
}
function reset() {
  found = new Set();
  misses = streak = 0;
  wrongCode = null;
  review = null;
  selected = null;
  delete $("feedback").dataset.tone;
  guesses = [];
  journey = routePreview = routeEffect = null;
  score = attempts = 0;
  target = random(
    mode === "Find countries"
      ? mappedPool()
      : pool().filter((c) => c.capital?.length),
  );
  if (mode === "Border routes") journey = chooseJourney();
  $("feedback").textContent = "";
  choices();
  update();
  draw();
}
function update() {
  const descriptions = {
    Explore: "Select a country to see its capital and neighbors.",
    "Find countries": "Select the named country on the map.",
    "Name countries": "Type the countries you remember in this region.",
    Capitals: "Name the capital of this country.",
    "Border routes":
      "Tap a country or enter its name. Only neighbors move you. The final border crossing is automatic.",
    "Route study": "Enter two countries to see a shortest land route.",
    "Hot & cold":
      "Guess countries to find the mystery country. Distance is between country coordinates.",
    "Top ten": "Name the ten most populous countries in the selected region.",
  };
  $("label").textContent = mode;
  $("description").textContent = descriptions[mode];
  $("prompt").textContent =
    mode === "Explore"
      ? "Choose a country"
      : mode === "Find countries" || mode === "Capitals"
        ? target
          ? name(target)
          : "No countries available"
        : mode === "Name countries" || mode === "Top ten"
          ? region
          : mode === "Border routes"
            ? finish
              ? `${name(start)} → ${name(finish)}`
              : "No route available"
            : mode === "Route study"
              ? "Connect two countries"
              : "Find the mystery country";
  if (mode === "Capitals" && target) labelCountry($("prompt"), target);
  $("mapTitle").textContent = region === "World" ? "World atlas" : region;
  const needsInput =
    !["Explore", "Find countries"].includes(mode) &&
    (mode !== "Border routes" || (journey && !journey.complete));
  $("answer").innerHTML =
    mode === "Route study"
      ? '<form id="form"><input id="entry" autocomplete="off" aria-label="Start country" placeholder="From"><input id="destination" autocomplete="off" aria-label="Destination country" placeholder="To"><button type="submit">Find route</button></form>'
      : needsInput
        ? '<form id="form"><input id="entry" autocomplete="off" aria-label="Your answer" placeholder="Type your answer"><button type="submit">Guess ↵</button></form>'
        : "";
  if (needsInput)
    $("form").onsubmit = (e) => {
      e.preventDefault();
      if (mode === "Route study") {
        const a = match($("entry").value),
          b = match($("destination").value),
          path = a && b && shortest(a.cca3, b.cca3);
        found = new Set(path || []);
        $("feedback").textContent = path
          ? `${path.length - 1} crossings: ${path.map((x) => name(byCode.get(x))).join(" → ")}`
          : "No land route found. Check the country names.";
        showCountryChips($("list"), path || []);
        draw();
      } else {
        const value = $("entry").value;
        submit(value);
        ($("entry") || $("answer").querySelector("button"))?.focus();
      }
    };
  if (
    ["Explore", "Border routes", "Route study", "Hot & cold"].includes(mode)
  ) {
    const candidates = ["Explore", "Hot & cold"].includes(mode)
      ? countries.filter(inRegion)
      : countries;
    if (mode === "Explore") {
      const input = document.createElement("input");
      input.placeholder = "Search a country";
      input.setAttribute("aria-label", "Search a country");
      input.onchange = () => {
        const c = match(input.value, countries.filter(inRegion));
        if (c?.latlng?.length) {
          selected = c;
          globeRotation = [-c.latlng[1], -c.latlng[0]];
          clickCountry(null, { country: c });
        }
      };
      $("answer").prepend(input);
    }
    $("answer")
      .querySelectorAll("input")
      .forEach((input) => addCountrySuggestions(input, candidates));
  }
  const list = $("list");
  list.replaceChildren();
  list.removeAttribute("aria-label");
  if (["Find countries", "Name countries", "Top ten"].includes(mode)) {
    const codes = [...found].reverse();
    showCountryChips(
      list,
      mode === "Find countries" ? codes.slice(0, 3) : codes,
    );
  }
  if (mode === "Capitals" && review) {
    $("answer").innerHTML = '<button type="button">Next country →</button>';
    $("answer").firstChild.onclick = () => {
      const next = random(
        pool().filter((c) => c !== target && c.capital?.length),
      );
      target = next || target;
      misses = 0;
      review = null;
      $("feedback").textContent = "";
      update();
      draw();
      $("entry").focus();
    };
  }
  const stats = $("stat");
  stats.textContent =
    mode === "Name countries"
      ? `${found.size} / ${pool().length} countries`
      : mode === "Top ten"
        ? `${found.size} / ${Math.min(10, pool().length)} countries`
        : ["Find countries", "Capitals"].includes(mode)
          ? `${score} correct · ${attempts} attempts`
          : mode === "Border routes"
            ? ""
            : mode === "Hot & cold"
              ? `${guesses.length} guesses`
              : "Select a country to begin.";
  if (mode === "Find countries") {
    const total = mappedPool().length;
    stats.textContent =
      found.size +
      " / " +
      total +
      " found · " +
      score +
      " unassisted" +
      (streak >= 2 ? " · " + streak + " in a row" : "");
    const progress = document.createElement("progress");
    progress.max = total || 1;
    progress.value = found.size;
    progress.setAttribute("aria-label", "Countries found");
    stats.append(progress);
    if (!target && found.size) $("prompt").textContent = "Region complete";
  }
  if (mode === "Hot & cold" && guesses.length) {
    const closest = Math.min(...guesses.map((guess) => guess.km));
    const list = $("list");
    list.replaceChildren();
    list.setAttribute("aria-label", "Distance by guess");
    for (const guess of [...guesses].reverse()) {
      const row = document.createElement("div");
      row.className = "guess-row";
      const label = document.createElement("span");
      labelCountry(label, byCode.get(guess.code));
      if (guess.km === closest) label.append(" · Closest");
      const distance = document.createElement("span");
      distance.textContent = guess.km.toLocaleString() + " km";
      const meter = document.createElement("meter");
      meter.max = 1;
      meter.value = 1 - Math.min(guess.km / 12000, 1);
      meter.setAttribute("aria-label", "Relative closeness");
      row.append(label, distance, meter);
      list.append(row);
    }
  }
  renderBorderMapStatus(
    $("journey-map-status"),
    mode === "Border routes" ? journey : null,
    countryName,
    "en",
  );
  $("list").classList.toggle("route-results", mode === "Border routes");
  if (mode === "Border routes")
    renderBorderRoute(
      $("list"),
      journey,
      countryName,
      "en",
      (path) => {
        routePreview = path;
        draw();
      },
      (code) => countryFlag(byCode.get(code)),
    );
  $("restart").hidden = mode === "Explore";
  $("description").hidden = false;
  $("region").title = "Choose the region for the map and round";
}
function submit(value) {
  if (!value.trim()) return;
  const c = match(
    value,
    mode === "Hot & cold" ? countries.filter(inRegion) : countries,
  );
  if (mode === "Capitals") {
    if (review) return;
    attempts++;
    if (target?.capital?.some((cap) => normalize(cap) === normalize(value))) {
      score++;
      finishCapital(true);
    } else if (++misses >= 3) {
      finishCapital(false);
    } else {
      $("feedback").textContent = "Not quite. Try again.";
      markFeedback("wrong");
    }
  }
  if (mode === "Name countries" || mode === "Top ten") {
    const eligible =
      mode === "Top ten"
        ? [...pool()]
            .sort((a, b) => (b.population || 0) - (a.population || 0))
            .slice(0, 10)
        : pool();
    if (!c || !eligible.includes(c))
      $("feedback").textContent =
        mode === "Top ten"
          ? "Not in this top ten. Try another."
          : "Country not found in this region.";
    else if (found.has(c.cca3)) $("feedback").textContent = "Already found.";
    else {
      found.add(c.cca3);
      $("feedback").textContent =
        found.size === eligible.length
          ? "Complete! Well done."
          : `${name(c)} ✓`;
    }
  }
  if (mode === "Border routes") {
    guessBorder(c?.cca3);
    return;
  }
  if (mode === "Hot & cold") {
    if (!c?.latlng?.length || !target?.latlng?.length)
      $("feedback").textContent = "Country not found.";
    else {
      const km = Math.round(
        d3.geoDistance(
          [c.latlng[1], c.latlng[0]],
          [target.latlng[1], target.latlng[0]],
        ) * 6371,
      );
      guesses.push({ name: name(c), km, code: c.cca3 });
      $("feedback").textContent =
        c === target
          ? "You found it!"
          : `${name(c)}: approximately ${km.toLocaleString()} km away.`;
    }
  }
  if (["Name countries", "Top ten"].includes(mode) || mode === "Hot & cold") {
    markFeedback(
      c && (found.has(c.cca3) || c === target) ? "right" : "neutral",
    );
  }
  update();
  draw();
}
function finishCapital(correct) {
  review = target;
  $("feedback").textContent =
    (correct ? "Correct · " : "Answer · ") + target.capital.join(" / ");
  markFeedback(correct ? "right" : "hint");
}
function clickCountry(event, f) {
  const c = f.country;
  if (mode === "Border routes") {
    guessBorder(c.cca3);
    return;
  }
  if (!canPick(c) || (!target && mode === "Find countries")) return;
  if (mode === "Explore") {
    selected = c;
    labelCountry($("prompt"), c);
    $("description").textContent =
      `Capital: ${(c.capital || []).join(", ") || "not listed"} · ${c.region}`;
    $("feedback").textContent =
      "Land neighbors: " +
      ((c.borders || [])
        .map((x) => byCode.get(x)?.name.common || x)
        .join(", ") || "none listed");
    draw();
    return;
  }
  attempts++;
  if (c === target) {
    if (misses < 3) score++;
    if (!misses) streak++;
    found.add(c.cca3);
    review = c;
    target = random(mappedPool().filter((x) => !found.has(x.cca3)));
    $("feedback").textContent =
      (misses >= 3 ? "Found with a hint · " : "Correct · ") + name(c);
    markFeedback("right");
    misses = 0;
    wrongCode = null;
  } else {
    streak = 0;
    wrongCode = c.cca3;
    misses++;
    if (misses === 3) {
      if (projectionMode === "globe")
        globeRotation = [-target.latlng[1], -target.latlng[0]];
      mapTransform = d3.zoomIdentity;
      svg.property("__zoom", mapTransform);
    }
    $("feedback").textContent =
      misses >= 3
        ? `Follow the pulse to ${name(target)}.`
        : `That’s ${name(c)}. ${3 - misses} before a map hint.`;
    markFeedback(misses >= 3 ? "hint" : "wrong");
  }
  update();
  draw();
}
function draw() {
  const node = $("map"),
    w = node.clientWidth,
    h = node.clientHeight;
  svg.selectAll("*").remove();
  cancelAnimationFrame(frame);
  const extent = {
    Europe: [
      [-26, 34],
      [48, 72],
    ],
    Africa: [
      [-27, -36],
      [57, 38],
    ],
    Asia: [
      [25, -12],
      [180, 78],
    ],
    Americas: [
      [-170, -57],
      [-27, 80],
    ],
    Oceania: [
      [108, -49],
      [179, 15],
    ],
  }[region];
  const projection =
    projectionMode === "globe"
      ? d3
          .geoOrthographic()
          .scale(Math.min(w, h) * 0.46)
          .translate([w / 2, h / 2])
          .rotate(globeRotation)
          .clipAngle(90)
          .precision(1.5)
      : d3.geoNaturalEarth1().fitExtent(
          [
            [18, 18],
            [w - 18, h - 18],
          ],
          extent
            ? {
                type: "MultiPoint",
                coordinates: extent.flatMap(([lon]) =>
                  extent.map(([, lat]) => [lon, lat]),
                ),
              }
            : { type: "Sphere" },
        );
  const path = d3.geoPath(projection),
    g = svg.append("g").attr("transform", mapTransform);
  g.append("path")
    .datum({ type: "Sphere" })
    .attr("class", "sphere")
    .attr("d", path);
  g.append("path")
    .datum(d3.geoGraticule10())
    .attr("class", "graticule")
    .attr("d", path);
  const countryPaths = g
    .selectAll(".country")
    .data(mapped)
    .join("path")
    .attr(
      "class",
      (f) =>
        "country " +
        (!inRegion(f.country) ? "inactive " : "") +
        (canPick(f.country) ? "pickable " : "") +
        (wrongCode === f.country.cca3 ? "wrong " : "") +
        (mode === "Find countries" && misses >= 3 && f.country === target
          ? "hint-pulse "
          : "") +
        (mode === "Capitals" && f.country === target
          ? "capital-question "
          : "") +
        (found.has(f.country.cca3)
          ? "found"
          : guesses.some((x) => x.code === f.country.cca3)
            ? "guessed"
            : ""),
    )
    .style("fill", (f) => {
      const guess = guesses.findLast((x) => x.code === f.country.cca3);
      return guess
        ? d3.interpolateRgb("#ed5c49", "#506a81")(Math.min(guess.km / 12000, 1))
        : null;
    })
    .attr("d", path)
    .attr("tabindex", (f) => (canPick(f.country) ? 0 : null))
    .attr("role", (f) => (canPick(f.country) ? "button" : null))
    .attr("aria-label", (f) =>
      ["Explore", "Border routes"].includes(mode)
        ? name(f.country)
        : "Country on map",
    )
    .on("click", clickCountry)
    .on("keydown", (e, f) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        clickCountry(e, f);
      }
    });
  countryPaths
    .append("title")
    .text((f) =>
      ["Explore", "Border routes"].includes(mode) ? name(f.country) : "Country",
    );
  const annotations = svg.append("g").attr("class", "map-annotations");
  const displayed =
    mode === "Explore" ? selected : mode === "Capitals" ? review : null;
  if (selected && mode === "Explore")
    countryPaths.classed("selected", (f) => f.country === selected);
  const routeCodes =
    mode === "Route study"
      ? [...found]
      : mode === "Border routes"
        ? routePreview || journey?.path || []
        : [];
  const routeCoordinates = routeCodes.map((code) => {
    const location = byCode.get(code)?.latlng;
    return location?.length ? [location[1], location[0]] : null;
  });
  const effect = routeEffect;
  routeEffect = null;
  const lastTurn =
    mode === "Border routes" && !routePreview ? journey?.turns.at(-1) : null;
  const offRoute =
    lastTurn && lastTurn.kind !== "optimal" ? byCode.get(lastTurn.node) : null;
  const offRoutePosition = offRoute?.latlng?.length
    ? [offRoute.latlng[1], offRoute.latlng[0]]
    : null;
  const routeSegments = routeCoordinates.slice(1).flatMap((end, index) => {
    const start = routeCoordinates[index];
    return start && end ? [[start, end]] : [];
  });
  if (routeSegments.length) {
    g.append("path")
      .datum({ type: "MultiLineString", coordinates: routeSegments })
      .attr("class", "journey-connection")
      .attr("d", path);
  }
  if (effect?.result.moved && g.select(".journey-connection").size()) {
    for (
      let i = effect.previousLength - 1;
      i < routeCoordinates.length - 1;
      i++
    ) {
      const start = routeCoordinates[i],
        end = routeCoordinates[i + 1];
      if (!start || !end) continue;
      const flash = g
        .append("path")
        .datum({ type: "LineString", coordinates: [start, end] })
        .attr("class", "journey-connection journey-drawing")
        .attr("pathLength", 1)
        .attr("d", path)
        .style("animation-delay", (i - effect.previousLength + 1) * 180 + "ms");
      flash.on("animationend", () => flash.remove());
    }
  }
  svg
    .classed("journey-map", mode === "Border routes" || mode === "Route study")
    .classed(
      "journey-arrived",
      mode === "Border routes" && !!journey?.complete,
    );
  countryPaths
    .classed("journey-visited", (f) => routeCodes.includes(f.country.cca3))
    .attr("data-route-feedback", (f) =>
      f.country === offRoute ? lastTurn.kind : null,
    )
    .classed("journey-guess-pop", (f) => !!effect && f.country === offRoute)
    .classed(
      "journey-destination",
      (f) => mode === "Border routes" && f.country.cca3 === journey?.goal,
    )
    .classed("journey-latest", (f) => routeCodes.at(-1) === f.country.cca3)
    .style(
      "--journey-delay",
      (f) =>
        (routeCodes.length - 1 - routeCodes.indexOf(f.country.cca3)) * 75 +
        "ms",
    );
  const cap = capitals.features.find(
    (f) => f.properties.iso3 === displayed?.cca3,
  );
  const clickable = mapped.filter((f) => canPick(f.country));
  const cachedArea = new Map(clickable.map((f) => [f, path.area(f)]));
  const touch =
    matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const minSize = touch ? 12 : 6;

  function visiblePoint(coordinates) {
    if (
      projectionMode === "globe" &&
      d3.geoDistance(
        coordinates,
        globeRotation.slice(0, 2).map((x) => -x),
      ) >=
        Math.PI / 2
    )
      return null;
    const [x, y] = mapTransform.apply(projection(coordinates));
    return x >= 0 && x <= w && y >= 0 && y <= h ? [x, y] : null;
  }

  function annotate() {
    annotations.selectAll("*").remove();
    const used = [];
    const candidates = clickable.flatMap((f) => {
      const point = visiblePoint(f.center);
      if (!point) return [];
      const area =
        projectionMode === "globe" ? path.area(f) : cachedArea.get(f);
      const screenArea = area * mapTransform.k ** 2;
      if (screenArea >= minSize ** 2) return [];
      return [{ f, point, screenArea }];
    });
    candidates.sort(
      (a, b) =>
        Number(b.f.country === target && misses >= 3) -
          Number(a.f.country === target && misses >= 3) ||
        Number(b.f.country.cca3 === "LIE") -
          Number(a.f.country.cca3 === "LIE") ||
        a.screenArea - b.screenArea,
    );
    const hitRadius = touch ? 17 : 12;
    const dotRadius = touch ? 8 : 6.5;
    const angles = [180, 0, 225, 315, 90, 270, 135, 45];
    const visibleLand = candidates.length
      ? countryPaths
          .nodes()
          .filter((node) => node.getAttribute("d"))
          .map((node) => ({
            node,
            bounds: node.getBBox(),
          }))
      : [];
    function landAt(pin) {
      const [x, y] = mapTransform.invert(pin);
      const point = new DOMPoint(x, y);
      return visibleLand.find(
        ({ node, bounds }) =>
          x >= bounds.x &&
          x <= bounds.x + bounds.width &&
          y >= bounds.y &&
          y <= bounds.y + bounds.height &&
          node.isPointInFill(point),
      )?.node.__data__;
    }
    for (const {
      f,
      point: [x, y],
    } of candidates) {
      if (used.length >= (touch ? 9 : 6)) break;
      const isLiechtenstein = f.country.cca3 === "LIE";
      const distances = [hitRadius + 4, hitRadius + 11, hitRadius + 18];
      if (isLiechtenstein) distances.push(hitRadius + 25, hitRadius + 33);
      const directions = isLiechtenstein
        ? Array.from({ length: 24 }, (_, index) => index * 15)
        : angles;
      const nearbyPins = distances.flatMap((distance) =>
        directions.map((degrees) => {
          const angle = (degrees * Math.PI) / 180;
          return [
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance,
          ];
        }),
      );
      const available = nearbyPins.filter(
        ([px, py]) =>
          px > hitRadius &&
          px < w - hitRadius &&
          py > hitRadius &&
          py < h - hitRadius &&
          used.every(
            ([ux, uy]) => Math.hypot(px - ux, py - uy) > hitRadius * 2,
          ) &&
          candidates.every(
            (other) =>
              other.f === f ||
              Math.hypot(px - other.point[0], py - other.point[1]) >
                hitRadius + 2,
          ),
      );
      const locations = available.map((pin) => ({ pin, land: landAt(pin) }));
      const usable = locations.filter(
        ({ land }) =>
          !land || misses < 3 || land.country !== target || land === f,
      );
      let placement;
      if (isLiechtenstein) {
        // Keep the larger invisible hit circle off Switzerland as well.
        const clearOfSwitzerland = ({ pin: [px, py] }) => {
          const step = hitRadius / 5;
          for (let dx = -hitRadius; dx <= hitRadius; dx += step) {
            for (let dy = -hitRadius; dy <= hitRadius; dy += step) {
              if (
                dx * dx + dy * dy <= hitRadius * hitRadius &&
                landAt([px + dx, py + dy])?.country.cca3 === "CHE"
              )
                return false;
            }
          }
          return true;
        };
        const landOptions = usable
          .filter(({ land }) =>
            ["ITA", "AUT", "DEU"].includes(land?.country.cca3),
          )
          .filter(clearOfSwitzerland);
        placement =
          landOptions.find(({ land }) => land.country.cca3 === "ITA") ||
          landOptions[0];
      } else {
        placement =
          usable.find(({ land }) => !land) ||
          usable.find(({ land }) => land === f) ||
          usable[0];
      }
      const pin = placement?.pin;
      if (!pin) continue;
      used.push(pin);
      const [px, py] = pin;
      const helper = annotations
        .append("g")
        .attr(
          "class",
          "tiny-target" +
            (f.country === target && misses >= 3 ? " hint-pulse" : ""),
        )
        .attr("data-code", f.country.cca3)
        .attr("role", "button")
        .attr("tabindex", 0)
        .attr(
          "aria-label",
          ["Explore", "Border routes"].includes(mode)
            ? name(f.country)
            : "Small-country callout",
        )
        .on("click", (e) => clickCountry(e, f))
        .on("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            clickCountry(e, f);
          }
        });
      const distance = Math.hypot(px - x, py - y);
      const edgeX = ((py - y) / distance) * 3;
      const edgeY = ((px - x) / distance) * 3;
      helper
        .append("path")
        .attr(
          "d",
          `M${x},${y} L${px + edgeX},${py - edgeY} L${px - edgeX},${py + edgeY} Z`,
        );
      helper
        .append("circle")
        .attr("cx", px)
        .attr("cy", py)
        .attr("r", hitRadius)
        .attr("class", "helper-hit");
      helper
        .append("circle")
        .attr("cx", px)
        .attr("cy", py)
        .attr("r", dotRadius)
        .attr("class", "helper-dot");
      if (["Explore", "Border routes"].includes(mode))
        helper.append("title").text(name(f.country));
    }
    if (routeCodes.length > 1) {
      const points = routeCoordinates
        .filter(Boolean)
        .map(visiblePoint)
        .filter(Boolean);
      annotations
        .selectAll(".journey-stop-dot")
        .data(points)
        .join("circle")
        .attr("class", "journey-stop-dot")
        .attr("r", 3.5)
        .attr("cx", (p) => p[0])
        .attr("cy", (p) => p[1]);
    }
    $("journey-map-status").querySelector(".journey-locate")?.remove();
    if (offRoutePosition) {
      const point = visiblePoint(offRoutePosition);
      if (point) {
        const [x, y] = point;
        const marker = annotations
          .append("g")
          .attr("class", "journey-guess-marker")
          .attr("data-route-feedback", lastTurn.kind);
        marker.append("circle").attr("cx", x).attr("cy", y).attr("r", 6);
        marker
          .append("text")
          .attr("x", x + (x > w * 0.65 ? -11 : 11))
          .attr("y", Math.max(17, y - 9))
          .attr("text-anchor", x > w * 0.65 ? "end" : "start")
          .text(name(offRoute));
      } else {
        const locate = document.createElement("button");
        locate.type = "button";
        locate.className = "journey-locate";
        locate.textContent = "Locate " + name(offRoute);
        locate.onclick = () => {
          if (projectionMode === "globe") {
            globeRotation = offRoutePosition.map((value) => -value);
            mapTransform = d3.zoomIdentity;
          } else {
            const [x, y] = projection(offRoutePosition);
            const scale = Math.min(1, mapTransform.k);
            mapTransform = d3.zoomIdentity
              .translate(w / 2 - x * scale, h / 2 - y * scale)
              .scale(scale);
          }
          svg.property("__zoom", mapTransform);
          draw();
        };
        $("journey-map-status").append(locate);
      }
    }
    if (cap) {
      const point = visiblePoint(cap.geometry.coordinates);
      if (point) {
        const [x, y] = point;
        annotations
          .append("circle")
          .attr("cx", x)
          .attr("cy", y)
          .attr("r", 5)
          .attr("class", "capital-marker");
        const left = x > w * 0.6;
        annotations
          .append("text")
          .attr("x", x + (left ? -10 : 10))
          .attr("y", y - 10)
          .attr("text-anchor", left ? "end" : "start")
          .attr("class", "capital-label")
          .text(cap.properties.city);
      }
    }
  }
  const mapBusy = (active) => {
    svg.classed("moving", active);
    if (active) svg.classed("suppress-hover", true);
  };
  const zoom = d3
    .zoom()
    .clickDistance(4)
    .filter(
      (e) =>
        projectionMode !== "globe" ||
        e.type === "wheel" ||
        e.touches?.length > 1,
    )
    .scaleExtent([1, 24])
    .on("zoom", (e) => {
      mapBusy(true);
      mapTransform = e.transform;
      g.attr("transform", mapTransform);
    })
    .on("end", () => {
      if (!svg.classed("moving")) return;
      mapBusy(false);
      annotate();
    });
  svg.call(zoom).on("dblclick.zoom", null);
  $("zoom-in").onclick = () => svg.call(zoom.scaleBy, 1.6);
  $("zoom-out").onclick = () => svg.call(zoom.scaleBy, 1 / 1.6);
  $("fit-map").onclick = () => {
    mapTransform = d3.zoomIdentity;
    svg.property("__zoom", mapTransform);
    draw();
  };
  if (projectionMode === "globe") {
    const renderRotation = (preview = false) => {
      projection.rotate(globeRotation);
      g.selectAll("path").attr("d", (datum) =>
        path(preview ? datum.preview || datum : datum),
      );
    };
    svg.call(
      d3
        .drag()
        .clickDistance(4)
        .filter((e) => !e.button && !(e.touches?.length > 1))
        .on("drag", (e) => {
          mapBusy(true);
          globeRotation = [
            globeRotation[0] + e.dx * 0.4,
            Math.max(-90, Math.min(90, globeRotation[1] - e.dy * 0.4)),
          ];
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => renderRotation(true));
        })
        .on("end", () => {
          if (!svg.classed("moving")) return;
          cancelAnimationFrame(frame);
          renderRotation();
          mapBusy(false);
          annotate();
        }),
    );
  } else svg.on(".drag", null);
  annotate();
}
$("region").onchange = (e) => {
  region = e.target.value;
  const centers = {
    World: [15, 15],
    Europe: [15, 50],
    Africa: [20, 0],
    Asia: [90, 30],
    Americas: [-85, 15],
    Oceania: [145, -20],
  };
  globeRotation = centers[region].map((x) => -x);
  selected = null;
  mapTransform = d3.zoomIdentity;
  svg.property("__zoom", d3.zoomIdentity);
  reset();
};
$("restart").onclick = reset;
for (const id of ["flat", "globe"])
  $(id).onclick = () => {
    projectionMode = id === "flat" ? "map" : "globe";
    mapTransform = d3.zoomIdentity;
    svg.property("__zoom", d3.zoomIdentity);
    choices();
    draw();
  };
svg.on("pointermove.hover", (e) => {
  if (!e.buttons && e.pointerType === "mouse")
    svg.classed("suppress-hover", false);
});
window.addEventListener("resize", draw);
reset();
