// ---------- development: a snapshot of every save you load, compared with an earlier one ----------
// snapshots live in this browser (IndexedDB): uid, CA, PA and value for everyone, all attributes for your club
let SNAPS = null;
async function snapList() { if (SNAPS) return SNAPS; SNAPS = (DB.db && (await DB.get("snaps"))) || []; return SNAPS; }
async function snapTake() {
  if (!SAVE || !DB.db || !SAVE.meta || !SAVE.meta.gameDate) return;
  const list = await snapList(), n = SAVE.n, mine = saveManagedIdx();
  const uid = new Uint32Array(n), ca = new Int16Array(n), pa = new Int16Array(n), val = new Float32Array(n);
  for (let i = 0; i < n; i++) { uid[i] = SAVE.uid[i]; ca[i] = SAVE.ca[i]; pa[i] = SAVE.pa[i]; val[i] = SAVE.value[i]; }
  const mu = new Uint32Array(mine.length), ma = new Uint8Array(mine.length * 52);
  mine.forEach((i, k) => { mu[k] = SAVE.uid[i]; ma.set(SAVE.attrs.subarray(i * 52, i * 52 + 52), k * 52); });
  const m = SAVE.meta.managed && SAVE.meta.managed[0];
  const snap = { id: "snap" + Date.now(), gameDate: SAVE.meta.gameDate, file: SAVE.file || "save", club: m ? m.club : "", at: Date.now(), uid, ca, pa, val, mu, ma };
  const kept = list.filter(x => !(x.gameDate === snap.gameDate && x.club === snap.club));
  kept.push(snap); kept.sort((a, b) => a.gameDate.localeCompare(b.gameDate));
  while (kept.length > 8) kept.shift();
  SNAPS = kept; await DB.set("snaps", kept);
}
async function snapRemove(id) { SNAPS = (await snapList()).filter(x => x.id !== id); await DB.set("snaps", SNAPS); render(); }
function scDev() {
  if (!SNAPS) { snapList().then(() => { if (S.mode === "scout" && S.scTab === "dev") render(); }); return `<section class="panel"><p class="muted">Loading your snapshots…</p></section>`; }
  const cur = SAVE.meta.gameDate, older = SNAPS.filter(x => x.gameDate !== cur || x.club !== ((SAVE.meta.managed && SAVE.meta.managed[0] && SAVE.meta.managed[0].club) || ""));
  const dt = d => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const listHtml = `<div class="snaps">${SNAPS.map(x => `<span class="tag">${esc(dt(x.gameDate))}${x.club ? " · " + esc(x.club) : ""}${x.gameDate === cur ? " · this save" : ""} <button class="linkbtn small" data-snaprm="${x.id}" title="Delete this snapshot">✕</button></span>`).join(" ")}</div>`;
  if (!older.length) return `<section class="panel"><div class="ph"><h3>Development</h3><span class="muted small">season on season, from snapshots of your saves</span></div>
    <p class="muted">Every save you load is kept as a small snapshot in this browser (ability, potential and value for everyone, every attribute for your club). Load a save from another point in your career (e.g. last season's) and then this one, and this page shows who improved, who declined and the biggest risers anywhere.</p>${listHtml}</section>`;
  const F = scF(), base = older.find(x => x.id === F.dBase) || older.filter(x => x.gameDate < cur).pop() || older[older.length - 1];
  const map = new Map(); for (let k = 0; k < base.uid.length; k++) map.set(base.uid[k], k);
  const amap = new Map(); for (let k = 0; k < base.mu.length; k++) amap.set(base.mu[k], k);
  const months = Math.round((new Date(cur) - new Date(base.gameDate)) / (30.44 * 864e5));
  const mine = saveManagedIdx(), C = SC_COLS;
  const dCA = i => { const k = map.get(SAVE.uid[i]); return k == null || !(base.ca[k] > 0) ? null : SAVE.ca[i] - base.ca[k]; };
  const dPA = i => { const k = map.get(SAVE.uid[i]); return k == null || !(base.pa[k] > 0) || !(SAVE.pa[i] > 0) ? null : SAVE.pa[i] - base.pa[k]; };
  const dV = i => { const k = map.get(SAVE.uid[i]); const a = k == null ? NaN : base.val[k], b = SAVE.value[i]; return a === a && b === b ? b - a : null; };
  const sgn = v => v == null ? "–" : `<b class="${v > 0 ? "okc" : v < 0 ? "bad" : "muted"}">${v > 0 ? "+" : ""}${v}</b>`;
  const was = { ph: 1, k: "was", l: "CA then", c: "num", v: i => { const k = map.get(SAVE.uid[i]); return k == null ? null : base.ca[k] || null; } };
  const dca = { k: "dca", l: "CA ±", c: "num", v: dCA, h: i => sgn(dCA(i)) };
  const dpa = { k: "dpa", l: "PA ±", c: "num", v: dPA, h: i => sgn(dPA(i)) };
  const dval = { ph: 1, k: "dval", l: "Value ±", c: "num", v: dV, h: i => { const v = dV(i); return v == null ? "–" : `<span class="${v > 0 ? "okc" : v < 0 ? "bad" : ""}">${v > 0 ? "+" : v < 0 ? "−" : ""}${esc(saveMoney(Math.abs(v)))}</span>`; } };
  const attrCh = i => { const k = amap.get(SAVE.uid[i]); if (k == null) return []; const out = []; ATTR_COLS.forEach(([lab, a]) => { const o = base.ma[k * 52 + a], n = SAVE.attrs[i * 52 + a]; if (o && n && o !== n) out.push([lab, n - o]); }); return out.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])); };
  const ach = { k: "ach", l: "Attribute changes", c: "left small", v: i => attrCh(i).reduce((s, x) => s + x[1], 0), h: i => { const l = attrCh(i); return l.length ? l.slice(0, 5).map(([a, d]) => `<span class="${d > 0 ? "okc" : "bad"}">${esc(a)} ${d > 0 ? "+" : ""}${d}</span>`).join(" · ") + (l.length > 5 ? ` <span class="muted">+${l.length - 5} more</span>` : "") : "<span class='muted'>–</span>"; } };
  const mineRows = mine.filter(i => map.has(SAVE.uid[i])); if (!(F.sort || {}).dmine) mineRows.sort((a, b) => (dCA(b) ?? -99) - (dCA(a) ?? -99));
  const newcomers = mine.filter(i => !map.has(SAVE.uid[i]) || amap.get(SAVE.uid[i]) == null).length;
  const maxAge = F.dAge ?? 23, dir = F.dDir || "up", mset = mineSet(), world = [];
  for (let i = 0; i < SAVE.n; i++) { if (!SAVE.name[i] || mset.has(i) || SAVE.age[i] > maxAge) continue; const d = dCA(i); if (d == null || (dir === "up" ? d <= 0 : d >= 0)) continue; world.push(i); }
  if (!(F.sort || {}).dworld) world.sort((a, b) => dir === "up" ? dCA(b) - dCA(a) : dCA(a) - dCA(b));
  return `<section class="panel"><div class="ph"><h3>Development</h3><span class="muted small">this save (${esc(dt(cur))}) against <select class="scin" data-f="dBase">${older.map(x => `<option value="${x.id}" ${x.id === base.id ? "selected" : ""}>${esc(dt(x.gameDate))}${x.club ? " · " + esc(x.club) : ""}</option>`).join("")}</select> · ${Math.abs(months)} month${Math.abs(months) === 1 ? "" : "s"} ${months >= 0 ? "earlier" : "later"}</span></div>${listHtml}</section>
    <section class="panel"><div class="ph"><h3>Your squad</h3><span class="muted small">biggest improvers first${newcomers ? ` · ${newcomers} joined since (attribute changes need them in both saves)` : ""}</span></div>${scTable("dmine", mineRows, [C.name, C.age, C.pos, was, C.ca, dca, C.pa, dpa, dval, ach], 120)}</section>
    <section class="panel"><div class="ph"><h3>${dir === "up" ? "Biggest risers" : "Biggest fallers"} elsewhere</h3><span class="muted small">CA change since then, other clubs</span></div>
    <div class="filters">${scNum("dAge", "Max age", maxAge)}${scSel("dDir", "Show", dir, [["up", "Risers"], ["down", "Fallers"]])}<span class="poolnote">${world.length.toLocaleString()} players</span></div>
    ${scTable("dworld", world, [C.name, C.age, C.club, C.pos, was, C.ca, dca, C.pa, C.value, dval])}</section>`;
}
document.addEventListener("click", e => { const t = e.target.closest("[data-snaprm]"); if (t) snapRemove(t.dataset.snaprm); });

// ---------- My squad › Planner: depth chart, age profile, contracts by season, next-season gaps, loans ----------
const PL_LABEL = { GK: "Goalkeepers", FB: "Full-backs", CB: "Centre-backs", DM: "Defensive mids", CM: "Central mids", AM: "Attacking mids", Wingers: "Wingers", ST: "Strikers" };
function plStat(i, f) { const k = saveKind(); if (!k) return null; const st = SAVE.stats[k], r = st.row[i]; if (r < 0 || !st.cols[f]) return null; const v = st.cols[f][r]; return v === v ? v : null; }
function plSeasonEnd() { const d = scGameDate(), y = d.getUTCMonth() >= 6 ? d.getUTCFullYear() + 1 : d.getUTCFullYear(); return y; } // the June this season ends
const plEndYear = i => { const d = SAVE.cEnd && SAVE.cEnd[i] ? sDate(SAVE.cEnd[i]) : null; return d ? (d.getUTCMonth() >= 6 ? d.getUTCFullYear() + 1 : d.getUTCFullYear()) : null; };
function plLoans() {
  const m = SAVE.meta.managed && SAVE.meta.managed[0]; if (!m || !SAVE.cClub) return { out: [], inn: [] };
  const out = [], inn = [];
  for (let i = 0; i < SAVE.n; i++) {
    if (!SAVE.name[i] || !SAVE.cLoan[i]) continue;
    const ci = SAVE.clubIdx[i], at = ci >= 0 ? SAVE.clubUid[ci] : null;
    if (SAVE.cClub[i] === m.uid && at !== m.uid) out.push(i); else if (at === m.uid) inn.push(i);
  }
  return { out, inn };
}
function renderPlanner() {
  if (!SAVE || !saveManagedIdx().length) return `<section class="panel"><h3>Squad planner</h3><p class="muted">The planner reads ability, potential, ages and contracts from your FM27 save. <button class="linkbtn" data-act="datapage">Load your save</button> and your club fills it in.</p></section>`;
  const mine = saveManagedIdx(), { need, from } = scNeeds(), endY = plSeasonEnd(), C = SC_COLS;
  const W = tacWorking(), sq = squadDs(), Fit = W && sq ? tacFit(W, sq) : null, xiSet = new Set(Fit ? Fit.slots.filter(x => x.pick).map(x => saveUidIndex().get(x.pick.p.uid)).filter(x => x != null) : []);
  // depth chart: each player starts in one place only (your tactic's best XI, or the best CA left for each position)
  const pc = savePos(), startAt = new Map();
  if (Fit) Fit.slots.forEach(x => { const i = x.pick ? saveUidIndex().get(x.pick.p.uid) : null; if (i != null) startAt.set(i, x.g); });
  else {
    const left = { ...need }, pairs = [];
    const main = { GK: "GK", FB: "FB", CB: "CB", DM: "DM", CM: "CM", AM: "AM", W: "Wingers", ST: "ST" };
    mine.forEach(i => POSITIONS.forEach((g, k) => { if (left[g] && (pc.bits[i] & (1 << k))) pairs.push([(SAVE.ca[i] || 0) + (main[pc.bench[i]] === g ? 12 : 0), i, g]); }));
    pairs.sort((a, b) => b[0] - a[0]).forEach(([, i, g]) => { if (!startAt.has(i) && left[g] > 0) { startAt.set(i, g); left[g]--; } });
  }
  const groups = POSITIONS.map(g => {
    const k = POSITIONS.indexOf(g);
    const all = mine.filter(i => pc.bits[i] & (1 << k)).sort((a, b) => (SAVE.ca[b] || 0) - (SAVE.ca[a] || 0));
    const st = all.filter(i => startAt.get(i) === g), l = [...st, ...all.filter(i => startAt.get(i) !== g)];
    const n = need[g] || 0, weak = st.length ? Math.min(...st.map(i => SAVE.ca[i])) : 0;
    const flags = [];
    const cover = all.filter(i => !startAt.has(i)).length;
    if (n && st.length < n) flags.push(["bad", `Only ${st.length} starter${st.length === 1 ? "" : "s"} for ${n} place${n > 1 ? "s" : ""}`]);
    if (n && cover < n) flags.push(["bad", `Thin: ${cover} backup${cover === 1 ? "" : "s"} who don't start elsewhere`]);
    st.forEach(i => { if (SAVE.age[i] >= 32) flags.push(["warn", `${SAVE.name[i]} is ${SAVE.age[i]}`]); const y = plEndYear(i); if (y && y <= endY) flags.push(["warn", `${SAVE.name[i]}'s contract ends at the end of this season`]); });
    const ready = l.filter(i => !st.includes(i) && SAVE.age[i] <= 21 && SAVE.pa[i] >= weak && SAVE.ca[i] >= weak - 15);
    ready.forEach(i => flags.push(["good", `${SAVE.name[i]} (${SAVE.age[i]}) could step up: CA ${SAVE.ca[i]}, PA ${SAVE.pa[i]}`]));
    return { g, n, l, st, flags, other: i => startAt.has(i) && startAt.get(i) !== g ? startAt.get(i) : null };
  }).filter(x => x.n || x.l.length);
  const chip = (i, role, other) => { const y = plEndYear(i), soon = y && y <= endY, yt = SAVE.age[i] <= 20; return `<button class="dchip ${role}${soon ? " exp" : ""}${other ? " else" : ""}" data-sci="${i}" title="${esc(SAVE.name[i])} · ${SAVE.age[i]} · CA ${SAVE.ca[i]} / PA ${SAVE.pa[i] > 0 ? SAVE.pa[i] : "?"}${y ? " · contract to " + y : ""}"><b>${esc(SAVE.name[i].split(" ").slice(-1)[0])}</b><span>${SAVE.age[i]} · ${SAVE.ca[i]}${SAVE.pa[i] > SAVE.ca[i] + 9 ? "→" + SAVE.pa[i] : ""}${soon ? " · ends " + y : ""}${yt ? " · youth" : ""}${other ? " · starts " + other : ""}</span></button>`; };
  let h = `<section class="panel"><div class="ph"><h3>Depth chart</h3><span class="muted small">every player at the club by position, best first (CA → PA) · starters from ${esc(from)} · red outline = contract ends this summer</span></div><div class="depth">`;
  groups.forEach(x => {
    h += `<div class="drow"><div class="dlab"><b>${esc(PL_LABEL[x.g] || x.g)}</b><span class="muted small">${x.l.length} · need ${x.n}</span></div><div class="dchips">${x.l.map(i => chip(i, x.st.includes(i) ? "start" : SAVE.age[i] <= 20 ? "youth" : "back", x.other(i))).join("") || `<span class="bad small">nobody</span>`}</div>
      ${x.flags.length ? `<div class="dflags">${x.flags.map(([c, t]) => `<span class="tag ${c}">${esc(t)}</span>`).join("")}</div>` : ""}</div>`;
  });
  h += `</div><p class="small muted">Gold = starter (${Fit ? "your tactic's best XI" : "best CA, each player starting once"}), grey = backup, blue = 20 or under, faded = starts somewhere else. A player listed at two positions shows in both. "Could step up" = 21 or under, potential at least the weakest starter's ability, and within 15 CA of him already.</p></section>`;
  // age profile (the first-team: the 25 best by CA)
  const ft = mine.filter(i => SAVE.ca[i] > 0).sort((a, b) => SAVE.ca[b] - SAVE.ca[a]).slice(0, 25);
  const bands = [["21 or under", a => a <= 21], ["22–25", a => a >= 22 && a <= 25], ["26–29", a => a >= 26 && a <= 29], ["30–32", a => a >= 30 && a <= 32], ["33+", a => a >= 33]];
  const bc = bands.map(([l, f]) => [l, ft.filter(i => f(SAVE.age[i]))]), mx = Math.max(1, ...bc.map(x => x[1].length));
  const avg = ft.reduce((s, i) => s + SAVE.age[i], 0) / (ft.length || 1);
  h += `<section class="grid2 plgrid"><div class="panel"><div class="ph"><h3>Age profile</h3><span class="muted small">your 25 best players by CA · average age <b>${avg.toFixed(1)}</b></span></div><div class="ages">${bc.map(([l, ps]) => `<div class="agerow"><span class="small">${l}</span><span class="agebar"><span style="width:${(ps.length / mx * 100).toFixed(0)}%"></span></span><b>${ps.length}</b><span class="small muted ellip">${ps.map(i => esc(SAVE.name[i].split(" ").slice(-1)[0])).join(", ")}</span></div>`).join("")}</div>
    <p class="small muted">${bc[3][1].length + bc[4][1].length >= 7 ? "An old core: plan replacements now, ability usually drops from 31–32." : bc[0][1].length + bc[1][1].length >= 12 ? "A young squad: room to grow, but experience is thin." : "A balanced spread of ages."}</p></div>`;
  // contracts by season
  const byY = new Map(); mine.forEach(i => { const y = plEndYear(i); if (!y) return; if (!byY.has(y)) byY.set(y, []); byY.get(y).push(i); });
  const ys = [...byY.keys()].sort((a, b) => a - b);
  h += `<div class="panel"><div class="ph"><h3>Contracts by season</h3><span class="muted small">when each contract ends · best players first</span></div>${scHasC() ? `<div class="cyears">${ys.map(y => { const ps = byY.get(y).sort((a, b) => SAVE.ca[b] - SAVE.ca[a]); return `<div class="cyear${y <= endY ? " now" : ""}"><b>${y - 1}/${String(y).slice(2)}</b><span class="small">${ps.length} player${ps.length > 1 ? "s" : ""}</span><span class="small ellip">${ps.slice(0, 6).map(i => `<button class="linkbtn" data-sci="${i}">${esc(SAVE.name[i].split(" ").slice(-1)[0])}</button>${xiSet.has(i) ? "★" : ""}`).join(", ")}${ps.length > 6 ? ` +${ps.length - 6}` : ""}</span></div>`; }).join("")}</div><p class="small muted">${xiSet.size ? "★ = in your tactic's best XI. " : ""}Highlighted = ends at the end of this season.</p>` : `<p class="muted small">Load your save again (version 34+) to read contracts.</p>`}</div></section>`;
  // loans
  const L = plLoans();
  const st = (lab, kk, f, d) => ({ k: kk, l: lab, c: "num", v: i => plStat(i, f), h: i => { const v = plStat(i, f); return v == null ? "–" : d ? v.toFixed(d) : Math.round(v); } });
  const base = (SNAPS || []).filter(x => x.gameDate < SAVE.meta.gameDate).pop();
  const bmap = base ? new Map(Array.from(base.uid, (u, k) => [u, k])) : null;
  const grow = { k: "grow", l: "CA ±", c: "num", v: i => { if (!bmap) return null; const k = bmap.get(SAVE.uid[i]); return k == null || !(base.ca[k] > 0) ? null : SAVE.ca[i] - base.ca[k]; }, h: i => { const k = bmap && bmap.get(SAVE.uid[i]); if (k == null || !(base.ca[k] > 0)) return "–"; const d = SAVE.ca[i] - base.ca[k]; return `<b class="${d > 0 ? "okc" : d < 0 ? "bad" : "muted"}">${d > 0 ? "+" : ""}${d}</b>`; } };
  const lcols = [C.name, C.age, C.club, C.pos, C.ca, C.pa, st("Mins", "mins", "minutes"), { ...st("Starts", "starts", "starts"), ph: 1 }, { ...st("Gls", "gls", "goals"), ph: 1 }, { ...st("Ast", "ast", "assists"), ph: 1 }, st("Rating", "rat", "average_rating", 2), ...(bmap ? [grow] : []), C.end];
  if (!SNAPS) snapList().then(() => { if (S.mode === "squad" && S.spos === "Planner") render(); });
  h += `<section class="panel" id="loanwatch"><div class="ph"><h3>Loan watch</h3><span class="muted small">your players out on loan: this season's minutes and ratings at their loan club${bmap ? ` · CA ± since your ${esc(base.gameDate)} snapshot` : " · load an older save once to see their CA growth"}</span></div>
    ${!SAVE.cClub ? `<p class="muted small">Load your save again (version 36+) to find loans.</p>` : L.out.length ? scTable("loanout", L.out.sort((a, b) => (SAVE.pa[b] || 0) - (SAVE.pa[a] || 0)), lcols, 60) : `<p class="small muted">Nobody is out on loan.</p>`}
    ${L.inn.length ? `<h4>On loan here</h4>${scTable("loanin", L.inn, [C.name, C.age, C.pos, C.ca, C.pa, st("Mins", "mins", "minutes"), st("Rating", "rat", "average_rating", 2), C.end], 20)}<p class="small muted">Contract = his contract with his parent club.</p>` : ""}
    <p class="small muted">A loan is worth it when he plays: under about 900 minutes by mid-season, think about recalling him or finding a club where he'll start.</p></section>`;
  return h;
}

