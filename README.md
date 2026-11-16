# Elementle

An element-guessing game in the style of Wordle, with an explorer for the periodic table and an exact solver for the best strategy.

Open `dist/elementle.html` in a browser. It is self-contained, with all data baked in, and has three modes:

- **Explore**: the periodic table with properties, discovery year and a fun fact for each element. Click a category for its history, first and latest additions, where its edges are and how to remember it. Click one of the 18 collections, such as one-letter symbols, elements named after places or Seaborg's ten, to highlight it.
- **Play**: guess a random or chosen secret. Elements that are ruled out turn grey. The Hint button gives the optimal move while you stay on the optimal path.
- **Strategy**: walk each strategy's decision tree answer by answer, click any element to see how it gets found, and read the findings.

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
python src/build_data.py PeriodicTableJSON.json   # -> data/elements.csv
python src/solver.py                               # -> data/strategies.json (needs g++; about 3 minutes)
python src/build_html.py                           # -> dist/elementle.html
```

| Folder | Contents |
|---|---|
| `src/` | The code. `build_data.py` pulls element stats from Periodic-Table-JSON (CC BY-SA, from Wikipedia) and adds categories, discovery years and fun facts. `groups.py` holds the category notes and collections. `solver.py` defines the rules and simple strategies and runs the exact search in `search.cpp`. `build_html.py` assembles the page. |
| `data/` | Generated data: `elements.csv` and `strategies.json`. |
| `web/` | Page sources: `template.html` and the findings text in `findings.html`. |
| `dist/` | The built, self-contained page, `elementle.html`. |
