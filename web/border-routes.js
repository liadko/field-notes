function borderGraph(entries) {
  const graph = new Map(entries.map(([id]) => [id, new Set()]));
  for (const [id, neighbors] of entries) {
    for (const neighbor of neighbors) {
      if (!graph.has(neighbor) || neighbor === id) continue;
      graph.get(id).add(neighbor);
      graph.get(neighbor).add(id);
    }
  }
  return graph;
}

function borderDistances(graph, origin) {
  const distances = new Map([[origin, 0]]);
  const queue = [origin];
  for (const current of queue) {
    for (const next of graph.get(current) || []) {
      if (distances.has(next)) continue;
      distances.set(next, distances.get(current) + 1);
      queue.push(next);
    }
  }
  return distances;
}

function borderRound(graph, start, goal) {
  const distance = borderDistances(graph, goal);
  const choices = (node) =>
    [...graph.get(node)].filter(
      (next) => distance.get(next) === distance.get(node) - 1,
    );
  const path = [start];
  const turns = [];
  let complete = false;

  function arriveIfAdjacent() {
    if (path.at(-1) !== goal && graph.get(path.at(-1)).has(goal))
      path.push(goal);
    complete = path.at(-1) === goal;
  }
  arriveIfAdjacent();

  function guess(node) {
    if (complete || !graph.has(node) || node === path.at(-1)) return null;
    const current = path.at(-1);
    const fromHere = borderDistances(graph, current).get(node);
    const remaining = distance.get(node);
    const extra =
      (fromHere ?? Infinity) + (remaining ?? Infinity) - distance.get(current);
    const moved = fromHere === 1;
    const result = {
      node,
      moved,
      extra,
      kind:
        extra === 0
          ? moved
            ? "optimal"
            : "later"
          : extra === 1
            ? "near"
            : "far",
    };
    turns.push(result);
    if (moved) {
      path.push(node);
      arriveIfAdjacent();
    }
    return result;
  }

  function shortestRoutes(limit = 8) {
    const routes = [];
    const counts = new Map([[goal, 1]]);
    function count(node) {
      if (!counts.has(node))
        counts.set(
          node,
          choices(node).reduce((sum, next) => sum + count(next), 0),
        );
      return counts.get(node);
    }
    function collect(nodes) {
      if (routes.length >= limit) return;
      const node = nodes.at(-1);
      if (node === goal) routes.push(nodes);
      else for (const next of choices(node)) collect([...nodes, next]);
    }
    collect([start]);
    return { routes, total: count(start) };
  }
  return {
    start,
    goal,
    path,
    turns,
    guess,
    shortestRoutes,
    distance,
    get complete() {
      return complete;
    },
  };
}

const borderSymbols = { optimal: "✅", later: "🟢", near: "🟠", far: "🔴" };
const borderCopy = {
  en: {
    optimal: "Shortest next step",
    later: "On a shortest route, but later",
    near: "One crossing off",
    far: "Two or more crossings off",
    noMove: "No move: it doesn’t border your current stop.",
    stop: "You moved to",
    arrived: "Arrived",
    routes: "Shortest routes",
    crossings: "crossings",
    more: "Show more routes",
    yourRoute: "Your route",
  },
  he: {
    optimal: "הצעד הבא במסלול קצר ביותר",
    later: "במסלול קצר ביותר, אבל בהמשך",
    near: "מעבר גבול אחד נוסף",
    far: "שני מעברי גבול נוספים או יותר",
    noMove: "נשארתם במקום: אין גבול משותף עם התחנה הנוכחית.",
    stop: "התקדמתם אל",
    arrived: "הגעתם ליעד",
    routes: "המסלולים הקצרים ביותר",
    crossings: "מעברי גבול",
    more: "עוד מסלולים",
    yourRoute: "המסלול שלכם",
  },
};

function borderFeedback(round, result, nameOf, language) {
  const copy = borderCopy[language];
  const text =
    borderSymbols[result.kind] +
    " " +
    nameOf(result.node) +
    " · " +
    copy[result.kind];
  return (
    text +
    ". " +
    (round.complete
      ? copy.arrived + "."
      : result.moved
        ? copy.stop + " " + nameOf(result.node) + "."
        : copy.noMove)
  );
}

function renderBorderMapStatus(panel, round, nameOf, language) {
  panel.hidden = !round;
  const latest = round?.turns.at(-1);
  if (!latest) {
    panel.textContent = round ? nameOf(round.start) : "";
    return;
  }
  const copy = borderCopy[language];
  const symbols = round.turns
    .slice(-6)
    .map((turn) => borderSymbols[turn.kind])
    .join("");
  panel.textContent =
    symbols +
    "  ·  " +
    nameOf(latest.node) +
    "  ·  " +
    (round.complete ? copy.arrived : copy[latest.kind]);
  animateFeedback(
    panel,
    { optimal: "right", later: "right", near: "hint", far: "wrong" }[
      latest.kind
    ],
  );
}

function renderBorderRoute(panel, round, nameOf, language, preview, imageOf) {
  panel.replaceChildren();
  if (!round) return;
  const copy = borderCopy[language];
  function element(tag, text, parent, className = "") {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    parent.append(node);
    return node;
  }
  const trail = element("ol", "", panel, "journey-trail");
  trail.setAttribute("aria-label", copy.yourRoute);
  round.path.forEach((node, index) => {
    const isGoal = round.complete && node === round.goal;
    const stop = element(
      "li",
      nameOf(node),
      trail,
      "journey-stop" + (isGoal ? " journey-finish" : ""),
    );
    const image = imageOf?.(node);
    if (image) stop.prepend(image);
    if (round.complete)
      stop.style.animationDelay = (round.path.length - 1 - index) * 75 + "ms";
  });
  if (round.turns.length) {
    const strip = element("ol", "", panel, "journey-guesses");
    for (const [index, turn] of round.turns.entries()) {
      const item = element("li", "", strip);
      const token = element(
        "span",
        borderSymbols[turn.kind],
        item,
        "journey-token" +
          (index === round.turns.length - 1 ? " journey-pop" : ""),
      );
      token.title = nameOf(turn.node) + " · " + copy[turn.kind];
      token.setAttribute("role", "img");
      token.setAttribute("aria-label", token.title);
    }
    const key = element("p", "", panel, "journey-key");
    key.textContent = Object.entries(borderSymbols)
      .map(([kind, symbol]) => symbol + " " + copy[kind])
      .join("  ·  ");
  }
  if (!round.complete) return;
  const solutions = element("section", "", panel, "journey-solutions");
  const distance = round.distance.get(round.start);
  element(
    "p",
    copy.yourRoute + " · " + (round.path.length - 1) + " " + copy.crossings,
    solutions,
    "journey-key",
  );
  element(
    "h3",
    copy.routes + " · " + distance + " " + copy.crossings,
    solutions,
  );
  const list = element("ol", "", solutions);
  let limit = 8;
  function show() {
    const { routes, total } = round.shortestRoutes(limit);
    list.replaceChildren();
    routes.forEach((path) => {
      const row = element("li", "", list);
      const label = path.map(nameOf).join(language === "he" ? " ← " : " → ");
      if (!preview) row.textContent = label;
      else {
        const option = element("button", label, row, "journey-alternative");
        option.type = "button";
        option.setAttribute("aria-pressed", "false");
        option.onclick = () => {
          const wasSelected = option.getAttribute("aria-pressed") === "true";
          list
            .querySelectorAll("button")
            .forEach((button) => button.setAttribute("aria-pressed", "false"));
          option.setAttribute("aria-pressed", String(!wasSelected));
          preview(wasSelected ? null : path);
        };
      }
    });
    solutions.querySelector(".journey-more")?.remove();
    if (total > routes.length) {
      const more = element(
        "button",
        copy.more + " (" + routes.length + "/" + total + ")",
        solutions,
        "journey-more",
      );
      more.onclick = () => {
        limit += 8;
        show();
        (
          solutions.querySelector(".journey-more") ||
          list.lastElementChild?.firstElementChild
        )?.focus();
      };
    }
  }
  show();
}
