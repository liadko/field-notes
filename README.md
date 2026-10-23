# Elementle

An element-guessing game in the style of Wordle, with an explorer for the periodic table and an exact solver for the best strategy. This is unrelated to the timetabler; it just lives here.

Open `elementle.html` in a browser. It is self-contained, with all data baked in, and has three modes:

- **Explore**: the periodic table with categories, properties and a fun fact for each element.
- **Play**: guess a random or chosen secret. Elements that are ruled out turn grey. The Hint button gives the optimal move while you stay on the optimal path.
- **Strategy**: replay any strategy against any secret, see how many guesses each element needs, and read the findings.

## Rules modelled

- **Symbol**: Wordle-style per letter. Green means the right letter in the right spot; yellow means the letter appears in the secret's symbol in the other spot.
- **Atomic number**: an arrow toward the secret.
- **Category**: green if it matches, using the standard 10 categories. Elements 104–112 count as transition metals, 113–116 as post-transition metals, Ts as a halogen and Og as a noble gas.

## Results

- The best possible worst case is **5 guesses**; no strategy guarantees 4.
- **Rhenium (Re)** is the best opener: worst case 5, average 3.390.
- Tantalum also guarantees 5 and averages 3.458, ranking 7th of 118 openers.
- Restricting guesses to elements that are still possible (hard mode) costs nothing for the best openers.
- The rule "guess whatever leaves the smallest worst-case group" matches the optimum.

## Rebuilding

```sh
curl -sS -o PeriodicTableJSON.json \
  https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json
python build_data.py PeriodicTableJSON.json   # -> elements.csv
python solver.py                               # -> strategies.json (needs g++; about 3 minutes)
python build_html.py                           # -> elementle.html
```

| File | What it does |
|---|---|
| `build_data.py` | Pulls element stats from Periodic-Table-JSON (CC BY-SA, from Wikipedia), assigns categories and adds the fun facts. |
| `solver.py` | Defines the game rules and the simple strategies. It runs the C++ search and writes `strategies.json`. |
| `search.cpp` | Runs the exact search over decision trees, memoizing candidate sets and pruning with branch-and-bound. |
| `template.html`, `findings.html` | The page and the findings text; `build_html.py` fills them in. |
