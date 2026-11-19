const rawCities = /*__CITIES__*/ null,
  world = /*__WORLD__*/ null;
const roads = /*__ROADS__*/ null;
const municipalities = new Map(
  /*__MUNICIPALITIES__*/ null.features.map((feature) => [feature.id, feature]),
);
let roadNumber = "all";
const isExplore = () => current === "atlas" || current === "roads";
const app = document.getElementById("app");
const overrides = {
  Jerusalem: "ירושלים",
  "Tel Aviv": "תל אביב־יפו",
  Haifa: "חיפה",
  "Ness Ziona": "נס ציונה",
  "Rishon LeZiyyon": "ראשון לציון",
  "Petah Tikva": "פתח תקווה",
  Beersheba: "באר שבע",
  Netanya: "נתניה",
  Ashdod: "אשדוד",
  Eilat: "אילת",
};
const cities = rawCities
  .map((c) => ({
    ...c,
    he:
      overrides[c.name] ||
      c.alternatenames.find((n) => /^[א-ת][א-ת\s׳״'"־()-]*$/.test(n)),
  }))
  .filter((c) => c.he && municipalities.has(c.geonameid))
  .sort((a, b) => b.population - a.population);
const cityById = new Map(cities.map((city) => [city.geonameid, city]));
const cityBorders = borderGraph(
  Object.entries(/*__CITY_BORDERS__*/ null)
    .filter(([id]) => cityById.has(Number(id)))
    .map(([id, neighbors]) => [Number(id), neighbors]),
);
const cityName = (id) => cityById.get(id).he;
let cityJourney = null;
let cityRoutePreview = null;
const leaderPortraits = /*__LEADER_PORTRAITS__*/ null;
const cityPhotos = /*__CITY_PHOTOS__*/ null;
const pms = [
  [
    "דוד בן־גוריון",
    "1948–1954 · 1955–1963",
    "הכריז על הקמת המדינה ב־14 במאי 1948. כיהן כראש הממשלה הראשון וגם כשר הביטחון.",
    "https://www.gov.il/en/pages/ben_gurion",
  ],
  [
    "משה שרת",
    "1954–1955",
    "היה שר החוץ הראשון של ישראל. לפני כניסתו לראשות הממשלה הקים את שירות החוץ הישראלי.",
    "https://m.knesset.gov.il/en/about/pages/sharett.aspx",
  ],
  [
    "לוי אשכול",
    "1963–1969",
    "ביוני 1967 הרחיב את ממשלתו והקים את ממשלת האחדות הלאומית הראשונה של ישראל.",
    "https://main.knesset.gov.il/EN/About/Pages/eshkol.aspx",
  ],
  [
    "גולדה מאיר",
    "1969–1974",
    "ב־1948 מונתה לנציגה הדיפלומטית הראשונה של ישראל בברית המועצות. בהמשך כיהנה כשרת החוץ, לפני שמונתה לראש הממשלה.",
    "https://www.gov.il/en/pages/_golda_meir",
  ],
  [
    "יצחק רבין",
    "1974–1977 · 1992–1995",
    "בכהונתו השנייה קיבל את פרס נובל לשלום לשנת 1994, יחד עם שמעון פרס ויאסר ערפאת.",
    "https://www.nobelprize.org/prizes/peace/1994/summary/",
  ],
  [
    "מנחם בגין",
    "1977–1983",
    "השתתף בשיחות קמפ דייוויד עם אנואר סאדאת וג׳ימי קרטר ב־1978. ההסכמות סללו את הדרך לחוזה השלום עם מצרים ב־1979.",
    "https://history.state.gov/milestones/1977-1980/camp-david",
  ],
  [
    "יצחק שמיר",
    "1983–1984 · 1986–1992",
    "כיהן כיושב ראש הכנסת וכשר החוץ. הוא חזר לראשות הממשלה ב־1986 במסגרת הסכם הרוטציה עם שמעון פרס.",
    "https://meyda.education.gov.il/files/Tiyulim/morim/prime_ministers7A.pdf",
  ],
  [
    "שמעון פרס",
    "1984–1986 · 1995–1996",
    "חלק את פרס נובל לשלום ב־1994 עם יצחק רבין ויאסר ערפאת. לאחר שתי כהונותיו כראש ממשלה נבחר גם לנשיא המדינה.",
    "https://www.nobelprize.org/prizes/peace/1994/peres/facts/",
  ],
  [
    "בנימין נתניהו",
    "1996–1999 · 2009–2021 · חזר לתפקיד ב־2022",
    "ב־1996 היה לראש הממשלה הראשון שנבחר בבחירה ישירה. באותה שנה הצביעו בפתק אחד לכנסת ובפתק נוסף לראשות הממשלה.",
    "https://www.gov.il/apps/elections/Elections-knesset-15/heb/pm/ebio_pm_4.html",
  ],
  [
    "אהוד ברק",
    "1999–2001",
    "כיהן כרמטכ״ל לפני שנבחר לראשות הממשלה. במאי 2000 הורה להוציא את כוחות צה״ל מדרום לבנון.",
    "https://www.gov.il/BlobFolder/generalpage/gov28/he/gov28.pdf",
  ],
  [
    "אריאל שרון",
    "2001–2006",
    "ממשלתו יישמה ב־2005 את תוכנית ההתנתקות, שבמסגרתה פונו יישובים ישראליים מרצועת עזה ומצפון השומרון.",
    "https://www.gov.il/en/pages/cabinet-communique-20-feb-2005",
  ],
  [
    "אהוד אולמרט",
    "2006–2009",
    "מילא את מקום ראש הממשלה לאחר אשפוזו של אריאל שרון בינואר 2006. לאחר הבחירות באותה שנה הקים ממשלה בראשות קדימה.",
    "https://www.gov.il/BlobFolder/generalpage/facts-about-israel-history/en/English_SiteTransfer_DOCUMENTS_History2010.pdf",
  ],
  [
    "נפתלי בנט",
    "2021–2022",
    "עמד בראש הממשלה ה־36 מתחילת כהונתה ביוני 2021. יאיר לפיד החליף אותו ביולי 2022 לפי הסכם הרוטציה.",
    "https://m.knesset.gov.il/en/mk/government/pages/governments.aspx?govId=36",
  ],
  [
    "יאיר לפיד",
    "2022",
    "היה שר החוץ וראש הממשלה החלופי בממשלת בנט. ביולי 2022 נכנס לתפקיד ראש הממשלה והמשיך לכהן כשר החוץ.",
    "https://m.knesset.gov.il/en/mk/government/pages/governments.aspx?govId=36",
  ],
];
const moments = [
  [
    "1977",
    "המהפך",
    "מנחם בגין והליכוד עלו לשלטון. לראשונה קמה ממשלה בראשות הליכוד לאחר עשרות שנים של ממשלות בראשות מפא״י והמערך.",
  ],
  [
    "1984",
    "ממשלת אחדות ורוטציה",
    "שמעון פרס ויצחק שמיר עמדו בראש ממשלת אחדות על בסיס הסכם רוטציה: פרס תחילה, ושמיר מ־1986.",
  ],
  [
    "1996",
    "שני פתקים",
    "במקביל לבחירות לכנסת נערכו לראשונה בחירות ישירות לראשות הממשלה. בנימין נתניהו נבחר לראש הממשלה.",
  ],
  [
    "1999",
    "ברק נבחר",
    "אהוד ברק נבחר בבחירה ישירה לראשות הממשלה. גם בבחירות אלו הצביעו בנפרד לכנסת ולראשות הממשלה.",
  ],
  [
    "2001",
    "בחירות מיוחדות",
    "אריאל שרון נבחר בבחירות מיוחדות לראשות הממשלה. באותה שנה לא התקיימו בחירות לכנסת.",
  ],
  [
    "אפריל 2019",
    "בחירות ללא ממשלה חדשה",
    "לאחר הבחירות לכנסת ה־21 לא הוקמה ממשלה חדשה, והכנסת התפזרה לקראת בחירות נוספות.",
  ],
  [
    "ספטמבר 2019",
    "שוב לבחירות",
    "גם הכנסת ה־22 לא הצליחה להביא להקמת ממשלה חדשה. הבחירות הבאות נערכו במרץ 2020.",
  ],
  [
    "2020",
    "ממשלת נתניהו–גנץ",
    "לאחר הבחירות לכנסת ה־23 הוקמה ממשלת אחדות על בסיס הסכם רוטציה בין נתניהו לגנץ. הרוטציה לראשות הממשלה לא מומשה.",
  ],
  [
    "2021",
    "ממשלת בנט–לפיד",
    "הוקמה ממשלה בראשות נפתלי בנט עם הסכם רוטציה עם יאיר לפיד. לפיד נכנס לתפקיד ראש הממשלה ב־2022.",
  ],
  [
    "2022",
    "ממשלה חדשה בדצמבר",
    "לאחר הבחירות לכנסת ה־25 הוקמה ממשלה בראשות בנימין נתניהו.",
  ],
];
const activities = [
  [
    "travel",
    "10",
    "מסלול בין ערים",
    "עוברים בין רשויות שחולקות גבול ומנסים למצוא את הדרך הקצרה ביותר.",
  ],
  [
    "atlas",
    "01",
    "מפת היכרות",
    "איך נס ציונה קשורה לרחובות? חיפוש, התמקדות וסביבה קרובה.",
    "לגלות מקומות",
  ],
  [
    "place",
    "02",
    "איפה העיר הזאת?",
    "בוחרים את שטח השיפוט של העיר על המפה.",
    "לנסות למקם",
  ],
  [
    "direction",
    "03",
    "מי יותר צפונית?",
    "זוג ערים, החלטה אחת. בונים כיוון בראש בלי לשנן מספרים.",
    "לחדד כיוון",
  ],
  [
    "leaders",
    "04",
    "מי כיהן מתי?",
    "ראשי הממשלה, תקופות הכהונה והחזרות לתפקיד.",
    "לפתוח את ציר הזמן",
  ],
  [
    "leaderquiz",
    "05",
    "מי היה ראש הממשלה?",
    "שנה על המסך וארבע אפשרויות. מחברים שם לתקופה.",
    "לבחון את הזיכרון",
  ],
  [
    "elections",
    "06",
    "מבחירות לממשלה",
    "תחנות נבחרות: המהפך, הרוטציה ורצף הבחירות של 2019–2022.",
    "לעבור בין התחנות",
  ],
  [
    "roads",
    "09",
    "מפת הכבישים",
    "כבישים 1, 2, 4, 6, 40 ו־90 לצד היישובים. בוחרים כביש ורואים את התוואי הזמין.",
    "להכיר את הצירים",
  ],
  [
    "parliament",
    "08",
    "מרכיבים רוב · 2013",
    "תוצאות אמיתיות, צירופים לבחירתכם. כמה מפלגות צריך כדי להגיע ל־61?",
    "לצרף מושבים",
  ],
];
activities.sort((a, b) => a[1].localeCompare(b[1]));
let cityMisses = 0;
let cityAdvanceTimer;
let cityClockInterval;
let placementRun;
let placementMode = "guided";
const discoveredCities = new Set();
const placementLabels = {
  guided: "גבולות ערי החידון",
  blind: "מפה עיוורת",
  all: "כל גבולות הערים",
};
const placementHistoryKey = "fieldnotes.israel.placement-history.v1";
const placementSettingsKey = "fieldnotes.israel.placement-settings.v1";
const placementProgressKey = "fieldnotes.israel.placement-progress.v1";
function readPlacementStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function writePlacementStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
let placementSaves = readPlacementStorage(placementProgressKey, {});
let placementHistory = [];
try {
  const saved = JSON.parse(localStorage.getItem(placementHistoryKey) || "[]");
  if (Array.isArray(saved)) placementHistory = saved;
} catch {}
let cityLimit = Infinity;
const cityTiers = [10, 20, 30, 50];
let current = "home",
  selected = null,
  target = null,
  region = "all",
  score = 0,
  round = 0,
  finished = false,
  mapZoom = null,
  svg = null,
  g = null,
  projection = null,
  question = null;
const $ = (id) => document.getElementById(id),
  norm = (s) =>
    s
      .normalize("NFKD")
      .replace(/[\u0591-\u05C7]/g, "")
      .replace(/[^א-תa-z0-9]/gi, "")
      .toLowerCase();
const sample = (a) => a[Math.floor(Math.random() * a.length)];
function regionalCities(area) {
  if (area === "all") return cities;
  return cities.filter((city) => {
    const cityRegion =
      city.latitude > 32.5
        ? "north"
        : city.latitude < 31.5
          ? "south"
          : "center";
    return cityRegion === area;
  });
}
function cityPool(area = region) {
  return regionalCities(area).slice(0, cityLimit);
}
function cityTierControl(parent, onChange, area = region) {
  const count = regionalCities(area).length;
  const label = document.createElement("label");
  label.className = "city-tier";
  label.innerHTML = 'ערים לפי אוכלוסייה <select id="city-tier"></select>';
  const select = label.querySelector("select");
  for (const tier of cityTiers.filter((tier) => tier < count)) {
    select.add(new Option(tier + " הגדולות", String(tier)));
  }
  select.add(new Option("כל הערים (" + count + ")", "Infinity"));
  select.value = String(cityLimit < count ? cityLimit : Infinity);
  select.onchange = () => {
    if (current === "place") pausePlacementRun();
    cityLimit = Number(select.value);
    score = round = 0;
    onChange();
    $("city-tier").focus({ preventScroll: true });
  };
  parent.append(label);
}
function button(text, fn, parent, cls = "") {
  const b = document.createElement("button");
  b.textContent = text;
  b.onclick = fn;
  b.className = cls;
  parent.append(b);
  return b;
}
function open(view) {
  if (current === "place") pausePlacementRun();
  clearTimeout(cityAdvanceTimer);
  clearInterval(cityClockInterval);
  current = view;
  if (view === "place") {
    const settings = readPlacementStorage(placementSettingsKey, {});
    const savedTier = Number(settings.tier);
    cityLimit =
      cityTiers.includes(savedTier) || savedTier === Infinity ? savedTier : 10;
    region = ["all", "north", "center", "south"].includes(settings.region)
      ? settings.region
      : "all";
    placementMode = Object.hasOwn(placementLabels, settings.mode)
      ? settings.mode
      : "guided";
  }
  selected = null;
  score = round = 0;
  render();
  window.scrollTo(0, 0);
}
const englishActivities = {
  travel: [
    "City border routes",
    "Cross shared municipal borders to reach your destination.",
  ],
  atlas: ["City atlas", "Find places and see what’s nearby."],
  place: ["Place a city", "Find the city by tapping its municipal area."],
  direction: [
    "Which is farther north?",
    "Compare two cities and see both on the map.",
  ],
  leaders: ["Prime ministers", "Browse terms and returns to office."],
  leaderquiz: ["Who was prime minister?", "Match a leader to a year."],
  elections: [
    "Elections and governments",
    "Explore turning points and coalition changes.",
  ],
  parliament: [
    "Build a majority · 2013",
    "Combine parties using real election results.",
  ],
  roads: ["Major roads", "See selected road corridors alongside cities."],
};
function home() {
  app.innerHTML =
    "<h1>Israel</h1><p>Explore the map or practice Israeli geography, history and politics.</p>";
  for (const [title, group] of [
    ["Geography", ["atlas", "place", "direction", "roads", "travel"]],
    [
      "History and politics",
      ["leaders", "leaderquiz", "elections", "parliament"],
    ],
  ]) {
    const section = document.createElement("section");
    section.innerHTML = "<h2>" + title + '</h2><div class="catalog"></div>';
    for (const id of group) {
      const [label, description] = englishActivities[id];
      const item = button("", () => open(id), section.lastChild, "activity");
      item.innerHTML =
        "<h3>" +
        label +
        "</h3><p>" +
        description +
        '</p><span class="go">Open →</span>';
    }
    app.append(section);
  }
}
function shell(title, desc) {
  app.innerHTML =
    '<button id="back">← All activities</button><section lang="he" dir="rtl"><div class="toolbar"><div><h1>' +
    title +
    "</h1><p>" +
    desc +
    '</p></div></div><div id="content"></div></section>';
  $("back").onclick = () => open("home");
  $("back").parentElement.classList.toggle(
    "map-activity",
    ["place", "travel"].includes(current),
  );
}
function render() {
  if (current === "home") {
    home();
    return;
  }
  const a = activities.find((a) => a[0] === current);
  shell(a[2], a[3]);
  if (["atlas", "place", "roads"].includes(current)) {
    mapView();
    return;
  }
  if (current === "travel") {
    cityTravel();
    return;
  }
  if (current === "direction") {
    directionRound();
    return;
  }
  if (current === "leaderquiz") {
    leaderRound();
    return;
  }
  if (current === "parliament") {
    parliament();
    return;
  }
  timeline();
}
function moveMapControls() {
  const canvas = document.createElement("div");
  canvas.className = "map-canvas";
  $("map").before(canvas);
  canvas.append($("map"));
  const controls = document.createElement("div");
  controls.className = "map-overlay-controls";
  controls.setAttribute("aria-label", "תצוגת מפה");
  $("fit").textContent = "⌖";
  $("fit").setAttribute("aria-label", "התאמה לכל האזור");
  $("fit").title = "התאמה לכל האזור";
  canvas.append(controls);
  for (const id of ["zoom-in", "zoom-out", "fit"]) controls.append($(id));
  return canvas;
}
function mapView() {
  if (current === "place") pausePlacementRun();
  clearTimeout(cityAdvanceTimer);
  clearInterval(cityClockInterval);
  $("content").innerHTML =
    '<div class="toolbar" id="map-filters"><label>אזור <select id="area"><option value="all">כל הארץ</option><option value="north">צפון</option><option value="center">מרכז</option><option value="south">דרום</option></select></label></div><div class="workspace"><section class="map-panel"><div class="map-tools"><button id="zoom-in" aria-label="התקרבות">+</button><button id="zoom-out" aria-label="התרחקות">−</button><button id="fit">כל האזור</button><span class="muted">גרירה להזזה · צביטה להגדלה</span></div><svg id="map" aria-label="מפת ערים בישראל"></svg></section><aside class="panel"><div class="kicker" id="label"></div><h2 id="prompt"></h2><div id="answer"></div><p id="feedback" class="feedback" aria-live="polite"></p><div id="detail"></div><div class="muted" id="stat"></div></aside></div>';
  cityTierControl($("map-filters"), () => {
    selected = null;
    mapView();
  });
  $("area").value = region;
  $("area").onchange = (e) => {
    if (current === "place") pausePlacementRun();
    region = e.target.value;
    selected = null;
    if (current === "place" && placementMode === "blind") score = round = 0;
    mapView();
  };
  $("label").textContent = isExplore() ? "מכירים את הסביבה" : "מסמנים על המפה";
  if (isExplore()) {
    $("prompt").textContent = "איזה מקום מסקרן אותך?";
    $("answer").innerHTML =
      '<label>חיפוש עיר<input id="search" list="city-options" placeholder="למשל: נס ציונה" autocomplete="off"></label><datalist id="city-options"></datalist>';
    cityPool().forEach((c) => {
      const o = document.createElement("option");
      o.value = c.he;
      $("city-options").append(o);
    });
    $("search").onchange = () => {
      const q = norm($("search").value),
        c = cityPool().find((c) =>
          [c.name, c.he, ...c.alternatenames].some((n) => norm(n) === q),
        );
      if (c) selectCity(c);
      else
        $("feedback").textContent =
          "העיר לא נמצאה ברשימה שבחרתם. נסו כתיב אחר או הרחיבו את הטווח.";
    };
    $("detail").innerHTML =
      "<p>מתמקדים בעיר כדי לראות את המקומות הקרובים אליה. הגדילו אזורים צפופים כדי לבחור בנוחות.</p>";
  } else {
    const modeLabel = document.createElement("label");
    modeLabel.innerHTML = 'תצוגה <select id="placement-mode"></select>';
    $("map-filters").append(modeLabel);
    const modeSelect = $("placement-mode");
    for (const [value, label] of Object.entries(placementLabels))
      modeSelect.add(new Option(label, value));
    modeSelect.value = placementMode;
    modeSelect.onchange = () => {
      pausePlacementRun();
      placementMode = modeSelect.value;
      score = round = 0;
      mapView();
      $("placement-mode").focus({ preventScroll: true });
    };
    $("prompt").setAttribute("aria-live", "polite");
    const toolbar = $("content").querySelector(".map-tools");
    const canvas = moveMapControls();
    toolbar.classList.add("placement-header");
    toolbar.replaceChildren($("prompt"));
    $("content")
      .querySelector(".workspace")
      .classList.add("placement-workspace");
    const clock = document.createElement("time");
    clock.id = "placement-clock";
    clock.dir = "ltr";
    clock.setAttribute("aria-label", "זמן הסיבוב");
    $("prompt").after(clock);
    const play = button(
      "▶ שחקו",
      resumePlacementRun,
      toolbar,
      "placement-play",
    );
    play.id = "placement-play";
    const history = button(
      "היסטוריית סיבובים",
      showPlacementHistory,
      $("map-filters"),
    );
    history.setAttribute("aria-haspopup", "dialog");
    if (placementMode === "blind") {
      $("feedback").classList.add("placement-feedback");
      canvas.after($("feedback"));
    }
    setupPlacementRun();
  }
  if (current === "roads") {
    $("road-control")?.remove();
    const l = document.createElement("label");
    l.id = "road-control";
    l.textContent = "כביש ";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "בחירת כביש");
    [
      ["all", "כל הצירים"],
      ...["1", "2", "4", "6", "40", "90"].map((x) => [x, x]),
    ].forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      select.append(o);
    });
    select.value = roadNumber;
    select.onchange = () => {
      roadNumber = select.value;
      drawMap();
    };
    l.append(select);
    $("map-filters").append(l);
    $("detail").innerHTML =
      "<p>שכבת צירים נבחרים מתוך מאגר ROUTES. הכיסוי חלקי, ואין כאן חישוב מסלול נסיעה. בחרו עיר כדי לקשר אותה לצירים בסביבה.</p>";
  }
  drawMap();
}

function formatPlacementTime(ms) {
  const seconds = Math.floor(ms / 1000);
  return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
}

function updatePlacementClock() {
  const clock = $("placement-clock");
  if (!clock || !placementRun) return;
  const elapsed = placementElapsed();
  clock.textContent = formatPlacementTime(elapsed);
  clock.dateTime = "PT" + Math.floor(elapsed / 1000) + "S";
}

function placementElapsed() {
  return (
    placementRun.accrued +
    (placementRun.started === null
      ? 0
      : performance.now() - placementRun.started)
  );
}

function savePlacementRun() {
  if (!placementRun || placementRun.elapsed !== null) return;
  placementSaves[placementRun.key] = {
    order: placementRun.cities.map((city) => city.geonameid),
    found: [...discoveredCities],
    elapsed: placementElapsed(),
    target: target?.geonameid,
    attempts: round,
    score,
    misses: cityMisses,
  };
  writePlacementStorage(placementProgressKey, placementSaves);
}

function pausePlacementRun() {
  if (!placementRun || placementRun.started === null) return;
  placementRun.accrued = placementElapsed();
  placementRun.started = null;
  clearInterval(cityClockInterval);
  savePlacementRun();
}

window.addEventListener("pagehide", () => {
  if (current === "place" && placementRun && placementRun.started !== null)
    savePlacementRun();
});

function setupPlacementRun(fresh = false) {
  clearInterval(cityClockInterval);
  const settings = { tier: String(cityLimit), region, mode: placementMode };
  writePlacementStorage(placementSettingsKey, settings);
  const tier = $("city-tier").value;
  const key = [tier, settings.region, settings.mode].join("/");
  const pool = cityPool();
  const saved = fresh ? null : placementSaves[key];
  const byId = new Map(pool.map((city) => [city.geonameid, city]));
  const valid =
    Array.isArray(saved?.order) &&
    saved.order.length === pool.length &&
    new Set(saved.order).size === pool.length &&
    saved.order.every((id) => byId.has(id)) &&
    Array.isArray(saved.found);
  discoveredCities.clear();
  if (valid)
    saved.found
      .filter((id) => byId.has(id))
      .forEach((id) => discoveredCities.add(id));
  target = valid ? byId.get(saved.target) : null;
  round = valid ? saved.attempts : 0;
  score = valid ? saved.score : 0;
  cityMisses = valid ? saved.misses : 0;
  placementRun = {
    key,
    tier,
    cities: valid ? saved.order.map((id) => byId.get(id)) : d3.shuffle(pool),
    accrued: valid ? saved.elapsed : 0,
    started: null,
    elapsed: null,
  };
  updatePlacementClock();
  $("placement-play").textContent = valid ? "▶ המשך" : "▶ שחקו";
  $("placement-play").hidden = !pool.length;
  $("prompt").textContent = pool.length ? "איפה העיר?" : "אין ערים בטווח הזה";
  $("feedback").textContent = "";
  $("answer").textContent = pool.length
    ? "השעון יתחיל כשתלחצו על שחקו."
    : "בחרו אזור אחר או הגדילו את מספר הערים.";
  updatePlacementScore();
}

function resumePlacementRun() {
  if (!placementRun.cities.length || placementRun.started !== null) return;
  placementRun.started = performance.now();
  cityClockInterval = setInterval(updatePlacementClock, 250);
  $("placement-play").hidden = true;
  if (target && !discoveredCities.has(target.geonameid)) showCityQuestion();
  else nextCityQuestion();
  savePlacementRun();
}

function finishPlacementRun() {
  if (placementRun.elapsed !== null) return;
  placementRun.accrued = placementElapsed();
  placementRun.elapsed = placementRun.accrued;
  placementRun.started = null;
  clearInterval(cityClockInterval);
  updatePlacementClock();
  try {
    const saved = JSON.parse(
      localStorage.getItem(placementHistoryKey) || "null",
    );
    if (Array.isArray(saved)) placementHistory = saved;
  } catch {}
  delete placementSaves[placementRun.key];
  writePlacementStorage(placementProgressKey, placementSaves);
  placementHistory = [
    {
      date: new Date().toISOString(),
      mode: placementMode,
      region,
      tier: placementRun.tier,
      count: placementRun.cities.length,
      attempts: round,
      elapsed: placementRun.elapsed,
    },
    ...placementHistory,
  ].slice(0, 100);
  try {
    localStorage.setItem(placementHistoryKey, JSON.stringify(placementHistory));
  } catch {}
}

function showPlacementHistory() {
  const dialog = document.createElement("dialog");
  dialog.className = "placement-history";
  dialog.setAttribute("aria-labelledby", "placement-history-title");
  dialog.innerHTML = '<h2 id="placement-history-title">היסטוריית סיבובים</h2>';
  const displayDate = new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const regions = {
    all: "כל הארץ",
    north: "צפון",
    center: "מרכז",
    south: "דרום",
  };
  if (!placementHistory.length) {
    const empty = document.createElement("p");
    empty.textContent = "כאן יופיעו הסיבובים שסיימתם.";
    dialog.append(empty);
  }
  for (const entry of placementHistory) {
    const row = document.createElement("p");
    row.className = "placement-history-row";
    const duration = document.createElement("time");
    duration.dir = "ltr";
    duration.textContent = formatPlacementTime(entry.elapsed);
    const description = document.createElement("span");
    const tier =
      entry.tier === "Infinity" ? "כל הערים" : entry.tier + " הגדולות";
    description.textContent = [
      tier,
      regions[entry.region],
      placementLabels[entry.mode],
      entry.count + " ערים",
      entry.attempts + " ניסיונות",
      displayDate.format(new Date(entry.date)),
    ].join(" · ");
    row.append(duration, description);
    dialog.append(row);
  }
  button("סגירה", () => dialog.close(), dialog);
  dialog.addEventListener("close", () => dialog.remove(), { once: true });
  $("content").append(dialog);
  dialog.showModal();
}

function nextCityQuestion() {
  clearTimeout(cityAdvanceTimer);
  const pool = placementRun.cities;
  const previous = pool.indexOf(target);
  const ordered = [...pool.slice(previous + 1), ...pool.slice(0, previous + 1)];
  target = ordered.find((city) => !discoveredCities.has(city.geonameid));
  cityMisses = 0;
  showCityQuestion();
  savePlacementRun();
}

function showCityQuestion() {
  const pool = placementRun.cities;
  finished = false;
  $("prompt").textContent =
    target?.he ?? (pool.length ? "כל הערים נמצאו!" : "אין ערים בטווח הזה");
  $("feedback").textContent = "";
  delete $("feedback").dataset.tone;
  $("answer").replaceChildren();
  if (target) {
    $("answer").innerHTML =
      placementMode === "blind"
        ? "<p>נחשו איפה העיר. הגבול שלה יופיע כשתמצאו אותה.</p>"
        : "<p>בחרו את העיר על המפה. נגיעה קרובה לגבול נספרת.</p>";
    if (placementMode !== "blind")
      button("לגלות את המיקום", reveal, $("answer"));
    button("עיר אחרת", nextCityQuestion, $("answer"));
  } else if (pool.length) {
    button(
      "▶ סיבוב חדש",
      () => {
        setupPlacementRun(true);
        syncDiscoveredCities();
        resumePlacementRun();
      },
      $("answer"),
      "placement-play",
    );
  } else {
    $("answer").textContent = "בחרו אזור אחר או הגדילו את מספר הערים.";
  }
  updatePlacementScore();
  g?.selectAll(".reveal").classed("reveal", false).classed("hint-pulse", false);
  g?.selectAll(".guess,.guess-distance,.city-label").remove();
}

function updatePlacementScore() {
  $("stat").textContent =
    `${discoveredCities.size} מתוך ${placementRun.cities.length} ערים נמצאו · ${round} ניסיונות`;
}

function syncDiscoveredCities() {
  const blind = current === "place" && placementMode === "blind";
  g.selectAll(".city")
    .classed(
      "city-hidden",
      (city) => blind && !discoveredCities.has(city.geonameid),
    )
    .classed(
      "city-discovered",
      (city) => blind && discoveredCities.has(city.geonameid),
    );
}

function cityNearTap(point, hitAreas, tolerance, scale) {
  let closest = null;
  let bestSquared = (tolerance / scale) ** 2;
  for (const { city, rings } of hitAreas) {
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i++) {
        const [ax, ay] = ring[i - 1],
          [bx, by] = ring[i];
        const dx = bx - ax,
          dy = by - ay;
        const lengthSquared = dx * dx + dy * dy;
        if (!lengthSquared) continue;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((point[0] - ax) * dx + (point[1] - ay) * dy) / lengthSquared,
          ),
        );
        const boundary = [ax + t * dx, ay + t * dy];
        const squared =
          (point[0] - boundary[0]) ** 2 + (point[1] - boundary[1]) ** 2;
        if (squared >= bestSquared) continue;
        bestSquared = squared;
        closest = { city, boundary };
      }
    }
  }
  if (!closest) return null;
  const distance = d3.geoDistance(
    projection.invert(point),
    projection.invert(closest.boundary),
  );
  return distance * 6371 <= 4 ? closest.city : null;
}
function cityTravel() {
  $("content").innerHTML =
    '<div class="toolbar compact-filters" id="travel-filters"></div>' +
    '<div class="workspace travel-workspace"><section class="map-panel"><div class="map-tools"><strong id="travel-prompt"></strong>' +
    '<button id="zoom-in" aria-label="התקרבות">+</button><button id="zoom-out" aria-label="התרחקות">−</button>' +
    '<button id="fit">איפוס</button></div><p id="journey-map-status" class="journey-map-status" hidden></p><svg id="map" aria-label="מפת מסלול בין רשויות"></svg></section>' +
    '<aside class="panel"><p>בחרו עיר במפה או חפשו לפי שם. רק גבול משותף מאפשר התקדמות. המעבר האחרון מתבצע אוטומטית.</p>' +
    '<form id="travel-form"><input id="travel-input" list="travel-cities" aria-label="שם העיר" placeholder="שם העיר" autocomplete="off">' +
    '<datalist id="travel-cities"></datalist><button type="submit">ניחוש</button></form>' +
    '<p id="travel-feedback" class="feedback" role="status"></p><div id="travel-results"></div></aside></div>';
  moveMapControls();
  cityTierControl($("travel-filters"), cityTravel, "all");
  button("מסלול חדש", cityTravel, $("travel-filters"));
  const endpoints = cityPool("all");
  const pairs = [];
  for (const city of endpoints) {
    const distances = borderDistances(cityBorders, city.geonameid);
    for (const goal of endpoints) {
      const distance = distances.get(goal.geonameid);
      if (distance >= 2 && distance <= 6)
        pairs.push([city.geonameid, goal.geonameid]);
    }
  }
  const previous = cityJourney;
  cityRoutePreview = null;
  const newPairs = pairs.filter(
    ([from, to]) => from !== previous?.start || to !== previous?.goal,
  );
  const pair = sample(newPairs.length ? newPairs : pairs);
  cityJourney = pair ? borderRound(cityBorders, ...pair) : null;
  if (!cityJourney) {
    $("travel-prompt").textContent = "אין מסלול בטווח הזה";
    $("travel-feedback").textContent = "בחרו טווח ערים רחב יותר.";
    $("travel-form").hidden = true;
  } else {
    $("travel-prompt").textContent =
      cityName(cityJourney.start) + " ← " + cityName(cityJourney.goal);
    for (const city of cities) {
      const option = document.createElement("option");
      option.value = city.he;
      $("travel-cities").append(option);
    }
    $("travel-form").onsubmit = (event) => {
      event.preventDefault();
      const input = $("travel-input");
      const value = norm(input.value);
      const city = cities.find((c) =>
        [c.he, c.name, ...c.alternatenames].some(
          (alias) => norm(alias) === value,
        ),
      );
      guessCityBorder(city);
      input.value = "";
    };
  }
  showCityTravelResults();
  drawMap();
}

function guessCityBorder(city) {
  if (!cityJourney || cityJourney.complete) return;
  const previousLength = cityJourney.path.length;
  const result = city && cityJourney.guess(city.geonameid);
  const feedback = $("travel-feedback");
  feedback.textContent = result
    ? borderFeedback(cityJourney, result, cityName, "he")
    : "בחרו עיר אחרת במפה או לפי שם.";
  animateFeedback(
    feedback,
    result
      ? { optimal: "right", later: "right", near: "hint", far: "wrong" }[
          result.kind
        ]
      : "neutral",
  );
  $("travel-form").hidden = cityJourney.complete;
  showCityTravelResults();
  paintCityJourney(result ? { result, previousLength } : null);
}

function showCityTravelResults() {
  renderBorderMapStatus($("journey-map-status"), cityJourney, cityName, "he");
  renderBorderRoute(
    $("travel-results"),
    cityJourney,
    cityName,
    "he",
    (path) => {
      cityRoutePreview = path;
      paintCityJourney();
    },
  );
}

function paintCityJourney(effect) {
  if (current !== "travel" || !cityJourney) return;
  const path = cityRoutePreview || cityJourney.path;
  const lastTurn = cityRoutePreview ? null : cityJourney.turns.at(-1);
  const offRoute =
    lastTurn && lastTurn.kind !== "optimal" ? lastTurn.node : null;
  svg.classed("journey-arrived", cityJourney.complete);
  g.selectAll("[data-city]")
    .classed("journey-visited", (city) => path.includes(city.geonameid))
    .classed(
      "journey-destination",
      (city) => city.geonameid === cityJourney.goal,
    )
    .classed("journey-latest", false)
    .attr("data-route-feedback", (city) =>
      city.geonameid === offRoute ? lastTurn.kind : null,
    )
    .style(
      "--journey-delay",
      (city) => (path.length - 1 - path.indexOf(city.geonameid)) * 75 + "ms",
    );
  const latest = g.select('[data-city="' + path.at(-1) + '"]').node();
  if (
    latest &&
    !cityJourney.complete &&
    cityJourney.turns.at(-1)?.moved &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    latest.getAnimations().forEach((animation) => animation.cancel());
    latest.animate(
      [{ filter: "brightness(1.65)" }, { filter: "brightness(1)" }],
      { duration: 350, easing: "ease-out" },
    );
  }
  const points = path.map((id) => {
    const city = cityById.get(id);
    return projection([city.longitude, city.latitude]);
  });
  g.selectAll(".journey-connection")
    .filter(function () {
      return !this.classList.contains("journey-drawing");
    })
    .data([points])
    .join("path")
    .attr("class", "journey-connection")
    .attr("d", d3.line());
  g.selectAll(".journey-stop-dot")
    .data(points)
    .join("circle")
    .attr("class", "journey-stop-dot")
    .attr("r", 3)
    .attr("cx", (point) => point[0])
    .attr("cy", (point) => point[1]);
  if (effect?.result.moved) {
    const newLeg = points.slice(effect.previousLength - 1);
    const flash = g
      .append("path")
      .attr("class", "journey-connection journey-drawing")
      .attr("pathLength", 1)
      .attr("d", d3.line()(newLeg));
    flash.on("animationend", () => flash.remove());
  }
  const wrong = offRoute && g.select('[data-city="' + offRoute + '"]').node();
  if (
    effect &&
    wrong &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    wrong.animate(
      [{ filter: "brightness(1.8)" }, { filter: "brightness(1)" }],
      { duration: 650, easing: "ease-out" },
    );
}

function drawMap() {
  svg = d3.select("#map").on("contextmenu", (event) => event.preventDefault());
  svg.selectAll("*").remove();
  svg
    .property("__zoom", d3.zoomIdentity)
    .classed("journey-map", current === "travel");
  const w = $("map").clientWidth,
    h = $("map").clientHeight;
  projection = d3.geoMercator().fitExtent(
    [
      [35, 30],
      [w - 35, h - 30],
    ],
    {
      type: "MultiPoint",
      coordinates:
        current === "travel" && cityJourney
          ? [...cityJourney.distance.keys()].map((id) => {
              const city = cityById.get(id);
              return [city.longitude, city.latitude];
            })
          : region === "north"
            ? [
                [34.8, 32.4],
                [35.9, 33.35],
              ]
            : region === "center"
              ? [
                  [34.45, 31.45],
                  [35.6, 32.55],
                ]
              : region === "south"
                ? [
                    [34.2, 29.5],
                    [35.5, 31.55],
                  ]
                : [
                    [34.2, 29.5],
                    [35.9, 33.35],
                  ],
    },
  );
  g = svg.append("g");
  g.selectAll(".land")
    .data(topojson.feature(world, world.objects.countries).features)
    .join("path")
    .attr("class", "land")
    .attr("d", d3.geoPath(projection))
    .attr("fill", "#29464b")
    .attr("stroke", "#648b88")
    .attr("stroke-width", 0.6);
  if (isExplore()) {
    const visible = roads.features.filter(
      (f) =>
        roadNumber === "all" || String(f.properties.ROADNUM) === roadNumber,
    );
    g.selectAll(".road")
      .data(visible)
      .join("path")
      .attr("class", "road")
      .attr("d", d3.geoPath(projection))
      .attr("fill", "none")
      .attr("stroke", "#d1b47e")
      .attr("stroke-width", current === "roads" ? 2.5 : 1)
      .attr("stroke-opacity", current === "roads" ? 0.95 : 0.5)
      .attr("vector-effect", "non-scaling-stroke")
      .append("title")
      .text((f) => "כביש " + f.properties.ROADNUM);
  }
  const showAllBorders = current === "place" && placementMode === "all";
  const shown = current === "travel" || showAllBorders ? cities : cityPool();
  const pickable = isExplore() || (current === "travel" && !!cityJourney);
  g.selectAll(".city")
    .data(shown)
    .join("path")
    .attr("class", "city")
    .attr("d", (c) => d3.geoPath(projection)(municipalities.get(c.geonameid)))
    .attr("data-city", (c) => c.geonameid)
    .classed("explorable", pickable)
    .attr("vector-effect", "non-scaling-stroke")
    .attr("role", pickable ? "button" : null)
    .attr("tabindex", pickable ? 0 : null)
    .attr("aria-label", (c) => (pickable ? c.he : null))
    .on("click", (e, c) => {
      if (!pickable) return;
      e.stopPropagation();
      if (current === "travel") guessCityBorder(c);
      else selectCity(c);
    })
    .on("keydown", (e, c) => {
      if ((e.key === "Enter" || e.key === " ") && pickable) {
        e.preventDefault();
        if (current === "travel") guessCityBorder(c);
        else selectCity(c);
      }
    });
  g.selectAll(".road").attr("pointer-events", "none").raise();
  syncDiscoveredCities();
  if (isExplore()) labels(shown.slice(0, 10));
  if (current === "travel") {
    g.selectAll(".city")
      .append("title")
      .text((city) => city.he);
    paintCityJourney();
  }
  mapZoom = d3
    .zoom()
    .clickDistance(5)
    .scaleExtent([1, 18])
    .on("zoom", (e) => {
      g.attr("transform", e.transform);
      g.selectAll(".city-label")
        .style("font-size", `${14 / e.transform.k}px`)
        .style("stroke-width", `${4 / e.transform.k}px`);
    });
  svg.call(mapZoom).on("dblclick.zoom", null);
  $("zoom-in").onclick = () => svg.call(mapZoom.scaleBy, 1.6);
  $("zoom-out").onclick = () => svg.call(mapZoom.scaleBy, 1 / 1.6);
  $("fit").onclick = () => svg.call(mapZoom.transform, d3.zoomIdentity);
  const hitAreas =
    current === "place"
      ? shown.map((city) => ({
          city,
          rings: municipalities
            .get(city.geonameid)
            .geometry.coordinates.flat()
            .map((ring) => ring.map(projection)),
        }))
      : [];
  // Chrome can adjust the synthesized click toward nearby elements. Preserve
  // the position of the finger and still let D3 suppress clicks after pans.
  let lastTouch = null;
  svg.on(
    "touchend.placement",
    (event) => {
      lastTouch = d3.pointer(event.changedTouches[0], svg.node());
    },
    { capture: true },
  );
  svg.on("click.place", (e) => {
    if (
      current !== "place" ||
      !target ||
      finished ||
      placementRun.started === null ||
      e.defaultPrevented
    )
      return;
    const transform = d3.zoomTransform(svg.node());
    const touch =
      e.pointerType === "touch" || e.sourceCapabilities?.firesTouchEvents;
    const point = transform.invert(
      touch && lastTouch ? lastTouch : d3.pointer(e, svg.node()),
    );
    lastTouch = null;
    const blind = placementMode === "blind";
    const coordinates = projection.invert(point);
    const direct =
      (!touch && e.target.closest(".city")?.__data__) ||
      ((blind || touch) &&
        shown.find((city) =>
          d3.geoContains(municipalities.get(city.geonameid), coordinates),
        ));
    const picked =
      direct || cityNearTap(point, hitAreas, touch ? 24 : 14, transform.k);
    if (!picked && !blind) return;
    round++;
    const correct = picked === target;
    if (correct && cityMisses < 3) score++;
    if (!correct) cityMisses++;
    if (correct) {
      discoveredCities.add(target.geonameid);
      if (blind) syncDiscoveredCities();
      if (discoveredCities.size === placementRun.cities.length)
        finishPlacementRun();
    }
    const km =
      blind && !correct
        ? Math.round(
            d3.geoDistance(coordinates, [target.longitude, target.latitude]) *
              6371,
          )
        : null;
    $("feedback").textContent = correct
      ? placementRun.elapsed === null
        ? "בול! מיד עוברים לעיר הבאה."
        : "בול! כל הערים נמצאו."
      : blind
        ? `כ־${km} ק״מ מנקודת הייחוס של העיר. נסו שוב.`
        : `זו ${picked.he}. נסו שוב.`;
    updatePlacementScore();
    savePlacementRun();
    g.selectAll(".guess").remove();
    g.append("circle")
      .attr("class", "guess")
      .attr("cx", point[0])
      .attr("cy", point[1])
      .attr("r", 7)
      .attr("fill", "#e4b58b");
    animateFeedback(
      $("feedback"),
      correct ? "right" : !blind && cityMisses >= 3 ? "hint" : "wrong",
    );
    if (correct) {
      g.selectAll(".guess").remove();
      if (!blind && cityMisses >= 3)
        $("feedback").textContent = "מצאתם בעזרת הרמז.";
      reveal();
      cityAdvanceTimer = setTimeout(nextCityQuestion, 900);
    } else if (!blind && cityMisses >= 3) {
      $("feedback").textContent = "לחצו בתוך השטח המהבהב כדי למצוא את העיר.";
      showCityAnswer(true);
    }
  });
}
function labels(list) {
  g.selectAll(".city-label").remove();
  g.selectAll(".city-label")
    .data(list)
    .join("text")
    .attr("class", "city-label capital-label")
    .attr("x", (c) => projection([c.longitude, c.latitude])[0] + 9)
    .attr("y", (c) => projection([c.longitude, c.latitude])[1] - 6)
    .text((c) => c.he)
    .style("font-size", `${14 / d3.zoomTransform(svg.node()).k}px`)
    .style("stroke-width", `${4 / d3.zoomTransform(svg.node()).k}px`);
}
function selectCity(c) {
  selected = c;
  $("prompt").textContent = c.he;
  const neighbors = cityPool()
    .filter((x) => x !== c)
    .map((x) => ({
      c: x,
      km:
        d3.geoDistance([c.longitude, c.latitude], [x.longitude, x.latitude]) *
        6371,
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 4);
  $("feedback").textContent = "בסביבה הקרובה";
  $("detail").replaceChildren();
  neighbors.forEach((n) =>
    button(
      `${n.c.he} · ${Math.round(n.km)} ק״מ`,
      () => selectCity(n.c),
      $("detail"),
    ),
  );
  const photo = cityPhotos[c.name];
  if (photo)
    $("detail").append(creditedPhoto(photo, photo.title, "city-photo"));
  $("stat").textContent = "מרחקים בקו אווירי, לא מרחקי נסיעה.";
  const p = projection([c.longitude, c.latitude]);
  svg.call(
    mapZoom.transform,
    d3.zoomIdentity
      .translate($("map").clientWidth / 2, $("map").clientHeight / 2)
      .scale(4)
      .translate(-p[0], -p[1]),
  );
  labels([c]);
  g.selectAll(".city").classed("selected", (city) => city === c);
}
function reveal() {
  finished = true;
  showCityAnswer(false);
}
function showCityAnswer(hint) {
  const p = projection([target.longitude, target.latitude]);
  g.selectAll(".reveal").classed("reveal", false).classed("hint-pulse", false);
  g.selectAll(".guess-distance").remove();
  const guess = g.select(".guess");
  if (!hint && !guess.empty()) {
    g.append("line")
      .attr("class", "guess-distance")
      .attr("x1", guess.attr("cx"))
      .attr("y1", guess.attr("cy"))
      .attr("x2", p[0])
      .attr("y2", p[1])
      .attr("vector-effect", "non-scaling-stroke")
      .attr("stroke", "#e4b58b")
      .attr("stroke-dasharray", "4 4");
  }
  g.selectAll(".city")
    .filter((city) => city === target)
    .classed("reveal", true)
    .classed("hint-pulse", hint)
    .raise();
  g.selectAll(".guess-distance,.guess").raise();
  labels([target]);
  if (hint) {
    const screen = d3.zoomTransform(svg.node()).apply(p);
    if (
      screen[0] < 0 ||
      screen[0] > $("map").clientWidth ||
      screen[1] < 0 ||
      screen[1] > $("map").clientHeight
    ) {
      svg.call(mapZoom.transform, d3.zoomIdentity);
    }
  }
}
function quizPanel(title) {
  $("content").innerHTML =
    `<section class="panel" style="max-width:760px"><div class="kicker">סיבוב ${round + 1}</div><h2>${title}</h2><div class="answers" id="answers"></div><p class="feedback" id="feedback" aria-live="polite"></p><div id="next"></div></section>`;
}
function directionRound() {
  const candidates = cityPool("all");
  const a = sample(candidates);
  const b = sample(
    candidates.filter((c) => Math.abs(c.latitude - a.latitude) > 0.3),
  );
  const correct = a.latitude > b.latitude ? a : b;
  quizPanel("איזו עיר צפונית יותר?");
  cityTierControl($("content").querySelector(".panel"), directionRound, "all");
  [a, b].forEach((c) => {
    const option = button(
      c.he,
      () => {
        if ($("next").childElementCount) return;
        if (c === correct) score++;
        [...$("answers").children].forEach((el, i) => {
          el.disabled = true;
          if ([a, b][i] === correct || el === option)
            showQuizAnswer(el, [a, b][i] === correct);
        });
        $("feedback").textContent =
          correct.he +
          " צפונית יותר בכ־" +
          Math.round(Math.abs(a.latitude - b.latitude) * 111) +
          " ק״מ בכיוון צפון–דרום.";
        animateFeedback($("feedback"), c === correct ? "right" : "wrong");
        drawComparison(a, b, correct);
        round++;
        $("next").insertAdjacentHTML(
          "beforeend",
          '<p class="muted">' + score + " תשובות נכונות מתוך " + round + "</p>",
        );
        button("הזוג הבא", directionRound, $("next"));
      },
      $("answers"),
    );
  });
}
function drawComparison(a, b, north) {
  const coords = (c) => [c.longitude, c.latitude];
  const svg = d3
    .select($("next"))
    .append("svg")
    .attr("class", "comparison-map")
    .attr("viewBox", "0 0 520 310")
    .attr("role", "img")
    .attr("aria-label", north.he + " צפונית יותר");
  const projection = d3.geoMercator().fitExtent(
    [
      [140, 55],
      [380, 260],
    ],
    { type: "MultiPoint", coordinates: [coords(a), coords(b)] },
  );
  const land = topojson.feature(world, world.objects.countries);
  svg
    .append("path")
    .datum(land)
    .attr("d", d3.geoPath(projection))
    .attr("fill", "#28474b")
    .attr("stroke", "#648b88");
  svg
    .append("text")
    .attr("x", 32)
    .attr("y", 35)
    .attr("fill", "#ecedf0")
    .text("↑ N");
  for (const city of [a, b]) {
    const [x, y] = projection(coords(city));
    const color = city === north ? "#b9e9cb" : "#f4d294";
    svg
      .append("line")
      .attr("x1", 36)
      .attr("x2", 484)
      .attr("y1", y)
      .attr("y2", y)
      .attr("stroke", color)
      .attr("stroke-dasharray", "4 5")
      .attr("opacity", 0.65);
    svg
      .append("circle")
      .attr("cx", x)
      .attr("cy", y)
      .attr("r", 6)
      .attr("fill", color);
    svg
      .append("text")
      .attr("x", x + 12)
      .attr("y", y - 10)
      .attr("class", "capital-label")
      .text(city.he);
  }
}
const leaderQuestions = [
  [1957, 0],
  [1954, 1],
  [1965, 2],
  [1971, 3],
  [1975, 4],
  [1980, 5],
  [1988, 6],
  [1985, 7],
  [1997, 8],
  [2000, 9],
  [2003, 10],
  [2008, 11],
  [2021, 12],
  [2022, 13],
];
function creditedPhoto(photo, alt, className) {
  const figure = document.createElement("figure");
  figure.className = className;
  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = alt;
  const caption = document.createElement("figcaption");
  caption.dir = "ltr";
  const credit = document.createElement("a");
  credit.href = photo.source;
  credit.target = "_blank";
  credit.rel = "noopener";
  credit.textContent = photo.credit;
  caption.append(credit, " · resized");
  figure.append(img, caption);
  return figure;
}
function makeLeaderPortrait(index) {
  const photo = leaderPortraits[index];
  return photo ? creditedPhoto(photo, pms[index][0], "leader-portrait") : null;
}
function showLeaderReview(index, parent) {
  const [, , fact, url] = pms[index];
  const profile = document.createElement("section");
  profile.className = "leader-review";
  const portrait = makeLeaderPortrait(index);
  if (portrait) profile.append(portrait);
  const detail = document.createElement("div");
  const context = document.createElement("p");
  context.textContent = fact;
  const source = document.createElement("a");
  source.href = url;
  source.target = "_blank";
  source.rel = "noopener";
  source.textContent = "לקריאה נוספת ↗";
  detail.append(context, source);
  profile.append(detail);
  parent.append(profile);
}
function leaderRound() {
  const [year, index] = sample(leaderQuestions);
  quizPanel("מי היה ראש הממשלה ביולי " + year + "?");
  const choices = d3.shuffle([
    index,
    ...d3.shuffle(pms.map((_, i) => i).filter((i) => i !== index)).slice(0, 3),
  ]);
  const buttons = new Map();
  let mistakes = 0,
    done = false;
  for (const i of choices) {
    const option = button(
      pms[i][0],
      () => {
        if (done) return;
        if (i !== index) {
          showQuizAnswer(option, false);
          option.disabled = true;
          mistakes++;
          if (mistakes === 3)
            buttons.get(index).classList.add("hint-pulse", "answer-correct");
          $("feedback").textContent =
            mistakes === 3 ? "לחצו על התשובה המודגשת." : "נסו שוב.";
          animateFeedback($("feedback"), mistakes === 3 ? "hint" : "wrong");
          return;
        }
        done = true;
        if (!mistakes) score++;
        buttons.forEach((b) => {
          b.disabled = true;
          b.classList.remove("hint-pulse");
        });
        showQuizAnswer(option, true);
        $("feedback").textContent =
          pms[index][0] +
          " כיהן ביולי " +
          year +
          ". תקופות הכהונה: " +
          pms[index][1];
        animateFeedback($("feedback"), "right");
        showLeaderReview(index, $("next"));
        round++;
        $("next").insertAdjacentHTML(
          "beforeend",
          '<p class="muted">' +
            score +
            " תשובות נכונות בניסיון הראשון מתוך " +
            round +
            "</p>",
        );
        button("לשאלה הבאה", leaderRound, $("next"));
      },
      $("answers"),
    );
    buttons.set(i, option);
  }
}
function timeline() {
  const leaders = current === "leaders",
    rows = leaders ? pms : moments;
  $("content").innerHTML =
    '<div class="history-layout"><div class="timeline" id="timeline" aria-label="בחירת תקופה"></div><section class="panel"><div class="kicker">היסטוריה · כיסוי עד 2022</div><h2 id="event-title"></h2><div class="big-number date" id="event-date"></div><div id="event-profile"></div></section></div>';
  rows.forEach((r, i) =>
    button(leaders ? r[0] : `${r[0]} · ${r[1]}`, () => show(i), $("timeline")),
  );
  function show(i) {
    const r = rows[i];
    $("event-title").textContent = leaders ? r[0] : r[1];
    $("event-date").textContent = leaders ? r[1] : r[0];
    const profile = $("event-profile");
    profile.replaceChildren();
    if (leaders) showLeaderReview(i, profile);
    else {
      const body = document.createElement("p");
      body.textContent = r[2];
      const source = document.createElement("a");
      source.href =
        "https://www.gov.il/apps/pmo/history/historyGovernments.html";
      source.target = "_blank";
      source.rel = "noopener";
      source.textContent = "למקור הרשמי ↗";
      profile.append(body, source);
      const portraits = [
        [5],
        [7, 6],
        [8],
        [9],
        [10],
        [],
        [],
        [8],
        [12, 13],
        [8],
      ][i];
      if (portraits.length) {
        const photos = document.createElement("div");
        photos.className = "event-portraits";
        for (const index of portraits) {
          const photo = makeLeaderPortrait(index);
          if (photo) photos.append(photo);
        }
        profile.append(photos);
      }
    }
    [...$("timeline").children].forEach((b, j) =>
      b.classList.toggle("active", j === i),
    );
  }
  show(0);
}
window.addEventListener("resize", () => {
  if (isExplore() || current === "place" || current === "travel") {
    drawMap();
    if (selected) selectCity(selected);
  }
});
render();
function parliament() {
  const parties = [
      ["הליכוד ישראל ביתנו", 31],
      ["יש עתיד", 19],
      ["העבודה", 15],
      ["הבית היהודי", 12],
      ["ש״ס", 11],
      ["יהדות התורה", 7],
      ["התנועה", 6],
      ["מרצ", 6],
      ["רע״ם־תע״ל", 4],
      ["חד״ש", 4],
      ["בל״ד", 3],
      ["קדימה", 2],
    ],
    chosen = new Set();
  $("content").innerHTML =
    '<section class="panel"><div class="kicker">תוצאות הבחירות לכנסת ה־19 · 2013</div><h2>איזה צירוף מגיע לרוב מוחלט?</h2><p>בחרו מפלגות כדי לחבר את מספר המושבים. זהו תרגיל חשבוני בתוצאות הבחירות, ולא הצעה לקואליציה פוליטית.</p><div class="toolbar" id="parties"></div><div class="big-number" id="total"></div><div class="seat-grid" id="seats-grid" style="max-width:650px"></div><p id="result" aria-live="polite"></p><p class="muted">לש״ס וליהדות התורה היו יחד 18 מושבים בבחירות האלה. מספר מושבים אינו מלמד לבדו מי השתתף בממשלה.</p><a target="_blank" rel="noopener" href="https://www.gov.il/apps/elections/eng/list/Results_eng.html">לתוצאות הרשמיות ↗</a></section>';
  parties.forEach(([n, s], i) => {
    const b = button(
      `${n} · ${s}`,
      () => {
        chosen.has(i) ? chosen.delete(i) : chosen.add(i);
        b.classList.toggle("active", chosen.has(i));
        b.setAttribute("aria-pressed", chosen.has(i));
        update();
      },
      $("parties"),
    );
    b.setAttribute("aria-pressed", "false");
  });
  for (let i = 0; i < 120; i++) {
    const s = document.createElement("span");
    s.className = "seat";
    $("seats-grid").append(s);
  }
  function update() {
    const total = [...chosen].reduce((n, i) => n + parties[i][1], 0);
    $("total").textContent = `${total} מתוך 120`;
    $("result").textContent =
      total >= 61
        ? "הגעתם לרוב מוחלט."
        : `חסרים ${61 - total} מושבים לרוב מוחלט.`;
    [...$("seats-grid").children].forEach((s, i) =>
      s.classList.toggle("on", i < total),
    );
  }
  update();
}
