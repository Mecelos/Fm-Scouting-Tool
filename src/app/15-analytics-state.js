// ---------- analytics shared by both views ----------
function ols(X, y) { // least squares via normal equations
  const k = X[0].length, A = Array.from({ length: k }, () => new Array(k + 1).fill(0));
  X.forEach((x, n) => { for (let i = 0; i < k; i++) { for (let j = 0; j < k; j++) A[i][j] += x[i] * x[j]; A[i][k] += x[i] * y[n]; } });
  for (let i = 0; i < k; i++) A[i][i] += 1e-9;
  for (let c = 0; c < k; c++) {
    let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    if (Math.abs(A[c][c]) < 1e-12) return null;
    for (let r = 0; r < k; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let j = c; j <= k; j++) A[r][j] -= f * A[c][j]; }
  }
  return A.map((row, i) => row[k] / row[i]);
}
function finishScore(sc) {
  const rows = sc.rows;
  const orank = pctRanks(rows.map(r => r.overall)), vrank = pctRanks(rows.map(r => r.p.val));
  const cr = {}; sc.cats.forEach(c => cr[c] = pctRanks(rows.map(r => r.cs[c])));
  rows.forEach((r, i) => { r.orank = orank[i]; r.vrank = vrank[i]; r.cr = {}; sc.cats.forEach(c => r.cr[c] = cr[c][i]); });
  // types
  const T = (sc.kind === "stats" ? TYPES_STATS : TYPES_ATTR)[sc.pos] || {};
  rows.forEach(r => r.type = playerType(r, T, sc.cats));
  sc.types = [...new Set(rows.map(r => r.type).filter(Boolean))];
  // fair value: log10(value) ~ score + age + age^2, fitted on this pool
  const fit = rows.filter(r => r.p.val > 0 && r.overall != null && r.p.age != null);
  if (fit.length >= 20) {
    const beta = ols(fit.map(r => [1, r.overall, r.p.age, r.p.age * r.p.age]), fit.map(r => Math.log10(r.p.val)));
    if (beta) fit.forEach(r => { r.fair = Math.pow(10, beta[0] + beta[1] * r.overall + beta[2] * r.p.age + beta[3] * r.p.age * r.p.age); r.vf = (r.p.val / r.fair - 1) * 100; });
    sc.fairLine = ols(fit.map(r => [1, Math.log10(r.p.val)]), fit.map(r => r.overall));
  }
  // rank & neighbours
  const ranked = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  ranked.forEach((r, i) => { r.rank = i + 1; r.above = ranked[i - 1]; r.below = ranked[i + 1]; });
  sc.ranked = ranked;
  // best-fitting roles
  const roles = Object.keys(ROLES[sc.pos]).filter(x => x !== "Balanced");
  const rmw = sc.kind === "stats" ? Object.fromEntries(roles.map(n => [n, statWeights(sc.pos, n, sc.model.metrics, sc.cats)])) : null;
  rows.forEach(r => {
    const ok = playerRoleSet(sc.pos, r.p);
    r.fits = roles.filter(n => !ok || ok.has(n)).map(n => [n, sc.kind === "stats"
      ? wmean(Object.entries(rmw[n]).map(([k, w]) => [r.mp[k], w]))
      : roleRating(r.p, sc.pos, n)]).map(x => sc.kind === "stats" && x[1] != null ? [x[0], x[1] + 5 * traitAdj(r.p, x[0])] : x).filter(x => x[1] != null).sort((a, b) => b[1] - a[1]).slice(0, 3);
  });
  // stacked-bar legend: role's 3 heaviest categories (stats) / attribute groups (attributes)
  if (sc.kind === "stats") {
    const cw = {}; Object.entries(sc.mw).forEach(([k, w]) => { const c = sc.primCat[k]; if (c !== "other") cw[c] = (cw[c] || 0) + w; });
    sc.stackKeys = Object.keys(cw).sort((a, b) => cw[b] - cw[a]).slice(0, 3);
  }
  else {
    const gw = {}; Object.entries(sc.weights).forEach(([a, w]) => { const g = attrGroup(a); gw[g] = (gw[g] || 0) + w; });
    sc.stackKeys = Object.keys(gw).sort((a, b) => gw[b] - gw[a]).slice(0, 3);
  }
  return sc;
}
function attrGroup(a) { return ATTRS.technical.includes(a) ? "Technical" : ATTRS.mental.includes(a) ? "Mental" : ATTRS.physical.includes(a) ? "Physical" : "Goalkeeping"; }
function playerType(r, T, cats) {
  const vals = cats.map(c => r.cr[c]).filter(v => v != null);
  if (vals.length >= 4) { const mean = vals.reduce((a, b) => a + b, 0) / vals.length; if (mean >= 62 && Math.min(...vals) >= 40) return "All-rounder"; }
  let best = null, bs = -1;
  for (const [name, sig] of Object.entries(T)) {
    const v = wmean(Object.entries(sig).filter(([c]) => cats.includes(c)).map(([c, w]) => [r.cr[c], w]));
    if (v != null && v > bs) { bs = v; best = name; }
  }
  return best;
}
// how the role score is built: start at pool average, add each part
function contributions(sc, r) {
  if (sc.kind === "stats") {
    const mw = sc.mw;
    const have = Object.keys(mw).filter(k => r.mp[k] != null);
    const W = have.reduce((t, k) => t + mw[k], 0) || 1;
    const ease = r.overall != null && r.raw != null ? r.overall - r.raw : 0;
    const miss = Object.keys(mw).filter(k => r.mp[k] == null);
    return {
      start: { l: "Pool average", v: 50 }, end: { l: "Role score", v: r.overall },
      items: have.map(k => ({ l: METRICS[k].l, d: mw[k] * (r.mp[k] - 50) / W })),
      ease: Math.abs(ease) >= 0.5 ? { l: r.p.basic ? "Few stats in his league: pulled to 50" : "Few minutes: pulled to 50", d: ease, ease: true } : null,
      easeNote: Math.abs(ease) >= 0.5 ? (r.p.basic ? `His league only records goals, xG, xA and shots, so ${miss.length} of this role's stats are missing. With only part of the picture, the score is pulled ${Math.abs(Math.round(ease))} towards the pool average (50): the fewer stats, the bigger the pull, so a hot run in a few numbers can't put him top. A player with the full set of stats isn't pulled.` : `He has played few minutes (${r.p.mins ?? 0}), so his numbers are less reliable; the score is pulled ${Math.abs(Math.round(ease))} towards the pool average (50). The pull fades out by about 1,350 minutes.`) : "",
      missing: miss.length > 6 ? [`${miss.length} stats (not recorded in his league)`] : miss.map(k => METRICS[k].l),
      zero: [], fmt: v => (v > 0 ? "+" : "") + v.toFixed(Math.abs(v) < 1 ? 1 : 0), fmtT: v => Math.round(v),
    };
  }
  const w = sc.weights, have = Object.keys(w).filter(a => r.p.a[a] != null && sc.amean[a] != null);
  const W = have.reduce((t, a) => t + w[a], 0) || 1;
  const start = have.reduce((t, a) => t + w[a] * sc.amean[a], 0) / W;
  return {
    start: { l: "Pool average", v: start }, end: { l: "Role rating", v: r.overall },
    items: have.map(a => ({ l: a, d: w[a] * (r.p.a[a] - sc.amean[a]) / W })), ease: null, missing: [], zero: [],
    fmt: v => (v > 0 ? "+" : "") + v.toFixed(2), fmtT: v => v.toFixed(1),
  };
}

// ---------- state & storage ----------
const S = {
  mode: "stats", pos: "ST", ds: [], active: {}, minMins: 500, maxAge: 0, q: "", cat: "overall", sort: null, sortDir: -1, type: null,
  sx: null, sy: null, league: true, sel: null, cmp: null, showAll: false, adding: false, addErr: "", saved: true,
  spos: "Overview", squadRole: {}, formation: "4-4-2", lineups: {}, pickBy: "both", tStyle: "auto", tBack: "any", tForm: "best", pRole: null, saveRoles: {}, saveKind: "league", saveWho: "played", adPos: "all", adQ: "", adF: {}, adSort: null, adGroups: ["info", "tot", "p90", "pct"], adTypes: null, adColor: true, dataPage: false, saveBusy: null, saveErr: "",
  stab: "Mine", sRole: {}, sWho: "job", sAge: 0, sQ: "", sF: {}, sWords: false, sNotMine: false, sBands: null, sSorts: {}, sSel: null, attrF: {},
};
const PREF_KEYS = ["mode", "pos", "minMins", "maxAge", "league", "active", "spos", "squadRole", "formation", "lineups", "pickBy", "tStyle", "tBack", "tForm", "tOop", "saveRoles", "saveKind", "saveWho", "adPos", "adQ", "adF", "adSort", "adGroups", "adTypes", "adColor", "adSeason", "cloudAuto", "stab", "sRole", "sWho", "sAge", "sF", "sWords", "sNotMine", "sBands", "sSorts", "attrF", "faOnly", "adFA", "uiScale", "scTab", "scF", "hubTab", "hubF", "learn", "mxTab"];
function loadPrefs() { try { const p = JSON.parse(localStorage.getItem("scoutlab-prefs") || "{}"); PREF_KEYS.forEach(k => { if (k in p) S[k] = p[k]; }); } catch (e) { } }
function savePrefs() { try { const p = {}; PREF_KEYS.forEach(k => p[k] = S[k]); localStorage.setItem("scoutlab-prefs", JSON.stringify(p)); } catch (e) { } }
const DB = {
  db: null,
  open() {
    return new Promise(res => {
      try {
        const rq = indexedDB.open("fm27-scout-lab", 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore("kv");
        rq.onsuccess = () => { this.db = rq.result; res(true); };
        rq.onerror = () => res(false);
      } catch (e) { res(false); }
    });
  },
  get(k) { return new Promise(res => { try { const t = this.db.transaction("kv").objectStore("kv").get(k); t.onsuccess = () => res(t.result); t.onerror = () => res(undefined); } catch (e) { res(undefined); } }); },
  set(k, v) { return new Promise(res => { try { const t = this.db.transaction("kv", "readwrite"); t.objectStore("kv").put(v, k); t.oncomplete = () => res(true); t.onerror = () => res(false); t.onabort = () => res(false); } catch (e) { res(false); } }); },
};
async function saveDatasets() {
  S.saveRoles = {}; S.ds.forEach(d => { if (d.fromSave) S.saveRoles[d.id] = d.role; }); savePrefs();
  S.saved = DB.db ? await DB.set("datasets", S.ds.filter(d => !d.fromSave)) : false; renderSaveNote();
}

function exampleDatasets() {
  const st = parseExport($("#ex-stats").textContent.trim());
  const at = parseExport($("#ex-attr").textContent.trim());
  return [
    { id: "ex-st-stats", mode: "stats", pos: "ST", role: "Centre Forward", date: "2026-11-01", example: true, ...st },
    { id: "ex-st-attr", mode: "attr", pos: "ST", role: "Centre Forward", date: "2026-11-01", example: true, ...at },
  ];
}

