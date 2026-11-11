// ---------- suggested tactic (My squad › Tactic) ----------
// Sources: FM26 roles reference (role lists, out-of-possession key attributes), the tactics board (team-instruction
// catalogue and style presets), Mastering FM26 (paired in/out shapes, role partnerships, Plan B/C inside one identity)
// and the tested findings in the guide (slightly lower line, whipped/early crosses, invite crosses, get stuck in, no extremes).
const OOP_ROLES = {
  GK: [["Goalkeeper"], ["Sweeper Keeper", ["Rushing Out (Tendency)", "Anticipation", "Decisions"]], ["Line-Holding Keeper", ["Positioning", "Concentration"]]],
  DC: [["Centre-Back"], ["Stopping CB", ["Aggression", "Tackling", "Strength"]], ["Covering CB", ["Anticipation", "Pace", "Marking"]]],
  WCB: [["Wide CB"], ["Stopping Wide CB", ["Aggression", "Tackling", "Strength"]], ["Covering Wide CB", ["Anticipation", "Pace", "Marking"]]],
  FB: [["Full-Back"], ["Pressing Full-Back", ["Work Rate", "Anticipation", "Aggression"]], ["Holding Full-Back", ["Concentration", "Positioning", "Marking"]]],
  WB: [["Wing-Back"], ["Pressing Wing-Back", ["Work Rate", "Anticipation", "Aggression"]], ["Holding Wing-Back", ["Concentration", "Positioning", "Marking"]]],
  DM: [["Defensive Midfielder"], ["Pressing DM", ["Anticipation", "Work Rate", "Aggression"]], ["Dropping DM", ["Positioning", "Anticipation", "Decisions"]], ["Screening DM", ["Concentration", "Positioning", "Marking"]], ["Wide Covering DM", ["Work Rate", "Anticipation", "Pace"]]],
  MC: [["Central Midfielder"], ["Pressing CM", ["Anticipation", "Work Rate", "Aggression"]], ["Screening CM", ["Concentration", "Positioning", "Marking"]], ["Wide Covering CM", ["Work Rate", "Anticipation", "Pace"]]],
  WM: [["Wide Midfielder"], ["Tracking Wide Midfielder", ["Stamina", "Work Rate", "Marking"]], ["Wide Outlet Midfielder", ["Anticipation", "Off The Ball", "Pace"]]],
  W: [["Winger"], ["Tracking Winger", ["Stamina", "Work Rate", "Marking"]], ["Wide Outlet Winger", ["Off The Ball", "Pace", "Anticipation"]], ["Inverting Outlet Winger", ["Anticipation", "Off The Ball", "Decisions"]]],
  AM: [["Attacking Midfielder"], ["Tracking AM", ["Stamina", "Work Rate", "Marking"]], ["Central Outlet AM", ["Anticipation", "Off The Ball", "Decisions"]], ["Splitting Outlet AM", ["Anticipation", "Off The Ball", "Pace"]]],
  ST: [["Centre Forward"], ["Tracking CF", ["Work Rate", "Stamina", "Marking"]], ["Central Outlet CF", ["Anticipation", "Off The Ball", "Decisions"]], ["Splitting Outlet CF", ["Anticipation", "Off The Ball", "Pace"]]],
};
const OOP_POOL = { GK: "GK", DC: "DC", WCB: "WCB", DL: "FB", DR: "FB", WBL: "WB", WBR: "WB", DM: "DM", MC: "MC", ML: "WM", MR: "WM", AML: "W", AMR: "W", AMC: "AM", ST: "ST" };
Object.assign(ROLE_ABBR, { "Sweeper Keeper": "SK", "Line-Holding Keeper": "LHK", "Stopping CB": "SCB", "Covering CB": "CCB", "Stopping Wide CB": "SWCB", "Covering Wide CB": "CWCB",
  "Pressing Full-Back": "PFB", "Holding Full-Back": "HFB", "Pressing Wing-Back": "PRWB", "Holding Wing-Back": "HWB", "Pressing DM": "PDM", "Dropping DM": "DDM", "Screening DM": "SDM",
  "Wide Covering DM": "WCDM", "Pressing CM": "PCM", "Screening CM": "SCM", "Wide Covering CM": "WCCM", "Tracking Wide Midfielder": "TWM", "Wide Outlet Midfielder": "WOM",
  "Tracking Winger": "TW", "Wide Outlet Winger": "WOW", "Inverting Outlet Winger": "IOW", "Tracking AM": "TAM", "Central Outlet AM": "COAM", "Splitting Outlet AM": "SOAM",
  "Tracking CF": "TCF", "Central Outlet CF": "COCF", "Splitting Outlet CF": "SOCF" });
const T_WIDE = new Set(["Full-Back", "Wing-Back", "Advanced Wing-Back", "Winger", "Wide Midfielder", "Wide Forward"]);
const T_INSIDE = new Set(["Inside Full-Back", "Inverted Full-Back", "Inside Wing-Back", "Inverted Wing-Back", "Playmaking Wing-Back", "Inside Winger", "Inside Forward", "Half-Space Winger", "Playmaking Winger"]);
const T_FWD_BACK = new Set(["Wing-Back", "Advanced Wing-Back", "Inverted Full-Back", "Inverted Wing-Back", "Overlapping CB"]);
const T_PLAYMAKER = new Set(["Deep-Lying Playmaker", "Box-to-Box Playmaker", "Midfield Playmaker", "Advanced Playmaker", "Free Role"]);
const T_RUNNER = new Set(["Channel Forward", "Poacher", "Centre Forward"]);
const T_LINK = new Set(["Deep-Lying Forward", "False Nine", "Target Forward"]);
const T_ATT_MID = new Set(["Attacking Midfielder", "Advanced Playmaker", "Channel Midfielder", "Midfield Playmaker", "Free Role", "Second Striker", "Wide Central Midfielder"]);
const OOP_SHAPE = { "4-4-2": "4-4-2", "4-4-1-1": "4-4-1-1", "4-2-3-1": "4-4-1-1 (wide men drop)", "4-2-3-1 (MC)": "4-4-1-1 (wide men drop)", "4-3-3": "4-1-4-1", "4-3-3 (flat)": "4-1-4-1 or 4-5-1",
  "4-1-4-1": "4-1-4-1", "4-4-2 diamond": "4-1-2-1-2 / 4-3-1-2", "4-3-1-2": "4-3-1-2", "4-3-2-1": "4-5-1", "4-2-2-2": "4-4-2", "3-5-2": "5-3-2", "3-4-1-2": "5-3-2", "3-4-3": "5-4-1",
  "3-4-2-1": "5-4-1", "3-2-4-1": "5-4-1 or 4-4-2", "5-3-2": "5-3-2", "5-4-1": "5-4-1" };
const T_STYLES = { auto: "Auto (from the squad)", possession: "Control possession", press: "High press", counter: "Counter-attack", balanced: "Balanced" };
const T_STYLE_NAME = { possession: "Control possession", press: "High press", counter: "Counter-attack", balanced: "Balanced" };
const T_BACK = { any: "Any back line", four: "Back four", three: "Back three / five" };
const sideOf = (code, x) => ["DL", "WBL", "ML", "AML"].includes(code) ? "L" : ["DR", "WBR", "MR", "AMR"].includes(code) ? "R" : x < 42 ? "L" : x > 58 ? "R" : "C";
const backLine = name => FORMATION_PRESETS[name].filter(([c]) => c === "WCB").length ? "three" : "four";
const rateCache = new Map();
function rateRole(p, group, role, code) {   // attributes for the role, nudged by his traits (side-aware when the slot is known)
  const sd = code ? (["DL", "WBL", "ML", "AML"].includes(code) ? "L" : ["DR", "WBR", "MR", "AMR"].includes(code) ? "R" : "C") : "";
  const k = p.ix + "|" + group + "|" + role + "|" + sd;
  if (!rateCache.has(k)) rateCache.set(k, typeof roleRating === "function" ? roleRating(p, group, role, code) : attrRating(p, roleW(group, role)));
  return rateCache.get(k);
}
const mean = a => { const v = a.filter(x => x != null && !isNaN(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
const attrsMean = (players, names) => mean(players.flatMap(p => names.map(n => p.a[n])));
// best role for a player in a slot code (attributes), optionally restricted by a role filter
function bestRoleIn(p, code, filter) {
  const g = CODE_GROUP[code]; let best = null;
  codeRoles(code).forEach(r => { if (r === "Balanced" || (filter && !filter(r))) return; const v = rateRole(p, g, r, code); if (v != null && (!best || v > best.v)) best = { role: r, v }; });
  return best;
}
// one formation: every slot scored by the player's best role there, XI picked together (Hungarian), plus cover
function evalFormation(name, players, codes) {
  const slots = [["GK", 50, "Goalkeeper"], ...FORMATION_PRESETS[name]].map(([code, x], i) => ({ i, code, x, group: CODE_GROUP[code], label: CODE_LABEL[code], side: sideOf(code, x) }));
  const pen = 0.4;
  slots.forEach(s => {
    s.cand = players.map(p => {
      const c = codes.get(p.ix), exact = canPlay(c, s.code), adj = !exact && CODE_ADJ[s.code] && canPlay(c, CODE_ADJ[s.code]);
      if (!exact && !adj) return null;
      const b = bestRoleIn(p, s.code); if (!b) return null;
      return { p, role: b.role, v: b.v, fit: b.v - (adj ? pen : 0), adj };
    });
  });
  const BIG = 1e6, m = Math.max(players.length, slots.length);
  const cost = slots.map(s => Array.from({ length: m }, (_, j) => j < players.length && s.cand[j] ? -s.cand[j].fit : BIG));
  const asg = players.length ? hungarian(cost) : slots.map(() => -1);
  const used = new Set();
  slots.forEach((s, i) => { const j = asg[i]; s.pick = j >= 0 && j < players.length ? s.cand[j] : null; if (s.pick) used.add(s.pick.p.ix); });
  slots.forEach(s => { s.alts = s.cand.filter(c => c && !used.has(c.p.ix)).sort((a, b) => b.fit - a.fit).slice(0, 2); });
  const xi = mean(slots.map(s => s.pick ? s.pick.fit : 8));
  const cover = mean(slots.map(s => s.alts[0] ? s.alts[0].fit : 8));
  return { name, slots, xi, cover, used, score: 0.75 * xi + 0.25 * cover, back: backLine(name), empty: slots.filter(s => !s.pick).length };
}
// relative profile of the XI: each index is the mean of those attributes minus the XI's overall outfield attribute mean
function teamProfile(slots) {
  const out = slots.filter(s => s.pick && s.code !== "GK").map(s => s.pick.p);
  const by = f => slots.filter(s => s.pick && f(s)).map(s => s.pick.p);
  const all = [...ATTRS.technical, ...ATTRS.mental, ...ATTRS.physical].filter(a => !["Corners", "Free Kick Taking", "Long Throws", "Penalty Taking", "Leadership", "Determination", "Natural Fitness"].includes(a));
  const base = attrsMean(out, all) ?? 10;
  const rel = (players, names) => { const v = attrsMean(players, names); return v == null ? null : v - base; };
  const cbs = by(s => s.group === "CB"), sts = by(s => s.code === "ST"), wide = by(s => ["FB"].includes(s.group) || ["ML", "MR", "AML", "AMR"].includes(s.code));
  const att = by(s => ["ST", "AML", "AMR", "ML", "MR", "AMC"].includes(s.code)), mids = by(s => ["DM", "MC"].includes(s.code)), backs = by(s => s.group === "FB");
  const gk = by(s => s.code === "GK");
  return {
    base,
    tech: rel(out, ["Passing", "First Touch", "Technique", "Composure", "Decisions", "Vision"]),
    press: rel(out, ["Work Rate", "Stamina", "Anticipation", "Decisions", "Concentration", "Positioning", "Teamwork", "Aggression"]),
    pace: rel(out, ["Pace", "Acceleration"]),
    attPace: rel(att, ["Pace", "Acceleration", "Off The Ball"]),
    cbPace: rel(cbs, ["Pace", "Acceleration"]),
    cbAir: rel(cbs, ["Heading", "Jumping Reach", "Strength"]),
    cbTech: rel(cbs, ["Passing", "Composure", "First Touch"]),
    stAir: rel(sts, ["Heading", "Jumping Reach", "Strength"]),
    cross: rel(wide, ["Crossing"]),
    dribble: rel(att.concat(backs), ["Dribbling", "Flair"]),
    tackle: rel(out, ["Tackling"]),
    decisions: rel(out, ["Decisions"]),
    flair: rel(out, ["Flair", "Vision"]),
    stamina: rel(out, ["Stamina", "Natural Fitness"]),
    midWin: rel(mids, ["Tackling", "Anticipation", "Positioning"]), backWin: rel(backs, ["Tackling", "Anticipation", "Positioning"]),
    gkPass: gk.length ? (mean(["Passing", "Kicking", "Composure", "First Touch"].map(a => gk[0].a[a])) ?? base) - base : null,
    gkRush: gk.length ? gk[0].a["Rushing Out (Tendency)"] : null,
    longShots: out.filter(p => (p.a["Long Shots"] ?? 0) >= base + 4).length,
  };
}
function detectStyle(P) {
  const sc = { possession: P.tech ?? 0, press: P.press ?? 0, counter: P.attPace ?? 0 };
  const best = Object.entries(sc).sort((a, b) => b[1] - a[1])[0];
  return { style: best[1] >= 0.3 ? best[0] : "balanced", scores: sc };
}
// role partnerships: fix the XI's roles with the smallest attribute cost, and say why
function refineRoles(slots, style) {
  const notes = [];
  const setRole = (s, filter, why) => {
    const b = bestRoleIn(s.pick.p, s.code, filter); if (!b || b.role === s.pick.role) return false;
    const loss = s.pick.v - b.v;
    notes.push({ kind: "change", txt: `${esc(s.pick.p.name)}: ${esc(s.pick.role)} → <b>${esc(b.role)}</b> (${loss > 0.05 ? `−${loss.toFixed(1)}` : "same rating"}). ${why}` });
    s.pick = { ...s.pick, role: b.role, v: b.v, fit: b.v - (s.pick.adj ? 0.4 : 0) };
    return true;
  };
  const lossTo = (s, filter) => { const b = bestRoleIn(s.pick.p, s.code, filter); return b ? s.pick.v - b.v : 99; };
  const P = slots.filter(s => s.pick);
  // 1. centre-backs: one who steps in with the ball, one who stays
  const cbs = P.filter(s => s.code === "DC");
  if (cbs.length >= 2 && cbs.every(s => s.pick.role === "Ball-Playing CB")) {
    const s = cbs.sort((a, b) => lossTo(a, r => r !== "Ball-Playing CB") - lossTo(b, r => r !== "Ball-Playing CB"))[0];
    setRole(s, r => !["Ball-Playing CB", "Advanced CB", "Overlapping CB"].includes(r), "Two ball-players leave nobody to stay and defend; one steps out with the ball, the other covers.");
  }
  const adv = cbs.filter(s => ["Advanced CB", "Overlapping CB"].includes(s.pick.role));
  if (adv.length > 1) adv.slice(1).forEach(s => setRole(s, r => !["Advanced CB", "Overlapping CB"].includes(r), "Only one centre-back should leave the line, or the rest defence is too thin."));
  if ((style === "possession" || style === "press") && cbs.length >= 2 && !cbs.some(s => s.pick.role === "Ball-Playing CB")) {
    const s = cbs.slice().sort((a, b) => lossTo(a, r => r === "Ball-Playing CB") - lossTo(b, r => r === "Ball-Playing CB"))[0], l = lossTo(s, r => r === "Ball-Playing CB");
    if (l <= 0.6) setRole(s, r => r === "Ball-Playing CB", "A possession or pressing side needs one centre-back who can break lines with a pass.");
    else notes.push({ kind: "warn", txt: `<b>No ball-playing centre-back:</b> the best option, ${esc(s.pick.p.name)}, would lose ${l.toFixed(1)} as a Ball-Playing CB, so he keeps his role and build-up isn't forced through the press. A ball-playing CB is a transfer target for this style.` });
  }
  // goalkeeper: a possession or pressing side wants him in the build-up if it costs little
  const gk = P.find(s => s.code === "GK");
  if (gk && (style === "possession" || style === "press") && gk.pick.role !== "Ball-Playing GK" && lossTo(gk, r => r === "Ball-Playing GK") <= 0.5)
    setRole(gk, r => r === "Ball-Playing GK", "Building from the back needs the keeper as an extra passer.");
  // 2. flanks: one player holds the width, one goes inside
  ["L", "R"].forEach(side => {
    const back = P.find(s => s.group === "FB" && s.side === side), front = P.find(s => ["ML", "MR", "AML", "AMR"].includes(s.code) && s.side === side);
    const nm = side === "L" ? "left" : "right";
    if (back && front) {
      if (T_INSIDE.has(back.pick.role) && T_INSIDE.has(front.pick.role)) {
        const fb = lossTo(back, r => T_WIDE.has(r)), fw = lossTo(front, r => T_WIDE.has(r));
        if (fb <= fw) setRole(back, r => T_WIDE.has(r), `Both ${nm}-side players were going inside, leaving the ${nm} wing empty; the full-back now holds the width.`);
        else setRole(front, r => T_WIDE.has(r), `Both ${nm}-side players were going inside, leaving the ${nm} wing empty; the wide man now stays wide.`);
      } else if (["Wing-Back", "Advanced Wing-Back"].includes(back.pick.role) && T_WIDE.has(front.pick.role) && (back.code === "DL" || back.code === "DR")) {
        const fb = lossTo(back, r => !T_FWD_BACK.has(r) && r !== "Wing-Back"), fw = lossTo(front, r => T_INSIDE.has(r));
        if (fb <= fw) setRole(back, r => !T_FWD_BACK.has(r) && r !== "Wing-Back", `Wing-back and wide man were in the same ${nm} lane and get in each other's way; the full-back now supports from behind.`);
        else setRole(front, r => T_INSIDE.has(r), `Wing-back and wide man were in the same ${nm} lane; the wide man now comes inside and the wing-back owns the touchline.`);
      } else if (style === "possession" && T_WIDE.has(back.pick.role) && T_WIDE.has(front.pick.role) && back.code !== "WBL" && back.code !== "WBR") {
        if (lossTo(back, r => T_INSIDE.has(r)) <= 0.35) setRole(back, r => T_INSIDE.has(r), `In possession the ${nm} full-back tucks inside behind a wide player, adding a passer in midfield (an inverted role).`);
      }
    } else if (front && !back && T_INSIDE.has(front.pick.role)) {
      setRole(front, r => T_WIDE.has(r), `Nobody plays behind him on the ${nm}, so the wide man must hold the width himself.`);
    } else if (back && !front && T_INSIDE.has(back.pick.role)) {
      setRole(back, r => T_WIDE.has(r), `Nobody else gives width on the ${nm} in this shape, so the ${back.code.startsWith("WB") ? "wing-back" : "full-back"} must stay wide.`);
    }
  });
  // 3. rest defence: no more than one back going forward unless a holding midfielder or a back three covers
  const backs = P.filter(s => s.group === "FB"), cbCount = P.filter(s => s.group === "CB").length;
  const holder = P.some(s => s.code === "DM" && ["Defensive Midfielder", "Half-Back", "Deep-Lying Playmaker"].includes(s.pick.role));
  const fwd = backs.filter(s => T_FWD_BACK.has(s.pick.role));
  if (cbCount < 3 && fwd.length >= 2 && !holder) {
    const s = fwd.sort((a, b) => lossTo(a, r => !T_FWD_BACK.has(r)) - lossTo(b, r => !T_FWD_BACK.has(r)))[0];
    const ln = r => R_WIDE.has(r) ? "w" : R_INSIDE.has(r) ? "i" : "c", l0 = ln(s.pick.role);
    setRole(s, r => !T_FWD_BACK.has(r) && ln(r) === l0, "Both full-backs were pushing on with no holding midfielder behind them; one now stays back for rest defence.");
  }
  // 4. playmakers: at most one per line and two in the team
  ["DM", "MC", "AMC"].forEach(code => {
    const pm = P.filter(s => s.code === code && T_PLAYMAKER.has(s.pick.role));
    pm.slice(1).forEach(s => setRole(s, r => !T_PLAYMAKER.has(r), "Two playmakers in the same line want the same ball and the same space; one now plays a simpler role."));
  });
  const pmAll = P.filter(s => T_PLAYMAKER.has(s.pick.role));
  if (pmAll.length > 2) pmAll.sort((a, b) => lossTo(a, r => !T_PLAYMAKER.has(r)) - lossTo(b, r => !T_PLAYMAKER.has(r))).slice(0, pmAll.length - 2)
    .forEach(s => setRole(s, r => !T_PLAYMAKER.has(r), "More than two playmakers crowd the middle; the play needs runners too."));
  // 5. central midfield pair without a DM: one must stay
  const mcs = P.filter(s => s.code === "MC"), hasDM = P.some(s => s.code === "DM");
  if (!hasDM && mcs.length >= 2 && mcs.every(s => T_ATT_MID.has(s.pick.role))) {
    const s = mcs.slice().sort((a, b) => lossTo(a, r => !T_ATT_MID.has(r)) - lossTo(b, r => !T_ATT_MID.has(r)))[0];
    setRole(s, r => !T_ATT_MID.has(r), "With no DM behind them, one of the two central midfielders has to stay and screen.");
  }
  // 6. strike pair: one runner, one link
  const sts = P.filter(s => s.code === "ST");
  if (sts.length === 2) {
    const kind = s => T_RUNNER.has(s.pick.role) ? "run" : T_LINK.has(s.pick.role) ? "link" : "other";
    if (kind(sts[0]) === kind(sts[1])) {
      const want = kind(sts[0]) === "run" ? T_LINK : T_RUNNER;
      const s = sts.slice().sort((a, b) => lossTo(a, r => want.has(r)) - lossTo(b, r => want.has(r)))[0];
      setRole(s, r => want.has(r), want === T_LINK ? "Two runners give nobody to hold it up or link play; one drops in to connect." : "Two link players leave nobody running in behind; one now attacks the space.");
    }
  }
  // 7-10: the same rules My tactic checks (R_* sets in tactic.js), fixed here in an order that keeps the earlier fixes:
  // each change keeps the player's lane (wide stays wide, inside stays inside), never adds a playmaker, never takes a man out of the rest defence
  const lane = r => R_WIDE.has(r) ? "w" : R_INSIDE.has(r) ? "i" : "c";
  const sameLane = s => { const l = lane(s.pick.role); return r => lane(r) === l; };
  const pmCount = () => P.filter(s => R_PM.has(s.pick.role)).length;
  // 7. playmakers, wide ones included: at most two
  if (pmCount() > 2) {
    const ex = P.filter(s => R_PM.has(s.pick.role)).sort((a, b) => lossTo(a, r => !R_PM.has(r) && sameLane(a)(r)) - lossTo(b, r => !R_PM.has(r) && sameLane(b)(r)));
    ex.slice(0, ex.length - 2).forEach(s => setRole(s, r => !R_PM.has(r) && sameLane(s)(r), "Counting the wide playmakers too, more than two players wanted the ball to feet; he now plays a simpler role so the others have runners to find."));
  }
  // 8. a playmaking wing-back drifts into the deep playmaker's zone
  const pwb = P.find(s => s.pick.role === "Playmaking Wing-Back"), dpm = P.find(s => s.code === "DM" && ["Deep-Lying Playmaker", "Box-to-Box Playmaker"].includes(s.pick.role));
  if (pwb && dpm) {
    const a = lossTo(pwb, r => !R_PM.has(r) && sameLane(pwb)(r)), b = lossTo(dpm, r => !R_PM.has(r));
    if (a <= b) setRole(pwb, r => !R_PM.has(r) && sameLane(pwb)(r), `${esc(dpm.pick.p.name)} already plays as the deep playmaker in the zone a Playmaking Wing-Back drifts into; the wing-back keeps his lane without the playmaking.`);
    else setRole(dpm, r => !R_PM.has(r), `The Playmaking Wing-Back drifts into the deep playmaker's zone; ${esc(dpm.pick.p.name)} now holds instead.`);
  }
  // 9. goal threats: at least two runners, and a lone or link striker needs runners around him
  const runN = () => P.filter(s => R_RUN.has(s.pick.role)).length, nonStRun = () => P.filter(s => s.code !== "ST" && R_RUN.has(s.pick.role)).length;
  const st1 = P.filter(s => s.code === "ST"), hasAMC = P.some(s => s.code === "AMC");
  const needNonSt = st1.length === 1 ? (T_LINK.has(st1[0].pick.role) ? 2 : hasAMC ? 0 : 1) : 0;
  for (let k = 0; k < 3 && (runN() < 2 || nonStRun() < needNonSt); k++) {
    const mcOk = s => s.code !== "MC" || P.some(x => x.code === "DM") || P.filter(x => x.code === "MC" && x !== s).some(x => !T_ATT_MID.has(x.pick.role));
    const cand = P.filter(s => !R_RUN.has(s.pick.role) && ["AML", "AMR", "ML", "MR", "AMC", "MC"].includes(s.code) && mcOk(s))
      .concat(st1.length === 1 && runN() < 2 && !R_RUN.has(st1[0].pick.role) && needNonSt === 0 ? st1 : [])
      .map(s => ({ s, f: r => R_RUN.has(r) && r !== "Free Role" && (s.code === "ST" || sameLane(s)(r) || lane(s.pick.role) === "c") && !(s.code === "MC" && !P.some(x => x.code === "DM") && T_ATT_MID.has(r) && P.filter(x => x.code === "MC" && x !== s).every(x => T_ATT_MID.has(x.pick.role))) }))
      .map(x => ({ ...x, l: lossTo(x.s, x.f) })).filter(x => x.l < 99).sort((a, b) => a.l - b.l)[0];
    if (!cand) break;
    setRole(cand.s, cand.f, runN() < 2 ? "Only one role was making runs into the box; he now attacks it too, so goals don't depend on one player." : "The striker needed runners around him; he now gets forward to support.");
  }
  // 10. rest defence: at least four stay behind the ball (centre-backs, holding full-backs, holding midfielders)
  for (let k = 0; k < 4 && P.filter(s => R_REST.has(s.pick.role)).length < 4; k++) {
    const keepRun = s => R_RUN.has(s.pick.role) && (runN() <= 2 || (s.code !== "ST" && nonStRun() <= needNonSt));   // don't undo the runners
    const cand = P.filter(s => !R_REST.has(s.pick.role) && (s.group === "FB" || s.code === "DM" || s.code === "MC") && !keepRun(s)).map(s => ({ s, f: r => R_REST.has(r) && (s.group !== "FB" || sameLane(s)(r)) && (!R_PM.has(r) || pmCount() < 2) }))
      .map(x => ({ ...x, l: lossTo(x.s, x.f) })).filter(x => x.l < 99).sort((a, b) => a.l - b.l)[0];
    if (!cand) break;
    setRole(cand.s, cand.f, "Fewer than four players stayed behind the ball when you attack; he now holds his position so a lost ball doesn't become a counter.");
  }
  // partnerships summary
  ["L", "R"].forEach(side => {
    const back = P.find(s => s.group === "FB" && s.side === side), front = P.find(s => ["ML", "MR", "AML", "AMR"].includes(s.code) && s.side === side);
    if (back && front) notes.push({ kind: "pair", txt: `<b>${side === "L" ? "Left" : "Right"} flank:</b> ${esc(back.pick.p.name)} (${esc(back.pick.role)}${T_WIDE.has(back.pick.role) ? ", width" : ", inside"}) with ${esc(front.pick.p.name)} (${esc(front.pick.role)}${T_WIDE.has(front.pick.role) ? ", width" : ", inside"}).` });
  });
  if (sts.length === 2) notes.push({ kind: "pair", txt: `<b>Strike pair:</b> ${sts.map(s => `${esc(s.pick.p.name)} (${esc(s.pick.role)})`).join(" + ")}: one runs in behind, one links.` });
  const mid = P.filter(s => ["DM", "MC", "AMC"].includes(s.code));
  if (mid.length) notes.push({ kind: "pair", txt: `<b>Midfield:</b> ${mid.map(s => `${esc(s.pick.p.name)} (${esc(s.pick.role)})`).join(", ")}.` });
  const stay = P.filter(s => R_REST.has(s.pick.role)).length;   // same count as the sanity check
  notes.push({ kind: stay >= 4 ? "pair" : "warn", txt: `<b>Rest defence:</b> ${stay} players stay behind the ball when you attack${stay < 4 ? " — thin; keep one more back" : ""}.` });
  return notes;
}
// out-of-possession roles: attributes pick between the options, the shape decides who must track
function assignOop(slots, style, ins) {
  const P = slots.filter(s => s.pick);
  const keyScore = (p, keys) => mean(keys.map(k => p.a[k]));
  const pickBest = (s, opts, why) => {
    let best = null; opts.forEach(([r, keys]) => { const v = keys ? keyScore(s.pick.p, keys) + (typeof traitAdj === "function" ? traitAdj(s.pick.p, r, s.code) : 0) : null; if (v != null && (!best || v > best.v)) best = { r, v }; });
    s.oop = best ? best.r : opts[0][0]; s.oopWhy = why;
  };
  const pool = s => OOP_ROLES[OOP_POOL[s.code]] || [];
  P.forEach(s => { s.oop = pool(s)[0] ? pool(s)[0][0] : ""; s.oopWhy = "Baseline role for the position."; });
  const gk = P.find(s => s.code === "GK");
  if (gk) {
    const high = ["Higher", "Much Higher"].includes(ins.dline), low = ["Lower", "Much Lower"].includes(ins.dline);
    if (high) { gk.oop = "Sweeper Keeper"; gk.oopWhy = "A higher line needs a keeper who comes off his line to sweep balls in behind."; }
    else if (low) { gk.oop = "Line-Holding Keeper"; gk.oopWhy = "With a lower line he stays on his line and reacts."; }
    else pickBest(gk, pool(gk).slice(1), "Picked by his Rushing Out, Anticipation and Decisions against Positioning and Concentration.");
  }
  // centre-backs: one steps out, one covers
  const cbs = P.filter(s => s.code === "DC" || s.code === "WCB");
  if (cbs.length) {
    const stop = s => keyScore(s.pick.p, ["Aggression", "Tackling", "Strength"]), cover = s => keyScore(s.pick.p, ["Anticipation", "Pace", "Marking"]);
    const sorted = cbs.slice().sort((a, b) => (stop(b) - cover(b)) - (stop(a) - cover(a)));
    sorted.forEach((s, i) => {
      const wide = s.code === "WCB";
      const stopper = cbs.length === 2 ? i === 0 : wide ? stop(s) >= cover(s) : false;
      s.oop = wide ? (stopper ? "Stopping Wide CB" : "Covering Wide CB") : (stopper ? "Stopping CB" : "Covering CB");
      s.oopWhy = stopper ? "The more aggressive tackler steps out to meet forwards who drop." : "The quicker reader of the game stays and covers behind.";
    });
  }
  // wide attackers / wide midfielders: the side with the attacking full-back tracks; an outlet only for counters with pace
  P.filter(s => ["ML", "MR", "AML", "AMR"].includes(s.code)).forEach(s => {
    const wm = s.code === "ML" || s.code === "MR";
    const back = P.find(b => b.group === "FB" && b.side === s.side);
    const pace = keyScore(s.pick.p, ["Pace", "Off The Ball", "Anticipation"]), track = keyScore(s.pick.p, ["Stamina", "Work Rate", "Marking"]);
    const mustTrack = back && T_FWD_BACK.has(back.pick.role);
    if (style === "counter" && !mustTrack && pace > track + 0.5) {
      if (wm) { s.oop = "Wide Outlet Midfielder"; }
      else s.oop = T_INSIDE.has(s.pick.role) && keyScore(s.pick.p, ["Decisions"]) >= keyScore(s.pick.p, ["Pace"]) ? "Inverting Outlet Winger" : "Wide Outlet Winger";
      s.oopWhy = "Stays high as the counter outlet; his pace and movement are the weapon, and the full-back behind him is not going forward.";
    }
    else if (style === "press") { s.oop = wm ? "Wide Midfielder" : "Winger"; s.oopWhy = "Presses their full-back from the front instead of dropping."; }
    else { s.oop = wm ? "Tracking Wide Midfielder" : "Tracking Winger"; s.oopWhy = mustTrack ? "His full-back goes forward, so he tracks back to double up." : "Tracks back to help the full-back and keep a compact block."; }
  });
  const outlets = P.filter(s => /Outlet (Winger|Midfielder)/.test(s.oop));
  if (outlets.length > 1) outlets.slice(1).forEach(s => { s.oop = s.code === "ML" || s.code === "MR" ? "Tracking Wide Midfielder" : "Tracking Winger"; s.oopWhy = "Only one wide outlet; the other side tracks back so you don't defend with nine."; });
  // full-backs / wing-backs
  P.filter(s => s.group === "FB").forEach(s => {
    const front = P.find(f => ["ML", "MR", "AML", "AMR"].includes(f.code) && f.side === s.side);
    const press = keyScore(s.pick.p, ["Work Rate", "Anticipation", "Aggression"]), hold = keyScore(s.pick.p, ["Concentration", "Positioning", "Marking"]);
    const wb = s.code.startsWith("WB");
    if (style === "press" && press >= hold - 0.3) { s.oop = wb ? "Pressing Wing-Back" : "Pressing Full-Back"; s.oopWhy = "Your press needs the full-backs to jump onto their wide man."; }
    else if (style === "counter" || (front && /Outlet/.test(front.oop || ""))) { s.oop = wb ? "Holding Wing-Back" : "Holding Full-Back"; s.oopWhy = "Stays tight to the centre-back so the block stays compact."; }
    else { s.oop = press > hold ? (wb ? "Pressing Wing-Back" : "Pressing Full-Back") : (wb ? "Holding Wing-Back" : "Holding Full-Back"); s.oopWhy = press > hold ? "His Work Rate, Anticipation and Aggression suit pressing his winger." : "His Concentration, Positioning and Marking suit holding the line."; }
  });
  // DM / CM
  const dms = P.filter(s => s.code === "DM"), mcs = P.filter(s => s.code === "MC");
  dms.forEach((s, i) => {
    if (dms.length === 1) {
      const fwdBacks = P.filter(b => b.group === "FB" && T_FWD_BACK.has(b.pick.role)).length;
      if (fwdBacks >= 1 && P.filter(x => x.group === "CB").length < 3) { s.oop = "Dropping DM"; s.oopWhy = "Drops between the centre-backs to cover the space your attacking full-back leaves."; }
      else { s.oop = "Screening DM"; s.oopWhy = "Sits in front of the back four and blocks passes into the middle."; }
    } else pickBest(s, pool(s).slice(1, 4), i === 0 ? "Best match of his attributes; the pair should have one screening and one pressing." : "Best match of his attributes.");
  });
  if (dms.length === 2 && dms[0].oop === dms[1].oop) { dms[1].oop = dms[0].oop === "Pressing DM" ? "Screening DM" : "Pressing DM"; dms[1].oopWhy = "Paired with his partner: one screens, one presses."; }
  mcs.forEach(s => pickBest(s, pool(s).slice(1), "Best match of his attributes for this job."));
  if (mcs.length >= 2 && mcs.every(s => s.oop === "Pressing CM") && !dms.length) { const s = mcs[mcs.length - 1]; s.oop = "Screening CM"; s.oopWhy = "With no DM, one of the pair has to screen rather than press."; }
  P.filter(s => s.code === "AMC").forEach(s => {
    if (style === "counter") pickBest(s, pool(s).slice(2), "Stays higher as a counter outlet, chosen by his attributes.");
    else if (style === "press") { s.oop = "Attacking Midfielder"; s.oopWhy = "Presses their pivot from the front."; }
    else { s.oop = "Tracking AM"; s.oopWhy = "Tracks runners to protect the middle."; }
  });
  const OUTLET_CF = [["Central Outlet CF", ["Anticipation", "Off The Ball", "Decisions"]], ["Splitting Outlet CF", ["Anticipation", "Off The Ball", "Pace"]]];
  const runPace = s => keyScore(s.pick.p, ["Pace", "Off The Ball", "Anticipation"]);
  const sts = P.filter(s => s.code === "ST").sort((a, b) => runPace(b) - runPace(a));
  sts.forEach((s, i) => {
    if (style === "press") { s.oop = "Centre Forward"; s.oopWhy = "Leads the press on their centre-backs."; }
    else if (sts.length === 2) {
      if (i === 0) pickBest(s, OUTLET_CF, "The quicker striker stays high for the counter; Decisions vs Pace decides central or splitting the centre-backs.");
      else { s.oop = "Tracking CF"; s.oopWhy = "The other striker drops in to help the midfield, so the block has an extra body."; }
    } else if (style === "counter") pickBest(s, OUTLET_CF, "Stays high as the counter target.");
    else { s.oop = "Centre Forward"; s.oopWhy = "Leads the first line of the block."; }
  });
  // no more than two players left high: striker + one other (or two others with no outlet striker)
  const high = P.filter(s => ["ML", "MR", "AML", "AMR", "AMC"].includes(s.code) && /Outlet/.test(s.oop));
  const stOut = sts.some(s => /Outlet/.test(s.oop)), keep = stOut ? 1 : 2;
  if (high.length > keep) high.sort((a, b) => keyScore(b.pick.p, ["Anticipation", "Off The Ball", "Pace"]) - keyScore(a.pick.p, ["Anticipation", "Off The Ball", "Pace"])).slice(keep).forEach(s => {
    s.oop = s.code === "AMC" ? "Tracking AM" : s.code === "ML" || s.code === "MR" ? "Tracking Wide Midfielder" : "Tracking Winger";
    s.oopWhy = "Two players already stay high for the counter; a third would leave too few behind the ball, so he tracks back.";
  });  if (typeof traitNotes === "function") oopTraitFix(P, pool, keyScore);
}
// his traits beat instructions: if a trait fights his role without the ball, use the closest role it doesn't fight
function oopTraitFix(P, pool, keyScore) {
  P.forEach(s => {
    if (!s.oop) return; const n = traitNotes(s.pick.p, s.oop, s.code); if (!n.bad.length) return;
    const opts = pool(s).filter(([r]) => !traitNotes(s.pick.p, r, s.code).bad.length);
    if (!opts.length) return;
    let best = null; opts.forEach(([r, keys]) => { const v = (keys ? keyScore(s.pick.p, keys) : 10) + traitAdj(s.pick.p, r, s.code); if (v != null && (!best || v > best.v)) best = { r, v }; });
    const was = s.oop; s.oop = best.r; s.oopWhy = `Changed from ${was}: his trait "${n.bad[0].name}" works against it, and a player keeps doing his traits whatever the role asks.`;
  });
  // keep one stopper and one cover in a pair of centre-backs
  const cbs = P.filter(s => s.code === "DC");
  if (cbs.length === 2 && cbs[0].oop === cbs[1].oop) { const o = cbs.find(s => !traitNotes(s.pick.p, cbs[0].oop === "Stopping CB" ? "Covering CB" : "Stopping CB", s.code).bad.length);
    if (o) { o.oop = o.oop === "Stopping CB" ? "Covering CB" : "Stopping CB"; o.oopWhy = "Paired with his partner: one steps out, one covers (his partner's traits decided who)."; } }
}
// team instructions: style base (tactics-board presets, toned to tested values) + attribute-driven tweaks, each with a reason
function suggestInstructions(slots, style, P) {
  const I = {}, why = {};
  const set = (k, v, w) => { I[k] = v; why[k] = w; };
  const base = {
    possession: { mentality: "Positive", passing: "Shorter", tempo: "Lower", width: "Wider", transition: "Hold Shape", freedom: "Balanced", bstrategy: "Play Through Press", goalkicks: "Short", gkspeed: "Slow Pace Down", gktarget: "Centre-Backs", reception: "Pass To Feet", patience: "Work Ball Into Box", engagement: "Mid Block", dline: "Higher", dbehaviour: "Balanced", trigger: "Standard", dtransition: "Counter-Press" },
    press: { mentality: "Positive", passing: "Shorter", tempo: "Higher", width: "Standard", transition: "Counter-Attack", freedom: "More Expressive", bstrategy: "Play Through Press", goalkicks: "Mixed", gkspeed: "Distribute Quickly", gktarget: "Centre-Backs", reception: "Balanced", patience: "Standard", engagement: "High Press", dline: "Higher", dbehaviour: "Step Up More", trigger: "More Often", dtransition: "Counter-Press" },
    counter: { mentality: "Balanced", passing: "More Direct", tempo: "Higher", width: "Standard", transition: "Counter-Attack", freedom: "Balanced", bstrategy: "Bypass Press", goalkicks: "Mixed", gkspeed: "Distribute Quickly", gktarget: "Balanced", reception: "Pass Into Space", patience: "Standard", engagement: "Mid Block", dline: "Standard", dbehaviour: "Balanced", trigger: "Less Often", dtransition: "Regroup" },
    balanced: { mentality: "Balanced", passing: "Standard", tempo: "Standard", width: "Standard", transition: "Standard", freedom: "Balanced", bstrategy: "Balanced", goalkicks: "Mixed", gkspeed: "Standard", gktarget: "Centre-Backs", reception: "Balanced", patience: "Standard", engagement: "Mid Block", dline: "Standard", dbehaviour: "Balanced", trigger: "Standard", dtransition: "Standard" },
  }[style];
  const sname = T_STYLE_NAME[style];
  Object.entries(base).forEach(([k, v]) => set(k, v, `${sname} base setting.`));
  const step = (k, opts, d) => { const i = opts.indexOf(I[k]); return opts[Math.max(0, Math.min(opts.length - 1, i + d))]; };
  const LINE = ["Much Lower", "Lower", "Standard", "Higher", "Much Higher"], TRIG = ["Much Less Often", "Less Often", "Standard", "More Often", "Much More Often"];
  const f = v => v == null ? "–" : (v >= 0 ? "+" : "") + v.toFixed(1);
  // why each base fits the style
  const styleWhy = {
    possession: { passing: "Short passing keeps the ball; your XI's technique is its strongest side.", tempo: "Lower tempo drags opponents out before you go forward.", width: "Wider stretches them and makes switches easier.", transition: "Hold Shape: settle into your structure instead of rushing.", reception: "To feet keeps the ball and draws them out.", patience: "Work the ball into the box for fewer, better chances.", engagement: "Mid Block, then win it back and keep it.", dtransition: "Counter-press to win it back near their goal while your shape is still close." },
    press: { tempo: "Move it quickly before their press sets.", engagement: "High Press: your XI's work rate and reading of the game are its strongest side.", trigger: "More Often (tested well), not Much More Often, which tires and overcommits.", dtransition: "Counter-press straight after losing it.", dbehaviour: "Step up to keep the team compact behind the press." },
    counter: { passing: "More direct to get in behind quickly.", transition: "Counter-Attack: your attackers' pace is your strongest weapon.", reception: "Into space so the runners can attack it.", engagement: "Mid Block invites them on, then spring.", trigger: "Less Often keeps the shape for the counter.", dtransition: "Regroup and get compact again.", bstrategy: "Bypass the press and go long into the runners." },
    balanced: {},
  }[style];
  Object.entries(styleWhy).forEach(([k, w]) => { why[k] = w; });
  // defensive line from centre-back pace (tested: slightly lower beats the extremes)
  if (P.cbPace != null && P.cbPace <= -0.8) { set("dline", step("dline", LINE, -1), `Your centre-backs are slow for this XI (Pace/Acceleration ${f(P.cbPace)} vs the XI's average attribute), so the line drops a step to protect the space behind. A slightly lower line also tested better than the extremes.`); if (I.engagement !== "High Press") set("dbehaviour", "Drop Off More", "Slow centre-backs: drop off rather than step up into a race."); }
  else if (P.cbPace != null && P.cbPace >= 0.8 && I.dline !== "Higher") set("dline", step("dline", LINE, 1), `Quick centre-backs (pace ${f(P.cbPace)}) can hold a higher line.`);
  // pressing amount from mental pressing attributes
  if (P.press != null && P.press >= 0.8 && I.trigger !== "More Often") set("trigger", step("trigger", TRIG, 1), `Pressing comes from Work Rate, Anticipation, Decisions and Concentration, and they are a strength of your XI (${f(P.press)}), so one step more than the ${sname} base (More Often tested well; never the extreme).`);
  if (P.press != null && P.press <= -0.8) set("trigger", step("trigger", TRIG, -1), `Weak pressing attributes (${f(P.press)}): pressing more would only pull your shape apart.`);
  if (style === "press" && P.stamina != null && P.stamina <= -0.8) set("dtransition", "Standard", `Low stamina (${f(P.stamina)}): counter-pressing every loss will wear them out.`);
  // tempo needs decisions
  if (["Higher", "Much Higher"].includes(I.tempo) && P.decisions != null && P.decisions <= -0.8) set("tempo", "Standard", `High tempo needs good Decisions and yours are below the XI's average attribute (${f(P.decisions)}), so keep it Standard.`);
  // build-up and goal kicks
  if (I.bstrategy === "Play Through Press" && ((P.cbTech != null && P.cbTech <= -0.8) || (P.gkPass != null && P.gkPass <= -1.2))) { set("bstrategy", "Balanced", "Your keeper or centre-backs aren't comfortable enough on the ball to play through a press every time."); set("goalkicks", "Mixed", "Mixed goal kicks, so they aren't forced to play short when nothing is on."); }
  const tf = slots.find(s => s.pick && s.code === "ST" && s.pick.role === "Target Forward");
  if (tf && P.stAir != null && P.stAir >= 0.5 && style !== "possession") { set("gktarget", "Target Forward", `${esc(tf.pick.p.name)} wins headers, so long balls have a target.`); if (style === "counter") set("goalkicks", "Long", "Long goal kicks to the target forward skip their press."); }
  // reception / transition from attacking pace
  if (P.attPace != null && P.attPace >= 0.8 && style !== "possession") set("reception", "Pass Into Space", `Your attackers are quick (${f(P.attPace)}), so play the ball into space for them to run onto.`);
  if (P.attPace != null && P.attPace >= 0.8 && I.transition === "Standard") set("transition", "Counter-Attack", `Quick attackers (${f(P.attPace)}) punish teams caught high.`);
  // width from the XI's wide roles
  const wideRoles = slots.filter(s => s.pick && ["FB", "Wingers"].includes(s.group) && T_WIDE.has(s.pick.role)).length;
  if (wideRoles >= 3 && I.width === "Standard") set("width", "Wider", `${wideRoles} players hold the width, so stretch the pitch.`);
  if (wideRoles <= 1) set("width", "Narrower", "Few wide roles in this XI: play narrower and keep short options together.");
  // crossing: whipped by default (tested), low if no aerial threat; early crosses with good crossers
  set("crossing", P.stAir != null && P.stAir <= -0.8 ? "Low Crosses" : "Whipped Crosses", P.stAir != null && P.stAir <= -0.8 ? `Your strikers aren't strong in the air (${f(P.stAir)}), so cross low.` : "Whipped crosses tested best and are hard for keepers to claim.");
  if (P.cross != null && P.cross >= 0.8 && wideRoles >= 2 && style !== "possession") set("patience", "Hit Early Crosses", `Good crossers in wide areas (${f(P.cross)}): early crosses tested well and force them to defend their box.`);
  // shooting, dribbling, freedom
  set("longshots", P.longShots >= 3 ? "Standard" : "Discourage", P.longShots >= 3 ? `${P.longShots} players with genuinely good Long Shots.` : "Discouraging long shots tested better; enable it per player instead.");
  set("dribbling", P.dribble != null && P.dribble >= 0.8 ? "Encourage" : "Balanced", P.dribble != null && P.dribble >= 0.8 ? `Your wide and attacking players dribble well (${f(P.dribble)}); encouraging it tested positive.` : "Set it per player rather than for the team.");
  if (P.flair != null && P.flair >= 0.8 && I.freedom === "Balanced") set("freedom", "More Expressive", `Flair and Vision are strong (${f(P.flair)}).`);
  // supporting runs: overlap where the wide man goes inside and the full-back holds the width
  const runs = [];
  ["L", "R"].forEach(side => {
    const back = slots.find(s => s.pick && s.group === "FB" && s.side === side), front = slots.find(s => s.pick && ["ML", "MR", "AML", "AMR"].includes(s.code) && s.side === side);
    if (back && front && T_WIDE.has(back.pick.role) && T_INSIDE.has(front.pick.role)) runs.push(`Overlap ${side === "L" ? "Left" : "Right"}`);
    const chm = slots.find(s => s.pick && s.code === "MC" && s.side === side && s.pick.role === "Channel Midfielder");
    if (back && front && T_INSIDE.has(back.pick.role) && T_WIDE.has(front.pick.role) && chm) runs.push(`Underlap ${side === "L" ? "Left" : "Right"}`);
  });
  set("runs", runs.length ? runs.join(", ") : "None", runs.length ? "Overlap where the wide man cuts inside and the full-back holds the width; underlap where a channel midfielder runs inside a wide winger. Single underlap or both overlaps tested best." : "No side has the right pairing for an overlap or underlap.");
  // progress through the stronger flank
  const flank = side => mean(slots.filter(s => s.pick && s.side === side && (s.group === "FB" || s.group === "Wingers")).map(s => s.pick.v));
  const fl = flank("L"), fr = flank("R");
  if (fl != null && fr != null && Math.abs(fl - fr) >= 0.6) set("progress", fl > fr ? "Focus Left Flank" : "Focus Right Flank", `Your ${fl > fr ? "left" : "right"} flank pair rates ${Math.abs(fl - fr).toFixed(1)} higher than the other side, so build attacks there.`);
  else set("progress", "Balanced", "Neither flank is clearly stronger: pick the side by the opponent's weaker full-back.");
  // out of possession extras
  set("tackling", P.tackle != null && P.tackle <= -1 ? "Standard" : "Get Stuck In", P.tackle != null && P.tackle <= -1 ? `Tackling is a weak point (${f(P.tackle)}): don't dive in.` : "Get Stuck In tested better than Stay On Feet; watch the cards.");
  set("cross_eng", P.cbAir != null && P.cbAir >= 0.5 ? "Invite Crosses" : "Balanced", P.cbAir != null && P.cbAir >= 0.5 ? `Your centre-backs win headers (${f(P.cbAir)}); inviting crosses tested better.` : "Not dominant enough in the air to invite crosses.");
  const trap = P.midWin != null && P.backWin != null ? (P.midWin - P.backWin >= 0.7 ? "Trap Inside" : P.backWin - P.midWin >= 0.7 ? "Trap Outside" : "Balanced") : "Balanced";
  set("trap", trap, trap === "Trap Inside" ? "Your central midfielders are the better ball-winners: bait passes into the middle." : trap === "Trap Outside" ? "Your full-backs are the better ball-winners: force play to the touchline." : "No clear ball-winning strength in the middle or wide.");
  set("shortgk", I.engagement === "High Press" ? "Yes" : "No", I.engagement === "High Press" ? "A high press goes after their goal kick." : "With a mid or low block, let them play out, then engage.");
  set("setpieces", P.cbAir != null && P.cbAir >= 1 && P.stAir != null && P.stAir >= 0.5 ? "Play For Set Pieces" : "Standard", P.cbAir != null && P.cbAir >= 1 && P.stAir != null && P.stAir >= 0.5 ? "A tall, physical side: corners and free kicks are a real weapon." : "Keep the move alive unless you are strong in the air at both ends.");
  set("waste", "Standard", "Use More Often only when protecting a lead (Plan B).");
  return { I, why };
}
// instructions that must agree with the roles the XI now has (the rules My tactic checks)
function alignInstructions(slots, ins) {
  const I = ins.I, why = ins.why, P = slots.filter(s => s.pick), roles = P.map(s => s.pick.role);
  const set = (k, v, w) => { if (I[k] === v) return; I[k] = v; why[k] = w; };
  const runIn = roles.filter(r => R_RUN.has(r) || r === "Winger").length, fwd = roles.filter(r => R_FWD.has(r)).length;
  if (I.reception === "Pass Into Space" && runIn < 2) set("reception", "Balanced", `Only ${runIn} role${runIn === 1 ? "" : "s"} run in behind, so balls into space would have nobody to chase them.`);
  if (["Lower", "Much Lower"].includes(I.tempo) && I.transition === "Counter-Attack") set("tempo", "Standard", "Counter-attacks need the ball moved quickly; a slow tempo would kill the break.");
  if (I.reception === "Pass Into Space" && ["Lower", "Much Lower"].includes(I.tempo)) set("reception", "Pass To Feet", "At a slow tempo defenders recover before a pass into space arrives; play it to feet.");
  if (I.dtransition === "Counter-Press" && fwd >= 3) set("dtransition", "Standard", `${fwd} players are committed forward when the ball is lost, so counter-pressing would leave too few behind it.`);
  if (I.engagement === "High Press" && ["Lower", "Much Lower"].includes(I.dline)) set("dline", "Standard", "A high press with a deep line leaves a gap between them; the line stays at Standard (if the centre-backs are slow, press less instead).");
  if (I.engagement === "Low Block" && ["Higher", "Much Higher"].includes(I.dline)) set("dline", "Standard", "A low block with a high line leaves space behind with no pressure on the ball.");
  if (I.engagement === "Low Block" && ["More Often", "Much More Often"].includes(I.trigger)) set("trigger", "Standard", "Pressing often from a low block opens gaps in it.");
  if (I.engagement === "High Press" && ["Less Often", "Much Less Often"].includes(I.trigger)) set("trigger", "Standard", "A high press that rarely presses isn't a press.");
  if (I.gktarget === "Target Forward" && !roles.includes("Target Forward")) set("gktarget", "Balanced", "No Target Forward in this XI to aim at.");
  if (I.goalkicks === "Long" && (I.bstrategy === "Play Through Press" || ["Shorter", "Much Shorter"].includes(I.passing))) set("goalkicks", "Mixed", "Long goal kicks would skip the short build-up the rest of the tactic plays.");
  if (I.bstrategy === "Bypass Press" && ["Shorter", "Much Shorter"].includes(I.passing)) set("bstrategy", "Balanced", "Short passing and clearing it long under pressure pull in opposite directions.");
  if (I.setpieces === "Play For Set Pieces" && ["Shorter", "Much Shorter"].includes(I.passing)) set("setpieces", "Standard", "Short passing keeps the ball moving; hunting set pieces would push it into corners and out of play instead.");
  if (I.patience === "Work Ball Into Box" && I.longshots === "Encourage") set("longshots", "Discourage", "Working it into the box and shooting from distance can't both be the plan.");
  // supporting runs only on a side where the full-back stays wide (an overlap); never ask an inside full-back to overlap
  if (I.runs && I.runs !== "None") {
    const ok = I.runs.split(", ").filter(x => { const side = /Left/.test(x) ? "L" : "R", back = P.find(s => s.group === "FB" && s.side === side); return /Overlap/.test(x) && back && !R_INSIDE.has(back.pick.role); });
    if (ok.join(", ") !== I.runs) set("runs", ok.length ? ok.join(", ") : "None", ok.length ? "Overlaps only where the full-back holds the width." : "No side has a full-back who stays wide to overlap.");
  }
}
function alignAfterOop(slots, ins) {
  const I = ins.I, why = ins.why, P = slots.filter(s => s.pick);
  // a high press has no passengers: outlets press instead
  if (I.engagement === "High Press") P.filter(s => O_OUT.has(s.oop)).forEach(s => { s.oop = s.code === "ST" ? "Centre Forward" : s.code === "AMC" ? "Attacking Midfielder" : s.code === "ML" || s.code === "MR" ? "Wide Midfielder" : "Winger"; s.oopWhy = "In a high press everyone presses; no one waits as an outlet."; });
  // two central outlets doing the same job: the striker keeps his, the No.10 takes the other
  const am = P.find(s => s.code === "AMC" && /^(Central|Splitting) Outlet AM/.test(s.oop)), st = P.find(s => s.code === "ST" && /^(Central|Splitting) Outlet CF/.test(s.oop));
  if (am && st && am.oop.split(" ")[0] === st.oop.split(" ")[0]) { const other = st.oop.startsWith("Central") ? "Splitting" : "Central"; am.oop = `${other} Outlet AM`; am.oopWhy = `${st.oop.startsWith("Central") ? "The striker shows for the ball, so he runs between the centre-backs" : "The striker runs in behind, so he shows for the ball in the middle"}: two outlets, two different jobs.`; }
  // no DM: one central midfielder screens the back four
  const scr = ["Screening DM", "Screening CM", "Dropping DM", "Defensive Midfielder"];
  if (!P.some(s => s.code === "DM") && !P.some(s => scr.includes(s.oop))) {
    const mcs = P.filter(s => s.code === "MC"), key = s => mean(["Positioning", "Concentration", "Anticipation"].map(k => s.pick.p.a[k]));
    const s = mcs.filter(x => x.oop !== "Pressing CM").sort((a, b) => key(b) - key(a))[0] || mcs.sort((a, b) => key(b) - key(a))[1];
    if (s) { s.oop = "Screening CM"; s.oopWhy = "With no DM, someone has to sit in front of the back four: he has the best positioning and concentration of the midfielders."; }
  }
  if (I.trap === "Trap Inside" && !P.some(s => ["Screening DM", "Defensive Midfielder", "Pressing DM", "Screening CM"].includes(s.oop))) { I.trap = "Balanced"; why.trap = "Trapping play inside needs a midfielder to spring the trap; there isn't one in this XI."; }
}
// the finished suggestion, checked by the same rules as My tactic
const T_TI_MAP = { passing: "passing-directness", tempo: "tempo", width: "attacking-width", transition: "attacking-transition", dtransition: "defensive-transition", freedom: "creative-freedom", bstrategy: "build-up-strategy",
  goalkicks: "goal-kicks", gkspeed: "gk-distribution-speed", gktarget: "gk-distribution", reception: "pass-reception", patience: "patience", crossing: "crossing-style", longshots: "shots-from-distance", dribbling: "dribbling",
  engagement: "line-of-engagement", dline: "defensive-line", dbehaviour: "defensive-line-behaviour", trigger: "trigger-press", tackling: "tackling", cross_eng: "cross-engagement", trap: "pressing-trap", shortgk: "prevent-short-gk-distribution", setpieces: "play-for-set-pieces", waste: "time-wasting" };
function suggestionAsTactic(slots, ins) {
  const ti = {}, I = ins.I;
  Object.entries(T_TI_MAP).forEach(([k, id]) => { let v = I[k]; if (v == null) return; const d = TI_BY[id]; if (!d) return;
    if (!d[3].includes(v)) v = { Standard: d[3].includes("Balanced") ? "Balanced" : d[4] }[v] || ({ "play-for-set-pieces": "Keep Ball in Play" }[id]) || d[4]; ti[id] = v; });
  const runs = I.runs && I.runs !== "None" ? I.runs : ""; ti["supporting-runs"] = /Left/.test(runs) && /Right/.test(runs) ? "Both Flanks" : /Left/.test(runs) ? "Left" : /Right/.test(runs) ? "Right" : "Balanced";
  const pr = I.progress || ""; ti["progress-through"] = /Left/.test(pr) ? "Left" : /Right/.test(pr) ? "Right" : "Balanced";
  const P = slots.filter(s => s.pick);
  return { name: "Suggested", style: "", mentality: I.mentality || "Balanced", ti, slots: P.map((s, i) => ({ i, ip: { code: s.code, role: s.pick.role, side: TAC_FLANK[s.code] || "C", x: s.x ?? CODE_X[s.code] ?? 50, y: 0 }, oop: { code: s.oopCode || s.code, role: s.oop || "", x: s.oopX ?? s.x ?? CODE_X[s.code] ?? 50, y: 0 } })) };
}
function tacticSanity(slots, ins) {
  if (typeof tacAnalyse !== "function") return null;
  const W = suggestionAsTactic(slots, ins);
  const A = tacAnalyse(W, null).filter(x => x.sec !== "players");
  return { bad: A.filter(x => ["conflict", "risk", "minor"].includes(x.kind)), good: A.filter(x => x.kind === "good") };
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-toop], [data-tpitch]"); if (!t) return;
  const y = window.scrollY; if (t.dataset.toop) S.tOop = t.dataset.toop; else S.tPitch = t.dataset.tpitch; render(); window.scrollTo(0, y);
});
