// ---------- Matches: every result from the save, a review of the last game, the next opponent, and whether tactic changes worked ----------
// Scores and goals (minute, who, how) come from the save's match records. Team and player numbers for one game come from the
// difference between two saves: load your save after every game and the last one is reviewed on its own.
const MX_TABS = [["diag", "Diagnose"], ["last", "Last game"], ["results", "Results"], ["opp", "Next opponent"], ["changes", "Tactic changes"]];
const MX_BUCKETS = [[1, 15, "1–15'"], [16, 30, "16–30'"], [31, 45, "31–45'+"], [46, 60, "46–60'"], [61, 75, "61–75'"], [76, 130, "76–90'+"]];
const MX_TYPE = { 0: "", 1: "set piece", 2: "penalty", 3: "own goal" };
const mxFriendly = name => /friendl|testimonial/i.test(name || "");
function mxBase() {
  if (!SAVE || !SAVE.matches || !SAVE.teams || !SAVE.matches.hg) return null;
  const H = typeof homeTeam === "function" ? homeTeam() : null; if (!H) return null;
  const D = H.D, M = SAVE.matches, TM = SAVE.teams, me = D.myTeam; if (me == null) return null;
  const key = [SAVE.id, me].join("|"); if (SAVE._mx && SAVE._mx.key === key) return Object.assign(SAVE._mx, { D, H });
  const byTeam = new Map(); for (let k = 0; k < TM.n; k++) byTeam.set(TM.team[k], k);
  const mine = new Map((M.mine || []).map(x => [x.r, x]));
  const order = [...Array(M.n).keys()].sort((a, b) => M.id[a] - M.id[b]);
  const rows = order.filter(r => (M.home[r] === me || M.away[r] === me) && M.hg[r] !== 255).map(r => {
    const home = M.home[r] === me, gf = home ? M.hg[r] : M.ag[r], ga = home ? M.ag[r] : M.hg[r], x = mine.get(r), side = home ? 0 : 1;
    const sh = x && x.shoot && x.shoot.length ? x.shoot : null, shF = sh ? sh.filter(s => s.side === side && s.scored).length : 0, shA = sh ? sh.filter(s => s.side !== side && s.scored).length : 0;
    const res = gf > ga ? "W" : gf < ga ? "L" : sh ? (shF > shA ? "W" : "L") : "D";
    return { r, comp: M.comps[M.comp[r]], home, opp: home ? M.away[r] : M.home[r], gf, ga, res, pens: sh ? `${shF}–${shA} pens` : "", friendly: mxFriendly(M.comps[M.comp[r]]),
      goals: x ? x.goals.map(g => ({ ...g, ours: g.side === side })) : [] };
  });
  const comp = rows.filter(x => !x.friendly);
  return (SAVE._mx = { key, D, H, M, TM, me, byTeam, rows, comp, order });
}
function mxName(B, t) {
  const k = B.byTeam.get(t); const c = k != null ? B.TM.club[k] : -1;
  return c >= 0 ? (SAVE.clubShort && SAVE.clubShort[c]) || SAVE.clubs[c] : "Team " + t;
}
const mxResCls = r => r === "W" ? "okc" : r === "L" ? "bad" : "muted";
const mxBadge = x => `<span class="mxres ${x.res === "W" ? "w" : x.res === "L" ? "l" : "d"}">${x.res}</span>`;
function mxTable(B, c) { // form table: every team's last N league games (the save keeps only recent matches of other clubs, so N = the fewest anyone has)
  const M = B.M, G = new Map(), add = (t, gf, ga) => { let v = G.get(t); if (!v) G.set(t, v = []); v.push([gf, ga]); };
  B.order.forEach(r => { if (M.comp[r] !== c || M.hg[r] === 255) return; add(M.home[r], M.hg[r], M.ag[r]); add(M.away[r], M.ag[r], M.hg[r]); });
  const n = Math.min(...[...G.values()].map(v => v.length)); if (!(n >= 3)) return [];
  const rows = [...G.entries()].map(([t, v]) => { const x = { t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [], all: v.length };
    v.slice(-n).forEach(([a, b]) => { x.p++; x.gf += a; x.ga += b; if (a > b) { x.w++; x.pts += 3; x.form.push("W"); } else if (a < b) { x.l++; x.form.push("L"); } else { x.d++; x.pts++; x.form.push("D"); } }); return x; });
  rows.n = n; return rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}
function mxTiming(B, team, compOnly) { // goals for / against per 15 minutes, from every match of that team
  const M = B.M, E = M.ev, f = MX_BUCKETS.map(() => 0), a = MX_BUCKETS.map(() => 0), how = { for: [0, 0, 0, 0], against: [0, 0, 0, 0] };
  const rows = new Set(); for (let r = 0; r < M.n; r++) if ((M.home[r] === team || M.away[r] === team) && !(compOnly && mxFriendly(M.comps[M.comp[r]]))) rows.add(r);
  for (let k = 0; k < E.length; k += 4) { const r = E[k]; if (!rows.has(r)) continue; const side = M.home[r] === team ? 0 : 1, ours = E[k + 2] === side, b = MX_BUCKETS.findIndex(x => E[k + 1] <= x[1]);
    (ours ? f : a)[b < 0 ? 5 : b]++; how[ours ? "for" : "against"][Math.min(3, E[k + 3])]++; }
  return { f, a, how, games: rows.size };
}
function mxTimingHtml(t, us = "You") {
  const mx = Math.max(1, ...t.f, ...t.a);
  const bar = (v, cls) => `<span class="mxbar"><i class="${cls}" style="width:${v ? Math.max(4, 100 * v / mx) : 0}%"></i><b>${v}</b></span>`;
  return `<div class="mxtime"><div class="mxtl small muted"><span></span><span><i class="mxkey f"></i>${esc(us)} scored</span><span><i class="mxkey a"></i>Conceded</span></div>
    ${MX_BUCKETS.map((b, i) => `<div class="mxtr"><span class="small">${b[2]}</span>${bar(t.f[i], "f")}${bar(t.a[i], "a")}</div>`).join("")}</div>`;
}
function mxTimingWords(t, who = "You") {
  const sf = t.f.reduce((s, x) => s + x, 0), sa = t.a.reduce((s, x) => s + x, 0), out = [];
  if (sa >= 6) { const late = t.a[5] / sa; if (late >= 0.3) out.push(`${who === "You" ? "You concede" : "They concede"} <b>${Math.round(late * 100)}%</b> of goals in the last 15 minutes${who === "You" ? " — legs or concentration going: make subs earlier (60–70'), and when ahead late drop to a lower line and less pressing" : " — keep pushing late on: they tire"}.`);
    const early = t.a[0] / sa; if (early >= 0.25) out.push(`${who === "You" ? "You concede" : "They concede"} <b>${Math.round(early * 100)}%</b> in the first 15 minutes${who === "You" ? " — a slow start: begin on a more cautious mentality and step up after 15'" : " — start fast and test them early"}.`); }
  if (sf >= 6) { const late = t.f[5] / sf; if (late >= 0.3) out.push(`${who === "You" ? "You score" : "They score"} <b>${Math.round(late * 100)}%</b> of goals after 75'${who === "You" ? " — your fitness or subs win games late" : " — don't sit on a lead against them; keep fresh legs on"}.`);
    const h1 = t.f.slice(0, 3).reduce((s, x) => s + x, 0) / sf; if (h1 <= 0.3) out.push(`Only ${Math.round(h1 * 100)}% of ${who === "You" ? "your" : "their"} goals come before half-time${who === "You" ? " — try a more positive mentality from the start" : ""}.`); }
  if (t.how.for[2] >= 3 && sf && t.how.for[2] / sf >= 0.2) out.push(`${who === "You" ? "You get" : "They get"} ${t.how.for[2]} goals from penalties (${Math.round(100 * t.how.for[2] / sf)}%).`);
  if (t.how.against[2] >= 3 && sa && t.how.against[2] / sa >= 0.2) out.push(`${t.how.against[2]} goals conceded from penalties: ${who === "You" ? "try Tackling: Stay On Feet" : "they give penalties away: dribble at them in the box"}.`);
  return out;
}
// ----- snapshots of your team and squad at every save you load (for one-game reviews and before/after) -----
let TSNAPS = null;
async function tsnapList() { if (TSNAPS) return TSNAPS; TSNAPS = (DB.db && (await DB.get("tsnaps"))) || []; return TSNAPS; }
function mxNow() { // your team's totals (all competitions) and squad lines now
  const B = mxBase(); if (!B) return null;
  const TM = B.TM, k = B.byTeam.get(B.me); if (k == null || !TM.overall) return null;
  const tot = {}; TM.fields.forEach((f, q) => { tot[f] = TM.overall[k * TM.fields.length + q]; }); TM.gkFields.forEach((f, q) => { tot["gk_" + f] = TM.overallGk[k * TM.gkFields.length + q]; });
  const st = SAVE.stats.overall, sq = [];
  if (st) saveManagedIdx().forEach(i => { const r = st.row[i]; if (!(r >= 0)) return; const c = f => { const a = st.cols[f]; const v = a ? a[r] : NaN; return v === v ? v : 0; };
    const ra = c("rated_appearances"), ar = st.cols.average_rating ? st.cols.average_rating[r] : NaN;
    sq.push([SAVE.uid[i], c("minutes"), c("goals"), c("assists"), ar === ar ? ar * ra : 0, ra, c("expected_goals"), c("key_passes"), c("tackles_completed") + c("interceptions"), c("shots"), c("player_of_the_match")]); });
  const m = SAVE.meta.managed && SAVE.meta.managed[0];
  return { gameDate: SAVE.meta.gameDate, club: m ? m.club : "", n: B.comp.length, all: B.rows.length, tot, sq, at: Date.now() };
}
async function tsnapTake() {
  if (!DB.db) return; const s = mxNow(); if (!s) return;
  const list = (await tsnapList()).filter(x => !(x.gameDate === s.gameDate && x.club === s.club)); list.push(s); list.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  while (list.length > 120) list.shift(); TSNAPS = list; await DB.set("tsnaps", list);
}
const MX_TEAM = [ // [label, per game from totals, higher is better, decimals, unit]
  ["xG", t => t.expected_goals, 1, 2], ["Shots", t => t.shots, 1, 1], ["Shots on target", t => t.shots_on_target, 1, 1], ["Clear-cut chances", t => t.clear_cut_chances_created, 1, 1],
  ["Pass completion", t => t.passes_attempted ? 100 * t.passes_completed / t.passes_attempted : NaN, 1, 0, "%", true], ["Progressive passes", t => t.progressive_passes, 1, 0],
  ["Possession won", t => t.possession_won, 1, 0], ["Tackles won", t => t.tackles_attempted ? 100 * t.tackles_completed / t.tackles_attempted : NaN, 1, 0, "%", true],
  ["Shots on target faced", t => t.gk_shots_on_target_faced, 0, 1], ["Distance (km)", t => t.distance_km, 1, 1]];
function mxDiff(a, b) { const d = {}; Object.keys(b.tot).forEach(f => { d[f] = b.tot[f] - ((a && a.tot[f]) || 0); }); return d; }
function mxTeamRows(per, season, nPer, nSeason) {
  return MX_TEAM.map(([l, fn, hi, dp, u, ratio]) => {
    const a = fn(per), b = fn(season); if (!(a === a) || !(b === b)) return "";
    const x = ratio ? a : a / nPer, y = ratio ? b : b / nSeason, diff = y ? (x - y) / Math.abs(y) : 0, good = hi ? diff > 0.12 : diff < -0.12, bad = hi ? diff < -0.12 : diff > 0.12;
    return `<tr><td>${esc(l)}</td><td class="num"><b>${x.toFixed(dp)}${u || ""}</b></td><td class="num muted">${y.toFixed(dp)}${u || ""}</td><td class="small ${good ? "okc" : bad ? "bad" : "muted"}">${good ? "▲ better" : bad ? "▼ worse" : "≈ usual"}</td></tr>`;
  }).join("");
}
// ----- pages -----
function mxLast(B) {
  const all = B.rows; if (!all.length) return `<section class="panel"><p class="muted">No matches for your team in this save yet.</p></section>`;
  const x = all[all.length - 1], opp = mxName(B, x.opp);
  const ours = x.goals.filter(g => g.ours), theirs = x.goals.filter(g => !g.ours), gl = g => `${g.m}' ${esc(g.by || "?")}${g.type ? ` <span class="muted">(${MX_TYPE[g.type]})</span>` : ""}${g.as ? ` <span class="muted small">· assist ${esc(g.as)}</span>` : ""}`;
  let h = `<section class="panel mxlast"><div class="ph"><h3>Last game</h3><span class="small muted">${esc(x.comp)} · ${x.home ? "home" : "away"}</span></div>
    <div class="mxscore">${mxBadge(x)}<div><b class="mxsc">${x.home ? "You" : esc(opp)} ${x.home ? x.gf : x.ga} – ${x.home ? x.ga : x.gf} ${x.home ? esc(opp) : "You"}</b>${x.pens ? `<span class="small muted"> · ${x.pens}</span>` : ""}</div></div>
    <div class="mxgoals"><div><h4>Your goals</h4>${ours.length ? ours.map(g => `<p class="small">${gl(g)}</p>`).join("") : `<p class="small muted">None.</p>`}</div><div><h4>${esc(opp)}</h4>${theirs.length ? theirs.map(g => `<p class="small">${gl(g)}</p>`).join("") : `<p class="small muted">None.</p>`}</div></div>`;
  if (!TSNAPS) { tsnapList().then(() => { if (S.mode === "matches") render(); }); return h + `</section>`; }
  const cur = mxNow(), prev = cur && TSNAPS.filter(s => s.club === cur.club && s.all < cur.all && s.gameDate < cur.gameDate).pop();
  if (!cur || !prev) return h + `<div class="mxtip"><b>Want a full review of every game?</b> Load your save after each match (or <button class="linkbtn" data-act="datapage">link your save folder</button> and it loads itself). Scout Lab keeps a small snapshot each time, and the difference between two saves is that game: every player's rating, minutes and goals, and the team's xG, shots and passing against your usual.</div></section>`;
  const games = cur.all - prev.all, compGames = cur.n - prev.n, d = mxDiff(prev, cur);
  const when = games === 1 ? "this game" : `the last ${games} games (since your save of ${new Date(prev.gameDate + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" })})`;
  h += `<h4>The team in ${esc(when)}</h4>${compGames < 1 ? `<p class="small muted">Friendlies don't count in FM's stats, so there are no team numbers for ${games === 1 ? "this game" : "these games"}.</p>` : `<div class="tscroll"><table class="gtable narrow"><thead><tr><th></th><th class="num">${games === 1 ? "This game" : "Per game"}</th><th class="num">Season avg</th><th></th></tr></thead><tbody>${mxTeamRows(d, cur.tot, compGames, Math.max(1, cur.n))}</tbody></table></div>`}`;
  const pm = new Map(prev.sq.map(r => [r[0], r])), ix = saveUidIndex();
  const pl = cur.sq.map(r => { const p = pm.get(r[0]) || [r[0], 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], dm = r[1] - p[1]; if (dm <= 0) return null; const ra = r[5] - p[5];
    return { i: ix.get("s" + r[0]), mins: dm, g: r[2] - p[2], a: r[3] - p[3], rat: ra > 0 ? (r[4] - p[4]) / ra : NaN, xg: r[6] - p[6], kp: r[7] - p[7], def: r[8] - p[8], sh: r[9] - p[9], potm: r[10] - p[10] }; }).filter(Boolean)
    .sort((a, b) => (b.rat === b.rat ? b.rat : 0) - (a.rat === a.rat ? a.rat : 0));
  if (pl.length) {
    const rated = pl.filter(p => p.rat === p.rat), best = rated[0], worst = rated.length > 3 ? rated[rated.length - 1] : null;
    h += `<h4>Your players in ${esc(when)}</h4><p class="small">${best ? `Best: <b>${esc(SAVE.name[best.i] || "")}</b> (${best.rat.toFixed(2)})${worst ? `; lowest: <b>${esc(SAVE.name[worst.i] || "")}</b> (${worst.rat.toFixed(2)})` : ""}.` : ""}</p>
      <div class="tscroll"><table class="gtable narrow"><thead><tr><th>Player</th><th class="num">Rating</th><th class="num">Min</th><th class="num">G</th><th class="num">A</th><th class="num">xG</th><th class="num">Shots</th><th class="num">Key passes</th><th class="num">Tackles + int</th></tr></thead><tbody>
      ${pl.map(p => `<tr><td>${p.i != null ? `<button class="linkbtn" data-sci="${p.i}">${esc(SAVE.name[p.i])}</button>` : "?"}${p.potm > 0 ? ` <span class="tag">Player of the match</span>` : ""}</td><td class="num"><b class="${p.rat >= 7.3 ? "okc" : p.rat < 6.5 ? "bad" : ""}">${p.rat === p.rat ? p.rat.toFixed(2) : "–"}</b></td><td class="num">${Math.round(p.mins)}</td><td class="num">${p.g || ""}</td><td class="num">${p.a || ""}</td><td class="num">${p.xg ? p.xg.toFixed(2) : ""}</td><td class="num">${p.sh || ""}</td><td class="num">${p.kp || ""}</td><td class="num">${p.def || ""}</td></tr>`).join("")}</tbody></table></div>
      ${learnBox("Ratings here are FM's match ratings: 7.0 is a solid game, 7.5+ very good, under 6.5 poor. One game is a small sample — look for the same name low again and again before changing anything.", "sample")}`;
  }
  return h + `</section>`;
}
function mxResults(B) {
  const f = hubF(), comps = [...new Set(B.rows.map(x => x.comp))], cf = comps.includes(f.mxComp) ? f.mxComp : "";
  const rows = B.rows.filter(x => cf ? x.comp === cf : !x.friendly), rec = { W: 0, D: 0, L: 0 }; rows.forEach(x => rec[x.res]++);
  const gf = rows.reduce((s, x) => s + x.gf, 0), ga = rows.reduce((s, x) => s + x.ga, 0), pts = rec.W * 3 + rec.D;
  const t = mxTiming(B, B.me, !cf), tw = mxTimingWords(t);
  const D = B.D, lt = D.comp ? mxTable(B, D.comp.c) : [], mi = lt.findIndex(x => x.t === B.me);
  return `<section class="panel"><div class="ph"><h3>Results</h3><select class="hubin" data-f="mxComp"><option value="">All competitive</option>${comps.map(c => `<option ${c === cf ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
    <section class="tiles">${[["Played", rows.length], ["Won · drawn · lost", `${rec.W} · ${rec.D} · ${rec.L}`], ["Points / game", rows.length ? (pts / rows.length).toFixed(2) : "–"], ["Goals", `${gf} – ${ga}`], ["Form", rows.slice(-5).map(mxBadge).join("") || "–"]].map(([l, v]) => `<div class="tile"><span class="tv">${v}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>
    <div class="tscroll"><table class="gtable narrow mxlist"><thead><tr><th></th><th>Competition</th><th></th><th>Opponent</th><th class="num">Score</th><th>Your scorers</th></tr></thead><tbody>
    ${rows.slice().reverse().map(x => `<tr><td>${mxBadge(x)}</td><td class="small">${esc(x.comp)}</td><td class="small muted">${x.home ? "H" : "A"}</td><td>${esc(mxName(B, x.opp))}</td><td class="num"><b>${x.gf}–${x.ga}</b>${x.pens ? `<span class="small muted"> ${x.pens}</span>` : ""}</td><td class="small">${x.goals.filter(g => g.ours).map(g => `${esc((g.by || "?").split(" ").slice(-1)[0])} ${g.m}'${g.type === 2 ? " (p)" : g.type === 3 ? " (og)" : ""}`).join(", ")}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="panel"><div class="ph"><h3>When you score and concede</h3><span class="small muted">${t.games} games</span></div>${mxTimingHtml(t)}
      ${tw.length ? `<ul class="why">${tw.map(x => `<li>${x}</li>`).join("")}</ul>` : `<p class="small muted">No strong pattern yet: goals are spread through the game.</p>`}
      ${learnBox("Goals by 15-minute spell. A pile late on usually means tired legs or a team chasing the game; a pile early means a slow start. These patterns are where in-game management (subs, mentality changes) wins points.", "sample")}</section>
    ${lt.length ? `<section class="panel"><div class="ph"><h3>${esc(D.comp.name)}: form table</h3><span class="small muted">every team's last ${lt.n} league games</span></div><p class="small muted">Not the real table: your save keeps only the most recent matches of other clubs, so this ranks everyone on their last ${lt.n} games — who's in form right now.</p><div class="tscroll"><table class="gtable narrow"><thead><tr><th>#</th><th>Team</th><th class="num">P</th><th class="num">W</th><th class="num">D</th><th class="num">L</th><th class="num">GF</th><th class="num">GA</th><th class="num">GD</th><th class="num">Pts</th><th>Form</th></tr></thead><tbody>
      ${lt.map((x, i) => `<tr class="${x.t === B.me ? "mine" : ""}"><td>${i + 1}</td><td>${x.t === B.me ? "<b>" : ""}${esc(mxName(B, x.t))}${x.t === B.me ? "</b>" : ""}</td><td class="num">${x.p}</td><td class="num">${x.w}</td><td class="num">${x.d}</td><td class="num">${x.l}</td><td class="num">${x.gf}</td><td class="num">${x.ga}</td><td class="num">${x.gf - x.ga > 0 ? "+" : ""}${x.gf - x.ga}</td><td class="num"><b>${x.pts}</b></td><td>${x.form.slice(-5).map(r => `<span class="mxres ${r === "W" ? "w" : r === "L" ? "l" : "d"}">${r}</span>`).join("")}</td></tr>`).join("")}</tbody></table></div>${mi >= 0 ? "" : ""}</section>` : ""}`;
}
// ----- next opponent -----
const MX_OPP_M = ["goals", "xg", "xgshot", "shotpct", "ccc", "kp", "crs", "paspct", "pas", "prog", "drb", "plost", "tckpct", "int", "pwon", "hdrpct", "conc", "sotf", "savepct", "cs", "spr", "fouls"];
function mxOppTips(D, i, t) { // what to try against them, from where they rank
  const p = m => D.pct[m] ? D.pct[m][i] : null, v = m => D.val[m] ? D.val[m][i] : NaN, a = m => D.avg[m], f = (m) => hubFmt(m, v(m)), out = [];
  const add = (cond, what, why) => { if (cond) out.push([what, why]); };
  add(p("hdrpct") != null && p("hdrpct") < 30, "Cross more: <b>Final third: Hit Early Crosses</b>, <b>Crossing style: Whipped Crosses</b>, and a target forward", `they win only ${f("hdrpct")} of headers (league ${hubFmt("hdrpct", a("hdrpct"))})`);
  add(p("hdrpct") != null && p("hdrpct") > 75, "Keep it on the ground: <b>Crossing style: Low Crosses</b> or <b>Work Ball Into Box</b>", `they're strong in the air (${f("hdrpct")} of headers won)`);
  add(p("paspct") != null && (p("paspct") < 30 || (p("plost") != null && p("plost") < 25)), "Press them: <b>Line of engagement: High Press</b>, <b>Trigger press: More Often</b>", `they give the ball away (pass completion ${f("paspct")}, possession lost ${f("plost")} a game)`);
  add(p("paspct") != null && p("paspct") > 75 && p("pas") != null && p("pas") > 70, "Don't chase the ball: <b>Mid Block</b>, stay compact, <b>When the ball is won: Counter-Attack</b>", `they keep the ball well (${f("pas")} passes a game at ${f("paspct")})`);
  add(p("tckpct") != null && p("tckpct") < 30, "Run at them: <b>Dribbling: Encourage</b> for your wingers and forwards", `they win only ${f("tckpct")} of tackles`);
  add(p("savepct") != null && p("savepct") < 30, "Test the keeper: <b>Shots from distance: Encourage</b> for players with good Long Shots", `their keepers save only ${f("savepct")} of shots on target`);
  add(p("conc") != null && p("conc") < 25, "Go for it: a more <b>positive mentality</b> from the start", `they concede ${f("conc")} a game (league ${hubFmt("conc", a("conc"))})`);
  add(p("goals") != null && p("goals") > 75, "Respect their attack: <b>Defensive line: Standard or Lower</b>, a holding midfielder screening", `they score ${f("goals")} a game, one of the best`);
  add(p("crs") != null && p("crs") > 80, "Defend crosses: <b>Cross engagement: Stop Crosses</b> (or Invite Crosses if your centre-backs dominate in the air)", `they cross a lot (${f("crs")} a game)`);
  add(p("spr") != null && p("spr") > 80 && p("pwon") != null && p("pwon") > 70, "Play through them quickly: <b>Tempo: Higher</b>, <b>Pass Into Space</b> behind their press", `they press hard (${f("pwon")} possession won, ${f("spr")} sprints a game)`);
  add(p("fouls") != null && p("fouls") > 80, "Earn set pieces: <b>Play For Set Pieces</b> if you're good at them", `they foul a lot (${f("fouls")} a game)`);
  add(t && t.a.reduce((s, x) => s + x, 0) >= 6 && t.a[5] / t.a.reduce((s, x) => s + x, 0) >= 0.3, "Finish strong: keep attacking subs for 60–75'", `${Math.round(100 * t.a[5] / t.a.reduce((s, x) => s + x, 0))}% of the goals they concede come after 75'`);
  add(t && t.f.reduce((s, x) => s + x, 0) >= 6 && t.f[5] / t.f.reduce((s, x) => s + x, 0) >= 0.3, "Don't sit back late: fresh legs and keep your shape after 75'", `${Math.round(100 * t.f[5] / t.f.reduce((s, x) => s + x, 0))}% of their goals come after 75'`);
  return out;
}
function mxOpp(B) {
  const D = B.D, f = hubF(), lt = D.comp ? mxTable(B, D.comp.c) : [];
  const peers = D.teams.map((t, i) => ({ t: t.t, i })).filter(x => x.t !== B.me);
  if (!peers.length) return `<section class="panel"><p class="muted">No league opponents found in this save.</p></section>`;
  const met = new Map(); B.comp.forEach(x => met.set(x.opp, (met.get(x.opp) || 0) + 1));
  const pos = t => lt.findIndex(x => x.t === t);
  const guess = peers.slice().sort((a, b) => (met.get(a.t) || 0) - (met.get(b.t) || 0) || pos(a.t) - pos(b.t))[0];
  const cur = peers.find(x => x.t === +f.mxOpp) || guess, i = cur.i, T = D.teams[i], name = mxName(B, cur.t);
  const row = lt[pos(cur.t)], tm = mxTiming(B, cur.t, true), tw = mxTimingWords(tm, "They");
  const M = B.M, last = B.order.filter(r => (M.home[r] === cur.t || M.away[r] === cur.t) && M.hg[r] !== 255 && !mxFriendly(M.comps[M.comp[r]])).slice(-5).map(r => { const h = M.home[r] === cur.t, a = h ? M.hg[r] : M.ag[r], b = h ? M.ag[r] : M.hg[r]; return { res: a > b ? "W" : a < b ? "L" : "D", s: `${a}–${b}`, o: mxName(B, h ? M.away[r] : M.home[r]), h }; });
  const ms = MX_OPP_M.filter(m => HUB_M[m] && D.pct[m][i] != null), STY = ["crs", "pas", "spr", "fouls", "drb"];
  const q = ms.filter(m => !STY.includes(m)).sort((a, b) => D.pct[b][i] - D.pct[a][i]), strong = q.slice(0, 3).filter(m => D.pct[m][i] >= 60), weak = q.slice(-3).reverse().filter(m => D.pct[m][i] < 40);
  const met_ = m => `<li><b>${esc(HUB_M[m][0])}</b>${itip(m)} <span class="${hubCls(D.pct[m][i])}">${D.rank[m][i]}${["st", "nd", "rd"][((D.rank[m][i] + 90) % 100 - 10) % 10 - 1] || "th"} of ${D.n}</span> <span class="muted small">(${hubFmt(m, D.val[m][i])}, league ${hubFmt(m, D.avg[m])})</span></li>`;
  // danger men: their players with the most goals + assists this league season
  const st = SAVE.stats.league, danger = [];
  if (st) for (let p = 0; p < SAVE.n; p++) { if (SAVE.clubIdx[p] !== T.club || !(st.row[p] >= 0)) continue; const c = fl => { const a = st.cols[fl]; const v = a ? a[st.row[p]] : NaN; return v === v ? v : 0; };
    if (c("minutes") < 270) continue; danger.push({ p, ga: c("goals") + c("assists"), g: c("goals"), a: c("assists"), xg: c("expected_goals"), r: st.cols.average_rating ? st.cols.average_rating[st.row[p]] : NaN, min: c("minutes") }); }
  danger.sort((a, b) => b.ga - a.ga || b.xg - a.xg);
  const tips = mxOppTips(D, i, tm);
  return `<section class="panel"><div class="ph"><h3>Next opponent</h3><select class="hubin" data-f="mxOpp">${peers.slice().sort((a, b) => pos(a.t) - pos(b.t)).map(x => `<option value="${x.t}" ${x.t === cur.t ? "selected" : ""}>${esc(mxName(B, x.t))}</option>`).join("")}</select></div>
    <p class="small muted">Pick who you play next (Scout Lab can't read your fixture list yet).</p>
    <section class="tiles">${[["Form rank", row ? `${pos(cur.t) + 1}<small> of ${lt.length}</small>` : "–"], [`Points, last ${lt.n || "–"}`, row ? `${row.pts}<small> of ${row.p * 3}</small>` : "–"], ["League goals (season)", `${Math.round(T.v("goals"))} – ${Math.round(T.k("goals_allowed"))}<small> in ${T.g}</small>`], ["Last 5", last.map(mxBadge).join("") || "–"], ["Played them", `${met.get(cur.t) || 0}×`]].map(([l, v]) => `<div class="tile"><span class="tv">${v}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>
    ${last.length ? `<p class="small muted">${last.map(x => `${x.res} ${x.s} ${x.h ? "v" : "at"} ${esc(x.o)}`).join(" · ")}</p>` : ""}
    <div class="homesw"><div><h4 class="okc">Where they're strong</h4>${strong.length ? `<ul>${strong.map(met_).join("")}</ul>` : `<p class="small muted">Nothing stands out.</p>`}</div><div><h4 class="bad">Where they're weak</h4>${weak.length ? `<ul>${weak.map(met_).join("")}</ul>` : `<p class="small muted">No clear weakness.</p>`}</div></div></section>
    <section class="panel"><div class="ph"><h3>What to try against ${esc(name)}</h3><span class="small muted">from their numbers, not a guarantee</span></div>
      ${tips.length ? `<ul class="why">${tips.map(([w, y]) => `<li>${w} <span class="muted small">— ${y}.</span></li>`).join("")}</ul>` : `<p class="small muted">They're average almost everywhere: play your usual game.</p>`}
      ${learnBox("These come from where they rank in the league on each number. Only change one or two things for a match.", "pct")}</section>
    ${typeof mxOIHtml === "function" ? mxOIHtml(B, T, danger, D, i) : ""}
    ${danger.length ? `<section class="panel"><div class="ph"><h3>Danger men</h3><span class="small muted">most goals + assists in the league</span></div><div class="tscroll"><table class="gtable narrow"><thead><tr><th>Player</th><th>Pos</th><th class="num">G</th><th class="num">A</th><th class="num">xG</th><th class="num">Rating</th><th class="num">Min</th></tr></thead><tbody>
      ${danger.slice(0, 5).map(d => `<tr><td><button class="linkbtn" data-sci="${d.p}">${esc(SAVE.name[d.p])}</button></td><td class="small">${esc(savePos().str[d.p] || "")}</td><td class="num">${d.g}</td><td class="num">${d.a}</td><td class="num">${d.xg.toFixed(1)}</td><td class="num">${d.r === d.r ? d.r.toFixed(2) : "–"}</td><td class="num">${Math.round(d.min)}</td></tr>`).join("")}</tbody></table></div>
      <p class="small muted">Give the top one a tight marker: Opposition instructions › Tight marking (and Show onto weaker foot for a winger).</p></section>` : ""}
    <section class="panel"><div class="ph"><h3>When ${esc(name)} score and concede</h3><span class="small muted">their last ${tm.games} competitive games in the save</span></div>${mxTimingHtml(tm, "They")}${tw.length ? `<ul class="why">${tw.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}</section>`;
}
// ----- tactic changes: log what you changed, then compare the games before and after -----
const TLOG_KEY = "scoutlab-tlog";
function tlogAll() { try { return JSON.parse(localStorage.getItem(TLOG_KEY) || "[]"); } catch (e) { return S._tlog || []; } }
function tlogSave(l) { S._tlog = l; try { localStorage.setItem(TLOG_KEY, JSON.stringify(l)); } catch (e) { } }
function mxPeriod(B, from, to) { // competitive games [from, to) by index in your list
  const rows = B.comp.slice(from, to), n = rows.length, pts = rows.reduce((s, x) => s + (x.res === "W" ? 3 : x.res === "D" ? 1 : 0), 0);
  return { n, ppg: n ? pts / n : NaN, gf: n ? rows.reduce((s, x) => s + x.gf, 0) / n : NaN, ga: n ? rows.reduce((s, x) => s + x.ga, 0) / n : NaN, form: rows.map(x => x.res) };
}
function mxChanges(B) {
  const club = (SAVE.meta.managed && SAVE.meta.managed[0] && SAVE.meta.managed[0].club) || "", list = tlogAll().filter(x => x.club === club).sort((a, b) => a.n - b.n || a.gameDate.localeCompare(b.gameDate));
  const date = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const snaps = TSNAPS || []; if (!TSNAPS) tsnapList().then(() => { if (S.mode === "matches") render(); });
  const snapAt = n => n === 0 ? { tot: {}, n: 0 } : snaps.filter(s => s.club === club && s.n === n).pop() || null, now = mxNow();
  const row = (l, a, b, hi, dp) => { if (!(a === a) || !(b === b)) return ""; const d = b - a, good = hi ? d > 0.05 : d < -0.05, bad = hi ? d < -0.05 : d > 0.05;
    return `<tr><td>${esc(l)}</td><td class="num muted">${a.toFixed(dp)}</td><td class="num"><b>${b.toFixed(dp)}</b></td><td class="small ${good ? "okc" : bad ? "bad" : "muted"}">${good ? "better" : bad ? "worse" : "same"}</td></tr>`; };
  let h = `<section class="panel"><div class="ph"><h3>Tactic changes</h3><span class="small muted">did it work? before against after</span></div>
    <p class="small">Changed your tactic? Note it here <b>before your next game</b> (with this save loaded). Scout Lab compares every game after it with the games before.</p>
    <div class="addrow"><input id="tlogNote" placeholder="What did you change? e.g. High Press, wingers to Inside Forwards" style="flex:1;min-width:220px" maxlength="140"><button class="primary" data-mxact="tlog">Log change at ${esc(date(SAVE.meta.gameDate))}</button></div>
    <p class="small muted">${B.comp.length} competitive games played so far. Notes are kept in this browser.</p></section>`;
  if (!list.length) return h + `<section class="panel">${learnBox("Change <b>one or two things at a time</b> and give it at least 4–5 games: a single result says little. Points per game and goals tell you if it worked; xG and shots tell you if it will keep working (results catch up with xG).", "sample")}</section>`;
  list.forEach((c, k) => {
    const prevN = k ? list[k - 1].n : 0, nextN = k < list.length - 1 ? list[k + 1].n : B.comp.length;
    const before = mxPeriod(B, prevN, c.n), after = mxPeriod(B, c.n, nextN);
    const sA = snapAt(prevN), sB = snapAt(c.n), sC = k < list.length - 1 ? snapAt(nextN) : now;
    const per = (s1, s2, n, f) => s1 && s2 && n ? ((s2.tot[f] || 0) - (s1.tot[f] || 0)) / n : NaN;
    const verdict = after.n < 3 ? ["muted", `Too early: ${after.n} game${after.n === 1 ? "" : "s"} since. Give it 4–5.`] : after.ppg - before.ppg >= 0.3 ? ["okc", "Working: more points per game since."] : after.ppg - before.ppg <= -0.3 ? ["bad", "Not working so far: fewer points per game since."] : ["", "About the same results so far."];
    const xgB = per(sA, sB, before.n, "expected_goals"), xgA = per(sB, sC, after.n, "expected_goals");
    const xgNote = xgA === xgA && xgB === xgB && after.n >= 3 ? (xgA - xgB > 0.2 ? " Chances are up too (xG), so it should last." : xgA - xgB < -0.2 ? " But you're creating less (xG down): results may drop." : "") : "";
    h += `<section class="panel"><div class="ph"><h3>${esc(c.note || "Tactic change")}</h3><span class="small muted">${esc(date(c.gameDate))} · after game ${c.n} <button class="linkbtn small" data-tlogrm="${c.id}" title="Delete">✕</button></span></div>
      <p class="${verdict[0]}"><b>${verdict[1]}</b>${xgNote}</p>
      <div class="tscroll"><table class="gtable narrow"><thead><tr><th></th><th class="num">Before (${before.n})</th><th class="num">After (${after.n})</th><th></th></tr></thead><tbody>
      ${row("Points / game", before.ppg, after.ppg, 1, 2)}${row("Goals scored / game", before.gf, after.gf, 1, 2)}${row("Goals conceded / game", before.ga, after.ga, 0, 2)}
      ${row("xG / game", xgB, xgA, 1, 2)}${row("Shots / game", per(sA, sB, before.n, "shots"), per(sB, sC, after.n, "shots"), 1, 1)}${row("Shots on target faced / game", per(sA, sB, before.n, "gk_shots_on_target_faced"), per(sB, sC, after.n, "gk_shots_on_target_faced"), 0, 1)}
      </tbody></table></div><p class="small muted">Form before: ${before.form.slice(-6).join(" ") || "–"} · after: ${after.form.join(" ") || "–"}${(!sB && c.n) || (k < list.length - 1 && !sC) ? " · xG and shots need a save loaded on the day of each change" : ""}</p></section>`;
  });
  return h;
}
function renderMatches(main) {
  closeDrawer(true);
  if (!SAVE) { main.innerHTML = `<section class="panel"><h3>Matches</h3><p class="muted">Load your save to see every result, a review of your last game and a report on your next opponent.</p><button class="primary" data-act="datapage">Load your save</button></section>`; return; }
  const B = mxBase();
  if (!B) { main.innerHTML = `<section class="panel addpanel"><h3>Load your save once more</h3><p class="muted">Matches reads every score and goal in your save, which this stored copy of your save was read without.</p><button class="primary" data-act="datapage">Load your save</button></section>`; return; }
  const tab = MX_TABS.some(x => x[0] === S.mxTab) ? S.mxTab : "diag";
  if (!TSNAPS && DB.db) tsnapList().then(() => { if (S.mode === "matches") render(); });
  main.innerHTML = `<section class="homehead"><div><h2>Matches</h2><p class="muted">${esc(B.D.comp ? B.D.comp.name : "")} · ${B.comp.length} competitive games</p></div>${learnToggle()}</section>` +
    (tab === "diag" ? mxDiagnose(B) : tab === "last" ? mxLast(B) : tab === "results" ? mxResults(B) : tab === "opp" ? mxOpp(B) : mxChanges(B));
  renderSaveNote();
  if (S.sel != null && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true));
}
const mxTabsHtml = () => { const t = MX_TABS.some(x => x[0] === S.mxTab) ? S.mxTab : "diag"; return MX_TABS.map(([k, l]) => `<button class="ptab" data-mxtab="${k}" aria-selected="${!S.guide && !S.dataPage && k === t}">${l}</button>`).join(""); };
document.addEventListener("click", e => {
  const t = e.target.closest("[data-mxtab], [data-mxact], [data-tlogrm]"); if (!t) return;
  if (t.dataset.mxtab) { S.guide = false; S.dataPage = false; S.mode = "matches"; S.mxTab = t.dataset.mxtab; S.sel = null; S.adCtx = null; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.mxact === "tlog") { const B = mxBase(); if (!B) return; const inp = document.getElementById("tlogNote"), m = SAVE.meta.managed && SAVE.meta.managed[0];
    const l = tlogAll().filter(x => !(x.club === (m ? m.club : "") && x.n === B.comp.length)); l.push({ id: "t" + Date.now(), club: m ? m.club : "", gameDate: SAVE.meta.gameDate, n: B.comp.length, note: (inp && inp.value.trim()) || "Tactic change" }); tlogSave(l);
    tsnapTake().catch(() => { }).then(() => render()); return; }
  if (t.dataset.tlogrm) { tlogSave(tlogAll().filter(x => x.id !== t.dataset.tlogrm)); render(); }
});

