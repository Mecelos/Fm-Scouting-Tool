// ---------- Opponent line-ups: formation, roles and likely XI from their last games' team sheets ----------
// FM keeps both team sheets for every match in your league and cups (SAVE.matches.lu[row]: [{ n name, h 0 home/1 away,
// s start position, p end position, ip, oop role bits, op out-of-possession position }]). Positions and roles use the tactic-file bits (POS_BITS, IP_BITS).
const OL_N = 6;   // how many recent games the report reads
const OL_ORDER = ["GK", "DR", "WBR", "DCR", "DC", "DCL", "DL", "WBL", "DMR", "DM", "DML", "MR", "MCR", "MC", "MCL", "ML", "AMR", "AMCR", "AMC", "AMCL", "AML", "STR", "ST", "STL"];
const OL_LINE = { GK: -1, DR: 0, DL: 0, DC: 0, WBR: 0, WBL: 0, DM: 1, MR: 2, ML: 2, MC: 2, AMR: 3, AML: 3, AMC: 3, ST: 4 };
function olSlot(p) {
  const base = p & 0x1ffff, code = POS_BITS[base]; if (!code) return null;
  const side = p & 0x100000 ? "L" : p & 0x200000 ? "R" : base === 0x8000 ? "R" : base === 0x10000 ? "L" : "";
  const two = ["DC", "DM", "MC", "AMC", "ST"].includes(code);   // centre slots carry a side when there are two or three of them
  return { code, slot: two && side ? code + side : code };
}
function olRoleIP(hex) { return hex ? upRole(hex) : null; }
function olRoleOOP(hex) { if (!hex) return null; try { const r = OOP_BITS.get(BigInt("0x" + hex) & ~DUTY_MASK); return r || null; } catch (e) { return null; } }
function olFormation(xi) {
  const n = [0, 0, 0, 0, 0]; xi.forEach(x => { const l = OL_LINE[x.code]; if (l >= 0) n[l]++; });
  return n.filter(v => v > 0).join("-");
}
// a club's players by name, to link a team-sheet name to a player in the save (and spot those who have left)
function olNames(club) {
  if (!SAVE._olN) SAVE._olN = new Map();
  if (SAVE._olN.has(club)) return SAVE._olN.get(club);
  const at = new Map(), any = new Map();
  for (let i = 0; i < SAVE.n; i++) { const k = gsNorm(SAVE.name[i]); if (SAVE.clubIdx[i] === club) at.set(k, i); else if (!any.has(k)) any.set(k, i); }
  const r = { at, any }; SAVE._olN.set(club, r); return r;
}
function olData(B, t) {
  const M = B.M; if (!M || !M.lu) return null;
  const k = B.byTeam.get(t), club = k != null ? B.TM.club[k] : -1, nm = club >= 0 ? olNames(club) : null;
  const find = n => { const q = gsNorm(n); if (!nm) return { i: null, left: false }; if (nm.at.has(q)) return { i: nm.at.get(q), left: false }; return nm.any.has(q) ? { i: nm.any.get(q), left: true } : { i: null, left: false }; };
  const rows = B.order.filter(r => (M.home[r] === t || M.away[r] === t) && M.hg[r] !== 255 && !mxFriendly(M.comps[M.comp[r]]) && M.lu[r]).slice(-OL_N).reverse();
  if (!rows.length) return null;
  const games = rows.map(r => {
    const home = M.home[r] === t, side = home ? 0 : 1, L = M.lu[r];
    const xi = L.filter(x => x.h === side && x.s).map(x => { const sl = olSlot(x.s); const os = x.op ? olSlot(x.op) : null; return sl ? { ...sl, n: x.n, ip: olRoleIP(x.ip), oop: olRoleOOP(x.oop), os: os || sl, ...find(x.n) } : null; }).filter(Boolean)
      .sort((a, b) => OL_ORDER.indexOf(a.slot) - OL_ORDER.indexOf(b.slot));
    const subs = L.filter(x => x.h === side && !x.s && x.p).map(x => x.n);
    const gf = home ? M.hg[r] : M.ag[r], ga = home ? M.ag[r] : M.hg[r];
    return { r, home, opp: home ? M.away[r] : M.home[r], gf, ga, res: gf > ga ? "W" : gf < ga ? "L" : "D", comp: M.comps[M.comp[r]], xi, subs,
      form: xi.length === 11 ? olFormation(xi) : "?", oform: xi.length === 11 ? olFormation(xi.map(x => x.os)) : "?" };
  });
  games.forEach((g, j) => { const nx = games[j + 1]; g.changes = nx && nx.xi.length >= 10 ? g.xi.filter(x => !nx.xi.some(y => y.n === x.n)).length : null; });
  const forms = new Map(); games.forEach(g => { if (g.form !== "?") forms.set(g.form, (forms.get(g.form) || 0) + 1); });
  const main = [...forms.entries()].sort((a, b) => b[1] - a[1] || 0)[0];
  const tmpl = main ? games.find(g => g.form === main[0]) : games[0];   // the most recent game in their usual shape
  // likely XI: for each slot of that shape, who started there most (recent games count more); players who've left are skipped
  const used = new Set(), xi = [];
  tmpl.xi.forEach(sl => {
    const cand = new Map();
    games.forEach((g, j) => g.xi.forEach(x => { if (x.slot !== sl.slot || x.left) return; const c = cand.get(x.n) || { x, w: 0, starts: 0, ip: new Map(), oop: new Map() }; c.w += games.length - j; c.starts++; if (x.ip) c.ip.set(x.ip, (c.ip.get(x.ip) || 0) + 1); if (x.oop) c.oop.set(x.oop, (c.oop.get(x.oop) || 0) + 1); cand.set(x.n, c); }));
    const best = [...cand.values()].filter(c => !used.has(c.x.n)).sort((a, b) => b.w - a.w)[0];
    const top = m => [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) { used.add(best.x.n); xi.push({ slot: sl.slot, code: sl.code, os: sl.os.code !== sl.code ? sl.os.slot : null, n: best.x.n, i: best.x.i, starts: best.starts, ip: (top(best.ip) || [sl.ip])[0], oop: (top(best.oop) || [sl.oop])[0] }); }
    else xi.push({ slot: sl.slot, code: sl.code, os: sl.os.code !== sl.code ? sl.os.slot : null, n: "?", i: null, starts: 0, ip: sl.ip, oop: sl.oop });
  });
  const left = [...new Set(games.flatMap(g => g.xi.filter(x => x.left).map(x => x.n)))];
  return { t, club, games, forms, main: main ? main[0] : null, mainN: main ? main[1] : 0, oform: tmpl.oform, xi, left };
}
// what their shape and roles suggest, in plain words, with at most a small cost to your own tactic
function olTips(O) {
  if (!O || !O.xi.length) return [];
  const out = [], X = O.xi, has = (codes, roles) => X.filter(x => codes.includes(x.code) && (!roles || roles.includes(x.ip)));
  const nm = x => x.i != null ? `<button class="linkbtn" data-sci="${x.i}">${esc(x.n)}</button>` : `<b>${esc(x.n)}</b>`;
  const mine = typeof currentSlots === "function" ? currentSlots().map(s => s.code) : [];
  const myWide = c => mine.some(m => (c === "R" ? ["AMR", "MR"] : ["AML", "ML"]).includes(m));
  // their full-backs/wing-backs who bomb on: leave your winger up on that side to counter into the space
  const att = has(["DR", "DL", "WBR", "WBL"], ["Wing-Back", "Advanced Wing-Back", "Playmaking Wing-Back"]);
  if (att.length) { const x = att[0], side = /R$/.test(x.code) ? "R" : "L", mySide = side === "R" ? "left" : "right";
    out.push({ w: `Leave your ${mySide} winger up when they attack: OOP role <b>Wide Outlet Winger</b>`, why: `${nm(x)} plays as a ${esc(x.ip)} and gets forward, so the space behind him is open for your counter${myWide(side === "R" ? "L" : "R") ? "" : " (only if you play a winger on that side)"}`, cost: "one out-of-possession role on one player" }); }
  // their deep playmaker: press him
  const pm = has(["DM", "MC"], ["Deep-Lying Playmaker", "Half-Back", "Midfield Playmaker", "Box-to-Box Playmaker"]);
  if (pm.length) out.push({ w: `${nm(pm[0])}: opposition instruction <b>Trigger press: Always</b>`, why: `He starts their attacks from deep as a ${esc(pm[0].ip)}; pressure on the ball stops him picking passes`, cost: "none on familiarity: opposition instructions don't change your tactic", oi: pm[0].n });
  // a target man: mark him tight
  const tf = has(["ST"], ["Target Forward"]);
  if (tf.length) out.push({ w: `${nm(tf[0])}: opposition instruction <b>Tight marking: Always</b>`, why: `He's their Target Forward: long balls go to him, so don't let him win them unchallenged`, cost: "none on familiarity", oi: tf[0].n });
  // two strikers against your back four: keep a full-back home
  const st = has(["ST"]).length, dc = has(["DC"]).length;
  if (st >= 2) out.push({ w: `Keep one full-back at home: OOP role <b>Holding Full-Back</b> on your weaker side`, why: `They start two strikers, who pin both your centre-backs; with both full-backs up you're two against two at the back`, cost: "one out-of-possession role on one player" });
  if (dc >= 3) out.push({ w: `Keep your wide players high and wide`, why: `They play a back ${dc + has(["WBR", "WBL", "DR", "DL"]).length} with three centre-backs; the channels between their wing-backs and outside centre-backs are where you get in`, cost: "none if your wingers already play wide; otherwise one role change" });
  const inv = has(["DR", "DL", "WBR", "WBL"], ["Inverted Wing-Back", "Inverted Full-Back", "Inside Full-Back"]);
  if (inv.length) out.push({ w: `Use your width`, why: `${nm(inv[0])} tucks into midfield (${esc(inv[0].ip)}), which leaves the touchline empty on that side`, cost: "none if you already play wingers" });
  if (!has(["DM"]).length && has(["MC"]).length <= 2 && X.length >= 10) out.push({ w: `Get a man between their lines`, why: `They have no defensive midfielder, so the space in front of their centre-backs is free for your attacking midfielder or a dropping forward`, cost: "none if you already play an attacking midfielder" });
  return out;
}
function olHtml(B, t, brief) {
  const O = olData(B, t); if (!O) return "";
  const name = mxName(B, t), G = O.games;
  const forms = [...O.forms.entries()].sort((a, b) => b[1] - a[1]).map(([f, n]) => `<b>${esc(f)}</b> ×${n}`).join(" · ");
  const xi = `<div class="tscroll"><table class="gtable narrow"><thead><tr><th>Pos</th><th>Likely starter</th><th class="num">Starts</th><th>In possession</th><th>Out of possession</th></tr></thead><tbody>
    ${O.xi.map(x => `<tr><td class="small">${esc(x.slot)}</td><td>${x.i != null ? `<button class="linkbtn" data-sci="${x.i}">${esc(x.n)}</button>` : esc(x.n)}</td><td class="num small">${x.starts}/${G.length}</td><td class="small">${esc(x.ip || "–")}</td><td class="small">${esc(x.oop || "–")}${x.os ? ` <span class="muted">(moves to ${esc(x.os)})</span>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
  const games = G.map(g => `<li><b class="${mxResCls(g.res)}">${g.res} ${g.gf}–${g.ga}</b> ${g.home ? "v" : "at"} ${esc(mxName(B, g.opp))} <span class="small muted">· ${esc(g.comp)} · ${esc(g.form)}${g.changes != null ? ` · ${g.changes} change${g.changes === 1 ? "" : "s"}` : ""}</span>
    ${brief ? "" : `<div class="small muted">${g.xi.map(x => `${esc(x.n)} <span class="olpos">${esc(x.slot)}${x.ip ? ", " + esc(x.ip) : ""}</span>`).join(" · ")}</div>`}</li>`).join("");
  return `<section class="panel"><div class="ph"><h3>How ${esc(name)} line up</h3><span class="small muted">from their last ${G.length} team sheet${G.length === 1 ? "" : "s"} in the save</span></div>
    <p>Shape: ${forms || "–"}${O.main ? ` <span class="small muted">(${O.mainN} of ${G.length} games)</span>` : ""}${O.oform && O.oform !== "?" && O.oform !== O.main ? ` · out of possession it becomes <b>${esc(O.oform)}</b>` : ""}</p>
    <h4>Likely XI and roles</h4>${xi}
    ${O.left.length ? `<p class="small muted">Started recently but no longer at the club: ${O.left.map(esc).join(", ")}.</p>` : ""}
    <h4>Game by game</h4><ul class="why olgames">${games}</ul>
    <p class="small muted">Line-ups are read for games FM keeps in full: your league and cups. Injuries and suspensions aren't checked, so look at their squad in FM before the game.</p></section>`;
}
// the two changes for the game: their line-up first (roles are certain), then their numbers; OIs don't touch familiarity
function olChanges(B, t, numTips) {
  const L = olTips(olData(B, t)), out = L.filter(x => !x.oi).map(x => [x.w, x.why + ` (cost: ${x.cost})`]);
  return out.concat(numTips || []).slice(0, 2);
}
function olOIs(B, t, ois) {
  const L = olTips(olData(B, t)).filter(x => x.oi), seen = new Set((ois || []).map(x => x.w));
  return (ois || []).concat(L.filter(x => ![...seen].some(w => w.includes(esc(x.oi)))).map(x => ({ w: x.w, why: x.why + ".", cost: "None on familiarity." }))).slice(0, 3);
}
