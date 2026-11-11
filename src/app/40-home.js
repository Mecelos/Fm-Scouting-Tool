// ---------- Home: your club on one page, in plain English, with a way into every detail ----------
// 1 How are we doing (Data Hub section scores)  2 Who's playing well / struggling (Season review grades)
// 3 Where to strengthen (weakest positions + targets)  4 Needs your attention (contracts, loans, shortlist)  5 Learn
function ring(v, size = 64, label = "", cls = "") { // 0-100 ring gauge
  const r = size / 2 - 5, c = 2 * Math.PI * r, p = v == null || !(v === v) ? 0 : Math.max(0, Math.min(100, v)), col = p >= 60 ? "var(--good)" : p >= 40 ? "var(--ink2)" : p >= 20 ? "var(--accent)" : "var(--bad)";
  return `<svg class="ring ${cls}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" style="width:${size}px;height:${size}px;flex:0 0 auto" role="img" aria-label="${esc(label)} ${v == null ? "no data" : Math.round(p)}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ringbg"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ringfg" style="stroke:${col}" stroke-dasharray="${(c * p / 100).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" class="ringv">${v == null || !(v === v) ? "–" : Math.round(p)}</text></svg>`;
}
const HOME_SEC = [["attack", "Attacking", "scoring and shooting"], ["create", "Creating", "making chances"], ["progress", "Progressing", "moving the ball"], ["defend", "Defending", "stopping goals"], ["intensity", "Pressing", "winning it back"]];
function homeTeam() {
  if (!SAVE || !SAVE.teams || !SAVE.matches || typeof hubData !== "function") return null;
  const f = hubF(), keep = [f.team, f.cmp]; f.team = ""; f.cmp = "";
  let D; try { D = hubData(); } finally { f.team = keep[0]; f.cmp = keep[1]; }
  if (!D || !D.teams.length) return null;
  const ti = D.teams.findIndex(t => t.mine); if (ti < 0) return null;
  const secs = HOME_SEC.map(([k, l, w]) => ({ k, l, w, s: hubSecScore(D, HUB_SEC[k].m, ti) }));
  // headline metrics: the best and worst ranked
  // quality stats only: volume stats like crosses or tackles describe a style, not how good you are
  const HEAD = ["goals", "xg", "npxg", "xgshot", "shotpct", "xa", "ccc", "kp", "paspct", "prog", "drb", "plost", "tckpct", "int", "pwon", "conc", "sotf", "savepct", "xgp", "hdrpct", "spr", "crspct"];
  const ms = HEAD.filter(m => HUB_M[m] && D.pct[m][ti] != null);
  const byP = ms.slice().sort((a, b) => D.pct[b][ti] - D.pct[a][ti]);
  return { D, ti, T: D.teams[ti], secs, best: byP.slice(0, 3), worst: byP.slice(-3).reverse() };
}
function homeSquad() {
  if (!SAVE || typeof squadEval !== "function") return null;
  const key = [SAVE.id, S.saveKind, S.league].join("|"); if (SAVE._home && SAVE._home.key === key) return SAVE._home;
  const minM = rvMinMins(), players = [], pos = [];
  POSITIONS.forEach(P => {
    const keep = S.minMins; S.minMins = minM; let e; try { e = squadEval(P); } catch (x) { e = null; } finally { S.minMins = keep; }
    if (!e || !e.st) return;
    const cats = rvCatsOf(e); if (!cats.length) return;
    const mine = e.mine.filter(r => r.sr && r.sr.cs && (r.p.mins || 0) >= minM && (rvMain(r.p) || P) === P).sort((a, b) => (b.p.mins || 0) - (a.p.mins || 0));
    if (!mine.length) return;
    mine.forEach(r => players.push({ r, e, cats, pos: P, ov: r.sr.orank, mins: r.p.mins || 0 }));
    const n = (scNeeds().need || {})[P] || 1, st = mine.slice(0, n), ov = mean(st.map(r => r.sr.orank).filter(x => x != null));
    const avg = c => { const v = st.map(r => r.sr.cs[c]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const weakest = cats.map(c => [c, avg(c)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1])[0];
    pos.push({ P, ov, starters: st, weakest });
  });
  const maxM = Math.max(1, ...players.map(x => x.mins)), reg = players.filter(x => x.mins >= maxM * 0.35 && x.ov != null);
  const top = reg.filter(x => x.ov >= 55).sort((a, b) => b.ov - a.ov).slice(0, 4), low = reg.filter(x => x.ov < 45).sort((a, b) => a.ov - b.ov).slice(0, 4);
  // positions you actually use: the starters there are regulars
  const used = pos.filter(x => x.ov != null && x.starters.some(r => (r.p.mins || 0) >= maxM * 0.35));
  return (SAVE._home = { key, players, pos: used.sort((a, b) => a.ov - b.ov), top, low, minM });
}
function homeWhy(x, good) { // the category that explains the grade, in words
  const cs = x.cats.map(c => [c, x.r.sr.cs[c]]).filter(y => y[1] != null).sort((a, b) => good ? b[1] - a[1] : a[1] - b[1]);
  const words = cs.slice(0, 2).map(([c, v]) => `${CATS[c].l.toLowerCase()} (${Math.round(v)})`);
  return words.length ? (good ? "Best at " : "Weakest at ") + words.join(" and ") : "";
}
function homeContracts() {
  if (!SAVE || !scHasC()) return [];
  return saveManagedIdx().filter(i => SAVE.cEnd[i] && !SAVE.cLoan[i]).map(i => ({ i, m: scMonths(SAVE.cEnd[i]) })).filter(x => x.m != null && x.m <= 12 && x.m > -1)
    .sort((a, b) => (SAVE.ca[b.i] || 0) - (SAVE.ca[a.i] || 0)).slice(0, 5);
}
// ----- this week's action plan: the three things most worth doing, each with the reason and a way in -----
function homeActions(H, Q, Cn) {
  const out = [], add = (pri, what, why, btn) => out.push({ pri, what, why, btn });
  const B = typeof mxBase === "function" ? mxBase() : null;
  if (H) { const bot = H.secs.filter(s => s.s != null).sort((a, b) => a.s - b.s)[0], wm = H.worst[0];
    if (bot && bot.s < 40) add(90 - bot.s, `Fix your ${bot.l.toLowerCase()}`, `${bot.l} is your weakest area (${Math.round(bot.s)}/100)${wm ? `; worst number: ${HUB_M[wm][0].toLowerCase()}, ${H.D.rank[wm][H.ti]} of ${H.D.n} in the league` : ""}.`, `<button class="ghost small" data-hubtab="${bot.k}">See why</button>`); }
  if (B) { const t = mxTiming(B, B.me, true), sa = t.a.reduce((s, x) => s + x, 0), fr = B.comp.slice(-5), pts = fr.reduce((s, x) => s + (x.res === "W" ? 3 : x.res === "D" ? 1 : 0), 0);
    if (sa >= 6 && t.a[5] / sa >= 0.3) add(70, "Manage the last 15 minutes", `${Math.round(100 * t.a[5] / sa)}% of the goals you concede come after 75'. Make subs earlier and drop deeper when ahead late.`, `<button class="ghost small" data-mxtab="results">Goal timing</button>`);
    if (fr.length >= 5 && pts <= 4) add(75, "Turn your form around", `${pts} points from your last 5 (${fr.map(x => x.res).join(" ")}). Check what changed and change one thing, not five.`, `<button class="ghost small" data-mxtab="diag">Diagnose</button>`);
    add(45, "Check what's not working", "Player, role or system? One verdict per regular, and whether the tactic is creating more than it allows.", `<button class="ghost small" data-mxtab="diag">Diagnose</button>`);
    add(40, "Prepare for your next opponent", "Their strengths, weaknesses, danger men and what to try against them.", `<button class="ghost small" data-mxtab="opp">Opponent report</button>`); }
  if (Q && Q.low.length) { const x = Q.low[0]; add(65 - x.ov / 2, `Sort out ${x.r.p.name}`, `A regular, but rated ${Math.round(x.ov)}/100 as a ${((typeof POS_ONE !== "undefined" && POS_ONE[x.pos]) || x.pos).toLowerCase()}. ${homeWhy(x, false)}. Try another role first; if that doesn't help, he's a target to replace.`, `<button class="ghost small" data-sci="${saveUidIndex().get(x.r.p.uid)}">Open him</button>`); }
  if (Q && Q.pos.length && Q.pos[0].ov < 45) { const x = Q.pos[0]; add(60 - x.ov / 3, `Strengthen ${(PL_LABEL[x.P] || x.P).toLowerCase()}`, `Your weakest position (${Math.round(x.ov)}/100): ${x.starters.map(r => r.p.name).join(", ")}.`, `<button class="ghost small" data-sctab="targets">Find targets</button>`); }
  const soon = Cn.filter(x => x.m <= 6); if (soon.length) add(55, `Renew ${SAVE.name[soon[0].i]}`, `His contract ends ${sDateTxt(SAVE.cEnd[soon[0].i])}${soon.length > 1 ? `, and ${soon.length - 1} more within 6 months` : ""}. Renew or sell before he can leave for free.`, `<button class="ghost small" data-sctab="contracts">Contracts</button>`);
  return out.sort((a, b) => b.pri - a.pri).slice(0, 3);
}
// ----- ask a question: Claude answers from a summary of your save (only on the claude.ai link) -----
const ASK = { text: "", err: "", busy: false, q: "", ctl: null, avail: null };
function askContext() {
  const m = SAVE.meta.managed && SAVE.meta.managed[0], H = homeTeam(), Q = homeSquad(), B = typeof mxBase === "function" ? mxBase() : null, L = [];
  L.push(`Club: ${m ? m.club : "?"}. In-game date: ${SAVE.meta.gameDate}. Game: ${SAVE.meta.game}.`);
  if (H) { L.push(`League: ${H.D.comp.name}, ${H.D.n} teams, ${H.T.g} league games played.`);
    L.push("Team section scores vs the league (0-100, 50 = average): " + H.secs.map(s => `${s.l} ${s.s == null ? "?" : Math.round(s.s)}`).join(", ") + ".");
    const all = Object.keys(HUB_M).filter(k => H.D.val[k] && H.D.val[k][H.ti] === H.D.val[k][H.ti] && H.D.rank[k][H.ti] != null);
    L.push("Team numbers (value, league rank of " + H.D.n + ", league average): " + all.map(k => `${HUB_M[k][0]} ${hubFmt(k, H.D.val[k][H.ti])} (${H.D.rank[k][H.ti]}, avg ${hubFmt(k, H.D.avg[k])})`).join("; ") + "."); }
  if (B) { const lt = B.D.comp ? mxTable(B, B.D.comp.c) : [], pos = lt.findIndex(x => x.t === B.me);
    const mine = B.comp.filter(x => x.comp === (B.D.comp && B.D.comp.name)), pts = mine.reduce((s, x) => s + (x.res === "W" ? 3 : x.res === "D" ? 1 : 0), 0);
    L.push(`League record: ${pts} points from ${mine.length} games (W${mine.filter(x => x.res === "W").length} D${mine.filter(x => x.res === "D").length} L${mine.filter(x => x.res === "L").length}, goals ${mine.reduce((s, x) => s + x.gf, 0)}-${mine.reduce((s, x) => s + x.ga, 0)}).${pos >= 0 ? ` Form table over everyone's last ${lt.n} league games: ${pos + 1} of ${lt.length}.` : ""}`);
    L.push("Recent results (oldest first): " + B.comp.slice(-8).map(x => `${x.res} ${x.gf}-${x.ga} ${x.home ? "v" : "at"} ${mxName(B, x.opp)} (${x.comp})`).join("; ") + ".");
    const t = mxTiming(B, B.me, true); L.push("Goals scored by 15-minute spell: " + t.f.join("/") + "; conceded: " + t.a.join("/") + "."); }
  if (Q) { L.push("Squad, players with enough minutes, graded 0-100 against their position this season: " + Q.players.filter(x => x.ov != null).sort((a, b) => b.mins - a.mins).slice(0, 22).map(x => `${x.r.p.name} (${PL_LABEL[x.pos] || x.pos}, ${Math.round(x.ov)}, ${Math.round(x.mins)} min, age ${x.r.p.age || "?"})`).join("; ") + ".");
    L.push("Weakest positions: " + Q.pos.slice(0, 3).map(x => `${PL_LABEL[x.P] || x.P} ${Math.round(x.ov)}`).join(", ") + "."); }
  if (S.myTac && S.myTac.file) { try { const W = tacWorking(); if (W) L.push(`Current tactic: ${W.name || ""} (${W.style || ""}), mentality ${W.mentality || "?"}; roles in possession / out of possession: ${W.slots.map(x => `${x.ip.code || ""} ${x.ip.role || "?"} / ${x.oop.code || ""} ${x.oop.role || "?"}`).join(", ")}; team instructions changed from default: ${TI_DEF.filter(d => W.ti[d[0]] != null && W.ti[d[0]] !== d[4]).map(d => `${d[1]}: ${W.ti[d[0]]}`).join(", ") || "none"}.`); } catch (e) { } }
  return L.join("\n");
}
async function askAvail() {
  if (ASK.avail != null) return ASK.avail;
  if (!window.claude || typeof window.claude.use !== "function") return (ASK.avail = false);
  try { ASK.fn = await window.claude.use("sample"); } catch (e) { ASK.fn = null; }
  return (ASK.avail = !!ASK.fn);
}
function askHtml() {
  const off = ASK.avail === false;
  return `<section class="panel askpanel"><div class="ph"><h3>Ask a question</h3><span class="small muted">answered by Claude from your save's numbers</span></div>
    ${off ? `<p class="small muted">This works on the claude.ai link of Scout Lab (it uses your Claude account). The downloaded copy can't reach Claude: open the link to ask.</p>` : `
    <div class="askrow"><textarea id="askQ" rows="2" maxlength="600" placeholder="e.g. Why do we concede so many late goals? Which role should my left winger play? Who should I sell?">${esc(ASK.q)}</textarea>
    <div class="askbtns"><button class="primary" data-askact="go" ${ASK.busy ? "disabled" : ""}>${ASK.busy ? "Thinking…" : "Ask"}</button>${ASK.busy ? `<button class="ghost small" data-askact="stop">Stop</button>` : ""}</div></div>
    <div class="askchips">${["What's our biggest weakness and how do I fix it?", "Who should I sell or replace?", "Why are we conceding goals?", "What should I change in my tactic?"].map(q => `<button class="fit" data-askq="${esc(q)}">${esc(q)}</button>`).join("")}</div>
    ${ASK.err ? `<p class="err small">${esc(ASK.err)}</p>` : ""}<div id="askOut" class="askout">${ASK.text ? askFmt(ASK.text) : ""}</div>
    <p class="small muted">Claude sees a summary of your team, results, squad grades and tactic — not the whole save. It uses your own Claude usage.</p>`}</section>`;
}
function askFmt(t) { // light markdown: bold, bullets, line breaks
  return esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").split(/\n/).map(l => /^\s*[-•*] /.test(l) ? `<li>${l.replace(/^\s*[-•*] /, "")}</li>` : l.trim() ? `<p>${l}</p>` : "").join("").replace(/(<li>.*?<\/li>)+/g, x => `<ul>${x}</ul>`);
}
async function askRun() {
  const q = (document.getElementById("askQ") || {}).value || ASK.q; ASK.q = q.trim(); if (!ASK.q || ASK.busy) return;
  if (!(await askAvail())) { render(); return; }
  ASK.busy = true; ASK.err = ""; ASK.text = ""; render();
  const ctl = ASK.ctl = new AbortController();
  const prompt = `You are a Football Manager 27 assistant inside "Scout Lab", a tool that reads the user's FM27 save. The user is new to analytics: answer in plain English, short, as bullet points, with concrete FM27 actions (tactic instructions by their FM27 names, roles, subs, transfers). FM27 rules: players have roles in and out of possession, there are no duties; never suggest a Half-Space Forward; a central midfielder (MC) can't be a Box-to-Box Midfielder or Box-to-Box Playmaker. Use only the data below; if it doesn't answer the question, say what's missing. Finish with a one-line summary of what to change.\n\nDATA FROM THE SAVE\n${askContext()}\n\nQUESTION\n${ASK.q}`;
  try {
    const r = await ASK.fn(prompt, { signal: ctl.signal, cache: false, onText: ({ text }) => { ASK.text = text; const o = document.getElementById("askOut"); if (o) o.innerHTML = askFmt(text); } });
    ASK.text = r.text;
  } catch (e) {
    ASK.text = (e && e.text) || ASK.text;
    ASK.err = e && e.code === "not_granted" ? "Claude wasn't allowed for this page. Allow it when asked to use the Ask box." : e && e.code === "rate_limited" ? "Too many questions at once: wait a minute and try again." : e && e.code === "aborted" ? "" : "Claude couldn't answer: " + ((e && (e.message || e.code)) || e);
    if (e && e.code === "not_granted") ASK.avail = false;
  } finally { ASK.busy = false; ASK.ctl = null; if (S.mode === "home") { const y = window.scrollY; render(); window.scrollTo(0, y); } }
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-askact], [data-askq]"); if (!t) return;
  if (t.dataset.askq) { const a = document.getElementById("askQ"); if (a) a.value = t.dataset.askq; ASK.q = t.dataset.askq; askRun(); return; }
  if (t.dataset.askact === "go") askRun(); else if (t.dataset.askact === "stop" && ASK.ctl) ASK.ctl.abort();
});
document.addEventListener("input", e => { if (e.target && e.target.id === "askQ") ASK.q = e.target.value; });
function renderHome(main) {
  closeDrawer(true);
  if (!SAVE) {
    main.innerHTML = `<section class="panel homehero"><h2>Welcome to Scout Lab</h2><p>Load your FM27 save and this page becomes a one-page report on your club: how the team is doing, who's playing well, where to strengthen and what needs your attention — in plain English, with the detail one tap away.</p>
      <p><button class="primary" data-act="datapage">Load your save</button> <button class="ghost" data-mode="learn">Learn the basics first</button></p></section>${learnBox("New to analytics? Start with <b>Analytics basics</b>: ten short lessons on the few ideas behind every number here.", "pct")}`;
    renderSaveNote(); return;
  }
  const m = SAVE.meta.managed && SAVE.meta.managed[0], H = homeTeam(), Q = homeSquad(), Cn = homeContracts();
  const date = SAVE.meta.gameDate ? new Date(SAVE.meta.gameDate + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  let h = `<section class="homehead"><div><h2>${esc(m ? m.club : "Your club")}</h2><p class="muted">${H ? esc(H.D.comp.name) + " · " + H.T.g + " league games · " : ""}${esc(date)}</p></div>${learnToggle()}</section>`;
  const acts = homeActions(H, Q, Cn);
  if (acts.length) h += `<section class="panel homeplan"><div class="ph"><h3>Your action plan</h3><span class="small muted">the ${acts.length === 1 ? "thing" : acts.length + " things"} most worth doing now</span></div><ol class="planlist">${acts.map(a => `<li><div><b>${esc(a.what)}</b><span class="small">${esc(a.why)}</span></div>${a.btn}</li>`).join("")}</ol></section>`;
  // 1 how are we doing
  if (H) {
    const best = H.secs.filter(s => s.s != null).sort((a, b) => b.s - a.s), top = best[0], bot = best[best.length - 1];
    const line = top && bot ? `Your best area is <b>${esc(top.l.toLowerCase())}</b> (${esc(top.w)}); your weakest is <b>${esc(bot.l.toLowerCase())}</b> (${esc(bot.w)}).` : "";
    const met = (m, cls) => `<li><b>${esc(HUB_M[m][0])}</b>${itip(m)} <span class="${cls}">${H.D.rank[m][H.ti]}${["st", "nd", "rd"][((H.D.rank[m][H.ti] + 90) % 100 - 10) % 10 - 1] || "th"} of ${H.D.n}</span> <span class="muted small">(${hubFmt(m, H.D.val[m][H.ti])}, league ${hubFmt(m, H.D.avg[m])})</span></li>`;
    h += `<section class="panel"><div class="ph"><h3>How are we doing?</h3><button class="linkbtn small" data-hubtab="overview">Open the Data Hub →</button></div>
      <p class="homeline">${line}</p>
      <div class="homerings">${H.secs.map(s => `<button class="homering" data-hubtab="${s.k}">${ring(s.s, 74, s.l)}<b>${esc(s.l)}</b><span class="small ${hubCls(s.s)}">${s.s == null ? "–" : hubWord(s.s)}</span></button>`).join("")}</div>
      ${learnBox(`Each ring is a <b>score out of 100</b> against the other ${H.D.n} teams in your league: 50 = average, 80+ = one of the best, under 30 = one of the worst. Tap a ring to see what's behind it.`, "pct")}
      <div class="homesw"><div><h4 class="okc">Doing well</h4><ul>${H.best.map(m => met(m, "okc")).join("")}</ul></div><div><h4 class="bad">Needs work</h4><ul>${H.worst.map(m => met(m, "bad")).join("")}</ul></div></div></section>`;
  } else h += `<section class="panel"><h3>How are we doing?</h3><p class="muted">Load your save once more to see your team against the league (Data Hub).</p></section>`;
  // 2 players
  if (Q && (Q.top.length || Q.low.length)) {
    const card = (x, good) => `<button class="homep" data-sci="${saveUidIndex().get(x.r.p.uid)}">${ring(x.ov, 52, x.r.p.name)}<span><b>${esc(x.r.p.name)}</b><span class="small muted">${esc(PL_LABEL[x.pos] || x.pos)} · ${Math.round(x.mins).toLocaleString()} min</span><span class="small">${esc(homeWhy(x, good))}</span></span></button>`;
    h += `<section class="homegrid2"><div class="panel"><div class="ph"><h3>Playing well</h3><button class="linkbtn small" data-spos="Review" data-mode2="squad">Season review →</button></div>${Q.top.map(x => card(x, true)).join("")}</div>
      <div class="panel"><div class="ph"><h3>Struggling</h3><span class="small muted">regulars rated under 45</span></div>${Q.low.length ? Q.low.map(x => card(x, false)).join("") : `<p class="small muted">Nobody: every regular is at least average for his position.</p>`}</div></section>
      ${learnBox(`The number is how a player's stats this season rank against every player in his position (0–100). It only counts players with ${Q.minM}+ minutes, so a few bad games don't count. Low numbers can mean the wrong role as much as the wrong player — open him and try another role.`, "sample")}`;
  }
  // 3 where to strengthen
  if (Q && Q.pos.length) {
    h += `<section class="panel"><div class="ph"><h3>Where to strengthen</h3><span class="small muted">your weakest positions this season</span></div><div class="homestr">${Q.pos.filter(x => x.ov < 62).slice(0, 3).map(x => `<div class="homes">${ring(x.ov, 58, x.P)}<div><b>${esc(PL_LABEL[x.P] || x.P)}</b><span class="small">${x.starters.map(r => esc(r.p.name)).join(", ")}</span>${x.weakest ? `<span class="small muted">weakest: ${esc(CATS[x.weakest[0]].l.toLowerCase())}</span>` : ""}
      <span class="homebtns"><button class="ghost small" data-spos="Review" data-mode2="squad">Review</button><button class="ghost small" data-sctab="targets">Find targets</button></span></div></div>`).join("")}</div>
      ${learnBox("Ranked by your regular starters' grade in that position. Before buying, check the review: if a player is weak in only one area, a different role may fix it for free.")}</section>`;
  }
  // 4 attention
  const loans = SAVE.cLoan ? saveManagedIdx().filter(i => SAVE.cLoan[i]).length : 0;
  h += `<section class="panel"><div class="ph"><h3>Needs your attention</h3></div><div class="homeatt">
    <div><h4>Contracts ending within a year</h4>${Cn.length ? `<ul>${Cn.map(x => `<li><button class="linkbtn" data-sci="${x.i}">${esc(SAVE.name[x.i])}</button> <span class="small muted">CA ${SAVE.ca[x.i] || "–"} · ${esc(sDateTxt(SAVE.cEnd[x.i]))}</span></li>`).join("")}</ul><button class="linkbtn small" data-sctab="contracts">All contracts →</button>` : `<p class="small muted">None of your players' contracts end in the next 12 months.</p>`}</div>
    <div><h4>Shortlist</h4><p class="small">${SL.length ? `${SL.length} player${SL.length > 1 ? "s" : ""} you're watching.` : "Empty: tap ☆ Add to shortlist on any player."}</p><button class="linkbtn small" data-sctab="short">Open shortlist →</button>${loans ? `<h4>Out on loan</h4><p class="small">${loans} player${loans > 1 ? "s" : ""}. <button class="linkbtn small" data-spos="Planner" data-mode2="squad">Loan watch →</button></p>` : ""}</div>
    <div><h4>Find players</h4><p class="small"><button class="linkbtn" data-sctab="kids">Wonderkids</button> · <button class="linkbtn" data-sctab="targets">Transfer targets</button> · <button class="linkbtn" data-mode="stats">Search by stats</button></p></div></div></section>`;
  if (ASK.avail == null) askAvail().then(() => { if (S.mode === "home") { const y = window.scrollY; render(); window.scrollTo(0, y); } });
  h += askHtml();
  // 5 learn
  const tips = Object.keys(GLOSS), tk = tips[Math.floor(Date.now() / 864e5) % tips.length], tg = GLOSS[tk];
  h += `<section class="panel homelearn"><div class="ph"><h3>Learn one thing</h3><button class="linkbtn small" data-mode="learn">Analytics basics →</button></div><p><b>${esc(tg.t)}.</b> ${esc(tg.d)}</p><p class="small"><b>In FM:</b> ${esc(tg.fm)}</p></section>`;
  main.innerHTML = h; renderSaveNote();
  if (S.sel != null && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true));
}

