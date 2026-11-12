// ---------- player drawer ----------
function openPlayer(sc, pid, silent) {
  const r = sc.rows.find(x => x.p.ix === pid);
  const dr = $("#drawer");
  if (!r) { closeDrawer(true); return; }
  S.sel = pid;
  const p = r.p, isS = sc.kind === "stats", mx = scoreMax(sc);
  const cmp = S.cmp != null ? sc.rows.find(x => x.p.ix === S.cmp) : null;
  const st = strengths(sc, r);
  const fmtS = v => scoreFmt(sc, v);
  const gap = [], g = v => isS ? v.toFixed(1) : v.toFixed(2);
  if (r.below) gap.push(`${g(r.overall - r.below.overall)} ahead of #${r.rank + 1}`);
  if (r.above) gap.push(`${g(r.above.overall - r.overall)} behind #${r.rank - 1}`);
  const info = [p.position && p.position !== p.bestPos ? "Positions " + p.position : "", p.pers ? "Personality " + p.pers : "", p.foot ? "Foot " + p.foot : "", p.height ? p.height : "", p.wage ? "Wage " + p.wage : "", p.apps ? p.apps + " apps" : ""].filter(Boolean);
  // FM-style profile banner: name, position, age and club on the left; key numbers and actions; the panel fills the window
  const si = SAVE && p.uid ? saveUidIndex().get(String(p.uid).startsWith("s") ? String(p.uid) : "s" + p.uid) : null;
  const cEnd = si != null && SAVE.cEnd && SAVE.cEnd[si] && typeof sDate === "function" ? sDate(SAVE.cEnd[si]) : null;
  const tile = (v, l, cls) => `<div class="tile"><span class="tv ${cls || ""}">${v}</span><span class="tl">${l}</span></div>`;
  let h = `<header class="phero">
    <div class="dhead pbanner">
      <div class="pident">${pBackHtml()}<h2>${starForP(p)}${esc(p.name)}</h2>
        <p class="psub">${p.bestPos ? `<b>${esc(p.bestPos)}</b>` : ""}${p.age != null ? ` · ${p.age} years old` : ""}${p.nat ? ` · ${esc(p.nat)}` : ""}${p.foot ? ` · ${esc(p.foot)} foot` : ""}${p.height ? ` · ${esc(p.height)}` : ""}</p>
        ${p.position && p.position !== p.bestPos ? `<p class="small muted">Positions ${esc(p.position)}${p.pers ? " · " + esc(p.pers) : ""}</p>` : p.pers ? `<p class="small muted">${esc(p.pers)}</p>` : ""}
        <p class="pacts">${SAVE && p.uid && saveUidIndex().has(p.uid) ? `<button class="linkbtn small" data-simfor="${esc(p.uid)}">Find similar players ↓</button>` : ""}${typeof cmpPanelHtml === "function" ? " " + cmpPanelHtml(p) : ""}</p>${youthNote(p)}</div>
      <div class="pclub"><b>${esc(p.club || "No club")}</b>${p.div && p.div !== "-" ? `<span class="small muted">${esc(p.div)}${isS && p.lg ? ` · strength ${p.lg.k.toFixed(2)}${S.league ? "" : " (adjustment off)"}` : ""}</span>` : ""}${typeof slPanelHtml === "function" ? slPanelHtml(p) : ""}</div>
      <button class="ghost close" data-act="close" aria-label="Close" title="Close (Esc)">✕</button></div>
  </header><div class="pbelow">
    <div class="ptiles dtiles">
      ${tile(`${fmtS(r.overall)}${isS ? "" : "<small>/20</small>"}`, esc(sc.role), "acc")}
      ${tile(`#${r.rank ?? "–"}<small> of ${sc.ranked.length}</small>`, `${esc(sc.role === "Balanced" ? "overall" : sc.role)}${r.orank != null ? " · " + pctTxt(r.orank) : ""}`)}
      ${tile(r.fair ? esc(fmtMoney(r.fair)) : "–", "Fair value")}
      ${tile(esc(p.valTxt || "–"), "Value")}
      ${p.wage ? tile(esc(p.wage), "Wage") : ""}
      ${cEnd ? tile(cEnd.toLocaleDateString("en-GB", { month: "short", year: "numeric" }), "Contract ends") : ""}
      ${isS && p.mins != null ? tile(p.mins, "Minutes") : ""}${p.apps ? tile(esc(p.apps), "Apps") : ""}
    </div>
    <div class="pctl"><div class="drole"><label for="drawerRole" class="small muted">Role</label><select id="drawerRole">${roleOptions(sc.pos, sc.role)}</select>${S.pRole && S.pRole !== pageRole() ? `<span class="small muted">this panel only · page stays on ${esc(pageRole())}</span><button class="ghost small" data-act="prolereset">Back to ${esc(pageRole())}</button>` : `<span class="small muted">changes this panel only</span>`}</div>
      ${S._adPanel ? `<p class="small"><button class="linkbtn" data-act="adgo">Open him in the ${esc(S.pos)} ${S.mode === "stats" ? "Stats" : "Attributes"} tab</button> <span class="muted">(this panel sits over the page you were on)</span></p>` : ""}
      <div class="badges">${p.club === FA_CLUB ? `<span class="tag good">Free agent: no transfer fee</span>` : ""}${typeTag(r)}${vfTag(r, true)}${gap.length ? `<span class="tag">${esc(gap.join(" · "))}</span>` : ""}
      ${p.mine ? `<span class="tag good">Your squad</span>` : p.ref ? `<span class="tag">From your ${esc(sc.pos)} scouting file</span>` : ""}
      ${p.rec ? `<span class="tag">Scout: ${esc(p.rec)}</span>` : ""}
      ${isS && p.basic ? `<span class="tag warn">Basic-stats league: only goals, xG, xA, shots counted</span>` : ""}</div></div>
    ${S.mode === "stats" || S.mode === "attr" ? `<div class="rranks" id="rranks" data-pix="${esc(String(p.ix))}"><span class="small muted">His rank in every role…</span></div>` : ""}
  </div>`;
  // three columns: who he is | how good he is | the numbers
  const head0 = h; let c1 = "", c2 = "", c3 = "";
  if (typeof playerCard === "function") c1 += playerCard(sc, r);
  c1 += capaHtml(p) + positionMapHtml(p) + (typeof posSwitchHtml === "function" ? posSwitchHtml(p, S.adCtx && S._adPanel ? S.adCtx.pos : sc.pos) : "");
  if (typeof playedHtml === "function") c1 += playedHtml(p);
  if (typeof traitsHtml === "function") c1 += traitsHtml(p, sc);
  h = "";   // the middle column is built in h below, then moved
  // how to read him: output (stats) against ability (attributes)
  const ln = linked(sc, p);
  if (ln && r.overall != null && ln.r.overall != null && r.orank != null && ln.r.orank != null) {
    const sr = isS ? r : ln.r, ar = isS ? ln.r : r, sP = sr.orank, aP = ar.orank, lg = sr.p.lg;
    const weakLg = lg && lg.k < 0.75 && sr.p.div && sr.p.div !== "-";
    const lgTxt = weakLg ? ` His league (${esc([sr.p.country, sr.p.div].filter(Boolean).join(" "))}, strength ${lg.k.toFixed(2)}) is well below the Premier League; his stats are already discounted for it, but players who dominate a weak league often lose output when they step up.` : "";
    let cls = "", head, body;
    if (sP >= 70 && aP >= 70) { cls = "good"; head = "Strong on both"; body = `He produces (stats ${pctTxt(sP)}) and has the ability for it (attributes ${pctTxt(aP)}). The safest signal.`; }
    else if (sP - aP >= 25 && sP >= 60) { cls = "warn"; head = "Output ahead of ability"; body = `Stats ${pctTxt(sP)}, but attributes ${pctTxt(aP)} of this pool. He is getting more out of his level than his attributes suggest: a weaker league or team, a role that suits him, or a hot run.${lgTxt} His attributes are what he takes to a better side, so check the underlined key ones before buying.`; }
    else if (aP - sP >= 25 && aP >= 60) { cls = "warn"; head = "Ability ahead of output"; body = `Attributes ${pctTxt(aP)}, but stats ${pctTxt(sP)}. Often the wrong role, a struggling team or few minutes (${sr.p.mins ?? 0} here). A possible buy-low if the reason is his club, not him.`; }
    else if (sP < 35 && aP < 35) { cls = "bad"; head = "Weak on both"; body = `Stats ${pctTxt(sP)}, attributes ${pctTxt(aP)}.`; }
    else if (sP >= 50 && aP >= 50) { head = "Good on both"; body = `Above the middle of this pool on output (stats ${pctTxt(sP)}) and ability (attributes ${pctTxt(aP)}), without being elite on either.`; }
    else { head = "Mixed"; body = `Stats ${pctTxt(sP)}, attributes ${pctTxt(aP)} of this pool. Neither stands out on its own; compare him with the players around him.`; }
    h += `<div class="readbox ${cls}"><h5>How to read him · ${head}</h5><p>${body}</p><p class="small muted">Attributes (out of 20) are FM's own scale and are not league-adjusted, so you can compare them directly with your own players. Stats are ranked against this file's players after the league adjustment.</p></div>`;
  }
  // strengths / weaknesses
  h += `<div class="sw2">${st.good.length || (st.stand && st.stand.length) ? `<div><h5>Stands out</h5>${(st.stand || []).map(x => `<span class="chipg">${esc(x)}</span>`).join("")}${st.good.map(x => `<span class="chipg">${esc(x)}</span>`).join("")}</div>` : ""}
    ${st.bad.length ? `<div><h5>Weak spots</h5>${st.bad.map(x => `<span class="chipb">${esc(x)}</span>`).join("")}</div>` : ""}</div>`;
  // why
  h += `<h4>Why he scores ${fmtS(r.overall)}</h4>${waterfall(contributions(sc, r))}`;
  // role fit
  if (r.fits && r.fits.length) h += `<h4>${isS ? "Output fits these roles" : "Best roles by attributes"}</h4><div class="fits">${r.fits.map(([n, v], i) => fitChip(sc, n, isS ? Math.round(v) : v.toFixed(1), i === 0)).join("")}</div><p class="small muted">His best 3 roles in this position, only from roles FM offers where he is listed (best across every position he plays: My squad › Roles). Tap one to see him in it; this panel only.</p>`;
  // compare
  const opts = sc.ranked.filter(x => x.p.ix !== pid).slice(0, 80);
  h += `<h4>Compare</h4><div class="cmpline"><label class="small muted" for="cmpSel">With</label><select id="cmpSel"><option value="">Nobody</option>${opts.map(x => `<option value="${x.p.ix}" ${S.cmp === x.p.ix ? "selected" : ""}>#${x.rank} ${x.p.mine ? "★ " : ""}${esc(x.p.name)} (${fmtS(x.overall)})</option>`).join("")}</select>${r.above ? `<button class="ghost small" data-act="cmpabove">vs #${r.rank - 1}</button>` : ""}</div>${SAVE && p.uid && saveUidIndex().has(p.uid) ? `<p class="small muted">This list is the top 80 in this position. <button class="linkbtn" data-cmpgo="${esc(p.uid)}">Compare with anyone →</button></p>` : ""}`;
  if (cmp) h += h2h(sc, r, cmp);
  const axes = sc.cats.map(c => sc.catLabel(c));
  const series = [{ v: isS ? sc.cats.map(() => 50) : sc.cats.map(c => median(sc.rows.map(x => x.cs[c]))), cls: "avg" }];
  if (cmp) series.push({ v: sc.cats.map(c => cmp.cs[c]), cls: "cmp", dots: true, fmt: fmtS });
  series.push({ v: sc.cats.map(c => r.cs[c]), cls: "me", dots: true, fmt: fmtS });
  h += radar(axes, series, mx) + `<p class="legend small"><span class="lg me"></span>${esc(p.name)}${cmp ? `<span class="lg cmp"></span>${esc(cmp.p.name)}` : ""}<span class="lg avg"></span>Pool ${isS ? "median (50)" : "median"}</p>`;
  c2 = h; h = "";
  // where he sits
  h += `<h4>Where he sits in the pool</h4>${spread(sc, r)}`;
  if (isS) {
    h += `<h4>Every stat</h4>`;
    sc.cats.forEach(c => {
      h += `<div class="catblock"><div class="cathead"><span>${esc(sc.catLabel(c))}</span><b>${fmtS(r.cs[c])}</b></div>`;
      if (c === "output" && p.mins > 0) {
        const g = tot(p, "gls90"), ng = tot(p, "npg90"), a = tot(p, "ast90");
        const bits = [g != null ? `<b>${g}</b> goal${g === 1 ? "" : "s"}${ng != null && ng !== g ? ` (${ng} non-pen)` : ""}` : ng != null ? `<b>${ng}</b> non-penalty goals` : "", a != null ? `<b>${a}</b> assist${a === 1 ? "" : "s"}` : "", `${p.mins} mins`].filter(Boolean);
        h += `<div class="gasum">${bits.join(" · ")}</div>`;
      }
      const keys = Object.keys(CATS[c].m).filter(k => k in r.mp);
      const hi = keys.filter(k => !METRICS[k].inv), lo = keys.filter(k => METRICS[k].inv);
      const mrow = k => {
        const pv = r.mp[k];
        const tt = totTxt(k, p);
        return `<div class="mrow" title="Percentile ${pv == null ? "–" : Math.round(pv)}${METRICS[k].inv ? " (lower is better, so a high percentile means he does it less)" : ""}"><span class="mlab">${esc(METRICS[k].l)}</span><span class="mval">${fmtVal(k, p.m[k])}${tt ? `<small class="mtot">${tt}</small>` : ""}</span><span class="mtrack"><span style="width:${pv ?? 0}%;background:${heat(pv)}"></span></span><span class="mpct">${pv == null ? "–" : Math.round(pv)}</span></div>`;
      };
      if (hi.length && lo.length) h += `<div class="mgroup">Higher is better</div>`;
      hi.forEach(k => { h += mrow(k); });
      if (lo.length) h += `<div class="mgroup">Lower is better</div>`;
      lo.forEach(k => { h += mrow(k); });
      h += `</div>`;
    });
    h += `<p class="small muted">Right-hand number = percentile in the pool${S.league ? ", after league adjustment" : ""}. For "lower is better" stats it is flipped, so a high number still means good (he does it less than most).</p>`;
  } else h += `<h4>Attributes</h4>` + attrGrid(p, sc.weights);
  if (ln) {
    const o = ln.sc, lr = ln.r;
    h += `<h4>${o.kind === "attr" ? "Attributes" : "Stats"} view for ${esc(sc.role)}</h4><div class="badges"><span class="tag"><b>${scoreFmt(o, lr.overall)}${o.kind === "attr" ? "/20" : ""}</b> ${scoreName(o).toLowerCase()}</span>${lr.orank != null ? `<span class="tag">${pctTxt(lr.orank)} of that pool</span>` : ""}${typeTag(lr)}</div>`;
    o.cats.forEach(c => { const v = lr.cs[c], pc = o.kind === "attr" ? attrPct(v) : v; h += `<div class="mrow"><span class="mlab">${esc(o.catLabel(c))}</span><span class="mval">${scoreFmt(o, v)}</span><span class="mtrack"><span style="width:${pc ?? 0}%;background:${heat(pc)}"></span></span><span class="mpct"></span></div>`; });
    if (o.kind === "attr") { if (lr.fits.length) h += `<div class="fits">${lr.fits.map(([n, v], i) => fitChip(sc, n, v.toFixed(1), i === 0)).join("")}</div><p class="small muted">His best 3 roles by attributes here. Tap one to see him in it; this panel only.</p>`; h += attrGrid(lr.p, o.weights); }
  } else h += `<p class="muted small linknote">Load a ${sc.pos} ${isS ? "attributes" : "stats"} export too and this player's ${isS ? "attribute rating" : "stats"} will show here.</p>`;
  h += seasonsHtml(p);
  c3 = h;
  const sim = typeof simHtml === "function" ? simHtml(p, sc.pos) : "";
  dr.innerHTML = head0 + `<div class="pgrid"><div class="pcol">${c1}</div><div class="pcol">${c2}</div><div class="pcol">${c3}</div></div>${sim ? `<div class="pwide">${sim}</div>` : ""}`;
  dr.classList.add("pfull");
  dr.hidden = false; $("#scrim").hidden = false;
  if (!silent) dr.scrollTop = 0;
  document.querySelectorAll("tr[data-pid]").forEach(tr => tr.classList.toggle("rsel", +tr.dataset.pid === pid));
}
function fitChip(sc, name, val, first) {
  return `<button class="fit ${first ? "first" : ""} ${name === sc.role ? "cur" : ""}" data-role="${esc(name)}" title="${name === sc.role ? "Current role" : "See him as " + esc(name)}">${esc(name)} <b>${val}</b></button>`;
}
// switch role from the player panel (or a role chip): squad tab role, or the loaded file's role on Stats / Attributes
function setRole(role) {
  if (S.mode === "squad") { if (!POSITIONS.includes(S.spos)) return; S.squadRole = { ...S.squadRole, [S.spos]: role }; }
  else { const a = activeDs(); if (!a) return; a.role = role; saveDatasets(); }
  S.pRole = null;
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
// the role the page (tab) is scored for
function pageRole() { const sc = currentScore(); return sc ? sc.role : "Balanced"; }
// role picked inside the player panel: rescore only the panel, keep both scroll positions
function setPanelRole(role) {
  if (S.sel == null) return;
  if (adHost() && S.adCtx && !S._adPanel) return inAdCtx(() => setPanelRole(role));
  S.pRole = role === pageRole() ? null : role;
  const dr = $("#drawer"), top = dr.scrollTop;
  openPlayer(panelScore(), S.sel, true);
  dr.scrollTop = top;
}
// season total behind a per-90 number (goals, assists, tackles... xG to one decimal)
function totTxt(k, p) {
  if (!/90$/.test(k) || !p.mins || p.m[k] == null || k === "tgls90" || k === "tcon90") return "";
  const t = p.m[k] * p.mins / 90;
  if (k === "dist90") return Math.round(t) + " km";
  return (/^(np)?x|xgp/.test(k) ? t.toFixed(1) : Math.round(t)) + " total";
}
function attrGrid(p, weights) {
  const groups = [["Technical", ATTRS.technical], ["Mental", ATTRS.mental], ["Physical", ATTRS.physical], ["Goalkeeping", ATTRS.goalkeeping]];
  const top = new Set(Object.entries(weights).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]));
  return `<div class="agrid">${groups.filter(([, l]) => l.some(a => p.a[a] != null)).map(([g, l]) => `<div><h5>${g}</h5>${l.filter(a => p.a[a] != null).map(a => `<div class="arow ${top.has(a) ? "key" : ""}"><span>${esc(a)}</span><b style="color:${attrColor(p.a[a])}">${Math.round(p.a[a])}</b></div>`).join("")}</div>`).join("")}</div>
  <p class="muted small">Underlined: the attributes that weigh most for this role.</p>`;
}
// ---------- back button in the player panel: opening a player from inside the panel remembers where you were ----------
S.pStack = [];
function pPush() {
  const dr = $("#drawer"); if (!dr || dr.hidden || S.sel == null) return;
  const h = dr.querySelector(".dhead h2");
  S.pStack.push({ active: { ...S.active }, sel: S.sel, adCtx: S.adCtx ? { ...S.adCtx } : null, adOver: S.adOver, pRole: S.pRole, simFor: S.simFor, simPos: S.simPos, simMore: S.simMore, top: dr.scrollTop, name: h ? h.textContent.replace(/^☆|^★/, "").trim() : "" });
  if (S.pStack.length > 20) S.pStack.shift();
}
function pBack() {
  const x = S.pStack.pop(); if (!x) return;
  S.active = x.active; clearCaches();
  Object.assign(S, { sel: x.sel, adCtx: x.adCtx, adOver: x.adOver, pRole: x.pRole, simFor: x.simFor, simPos: x.simPos, simMore: x.simMore });
  const open = () => openPlayer(panelScore(), S.sel, true);
  if (S.adCtx) inAdCtx(open); else open();
  const dr = $("#drawer"); dr.scrollTop = x.top;
}
const pBackHtml = () => S.pStack && S.pStack.length ? `<button class="ghost small pback" data-act="pback">← Back to ${esc(S.pStack[S.pStack.length - 1].name || "previous player")}</button>` : "";
function closeDrawer(silent) { $("#drawer").hidden = true; $("#drawer").classList.remove("pfull"); $("#scrim").hidden = true; if (!silent) { S.pStack = []; if (S.adOver) { S.adOver = null; S.adCtx = null; } S.sel = null; S.sSel = null; S.cmp = null; S.pRole = null; document.querySelectorAll("tr.rsel").forEach(t => t.classList.remove("rsel")); document.querySelectorAll("tr.rsel").forEach(t => t.classList.remove("rsel")); } }

// ---------- position map: FM's 1-20 rating at every position, on a pitch like FM's profile ----------
// spots: [code, x %, y %] on a pitch with his own goal on the left (left flank at the top, as FM draws it)
const PITCH_SPOTS = [["GK", 6, 50], ["DL", 23, 14], ["DC", 23, 50], ["DR", 23, 86], ["WBL", 39, 10], ["DM", 39, 50], ["WBR", 39, 90], ["ML", 56, 14], ["MC", 56, 50], ["MR", 56, 86], ["AML", 73, 14], ["AMC", 73, 50], ["AMR", 73, 86], ["STC", 90, 50]];
const POS_LABEL = { GK: "GK", DL: "D (L)", DC: "D (C)", DR: "D (R)", WBL: "WB (L)", DM: "DM", WBR: "WB (R)", ML: "M (L)", MC: "M (C)", MR: "M (R)", AML: "AM (L)", AMC: "AM (C)", AMR: "AM (R)", STC: "ST (C)" };
const POS_LABEL_SHORT = { GK: "GK", DL: "DL", DC: "DC", DR: "DR", WBL: "WBL", DM: "DM", WBR: "WBR", ML: "ML", MC: "MC", MR: "MR", AML: "AML", AMC: "AMC", AMR: "AMR", STC: "ST" };
const POS_FIT = [[18, "Natural", "nat"], [15, "Accomplished", "acc"], [12, "Competent", "com"], [9, "Unconvincing", "unc"], [5, "Awkward", "awk"], [0, "Ineffective", "ine"]];
const posFit = v => POS_FIT.find(t => v >= t[0]);
// CA / PA (1-200, hidden in FM) from the save; PA null when FM keeps a range instead (negative values)
function capaOf(p) {
  if (!SAVE || !p || !p.uid || !SAVE.ca) return null;
  const i = saveUidIndex().get(p.uid); if (i == null) return null;
  const ca = SAVE.ca[i], pa = SAVE.pa[i]; if (!(ca > 0)) return null;
  return [ca, pa > 0 ? pa : null];
}
function capaHtml(p) {
  const c = capaOf(p); if (!c) return "";
  const bar = (v, l) => `<div class="mrow"><span class="mlab">${l}</span><span class="mval">${v ?? "–"}<small class="mtot">/200</small></span><span class="mtrack"><span style="width:${v ? v / 2 : 0}%;background:${v ? heat(Math.min(100, Math.max(0, (v - 60) / 1.2))) : "transparent"}"></span></span><span class="mpct"></span></div>`;
  const room = c[1] ? c[1] - c[0] : null;
  return `<h4>Ability (CA / PA)</h4><div class="whyst">${bar(c[0], "Current ability")}${bar(c[1], "Potential ability")}</div>
    <p class="small muted">Hidden in FM, read from your save (1–200). ${room == null ? "FM keeps his potential as a range, so no exact PA." : room > 0 ? `Room to grow: <b>+${room}</b>.` : "At his ceiling."} Roughly: 160+ world class, 140+ top-league starter, 120+ good top-flight squad player, 100+ lower-league regular.</p>`;
}
function positionMapHtml(p) {
  if (!SAVE || !p || !p.uid) return "";
  const i = saveUidIndex().get(p.uid); if (i == null) return "";
  const r = c => SAVE.pos[i * 15 + FR.POSITION_CODES.indexOf(c)];
  const dots = PITCH_SPOTS.map(([c, x, y]) => { const v = r(c), f = posFit(v); return `<span class="pdot ${f[2]}" style="left:${x}%;top:${y}%" data-tip="${esc(POS_LABEL[c])}: ${v}/20 · ${f[1]}" role="img" aria-label="${esc(POS_LABEL[c])} ${v} of 20, ${f[1]}"></span>`; }).join("");
  const nat = PITCH_SPOTS.filter(([c]) => r(c) >= 18).map(([c]) => POS_LABEL[c]), acc = PITCH_SPOTS.filter(([c]) => r(c) >= 15 && r(c) < 18).map(([c]) => POS_LABEL[c]);
  return `<h4>Positions</h4><p class="small muted">${nat.length ? `Natural: <b>${esc(nat.join(", "))}</b>` : "No natural position"}${acc.length ? ` · Accomplished: ${esc(acc.join(", "))}` : ""}</p>
    <div class="pitchwrap"><div class="pitchmini" aria-label="Position ratings"><i class="pl-half"></i><i class="pl-circle"></i><i class="pl-box l"></i><i class="pl-box r"></i>${dots}</div>
    <div class="legend pfleg">${POS_FIT.map(([lo, w, k], j) => `<span><i class="pdot ${k} static"></i>${w}${j ? ` ${Math.max(1, lo)}–${POS_FIT[j - 1][0] - 1}` : " 18–20"}</span>`).join("")}</div></div>`;
}

