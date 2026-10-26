"""Hand-written notes for the 10 categories and the extra collections.

build_html.py embeds groups_json() into the page. Collection members are
atomic numbers; categories take their members from elements.csv.
"""

import json

CATEGORY_INFO = {
    "alkali metal": {
        "summary": "Soft, silvery metals in group 1 that react violently with water. Each has a single outer electron that it gives away eagerly.",
        "history": "Humphry Davy isolated sodium and potassium in 1807 by running electricity through molten caustic soda and potash; the potassium skittered across the surface and burst into flame. Lithium followed in 1817. Bunsen and Kirchhoff found caesium (1860) and rubidium (1861) with their new spectroscope, naming them after the sky-blue and deep-red lines. Francium, found by Marguerite Perey in 1939, was the last element discovered in nature.",
        "edges": "Hydrogen sits at the top of group 1 but is not an alkali metal: it is a gas and a nonmetal. Everything else in the column is. Reactivity rises going down, so caesium explodes on contact with water.",
        "remember": "Li Na K Rb Cs Fr: \"Little Nasty Kids Rub Cats' Fur\".",
    },
    "alkaline earth metal": {
        "summary": "Group 2: shiny, reactive metals with two outer electrons. Less violent than their group 1 neighbors, but still never found free in nature.",
        "history": "\"Earths\" was the old word for oxides that would not melt or dissolve in fire, and these made alkaline solutions. Joseph Black recognized magnesium as an element in 1755, and Vauquelin found beryllium in beryl in 1798. In 1808 Davy used electrolysis again to isolate magnesium, calcium, strontium and barium. Marie and Pierre Curie added radium in 1898.",
        "edges": "The category is exactly group 2. Helium has two electrons too and some tables draw it above beryllium, but it is a noble gas. Beryllium is the odd one out in behavior: its bonds are more covalent than its siblings'.",
        "remember": "Be Mg Ca Sr Ba Ra: \"Beer Mugs Can Smash Bar Rooms\".",
    },
    "transition metal": {
        "summary": "The wide block in the middle, groups 3 to 12: hard, dense metals that form colorful compounds and make good catalysts. It holds iron, copper, gold and the platinum metals.",
        "history": "Five of them (iron, copper, silver, gold, mercury) were known in antiquity. The 1700s and 1800s filled in most of the rest from minerals, often in Sweden and Germany. Technetium (1937) was the first element made artificially, and the block ends with superheavy elements made one atom at a time, up to copernicium in 1996.",
        "edges": "Strictly, chemists define a transition metal as having a partly filled d shell. Zinc, cadmium and mercury have full ones, so they are sometimes left out; this game counts them. Lanthanum and actinium sit in the pulled-out rows here, and the superheavies 104 to 112 are counted by their column.",
        "remember": "Columns 3 to 12, the gap between the two tall towers on each side. If it looks like a coin, a pipe or a ring, it is probably here.",
    },
    "post-transition metal": {
        "summary": "Softer, weaker metals just right of the transition block, below the metalloid staircase: aluminium, gallium, indium, tin, thallium, lead, bismuth, polonium and four superheavies.",
        "history": "Tin and lead were known in antiquity, and bismuth was described around 1500. Aluminium was isolated in 1825 and was once so precious that Napoleon III served his most honored guests on aluminium plates. Gallium (1875) was the first of Mendeleev's predicted elements to be found, and indium (1863) and thallium (1861) were named after their indigo and green spectral lines.",
        "edges": "The border with the metalloids is the staircase: germanium and antimony are metalloids while tin and bismuth below them are metals. Polonium is sometimes called a metalloid. Nihonium, flerovium, moscovium and livermorium are placed here by prediction, since only a few atoms exist.",
        "remember": "The metals hugging the staircase from below: Al, then Ga In Tl down column 13, Sn Pb, Bi, Po.",
    },
    "metalloid": {
        "summary": "Elements halfway between metals and nonmetals: they look metallic but break like glass, and several are semiconductors. Silicon and germanium made the computer age.",
        "history": "Arsenic and antimony were known to alchemists; Albertus Magnus is credited with arsenic around 1250. Tellurium came in 1782, boron in 1808, silicon in 1824. Germanium (1886) confirmed Mendeleev's prediction of \"eka-silicon\" almost exactly.",
        "edges": "They sit along the staircase that splits metals from nonmetals. Which elements count is a matter of taste: polonium, astatine, carbon, selenium and even aluminium are sometimes added. This game uses the classic six.",
        "remember": "Walk down the staircase: B, Si, then Ge As, then Sb Te. One, one, two, two.",
    },
    "reactive nonmetal": {
        "summary": "The nonmetals that are neither halogens nor noble gases: hydrogen, carbon, nitrogen, oxygen, phosphorus, sulfur and selenium. Most of life is built from them.",
        "history": "Carbon and sulfur were known in antiquity. Phosphorus (1669, Hennig Brand, boiling urine) is the first element whose discoverer we know by name. The gases came in a rush in the 1760s and 1770s: hydrogen (1766), nitrogen (1772) and oxygen (Scheele and Priestley, early 1770s). Selenium, named after the Moon, followed in 1817.",
        "edges": "Halogens and noble gases are nonmetals too but have their own categories. Hydrogen sits in group 1 but behaves as a nonmetal. Selenium is right next to the staircase and is sometimes called a metalloid.",
        "remember": "CHNOPS, the six elements of life, plus selenium.",
    },
    "halogen": {
        "summary": "Group 17, one step short of a full outer shell, so they grab electrons from almost anything. The name is Greek for \"salt-former\": with sodium, chlorine makes table salt.",
        "history": "Scheele made chlorine in 1774 but thought it was a compound; Davy showed it was an element in 1810. Iodine was found in seaweed ash in 1811 and bromine in sea salt in 1826. Fluorine injured or killed several chemists who tried to isolate it before Henri Moissan succeeded in 1886, earning a Nobel Prize. Astatine (1940) and tennessine (2010) were made artificially.",
        "edges": "The category is exactly group 17. Astatine and tennessine are so rare and radioactive that their chemistry is mostly predicted; both may behave more like metalloids.",
        "remember": "The column just left of the noble gases. Fluorine, chlorine, bromine and iodine go gas, gas, liquid, solid going down.",
    },
    "noble gas": {
        "summary": "Group 18: full outer shells, so they barely react. Colorless gases that glow in vivid colors in a discharge tube.",
        "history": "Helium was seen in the Sun's spectrum in 1868, decades before it was found on Earth. Rayleigh and Ramsay found argon in 1894; it had no place in Mendeleev's table, so they added a whole new column. Ramsay and Travers then found neon, krypton and xenon within weeks of each other in 1898, and radon followed in 1899. Oganesson (2002) is the newest member.",
        "edges": "The category is exactly group 18. \"Noble\" is not quite true: Neil Bartlett made the first xenon compound in 1962. Oganesson is predicted to be a reactive solid, but it is still counted by its column.",
        "remember": "The right-hand edge of the table, all the way down.",
    },
    "lanthanide": {
        "summary": "The 15 elements from lanthanum to lutetium, filling the 4f shell. They are chemically almost identical, which made them fiendishly hard to tell apart. Phone, wind-turbine and electric-car magnets depend on them.",
        "history": "It began with a black rock from the Ytterby quarry in Sweden in 1787. Cerium was named in 1803, then Mosander split \"lanthana\" into new elements in the 1840s, and chemists spent the next century separating one near-twin from another. Lutetium (1907) was the last one found in nature. Promethium, which has no stable isotope, was identified at Oak Ridge in 1945 among nuclear fission products.",
        "edges": "Whether lanthanum or lutetium belongs under yttrium in group 3 is a long-running debate; this game puts all 15 in this category. Scandium and yttrium are \"rare earths\" too, but they are not lanthanides.",
        "remember": "The first pulled-out row: 57 to 71, from La (\"lanthanein\", Greek for \"to lie hidden\") to Lu.",
    },
    "actinide": {
        "summary": "The 15 elements from actinium to lawrencium, filling the 5f shell. All are radioactive; everything past uranium was first made in a lab.",
        "history": "Uranium was named in 1789 after the newly found planet Uranus, and thorium followed in 1829. Glenn Seaborg's 1944 idea that these form a second series under the lanthanides told his team where to look, and Berkeley produced americium, curium and onward. The run ends with lawrencium in 1961, though nobelium's discovery was disputed for years.",
        "edges": "The same La-or-Lu debate applies to actinium and lawrencium. Rutherfordium (104) starts the transactinides, which this game places by column among the transition metals.",
        "remember": "The second pulled-out row: 89 to 103. After uranium (92), the names honor planets, places and scientists.",
    },
}

ANTIQUITY = "Known since antiquity"

COLLECTIONS = [
    {"id": "one-letter", "name": "One-letter symbols", "members": [1, 5, 6, 7, 8, 9, 15, 16, 19, 23, 39, 53, 74, 92],
     "detail": "Only 14 elements get a single letter: H B C N O F P S K V Y I W U. Most were named early, before the alphabet ran out. In this game they are the only guesses that can produce a yellow letter by matching the second letter of a two-letter symbol."},
    {"id": "old-names", "name": "Symbols from old names", "members": [11, 19, 26, 29, 47, 50, 51, 74, 79, 80, 82],
     "detail": "Eleven symbols don't match the English name because they come from Latin or German: Na natrium, K kalium, Fe ferrum, Cu cuprum, Ag argentum, Sn stannum, Sb stibium, W wolfram, Au aurum, Hg hydrargyrum (\"water-silver\") and Pb plumbum. Plumbum is why we say plumbing."},
    {"id": "antiquity", "name": "Known since antiquity", "members": [6, 16, 26, 29, 47, 50, 51, 79, 80, 82],
     "detail": "The seven metals of antiquity (gold, silver, copper, iron, tin, lead, mercury) plus carbon, sulfur and antimony were used long before anyone called them elements. Ancient astronomers and alchemists paired the seven metals with the seven classical planets."},
    {"id": "places", "name": "Named after places", "members": [12, 21, 29, 31, 32, 38, 39, 44, 63, 65, 67, 68, 69, 70, 71, 72, 75, 84, 87, 95, 97, 98, 105, 108, 110, 113, 115, 116, 117],
     "detail": "Countries, cities, regions and labs: Scandinavia (Sc), Gaul (Ga), Germany (Ge), Strontian in Scotland (Sr), Ruthenia (Ru), Europe (Eu), Stockholm (Ho), Thule (Tm), Paris (Lu, from Lutetia), Copenhagen (Hf, from Hafnia), the Rhine (Re), Poland (Po), France (Fr), the Americas (Am), Berkeley and California (Bk, Cf), Dubna (Db), Hesse and Darmstadt (Hs, Ds), Japan (Nh), Moscow (Mc), Livermore (Lv) and Tennessee (Ts). Magnesium comes from Magnesia in Greece and copper from Cyprus. Ytterby gets four of its own (see that collection)."},
    {"id": "people", "name": "Named after people", "members": [62, 64, 96, 99, 100, 101, 102, 103, 104, 106, 107, 109, 111, 112, 114, 118],
     "detail": "Samarium and gadolinium honor people through minerals named after them. Curium honors Marie and Pierre Curie; the rest of the list runs Einstein, Fermi, Mendeleev, Nobel, Lawrence, Rutherford, Seaborg, Bohr, Meitner, Röntgen, Copernicus, Flerov and Oganessian. Seaborg and Oganessian are the only people honored while alive. Meitner and Curie are the women honored by name."},
    {"id": "sky", "name": "Named after the sky", "members": [2, 34, 46, 52, 58, 92, 93, 94],
     "detail": "Helium (the Sun, Helios), selenium (the Moon, Selene), tellurium (the Earth, Tellus), cerium (the dwarf planet Ceres), palladium (the asteroid Pallas), and uranium, neptunium and plutonium after the planets, in order."},
    {"id": "ytterby", "name": "The Ytterby four", "members": [39, 65, 68, 70],
     "detail": "Yttrium, terbium, erbium and ytterbium are all named after one small quarry village in Sweden, where a strange black mineral turned up in 1787. Holmium, thulium, gadolinium, scandium and lutetium were also first found in Ytterby ores."},
    {"id": "davy", "name": "Isolated by Humphry Davy", "members": [5, 11, 12, 19, 20, 38, 56],
     "detail": "In 1807 and 1808 Davy used a giant battery to split compounds no chemistry could break: sodium and potassium, then magnesium, calcium, strontium, barium and boron (boron at the same time as Gay-Lussac and Thénard). He also showed that chlorine was an element."},
    {"id": "seaborg", "name": "Seaborg's ten", "members": [94, 95, 96, 97, 98, 99, 100, 101, 102, 106],
     "detail": "Glenn Seaborg co-discovered ten elements, from plutonium (1940) to element 106, which was named seaborgium in his lifetime. His actinide concept also redrew the bottom of the periodic table."},
    {"id": "mendeleev", "name": "Predicted by Mendeleev", "members": [21, 31, 32, 43],
     "detail": "In 1871 Mendeleev left gaps in his table and predicted the properties of the missing elements. Eka-aluminium became gallium (1875), eka-boron became scandium (1879) and eka-silicon became germanium (1886), each matching closely. Eka-manganese waited until technetium was made in 1937."},
    {"id": "made-first", "name": "Made before found", "members": [43, 61, 85] + list(range(93, 119)),
     "detail": "These were first produced artificially: technetium (1937), astatine (1940), promethium (1945) and everything from neptunium (93) up. A few, such as technetium and plutonium, were later found in tiny natural traces."},
    {"id": "unstable", "name": "No stable isotope", "members": [43, 61] + list(range(83, 119)),
     "detail": "Every isotope of these decays. Technetium and promethium are the only gaps below lead. Bismuth is technically radioactive (measured in 2003), but its half-life is about a billion times the age of the universe."},
    {"id": "gases", "name": "Gases at room temperature", "members": [1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86],
     "detail": "Eleven elements are gases at room temperature: hydrogen, nitrogen, oxygen, fluorine, chlorine and the six classic noble gases."},
    {"id": "liquid", "name": "Liquid or melts in your hand", "members": [35, 55, 31, 80],
     "detail": "Mercury (melts at −39 °C) and bromine (−7 °C) are liquid at room temperature. Caesium (28.5 °C) and gallium (29.8 °C) melt on a warm day or in your hand. Francium probably would too, but nobody has ever had enough to see."},
    {"id": "platinum-group", "name": "Platinum group", "members": [44, 45, 46, 76, 77, 78],
     "detail": "Ruthenium, rhodium, palladium, osmium, iridium and platinum: rare, dense, corrosion-proof and superb catalysts. They usually turn up together in the same ores."},
    {"id": "magnetic", "name": "Magnetic", "members": [26, 27, 28, 64],
     "detail": "Iron, cobalt and nickel are ferromagnetic at room temperature. Gadolinium joins them only below about 20 °C, so it can stop sticking to a magnet on a warm day."},
    {"id": "body", "name": "The body's big six", "members": [1, 6, 7, 8, 15, 20],
     "detail": "Oxygen, carbon, hydrogen, nitrogen, calcium and phosphorus make up about 99% of your body's mass. Oxygen alone is about two thirds, mostly in water."},
    {"id": "diatomic", "name": "Diatomic", "members": [1, 7, 8, 9, 17, 35, 53],
     "detail": "Hydrogen, nitrogen, oxygen, fluorine, chlorine, bromine and iodine exist as two-atom molecules (H₂, O₂ and so on). Remember them as HOFBrINCl, pronounced \"hoff-brinkle\"."},
]


def groups_json() -> str:
    for c in COLLECTIONS:
        assert len(set(c["members"])) == len(c["members"]), c["id"]
    return json.dumps({"categories": CATEGORY_INFO, "collections": COLLECTIONS}, ensure_ascii=False, separators=(",", ":"))
