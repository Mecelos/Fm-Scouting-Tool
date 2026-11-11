// ---------- past seasons (FM archives every finished season in the save) ----------
// Imported history (seasons before the career) can hold only the basics: other stats count only from seasons that recorded them
const BASIC_FIELDS = new Set(["minutes", "starts", "substitute_appearances", "rated_appearances", "goals", "assists", "average_rating"]);
const hasHistory = () => !!(SAVE && SAVE.hist && SAVE.hist.n);
function histYears() {
  if (!hasHistory()) return [];
  if (SAVE._years) return SAVE._years;
  const s = new Set(); const y = SAVE.hist.year; for (let r = 0; r < y.length; r++) s.add(y[r]);
  return (SAVE._years = [...s].sort((a, b) => b - a));
}
// the season the save is in (start year): July or later = this year's season
function curSeasonStart() { const d = new Date((SAVE && SAVE.meta.gameDate || "2026-08-01") + "T12:00:00Z"); return d.getUTCMonth() >= 6 ? d.getUTCFullYear() : d.getUTCFullYear() - 1; }
// FM stores each archived season under the year it started (checked on real FM26 and FM27 saves: a 2029/30 season is 2029,
// a calendar-year league's 2030 season is 2030). Lines from this season can be archived too: a player's earlier club
// before a move, and calendar-year leagues; they are labelled so.
const yy = y => String(y).slice(-2);
function seasonLabel(y) { return y >= curSeasonStart() ? `${y}/${yy(y + 1)} · earlier clubs & calendar leagues` : `${y}/${yy(y + 1)}`; }
const seasonShort = y => `${y}/${yy(y + 1)}`;
const pastYears = () => histYears().filter(y => y < curSeasonStart());
const curSeasonLabel = () => { const s = curSeasonStart(); return `${s}/${yy(s + 1)}`; };
function seasonSel() { const s = S.adSeason; if (s === "all" && hasHistory()) return "all"; if (s != null && s !== "cur" && histYears().includes(+s)) return +s; return "cur"; }
const seasonSelLabel = sel => sel === "cur" ? `This season (${curSeasonLabel()})` : sel === "all" ? "All-time" : seasonLabel(sel);
// rows of each player's archive, grouped by player (built once)
function histByPlayer() {
  if (SAVE._hp) return SAVE._hp;
  const H = SAVE.hist, n = SAVE.n, start = new Int32Array(n + 1), rows = new Int32Array(H.n);
  for (let r = 0; r < H.n; r++) start[H.player[r] + 1]++;
  for (let i = 0; i < n; i++) start[i + 1] += start[i];
  const fill = start.slice(0, n); for (let r = 0; r < H.n; r++) rows[fill[H.player[r]]++] = r;
  return (SAVE._hp = { start, rows });
}
// archived rows for a stats choice: first-team games for League / All competitions, youth and B/II sides for Youth
const kindRows = kind => { const Y = SAVE.hist && SAVE.hist.youth, base = kind === "league" ? k => k === 1 : k => k >= 1 && k <= 3, yw = kind === "youth";
  return (k, r) => base(k) && (Y ? !!Y[r] === yw : !yw); };
// one stats source like this season's ({n, row, cols}), for an archived season or all-time; kept for the last few picks
function seasonStats(sel, kind) {
  if (sel === "cur" || !hasHistory()) return SAVE.stats[kind];
  const key = sel + "|" + kind; SAVE._ss = SAVE._ss || new Map();
  if (SAVE._ss.has(key)) return SAVE._ss.get(key);
  const H = SAVE.hist, n = SAVE.n, cur = SAVE.stats[kind], fields = Object.keys(cur ? cur.cols : SAVE.stats.league.cols);
  const okKind = kindRows(kind), row = new Int32Array(n).fill(-1), who = [];
  const take = i => { if (row[i] < 0) { row[i] = who.length; who.push(i); } return row[i]; };
  const sel_ = r => okKind(H.kind[r], r) && (sel === "all" || H.year[r] === sel);
  for (let r = 0; r < H.n; r++) if (sel_(r)) take(H.player[r]);
  if (sel === "all" && cur) for (let i = 0; i < n; i++) if (cur.row[i] >= 0) take(i);
  const m = who.length, cols = {}; fields.forEach(f => { cols[f] = new Float32Array(m).fill(NaN); });
  const dmins = new Float32Array(m), ratedW = new Float64Array(m), rated = new Float64Array(m), clubOf = new Int32Array(m).fill(-1), best = new Float32Array(m), years = new Map();
  const scratch = {}; fields.forEach(f => { scratch[f] = new Float64Array(1); });
  const addRow = (k, get, detailed, club, yearKey) => {
    const mins = get("minutes") || 0;
    for (const f of fields) {
      if (f === "average_rating") continue;
      if (!detailed && !BASIC_FIELDS.has(f)) continue;
      const v = get(f); if (v !== v) continue;
      const a = cols[f][k]; cols[f][k] = a !== a ? v : a + v;
    }
    const ar = get("average_rating"), ra = get("rated_appearances") || 0;
    if (ar === ar && ra > 0) { ratedW[k] += ar * ra; rated[k] += ra; }
    if (detailed) dmins[k] += mins;
    if (club >= 0 && mins > best[k]) { best[k] = mins; clubOf[k] = club; }
    if (sel === "all") { let s = years.get(k); if (!s) years.set(k, s = new Set()); s.add(yearKey); }
  };
  for (let r = 0; r < H.n; r++) {
    if (!sel_(r)) continue;
    fields.forEach(f => { scratch[f][0] = NaN; });
    FR.historyLine(SAVE, r, scratch, 0);
    const detailed = scratch.passes_attempted[0] > 0 || scratch.distance_km[0] > 0;
    addRow(row[H.player[r]], f => scratch[f][0], detailed, H.club[r], H.year[r]);
  }
  if (sel === "all" && cur) for (let i = 0; i < n; i++) { const cr = cur.row[i]; if (cr < 0) continue; addRow(row[i], f => cur.cols[f] ? cur.cols[f][cr] : NaN, true, SAVE.clubIdx[i], "cur"); }
  for (let k = 0; k < m; k++) cols.average_rating[k] = rated[k] > 0 ? ratedW[k] / rated[k] : NaN;
  const seasons = new Uint8Array(m); if (sel === "all") years.forEach((s, k) => { seasons[k] = s.size; });
  const out = { n: m, row, cols, dmins, clubOf: sel === "all" ? null : clubOf, seasons: sel === "all" ? seasons : null, past: true };
  SAVE._ss.set(key, out); if (SAVE._ss.size > 3) SAVE._ss.delete(SAVE._ss.keys().next().value);
  return out;
}
// a player's seasons, newest first, then all-time (for his panel)
function playerSeasons(i, kind) {
  const H = SAVE.hist, cur = SAVE.stats[kind], fields = Object.keys((cur || SAVE.stats.league).cols), okKind = kindRows(kind);
  const by = new Map();
  const acc = y => { let a = by.get(y); if (!a) { a = { y, v: {}, dm: 0, ratedW: 0, rated: 0, club: -1, best: -1 }; by.set(y, a); } return a; };
  const add = (a, get, detailed, club) => {
    const mins = get("minutes") || 0;
    for (const f of fields) { if (f === "average_rating" || (!detailed && !BASIC_FIELDS.has(f))) continue; const v = get(f); if (v !== v) continue; a.v[f] = (a.v[f] || 0) + v; }
    const ar = get("average_rating"), ra = get("rated_appearances") || 0; if (ar === ar && ra > 0) { a.ratedW += ar * ra; a.rated += ra; }
    if (detailed) a.dm += mins; if (club >= 0 && mins > a.best) { a.best = mins; a.club = club; }
  };
  if (hasHistory()) {
    const hp = histByPlayer(), scratch = {}; fields.forEach(f => { scratch[f] = new Float64Array(1); });
    for (let q = hp.start[i]; q < hp.start[i + 1]; q++) {
      const r = hp.rows[q]; if (!okKind(H.kind[r], r)) continue;
      fields.forEach(f => { scratch[f][0] = NaN; }); FR.historyLine(SAVE, r, scratch, 0);
      add(acc(H.year[r]), f => scratch[f][0], scratch.passes_attempted[0] > 0 || scratch.distance_km[0] > 0, H.club[r]);
    }
  }
  const list = [...by.values()].sort((a, b) => b.y - a.y).map(a => ({ ...a, label: seasonShort(a.y) + (a.y >= curSeasonStart() ? " (earlier)" : "") }));
  if (cur && cur.row[i] >= 0) { const a = { y: "cur", v: {}, dm: 0, ratedW: 0, rated: 0, club: -1, best: -1, label: curSeasonLabel() }; const cr = cur.row[i]; add(a, f => cur.cols[f] ? cur.cols[f][cr] : NaN, true, SAVE.clubIdx[i]); list.unshift(a); }
  list.forEach(a => { a.v.average_rating = a.rated ? a.ratedW / a.rated : NaN; });
  if (list.length > 1) { const t = { y: "all", v: {}, dm: 0, ratedW: 0, rated: 0, club: -1, best: -1, label: "All-time" }; list.forEach(a => { for (const f in a.v) if (f !== "average_rating") t.v[f] = (t.v[f] || 0) + a.v[f]; t.dm += a.dm; t.ratedW += a.ratedW; t.rated += a.rated; }); t.v.average_rating = t.rated ? t.ratedW / t.rated : NaN; t.n = list.length; list.push(t); }
  return list;
}
// minutes a player has for youth / B teams this season, and for the first team (shown in his panel)
function youthNote(p) {
  if (!SAVE || !p || !p.uid || !SAVE.stats || !SAVE.stats.youth) return "";
  const i = saveUidIndex().get(p.uid); if (i == null) return "";
  const Y = SAVE.stats.youth, O = SAVE.stats.overall, y = Y.row[i] >= 0 ? Y.cols.minutes[Y.row[i]] : 0, f = O && O.row[i] >= 0 ? O.cols.minutes[O.row[i]] : 0;
  if (!(y > 0)) return "";
  const k = saveKind();
  return `<p class="small ${k === "youth" ? "muted" : "warnc"}">${k === "youth" ? "Showing his youth / B team stats" : "Youth / B team minutes aren't counted in his stats here"}: ${Math.round(y).toLocaleString()} min for youth or B teams, ${Math.round(f).toLocaleString()} for the first team this season.</p>`;
}
function saveUidIndex() { if (SAVE._uix) return SAVE._uix; const m = new Map(); for (let i = 0; i < SAVE.n; i++) m.set("s" + SAVE.uid[i], i); return (SAVE._uix = m); }
// season-by-season table in a player's panel
function seasonsHtml(p) {
  if (!SAVE || !p || !p.uid) return "";
  const i = saveUidIndex().get(String(p.uid).startsWith("s") ? String(p.uid) : "s" + p.uid); if (i == null) return "";
  const kind = saveKind(); if (!kind) return "";
  const list = playerSeasons(i, kind); if (!list.length) return "";
  const g = savePos().bench[i], gk = g === "GK";
  const per90 = (a, f) => { const m = BASIC_FIELDS.has(f) ? a.v.minutes : a.dm; const v = a.v[f]; return m > 0 && v != null ? v * 90 / m : NaN; };
  const pct = (a, x, y) => a.v[y] > 0 && a.v[x] != null ? a.v[x] / a.v[y] * 100 : NaN;
  const C = gk ? [["Apps", "Appearances", a => (a.v.starts || 0) + (a.v.substitute_appearances || 0), 0], ["Mins", "Minutes", a => a.v.minutes, 0], ["Conc", "Goals conceded", a => a.v.goals_allowed, 0],
    ["CS", "Clean sheets", a => a.v.clean_sheets, 0], ["Sv%", "Save %", a => { const s = (a.v.saves_held || 0) + (a.v.saves_parried || 0) + (a.v.saves_tipped || 0); return a.v.shots_on_target_faced > 0 ? s / a.v.shots_on_target_faced * 100 : NaN; }, 0, "svPct", 1],
    ["xGP/90", "Expected goals prevented per 90", a => per90(a, "expected_goals_prevented"), 2, "xgp"], ["Pas%", "Pass completion %", a => pct(a, "passes_completed", "passes_attempted"), 0, "pasPct", 1], ["Rat", "Average rating", a => a.v.average_rating, 2, "avr", 1]]
    : [["Apps", "Appearances", a => (a.v.starts || 0) + (a.v.substitute_appearances || 0), 0], ["Mins", "Minutes", a => a.v.minutes, 0], ["Gls", "Goals", a => a.v.goals, 0], ["Ast", "Assists", a => a.v.assists, 0],
      ["xG/90", "Expected goals per 90", a => per90(a, "expected_goals"), 2, "xg"], ["xA/90", "Expected assists per 90", a => per90(a, "expected_assists"), 2, "xa"], ["KP/90", "Key passes per 90", a => per90(a, "key_passes"), 2, "kp"],
      ["PrgP/90", "Progressive passes per 90", a => per90(a, "progressive_passes"), 2, "prpas"], ["Drb/90", "Dribbles per 90", a => per90(a, "dribbles"), 2, "drb"], ["TckW/90", "Tackles won per 90", a => per90(a, "tackles_completed"), 2, "tckc"],
      ["Int/90", "Interceptions per 90", a => per90(a, "interceptions"), 2, "itc"], ["Hdr%", "Headers won %", a => pct(a, "headers_won", "aerial_challenges_attempted"), 0, "hdrPct", 1], ["Pas%", "Pass completion %", a => pct(a, "passes_completed", "passes_attempted"), 0, "pasPct", 1], ["Rat", "Average rating", a => a.v.average_rating, 2, "avr", 1]];
  const cell = (a, c) => {
    const v = c[2](a); if (v == null || v !== v) return `<td class="num"></td>`;
    let bg = "";
    if (c[4] && S.adColor !== false && (c[5] ? (a.v.minutes || 0) >= AD_MIN_MINS : (a.dm || 0) >= AD_MIN_MINS)) { const t = benchFor(c[4], g); if (t) bg = ` style="background:${adColor(adScore(v, t))}"`; }
    return `<td class="num"${bg}>${c[3] ? v.toFixed(c[3]) : Math.round(v).toLocaleString()}${c[5] && /%/.test(c[0]) ? "%" : ""}</td>`;
  };
  return `<h4>Season by season</h4><div class="tscroll"><table class="gtable narrow seasons"><thead><tr><th>Season</th><th>Club</th>${C.map(c => `<th class="num" title="${esc(c[1])}">${esc(c[0])}</th>`).join("")}</tr></thead><tbody>
    ${list.map(a => `<tr class="${a.y === "all" ? "alltime" : a.y === "cur" ? "cur" : ""}"><td>${esc(a.label)}${a.y === "cur" ? " <span class=\"muted small\">so far</span>" : ""}</td><td title="${a.club >= 0 ? esc(SAVE.clubs[a.club]) : ""}">${a.y === "all" ? `${a.n} seasons` : esc(a.club >= 0 ? (SAVE.clubShort && SAVE.clubShort[a.club]) || SAVE.clubs[a.club] : "")}</td>${C.map(c => cell(a, c)).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="small muted">${esc(SAVE_KINDS[kind])} (switch in All data or on the Data page). Per 90s and percentages are coloured for his position once a season has ${AD_MIN_MINS}+ minutes. Seasons from before your career can hold only apps, goals, assists and rating; the other numbers count only seasons that recorded them.</p>`;
}

