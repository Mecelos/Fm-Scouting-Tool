// ---------- render ----------
function render() {
  requestAnimationFrame(() => fitLayout());
  savePrefs();
  renderTabs();
  const main = $("#main");
  if (S.guide) { closeDrawer(true); main.innerHTML = renderGuide(); window.scrollTo(0, 0); return; }
  if (S.dataPage) { closeDrawer(true); main.innerHTML = renderDataPage(); bindSaveInput(); return; }
  if (S.mode === "squad") { renderSquad(main); return; }
  if (S.mode === "staff") { renderStaff(main); return; }
  if (S.mode === "scout") { renderScout(main); return; }
  if (S.mode === "hub") { renderHub(main); return; }
  if (S.mode === "matches") { renderMatches(main); return; }
  if (S.mode === "home") { renderHome(main); return; }
  if (S.mode === "learn") { renderLearn(main); return; }
  if (S.mode === "all") { closeDrawer(true); main.innerHTML = renderAllData(); bindAllData(); renderSaveNote(); if (S.sel != null && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true)); return; }
  const sets = tabSets();
  if (!sets.length || S.adding) { main.innerHTML = renderSetsBar(sets) + renderAdd(!sets.length); bindAdd(); renderSaveNote(); return; }
  const sc = currentScore();
  if (S.type && !sc.types.includes(S.type)) S.type = null;
  const rows = visibleRows(sc);
  const ranked = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  const cat = S.cat === "overall" || sc.cats.includes(S.cat) ? S.cat : "overall";
  const byCat = [...rows].sort((a, b) => ((cat === "overall" ? b.overall : b.cs[cat]) ?? -1) - ((cat === "overall" ? a.overall : a.cs[cat]) ?? -1));
  main.innerHTML = renderSetsBar(sets) + renderFilters(sc, rows) + renderTiles(sc, rows)
    + `<section><div class="sh"><h3>Best overall</h3><span class="muted small">${esc(activeDs().role)} · ${sc.kind === "attr" ? "attribute rating out of 20" : "score 0–100"}</span></div>${renderCards(sc, ranked.slice(0, 5))}</section>`
    + renderNeeds(sc, rows)
    + renderTiers(sc, rows)
    + `<section><div class="sh"><h3>Explore</h3></div>${renderChips(sc, cat)}</section>`
    + `<section class="grid2">
        <div class="panel"><div class="ph"><h3>Top 10 · ${esc(cat === "overall" ? scoreName(sc).toLowerCase() : sc.catLabel(cat))}</h3><span class="muted small">${cat === "overall" ? "bar split by what it's made of" : sc.kind === "attr" ? "out of 20" : "0–100, percentile-based"}</span></div>${byCat.length ? barChart(sc, byCat.slice(0, 10), cat) : `<p class="muted">No players match the filters.</p>`}</div>
        <div class="panel tablepanel">${renderTable(sc, rows)}</div>
      </section>`
    + renderScatterPanel(sc, rows, ranked)
    + renderWeights(sc)
    + renderColumns(sc);
  renderSaveNote();
  if (S.sel != null) { if (S.adOver && adHost() && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true)); else openPlayer(panelScore(sc), S.sel, true); } else closeDrawer(true);
}

function renderTabs() {
  document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", !S.guide && !S.dataPage && b.dataset.mode === S.mode));
  const gb = $("#guideBtn"); if (gb) gb.setAttribute("aria-pressed", !!S.guide);
  const db = $("#dataBtn"); if (db) db.setAttribute("aria-pressed", !!S.dataPage && !S.guide);
  if (S.mode === "scout") { $("#postabs").innerHTML = scoutTabsHtml(); return; }
  if (S.mode === "hub") { $("#postabs").innerHTML = hubTabsHtml(); return; }
  if (S.mode === "matches") { $("#postabs").innerHTML = mxTabsHtml(); return; }
  if (S.mode === "home" || S.mode === "learn") { $("#postabs").innerHTML = ""; return; }
  if (S.mode === "staff") {
    $("#postabs").innerHTML = staffTabsHtml();
    const st = $("#postabs [aria-selected=true]"); if (st) st.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }
  if (S.mode === "all") {
    const pc = SAVE ? savePos() : null, cnt = {};
    if (pc) { if (!AD.posCount) { AD.posCount = {}; POSITIONS.forEach((p, k) => { let c = 0; for (let i = 0; i < SAVE.n; i++) if (SAVE.name[i] && (pc.bits[i] & (1 << k))) c++; AD.posCount[p] = c; }); } Object.assign(cnt, AD.posCount); }
    $("#postabs").innerHTML = ["all", ...POSITIONS].map(p => `<button class="ptab" data-adpos="${p}" aria-selected="${!S.guide && !S.dataPage && (S.adPos || "all") === p}">${p === "all" ? "All" : p}${cnt[p] ? `<span class="pcount">${cnt[p] >= 1000 ? Math.round(cnt[p] / 1000) + "k" : cnt[p]}</span>` : ""}</button>`).join("");
    return;
  }
  if (S.mode === "squad") {
    const sq = squadDs();
    $("#postabs").innerHTML = ["Overview", "MyTactic", "Tactic", "Planner", "Review", "Roles", ...POSITIONS].map(p => {
      const n = sq && POSITIONS.includes(p) ? squadModelPlayers(sq).filter(x => isSenior(x) && posGroups(x.position || x.bestPos).includes(p)).length : 0;
      return `<button class="ptab" data-spos="${p}" aria-selected="${!S.guide && !S.dataPage && p === S.spos}">${p === "MyTactic" ? "My tactic" : p === "Tactic" ? "Suggested tactic" : p === "Review" ? "Season review" : p}${n ? `<span class="pcount">${n}</span>` : ""}</button>`;
    }).join("");
    const st = $("#postabs [aria-selected=true]"); if (st) st.scrollIntoView({ block: "nearest", inline: "nearest" });
    return;
  }
  $("#postabs").innerHTML = POSITIONS.map(p => {
    const n = tabSets(S.mode, p).length;
    return `<button class="ptab" data-pos="${p}" aria-selected="${!S.guide && !S.dataPage && p === S.pos}">${p}${n ? `<span class="pcount">${n}</span>` : ""}</button>`;
  }).join("");
  const at = $("#postabs [aria-selected=true]"); if (at) at.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function roleOptions(pos, sel) { return Object.keys(ROLES[pos]).map(r => `<option ${r === sel ? "selected" : ""}>${esc(r)}</option>`).join(""); }
function dsLabel(d) { const m = buildModel(d); return `${esc(d.role)} · ${m.players.length} players`; }
function renderSetsBar(sets) {
  const a = activeDs();
  let s = `<div class="setsbar">`;
  s += sets.map(d => `<button class="setchip" data-ds="${d.id}" aria-pressed="${a && d.id === a.id && !S.adding}">${d.example ? `<span class="exmark">Example</span>` : ""}${d.fromSave ? `<span class="exmark savemark">Save</span>` : ""}${dsLabel(d)}<span class="muted"> · ${esc(d.date)}${d.fromSave ? " · in-game date" : d.combined ? " · combined file" : ""}</span></button>`).join("");
  s += `<button class="addbtn" data-act="add">+ Add ${S.pos} export</button>`;
  if (a && !S.adding) s += `<span class="setctl"><label for="roleSel" class="small muted">Role</label><select id="roleSel">${roleOptions(S.pos, a.role)}</select><button class="ghost small" data-act="remove">Remove</button></span>`;
  return s + `</div>`;
}
function renderAdd(empty) {
  const isS = S.mode === "stats";
  return `<section class="panel addpanel">
    <h3>${empty ? `No ${S.pos} ${isS ? "stats" : "attributes"} loaded yet` : `Add ${S.pos} exports`}</h3>
    <p class="muted">In FM27 filter Player Search by position and role, show your view and press F7. Then choose the file(s) from <code>FM27PlayerExport/Exports CSV</code>, or paste one here.</p>
    <ul class="muted small addhelp">
      <li>One combined view (attributes + stats) fills both Stats and Attributes from one file.</li>
      <li>Two separate views: select both files at once and each goes to the right place.</li>
    </ul>
    <div class="addgrid">
      <label class="drop" for="fileIn"><input type="file" id="fileIn" multiple accept=".csv,.html,.htm,.txt"><span>Choose or drop .csv / .html exports (one or two)</span></label>
      <textarea id="pasteIn" placeholder="…or paste the CSV text here (header row included)"></textarea>
    </div>
    <div class="addrow">
      <label class="small muted" for="addRole">Role these files are for</label>
      <select id="addRole">${roleOptions(S.pos, "Balanced")}</select>
      <button class="primary" data-act="load">Load into ${S.pos}</button>
      ${empty ? "" : `<button class="ghost" data-act="cancel">Cancel</button>`}
    </div>
    ${S.addErr ? `<p class="err">${esc(S.addErr)}</p>` : ""}
    <p class="small muted savehint">Or skip the exports: <button class="linkbtn" data-act="datapage">load your FM save</button> and every tab fills at once.</p>
  </section>`;
}
function renderFilters(sc, rows) {
  const isS = sc.kind === "stats";
  const small = sc.pool < 30;
  const counts = {}; visibleRows(sc, true).forEach(r => { if (r.type) counts[r.type] = (counts[r.type] || 0) + 1; });
  const types = sc.types.slice().sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  return `<section class="filters">
    ${isS && sc.model.hasMins ? `<label class="fl"><span class="small muted">Min minutes <b id="mmv">${S.minMins}</b></span><input type="range" id="minMins" min="0" max="2000" step="50" value="${S.minMins}"></label>` : ""}
    <label class="fl"><span class="small muted">Max age</span><select id="maxAge">${[0, 19, 21, 23, 25, 28, 31].map(a => `<option value="${a}" ${a === S.maxAge ? "selected" : ""}>${a ? "≤ " + a : "Any"}</option>`).join("")}</select></label>
    <label class="fl grow"><span class="small muted">Find player or club</span><input type="search" id="q" value="${esc(S.q)}" placeholder="Name or club"></label>
    ${isS ? `<label class="fl toggle"><input type="checkbox" id="league" ${S.league ? "checked" : ""}><span>League strength adjustment</span></label>` : ""}
    <label class="fl toggle"><input type="checkbox" id="faOnly" ${S.faOnly ? "checked" : ""}><span>Free agents only${SAVE ? ` <span class="muted small">(${faCount(sc)})</span>` : ""}</span></label>
    <div class="typechips" role="group" aria-label="Player type"><span class="small muted">Player type</span><button class="tchip" data-type="" aria-pressed="${!S.type}">All</button>${types.map(t => `<button class="tchip" data-type="${esc(t)}" aria-pressed="${S.type === t}">${esc(t)} <span class="muted">${counts[t] || 0}</span></button>`).join("")}</div>
    ${attrFiltersHtml(sc)}
    <div class="poolnote ${small ? "warn" : ""}">${isS ? `Ranked against <b>${sc.pool}</b> of ${sc.total} players${sc.model.hasMins ? ` with ${S.minMins}+ mins` : ""}` : `Ranked against <b>${sc.pool}</b> players`}${rows.length !== sc.pool ? ` · showing ${rows.length}` : ""}${attrFilters(sc).length ? ` · ${attrFilters(sc).length} attribute filter${attrFilters(sc).length > 1 ? "s" : ""} on` : ""}${S.faOnly ? " · free agents only" : ""}${small ? " · small pool, rankings are rough" : ""}</div>
  </section>`;
}
function renderTiles(sc, rows) {
  const t = [];
  t.push(["Players shown", rows.length]);
  t.push(["Median age", median(rows.map(r => r.p.age)) ?? "–"]);
  t.push(["Median value", fmtMoney(median(rows.map(r => r.p.val)))]);
  const best = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall)[0];
  t.push([`Best ${scoreName(sc).toLowerCase()}`, best ? scoreFmt(sc, best.overall) : "–"]);
  t.push(["Bargains (half fair value or less)", rows.filter(r => r.vf != null && r.vf <= -50).length]);
  if (sc.kind === "stats") t.push(["Basic-stats league", rows.filter(r => r.p.basic).length]);
  return `<section class="tiles">${t.map(([l, v]) => `<div class="tile"><span class="tv">${esc(v)}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>`;
}
function renderCards(sc, top) {
  if (!top.length) return `<p class="muted">No players match the filters.</p>`;
  return `<div class="cards">${top.map(r => {
    const sp = stackParts(sc, r), mx = scoreMax(sc);
    const bar = sp ? `<span class="cstack" title="What the score is made of">${sc.stackKeys.map((k, j) => [j + 1, sp.parts[k] || 0]).concat([[0, sp.other]]).filter(x => x[1] > 0.01).map(x => `<span class="seg s${x[0]}" style="flex:${x[1].toFixed(3)}"></span>`).join("")}<span class="cgap" style="flex:${Math.max(0, mx - (r.overall || 0)).toFixed(3)}"></span></span>` : "";
    return `<button class="card" data-pid="${r.p.ix}">
      <span class="rank">#${r.rank ?? ""}${sc.role !== "Balanced" ? `<small class="rrole"> ${esc(sc.role)}</small>` : ""}</span>
      <span class="cname">${esc(r.p.name)}</span>
      <span class="cmeta">${esc(r.p.club || "No club")} · ${r.p.age ?? "?"} · ${esc(fmtMoney(r.p.val))}</span>
      <span class="cscore">${scoreFmt(sc, r.overall)}<small>${sc.kind === "attr" ? "/20" : ""}</small></span>
      ${bar}
      <span class="ctags">${r.p.club === FA_CLUB ? `<span class="tag good">Free agent</span>` : ""}${typeTag(r)}${vfTag(r)}${r.p.basic ? `<span class="tag warn">Basic stats</span>` : ""}</span>
    </button>`;
  }).join("")}</div>${sc.stackKeys ? stackLegend(sc) : ""}`;
}
function renderNeeds(sc, rows) {
  const cards = sc.cats.map(c => {
    const top = rows.filter(r => r.cs[c] != null).sort((a, b) => b.cs[c] - a.cs[c]).slice(0, 5);
    if (!top.length) return "";
    const mx = scoreMax(sc);
    return `<div class="need"><h4>${esc(sc.catLabel(c))}</h4>${top.map((r, i) => `<button class="nrow" data-pid="${r.p.ix}" data-tip="${esc(r.p.name + " · " + (r.p.club || "no club") + "\n" + sc.catLabel(c) + ": " + scoreFmt(sc, r.cs[c]) + " · " + scoreName(sc) + ": " + scoreFmt(sc, r.overall))}"><span class="nn">${i + 1}. ${esc(r.p.name)}</span><span class="nt"><span style="width:${(r.cs[c] / mx * 100).toFixed(1)}%"></span></span><span class="nv">${scoreFmt(sc, r.cs[c])}</span></button>`).join("")}</div>`;
  }).join("");
  return `<section><div class="sh"><h3>Best for each need</h3><span class="muted small">top 5 per ${sc.kind === "attr" ? "attribute group" : "category"}</span></div><div class="needs">${cards}</div></section>`;
}
function renderTiers(sc, rows) {
  const tiers = [
    [`Under ${CUR}1M`, r => r.p.val != null && r.p.val < 1e6],
    [`${CUR}1M – ${CUR}5M`, r => r.p.val != null && r.p.val >= 1e6 && r.p.val < 5e6],
    [`Over ${CUR}5M`, r => r.p.val != null && r.p.val >= 5e6],
    ["Age 21 or under", r => r.p.age != null && r.p.age <= 21],
    ["Age 23 or under", r => r.p.age != null && r.p.age <= 23],
  ];
  const ranked = rows.filter(r => r.overall != null).sort((a, b) => b.overall - a.overall);
  return `<section><div class="sh"><h3>Best by budget and age</h3><span class="muted small">top 3 by ${scoreName(sc).toLowerCase()}</span></div><div class="tiers">${tiers.map(([l, f]) => {
    const top = ranked.filter(f).slice(0, 3);
    return `<div class="tier"><h4>${esc(l)}</h4>${top.length ? top.map(r => `<button class="trow" data-pid="${r.p.ix}"><span class="tn">${esc(r.p.name)}</span><span class="tm">${r.p.age ?? "?"} · ${esc(fmtMoney(r.p.val))}</span><b>${scoreFmt(sc, r.overall)}</b></button>`).join("") : `<p class="muted small">Nobody here.</p>`}</div>`;
  }).join("")}</div></section>`;
}
function renderChips(sc, cat) {
  return `<nav class="chips" aria-label="Category">${[["overall", scoreName(sc)], ...sc.cats.map(c => [c, sc.catLabel(c)])]
    .map(([c, l]) => `<button class="chip" data-cat="${c}" aria-pressed="${c === cat}">${esc(l)}</button>`).join("")}</nav>`;
}
function renderTable(sc, rows) {
  const isS = sc.kind === "stats";
  const lk = linkedScore(sc);
  rows.forEach(r => { const l = lk ? linked(sc, r.p) : null; r.lk = l ? l.r : null; });
  const hasLk = rows.some(r => r.lk && r.lk.overall != null);
  const ga = isS && sc.model.hasMins && (sc.model.metrics.includes("gls90") || sc.model.metrics.includes("ast90"));
  const hasFair = rows.some(r => r.vf != null);
  const sk = S.sort || (S.cat === "overall" || !sc.cats.includes(S.cat) ? "overall" : S.cat);
  const sorted = [...rows].sort((a, b) => {
    const x = sortVal(a, sk), y = sortVal(b, sk);
    if (typeof x === "string" || typeof y === "string") return S.sortDir * -String(x ?? "").localeCompare(String(y ?? ""));
    return S.sortDir * ((x ?? -1e9) - (y ?? -1e9));
  });
  const shown = S.showAll ? sorted.slice(0, 1000) : sorted.slice(0, 50);
  const th = (k, l, cls = "", title = "") => `<th class="${cls} ${sk === k ? "sorted" : ""}" data-sort="${k}" aria-sort="${sk === k ? (S.sortDir < 0 ? "descending" : "ascending") : "none"}"${title ? ` title="${esc(title)}"` : ""}><button>${esc(l)}${sk === k ? (S.sortDir < 0 ? " ↓" : " ↑") : ""}</button></th>`;
  const hasCapa = true; // CA / PA always shown (– when the file has none)
  let s = `<div class="tscroll"><table class="heat"><thead><tr><th class="num">#</th>${th("name", "Player", "left")}${th("type", "Type", "left")}${th("age", "Age", "num")}${hasCapa ? th("ca", "CA", "num", "Current ability (1–200), hidden in FM, from your save") + th("pa", "PA", "num", "Potential ability (1–200), hidden in FM, from your save") : ""}${isS && sc.model.hasMins ? th("mins", "Mins", "num") : ""}${ga ? th("goals", "G", "num") + th("assists", "A", "num") : ""}${th("value", "Value", "num")}${hasFair ? th("vf", "vs fair", "num", "Transfer value compared with players of similar score and age in this pool. −60% = 60% cheaper than fair; ×3.0 = three times fair.") : ""}${th("overall", isS ? "Score" : "Rating", "num strong")}${hasLk ? th("lk", isS ? "Attr." : "Stats", "num", isS ? "His attribute rating for this role, out of 20, from your attributes file (not league-adjusted)" : "His stats score for this role, 0–100, from your stats file") : ""}`;
  s += sc.cats.map(c => th(c, sc.catLabel(c), "num cat")).join("") + (sc.model.hasRec ? `<th class="left"><button>Scout</button></th>` : "") + `</tr></thead><tbody>`;
  shown.forEach((r, i) => {
    const p = r.p;
    const vf = vfText(r);
    s += `<tr data-pid="${p.ix}" class="${S.sel === p.ix ? "rsel" : ""}"><td class="num muted">${i + 1}</td>
      <td class="left pl"><span class="pn">${starForP(p)}${esc(p.name)}${p.inf ? `<span class="inf">${esc(p.inf)}</span>` : ""}${p.basic ? `<span class="inf basic" title="FM doesn't record detailed stats in this league">Basic stats</span>` : ""}</span><span class="pc">${esc(p.club || "No club")}${isS && p.div && p.div !== "-" ? " · " + esc(p.div) : ""}</span></td>
      <td class="left ty">${esc(r.type || "–")}</td>
      <td class="num">${p.age ?? "–"}</td>${hasCapa ? (() => { const c = capaOf(p); return `<td class="num hc" style="background:${c ? heat(Math.min(100, Math.max(0, (c[0] - 60) / 1.2))) : "transparent"}">${c ? c[0] : "–"}</td><td class="num hc" style="background:${c && c[1] ? heat(Math.min(100, Math.max(0, (c[1] - 60) / 1.2))) : "transparent"}">${c && c[1] ? c[1] : "–"}</td>`; })() : ""}${isS && sc.model.hasMins ? `<td class="num">${p.mins ?? "–"}</td>` : ""}${ga ? `<td class="num">${tot(p, "gls90") ?? "–"}</td><td class="num">${tot(p, "ast90") ?? "–"}</td>` : ""}<td class="num" title="${esc(p.valTxt)}">${esc(fmtMoney(p.val))}</td>
      ${hasFair ? `<td class="num ${r.vf != null && r.vf <= -50 ? "good" : r.vf != null && r.vf >= 100 ? "bad" : ""}" title="${r.fair ? "Fair value ~" + esc(fmtMoney(r.fair)) : ""}">${vf}</td>` : ""}
      <td class="num strong">${scoreFmt(sc, r.overall)}</td>${hasLk ? `<td class="num" title="${r.lk && r.lk.orank != null ? pctTxt(r.lk.orank) + " of that pool" : "Not in the other file"}">${r.lk && r.lk.overall != null ? (isS ? r.lk.overall.toFixed(1) : Math.round(r.lk.overall)) : "–"}</td>` : ""}`;
    sc.cats.forEach(c => { const v = r.cs[c]; s += `<td class="num hc" style="background:${heat(sc.kind === "attr" ? attrPct(v) : v)}" title="${esc(sc.catLabel(c))}: ${scoreFmt(sc, v)}">${scoreFmt(sc, v)}</td>`; });
    if (sc.model.hasRec) s += `<td class="left small">${esc(p.rec || "–")}</td>`;
    s += `</tr>`;
  });
  s += `</tbody></table></div>`;
  if (sorted.length > 50) s += `<button class="ghost more" data-act="showall">${S.showAll ? "Show top 50" : sorted.length > 1000 ? `Show top 1,000 of ${sorted.length.toLocaleString()}` : `Show all ${sorted.length}`}</button>${S.showAll && sorted.length > 1000 ? `<p class="small muted">Everyone, with filters on every number: the All data tab.</p>` : ""}`;
  return s;
}
function renderScatterPanel(sc, rows, ranked) {
  const opts = axisOptions(sc);
  const kx = opts.some(o => o[0] === S.sx) ? S.sx : "value";
  const ky = opts.some(o => o[0] === S.sy) ? S.sy : "overall";
  const sel = (id, v) => `<select id="${id}">${opts.map(o => `<option value="${o[0]}" ${o[0] === v ? "selected" : ""}>${esc(o[1])}</option>`).join("")}</select>`;
  const vs = kx === "value" && ky === "overall";
  return `<section class="panel"><div class="ph"><h3>Scatter</h3><div class="axsel"><label class="small muted" for="sx">X</label>${sel("sx", kx)}<label class="small muted" for="sy">Y</label>${sel("sy", ky)}</div></div>
    <p class="muted small">${vs ? "Above the fair price line = better than the price suggests. " : ""}Dashed lines are the medians.${sc.kind === "stats" && sc.model.hasMins ? " Bigger dot = more minutes." : ""} Labelled: top 6. Use Player type above to show one type only.</p>
    <div class="sscroll">${scatter(sc, rows, kx, ky, ranked.slice(0, 6))}</div></section>`;
}
function spearman(x, y) {
  const idx = x.map((v, i) => i).filter(i => x[i] != null && y[i] != null);
  if (idx.length < 15) return null;
  const rx = pctRanks(idx.map(i => x[i])), ry = pctRanks(idx.map(i => y[i]));
  const n = rx.length, mx = rx.reduce((a, b) => a + b, 0) / n, my = ry.reduce((a, b) => a + b, 0) / n;
  let s = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { const a = rx[i] - mx, b = ry[i] - my; s += a * b; sx += a * a; sy += b * b; }
  return sx && sy ? s / Math.sqrt(sx * sy) : null;
}
function renderWeights(sc) {
  if (sc.kind === "stats") {
    const list = Object.entries(sc.mw).sort((a, b) => b[1] - a[1]);
    const maxw = maxOf(list.map(x => x[1]));
    const hasRating = sc.model.metrics.includes("rating");
    const pool = sc.rows.filter(r => !r.p.basic);
    const rating = pool.map(r => r.p.m.rating);
    const rows = list.map(([k, w]) => {
      let c = hasRating ? spearman(pool.map(r => r.p.m[k]), rating) : null;
      if (c != null && METRICS[k].inv) c = -c;
      const base = (IMPACT[sc.pos] || {})[k];
      return `<tr><td class="left">${esc(METRICS[k].l)}</td><td class="left muted">${TIER_NAME[base] || ""}</td><td><span class="wbar"><span style="width:${(w / maxw * 100).toFixed(0)}%"></span></span></td><td class="num">${w.toFixed(1)}</td>
        <td>${c == null ? `<span class="muted">–</span>` : `<span class="cbar"><span class="${c >= 0 ? "pos" : "neg"}" style="${c >= 0 ? "left:50%" : "right:50%"};width:${(Math.abs(c) * 50).toFixed(0)}%"></span></span>`}</td><td class="num">${c == null ? "" : (c > 0 ? "+" : "") + c.toFixed(2)}</td></tr>`;
    }).join("");
    return `<details class="panel weights"><summary><h3>How the score works</h3><span class="muted small">${esc(sc.role)} · ${list.length} stats weighted</span></summary>
      <p class="small muted">Each stat becomes a percentile in this pool (league-adjusted). The role score is their weighted average. Tier 1 = stats that most directly create or prevent goals for this position; the role you pick tilts the weights toward its main categories. Then small samples (under ~1,350 mins) and missing stats ease the score toward 50.</p>
      ${hasRating ? `<p class="small muted">Last column: how much each stat agrees with FM's average match rating in this pool (−1 to +1, players with full stats). FM's rating leans heavily on goals and assists, so it's a check, not the target.</p>` : ""}
      <div class="tscroll"><table class="wtable"><thead><tr><th class="left">Stat</th><th class="left">Tier</th><th colspan="2" class="left">Weight for ${esc(sc.role)}</th>${hasRating ? `<th colspan="2" class="left">Agrees with match rating</th>` : ""}</tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }
  const list = Object.entries(sc.weights).sort((a, b) => b[1] - a[1]), maxw = list[0] ? list[0][1] : 1;
  return `<details class="panel weights"><summary><h3>How the rating works</h3><span class="muted small">${esc(sc.role)} · ${list.length} attributes weighted</span></summary>
    <p class="small muted">Role rating = weighted average of the attributes below (out of 20). Weights = the role's key (×3) and preferred (×1.5) attributes plus a baseline for the attributes that matter most in the FM27 engine (fm-arena test: Acceleration, Pace, Jumping Reach, Work Rate, Stamina, Anticipation, Strength), adjusted up or down by how much each matters in FM27.</p>
    <div class="tscroll"><table class="wtable"><thead><tr><th class="left">Attribute</th><th colspan="2" class="left">Weight</th></tr></thead><tbody>${list.map(([a, w]) => `<tr><td class="left">${esc(a)}</td><td><span class="wbar"><span style="width:${(w / maxw * 100).toFixed(0)}%"></span></span></td><td class="num">${w.toFixed(1)}</td></tr>`).join("")}</tbody></table></div></details>`;
}
function renderColumns(sc) {
  const m = sc.model;
  const rec = sc.kind === "stats" ? m.metrics.length + " stats" : m.attrs.length + " attributes";
  return `<details class="cols"><summary>Columns: ${rec} recognised${m.unused.length ? `, ${m.unused.length} not used` : ""}</summary>
    <p class="small muted">Used: ${sc.kind === "stats" ? m.metrics.map(k => esc(METRICS[k].l)).join(", ") : m.attrs.map(esc).join(", ")}</p>
    ${m.unused.length ? `<p class="small muted">Not used: ${m.unused.map(esc).join(", ")}</p>` : ""}</details>`;
}
