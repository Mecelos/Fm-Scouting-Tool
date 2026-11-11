// ---------- my squad ----------
const POS_ONE = { GK: "goalkeeper", FB: "full-back", CB: "centre-back", DM: "defensive midfielder", CM: "central midfielder", AM: "attacking midfielder", Wingers: "winger", ST: "striker" };
const POS_MANY = { GK: "goalkeepers", FB: "full-backs", CB: "centre-backs", DM: "defensive midfielders", CM: "central midfielders", AM: "attacking midfielders", Wingers: "wingers", ST: "strikers" };
// FM position string ("D (RLC), WB (R)", "M/AM (C)", "AM (RL), ST (C)") -> position groups
function posGroups(s) {
  const g = new Set(), re = /([A-Z]+(?:\/[A-Z]+)*)\s*(?:\(([RLC]+)\))?/g;
  const txt = String(s || "").toUpperCase(); let m;
  while ((m = re.exec(txt))) {
    const sides = m[2] || "C";
    m[1].split("/").forEach(r => {
      if (r === "GK") g.add("GK");
      else if (r === "D") { if (sides.includes("C")) g.add("CB"); if (/[RL]/.test(sides)) g.add("FB"); }
      else if (r === "WB") g.add("FB");
      else if (r === "DM") g.add("DM");
      else if (r === "M" || r === "AM") { if (sides.includes("C")) g.add(r === "AM" ? "AM" : "CM"); if (/[RL]/.test(sides)) g.add("Wingers"); }
      else if (r === "ST") g.add("ST");
    });
  }
  return POSITIONS.filter(p => g.has(p));
}
const squadDs = () => S.ds.find(d => d.mode === "squad") || null;
const isSenior = p => (p.mins || 0) > 0 || (p.age ?? 99) >= 21;
const squadKinds = sq => sq.kinds || detectKinds(sq.headers);
function squadModelPlayers(sq) {
  const kind = squadKinds(sq).includes("stats") ? "stats" : "attr";
  return buildModel({ ...sq, id: sq.id + "|" + kind, mode: kind }).players;
}
// the scouting export loaded in that position's Stats / Attributes tab (the one selected there)
function refDs(kind, pos) {
  const sets = S.ds.filter(d => d.mode === kind && d.pos === pos);
  return sets.find(d => d.id === S.active[kind + "|" + pos]) || sets[0] || null;
}
const mergedCache = new Map(), evalCache = new Map();
// a very big pool from the save is compared through an even sample (percentiles stay within about 1 point)
const SQUAD_POOL_MAX = 2000, squadSamples = new WeakMap();
function squadPool(ds) {
  if (!ds || !ds.fromSave || !ds.saveIdx || ds.saveIdx.length <= SQUAD_POOL_MAX) return ds;
  let s = squadSamples.get(ds.saveIdx);
  if (!s) {
    const idx = ds.saveIdx, step = idx.length / SQUAD_POOL_MAX, pick = [];
    for (let k = 0; k < SQUAD_POOL_MAX; k++) pick.push(idx[Math.floor(k * step)]);
    s = makeSaveDs(ds.id + "~sample", ds.mode, ds.pos, pick); s.sampleOf = idx.length;
    squadSamples.set(ds.saveIdx, s);
  }
  return s;
}
// your players for this position + the scouting pool, on one scale
function mergedModel(kind, pos) {
  const sq = squadDs(); if (!sq || !squadKinds(sq).includes(kind)) return null;
  const ref = squadPool(refDs(kind, pos));
  const ck = [sq.id, kind, pos, ref ? ref.id : "-"].join("|");
  if (mergedCache.has(ck)) return lruGet(mergedCache, ck);
  const sm = buildModel({ ...sq, id: sq.id + "|" + kind, mode: kind });
  const rm = ref ? buildModel(ref) : null;
  if (rm && kind === "attr") enrich(rm);
  const mine = sm.players.filter(p => posGroups(p.position || p.bestPos).includes(pos)).map(p => ({ ...p, mine: true }));
  const uids = new Set(mine.map(p => p.uid).filter(Boolean)), keys = new Set(sm.players.map(p => p.name + "|" + p.club));
  const sqUids = new Set(sm.players.map(p => p.uid).filter(Boolean));
  const others = rm ? rm.players.filter(p => !(p.uid && (uids.has(p.uid) || sqUids.has(p.uid))) && !keys.has(p.name + "|" + p.club)).map(p => ({ ...p, ix: p.ix + 100000, ref: true })) : [];
  let metrics = [], attrs = [];
  if (kind === "stats") {
    const has = (m, k) => m.metrics.includes(k) || m.players.some(p => p.m && p.m[k] != null);
    metrics = rm ? [...new Set([...sm.metrics, ...rm.metrics])].filter(k => has(sm, k) && has(rm, k)) : sm.metrics.slice();
    if (metrics.includes("npg90") && metrics.includes("gls90")) metrics = metrics.filter(k => k !== "gls90");
  } else attrs = rm ? sm.attrs.filter(a => rm.attrs.includes(a)) : sm.attrs.slice();
  const model = { ds: { ...sq, mode: kind, pos }, players: [...mine, ...others], metrics, attrs, hasMins: sm.hasMins, hasRec: false, unused: [], usedCount: sm.usedCount, nMine: mine.length, nRef: others.length, ref };
  mergedCache.set(ck, model); lruTrim(mergedCache, SMALL_DEVICE ? 4 : 14);
  return model;
}
// the same player in the other view: by squad index, Unique ID, name + club, then a name only he has (indexed once per score)
function matchRow(sc2, p) {
  if (!sc2) return null;
  let ix = sc2._mix;
  if (!ix) {
    ix = sc2._mix = { mine: new Map(), uid: new Map(), nc: new Map(), name: new Map() };
    sc2.rows.forEach(x => {
      const q = x.p;
      if (q.mine) { if (!ix.mine.has(q.ix)) ix.mine.set(q.ix, x); return; }
      if (q.uid && !ix.uid.has(q.uid)) ix.uid.set(q.uid, x);
      const k = q.name + "|" + q.club; if (!ix.nc.has(k)) ix.nc.set(k, x);
      ix.name.set(q.name, ix.name.has(q.name) ? null : x);
    });
  }
  if (p.mine) return ix.mine.get(p.ix) || null;
  let r = null;
  if (p.uid) r = ix.uid.get(p.uid) || null;
  if (!r && p.club) r = ix.nc.get(p.name + "|" + p.club) || null;
  if (!r) r = ix.name.get(p.name) || null;
  return r;
}
// one position: stats + attributes scored against the scouting pool, combined into "vs pool" (percentile)
function squadEval(pos, roleIn) {
  const sq = squadDs(); if (!sq) return null;
  const role = roleIn || S.squadRole[pos] || lineupRole(pos) || "Balanced";
  const rS = refDs("stats", pos), rA = refDs("attr", pos);
  const ck = [sq.id, pos, role, S.minMins, S.league, rS ? rS.id : "", rA ? rA.id : ""].join("|");
  if (evalCache.has(ck)) return evalCache.get(ck);
  const mS = mergedModel("stats", pos), mA = mergedModel("attr", pos);
  const st = mS && mS.nMine ? scoreStats(mS, pos, role, { minMins: S.minMins, league: S.league }) : null;
  const at = mA && mA.nMine ? scoreAttr(mA, pos, role) : null;
  const e = { pos, role, st, at, prim: st || at, refS: st && mS.nRef ? rS : null, refA: at && mA.nRef ? rA : null, mine: [], seniors: [], best: null, ups: [] };
  e.hasRef = !!(e.refS || e.refA);
  if (e.prim) {
    if (st && at) { st.other = at; at.other = st; }
    e.prim.rows.forEach(r => {
      const sr = st ? (e.prim === st ? r : matchRow(st, r.p)) : null, ar = at ? (e.prim === at ? r : matchRow(at, r.p)) : null;
      r.sr = sr; r.ar = ar;
      // stats count less when the sample is small (same easing as the score); attributes always count fully
      r.cmb = wmean([[sr && sr.overall != null ? sr.orank : null, sr ? Math.max(0.2, sr.rel ?? 1) : 0], [ar && ar.overall != null ? ar.orank : null, 1]]);
    });
    e.mine = e.prim.rows.filter(r => r.p.mine).sort((a, b) => (b.cmb ?? -1) - (a.cmb ?? -1));
    e.seniors = e.mine.filter(r => isSenior(r.p));
    e.best = e.mine.find(r => r.cmb != null) || null;
    if (e.best && e.hasRef) e.ups = e.prim.rows.filter(r => r.p.ref && r.cmb != null && r.cmb > e.best.cmb).sort((a, b) => b.cmb - a.cmb);
  }
  if (evalCache.size > 80) evalCache.clear();
  evalCache.set(ck, e);
  return e;
}
function verdict(e, starters, need) {
  const flags = [];
  if (!need) return { cls: "", txt: "Not in this shape", flags };
  if (e.seniors.length < need + 1) flags.push("Thin");
  const ages = starters.map(r => r.p.age).filter(a => a != null);
  if (ages.length && ages.reduce((a, b) => a + b, 0) / ages.length >= 30.5) flags.push("Ageing");
  if (starters.length < need) return { cls: "bad", txt: "Missing a starter", flags };
  if (!e.hasRef) return { cls: "", txt: "No scouting file to compare", flags, nocmp: true };
  const w = Math.min(...starters.map(r => r.cmb));
  if (w >= 70) return { cls: "good", txt: "Strong", flags, w };
  if (w >= 50) return { cls: "", txt: "Solid", flags, w };
  if (w >= 30) return { cls: "warn", txt: "Could upgrade", flags, w };
  return { cls: "bad", txt: "Priority upgrade", flags, w };
}
const cmbTxt = v => v == null ? "–" : Math.round(v);
const cmbCell = v => `<td class="num hc strong" style="background:${heat(v)}" title="Better than ${v == null ? "–" : Math.round(v) + "%"} of the pool">${cmbTxt(v)}</td>`;
function poolLabel(e) {
  const f = [];
  if (e.refS) f.push(`${e.st.model.nRef} from <b>${esc(e.refS.file || e.refS.role)}</b> (stats${e.refA && e.refA.id === e.refS.id ? " + attributes" : ""})`);
  if (e.refA && !(e.refS && e.refA.id === e.refS.id)) f.push(`${e.at.model.nRef} from <b>${esc(e.refA.file || e.refA.role)}</b> (attributes)`);
  return f.join(" · ");
}

function renderSquad(main) {
  const sq = squadDs();
  if (!sq && S.spos === "MyTactic" && !S.adding) { main.innerHTML = renderMyTactic(null); renderSaveNote(); closeDrawer(true); return; }
  if (!sq || S.adding) { main.innerHTML = renderSquadAdd(!sq); bindAdd(); renderSaveNote(); closeDrawer(true); return; }
  const sym = (squadModelPlayers(sq).find(p => /^[€£$]/.test(p.valTxt || "")) || {}).valTxt; CUR = sym ? sym[0] : "€";
  const evals = {}; POSITIONS.forEach(p => evals[p] = squadEval(p));
  const xi = computeLineup();
  if (!POSITIONS.includes(S.spos) && !["Roles", "Tactic", "MyTactic", "Planner", "Review"].includes(S.spos)) S.spos = "Overview";
  const sampled = POSITIONS.map(p => [p, squadPool(refDs("stats", p)) || squadPool(refDs("attr", p))]).filter(([, d]) => d && d.sampleOf);
  main.innerHTML = renderSquadBar(sq, POSITIONS.includes(S.spos) ? evals[S.spos] : null)
    + (sampled.length && !["MyTactic", "Planner", "Review"].includes(S.spos) ? `<p class="small muted">Big save: ${esc(sampled.map(([p, d]) => `${POS_MANY[p] || p} (${d.sampleOf.toLocaleString()})`).join(", "))} are compared with an even sample of ${SQUAD_POOL_MAX.toLocaleString()} players each, so your squad's percentiles stay accurate to about 1 point and this page stays quick. For the best upgrades at a position, use its Stats / Attributes tab or All data.</p>` : "")
    + (S.spos === "Overview" ? renderSquadOverview(sq, evals, xi) : S.spos === "Roles" ? renderRolesTab(sq) : S.spos === "Tactic" ? renderTacticTab(sq) : S.spos === "MyTactic" ? renderMyTactic(sq) : S.spos === "Planner" ? renderPlanner() : S.spos === "Review" ? renderReview(sq) : renderSquadPos(evals[S.spos], xi));
  renderSaveNote();
  if (S.spos === "Planner" || S.spos === "Review") { if (S.sel != null && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true)); else closeDrawer(true); return; }
  const sc = currentScore();
  if (S.sel != null && S.adOver && adHost() && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true)); else if (S.sel != null && sc) openPlayer(panelScore(sc), S.sel, true); else closeDrawer(true);
}
function renderSquadBar(sq, e) {
  const n = squadModelPlayers(sq).length;
  let s = `<div class="setsbar"><span class="setchip" aria-pressed="true">${sq.example ? `<span class="exmark">Example</span>` : ""}${sq.fromSave ? `<span class="exmark savemark">Save</span>` : ""}Squad · ${n} players<span class="muted"> · ${esc(sq.date)}${sq.file ? " · " + esc(sq.file) : ""}</span></span>`;
  s += `<button class="addbtn" data-act="add">Replace squad export</button>`;
  s += `<span class="setctl">`;
  if (e) s += `<label for="sqRole" class="small muted">Role</label><select id="sqRole">${roleOptions(e.pos, e.role)}</select>`;
  s += `<button class="ghost small" data-act="remove">Remove</button></span>`;
  return s + `</div>`;
}
function renderSquadAdd(empty) {
  return `<section class="panel addpanel">
    <h3>${empty ? "Load your squad" : "Replace your squad export"}</h3>
    <p class="muted">In FM27 open your <b>Squad</b> screen with your Scout Lab squad view (attributes + stats + Position + Minutes) and press <b>F7</b>. Then choose that file from <code>FM27PlayerExport › Exports CSV</code>.</p>
    <ul class="muted small addhelp">
      <li>Players are split into GK, FB, CB, DM, CM, AM, Wingers and ST from FM's <b>Position</b> column (M C = CM, AM C = AM). A player who can play two positions shows in both.</li>
      <li>Each position is judged against the scouting export loaded in that position's Stats / Attributes tab. No scouting file there = your players are only ranked against each other.</li>
    </ul>
    <div class="addgrid">
      <label class="drop" for="fileIn"><input type="file" id="fileIn" accept=".csv,.html,.htm,.txt"><span>Choose or drop your squad .csv / .html export</span></label>
      <textarea id="pasteIn" placeholder="…or paste the CSV text here (header row included)"></textarea>
    </div>
    <div class="addrow">
      <button class="primary" data-act="loadsquad">Load squad</button>
      ${empty ? `<button class="ghost" data-act="squadexample">Use my 2 Nov exports (Leicester squad + DM, CM, ST scouting files)</button>` : `<button class="ghost" data-act="cancel">Cancel</button>`}
    </div>
    ${S.addErr ? `<p class="err">${esc(S.addErr)}</p>` : ""}
    <p class="small muted savehint">Or <button class="linkbtn" data-act="datapage">load your FM save</button>: your club is found in it and filled in here, with every other tab.</p>
  </section>`;
}
function renderSquadOverview(sq, evals, X) {
  const all = squadModelPlayers(sq), seniors = all.filter(isSenior);
  const anyStats = squadKinds(sq).includes("stats");
  const lg = anyStats ? (all.find(p => p.lg && p.div && p.div !== "-") || {}).lg : null;
  const div = (all.find(p => p.div && p.div !== "-") || {}).div;
  const cmpN = POSITIONS.filter(p => evals[p].hasRef).length;
  const tval = all.reduce((t, p) => t + (p.val || 0), 0);
  const t = [["Senior players", `${seniors.length}<small> of ${all.length}</small>`], ["Median age (seniors)", median(seniors.map(p => p.age)) ?? "–"], ["Squad value", esc(fmtMoney(tval))],
    ["League", `${esc(div || "–")}${lg ? `<small> · strength ${lg.k.toFixed(2)}</small>` : ""}`], ["Positions with a scouting file", `${cmpN}<small> of 7</small>`]];
  let h = `<section class="tiles">${t.map(([l, v]) => `<div class="tile"><span class="tv">${v}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>`;
  h += renderLineup(X);
  // position table
  const rowsHtml = POSITIONS.map(pos => {
    const e = evals[pos], st = X.xi[pos], need = X.f[pos], v = verdict(e, st, need);
    const bestS = e.st ? e.mine.filter(r => r.sr && r.sr.overall != null).sort((a, b) => b.sr.overall - a.sr.overall)[0] : null;
    const bestA = e.at ? e.mine.filter(r => r.ar && r.ar.overall != null).sort((a, b) => b.ar.overall - a.ar.overall)[0] : null;
    const ages = e.seniors.map(r => r.p.age).filter(a => a != null);
    const who = (st.length ? st : e.best ? [e.best] : []);
    return `<tr data-spos="${pos}" class="clickrow"><th>${pos}</th>
      <td class="left">${who.length ? who.map(r => `${esc(r.p.name)} <span class="muted">${cmbTxt(r.cmb)}</span>`).join("<br>") : `<span class="muted">nobody</span>`}${!need ? `<br><span class="muted small">not in ${esc(S.formation)}</span>` : ""}</td>
      <td class="num opt">${need}</td>
      <td class="num opt">${e.seniors.length}${e.mine.length > e.seniors.length ? `<span class="muted small"> +${e.mine.length - e.seniors.length}</span>` : ""}</td>
      <td class="num opt">${ages.length ? (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1) : "–"}</td>
      <td class="num opt">${bestS ? Math.round(bestS.sr.overall) : "–"}</td>
      <td class="num opt">${bestA ? bestA.ar.overall.toFixed(1) : "–"}</td>
      <td class="left"><span class="tag ${v.cls}">${esc(v.txt)}</span>${v.flags.map(f => ` <span class="tag warn">${esc(f)}</span>`).join("")}</td></tr>`;
  }).join("");
  h += `<section class="panel"><div class="ph"><h3>Position by position</h3><span class="muted small">tap a row for the full breakdown</span></div><div class="tscroll"><table class="gtable sqtable"><thead><tr><th>Pos</th><th>Starter(s) · vs pool</th><th class="num opt">Starts</th><th class="num opt" title="Senior options: played this season or 21+. +N = younger players with no minutes">Options</th><th class="num opt">Avg age</th><th class="num opt" title="Best stats score among your players here (0–100, 50 = pool average)">Best stats</th><th class="num opt" title="Best attribute rating among your players here (out of 20)">Best attr.</th><th>Verdict</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
    <p class="small muted">Verdict uses your weakest starter: 70+ Strong · 50–70 Solid · 30–50 Could upgrade · under 30 Priority upgrade. Thin = no senior cover beyond the starters. Ageing = starters average 31+.</p></section>`;
  // where to strengthen
  const needs = POSITIONS.map(pos => ({ pos, e: evals[pos], st: X.xi[pos], need: X.f[pos] })).filter(x => x.need && x.e.hasRef && x.st.length)
    .map(x => ({ ...x, weak: x.st.reduce((a, b) => a.cmb <= b.cmb ? a : b) })).sort((a, b) => a.weak.cmb - b.weak.cmb);
  const missing = POSITIONS.filter(p => X.f[p] && !evals[p].hasRef);
  h += `<section class="panel"><div class="ph"><h3>Where to strengthen first</h3><span class="muted small">weakest starter first</span></div>`;
  if (needs.length) h += `<ol class="strengthen">${needs.map(x => {
    const better = (x.weak.ev || x.e).prim.rows.filter(r => r.p.ref && r.cmb != null && r.cmb > x.weak.cmb).sort((a, b) => b.cmb - a.cmb);
    const cheap = better.filter(r => r.p.val != null && (x.weak.p.val == null || r.p.val <= Math.max(x.weak.p.val, 1))).length;
    return `<li><button class="linkbtn" data-spos="${x.pos}"><b>${x.pos}</b></button> ${esc(x.weak.p.name)} is better than <b>${cmbTxt(x.weak.cmb)}%</b> of your ${esc(POS_ONE[x.pos])} pool. ${better.length ? `${better.length} player${better.length > 1 ? "s" : ""} in that file rate higher${better[0] ? `, best ${esc(better[0].p.name)} (${cmbTxt(better[0].cmb)}, ${esc(fmtMoney(better[0].p.val))})` : ""}${cheap ? `; ${cheap} cost no more than him` : ""}.` : "Nobody in that file rates higher."}</li>`;
  }).join("")}</ol>`;
  else h += `<p class="muted">Load scouting exports in the Stats / Attributes position tabs to compare your starters with the market.</p>`;
  if (missing.length) h += `<p class="small muted">No scouting file yet for ${missing.join(", ")}. Those positions are only ranked inside your squad. Load an export in that tab (Stats or Attributes) to judge them.</p>`;
  h += `</section>`;
  return h;
}
// every squad player: best roles by attributes, only for the positions FM lists for him
function squadRoleMap(sq) {
  if (!squadKinds(sq).includes("attr")) return null;
  const m = buildModel({ ...sq, id: sq.id + "|attr", mode: "attr" });
  return m.players.map(p => {
    const fam = new Map(); // positions that share a role list (LB/RB, LW/RW...) are shown together
    const pc = posCodes(p.position || p.bestPos); if (pc.has("DC")) pc.add("WCB");
    [...pc].forEach(c => {
      const k = CODE_GROUP[c] + "|" + codeRoles(c).join(",");
      if (!fam.has(k)) fam.set(k, { code: c, labels: [] });
      fam.get(k).labels.push(CODE_LABEL[c]);
    });
    const per = [], all = [];
    fam.forEach(f => {
      const g = CODE_GROUP[f.code], pos = f.labels.join("/");
      const rs = codeRoles(f.code).filter(r => r !== "Balanced").map(r => ({ role: r, v: roleRating(p, g, r, f.code), pos, g })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
      if (rs.length) { per.push(rs[0]); all.push(...rs); }
    });
    const seen = new Set();
    const top = all.sort((a, b) => b.v - a.v).filter(x => !seen.has(x.role) && seen.add(x.role)).slice(0, 3);
    per.sort((a, b) => b.v - a.v);
    return { p, per, top };
  }).filter(x => x.top.length);
}
// Roles tab: best players by attributes, best per position, then the full role map
function renderRolesTab(sq) {
  const rows = squadRoleMap(sq);
  if (!rows) return renderRoleMap(sq);
  const best = rows.slice().sort((a, b) => b.top[0].v - a.top[0].v).slice(0, 5);
  let h = `<section><div class="sh"><h3>Top 5 by attributes</h3><span class="muted small">his best role, rated out of 20 (FM27-weighted attributes)</span></div><div class="rtop">`;
  best.forEach((r, i) => {
    const t = r.top[0], p = r.p;
    h += `<button class="rcard" data-spos="${t.g}" data-open="${p.ix}"><span class="rk">#${i + 1}</span><span class="rcn">${esc(p.name)}</span>
      <span class="rcm">${p.age ?? "?"} · ${esc(p.position || p.bestPos || "")}${!isSenior(p) ? " · youth" : ""}</span>
      <span class="rcv" style="color:${attrColor(t.v)}">${t.v.toFixed(1)}<small>/20</small></span>
      <span class="rcr">${esc(t.role)} <span class="muted">· ${esc(t.pos)}</span></span>
      ${r.top[1] ? `<span class="rcr2 muted">Also ${esc(r.top[1].role)} ${r.top[1].v.toFixed(1)}</span>` : ""}</button>`;
  });
  h += `</div></section>`;
  // top 5 per position group (best role he has in that position)
  h += `<section><div class="sh"><h3>Top 5 per position</h3><span class="muted small">best role in that position · players listed there by FM</span></div><div class="needs">`;
  POSITIONS.forEach(g => {
    const list = rows.map(r => { const x = r.per.filter(e => e.g === g).sort((a, b) => b.v - a.v)[0]; return x ? { r, x } : null; })
      .filter(Boolean).sort((a, b) => b.x.v - a.x.v).slice(0, 5);
    if (!list.length) return;
    h += `<div class="need"><h4>${esc(POS_MANY[g])}</h4>${list.map(({ r, x }, i) => `<button class="nrow rrow" data-spos="${g}" data-open="${r.p.ix}" data-tip="${esc(r.p.name + " · " + x.role + " (" + x.pos + ") " + x.v.toFixed(1) + "/20")}"><span class="nn">${i + 1}. ${esc(r.p.name)}<small>${esc(x.role)}</small></span><span class="nv" style="color:${attrColor(x.v)}">${x.v.toFixed(1)}</span></button>`).join("")}</div>`;
  });
  h += `</div></section>`;
  return h + renderRoleMap(sq);
}
function renderRoleMap(sq) {
  const rows = squadRoleMap(sq);
  let h = `<section class="panel" id="rolemap"><div class="ph"><h3>Squad role map</h3><span class="muted small">best roles by attributes (out of 20), only in positions he can play</span></div>`;
  if (!rows) return h + `<p class="muted">This squad file has no attributes. Add the attribute columns to your squad view and export again.</p></section>`;
  const youth = rows.filter(r => !isSenior(r.p)).length;
  const shown = rows.filter(r => S.mapYouth || isSenior(r.p))
    .sort((a, b) => POSITIONS.indexOf(a.top[0].g) - POSITIONS.indexOf(b.top[0].g) || b.top[0].v - a.top[0].v);
  const cell = (x, l) => x ? `<td class="left rcell" data-l="${l}"><span class="rn">${esc(x.role)}</span><span class="rs">${esc(x.pos)} · <b style="color:${attrColor(x.v)}">${x.v.toFixed(1)}</b></span></td>` : `<td class="left muted" data-l="${l}">–</td>`;
  h += `<div class="tscroll rmapwrap"><table class="gtable rmap"><thead><tr><th>Player</th><th>Best role</th><th>2nd</th><th>3rd</th><th class="opt">Best role in each position</th></tr></thead><tbody>`;
  let grp = null;
  shown.forEach(r => {
    const g = r.top[0].g;
    if (g !== grp) { grp = g; h += `<tr class="rgrp"><td colspan="5">${esc(POS_MANY[g] || g)}</td></tr>`; }
    const p = r.p;
    h += `<tr><td class="left rpl"><button class="linkbtn" data-spos="${g}" data-open="${p.ix}">${esc(p.name)}</button><span class="rs">${p.age ?? "?"} · ${esc(p.position || p.bestPos || "")}${!isSenior(p) ? " · youth" : ""}</span></td>${cell(r.top[0], "Best")}${cell(r.top[1], "2nd")}${cell(r.top[2], "3rd")}
      <td class="left opt small">${r.per.map(x => `${esc(x.pos)}: ${esc(x.role)} <b style="color:${attrColor(x.v)}">${x.v.toFixed(1)}</b>`).join("<br>")}</td></tr>`;
  });
  h += `</tbody></table></div>`;
  h += `<p class="small muted">Rating = the FM27-weighted attribute rating for that role, the same number the Attributes view uses. Roles are only those FM26/27 offers in his listed positions (FM26 roles reference): e.g. D L/R full-back roles plus Wing-Back, Inside and Playmaking Wing-Back; M L/R Wide Midfielder, Winger, Inside or Playmaking Winger; M C also Wide Central Midfielder, AM and AP; AM C also Second Striker and Channel Midfielder; box-to-box roles under DM; Wide CB only in a back three. Grouped by his best role's position. Tap a name for his full panel.${youth ? ` <button class="linkbtn" data-act="mapyouth">${S.mapYouth ? "Hide" : "Show"} ${youth} youth player${youth > 1 ? "s" : ""} with no minutes</button>` : ""}</p></section>`;
  return h;
}
function renderSquadPos(e, X) {
  const pos = e.pos;
  if (!e.prim || !e.mine.length) return `<section class="panel"><h3>No ${esc(POS_MANY[pos])} in this squad file</h3><p class="muted">Nobody in the file has ${pos} in FM's Position column.</p></section>`;
  const isS = !!e.st;
  const starters = X.xi[pos] || [], need = X.f[pos] || 0, startSet = new Set(starters.map(r => r.p.ix));
  let h = `<section class="filters">
    ${isS && e.st.model.hasMins ? `<label class="fl"><span class="small muted">Min minutes for the scouting pool <b id="mmv">${S.minMins}</b></span><input type="range" id="minMins" min="0" max="2000" step="50" value="${S.minMins}"></label>` : ""}
    ${isS ? `<label class="fl toggle"><input type="checkbox" id="league" ${S.league ? "checked" : ""}><span>League strength adjustment</span></label>` : ""}
    <div class="poolnote ${e.hasRef ? "" : "warn"}">${e.hasRef ? `Your <b>${e.mine.length}</b> ${esc(POS_MANY[pos])} vs ${poolLabel(e)}. Your players are always included, whatever their minutes.` : `No ${pos} scouting file loaded, so your ${esc(POS_MANY[pos])} are only ranked against each other. Load a ${pos} export in the Stats / Attributes tab to compare with the market.`}</div>
  </section>`;
  // best player and why
  const b = e.best;
  if (b) {
    const sr = b.sr, ar = b.ar, nx = e.mine.find(r => r !== b && r.cmb != null);
    const sS = sr ? strengths(e.st, sr) : { good: [], bad: [], stand: [] }, sA = ar ? strengths(e.at, ar) : { good: [], bad: [], stand: [] };
    const dedupe = a => a.filter((x, i) => a.findIndex(y => y.split(" ·")[0] === x.split(" ·")[0]) === i);
    const good = dedupe([...(sS.stand || []), ...sS.good, ...(sA.stand || []), ...sA.good]).slice(0, 6), bad = dedupe([...sS.bad, ...sA.bad]).slice(0, 4);
    const top = sr ? contributions(e.st, sr).items.filter(x => x.d > 0).sort((a, c) => c.d - a.d).slice(0, 3).map(x => x.l) : [];
    const topA = ar ? contributions(e.at, ar).items.filter(x => x.d > 0).sort((a, c) => c.d - a.d).slice(0, 3).map(x => x.l) : [];
    const fitA = ar && ar.fits && ar.fits[0], fitS = sr && sr.fits && sr.fits[0];
    const roleFit = fitA ? [fitA[0], fitA[1].toFixed(1) + "/20", "by attributes"] : fitS ? [fitS[0], Math.round(fitS[1]), "by output"] : null;
    const types = [...new Set([sr && sr.type, ar && ar.type].filter(Boolean))];
    const why = [];
    why.push(`${e.hasRef ? `Better than <b>${cmbTxt(b.cmb)}%</b> of the ${pos} scouting pool` : `Ranks first of your ${esc(POS_MANY[pos])}`}${sr && sr.overall != null ? ` · stats <b>${Math.round(sr.overall)}</b> (${pctTxt(sr.orank)})` : ""}${ar && ar.overall != null ? ` · attributes <b>${ar.overall.toFixed(1)}</b>/20 (${pctTxt(ar.orank)})` : ""}.`);
    if (top.length) why.push(`His stats score is driven most by ${top.map(esc).join(", ")}.`);
    if (topA.length) why.push(`For this role his biggest attribute edges are ${topA.map(esc).join(", ")}.`);
    if (nx) why.push(`Next best: ${esc(nx.p.name)} (${cmbTxt(nx.cmb)}), ${Math.round(b.cmb - nx.cmb)} points behind.`);
    if (sr && sr.rel < 0.8) why.push(`Only ${b.p.mins || 0} minutes, so his stats are pulled toward the pool average and count less in "vs pool".`);
    if (sr && b.p.basic) why.push(`His league is a basic-stats league in FM, so only goals, xG, xA and shots are counted.`);
    h += `<section class="panel sqbest"><div class="sqbh"><div><h5>Your best ${esc(POS_ONE[pos])} · ${esc(e.role)}</h5><h2><button class="linkbtn" data-pid="${b.p.ix}">${esc(b.p.name)}</button></h2>
      <p class="muted small">${b.p.age ?? "?"} yrs · ${esc(b.p.position || b.p.bestPos || "")} · ${b.p.mins ?? 0} mins · ${esc(b.p.valTxt || "–")}${b.p.pers ? " · " + esc(b.p.pers) : ""}</p></div>
      <div class="sqbig" style="--h:${heat(b.cmb)}"><b>${cmbTxt(b.cmb)}</b><span>vs pool</span></div></div>
      <ul class="why">${why.map(w => `<li>${w}</li>`).join("")}</ul>
      <div class="sw2">${good.length ? `<div><h5>Stands out</h5>${good.map(x => `<span class="chipg">${esc(x)}</span>`).join("")}</div>` : ""}${bad.length ? `<div><h5>Weak spots</h5>${bad.map(x => `<span class="chipb">${esc(x)}</span>`).join("")}</div>` : ""}</div>
      ${roleFit || types.length ? `<div class="fits">${roleFit ? `<span class="small muted">Best role ${roleFit[2]}:</span><button class="fit first" data-role="${esc(roleFit[0])}" title="Score your ${esc(POS_MANY[pos])} for this role">${esc(roleFit[0])} <b>${roleFit[1]}</b></button>` : ""}${types.map(t => `<span class="tag type">${esc(t)}</span>`).join("")}</div>` : ""}
    </section>`;
  }
  // depth tiles
  const ages = e.seniors.map(r => r.p.age).filter(a => a != null);
  const lead = e.mine.slice().sort((a, c) => (c.p.mins || 0) - (a.p.mins || 0))[0];
  const tl = [["Starters in " + S.formation, need], ["Senior options", e.seniors.length], ["Average age", ages.length ? (ages.reduce((a, c) => a + c, 0) / ages.length).toFixed(1) : "–"],
    ["Aged 30+", e.seniors.filter(r => (r.p.age || 0) >= 30).length], ["U21 in the group", e.mine.filter(r => (r.p.age ?? 99) <= 21).length], ["Most minutes", lead ? `${esc(lead.p.name)}` : "–"]];
  const v = verdict(e, starters, need);
  h += `<section class="tiles">${tl.map(([l, val]) => `<div class="tile"><span class="tv ${l === "Most minutes" ? "tvname" : ""}">${val}</span><span class="tl">${esc(l)}</span></div>`).join("")}<div class="tile"><span class="tv"><span class="tag ${v.cls} big">${esc(v.nocmp ? "No market file" : v.txt)}</span></span><span class="tl">${v.flags.length ? esc(v.flags.join(" · ")) : "Verdict"}</span></div></section>`;
  // your players table
  const hasS = !!e.st, hasA = !!e.at;
  let tb = `<div class="tscroll"><table class="heat sqheat"><thead><tr><th class="num">#</th><th class="left">Player</th><th class="num" title="Better than X% of the pool, stats and attributes combined">vs pool</th><th class="num">Age</th>${hasS ? `<th class="num">Mins</th>` : ""}${hasS ? `<th class="num" title="Stats role score, 0–100, 50 = pool average">Stats</th>` : ""}${hasA ? `<th class="num" title="Attribute role rating out of 20">Attr.</th>` : ""}<th class="lt">Type</th><th class="lt">Best role</th><th class="num">Value</th></tr></thead><tbody>`;
  e.mine.forEach((r, i) => {
    const p = r.p, sr = r.sr, ar = r.ar, fit = (ar && ar.fits && ar.fits[0]) || (sr && sr.fits && sr.fits[0]);
    tb += `<tr data-pid="${p.ix}" class="${S.sel === p.ix ? "rsel" : ""}"><td class="num muted">${i + 1}</td>
      <td class="left pl"><span class="pn">${starForP(p)}${esc(p.name)}${startSet.has(p.ix) ? `<span class="inf start">XI</span>` : ""}${!isSenior(p) ? `<span class="inf">Youth</span>` : ""}${p.basic ? `<span class="inf basic">Basic stats</span>` : ""}</span><span class="pc">${esc(p.position || p.bestPos || "")}</span></td>
      ${cmbCell(r.cmb)}<td class="num">${p.age ?? "–"}</td>${hasS ? `<td class="num">${p.mins ?? "–"}</td>` : ""}
      ${hasS ? `<td class="num" title="${sr && sr.orank != null ? pctTxt(sr.orank) + " of the pool" : ""}">${sr && sr.overall != null ? Math.round(sr.overall) : "–"}${sr && sr.overall != null && sr.rel < 0.8 ? `<span class="muted small">*</span>` : ""}</td>` : ""}
      ${hasA ? `<td class="num" title="${ar && ar.orank != null ? pctTxt(ar.orank) + " of the pool" : ""}">${ar && ar.overall != null ? ar.overall.toFixed(1) : "–"}</td>` : ""}
      <td class="left ty">${esc((sr && sr.type) || (ar && ar.type) || "–")}</td><td class="left ty">${fit ? esc(fit[0]) : "–"}</td><td class="num">${esc(fmtMoney(p.val))}</td></tr>`;
  });
  tb += `</tbody></table></div><p class="small muted">vs pool = better than X% of the scouting pool, stats and attributes combined (stats count less on small minutes). * = under ~1,100 minutes, stats eased toward 50. Tap a player for the full panel.</p>`;
  h += `<section class="panel"><div class="ph"><h3>Your ${esc(POS_MANY[pos])}</h3><span class="muted small">${e.role} · best first</span></div>${tb}</section>`;
  // upgrades
  if (e.hasRef) {
    const ups = e.ups.slice(0, 8);
    const cheaper = e.ups.filter(r => r.p.val != null && b && b.p.val != null && r.p.val <= b.p.val).slice(0, 3);
    h += `<section class="panel"><div class="ph"><h3>Who would improve it</h3><span class="muted small">from your ${pos} scouting file · rated above ${b ? esc(b.p.name) : "your best"}</span></div>`;
    if (ups.length) {
      h += `<div class="ups">${ups.map(r => `<button class="uprow" data-pid="${r.p.ix}"><span class="un">${esc(r.p.name)}</span><span class="um">${esc(r.p.club || "No club")} · ${r.p.age ?? "?"} · ${esc(fmtMoney(r.p.val))}</span><span class="utags">${r.sr && r.sr.overall != null ? `<span class="tag">stats ${Math.round(r.sr.overall)}</span>` : ""}${r.ar && r.ar.overall != null ? `<span class="tag">attr ${r.ar.overall.toFixed(1)}</span>` : ""}${vfTag(r.sr || r)}</span><b style="background:${heat(r.cmb)}">${cmbTxt(r.cmb)}</b><span class="ud">+${Math.round(r.cmb - b.cmb)}</span></button>`).join("")}</div>`;
      if (cheaper.length) h += `<p class="small">Cost no more than ${esc(b.p.name)}: ${cheaper.map(r => `<button class="linkbtn" data-pid="${r.p.ix}">${esc(r.p.name)}</button> (${cmbTxt(r.cmb)}, ${esc(fmtMoney(r.p.val))})`).join(", ")}.</p>`;
      h += `<p class="small muted">${e.ups.length} player${e.ups.length > 1 ? "s" : ""} in the file rate above your best ${esc(POS_ONE[pos])}. Tap one for his panel; "Compare" there lists your players with a ★.</p>`;
    } else h += `<p class="muted">Nobody in the ${pos} scouting file rates above ${b ? esc(b.p.name) : "your best"}. Try a wider search in FM.</p>`;
    h += `</section>`;
  }
  return h;
}
function loadSquadFrom(name, text, example) {
  const t = parseExport(text);
  if (colIndex(t.headers, BASE.position) < 0 && colIndex(t.headers, BASE.bestPos) < 0) throw new Error("This file has no Position column, so players can't be split by position. Add Position to your squad view and export again.");
  const d = { id: "sq" + Date.now(), mode: "squad", pos: "ALL", role: "Balanced", date: example ? "2026-11-02" : new Date().toISOString().slice(0, 10), file: name, kinds: detectKinds(t.headers), example: !!example, ...t };
  S.ds = S.ds.filter(x => x.mode !== "squad"); S.ds.push(d);
  return d;
}
function loadSquad() {
  try {
    if (!addFiles.length) throw new Error("Nothing to load yet. Choose your squad file or paste the CSV text first.");
    const sqd = loadSquadFrom(addFiles[0].name, addFiles[0].text, false);
    if (learnLeagues(sqd)) { saveClubLeagues(); if (SAVE) { installSave(false); clearCaches(); } }
    S.adding = false; S.addErr = ""; addFiles = []; S.sel = null; S.spos = "Overview";
    saveDatasets(); render();
  } catch (e) { S.addErr = e.message; render(); }
}
// the exports from 2 Nov that ship inside this page: squad + DM/CM/ST scouting files (skipped where you already have your own)
function loadSquadExample() {
  try {
    loadSquadFrom("Leicester squad (2 Nov)", $("#ex-squad").textContent.trim(), true);
    [["DM", "#ex-dm"], ["CM", "#ex-cm"], ["ST", "#ex-st2"]].forEach(([pos, sel], n) => {
      const t = parseExport($(sel).textContent.trim());
      detectKinds(t.headers).forEach(mode => {
        if (S.ds.some(d => d.mode === mode && d.pos === pos && !d.example)) return;
        const id = "ex2-" + pos + "-" + mode;
        if (S.ds.some(d => d.id === id)) return;
        S.ds.push({ id, mode, pos, role: "Balanced", date: "2026-11-02", file: `${pos} search (2 Nov)`, combined: true, example: true, ...t });
        S.active[mode + "|" + pos] = id;
      });
    });
    S.adding = false; S.addErr = ""; S.sel = null; S.spos = "Overview";
    saveDatasets(); render();
  } catch (e) { S.addErr = e.message; render(); }
}

// roles FM offers him in this position group, from the positions he is listed at (null = no usable position, so all roles)
function playerRoleSet(group, p) {
  const codes = posCodes(p.position || p.bestPos); if (codes.has("DC")) codes.add("WCB");
  const set = new Set(); codes.forEach(c => { if (CODE_GROUP[c] === group) (CODE_ROLES[c] || []).forEach(r => set.add(r)); });
  return set.size ? set : null;
}
