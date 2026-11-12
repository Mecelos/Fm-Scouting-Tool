// ---------- Scouting > Upgrades: for each slot of your uploaded tactic, everyone in the save who performs better in that role ----------
// No guessing: it needs your exported tactic (My squad > My tactic) and your save. For each slot it takes the squad player with the most
// minutes who plays that position (you can switch him), scores him on this season's stats in the slot's role (the same stats role score as
// the position tabs), and lists every other player in the save with a higher score. You filter; the tool doesn't pick.
const UP_SHOW = 50;
function upF() { return (S.upF = S.upF || { age: "", val: "", wage: "", mins: "900", cend: "", league: true, pick: {}, open: {}, sort: {}, more: {} }); }
const upCache = new Map();
// your squad + the position's whole pool from the save (no sampling), on one scale
function upModel(kind, pos) {
  const sq = squadDs(), ref = refDs(kind, pos); if (!sq || !ref || !ref.fromSave) return null;
  const ck = ["m", sq.id, kind, pos, ref.id].join("|"); if (upCache.has(ck)) return upCache.get(ck);
  const sm = buildModel({ ...sq, id: sq.id + "|" + kind, mode: kind }), rm = buildModel(ref); if (kind === "attr") enrich(rm);
  const mine = sm.players.filter(p => posGroups(p.position || p.bestPos).includes(pos)).map(p => ({ ...p, mine: true }));
  const myUid = new Set(sm.players.map(p => p.uid).filter(Boolean));
  const others = rm.players.filter(p => !(p.uid && myUid.has(p.uid))).map(p => ({ ...p, ix: p.ix + 100000, ref: true }));
  let metrics = [], attrs = [];
  if (kind === "stats") { metrics = [...new Set([...sm.metrics, ...rm.metrics])].filter(k => rm.metrics.includes(k) || rm.players.some(p => p.m && p.m[k] != null)); if (metrics.includes("npg90") && metrics.includes("gls90")) metrics = metrics.filter(k => k !== "gls90"); }
  else attrs = sm.attrs.filter(a => rm.attrs.includes(a));
  const m = { ds: { ...sq, mode: kind, pos }, players: [...mine, ...others], metrics, attrs, hasMins: sm.hasMins, hasRec: false, unused: [], usedCount: sm.usedCount, nMine: mine.length, nRef: others.length, ref, sqIdx: sq.saveIdx, refIdx: ref.saveIdx };
  upCache.set(ck, m); if (upCache.size > 40) upCache.delete(upCache.keys().next().value);
  return m;
}
// role fit from attributes, straight from the save (out of 20, the same weights as the Attributes tab)
function upFit(si, pos, role) {
  if (si == null || si < 0 || !SAVE.attrs) return null; const a = {};
  FR.ATTRIBUTE_ORDER.forEach((n, k) => { const v = SAVE.attrs[si * 52 + k]; if (v > 0) a[FR.ATTR_NAME[n] || n] = v; });
  return Object.keys(a).length > 8 ? attrRating({ a }, roleW(pos, role)) : null;
}
const upKey = (M, kind, pos, role, league) => ["s", M.ds.id, M.ref.id, kind, pos, role, league, S.minMins].join("|");
function upScore(kind, pos, role, league) {
  const M = upModel(kind, pos); if (!M) return null;
  const ck = upKey(M, kind, pos, role, league); if (upCache.has(ck)) return upCache.get(ck);
  const sc = scoreStats(M, pos, role, { minMins: S.minMins, league, lean: true });
  sc.M = M; upCache.set(ck, sc); if (upCache.size > 40) upCache.delete(upCache.keys().next().value);
  return sc;
}
const upSi = (M, p) => p.mine ? (M.sqIdx ? M.sqIdx[p.ix] : -1) : (M.refIdx ? M.refIdx[p.ix - 100000] : -1);   // model player -> save index
// who plays each slot: squad players of that position group, most minutes first (one player per slot), unless you picked someone
function upAssign(W) {
  const sq = squadDs(), players = squadModelPlayers(sq), f = upF();
  const slots = W.slots.map((s, i) => { const code = s.ip.code, g = CODE_GROUP[code]; return { i, s, code, g, role: ROLES[g] && ROLES[g][s.ip.role] ? s.ip.role : "Balanced", roleName: s.ip.role }; });
  const elig = (p, x) => posGroups(p.position || p.bestPos).includes(x.g);
  const BIG = 1e9, m = Math.max(players.length, slots.length);
  const cost = slots.map(x => Array.from({ length: m }, (_, j) => { const p = players[j]; if (!p || !elig(p, x)) return BIG; const c = posCodes(p.position || p.bestPos); if (c.has("DC")) c.add("WCB"); return -((p.mins || 0) + (canPlay(c, x.code) ? 500 : 0) + 1); }));
  const asg = players.length ? hungarian(cost) : [];
  slots.forEach((x, k) => { const j = asg[k]; x.auto = j >= 0 && j < players.length && cost[k][j] < BIG ? players[j] : null; const pk = f.pick[x.i]; x.p = pk != null ? players.find(p => String(p.uid || p.ix) === pk && elig(p, x)) || x.auto : x.auto; x.options = players.filter(p => elig(p, x)).sort((a, b) => (b.mins || 0) - (a.mins || 0)); });
  return slots;
}
function upNum(v) { const n = parseFloat(String(v).replace(",", ".")); return n === n ? n : null; }
function scUpgrades() {
  const W = typeof tacWorking === "function" ? tacWorking() : null, f = upF();
  const head = `<section class="panel"><div class="ph"><h3>Upgrades for your tactic</h3><span class="muted small">every player in your save who performs better in each slot's role · you filter, the tool doesn't pick</span></div>`;
  if (!SAVE) return head + `<p class="muted">Load your save first (Data).</p></section>`;
  if (!W) return head + `<p>Upload your tactic first: this page uses your own formation and roles, nothing guessed.</p><p><button class="primary" data-upgo="tactic">Upload your tactic in My tactic</button></p>
    <p class="small muted">In FM27: Tactics › Manage tactics › Export. The file ends in <code>.fmf</code>.</p></section>`;
  if (!squadDs() || !saveKind()) return head + `<p class="muted">Your save has no stats for your squad yet, so there's nothing to compare. Play a few games and load the save again.</p></section>`;
  const A = upAssign(W);
  // scoring every player in the save takes a few seconds the first time: say so, then do it
  const todo = A.some(x => { const M = upModel("stats", x.g); return M && !upCache.has(upKey(M, "stats", x.g, x.role, !!f.league)); });
  if (todo && !S._upNow) { setTimeout(() => { if (S.mode !== "scout" || S.scTab !== "up") return; S._upNow = true; try { upRedraw(); } finally { S._upNow = false; } }, 60);
    return head + `<p class="upwait">Scoring every player in your save for the ${A.length} roles in <b>${esc(W.name)}</b>… this takes a few seconds the first time (longer on a phone).</p></section>`; }
  const slots = A.map(x => {
    const st = upScore("stats", x.g, x.role, !!f.league);
    const me = x.p && st ? st.rows.find(r => r.p.mine && r.p.ix === x.p.ix) : null, mySi = x.p && st && st.M.sqIdx ? st.M.sqIdx[x.p.ix] : -1;
    return { ...x, st, me, mySi, myFit: upFit(mySi, x.g, x.role) };
  });
  const lvl = r => !r || r.overall == null ? 0 : r.orank < 50 ? 1 : r.orank < 80 ? 2 : 3;
  const LV = [["No stats", "muted"], ["Underperforming", "bad"], ["Fine", ""], ["Strong", "okc"]];
  slots.sort((a, b) => (a.me && a.me.overall != null ? a.me.orank : -1) - (b.me && b.me.overall != null ? b.me.orank : -1));
  const inp = (k, lab, ph, w) => `<label class="upf small">${lab}<input data-upf="${k}" value="${esc(f[k])}" placeholder="${ph}" inputmode="decimal" style="width:${w}px"></label>`;
  let h = head + `<p class="small muted">Tactic: <b>${esc(W.name)}</b> · performance = this season's stats in that role, ranked against every player in the save at that position${f.league ? ", adjusted for league strength" : ""}. Role fit = his attributes for the role, out of 20 (greyed when lower than your player's).</p>
    <div class="upfilters">${inp("age", "Max age", "any", 52)}${inp("val", "Max value £M", "any", 60)}${inp("wage", "Max wage £K p/w", "any", 60)}${inp("mins", "Min minutes", "0", 64)}
    <label class="upf small">Contract ends<select data-upf="cend"><option value="">any time</option><option value="1" ${f.cend === "1" ? "selected" : ""}>within 1 year</option><option value="2" ${f.cend === "2" ? "selected" : ""}>within 2 years</option></select></label>
    <label class="upf small"><input type="checkbox" data-upf="league" ${f.league ? "checked" : ""}> Adjust for league strength</label></div></section>`;
  const today = SAVE.meta.gameDate ? new Date(SAVE.meta.gameDate + "T00:00:00Z") : new Date();
  slots.forEach(x => {
    const r = x.me, L = LV[lvl(r)], open = f.open[x.i] != null ? f.open[x.i] : lvl(r) === 1;
    const pname = x.p ? x.p.name : "Nobody in your squad plays here";
    const sel = `<select data-uppick="${x.i}" title="Who plays this slot">${x.options.map(p => `<option value="${esc(String(p.uid || p.ix))}" ${x.p && p.ix === x.p.ix ? "selected" : ""}>${esc(p.name)} · ${Math.round(p.mins || 0)} min</option>`).join("")}</select>`;
    let list = [], body = "";
    if (x.st) {
      const myFit = x.myFit, bar = r && r.overall != null ? r.overall : -1, fits = new Map(), fit = o => { if (!fits.has(o.si)) fits.set(o.si, upFit(o.si, x.g, x.role)); return fits.get(o.si); };
      const mxA = upNum(f.age), mxV = upNum(f.val), mxW = upNum(f.wage), mnM = upNum(f.mins) || 0, cy = upNum(f.cend);
      list = x.st.rows.filter(q => q.p.ref && q.overall != null && q.overall > bar).map(q => {
        const si = upSi(x.st.M, q.p), v = si >= 0 ? scVal(si) : q.p.val, w = si >= 0 && scHasC() ? scWage(si) : null, ce = si >= 0 && SAVE.cEnd ? sDate(SAVE.cEnd[si]) : null;
        return { q, si, v, w, ce, age: si >= 0 && SAVE.age[si] >= 0 ? SAVE.age[si] : q.p.age, mins: q.p.mins || 0 };
      }).filter(o => (mxA == null || (o.age != null && o.age <= mxA)) && (mxV == null || (o.v != null && o.v <= mxV * 1e6)) && (mxW == null || (o.w != null && o.w <= mxW * 1e3)) && o.mins >= mnM
        && (cy == null || (o.ce && (o.ce - today) / 864e5 <= cy * 365.25)));
      const so = f.sort[x.i] || ["perf", -1]; if (so[0] === "fit") list.forEach(o => o.fit = fit(o)); else list.forEach(o => { o.fit = undefined; });
      const key = { perf: o => o.q.overall, fit: o => o.fit, age: o => o.age, val: o => o.v, wage: o => o.w, mins: o => o.mins, cend: o => o.ce ? +o.ce : null, name: o => o.q.p.name }[so[0]];
      list.sort((a, b) => { const A = key(a), B = key(b); if (A == null) return 1; if (B == null) return -1; return (A < B ? -1 : A > B ? 1 : 0) * so[1]; });
      const n = Math.min(list.length, UP_SHOW * ((f.more[x.i] || 0) + 1)), mySi = x.mySi;
      const th = (k, lab, cls) => `<th class="${cls || "num"}"><button data-upsort="${x.i}|${k}">${lab}${so[0] === k ? (so[1] < 0 ? " ▼" : " ▲") : ""}</button></th>`;
      body = !list.length ? `<p class="small muted">${bar < 0 ? "No stats score for him this season, and nobody matches your filters." : "Nobody in the save matches your filters and performs better in this role."}</p>` :
        `<div class="cmpscroll"><table class="heat cmpt uptab"><thead><tr>${th("name", "Player", "left")}${th("age", "Age")}<th class="left">Club · league</th>${th("mins", "Mins")}${th("perf", "Performance")}${th("fit", "Role fit /20")}${th("val", "Value")}${scHasC() ? th("wage", "Wage p/w") + th("cend", "Contract") : ""}<th></th></tr></thead><tbody>${list.slice(0, n).map(o => {
          const p = o.q.p, d = o.q.overall - bar; if (o.fit === undefined) o.fit = fit(o);
          return `<tr><td class="left"><button class="linkbtn" ${o.si >= 0 ? `data-sci="${o.si}"` : ""}>${esc(p.name)}</button> <span class="small muted">${esc(o.si >= 0 ? savePos().str[o.si] || "" : p.position || "")}</span></td><td class="num">${o.age ?? "–"}</td>
            <td class="left small">${esc(p.club || "–")}${p.div ? ` <span class="muted">· ${esc(p.div)}</span>` : ""}</td><td class="num">${Math.round(o.mins).toLocaleString()}</td>
            <td class="num"><b>${o.q.overall.toFixed(0)}</b>${bar >= 0 ? ` <span class="small okc">+${d.toFixed(0)}</span>` : ""}</td><td class="num${o.fit != null && myFit != null && o.fit < myFit ? " muted" : ""}">${o.fit != null ? o.fit.toFixed(1) : "–"}</td>
            <td class="num">${o.v != null ? esc(saveMoney(o.v)) : "–"}</td>${scHasC() ? `<td class="num">${o.w != null ? esc(saveMoney(o.w)) : "–"}</td><td class="num small">${o.ce ? o.ce.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "–"}</td>` : ""}
            <td>${o.si >= 0 && mySi >= 0 ? `<button class="linkbtn small" data-upcmp="${mySi},${o.si}" title="Open Compare with just these two">⇄ vs ${esc(x.p.name.split(" ").slice(-1)[0])}</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>
        ${list.length > n ? `<p><button class="ghost small" data-upmore="${x.i}">Show ${Math.min(UP_SHOW, list.length - n)} more (${(list.length - n).toLocaleString()} left)</button></p>` : ""}`;
    }
    const roleTxt = x.role === x.roleName ? x.role : `${x.roleName} (scored as ${x.role})`;
    h += `<details class="panel upslot" data-upslot="${x.i}" ${open ? "open" : ""}><summary><span class="upcode">${esc(x.code)}</span><span class="upwho"><b>${esc(pname)}</b><span class="small muted">${esc(roleTxt)}</span></span>
      <span class="upstat"><span class="${L[1]}">${L[0]}</span>${r && r.overall != null ? `<span class="small muted">performance ${r.overall.toFixed(0)} · better than ${Math.round(r.orank)}% at ${esc(x.g === "Wingers" ? "wide" : x.g)}${x.myFit != null ? ` · role fit ${x.myFit.toFixed(1)}/20` : ""}</span>` : ""}</span>
      <span class="upn">${x.st ? `<b>${list.length.toLocaleString()}</b><span class="small muted"> better</span>` : ""}</span></summary>
      <div class="upbody"><p class="small">Who plays here: ${sel} ${x.p && x.p.mins < 450 ? `<span class="small bad">few minutes (${Math.round(x.p.mins || 0)}), so his score is a rough guide</span>` : ""}</p>${body}</div></details>`;
  });
  h += `<section class="panel">${learnBox("Performance compares this season's numbers, so a player in a weaker league looks better than he is unless league strength is on. Role fit is attributes only and doesn't depend on minutes. Open a name for his full panel.", "sample")}</section>`;
  return h;
}
function upRedraw() { const y = window.scrollY; render(); window.scrollTo(0, y); }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-upsort], [data-upmore], [data-upcmp], [data-upgo]"); if (!t) return;
  const f = upF();
  if (t.dataset.upsort) { const [i, k] = t.dataset.upsort.split("|"), cur = f.sort[i] || ["perf", -1]; f.sort[i] = [k, cur[0] === k ? -cur[1] : (k === "age" || k === "val" || k === "wage" || k === "cend" || k === "name" ? 1 : -1)]; f.more[i] = 0; upRedraw(); }
  else if (t.dataset.upmore) { f.more[t.dataset.upmore] = (f.more[t.dataset.upmore] || 0) + 1; upRedraw(); }
  else if (t.dataset.upcmp) { cmpSet(t.dataset.upcmp.split(",").map(i => "s" + SAVE.uid[+i])); S.scTab = "cmp"; S.sel = null; render(); window.scrollTo(0, 0); }
  else if (t.dataset.upgo) { S.guide = false; S.dataPage = false; S.mode = "squad"; S.spos = "MyTactic"; S.sel = null; render(); window.scrollTo(0, 0); }
});
document.addEventListener("toggle", e => { const d = e.target; if (d.dataset && d.dataset.upslot != null) upF().open[d.dataset.upslot] = d.open; }, true);
document.addEventListener("change", e => {
  const t = e.target, f = upF();
  if (t.dataset.upf) { f[t.dataset.upf] = t.type === "checkbox" ? t.checked : t.value.trim(); f.more = {}; upRedraw(); }
  else if (t.dataset.uppick != null) { f.pick[t.dataset.uppick] = t.value; upRedraw(); }
});
