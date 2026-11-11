// ---------- Player traits (FM's "preferred moves"): read from the save, shown in the profile, and used when picking roles ----------
// The save keeps them as a 64-bit set per player. Which bit is which trait was worked out from 100,000+ players
// (positions, footedness, attributes, well-known players) and matched to FM's full trait list. A few bits in the same set
// (seen on penalty and free-kick takers) aren't traits on that list and aren't shown.
// role effects: good = the trait helps that role, bad = it works against it (e.g. cutting inside as a touchline Winger)
const TR_WIDE = ["Winger", "Wide Midfielder", "Full-Back", "Wing-Back", "Advanced Wing-Back"];
const TR_INSIDE = ["Inside Forward", "Inside Winger", "Half-Space Winger", "Playmaking Winger", "Inside Full-Back", "Inverted Full-Back", "Inside Wing-Back", "Inverted Wing-Back", "Playmaking Wing-Back"];
const TR_HOLD = ["Half-Back", "Defensive Midfielder", "Deep-Lying Playmaker"];
const TR_CB = ["Centre-Back", "No-Nonsense CB", "Ball-Playing CB"];
const TR_PM = ["Deep-Lying Playmaker", "Midfield Playmaker", "Advanced Playmaker", "Box-to-Box Playmaker", "Playmaking Winger", "Playmaking Wing-Back", "Free Role", "False Nine"];
const TR_ATT = ["Attacking Midfielder", "Advanced Playmaker", "Free Role", "Second Striker", "Channel Midfielder", "Winger", "Inside Winger", "Playmaking Winger", "Half-Space Winger", "Wide Forward", "Inside Forward", "Centre Forward", "Poacher", "Target Forward", "Deep-Lying Forward", "False Nine", "Channel Forward"];
const TR_DRIB_GOOD = ["Winger", "Inside Forward", "Inside Winger", "Wide Forward", "Half-Space Winger", "Free Role", "Channel Forward", "Advanced Playmaker"];
const TR_DRIB_BAD = ["Half-Back", "Defensive Midfielder", "Centre-Back", "No-Nonsense CB", "Deep-Lying Playmaker", "No-Nonsense GK"];
const TR_OUTLET = ["Wide Outlet Winger", "Wide Outlet Midfielder", "Inverting Outlet Winger", "Central Outlet AM", "Splitting Outlet AM", "Central Outlet CF", "Splitting Outlet CF"];
const TR_PRESS = ["Pressing Full-Back", "Pressing Wing-Back", "Pressing DM", "Pressing CM", "Stopping CB", "Stopping Wide CB"];
const TR_COVER = ["Covering CB", "Covering Wide CB", "Screening DM", "Screening CM", "Holding Full-Back", "Holding Wing-Back"];
// [bit, key, name, group, what it does, good roles, bad roles, side (L/R: only matters on that wing)]
const TRAITS = [
  [13, "fwd", "Gets Forward Whenever Possible", "Movement", "Joins attacks at every chance, even from defence or a holding role.", ["Wing-Back", "Advanced Wing-Back", "Box-to-Box Midfielder", "Box-to-Box Playmaker", "Channel Midfielder", "Overlapping CB"], [...TR_HOLD, ...TR_CB, "Inverted Full-Back", "Holding Full-Back", "Holding Wing-Back", "Screening DM", "Screening CM"]],
  [41, "stay", "Stays Back At All Times", "Movement", "Rarely crosses halfway: a defender or holder who protects the back line.", [...TR_HOLD, ...TR_CB, "Inverted Full-Back", "Full-Back", "Holding Full-Back", "Holding Wing-Back", "Screening DM", "Screening CM", "Dropping DM"], ["Wing-Back", "Advanced Wing-Back", "Overlapping CB", "Advanced CB", "Box-to-Box Midfielder", "Box-to-Box Playmaker", "Channel Midfielder", "Wide Central Midfielder", "Inside Wing-Back", "Playmaking Wing-Back", ...TR_ATT, ...TR_OUTLET]],
  [65, "cutL", "Cuts Inside From Left Wing", "Movement", "On the left he comes inside onto his stronger foot to shoot or pass, rather than going down the line.", ["Inside Forward", "Inside Winger", "Half-Space Winger", "Playmaking Winger"], ["Winger", "Wide Midfielder", "Full-Back", "Wing-Back", "Advanced Wing-Back"], "L"],
  [66, "cutR", "Cuts Inside From Right Wing", "Movement", "On the right he comes inside onto his stronger foot to shoot or pass, rather than going down the line.", ["Inside Forward", "Inside Winger", "Half-Space Winger", "Playmaking Winger"], ["Winger", "Wide Midfielder", "Full-Back", "Wing-Back", "Advanced Wing-Back"], "R"],
  [48, "hug", "Hugs Line", "Movement", "Stays wide on the touchline to stretch the pitch.", TR_WIDE.concat(["Wide Forward"]), TR_INSIDE],
  [8, "runL", "Runs With Ball Down Left", "Movement", "Carries the ball forward down the left flank.", TR_WIDE.concat(["Wide Forward"]), TR_INSIDE, "L"],
  [9, "runR", "Runs With Ball Down Right", "Movement", "Carries the ball forward down the right flank.", TR_WIDE.concat(["Wide Forward"]), TR_INSIDE, "R"],
  [10, "runC", "Runs With Ball Through Centre", "Movement", "Carries the ball through the middle of the pitch.", ["Inside Forward", "Inside Winger", "Half-Space Winger", "Advanced Playmaker", "Free Role", "Box-to-Box Midfielder", "Box-to-Box Playmaker", "Channel Midfielder"], ["Winger", "Wide Midfielder"]],
  [12, "area", "Gets Into Opposition Area", "Movement", "Makes runs into the box whenever he can.", ["Poacher", "Inside Forward", "Second Striker", "Channel Midfielder", "Wide Forward", "Box-to-Box Midfielder", "Centre Forward"], TR_HOLD],
  [11, "late", "Arrives Late In Opponent's Area", "Movement", "Waits outside the box, then times a late run into it.", ["Box-to-Box Midfielder", "Central Midfielder", "Attacking Midfielder", "Channel Midfielder", "Second Striker"], ["Half-Back", "Defensive Midfielder"]],
  [52, "deep", "Comes Deep To Get Ball", "Movement", "Drops off the front line or into midfield to receive.", ["Deep-Lying Forward", "False Nine", "Advanced Playmaker", "Free Role", "Playmaking Winger", "Deep-Lying Playmaker"], ["Poacher", "Channel Forward", "Splitting Outlet CF", "Splitting Outlet AM"]],
  [21, "offside", "Likes To Try To Beat Offside Trap", "Movement", "Plays on the last defender's shoulder and runs in behind.", ["Poacher", "Channel Forward", "Centre Forward", "Inside Forward", "Wide Forward", "Second Striker", "Splitting Outlet CF", "Splitting Outlet AM", "Wide Outlet Winger"], ["False Nine", "Deep-Lying Forward", "Target Forward"]],
  [26, "btg", "Plays With Back To Goal", "Movement", "Holds the ball up with his back to goal and brings others in.", ["Target Forward", "Deep-Lying Forward", "Centre Forward"], ["Channel Forward", "Poacher"]],
  [50, "nochan", "Mainly Stays Inside Penalty Area", "Movement", "Stays in the box waiting for chances instead of dropping or drifting wide.", ["Poacher", "Target Forward", "Centre Forward"], ["Channel Forward", "Channel Midfielder", "Wide Forward", "Deep-Lying Forward", "False Nine"]],
  [67, "chan", "Moves Into Channels", "Movement", "Runs into the gaps between centre-backs and full-backs.", ["Channel Forward", "Channel Midfielder", "Wide Forward", "Second Striker", "Splitting Outlet CF"], ["Target Forward", "Poacher"]],
  [47, "cutB", "Cuts Inside From Both Wings", "Movement", "Comes inside from either flank instead of going down the line.", ["Inside Forward", "Inside Winger", "Half-Space Winger", "Playmaking Winger"], ["Winger", "Wide Midfielder", "Wing-Back", "Advanced Wing-Back"]],
  [23, "rare", "Runs With Ball Rarely", "Dribbling", "Passes rather than carrying the ball himself.", ["Half-Back", "Defensive Midfielder", "Centre-Back", "No-Nonsense CB", "Deep-Lying Playmaker"], TR_DRIB_GOOD],
  [34, "dwell", "Dwells On Ball", "Passing", "Takes extra touches before releasing it, inviting pressure.", [], []],
  [32, "stop", "Stops Play", "Passing", "Slows the game down now and then instead of going forward quickly.", ["Deep-Lying Playmaker"], ["Inside Forward", "Channel Forward", "Wide Outlet Winger", "Central Outlet CF", "Splitting Outlet CF"]],
  [39, "lookpass", "Looks For Pass Rather Than Attempting To Score", "Passing", "Passes to a team-mate even when he could shoot.", ["Advanced Playmaker", "False Nine", "Playmaking Winger", "Free Role"], ["Poacher", "Centre Forward", "Inside Forward", "Second Striker"]],
  [60, "nothrough", "Plays No Through Balls", "Passing", "Avoids risky passes in behind the defence.", ["Half-Back", "Defensive Midfielder", "Centre-Back", "No-Nonsense CB"], TR_PM],
  [38, "feet", "Likes Ball Played Into Feet", "Movement", "Wants the ball to feet rather than played into space.", ["Deep-Lying Forward", "False Nine", "Target Forward", "Advanced Playmaker"], ["Channel Forward", "Poacher", "Splitting Outlet CF"]],
  [64, "nolong", "Refrains From Taking Long Shots", "Shooting", "Works the ball into the box instead of shooting from range.", [], []],
  [29, "lob", "Tries To Lob Keeper", "Shooting", "Chips the goalkeeper in one-on-ones.", [], []],
  [20, "round", "Likes To Round Keeper", "Shooting", "Takes the ball round the goalkeeper in one-on-ones.", [], []],
  [31, "first", "Attempts First Time Shots", "Shooting", "Shoots without controlling the ball first.", [], []],
  [62, "overhead", "Attempts Overhead Kicks", "Shooting", "Tries bicycle kicks when the ball is in the air.", [], []],
  [24, "argue", "Argues With Officials", "Attitude", "Complains to the referee: risks bookings.", [], []],
  [25, "windup", "Winds Up Opponents", "Attitude", "Provokes opponents into reacting and losing their heads.", [], []],
  [49, "crowd", "Gets Crowd Going", "Attitude", "Lifts the crowd and the team's spirit.", [], []],
  [28, "onetwo", "Plays One-Twos", "Passing", "Plays quick give-and-go passes to get past opponents.", ["Advanced Playmaker", "Attacking Midfielder", "Free Role", "Inside Forward", "Deep-Lying Forward", "False Nine", "Midfield Playmaker"], []],
  [27, "tempo", "Dictates Tempo", "Passing", "Controls the speed of the game, slowing it down or speeding it up.", TR_PM, ["Poacher"]],
  [15, "killer", "Tries Killer Balls Often", "Passing", "Looks for through balls and risky defence-splitting passes.", TR_PM.concat(["Attacking Midfielder"]), []],
  [30, "short", "Plays Short Simple Passes", "Passing", "Keeps it short and safe to keep the ball.", ["Half-Back", "Defensive Midfielder", "Central Midfielder", "Inverted Full-Back"], []],
  [51, "long", "Tries Long Range Passes", "Passing", "Looks for long, direct passes.", ["Ball-Playing CB", "Deep-Lying Playmaker", "Ball-Playing GK", "Playmaking Wing-Back", "Half-Back"], []],
  [55, "switch", "Likes To Switch Ball To Other Flank", "Passing", "Plays long diagonals to the far side.", ["Ball-Playing CB", "Deep-Lying Playmaker", "Half-Back", "Playmaking Wing-Back", "Midfield Playmaker"], []],
  [59, "runs", "Runs With Ball Often", "Dribbling", "Carries the ball forward himself instead of passing.", TR_DRIB_GOOD, TR_DRIB_BAD],
  [43, "tricks", "Tries Tricks", "Dribbling", "Tries flicks and skills to beat players.", TR_DRIB_GOOD, TR_DRIB_BAD],
  [54, "beat", "Likes To Beat Man Repeatedly", "Dribbling", "Keeps taking players on, even after beating one.", TR_DRIB_GOOD, TR_DRIB_BAD],
  [35, "knock", "Knocks Ball Past Opponent", "Dribbling", "Pushes the ball past a defender and uses his pace to get round.", TR_DRIB_GOOD, TR_DRIB_BAD],
  [36, "toR", "Moves Ball To Right Foot Before Dribble Attempt", "Dribbling", "Shifts the ball onto his right foot before taking a man on.", [], []],
  [37, "toL", "Moves Ball To Left Foot Before Dribble Attempt", "Dribbling", "Shifts the ball onto his left foot before taking a man on.", [], []],
  [42, "weak", "Avoids Using Weaker Foot", "Technique", "Uses his stronger foot even when the other would be better.", [], []],
  [22, "outside", "Uses Outside Of Foot", "Technique", "Curls passes, crosses and shots with the outside of his foot.", [], []],
  [19, "curl", "Curls Ball", "Technique", "Puts curl on passes, crosses and shots.", [], []],
  [16, "dist", "Shoots From Distance", "Shooting", "Shoots from outside the box often.", [], []],
  [17, "power", "Shoots With Power", "Shooting", "Hits shots hard rather than placing them.", [], []],
  [18, "place", "Places Shots", "Shooting", "Picks his spot rather than blasting it.", [], []],
  [44, "lrfk", "Tries Long Range Free Kicks", "Set pieces", "Shoots from free kicks even from far out.", [], []],
  [53, "fkpow", "Hits Free Kicks With Power", "Set pieces", "Strikes free kicks hard instead of curling them.", [], []],
  [58, "throw", "Possesses Long Flat Throw", "Set pieces", "Long, flat throw-ins into the box.", [], []],
  [45, "dives", "Dives Into Tackles", "Defending", "Goes to ground to win the ball: wins more, but risks fouls and being beaten.", ["Stopping CB", "Stopping Wide CB", "Pressing Full-Back", "Pressing Wing-Back", "Pressing DM", "Pressing CM"], ["Covering CB", "Covering Wide CB", "Screening DM", "Screening CM"]],
  [46, "nodive", "Does Not Dive Into Tackles", "Defending", "Stays on his feet and intercepts rather than lunging.", ["Covering CB", "Covering Wide CB", "Screening DM", "Screening CM", "Holding Full-Back", "Holding Wing-Back"], ["Stopping CB", "Stopping Wide CB"]],
  [14, "tight", "Marks Opponent Tightly", "Defending", "Stays close to his man when out of possession.", ["Stopping CB", "Stopping Wide CB", "Tracking Winger", "Tracking Wide Midfielder", "Tracking AM", "Tracking CF", ...TR_PRESS], []],
  [68, "bring", "Brings Ball Out Of Defence", "Defending", "Carries the ball out from the back into midfield.", ["Ball-Playing CB", "Overlapping CB", "Advanced CB", "Wide CB"], ["No-Nonsense CB"]],
  [40, "trouble", "Tries To Play Way Out Of Trouble", "Defending", "Passes or dribbles out of pressure instead of clearing.", ["Ball-Playing CB", "Ball-Playing GK", "Deep-Lying Playmaker", "Half-Back", "Sweeper Keeper"], ["No-Nonsense CB", "No-Nonsense GK"]],
  [63, "gkthrow", "Uses Long Throws To Start Counter-Attacks", "Goalkeeping", "Throws it long and quickly to start a counter.", ["Ball-Playing GK", "Sweeper Keeper"], []],
].map(([b, key, name, group, what, good, bad, side]) => ({ t: b - 8, key, name, group, what, good: new Set(good), bad: new Set(bad), side }));
// what each trait needs from his attributes to help rather than hurt, and the ones that are risky whatever he has
const TR_NEED = {
  killer: [["Vision", 13], ["Passing", 13]], tempo: [["Composure", 14], ["Decisions", 14]], switch: [["Passing", 13], ["Vision", 12]], long: [["Passing", 13]],
  onetwo: [["Passing", 12], ["First Touch", 12]], runs: [["Dribbling", 13]], tricks: [["Flair", 13], ["Technique", 13]], beat: [["Dribbling", 14], ["Agility", 12]],
  knock: [["Acceleration", 14], ["Pace", 14]], offside: [["Off The Ball", 13], ["Acceleration", 13]], btg: [["Strength", 13]], dist: [["Long Shots", 14]],
  power: [["Finishing", 12], ["Long Shots", 12]], place: [["Finishing", 13], ["Composure", 12]], curl: [["Technique", 13]], outside: [["Technique", 14]],
  lrfk: [["Free Kick Taking", 14]], fkpow: [["Free Kick Taking", 13]], dives: [["Tackling", 13]], trouble: [["Composure", 13], ["Passing", 12]],
  bring: [["Dribbling", 11], ["Composure", 12]], lob: [["Finishing", 13], ["Composure", 13]], round: [["Dribbling", 13], ["Composure", 13]], first: [["Finishing", 14]], overhead: [["Flair", 14], ["Agility", 13]], cutB: [["Dribbling", 12]], cutL: [["Dribbling", 12]], cutR: [["Dribbling", 12]], runL: [["Dribbling", 12]], runR: [["Dribbling", 12]], runC: [["Dribbling", 13]],
};
const TR_RISK = {
  weak: "Makes him predictable: defenders show him onto his weaker foot. Train the weaker foot rather than living with it.",
  dist: "Shoots from range instead of working a better chance: only worth it with Long Shots 15+.",
  dives: "Wins the ball but gives away fouls, cards and penalties.",
  runC: "Carrying through the middle runs into traffic and leaves you open to counters if he loses it.",
  trouble: "Dribbling or passing out under pressure loses the ball in dangerous areas if he lacks the composure.",
  tricks: "Tricks without the flair and technique lose the ball.",
  dwell: "Extra touches invite pressure and get him caught on the ball, especially against teams that press or counter.",
  stop: "Slows your counter-attacks down: fine to protect a lead, bad when you need a goal.",
  argue: "Picks up needless yellow cards.", windup: "Can wind himself up too: watch his discipline in big games.",
  lookpass: "In a scoring role he passes up chances he should take.",
};
function traitFit(p, x) { // does he have the attributes this trait needs?
  const need = TR_NEED[x.key]; if (!need || !p || !p.a) return { ok: true, miss: [] };
  const miss = need.filter(([a, m]) => p.a[a] != null && p.a[a] < m).map(([a, m]) => `${a} ${p.a[a]} (needs ${m}+)`);
  return { ok: !miss.length, miss };
}
const TRAIT_BY = Object.fromEntries(TRAITS.map(x => [x.key, x]));
const TR_KNOWN = new Set(TRAITS.map(x => x.t));
// ----- reading -----
function trIdx(p) { // save row of a player object (squad/model player, or a save-built one)
  if (!SAVE || !SAVE.traits || !p) return null;
  if (p._si !== undefined) return p._si;
  let i = null; if (p.uid != null) { const v = saveUidIndex().get(p.uid); if (v != null) i = v; }
  if (i == null) { const m = /^(?:s|te)(\d+)$/.exec(String(p.ix || "")); if (m) i = +m[1]; }
  try { p._si = i; } catch (e) { }
  return i;
}
function traitsOf(i) { // [trait...] known, and how many unnamed ones
  if (i == null || !SAVE || !SAVE.traits) return { list: [], other: 0 };
  const T = SAVE.traits, out = []; let other = 0;
  for (let t = 0; t < 64; t++) if (T[i * 8 + (t >> 3)] >> (t & 7) & 1) { if (TR_KNOWN.has(t)) out.push(TRAITS.find(x => x.t === t)); else other++; }
  return { list: out, other };
}
const trCache = new Map();
function pTraits(p) { const i = trIdx(p); if (i == null) return []; let v = trCache.get(i); if (!v) { v = traitsOf(i).list; trCache.set(i, v); } return v; }
// ----- effect on a role: + when his traits suit it, − when they work against it (on the /20 rating scale) -----
const TR_GOOD = 0.3, TR_BAD = 0.6;
function traitAdj(p, role, code) {
  const L = pTraits(p); if (!L.length) return 0;
  const side = code ? (["DL", "WBL", "ML", "AML"].includes(code) ? "L" : ["DR", "WBR", "MR", "AMR"].includes(code) ? "R" : "C") : null;
  let v = 0;
  L.forEach(x => { if (x.side && side && side !== x.side) return; const fit = traitFit(p, x).ok;
    if (x.good.has(role) && fit) v += TR_GOOD; if (x.bad.has(role)) v -= TR_BAD; if (!fit && x.good.has(role) && TR_RISK[x.key]) v -= 0.15; });
  return Math.max(-1.2, Math.min(0.6, v));
}
function traitNotes(p, role, code) { // which traits help or clash with this role
  const side = code ? (["DL", "WBL", "ML", "AML"].includes(code) ? "L" : ["DR", "WBR", "MR", "AMR"].includes(code) ? "R" : "C") : null, good = [], bad = [];
  pTraits(p).forEach(x => { if (x.side && side && side !== x.side) return; if (x.good.has(role)) good.push(x); if (x.bad.has(role)) bad.push(x); });
  return { good, bad };
}
// the role rating used everywhere: attributes for the role, nudged by his traits
function roleRating(p, g, role, code) { const v = attrRating(p, roleW(g, role)); return v == null ? null : v + traitAdj(p, role, code); }
// ----- profile: his traits, what they mean, and which roles they point to -----
function traitsHtml(p, sc) {
  if (SAVE && !SAVE.traits && p && p.uid && saveUidIndex().has(p.uid)) return `<section class="trsec"><h4>Traits</h4><p class="small muted">Load your save once more to see his traits (this stored copy was read before Scout Lab could read them).</p></section>`;
  const i = trIdx(p); if (i == null) return "";
  const { list, other } = traitsOf(i), pa = p.a ? p : (typeof scP === "function" ? scP(i) : p);
  const role = sc && sc.role !== "Balanced" ? sc.role : null, n = role ? traitNotes(p, role) : null;
  const pref = {}; list.forEach(x => x.good.forEach(r => { pref[r] = (pref[r] || 0) + 1; }));
  const grp = sc && ROLES[sc.pos] ? Object.keys(ROLES[sc.pos]) : null;
  const pts = Object.entries(pref).filter(([r]) => !grp || grp.includes(r)).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  let h = `<section class="trsec"><h4>Traits</h4>`;
  if (!list.length) return h + `<p class="small muted">No traits: he plays each role as instructed.</p></section>`;
  h += `<div class="trlist">${list.map(x => `<span class="trchip ${n && n.bad.includes(x) ? "bad" : n && n.good.includes(x) ? "good" : ""}" data-tip="${esc(x.what)}">${esc(x.name)}</span>`).join("")}</div>
    <ul class="trwhat small">${list.map(x => { const f = traitFit(pa, x), r = TR_RISK[x.key], bad = !f.ok || x.key === "weak";
      return `<li><b>${esc(x.name)}</b>: ${esc(x.what)}${f.ok && TR_NEED[x.key] ? ` <span class="okc">He has the attributes for it.</span>` : ""}${!f.ok ? ` <span class="bad">Doesn't fit his attributes (${esc(f.miss.join(", "))}): it'll hurt more than help. Consider training it off.</span>` : ""}${r && (bad || x.key === "dives" || x.key === "runC" || (x.key === "dist" && !(pa.a && pa.a["Long Shots"] >= 15)) || ["dwell", "stop", "argue", "windup"].includes(x.key) || (x.key === "lookpass" && sc && ["ST"].includes(sc.pos))) ? ` <span class="warnc">Risk: ${esc(r)}</span>` : ""}</li>`; }).join("")}</ul>`;
  const det = pa.a ? pa.a["Determination"] : null;
  if (det != null) h += `<p class="small muted">${det >= 15 ? `Determination ${det}: he'll learn or drop a trait reliably when his coach works on it (Development › Traits).` : det <= 10 ? `Determination ${det}: teaching or removing traits may not stick; don't count on it.` : `Determination ${det}: teaching or removing traits takes time but usually works.`}</p>`;
  if (n && (n.good.length || n.bad.length)) h += `<p class="small">As a <b>${esc(role)}</b>: ${n.good.length ? `<span class="okc">suits him (${esc(n.good.map(x => x.name.toLowerCase()).join(", "))})</span>` : ""}${n.good.length && n.bad.length ? "; " : ""}${n.bad.length ? `<span class="bad">clashes with ${esc(n.bad.map(x => x.name.toLowerCase()).join(", "))}: he'll keep doing it whatever the role asks</span>` : ""}.</p>`;
  if (pts.length) h += `<p class="small muted">His traits point to: <b>${esc(pts.join(", "))}</b>. Role ratings in Scout Lab already add a little for matching traits and take more off for clashing ones.</p>`;
  return h + `</section>`;
}
// ----- positions he can play: best role in each, and open him as that position -----
const TR_GROUP_CODE = { GK: "GK", FB: "DL", CB: "DC", DM: "DM", CM: "MC", AM: "AMC", Wingers: "AML", ST: "ST" };
function posSwitchHtml(p, curPos) {
  if (!SAVE || !p) return "";
  const i = trIdx(p); if (i == null) return "";
  const pc = savePos(), groups = POSITIONS.filter((x, k) => pc.bits[i] & (1 << k)); if (groups.length < 2) return "";
  const a = typeof scP === "function" ? scP(i) : p; const P = { ...a, uid: p.uid, ix: "s" + i, _si: i };
  const rows = groups.map(g => {
    const roles = Object.keys(ROLES[g] || {}).filter(r => r !== "Balanced");
    let best = null; roles.forEach(r => { const v = roleRating(P, g, r, null); if (v != null && (!best || v > best.v)) best = { r, v }; });
    return { g, best };
  }).filter(x => x.best).sort((x, y) => y.best.v - x.best.v);
  if (rows.length < 2) return "";
  return `<section class="possw"><h4>Other positions he can play</h4><p class="small muted">His best role in each (attributes and traits). Open him as one to see his stats ranked against that position.</p>
    <div class="possrows">${rows.map((x, k) => `<div class="possrow ${x.g === curPos ? "cur" : ""}"><span><b>${esc(RV_POS && RV_POS[x.g] ? RV_POS[x.g] : x.g)}</b>${k === 0 ? ` <span class="tag good">best fit</span>` : ""}</span><span class="small">${esc(x.best.r)} <b style="color:${attrColor(x.best.v)}">${x.best.v.toFixed(1)}</b><small class="muted">/20</small></span>${x.g === curPos ? `<span class="small muted">showing</span>` : `<button class="ghost small" data-posas="${x.g}" data-pi="${i}">View as ${esc((RV_POS && RV_POS[x.g] || x.g).toLowerCase())}</button>`}</div>`).join("")}</div></section>`;
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-posas]"); if (!t) return;
  pPush(); adOpen(+t.dataset.pi, t.dataset.posas);
});
// ----- tactic check: does anyone's traits fight his role? -----
function traitClashes(slots) { // slots: [{p, code, role, oop}]
  const out = [];
  slots.forEach(s => { if (!s.p) return;
    const a = traitNotes(s.p, s.role, s.code), b = s.oop ? traitNotes(s.p, s.oop, s.code) : { bad: [], good: [] };
    [...a.bad.map(x => [x, s.role]), ...b.bad.map(x => [x, s.oop])].forEach(([x, r]) => out.push({ p: s.p, x, r, code: s.code })); });
  return out;
}
function traitSlotsHtml(slots) { // suggested tactic: how the XI's traits sit with their roles
  if (!SAVE || !SAVE.traits) return "";
  const S2 = slots.filter(s => s.pick).map(s => ({ p: s.pick.p, code: s.code, role: s.pick.role, oop: s.oop }));
  const bad = traitClashes(S2), good = [];
  S2.forEach(s => { const n = traitNotes(s.p, s.role, s.code); n.good.forEach(x => good.push({ p: s.p, x, r: s.role })); });
  if (!bad.length && !good.length) return "";
  const nm = p => esc(p.name);
  return `<section class="panel"><div class="ph"><h3>Player traits</h3><span class="small muted">what each player does whatever the role asks</span></div>
    ${bad.length ? `<p class="bad small"><b>Clashes</b></p><ul class="why">${bad.map(c => `<li><b>${nm(c.p)}</b> as ${esc(c.r)}: "${esc(c.x.name)}" works against it. ${esc(c.x.what)} Swap his role, or train the trait away with his coach.</li>`).join("")}</ul>` : `<p class="small okc"><b>No clashes:</b> nobody's traits fight his role.</p>`}
    ${good.length ? `<p class="small okc"><b>Traits that suit the role</b></p><ul class="why small">${good.slice(0, 8).map(c => `<li><b>${nm(c.p)}</b> as ${esc(c.r)}: ${esc(c.x.name.toLowerCase())}.</li>`).join("")}</ul>` : ""}
    ${learnBox("Traits (FM's player preferred moves) are habits: a player with <b>Cuts Inside From Left Wing</b> still cuts inside as a touchline Winger. Roles are picked with traits counted in, so clashes here are rare; when one shows, it's usually the only player for that slot.", "sample")}</section>`;
}

