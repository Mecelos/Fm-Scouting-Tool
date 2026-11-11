// ---------- formation & roles (best XI) ----------
// FM position codes -> Scout Lab position group
const CODE_GROUP = { GK: "GK", WCB: "CB", DL: "FB", DR: "FB", WBL: "FB", WBR: "FB", DC: "CB", DM: "DM", MC: "CM", AMC: "AM", ML: "Wingers", MR: "Wingers", AML: "Wingers", AMR: "Wingers", ST: "ST" };
const CODE_LABEL = { GK: "GK", WCB: "WCB", DL: "LB", DR: "RB", WBL: "LWB", WBR: "RWB", DC: "CB", DM: "DM", MC: "CM", AMC: "AM", ML: "LM", MR: "RM", AML: "LW", AMR: "RW", ST: "ST" };
const CODE_NAME = { GK: "GK", WCB: "WCB · back 3", DL: "LB · D L", DR: "RB · D R", WBL: "LWB · WB L", WBR: "RWB · WB R", DC: "CB · D C", DM: "DM", MC: "CM · M C", AMC: "AM · AM C", ML: "LM · M L", MR: "RM · M R", AML: "LW · AM L", AMR: "RW · AM R", ST: "ST" };
const CODE_Y = { GK: 9, DL: 24, DC: 21, WCB: 23, DR: 24, WBL: 37, WBR: 37, DM: 37, ML: 55, MC: 53, MR: 55, AML: 73, AMC: 71, AMR: 73, ST: 88 };
const CODE_X = { GK: 50, DL: 10, DR: 90, WBL: 8, WBR: 92, ML: 10, MR: 90, AML: 12, AMR: 88 };
// a player listed only in the neighbouring code can still fill a slot, at a small cost
const CODE_ADJ = { DL: "WBL", WBL: "DL", DR: "WBR", WBR: "DR", ML: "AML", AML: "ML", MR: "AMR", AMR: "MR", MC: "AMC", AMC: "MC" };
// in-possession roles FM26/FM27 offers in each position (FM26 roles reference + tactics board; box-to-box roles are DM roles)
const FB_IN = ["Full-Back", "Inside Full-Back", "Inverted Full-Back", "Wing-Back", "Inside Wing-Back", "Playmaking Wing-Back"];
const WB_IN = ["Wing-Back", "Inside Wing-Back", "Inverted Wing-Back", "Playmaking Wing-Back", "Advanced Wing-Back"];
const WM_IN = ["Wide Midfielder", "Winger", "Inside Winger", "Playmaking Winger"];
const W_IN = ["Winger", "Inside Winger", "Playmaking Winger", "Half-Space Winger", "Wide Forward", "Inside Forward"];
const CODE_ROLES = {
  GK: ["Goalkeeper", "No-Nonsense GK", "Ball-Playing GK"],
  DC: ["Centre-Back", "No-Nonsense CB", "Ball-Playing CB", "Overlapping CB", "Advanced CB"],
  WCB: ["Wide CB"],
  DL: FB_IN, DR: FB_IN, WBL: WB_IN, WBR: WB_IN,
  DM: ["Defensive Midfielder", "Half-Back", "Deep-Lying Playmaker", "Box-to-Box Midfielder", "Box-to-Box Playmaker"],
  MC: ["Central Midfielder", "Midfield Playmaker", "Wide Central Midfielder", "Channel Midfielder", "Attacking Midfielder", "Advanced Playmaker"],
  ML: WM_IN, MR: WM_IN, AML: W_IN, AMR: W_IN,
  AMC: ["Attacking Midfielder", "Advanced Playmaker", "Free Role", "Second Striker", "Channel Midfielder"],
  ST: ["Centre Forward", "Poacher", "Target Forward", "Deep-Lying Forward", "False Nine", "Channel Forward"],
};
function codeRoles(code) {
  const all = ROLES[CODE_GROUP[code]] || {};
  return [...(CODE_ROLES[code] || []).filter(r => all[r]), "Balanced"];
}
// a centre-back (D C) can also play the wide centre-back slot of a back three
const canPlay = (codes, code) => codes.has(code) || (code === "WCB" && codes.has("DC"));
// [code, x (0 left .. 100 right), default in-possession role]; the goalkeeper is added to every shape
const FORMATION_PRESETS = {
  "4-4-2": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["ML", 10, "Wide Midfielder"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["MR", 90, "Wide Midfielder"], ["ST", 38, "Channel Forward"], ["ST", 62, "Deep-Lying Forward"]],
  "4-4-1-1": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["ML", 10, "Wide Midfielder"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["MR", 90, "Winger"], ["AMC", 50, "Second Striker"], ["ST", 50, "Channel Forward"]],
  "4-2-3-1": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["DM", 37, "Defensive Midfielder"], ["DM", 63, "Deep-Lying Playmaker"], ["AML", 12, "Inside Forward"], ["AMC", 50, "Attacking Midfielder"], ["AMR", 88, "Winger"], ["ST", 50, "Centre Forward"]],
  "4-2-3-1 (MC)": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["AML", 12, "Inside Forward"], ["AMC", 50, "Attacking Midfielder"], ["AMR", 88, "Winger"], ["ST", 50, "Centre Forward"]],
  "4-3-3": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["DM", 50, "Defensive Midfielder"], ["MC", 30, "Channel Midfielder"], ["MC", 70, "Midfield Playmaker"], ["AML", 12, "Inside Forward"], ["AMR", 88, "Winger"], ["ST", 50, "Centre Forward"]],
  "4-3-3 (flat)": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["MC", 26, "Channel Midfielder"], ["MC", 50, "Central Midfielder"], ["MC", 74, "Midfield Playmaker"], ["AML", 12, "Inside Forward"], ["AMR", 88, "Winger"], ["ST", 50, "Centre Forward"]],
  "4-1-4-1": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["DM", 50, "Defensive Midfielder"], ["ML", 10, "Wide Midfielder"], ["MC", 37, "Channel Midfielder"], ["MC", 63, "Central Midfielder"], ["MR", 90, "Winger"], ["ST", 50, "Centre Forward"]],
  "4-4-2 diamond": [["DL", 10, "Wing-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Wing-Back"], ["DM", 50, "Defensive Midfielder"], ["MC", 28, "Central Midfielder"], ["MC", 72, "Channel Midfielder"], ["AMC", 50, "Advanced Playmaker"], ["ST", 38, "Channel Forward"], ["ST", 62, "Deep-Lying Forward"]],
  "4-3-1-2": [["DL", 10, "Wing-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Wing-Back"], ["MC", 26, "Wide Central Midfielder"], ["MC", 50, "Central Midfielder"], ["MC", 74, "Channel Midfielder"], ["AMC", 50, "Advanced Playmaker"], ["ST", 38, "Channel Forward"], ["ST", 62, "Deep-Lying Forward"]],
  "4-3-2-1": [["DL", 10, "Wing-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Wing-Back"], ["MC", 26, "Central Midfielder"], ["MC", 50, "Midfield Playmaker"], ["MC", 74, "Channel Midfielder"], ["AMC", 33, "Attacking Midfielder"], ["AMC", 67, "Second Striker"], ["ST", 50, "Centre Forward"]],
  "4-2-2-2": [["DL", 10, "Full-Back"], ["DC", 37, "Ball-Playing CB"], ["DC", 63, "Centre-Back"], ["DR", 90, "Full-Back"], ["DM", 37, "Defensive Midfielder"], ["DM", 63, "Deep-Lying Playmaker"], ["AMC", 28, "Attacking Midfielder"], ["AMC", 72, "Advanced Playmaker"], ["ST", 38, "Channel Forward"], ["ST", 62, "Target Forward"]],
  "3-5-2": [["WCB", 25, "Wide CB"], ["DC", 50, "Centre-Back"], ["WCB", 75, "Wide CB"], ["WBL", 8, "Wing-Back"], ["DM", 50, "Defensive Midfielder"], ["MC", 32, "Channel Midfielder"], ["MC", 68, "Midfield Playmaker"], ["WBR", 92, "Wing-Back"], ["ST", 38, "Channel Forward"], ["ST", 62, "Deep-Lying Forward"]],
  "3-4-1-2": [["WCB", 25, "Wide CB"], ["DC", 50, "Ball-Playing CB"], ["WCB", 75, "Wide CB"], ["WBL", 8, "Wing-Back"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["WBR", 92, "Wing-Back"], ["AMC", 50, "Advanced Playmaker"], ["ST", 38, "Channel Forward"], ["ST", 62, "Deep-Lying Forward"]],
  "3-4-3": [["WCB", 25, "Wide CB"], ["DC", 50, "Centre-Back"], ["WCB", 75, "Wide CB"], ["WBL", 8, "Wing-Back"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["WBR", 92, "Wing-Back"], ["AML", 14, "Inside Forward"], ["AMR", 86, "Inside Forward"], ["ST", 50, "Centre Forward"]],
  "3-4-2-1": [["WCB", 25, "Wide CB"], ["DC", 50, "Ball-Playing CB"], ["WCB", 75, "Wide CB"], ["WBL", 8, "Advanced Wing-Back"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["WBR", 92, "Advanced Wing-Back"], ["AMC", 33, "Attacking Midfielder"], ["AMC", 67, "Advanced Playmaker"], ["ST", 50, "Centre Forward"]],
  "3-2-4-1": [["WCB", 25, "Wide CB"], ["DC", 50, "Ball-Playing CB"], ["WCB", 75, "Wide CB"], ["DM", 37, "Defensive Midfielder"], ["DM", 63, "Deep-Lying Playmaker"], ["AML", 10, "Winger"], ["AMC", 37, "Attacking Midfielder"], ["AMC", 63, "Advanced Playmaker"], ["AMR", 90, "Winger"], ["ST", 50, "Centre Forward"]],
  "5-3-2": [["WCB", 25, "Wide CB"], ["DC", 50, "Centre-Back"], ["WCB", 75, "Wide CB"], ["WBL", 8, "Wing-Back"], ["WBR", 92, "Wing-Back"], ["MC", 25, "Midfield Playmaker"], ["MC", 50, "Central Midfielder"], ["MC", 75, "Channel Midfielder"], ["ST", 38, "Channel Forward"], ["ST", 62, "Target Forward"]],
  "5-4-1": [["WCB", 25, "Wide CB"], ["DC", 50, "Centre-Back"], ["WCB", 75, "Wide CB"], ["WBL", 8, "Wing-Back"], ["WBR", 92, "Wing-Back"], ["ML", 10, "Wide Midfielder"], ["MC", 37, "Central Midfielder"], ["MC", 63, "Midfield Playmaker"], ["MR", 90, "Winger"], ["ST", 50, "Centre Forward"]],
};
const ROLE_ABBR = { "Goalkeeper": "GK", "Ball-Playing GK": "BPGK", "No-Nonsense GK": "NNGK", "Centre-Back": "CB", "Ball-Playing CB": "BPCB", "No-Nonsense CB": "NNCB", "Advanced CB": "ACB", "Overlapping CB": "OCB", "Wide CB": "WCB",
  "Full-Back": "FB", "Inside Full-Back": "IFB", "Inverted Full-Back": "INFB", "Wing-Back": "WB", "Inside Wing-Back": "IWB", "Inverted Wing-Back": "INWB", "Playmaking Wing-Back": "PWB", "Advanced Wing-Back": "AWB",
  "Defensive Midfielder": "DM", "Deep-Lying Playmaker": "DLP", "Half-Back": "HB", "Central Midfielder": "CM", "Box-to-Box Midfielder": "BBM", "Box-to-Box Playmaker": "BBP", "Channel Midfielder": "CHM", "Midfield Playmaker": "MP",
  "Attacking Midfielder": "AM", "Advanced Playmaker": "AP", "Free Role": "FR", "Winger": "W", "Half-Space Winger": "HSW", "Inside Winger": "IW", "Playmaking Winger": "PW", "Wide Forward": "WF", "Inside Forward": "IF",
  "Wide Midfielder": "WM", "Wide Central Midfielder": "WCM", "Centre Forward": "CF", "Poacher": "P", "Target Forward": "TF", "Deep-Lying Forward": "DLF", "False Nine": "F9", "Channel Forward": "CHF", "Second Striker": "SS", "Balanced": "Any" };
const PICK_BY = { both: "Attributes + stats", attr: "Attributes only", stats: "Stats only" };
// FM position string -> exact codes ("D (RLC), WB (R)" -> DR, DL, DC, WBR)
function posCodes(s) {
  const out = new Set(), re = /([A-Z]+(?:\/[A-Z]+)*)\s*(?:\(([RLC]+)\))?/g, txt = String(s || "").toUpperCase(); let m;
  while ((m = re.exec(txt))) {
    const sides = m[2] || "C";
    m[1].split("/").forEach(r => {
      if (r === "GK" || r === "DM" || r === "ST") out.add(r);
      else if (r === "D" || r === "M" || r === "AM") { for (const c of sides) out.add(c === "C" ? r + "C" : r + c); }
      else if (r === "WB") { for (const c of sides) if (c !== "C") out.add("WB" + c); }
    });
  }
  return out;
}
function currentSlots() {
  const name = FORMATION_PRESETS[S.formation] ? S.formation : "4-4-2";
  const saved = (S.lineups || {})[name];
  if (Array.isArray(saved) && saved.length === 11 && saved.every(s => CODE_GROUP[s.code])) return saved.map(s => codeRoles(s.code).includes(s.role) ? s : { ...s, role: codeRoles(s.code)[0] });
  return [{ code: "GK", x: 50, role: "Goalkeeper" }, ...FORMATION_PRESETS[name].map(([code, x, role]) => ({ code, x, role }))];
}
function setSlots(slots) { S.lineups = { ...(S.lineups || {}), [FORMATION_PRESETS[S.formation] ? S.formation : "4-4-2"]: slots }; }
// the role this position tab opens with: the first slot of that group in your shape, unless you picked one in the tab
function lineupRole(pos) { const s = currentSlots().find(x => CODE_GROUP[x.code] === pos); return s ? s.role : null; }
function slotFit(r, mode) {
  const s = r.sr && r.sr.overall != null ? r.sr.overall : null, a = r.ar && r.ar.overall != null ? r.ar.overall : null;
  if (mode === "stats") return s;
  if (mode === "attr" || s == null) return a;
  if (a == null) return null;
  return a + (s - 50) * 0.02; // stats move the attribute rating by up to ±1 point
}
// min-cost assignment (Hungarian), rows <= cols
function hungarian(cost) {
  const n = cost.length, m = cost[0].length, INF = 1e15;
  const u = new Array(n + 1).fill(0), v = new Array(m + 1).fill(0), p = new Array(m + 1).fill(0), way = new Array(m + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i; let j0 = 0; const minv = new Array(m + 1).fill(INF), used = new Array(m + 1).fill(false);
    do {
      used[j0] = true; const i0 = p[j0]; let delta = INF, j1 = 0;
      for (let j = 1; j <= m; j++) if (!used[j]) {
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= m; j++) if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const ans = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) if (p[j]) ans[p[j] - 1] = j - 1;
  return ans;
}
// best XI for your shape and roles: every slot scored with that slot's role, then the 11 picked together so the total is highest
function computeLineup() {
  const sq = squadDs(), kinds = sq ? squadKinds(sq) : [];
  let mode = S.pickBy || "both";
  if (!kinds.includes("attr")) mode = "stats"; else if (!kinds.includes("stats") && mode !== "attr") mode = "attr";
  const scale = mode === "stats" ? 100 : 20, pen = scale * 0.04;
  const slots = currentSlots().map((s, i) => {
    const group = CODE_GROUP[s.code], e = squadEval(group, s.role);
    return { ...s, i, group, e, label: CODE_LABEL[s.code] };
  });
  const players = new Map();
  slots.forEach(s => s.e.mine.forEach(r => { if (!players.has(r.p.ix)) players.set(r.p.ix, r.p); }));
  const ids = [...players.keys()];
  const codes = new Map(ids.map(ix => [ix, posCodes(players.get(ix).position || players.get(ix).bestPos)]));
  const BIG = 1e6;
  slots.forEach(s => {
    const byIx = new Map(s.e.mine.map(r => [r.p.ix, r]));
    s.cand = ids.map(ix => {
      const r = byIx.get(ix); if (!r) return null;
      const c = codes.get(ix), exact = canPlay(c, s.code), adj = !exact && CODE_ADJ[s.code] && canPlay(c, CODE_ADJ[s.code]);
      if (!exact && !adj) return null;
      let f = slotFit(r, mode);
      const noData = f == null;
      if (noData) f = mode === "stats" ? 0 : null;
      if (f == null) return null;
      return { r, fit: f - (adj ? pen : 0), raw: f, adj, noData };
    });
  });
  const m = Math.max(ids.length, slots.length);
  const cost = slots.map(s => Array.from({ length: m }, (_, j) => { const c = j < ids.length ? s.cand[j] : null; return c ? -(c.fit + (c.noData ? -1000 : 0)) : BIG; }));
  const asg = ids.length ? hungarian(cost) : slots.map(() => -1);
  const used = new Set();
  slots.forEach((s, i) => {
    const j = asg[i], c = j >= 0 && j < ids.length ? s.cand[j] : null;
    s.pick = c || null; if (c) { used.add(ids[j]); c.r.ev = s.e; }
  });
  slots.forEach(s => {
    s.alts = s.cand.filter(c => c && !used.has(c.r.p.ix) && !c.noData).sort((a, b) => b.fit - a.fit).slice(0, 2);
  });
  const xi = {}, f = {}; POSITIONS.forEach(p => { xi[p] = []; f[p] = 0; });
  slots.forEach(s => { f[s.group]++; if (s.pick) xi[s.group].push(s.pick.r); });
  POSITIONS.forEach(p => xi[p].sort((a, b) => (b.cmb ?? -1) - (a.cmb ?? -1)));
  const fits = slots.filter(s => s.pick && !s.pick.noData).map(s => s.pick.fit);
  return { slots, xi, f, used, mode, scale, avg: fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : null };
}
const fitTxt = (v, X) => v == null ? "–" : X.scale === 100 ? Math.round(v) : v.toFixed(1);
function renderPitch(X) {
  const Y = y => (116 - y * 1.08).toFixed(1);
  let s = `<svg class="pitch" viewBox="0 0 100 120" role="img" aria-label="Best XI on the pitch"><rect x="1" y="1" width="98" height="118" rx="2" class="pg"/>
    <g class="pl"><rect x="3" y="3" width="94" height="114"/><line x1="3" y1="60" x2="97" y2="60"/><circle cx="50" cy="60" r="9"/><rect x="27" y="3" width="46" height="15"/><rect x="27" y="102" width="46" height="15"/></g>`;
  X.slots.forEach(sl => {
    const x = (CODE_X[sl.code] ?? sl.x), y = Y(CODE_Y[sl.code]), tx = Math.min(87, Math.max(13, x));
    const pk = sl.pick, r = pk && pk.r, col = r && sl.e.hasRef && r.cmb != null ? heat(r.cmb) : "var(--panel2)";
    const nm = r ? r.p.name.split(" ").slice(-1)[0] : "—";
    s += `<g class="slot${pk ? "" : " empty"}"${r ? ` data-spos="${sl.group}" data-open="${r.p.ix}"` : ""} tabindex="${r ? 0 : -1}">
      <circle cx="${x}" cy="${y}" r="4.2" style="fill:${col}"/><text x="${x}" y="${y}" class="sc">${esc(ROLE_ABBR[sl.role] || sl.label)}</text>
      <text x="${tx}" y="${(+y + 7.4).toFixed(1)}" class="sn">${esc(nm.length > 13 ? nm.slice(0, 12) + "…" : nm)}</text>
      <text x="${tx}" y="${(+y + 11.2).toFixed(1)}" class="sf">${pk ? fitTxt(pk.raw, X) + (pk.adj ? " ·" + sl.label : "") : "empty"}</text></g>`;
  });
  return s + `</svg>`;
}
function renderLineup(X) {
  const names = Object.keys(FORMATION_PRESETS);
  let h = `<section class="panel lineup"><div class="ph"><h3>Formation & roles · best XI</h3><span class="muted small">${X.avg != null ? `average fit <b>${fitTxt(X.avg, X)}</b>${X.scale === 20 ? "/20" : ""}` : ""}</span></div>
    <div class="lctl"><label class="fl"><span class="small muted">Formation</span><select id="formation">${names.map(f => `<option ${f === S.formation ? "selected" : ""}>${esc(f)}</option>`).join("")}</select></label>
    <label class="fl"><span class="small muted">Pick by</span><select id="pickBy">${Object.entries(PICK_BY).map(([k, l]) => `<option value="${k}" ${k === X.mode ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
    <button class="ghost small" data-act="resetlineup">Reset positions & roles</button></div>
    <div class="lgrid"><div class="pitchwrap">${renderPitch(X)}</div><div class="slotlist">`;
  X.slots.forEach(sl => {
    const pk = sl.pick, r = pk && pk.r;
    h += `<div class="slotrow"><div class="slh"><b class="sll">${esc(sl.label)}</b>
      <select class="slotpos" data-i="${sl.i}" aria-label="Position for slot ${sl.i + 1}">${Object.keys(CODE_GROUP).filter(c => (c === "GK") === (sl.code === "GK")).map(c => `<option value="${c}" ${c === sl.code ? "selected" : ""}>${esc(CODE_NAME[c])}</option>`).join("")}</select>
      <select class="slotrole" data-i="${sl.i}" aria-label="Role for slot ${sl.i + 1}">${codeRoles(sl.code).map(ro => `<option ${ro === sl.role ? "selected" : ""}>${esc(ro)}</option>`).join("")}</select></div>
      <div class="slp">${r ? `<button class="linkbtn" data-spos="${sl.group}" data-open="${r.p.ix}">${esc(r.p.name)}</button> <span class="muted small">${r.p.age ?? "?"} · ${r.p.mins ?? 0} mins${pk.adj ? ` · plays ${esc(CODE_LABEL[CODE_ADJ[sl.code]])}` : ""}${!isSenior(r.p) ? " · youth" : ""}</span>` : `<span class="bad small">Nobody in the squad plays ${esc(CODE_NAME[sl.code])} or next to it</span>`}
      ${pk ? `<b class="slfit" style="background:${sl.e.hasRef && r.cmb != null ? heat(r.cmb) : "var(--panel2)"}" title="${X.scale === 20 ? "Fit out of 20" : "Stats score 0–100"}${sl.e.hasRef && r.cmb != null ? ` · better than ${Math.round(r.cmb)}% of the ${sl.group} pool` : ""}">${pk.noData ? "–" : fitTxt(pk.raw, X)}</b>` : ""}</div>
      ${sl.alts.length ? `<div class="slalt small muted">Next: ${sl.alts.map(c => `<button class="linkbtn" data-spos="${sl.group}" data-open="${c.r.p.ix}">${esc(c.r.p.name)}</button> ${fitTxt(c.raw, X)}`).join(" · ")}</div>` : ""}</div>`;
  });
  h += `</div></div><p class="small muted">${X.mode === "stats" ? "Fit = his stats score for that slot's role (0–100, 50 = average of that position's pool)." : X.mode === "attr" ? "Fit = his attribute rating for that slot's role, out of 20 (the FM27-weighted rating)." : "Fit = his attribute rating for that slot's role (out of 20), moved up or down by up to 1 point by his stats in that role against the pool."} The XI is picked all at once so the total fit is highest, and nobody plays twice. A player listed only in the next-door position (LB for LWB, LM for LW, CM for AM) can fill it at a small cost. Colour = better than X% of that position's scouting pool (grey = no scouting file). Tap a name for his breakdown.</p></section>`;
  return h;
}

