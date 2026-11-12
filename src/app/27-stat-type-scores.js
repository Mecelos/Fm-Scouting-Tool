// ---- stat-type scores: percentile ranks on the type's per-90s and percentages, weighted, 0-100 ----
// [column, weight, fewer is better]
const AD_SCORE = {
  gen: [["avr", 3], ["p_player_of_the_match", 1]],
  phy: [["p_distance_km", 1], ["p_high_intensity_sprints", 1]],
  gk: [["p_expected_goals_prevented", 3], ["r_sv", 3], ["p_goals_allowed", 1, 1], ["p_clean_sheets", 1]],
  def: [["p_tackles_completed", 2], ["r_tck", 1], ["p_key_tackles", 1], ["p_interceptions", 2], ["p_blocks", 1], ["p_clearances", 1], ["p_possession_won", 2], ["p_pressures_completed", 1], ["p_mistakes_leading_to_goal", 1, 1]],
  aer: [["p_headers_won", 3], ["r_hdr", 2], ["p_key_headers", 1]],
  dis: [["p_fouls_made", 1, 1], ["p_yellow_cards", 2, 1], ["p_red_cards", 2, 1]],
  pas: [["p_passes_completed", 2], ["r_pas", 2], ["p_possession_lost", 1, 1]],
  prg: [["p_progressive_passes", 1], ["p_dribbles", 1]],
  cre: [["p_expected_assists", 3], ["p_open_play_key_passes", 2], ["p_clear_cut_chances_created", 2], ["p_assists", 1], ["p_key_passes", 1]],
  crs: [["p_crosses_completed", 2], ["p_open_play_crosses_completed", 2], ["r_cr", 1]],
  att: [["p_non_penalty_expected_goals", 3], ["p_goals", 2], ["p_shots_on_target", 1], ["r_xgs", 1], ["r_conv", 1]],
};
// who is ranked: goalkeepers only for Goalkeeping; outfield players for the outfield types; everyone for General, Physical, Discipline
const adScorePool = cat => cat === "gk" ? "goalkeepers" : cat === "gen" || cat === "phy" || cat === "dis" ? "players" : "outfield players";
function adScoreDesc(cat) {
  const cols = AD.cols || [], parts = (AD_SCORE[cat] || []).map(([k, w, inv]) => { const c = cols.find(x => x.k === k); if (!c) return null; const d = AD_DOC[c.dk || c.k]; const nm = d ? d[1] : c.l; return nm.charAt(0).toLowerCase() + nm.slice(1) + (w > 1 ? ` (counts ×${w})` : "") + (inv ? " (fewer is better)" : ""); }).filter(Boolean);
  return `How he ranks against every other ${adScorePool(cat).replace(/s$/, "")} with ${(AD.minQ || AD_MIN_MINS).toLocaleString()}+ minutes in this period (a quarter of a regular starter's), from 100 (best) to 0; 50 is the middle. Built from: ${parts.join(", ")} (per 90 minutes; percentages as they are).`;
}
function adScoreArr(cat) {
  if (AD.sc && AD.sc[cat]) return AD.sc[cat];
  const T = SAVE, n = T.n, cols = AD.cols, pc = savePos(), mins = cols[0].mins;
  const spec = (AD_SCORE[cat] || []).map(([k, w, inv]) => [cols.find(c => c.k === k), w, !!inv]).filter(x => x[0]);
  const pool = adScorePool(cat), q = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!T.name[i] || !(mins(i) >= (AD.minQ || AD_MIN_MINS))) continue;
    const gk = pc.bench[i] === "GK";
    if (pool === "goalkeepers" ? !gk : pool === "outfield players" ? gk : false) continue;
    q[i] = 1;
  }
  const total = spec.reduce((s, x) => s + x[1], 0), sum = new Float64Array(n), wsum = new Float64Array(n), vals = new Float64Array(n);
  for (const [c, w, inv] of spec) {
    let m = 0;
    for (let i = 0; i < n; i++) { if (!q[i]) continue; const v = c.f(i); vals[i] = v; if (v === v) m++; }
    if (!m) continue;
    const s = new Float64Array(m); let k = 0;
    for (let i = 0; i < n; i++) if (q[i] && vals[i] === vals[i]) s[k++] = vals[i];
    s.sort();
    const lower = v => { let lo = 0, hi = m; while (lo < hi) { const md = (lo + hi) >> 1; if (s[md] < v) lo = md + 1; else hi = md; } return lo; };
    const upper = v => { let lo = 0, hi = m; while (lo < hi) { const md = (lo + hi) >> 1; if (s[md] <= v) lo = md + 1; else hi = md; } return lo; };
    for (let i = 0; i < n; i++) {
      if (!q[i]) continue; const v = vals[i]; if (v !== v) continue;
      let p = m > 1 ? (lower(v) + upper(v) - 1) / 2 / (m - 1) : .5;
      if (inv) p = 1 - p;
      sum[i] += w * p; wsum[i] += w;
    }
  }
  const out = new Float32Array(n).fill(NaN);
  for (let i = 0; i < n; i++) if (q[i] && wsum[i] > 0 && wsum[i] >= total / 2) out[i] = 100 * sum[i] / wsum[i];
  return (AD.sc[cat] = out);
}
function adAllScore() {
  const cs = adCatsOn(), key = cs.join();
  if (AD.scAll && AD.scAll.key === key) return AD.scAll.v;
  const n = SAVE.n, out = new Float32Array(n).fill(NaN), arrs = cs.map(adScoreArr);
  for (let i = 0; i < n; i++) { let s = 0, k = 0; for (const a of arrs) { const v = a[i]; if (v === v) { s += v; k++; } } if (k) out[i] = s / k; }
  AD.scAll = { key, v: out };
  return out;
}
// heading bands: one label over each run of columns of the same stat type (or player group)
const AD_BAND_L = { score: "Overall", info: "Player info", attr: "Attributes", posr: "Position ratings (FM's 1–20)", hid: "Ability, hidden & personality", te: "Tactical effectiveness · estimate for your tactic" };
const adBandKey = c => c.sticky ? "stk" : c.cat || c.g;
function adBands() {
  const out = [];
  AD.vis.forEach((c, i) => {
    const k = adBandKey(c), prev = out[out.length - 1];
    c.bs = i > 0 && !!prev && prev.k !== k && !prev.stk;
    if (prev && prev.k === k) { prev.n++; return; }
    out.push({ k, n: 1, stk: !!c.sticky, first: !prev || prev.stk, l: c.sticky ? "" : c.cat ? AD_CATS[c.cat] : AD_BAND_L[c.g] || "", title: c.cat ? AD_CAT_NOTE[c.cat] : "" });
  });
  return out;
}
const adCatsOn = () => Array.isArray(S.adTypes) ? S.adTypes.filter(k => AD_CATS[k]) : Object.keys(AD_CATS);
const adVisible = () => { const gs = S.adGroups || AD_DEFAULT_GROUPS, cs = adCatsOn(); return adColumns().filter(c => c.sticky || (c.g === "score" ? (c.cat ? cs.includes(c.cat) : cs.length >= 2) : gs.includes(c.g) && (!c.cat || cs.includes(c.cat)))); };
// picking stat types ranks the players on them, best first
function adRankByTypes() { const cs = adCatsOn(); S.adSort = cs.length ? { k: cs.length === 1 ? "s_" + cs[0] : "s_all", d: -1 } : null; }
// filter + sort: typed index arrays, fast enough for 200,000+ players
function adIndex() {
  const cols = adColumns(), F = S.adF || {}, q = (S.adQ || "").replace(/[☆★]/g, "").trim().toLowerCase(), pos = S.adPos || "all";
  const key = JSON.stringify([AD.key, F, q, pos, S.adSort, !!S.adFA]);
  if (AD.idx && AD.idxKey === key) return AD.idx;
  const T = SAVE, n = T.n, pc = savePos(), bit = pos === "all" ? 0 : 1 << POSITIONS.indexOf(pos);
  const act = Object.entries(F).map(([k, r]) => [cols.find(c => c.k === k), r]).filter(([c, r]) => c && r && (c.t === "str" ? r[0] : (r[0] !== "" && r[0] != null) || (r[1] !== "" && r[1] != null)));
  const lc = q ? (AD.lower || (AD.lower = T.name.map((x, i) => ((x || "") + " " + saveClub(i)).toLowerCase()))) : null;
  const qs = q ? q.split(",").map(s => s.trim()).filter(Boolean) : [], srow = AD.src && AD.src.past ? AD.src.row : null;
  const out = new Uint32Array(n); let m = 0;
  for (let i = 0; i < n; i++) {
    if (!T.name[i]) continue;
    if (srow && srow[i] < 0) continue;
    if (bit && !(pc.bits[i] & bit)) continue;
    if (S.adFA && T.clubIdx[i] >= 0) continue;
    if (qs.length && !qs.some(s => lc[i].indexOf(s) >= 0)) continue;
    let ok = true;
    for (const [c, r] of act) {
      if (c.t === "str") { if (String(c.f(i) || "").toLowerCase().indexOf(String(r[0]).toLowerCase()) < 0) { ok = false; break; } continue; }
      const v = c.f(i);
      if (v !== v) { ok = false; break; }
      if (r[0] !== "" && r[0] != null && v < +r[0]) { ok = false; break; }
      if (r[1] !== "" && r[1] != null && v > +r[1]) { ok = false; break; }
    }
    if (ok) out[m++] = i;
  }
  let idx = out.slice(0, m);
  const so = S.adSort && cols.find(c => c.k === S.adSort.k);
  if (so) {
    const dir = S.adSort.d || -1;
    if (so.t === "str") { const vals = new Map(); idx.forEach(i => vals.set(i, String(so.f(i) || "").toLowerCase())); idx = Uint32Array.from(Array.from(idx).sort((a, b) => dir * (vals.get(a) < vals.get(b) ? -1 : vals.get(a) > vals.get(b) ? 1 : 0))); }
    else {
      const vals = new Float64Array(n); idx.forEach(i => { vals[i] = so.f(i); });
      idx = Uint32Array.from(Array.from(idx).sort((a, b) => { const x = vals[a], y = vals[b]; if (x !== x) return y !== y ? 0 : 1; if (y !== y) return -1; return dir * (x - y); }));
    }
  }
  AD.idx = idx; AD.idxKey = key;
  return idx;
}
function adRowsHtml(from, to) {
  const idx = AD.idx, vis = AD.vis; let h = "";
  for (let r = from; r < to; r++) {
    const i = idx[r];
    h += `<tr data-adi="${i}">`;
    for (const c of vis) {
      const v = c.f(i), bg = c.t === "num" ? adCellColor(c, i, v) : null;
      h += `<td class="${c.t === "num" ? "num" : ""}${c.sticky ? " stk" : ""}${c.bs ? " bs" : ""}"${bg ? ` style="background:${bg}"` : ""}>${c.k === "name" ? scStar(i) : ""}${adFmt(c, v)}</td>`;
    }
    h += `</tr>`;
  }
  return h;
}
function adPaint(force) {
  const wrap = $("#adwrap"); if (!wrap || !AD.idx) return;
  const N = AD.idx.length, rh = AD.row, top = wrap.scrollTop, h = wrap.clientHeight || 600;
  const from = Math.max(0, Math.floor(top / rh) - 15), to = Math.min(N, Math.ceil((top + h) / rh) + 15);
  if (!force && AD.painted && from >= AD.painted[0] && to <= AD.painted[1] && (from - AD.painted[0] < 10)) return;
  const pf = Math.max(0, from - 10), pt = Math.min(N, to + 20);
  AD.painted = [pf, pt];
  const body = $("#adbody");
  body.innerHTML = `<tr class="adspace" style="height:${pf * rh}px"><td colspan="${AD.vis.length}"></td></tr>` + adRowsHtml(pf, pt) + `<tr class="adspace" style="height:${(N - pt) * rh}px"><td colspan="${AD.vis.length}"></td></tr>`;
}
function adRefresh() {
  adIndex(); AD.painted = null; requestAnimationFrame(() => fitLayout());
  const wrap = $("#adwrap"); if (wrap) wrap.scrollTop = 0;
  const cnt = $("#adcount"); if (cnt) cnt.textContent = adCountTxt();
  adPaint(true);
}
const adCountTxt = () => AD.src && AD.src.past && !AD.src.n ? `No ${saveKind() === "league" ? "league " : saveKind() === "youth" ? "youth / B team " : ""}stats stored for this season${saveKind() === "league" ? " (try All competitions)" : ""}`
  : `${AD.idx.length.toLocaleString()} of ${(AD.src && AD.src.past ? AD.src.n : SAVE.meta.check.named || SAVE.n).toLocaleString()} players${AD.src && AD.src.past ? " with stats" : ""}`;
function renderAllData() {
  if (!SAVE) return `<section class="panel addpanel"><h3>All data needs your save</h3><p class="muted">This tab lists every player in your FM save with every in-game number, colour-coded, with a min and max filter on each. Load the save once and it fills.</p><div class="addrow"><button class="primary" data-act="datapage">Load your FM save</button></div></section>`;
  const cols = adColumns(); AD.vis = adVisible(); adIndex();
  const narrowAd = window.innerWidth < 640;
  const F = S.adF || {}, groups = S.adGroups || AD_DEFAULT_GROUPS, kind = saveKind();
  const activeF = Object.keys(F).filter(k => { const r = F[k]; return r && ((r[0] !== "" && r[0] != null) || (r[1] !== "" && r[1] != null)); }).length;
  const fmtR = (c, v) => c.rfmt ? c.rfmt(v) : c.fmt ? c.fmt(v) : (c.d ? (+v).toFixed(c.d) : Math.round(v).toLocaleString());
  const visK = new Set(AD.vis.map(c => c.k)), hiddenF = Object.keys(F).filter(k => !visK.has(k) && F[k] && ((F[k][0] !== "" && F[k][0] != null) || (F[k][1] !== "" && F[k][1] != null))).length;
  let h = `<section class="panel adpanel">
    <div class="adbar">
      <input type="search" id="adQ" placeholder="Search player or club (commas: several)" value="${esc(S.adQ || "")}" aria-label="Search player or club">
      ${hasHistory() ? `<label class="fl small"><span class="muted">Season</span><select id="adSeason">${["cur", ...histYears(), "all"].map(v => `<option value="${v}" ${String(seasonSel()) === String(v) ? "selected" : ""}>${esc(seasonSelLabel(v))}</option>`).join("")}</select></label>` : ""}
      <label class="fl small"><span class="muted">Stats</span><select id="saveKind2">${Object.entries(SAVE_KINDS).map(([k, l]) => `<option value="${k}" ${k === kind ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <button class="ghost small" data-act="adcolor" aria-pressed="${!!S.adColor}">Colours ${S.adColor ? "on" : "off"}</button>
      <button class="ghost small" data-act="adfa" aria-pressed="${!!S.adFA}">Free agents only${S.adFA ? " ✓" : ""}</button>
      <button class="ghost small" data-act="adreset" ${activeF || S.adQ || S.adFA || (S.adPos && S.adPos !== "all") || S.adSort ? "" : "disabled"}>Clear filters${activeF ? ` (${activeF})` : ""}</button>
      <span class="small muted" id="adcount">${adCountTxt()}</span>${hiddenF ? `<span class="small bad">${hiddenF} filter${hiddenF > 1 ? "s" : ""} on hidden columns</span>` : ""}
    </div>
    <div class="adlayout">${renderAdSide(cols, groups)}
    <div class="admain"><div class="adwrap" id="adwrap"><table class="adtable"><colgroup>${AD.vis.map(c => `<col style="width:${(narrowAd && c.wn) || c.w || 66}px">`).join("")}</colgroup>
      <thead><tr class="adband">${adBands().map(b => `<th colspan="${b.n}" class="band${b.stk ? " stk" : ""}${b.first ? "" : " bs"}"${b.title ? ` title="${esc(b.title)}"` : ""}><span>${esc(b.l)}</span></th>`).join("")}</tr><tr class="adhead">${AD.vis.map(c => {
        const so = S.adSort && S.adSort.k === c.k ? (S.adSort.d === 1 ? " ▲" : " ▼") : "";
        const rg = c.t === "num" ? adRange(c) : null, f = F[c.k] || ["", ""], full = c.full + (c.per90 ? " per 90" : "");
        return `<th class="${c.sticky ? "stk" : ""}${c.t === "num" ? " num" : ""}${c.bs ? " bs" : ""}" data-k="${c.k}">
          <button class="adsort" data-adsort="${c.k}" aria-label="${esc(full)}: sort">${esc(c.ab)}${c.per90 ? `<span class="p90">/90</span>` : ""}${so}</button>
          ${c.t === "num" ? `<span class="adrange">${rg ? `${fmtR(c, rg[0])} – ${fmtR(c, rg[1])}` : "–"}</span>
          <span class="adf"><input type="number" inputmode="decimal" step="any" data-adf="${c.k}" data-b="0" placeholder="min" value="${esc(f[0] ?? "")}" aria-label="${esc(full)} minimum"><input type="number" inputmode="decimal" step="any" data-adf="${c.k}" data-b="1" placeholder="max" value="${esc(f[1] ?? "")}" aria-label="${esc(full)} maximum"></span>`
          : `<span class="adrange">&nbsp;</span><span class="adf"><input type="text" data-adf="${c.k}" data-b="0" placeholder="contains" value="${esc(f[0] ?? "")}" aria-label="${esc(full)} contains"></span>`}
        </th>`;
      }).join("")}</tr></thead>
      <tbody id="adbody"></tbody></table></div>
    <p class="small muted">Hover a heading (on a phone: tap it) to see the full name and what it means. Tap a heading to sort, tap a player to open his panel over this table (it links to his position tab). Each heading shows the lowest and highest value in the save (per 90 and percentages: players with ${AD_MIN_MINS}+ minutes).</p></div></div>
  </section>`;
  h += renderAdLegend();
  return h;
}
// side filter: which stat types, number formats and player columns to show
function renderAdSide(cols, groups) {
  const cs = adCatsOn(), wide = window.innerWidth >= 900, open = S.adSideOpen != null ? S.adSideOpen : wide;
  const nCat = k => cols.filter(c => c.cat === k && groups.includes(c.g)).length;
  const row = (attr, on, label, extra) => `<button class="adchk" ${attr} aria-pressed="${on}">${extra || ""}<span class="lb">${esc(label)}</span></button>`;
  const shown = cs.length === Object.keys(AD_CATS).length ? "all stat types" : cs.length ? cs.map(k => AD_CATS[k]).join(", ") : "no stat types";
  return `<aside class="adside"><details id="adside"${open ? " open" : ""}><summary><b>Columns</b> <span class="muted small">${esc(shown)}</span></summary>
    <p class="small muted adhint">Tick types to rank players on them, best first.</p><div class="adsgroup"><h4>Stat types <span class="adall"><button class="linkbtn" data-act="adcatsall">All</button> · <button class="linkbtn" data-act="adcatsnone">None</button></span></h4>
      ${Object.entries(AD_CATS).map(([k, l]) => row(`data-adcat="${k}" title="${esc(AD_CAT_NOTE[k])}"`, cs.includes(k), l).replace("</button>", `<span class="n">${nCat(k)}</span></button>`)).join("")}</div>
    <div class="adsgroup"><h4>Numbers as</h4>${["tot", "p90", "pct"].map(g => row(`data-adgroup="${g}"`, groups.includes(g), AD_GROUPS[g])).join("")}</div>
    <div class="adsgroup"><h4>Player</h4>${["info", "attr", "posr", "hid", "te"].map(g => row(`data-adgroup="${g}"`, groups.includes(g), AD_GROUPS[g])).join("")}</div>${groups.includes("te") && !teKey() ? `<p class="small bad">Tactical effectiveness needs your tactic: load it in <button class="linkbtn" data-spos="MyTactic" data-mode2="squad">My squad › My tactic</button>.</p>` : groups.includes("te") ? `<p class="small muted">Effectiveness is Scout Lab's estimate for your tactic "${esc(tacWorking().name)}", not FM's own number. Hover a heading for how it's worked out.</p>` : ""}
  </details></aside>`;
}
function renderAdLegend() {
  const g = S.adLegendPos || "ST", k = AD.starter / 90;
  const rows = [["Goals", "goals"], ["xG", "xg"], ["NP-xG", "npxg"], ["Assists", "assists"], ["xA", "xa"], ["Shots", "shots"], ["On target", "sot"], ["Key passes", "kp"], ["CCC", "ccc"], ["Prog passes", "prpas"], ["Dribbles", "drb"],
    ["Passes att", "pasa"], ["Crosses cmp", "crsc"], ["Aerials att", "aera"], ["Headers won", "hdrs"], ["Tackles won", "tckc"], ["Interceptions", "itc"], ["Blocks", "blk"], ["Clearances", "clr"],
    ["Poss won", "pwon"], ["Poss lost", "plost"], ["Sprints", "spr"], ["Distance km", "dist"], ["Fouls", "fouls"], ["Fouled", "fouled"], ["Yellows", "yel"], ["Conceded", "conc"], ["Clean sheets", "cs"],
    ["xG prevented", "xgp"], ["Saves", "saves"], ["Pass %", "pasPct"], ["Conversion %", "convPct"], ["Headers won %", "hdrPct"], ["Tackles won %", "tckPct"], ["Save %", "svPct"], ["xG per shot", "xgShot"], ["Av Rat", "avr"]]
    .map(([l, b]) => [l, b, benchFor(b, g)]).filter(x => x[2]);
  const nf = v => Math.abs(v) >= 10 ? v.toFixed(0) : Math.abs(v) >= 1 ? v.toFixed(1) : v.toFixed(2);
  return `<details class="panel adlegend"${S.adLegendOpen ? " open" : ""}><summary><b>How the colours work</b> <span class="muted small">benchmarks by position</span></summary>
    <p class="small"><span class="adkey" style="background:${adColor(0)}">poor</span> <span class="adkey" style="background:${adColor(.5)}">average</span> <span class="adkey" style="background:${adColor(1)}">good</span> — judged for <b>his position</b> (from his best position), so 2 xG is good for a centre-back and poor for a striker.</p>
    <ul class="why small">
      <li><b>Per 90</b>, <b>percentages</b> and <b>ratings</b>: coloured once he has ${AD_MIN_MINS}+ minutes; fewer minutes stay uncoloured (too few to judge).</li>
      <li><b>Season totals</b>: judged against what a regular starter at his position has by now. This save's regular starter has about <b>${Math.round(AD.starter).toLocaleString()}</b> minutes (85% of the most-used players' ${Math.round(AD.seasonMax).toLocaleString()}), so the per-90 numbers below are multiplied by ${k.toFixed(1)}: a striker with ${nf((benchFor("xg", "ST") || [0, .4])[1] * k)}+ xG is green. Totals where fewer is better (fouls, cards, possession lost, errors) are judged on his rate instead.</li>
      <li><b>Minutes, apps and starts</b>: red under 15% of the season so far, green above 75%. <b>Attributes</b> (and hidden ones): red 6 or less, yellow about 10–11, green 15+. CA: 80 → 150, PA: 110 → 170.</li>
    </ul>
    <div class="chips">${BG.map(p => `<button class="chip" data-adleg="${p}" aria-pressed="${g === p}">${p === "W" ? "Winger" : p === "AM" ? "AM (C)" : p}</button>`).join("")}</div>
    <div class="tscroll"><table class="gtable narrow adlegtable"><thead><tr><th>Stat</th><th class="num">Poor</th><th class="num">Average</th><th class="num">Good</th><th class="num">Good season total</th></tr></thead><tbody>
      ${rows.map(([l, b, t]) => { const B = AD_BENCH[b], mid = (t[0] + t[1]) / 2, pct = B.pct; return `<tr><td>${esc(l)}${pct ? "" : " /90"}${B.inv ? ` <span class="muted small">fewer is better</span>` : ""}</td><td class="num" style="background:${adColor(0)}">${B.inv ? "≥ " : "≤ "}${nf(t[0])}</td><td class="num" style="background:${adColor(.5)}">${nf(mid)}</td><td class="num" style="background:${adColor(1)}">${B.inv ? "≤ " : "≥ "}${nf(t[1])}</td><td class="num">${pct || B.inv ? "–" : nf(t[1] * k)}</td></tr>`; }).join("")}
    </tbody></table></div></details>`;
}
let adTimer = null;
function bindAllData() {
  const wrap = $("#adwrap"); if (!wrap) return;
  AD.painted = null; adPaint(true);
  let raf = 0;
  wrap.onscroll = () => { if (lastPointer === "mouse") hideAdTip(); if (raf) return; raf = requestAnimationFrame(() => { raf = 0; adPaint(false); }); };
  const q = $("#adQ"); if (q) q.oninput = () => { clearTimeout(adTimer); adTimer = setTimeout(() => { S.adQ = q.value; savePrefs(); adRefresh(); }, 250); };
  wrap.querySelectorAll("input[data-adf]").forEach(inp => {
    inp.oninput = () => {
      clearTimeout(adTimer);
      adTimer = setTimeout(() => {
        const k = inp.dataset.adf, b = +inp.dataset.b, F = { ...(S.adF || {}) }, r = (F[k] || ["", ""]).slice();
        r[b] = inp.value.trim(); if (r[0] === "" && r[1] === "") delete F[k]; else F[k] = r;
        S.adF = F; savePrefs(); adRefresh();
        const btn = document.querySelector('[data-act="adreset"]'), n = Object.keys(F).length;
        if (btn) { btn.disabled = !(n || S.adQ || (S.adPos && S.adPos !== "all") || S.adSort); btn.textContent = "Clear filters" + (n ? ` (${n})` : ""); }
      }, 300);
    };
  });
  const legend = $(".adlegend"); if (legend) legend.ontoggle = () => { S.adLegendOpen = legend.open; };
  const side = $("#adside"); if (side) side.ontoggle = () => { S.adSideOpen = side.open; };
  // headings: full name and meaning on hover or keyboard focus (touch: shown after the tap)
  // offsetHeight/Width are layout sizes: with the Scale setting (page zoom) getBoundingClientRect returns zoomed sizes, which left a see-through gap under the band row
  const band = wrap.querySelector("tr.adband"); if (band) wrap.querySelector("table").style.setProperty("--bandh", (band.offsetHeight || 25) + "px");
  const stkw = wrap.querySelector("thead tr.adhead th.stk"); if (stkw) wrap.querySelector("table").style.setProperty("--stkw", stkw.offsetWidth + "px");
  const head = wrap.querySelector("thead");
  if (head) {
    head.onmousemove = e => { if (lastPointer !== "mouse") return; const th = e.target.closest("th[data-k]"); if (th && AD.tipK !== th.dataset.k) showAdTip(th); };
    head.onmouseout = e => { const th = e.target.closest("th[data-k]"); if (th && !th.contains(e.relatedTarget)) hideAdTip(); };
    head.onfocusin = e => { if (e.target.matches(".adsort")) showAdTip(e.target.closest("th[data-k]")); };
    head.onfocusout = () => hideAdTip();
  }
  hideAdTip();
}
// open a player from All data in his position tab (save dataset), with his panel
function adOpen(i, forcePos) {
  const g = saveGroups(), pc = savePos(), kind = saveKind();
  const order = POSITIONS.filter((p, k) => pc.bits[i] & (1 << k));
  const best = { GK: "GK", FB: "FB", CB: "CB", DM: "DM", CM: "CM", AM: "AM", W: "Wingers", ST: "ST" }[pc.bench[i]];
  const pos = forcePos && order.includes(forcePos) ? forcePos : order.includes(best) ? best : order[0]; if (!pos) return;
  let mode = kind && g.stats[pos].includes(i) ? "stats" : "attr";
  // fewer minutes than the page's minimum: show him in Attributes rather than changing your minutes filter
  if (mode === "stats" && S.minMins > 0) { const st = SAVE.stats[kind], m = st.cols.minutes[st.row[i]]; if (!(m >= S.minMins)) mode = "attr"; }
  let ix = g[mode][pos].indexOf(i);
  // not in the tab's pool (e.g. no minutes): add him to it for this session
  if (ix < 0) { (SAVE._extra = SAVE._extra || new Set()).add(i); installSave(false); clearCaches(); const g2 = saveGroups(); mode = "attr"; ix = g2.attr[pos].indexOf(i); if (ix < 0) return; }
  // the panel opens over All data, scored in his position tab; the page behind stays where it is
  if (!adHost() || forcePos) S.adOver = pageKey(); // opened from a page that has its own panel (a similar player, another position): this panel sits over it
  S.active[mode + "|" + pos] = `sv-${mode}-${pos}`; S.adCtx = { mode, pos }; S.sel = ix; S.cmp = null; S.pRole = null; S.adding = false;
  inAdCtx(() => openPlayer(panelScore(), ix));
}
// run a player-panel action in the position tab a panel opened from All data belongs to (the page stays on All data)
// pages that open a save player's panel over themselves (All data, Scouting, the squad planner)
const pageKey = () => [S.mode, S.spos, S.pos, S.scTab, S.hubTab, S.mxTab].join("|");
const adHost = () => (S.adOver && S.adOver === pageKey()) || S.mode === "all" || S.mode === "scout" || S.mode === "hub" || S.mode === "matches" || S.mode === "home" || S.mode === "learn" || (S.mode === "squad" && (S.spos === "Planner" || S.spos === "Review"));
function inAdCtx(fn) {
  if (!adHost() || !S.adCtx) return fn();
  const m = S.mode, p = S.pos; S.mode = S.adCtx.mode; S.pos = S.adCtx.pos; S._adPanel = true;
  try { return fn(); } finally { S.mode = m; S.pos = p; S._adPanel = false; }
}

