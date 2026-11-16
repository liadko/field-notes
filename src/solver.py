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

  * optimal:  fewest guesses in the worst case, then lowest average.
  * average:  lowest average with no worst-case limit (up to CAP guesses).
              Only written when it beats the optimal strategy's average.
  * greedy:   a rule of thumb: guess whatever leaves the smallest worst-case
              group, preferring elements that are still possible.
  * binary:   always guess the middle remaining candidate by atomic number.
  * tantalum: open with Ta, then play optimally.

The search runs twice: once allowing any guess and once in hard mode (every
guess must still be possible). When hard mode is just as good, its trees are
used, so every guess shown could be the answer.

It also records, for every opener, its worst case and average under the best
follow-up.

Usage: python src/solver.py
"""

import csv
import json
import subprocess
import tempfile
import time
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent
CAP = 6  # depth limit for the best-average search; cap 7 gives identical totals for every opener

ELEMENTS = list(csv.DictReader((ROOT / "data" / "elements.csv").open(encoding="utf-8")))
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
    colors = ["g" if i < len(ss) and ss[i] == ch else "x" for i, ch in enumerate(gs)]
    # Secret letters not matched in place, including any past the guess's
    # length: guessing C against Sc gives a yellow C.
    left = [ch for i, ch in enumerate(ss) if not (i < len(gs) and gs[i] == ch)]
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


def greedy_tree(cands: list[int]) -> dict:
    """Guess whatever leaves the smallest worst-case group; break ties by the
    smaller expected group, then prefer a guess that is still possible."""
    if len(cands) == 1:
        return {"g": cands[0] + 1, "k": {}}
    inside = set(cands)
    best = None
    for g in range(N):
        groups: dict[str, list[int]] = {}
        for s in cands:
            if s != g:
                groups.setdefault(FB[g][s], []).append(s)
        if g not in inside and len(groups) < 2:
            continue
        sizes = [len(v) for v in groups.values()]
        score = (max(sizes, default=0), sum(x * x for x in sizes), g not in inside)
        if best is None or score < best[0]:
            best = (score, g, groups)
    _, g, groups = best
    return {"g": g + 1, "k": {key: greedy_tree(sub) for key, sub in groups.items()}}


def depths(tree: dict) -> dict[int, int]:
    """Guesses the tree needs for each secret (1-based), found by replaying
    it. A tree may guess an element that is already ruled out, so the same
    element can appear at several nodes; only the replay gives its depth."""
    out = {}
    for s in range(N):
        node, d = tree, 1
        while node["g"] != s + 1:
            node, d = node["k"][FB[node["g"] - 1][s]], d + 1
        out[s + 1] = d
    return out


def only_possible(tree: dict, cands: list[int] | None = None) -> bool:
    """True if every guess in the tree is still possible when it is made."""
    cands = list(range(N)) if cands is None else cands
    g = tree["g"] - 1
    if g not in cands:
        return False
    return all(only_possible(sub, [s for s in cands if s != g and FB[g][s] == key])
               for key, sub in tree["k"].items())


def summarize(tree: dict) -> dict:
    ds = depths(tree)
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

    def prefer_hard(key: str) -> dict:
        """The hard-mode tree when it scores the same, so every guess shown
        could be the answer."""
        h, n = hard["trees"][key], normal["trees"][key]
        sh, sn = summarize(h), summarize(n)
        return h if (sh["worst"], sh["average"]) == (sn["worst"], sn["average"]) else n

    trees = [
        ("optimal", "Optimal", prefer_hard("minimax")),
        ("average", "Best average", normal["trees"]["average"]),
        ("greedy", "Rule of thumb", greedy_tree(list(range(N)))),
        ("binary", "Binary search", binary_tree(list(range(N)))),
        ("tantalum", "Tantalum opener", prefer_hard("tantalum")),
    ]
    strategies = {}
    for key, label, tree in trees:
        strategies[key] = {"label": label, **summarize(tree), "tree": tree}
        strategies[key]["only_possible"] = only_possible(tree)
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
    (ROOT / "data" / "strategies.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"wrote strategies.json ({time.time() - t0:.0f}s)")


if __name__ == "__main__":
    main()
