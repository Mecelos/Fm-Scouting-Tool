// ---------- Scouting > Sell & loan: who to move on (with the reason) and which young players need a loan ----------
const SELL = { drop: 3, old: 31, fringeShare: 0.2, fringeAge: 24, months: 12 };
const LOAN = { maxAge: 21, room: 15, minPA: 110, share: 0.25 };
function scMinsOf(i) { const st = SAVE.stats && SAVE.stats.overall; if (!st) return 0; const r = st.row[i]; const m = r >= 0 ? st.cols.minutes[r] : 0; return m === m ? m : 0; }
const scGroupName = g => (typeof POS_MANY !== "undefined" && POS_MANY[g]) || g || "?";
// a player's main group: where he plays this season (Home's squad check), else his best position
function scMainGroup(i) {
  const Q = typeof homeSquad === "function" ? homeSquad() : null;
  if (Q) { if (!Q._byUid) { Q._byUid = new Map(); Q.players.forEach(x => { if (!Q._byUid.has(x.r.p.uid)) Q._byUid.set(x.r.p.uid, x.pos); }); } const g = Q._byUid.get("s" + SAVE.uid[i]); if (g) return g; }
  return posGroups(savePos().best[i])[0] || scGroupsOf(i)[0];
}
// your squad by position group, strongest (CA) first
function scSquadGroups(mine) { const G = new Map(); mine.forEach(i => { const g = scMainGroup(i); if (!G.has(g)) G.set(g, []); G.get(g).push(i); }); G.forEach(l => l.sort((a, b) => (SAVE.ca[b] || 0) - (SAVE.ca[a] || 0))); return G; }
function scOut() {
  const mine = saveManagedIdx(); if (!mine.length) return `<section class="panel"><h3>Sell & loan</h3><p class="muted">Your club wasn't found in this save.</p></section>`;
  const G = scSquadGroups(mine), maxM = Math.max(1, ...mine.map(scMinsOf));
  const m = SAVE.meta.managed[0], base = typeof SNAPS !== "undefined" && SNAPS ? SNAPS.filter(x => x.club === m.club && x.gameDate < SAVE.meta.gameDate).pop() : null;
  if (typeof SNAPS !== "undefined" && !SNAPS && typeof snapList === "function") snapList().then(() => { if (S.mode === "scout" && S.scTab === "out") render(); });
  const bmap = new Map(); if (base) for (let k = 0; k < base.uid.length; k++) bmap.set(base.uid[k], k);
  const Q = typeof homeSquad === "function" ? homeSquad() : null, low = new Map((Q ? Q.low : []).map(x => [saveUidIndex().get(x.r.p.uid), x.ov]));
  const rankIn = i => { const g = scMainGroup(i), l = G.get(g) || []; return [g, l.indexOf(i), l]; };
  // sell: every reason that applies, weighted
  const sell = [];
  mine.forEach(i => {
    const why = [], age = SAVE.age[i], mins = scMinsOf(i), [g, pos, l] = rankIn(i), need = (SC_NEED[g] || 1);
    const k = bmap.get(SAVE.uid[i]); if (k != null && base.ca[k] > 0 && SAVE.ca[i] > 0 && SAVE.ca[i] - base.ca[k] <= -SELL.drop) why.push([3, `declining: ${SAVE.ca[i] - base.ca[k]} CA since your last save`]);
    if (low.has(i)) why.push([3, `rated ${Math.round(low.get(i))}/100 for his position this season`]);
    if (age >= SELL.old && SAVE.value[i] > 0) why.push([2, `aged ${age}: his value (${saveMoney(SAVE.value[i])}) will only fall`]);
    if (age >= SELL.fringeAge && mins < maxM * SELL.fringeShare && pos >= need) why.push([2, `fringe player: ${Math.round(mins)} minute${Math.round(mins) === 1 ? "" : "s"}, ${pos} ahead of him in his position`]);
    if (scHasC() && SAVE.cEnd[i] && age >= SELL.fringeAge) { const mo = scMonths(SAVE.cEnd[i]); if (mo != null && mo >= 0 && mo <= SELL.months && (pos >= need || age >= SELL.old)) why.push([2, `contract ends ${sDateTxt(SAVE.cEnd[i])}: sell now or he leaves for free`]); }
    const w = why.reduce((s, x) => s + x[0], 0); if (w >= 2) sell.push({ i, g, w, why: why.sort((a, b) => b[0] - a[0]).map(x => x[1]) });
  });
  sell.sort((a, b) => b.w - a.w || (SAVE.value[b.i] || 0) - (SAVE.value[a.i] || 0));
  // loan: young, room to grow, not playing, and someone better ahead of him
  const loan = mine.filter(i => SAVE.age[i] >= 0 && SAVE.age[i] <= LOAN.maxAge && SAVE.pa[i] >= LOAN.minPA && SAVE.pa[i] - SAVE.ca[i] >= LOAN.room && scMinsOf(i) < maxM * LOAN.share)
    .map(i => { const [g, pos, l] = rankIn(i); return { i, g, ahead: l.slice(0, Math.max(0, pos)).slice(0, 2) }; }).filter(x => x.ahead.length)
    .sort((a, b) => (SAVE.pa[b.i] || 0) - (SAVE.pa[a.i] || 0));
  const level = ca => ca >= 135 ? "a top-flight club where he'd start" : ca >= 110 ? "a second-tier side, or a weaker top-flight club" : ca >= 90 ? "a third-tier side where he plays every week" : "a lower-league or reserve side, for now";
  const nm = i => `<button class="linkbtn" data-sci="${i}">${esc(SAVE.name[i])}</button>${typeof scStar === "function" ? "" : ""}`;
  const meta = i => `${SAVE.age[i]} · CA ${SAVE.ca[i] || "–"}${SAVE.pa[i] > 0 ? "/" + SAVE.pa[i] : ""} · ${esc(saveMoney(SAVE.value[i]))} · ${Math.round(scMinsOf(i))} min`;
  let h = `<section class="panel"><div class="ph"><h3>Who to sell</h3><span class="small muted">${sell.length} player${sell.length === 1 ? "" : "s"} · most reasons first${base ? "" : " · load a later save too and players whose ability is falling are added"}</span></div>
    ${sell.length ? `<div class="tscroll"><table class="gtable"><thead><tr><th>Player</th><th>Position</th><th>Age · ability · value · minutes</th><th>Why sell</th></tr></thead><tbody>${sell.slice(0, 15).map(x => `<tr><td>${nm(x.i)}</td><td class="small">${esc(scGroupName(x.g))}</td><td class="small muted">${meta(x.i)}</td><td class="small">${x.why.map(esc).join("; ")}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted small">Nobody stands out: no declining, ageing, fringe or under-performing players.</p>`}
    <p class="small muted">Check the player's morale and your squad depth in FM before selling. Transfer targets shows who could replace him.</p></section>`;
  h += `<section class="panel"><div class="ph"><h3>Who to loan out</h3><span class="small muted">aged ${LOAN.maxAge} or under, ${LOAN.room}+ potential still to reach, under ${Math.round(LOAN.share * 100)}% of the minutes your busiest player has had</span></div>
    ${loan.length ? `<div class="tscroll"><table class="gtable"><thead><tr><th>Player</th><th>Position</th><th>Age · ability · value · minutes</th><th>Ahead of him</th><th>Loan him to</th></tr></thead><tbody>${loan.slice(0, 15).map(x => `<tr><td>${nm(x.i)}</td><td class="small">${esc(scGroupName(x.g))}</td><td class="small muted">${meta(x.i)}</td><td class="small">${x.ahead.map(j => esc(SAVE.name[j])).join(", ")}</td><td class="small">${esc(level(SAVE.ca[x.i]))}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="muted small">No young player needs a loan: your prospects are either playing or already out on loan.</p>`}
    <p class="small muted">A young player develops through match minutes: a loan where he starts beats sitting on your bench. In FM, ask for a loan with regular first-team football.</p></section>`;
  return h;
}
