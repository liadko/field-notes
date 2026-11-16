# Elementle

A periodic-table explorer and exact strategy study for the daily element-guessing game Elementle. It is one self-contained page, `elementle.html`, built from Python scripts. See `README.md` for the modes, results and rebuild steps.

## Layout

- `src/build_data.py`: reads a Periodic-Table-JSON dump, which it does not download itself, and writes `data/elements.csv` with the categories, discovery years and fun facts, which are hand-written here.
- `src/groups.py`: category stories (history, edges, how to remember) and the "collections". Members are atomic numbers.
- `src/solver.py`: the game rules (`feedback()`), the simple strategies (binary, rule of thumb), summaries and `data/strategies.json`. It compiles and runs `src/search.cpp`, the exact branch-and-bound search, which takes about 3 minutes.
- `web/template.html` and `web/findings.html`: the page and the findings text. `src/build_html.py` bakes in the CSV, `data/strategies.json` and `groups.py` to produce `dist/elementle.html`. Commit the built page too.
- Run every script from the repo root, for example `python src/build_html.py`.

## Rules as modelled

- **Symbol:** Wordle-style per letter, case-insensitive. A secret letter past the guess's length still counts for yellow, so guessing C against Sc gives a yellow C.
- **Atomic number:** an arrow toward the secret.
- **Family:** the standard 10 categories. 104–112 are transition metals, 113–116 post-transition metals, Ts a halogen and Og a noble gas. The real game's families are unconfirmed; if they differ, rerun the solver.
- `feedback()` in `src/solver.py` and the JS `feedback()` in `web/template.html` must stay identical. After changing either, compare them on all 118×118 pairs.

## Results so far

- The best possible worst case is 5. Rhenium is the best opener on both worst case and average (3.390). Tantalum guarantees 5 and averages 3.458, ranking 7th.
- The fewest secrets needing a 5th guess is 9, with niobium or rhodium as the opener; rhenium gets 10. The user isn't interested in that objective.
- Hard mode (only guess possible elements) costs nothing for the best openers. The minimax rule of thumb ties the optimum.
- A depth cap of 7 gives the same totals as 6 for every opener, so `CAP = 6`.

## Page and design

- One HTML file with no build tools or framework: vanilla JS and inline data. Fonts are Familjen Grotesk, Figtree and JetBrains Mono.
- Dark only, with calm category colors and sharp 2–3px corners. The empty space above the transition metals ("the bay") is the live readout for every mode.
- **Explore:** hover to read, click to pin, double-click or a blank click to unpin. Clicking a category or collection fills the details area; a blank click keeps the group.
- **Play:** a random or chosen secret. The hint follows the optimal tree while you stay on it.
- **Strategy:** a walkable decision tree with a trail of guesses. Clicking an element jumps to the end of its path, where only the found element stays lit.
- It is published as a claude.ai artifact (https://claude.ai/artifact/85upUDkxFQCMDcmXcLKc3Q), which the page builds for: no `<!doctype>` or `<html>`/`<body>` tags, and colors defined as tokens.

## Checking changes

- Run `python src/build_html.py`, then load `dist/elementle.html` in headless Chromium (Playwright) and check for page errors. Click through the changed flows and check that a 400px-wide page doesn't scroll sideways.
