# Project map

FM27 Scout Lab is edited as small files under `src/` and joined into one HTML file by `python build.py`.

To find something, look in these tables first, then open only that file.

## Where each tab lives

Start here when a request names a tab or a part of the screen. All paths are under `src/`.

| Tab or part of the screen | Code | Styling |
| --- | --- | --- |
| Top bar, navigation buttons, Scale selector | `index.html`, clicks in `app/31-import-events-boot.js` | `css/01-layout-topbar.css` |
| Home (incl. weekly action plan, ask a question) | `app/40-home.js` | `css/06-home-player-card.css` |
| My squad: Overview and position tabs | `app/19-my-squad.js` | `css/04-my-squad.css` |
| My squad: My tactic | `app/32-my-tactic-reading.js`, `app/33-my-tactic-analysis.js` | `css/08-planner-my-tactic.css` |
| My squad: Suggested tactic | `app/21-suggested-tactic.js`, `app/22-defensive-shape.js` | `css/04-my-squad.css` |
| My squad: Roles and best XI | `app/20-best-xi.js` | `css/04-my-squad.css` |
| My squad: Planner | `app/35-development-planner.js` | `css/08-planner-my-tactic.css` |
| My squad: Season review | `app/36-effectiveness-season-review.js` | `css/05-scouting-review-learn.css` |
| Data Hub | `app/38-data-hub.js` | `css/07-data-hub.css` |
| Matches (results, last game, next opponent, tactic changes) | `app/41-matches.js` | `css/03-sections-tiles.css` |
| Matches: Diagnose and opposition instructions | `app/44-diagnose.js` | `css/03-sections-tiles.css` |
| Scouting (wonderkids, targets, contracts, shortlist) | `app/34-scouting.js` | `css/05-scouting-review-learn.css` |
| Staff | `app/30-staff.js`, staff review in `app/37-staff-review-similar.js` | `css/03-sections-tiles.css` |
| All data | `app/26-all-data.js`, `app/27-stat-type-scores.js` | `css/09-all-data.css` |
| Stats and Attr views: position tabs, main table, top 5, scatter | `app/18-render.js`, `app/17-charts.js` | `css/01-layout-topbar.css`, `css/02-table-scatter-drawer.css` |
| Player side panel (opens when a player is clicked) | `app/24-player-drawer.js` | `css/02-table-scatter-drawer.css` |
| Player card, traits, similar players (inside the panel) | `app/39-learn-player-card.js`, `app/43-player-traits.js`, `app/37-staff-review-similar.js` | `css/06-home-player-card.css` |
| Learn | `app/39-learn-player-card.js` | `css/05-scouting-review-learn.css` |
| Guide | `app/23-guide.js` | `css/03-sections-tiles.css` |
| Data page (loading saves, cloud copy, linked save folder) | `app/25-save-loading.js`, `app/29-cloud-copy.js`, `app/42-save-folder-export-tactic.js` | `css/10-save-data-position-map.css` |

The styling column is the most likely file, not a guarantee: shared pieces (panels, tiles, tags) are in `css/03-sections-tiles.css`.

**Fastest way to find anything:** search `src/` for the exact words shown on screen (a heading, a button label, a tooltip) or for a CSS class name. Open only the file the search points to.

## Styling (src/css)

How the tool looks. One file per area of the screen.

| File | What it does | Lines | Size |
| --- | --- | ---: | ---: |
| `src/css/01-layout-topbar.css` | Page layout, top bar, loaded files, filters, chips, grid | 125 | 9 KB |
| `src/css/02-table-scatter-drawer.css` | Main player table, scatter chart, player side panel | 89 | 7 KB |
| `src/css/03-sections-tiles.css` | Shared building blocks: sections, tiles, tags, tiers, stacked bars, comparisons | 138 | 12 KB |
| `src/css/04-my-squad.css` | My squad pages and suggested tactic | 97 | 9 KB |
| `src/css/05-scouting-review-learn.css` | Scouting, wide data pages, season review, navigation groups, Learn | 46 | 5 KB |
| `src/css/06-home-player-card.css` | Home page and player card | 34 | 4 KB |
| `src/css/07-data-hub.css` | Data Hub | 79 | 9 KB |
| `src/css/08-planner-my-tactic.css` | Planner and My tactic | 69 | 7 KB |
| `src/css/09-all-data.css` | All data table | 64 | 6 KB |
| `src/css/10-save-data-position-map.css` | Save & data page, position map pitch | 50 | 4 KB |

## The app (src/app)

Everything the tool does, one feature per file. All files share one scope, so a function in any file can be used in any other.

| File | What it does | Lines | Size |
| --- | --- | ---: | ---: |
| `src/app/10-model-metrics-attributes.js` | Scoring model: stat metrics, stat categories, attributes | 166 | 14 KB |
| `src/app/11-model-roles-types-tiers.js` | Scoring model: roles, player types (auto tags), stat impact tiers per position | 157 | 21 KB |
| `src/app/12-league-strength.js` | League strength adjustments | 154 | 15 KB |
| `src/app/13-app-parsing.js` | App start and parsing of FM export files | 119 | 6 KB |
| `src/app/14-dataset-model.js` | Turning loaded data into the scored player model | 152 | 9 KB |
| `src/app/15-analytics-state.js` | Shared analytics, app state and browser storage | 130 | 9 KB |
| `src/app/16-view-helpers-colour.js` | Helpers for the current view, colour scales | 159 | 11 KB |
| `src/app/17-charts.js` | Charts | 205 | 16 KB |
| `src/app/18-render.js` | Main page rendering | 260 | 24 KB |
| `src/app/19-my-squad.js` | My squad | 416 | 35 KB |
| `src/app/20-best-xi.js` | Formation and roles: best XI | 190 | 20 KB |
| `src/app/21-suggested-tactic.js` | Suggested tactic (My squad > Tactic) | 487 | 52 KB |
| `src/app/22-defensive-shape.js` | Out-of-possession shape: every formation scored as a defensive shape | 343 | 42 KB |
| `src/app/23-guide.js` | Guide page | 212 | 35 KB |
| `src/app/24-player-drawer.js` | Player side panel, its back button, position map | 189 | 19 KB |
| `src/app/25-save-loading.js` | Loading an FM save (.fm) into every tab | 265 | 21 KB |
| `src/app/26-all-data.js` | All data: every player in one filterable table | 407 | 38 KB |
| `src/app/27-stat-type-scores.js` | Stat-type scores (percentile ranks, 0-100) | 277 | 24 KB |
| `src/app/28-past-seasons.js` | Past seasons | 138 | 12 KB |
| `src/app/29-cloud-copy.js` | Cloud copy of the loaded save on claude.ai | 170 | 12 KB |
| `src/app/30-staff.js` | Staff pages | 398 | 50 KB |
| `src/app/31-import-events-boot.js` | File import, click/keyboard events, app start-up | 244 | 21 KB |
| `src/app/32-my-tactic-reading.js` | My tactic: reading an FM tactic file, shape helpers, player fit | 275 | 36 KB |
| `src/app/33-my-tactic-analysis.js` | My tactic: analysis, scores, page and events | 328 | 50 KB |
| `src/app/34-scouting.js` | Scouting: wonderkids, transfer targets, contract watch, shortlist | 245 | 25 KB |
| `src/app/35-development-planner.js` | Development snapshots and squad Planner | 129 | 17 KB |
| `src/app/36-effectiveness-season-review.js` | Tactical effectiveness and Season review | 185 | 17 KB |
| `src/app/37-staff-review-similar.js` | Staff review and Similar players | 194 | 77 KB |
| `src/app/38-data-hub.js` | Data Hub: team performance against the league | 249 | 33 KB |
| `src/app/39-learn-player-card.js` | Learn pages, info tips, player card | 138 | 22 KB |
| `src/app/40-home.js` | Home page, weekly action plan, ask-a-question | 180 | 22 KB |
| `src/app/41-matches.js` | Matches: results, last-game review, next opponent, tactic-change log | 249 | 34 KB |
| `src/app/42-save-folder-export-tactic.js` | Linked save folder and exporting a tactic to FM (.fmf) | 229 | 21 KB |
| `src/app/43-player-traits.js` | Player traits and their effect on roles | 199 | 25 KB |
| `src/app/44-diagnose.js` | Diagnose (player, role or system?) and opposition instructions | 179 | 22 KB |

## FM save reader (src/save-reader)

Reads .fm save files. These files are one block of code split into pieces: 02 opens it and 09 closes it, so they are not valid on their own. The build includes them twice (once for the background worker, once for the page), so one edit updates both.

| File | What it does | Lines | Size |
| --- | --- | ---: | ---: |
| `src/save-reader/01-fzstd-library.js` | Third-party fzstd decompression library (one huge minified line). Never edit or read. | 2 | 8 KB |
| `src/save-reader/02-core-layouts.js` | Byte helpers and the FM27 / FM26 save-file layouts | 99 | 10 KB |
| `src/save-reader/03-container-metadata.js` | Opening the .fm file: byte source, container frames, save metadata | 122 | 6 KB |
| `src/save-reader/04-names-clubs.js` | Name pools and the club table | 232 | 11 KB |
| `src/save-reader/05-players.js` | Player records | 162 | 10 KB |
| `src/save-reader/06-team-totals-matches.js` | Team totals and the season's matches (for Data Hub) | 112 | 9 KB |
| `src/save-reader/07-season-stats.js` | Season statistics and archived past seasons | 191 | 10 KB |
| `src/save-reader/08-staff.js` | Staff: coaches, medical, recruitment, directors | 272 | 22 KB |
| `src/save-reader/09-public-api.js` | What the reader hands to the app, and the Scout Lab table format | 182 | 16 KB |

## Built-in example data (src/data)

Demo data shown before a save is loaded. Large. Never read these files; they are not code.

| File | What it does | Lines | Size |
| --- | --- | ---: | ---: |
| `src/data/ex-stats.csv` | Example data: stats export (built-in demo, large; do not read) | 799 | 247 KB |
| `src/data/ex-attr.csv` | Example data: attributes export (built-in demo, large; do not read) | 799 | 94 KB |
| `src/data/ex-squad.csv` | Example data: squad export (built-in demo, large; do not read) | 79 | 47 KB |
| `src/data/ex-dm.csv` | Example data: defensive midfielders (built-in demo, large; do not read) | 131 | 74 KB |
| `src/data/ex-cm.csv` | Example data: central midfielders (built-in demo, large; do not read) | 217 | 122 KB |
| `src/data/ex-st2.csv` | Example data: strikers (built-in demo, large; do not read) | 123 | 72 KB |

## Other files

| File | What it does |
| --- | --- |
| `src/index.html` | The page skeleton (header, navigation buttons) and the ordered list of every file above. Add a new file here or it will not be in the build. |
| `build.py` | Joins `src/` into `dist/fm27-scout-lab.html`. |
| `dist/fm27-scout-lab.html` | The finished tool. Open or publish this one. Never edit it by hand. |
| `fm27-scout-lab-v58.html` | The original single file, kept as a backup. Never edit it. |
