"""Build elements.csv for Elementle from the Periodic-Table-JSON dataset.

Usage:
    curl -sS -o PeriodicTableJSON.json \
        https://raw.githubusercontent.com/Bowserinator/Periodic-Table-JSON/master/PeriodicTableJSON.json
    python src/build_data.py PeriodicTableJSON.json

Stats come from the dataset (CC BY-SA, derived from Wikipedia). Categories use
the standard 10-category scheme below, not the dataset's own labels, and the
fun facts are written by hand.
"""

import csv
import json
import sys
from pathlib import Path

HERE = Path(__file__).parent
ROOT = HERE.parent

CATEGORIES = [
    "alkali metal",
    "alkaline earth metal",
    "transition metal",
    "post-transition metal",
    "metalloid",
    "reactive nonmetal",
    "halogen",
    "noble gas",
    "lanthanide",
    "actinide",
]


def category(z: int) -> str:
    if z in (3, 11, 19, 37, 55, 87):
        return "alkali metal"
    if z in (4, 12, 20, 38, 56, 88):
        return "alkaline earth metal"
    if 57 <= z <= 71:
        return "lanthanide"
    if 89 <= z <= 103:
        return "actinide"
    if 21 <= z <= 30 or 39 <= z <= 48 or 72 <= z <= 80 or 104 <= z <= 112:
        return "transition metal"
    if z in (13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116):
        return "post-transition metal"
    if z in (5, 14, 32, 33, 51, 52):
        return "metalloid"
    if z in (9, 17, 35, 53, 85, 117):
        return "halogen"
    if z in (2, 10, 18, 36, 54, 86, 118):
        return "noble gas"
    return "reactive nonmetal"  # H, C, N, O, P, S, Se


FUN_FACTS = {
    1: "Makes up about three quarters of all normal matter in the universe.",
    2: "Was found in the Sun's spectrum in 1868, decades before it was found on Earth.",
    3: "So light it floats on water, and soft enough to cut with a knife.",
    4: "Nearly transparent to X-rays, so it is used for X-ray tube windows.",
    5: "Borax, a boron compound, has been used in glazes and cleaning for centuries.",
    6: "Forms more compounds than any other element; it is the backbone of life.",
    7: "About 78% of the air you breathe is nitrogen.",
    8: "The most abundant element in Earth's crust by mass.",
    9: "The most electronegative element; it reacts with almost everything.",
    10: "Glows reddish-orange in a discharge tube, giving neon signs their name.",
    11: "Its symbol Na comes from the Latin natrium.",
    12: "Burns with a blinding white light, which made it a staple of old camera flashes.",
    13: "Was once more precious than gold; the Washington Monument is capped with it.",
    14: "Second most abundant element in Earth's crust, and the heart of computer chips.",
    15: "Discovered in 1669 by an alchemist boiling down urine.",
    16: "Known in the Bible as brimstone.",
    17: "Was used as a chemical weapon in World War I; now it keeps pools clean.",
    18: "Makes up almost 1% of the atmosphere; its name means 'the lazy one'.",
    19: "Bananas are famous for it, and they are very slightly radioactive because of it.",
    20: "The most abundant metal in the human body, mostly in bones and teeth.",
    21: "Mendeleev predicted it as 'eka-boron' before it was discovered.",
    22: "As strong as steel but much lighter; used in jet engines and hip implants.",
    23: "Named after Vanadís, a Norse goddess of beauty, for its colorful compounds.",
    24: "Gives rubies their red and emeralds their green.",
    25: "Essential in steelmaking; most of the world's supply goes into steel.",
    26: "The most common element on Earth by mass, thanks to the core.",
    27: "Its name comes from kobold, a German goblin blamed for troublesome ores.",
    28: "The US 'nickel' coin is actually 75% copper.",
    29: "The Statue of Liberty is copper; its green color is the patina.",
    30: "Galvanizing coats steel with zinc to stop it rusting.",
    31: "Melts at about 30 °C, so it can melt in your hand.",
    32: "Mendeleev predicted it as 'eka-silicon'; it powered early transistors.",
    33: "A classic poison of history; also used in some semiconductors.",
    34: "Its electrical conductivity rises in light, so it was used in photocopiers.",
    35: "One of only two elements that are liquid at room temperature.",
    36: "Defined the meter from 1960 to 1983 via one of its spectral lines.",
    37: "Rubidium atoms keep time in many GPS satellites' clocks.",
    38: "Gives fireworks their bright red color.",
    39: "One of four elements named after the Swedish village of Ytterby.",
    40: "Zirconia is a popular diamond substitute.",
    41: "Named after Niobe, daughter of Tantalus, because it is so similar to tantalum.",
    42: "Plants need traces of it to fix nitrogen.",
    43: "The lightest element with no stable isotopes; first made artificially.",
    44: "A hard, rare platinum-group metal used to toughen platinum alloys.",
    45: "One of the rarest and most valuable precious metals; used in catalytic converters.",
    46: "Can soak up hundreds of times its own volume of hydrogen.",
    47: "The best electrical conductor of all metals.",
    48: "Toxic; caused itai-itai disease in Japan.",
    49: "Indium tin oxide makes touchscreens conductive and transparent.",
    50: "Below about 13 °C, white tin slowly crumbles into gray powder ('tin pest').",
    51: "Its sulfide was used as kohl eyeliner in ancient Egypt.",
    52: "Named after Earth (tellus); exposure gives a garlic smell on the breath.",
    53: "Your thyroid needs it to make hormones; added to table salt for that reason.",
    54: "Used in ion thrusters on spacecraft.",
    55: "The second defines time through a cesium atomic transition.",
    56: "Barium sulfate makes your gut show up on X-rays.",
    57: "Gives the lanthanide series its name.",
    58: "The most abundant rare-earth element; lighter flints contain it.",
    59: "Its name means 'green twin', from its green salts.",
    60: "Neodymium magnets are the strongest permanent magnets widely available.",
    61: "No stable isotopes; essentially absent from Earth's crust.",
    62: "Samarium-cobalt magnets survive high temperatures.",
    63: "Glows red in euro banknotes under UV light, as an anti-counterfeiting feature.",
    64: "Used as an MRI contrast agent.",
    65: "Another Ytterby element; used in green phosphors.",
    66: "Its name means 'hard to get' in Greek.",
    67: "Has the highest magnetic moment of any naturally occurring element.",
    68: "Erbium-doped fibers amplify signals in undersea internet cables.",
    69: "One of the least abundant rare earths.",
    70: "Ytterbium atomic clocks are among the most precise ever built.",
    71: "The densest and hardest of the lanthanides.",
    72: "Hides in zirconium ores and was only found in 1923.",
    73: "Named after Tantalus; it barely 'drinks' acid. Used in phone capacitors.",
    74: "Has the highest melting point of any metal, about 3,422 °C.",
    75: "One of the last stable elements to be discovered, in 1925.",
    76: "The densest naturally occurring element.",
    77: "A global iridium-rich layer marks the dinosaur-killing asteroid impact.",
    78: "Used in catalytic converters and the old international prototype kilogram.",
    79: "So malleable that one gram can be beaten into a sheet about a square meter.",
    80: "The only metal that is liquid at room temperature.",
    81: "Highly toxic; once called 'the poisoner's poison'.",
    82: "The Romans used it for water pipes; 'plumbing' comes from plumbum.",
    83: "Its oxidized crystals form beautiful rainbow staircases; it is in Pepto-Bismol.",
    84: "Discovered by Marie and Pierre Curie, named after Poland.",
    85: "Probably less than a gram of it exists in Earth's crust at any moment.",
    86: "A radioactive gas that can build up in basements.",
    87: "Extremely rare and short-lived; the last naturally occurring element found.",
    88: "Glowed on old watch dials before its dangers were understood.",
    89: "Glows blue in the dark from its radioactivity.",
    90: "Possible fuel for future nuclear reactors; named after Thor.",
    91: "Among the rarest and most expensive naturally occurring elements.",
    92: "Fuel for nuclear reactors; named after the planet Uranus.",
    93: "The first transuranium element, named after Neptune.",
    94: "Powers some deep-space probes through radioisotope generators.",
    95: "Found in most household smoke detectors.",
    96: "Named after Marie and Pierre Curie.",
    97: "Named after Berkeley, California, where it was made.",
    98: "One microgram can emit millions of neutrons per minute.",
    99: "First found in the debris of the first hydrogen bomb test.",
    100: "Also found in hydrogen bomb debris; named after Enrico Fermi.",
    101: "Named after Dmitri Mendeleev, the father of the periodic table.",
    102: "Named after Alfred Nobel.",
    103: "Named after Ernest Lawrence, inventor of the cyclotron.",
    104: "Named after Ernest Rutherford.",
    105: "Named after Dubna, Russia, home of a major nuclear research center.",
    106: "Named after Glenn Seaborg while he was still alive.",
    107: "Named after Niels Bohr.",
    108: "Named after the German state of Hesse.",
    109: "Named after Lise Meitner, co-discoverer of nuclear fission.",
    110: "Named after Darmstadt, Germany.",
    111: "Named after Wilhelm Röntgen, discoverer of X-rays.",
    112: "Named after Nicolaus Copernicus.",
    113: "The first element discovered in Asia, named after Japan (Nihon).",
    114: "Named after the Flerov Laboratory in Dubna.",
    115: "Named after the Moscow region.",
    116: "Named after Lawrence Livermore National Laboratory.",
    117: "Named after Tennessee; discovered in 2010.",
    118: "The heaviest known element; only a handful of atoms have ever been made.",
}


# Commonly cited discovery (or first-isolation) years. None = antiquity.
# Several are disputed or happened in stages; these are the usual dates.
YEARS = {
    1: 1766, 2: 1868, 3: 1817, 4: 1798, 5: 1808, 6: None, 7: 1772, 8: 1771, 9: 1886, 10: 1898,
    11: 1807, 12: 1755, 13: 1825, 14: 1824, 15: 1669, 16: None, 17: 1774, 18: 1894, 19: 1807, 20: 1808,
    21: 1879, 22: 1791, 23: 1801, 24: 1797, 25: 1774, 26: None, 27: 1735, 28: 1751, 29: None, 30: 1746,
    31: 1875, 32: 1886, 33: 1250, 34: 1817, 35: 1826, 36: 1898, 37: 1861, 38: 1790, 39: 1794, 40: 1789,
    41: 1801, 42: 1778, 43: 1937, 44: 1844, 45: 1804, 46: 1802, 47: None, 48: 1817, 49: 1863, 50: None,
    51: None, 52: 1782, 53: 1811, 54: 1898, 55: 1860, 56: 1772, 57: 1839, 58: 1803, 59: 1885, 60: 1885,
    61: 1945, 62: 1879, 63: 1901, 64: 1880, 65: 1843, 66: 1886, 67: 1878, 68: 1843, 69: 1879, 70: 1878,
    71: 1907, 72: 1923, 73: 1802, 74: 1783, 75: 1925, 76: 1803, 77: 1803, 78: 1748, 79: None, 80: None,
    81: 1861, 82: None, 83: 1500, 84: 1898, 85: 1940, 86: 1899, 87: 1939, 88: 1898, 89: 1899, 90: 1829,
    91: 1913, 92: 1789, 93: 1940, 94: 1940, 95: 1944, 96: 1944, 97: 1949, 98: 1950, 99: 1952, 100: 1952,
    101: 1955, 102: 1966, 103: 1961, 104: 1964, 105: 1968, 106: 1974, 107: 1981, 108: 1984, 109: 1982, 110: 1994,
    111: 1994, 112: 1996, 113: 2004, 114: 1999, 115: 2003, 116: 2000, 117: 2010, 118: 2002,
}
APPROXIMATE = {33, 83}  # arsenic c. 1250, bismuth c. 1500


def year_label(z: int) -> str:
    y = YEARS[z]
    if y is None:
        return "Antiquity"
    return f"c. {y}" if z in APPROXIMATE else str(y)


def main() -> None:
    src = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    assert sorted(YEARS) == list(range(1, 119))
    rows = []
    for e in src["elements"]:
        z = e["number"]
        if z > 118:
            continue
        rows.append(
            {
                "number": z,
                "symbol": e["symbol"],
                "name": e["name"],
                "category": category(z),
                "period": e["period"],
                "group": e["group"],
                "xpos": e["xpos"],
                "ypos": e["ypos"],
                "atomic_mass": round(e["atomic_mass"], 3) if e["atomic_mass"] else "",
                "phase": e["phase"],
                "density": e["density"] if e["density"] is not None else "",
                "melt_k": e["melt"] if e["melt"] is not None else "",
                "boil_k": e["boil"] if e["boil"] is not None else "",
                "electronegativity": e["electronegativity_pauling"] or "",
                "electron_config": e["electron_configuration_semantic"],
                "discovered_by": e["discovered_by"] or "",
                "year": YEARS[z] if YEARS[z] is not None else "",
                "year_label": year_label(z),
                "fun_fact": FUN_FACTS[z],
                "summary": e["summary"],
            }
        )
    out = ROOT / "data" / "elements.csv"
    with out.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    print(f"wrote {len(rows)} elements to {out}")


if __name__ == "__main__":
    main()
