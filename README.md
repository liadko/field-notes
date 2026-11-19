# Elementle

An element-guessing game in the style of Wordle, with an explorer for the periodic table and an exact solver for the best strategy.

Open **`index.html`** in a browser and choose a subject. No server is required on the computer. The pages under `web/` also forward to the runnable versions, so older bookmarks keep working.

To rebuild everything, run `python src/build_all.py`. The finished site is in `dist/`, including its own `index.html`; deploy or serve that directory to use it from a phone. Raw templates are in `web/templates/*.html.in` and contain placeholders until built.

The **Geography** link opens `dist/geography.html`, a companion atlas with flat and globe views, country-finding and naming quizzes, capitals, land-border routes, route study, a hot-and-cold game, and population top tens. Flags also appear in country answers and route results.

The **Israel** link opens `dist/israel.html`, an English activity library with Hebrew activities. City activities offer population-ranked tiers. In regional activities, each tier ranks cities within the selected region and the menu shows the total number of mapped cities available. The atlas uses simplified Ministry of the Interior jurisdiction boundaries, and the placement quiz scores taps inside the correct boundary. Refresh the bundled boundary data with `python src/update_israel_boundaries.py` when needed. Other activities cover prime ministers, election turning points, and official 2013 party seats. The prime-minister timeline and quiz reveal include portraits and linked facts. Historical coverage ends in 2022. A road-study layer shows available geometry for routes 1, 2, 4, 6, 40 and 90 from the public ROUTES ArcGIS layer linked in the page; coverage is partial. Road routing, full party-seat histories and conflict-event narratives are still future work. Capital points and Israel locations come from GeoNames via geonamescache (CC BY). Rebuild with `python src/build_israel.py`.

The **Brain** link opens `dist/brain.html`, an offline module with 12 introductory landmarks, surface and internal schematic views, English/Hebrew region names, region finding, clue and function quizzes, misconception checks, and a stress-hormone pathway game. Sources are linked by topic. The internal diagram separates structures for clarity and is not a true anatomical section. Rebuild with `python src/build_brain.py`. Exploration history is saved locally when browser storage is available.

**Border routes** in Geography and **City border routes** in Israel share the same rules. Choose a place on the map or enter its name. ✅ marks any shortest adjacent next step, 🟢 marks a later step on a shortest route, 🟠 means one extra crossing, and 🔴 means two or more extra crossings or no connection. Only a neighbor advances the route. The last crossing is automatic and shortest alternatives can be previewed on the map. In Israel, city tiers restrict the start and goal while any mapped municipality may be an intermediate step. Edges require at least 10 meters of matching boundary segments in the source data, so corner touches and unmatched areas do not create playable links.

**Publishing:** `.github/workflows/pages.yml` deploys `dist/` to GitHub Pages on every push to `main`, so rebuild with `python src/build_all.py` and commit `dist/` before pushing. In the repo's Settings > Pages, set Source to "GitHub Actions" once.

For a quick local server, run `python -m http.server 8000 --directory dist` from the project root. On the computer, visit `http://localhost:8000/`. On a phone on the same network, use the computer's local IP address in place of `localhost`; the computer's firewall must allow the connection. A public static host can serve the same files without Python.

Geography uses Natural Earth shapes from [world-atlas](https://github.com/topojson/world-atlas), country details and border lists from [mledoze/countries](https://github.com/mledoze/countries), and the latest available population figures in [datasets/population](https://github.com/datasets/population) (World Bank). Figures can be from different years. The simplified map does not show every small island. The hot-and-cold distance uses country reference coordinates, not nearest borders. Route calculations follow the dataset's listed land borders and do not include ferries.

The Elements module has three modes:

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
python src/build_geography.py                      # -> dist/geography.html
```

| Folder | Contents |
|---|---|
| `src/` | The code. `build_data.py` pulls element stats from Periodic-Table-JSON (CC BY-SA, from Wikipedia) and adds categories, discovery years and fun facts. `groups.py` holds the category notes and collections. `solver.py` defines the rules and simple strategies and runs the exact search in `search.cpp`. `build_html.py` assembles the page. |
| `data/` | Generated data: `elements.csv` and `strategies.json`. |
| `web/` | Browser entry pages, JS sources, `templates/*.html.in`, and findings text in `findings.html`. |
| `dist/` | The built launch page and self-contained modules. |
