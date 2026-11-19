const content = /*__BRAIN__*/ null;
const { regions, sources, myths } = content;
const $ = (id) => document.getElementById(id);
const app = $("app");
const activities = [
  [
    "atlas",
    "Explore",
    "A map of the brain",
    "Surface landmarks and internal structures, with English and Hebrew names.",
    "Open the atlas",
  ],
  [
    "locate",
    "Locate",
    "Find the region",
    "A name, an unlabeled diagram, and a place to point.",
    "Test your map",
  ],
  [
    "clues",
    "Deduce",
    "Name that region",
    "Identify a structure from a short clue. Ask for a hint when you need one.",
    "Follow the clues",
  ],
  [
    "functions",
    "Connect",
    "Match the role",
    "Connect a region with a major role, then see the limits of the shortcut.",
    "Make connections",
  ],
  [
    "pathway",
    "Build",
    "The stress signal",
    "Reconstruct the route from brain signals to cortisol production.",
    "Build the pathway",
  ],
  [
    "myths",
    "Question",
    "Sounds right. Is it?",
    "Separate useful facts from tempting oversimplifications.",
    "Check your intuition",
  ],
];
let mode = "home",
  view = "surface",
  selected = "frontal",
  showLabels = true,
  deck = [],
  index = 0,
  score = 0,
  firstTry = true,
  answered = false,
  usedHint = false;
let mistakes = 0;
let visited = new Set();
try {
  visited = new Set(JSON.parse(localStorage.getItem("brain-explored") || "[]"));
} catch {}
const shuffle = (a) => {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
function button(text, fn, parent, cls = "") {
  const b = document.createElement("button");
  b.textContent = text;
  b.className = cls;
  b.onclick = fn;
  parent.append(b);
  return b;
}
function link(source, parent) {
  const s = sources[source],
    a = document.createElement("a");
  a.href = s.url;
  a.textContent = s.name + " ↗";
  a.target = "_blank";
  a.rel = "noopener";
  a.className = "source";
  parent.append(a);
}
function open(next, preset) {
  mode = next;
  index = score = 0;
  firstTry = true;
  answered = false;
  usedHint = false;
  deck = shuffle(next === "myths" ? myths : regions);
  if (preset) {
    selected = preset;
    view = regions.find((r) => r.id === preset).view;
  }
  render();
  window.scrollTo(0, 0);
}
function shell(title, description) {
  app.innerHTML =
    '<button id="back">← All activities</button><div class="toolbar"><div><div class="kicker">Brain · a field guide</div><h1>' +
    title +
    "</h1><p>" +
    description +
    '</p></div></div><div id="work"></div>';
  $("back").onclick = () => open("home");
}
function home() {
  app.innerHTML =
    '<div class="intro"><div class="intro-copy"><div class="kicker">Brain · structures, signals, connections</div><h1>Learn the landmarks.<br>Connect the ideas.</h1><p>A visual field guide to what sits where, what it helps do, and how the pieces work together.</p><button id="start">Explore the brain ↗</button><p class="progress">' +
    visited.size +
    ' of 12 landmarks explored</p></div><div class="intro-art" id="preview" aria-hidden="true"></div></div><section class="catalog" aria-label="Brain activities"></section>';
  $("start").onclick = () => open("atlas");
  diagram($("preview"), "surface", false, false);
  activities.forEach(([id, tag, title, desc, go]) => {
    const b = button(
      "",
      () => open(id),
      app.querySelector(".catalog"),
      "activity",
    );
    b.innerHTML =
      '<span class="tag">' +
      tag +
      "</span><h3>" +
      title +
      "</h3><p>" +
      desc +
      '</p><span class="go">' +
      go +
      " →</span>";
  });
}
function render() {
  if (mode === "home") {
    home();
    return;
  }
  const a = activities.find((a) => a[0] === mode);
  shell(a[2], a[3]);
  if (mode === "atlas") atlas();
  else if (mode === "locate") locate();
  else if (mode === "pathway") pathway();
  else if (mode === "myths") mythRound();
  else choiceRound();
}
function diagram(parent, which, labels, interactive = true, active = null) {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 620 510");
  svg.setAttribute(
    "aria-label",
    which === "surface"
      ? "Schematic side view of surface brain regions"
      : "Schematic internal brain landmarks",
  );
  if (interactive) svg.setAttribute("role", "group");
  const add = (tag, attrs, p = svg) => {
    const el = document.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    p.append(el);
    return el;
  };
  if (which === "inside") {
    add("path", {
      d: "M99 293 C65 226 91 145 151 108 C240 50 382 47 469 123 C549 168 564 269 491 310 L401 367 L393 419 L402 465 L375 474 L352 420 L340 366 C241 390 119 358 99 293 Z",
      class: "schematic-outline",
    });
    add("path", {
      d: "M282 294 L268 319",
      stroke: "#c5a292",
      "stroke-width": 6,
      "stroke-linecap": "round",
    });
  }
  const visible = regions.filter((r) => r.view === which);
  visible.forEach((r, i) => {
    let shape;
    if (r.path) shape = add("path", { d: r.path });
    else {
      const [cx, cy, rx, ry] = r.ellipse;
      shape = add("ellipse", { cx, cy, rx, ry });
    }
    shape.setAttribute("fill", r.color);
    shape.setAttribute(
      "class",
      "region" + (active ? (active === r.id ? " selected" : " dim") : ""),
    );
    shape.dataset.region = r.id;
    if (interactive) {
      shape.setAttribute("tabindex", "0");
      shape.setAttribute("role", "button");
      shape.setAttribute("aria-label", labels ? r.name : "Region " + (i + 1));
      shape.onclick = () => pick(r);
      shape.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          pick(r);
        }
      };
    }
    const title = add("title", {}, shape);
    title.textContent = labels ? r.name : "Region " + (i + 1);
    if (which === "surface") {
      const folds = {
        frontal: [
          "M121 263 C106 231 126 224 125 202 S141 181 150 172",
          "M150 139 C175 124 173 155 194 148 S220 121 235 127",
          "M202 178 C231 172 221 206 240 213",
          "M144 277 C160 253 184 270 198 242",
        ],
        parietal: [
          "M310 104 C316 131 343 105 356 120 S369 145 391 132",
          "M289 180 C310 193 329 165 346 181 S379 195 395 173",
          "M337 210 C355 216 378 202 389 215",
        ],
        occipital: [
          "M467 164 C451 191 493 193 480 218",
          "M461 264 C481 251 502 271 518 242",
        ],
        temporal: [
          "M170 322 C204 326 235 307 269 294 S325 282 351 291",
          "M236 341 C274 355 323 328 354 330",
        ],
        cerebellum: [
          "M413 358 Q452 345 493 365",
          "M406 373 Q452 360 505 380",
          "M408 388 Q453 379 505 394",
          "M421 403 Q456 397 493 408",
        ],
      };
      for (const d of folds[r.id] || [])
        add("path", {
          d,
          fill: "none",
          stroke: "#19232c",
          "stroke-opacity": 0.24,
          "stroke-width": 3,
          "stroke-linecap": "round",
          "pointer-events": "none",
        });
    }
    if (labels && which === "surface") {
      const text = add("text", {
        x: r.label[0],
        y: r.label[1],
        class: "map-label",
      });
      const words = r.name === "Brainstem" ? ["Brainstem"] : r.name.split(" ");
      words.forEach((w, j) => {
        const t = add("tspan", { x: r.label[0], dy: j ? 19 : 0 }, text);
        t.textContent = w;
      });
    }
    if (which === "inside" || !labels) {
      const text = add("text", {
        x: r.label[0],
        y: r.label[1] + 5,
        class: "map-label",
        "font-size": 13,
      });
      text.textContent = String(i + 1);
    }
  });
  const front = add("text", { x: 60, y: 490, class: "orientation" });
  front.textContent = "← Front";
  const back = add("text", { x: 490, y: 490, class: "orientation" });
  back.textContent = "Back →";
  parent.append(svg);
  return svg;
}
function pick(r) {
  if (mode === "atlas") {
    selected = r.id;
    visited.add(r.id);
    try {
      localStorage.setItem("brain-explored", JSON.stringify([...visited]));
    } catch {}
    atlas();
  } else if (mode === "locate" && !answered) {
    const target = deck[index];
    if (r.id === target.id) {
      answered = true;
      if (firstTry) score++;
      $("feedback").textContent = "Found it. " + target.role + ".";
      animateFeedback($("feedback"), "right");
      $("reveal").hidden = true;
      for (const b of document.querySelectorAll(".region-list button")) {
        b.disabled = true;
        if (b.dataset.region === target.id) showQuizAnswer(b, true);
      }
      $("explanation").textContent = target.detail;
      link(target.source, $("reference"));
      $("diagram-area").replaceChildren();
      diagram($("diagram-area"), target.view, true, true, target.id);
      continuation("Next region →");
    } else {
      firstTry = false;
      $("feedback").textContent =
        "That is the " + r.name.toLowerCase() + ". Try another region.";
      recordMiss(target.id);
    }
  }
}
function atlas() {
  const r = regions.find((r) => r.id === selected);
  $("work").innerHTML =
    '<div class="workspace"><section class="diagram"><div class="diagram-tools" id="views"></div><div id="diagram-area"></div><p class="diagram-note">' +
    (view === "surface"
      ? "Left-side learning schematic. Region boundaries are approximate."
      : "Internal landmark schematic, not a midline slice. Structures are separated for clarity. Numbers match the buttons below.") +
    '</p></section><aside class="panel"><div class="kicker">' +
    (r.view === "surface" ? "Surface landmark" : "Internal landmark") +
    "</div><h2>" +
    r.name +
    '</h2><div class="he" lang="he" dir="rtl">' +
    r.he +
    "</div><h3>" +
    r.role +
    "</h3><p>" +
    r.detail +
    '</p><div id="reference"></div><details><summary>Keep the bigger picture</summary><p>This is one major association, not an exclusive job description. A behavior usually depends on several connected regions.</p></details></aside></div><div class="region-list" id="regions" aria-label="Select a brain region"></div>';
  for (const [v, label] of [
    ["surface", "Surface"],
    ["inside", "Inside"],
  ]) {
    const b = button(
      label,
      () => {
        view = v;
        selected = regions.find((r) => r.view === v).id;
        atlas();
      },
      $("views"),
      v === view ? "active" : "",
    );
    b.setAttribute("aria-pressed", v === view);
  }
  if (view === "surface") {
    const b = button(
      showLabels ? "Labels on" : "Labels off",
      () => {
        showLabels = !showLabels;
        atlas();
      },
      $("views"),
    );
    b.setAttribute("aria-pressed", showLabels);
  }
  diagram($("diagram-area"), view, showLabels, true, selected);
  link(r.source, $("reference"));
  regions
    .filter((r) => r.view === view)
    .forEach((r, i) => {
      const b = button(
        (view === "inside" ? i + 1 + ". " : "") + r.name,
        () => pick(r),
        $("regions"),
        r.id === selected ? "active" : "",
      );
      b.setAttribute("aria-pressed", r.id === selected);
    });
}
function roundStart() {
  mistakes = 0;
  firstTry = true;
  answered = false;
  usedHint = false;
  if (index >= deck.length) {
    summary();
    return false;
  }
  return true;
}
function next() {
  index++;
  if (index >= deck.length) {
    summary();
    return;
  }
  if (mode === "locate") locate();
  else if (mode === "myths") mythRound();
  else choiceRound();
}
function summary() {
  $("work").innerHTML =
    '<section class="panel quiz-card"><div class="kicker">Round complete</div><h2>Landmarks are becoming familiar.</h2><div class="big">' +
    score +
    " / " +
    deck.length +
    '</div><p>Correct on the first try, without a hint.</p><div id="again" class="toolbar"></div></section>';
  button("Play another round", () => open(mode), $("again"));
  button("Explore the atlas", () => open("atlas"), $("again"));
}
function locate() {
  if (!roundStart()) return;
  const r = deck[index];
  $("work").innerHTML =
    '<p class="progress">Region ' +
    (index + 1) +
    " of " +
    deck.length +
    " · " +
    score +
    ' first-try answers</p><div class="workspace"><section class="diagram"><div id="diagram-area"></div><p class="diagram-note">' +
    (r.view === "surface"
      ? "Surface view. Select a region."
      : "Internal schematic. Select a numbered landmark. Positions are approximate.") +
    '</p></section><aside class="panel"><div class="kicker">Find this landmark</div><h2>' +
    r.name +
    '</h2><div class="he" lang="he" dir="rtl">' +
    r.he +
    '</div><p class="feedback" id="feedback" aria-live="polite"></p><p id="explanation"></p><div id="reference"></div><div id="next"></div><button id="reveal">Show me</button></aside></div>';
  diagram($("diagram-area"), r.view, false);
  const rail = document.createElement("div");
  rail.className = "region-list";
  rail.setAttribute("aria-label", "Larger region targets");
  $("diagram-area").after(rail);
  regions
    .filter((x) => x.view === r.view)
    .forEach((x, i) => {
      button("Region " + (i + 1), () => pick(x), rail).dataset.region = x.id;
    });
  $("reveal").onclick = () => {
    if (answered) return;
    firstTry = false;
    pick(r);
    $("feedback").textContent = "Here it is. " + r.role + ".";
  };
}
function continuation(label) {
  const progress = $("work").querySelector(".progress");
  if (progress) {
    progress.textContent =
      index + 1 + " of " + deck.length + " answered · " + score + " first try";
    animateFeedback(progress, "right");
  }
  button(label, next, $("next")).focus({ preventScroll: true });
}
function recordMiss(answerId) {
  mistakes++;
  animateFeedback($("feedback"), mistakes >= 3 ? "hint" : "wrong");
  if (mistakes >= 3) {
    $("feedback").textContent = "Select the highlighted answer to continue.";
    document
      .querySelectorAll('[data-region="' + answerId + '"]')
      .forEach((node) => node.classList.add("hint-pulse", "answer-correct"));
  }
}
function showAnswerDiagram(region) {
  const result = document.createElement("div");
  result.className = "answer-diagram";
  $("next").before(result);
  diagram(result, region.view, true, false, region.id);
}
function choiceRound() {
  if (!roundStart()) return;
  const r = deck[index];
  $("work").innerHTML =
    '<section class="panel quiz-card"><div class="progress">' +
    (index + 1) +
    " of " +
    deck.length +
    " · " +
    score +
    " first-try answers</div><h2>" +
    (mode === "clues" ? "Which landmark fits?" : r.name) +
    '</h2><p class="statement">' +
    (mode === "clues"
      ? r.clue
      : "Which of these is a major role associated with this structure?") +
    '</p><div class="answers" id="answers"></div><div id="hint"></div><p class="feedback" id="feedback" aria-live="polite"></p><p id="explanation"></p><div id="reference"></div><div id="next"></div></section>';
  const candidates = shuffle([
    r,
    ...shuffle(regions.filter((x) => x !== r)).slice(0, 3),
  ]);
  candidates.forEach((c) => {
    const option = button(
      mode === "clues" ? c.name : c.role,
      () => {
        if (answered) return;
        if (c === r) {
          answered = true;
          if (firstTry) score++;
          $("feedback").textContent = "Correct. " + r.name + ".";
          $("explanation").textContent = r.detail;
          link(r.source, $("reference"));
          animateFeedback($("feedback"), "right");
          $("hint").replaceChildren();
          showAnswerDiagram(r);
          continuation("Next →");
          [...$("answers").children].forEach((b) => {
            b.disabled = true;
            b.classList.remove("hint-pulse");
            if (b.textContent === (mode === "clues" ? r.name : r.role))
              showQuizAnswer(b, true);
          });
        } else {
          firstTry = false;
          $("feedback").textContent = "Not this one. Try another connection.";
          showQuizAnswer(option, false);
          option.disabled = true;
          recordMiss(r.id);
        }
      },
      $("answers"),
    );
    option.dataset.region = c.id;
  });
  if (mode === "clues")
    button(
      "A little hint",
      () => {
        firstTry = false;
        usedHint = true;
        $("hint").textContent =
          (r.view === "surface"
            ? "Look among the surface landmarks. "
            : "Look among the internal landmarks. ") + r.he;
      },
      $("hint"),
    );
}
function mythRound() {
  if (!roundStart()) return;
  const q = deck[index];
  $("work").innerHTML =
    '<section class="panel quiz-card"><div class="progress">Statement ' +
    (index + 1) +
    " of " +
    deck.length +
    '</div><p class="statement">' +
    q.claim +
    '</p><div class="answers" id="answers"></div><p class="feedback" id="feedback" aria-live="polite"></p><div id="reference"></div><div id="next"></div></section>';
  for (const [answer, label] of [
    [true, "Accurate"],
    [false, "Misleading or false"],
  ])
    button(
      label,
      () => {
        if (answered) return;
        answered = true;
        if (answer === q.answer) score++;
        $("feedback").textContent =
          (answer === q.answer ? "Correct. " : "Not quite. ") + q.explanation;
        link(q.source, $("reference"));
        const landmark = regions.find(({ id }) => id === q.landmark);
        if (landmark) showAnswerDiagram(landmark);
        [...$("answers").children].forEach((b) => (b.disabled = true));
        animateFeedback($("feedback"), answer === q.answer ? "right" : "wrong");
        Array.from($("answers").children).forEach((b, i) => {
          if ((i === 0) === q.answer || (i === 0) === answer)
            showQuizAnswer(b, (i === 0) === q.answer);
        });
        continuation("Next statement →");
      },
      $("answers"),
    );
}
function pathway() {
  const steps = [
    ["Hypothalamus", "Releases CRH, signaling the pituitary."],
    ["Pituitary gland", "Releases ACTH, signaling the adrenal glands."],
    ["Adrenal glands", "Produce cortisol. These glands sit above the kidneys."],
    [
      "Cortisol",
      "A hormone involved in stress responses and other essential body functions.",
    ],
  ];
  let placed = 0,
    mistakes = 0,
    stageMisses = 0;
  $("work").innerHTML =
    '<section class="panel"><div class="kicker">Hypothalamus–pituitary–adrenal axis</div><h2>Build the signaling sequence.</h2><p>Start with the brain signal. Choose the next stage below. This is one simplified hormonal pathway, not the entire stress response.</p><div class="chain" id="chain"></div><div class="answers" id="answers"></div><p class="feedback" id="feedback" aria-live="polite"></p><div id="reference"></div><div id="again"></div></section>';
  steps.forEach((s, i) => {
    const tile = document.createElement("div");
    tile.className = "chain-step";
    tile.innerHTML = "<small>Stage " + (i + 1) + "</small><span>?</span>";
    $("chain").append(tile);
  });
  shuffle(steps).forEach((step) => {
    const b = button(
      step[0],
      () => {
        if (step !== steps[placed]) {
          mistakes++;
          stageMisses++;
          $("feedback").textContent =
            stageMisses >= 3
              ? "Select the highlighted stage to continue."
              : "Not yet. Think about which signal comes next.";
          animateFeedback($("feedback"), stageMisses >= 3 ? "hint" : "wrong");
          if (stageMisses >= 3)
            Array.from($("answers").children)
              .find((button) => button.textContent === steps[placed][0])
              .classList.add("hint-pulse", "answer-correct");
          return;
        }
        const tile = $("chain").children[placed];
        tile.classList.add("filled");
        tile.querySelector("span").textContent = step[0];
        b.disabled = true;
        b.classList.remove("hint-pulse");
        showQuizAnswer(b, true);
        stageMisses = 0;
        $("feedback").textContent = step[1];
        animateFeedback($("feedback"), "right");
        placed++;
        if (placed === steps.length) {
          $("feedback").textContent =
            "Complete. Cortisol is made by the adrenal glands, not by the amygdala. " +
            mistakes +
            " wrong turns.";
          button("Build it again", pathway, $("again"));
        }
      },
      $("answers"),
    );
  });
  link("hpa", $("reference"));
}
Object.keys(sources).forEach((key) => link(key, $("sources")));
render();
