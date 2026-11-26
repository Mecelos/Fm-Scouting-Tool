// ---------- My squad › Overview: the lineup on a pitch, click a position for everyone who plays there; formations ranked ----------
// Built on computeLineup() (20-best-xi): the same picks and scores as before, shown as FM-style cards on a pitch.
// S.sqSlot = the clicked slot, S.sqDepth = show the backup on each card, S.sqView = "pitch" | "forms".
const TAC_FORM = "My tactic";
function tacLineupSlots() {   // your loaded tactic (My tactic tab) as lineup slots, or null
  const W = typeof tacWorking === "function" && S.myTac ? tacWorking() : null; if (!W || W.slots.length !== 11) return null;
  const sl = W.slots.map(s => ({ code: s.ip.code, x: Math.round(s.ip.x), role: s.ip.role }));
  return sl.every(s => CODE_GROUP[s.code]) ? sl : null;
}
const sqGroupName = g => (typeof POS_MANY !== "undefined" && POS_MANY[g] ? POS_MANY[g] : g).toLowerCase();
const sqSur = n => { const w = String(n || "").split(" "); return w.length > 1 ? w.slice(1).join(" ") : w[0]; };
function sqSaveIx(p) { return p && p.uid ? saveUidIndex().get(p.uid) : null; }
// his score against pool players his age (±1 year, ±2 if few) at this slot: 100% = average for his age
function sqVsAge(sl, r, X) {
  const e = sl.e; if (!e || !e.prim || !e.hasRef) return null;
  if (!e._age || e._age.mode !== X.mode) { const by = new Map(); e.prim.rows.forEach(q => { if (!q.p.ref || !(q.p.age > 0)) return; const f = slotFit(q, X.mode); if (f == null) return; const a = Math.round(q.p.age); if (!by.has(a)) by.set(a, []); by.get(a).push(f); }); e._age = { mode: X.mode, by }; }
  const a = Math.round(r.p.age), pick = d => { let l = []; for (let k = a - d; k <= a + d; k++) l = l.concat(e._age.by.get(k) || []); return l; };
  let l = pick(1); if (l.length < 8) l = pick(2); if (l.length < 5) return null;
  const f = slotFit(r, X.mode); if (f == null) return null;
  return f / (l.reduce((s, v) => s + v, 0) / l.length) * 100;
}
// shortlisted players (from the save) who'd beat your starter in this slot, on their attribute rating for the role
function sqShortlistBetter(sl, X) {
  if (typeof SL === "undefined" || !SL.length || !SAVE || X.mode === "stats" || !sl.pick) return null;
  const ux = saveUidIndex(), idx = SL.map(x => ux.get(x.uid)).filter(i => i != null && posGroups(savePos().str[i]).includes(sl.group));
  if (!idx.length) return [];
  const ds = makeSaveDs("sl|" + sl.group + "|" + idx.join(","), "attr", sl.group, idx), m = buildModel(ds), w = roleW(sl.group, sl.role);
  return m.players.map(p => ({ p, v: attrRating(p, w) })).filter(x => x.v != null && x.v > sl.pick.raw).sort((a, b) => b.v - a.v);
}
function sqLines(X) {   // average score by group and by line (defence, midfield, attack)
  const g = {}; X.slots.forEach(s => { if (!s.pick || s.pick.noData) return; (g[s.group] = g[s.group] || []).push(s.pick.raw); });
  const avg = l => l && l.length ? l.reduce((a, b) => a + b, 0) / l.length : null, groups = Object.entries(g).map(([k, l]) => [k, avg(l)]);
  const line = ks => avg(ks.flatMap(k => g[k] || []));
  return { groups, def: line(["GK", "CB", "FB"]), mid: line(["DM", "CM"]), att: line(["AM", "Wingers", "ST"]) };
}
function sqWeak(X) { const L = sqLines(X), w = L.groups.filter(x => x[0] !== "GK").sort((a, b) => a[1] - b[1])[0]; return w && X.avg != null ? { g: w[0], v: w[1], d: w[1] - X.avg } : null; }

function sqLineupHtml(X) {
  const tac = tacLineupSlots(), names = Object.keys(FORMATION_PRESETS), cur = S.formation === TAC_FORM && tac ? TAC_FORM : FORMATION_PRESETS[S.formation] ? S.formation : "4-4-2";
  const view = S.sqView === "forms" ? "forms" : "pitch";
  const ctl = `<div class="sqctl"><select id="formation" aria-label="Formation">${tac ? `<option value="${TAC_FORM}" ${cur === TAC_FORM ? "selected" : ""}>My tactic: ${esc(S.myTac.file.name || "loaded")}</option>` : ""}${names.map(f => `<option ${f === cur ? "selected" : ""}>${esc(f)}</option>`).join("")}</select>
    <span class="seg"><button data-sqdepth="0" aria-pressed="${!S.sqDepth}">Score</button><button data-sqdepth="1" aria-pressed="${!!S.sqDepth}">Depth</button></span>
    <select id="pickBy" aria-label="Pick by">${Object.entries(PICK_BY).map(([k, l]) => `<option value="${k}" ${k === X.mode ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
    <span class="seg"><button data-sqview="pitch" aria-pressed="${view === "pitch"}">Lineup</button><button data-sqview="forms" aria-pressed="${view === "forms"}">Formations</button></span>
    ${tac && cur !== TAC_FORM ? `<button class="linkbtn" data-sqform="${TAC_FORM}">Use my tactic</button>` : ""}${!tac ? `<button class="linkbtn" data-spos="MyTactic">Load my tactic</button>` : ""}</div>`;
  if (view === "forms") return `<section class="panel sqlu"><div class="ph"><h3>Formations</h3><span class="small muted">every shape ranked by how well your squad fits it: click one for its eleven</span></div>${ctl}${sqFormsHtml(X)}</section>`;
  if (S.sqSlot == null || !X.slots[S.sqSlot]) { const w = sqWeak(X); S.sqSlot = w ? X.slots.findIndex(s => s.group === w.g) : 0; if (S.sqSlot < 0) S.sqSlot = 0; }
  const w = sqWeak(X);
  const cards = X.slots.map((sl, k) => {
    const x = Math.min(88, Math.max(12, CODE_X[sl.code] ?? sl.x)), y = CODE_Y[sl.code] ?? 50, pk = sl.pick, r = pk && pk.r, bk = sl.alts[0];
    const col = r && sl.e.hasRef && r.cmb != null ? heat(r.cmb) : "var(--line2)";
    return `<button class="sqcard${k === S.sqSlot ? " on" : ""}${pk ? "" : " empty"}" data-sqslot="${k}" style="left:${x}%;top:${(93 - (y - 9) * 1.0).toFixed(1)}%;--c:${col}" title="${esc(sl.role)}">
      <span class="sqc1">${esc(ROLE_ABBR[sl.role] || sl.label)}${r && r.p.age ? `<i>${r.p.age}</i>` : ""}</span><span class="sqc2">${r ? esc(sqSur(r.p.name)) : "nobody"}</span>
      <span class="sqc3">${pk ? fitTxt(pk.raw, X) + (pk.adj ? `<small> ${esc(sl.label)}</small>` : "") : "–"}</span>${S.sqDepth ? `<span class="sqc4">${bk ? esc(sqSur(bk.r.p.name)) + " " + fitTxt(bk.raw, X) : "no backup"}</span>` : ""}</button>`;
  }).join("");
  const under = `<p class="small">Team average <b>${fitTxt(X.avg, X)}</b>${w ? ` · weak spot: <b>${esc(sqGroupName(w.g))} ${fitTxt(w.v, X)}</b> <span class="bad">${w.d.toFixed(1)}</span>` : ""}</p>
    ${w && w.d <= -0.5 ? `<p class="readbox small">Your weak spot is the <b>${esc(sqGroupName(w.g))}</b> (${fitTxt(w.v, X)}, ${Math.abs(w.d).toFixed(1)} below the eleven). <button class="linkbtn" data-sctab="targets" data-mode2="scout">Transfer targets</button> lists who would improve it.</p>` : ""}`;
  return `<section class="panel sqlu"><div class="ph"><h3>Lineup</h3><span class="small muted">${esc(cur)}${cur === TAC_FORM ? " (from your tactic file)" : ""} · click a position for everyone who plays it</span></div>${ctl}
    <div class="sqgrid"><div><div class="sqpitch" role="group" aria-label="Your eleven">${cards}</div>${under}</div><div class="sqside">${sqSlotHtml(X, X.slots[S.sqSlot])}</div></div></section>`;
}
function sqSlotHtml(X, sl) {
  if (!sl) return "";
  const at = new Map(), bk = new Map(); X.slots.forEach((s, k) => { if (s.pick) at.set(s.pick.r.p.ix, k); if (s.alts[0]) bk.set(s.alts[0].r.p.ix, k); });
  const list = sl.cand.filter(c => c && !c.noData).sort((a, b) => b.fit - a.fit), here = X.slots.indexOf(sl);
  const role = (k, ix) => k === here ? "Starter" : `Starter at ${X.slots[k].label}`;
  const inF = ix => at.has(ix) ? `<span class="${at.get(ix) === here ? "okc" : ""}"><b>${role(at.get(ix), ix)}</b></span>` : bk.has(ix) ? (bk.get(ix) === here ? "<b>Backup</b>" : `Backup at ${esc(X.slots[bk.get(ix)].label)}`) : "–";
  const better = sqShortlistBetter(sl, X);
  const head = `<div class="ph"><h3>${esc(sl.label)} <small class="muted">${list.length} of yours can play here${sl.pick ? ` · starter ${esc(sl.pick.r.p.name)}` : ""}</small></h3>
    <label class="fl"><span class="small muted">Role</span><select data-sqrole="${here}">${codeRoles(sl.code).map(r => `<option ${r === sl.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select></label></div>`;
  const rows = list.map((c, n) => { const p = c.r.p, i = sqSaveIx(p), va = sqVsAge(sl, c.r, X), young = !isSenior(p);
    return `<tr class="${at.get(p.ix) === here ? "rsel" : ""}"><td class="num muted">${n + 1}</td><td class="left">${i != null ? `<button class="linkbtn" data-sci="${i}">${esc(p.name)}</button>` : esc(p.name)}${young ? `<span class="inf">youth</span>` : ""}</td>
      <td class="left small">${inF(p.ix)}</td><td class="left small muted">${esc(p.position || p.bestPos || "")}${c.adj ? ` <span class="warn">(next-door)</span>` : ""}</td><td class="num">${p.age ?? "–"}</td>
      <td class="num strong hc" style="background:${sl.e.hasRef && c.r.cmb != null ? heat(c.r.cmb) : "transparent"}">${fitTxt(c.raw, X)}</td>
      <td class="num ${va == null ? "muted" : va >= 105 ? "okc" : va < 95 ? "bad" : ""}">${va == null ? "–" : Math.round(va) + "%"}</td>
      <td class="num small">${i != null ? esc(saveMoney(SAVE.value[i])) : "–"}</td><td class="num small">${i != null && scHasC() && SAVE.cEnd[i] ? sDate(SAVE.cEnd[i]).getUTCFullYear() : "–"}</td></tr>`; }).join("");
  return head + `<div class="tscroll"><table class="heat sqtab"><thead><tr><th class="num">#</th><th class="left">Player</th><th class="left">In this shape</th><th class="left">FM position</th><th class="num">Age</th><th class="num">Score</th>
    <th class="num" data-tip="His score against players his age in this position: over 100% is ahead for his age">vs age</th><th class="num">Value</th><th class="num">Contract</th></tr></thead><tbody>${rows || `<tr><td colspan="9" class="muted">Nobody in your squad plays here.</td></tr>`}</tbody></table></div>
    <p class="small muted">Score = his rating in this role${X.scale === 20 ? " out of 20" : " out of 100"}. "Next-door" players are listed for the neighbouring position (LB for LWB, CM for AM) at a small cost.</p>
    ${better == null ? "" : `<h4>Better on your shortlist <small class="muted">attribute rating for ${esc(sl.role)}, above ${fitTxt(sl.pick.raw, X)}</small></h4>${better.length ? `<ul class="why">${better.slice(0, 6).map(x => { const i = sqSaveIx(x.p); return `<li>${i != null ? `<button class="linkbtn" data-sci="${i}">${esc(x.p.name)}</button>` : esc(x.p.name)} <span class="small muted">${esc(x.p.club || "")} · ${x.p.age ?? "?"}</span> <b>${x.v.toFixed(1)}</b></li>`; }).join("")}</ul>` : `<p class="small muted">Nobody on your shortlist beats your starter here.</p>`}`}`;
}
// every formation, scored by your best eleven and second eleven
function sqFormRank() {
  const sq = squadDs(), key = [sq && sq.id, S.pickBy, S.minMins, S.league, JSON.stringify(S.lineups || {}), S.myTac ? S.myTac.fname : ""].join("|");
  if (sqFormRank.c && sqFormRank.c.key === key) return sqFormRank.c.out;
  const keep = S.formation, names = (tacLineupSlots() ? [TAC_FORM] : []).concat(Object.keys(FORMATION_PRESETS)), out = [];
  try { names.forEach(f => { S.formation = f; const X = computeLineup(); if (X.avg == null) return;
    const alt = X.slots.map(s => s.alts[0] ? s.alts[0].raw : null).filter(v => v != null), L = sqLines(X), w = sqWeak(X);
    const lines = [["defence", L.def], ["midfield", L.mid], ["attack", L.att]].filter(x => x[1] != null).sort((a, b) => b[1] - a[1]);
    out.push({ f, avg: X.avg, alt: alt.length ? alt.reduce((a, b) => a + b, 0) / alt.length : null, w, best: lines[0], X }); }); }
  finally { S.formation = keep; }
  out.sort((a, b) => b.avg - a.avg);
  sqFormRank.c = { key, out }; return out;
}
function sqFormsHtml(X0) {
  const R = sqFormRank(); if (!R.length) return `<p class="muted">Load your squad first.</p>`;
  const top = R[0].avg;
  return `<div class="tscroll"><table class="gtable sqforms"><thead><tr><th class="num">#</th><th>Formation</th><th class="num">Best XI</th><th class="num">2nd XI</th><th>Weakest spot</th><th>Why</th></tr></thead><tbody>
    ${R.map((x, n) => `<tr class="${x.f === S.formation ? "rsel" : ""}"><td class="num muted">${n + 1}</td><td><button class="linkbtn" data-sqform="${esc(x.f)}"><b>${esc(x.f === TAC_FORM ? "My tactic: " + (S.myTac.file.name || "") : x.f)}</b></button></td>
      <td class="num"><b>${fitTxt(x.avg, X0)}</b></td><td class="num">${x.alt != null ? fitTxt(x.alt, X0) : "–"}</td>
      <td class="small">${x.w ? `${esc(sqGroupName(x.w.g))} ${fitTxt(x.w.v, X0)} <span class="bad">${x.w.d.toFixed(1)}</span>` : "–"}</td>
      <td class="small muted">${x.best ? `your ${x.best[0]} (${fitTxt(x.best[1], X0)}) is the strongest line` : ""}${n ? `; ${(top - x.avg).toFixed(2)} behind #1` : "; the best fit for this squad"}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">Best XI = the average score of the eleven picked for that shape (nobody plays twice); 2nd XI = the next player in each position. Roles are the formation's defaults, or the ones you set.</p>`;
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-sqslot], [data-sqdepth], [data-sqview], [data-sqform]"); if (!t) return;
  if (t.dataset.sqslot != null) S.sqSlot = +t.dataset.sqslot;
  else if (t.dataset.sqdepth != null) S.sqDepth = t.dataset.sqdepth === "1";
  else if (t.dataset.sqview) S.sqView = t.dataset.sqview;
  else if (t.dataset.sqform) { S.formation = t.dataset.sqform; S.squadRole = {}; S.sqView = "pitch"; S.sqSlot = null; }
  const y = window.scrollY; render(); window.scrollTo(0, y);
});
document.addEventListener("change", e => {
  const t = e.target; if (!t.dataset || t.dataset.sqrole == null) return;
  const sl = currentSlots(), k = +t.dataset.sqrole; if (!sl[k]) return;
  sl[k] = { ...sl[k], role: t.value }; setSlots(sl); const y = window.scrollY; render(); window.scrollTo(0, y);
});
