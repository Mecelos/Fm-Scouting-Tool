// ---------- Scouting: wonderkids, transfer targets for your weak spots, contract watch, shortlist ----------
const SC_TABS = [["kids", "Wonderkids"], ["targets", "Transfer targets"], ["contracts", "Contract watch"], ["dev", "Development"], ["short", "Shortlist"]];
const SC_NEED = { GK: 1, FB: 2, CB: 2, DM: 1, CM: 2, AM: 1, Wingers: 2, ST: 1 };
const scF = () => (S.scF = S.scF || {});
const scGameDate = () => new Date(((SAVE && SAVE.meta.gameDate) || "2026-08-01") + "T12:00:00Z");
const scMonths = raw => { const d = sDate(raw); if (!d) return null; return (d - scGameDate()) / (30.44 * 864e5); };
const scHasC = () => !!(SAVE && SAVE.cEnd);
const scVal = i => { const v = SAVE.value[i]; return v === v ? v : null; };
const scWage = i => SAVE.cWage && SAVE.cWage[i] === SAVE.cWage[i] ? SAVE.cWage[i] : null;
function scGroupsOf(i) { const b = savePos().bits[i]; return POSITIONS.filter((p, k) => b & (1 << k)); }
// ---- shortlist (this browser) ----
const SL_KEY = "scoutlab-shortlist";
function slLoad() { try { const v = JSON.parse(localStorage.getItem(SL_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function slSave(l, fromCloud) { try { localStorage.setItem(SL_KEY, JSON.stringify(l)); } catch (e) { } if (!fromCloud) cloudSmallPush("shortlist"); }
let SL = slLoad();
const slHas = uid => SL.some(x => x.uid === uid);
function scStar(i) { const u = "s" + SAVE.uid[i], on = slHas(u); return `<button class="star${on ? " on" : ""}" data-star="${u}" aria-pressed="${on}" title="${on ? "On your shortlist: tap to remove" : "Add to your shortlist"}">${on ? "★" : "☆"}</button>`; }
// a star for a player from a CSV / squad row (only players found in the loaded save can be shortlisted)
function starForP(p) { if (!SAVE || !p || !p.uid) return ""; const i = saveUidIndex().get(p.uid); return i == null ? "" : scStar(i); }
// shortlist block in the player profile: add / remove, a note, and a way to the list
function slPanelHtml(p) {
  if (!SAVE || !p || !p.uid) return "";
  const i = saveUidIndex().get(p.uid); if (i == null) return "";
  const u = "s" + SAVE.uid[i], x = SL.find(z => z.uid === u);
  return `<div class="slpanel${x ? " on" : ""}" id="slpanel">${x
    ? `<button class="primary small" data-slbtn="${u}" title="Tap to remove him">★ On your shortlist</button><button class="linkbtn small" data-sctab="short">Open shortlist (${SL.length})</button>
       <input class="slnote" data-u="${u}" value="${esc(x.note || "")}" placeholder="Note (e.g. scout again in January, back-up LB)">`
    : `<button class="ghost small" data-slbtn="${u}">☆ Add to shortlist</button>${SL.length ? `<button class="linkbtn small" data-sctab="short">Open shortlist (${SL.length})</button>` : ""}`}</div>`;
}
function slToggle(u) { if (slHas(u)) SL = SL.filter(x => x.uid !== u); else { const i = saveUidIndex().get(u); SL.push({ uid: u, name: i != null ? SAVE.name[i] : u, note: "", at: Date.now() }); } slSave(SL); slSync(u); }
function slSync(u) { // every star for this player, and the profile block, follow the change
  const on = slHas(u);
  document.querySelectorAll(`.star[data-star="${u}"]`).forEach(b => { b.classList.toggle("on", on); b.textContent = on ? "★" : "☆"; b.setAttribute("aria-pressed", on); b.title = on ? "On your shortlist: tap to remove" : "Add to your shortlist"; });
  const box = document.getElementById("slpanel"), dr = document.getElementById("drawer");
  if (box && dr && !dr.hidden) { const i = saveUidIndex().get(u); if (i != null && box.querySelector(`[data-slbtn="${u}"]`)) box.outerHTML = slPanelHtml({ uid: u }); }
}
// ---- shared table ----
function scSortRows(rows, key, cols) {
  const s = (scF().sort || {})[key], c = s && cols.find(x => x.k === s.k);
  if (c) rows.sort((a, b) => { const x = c.v(a), y = c.v(b); if (x == null) return 1; if (y == null) return -1; return (typeof x === "string" ? x.localeCompare(y) : x - y) * s.d; });
  return rows;
}
const SC_COLS = {
  name: { k: "name", l: "Player", c: "left", v: i => SAVE.name[i], h: i => `${scStar(i)}<button class="linkbtn" data-sci="${i}"><b>${esc(SAVE.name[i])}</b></button>` },
  age: { k: "age", l: "Age", c: "num", v: i => SAVE.age[i] >= 0 ? SAVE.age[i] : null },
  club: { k: "club", l: "Club", c: "left small", v: i => saveClub(i), h: i => esc(saveClub(i)) + (SAVE.cLoan && SAVE.cLoan[i] ? ` <span class="tag">loan</span>` : "") },
  pos: { ph: 1, k: "pos", l: "Position", c: "left small", v: i => savePos().str[i], h: i => esc(savePos().str[i]) },
  ca: { k: "ca", l: "CA", c: "num", v: i => SAVE.ca[i] > 0 ? SAVE.ca[i] : null, h: i => SAVE.ca[i] > 0 ? `<b style="color:${capaCol(SAVE.ca[i])}">${SAVE.ca[i]}</b>` : "–" },
  pa: { k: "pa", l: "PA", c: "num", v: i => SAVE.pa[i] > 0 ? SAVE.pa[i] : null, h: i => SAVE.pa[i] > 0 ? `<b style="color:${capaCol(SAVE.pa[i])}">${SAVE.pa[i]}</b>` : "–" },
  room: { ph: 1, k: "room", l: "Room", c: "num", v: i => SAVE.pa[i] > 0 && SAVE.ca[i] > 0 ? SAVE.pa[i] - SAVE.ca[i] : null, h: i => SAVE.pa[i] > 0 && SAVE.ca[i] > 0 ? "+" + (SAVE.pa[i] - SAVE.ca[i]) : "–" },
  value: { k: "value", l: "Value", c: "num", v: i => scVal(i), h: i => saveClub(i) === FA_CLUB ? `<span class="okc">free</span>` : scVal(i) != null ? esc(saveMoney(scVal(i))) : "–" },
  wage: { ph: 1, k: "wage", l: "Wage p/w", c: "num", v: i => scWage(i), h: i => scWage(i) != null ? esc(saveMoney(scWage(i))) : "–" },
  end: { ph: 1, k: "end", l: "Contract", c: "num", v: i => SAVE.cEnd && SAVE.cEnd[i] ? SAVE.cEnd[i] : null, h: i => { if (!SAVE.cEnd || !SAVE.cEnd[i]) return saveClub(i) === FA_CLUB ? "–" : "–"; const m = scMonths(SAVE.cEnd[i]); return `<span class="${m != null && m <= 6 ? "bad" : m != null && m <= 12 ? "warnc" : ""}">${esc(sDateTxt(SAVE.cEnd[i]).replace(/^\d+ /, ""))}</span>`; } },
};
const capaCol = v => v >= 170 ? "var(--a-hi)" : v >= 150 ? "var(--a-good)" : v >= 120 ? "var(--ink)" : v >= 90 ? "var(--ink2)" : "var(--a-low)";
function scTable(key, rows, cols, limit) {
  const s = (scF().sort || {})[key];
  scSortRows(rows, key, cols);
  const shown = rows.slice(0, limit || 150);
  return `<div class="tscroll"><table class="heat sctable"><thead><tr><th class="num">#</th>${cols.map(c => `<th class="${c.c}${c.ph ? " phx" : ""}${s && s.k === c.k ? " sorted" : ""}"><button data-scsort="${key}|${c.k}">${esc(c.l)}${s && s.k === c.k ? (s.d < 0 ? " ▾" : " ▴") : ""}</button></th>`).join("")}</tr></thead><tbody>${shown.map((i, n) => `<tr><td class="num muted">${n + 1}</td>${cols.map(c => `<td class="${c.c}${c.ph ? " phx" : ""}">${c.h ? c.h(i) : esc(c.v(i) ?? "–")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${rows.length > shown.length ? `<p class="small muted">Showing ${shown.length} of ${rows.length.toLocaleString()}. Narrow the filters to see the rest.</p>` : ""}`;
}
const scNum = (id, label, val, step, w) => `<label class="fl"><span class="small muted">${label}</span><input type="number" class="scin" data-f="${id}" value="${val ?? ""}" step="${step || 1}" style="width:${w || 74}px"></label>`;
const scSel = (id, label, val, opts) => `<label class="fl"><span class="small muted">${label}</span><select class="scin" data-f="${id}">${opts.map(([v, l]) => `<option value="${v}" ${String(v) === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
const scChk = (id, label, val) => `<label class="fl toggle"><input type="checkbox" class="scin" data-f="${id}" ${val ? "checked" : ""}> <span class="small">${label}</span></label>`;
const POS_OPTS = [["all", "All positions"], ...POSITIONS.map(p => [p, p])];
const mineSet = () => { if (SAVE._mine) return SAVE._mine; return (SAVE._mine = new Set(saveManagedIdx())); };
// ---- wonderkids ----
function scKids() {
  const F = scF(), maxAge = F.kAge ?? 21, minPA = F.kPA ?? 150, room = F.kRoom ?? 0, maxV = F.kVal, pos = F.kPos || "all", hideMine = F.kMine !== false;
  const k = pos === "all" ? -1 : POSITIONS.indexOf(pos), pc = savePos(), mine = mineSet(), rows = [];
  for (let i = 0; i < SAVE.n; i++) {
    if (!SAVE.name[i] || !(SAVE.age[i] >= 0) || SAVE.age[i] > maxAge || !(SAVE.pa[i] >= minPA) || SAVE.pa[i] - SAVE.ca[i] < room) continue;
    if (k >= 0 && !(pc.bits[i] & (1 << k))) continue;
    if (hideMine && mine.has(i)) continue;
    if (maxV != null && maxV !== "" && (scVal(i) ?? 0) > maxV * 1e6) continue;
    rows.push(i);
  }
  if (!(scF().sort || {}).kids) rows.sort((a, b) => SAVE.pa[b] - SAVE.pa[a] || SAVE.ca[b] - SAVE.ca[a]);
  const C = SC_COLS;
  return `<section class="panel"><div class="ph"><h3>Wonderkids</h3><span class="muted small">young players with high potential (PA), read from your save · PA is hidden in FM, so this is what your scouts are trying to find</span></div>
    <div class="filters">${scNum("kAge", "Max age", maxAge)}${scNum("kPA", "Min PA", minPA, 5)}${scNum("kRoom", "Min room to grow", room, 5)}${scNum("kVal", "Max value £M", maxV, 1, 84)}${scSel("kPos", "Position", pos, POS_OPTS)}${scChk("kMine", "Hide my club", hideMine)}<span class="poolnote">${rows.length.toLocaleString()} players · room = PA − CA</span></div>
    ${scTable("kids", rows, [C.name, C.age, C.club, C.pos, C.ca, C.pa, C.room, C.value, ...(scHasC() ? [C.end] : [])])}</section>`;
}
// ---- transfer targets for the weak spots ----
function scNeeds() {
  // starters needed per position group: from your loaded tactic when there is one
  const W = typeof tacWorking === "function" ? tacWorking() : null;
  if (!W) return { need: { ...SC_NEED }, from: "a standard 4-2-3-1" };
  const need = {}; W.slots.forEach(s => { const g = CODE_GROUP[s.ip.code]; need[g] = (need[g] || 0) + 1; });
  return { need, from: `your tactic "${W.name}"` };
}
// a save player as a model player (full attribute names), for the role ratings
const scPCache = new Map();
function scP(i) {
  let p = scPCache.get(i); if (p) return p;
  const a = {}; ATTR_COLS.forEach(([n, k]) => { const v = SAVE.attrs[i * 52 + k]; if (v) a[n] = v; });
  p = { ix: "s" + i, a }; scPCache.set(i, p); return p;
}
// fit for one slot of the loaded tactic: 70% role with the ball + 30% key attributes of the role without it (as My tactic)
function scSlotFit(i, sl) {
  const p = scP(i), code = sl.ip.code, g = CODE_GROUP[code], role = ROLES[g] && ROLES[g][sl.ip.role] ? sl.ip.role : "Balanced";
  const ipv = roleRating(p, g, role, code); if (ipv == null) return null;
  const keys = OOP_KEYS[sl.oop.role] || [];
  const opv = keys.length ? mean(keys.map(k => p.a[k])) : null;
  return { ipv, opv: opv ?? ipv, fit: 0.7 * ipv + 0.3 * (opv ?? ipv) };
}
let scRoleMemo = { k: null, v: null };
function scTargetsByRole(W) {
  const F = scF(), budget = F.tBud, maxAge = F.tAge ?? 29, fa = F.tFA !== false, minUp = F.rUp ?? 0.5, mset = mineSet(), pc = savePos();
  const sq = squadDs(), Fit = sq ? tacFit(W, sq) : null;
  const key = [SAVE.id, JSON.stringify(S.myTac.edits || {}), S.myTac.file.name, budget, maxAge, fa, minUp, Fit ? Fit.avg : 0].join("|");
  let spots;
  if (scRoleMemo.k === key) spots = scRoleMemo.v;
  else {
    const codesOf = new Map();
    const can = (i, code) => { let c = codesOf.get(i); if (!c) { c = posCodes(pc.str[i]); if (c.has("DC")) c.add("WCB"); codesOf.set(i, c); } return canPlay(c, code); };
    spots = W.slots.map((sl, k) => {
      const pick = Fit && Fit.slots[k] && Fit.slots[k].pick, cur = pick ? pick.fit : 0, need = cur + minUp;
      const rows = [], fit = new Map();
      for (let i = 0; i < SAVE.n; i++) {
        if (!SAVE.name[i] || mset.has(i) || !(SAVE.age[i] >= 0) || SAVE.age[i] > maxAge || !(SAVE.ca[i] >= 80)) continue;
        if (!can(i, sl.ip.code)) continue;
        const isFa = saveClub(i) === FA_CLUB; if (isFa && !fa) continue;
        if (budget != null && budget !== "" && !isFa && (scVal(i) ?? Infinity) > budget * 1e6) continue;
        const f = scSlotFit(i, sl); if (!f || f.fit < need) continue;
        fit.set(i, f); rows.push(i);
      }
      rows.sort((a, b) => fit.get(b).fit - fit.get(a).fit);
      return { k, sl, pick, cur, rows, fit };
    });
    spots.sort((a, b) => a.cur - b.cur);
    scRoleMemo = { k: key, v: spots };
  }
  const C = SC_COLS;
  let h = `<section class="panel"><div class="ph"><h3>Transfer targets for "${esc(W.name)}"</h3><span class="muted small">each slot of your tactic, weakest first · fit out of 20 = 70% his rating in the role with the ball + 30% the role without it (same as My tactic)</span></div>
    <div class="filters">${scSel("tBy", "Rank by", "role", [["role", "Fit for my tactic's roles"], ["ca", "Ability (CA) by position"]])}${scNum("tBud", "Budget £M (blank = any)", budget, 1, 96)}${scNum("tAge", "Max age", maxAge)}${scNum("rUp", "Fit better by at least", minUp, 0.5)}${scChk("tFA", "Include free agents", fa)}</div></section>`;
  spots.forEach((sp, n) => {
    const fcol = (lab, kk, f) => ({ k: kk, l: lab, c: "num", v: i => sp.fit.get(i) ? f(sp.fit.get(i)) : null, h: i => { const v = sp.fit.get(i) ? f(sp.fit.get(i)) : null; return v == null ? "–" : `<b style="color:${attrColor(v)}">${v.toFixed(1)}</b>`; } });
    const cols = [C.name, C.age, C.club, fcol("Fit", "fit", x => x.fit), { ...fcol("With ball", "ipv", x => x.ipv), ph: 1 }, { ...fcol("Without", "opv", x => x.opv), ph: 1 }, C.ca, C.value, ...(scHasC() ? [C.wage, C.end] : [])];
    if (!(scF().sort || {})["r" + sp.k]) sp.rows.sort((a, b) => sp.fit.get(b).fit - sp.fit.get(a).fit);
    h += `<details class="panel scspot"${n < 3 ? " open" : ""}><summary class="ph"><h3>${esc(CODE_LABEL[sp.sl.ip.code] || sp.sl.ip.code)}</h3><span class="small"><b>${esc(sp.sl.ip.role)}</b> <span class="muted">/ ${esc(sp.sl.oop.role)}</span></span>
      <span class="muted small">${sp.pick ? `now: <b>${esc(sp.pick.p.name)}</b> ${sp.cur.toFixed(1)}` : "nobody in your squad"} · ${sp.rows.length} better</span></summary>
      ${sp.rows.length ? scTable("r" + sp.k, sp.rows, cols, 10) : `<p class="small muted">Nobody better within these limits: raise the budget or age, or lower the margin.</p>`}</details>`;
  });
  return h;
}
function scTargets() {
  const W0 = typeof tacWorking === "function" ? tacWorking() : null;
  if (W0 && (scF().tBy || "role") === "role") return scTargetsByRole(W0);
  const F = scF(), mine = [...mineSet()], { need, from } = scNeeds();
  if (!mine.length) return `<section class="panel"><p class="muted">Your club wasn't found in this save, so there's no squad to compare with.</p></section>`;
  const byG = {}; POSITIONS.forEach(g => byG[g] = mine.filter(i => scGroupsOf(i).includes(g) && SAVE.ca[i] > 0).sort((a, b) => SAVE.ca[b] - SAVE.ca[a]));
  const starters = [];
  const spots = POSITIONS.filter(g => need[g]).map(g => {
    const l = byG[g], n = need[g], st = l.slice(0, n), weakest = st.length < n ? null : st[n - 1];
    st.forEach(i => starters.push(SAVE.ca[i]));
    return { g, n, st, weakest, ca: weakest == null ? 0 : SAVE.ca[weakest], depth: l.length };
  });
  const level = starters.length ? starters.reduce((a, b) => a + b, 0) / starters.length : 0;
  spots.forEach(s => s.gap = Math.round(level - s.ca));
  spots.sort((a, b) => b.gap - a.gap);
  const budget = F.tBud, maxAge = F.tAge ?? 29, fa = F.tFA !== false, minUp = F.tUp ?? 5, mset = mineSet(), pc = savePos();
  const C = SC_COLS;
  let h = `<section class="panel"><div class="ph"><h3>Transfer targets</h3><span class="muted small">your weakest starters first (by CA), with players who'd be an upgrade · starters from ${esc(from)}</span></div>
    <div class="filters">${W0 ? scSel("tBy", "Rank by", "ca", [["role", "Fit for my tactic's roles"], ["ca", "Ability (CA) by position"]]) : ""}${scNum("tBud", "Budget £M (blank = any)", budget, 1, 96)}${scNum("tAge", "Max age", maxAge)}${scNum("tUp", "At least CA better by", minUp)}${scChk("tFA", "Include free agents", fa)}<span class="poolnote">Squad level: average starter CA <b>${level.toFixed(0)}</b>. Gap = how far that position's weakest starter is below it.${W0 ? "" : ` Load your tactic in My squad › My tactic to rank targets by how well they fit its roles.`}</span></div></section>`;
  spots.forEach((sp, n) => {
    const k = POSITIONS.indexOf(sp.g), need = sp.ca + minUp, rows = [];
    for (let i = 0; i < SAVE.n; i++) {
      if (!SAVE.name[i] || mset.has(i) || !(pc.bits[i] & (1 << k)) || !(SAVE.ca[i] >= need) || !(SAVE.age[i] >= 0) || SAVE.age[i] > maxAge) continue;
      const isFa = saveClub(i) === FA_CLUB; if (isFa && !fa) continue;
      if (budget != null && budget !== "" && !isFa && (scVal(i) ?? Infinity) > budget * 1e6) continue;
      rows.push(i);
    }
    if (!(scF().sort || {})["t" + sp.g]) rows.sort((a, b) => SAVE.ca[b] - SAVE.ca[a] || (scVal(a) ?? 0) - (scVal(b) ?? 0));
    const weakName = sp.weakest != null ? SAVE.name[sp.weakest] : null;
    h += `<details class="panel scspot"${n < 3 ? " open" : ""}><summary class="ph"><h3>${esc(sp.g)}</h3><span class="tag ${sp.gap >= 10 ? "bad" : sp.gap >= 4 ? "warn" : "good"}">${sp.gap > 0 ? `${sp.gap} below squad level` : "at squad level"}</span>
      <span class="muted small">${sp.n} starter${sp.n > 1 ? "s" : ""} · ${weakName ? `weakest: <b>${esc(weakName)}</b> CA ${sp.ca}` : `you have only ${sp.st.length}`} · ${sp.depth} at the club · ${rows.length} upgrade${rows.length === 1 ? "" : "s"} found</span></summary>
      ${rows.length ? scTable("t" + sp.g, rows, [C.name, C.age, C.club, C.ca, C.pa, C.value, ...(scHasC() ? [C.wage, C.end] : [])], 12) : `<p class="small muted">Nobody matches: raise the budget or age, or lower the upgrade margin.</p>`}</details>`;
  });
  return h;
}
// ---- contract watch ----
function scContracts() {
  if (!scHasC()) return `<section class="panel"><p class="muted">Contracts are read from saves loaded with this version. Open <b>Data</b> and load your save again to see them.</p></section>`;
  const F = scF(), mine = [...mineSet()], C = SC_COLS;
  const mon = { k: "mon", l: "Months left", c: "num", v: i => SAVE.cEnd[i] ? scMonths(SAVE.cEnd[i]) : null, h: i => { const m = SAVE.cEnd[i] ? scMonths(SAVE.cEnd[i]) : null; return m == null ? "–" : `<b class="${m <= 6 ? "bad" : m <= 12 ? "warnc" : ""}">${Math.max(0, Math.round(m))}</b>`; } };
  const mineRows = mine.filter(i => SAVE.cEnd[i]); if (!(F.sort || {}).cmine) mineRows.sort((a, b) => SAVE.cEnd[a] - SAVE.cEnd[b]);
  const soon = mineRows.filter(i => scMonths(SAVE.cEnd[i]) <= 12), wages = mine.reduce((s, i) => s + (scWage(i) || 0), 0);
  const minCA = F.cCA ?? 130, maxAge = F.cAge ?? 30, within = F.cMon ?? 12, mset = mineSet(), out = [];
  for (let i = 0; i < SAVE.n; i++) { if (!SAVE.name[i] || mset.has(i) || !SAVE.cEnd[i] || !(SAVE.ca[i] >= minCA) || SAVE.age[i] > maxAge) continue; const m = scMonths(SAVE.cEnd[i]); if (m != null && m >= 0 && m <= within) out.push(i); }
  if (!(F.sort || {}).cout) out.sort((a, b) => SAVE.ca[b] - SAVE.ca[a]);
  return `<section class="panel"><div class="ph"><h3>Your squad's contracts</h3><span class="muted small">soonest first · wage bill <b>${esc(saveMoney(wages))}</b> p/w · ${soon.length} end within a year</span></div>
    ${scTable("cmine", mineRows, [C.name, C.age, C.pos, C.ca, C.pa, C.wage, C.end, mon], 120)}<p class="small muted">Red = 6 months or less (other clubs can agree a pre-contract with him if they're abroad), amber = within a year. "loan" = his contract is with his parent club.</p></section>
    <section class="panel"><div class="ph"><h3>Bargains: contracts running out elsewhere</h3><span class="muted small">good players whose clubs must sell cheap or lose them free</span></div>
    <div class="filters">${scNum("cCA", "Min CA", minCA, 5)}${scNum("cAge", "Max age", maxAge)}${scNum("cMon", "Ending within (months)", within, 1, 96)}<span class="poolnote">${out.length.toLocaleString()} players</span></div>
    ${scTable("cout", out, [C.name, C.age, C.club, C.pos, C.ca, C.pa, C.value, C.wage, C.end, mon])}</section>`;
}
// ---- shortlist ----
function scShort() {
  const ix = saveUidIndex(), items = SL.map(x => ({ ...x, i: ix.get(x.uid) }));
  if (!items.length) return `<section class="panel"><h3>Shortlist</h3><p class="muted">Tap ☆ next to any player in Wonderkids, Transfer targets or Contract watch to add him here. Add a note, then tick up to 3 players to compare them side by side.</p></section>`;
  const cmp = (S.slCmp || []).filter(u => items.some(x => x.uid === u && x.i != null)).slice(0, 3);
  let h = `<section class="panel"><div class="ph"><h3>Shortlist</h3><span class="muted small">${items.length} player${items.length > 1 ? "s" : ""} · synced to your cloud with your save · tick up to 3 to compare</span><span class="setctl"><button class="ghost small" data-act="slclear">Clear</button></span></div><div class="sllist">`;
  items.forEach(x => {
    const i = x.i, ok = i != null;
    h += `<div class="slrow"><label class="slck"><input type="checkbox" class="slcmp" data-u="${x.uid}" ${cmp.includes(x.uid) ? "checked" : ""} ${ok ? "" : "disabled"}></label>
      <div class="slmain">${ok ? `<button class="linkbtn" data-sci="${i}"><b>${esc(SAVE.name[i])}</b></button> <span class="muted small">${SAVE.age[i]} · ${esc(saveClub(i))} · ${esc(savePos().str[i])}</span>` : `<b>${esc(x.name || x.uid)}</b> <span class="muted small">not in this save</span>`}
      ${ok ? `<div class="small">CA <b>${SAVE.ca[i] || "–"}</b> · PA <b>${SAVE.pa[i] > 0 ? SAVE.pa[i] : "–"}</b> · ${saveClub(i) === FA_CLUB ? "free agent" : esc(scVal(i) != null ? saveMoney(scVal(i)) : "–")}${scHasC() && SAVE.cEnd[i] ? ` · contract to ${esc(sDateTxt(SAVE.cEnd[i]))}` : ""}${scWage(i) != null ? ` · ${esc(saveMoney(scWage(i)))} p/w` : ""}</div>` : ""}
      <input class="slnote" data-u="${x.uid}" value="${esc(x.note || "")}" placeholder="Note (e.g. scout again in January, back-up LB)"></div>
      <button class="ghost small" data-star="${x.uid}">Remove</button></div>`;
  });
  h += `</div></section>`;
  if (cmp.length >= 2) {
    const is = cmp.map(u => ix.get(u)), rowsA = [["Age", i => SAVE.age[i], -1], ["CA", i => SAVE.ca[i], 1], ["PA", i => SAVE.pa[i] > 0 ? SAVE.pa[i] : null, 1], ["Value", i => scVal(i), -1, v => saveMoney(v)], ...(scHasC() ? [["Wage p/w", i => scWage(i), -1, v => saveMoney(v)]] : [])];
    const attrRows = ATTR_COLS.map(([lab, a]) => [lab, i => SAVE.attrs[i * 52 + a] || null, 1]);
    const line = ([lab, f, dir, fmt]) => { const vs = is.map(f), ok = vs.filter(v => v != null), best = ok.length > 1 ? (dir > 0 ? Math.max(...ok) : Math.min(...ok)) : null; return `<tr><td class="left small">${esc(lab)}</td>${vs.map(v => `<td class="num${v != null && v === best && ok.some(o => o !== best) ? " good" : ""}">${v == null ? "–" : fmt ? esc(fmt(v)) : v}</td>`).join("")}</tr>`; };
    h += `<section class="panel"><div class="ph"><h3>Compare</h3><span class="muted small">green = best of the ${is.length}</span></div><div class="tscroll"><table class="heat cmpt"><thead><tr><th class="left">&nbsp;</th>${is.map(i => `<th class="num">${esc(SAVE.name[i])}</th>`).join("")}</tr></thead><tbody>${rowsA.map(line).join("")}${attrRows.map(line).join("")}</tbody></table></div></section>`;
  }
  return h;
}
function renderScout(main) {
  closeDrawer(true);
  if (!SAVE) { main.innerHTML = `<section class="panel addpanel"><h3>Scouting needs your save</h3><p class="muted">Wonderkids, transfer targets and contracts are read from your FM27 save (ability, potential, values and contracts are all in it).</p><button class="primary" data-act="datapage">Load your save</button></section>`; return; }
  const t = SC_TABS.some(x => x[0] === S.scTab) ? S.scTab : "kids";
  main.innerHTML = t === "kids" ? scKids() : t === "targets" ? scTargets() : t === "contracts" ? scContracts() : t === "dev" ? scDev() : scShort();
  renderSaveNote();
  if (S.sel != null && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true));
}
function scoutTabsHtml() { const t = SC_TABS.some(x => x[0] === S.scTab) ? S.scTab : "kids"; return SC_TABS.map(([k, l]) => `<button class="ptab" data-sctab="${k}" aria-selected="${!S.guide && !S.dataPage && k === t}">${l}${k === "short" && SL.length ? `<span class="pcount">${SL.length}</span>` : ""}</button>`).join(""); }
// ---- events ----
document.addEventListener("click", e => {
  const t = e.target.closest("[data-sctab], [data-sci], [data-star], [data-slbtn], [data-scsort], [data-act=slclear]"); if (!t) return;
  const y = window.scrollY;
  if (t.dataset.sctab) { S.guide = false; S.dataPage = false; S.mode = "scout"; S.scTab = t.dataset.sctab; S.sel = null; S.adCtx = null; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.sci != null) { if (t.closest("#drawer")) pPush(); adOpen(+t.dataset.sci); return; }
  if (t.dataset.star || t.dataset.slbtn) { const u = t.dataset.star || t.dataset.slbtn; slToggle(u); if (S.mode === "scout" && S.scTab === "short") { const dr = $("#drawer"), keep = dr && !dr.hidden; render(); window.scrollTo(0, y); } return; }
  if (t.dataset.scsort) { const [key, k] = t.dataset.scsort.split("|"), so = { ...(scF().sort || {}) }, cur = so[key]; so[key] = cur && cur.k === k ? (cur.d < 0 ? { k, d: 1 } : null) : { k, d: ["name", "club", "pos"].includes(k) ? 1 : -1 }; if (!so[key]) delete so[key]; scF().sort = so; render(); window.scrollTo(0, y); return; }
  if (t.dataset.act === "slclear") { SL = []; slSave(SL); S.slCmp = []; render(); }
});
document.addEventListener("change", e => {
  const t = e.target, y = window.scrollY;
  if (t.classList.contains("scin")) { const F = scF(), f = t.dataset.f; F[f] = t.type === "checkbox" ? t.checked : t.type === "number" ? (t.value === "" ? "" : +t.value) : t.value; render(); window.scrollTo(0, y); return; }
  if (t.classList.contains("slnote")) { const x = SL.find(z => z.uid === t.dataset.u); if (x) { x.note = t.value; x.at = Date.now(); slSave(SL); document.querySelectorAll(`.slnote[data-u="${t.dataset.u}"]`).forEach(n => { if (n !== t) n.value = t.value; }); } return; }
  if (t.classList.contains("slcmp")) { let c = (S.slCmp || []).filter(u => u !== t.dataset.u); if (t.checked) c.push(t.dataset.u); S.slCmp = c.slice(-3); render(); window.scrollTo(0, y); }
});
