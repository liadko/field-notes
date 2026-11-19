# Learning experiences

Elementle is the starting point for a collection of concise, visual learning experiences. A shared navigation should make it easy to move between them on desktop and phone. Retain the existing page's dark, thoughtful feel, while giving each subject its own accent.

## Geography first

Build a world atlas with a globe for exploration and a flat regional map for quizzes. Include finding a named country, naming countries in a region, capitals, neighboring countries, and shortest border routes. A hot-and-cold country game and optional top-five or top-ten challenges add variety. Offer a study view that shows neighbors, alternative shortest routes, and useful gateways. Explain country and border inclusion rules; make small islands usable. Source and attribute map shapes and country data, and check both desktop and phone interaction.

## Later experiences

- Israel geography: locate cities, learn major roads and junctions, and choose plausible routes between cities.
- Israeli history and politics: an evidence-based timeline of prime ministers, elections, coalitions, parties, wars, agreements and turning points, with sources and clear distinctions between events, stated motives and disputed interpretations.
- World history: a shared timeline with regional filters and games about the order of events and contemporaries.
- Brain regions: an interactive explorer and quizzes grounded in how regions work together.
- Language families: a future family tree and geographic exploration.

Issues: #1 geography, #6 Israel geography, #3 Israeli history and politics, #4 world history, #5 brain regions, #2 language families.

## Israel design direction and current scope

Hebrew first, with RTL navigation and a browsable activity library. Each activity has its own focused workspace rather than a large row of tabs. Use maps for spatial learning, timelines for chronology, and interactive seat displays for political arithmetic. Keep instructions short; keep evidence and historical coverage visible.

Implemented: Hebrew city search and nearby places, placing cities with distance feedback, regional practice, north/south comparisons, prime-minister study and quizzes, selected election turning points through 2022, a 120-seat sandbox, and official 2013 party totals as an interactive exercise. World-map fixes include region-aware globe centering, actual globe dragging, country aliases and mode-specific suggestions, small-country targets and selected-capital labels.

Next: complete Hebrew locality naming audit, road geometry and junction study, route challenges, all-election party-seat histories including Haredi parties, source-linked event narratives with competing interpretations, and more detailed historical maps. Do not imply that a numerical party combination was a real or politically feasible coalition.

Checks: keyboard access, touch-size controls, map zoom and drag, Hebrew and English aliases, hint policy by game, quiz answer leakage, selected-label size under zoom, state retained on resize, RTL and narrow-screen overflow, and source/coverage boundaries.

Road study now includes a partial real-geometry layer for roads 1, 2, 4, 6, 40 and 90, with explicit coverage limits and source attribution. Route planning and junction topology remain future work.

## Brain module

Implemented an English interface with Hebrew region names, 12 introductory landmarks across surface and internal schematic views, a six-activity library, region-location practice with large numbered alternatives, clue deduction, role matching, a four-stage HPA pathway, and misconception checks. Quizzes count unassisted first-try answers and end after a shuffled deck. The atlas remembers explored landmarks locally when storage is available. Explanations link to NIMH, NIDDK, MedlinePlus, SfN, UTHealth and UCL/Corpal sources.

The diagrams are original simplified learning schematics, not anatomical slices or a clinical atlas. Major roles are introduced as associations within networks. Further work could include real anatomical reference imagery, more structures and neural circuits, and a broader hormone module.
