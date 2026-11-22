// ---------- Opponent game plan: a 7-step checklist built from their last team sheets (olData), for any club ----------
// 1 how they build (back 3 or 4) → your plan, 2 their mentality (check in FM), 3 opposition instructions by role,
// 4 pressing trap (inside / outside), 5 where the space is behind them, 6 weaknesses and team news (check in FM),
// 7 in-match checklist with their usual subs.
const GP_ATT_FB = new Set(["Wing-Back", "Advanced Wing-Back", "Playmaking Wing-Back"]);        // gets forward on the outside
const GP_INV_FB = new Set(["Inverted Wing-Back", "Inside Wing-Back"]);                          // tucks into midfield
const GP_STEP_IN = new Set(["Inverted Full-Back", "Inside Full-Back"]);                         // steps into the back line
const GP_POCKET = new Set(["Advanced Playmaker", "Free Role", "Attacking Midfielder", "Second Striker", "Channel Midfielder"]);
const GP_WIDE_ATT = new Set(["Wide Forward", "Inside Forward", "Winger", "Inside Winger", "Half-Space Winger", "Playmaking Winger"]);
const GP_STAY_HIGH = new Set(["Winger", "Wide Outlet Winger", "Inverting Outlet Winger", "Wide Outlet Midfielder"]);
const GP_STEP_OUT = new Set(["Pressing Full-Back", "Pressing Wing-Back"]);
const GP_FB = ["DR", "DL", "WBR", "WBL"], GP_WIDE = ["AMR", "AML", "MR", "ML"];
const gpYourSide = code => /R$/.test(code) ? "left" : "right";   // their right side attacks your left

// how many stay at the back when they have the ball: three, two (both full-backs go) or four. returns { three, two, why }
function gpBuild(xi) {
  const dc = xi.filter(x => x.code === "DC").length;
  if (dc >= 3) return { three: true, why: `they start ${dc} centre-backs` };
  const fb = xi.filter(x => GP_FB.includes(x.code));
  const step = fb.find(x => GP_STEP_IN.has(x.ip));
  if (step) return { three: true, why: `${esc(step.n)} plays ${esc(step.ip)} and steps into the back line`, x: step };
  const up = fb.filter(x => GP_ATT_FB.has(x.ip) || GP_INV_FB.has(x.ip)), home = fb.filter(x => x.ip === "Full-Back");
  if (up.length === 1 && home.length === 1) return { three: true, why: `${esc(up[0].n)} (${esc(up[0].ip)}) goes forward while ${esc(home[0].n)} (Full-Back) stays with the centre-backs` };
  const hb = xi.find(x => x.code === "DM" && x.ip === "Half-Back");
  if (hb) return { three: true, why: `${esc(hb.n)} plays Half-Back and drops between the centre-backs` };
  if (up.length >= 2) return { three: false, two: true, why: `both full-backs leave the back line (${up.map(x => `${esc(x.n)}, ${esc(x.ip)}`).join("; ")}), so only the two centre-backs stay` };
  return { three: false, why: fb.length >= 2 ? `two centre-backs with ${fb.map(x => esc(x.ip || "full-back")).join(" and ")} either side` : "two centre-backs" };
}

// opposition instructions by role: [x, instruction, why]
function gpOIs(X) {
  const out = [], used = new Set(), add = (x, w, y) => { if (x && !used.has(x.n)) { used.add(x.n); out.push([x, w, y]); } };
  X.filter(x => ["AMC", "MC"].includes(x.code) && GP_POCKET.has(x.ip)).slice(0, 2)
    .forEach(x => add(x, "Tight marking", `${esc(x.ip)}: he lives in the pocket between your midfield and defence, so keep someone on him`));
  const mids = X.filter(x => x.code === "DM"), cms = mids.length ? mids : X.filter(x => x.code === "MC");
  cms.slice(0, 2).forEach(x => add(x, "Trigger press", `${esc(x.ip || "Midfielder")}: their attacks start with him, so pressure him the moment he gets the ball`));
  X.filter(x => GP_WIDE.includes(x.code) && GP_WIDE_ATT.has(x.ip))
    .forEach(x => add(x, "Trigger press + show onto weaker foot", `${esc(x.ip)} attacking your ${gpYourSide(x.code)} side. Showing him onto his weaker foot stops his shots; add Tight marking too if he's their main creator (check his assists)`));
  X.filter(x => GP_FB.includes(x.code) && GP_ATT_FB.has(x.ip))
    .forEach(x => add(x, "Tight marking", `${esc(x.ip)} attacking your ${gpYourSide(x.code)} side; mark him so his overlaps and crosses don't come free`));
  X.filter(x => x.code === "ST").forEach(x => {
    if (x.ip === "Target Forward") add(x, "Tight marking", "Target Forward: long balls go to him, so don't let him win them unchallenged");
    else if (x.ip === "Poacher") add(x, "Tight marking", "Poacher: he waits on your last defender, so marking him doesn't drag a centre-back out of your line");
    else if (["Deep-Lying Forward", "False Nine"].includes(x.ip)) add(x, "Trigger press only", `${esc(x.ip)}: he drops deep to link play. Press him there, but don't tight mark: it drags a centre-back out of your line`);
  });
  return out;
}

// where the space is: players who stay high or step out when they lose the ball
function gpSpace(X) {
  const out = [];
  X.filter(x => GP_WIDE.includes(x.code) && GP_STAY_HIGH.has(x.oop))
    .forEach(x => out.push(`${esc(x.n)} stays high out of possession (${esc(x.oop)}), so their full-back behind him is often alone: attack down your ${gpYourSide(x.code)} on the counter`));
  X.filter(x => GP_FB.includes(x.code) && GP_STEP_OUT.has(x.oop))
    .forEach(x => out.push(`${esc(x.n)} steps out to press (${esc(x.oop)}): the space behind him is there for a runner down your ${gpYourSide(x.code)}`));
  X.filter(x => GP_FB.includes(x.code) && (GP_ATT_FB.has(x.ip) || GP_INV_FB.has(x.ip)))
    .forEach(x => out.push(`${esc(x.n)} leaves his flank when they have the ball (${esc(x.ip)}): win it and go straight into that space down your ${gpYourSide(x.code)}`));
  return [...new Set(out)].slice(0, 3);
}

// pressing trap: where their danger comes from (centre or flanks) and where your players win the ball best
const GP_DEEP_PM = new Set(["Deep-Lying Playmaker", "Roaming Playmaker", "Regista", "Playmaker", "Half-Back", "Anchor Playmaker"]);
const GP_CUT_IN = new Set(["Inside Forward", "Inside Winger", "Half-Space Winger", "Inverted Winger", "Inverting Outlet Winger"]);
const GP_TOUCHLINE = new Set(["Winger", "Wide Outlet Winger", "Playmaking Winger", "Wide Midfielder", "Wide Outlet Midfielder"]);
function gpWinners() {   // your regulars' ball-winning (Tackling, Anticipation, Positioning, 1-20): centre vs flanks
  const Q = typeof homeSquad === "function" ? homeSquad() : null; if (!Q || !SAVE || !SAVE.attrs) return null;
  const ix = ["Tackling", "Anticipation", "Positioning"].map(l => (ATTR_COLS.find(a => a[0] === l) || [])[1]).filter(k => k != null); if (!ix.length) return null;
  const ux = saveUidIndex(), win = x => { const i = ux.get(x.r.p.uid); if (i == null) return null; const v = ix.map(k => SAVE.attrs[i * 52 + k]).filter(v => v > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const pick = (gs, n) => { const seen = new Set(); return Q.players.filter(x => gs.includes(x.pos) && !seen.has(x.r.p.uid) && seen.add(x.r.p.uid)).sort((a, b) => b.mins - a.mins).slice(0, n).map(x => [x.r.p.name, win(x)]).filter(x => x[1] != null); };
  const mid = pick(["DM", "CM"], 3), wide = pick(["FB", "W"], 4), avg = l => l.length ? l.reduce((s, x) => s + x[1], 0) / l.length : null;
  return { mid, wide, m: avg(mid), w: avg(wide) };
}
function gpTrap(X) {
  const c = [], w = [], nm = x => `${esc(x.n)} (${esc(x.ip)})`;
  X.forEach(x => {
    if (["AMC", "MC"].includes(x.code) && GP_POCKET.has(x.ip)) c.push(nm(x));
    else if (["DM", "MC"].includes(x.code) && GP_DEEP_PM.has(x.ip)) c.push(nm(x));
    else if (GP_WIDE.includes(x.code) && GP_CUT_IN.has(x.ip)) c.push(nm(x) + " cuts inside");
    else if (GP_FB.includes(x.code) && GP_INV_FB.has(x.ip)) c.push(nm(x) + " comes inside");
    if (GP_WIDE.includes(x.code) && GP_TOUCHLINE.has(x.ip)) w.push(nm(x));
    else if (GP_FB.includes(x.code) && GP_ATT_FB.has(x.ip)) w.push(nm(x));
    else if (x.code === "ST" && x.ip === "Target Forward") w.push(nm(x) + " to cross to");
  });
  const narrow = !X.some(x => GP_WIDE.includes(x.code)), cs = c.length + (narrow ? 1 : 0), ws = w.length, W = gpWinners();
  const youMid = W && W.m != null && W.w != null && W.m - W.w >= 0.7, youWide = W && W.m != null && W.w != null && W.w - W.m >= 0.7;
  const who = l => l.map(x => esc(x[0])).join(", ");
  let pick, why;
  if (cs - ws >= 2 && !youMid) { pick = "Trap Outside"; why = `Their danger is through the middle: ${c.join(", ")}${narrow ? "; and they play without wide men" : ""}. Trap Outside pushes the ball to the touchline, which acts as an extra defender, and keeps it away from those players.${ws ? "" : " They have little width, so being forced wide hurts them."}`; }
  else if (ws - cs >= 2 && !youWide) { pick = "Trap Inside"; why = `Their danger is out wide: ${w.join(", ")}. Trap Inside forces the ball into the middle${W && W.mid.length ? `, where ${who(W.mid)} win it` : ""}, and away from their wide players.`; }
  else if (youMid && cs < 2) { pick = "Trap Inside"; why = `Their threat is fairly even, and your central midfielders (${who(W.mid)}) win the ball better than your full-backs and wingers: let them do it.`; }
  else if (youWide && ws < 2) { pick = "Trap Outside"; why = `Their threat is fairly even, and your full-backs and wingers (${who(W.wide)}) win the ball better than your central midfielders: push play to them.`; }
  else { pick = "Balanced"; why = `No clear side to trap them on${cs || ws ? ` (centre: ${c.length ? c.join(", ") : "nobody special"}; wide: ${w.length ? w.join(", ") : "nobody special"})` : ""}.`; }
  const risk = pick === "Trap Inside" ? "Watch out: it stretches your lines, so their pocket player gets more room if they have one. Keep your Tight marking on him." : pick === "Trap Outside" ? `Watch out: a quick switch of play to the other flank beats it${ws ? `, especially to ${w[0]}` : ""}. Your recoveries are safer, but your counters start from the touchline.` : "";
  const yours = W && W.m != null && W.w != null ? `Your ball-winning (Tackling, Anticipation, Positioning): central midfield ${W.m.toFixed(1)}, full-backs and wingers ${W.w.toFixed(1)}.` : "";
  return `<p><b>${pick}</b>. ${why}</p>${risk ? `<p class="small">${risk}</p>` : ""}<p class="small muted">Set it in your out-of-possession team instructions (Pressing trap). ${yours}</p>`;
}
// a manager who took over recently: [name, start date] (his team sheets may be mixed with his predecessor's)
const GP_NEW_DAYS = 60;
function gpNewManager(club) {
  if (club == null || club < 0 || !hasStaff() || !SAVE.meta || !SAVE.meta.gameDate) return null;
  const ST = SAVE.staff, now = new Date(SAVE.meta.gameDate + "T00:00:00Z"); let best = null;
  for (let i = 0; i < ST.n; i++) if (ST.clubIdx[i] === club && ST.job[i] === 16 && ST.cStart[i] && (best == null || ST.cStart[i] > ST.cStart[best])) best = i;
  if (best == null) return null;
  const d = sDate(ST.cStart[best]); if (!d || (now - d) / 864e5 > GP_NEW_DAYS || d > now) return null;
  return [ST.name[best], sDateTxt(ST.cStart[best])];
}
// who they usually bring on
function gpSubs(G) {
  const c = new Map(); G.forEach(g => (g.subs || []).forEach(n => c.set(n, (c.get(n) || 0) + 1)));
  return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}

function gpHtml(B, t, brief) {
  const O = typeof olData === "function" ? olData(B, t) : null;
  if (!O || O.xi.length < 10) return "";
  const X = O.xi, G = O.games, name = mxName(B, t);
  const nm = x => x.i != null ? `<button class="linkbtn" data-sci="${x.i}">${esc(x.n)}</button>` : `<b>${esc(x.n)}</b>`;
  const b = gpBuild(X), V = G.filter(g => g.xi.length >= 10).map(g => gpBuild(g.xi)), nG = V.length;
  const n3 = V.filter(v => v.three).length, n2 = V.filter(v => v.two).length, n4 = nG - n3 - n2;
  const build = b.three
    ? `<p><b>Back 3 in possession</b> <span class="small muted">(${n3} of ${nG} games)</span>: ${b.why}.</p>
       <ul class="why"><li>Their three plus a DM outnumber a front three, so a high press gets played through. <b>Use a mid block and counter</b>; press only when the ball goes into midfield.</li>
       <li>Their wing-backs give the width: track them with your wide players, and attack the space they leave behind.</li></ul>`
    : b.two
    ? `<p><b>Back 2 in possession</b> <span class="small muted">(${n2} of ${nG} games)</span>: ${b.why}.</p>
       <ul class="why"><li>Only two centre-backs to beat: <b>press high</b>, your front three outnumber them.</li>
       <li>Both flanks are empty behind their full-backs when you win the ball: counter straight down the wings.</li>
       <li>Their midfield is crowded (full-backs join it), so tight mark the pocket player and press their DMs.</li></ul>`
    : `<p><b>Back 4 in possession</b> <span class="small muted">(${n4} of ${nG} games)</span>: ${b.why}.</p>
       <ul class="why"><li>Two centre-backs and a DM are easy to trap: <b>press high</b> and push your line up.</li>
       <li>Watch the gap between their full-back and centre-back for your runners.</li></ul>`;
  const ois = gpOIs(X), space = gpSpace(X), subs = gpSubs(G), nm8 = gpNewManager(O.club);
  const oiRows = ois.length ? `<div class="tscroll"><table class="gtable narrow"><thead><tr><th>Player</th><th>Instruction</th><th>Why</th></tr></thead><tbody>
    ${ois.map(([x, w, y]) => `<tr><td>${nm(x)} <span class="small muted">${esc(x.slot)}</span></td><td><b>${w}</b></td><td class="small">${y}</td></tr>`).join("")}</tbody></table></div>
    <p class="small muted">Leave inverted full-backs and wing-backs alone (they come inside, not forward) and leave Channel and Centre Forwards to your centre-backs.</p>`
    : `<p class="small muted">No obvious targets in their roles: use the opposition instructions FM's report suggests.</p>`;
  return `<section class="panel${brief ? " mxbrief" : ""}"><div class="ph"><h3>Game plan against ${esc(name)}</h3><span class="small muted">7 checks, from their last ${G.length} team sheets</span></div>
    ${nm8 ? `<p class="readbox warn small"><b>New manager:</b> ${esc(nm8[0])} took over on ${esc(nm8[1])}. Some of these ${G.length} team sheets may be from the previous manager, so trust the most recent games most and check his tactic in FM's report.</p>` : ""}
    <h4>1. How they build</h4>${build}
    <h4>2. Their mentality <span class="small muted">(check the manager card in FM's report)</span></h4>
    <ul class="why"><li><b>Cautious / Defensive:</b> they won't come at you. Mid block, keep the ball, be patient; a deep block just hands them a 0–0.</li>
      <li><b>Balanced / Positive:</b> your usual approach.</li>
      <li><b>Adventurous / Attacking:</b> they leave space behind. Mid block (low block if they're much stronger) and counter quickly.</li>
      <li><b>Man marking</b> on their card: players who swap positions (inverted full-backs, roaming midfielders, runners in behind) drag their markers out of shape.</li></ul>
    <h4>3. Opposition instructions <span class="small muted">(none of these cost familiarity)</span></h4>${oiRows}
    <h4>4. Pressing trap</h4>${gpTrap(X)}
    <h4>5. Where the space is</h4>${space.length ? `<ul class="why">${space.map(s => `<li>${s}.</li>`).join("")}</ul>` : `<p class="small muted">Their out-of-possession roles keep everyone compact: be patient and use set pieces.</p>`}
    <h4>6. Weaknesses and team news <span class="small muted">(check in FM)</span></h4>
    <ul class="why"><li><b>Weak at near-post set pieces</b> in the report: aim your corners at the near post with your best header there.</li>
      <li><b>Strong at corners:</b> man-mark their best headers and keep a tall player zonal at the near post.</li>
      <li><b>Assists conceded from one side:</b> put your best wide runner on that side.</li>
      <li><b>Injured or unregistered centre-back:</b> their back line is weaker, so run at it.</li></ul>
    <h4>7. During the match</h4>
    <ul class="why"><li><b>15':</b> check their in-possession formation on the match stats. If it isn't the shape above, switch plan.</li>
      <li><b>About 50':</b> fresh legs in central midfield, and <b>move your opposition instructions onto their subs</b>: instructions stay on the player who went off.${subs.length ? ` They usually bring on ${subs.map(([n, c]) => `<b>${esc(n)}</b> <span class="small muted">(${c}×)</span>`).join(", ")}.` : ""}</li>
      <li><b>Half-time, leading:</b> team talk "Don't get complacent" or "Demand more", not praise. Praise makes a winning team sloppy straight after the break.</li></ul>
  </section>`;
}
