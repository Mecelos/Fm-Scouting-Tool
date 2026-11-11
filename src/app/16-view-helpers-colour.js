// ---------- helpers for current view ----------
const key = () => S.mode + "|" + S.pos;
const tabSets = (mode = S.mode, pos = S.pos) => S.ds.filter(d => d.mode === mode && d.pos === pos);
function activeDs() {
  const sets = tabSets(); if (!sets.length) return null;
  const id = S.active[key()]; return sets.find(d => d.id === id) || sets[0];
}
// attributes files often lack club/age: borrow them from a stats file of the same position (Unique ID, else unique name)
function enrich(model) {
  const sets = tabSets("stats", model.ds.pos);
  if (model.enrichedN === sets.length) return; model.enrichedN = sets.length;
  const byId = new Map(), byName = new Map();
  sets.forEach(d => buildModel(d).players.forEach(p => { if (p.uid) byId.set(p.uid, p); byName.set(p.name, byName.has(p.name) ? null : p); }));
  model.players.forEach(p => {
    const q = (p.uid && byId.get(p.uid)) || byName.get(p.name); if (!q) return;
    if (!p.club) p.club = q.club; if (p.age == null) p.age = q.age; if (!p.bestPos) p.bestPos = q.bestPos;
    if (p.val == null) { p.val = q.val; p.valTxt = q.valTxt; }
  });
}
function currentScore() {
  if (S.mode === "squad") { const e = POSITIONS.includes(S.spos) ? squadEval(S.spos) : null; return e && e.prim; }
  const ds = activeDs(); if (!ds) return null;
  const m = buildModel(ds);
  if (ds.mode === "attr") enrich(m);
  const sym = (m.players.find(p => /^[€£$]/.test(p.valTxt || "")) || {}).valTxt; CUR = sym ? sym[0] : "€";
  return ds.mode === "stats" ? scoreStats(m, ds.pos, ds.role, { minMins: S.minMins, league: S.league }) : scoreAttr(m, ds.pos, ds.role);
}
// the player panel can show him in another role without changing the page (S.pRole = panel-only role)
// his rank in each role of this position (same pool and filters as the page), filled in just after the panel opens
const roleRankCache = new Map();
function roleScore(ds, role) {
  const ck = [ds.id, role, S.minMins, S.league].join("|"); if (roleRankCache.has(ck)) return roleRankCache.get(ck);
  const m = buildModel(ds); if (ds.mode === "attr") enrich(m);
  const v = ds.mode === "stats" ? scoreStats(m, ds.pos, role, { minMins: S.minMins, league: S.league }) : scoreAttr(m, ds.pos, role);
  if (roleRankCache.size > 40) roleRankCache.clear(); roleRankCache.set(ck, v); return v;
}
function fillRoleRanks() {
  const el = document.getElementById("rranks"); if (!el || el.dataset.done) return;
  const ds = activeDs(); if (!ds || !ROLES[ds.pos]) { el.remove(); return; }
  const pix = el.dataset.pix, cur = (panelScore() || {}).role, out = [];
  Object.keys(ROLES[ds.pos]).forEach(role => { const sc = roleScore(ds, role), r = sc && sc.rows.find(x => String(x.p.ix) === pix); if (r && r.rank) out.push({ role, rank: r.rank, n: sc.ranked.length }); });
  el.dataset.done = 1;
  if (!out.length) { el.remove(); return; }
  out.sort((a, b) => a.rank - b.rank);
  el.innerHTML = `<span class="small muted">His rank in each role:</span> ${out.map(x => `<button class="rrchip ${x.role === cur ? "cur" : ""}" data-rrole="${esc(x.role)}">#${x.rank} <span>${esc(x.role === "Balanced" ? "Overall" : x.role)}</span></button>`).join("")}`;
}
document.addEventListener("click", e => { const t = e.target.closest("[data-rrole]"); if (t) setPanelRole(t.dataset.rrole); });
new MutationObserver(() => { const el = document.getElementById("rranks"); if (el && !el.dataset.done && !el.dataset.q) { el.dataset.q = 1; setTimeout(fillRoleRanks, 30); } }).observe(document.documentElement, { childList: true, subtree: true });
function panelScore(sc) {
  sc = sc || currentScore();
  if (!sc || !S.pRole || S.pRole === sc.role || !(ROLES[sc.pos] || {})[S.pRole]) return sc;
  if (S.mode === "squad") { const e = squadEval(S.spos, S.pRole); return (e && e.prim) || sc; }
  const ds = activeDs(); if (!ds) return sc;
  const ck = [ds.id, S.pRole, S.minMins, S.league].join("|");
  if (panelCache.k === ck) return panelCache.v;
  const m = buildModel(ds); if (ds.mode === "attr") enrich(m);
  const v = ds.mode === "stats" ? scoreStats(m, ds.pos, S.pRole, { minMins: S.minMins, league: S.league }) : scoreAttr(m, ds.pos, S.pRole);
  panelCache = { k: ck, v };
  return v;
}
let panelCache = { k: null, v: null };
function visibleRows(sc, ignoreType) {
  const q = norm(String(S.q || "").replace(/[☆★]/g, "")), af = attrFilters(sc);
  return sc.rows.filter(r => (!S.maxAge || (r.p.age != null && r.p.age <= S.maxAge)) && (!q || norm(r.p.name + " " + r.p.club).includes(q))
    && (ignoreType || !S.type || r.type === S.type) && (!S.faOnly || isFA(r.p)) && (!af.length || attrPass(sc, r.p, af)));
}
const isFA = p => !p.club || p.club === FA_CLUB;
// attribute filters (minimum values, e.g. Passing 13+, Pace 15+): every position tab, Stats and Attributes
function faCount(sc) { let n = 0; sc.rows.forEach(r => { if (isFA(r.p)) n++; }); return n.toLocaleString(); }
function attrSource(sc) { if (sc.kind === "attr") return sc.model; const o = linkedScore(sc); return o ? o.model : null; }
function attrFilters(sc) { const src = attrSource(sc), have = src ? new Set(src.attrs) : null; return Object.entries(S.attrF || {}).filter(([a, v]) => v > 0 && (!have || have.has(a))); }
function attrPass(sc, p, af) {
  let a = p.a;
  if (sc.kind !== "attr") { const l = linked(sc, p); a = l ? l.r.p.a : null; }
  if (!a) return false;
  for (const [k, v] of af) if (!(a[k] != null && a[k] >= v)) return false;
  return true;
}
function attrFiltersHtml(sc) {
  const src = attrSource(sc), have = src ? src.attrs : [];
  const on = Object.entries(S.attrF || {}).filter(([, v]) => v > 0), off = on.filter(([a]) => !have.includes(a));
  if (!have.length) return `<div class="afilters"><span class="small muted">Attribute filters need attributes: load your save, or a ${esc(sc.pos)} attributes export.</span></div>`;
  const groups = [["Technical", ATTRS.technical], ["Mental", ATTRS.mental], ["Physical", ATTRS.physical], ["Goalkeeping", ATTRS.goalkeeping]].map(([g, l]) => [g, l.filter(x => have.includes(x))]).filter(x => x[1].length);
  return `<div class="afilters" role="group" aria-label="Attribute filters"><span class="small muted">Attribute filters</span>
    ${on.map(([a, v]) => `<button class="afchip ${off.some(x => x[0] === a) ? "off" : ""}" data-afrm="${esc(a)}" title="${off.some(x => x[0] === a) ? "Not in this file, so not applied here. " : ""}Remove this filter">${esc(a)} ≥ ${v} <span aria-hidden="true">✕</span></button>`).join("")}
    <select id="afAttr" aria-label="Attribute"><option value="">Attribute…</option>${groups.map(([g, l]) => `<optgroup label="${g}">${l.map(x => `<option>${esc(x)}</option>`).join("")}</optgroup>`).join("")}</select>
    <input id="afMin" type="number" min="1" max="20" inputmode="numeric" placeholder="min 1–20" aria-label="Minimum">
    <button class="ghost small" data-act="afadd">Add</button>${on.length ? `<button class="linkbtn small" data-act="afclear">Clear</button>` : ""}</div>`;
}
function sortVal(r, k) {
  if (k === "overall") return r.overall;
  if (k === "goals") return tot(r.p, "gls90"); if (k === "assists") return tot(r.p, "ast90");
  if (k === "vf") return r.vf == null ? null : -r.vf; if (k === "type") return r.type || "";
  if (k === "age") return r.p.age; if (k === "mins") return r.p.mins; if (k === "value") return r.p.val; if (k === "name") return r.p.name;
  if (k === "lk") return r.lk ? r.lk.overall : null;
  if (k === "ca" || k === "pa") { const c = capaOf(r.p); return c ? c[k === "ca" ? 0 : 1] : null; }
  return r.cs[k];
}
const scoreFmt = (sc, v) => v == null ? "–" : sc.kind === "attr" ? v.toFixed(1) : Math.round(v);
const scoreMax = sc => sc.kind === "attr" ? 20 : 100;
const scoreName = sc => sc.kind === "attr" ? "Role rating" : "Role score";
function tot(p, k) { const v = p.m && p.m[k]; return v == null || p.mins == null ? null : Math.round(v * p.mins / 90); }
const vfText = r => r.vf == null ? "–" : r.vf < 0 ? "−" + Math.round(-r.vf) + "%" : r.vf >= 900 ? "×10+" : "×" + (1 + r.vf / 100).toFixed(1);
function vfTag(r, long) {
  if (r.vf == null) return "";
  const t = `title="Fair value for his score and age ~${esc(fmtMoney(r.fair))}"`;
  if (r.vf <= -50) return `<span class="tag good" ${t}>${long ? `Bargain: ${Math.round(-r.vf)}% under fair value` : `Bargain ${vfText(r)}`}</span>`;
  if (r.vf >= 100) return `<span class="tag bad" ${t}>${long ? `Pricey: ${vfText(r)} fair value` : `Pricey ${vfText(r)}`}</span>`;
  return long ? `<span class="tag" ${t}>Price about fair (${vfText(r)})</span>` : "";
}
const typeTag = r => r.type ? `<span class="tag type">${esc(r.type)}</span>` : "";

// linked dataset (other mode, same position) -> matching row
const linkCache = new Map();
// the other view (stats <-> attributes) for the same position and role, scored once and cached
function linkedScore(sc) {
  if (sc.other) return sc.other;
  if (S.mode === "squad") return null;
  const other = sc.kind === "stats" ? "attr" : "stats";
  const sets = tabSets(other, sc.pos); if (!sets.length) return null;
  const ds = activeDs(); if (!ds) return null;
  const ds2 = sets.find(d => d.role === ds.role) || sets[0];
  const ck = [ds2.id, sc.role, S.league].join("|");
  if (linkCache.has(ck)) return linkCache.get(ck);
  const m2 = buildModel(ds2);
  if (other === "attr") enrich(m2);
  const sc2 = other === "stats" ? scoreStats(m2, ds2.pos, sc.role, { minMins: 0, league: S.league }) : scoreAttr(m2, ds2.pos, sc.role);
  sc2.byUid = new Map(); sc2.byName = new Map();
  sc2.rows.forEach(x => { if (x.p.uid) sc2.byUid.set(x.p.uid, x); sc2.byName.set(x.p.name, sc2.byName.has(x.p.name) ? null : x); });
  lruTrim(linkCache, SMALL_DEVICE ? 3 : 8);
  linkCache.set(ck, sc2); lruTrimBy(linkCache, LINK_BUDGET, s => (s && s.rows ? s.rows.length : 0));
  return sc2;
}
function linked(sc, p) {
  const sc2 = linkedScore(sc); if (!sc2) return null;
  let r = null;
  if (sc.other) r = matchRow(sc2, p);
  else {
    if (p.uid) r = sc2.byUid.get(p.uid) || null;
    if (!r && p.club) r = sc2.rows.find(x => x.p.name === p.name && x.p.club === p.club) || null;
    if (!r) r = sc2.byName.get(p.name) || null;
  }
  return r ? { sc: sc2, r } : null;
}

// ---------- colour ----------
const HEAT = [[0, [184, 64, 60]], [25, [112, 54, 54]], [50, [38, 44, 54]], [75, [31, 79, 140]], [100, [47, 127, 224]]];
function heat(p) {
  if (p == null) return "transparent";
  p = Math.max(0, Math.min(100, p));
  for (let i = 1; i < HEAT.length; i++) if (p <= HEAT[i][0]) {
    const [a, ca] = HEAT[i - 1], [b, cb] = HEAT[i], t = (p - a) / (b - a);
    return `rgb(${ca.map((c, j) => Math.round(c + (cb[j] - c) * t)).join(",")})`;
  }
  return "rgb(47,127,224)";
}
const attrPct = v => v == null ? null : (v - 1) / 19 * 100;
function attrColor(v) { if (v == null) return "var(--muted)"; return v >= 16 ? "var(--a-hi)" : v >= 13 ? "var(--a-good)" : v >= 10 ? "var(--ink)" : v >= 7 ? "var(--ink2)" : "var(--a-low)"; }

