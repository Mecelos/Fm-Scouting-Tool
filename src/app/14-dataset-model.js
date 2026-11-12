// ---------- dataset -> model ----------
const modelCache = new Map();
// big saves: keep only the most recently used models (they rebuild on demand); fewer on phones
const SMALL_DEVICE = (() => { try { return (navigator.deviceMemory && navigator.deviceMemory <= 4) || matchMedia("(max-width: 700px)").matches; } catch (e) { return false; } })();
const CACHE_MAX = SMALL_DEVICE ? 6 : 14;
function lruGet(map, k) { const v = map.get(k); map.delete(k); map.set(k, v); return v; }
function lruTrim(map, max) { for (const k of map.keys()) { if (map.size <= max) break; map.delete(k); } }
// big saves: also cap the players held across cached models/scores (each player costs a few KB), oldest out first, newest kept
function lruTrimBy(map, budget, size) { let total = 0; for (const v of map.values()) total += size(v); for (const [k, v] of map) { if (total <= budget || map.size <= 1) break; total -= size(v); map.delete(k); } }
const MODEL_BUDGET = SMALL_DEVICE ? 30000 : 100000, LINK_BUDGET = SMALL_DEVICE ? 20000 : 60000;
function buildModel(ds) {
  if (modelCache.has(ds.id)) return lruGet(modelCache, ds.id);
  const H = ds.headers, used = new Set();
  const bi = {}; for (const k in BASE) { bi[k] = colIndex(H, BASE[k]); if (bi[k] >= 0) used.add(bi[k]); }
  const get = (r, k) => bi[k] >= 0 ? r[bi[k]] : "";
  const allMetric = metricIndexMap(H, bi.mins >= 0), allAttr = attrIndexMap(H);
  // "not used" = recognised by neither view
  Object.values(allMetric).forEach(x => used.add(x.i)); Object.values(allAttr).forEach(i => used.add(i));
  for (const k in METRICS) (METRICS[k].tot || []).forEach(a => { const j = colIndex(H, [a]); if (j >= 0 && allMetric[k]) used.add(j); });
  const metricIdx = ds.mode === "stats" ? allMetric : {}, attrIdx = ds.mode === "attr" ? allAttr : {};
  let npIdx = null;
  ["Svh", "Svp", "Svt", "Pens", "Pens S", "Goals", "Penalties Scored", "Penalties Taken"].forEach(n => { const j = colIndex(H, [n]); if (j >= 0) used.add(j); });
  if (ds.mode === "stats" && bi.mins >= 0) {
    const g = colIndex(H, ["Goals", "Gls"]), ps = colIndex(H, ["Pens S", "Penalties Scored"]);
    if (g >= 0 && ps >= 0) { npIdx = [g, ps]; used.add(g); used.add(ps); const pt = colIndex(H, ["Pens", "Penalties Taken"]); if (pt >= 0) used.add(pt); }
  }
  // saves per 90 = (saves held + parried + tipped) / minutes, when there is no saves-per-90 column
  let svIdx = null;
  if (ds.mode === "stats" && !metricIdx.sv90 && bi.mins >= 0) {
    const ii = ["Svh", "Svp", "Svt"].map(n => colIndex(H, [n]));
    if (ii.every(i => i >= 0)) { svIdx = ii; ii.forEach(i => used.add(i)); }
  }
  const players = ds.rows.map((r, ix) => {
    const p = {
      ix, name: get(r, "name") || "?", club: get(r, "club"), age: num(get(r, "age")), mins: num(get(r, "mins")),
      valTxt: get(r, "value"), val: money(get(r, "value")), bestPos: get(r, "bestPos") || get(r, "position"), position: get(r, "position"), div: get(r, "div"),
      country: get(r, "country"), inf: get(r, "inf"), uid: get(r, "uid"), nat: get(r, "nat"), rec: get(r, "rec"), wage: get(r, "wage"),
      pers: get(r, "pers"), foot: get(r, "foot"), height: get(r, "height"), apps: get(r, "apps"), starts: get(r, "starts"),
    };
    if (p.club === "-") p.club = "";
    if (p.rec === "-") p.rec = "";
    if (ds.mode === "stats") {
      p.m = {};
      for (const k in metricIdx) {
        const { i, per90 } = metricIdx[k];
        let v = num(r[i]);
        if (v != null && per90) v = p.mins > 0 ? v * 90 / p.mins : null;
        p.m[k] = v;
      }
      if (npIdx && p.mins > 0) { const g = num(r[npIdx[0]]), ps = num(r[npIdx[1]]); if (g != null) p.m.npg90 = Math.max(0, g - (ps || 0)) * 90 / p.mins; }
      if (svIdx && p.m.sv90 == null && p.mins > 0) { const t = svIdx.map(i => num(r[i])); if (t.every(v => v != null)) p.m.sv90 = t.reduce((x, y) => x + y, 0) * 90 / p.mins; }
      // leagues FM doesn't track in detail export 0.00 for distance, sprints, pressures, headers etc. -> treat as missing
      const probe = ["dist90", "spr90", "presa90", "aera90"].filter(k => k in p.m);
      if (p.mins > 0 && probe.length >= 2 && probe.every(k => p.m[k] === 0)) {
        p.basic = true;
        for (const k in p.m) if (!BASIC_KEEP.has(k)) p.m[k] = null;
      }
      p.lg = leagueFactor(p.country, p.div);
    } else {
      p.a = {};
      for (const a in attrIdx) p.a[a] = num(r[attrIdx[a]]);
    }
    return p;
  });
  const mset = new Set(Object.keys(metricIdx)); if (svIdx) mset.add("sv90");
  // non-penalty goals per 90 = (goals - penalties scored) / minutes; replaces Goals/90 in the scoring when available
  if (npIdx) { mset.add("npg90"); mset.delete("gls90"); }
  const model = {
    ds, players, metrics: [...mset], attrs: Object.keys(attrIdx), hasMins: bi.mins >= 0, hasRec: bi.rec >= 0,
    unused: H.filter((h, i) => !used.has(i) && h), usedCount: used.size,
  };
  modelCache.set(ds.id, model); lruTrim(modelCache, CACHE_MAX); lruTrimBy(modelCache, MODEL_BUDGET, m => m.players.length);
  return model;
}

function pctRanks(vals) { // vals: array of numbers|null -> percentile 0..100 (mid-rank)
  const v = vals.map((x, i) => [x, i]).filter(a => a[0] != null).sort((a, b) => a[0] - b[0]);
  const out = new Array(vals.length).fill(null), n = v.length;
  if (!n) return out;
  let i = 0;
  while (i < n) {
    let j = i; while (j + 1 < n && v[j + 1][0] === v[i][0]) j++;
    const p = n === 1 ? 50 : ((i + j) / 2) / (n - 1) * 100;
    for (let k = i; k <= j; k++) out[v[k][1]] = p;
    i = j + 1;
  }
  return out;
}
const median = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); if (!v.length) return null; const m = v.length >> 1; return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2; };
const wmean = pairs => { let s = 0, w = 0; for (const [v, wt] of pairs) if (v != null) { s += v * wt; w += wt; } return w ? s / w : null; };

function scoreStats(model, pos, role, opts) {
  const minM = model.hasMins ? opts.minMins : 0;
  const pool = model.players.filter(p => p.mine || !model.hasMins || (p.mins || 0) >= minM); // your own squad players always stay in
  const cats = roleCats(pos, role, POS_CATS[pos]).filter(c => Object.keys(CATS[c].m).some(k => model.metrics.includes(k)));
  const roleDef = (ROLES[pos] || {})[role] || ROLES[pos].Balanced;
  const pct = {};
  for (const k of model.metrics) {
    const inv = METRICS[k].inv;
    const adj = pool.map(p => {
      let v = p.m[k]; if (v == null) return null;
      if (!opts.league) return v;
      const f = p.lg.k;
      if (SOFT.has(k)) return v * (0.5 + 0.5 * f);
      if (inv) return v / f;
      if (k === "xgop90" && v < 0) return v / f;
      return v * f;
    });
    const r = pctRanks(adj);
    pct[k] = inv ? r.map(x => x == null ? null : 100 - x) : r;
  }
  const mw = statWeights(pos, role, model.metrics, cats);
  const rows = pool.map((p, i) => {
    const mp = {}; for (const k of model.metrics) mp[k] = pct[k][i];
    const cs = {};
    for (const c of cats) cs[c] = wmean(Object.entries(CATS[c].m).filter(([k]) => k in mp).map(([k, w]) => [mp[k], w]));
    const wl = Object.keys(mw).map(k => [mp[k], mw[k]]);
    const raw = wmean(wl);
    // small samples: pull the role score toward the pool average (full weight from ~1350 mins); missing categories pull further
    const wAll = wl.reduce((t, x) => t + x[1], 0), wHave = wl.reduce((t, x) => t + (x[0] != null ? x[1] : 0), 0);
    const cov = wAll ? wHave / wAll : 1;
    const rel = (model.hasMins ? Math.min(1, 0.4 + 0.6 * (p.mins || 0) / 1350) : 1) * cov;
    const overall = raw == null || (model.hasMins && !(p.mins > 0)) ? null : 50 + (raw - 50) * rel; // no minutes = no stats score
    return { p, mp, cs, overall, raw, rel, cov };
  });
  const primCat = {}; Object.keys(mw).forEach(k => primCat[k] = cats.find(c => k in CATS[c].m) || "other");
  const sc = { kind: "stats", pos, role, rows, cats, catLabel: c => CATS[c].l, roleDef, mw, primCat, pool: pool.length, total: model.players.length, model };
  if (opts.lean) { const o = pctRanks(rows.map(r => r.overall)); rows.forEach((r, i) => r.orank = o[i]); return sc; }   // just the score and its rank (Upgrades): skips types, fair value and best roles
  return finishScore(sc);
}

const roleWCache = {};
const roleW = (pos, role) => roleWCache[pos + "|" + role] || (roleWCache[pos + "|" + role] = roleAttrWeights(pos, role));
function attrRating(p, w) { return wmean(Object.entries(w).filter(([a]) => p.a[a] != null).map(([a, wt]) => [p.a[a], wt])); }
function scoreAttr(model, pos, role) {
  const w = roleW(pos, role);
  const cls = POS_ACL[pos].filter(c => Object.keys(ACL[c].m).some(a => model.attrs.includes(a)));
  const rows = model.players.map(p => {
    const cs = {};
    for (const c of cls) cs[c] = wmean(Object.entries(ACL[c].m).filter(([a]) => p.a[a] != null).map(([a, wt]) => [p.a[a], wt]));
    return { p, cs, overall: attrRating(p, w) };
  });
  const amean = {}, apct = {};
  model.attrs.forEach(a => {
    const vals = rows.map(r => r.p.a[a]);
    const v = vals.filter(x => x != null); amean[a] = v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
    apct[a] = pctRanks(vals);
  });
  rows.forEach((r, i) => { r.ap = {}; model.attrs.forEach(a => r.ap[a] = apct[a][i]); });
  const sc = { kind: "attr", pos, role, rows, cats: cls, catLabel: c => ACL[c].l, weights: w, amean, pool: rows.length, total: rows.length, model };
  return finishScore(sc);
}

