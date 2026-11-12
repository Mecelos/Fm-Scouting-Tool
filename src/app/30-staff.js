// ---------- Staff (from the save): every club's coaches, medical, recruitment and directors ----------
// FM shows staff attributes as words; the save keeps the numbers behind them (most on 1-100, shown here on 1-20).
// Each job is rated as a weighted average of several attributes, so an all-rounder beats a one-attribute specialist:
// main attribute x3, related ones x2, people skills x1.
const SA = {
  attacking: ["Att", "Attacking", "Coaching attacking play: finishing, movement and creating chances."],
  defending: ["Def", "Defending", "Coaching defending: marking, tackling and positioning."],
  possession: ["Pos", "Possession", "Coaching keeping the ball: passing, first touch and composure on the ball."],
  technical: ["Tec", "Technical", "Coaching technique: first touch, dribbling and technique."],
  tactical: ["Tac", "Tactical", "Coaching the tactical side of training, and how accurate his tactical advice to you is."],
  fitness: ["Fit", "Fitness", "Coaching fitness: stamina, pace and strength work."],
  goalkeeping: ["GK", "Goalkeeping", "Coaching goalkeepers: shot stopping, handling and distribution."],
  set_pieces: ["SP", "Set pieces", "Coaching and planning set pieces: corners, free kicks and throw-ins."],
  working_with_youngsters: ["WwY", "Working with youngsters", "How well he develops players aged 18 and under."],
  determination: ["Det", "Determination", "His own drive to succeed. Helps in every job."],
  motivating: ["Mot", "Motivating", "Getting the best out of players in training, team talks and injury recovery."],
  people_management: ["PeM", "People management", "Handling players and staff and keeping them happy."],
  authority: ["Aut", "Authority", "How much players respect him and listen to him; keeps training disciplined."],
  adaptability: ["Ada", "Adaptability", "Settling in a foreign country. Matters for scouts sent abroad."],
  judging_player_ability: ["JPA", "Judging player ability", "How accurately he rates how good a player is now (scout reports, star ratings)."],
  judging_player_potential: ["JPP", "Judging player potential", "How accurately he rates how good a player can become."],
  judging_staff_ability: ["JSA", "Judging staff ability", "How well he rates other staff. For directors who hire staff."],
  negotiating: ["Neg", "Negotiating", "Getting good fees and contracts in transfer and contract talks."],
  tactical_knowledge: ["TKn", "Tactical knowledge", "His understanding of tactics. Drives match advice and opposition reports."],
  physiotherapy: ["Phy", "Physiotherapy", "Treating and preventing injuries; shorter recovery times."],
  sports_science: ["SpS", "Sports science", "Managing workload and injury risk; accuracy of medical reports."],
  analysing_data: ["Dat", "Analysing data", "Reading match and player data; quality of analysis reports."],
};
const SA_GROUPS = [["Coaching", ["attacking", "defending", "possession", "technical", "tactical", "fitness", "goalkeeping", "set_pieces", "working_with_youngsters"]],
  ["Mental", ["determination", "motivating", "people_management", "authority", "adaptability"]],
  ["Knowledge", ["judging_player_ability", "judging_player_potential", "judging_staff_ability", "negotiating", "tactical_knowledge"]],
  ["Medical & data", ["physiotherapy", "sports_science", "analysing_data"]]];
const SA_ORDER = SA_GROUPS.flatMap(g => g[1]);
// FM27's job categories (the dropdowns on the staff screens), in FM's order
const STAFF_JOB_CATS = {
  coach: ["goalkeeping", "defending", "attacking", "fitness", "possession", "technical", "tactical", "set_pieces", "people_management"],
  scout: ["judging_player_potential", "judging_player_ability", "analysing_data"],
  med: ["physiotherapy", "sports_science"],
};
const STAFF_JOB_LABEL = { goalkeeping: "Goalkeeping", defending: "Defence Coaching", attacking: "Attack Coaching", fitness: "Fitness Coaching", possession: "Possession Coaching",
  technical: "Technique Coaching", tactical: "Tactical Coaching", set_pieces: "Set Piece Coaching", people_management: "People Management",
  judging_player_potential: "Judging Player Potential", judging_player_ability: "Judging Player Ability", analysing_data: "Analysing Data", physiotherapy: "Physiotherapy", sports_science: "Sports Science" };
// job codes as the save stores them (the same on FM26 and FM27)
const STAFF_JOBS = { 2: "Coach", 4: "Chairperson", 6: "Director", 8: "Managing Director", 10: "Director of Football", 12: "Physio", 14: "Scout", 16: "Manager",
  20: "Assistant Manager", 22: "Set Piece Coach", 26: "Fitness Coach", 34: "Goalkeeping Coach", 38: "Chief Doctor", 40: "Head of Sports Science", 44: "Chief Scout",
  46: "Doctor", 48: "Sports Scientist", 50: "Head Physio", 58: "Recruitment Analyst", 60: "Performance Analyst", 62: "Head of Performance Analysis",
  64: "Head of Youth Development", 66: "Owner", 70: "President", 86: "Head of Recruitment", 88: "Technical Director" };
const DOCTOR = -2; // a medical-list person the save gives no job (FM26 doctors)
const FREE = -3;   // unemployed: no club, contract or role
const NOCLUB_BOARD = -4; // no club, usually a board member (FM26 keeps no board roles, so owners and chairmen land here)
const BOARD_JOBS = new Set([4, 6, 8, 66, 70, 24, NOCLUB_BOARD]);
const BOARD_USUAL = new Set([4, 6, 8, 66, 70]);
// the save's "usual job" byte: what an unemployed person normally does (80 = a coaching variant)
function usualJob(i) { const u = SAVE.staff.usual ? SAVE.staff.usual[i] : -1; const j = u === 80 ? 2 : u; return STAFF_JOBS[j] && !BOARD_USUAL.has(j) ? j : null; }
const isFreeStaff = i => staffJobCode(i) === FREE;
// people skills: for coaches, Motivating, Determination and Authority drive how well they coach whatever their speciality, so they count x2
const PPL = { motivating: 2, determination: 2, authority: 2, people_management: 1 };
const PEOPLE = new Set(["motivating", "determination", "authority", "people_management"]);
const COACH_JOBS = [2, 20];
const STAFF_ROLES = {
  "All-round coach": { jobs: COACH_JOBS, w: { attacking: 2, defending: 2, possession: 2, technical: 2, tactical: 2, fitness: 1, set_pieces: 1, ...PPL }, d: "Every coaching area plus people skills: the best coaches to have whatever you train." },
  "Attacking coach": { jobs: COACH_JOBS, w: { attacking: 3, technical: 2, possession: 2, tactical: 1, ...PPL }, d: "Attacking, backed by technical and possession coaching and people skills." },
  "Defending coach": { jobs: COACH_JOBS, w: { defending: 3, tactical: 2, tactical_knowledge: 2, ...PPL }, d: "Defending, backed by tactical coaching and knowledge and people skills." },
  "Possession coach": { jobs: COACH_JOBS, w: { possession: 3, technical: 2, tactical: 2, attacking: 1, ...PPL }, d: "Possession, backed by technical and tactical coaching and people skills." },
  "Technical coach": { jobs: COACH_JOBS, w: { technical: 3, possession: 2, attacking: 2, ...PPL }, d: "Technical, backed by possession and attacking coaching and people skills." },
  "Tactical coach": { jobs: COACH_JOBS, w: { tactical: 3, tactical_knowledge: 2, defending: 2, possession: 1, ...PPL }, d: "Tactical, backed by tactical knowledge, defending and people skills." },
  "Fitness coach": { jobs: [26], w: { fitness: 3, sports_science: 2, ...PPL }, d: "Fitness, backed by sports science and people skills." },
  "Goalkeeping coach": { jobs: [34], w: { goalkeeping: 3, technical: 1, ...PPL }, d: "Goalkeeping, plus technical coaching and people skills." },
  "Set piece coach": { jobs: [22], w: { set_pieces: 3, tactical: 2, technical: 1, ...PPL }, d: "Set pieces, backed by tactical and technical coaching and people skills." },
  "Youth coach": { jobs: [2, 64], w: { working_with_youngsters: 3, technical: 2, possession: 1, attacking: 1, defending: 1, ...PPL }, d: "Working with youngsters, backed by coaching and people skills." },
  "Head of youth development": { jobs: [64], w: { working_with_youngsters: 3, judging_player_potential: 3, people_management: 2, technical: 1, motivating: 1, authority: 1, determination: 1 }, d: "Developing youngsters and spotting potential, plus running the youth set-up." },
  "Assistant manager": { jobs: [20], w: { tactical_knowledge: 3, motivating: 3, judging_player_ability: 2, judging_player_potential: 2, people_management: 2, tactical: 1, authority: 1, determination: 1, attacking: 1, defending: 1, possession: 1, technical: 1 }, d: "Match advice and team talks (tactical knowledge, motivating), judging players, man-management and coaching." },
  "Manager": { jobs: [16], w: { tactical_knowledge: 3, motivating: 2, people_management: 2, authority: 2, tactical: 2, judging_player_ability: 1, judging_player_potential: 1, attacking: 1, defending: 1, possession: 1, negotiating: 1, determination: 1 }, d: "Tactics, motivating and man-management, plus judging players and coaching." },
  "Physio": { jobs: [12, 50], w: { physiotherapy: 3, sports_science: 2, motivating: 1, determination: 1 }, d: "Physiotherapy, backed by sports science, motivating and determination." },
  "Head physio": { jobs: [50, 12], w: { physiotherapy: 3, sports_science: 2, people_management: 2, motivating: 1, authority: 1, determination: 1 }, d: "Physiotherapy and sports science, plus running the medical team." },
  "Sports scientist": { jobs: [48, 40], w: { sports_science: 3, fitness: 2, physiotherapy: 2, motivating: 1, determination: 1 }, d: "Sports science, backed by fitness and physiotherapy." },
  "Head of sports science": { jobs: [40, 48], w: { sports_science: 3, fitness: 2, physiotherapy: 2, people_management: 2, authority: 1, determination: 1 }, d: "Sports science, fitness and physiotherapy, plus running the department." },
  "Doctor": { jobs: [38, 46, DOCTOR], w: { physiotherapy: 3, sports_science: 3, determination: 1 }, d: "Physiotherapy and sports science." },
  "Scout": { jobs: [14, 44], w: { judging_player_ability: 3, judging_player_potential: 3, adaptability: 2, analysing_data: 1, tactical_knowledge: 1, determination: 1 }, d: "Judging ability and potential, plus adaptability for working abroad." },
  "Chief scout": { jobs: [44, 86, 14], w: { judging_player_ability: 3, judging_player_potential: 3, people_management: 2, judging_staff_ability: 1, adaptability: 1, analysing_data: 1, authority: 1, determination: 1 }, d: "Judging players, plus running the scouting team." },
  "Recruitment analyst": { jobs: [58], w: { analysing_data: 3, judging_player_ability: 2, judging_player_potential: 2, determination: 1 }, d: "Analysing data, backed by judging ability and potential." },
  "Performance analyst": { jobs: [60, 62], w: { analysing_data: 3, tactical_knowledge: 2, tactical: 2, judging_player_ability: 1, determination: 1 }, d: "Analysing data, backed by tactical knowledge and tactical coaching." },
  "Head of performance analysis": { jobs: [62, 60], w: { analysing_data: 3, tactical_knowledge: 2, tactical: 2, people_management: 2, authority: 1, determination: 1 }, d: "Analysing data and tactics, plus running the analysis team." },
  "Director of football": { jobs: [10, 88, 86], w: { negotiating: 3, judging_player_ability: 3, judging_player_potential: 3, judging_staff_ability: 2, people_management: 2, authority: 1, determination: 1 }, d: "Negotiating and judging players, plus judging staff and man-management." },
  "Technical director": { jobs: [88, 10], w: { judging_staff_ability: 3, people_management: 3, judging_player_ability: 2, judging_player_potential: 2, working_with_youngsters: 1, authority: 1, determination: 1 }, d: "Judging and managing staff, plus judging players and youth development." },
};
const STAFF_TABS = [["Mine", "My staff"], ["Review", "Staff review"], ["Assistant", "Assistant", ["Assistant manager"]],
  ["Coaches", "Coaches", ["All-round coach", "Attacking coach", "Defending coach", "Possession coach", "Technical coach", "Tactical coach"]],
  ["Fitness", "Fitness", ["Fitness coach"]], ["GK", "GK coach", ["Goalkeeping coach"]], ["SP", "Set pieces", ["Set piece coach"]],
  ["Youth", "Youth", ["Head of youth development", "Youth coach"]], ["Medical", "Medical", ["Physio", "Head physio", "Sports scientist", "Head of sports science", "Doctor"]],
  ["Scouts", "Scouts", ["Scout", "Chief scout"]], ["Analysts", "Analysts", ["Performance analyst", "Recruitment analyst", "Head of performance analysis"]],
  ["Directors", "Directors", ["Director of football", "Technical director"]], ["Managers", "Managers", ["Manager"]], ["All", "All staff"]];
const STAFF_TAB = Object.fromEntries(STAFF_TABS.map(t => [t[0], t]));
// the key jobs My staff checks, best of your people for each
const KEY_JOBS = [["Assistant manager", "Assistant"], ["Attacking coach", "Coaches"], ["Defending coach", "Coaches"], ["Possession coach", "Coaches"], ["Technical coach", "Coaches"],
  ["Tactical coach", "Coaches"], ["Fitness coach", "Fitness"], ["Goalkeeping coach", "GK"], ["Set piece coach", "SP"], ["Head of youth development", "Youth"], ["Youth coach", "Youth"],
  ["Head physio", "Medical"], ["Physio", "Medical"], ["Head of sports science", "Medical"], ["Sports scientist", "Medical"], ["Chief scout", "Scouts"], ["Scout", "Scouts"],
  ["Performance analyst", "Analysts"], ["Recruitment analyst", "Analysts"], ["Director of football", "Directors"], ["Technical director", "Directors"]];
// FM's words for 1-20 (FM26, as players measured them); change them under "In-game words"
const STAFF_BANDS_DEFAULT = [[20, "Elite"], [18, "Outstanding"], [15, "Very Good"], [12, "Good"], [10, "Average"], [7, "Competent"], [4, "Reasonable"], [1, "Unsuited"]];
const staffBands = () => { const b = Array.isArray(S.sBands) && S.sBands.length ? S.sBands : STAFF_BANDS_DEFAULT; return b.slice().filter(x => x[0] >= 1 && x[1]).sort((a, c) => c[0] - a[0]); };
function bandOf(v) { if (v == null) return null; const r = Math.round(v), b = staffBands(); for (let k = 0; k < b.length; k++) if (r >= b[k][0]) return { w: b[k][1], lo: b[k][0], hi: k ? b[k - 1][0] - 1 : 20, k }; return { w: b[b.length - 1][1], lo: 1, hi: b[b.length - 1][0], k: b.length - 1 }; }
const bandTxt = v => { const b = bandOf(v); return b ? `${b.w} (${b.lo === b.hi ? b.lo : b.lo + "–" + b.hi})` : ""; };
const sColor = v => v == null ? "transparent" : heat(attrPct(v));
const hasStaff = () => !!(SAVE && SAVE.staff && SAVE.staff.n);
function staffData() { // 1-20 values (0 = not stored), once per save
  if (SAVE._stf) return SAVE._stf;
  const ST = SAVE.staff, NR = ST.ratings.length, n = ST.n, col = {}, v = new Uint8Array(n * SA_ORDER.length);
  ST.ratings.forEach(([nm], j) => { col[nm] = j; });
  const has = new Uint8Array(n);
  for (let i = 0; i < n; i++) SA_ORDER.forEach((a, k) => {
    const j = col[a]; if (j == null) return; const raw = ST.rat[i * NR + j], top = ST.ratings[j][1];
    const x = !raw ? 0 : top === 20 ? raw : Math.max(1, Math.floor((raw + 2) / 5)); v[i * SA_ORDER.length + k] = x; if (x && a !== "adaptability") has[i] = 1;
  });
  const mine = new Set(); const m = SAVE.meta.managed && SAVE.meta.managed[0];
  if (m) for (let i = 0; i < n; i++) { const k = ST.clubIdx[i]; if (k >= 0 && SAVE.clubUid[k] === m.uid) mine.add(i); }
  return (SAVE._stf = { v, has, mine, rat: {} });
}
const sAttr = (i, a) => { const d = staffData(), x = d.v[i * SA_ORDER.length + SA_ORDER.indexOf(a)]; return x || null; };
function staffJobCode(i) { const ST = SAVE.staff; if (ST.free && ST.free[i]) return ST.usual && BOARD_USUAL.has(ST.usual[i]) ? NOCLUB_BOARD : FREE; const j = ST.job[i]; return j >= 0 ? j : (ST.lists[i] & 1 ? DOCTOR : -1); }
function staffJobName(i) {
  const j = staffJobCode(i), slot = SAVE.staff.teamSlot[i];
  if (j === FREE) { const u = usualJob(i); return "Unemployed" + (u ? " · usually " + STAFF_JOBS[u] : ""); }
  if (j === NOCLUB_BOARD) return "No club stored · usually " + STAFF_JOBS[SAVE.staff.usual[i]];
  const nm = j === DOCTOR ? "Doctor" : STAFF_JOBS[j] || (j >= 0 ? "Staff (job " + j + ")" : "Staff");
  return slot > 0 && (j === 16 || j === 20 || j === 2 || j === 34 || j === 26) ? nm + " · youth/B team" : nm;
}
function staffRating(role) { // Float32Array of the role's rating (NaN = no ratings)
  const d = staffData(); if (d.rat[role]) return d.rat[role];
  const w = Object.entries(STAFF_ROLES[role].w).map(([a, x]) => [SA_ORDER.indexOf(a), x]), n = SAVE.staff.n, NA = SA_ORDER.length, out = new Float32Array(n).fill(NaN);
  for (let i = 0; i < n; i++) { if (!d.has[i]) continue; let s = 0, t = 0; for (const [k, x] of w) { const v = d.v[i * NA + k]; if (v) { s += v * x; t += x; } } if (t) out[i] = s / t; }
  return (d.rat[role] = out);
}
function staffPct(role, i) {
  const d = staffData(); d.sorted = d.sorted || {};
  const rat = staffRating(role);
  if (!d.sorted[role]) d.sorted[role] = Float32Array.from(staffPool(role, "emp").map(x => rat[x]).filter(v => !isNaN(v))).sort();
  const s = d.sorted[role], v = rat[i]; if (isNaN(v) || !s.length) return null;
  let lo = 0, hi = s.length; while (lo < hi) { const m = (lo + hi) >> 1; if (s[m] < v) lo = m + 1; else hi = m; }
  return lo / s.length * 100;
}
// the jobs he'd rank highest in, judged against the people doing each job
function staffBestRoles(i, n) { return Object.keys(STAFF_ROLES).map(r => [r, staffRating(r)[i], staffPct(r, i)]).filter(x => !isNaN(x[1]) && x[2] != null).sort((a, b) => b[2] - a[2] || b[1] - a[1]).slice(0, n); }
// who: "both" = people in the job + free agents who fit it, "emp" = people in the job, "free" = free agents who fit it, "all" = anyone (not the board)
const STAFF_WHO = { both: "In this job + free agents", emp: "In this job (at a club)", free: "Free agents only", all: "Any staff member" };
const staffWho = () => STAFF_WHO[S.sWho] ? S.sWho : "both";
// a free agent fits a job when it's his usual job; with none stored, when it's one of his 2 best jobs by attributes
function freeFits(i, role) {
  const u = usualJob(i); if (u != null) return STAFF_ROLES[role].jobs.includes(u);
  const d = staffData(); d.fit = d.fit || new Map(); let f = d.fit.get(i);
  if (!f) { f = new Set(staffBestRoles(i, 2).map(x => x[0])); d.fit.set(i, f); }
  return f.has(role);
}
function staffPool(role, who) { // indexes in the pool for a role
  const d = staffData(), jobs = new Set(STAFF_ROLES[role].jobs), out = [];
  for (let i = 0; i < SAVE.staff.n; i++) {
    if (!d.has[i]) continue; const j = staffJobCode(i);
    if (j === FREE) { if (who === "emp") continue; if (who === "all" || freeFits(i, role)) out.push(i); continue; }
    if (who === "free") continue;
    if (who === "all" ? !BOARD_JOBS.has(j) : jobs.has(j)) out.push(i);
  }
  return out;
}
const sClub = i => { const k = SAVE.staff.clubIdx[i]; return k >= 0 ? SAVE.clubs[k] : isFreeStaff(i) ? "Unemployed" : "No club stored"; };
const sDate = raw => { if (!raw) return null; const y = raw >>> 16, d = new Date(Date.UTC(y, 0, 1)); d.setUTCDate(raw & 511); return d; };
const sDateTxt = raw => { const d = sDate(raw); return d ? d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "–"; };
const sWage = i => { const w = SAVE.staff.wage[i]; return isNaN(w) ? (isFreeStaff(i) ? "free agent" : "–") : saveMoney(w) + " p/w"; };
const sAge = i => SAVE.staff.age[i] >= 0 ? SAVE.staff.age[i] : null;
const sCell = (v, words) => v == null ? "–" : words ? esc(bandOf(v).w) : (Math.round(v * 10) / 10).toFixed(Number.isInteger(v) ? 0 : 1);
// filters shared by every staff page
function staffFilter(idx, opts = {}) {
  const q = norm(S.sQ || ""), af = Object.entries(S.sF || {}).filter(([a, v]) => SA[a] && v > 0), maxAge = S.sAge || 0, d = staffData();
  const qs = q ? q.split(",").map(x => x.trim()).filter(Boolean) : [];
  return idx.filter(i => {
    if (maxAge && !(sAge(i) != null && sAge(i) <= maxAge)) return false;
    if (S.sNotMine && d.mine.has(i) && !opts.keepMine) return false;
    if (qs.length && !qs.some(x => norm(SAVE.staff.name[i] + " " + sClub(i)).includes(x))) return false;
    for (const [a, v] of af) { const x = sAttr(i, a); if (x == null || x < v) return false; }
    return true;
  });
}
function staffFiltersHtml(extra) {
  const af = Object.entries(S.sF || {}).filter(([a, v]) => SA[a] && v > 0);
  return `<section class="filters">
    <label class="fl"><span class="small muted">Max age</span><select id="sAge">${[0, 35, 40, 45, 50, 55, 60].map(a => `<option value="${a}" ${a === (S.sAge || 0) ? "selected" : ""}>${a ? "≤ " + a : "Any"}</option>`).join("")}</select></label>
    <label class="fl grow"><span class="small muted">Find staff or club (commas for several)</span><input type="search" id="sQ" value="${esc(S.sQ || "")}" placeholder="Name or club"></label>
    <label class="fl toggle"><input type="checkbox" id="sNotMine" ${S.sNotMine ? "checked" : ""}><span>Hide my club's staff</span></label>
    <label class="fl toggle"><input type="checkbox" id="sWords" ${S.sWords ? "checked" : ""}><span>Show FM's words</span></label>
    ${extra || ""}
    <div class="afilters" role="group" aria-label="Attribute filters"><span class="small muted">Attribute filters</span>
      ${af.map(([a, v]) => `<button class="afchip" data-sfrm="${a}" title="Remove this filter">${esc(SA[a][1])} ≥ ${v} <span aria-hidden="true">✕</span></button>`).join("")}
      <select id="sfAttr" aria-label="Attribute"><option value="">Attribute…</option>${SA_GROUPS.map(([g, l]) => `<optgroup label="${g}">${l.map(a => `<option value="${a}">${esc(SA[a][1])}</option>`).join("")}</optgroup>`).join("")}</select>
      <input id="sfMin" type="number" min="1" max="20" inputmode="numeric" placeholder="min 1–20" aria-label="Minimum">
      <button class="ghost small" data-act="sfadd">Add</button>${af.length ? `<button class="linkbtn small" data-act="sfclear">Clear</button>` : ""}
    </div>
  </section>`;
}
function renderStaff(main) {
  closeDrawer(true);
  if (!SAVE) { main.innerHTML = `<section class="panel"><h3>Staff comes from your save</h3><p class="muted">Load your FM save (<button class="linkbtn" data-act="datapage">Data</button>) and every club's coaches, physios, scouts, analysts and directors appear here, rated from the numbers the save keeps behind FM's words.</p></section>`; renderSaveNote(); return; }
  if (SAVE.staff && !SAVE.staff.n) { main.innerHTML = `<section class="panel"><h3>No staff in this save</h3><p class="muted">Scout Lab found no club staff in this save.</p></section>`; renderSaveNote(); return; }
  if (!hasStaff()) { main.innerHTML = `<section class="panel"><h3>Load your save once more</h3><p class="muted">This save was loaded before Scout Lab read staff${SAVE.meta.staffError ? ` (${esc(SAVE.meta.staffError)})` : ""}. Load it again (<button class="linkbtn" data-act="datapage">Data</button>) on the device that has the .fm file and the Staff tabs fill; your cloud copy updates too, so your other devices get them next time they open Scout Lab.</p></section>`; renderSaveNote(); return; }
  const tab = STAFF_TAB[S.stab] ? S.stab : "Mine";
  main.innerHTML = tab === "Mine" ? renderMyStaff() : tab === "Review" ? renderStaffReview() : tab === "All" ? renderAllStaff() : renderStaffRole(tab);
  main.insertAdjacentHTML("beforeend", renderBandsPanel());
  renderSaveNote();
  if (S.sSel != null) openStaff(S.sSel, true);
}
const rolePlural = r => { const l = r.toLowerCase(); return /^(head|director) of /.test(l) ? l.replace(/^(head|director)/, "$1s") : /ch$/.test(l) ? l + "es" : l + "s"; };
function staffRoleOf(tab) { const roles = STAFF_TAB[tab][2]; const r = (S.sRole || {})[tab]; return roles.includes(r) ? r : roles[0]; }
function renderStaffRole(tab) {
  const role = staffRoleOf(tab), R = STAFF_ROLES[role], roles = STAFF_TAB[tab][2], who = staffWho();
  const rat = staffRating(role), pool = staffPool(role, who).filter(i => !isNaN(rat[i])).sort((a, b) => rat[b] - rat[a]);
  const rank = new Map(pool.map((i, k) => [i, k + 1]));
  const rows = staffFilter(pool), d = staffData(), words = !!S.sWords;
  const mineIn = pool.filter(i => d.mine.has(i)), myBest = mineIn[0];
  const wts = Object.entries(R.w).sort((a, b) => b[1] - a[1]);
  let h = `<div class="setsbar"><span class="setctl"><label for="sRoleSel" class="small muted">Rate them as</label><select id="sRoleSel">${roles.map(r => `<option ${r === role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
    <label for="sWho" class="small muted">Who</label><select id="sWho">${Object.entries(STAFF_WHO).map(([k, l]) => `<option value="${k}" ${who === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></span></div>`;
  h += `<p class="small muted rolehow"><b>${esc(role)}</b>: ${esc(R.d)} Rating out of 20 = ${wts.map(([a, x]) => `${esc(SA[a][1])} ×${x}`).join(" + ")}, divided by ${wts.reduce((s, x) => s + x[1], 0)}. ${(() => { const jl = esc(R.jobs.map(j => j === DOCTOR ? "Doctor" : STAFF_JOBS[j]).join(", ")), fa = "free agents whose usual job that is (or, with none stored, whose best 2 jobs by attributes include it)"; return who === "all" ? "Rated: every staff member in the save, free agents included (not the board)." : who === "emp" ? `Rated: everyone at a club working as ${jl}.` : who === "free" ? `Rated: ${fa.replace("that is", "is " + jl)}.` : `Rated: everyone at a club working as ${jl}, plus ${fa.replace("that is", "is one of those")}.`; })()}</p>`;
  h += staffFiltersHtml();
  const ages = rows.map(sAge).filter(x => x != null), wages = rows.map(i => SAVE.staff.wage[i]).filter(x => !isNaN(x));
  const best = rows[0], nFree = rows.filter(isFreeStaff).length;
  h += `<section class="tiles">${[["People shown", rows.length.toLocaleString() + (nFree ? ` · ${nFree.toLocaleString()} free` : "")], ["Median age", median(ages) ?? "–"], ["Median wage", wages.length ? saveMoney(median(wages)) + " p/w" : "–"],
    ["Best rating", best != null ? `${rat[best].toFixed(1)} · ${bandOf(rat[best]).w}` : "–"], ["Your best", myBest != null ? `${rat[myBest].toFixed(1)} · #${rank.get(myBest)}` : "Nobody in this job"]]
    .map(([l, v]) => `<div class="tile"><span class="tv">${esc(v)}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>`;
  // your people in this job
  if (mineIn.length) h += `<section><div class="sh"><h3>Your ${esc(rolePlural(role))}</h3><span class="muted small">rank among ${pool.length.toLocaleString()} in the save</span></div><div class="mylist">${mineIn.slice(0, 8).map(i => `<button class="trow" data-sid="${i}"><span class="tn">${esc(SAVE.staff.name[i])}</span><span class="tm">${esc(staffJobName(i))} · #${rank.get(i)} · ${esc(pctTxt(100 - (rank.get(i) - 1) / pool.length * 100))} · ${esc(sWage(i))}</span><b>${rat[i].toFixed(1)}</b></button>`).join("")}</div></section>`;
  // best overall
  h += `<section><div class="sh"><h3>Best ${esc(rolePlural(role))}</h3><span class="muted small">rating out of 20 · bar = what it's made of</span></div>${staffCards(rows.slice(0, 5), rat, role, rank)}</section>`;
  // upgrades on yours
  if (myBest != null) {
    const up = rows.filter(i => !d.mine.has(i) && rat[i] > rat[myBest] + 0.05);
    const cheap = up.filter(i => !isNaN(SAVE.staff.wage[i]) && !isNaN(SAVE.staff.wage[myBest]) && SAVE.staff.wage[i] <= SAVE.staff.wage[myBest]);
    h += `<section><div class="sh"><h3>Better than your best (${esc(SAVE.staff.name[myBest])}, ${rat[myBest].toFixed(1)})</h3><span class="muted small">${up.length.toLocaleString()} people</span></div><div class="tiers">
      <div class="tier"><h4>Best upgrades</h4>${up.slice(0, 5).map(i => staffTRow(i, rat)).join("") || `<p class="muted small">Nobody: yours is the best here.</p>`}</div>
      <div class="tier"><h4>Upgrades on the same wage or less</h4>${cheap.slice(0, 5).map(i => staffTRow(i, rat)).join("") || `<p class="muted small">Nobody earning ${esc(sWage(myBest))} or less beats him.</p>`}</div>
      <div class="tier"><h4>Upgrades aged 40 or under</h4>${up.filter(i => sAge(i) != null && sAge(i) <= 40).slice(0, 5).map(i => staffTRow(i, rat)).join("") || `<p class="muted small">Nobody.</p>`}</div>
      <div class="tier"><h4>Free agents (no club to pay)</h4>${up.filter(isFreeStaff).slice(0, 5).map(i => staffTRow(i, rat)).join("") || `<p class="muted small">${who === "emp" ? "Free agents are hidden: set Who to include them." : "No free agent beats him."}</p>`}</div></div></section>`;
  }
  // best for each area of the job: FM27's own job categories first (coaching / scouting / medical), then the role's other attributes
  const wk = wts.map(x => x[0]);
  const fam = /physio|sports scientist|doctor|medical/i.test(role) ? "med" : /scout|recruit|analys|director|chief scout|technical director/i.test(role) ? "scout" : "coach";
  const pri = STAFF_JOB_CATS[fam], rest = wts.filter(x => x[1] >= 2 && !pri.includes(x[0])).concat(wts.filter(x => x[1] < 2 && !pri.includes(x[0])).slice(0, 2)).map(x => x[0]);
  h += `<section><div class="sh"><h3>Best for each part of the job</h3><span class="muted small">${fam === "coach" ? "FM27's coaching categories" : fam === "scout" ? "FM27's scouting categories" : "FM27's medical categories"} first, then the other attributes for this role · top 5 by that attribute (ties: higher rating)</span></div><div class="needs">${pri.concat(rest).map(a => [a]).map(([a]) => {
    const top = rows.filter(i => sAttr(i, a) != null).sort((x, y) => sAttr(y, a) - sAttr(x, a) || rat[y] - rat[x]).slice(0, 5);
    return `<div class="need${pri.includes(a) ? " pri" : ""}"><h4>${esc(STAFF_JOB_LABEL[a] || SA[a][1])}</h4>${top.map((i, k) => `<button class="nrow ${words ? "wv" : ""}" data-sid="${i}" data-tip="${esc(SAVE.staff.name[i] + " · " + sClub(i) + "\n" + SA[a][1] + ": " + sAttr(i, a) + " (" + bandOf(sAttr(i, a)).w + ") · rating " + rat[i].toFixed(1))}"><span class="nn">${k + 1}. ${esc(SAVE.staff.name[i])}</span><span class="nt"><span style="width:${(sAttr(i, a) / 20 * 100).toFixed(1)}%"></span></span><span class="nv">${words ? esc(bandOf(sAttr(i, a)).w) : sAttr(i, a)}</span></button>`).join("")}</div>`;
  }).join("")}</div></section>`;
  h += `<section class="panel tablepanel">${staffTable(rows, rat, role, wts.map(x => x[0]), rank)}</section>`;
  return h;
}
const staffSortDefault = tab => tab === "All" ? { k: "name", d: 1 } : { k: "rating", d: -1 };
function staffSort() { const tab = STAFF_TAB[S.stab] ? S.stab : "Mine", v = (S.sSorts || {})[tab]; return v && v.k ? v : staffSortDefault(tab); }
function setStaffSort(k) {
  const tab = STAFF_TAB[S.stab] ? S.stab : "Mine", cur = staffSort();
  const d = cur.k === k ? -cur.d : (k === "name" || k === "club" || k === "job" ? 1 : -1);
  S.sSorts = { ...(S.sSorts || {}), [tab]: { k, d } };
}
function staffTRow(i, rat) { const f = isFreeStaff(i); return `<button class="trow" data-sid="${i}"><span class="tn">${esc(SAVE.staff.name[i])}${f ? `<span class="inf fa">free</span>` : ""}</span><span class="tm">${f ? esc(staffJobName(i)) : esc(sClub(i))} · ${sAge(i) ?? "?"}${f ? "" : " · " + esc(sWage(i))}</span><b>${rat[i].toFixed(1)}</b></button>`; }
function staffCards(top, rat, role, rank) {
  if (!top.length) return `<p class="muted">Nobody matches the filters.</p>`;
  const w = STAFF_ROLES[role].w, tot = Object.values(w).reduce((s, x) => s + x, 0);
  const parts = i => { const p = { main: 0, rel: 0, ppl: 0 }; let t = 0; Object.entries(w).forEach(([a, x]) => { const v = sAttr(i, a); if (v == null) return; t += x; p[x >= 3 ? "main" : PEOPLE.has(a) ? "ppl" : "rel"] += v * x; }); return { p, t: t || tot }; };
  return `<div class="cards">${top.map(i => {
    const { p, t } = parts(i);
    return `<button class="card" data-sid="${i}"><span class="rank">#${rank.get(i)}</span><span class="cname">${esc(SAVE.staff.name[i])}</span>
      <span class="cmeta">${isFreeStaff(i) ? `${sAge(i) ?? "?"} · ${esc(staffJobName(i))}` : `${esc(sClub(i))} · ${sAge(i) ?? "?"} · ${esc(staffJobName(i))}`}</span>
      <span class="cscore">${rat[i].toFixed(1)}<small>/20 · ${esc(bandOf(rat[i]).w)}</small></span>
      <span class="cstack" title="Main attribute · related attributes · people skills">${[["main", 1], ["rel", 2], ["ppl", 3]].map(([k, c]) => p[k] > 0 ? `<span class="seg s${c}" style="flex:${(p[k] / t).toFixed(3)}"></span>` : "").join("")}<span class="cgap" style="flex:${Math.max(0, 20 - rat[i]).toFixed(3)}"></span></span>
      <span class="ctags">${isFreeStaff(i) ? `<span class="tag good">Free agent</span>` : `<span class="tag">${esc(sWage(i))}</span>`}${staffData().mine.has(i) ? `<span class="tag good">Your club</span>` : ""}</span></button>`;
  }).join("")}</div><div class="legend stackleg"><span><i class="sw s1"></i>Main attribute (×3)</span><span><i class="sw s2"></i>Related attributes</span><span><i class="sw s3"></i>People skills</span></div>`;
}
function staffTable(rows, rat, role, attrs, rank) {
  const ss = staffSort(), k = ss.k, dir = ss.d, words = !!S.sWords;
  const val = (i, c) => c === "rating" ? rat[i] : c === "name" ? SAVE.staff.name[i] : c === "club" ? sClub(i) : c === "age" ? sAge(i) : c === "wage" ? (isNaN(SAVE.staff.wage[i]) ? null : SAVE.staff.wage[i]) : c === "end" ? SAVE.staff.cEnd[i] || null : c === "job" ? staffJobName(i) : sAttr(i, c);
  const sorted = [...rows].sort((a, b) => { const x = val(a, k), y = val(b, k); if (typeof x === "string" || typeof y === "string") return dir * -String(x ?? "").localeCompare(String(y ?? "")); return dir * ((x ?? -1e9) - (y ?? -1e9)); });
  const lim = S.sShowAll ? 1000 : 50, shown = sorted.slice(0, lim);
  const th = (c, l, cls = "", title = "") => `<th class="${cls} ${k === c ? "sorted" : ""}" data-ssort="${c}"${title ? ` data-tip="${esc(title)}"` : ""}><button>${esc(l)}${k === c ? (dir < 0 ? " ↓" : " ↑") : ""}</button></th>`;
  let s = `<div class="tscroll"><table class="heat stafft"><thead><tr><th class="num">#</th>${th("name", "Name", "left")}${th("job", "Job", "left")}${th("age", "Age", "num")}${th("wage", "Wage", "num")}${th("end", "Contract", "num", "When his contract ends")}${rat ? th("rating", "Rating", "num strong", role + ": rating out of 20") : ""}`;
  s += attrs.map(a => th(a, SA[a][0], "num cat", `${SA[a][1]}: ${SA[a][2]}`)).join("") + `</tr></thead><tbody>`;
  shown.forEach(i => {
    s += `<tr data-sid="${i}" class="${S.sSel === i ? "rsel" : ""}"><td class="num muted">${rank ? rank.get(i) : ""}</td><td class="left pl"><span class="pn">${esc(SAVE.staff.name[i])}${staffData().mine.has(i) ? `<span class="inf">yours</span>` : ""}${isFreeStaff(i) ? `<span class="inf fa">free</span>` : ""}</span><span class="pc">${esc(sClub(i))}</span></td>
      <td class="left small">${esc(staffJobName(i))}</td><td class="num">${sAge(i) ?? "–"}</td><td class="num">${esc(sWage(i).replace(" p/w", ""))}</td><td class="num small">${SAVE.staff.cEnd[i] ? sDate(SAVE.staff.cEnd[i]).getUTCFullYear() : "–"}</td>
      ${rat ? `<td class="num strong" title="${esc(bandTxt(rat[i]))}">${rat[i].toFixed(1)}</td>` : ""}${attrs.map(a => { const v = sAttr(i, a); return `<td class="num hc" style="background:${sColor(v)}" title="${esc(SA[a][1])}: ${v ?? "–"}${v ? " · " + esc(bandTxt(v)) : ""}">${sCell(v, words)}</td>`; }).join("")}</tr>`;
  });
  s += `</tbody></table></div>`;
  if (sorted.length > 50) s += `<button class="ghost more" data-act="sshowall">${S.sShowAll ? "Show top 50" : sorted.length > 1000 ? `Show top 1,000 of ${sorted.length.toLocaleString()}` : `Show all ${sorted.length.toLocaleString()}`}</button>`;
  return s;
}
function renderAllStaff() {
  const jobLabel = j => j === DOCTOR ? "Doctor" : j === FREE ? "Unemployed (free agents)" : j === NOCLUB_BOARD ? "No club stored (usually board)" : STAFF_JOBS[j] || "Job " + j;
  const d = staffData(), jobs = [...new Set(Array.from({ length: SAVE.staff.n }, (_, i) => staffJobCode(i)))].filter(j => j !== -1).sort((a, b) => jobLabel(a).localeCompare(jobLabel(b)));
  const jf = S.sJob == null || S.sJob === "" ? null : +S.sJob;
  let idx = []; for (let i = 0; i < SAVE.staff.n; i++) { if (!d.has[i]) continue; const j = staffJobCode(i); if (jf == null ? !BOARD_JOBS.has(j) : j === jf) idx.push(i); }
  const rows = staffFilter(idx);
  const extra = `<label class="fl"><span class="small muted">Job</span><select id="sJob"><option value="">Every job</option>${jobs.map(j => `<option value="${j}" ${jf === j ? "selected" : ""}>${esc(jobLabel(j))}</option>`).join("")}</select></label>`;
  return `<section><div class="sh"><h3>Every staff member in the save</h3><span class="muted small">${rows.length.toLocaleString()} of ${idx.length.toLocaleString()} · numbers out of 20 · tap a heading to sort, a person for everything</span></div></section>`
    + staffFiltersHtml(extra) + `<section class="panel tablepanel">${staffTable(rows, null, null, SA_ORDER, null)}</section>`;
}
function staffKeyJobs() { // your best person per key job, with his rank in the save
  const d = staffData();
  return KEY_JOBS.map(([role, tab]) => {
    const rat = staffRating(role), pool = staffPool(role, "emp").filter(i => !isNaN(rat[i])).sort((a, b) => rat[b] - rat[a]);
    const mine = pool.filter(i => d.mine.has(i)), best = mine[0];
    const fa = staffPool(role, "free").filter(i => !isNaN(rat[i]) && (best == null || rat[i] > rat[best] + 0.05)).sort((a, b) => rat[b] - rat[a])[0];
    const pct = best == null ? null : 100 - (pool.indexOf(best)) / pool.length * 100;
    const up = best == null ? pool.filter(i => !d.mine.has(i))[0] : pool.find(i => !d.mine.has(i) && rat[i] > rat[best] + 0.05 && !isNaN(SAVE.staff.wage[i]) && !isNaN(SAVE.staff.wage[best]) && SAVE.staff.wage[i] <= SAVE.staff.wage[best] * 1.5);
    return { role, tab, rat, pool, best, pct, up, fa, n: mine.length };
  });
}
function staffVerdict(p) { return p == null ? ["Nobody", "bad"] : p >= 90 ? ["Strong", "good"] : p >= 70 ? ["Solid", ""] : p >= 40 ? ["Could upgrade", "warn"] : ["Priority upgrade", "bad"]; }
function renderMyStaff() {
  const d = staffData(), m = SAVE.meta.managed && SAVE.meta.managed[0];
  if (!m || !d.mine.size) return `<section class="panel"><h3>My staff</h3><p class="muted">${m ? `No staff were found for ${esc(m.club)} in this save.` : "Your club couldn't be found in this save."} The other tabs still rate every club's staff.</p></section>`;
  const K = staffKeyJobs();
  let h = `<section><div class="sh"><h3>${esc(m.club)}: your staff, job by job</h3><span class="muted small">your best person for each job, ranked against everyone in that job in the save</span></div>
    <div class="panel tablepanel"><div class="tscroll full"><table class="heat stafft"><thead><tr><th class="left">Job</th><th class="left">Your best</th><th class="num">Rating</th><th class="left">Verdict</th><th class="num">Rank</th><th class="left">Better, for no more than 1.5× his wage</th><th class="left">Best free agent who beats him</th></tr></thead><tbody>`;
  K.forEach(k => {
    const [v, cls] = staffVerdict(k.pct), b = k.best;
    h += `<tr><td class="left pl"><button class="linkbtn" data-sgo="${esc(k.tab + "|" + k.role)}">${esc(k.role)}</button>${k.n > 1 ? `<span class="pc">${k.n} at the club</span>` : ""}</td>
      <td class="left">${b != null ? `<button class="linkbtn" data-sid="${b}">${esc(SAVE.staff.name[b])}</button><span class="pc ponly">${k.rat[b].toFixed(1)} ${esc(bandOf(k.rat[b]).w)} · <span class="${cls}">${v}</span></span>` : `<span class="muted">Nobody</span>`}</td>
      <td class="num hc" style="background:${b != null ? sColor(k.rat[b]) : "transparent"}" title="${b != null ? esc(bandTxt(k.rat[b])) : ""}">${b != null ? `<b>${k.rat[b].toFixed(1)}</b> <small>${esc(bandOf(k.rat[b]).w)}</small>` : "–"}</td><td class="left"><span class="tag ${cls}">${v}</span></td>
      <td class="num small">${b != null ? `#${k.pool.indexOf(b) + 1} of ${k.pool.length.toLocaleString()}` : "–"}</td>
      <td class="left small">${k.up != null ? `<button class="linkbtn" data-sid="${k.up}">${esc(SAVE.staff.name[k.up])}</button> ${k.rat[k.up].toFixed(1)} · ${esc(sClub(k.up))} · ${esc(sWage(k.up))}` : b != null ? `<span class="muted">Nobody</span>` : ""}</td>
      <td class="left small">${k.fa != null ? `<button class="linkbtn" data-sid="${k.fa}">${esc(SAVE.staff.name[k.fa])}</button> ${k.rat[k.fa].toFixed(1)} · ${sAge(k.fa) ?? "?"} yrs` : `<span class="muted">Nobody</span>`}</td></tr>`;
  });
  h += `</tbody></table></div></div><p class="small muted">Verdict from his rank among everyone in that job: top 10% Strong, top 30% Solid, top 60% Could upgrade, below that Priority upgrade. Tap a job for the full list.</p></section>`;
  // everyone at the club
  const isBoard = i => BOARD_JOBS.has(staffJobCode(i));
  const mine = [...d.mine].sort((a, b) => isBoard(a) - isBoard(b) || staffJobName(a).localeCompare(staffJobName(b)) || SAVE.staff.name[a].localeCompare(SAVE.staff.name[b]));
  const bestRole = i => { const b = staffBestRoles(i, 1)[0]; return b ? [b[0], b[1], b[2]] : [null, null, null]; };
  h += `<section><div class="sh"><h3>Everyone at ${esc(m.short || m.club)}</h3><span class="muted small">${mine.length} people · tap one for his attributes</span></div><div class="panel tablepanel"><div class="tscroll"><table class="heat stafft"><thead><tr><th class="left">Name</th><th class="left">Job</th><th class="num">Age</th><th class="num">Wage</th><th class="num">Contract</th><th class="left">Best at</th>${SA_ORDER.map(a => `<th class="num cat" data-tip="${esc(SA[a][1] + ": " + SA[a][2])}">${SA[a][0]}</th>`).join("")}</tr></thead><tbody>`;
  mine.forEach(i => {
    const [br, bv, bp] = d.has[i] && !isBoard(i) ? bestRole(i) : [null, null, null];
    h += `<tr data-sid="${i}"><td class="left pl"><span class="pn">${esc(SAVE.staff.name[i])}</span></td><td class="left small">${esc(staffJobName(i))}</td><td class="num">${sAge(i) ?? "–"}</td><td class="num">${esc(sWage(i).replace(" p/w", ""))}</td><td class="num small">${SAVE.staff.cEnd[i] ? sDate(SAVE.staff.cEnd[i]).getUTCFullYear() : "–"}</td>
      <td class="left small" title="${br ? esc(`${bv.toFixed(1)} as ${br.toLowerCase()}: ${pctTxt(bp)} of the people doing that job`) : ""}">${br ? `${esc(br)} <b>${bv.toFixed(1)}</b> <span class="muted">${esc(pctTxt(bp))}</span>` : "–"}</td>${SA_ORDER.map(a => { const v = sAttr(i, a); return `<td class="num hc" style="background:${sColor(v)}" title="${esc(SA[a][1])}: ${v ?? "–"}${v ? " · " + esc(bandTxt(v)) : ""}">${sCell(v, !!S.sWords)}</td>`; }).join("")}</tr>`;
  });
  h += `</tbody></table></div></div><p class="small muted"><label><input type="checkbox" id="sWords" ${S.sWords ? "checked" : ""}> Show FM's words instead of numbers</label></p></section>`;
  return h;
}
function renderBandsPanel() {
  const b = staffBands();
  return `<details class="panel bandsp" ${S.sBandsOpen ? "open" : ""}><summary><b>In-game words</b> <span class="small muted">· which FM word each number shows as (used for colours, words and the tooltips)</span></summary>
    <p class="small muted">FM shows staff attributes as words; the save keeps the numbers. The words below are FM26's as players measured them. If your game shows different words or cut-offs, change them here.</p>
    <div class="bands">${b.map((x, k) => `<div class="bandrow"><span class="small muted">from</span><input type="number" min="1" max="20" value="${x[0]}" data-band="${k}" data-bf="0" aria-label="Lowest number"><input type="text" value="${esc(x[1])}" data-band="${k}" data-bf="1" aria-label="Word"><span class="bandsw" style="background:${sColor(x[0])}"></span><button class="ghost small" data-act="sbandrm" data-k="${k}" aria-label="Remove">✕</button></div>`).join("")}</div>
    <div class="addrow"><button class="ghost small" data-act="sbandadd">+ Add a word</button><button class="ghost small" data-act="sbandreset">Reset to FM26's words</button></div></details>`;
}
// the staff panel
function openStaff(i, silent) {
  const dr = $("#drawer"); dr.classList.remove("pfull"); if (!hasStaff() || i == null || i >= SAVE.staff.n) { closeDrawer(true); return; }
  if (S.sSel !== i) S.sPRole = null;
  S.sSel = i;
  const ST = SAVE.staff, d = staffData(), words = !!S.sWords;
  const tab = STAFF_TAB[S.stab] && STAFF_TAB[S.stab][2] ? S.stab : null, role = tab ? staffRoleOf(tab) : null;
  const ranks = staffBestRoles(i, 5);
  const pageR = role || (ranks[0] && ranks[0][0]), pr = S.sPRole && STAFF_ROLES[S.sPRole] ? S.sPRole : pageR;
  let h = `<div class="dhead"><div><h2>${esc(ST.name[i] || "?")}</h2><p class="muted">${esc(staffJobName(i))}${isFreeStaff(i) ? "" : " · " + esc(sClub(i))}${ST.listedIdx[i] >= 0 && ST.listedIdx[i] !== ST.clubIdx[i] ? ` (listed by ${esc(SAVE.clubs[ST.listedIdx[i]])})` : ""} · ${sAge(i) ?? "?"} yrs</p>
    <p class="muted small">${isFreeStaff(i) ? "Free agent: no club, so no compensation to pay" : ST.contract[i] ? `Wage ${esc(sWage(i))} · contract ${esc(sDateTxt(ST.cStart[i]))} to ${esc(sDateTxt(ST.cEnd[i]))}` : "No contract stored"}${ST.ca[i] > 0 ? ` · ability ${ST.ca[i]} (potential ${ST.pa[i]}), hidden in FM` : ""}</p></div>
    <button class="ghost close" data-act="close" aria-label="Close">✕</button></div>
    <div class="drole"><label for="sPanelRole" class="small muted">Rate him as</label><select id="sPanelRole">${STAFF_TABS.filter(t => t[2]).map(t => `<optgroup label="${esc(t[1])}">${t[2].map(r => `<option ${r === pr ? "selected" : ""}>${esc(r)}</option>`).join("")}</optgroup>`).join("")}</select>${pr !== pageR ? `<span class="small muted">this panel only${role ? " · page stays on " + esc(role) : ""}</span><button class="ghost small" data-act="sprolereset">Back to ${esc(pageR)}</button>` : `<span class="small muted">changes this panel only</span>`}</div>`;
  if (!d.has[i]) { h += `<p class="muted">The save holds no staff attributes for him.</p>`; dr.innerHTML = h; dr.hidden = false; $("#scrim").hidden = false; return; }
  if (pr) {
    const rat = staffRating(pr), pool = staffPool(pr, "emp").filter(x => !isNaN(rat[x])).sort((a, b) => rat[b] - rat[a]), rk = pool.indexOf(i), pc = rk < 0 ? staffPct(pr, i) : null;
    h += `<div class="dtiles"><div class="tile"><span class="tv acc">${rat[i].toFixed(1)}<small>/20</small></span><span class="tl">${esc(pr)} · ${esc(bandOf(rat[i]).w)}</span></div>
      <div class="tile"><span class="tv">${rk >= 0 ? `#${rk + 1}<small> of ${pool.length.toLocaleString()}</small>` : pc != null ? esc(pctTxt(pc)) : "–"}</span><span class="tl">${rk >= 0 ? esc(pctTxt(100 - rk / pool.length * 100)) + " in this job" : "against the people in this job"}</span></div>
      ${isFreeStaff(i) ? `<div class="tile"><span class="tv">Free</span><span class="tl">Unemployed</span></div><div class="tile"><span class="tv">${esc(usualJob(i) ? STAFF_JOBS[usualJob(i)] : "–")}</span><span class="tl">Usual job</span></div></div>` : `<div class="tile"><span class="tv">${esc(sWage(i).replace(" p/w", ""))}</span><span class="tl">Wage per week</span></div>
      <div class="tile"><span class="tv">${ST.cEnd[i] ? sDate(ST.cEnd[i]).getUTCFullYear() : "–"}</span><span class="tl">Contract ends</span></div></div>`}`;
    // why he scores X: each attribute's share
    const w = Object.entries(STAFF_ROLES[pr].w).sort((a, b) => b[1] - a[1]), tw = w.reduce((s, [a, x]) => s + (sAttr(i, a) ? x : 0), 0);
    h += `<h4>Why he rates ${rat[i].toFixed(1)} as ${esc(pr.toLowerCase())}</h4><div class="whyst">${w.map(([a, x]) => { const v = sAttr(i, a); return `<div class="mrow"><span class="mlab">${esc(SA[a][1])} <small class="muted">×${x}</small></span><span class="mval">${v ?? "–"}${v ? ` <small class="mtot">${esc(bandOf(v).w)}</small>` : ""}</span><span class="mtrack"><span style="width:${v ? (v / 20 * 100).toFixed(1) : 0}%;background:${sColor(v)}"></span></span><span class="mpct">${v && tw ? Math.round(v * x / tw * 10) / 10 : "–"}</span></div>`; }).join("")}</div>
      <p class="small muted">Right-hand number = what each attribute adds to the ${rat[i].toFixed(1)} (value × weight ÷ ${tw}). The main attribute counts ×3; for coaches Motivating, Determination and Authority count ×2 because they drive how well a coach coaches whatever his speciality. An all-rounder beats a one-attribute specialist.</p>`;
  }
  const tabOf = r => Object.values(STAFF_TAB).find(t => t[2] && t[2].includes(r))[0];
  h += `<h4>Best jobs for him</h4><div class="fits">${ranks.map(([r, v, p], k) => `<button class="fit ${k === 0 ? "first" : ""} ${r === pr ? "cur" : ""}" data-sprole="${esc(r)}" title="${r === pr ? "Rated as this now" : "Rate him as " + esc(r) + " in this panel"} · ${esc(pctTxt(p))} of the people doing that job">${esc(r)} <b>${v.toFixed(1)}</b> <small>${esc(pctTxt(p))}</small></button>`).join("")}</div><p class="small muted">Judged against the people doing each job in the save, so jobs compare fairly. Tap one to rate him as that in this panel${pr ? `; <button class="linkbtn" data-sgo="${esc(tabOf(pr) + "|" + pr)}">open the ${esc(rolePlural(pr))} list</button>` : ""}.</p>`;
  h += `<h4>Attributes</h4><div class="agrid sagrid">${SA_GROUPS.map(([g, l]) => `<div><h5>${g}</h5>${l.map(a => { const v = sAttr(i, a); return `<div class="arow ${pr && STAFF_ROLES[pr].w[a] >= 2 ? "key" : ""}" data-tip="${esc(SA[a][1] + ": " + SA[a][2])}"><span>${esc(SA[a][1])}</span><b style="color:${v ? attrColor(v) : "var(--muted)"}">${v == null ? "–" : words ? esc(bandOf(v).w) : v}</b>${!words && v ? `<small class="muted aword">${esc(bandOf(v).w)}</small>` : ""}</div>`; }).join("")}</div>`).join("")}</div>
    <p class="muted small">Underlined: the main and related attributes for ${esc(pr || "his job")}. Numbers out of 20; the word is what FM shows (set the words under In-game words).</p>`;
  // tendencies and personality
  const NP = ST.prefs.length, pv = k => ST.pref[i * NP + ST.prefs.indexOf(k)];
  const tend = [["attacking", "Attacking football"], ["directness", "Direct passing"], ["trigger_press", "Pressing"], ["tempo", "Tempo"], ["width", "Width"], ["flexibility", "Flexibility"], ["hardness_of_training", "Hard training"], ["squad_rotation", "Squad rotation"], ["buying_players", "Buying players"], ["patience", "Patience"]];
  h += `<h4>How he likes a team run</h4><p class="small muted">His preferences on 1–20, not how good he is: they show the style he'll push for (useful for an assistant or a manager).</p><div class="agrid"><div>${tend.map(([k, l]) => { const v = pv(k); return `<div class="arow"><span>${esc(l)}</span><b>${v >= 1 && v <= 20 ? v : "–"}</b></div>`; }).join("")}</div>
    <div>${["Adaptability", "Ambition", "Loyalty", "Pressure", "Professionalism", "Sportsmanship", "Temperament", "Controversy"].map((l, k) => `<div class="arow"><span>${l}</span><b>${ST.pers[i * 8 + k] || "–"}</b></div>`).join("")}</div></div>`;
  dr.innerHTML = h; dr.hidden = false; $("#scrim").hidden = false;
  if (!silent) dr.scrollTop = 0;
  document.querySelectorAll("tr[data-sid]").forEach(tr => tr.classList.toggle("rsel", +tr.dataset.sid === i));
}
// rate the open staff member as another job: this panel only, page and panel scroll stay put
function setStaffPanelRole(r) {
  if (S.sSel == null) return;
  S.sPRole = r;
  const dr = $("#drawer"), top = dr.scrollTop;
  openStaff(S.sSel, true);
  dr.scrollTop = top;
}
function staffTabsHtml() {
  const d = hasStaff() ? staffData() : null;
  return STAFF_TABS.map(([k, l]) => `<button class="ptab" data-stab="${k}" aria-selected="${!S.guide && !S.dataPage && (STAFF_TAB[S.stab] ? S.stab : "Mine") === k}">${esc(l)}${k === "Mine" && d && d.mine.size ? `<span class="pcount">${d.mine.size}</span>` : ""}</button>`).join("");
}

