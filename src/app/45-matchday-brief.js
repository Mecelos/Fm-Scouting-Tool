// ---------- Matches > Brief: your next game on one narrow page (for a phone or a window beside FM) ----------
// Everything here comes from the Next opponent calculations (mxOppPick, mxOppData, mxOppTips, mxOI), so the two pages always agree.
const MX_BRIEF_M = ["goals", "xg", "sotf", "paspct", "hdrpct", "pwon"];
function mxBrief(B) {
  const P = mxOppPick(B), next = P.next;
  if (P.noData) return `<section class="panel mxbrief"><div class="ph"><h3>Matchday brief</h3></div><p>Your next game: <b>${esc(mxClubName(B, next.team, next.club))}</b>, ${esc(mxDay(next.date))}.</p>
    <p class="small muted">Little data: your save has no stats for them, so there's no brief. <button class="linkbtn" data-mxtab="opp">Pick another team in Next opponent</button>.</p></section>`;
  const od = P.pick != null ? mxOppData(B, P.pick) : null;
  if (!od) return `<section class="panel mxbrief"><div class="ph"><h3>Matchday brief</h3></div><p class="muted">No opponent found in this save yet. <button class="linkbtn" data-mxtab="opp">Open Next opponent</button> to pick one.</p></section>`;
  const D = od.D, i = od.i, T = D.teams[i], me = D.teams.findIndex(x => x.mine), name = mxName(B, P.pick), isNext = next && next.team === P.pick;
  const mine5 = B.comp.slice(-5), their5 = mxLast5(B, P.pick), tm = mxTiming(B, P.pick, true), tw = mxTimingWords(tm, "They");
  const ol = typeof olChanges === "function", tips = ol ? olChanges(B, P.pick, mxOppTips(D, i, tm)) : mxOppTips(D, i, tm).slice(0, 2), danger = mxDanger(T.club), ois0 = typeof mxOI === "function" ? mxOI(B, T, danger, D, i) : [], ois = ol ? olOIs(B, P.pick, ois0) : ois0;
  const lg = B.D.comp ? B.D.comp.name : "your league";
  const rows = me < 0 ? "" : MX_BRIEF_M.filter(m => HUB_M[m]).map(m => {
    const a = D.val[m][me], b = D.val[m][i], hi = HUB_M[m][2]; if (!(a === a) || !(b === b)) return "";
    const gap = Math.abs(a - b) / (Math.abs(a) + Math.abs(b) || 1), edge = gap < 0.03 ? 0 : (hi ? a > b : a < b) ? 1 : -1;
    return `<tr><td>${esc(HUB_M[m][0])}</td><td class="num"><b class="${edge > 0 ? "okc" : ""}">${hubFmt(m, a)}</b></td><td class="num"><b class="${edge < 0 ? "bad" : ""}">${hubFmt(m, b)}</b></td><td class="small ${edge > 0 ? "okc" : edge < 0 ? "bad" : "muted"}">${edge > 0 ? "You" : edge < 0 ? "Them" : "Even"}</td></tr>`;
  }).join("");
  return `<section class="panel mxbrief">
    <div class="ph"><h3>Matchday brief</h3><span class="mxbbtns"><button class="ghost small" data-mxtab="opp">Full report</button><button class="ghost small" data-mxact="print">Print</button></span></div>
    <div class="mxbhead"><b class="mxsc">${esc(name)}</b><span class="small muted">${isNext ? `Your next game · ${esc(mxDay(next.date))}` : next ? `Not your next game (that's ${esc(mxClubName(B, next.team, next.club))}, ${esc(mxDay(next.date))})` : "Picked in Next opponent"}</span></div>
    ${od.outside ? `<p class="small mxnote">Not in ${esc(lg)}: their numbers come from their own league, so they flatter them against a stronger side.</p>` : ""}
    ${T.g < 3 ? `<p class="small mxnote bad">Little data: only ${T.g} game${T.g === 1 ? "" : "s"} of stats for ${esc(name)} in your save. A rough guide only.</p>` : ""}
    <div class="mxbform"><div><span class="small muted">You</span>${mine5.map(mxBadge).join("") || "–"}</div><div><span class="small muted">${esc(name)}</span>${their5.map(mxBadge).join("") || "–"}</div></div>
    ${rows ? `<h4>You against them</h4><table class="gtable narrow mxbtab"><thead><tr><th></th><th class="num">You</th><th class="num">Them</th><th>Edge</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
    <h4>How to approach it <span class="small muted">(two changes at most)</span></h4>${tips.length ? `<ol class="mxblist">${tips.map(([w, y]) => `<li>${w}<div class="small muted">${y}.</div></li>`).join("")}</ol>` : `<p class="small muted">They're average almost everywhere: play your usual game.</p>`}
    ${ois.length ? `<h4>Opposition instructions</h4><ol class="mxblist">${ois.map(x => `<li>${x.w}<div class="small muted">${x.why}</div></li>`).join("")}</ol>` : ""}
    ${danger.length ? `<h4>Danger men</h4><ul class="mxblist">${danger.slice(0, 3).map(d => `<li><button class="linkbtn" data-sci="${d.p}">${esc(SAVE.name[d.p])}</button> <span class="small muted">${esc(savePos().str[d.p] || "")} · ${d.g} goal${d.g === 1 ? "" : "s"}, ${d.a} assist${d.a === 1 ? "" : "s"}</span></li>`).join("")}</ul>` : ""}
    <h4>When they score and concede</h4>${tw.length ? `<ul class="mxblist">${tw.slice(0, 2).map(x => `<li>${x}</li>`).join("")}</ul>` : `<p class="small muted">No strong pattern in their last ${tm.games} games.</p>`}
  </section>${ol ? olHtml(B, P.pick, true).replace('class="panel"', 'class="panel mxbrief"') : ""}`;
}
document.addEventListener("click", e => { if (e.target.closest('[data-mxact="print"]')) window.print(); });
