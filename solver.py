"""Exact strategy search for Elementle.

Rules (as played):
  * Symbol: Wordle-style per letter, case-insensitive. Green = right letter in
    the right position, yellow = letter appears elsewhere in the secret symbol,
    gray = not in it.
  * Atomic number: the secret is higher, lower, or equal.
  * Category: same category as the secret, or not (standard 10 categories).

A guess counts once; finding the secret on guess k costs k. The search itself
is in search.cpp (compiled with g++ on first run); this script supplies the
rules, builds the simple strategies and writes strategies.json:

  * optimal:  fewest guesses in the worst case, then lowest average. Any
              element may be guessed, even one already ruled out.
  * average:  lowest average with no worst-case limit (up to CAP guesses).
              Only written when it beats the optimal strategy's average.
  * hard:     same objective, but every guess must still be possible.
  * binary:   always guess the middle remaining candidate by atomic number.
  * tantalum: open with Ta, then play optimally.

It also records, for every opener, its worst case and average under the best
follow-up.

Usage: python solver.py
"""

import csv
import json
import subprocess
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).parent
CAP = 7  # depth limit for the best-average search; see README

ELEMENTS = list(csv.DictReader((HERE / "elements.csv").open(encoding="utf-8")))
N = len(ELEMENTS)
SYM = [e["symbol"] for e in ELEMENTS]
CAT = [e["category"] for e in ELEMENTS]


def feedback(g: int, s: int) -> str:
    """Feedback for guessing index g when the secret is index s.

    Format: "<colors>|<dir>|<cat>" where colors is one char per guessed letter
    (g green, y yellow, x gray), dir is u (secret higher), d (lower) or = and
    cat is 1 (same category) or 0. Mirrors feedback() in the HTML page.
    """
    gs, ss = SYM[g].lower(), SYM[s].lower()
    colors = ["x"] * len(gs)
    left = []
    for i, ch in enumerate(gs):
        if i < len(ss) and ss[i] == ch:
            colors[i] = "g"
        elif i < len(ss):
            left.append(ss[i])
    for i, ch in enumerate(gs):
        if colors[i] == "x" and ch in left:
            colors[i] = "y"
            left.remove(ch)
    d = "=" if g == s else ("u" if s > g else "d")
    return f"{''.join(colors)}|{d}|{int(CAT[g] == CAT[s])}"


FB = [[feedback(g, s) for s in range(N)] for g in range(N)]
# Per guess, feedback strings numbered 0.. for the C++ search (< 64 per row).
CODES = []
for g in range(N):
    ids: dict[str, int] = {}
    CODES.append([ids.setdefault(FB[g][s], len(ids)) for s in range(N)])
    assert len(ids) < 64


def run_search(hard: bool) -> dict:
    """Compile (if needed) and run search.cpp; returns its JSON with tree
    edges relabelled from codes to feedback strings and indexes made 1-based."""
    build = Path(tempfile.gettempdir()) / "elementle-search"
    src = HERE / "search.cpp"
    if not build.exists() or build.stat().st_mtime < src.stat().st_mtime:
        subprocess.run(["g++", "-O2", "-std=c++17", "-o", str(build), str(src)], check=True)
    stdin = f"{N}\n" + "\n".join(" ".join(map(str, row)) for row in CODES)
    stdin += f"\n{CAP} {SYM.index('Ta')} {int(hard)}\n"
    out = subprocess.run([str(build)], input=stdin, capture_output=True, text=True, check=True)
    data = json.loads(out.stdout)

    def relabel(node: dict) -> dict:
        g = node["g"]
        decode = {str(CODES[g][s]): FB[g][s] for s in range(N)}
        return {"g": g + 1, "k": {decode[c]: relabel(sub) for c, sub in node["k"].items()}}

    data["trees"] = {k: relabel(t) for k, t in data["trees"].items()}
    return data


def binary_tree(cands: list[int]) -> dict:
    """Guess the middle remaining candidate by atomic number."""
    g = cands[(len(cands) - 1) // 2]
    node = {"g": g + 1, "k": {}}
    groups: dict[str, list[int]] = {}
    for s in cands:
        if s != g:
            groups.setdefault(FB[g][s], []).append(s)
    for key, sub in groups.items():
        node["k"][key] = binary_tree(sub)
    return node


def depths(tree: dict, d: int = 1, out=None) -> dict:
    out = {} if out is None else out
    out[tree["g"]] = d
    for sub in tree["k"].values():
        depths(sub, d + 1, out)
    return out


def summarize(tree: dict) -> dict:
    ds = depths(tree)
    assert sorted(ds) == list(range(1, N + 1)), "tree must find every element"
    hist: dict[int, int] = {}
    for v in ds.values():
        hist[v] = hist.get(v, 0) + 1
    return {
        "worst": max(ds.values()),
        "average": round(sum(ds.values()) / N, 4),
        "histogram": {str(k): hist[k] for k in sorted(hist)},
    }


def main() -> None:
    t0 = time.time()
    normal = run_search(hard=False)
    print(f"search done ({time.time() - t0:.0f}s): optimal worst case {normal['W']}")
    hard = run_search(hard=True)
    print(f"hard-mode search done ({time.time() - t0:.0f}s): worst case {hard['W']}")

    trees = [
        ("optimal", "Optimal", normal["trees"]["minimax"]),
        ("average", "Best average", normal["trees"]["average"]),
        ("hard", "Hard mode", hard["trees"]["minimax"]),
        ("binary", "Binary search", binary_tree(list(range(N)))),
        ("tantalum", "Tantalum opener", normal["trees"]["tantalum"]),
    ]
    strategies = {}
    for key, label, tree in trees:
        strategies[key] = {"label": label, **summarize(tree), "tree": tree}
    if strategies["average"]["average"] >= strategies["optimal"]["average"]:
        del strategies["average"]  # no gain from allowing a deeper worst case
    for s in strategies.values():
        print(f"{s['label']:16} opens {SYM[s['tree']['g'] - 1]:>2}  worst {s['worst']}  "
              f"avg {s['average']:.3f}  {s['histogram']}")

    openers = []
    for o, h in zip(normal["openers"], hard["openers"]):
        g = o["g"]
        groups = {FB[g][s] for s in range(N)}
        largest = max(sum(1 for s in range(N) if FB[g][s] == k and s != g) for k in groups)
        openers.append({
            "z": g + 1,
            "symbol": SYM[g],
            "worst": o["worst"],
            "avg_at_worst": round(o["total_at_worst"] / N, 4),
            "avg_free": round(o["total_free"] / N, 4),
            "hard_worst": h["worst"],
            "hard_avg": round(h["total_at_worst"] / N, 4),
            "groups": len(groups),
            "largest": largest,
        })

    out = {"optimal_worst": normal["W"], "hard_worst": hard["W"], "cap": CAP,
           "strategies": strategies, "openers": openers}
    (HERE / "strategies.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"wrote strategies.json ({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
