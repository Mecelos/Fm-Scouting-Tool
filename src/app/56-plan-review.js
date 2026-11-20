// ---------- Matches > Did the game plan work? ----------
// Each time a save is loaded before a game, the game plan for it (how they build, our approach, opposition instructions)
// is kept in this browser. When a later save holds that match, it is checked: the result, and whether the players
// we were told to mark or press still scored or set up a goal.
const PLAN_KEY = "scoutlab-plans", PLAN_MAX = 40;
function planAll() { try { const v = JSON.parse(localStorage.getItem(PLAN_KEY) || "[]"); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function planSave(l) { try { localStorage.setItem(PLAN_KEY, JSON.stringify(l.slice(-PLAN_MAX))); } catch (e) { } }
function planTake() {
  if (!SAVE || typeof mxNextGame !== "function") return;
  const B = mxBase(), n = mxNextGame(); if (!B || !n) return;
  const O = typeof olData === "function" ? olData(B, n.team) : null; if (!O || O.xi.length < 10) return;
  const m = SAVE.meta.managed && SAVE.meta.managed[0], club = m ? m.club : "";
  const b = gpBuild(O.xi), ois = gpOIs(O.xi).map(([x, w]) => [x.n, w]);
  const after = B.rows.length ? Math.max(...B.rows.map(x => B.M.id[x.r])) : 0;
  const plan = { club, opp: n.team, oppName: n.club >= 0 && SAVE.clubs[n.club] ? SAVE.clubs[n.club] : mxName(B, n.team), date: n.date, after,
    build: b.three ? "Back 3" : b.two ? "Back 2" : "Back 4", approach: b.three ? "Mid block and counter" : "Press high", ois };
  planSave(planAll().filter(x => !(x.club === club && x.opp === plan.opp && x.date === plan.date)).concat([plan]));
}
function planReviewHtml(B) {
  const m = SAVE.meta.managed && SAVE.meta.managed[0], club = m ? m.club : "", M = B.M;
  const done = planAll().filter(p => p.club === club).map(p => {
    const g = B.rows.filter(x => x.opp === p.opp && M.id[x.r] > p.after).sort((a, b) => M.id[a.r] - M.id[b.r])[0];
    if (!g) return null;
    const names = new Set(p.ois.map(o => o[0])), hurt = [];
    g.goals.filter(x => !x.ours).forEach(x => { if (names.has(x.by)) hurt.push(`${x.by} scored`); if (x.as && names.has(x.as)) hurt.push(`${x.as} set one up`); });
    const verdict = g.res === "W" && !hurt.length ? ["Worked", "good"] : g.res === "L" ? ["Didn't work", "bad"] : hurt.length ? ["Partly", "warn"] : ["Held up", ""];
    return { p, g, hurt, verdict };
  }).filter(Boolean).reverse();
  const head = `<section class="panel"><div class="ph"><h3>Did the game plan work?</h3><span class="small muted">games after Scout Lab gave you a plan (kept in this browser)</span></div>`;
  if (!done.length) return head + `<p class="small muted">Nothing to check yet. Load your save before a game (the plan is kept), play it, then load the later save: the result and whether the players you marked or pressed still hurt you appear here.</p></section>`;
  const W = done.filter(x => x.g.res === "W").length, D = done.filter(x => x.g.res === "D").length, L = done.filter(x => x.g.res === "L").length, hurtN = done.filter(x => x.hurt.length).length;
  const sum = `<p class="readbox">After ${done.length} plan${done.length > 1 ? "s" : ""}: <b>W${W} D${D} L${L}</b>. The players given opposition instructions scored or set up a goal in ${hurtN} of ${done.length} game${done.length > 1 ? "s" : ""}.${done.length >= 3 && hurtN / done.length >= 0.5 ? " The instructions aren't stopping them often enough: check they were set, and try Tight marking instead of pressing on their best attacker." : ""}</p>`;
  return head + sum + `<div class="tscroll"><table class="gtable"><thead><tr><th>Game</th><th>Result</th><th>The plan</th><th>Players targeted</th><th>Verdict</th></tr></thead><tbody>${done.slice(0, 12).map(({ p, g, hurt, verdict }) =>
    `<tr><td>${g.home ? "v" : "at"} ${esc(p.oppName)} <span class="small muted">${esc(g.comp)}</span></td><td><b class="${mxResCls(g.res)}">${g.res} ${g.gf}–${g.ga}</b></td><td class="small">${esc(p.build)} → ${esc(p.approach.toLowerCase())}</td>
     <td class="small">${p.ois.length ? p.ois.map(([n, w]) => `${esc(n)} <span class="muted">(${esc(w.toLowerCase())})</span>`).join(", ") : "–"}${hurt.length ? `<br><span class="bad">${hurt.map(esc).join("; ")}</span>` : ""}</td><td><span class="tag ${verdict[1]}">${verdict[0]}</span></td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">Scout Lab can't see whether you actually set the instructions in FM, so read this as "games where you had the plan".</p></section>`;
}
