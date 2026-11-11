// ---------- out-of-possession shape: every formation scored as a defensive shape for the XI picked with the ball ----------
// FM27 lets the team defend in a different formation. Each player is moved to the slot where his defensive attributes
// (the out-of-possession role keys) count most, with hard limits that keep it sane: nobody switches flank and nobody
// changes more than one line (the sanity check flags longer moves). Same shape gets a familiarity bonus, the style a small one.
const OOP_SAME_BONUS = 0.25, OOP_FM27_BONUS = 0.3, OOP_STYLE_FIT = {
  counter: n => /^5-|4-5-1|4-4-1-1|4-1-4-1|5-4-1/.test(n) ? 0.15 : 0,
  press: n => ["4-3-3", "4-4-2", "4-2-3-1", "4-4-2 diamond", "4-3-1-2", "3-4-3", "4-2-2-2"].includes(n) ? 0.15 : 0,
  possession: n => /^4-/.test(n) ? 0.05 : 0, balanced: () => 0 };
// shapes: the tool's formations plus FM27's own defensive shapes that aren't among them (e.g. 4-4-1-1 with 2 DMs)
const shKey = arr => arr.map(x => x[0]).sort().join(" ");
let FM27X = null;
function fm27Index() {
  if (FM27X || typeof FM27 === "undefined") return FM27X;
  const mine = new Map(Object.entries(FORMATION_PRESETS).map(([n, v]) => [shKey(v), n])), toMine = {}, extra = {};
  Object.entries(FM27.shapes).forEach(([n, v]) => { const m = mine.get(shKey(v)); if (m) toMine[n] = m; else { toMine[n] = n; extra[n] = v; } });
  const fromMine = {}; Object.entries(toMine).forEach(([f, m]) => { fromMine[m] = f; });
  return (FM27X = { toMine, fromMine, extra });
}
const shapeSlots = name => FORMATION_PRESETS[name] || (fm27Index() && fm27Index().extra[name]) || null;
const OOP_SHAPE_NAMES = () => Object.keys(FORMATION_PRESETS).concat(fm27Index() ? Object.keys(fm27Index().extra) : []);
const FM27_STYLES = { possession: ["Control Possession", "Tiki-Taka"], press: ["Gegenpress", "Vertical Tiki-Taka"], counter: ["Fluid Counter Attack", "Direct Counter Attack"], balanced: ["Control Possession", "Wingplay", "Fluid Counter Attack"] };
function fm27Pairs(ipName) { // FM27's out-of-possession partners for this in-possession shape, by the tool's names
  const X = fm27Index(); if (!X) return {}; const f = X.fromMine[ipName]; const P = f && FM27.pairs[f]; if (!P) return {};
  const out = {}; Object.entries(P).forEach(([o, v]) => { out[X.toMine[o]] = v; }); return out;
}
function oopValue(p, code) { // how well he defends in this slot: best out-of-possession role keys, blended with his overall quality there
  const pool = OOP_ROLES[OOP_POOL[code]] || []; let best = null;
  pool.forEach(([r]) => { const keys = OOP_KEYS[r]; if (!keys) return; const v = mean(keys.map(k => p.a[k])); if (v != null && (best == null || v > best)) best = v; });
  const gen = bestRoleIn(p, code); return best == null ? (gen ? gen.v : null) : gen ? 0.6 * best + 0.4 * gen.v : best;
}
// what the shape does without the ball, for the line of engagement: players behind the ball, two per flank, and whether
// the men asked to drop (or to press from the front) have the legs and discipline for it
const OOP_BEHIND = { "Low Block": [9, 10], "Mid Block": [8, 9], "High Press": [7, 8] };
function oopStructure(pairs, I) {
  const eng = I.engagement || "Mid Block", [lo, hi] = OOP_BEHIND[eng] || [8, 9], out = { pen: 0, why: [] };
  const rowO = x => TAC_ROW[x.o.code], behind = pairs.filter(x => x.o.code !== "GK" && rowO(x) <= 4).length;
  if (behind < lo) { out.pen += 0.25 * (lo - behind); out.why.push(`only ${behind} behind the ball for a ${eng.toLowerCase()}`); }
  if (behind > hi) { out.pen += 0.2 * (behind - hi); out.why.push(`${behind} behind the ball leaves nobody to press or break`); }
  if (eng !== "High Press") ["L", "R"].forEach(sd => { const n = pairs.filter(x => x.o.side === sd && rowO(x) <= 4 && x.o.code !== "GK").length; if (n < 2) { out.pen += 0.2; out.why.push(`one defender on the ${sd === "L" ? "left" : "right"}`); } });
  const k = (p, ks) => mean(ks.map(a => p.a[a]));
  pairs.forEach(x => { const p = x.s.pick.p, drop = TAC_ROW[x.s.code] - rowO(x);
    if (drop > 0) out.pen -= 0.05 * ((k(p, ["Work Rate", "Stamina", "Teamwork", "Positioning"]) ?? 12) - 12);              // good trackers make dropping worth it
    if (eng === "High Press" && rowO(x) >= 5) out.pen -= 0.03 * ((k(p, ["Work Rate", "Stamina", "Aggression", "Anticipation"]) ?? 12) - 12); });
  return out;
}
function oopShape(slots, ipName, style, I) {
  const P = slots.filter(s => s.pick); if (P.length < 11) return null;
  const sideIP = s => s.side, rowIP = s => TAC_ROW[s.code];
  const FP = fm27Pairs(ipName);
  const res = OOP_SHAPE_NAMES().map(name => {
    const O = [["GK", 50], ...shapeSlots(name)].map(([code, x], i) => ({ i, code, x, side: sideOf(code, x) }));
    const fm = FP[name], mv = new Set(fm ? fm.moves : []);
    const fitM = P.map(s => O.map(o => {
      if ((s.code === "GK") !== (o.code === "GK")) return null;
      const dr = Math.abs(rowIP(s) - TAC_ROW[o.code]); if (dr >= 2) return null;                       // the sanity check's "long move" limit
      if (sideIP(s) !== "C" && o.side !== "C" && sideIP(s) !== o.side) return null;                       // never swap flanks
      const c = posCodes(s.pick.p.position || s.pick.p.bestPos), exact = canPlay(c, o.code) || o.code === s.code, adj = !exact && CODE_ADJ[o.code] && canPlay(c, CODE_ADJ[o.code]);
      const v = oopValue(s.pick.p, o.code); if (v == null) return null;
      const move = (o.code === s.code ? 0 : 0.12) + 0.15 * dr + 0.004 * Math.abs((s.x ?? CODE_X[s.code] ?? 50) - o.x) + (sideIP(s) !== o.side ? 0.1 : 0) - (mv.has(s.code + ">" + o.code) && o.code !== s.code ? 0.1 : 0);   // the moves FM27's own presets make
      return { v, fit: v - (exact ? 0 : adj ? 0.4 : 1.0) - move, exact, adj, dr };
    }));
    const cost = fitM.map(r => r.map(x => x ? -x.fit : 1e6)), asg = hungarian(cost);
    if (asg.some((j, i) => j < 0 || !fitM[i][j])) return null;
    const pairs = P.map((s, i) => ({ s, o: O[asg[i]], f: fitM[i][asg[i]] }));
    const fit = mean(pairs.map(x => x.f.v)), moves = pairs.filter(x => x.o.code !== x.s.code).length, lines = pairs.filter(x => x.f.dr > 0).length, unfam = pairs.filter(x => !x.f.exact).length;
    const st = oopStructure(pairs, I || {});
    const backs = arr => arr.filter(x => ["DC", "WCB", "DL", "DR", "WBL", "WBR"].includes(x) ).length >= 5 || arr.filter(x => ["DC", "WCB"].includes(x)).length >= 3 ? "three" : "four";
    if (!fm && backs(P.map(s => s.code)) !== backs(O.map(o => o.code))) { st.pen += 0.3; st.why.push("changes the back line"); }   // FM27 only does this in pairs it designed
    const nMove = pairs.filter(x => x.o.code !== x.s.code).length; if (nMove > 4) { st.pen += 0.06 * (nMove - 4); st.why.push(`${nMove} players change position`); }
    const same = name === ipName, score = mean(pairs.map(x => x.f.fit)) - st.pen + (same ? OOP_SAME_BONUS : 0) + (fm ? OOP_FM27_BONUS : 0) + ((OOP_STYLE_FIT[style] || (() => 0))(name));
    const behind = pairs.filter(x => x.o.code !== "GK" && TAC_ROW[x.o.code] <= 4).length;
    return { name, pairs, fit, moves, lines, unfam, same, score, behind, why: st.why, fm27: fm ? fm.styles : null, fm27Roles: fm ? fm.roles : null };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
  return res;
}
// FM27's own preset for this pair and style: prefer its role in a slot when the player suits it nearly as well, and only if nothing then contradicts
function fm27RolePrior(slots, style, ins, sh) {
  const R = sh.fm27Roles; if (!R) return;
  const st = (FM27_STYLES[style] || []).find(k => R[k]) || Object.keys(R)[0], rows = R[st]; if (!rows) return;
  const key = (p, r) => { const ks = OOP_KEYS[r]; return ks ? mean(ks.map(k => p.a[k])) : null; };
  const base = tacticSanity(slots, ins), bad0 = base ? base.bad.length : 0;
  slots.filter(s => s.pick && s.oopCode).forEach(s => {
    const cand = rows.filter(r => r[0] === s.code && r[2] === s.oopCode).sort((a, b) => Math.abs(a[3] - (s.oopX ?? 50)) - Math.abs(b[3] - (s.oopX ?? 50)))[0];
    if (!cand) return; const r27 = cand[4]; s.fm27 = { role: r27, style: st };
    if (r27 === s.oop || !(OOP_ROLES[OOP_POOL[s.oopCode]] || []).some(([r]) => r === r27)) return;
    const a = key(s.pick.p, r27), b = key(s.pick.p, s.oop); if (a == null || (b != null && a < b - 0.3)) return;
    const keep = [s.oop, s.oopWhy]; s.oop = r27; s.oopWhy = `FM27's own ${st} preset uses ${r27} here, and his ${(OOP_KEYS[r27] || []).slice(0, 3).join(", ")} suit it.`;
    const now = tacticSanity(slots, ins); if (now && now.bad.length > bad0) [s.oop, s.oopWhy] = keep;
  });
}
function applyOopShape(slots, sh) {
  sh.pairs.forEach(({ s, o }) => { s.oopCode = o.code; s.oopX = o.x; s.oopSide = o.side; });
}
// assignOop works on the out-of-possession positions: run it on copies that stand where the player defends
function withOopPositions(slots, fn) {
  const prox = slots.map(s => s.pick ? { ...s, code: s.oopCode || s.code, side: s.oopSide || s.side, group: CODE_GROUP[s.oopCode || s.code], x: s.oopX ?? s.x, ipCode: s.code } : s);
  fn(prox);
  prox.forEach((p, i) => { if (slots[i].pick) { slots[i].oop = p.oop; slots[i].oopWhy = p.oopWhy; } });
}
let tacticMemo = { k: null, v: null };
function suggestTactic(sq) {
  const mk = [sq.id, S.tStyle, S.tBack, S.tForm, S.tOop].join("|");
  if (tacticMemo.k === mk) return tacticMemo.v;
  if (rateCache.sq !== sq.id) { rateCache.clear(); rateCache.sq = sq.id; }
  const v = buildTactic(sq);
  tacticMemo = { k: mk, v };
  return v;
}
function buildTactic(sq) {
  if (!squadKinds(sq).includes("attr")) return { error: "This squad file has no attributes, so roles can't be rated. Add the attribute columns to your squad view and export again." };
  const m = buildModel({ ...sq, id: sq.id + "|attr", mode: "attr" });
  const players = m.players.filter(p => posCodes(p.position || p.bestPos).size);
  const codes = new Map(players.map(p => [p.ix, posCodes(p.position || p.bestPos)]));
  const names = Object.keys(FORMATION_PRESETS);
  // top players: best rating anywhere he can play; a shape that benches them is marked down
  const best = players.map(p => ({ p, ...[...codes.get(p.ix)].map(c => ({ code: c, ...(bestRoleIn(p, c) || { v: 0 }) })).sort((a, b) => b.v - a.v)[0] })).sort((a, b) => b.v - a.v);
  const top8 = new Set(best.slice(0, 8).map(x => x.p.ix));
  const all = names.map(n => {
    const f = evalFormation(n, players, codes);
    f.stars = [...f.used].filter(ix => top8.has(ix)).length;
    f.score = 0.75 * f.xi + 0.25 * f.cover + 0.03 * f.stars;
    return f;
  }).sort((a, b) => b.score - a.score);
  const allowed = all.filter(f => S.tBack === "any" || !S.tBack || (S.tBack === "four" ? f.back === "four" : f.back === "three"));
  const chosen = (S.tForm && S.tForm !== "best" && all.find(f => f.name === S.tForm)) || allowed[0] || all[0];
  // key men: where each top player plays in this shape, or the best-ranked shape that starts him
  const keyMen = best.slice(0, 8).map((x, i) => {
    const sl = chosen.slots.find(s => s.pick && s.pick.p.ix === x.p.ix);
    const alt = sl ? null : all.find(f => f.used.has(x.p.ix));
    return { ...x, rank: i + 1, slot: sl, alt };
  });
  const slots = chosen.slots.map(s => ({ ...s, pick: s.pick ? { ...s.pick } : null }));
  const P0 = teamProfile(slots);
  const det = detectStyle(P0);
  const style = !S.tStyle || S.tStyle === "auto" ? det.style : S.tStyle;
  const notes = refineRoles(slots, style);
  const P = teamProfile(slots);
  const ins = suggestInstructions(slots, style, P);
  alignInstructions(slots, ins);
  const oopRank = oopShape(slots, chosen.name, style, ins.I) || [];
  const oopPick = (S.tOop && S.tOop !== "best" && oopRank.find(x => x.name === S.tOop)) || oopRank[0] || null;
  if (oopPick) applyOopShape(slots, oopPick);
  withOopPositions(slots, prox => { assignOop(prox, style, ins.I); alignAfterOop(prox, ins); });
  if (oopPick) fm27RolePrior(slots, style, ins, oopPick);
  const xiFit = mean(slots.map(s => s.pick ? s.pick.fit : 8));
  const sanity = tacticSanity(slots, ins, chosen);
  return { all, allowed, chosen, slots, style, det, P, notes, ins, xiFit, top8, best, keyMen, sanity, oopRank, oopPick };
}
function planBC(T) {
  const P = T.slots.filter(s => s.pick), I = T.ins.I;
  const MENT = ["Very Defensive", "Defensive", "Cautious", "Balanced", "Positive", "Attacking", "Very Attacking"];
  const lbl = Object.fromEntries([...TI_LABELS.in, ...TI_LABELS.out]);
  const tiList = arr => { const d = arr.filter(([k, v]) => I[k] !== v); return d.length ? d.map(([k, v]) => `${esc(lbl[k] || k)} <b>${esc(v)}</b>`).join(", ") + "." : ""; };
  const mi = MENT.indexOf(I.mentality);
  // Plan B: same shape, more cautious roles and less pressing
  const b = [`Mentality <b>${MENT[Math.max(0, mi - 1)]}</b> (one step down).`];
  const wide = P.filter(s => ["ML", "MR", "AML", "AMR"].includes(s.code) && !/Tracking/.test(s.oop));
  if (wide.length) b.push(`${wide.map(s => esc(s.pick.p.name)).join(" and ")} → <b>${wide.map(s => s.code.startsWith("M") ? "Tracking Wide Midfielder" : "Tracking Winger").filter((v, i, a) => a.indexOf(v) === i).join(" / ")}</b> out of possession.`);
  const fb = P.filter(s => s.group === "FB" && T_FWD_BACK.has(s.pick.role));
  if (fb.length) b.push(`${fb.map(s => esc(s.pick.p.name)).join(" and ")} → <b>${fb[0].code.startsWith("WB") ? "Wing-Back" : "Full-Back"}</b> in possession, <b>Holding</b> out of it.`);
  const amh = P.find(s => s.code === "AMC" && s.oop !== "Tracking AM");
  if (amh) b.push(`${esc(amh.pick.p.name)} → <b>Tracking AM</b> out of possession.`);
  const tb = tiList([["engagement", I.engagement === "High Press" ? "Mid Block" : "Low Block"], ["trigger", "Less Often"], ["dtransition", "Regroup"], ["waste", "More Often"]]);
  if (tb) b.push(tb);
  // Plan C: same shape, one more runner, more risk
  const c = [`Mentality <b>${MENT[Math.min(MENT.length - 1, mi + 1)]}</b> (one step up).`];
  const pushTo = (s, filter, why) => { const r = bestRoleIn(s.pick.p, s.code, filter); if (r && r.role !== s.pick.role) { c.push(`${esc(s.pick.p.name)} → <b>${esc(r.role)}</b> ${why} (${r.v.toFixed(1)}).`); return true; } return false; };
  const mc = P.filter(s => s.code === "MC" && !T_ATT_MID.has(s.pick.role));
  const dms = P.filter(s => s.code === "DM"), am = P.find(s => s.code === "AMC" && !["Second Striker", "Attacking Midfielder"].includes(s.pick.role));
  let pushed = mc.length && pushTo(mc.sort((a, b) => (bestRoleIn(b.pick.p, "MC", r => ["Channel Midfielder", "Attacking Midfielder"].includes(r)) || { v: 0 }).v - (bestRoleIn(a.pick.p, "MC", r => ["Channel Midfielder", "Attacking Midfielder"].includes(r)) || { v: 0 }).v)[0], r => ["Channel Midfielder", "Attacking Midfielder"].includes(r), "to get a midfield runner into the box");
  if (!pushed && dms.length >= 2 && !dms.some(s => /Box-to-Box/.test(s.pick.role))) pushed = pushTo(dms[1], r => /Box-to-Box/.test(r), "to break forward from the pivot");
  if (!pushed && am) pushed = pushTo(am, r => ["Second Striker", "Attacking Midfielder"].includes(r), "to play closer to the striker");
  const back = P.find(s => s.group === "FB" && !T_FWD_BACK.has(s.pick.role) && (s.code === "DL" || s.code === "DR"));
  if (back) c.push(`${esc(back.pick.p.name)} → <b>Wing-Back</b> for an extra wide body.`);
  const tc = tiList([["patience", "Hit Early Crosses"], ["passing", I.passing === "More Direct" ? "Much More Direct" : "More Direct"], ["transition", "Counter-Attack"], ["engagement", I.engagement === "Low Block" ? "Mid Block" : I.engagement]]);
  if (tc) c.push(tc);
  return { b, c };
}
const TI_LABELS = {
  in: [["mentality", "Mentality"], ["passing", "Passing directness"], ["tempo", "Tempo"], ["width", "Attacking width"], ["transition", "Attacking transition"], ["freedom", "Creative freedom"], ["bstrategy", "Build-up strategy"], ["goalkicks", "Goal kicks"], ["gkspeed", "GK distribution speed"], ["gktarget", "GK distribution target"], ["runs", "Supporting runs"], ["progress", "Progress through"], ["dribbling", "Dribbling"], ["reception", "Pass reception"], ["patience", "Final third"], ["crossing", "Crossing style"], ["longshots", "Shoot from distance"], ["setpieces", "Play for set pieces"], ["waste", "Time wasting"]],
  out: [["engagement", "Line of engagement"], ["dline", "Defensive line"], ["dbehaviour", "Line behaviour"], ["trigger", "Trigger press"], ["dtransition", "Defensive transition"], ["tackling", "Tackling"], ["trap", "Pressing trap"], ["shortgk", "Prevent short GK distribution"], ["cross_eng", "Cross engagement"]],
};
const TI_DEFAULTS = { mentality: "Balanced", passing: "Standard", tempo: "Standard", width: "Standard", transition: "Standard", freedom: "Balanced", waste: "Standard", setpieces: "Standard", bstrategy: "Balanced", goalkicks: "Mixed", gkspeed: "Standard", gktarget: "Balanced", runs: "None", dribbling: "Balanced", progress: "Balanced", reception: "Balanced", patience: "Standard", longshots: "Standard", crossing: "Balanced", engagement: "Mid Block", dline: "Standard", dbehaviour: "Balanced", trigger: "Standard", dtransition: "Standard", tackling: "Standard", cross_eng: "Balanced" };
// pressing trap and short goal kicks default differently in each block (tactics board)
function tiDefault(k, I) {
  if (k === "trap") return I.engagement === "Low Block" ? "Trap Outside" : "Balanced";
  if (k === "shortgk") return I.engagement === "High Press" ? "Yes" : "No";
  return TI_DEFAULTS[k];
}
// a few surgical player instructions from standout attributes (vs the XI's own average), max two per player
function playerInstr(T) {
  const base = T.P.base, I = T.ins.I, out = [];
  T.slots.filter(s => s.pick && s.code !== "GK").forEach(s => {
    const a = n => s.pick.p.a[n] ?? null, hi = (n, d) => a(n) != null && a(n) >= base + d, lo = (n, d) => a(n) != null && a(n) <= base - d;
    const role = s.pick.role, list = [];
    const att = ["ST", "AMC", "AML", "AMR", "ML", "MR", "MC"].includes(s.code), wide = s.group === "FB" || ["ML", "MR", "AML", "AMR"].includes(s.code);
    if (att && I.longshots === "Discourage" && hi("Long Shots", 4)) list.push({ pi: "Shoot From Distance More Often", why: `Long Shots ${a("Long Shots")} while the team is told to discourage it.` });
    if (wide && hi("Crossing", 3)) list.push(T_INSIDE.has(role) || role === "Playmaking Wing-Back" ? { pi: "Cross From Deeper", why: `Crossing ${a("Crossing")}: deliver from the half-space he drifts into.` } : { pi: "Cross More Often", why: `Crossing ${a("Crossing")}, one of the best deliveries in the XI.` });
    if ((att || wide) && s.group !== "FB" && hi("Dribbling", 3) && I.dribbling !== "Encourage") list.push({ pi: "Dribble More", why: `Dribbling ${a("Dribbling")}: let him carry it.` });
    if (["Wide Forward", "Inside Forward"].includes(role) && T.slots.filter(x => x.code === "ST").length === 1 && hi("Finishing", 2)) list.push({ pi: "Sit Narrower", why: "Gets closer to the lone striker and into finishing spots." });
    if (s.code === "MC" && role === "Central Midfielder" && hi("Off The Ball", 3)) list.push({ pi: "Get Further Forward", why: `Off The Ball ${a("Off The Ball")}: the default role is too timid for his runs.` });
    if (["CB", "FB", "DM"].includes(s.group) && lo("Passing", 3) && !/Playmak|Ball-Playing/.test(role)) list.push({ pi: "Shorter Passing", why: `Passing ${a("Passing")}: keep it simple.` });
    if (I.trigger && /More Often/.test(I.trigger) && lo("Work Rate", 3) && ["ST", "AML", "AMR", "AMC"].includes(s.code)) list.push({ pi: "Press Less Often", why: `Work Rate ${a("Work Rate")}: save his legs for the ball.` });
    if (list.length) out.push({ s, list: list.slice(0, 2) });
  });
  return out;
}
function setPieceTips(T) {
  const P = T.P, tips = [];
  const tall = T.slots.filter(s => s.pick && s.code !== "GK").map(s => ({ s, v: mean(["Heading", "Jumping Reach", "Strength"].map(n => s.pick.p.a[n])) })).sort((a, b) => b.v - a.v).slice(0, 3);
  if (P.cbAir != null && P.cbAir >= 1) tips.push(`Attacking corners: load the six-yard box; your best in the air are ${tall.map(x => `<b>${esc(x.s.pick.p.name.split(" ").slice(-1)[0])}</b>`).join(", ")}.`);
  else tips.push("Attacking corners: you are not dominant in the air, so use short routines and attack the cut-back zone.");
  const taker = T.slots.filter(s => s.pick && s.code !== "GK").map(s => ({ s, v: mean(["Corners", "Crossing", "Technique"].map(n => s.pick.p.a[n])) })).sort((a, b) => b.v - a.v)[0];
  if (taker) tips.push(`Corner and wide free-kick taker: <b>${esc(taker.s.pick.p.name)}</b> (Corners ${taker.s.pick.p.a.Corners ?? "?"}).`);
  const fk = T.slots.filter(s => s.pick && s.code !== "GK").map(s => ({ s, v: mean(["Free Kick Taking", "Long Shots", "Technique"].map(n => s.pick.p.a[n])) })).sort((a, b) => b.v - a.v)[0];
  if (fk && fk.s !== (taker && taker.s)) tips.push(`Direct free kicks: <b>${esc(fk.s.pick.p.name)}</b> (Free Kick Taking ${fk.s.pick.p.a["Free Kick Taking"] ?? "?"}).`);
  const slow = T.slots.filter(s => s.pick && s.group === "CB").sort((a, b) => (a.pick.p.a.Pace ?? 20) - (b.pick.p.a.Pace ?? 20))[0];
  if (slow) tips.push(`Keep one safe routine: don't leave your slowest centre-back (<b>${esc(slow.pick.p.name.split(" ").slice(-1)[0])}</b>) upfield, and use a quick wide player as the edge-of-box outlet when defending.`);
  return tips;
}
function renderOopPitch(T) { // where each player defends, with his out-of-possession role
  const Y = y => (116 - y * 1.08).toFixed(1);
  let s = `<svg class="pitch" viewBox="0 0 100 120" role="img" aria-label="Out-of-possession shape"><rect x="1" y="1" width="98" height="118" rx="2" class="pg"/>
    <g class="pl"><rect x="3" y="3" width="94" height="114"/><line x1="3" y1="60" x2="97" y2="60"/><circle cx="50" cy="60" r="9"/><rect x="27" y="3" width="46" height="15"/><rect x="27" y="102" width="46" height="15"/></g>`;
  T.slots.forEach(sl => {
    const pk = sl.pick; if (!pk) return;
    const code = sl.oopCode || sl.code, x = sl.oopX ?? sl.x ?? CODE_X[code], y = Y(CODE_Y[code]), tx = Math.min(87, Math.max(13, x)), nm = pk.p.name.split(" ").slice(-1)[0], moved = code !== sl.code;
    s += `<g class="slot${moved ? " moved" : ""}" data-spos="${sl.group}" data-open="${pk.p.ix}" tabindex="0"><circle cx="${x}" cy="${y}" r="4.2" style="fill:var(--panel2)"/><text x="${x}" y="${y}" class="sc">${esc(ROLE_ABBR[sl.oop] || CODE_LABEL[code])}</text>
      <text x="${tx}" y="${(+y + 7.4).toFixed(1)}" class="sn">${esc(nm.length > 13 ? nm.slice(0, 12) + "…" : nm)}</text><text x="${tx}" y="${(+y + 11.2).toFixed(1)}" class="sf">${moved ? esc(CODE_LABEL[sl.code]) + " → " + esc(CODE_LABEL[code]) : esc(CODE_LABEL[code])}</text></g>`;
  });
  return s + `</svg>`;
}
function renderTacticPitch(T) {
  const Y = y => (116 - y * 1.08).toFixed(1);
  let s = `<svg class="pitch" viewBox="0 0 100 120" role="img" aria-label="Suggested XI"><rect x="1" y="1" width="98" height="118" rx="2" class="pg"/>
    <g class="pl"><rect x="3" y="3" width="94" height="114"/><line x1="3" y1="60" x2="97" y2="60"/><circle cx="50" cy="60" r="9"/><rect x="27" y="3" width="46" height="15"/><rect x="27" y="102" width="46" height="15"/></g>`;
  T.slots.forEach(sl => {
    const x = (CODE_X[sl.code] ?? sl.x), y = Y(CODE_Y[sl.code]), tx = Math.min(87, Math.max(13, x)), pk = sl.pick;
    const nm = pk ? pk.p.name.split(" ").slice(-1)[0] : "—";
    s += `<g class="slot${pk ? "" : " empty"}"${pk ? ` data-spos="${sl.group}" data-open="${pk.p.ix}"` : ""} tabindex="${pk ? 0 : -1}">
      <circle cx="${x}" cy="${y}" r="4.2" style="fill:${pk ? heat(Math.max(0, Math.min(100, (pk.v - 9) * 14))) : "var(--panel2)"}"/><text x="${x}" y="${y}" class="sc">${esc(pk ? ROLE_ABBR[pk.role] || sl.label : sl.label)}</text>
      <text x="${tx}" y="${(+y + 7.4).toFixed(1)}" class="sn">${esc(nm.length > 13 ? nm.slice(0, 12) + "…" : nm)}</text>
      <text x="${tx}" y="${(+y + 11.2).toFixed(1)}" class="sf">${pk ? pk.v.toFixed(1) + (sl.oop ? " · " + (ROLE_ABBR[sl.oop] || "") : "") : "empty"}</text></g>`;
  });
  return s + `</svg>`;
}
function renderTacticTab(sq) {
  const T = suggestTactic(sq);
  if (T.error) return `<section class="panel"><p class="muted">${esc(T.error)}</p></section>`;
  const st = T.style, P = T.P, f = v => v == null ? "–" : Math.abs(v) < 0.05 ? "0.0" : (v > 0 ? "+" : "") + v.toFixed(1);
  let h = `<section class="panel tactic"><div class="ph"><h3>Suggested tactic</h3><span class="muted small">built from your squad's attributes, positions and best roles</span></div>
    <div class="lctl">
      <label class="fl"><span class="small muted">Style</span><select id="tStyle">${Object.entries(T_STYLES).map(([k, l]) => `<option value="${k}" ${k === (S.tStyle || "auto") ? "selected" : ""}>${esc(k === "auto" ? `Auto: ${T_STYLE_NAME[T.det.style]}` : l)}</option>`).join("")}</select></label>
      <label class="fl"><span class="small muted">Back line</span><select id="tBack">${Object.entries(T_BACK).map(([k, l]) => `<option value="${k}" ${k === (S.tBack || "any") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>
      <label class="fl"><span class="small muted">Formation</span><select id="tForm"><option value="best">Best fit (${esc(T.allowed[0] ? T.allowed[0].name : T.all[0].name)})</option>${T.all.map(x => `<option ${x.name === S.tForm ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      ${T.oopRank && T.oopRank.length ? `<label class="fl"><span class="small muted">Out of possession</span><select id="tOop"><option value="best">Best fit (${esc(T.oopRank[0].name)})</option>${T.oopRank.map(x => `<option ${x.name === S.tOop ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>` : ""}
      <button class="primary small" data-act="usetactic">Use in Formation & roles</button>
    </div>
    <div class="tsum"><span class="tag good">In possession: <b>${esc(T.chosen.name)}</b></span><span class="tag">Out of possession: <b>${esc(T.oopPick ? T.oopPick.name : OOP_SHAPE[T.chosen.name] || T.chosen.name)}</b>${T.oopPick ? T.oopPick.same ? " (same shape)" : ` (${T.oopPick.moves} change position)` : ""}</span><span class="tag">${esc(T_STYLE_NAME[st])}</span><span class="tag">Average fit <b>${T.xiFit.toFixed(1)}</b>/20</span><span class="tag">Top-8 players starting: <b>${T.chosen.stars}</b>/8</span></div>
    <div class="lgrid"><div class="pitchwrap">${T.oopPick && !T.oopPick.same ? `<div class="pitchtabs" role="group" aria-label="Which shape"><button class="chip ${S.tPitch !== "oop" ? "on" : ""}" data-tpitch="ip">With the ball</button><button class="chip ${S.tPitch === "oop" ? "on" : ""}" data-tpitch="oop">Without the ball</button></div>` : ""}${T.oopPick && !T.oopPick.same && S.tPitch === "oop" ? renderOopPitch(T) : renderTacticPitch(T)}</div><div class="slotlist">`;
  T.slots.forEach(sl => {
    const pk = sl.pick;
    h += `<div class="slotrow"><div class="slh"><b class="sll">${esc(sl.label)}</b>${pk ? `<button class="linkbtn" data-spos="${sl.group}" data-open="${pk.p.ix}"><b>${esc(pk.p.name)}</b></button><span class="muted small">${pk.p.age ?? "?"}${pk.adj ? ` · plays ${esc(CODE_LABEL[CODE_ADJ[sl.code]])}` : ""}${!isSenior(pk.p) ? " · youth" : ""}</span>` : `<span class="bad small">Nobody in the squad plays ${esc(CODE_NAME[sl.code])}</span>`}${pk ? `<b class="slfit" style="background:var(--panel)"><span style="color:${attrColor(pk.v)}">${pk.v.toFixed(1)}</span></b>` : ""}</div>
      ${pk ? `<div class="small"><span class="muted">With the ball:</span> <b>${esc(pk.role)}</b> · <span class="muted">Without:</span> <b>${esc(sl.oop || "–")}</b>${sl.oopCode && sl.oopCode !== sl.code ? ` <span class="muted">as ${esc(CODE_LABEL[sl.oopCode])}</span>` : ""}${sl.fm27 && sl.fm27.role !== sl.oop ? ` <span class="muted small">(FM27 ${esc(sl.fm27.style)} preset: ${esc(sl.fm27.role)})</span>` : sl.fm27 ? ` <span class="small okc" title="Same role as FM27's own ${esc(sl.fm27.style)} preset">✓ FM27</span>` : ""}</div><div class="small muted">${esc(sl.oopWhy || "")}</div>` : ""}
      ${sl.alts.length ? `<div class="slalt small muted">Cover: ${sl.alts.map(c => `<button class="linkbtn" data-spos="${sl.group}" data-open="${c.p.ix}">${esc(c.p.name)}</button> ${esc(c.role)} ${c.v.toFixed(1)}`).join(" · ")}</div>` : ""}</div>`;
  });
  h += `</div></div><p class="small muted">Each slot gets the role his attributes suit best (out of 20, FM27-weighted), the XI is picked together so the total is highest, then roles are adjusted so they work in pairs (see below). Out-of-possession roles use the key attributes from the FM26 roles reference. Tap a name for his panel.</p></section>`;
  if (T.oopRank && T.oopRank.length) {
    const sameR = T.oopRank.find(x => x.same), top = T.oopRank.slice(0, 6); if (sameR && !top.includes(sameR)) top.push(sameR);
    const pick = T.oopPick, best = T.oopRank[0];
    const verdict = !pick ? "" : pick.same ? `Defend in the same <b>${esc(pick.name)}</b>: your players suit it, and one shape means more tactical familiarity (FM27 builds tactical effectiveness partly from it).`
      : `Defend in a <b>${esc(pick.name)}</b>: ${pick.pairs.filter(x => x.o.code !== x.s.code).map(x => `${esc(x.s.pick.p.name.split(" ").slice(-1)[0])} ${esc(CODE_LABEL[x.s.code])} → ${esc(CODE_LABEL[x.o.code])}`).join(", ")}. ${(() => { if (!sameR) return ""; const r = [], eng = (T.ins.I.engagement || "Mid Block").toLowerCase();
        if (pick.behind !== sameR.behind && sameR.why.some(w => /behind the ball/.test(w)) && !pick.why.some(w => /behind the ball/.test(w))) r.push(`${pick.behind} players get behind the ball instead of ${sameR.behind}, the right number for a ${eng}`);
        sameR.why.filter(w => /one defender on the/.test(w)).forEach(w => { if (!pick.why.includes(w)) r.push(`it fixes ${w} you'd have keeping the ${esc(sameR.name)}`); });
        if (pick.fm27 && !sameR.fm27) r.push(`FM27's own presets use this pairing`);
        if (pick.fit - sameR.fit >= 0.1) r.push(`your players' defensive attributes suit it better (+${(pick.fit - sameR.fit).toFixed(1)})`);
        return r.length ? `Why change: ${r.join("; ")}. Keeping the ${esc(sameR.name)} is still fine if you'd rather have one shape.` : `It edges keeping the ${esc(sameR.name)}; keeping one shape is a fine alternative.`; })()}`;
    h += `<section class="panel"><div class="ph"><h3>Shape without the ball</h3><span class="muted small">every formation scored as a defensive shape for this XI · only a suggestion</span></div>
      <p>${verdict}</p>${(() => { const fp = Object.keys(fm27Pairs(T.chosen.name)); return fp.length ? `<p class="small muted">FM27's own preset tactics pair a ${esc(T.chosen.name)} with: ${fp.map(esc).join(", ")}. Those get a bonus here, and FM27's role for each slot is used when your player suits it.</p>` : `<p class="small muted">FM27's presets don't include a ${esc(T.chosen.name)}, so this is scored on your players and the shape alone.</p>`; })()}
      <div class="tscroll rmapwrap"><table class="gtable ftable"><thead><tr><th class="left">Shape</th><th class="num">Defending fit</th><th class="num">Players who move</th><th class="num">Change lines</th><th class="num">Unfamiliar spots</th><th class="left">Note</th></tr></thead><tbody>
      ${top.map(x => `<tr${x === pick ? ' class="sel"' : ""}><td class="left"><button class="linkbtn" data-toop="${esc(x.name)}"><b>${esc(x.name)}</b></button>${x.same ? ' <span class="tag good">same as with the ball</span>' : ""}${x.fm27 ? ' <span class="tag">FM27 pairs these</span>' : ""}${x === best ? ' <span class="tag">best fit</span>' : ""}</td><td class="num">${x.fit.toFixed(1)}</td><td class="num">${x.moves}</td><td class="num">${x.lines}</td><td class="num">${x.unfam}</td>
        <td class="left small muted">${x.same ? "nothing new to learn" : x.lines >= 3 ? "a lot of movement when the ball is lost" : x.unfam ? `${x.unfam} defend somewhere they're not trained` : "small, natural shifts"}</td></tr>`).join("")}</tbody></table></div>
      ${typeof learnBox === "function" ? learnBox(`In FM27 your team can defend in a different formation from the one it attacks in. <b>Defending fit</b> is how well each player's defensive attributes suit where he'd stand (out of 20). Keeping one shape is usually better (less to learn, higher tactical familiarity), so a different shape is only suggested when it's clearly better. Nobody is asked to switch flank or move more than one line, because long moves leave gaps when the ball is lost. FM27's own preset tactics (read via FM Tactic Lab) show which pairs the game itself uses; most of them change shape without the ball.`) : ""}</section>`;
  }
  S._sugT = T;
  if (T.sanity) {
    const sb = T.sanity.bad, sg = T.sanity.good;
    h += `<section class="panel"><div class="ph"><h3>Does it make sense?</h3><span class="muted small">the same checks as My tactic: roles with each other, roles with the instructions, instructions with each other</span></div>
      ${sb.length ? `<div class="tfinds">${sb.map(x => `<div class="tfind ${x.kind}"><b>${esc(x.title)}</b><p class="small">${x.why}</p>${x.fix.length ? `<p class="small muted">${x.fix.join(" · ")}</p>` : ""}</div>`).join("")}</div>` : `<p class="okc"><b>✓ Nothing contradicts.</b> <span class="small muted">Roles pair up, enough players stay back, there are runners for the passes, and no instruction works against another.</span></p>`}
      ${sg.length ? `<p class="small"><b>What works together:</b> ${sg.map(x => esc(x.title)).join(" · ")}</p>` : ""}
      ${typeof learnBox === "function" ? learnBox("A tactic works when its parts agree: one player wide and one inside on each flank, no more than two playmakers, at least two runners, four players staying back, and instructions that ask for the same thing (a counter needs tempo, a high press needs a high line). Every role changed to make it fit is listed under <b>Roles working together</b> below, with the reason.") : ""}</section>`;
  }
  if (typeof traitSlotsHtml === "function") h += traitSlotsHtml(T.slots);
  if (typeof tacExportHtml === "function") h += tacExportHtml("sug");
  // key men: the squad's best eight and where they fit
  const benched = T.keyMen.filter(k => !k.slot);
  h += `<section class="panel"><div class="ph"><h3>Built around your best players</h3><span class="muted small">your 8 highest-rated players (best role anywhere he can play)</span></div><div class="tscroll rmapwrap"><table class="gtable ftable keymen"><thead><tr><th>#</th><th>Player</th><th class="num">Best</th><th>Best role</th><th>In ${esc(T.chosen.name)}</th></tr></thead><tbody>${T.keyMen.map(k => `<tr><td class="num">${k.rank}</td><td class="left"><button class="linkbtn" data-spos="${CODE_GROUP[k.code]}" data-open="${k.p.ix}"><b>${esc(k.p.name)}</b></button> <span class="muted small">${k.p.age ?? "?"}</span></td><td class="num" style="color:${attrColor(k.v)}">${k.v.toFixed(1)}</td><td class="small">${esc(k.role || "–")} <span class="muted">· ${esc(CODE_LABEL[k.code] || "")}</span></td><td class="small">${k.slot ? `<span class="okc">Starts</span> ${esc(k.slot.label)} · ${esc(k.slot.pick.role)}` : `<span class="bad">Bench</span>${k.alt ? ` · starts in <button class="linkbtn" data-tform="${esc(k.alt.name)}">${esc(k.alt.name)}</button>` : (() => { const by = T.slots.filter(s => s.pick && s.code === k.code).map(s => esc(s.pick.p.name.split(" ").slice(-1)[0])); return by.length ? ` · behind ${by.join(" and ")}` : ""; })()}`}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">${benched.length ? `${benched.length} of your top 8 ${benched.length > 1 ? "are" : "is"} on the bench in this shape, usually because a better player holds the same position. Tap a formation name to rebuild around him.` : "All eight start in this shape."}</p></section>`;
  // why this formation
  h += `<section class="panel"><div class="ph"><h3>Formations ranked for this squad</h3><span class="muted small">XI = average best-role rating of the starting XI · Cover = the next man for each slot</span></div><div class="tscroll rmapwrap"><table class="gtable ftable ranktable"><thead><tr><th>Formation</th><th class="num">Score</th><th class="num">XI</th><th class="num opt">Cover</th><th class="num" title="How many of your 8 best players (by best role rating) start">Top 8</th><th class="opt">Back</th><th>Out of possession</th></tr></thead><tbody>`;
  T.all.forEach((x, i) => {
    const sel = x.name === T.chosen.name, off = S.tBack && S.tBack !== "any" && !T.allowed.includes(x);
    h += `<tr class="clickrow${sel ? " rsel" : ""}${off ? " muted" : ""}" data-tform="${esc(x.name)}"><td class="left"><b>${esc(x.name)}</b>${i === 0 ? ` <span class="tag good">best fit</span>` : ""}${x.empty ? ` <span class="tag bad">${x.empty} empty</span>` : ""}</td><td class="num">${x.score.toFixed(2)}</td><td class="num" style="color:${attrColor(x.xi)}">${x.xi.toFixed(2)}</td><td class="num opt">${x.cover.toFixed(2)}</td><td class="num">${x.stars}/8</td><td class="opt">${x.back === "four" ? "Four" : "Three"}</td><td class="small">${esc(OOP_SHAPE[x.name] || "")}</td></tr>`;
  });
  h += `</tbody></table></div><p class="small muted">Score = 75% XI + 25% cover + 0.03 for each of your top 8 who starts, so a shape that benches your best players or only works with one fit XI ranks lower. Gaps under 0.1 are small: any of the top few is a sound choice. Tap a row to build the tactic on that formation. Pairing in and out of possession shapes follows Mastering FM26 (e.g. 4-3-3 → 4-1-4-1, 3-2-4-1 → 5-4-1).</p></section>`;
  // partnerships
  const changes = T.notes.filter(n => n.kind === "change"), pairs = T.notes.filter(n => n.kind !== "change");
  h += `<section class="panel"><div class="ph"><h3>Roles working together</h3><span class="muted small">partnerships, not isolated roles</span></div><ul class="why">${pairs.map(n => `<li class="${n.kind === "warn" ? "bad" : ""}">${n.txt}</li>`).join("")}</ul>${changes.length ? `<h4>Role changes made for balance</h4><ul class="why">${changes.map(n => `<li>${n.txt}</li>`).join("")}</ul>` : `<p class="small muted">No role changes needed: the best roles already pair well.</p>`}</section>`;
  // instructions
  const isDef = k => tiDefault(k, T.ins.I) === T.ins.I[k];
  const row = ([k, l]) => T.ins.I[k] != null ? `<tr><td>${esc(l)}</td><td>${isDef(k) ? `${esc(T.ins.I[k])} <span class="muted small">default</span>` : `<b>${esc(T.ins.I[k])}</b>`}</td><td class="small muted">${T.ins.why[k] || ""}</td></tr>` : "";
  const chg = [...TI_LABELS.in, ...TI_LABELS.out].filter(([k]) => T.ins.I[k] != null && !isDef(k));
  h += `<section class="panel"><div class="ph"><h3>Team instructions</h3><span class="muted small">${esc(T_STYLE_NAME[st])} base, adjusted to your XI</span></div>
    <div class="tichg"><b>Set these in FM</b> <span class="muted small">(${chg.length} changes; everything else stays default)</span><ul class="why">${chg.map(([k, l]) => `<li>${esc(l)}: <b>${esc(T.ins.I[k])}</b></li>`).join("")}</ul></div>
    <div class="tigrid"><div><h4>In possession</h4><div class="tscroll rmapwrap"><table class="gtable titable"><tbody>${TI_LABELS.in.map(row).join("")}</tbody></table></div></div>
    <div><h4>Out of possession</h4><div class="tscroll rmapwrap"><table class="gtable titable"><tbody>${TI_LABELS.out.map(row).join("")}</tbody></table></div></div></div>
    <p class="small muted">Bold = changed from FM's default. Change one or two things at a time and give it a few games.</p></section>`;
  // player instructions + set pieces
  const pis = playerInstr(T);
  h += `<section class="panel"><div class="ph"><h3>Player instructions & set pieces</h3><span class="muted small">seasoning, not the meal: two at most per player</span></div><div class="tigrid"><div><h4>Player instructions</h4>${pis.length ? `<ul class="why">${pis.map(x => `<li><button class="linkbtn" data-spos="${x.s.group}" data-open="${x.s.pick.p.ix}">${esc(x.s.pick.p.name)}</button> (${esc(x.s.label)}): ${x.list.map(i => `<b>${esc(i.pi)}</b> <span class="muted">${esc(i.why)}</span>`).join("; ")}</li>`).join("")}</ul>` : `<p class="muted small">None needed: the roles already cover it.</p>`}<p class="small muted">If a player needs more than two or three instructions, the role or the shape is wrong (Mastering FM26). Instruction names can differ slightly in FM27.</p></div>
    <div><h4>Set pieces</h4><ul class="why">${setPieceTips(T).map(x => `<li>${x}</li>`).join("")}</ul></div></div></section>`;
  // squad profile
  const prof = [["Technique & passing", P.tech], ["Pressing (mental + work)", P.press], ["Pace (whole XI)", P.pace], ["Attackers' pace & movement", P.attPace], ["Centre-backs' pace", P.cbPace], ["Centre-backs in the air", P.cbAir], ["Strikers in the air", P.stAir], ["Crossing (wide players)", P.cross], ["Dribbling & flair", P.dribble], ["Tackling", P.tackle], ["Decisions", P.decisions]];
  h += `<section class="panel"><div class="ph"><h3>XI profile</h3><span class="muted small">each area vs the XI's own average attribute (${P.base.toFixed(1)}); this is what drives the style and instructions</span></div><div class="profbars">${prof.map(([l, v]) => {
    const w = v == null ? 0 : Math.min(50, Math.abs(v) * 20);
    return `<div class="pbrow"><span>${esc(l)}</span><span class="pbtrack"><i style="${v >= 0 ? `left:50%;width:${w}%;background:var(--good)` : `right:50%;width:${w}%;background:var(--bad)`}"></i></span><b>${f(v)}</b></div>`;
  }).join("")}</div><p class="small muted">Auto style picks the strongest of technique (control possession), pressing (high press) and attackers' pace (counter-attack); if none stands out it stays Balanced. Detected: possession ${f(T.det.scores.possession)}, press ${f(T.det.scores.press)}, counter ${f(T.det.scores.counter)}.</p></section>`;
  // plans
  const pl = planBC(T);
  h += `<section class="panel"><div class="ph"><h3>Plan B and Plan C</h3><span class="muted small">same shapes, different risk (Mastering FM26)</span></div><div class="tigrid"><div><h4>Plan B · protect a lead / away to a stronger side</h4><ul class="why">${pl.b.map(x => `<li>${x}</li>`).join("")}</ul></div><div><h4>Plan C · chasing a goal</h4><ul class="why">${pl.c.map(x => `<li>${x}</li>`).join("")}</ul></div></div></section>`;
  return h;
}
function useTactic() {
  const sq = squadDs(); if (!sq) return;
  const T = suggestTactic(sq); if (T.error) return;
  S.formation = T.chosen.name;
  S.lineups = { ...(S.lineups || {}), [T.chosen.name]: T.slots.map(s => ({ code: s.code, x: s.x, role: s.pick ? s.pick.role : codeRoles(s.code)[0] })) };
  S.squadRole = {}; S.spos = "Overview"; S.sel = null;
  render();
  const l = $(".lineup"); if (l) l.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
}


