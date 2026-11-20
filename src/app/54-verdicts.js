// ---------- the answer first: one sentence at the top of the main pages, from what Home and each page already work out ----------
// My squad › Overview, Data Hub › Overview, Matches › Brief/Results, Scouting › Wonderkids/Targets, Staff › My staff
function verdictHtml() {
  if (!SAVE || S.guide || S.dataPage) return "";
  let t = null; try { t = verdictText(); } catch (e) { t = null; }
  return t ? `<p class="readbox verdict"><span class="small muted">In one line:</span> ${t}</p>` : "";
}
const VERDICT_WEAK = 70; // a position group under this (0-100 against the league) is a real weak spot
function verdictWeakSpot() { // weakest and strongest position you use, from Home's squad check
  const Q = typeof homeSquad === "function" ? homeSquad() : null; if (!Q || !Q.pos.length) return null;
  const w = Q.pos[0], b = Q.pos[Q.pos.length - 1], cat = w.weakest && CATS[w.weakest[0]] ? CATS[w.weakest[0]].l.toLowerCase() : null;
  return { w, b, cat, name: x => POS_MANY[x.P] || x.P };
}
function verdictText() {
  const m = S.mode;
  if (m === "squad" && S.spos === "Overview") {
    const v = verdictWeakSpot(); if (!v) return null;
    if (v.w.ov >= VERDICT_WEAK) return `<b>No weak spot:</b> every position group rates ${Math.round(v.w.ov)}/100 or better against the league. Lowest: ${esc(v.name(v.w))}${v.cat ? ` (weakest at ${esc(v.cat)})` : ""}; best: ${esc(v.name(v.b))} (${Math.round(v.b.ov)}).`;
    return `Weakest spot: <b>${esc(v.name(v.w))}</b> (${Math.round(v.w.ov)}/100${v.cat ? `, weakest at ${esc(v.cat)}` : ""}). Strongest: <b>${esc(v.name(v.b))}</b> (${Math.round(v.b.ov)}).${v.w.P !== v.b.P ? ` Strengthen the ${esc(v.name(v.w))} first: Scouting › Transfer targets.` : ""}`;
  }
  if (m === "hub" && (!S.hubTab || S.hubTab === "overview")) {
    const H = typeof homeTeam === "function" ? homeTeam() : null; if (!H) return null;
    const s = H.secs.filter(x => x.s != null).sort((a, b) => b.s - a.s); if (!s.length) return null;
    const top = s[0], bot = s[s.length - 1], wm = H.worst[0], rk = wm ? H.D.rank[wm][H.ti] : null;
    return `Best area: <b>${esc(top.l.toLowerCase())}</b> (${Math.round(top.s)}/100); weakest: <b>${esc(bot.l.toLowerCase())}</b> (${Math.round(bot.s)}/100).${wm && rk ? ` Biggest problem: <b>${esc(HUB_M[wm][0])}</b>, ${rk} of ${H.D.n} in the league.` : ""}`;
  }
  if (m === "matches" && (!S.mxTab || S.mxTab === "brief" || S.mxTab === "results")) {
    const B = typeof mxBase === "function" ? mxBase() : null; if (!B || !B.comp || !B.comp.length) return null;
    const last = B.comp.slice(-5), pts = last.reduce((t, x) => t + (x.res === "W" ? 3 : x.res === "D" ? 1 : 0), 0), nx = mxNextGame();
    const word = pts >= 12 ? "great" : pts >= 9 ? "good" : pts >= 6 ? "mixed" : "poor";
    return `Form is <b>${word}</b>: ${last.map(x => `<b class="${mxResCls(x.res)}">${x.res}</b>`).join(" ")} (${pts} points from the last ${last.length}).${nx ? ` Next: <b>${esc(nx.club >= 0 && SAVE.clubs[nx.club] ? SAVE.clubs[nx.club] : mxName(B, nx.team))}</b> on ${esc(new Date(nx.date + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short" }))}; the game plan is under Next opponent.` : ""}`;
  }
  if (m === "scout" && (!S.scTab || S.scTab === "kids" || S.scTab === "targets")) {
    const v = verdictWeakSpot(); if (!v) return null;
    if (v.w.ov >= VERDICT_WEAK) return `<b>No urgent need:</b> every position rates ${Math.round(v.w.ov)}/100 or better. If you buy, the ${esc(v.name(v.w))} are the lowest${v.cat ? ` (weakest at ${esc(v.cat)})` : ""}; otherwise look for young players to grow.`;
    return `Your weakest spot is <b>${esc(v.name(v.w))}</b>${v.cat ? ` (weakest at ${esc(v.cat)})` : ""}: look there first.${S.scTab === "targets" ? "" : " Transfer targets lists who would improve it."}`;
  }
  if (m === "staff" && (!S.stab || S.stab === "Mine") && typeof hasStaff === "function" && hasStaff()) {
    const K = staffKeyJobs().filter(k => k.best == null || k.pct != null).sort((a, b) => (a.pct ?? -1) - (b.pct ?? -1)), k = K[0]; if (!k) return null;
    const [vw] = staffVerdict(k.pct), fix = k.up != null ? k.up : k.fa;
    return `Biggest staff gap: <b>${esc(k.role)}</b> (${k.best != null ? `${esc(SAVE.staff.name[k.best])}, ${esc(vw.toLowerCase())}` : "nobody in the job"}).${fix != null ? ` Best fix: <b>${esc(SAVE.staff.name[fix])}</b> (${k.rat[fix].toFixed(1)}, ${esc(isFreeStaff(fix) ? "free agent" : sClub(fix))}).` : ""}`;
  }
  return null;
}
