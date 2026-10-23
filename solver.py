"""Exact strategy search for Elementle.

Rules (as played):
  * Symbol: Wordle-style per letter, case-insensitive. Green = right letter in
    the right position, yellow = letter appears elsewhere in the secret symbol,
    gray = not in it.
  * Atomic number: the secret is higher, lower, or equal.
  * Category: same category as the secret, or not (standard 10 categories).

Any of the 118 elements may be guessed at any time (not only ones that are
still possible). A guess counts once; finding the secret on guess k costs k.

Strategies written to strategies.json:
  * minimax:  fewest guesses in the worst case, then lowest average.
  * average:  lowest average number of guesses (worst case may be higher).
  * binary:   always guess the middle remaining candidate by atomic number.
  * tantalum: open with Ta, then play like minimax.

Also writes, for every possible opener, its worst case and average under
optimal follow-up play (both objectives).

Usage: python solver.py
"""

import csv
import json
import sys
import time
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).parent
INF = float("inf")

ELEMENTS = list(csv.DictReader((HERE / "elements.csv").open(encoding="utf-8")))
N = len(ELEMENTS)
SYM = [e["symbol"] for e in ELEMENTS]
CAT = [e["category"] for e in ELEMENTS]
ALL = (1 << N) - 1


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
SOLVED = [FB[g][g] for g in range(N)]


def members(mask: int) -> list[int]:
    out = []
    while mask:
        low = mask & -mask
        out.append(low.bit_length() - 1)
        mask ^= low
    return out


@lru_cache(maxsize=200_000)
def partition(mask: int, g: int) -> tuple[int, ...]:
    """Masks of the unsolved feedback classes of `mask` after guessing g,
    largest first. The solved class (g itself) is dropped."""
    row = FB[g]
    classes: dict[str, int] = {}
    for s in members(mask):
        if s != g:
            k = row[s]
            classes[k] = classes.get(k, 0) | (1 << s)
    return tuple(sorted(classes.values(), key=lambda m: -m.bit_count()))


def useful_guesses(mask: int) -> list[tuple[int, tuple[int, ...]]]:
    """Guesses that make progress, best-looking first (small largest class,
    candidates preferred)."""
    n = mask.bit_count()
    out = []
    for g in range(N):
        parts = partition(mask, g)
        inside = (mask >> g) & 1
        if not inside and len(parts) == 1:
            continue  # learns nothing
        if inside and n == 1:
            return [(g, ())]
        out.append((g, parts))
    out.sort(key=lambda gp: (gp[1][0].bit_count() if gp[1] else 0, -((mask >> gp[0]) & 1), -len(gp[1])))
    return out


@lru_cache(maxsize=None)
def solvable(mask: int, depth: int) -> bool:
    """Can every secret in `mask` be found within `depth` more guesses?"""
    n = mask.bit_count()
    if n == 0:
        return True
    if depth <= 0:
        return False
    if n == 1:
        return True
    if depth == 1:
        return False
    for g, parts in useful_guesses(mask):
        if all(solvable(p, depth - 1) for p in parts):
            return True
    return False


@lru_cache(maxsize=None)
def worst(mask: int) -> int:
    d = 1
    while not solvable(mask, d):
        d += 1
    return d


def lower_bound(mask: int) -> int:
    n = mask.bit_count()
    return 1 if n == 1 else 2 * n - 1


@lru_cache(maxsize=None)
def best_total(mask: int, depth: int) -> tuple[float, int]:
    """(minimal sum of guess counts over secrets in mask, best guess) using at
    most `depth` more guesses for every secret."""
    n = mask.bit_count()
    if n == 1:
        return 1, members(mask)[0]
    if not solvable(mask, depth):
        return INF, -1
    best, best_g = INF, -1
    for g, parts in useful_guesses(mask):
        base = n  # every secret spends this guess
        bound = base + sum(lower_bound(p) for p in parts)
        if bound >= best:
            continue
        total = base
        for p in parts:
            total += best_total(p, depth - 1)[0]
            if total >= best:
                break
        if total < best:
            best, best_g = total, g
    return best, best_g


def opener_total(g: int, depth: int) -> float:
    parts = partition(ALL, g)
    return N + sum(best_total(p, depth - 1)[0] for p in parts)


def build_tree(mask: int, choose, depth: int = 0) -> dict:
    """Decision tree: {"g": atomic number, "k": {feedback: subtree}}.
    choose(mask, depth) picks the guess with `depth` guesses left."""
    g = choose(mask, depth)
    node = {"g": g + 1, "k": {}}
    for p in partition(mask, g):
        key = FB[g][members(p)[0]]
        node["k"][key] = build_tree(p, choose, depth - 1)
    return node


def optimal_choice(mask: int, depth: int) -> int:
    return best_total(mask, depth)[1]


def binary_choice(mask: int, depth: int) -> int:
    m = members(mask)
    return m[(len(m) - 1) // 2]


def depths(tree: dict, d: int = 1, out=None) -> dict:
    out = {} if out is None else out
    out[tree["g"]] = d
    for sub in tree["k"].values():
        depths(sub, d + 1, out)
    return out


def summarize(tree: dict) -> dict:
    ds = depths(tree)
    hist: dict[int, int] = {}
    for v in ds.values():
        hist[v] = hist.get(v, 0) + 1
    assert len(ds) == N, "tree must find every element"
    return {
        "worst": max(ds.values()),
        "average": round(sum(ds.values()) / N, 4),
        "histogram": {str(k): hist[k] for k in sorted(hist)},
    }


def main() -> None:
    sys.setrecursionlimit(10000)
    t0 = time.time()
    W = worst(ALL)
    print(f"optimal worst case: {W} guesses ({time.time() - t0:.1f}s)")

    openers = []
    for g in range(N):
        parts = partition(ALL, g)
        w = 1 + max(worst(p) for p in parts)
        openers.append({"z": g + 1, "symbol": SYM[g], "worst": w, "classes": len(parts) + 1,
                        "largest": parts[0].bit_count()})
    print(f"opener worst cases done ({time.time() - t0:.1f}s)")

    # Minimax: lowest average among trees with worst case W.
    # Average: lowest average with no practical depth limit.
    FREE = W + 3
    for o in openers:
        g = o["z"] - 1
        o["avg_free"] = round(opener_total(g, FREE) / N, 4)
        o["avg_at_worst"] = round(opener_total(g, o["worst"]) / N, 4)
        print(f"  {o['symbol']:>2} worst {o['worst']} avg {o['avg_free']:.3f} "
              f"(at worst-cap {o['avg_at_worst']:.3f})  {time.time() - t0:.0f}s", flush=True)

    # Minimax: lowest average among trees that never exceed W guesses.
    minimax_tree = build_tree(ALL, optimal_choice, W)
    average_tree = build_tree(ALL, optimal_choice, FREE)
    binary_tree = build_tree(ALL, binary_choice)
    ta = SYM.index("Ta")
    ta_worst = openers[ta]["worst"]
    tantalum_tree = {"g": ta + 1, "k": {}}
    for p in partition(ALL, ta):
        tantalum_tree["k"][FB[ta][members(p)[0]]] = build_tree(p, optimal_choice, ta_worst - 1)

    strategies = {}
    for key, label, tree in [
        ("minimax", "Best worst case", minimax_tree),
        ("average", "Best average", average_tree),
        ("binary", "Binary search", binary_tree),
        ("tantalum", "Tantalum opener", tantalum_tree),
    ]:
        strategies[key] = {"label": label, **summarize(tree), "tree": tree}
        s = strategies[key]
        print(f"{label:16} opener {SYM[tree['g'] - 1]:>2}  worst {s['worst']}  avg {s['average']}  {s['histogram']}")

    out = {"strategies": strategies, "openers": openers, "optimal_worst": W}
    (HERE / "strategies.json").write_text(json.dumps(out, separators=(",", ":")), encoding="utf-8")
    print(f"wrote strategies.json ({time.time() - t0:.1f}s)")


if __name__ == "__main__":
    main()
