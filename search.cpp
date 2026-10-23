// Exact Elementle search core, called by solver.py.
//
// Input (stdin): N, then an N x N table of feedback codes (code[g][s] is the
// feedback for guessing g when the secret is s, as a small integer < 64;
// equal codes mean equal feedback), then the depth cap for the average
// objective, the index of the tantalum opener and 1 for hard mode (only
// guess elements that are still possible) or 0.
//
// Output (stdout): JSON with the optimal worst case, per-opener results and
// decision trees whose edges are labelled by feedback code.

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

typedef unsigned __int128 Mask;
static const int INF = 1 << 29;

static int N;
static int CODE[128][128];
static bool HARD = false;  // only guesses that are still possible

static inline int popcount(Mask m) {
    return __builtin_popcountll((uint64_t)m) + __builtin_popcountll((uint64_t)(m >> 64));
}
static inline int lowest(Mask m) {
    uint64_t lo = (uint64_t)m;
    return lo ? __builtin_ctzll(lo) : 64 + __builtin_ctzll((uint64_t)(m >> 64));
}
static inline bool has(Mask m, int i) { return (m >> i) & 1; }
static inline Mask bit(int i) { return (Mask)1 << i; }

struct MaskHash {
    size_t operator()(const Mask& m) const {
        uint64_t a = (uint64_t)m, b = (uint64_t)(m >> 64);
        return std::hash<uint64_t>()(a * 0x9E3779B97F4A7C15ULL ^ (b + 0x632BE59BD9B4E019ULL + (a << 6)));
    }
};
struct KeyHash {
    size_t operator()(const std::pair<Mask, int>& k) const { return MaskHash()(k.first) * 31 + k.second; }
};

// Unsolved feedback classes of `mask` after guessing g, largest first.
static void partition(Mask mask, int g, std::vector<Mask>& out) {
    Mask cls[64] = {0};
    uint64_t used = 0;
    for (Mask m = mask; m; m &= m - 1) {
        int s = lowest(m);
        if (s == g) continue;
        int c = CODE[g][s];
        cls[c] |= bit(s);
        used |= 1ULL << c;
    }
    out.clear();
    for (; used; used &= used - 1) out.push_back(cls[__builtin_ctzll(used)]);
    std::sort(out.begin(), out.end(), [](const Mask& a, const Mask& b) {
        int pa = popcount(a), pb = popcount(b);
        return pa != pb ? pa > pb : a < b;
    });
}

struct Guess {
    int g;
    bool inside;
    std::vector<Mask> parts;
};

// Guesses that make progress, best-looking first; guesses that split the
// mask the same way as an earlier (preferred) one are dropped.
static std::vector<Guess> useful(Mask mask) {
    std::vector<Guess> out;
    std::vector<Mask> parts;
    int n = popcount(mask);
    for (int g = 0; g < N; g++) {
        bool inside = has(mask, g);
        if (HARD && !inside) continue;
        partition(mask, g, parts);
        if (!inside && parts.size() == 1) continue;
        if (inside && n == 1) return {Guess{g, true, {}}};
        out.push_back(Guess{g, inside, parts});
    }
    std::stable_sort(out.begin(), out.end(), [](const Guess& a, const Guess& b) {
        int la = a.parts.empty() ? 0 : popcount(a.parts[0]);
        int lb = b.parts.empty() ? 0 : popcount(b.parts[0]);
        if (la != lb) return la < lb;
        if (a.inside != b.inside) return a.inside;
        return a.parts.size() > b.parts.size();
    });
    std::vector<Guess> unique;
    std::unordered_set<size_t> seen;
    for (auto& gu : out) {
        size_t h = gu.parts.size();
        for (auto& p : gu.parts) h = h * 1000003 ^ MaskHash()(p);
        if (seen.insert(h).second) unique.push_back(std::move(gu));
    }
    return unique;
}

static std::unordered_map<std::pair<Mask, int>, bool, KeyHash> solvable_memo;
static bool solvable(Mask mask, int depth) {
    int n = popcount(mask);
    if (n == 0) return true;
    if (depth <= 0) return false;
    if (n == 1) return true;
    if (depth == 1) return false;
    auto key = std::make_pair(mask, depth);
    auto it = solvable_memo.find(key);
    if (it != solvable_memo.end()) return it->second;
    bool ok = false;
    for (auto& gu : useful(mask)) {
        bool all = true;
        for (auto& p : gu.parts)
            if (!solvable(p, depth - 1)) { all = false; break; }
        if (all) { ok = true; break; }
    }
    solvable_memo[key] = ok;
    return ok;
}

static std::unordered_map<Mask, int, MaskHash> worst_memo;
static int worst(Mask mask) {
    auto it = worst_memo.find(mask);
    if (it != worst_memo.end()) return it->second;
    int d = 1;
    while (!solvable(mask, d)) d++;
    return worst_memo[mask] = d;
}

static int lower_bound_cheap(Mask m) {
    int n = popcount(m);
    return n == 1 ? 1 : 2 * n - 1;
}

// At most one secret is found on the next guess, at most K on the one after,
// K*K after that, ..., where K is the most feedback groups one guess makes.
static int tight_bound(Mask mask, const std::vector<Guess>& gs) {
    int n = popcount(mask), k = 1;
    for (auto& gu : gs) k = std::max(k, (int)gu.parts.size() + (gu.inside ? 1 : 0));
    long total = 0, left = n, level = 1, width = 1;
    while (left > 0) {
        long take = std::min(left, width);
        total += take * level;
        left -= take;
        level++;
        width = level == 2 ? k : std::min(width * k, 1L << 30);
    }
    return (int)total;
}

struct Best { int total, g; };
static std::unordered_map<std::pair<Mask, int>, Best, KeyHash> best_memo;
static Best best_total(Mask mask, int depth) {
    int n = popcount(mask);
    if (n == 1) return {1, lowest(mask)};
    auto key = std::make_pair(mask, depth);
    auto it = best_memo.find(key);
    if (it != best_memo.end()) return it->second;
    Best res{INF, -1};
    if (solvable(mask, depth)) {
        auto gs = useful(mask);
        int floor = tight_bound(mask, gs);
        for (auto& gu : gs) {
            int bound = n;
            for (auto& p : gu.parts) bound += lower_bound_cheap(p);
            if (bound >= res.total) continue;
            int total = n;
            for (auto& p : gu.parts) {
                total += best_total(p, depth - 1).total;
                if (total >= res.total) break;
            }
            if (total < res.total) {
                res = {total, gu.g};
                if (total <= floor) break;
            }
        }
    }
    best_memo[key] = res;
    return res;
}

static std::string tree_json(Mask mask, int depth, int forced = -1) {
    int g = forced >= 0 ? forced : best_total(mask, depth).g;
    std::vector<Mask> parts;
    partition(mask, g, parts);
    std::string s = "{\"g\":" + std::to_string(g) + ",\"k\":{";
    bool first = true;
    for (auto& p : parts) {
        if (!first) s += ",";
        first = false;
        s += "\"" + std::to_string(CODE[g][lowest(p)]) + "\":" + tree_json(p, depth - 1);
    }
    return s + "}}";
}

int main() {
    int cap, ta, hard;
    if (scanf("%d", &N) != 1) return 1;
    for (int g = 0; g < N; g++)
        for (int s = 0; s < N; s++)
            if (scanf("%d", &CODE[g][s]) != 1) return 1;
    if (scanf("%d %d %d", &cap, &ta, &hard) != 3) return 1;
    HARD = hard;

    Mask all = 0;
    for (int i = 0; i < N; i++) all |= bit(i);
    int W = worst(all);
    fprintf(stderr, "optimal worst case: %d\n", W);

    std::vector<std::vector<Mask>> parts(N);
    std::vector<int> ow(N), tw(N), tf(N);
    for (int g = 0; g < N; g++) {
        partition(all, g, parts[g]);
        ow[g] = 1;
        for (auto& p : parts[g]) ow[g] = std::max(ow[g], 1 + worst(p));
    }
    fprintf(stderr, "opener worst cases done\n");
    for (int g = 0; g < N; g++) {
        tw[g] = tf[g] = N;
        for (auto& p : parts[g]) {
            tw[g] += best_total(p, ow[g] - 1).total;
            tf[g] += best_total(p, cap - 1).total;
        }
        fprintf(stderr, "opener %d: worst %d, total %d (capped at its worst), %d (cap %d)\n", g, ow[g], tw[g], tf[g], cap);
    }

    int bestW = -1, bestA = -1;
    for (int g = 0; g < N; g++) {
        if (ow[g] == W && (bestW < 0 || tw[g] < tw[bestW])) bestW = g;
        if (bestA < 0 || tf[g] < tf[bestA]) bestA = g;
    }

    printf("{\"W\":%d,\"openers\":[", W);
    for (int g = 0; g < N; g++)
        printf("%s{\"g\":%d,\"worst\":%d,\"total_at_worst\":%d,\"total_free\":%d}", g ? "," : "", g, ow[g], tw[g], tf[g]);
    printf("],\"trees\":{");
    printf("\"minimax\":%s,", tree_json(all, W, bestW).c_str());
    printf("\"average\":%s,", tree_json(all, cap, bestA).c_str());
    printf("\"tantalum\":%s", tree_json(all, ow[ta], ta).c_str());
    printf("}}\n");
    return 0;
}
