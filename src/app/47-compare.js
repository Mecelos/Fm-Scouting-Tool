// ---------- Scouting > Compare: any players in the save side by side (up to 4), whatever their position or club ----------
// Players are added from the page's own search, the "add one of mine" picker, or the Compare button in any player's panel.
// Raw numbers only (profile, attributes, this season's stats per 90): role scores depend on position, so they stay in the panel.
const CMP_KEY = "scoutlab-cmp", CMP_MAX = 4;
function cmpIds() { if (!S._cmp) { try { S._cmp = JSON.parse(localStorage.getItem(CMP_KEY) || "[]"); } catch (e) { S._cmp = []; } if (!Array.isArray(S._cmp)) S._cmp = []; } return S._cmp; }
function cmpSet(l) { S._cmp = l; try { localStorage.setItem(CMP_KEY, JSON.stringify(l)); } catch (e) { } }
function cmpList() { if (!SAVE) return []; const ix = saveUidIndex(); return cmpIds().filter(u => ix.has(u)); }   // only players who are in this save
function cmpAdd(u) { const l = cmpList(); if (l.includes(u)) return "in"; if (l.length >= CMP_MAX) return "full"; cmpSet(l.concat([u])); return "ok"; }
function cmpRemove(u) { cmpSet(cmpList().filter(x => x !== u)); }
// the Compare line in a player's panel
function cmpPanelHtml(p) {
  if (!SAVE || !p || !p.uid || !saveUidIndex().has(p.uid)) return "";
  const l = cmpList(), on = l.includes(p.uid), full = !on && l.length >= CMP_MAX;
  return `<span class="cmppanel" data-cmpfor="${esc(p.uid)}"><button class="linkbtn small" data-cmpadd="${esc(p.uid)}" ${full ? "disabled" : ""}>${on ? "✓ In compare: remove" : full ? `Compare is full (${CMP_MAX})` : "⇄ Add to compare"}</button>${l.length ? ` <button class="linkbtn small" data-sctab="cmp">Open compare (${l.length}) →</button>` : ""}</span>`;
}
const CMP_ATTR = [
  ["Technical", ["corners", "crossing", "dribbling", "finishing", "first_touch", "free_kick_taking", "heading", "long_shots", "long_throws", "marking", "passing", "penalty_taking", "tackling", "technique"]],
  ["Mental", ["aggression", "anticipation", "bravery", "composure", "concentration", "decisions", "determination", "flair", "leadership", "off_the_ball", "positioning", "teamwork", "vision", "work_rate"]],
  ["Physical", ["acceleration", "agility", "balance", "jumping_reach", "natural_fitness", "pace", "stamina", "strength"]],
  ["Goalkeeping", ["aerial_reach", "command_of_area", "communication", "eccentricity", "handling", "kicking", "one_on_ones", "punching", "reflexes", "rushing_out", "throwing"], "gk"],
  ["Hidden", ["consistency", "important_matches", "versatility", "injury_proneness", "dirtiness"]],
];
const cmpAttrName = n => FR.ATTR_NAME[n] || n.replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
const CMP_LOW = new Set(["injury_proneness", "dirtiness", "eccentricity"]);   // lower is better (eccentricity: neither, left unmarked)
const CMP_RADAR = [["Attacking", ["finishing", "off_the_ball", "composure"]], ["Technique", ["dribbling", "first_touch", "technique"]], ["Vision", ["passing", "vision", "decisions"]], ["Speed", ["pace", "acceleration"]],
  ["Physical", ["strength", "stamina", "balance"]], ["Aerial", ["heading", "jumping_reach"]], ["Defending", ["tackling", "marking", "positioning"]], ["Mental", ["anticipation", "determination", "teamwork", "work_rate"]]];
const CMP_RADAR_GK = [["Shot stopping", ["reflexes", "one_on_ones", "handling"]], ["Aerial", ["aerial_reach", "command_of_area", "jumping_reach"]], ["Distribution", ["kicking", "throwing", "passing"]], ["Sweeping", ["rushing_out", "acceleration", "pace"]],
  ["Organising", ["communication", "leadership", "positioning"]], ["Mental", ["anticipation", "concentration", "composure", "decisions"]]];
// [label, value(c, mins) where c(field) is his season total, higher is better (1) / lower (-1) / neither (0), decimals, unit, goalkeepers only]
const cmpP90 = f => (c, m) => m > 0 ? c(f) * 90 / m : null, cmpPct = (a, b) => c => c(b) > 0 ? 100 * c(a) / c(b) : null;
const CMP_STATS = [
  ["Average rating", c => c("average_rating") || null, 1, 2], ["Goals /90", cmpP90("goals"), 1, 2], ["xG /90", cmpP90("expected_goals"), 1, 2], ["Shots /90", cmpP90("shots"), 1, 1],
  ["Assists /90", cmpP90("assists"), 1, 2], ["xA /90", cmpP90("expected_assists"), 1, 2], ["Key passes /90", cmpP90("key_passes"), 1, 1], ["Big chances made /90", cmpP90("clear_cut_chances_created"), 1, 2],
  ["Dribbles /90", cmpP90("dribbles"), 1, 1], ["Passes /90", cmpP90("passes_attempted"), 0, 0], ["Pass completion", cmpPct("passes_completed", "passes_attempted"), 1, 0, "%"], ["Progressive passes /90", cmpP90("progressive_passes"), 1, 1],
  ["Crosses completed /90", cmpP90("crosses_completed"), 1, 1], ["Possession lost /90", cmpP90("possession_lost"), -1, 1], ["Possession won /90", cmpP90("possession_won"), 1, 1], ["Tackles won /90", cmpP90("tackles_completed"), 1, 1],
  ["Tackles won %", cmpPct("tackles_completed", "tackles_attempted"), 1, 0, "%"], ["Interceptions /90", cmpP90("interceptions"), 1, 1], ["Clearances /90", cmpP90("clearances"), 0, 1], ["Headers won /90", cmpP90("headers_won"), 1, 1],
  ["Headers won %", cmpPct("headers_won", "aerial_challenges_attempted"), 1, 0, "%"], ["Distance /90 (km)", cmpP90("distance_km"), 1, 1], ["Sprints /90", cmpP90("high_intensity_sprints"), 1, 1], ["Fouls /90", cmpP90("fouls_made"), -1, 1],
  ["Conceded /90", cmpP90("goals_allowed"), -1, 2, "", 1], ["Save %", c => c("shots_on_target_faced") > 0 ? 100 * (c("saves_held") + c("saves_parried") + c("saves_tipped")) / c("shots_on_target_faced") : null, 1, 0, "%", 1],
  ["xG prevented /90", cmpP90("expected_goals_prevented"), 1, 2, "", 1], ["Clean sheets", c => c("clean_sheets"), 1, 0, "", 1],
];
function scCompare() {
  const ix = saveUidIndex(), ids = cmpList(), is = ids.map(u => ix.get(u)), pc = savePos(), AI = n => FR.ATTRIBUTE_ORDER.indexOf(n), at = (i, n) => SAVE.attrs[i * 52 + AI(n)] || null;
  const mine = saveManagedIdx().filter(i => !is.includes(i)).sort((a, b) => (SAVE.ca[b] || 0) - (SAVE.ca[a] || 0));
  const full = is.length >= CMP_MAX;
  let h = `<section class="panel"><div class="ph"><h3>Compare</h3><span class="muted small">any players in your save · up to ${CMP_MAX} · green = best in the row</span></div>
    <div class="cmpadd"><div class="gsearch cmpsearch"><input type="search" id="cmpQ" placeholder="${full ? "Remove a player to add another" : "Add a player: type a name"}" autocomplete="off" spellcheck="false" ${full ? "disabled" : ""}><div id="cmpRes" class="gsdrop" hidden></div></div>
      <select id="cmpMine" ${full || !mine.length ? "disabled" : ""}><option value="">Add one of mine</option>${mine.map(i => `<option value="s${SAVE.uid[i]}">${esc(SAVE.name[i])} · ${esc(pc.str[i] || "")}</option>`).join("")}</select>
      ${is.length ? `<button class="ghost small" data-cmpclear>Clear all</button>` : ""}</div>
    ${is.length ? "" : `<p class="muted">Nobody here yet. Type a name above, pick one of your players, or open any player's panel and tap <b>⇄ Add to compare</b>.</p>`}
    ${is.length === 1 ? `<p class="small muted">Add at least one more player to compare.</p>` : ""}</section>`;
  if (!is.length) return h;
  const head = `<thead><tr><th class="left">&nbsp;</th>${is.map((i, k) => `<th class="num"><span class="lg k${k}"></span> <button class="linkbtn" data-sci="${i}">${esc(SAVE.name[i])}</button> <button class="linkbtn small cmpx" data-cmprm="${esc(ids[k])}" title="Remove from compare" aria-label="Remove ${esc(SAVE.name[i])}">✕</button></th>`).join("")}</tr></thead>`;
  const line = (lab, f, dir, fmt) => { const vs = is.map(f), ok = vs.filter(v => v != null && v === v), best = dir && ok.length > 1 ? (dir > 0 ? Math.max(...ok) : Math.min(...ok)) : null;
    return `<tr><td class="left small">${esc(lab)}</td>${vs.map(v => `<td class="num${v != null && v === best && ok.some(o => o !== best) ? " good" : ""}">${v == null || v !== v ? "–" : fmt ? fmt(v) : v}</td>`).join("")}</tr>`; };
  const sub = t => `<tr class="cmpsub"><td class="left" colspan="${is.length + 1}">${esc(t)}</td></tr>`, txt = f => `<tr><td class="left small">${esc(f[0])}</td>${is.map(i => `<td class="num small">${esc(f[1](i) ?? "–")}</td>`).join("")}</tr>`;
  const table = body => `<div class="cmpscroll"><table class="heat cmpt cmpbig">${head}<tbody>${body}</tbody></table></div>`;
  // profile
  const end = i => { const d = SAVE.cEnd && SAVE.cEnd[i] ? sDate(SAVE.cEnd[i]) : null; return d ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null; };
  h += `<section class="panel"><div class="ph"><h3>Profile</h3></div>${table(
    txt(["Club", i => (SAVE.clubIdx[i] >= 0 && SAVE.clubShort && SAVE.clubShort[SAVE.clubIdx[i]]) || saveClub(i)]) + txt(["Position", i => pc.str[i] || null]) +
    line("Age", i => SAVE.age[i] >= 0 ? SAVE.age[i] : null, -1) + line("Ability (CA)", i => SAVE.ca[i] || null, 1) + line("Potential (PA)", i => SAVE.pa[i] > 0 ? SAVE.pa[i] : null, 1) +
    line("Value", i => scVal(i), 0, v => esc(saveMoney(v))) + (scHasC() ? line("Wage p/w", i => scWage(i), 0, v => esc(saveMoney(v))) + txt(["Contract ends", end]) : ""))}</section>`;
  // attributes, with a radar of the main areas
  const gkAll = is.every(i => pc.bench[i] === "GK"), gkAny = is.some(i => pc.bench[i] === "GK"), RA = gkAll ? CMP_RADAR_GK : CMP_RADAR;
  const area = (i, names) => { const v = names.map(n => at(i, n)).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const body = CMP_ATTR.filter(g => g[2] !== "gk" || gkAny).map(([g, names]) => sub(g) + names.map(n => line(cmpAttrName(n), i => at(i, n), n === "eccentricity" ? 0 : CMP_LOW.has(n) ? -1 : 1)).join("")).join("");
  h += `<section class="panel"><div class="ph"><h3>Attributes</h3><span class="muted small">out of 20</span></div><div class="cmpgrid"><div>${table(body)}</div>
    <div class="cmpradar">${radar(RA.map(a => a[0]), is.map((i, k) => ({ v: RA.map(a => area(i, a[1])), cls: "k" + k, dots: true, fmt: v => v.toFixed(1) })), 20)}
      <p class="legend small">${is.map((i, k) => `<span class="lg k${k}"></span>${esc(SAVE.name[i])}`).join("")}</p>
      <p class="small muted">Each point is the average of two to four attributes (${RA.map(a => `${a[0]}: ${a[1].map(cmpAttrName).join(", ")}`).join("; ")}).</p></div></div></section>`;
  // this season's stats, all competitions
  const st = SAVE.stats && SAVE.stats.overall;
  if (st) {
    const c = i => f => { const r = st.row[i], a = st.cols[f]; const v = r >= 0 && a ? a[r] : NaN; return v === v ? v : 0; }, mins = i => (st.row[i] >= 0 ? c(i)("minutes") : 0);
    const low = is.filter(i => mins(i) > 0 && mins(i) < 450), none = is.filter(i => !(mins(i) > 0));
    const rows = line("Minutes", i => mins(i) || null, 0, v => Math.round(v).toLocaleString()) + CMP_STATS.filter(s => !s[5] || gkAny).map(([lab, f, dir, dp, u]) => line(lab, i => { if (!(mins(i) > 0)) return null; const v = f(c(i), mins(i)); return v != null && v === v ? +v.toFixed(dp) : null; }, dir, v => v.toFixed(dp) + (u || ""))).join("");
    h += `<section class="panel"><div class="ph"><h3>This season's stats</h3><span class="muted small">all competitions · per 90 minutes · not adjusted for league strength</span></div>
      ${none.length ? `<p class="small mxnote">No stats this season in the save for ${esc(none.map(i => SAVE.name[i]).join(", "))} (not played, or his league isn't loaded in your game).</p>` : ""}
      ${low.length ? `<p class="small mxnote bad">Few minutes: ${esc(low.map(i => `${SAVE.name[i]} (${Math.round(mins(i))})`).join(", "))}. Under about 450 minutes, per-90 numbers swing a lot: read them as a hint.</p>` : ""}
      ${table(rows)}${learnBox("A player in a weaker league will post bigger numbers for the same ability. Attributes are FM's own scale and compare directly; stats need the league in mind.", "sample")}</section>`;
  }
  return h;
}
function cmpRefreshPanel() { // the Compare line in an open panel, and the tab's count
  document.querySelectorAll(".cmppanel").forEach(el => { const u = el.dataset.cmpfor; el.outerHTML = cmpPanelHtml({ uid: u }) || ""; });
  if (typeof renderTabs === "function") renderTabs();
}
function cmpRedraw() { if (S.mode === "scout" && S.scTab === "cmp" && !S.guide && !S.dataPage) { const y = window.scrollY; render(); window.scrollTo(0, y); } else cmpRefreshPanel(); }
document.addEventListener("click", e => {
  const t = e.target.closest("[data-cmpadd], [data-cmprm], [data-cmpgo], [data-cmpclear], [data-cmppick]"); if (!t) return;
  if (t.dataset.cmpadd) { const u = t.dataset.cmpadd; if (cmpList().includes(u)) cmpRemove(u); else cmpAdd(u); cmpRedraw(); }
  else if (t.dataset.cmprm) { cmpRemove(t.dataset.cmprm); cmpRedraw(); }
  else if (t.dataset.cmpgo) { cmpAdd(t.dataset.cmpgo); S.guide = false; S.dataPage = false; S.mode = "scout"; S.scTab = "cmp"; S.sel = null; S.adCtx = null; render(); window.scrollTo(0, 0); }
  else if (t.dataset.cmpclear != null) { cmpSet([]); cmpRedraw(); }
  else if (t.dataset.cmppick) { cmpAdd("s" + SAVE.uid[+t.dataset.cmppick]); cmpRedraw(); const q = document.getElementById("cmpQ"); if (q && !q.disabled) q.focus(); }
});
document.addEventListener("input", e => {
  if (e.target.id !== "cmpQ") return; const box = document.getElementById("cmpRes"); if (!box) return;
  const q = e.target.value, have = new Set(cmpList().map(u => saveUidIndex().get(u))), list = typeof gsFind === "function" ? gsFind(q).filter(x => x.kind === "player" && !have.has(x.i)) : [];
  box.hidden = gsNorm(q).trim().length < 2;
  box.innerHTML = list.length ? list.map(x => `<button class="gsrow" data-cmppick="${x.i}"><b>${esc(x.name)}</b><span class="small muted">${esc(x.sub)}</span></button>`).join("") : `<p class="small muted gsnone">Nobody found for "${esc(q)}".</p>`;
});
document.addEventListener("keydown", e => { if (e.target.id === "cmpQ" && e.key === "Enter") { const b = document.querySelector("#cmpRes [data-cmppick]"); if (b) b.click(); } if (e.target.id === "cmpQ" && e.key === "Escape") { e.target.value = ""; const box = document.getElementById("cmpRes"); if (box) box.hidden = true; } });
document.addEventListener("change", e => { if (e.target.id === "cmpMine" && e.target.value) { cmpAdd(e.target.value); cmpRedraw(); } });
document.addEventListener("click", e => { if (!e.target.closest(".cmpsearch")) { const box = document.getElementById("cmpRes"); if (box) box.hidden = true; } });
