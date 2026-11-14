// ---------- Diagnose: is it the player, the role or the system? One verdict per regular, one for the team, one for the last game ----------
// Three questions per player, in the role you play him in:
//   ability  = his attributes for that role, against every player in that position in the save (percentile)
//   output   = his stats this season scored for that role, against the same pool (league-adjusted)
//   involved = how much of the ball and the action he gets (per 90, against the same position)
const DG_AREA = { attack: ["ST", "Wingers", "AM"], create: ["AM", "CM", "Wingers", "FB"], progress: ["CB", "FB", "DM", "CM"], defend: ["CB", "FB", "DM", "GK"], intensity: ["ST", "Wingers", "AM", "CM", "DM"] };
const DG_VOL = { GK: ["passes_attempted"], CB: ["passes_attempted", "possession_won"], FB: ["passes_attempted", "crosses_attempted", "progressive_passes"], DM: ["passes_attempted", "possession_won"], CM: ["passes_attempted", "progressive_passes"],
  AM: ["passes_attempted", "shots", "key_passes"], Wingers: ["dribbles", "crosses_attempted", "shots"], ST: ["shots", "passes_attempted"] };
const DG_V = { // verdict -> [label, class, what to do]
  fine: ["Fine", "okc", "Leave him: he can do the job and he's doing it."],
  feed: ["The system isn't feeding him", "warnc", "He has the ability but barely gets the ball or the actions his role needs. Change what's around him: the roles next to him, or the team's passing (e.g. Focus play through his side, shorter passing), before changing him."],
  form: ["Form or luck", "warnc", "He's involved and has the ability, but the end product isn't there. Check morale, fitness and match sharpness; give him 3–4 more games before changing anything."],
  wrong: ["Wrong player for this role", "bad", ""],
  over: ["Over-performing", "", "He's doing better than his attributes say. Enjoy it, but don't build around it: it tends to drop."],
  mixed: ["About average", "muted", "Neither a problem nor a strength."],
  early: ["Too early", "muted", "Not enough minutes to judge yet."] };
function dgRoleFor(P, p) { // the role you play him in: your choice here, else your tactic file, else Scout Lab's lineup, else his best role
  const o = (S.dgRole || {})[p.uid]; if (o && ROLES[P] && ROLES[P][o]) return { role: o, src: "you" };
  if (S.myTac && S.myTac.file && typeof tacWorking === "function") { try { const W = tacWorking(); const s = W.slots.find(x => CODE_GROUP[x.ip.code === "WCB" ? "DC" : x.ip.code] === P && ROLES[P] && ROLES[P][x.ip.role]); if (s) return { role: s.ip.role, src: "your tactic" }; } catch (e) { } }
  const l = typeof lineupRole === "function" ? lineupRole(P) : null; if (l && l !== "Balanced") return { role: l, src: "Scout Lab's lineup" };
  let best = null; Object.keys(ROLES[P] || {}).forEach(r => { if (r === "Balanced") return; const v = roleRating(p, P, r); if (v != null && (!best || v > best.v)) best = { r, v }; });
  return { role: best ? best.r : "Balanced", src: "his best role (set yours)" };
}
function dgInvolve(i, P, minM) { // percentile of his per-90 volume against regulars in the same position
  const st = SAVE.stats[saveKind()]; if (!st || !(st.row[i] >= 0)) return null;
  const fs = DG_VOL[P] || ["passes_attempted"], pc = savePos(), key = SAVE.id + "|" + saveKind() + "|" + P + "|" + minM;
  SAVE._dgv = SAVE._dgv || {};
  if (!SAVE._dgv[key]) { const pool = []; for (let j = 0; j < SAVE.n; j++) { const r = st.row[j]; if (!(r >= 0) || RV_MAIN[pc.bench[j]] !== P) continue; const m = st.cols.minutes[r]; if (!(m >= minM)) continue; pool.push(fs.map(f => (st.cols[f] ? st.cols[f][r] : 0) * 90 / m)); }
    SAVE._dgv[key] = fs.map((f, k) => pool.map(x => x[k]).filter(x => x === x).sort((a, b) => a - b)); }
  const S0 = SAVE._dgv[key], r = st.row[i], m = st.cols.minutes[r]; if (!(m > 0)) return null;
  const pcts = fs.map((f, k) => { const v = (st.cols[f] ? st.cols[f][r] : 0) * 90 / m, a = S0[k]; if (!a.length) return null; let lo = 0; while (lo < a.length && a[lo] < v) lo++; return { f, v, p: 100 * lo / a.length }; }).filter(Boolean);
  return pcts.length ? { p: pcts.reduce((s, x) => s + x.p, 0) / pcts.length, parts: pcts } : null;
}
function dgLeague() { const H = homeTeam(); return H ? new Set(H.D.teams.map(t => t.club)) : null; }
const dgPct = (arr, v) => { if (!arr.length || v == null) return null; let n = 0; arr.forEach(x => { if (x < v) n++; else if (x === v) n += 0.5; }); return 100 * n / arr.length; };
function dgAbility(p, P, role, i) {
  const L = dgLeague(); if (!L) return null; const key = SAVE.id + "|" + P + "|" + role; SAVE._dga = SAVE._dga || {};
  if (!SAVE._dga[key]) { const pc = savePos(), v = [], st = SAVE.stats.league || SAVE.stats[saveKind()]; for (let j = 0; j < SAVE.n; j++) { if (!L.has(SAVE.clubIdx[j]) || RV_MAIN[pc.bench[j]] !== P || !(SAVE.ca[j] > 0)) continue;
    if (st && !(st.row[j] >= 0 && st.cols.minutes[st.row[j]] >= 300)) continue;   /* players who actually play in the league */ const x = roleRating(Object.assign({}, scP(j), { _si: j }), P, role); if (x != null) v.push(x); } SAVE._dga[key] = v; }
  return dgPct(SAVE._dga[key], roleRating(p, P, role));
}
function dgOutput(e, row) {
  const L = dgLeague(); if (!L || !e.st || !row.sr || row.sr.overall == null) return null; const ix = saveUidIndex();
  const v = e.st.rows.filter(r => r.overall != null && (() => { const j = ix.get(r.p.uid); return j != null && L.has(SAVE.clubIdx[j]); })()).map(r => r.overall);
  return v.length >= 8 ? dgPct(v, row.sr.overall) : row.sr.orank;
}
const DG_FNAME = { passes_attempted: "passes", possession_won: "possession won", crosses_attempted: "crosses", progressive_passes: "progressive passes", shots: "shots", key_passes: "key passes", dribbles: "dribbles" };
function dgPlayers() {
  const Q = homeSquad(); if (!Q) return null;
  const maxM = Math.max(1, ...Q.players.map(x => x.mins)), reg = Q.players.filter(x => x.mins >= maxM * 0.3);
  const seen = new Set(), out = [];
  reg.sort((a, b) => b.mins - a.mins).forEach(x => {
    const p0 = x.r.p; if (seen.has(p0.uid)) return; seen.add(p0.uid);
    const i0 = saveUidIndex().get(p0.uid), p = i0 != null && typeof scP === "function" ? Object.assign({}, scP(i0), { uid: p0.uid, name: p0.name, mins: p0.mins, _si: i0 }) : p0;
    const P = x.pos, R = dgRoleFor(P, p), e = squadEval(P, R.role); if (!e) return;
    const row = e.mine.find(r => r.p.uid === p0.uid); if (!row) return;
    // against players in the same position at clubs in your league (not the whole save, where everyone in a top league looks elite)
    const A = dgAbility(p, P, R.role, i0), O = dgOutput(e, row);
    const i = i0, I = i != null && P !== "GK" ? dgInvolve(i, P, Q.minM) : null;
    let v;
    if ((p.mins || 0) < 450 || O == null) v = "early";
    else if (A != null && A >= 55 && O >= 55) v = "fine";
    else if (A != null && A >= 55 && O < 40) v = I && I.p < 35 ? "feed" : "form";
    else if (A != null && A < 40 && O < 40) v = "wrong";
    else if (A != null && A < 40 && O >= 55) v = "over";
    else v = "mixed";
    let alt = null;
    if (v === "wrong" || v === "mixed") { const cur = roleRating(p, P, R.role); Object.keys(ROLES[P] || {}).forEach(r => { if (r === "Balanced" || r === R.role) return; const w = roleRating(p, P, r); if (w != null && cur != null && w > cur + 0.6 && (!alt || w > alt.v)) alt = { r, v: w, gain: w - cur }; }); }
    const tn = typeof traitNotes === "function" ? traitNotes(p, R.role) : { bad: [] };
    const misfit = typeof pTraits === "function" ? pTraits(p).filter(x => !traitFit(p, x).ok).map(x => x.name) : [];
    out.push({ p, i, P, role: R.role, src: R.src, A, O, I, v, alt, clash: tn.bad, misfit, weak: x.cats ? homeWhy({ ...x, r: row }, false) : "" });
  });
  return out;
}
function dgTeam(H) { // is the tactic working? chances for and against, against results
  const D = H.D, i = H.ti, T = D.teams[i], g = Math.max(1, T.g);
  const xg = T.v("expected_goals") / g, gf = T.v("goals") / g, ga = T.k("goals_allowed") / g, xga = (T.k("goals_allowed") + T.k("expected_goals_prevented")) / g;
  const rank = m => D.rank[m] ? D.rank[m][i] : null, diff = xg - xga, gd = gf - ga;
  let head, cls, body;
  if (diff > 0.25 && gd < diff - 0.35) { head = "Working, but unlucky"; cls = "okc"; body = `You create more than you allow (xG ${xg.toFixed(2)} for, about ${xga.toFixed(2)} against a game), but results are behind that. Finishing or their keepers are costing you. <b>Don't change the tactic</b>: results usually catch up with xG.`; }
  else if (diff > 0.25) { head = "Working"; cls = "okc"; body = `You create more than you allow (xG ${xg.toFixed(2)} for, about ${xga.toFixed(2)} against a game) and results match. Small tweaks only.`; }
  else if (diff < -0.25 && gd > diff + 0.35) { head = "Not working, but results hide it"; cls = "warnc"; body = `Opponents create more than you (about ${xga.toFixed(2)} against, ${xg.toFixed(2)} for a game), but you're getting away with it. Expect results to drop unless the structure improves.`; }
  else if (diff < -0.25) { head = "Not working"; cls = "bad"; body = `Opponents create more than you (about ${xga.toFixed(2)} against, ${xg.toFixed(2)} for a game). That's the tactic or the squad level, not bad luck.`; }
  else { head = "Even games"; cls = ""; body = `You create about as much as you allow (xG ${xg.toFixed(2)} for, about ${xga.toFixed(2)} against a game). Small margins decide your games.`; }
  return { head, cls, body, xg, xga, gf, ga, rk: { xg: rank("xg"), conc: rank("conc") } };
}
function dgLastGame(B, pl) {
  const x = B.rows[B.rows.length - 1]; if (!x) return "";
  const opp = mxName(B, x.opp), ag = x.goals.filter(g => !g.ours), late = ag.filter(g => g.m >= 76).length, early = ag.filter(g => g.m <= 15).length, pen = ag.filter(g => g.type === 2).length, og = ag.filter(g => g.type === 3).length;
  const L = [`<b>${x.res === "W" ? "Won" : x.res === "L" ? "Lost" : "Drew"} ${x.gf}–${x.ga} ${x.home ? "at home to" : "away at"} ${esc(opp)}</b> (${esc(x.comp)}).`];
  const cur = mxNow(), prev = TSNAPS && cur ? TSNAPS.filter(s => s.club === cur.club && s.all === cur.all - 1).pop() : null;
  if (prev && cur.n > prev.n) { const d = mxDiff(prev, cur), avg = cur.tot.expected_goals / Math.max(1, cur.n), xg = d.expected_goals, sotf = d.gk_shots_on_target_faced, avgS = cur.tot.gk_shots_on_target_faced / Math.max(1, cur.n);
    L.push(`You created <b>xG ${xg.toFixed(2)}</b> (your usual ${avg.toFixed(2)}) and faced ${Math.round(sotf)} shots on target (usual ${avgS.toFixed(1)}).`);
    if (x.res !== "W" && xg > avg + 0.3 && xg >= 1.2) L.push("You did enough to score: this was finishing or their keeper, not the tactic.");
    if (x.res !== "W" && sotf > avgS + 2) L.push("They got more shots on target than usual: look at the area they came through, not your attack.");
    if (x.res === "W" && xg < avg - 0.4) L.push("A win, but you created less than usual: don't read too much into it.");
  } else L.push(`<span class="muted">Load a save after every game (or link your save folder) to see how many chances you created and allowed in it.</span>`);
  if (late) L.push(`${late} of their goals came after 75': fitness or subs, not the shape.`);
  if (early) L.push(`${early} came in the first 15': a slow start.`);
  if (pen) L.push(`${pen} from a penalty.`); if (og) L.push(`${og} own goal${og > 1 ? "s" : ""}: bad luck.`);
  return `<p>${L.join(" ")}</p>`;
}
function dgRows(list) {
  return list.map(d => {
    const V = DG_V[d.v], pct = v => v == null ? "–" : `${Math.round(v)}`;
    const why = d.v === "feed" && d.I ? `Gets the ball little: ${d.I.parts.map(x => `${x.v.toFixed(1)} ${DG_FNAME[x.f] || x.f}/90 (${Math.round(x.p)}th %ile)`).join(", ")}.` :
      d.v === "form" && !d.I ? `${d.weak ? esc(d.weak) + "." : ""}` : d.v === "form" && d.I ? `Involved (${Math.round(d.I.p)}th percentile for getting on the ball), but ${d.weak ? d.weak.toLowerCase() : "the output is low"}.` :
      d.v === "wrong" ? `${d.alt ? `Try him as <b>${esc(d.alt.r)}</b> (+${d.alt.gain.toFixed(1)} on his attributes). ` : ""}${d.alt ? "If that doesn't help, he's" : "He's"} below the level for this role: a target to replace.` :
      d.v === "mixed" ? `${d.weak ? esc(d.weak) + "." : ""}${d.alt ? ` <b>${esc(d.alt.r)}</b> suits his attributes better (+${d.alt.gain.toFixed(1)}).` : ""}` : esc(V[2]);
    return `<tr><td><button class="linkbtn" data-sci="${d.i}">${esc(d.p.name)}</button><div class="small muted">${esc(POS_ONE[d.P] || d.P)}</div></td>
      <td class="small"><select class="dgrole" data-uid="${esc(d.p.uid)}">${Object.keys(ROLES[d.P] || {}).filter(r => r !== "Balanced").map(r => `<option ${r === d.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select><div class="muted">${esc(d.src)}</div></td>
      <td class="num">${pct(d.A)}</td><td class="num">${pct(d.O)}</td><td class="num">${d.I ? Math.round(d.I.p) : "–"}</td>
      <td><b class="${V[1]}">${esc(V[0])}</b><div class="small">${d.v === "feed" || d.v === "form" ? esc(V[2]) + " " : ""}${why}${d.clash.length ? ` <span class="bad">Trait clash: ${esc(d.clash.map(t => t.name).join(", "))}.</span>` : ""}${d.misfit && d.misfit.length ? ` <span class="warnc">Traits his attributes can't back up: ${esc(d.misfit.join(", "))} (train off).</span>` : ""}</div></td></tr>`;
  }).join("");
}
function mxDiagnose(B) {
  const H = B.H, pl = dgPlayers();
  if (!pl) return `<section class="panel"><p class="muted">Diagnose needs your squad from the save.</p></section>`;
  if (!TSNAPS && DB.db) tsnapList().then(() => { if (S.mode === "matches") render(); });
  const T = dgTeam(H), cnt = {}; pl.forEach(d => { cnt[d.v] = (cnt[d.v] || 0) + 1; });
  const bot = H.secs.filter(s => s.s != null).sort((a, b) => a.s - b.s)[0], area = bot ? (DG_AREA[bot.k] || []) : [];
  const inArea = pl.filter(d => area.includes(d.P)), areaFeed = inArea.filter(d => d.v === "feed" || d.v === "form").length, areaWrong = inArea.filter(d => d.v === "wrong").length;
  let sys = "";
  if (bot && bot.s < 45) sys = areaFeed >= 2 && areaFeed > areaWrong ? `Your weakest area is <b>${esc(bot.l.toLowerCase())}</b> (${Math.round(bot.s)}/100), and ${areaFeed} of the players there have the ability but aren't producing: <b>that's the structure in that area, not the players</b>. Change the roles or instructions there, not the names.`
    : areaWrong >= 1 ? `Your weakest area is <b>${esc(bot.l.toLowerCase())}</b> (${Math.round(bot.s)}/100), and ${areaWrong === 1 ? "a player" : areaWrong + " players"} there ${areaWrong === 1 ? "is" : "are"} below the level for the role: <b>that's personnel</b>. Try the role suggested below, or recruit.`
    : `Your weakest area is <b>${esc(bot.l.toLowerCase())}</b> (${Math.round(bot.s)}/100), with no single player to blame: look at how that area is set up (roles, width, passing).`;
  const fine = (cnt.fine || 0) + (cnt.over || 0), probs = (cnt.feed || 0) + (cnt.form || 0) + (cnt.wrong || 0);
  const mixNote = T.cls === "bad" && fine >= probs && !(bot && bot.s < 45 && areaWrong >= 1 && areaFeed < 2) ? "Most players are doing their job but the team isn't: <b>it's the system</b> (how the roles fit together), not individuals." : T.cls !== "bad" && (cnt.wrong || 0) >= 3 ? "The system is fine: a few players are below the level of their roles. That's recruitment, not tactics." : "";
  return `<section class="panel"><div class="ph"><h3>Is the tactic working?</h3><span class="small muted">${esc(H.D.comp.name)} · ${H.T.g} games</span></div>
      <p class="dgverdict ${T.cls}"><b>${esc(T.head)}.</b></p><p>${T.body}</p>${sys ? `<p>${sys}</p>` : ""}${mixNote ? `<p>${mixNote}</p>` : ""}
      ${learnBox("xG (expected goals) is how good your chances were; the 'against' figure is the quality of shots on target you faced. Over a season, the side of the xG that's bigger is the side that's playing better. Results follow xG more than xG follows results.", "xg")}</section>
    <section class="panel"><div class="ph"><h3>Your last game</h3></div>${dgLastGame(B, pl)}</section>
    <section class="panel"><div class="ph"><h3>Player, role or system?</h3><span class="small muted">your regulars, in the role you play them</span></div>
      <p class="small">Set each player's role to the one you use (it's remembered). <b>Ability</b> = his attributes for that role, <b>Output</b> = his stats this season for that role, <b>On the ball</b> = how much of the action he gets. All are percentiles against players in the same position at clubs in your league: 50 is average for the league.</p>
      <div class="tscroll"><table class="gtable dgtable"><thead><tr><th>Player</th><th>Role</th><th class="num">Ability</th><th class="num">Output</th><th class="num">On the ball</th><th>Verdict</th></tr></thead><tbody>${dgRows(pl)}</tbody></table></div>
      ${learnBox("Good ability + poor output + little of the ball = the system isn't feeding him. Good ability + poor output + plenty of the ball = form or luck. Poor ability + poor output = wrong player for the role. Fix systems with roles and instructions, players with role changes or transfers.", "sample")}</section>
    <section class="panel"><div class="ph"><h3>Before you change anything</h3></div><ol class="dgsteps">
      <li><b>Has it had 4–5 games?</b> Fewer is noise. Log changes in Tactic changes so you can compare.</li>
      <li><b>Look at xG, not the score.</b> Creating more than you allow = keep it, whatever the results.</li>
      <li><b>Find the area</b> (the weakest one above) and the players in it.</li>
      <li><b>Player or system?</b> One player failing with the ability = his role or service. Several failing in one area = the structure. Players without the ability = personnel.</li>
      <li><b>Change one thing</b>, the smallest that fixes it: a role before a formation, a player before a system.</li></ol></section>`;
}
document.addEventListener("change", e => {
  const t = e.target; if (!t.classList || !t.classList.contains("dgrole")) return;
  S.dgRole = Object.assign({}, S.dgRole || {}, { [t.dataset.uid]: t.value }); try { localStorage.setItem("scoutlab-dgrole", JSON.stringify(S.dgRole)); } catch (x) { }
  const y = window.scrollY; render(); window.scrollTo(0, y);
});
try { S.dgRole = JSON.parse(localStorage.getItem("scoutlab-dgrole") || "{}"); } catch (e) { S.dgRole = {}; }
// ----- opposition instructions for the next game: one or two, with what they cost your shape -----
function mxOI(B, T, danger, D, i) {
  const st = SAVE.stats.league, pc = savePos(), out = [], AI = n => FR.ATTRIBUTE_ORDER.indexOf(n), at = (j, n) => SAVE.attrs[j * 52 + AI(n)] || 0;
  const weakFoot = j => { const l = SAVE.feet[j * 2], r = SAVE.feet[j * 2 + 1]; return l && r ? (l < r ? ["left", l] : ["right", r]) : null; };
  const grp = j => pc.bench[j], name = j => esc(SAVE.name[j]);
  const d0 = danger[0];
  if (d0) { const g = grp(d0.p), wf = weakFoot(d0.p);
    if (["W", "AM", "ST"].includes(g) && wf && wf[1] <= 10) out.push({ w: `<b>${name(d0.p)}</b>: <b>Show onto weaker foot</b> (his ${wf[0]})`, why: `Their top scorer/creator (${d0.g} goals, ${d0.a} assists) and his ${wf[0]} foot is weak (${wf[1]}/20). Forcing him onto it cuts his shots and crosses.`, cost: "None: nobody leaves their position." });
    else if (g === "ST") out.push({ w: `<b>${name(d0.p)}</b>: <b>Tight marking: Always</b>`, why: `Their main threat (${d0.g} goals, ${d0.a} assists). Tight marking denies him time when he drops or turns.`, cost: "Small: a centre-back follows him when he drops. Fine with two centre-backs and a holding midfielder; skip it with a back three that steps up." });
    else out.push({ w: `<b>${name(d0.p)}</b>: <b>Trigger press: Always</b>`, why: `Their main threat (${d0.g} goals, ${d0.a} assists). Pressing him every time stops him turning and picking a pass.`, cost: "Medium: the nearest midfielder leaves his spot to press him. Skip it if you defend in a low block." });
  }
  // their creator: most key + progressive passes per 90 among midfielders (not the danger man)
  let cr = null;
  if (st) for (let j = 0; j < SAVE.n; j++) { if (SAVE.clubIdx[j] !== T.club || !(st.row[j] >= 0) || (d0 && j === d0.p)) continue; if (!["DM", "CM", "AM"].includes(grp(j))) continue; const r = st.row[j], m = st.cols.minutes[r]; if (!(m >= 450)) continue;
    const v = ((st.cols.key_passes ? st.cols.key_passes[r] : 0) * 2 + (st.cols.progressive_passes ? st.cols.progressive_passes[r] : 0)) * 90 / m; if (!cr || v > cr.v) cr = { j, v, kp: (st.cols.key_passes ? st.cols.key_passes[r] : 0) * 90 / m }; }
  const brave = cr ? at(cr.j, "bravery") : 0, comp = cr ? at(cr.j, "composure") : 0;
  if (cr && out.length < 2 && cr.kp >= 1.0) out.push({ w: `<b>${name(cr.j)}</b>: <b>Trigger press: Always</b>${comp && comp <= 11 ? " and <b>Tackling: Hard</b>" : ""}`, why: `He runs their game (${cr.kp.toFixed(1)} key passes a game). Pressure on the ball stops him picking passes${comp && comp <= 11 ? `, and with ${comp}/20 Composure he rushes under it` : ""}.`, cost: "Medium: a midfielder steps out to press him. Fine if you have a holding midfielder behind; skip it in a low block." });
  // their weakest passer at the back, only if they build from the back badly
  if (out.length < 2 && D.pct.paspct && D.pct.paspct[i] != null && D.pct.paspct[i] < 45) { let wp = null;
    for (let j = 0; j < SAVE.n; j++) { if (SAVE.clubIdx[j] !== T.club || !["CB", "FB"].includes(grp(j)) || !(st && st.row[j] >= 0) || !(st.cols.minutes[st.row[j]] >= 450)) continue; const v = at(j, "passing") + at(j, "composure"); if (!wp || v < wp.v) wp = { j, v }; }
    if (wp) out.push({ w: `<b>${name(wp.j)}</b>: <b>Trigger press: Always</b>`, why: `Their weakest on the ball at the back (Passing ${at(wp.j, "passing")}, Composure ${at(wp.j, "composure")}) in a team that already gives the ball away. Let him have it, then press.`, cost: "Small: your forward presses him; the rest of your shape stays." });
  }
  return out.slice(0, 2);
}
function mxOIHtml(B, T, danger, D, i, t) {
  const L0 = mxOI(B, T, danger, D, i), L = t != null && typeof olOIs === "function" ? olOIs(B, t, L0) : L0; if (!L.length) return "";
  return `<section class="panel"><div class="ph"><h3>Opposition instructions</h3><span class="small muted">${L.length === 1 ? "just one" : L.length === 2 ? "just two" : "three"}: they don't change your tactic</span></div>
    <ol class="dgsteps">${L.map(x => `<li>${x.w}<div class="small">${x.why}</div><div class="small muted">Effect on your shape: ${x.cost}</div></li>`).join("")}</ol>
    <p class="small muted">Set them in FM: Tactics › Opposition Instructions, before the match. Each one pulls a player of yours toward a man; more than two and your shape stops being yours.</p></section>`;
}
