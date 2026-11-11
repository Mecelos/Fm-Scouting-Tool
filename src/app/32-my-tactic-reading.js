// ---------- My squad › My tactic: read an FM27 tactic file (.fmf / .tac) and break it down ----------
// File layout (FM27): "\x02\x01afe." archive -> zstd directory -> each resource = [u32 16][u32 16][AES-128 key][CTR IV][ciphertext]
// -> AES-CTR decrypt -> zstd -> "\x03\x01cat." tactic. Settings bytes and role bit values follow the FM27 export format.
const TAC_PRESETS = {"Tiki-Taka":{"m":"Positive","ip":"4-2-3-1 DM AM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"Much Shorter","tempo":"Much Lower","attacking-width":"Standard","creative-freedom":"Balanced","time-wasting":"Less Often","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Play Through Press","progress-through":"Balanced","pass-reception":"Pass To Feet","supporting-runs":"Balanced","patience":"Work Ball Into Box","dribbling":"Discourage","shots-from-distance":"Discourage","crossing-style":"Low Crosses","attacking-transition":"Hold Shape","defensive-transition":"Counter-Press","goal-kicks":"Short","gk-distribution":"Centre-Backs","gk-distribution-speed":"Distribute Quickly","line-of-engagement":"High Press","defensive-line":"Higher","defensive-line-behaviour":"Balanced","trigger-press":"More Often","tackling":"Standard","pressing-trap":"Balanced","prevent-short-gk-distribution":"Yes","cross-engagement":"Balanced"}},"Catenaccio":{"m":"Defensive","ip":"5-2-1-2 DM AM","oop":"5-2-1-2 DM AM","s":{"passing-directness":"More Direct","tempo":"Lower","attacking-width":"Much Narrower","creative-freedom":"More Disciplined","time-wasting":"More Often","play-for-set-pieces":"Play For Set Pieces","build-up-strategy":"Bypass Press","progress-through":"Balanced","pass-reception":"Balanced","supporting-runs":"Balanced","patience":"Standard","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Counter-Attack","defensive-transition":"Regroup","goal-kicks":"Mixed","gk-distribution":"Balanced","gk-distribution-speed":"Slow Pace Down","line-of-engagement":"Low Block","defensive-line":"Lower","defensive-line-behaviour":"Drop Off More","trigger-press":"Less Often","tackling":"Stay On Feet","pressing-trap":"Balanced","prevent-short-gk-distribution":"No","cross-engagement":"Balanced"}},"Control Possession":{"m":"Positive","ip":"4-3-3 DM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"Shorter","tempo":"Lower","attacking-width":"Standard","creative-freedom":"Balanced","time-wasting":"Less Often","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Play Through Press","progress-through":"Balanced","pass-reception":"Balanced","supporting-runs":"Balanced","patience":"Work Ball Into Box","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Standard","defensive-transition":"Counter-Press","goal-kicks":"Short","gk-distribution":"Centre-Backs","gk-distribution-speed":"Balanced","line-of-engagement":"High Press","defensive-line":"Higher","defensive-line-behaviour":"Balanced","trigger-press":"More Often","tackling":"Standard","pressing-trap":"Balanced","prevent-short-gk-distribution":"Yes","cross-engagement":"Balanced"}},"Direct Counter-Attack":{"m":"Cautious","ip":"4-2-2-2 DM","oop":"4-2-2-2 DM","s":{"passing-directness":"More Direct","tempo":"Higher","attacking-width":"Standard","creative-freedom":"Balanced","time-wasting":"Standard","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Bypass Press","progress-through":"Balanced","pass-reception":"Pass Into Space","supporting-runs":"Balanced","patience":"Standard","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Counter-Attack","defensive-transition":"Standard","goal-kicks":"Mixed","gk-distribution":"Balanced","gk-distribution-speed":"Distribute Quickly","line-of-engagement":"Low Block","defensive-line":"Lower","defensive-line-behaviour":"Drop Off More","trigger-press":"More Often","tackling":"Get Stuck In","pressing-trap":"Balanced","prevent-short-gk-distribution":"No","cross-engagement":"Balanced"}},"Fluid Counter-Attack":{"m":"Cautious","ip":"4-3-3 DM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"Shorter","tempo":"Higher","attacking-width":"Standard","creative-freedom":"Balanced","time-wasting":"Standard","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Balanced","progress-through":"Balanced","pass-reception":"Pass Into Space","supporting-runs":"Balanced","patience":"Standard","dribbling":"Encourage","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Counter-Attack","defensive-transition":"Counter-Press","goal-kicks":"Mixed","gk-distribution":"Balanced","gk-distribution-speed":"Distribute Quickly","line-of-engagement":"Mid Block","defensive-line":"Lower","defensive-line-behaviour":"Drop Off More","trigger-press":"More Often","tackling":"Get Stuck In","pressing-trap":"Balanced","prevent-short-gk-distribution":"No","cross-engagement":"Balanced"}},"Gegenpress":{"m":"Balanced","ip":"4-3-3 DM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"Standard","tempo":"Much Higher","attacking-width":"Narrower","creative-freedom":"Balanced","time-wasting":"Less Often","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Play Through Press","progress-through":"Balanced","pass-reception":"Balanced","supporting-runs":"Balanced","patience":"Standard","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Counter-Attack","defensive-transition":"Counter-Press","goal-kicks":"Mixed","gk-distribution":"Centre-Backs","gk-distribution-speed":"Balanced","line-of-engagement":"High Press","defensive-line":"Higher","defensive-line-behaviour":"Step Up More","trigger-press":"Much More Often","tackling":"Standard","pressing-trap":"Balanced","prevent-short-gk-distribution":"Yes","cross-engagement":"Balanced"}},"Park The Bus":{"m":"Defensive","ip":"4-2-2-2 DM","oop":"4-2-2-2 DM","s":{"passing-directness":"More Direct","tempo":"Lower","attacking-width":"Narrower","creative-freedom":"More Disciplined","time-wasting":"More Often","play-for-set-pieces":"Play For Set Pieces","build-up-strategy":"Bypass Press","progress-through":"Balanced","pass-reception":"Pass Into Space","supporting-runs":"Balanced","patience":"Hit Early Crosses","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Standard","defensive-transition":"Regroup","goal-kicks":"Long","gk-distribution":"Balanced","gk-distribution-speed":"Slow Pace Down","line-of-engagement":"Low Block","defensive-line":"Lower","defensive-line-behaviour":"Drop Off More","trigger-press":"Less Often","tackling":"Get Stuck In","pressing-trap":"Trap Outside","prevent-short-gk-distribution":"No","cross-engagement":"Balanced"}},"Route One":{"m":"Balanced","ip":"4-3-3 DM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"Much More Direct","tempo":"Higher","attacking-width":"Standard","creative-freedom":"More Disciplined","time-wasting":"Standard","play-for-set-pieces":"Play For Set Pieces","build-up-strategy":"Bypass Press","progress-through":"Balanced","pass-reception":"Balanced","supporting-runs":"Balanced","patience":"Hit Early Crosses","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Counter-Attack","defensive-transition":"Regroup","goal-kicks":"Long","gk-distribution":"Balanced","gk-distribution-speed":"Balanced","line-of-engagement":"Mid Block","defensive-line":"Lower","defensive-line-behaviour":"Balanced","trigger-press":"Standard","tackling":"Get Stuck In","pressing-trap":"Trap Outside","prevent-short-gk-distribution":"No","cross-engagement":"Balanced"}},"Vertical Tiki-Taka":{"m":"Balanced","ip":"4-3-3 DM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"Shorter","tempo":"Lower","attacking-width":"Much Narrower","creative-freedom":"More Expressive","time-wasting":"Less Often","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Play Through Press","progress-through":"Middle","pass-reception":"Balanced","supporting-runs":"Both Flanks","patience":"Work Ball Into Box","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Low Crosses","attacking-transition":"Counter-Attack","defensive-transition":"Counter-Press","goal-kicks":"Short","gk-distribution":"Centre-Backs","gk-distribution-speed":"Balanced","line-of-engagement":"High Press","defensive-line":"Higher","defensive-line-behaviour":"Balanced","trigger-press":"More Often","tackling":"Standard","pressing-trap":"Balanced","prevent-short-gk-distribution":"Yes","cross-engagement":"Balanced"}},"Wing Play":{"m":"Balanced","ip":"4-3-3 DM Wide","oop":"4-3-3 DM Wide","s":{"passing-directness":"More Direct","tempo":"Higher","attacking-width":"Much Wider","creative-freedom":"Balanced","time-wasting":"Standard","play-for-set-pieces":"Keep Ball in Play","build-up-strategy":"Balanced","progress-through":"Both Flanks","pass-reception":"Balanced","supporting-runs":"Balanced","patience":"Standard","dribbling":"Balanced","shots-from-distance":"Balanced","crossing-style":"Balanced","attacking-transition":"Counter-Attack","defensive-transition":"Standard","goal-kicks":"Mixed","gk-distribution":"Full-Backs","gk-distribution-speed":"Balanced","line-of-engagement":"Mid Block","defensive-line":"Standard","defensive-line-behaviour":"Balanced","trigger-press":"More Often","tackling":"Standard","pressing-trap":"Trap Outside","prevent-short-gk-distribution":"No","cross-engagement":"Balanced"}}};
// [id, label, section, options in FM order, neutral option]
const TI_DEF = [
  ["passing-directness", "Passing directness", "ip", ["Much Shorter", "Shorter", "Standard", "More Direct", "Much More Direct"], "Standard"],
  ["tempo", "Tempo", "ip", ["Much Lower", "Lower", "Standard", "Higher", "Much Higher"], "Standard"],
  ["attacking-width", "Attacking width", "ip", ["Much Narrower", "Narrower", "Standard", "Wider", "Much Wider"], "Standard"],
  ["creative-freedom", "Creative freedom", "ip", ["More Disciplined", "Balanced", "More Expressive"], "Balanced"],
  ["build-up-strategy", "Build-up strategy", "ip", ["Play Through Press", "Balanced", "Bypass Press"], "Balanced"],
  ["progress-through", "Progress through", "ip", ["Balanced", "Left", "Middle", "Right", "Both Flanks"], "Balanced"],
  ["pass-reception", "Pass reception", "ip", ["Pass To Feet", "Balanced", "Pass Into Space"], "Balanced"],
  ["supporting-runs", "Supporting runs", "ip", ["Balanced", "Left", "Right", "Both Flanks"], "Balanced"],
  ["patience", "Final third", "ip", ["Work Ball Into Box", "Standard", "Hit Early Crosses"], "Standard"],
  ["crossing-style", "Crossing style", "ip", ["Balanced", "Floated Crosses", "Whipped Crosses", "Low Crosses"], "Balanced"],
  ["dribbling", "Dribbling", "ip", ["Discourage", "Balanced", "Encourage"], "Balanced"],
  ["shots-from-distance", "Shots from distance", "ip", ["Discourage", "Balanced", "Encourage"], "Balanced"],
  ["time-wasting", "Time wasting", "ip", ["Less Often", "Standard", "More Often"], "Standard"],
  ["play-for-set-pieces", "Set pieces", "ip", ["Keep Ball in Play", "Play For Set Pieces"], "Keep Ball in Play"],
  ["attacking-transition", "When the ball is won", "tr", ["Hold Shape", "Standard", "Counter-Attack"], "Standard"],
  ["defensive-transition", "When the ball is lost", "tr", ["Regroup", "Standard", "Counter-Press"], "Standard"],
  ["goal-kicks", "Goal kicks", "tr", ["Short", "Mixed", "Long"], "Mixed"],
  ["gk-distribution", "GK distribution to", "tr", ["Balanced", "Centre-Backs", "Full-Backs", "Flanks", "Playmaker", "Target Forward"], "Balanced"],
  ["gk-distribution-speed", "GK distribution speed", "tr", ["Slow Pace Down", "Balanced", "Distribute Quickly"], "Balanced"],
  ["line-of-engagement", "Line of engagement", "oop", ["Low Block", "Mid Block", "High Press"], "Mid Block"],
  ["defensive-line", "Defensive line", "oop", ["Much Lower", "Lower", "Standard", "Higher", "Much Higher"], "Standard"],
  ["defensive-line-behaviour", "Line behaviour", "oop", ["Drop Off More", "Balanced", "Step Up More"], "Balanced"],
  ["trigger-press", "Trigger press", "oop", ["Much Less Often", "Less Often", "Standard", "More Often", "Much More Often"], "Standard"],
  ["tackling", "Tackling", "oop", ["Stay On Feet", "Standard", "Get Stuck In"], "Standard"],
  ["pressing-trap", "Pressing trap", "oop", ["Trap Inside", "Balanced", "Trap Outside"], "Balanced"],
  ["prevent-short-gk-distribution", "Press the keeper's short pass", "oop", ["No", "Yes"], "No"],
  ["cross-engagement", "Cross engagement", "oop", ["Stop Crosses", "Balanced", "Invite Crosses"], "Balanced"],
];
const TI_BY = Object.fromEntries(TI_DEF.map(d => [d[0], d]));
const MENTALITIES = ["Very Defensive", "Defensive", "Cautious", "Balanced", "Positive", "Attacking", "Very Attacking"];
// step from neutral: e.g. passing Much Shorter = -2, Much More Direct = +2
function tiLv(T, id) { const d = TI_BY[id], v = T[id]; if (!d || v == null) return 0; const i = d[3].indexOf(v), n = d[3].indexOf(d[4]); return i < 0 ? 0 : i - n; }

// ----- file reading -----
const TAC_U32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
const TAC_U64 = (b, o) => TAC_U32(b, o) + TAC_U32(b, o + 4) * 4294967296;
const TAC_BIG = (b, o) => BigInt(TAC_U32(b, o)) | (BigInt(TAC_U32(b, o + 4)) << 32n);
const tacStarts = (b, o, s) => s.every((c, i) => b[o + i] === (typeof c === "number" ? c : c.charCodeAt(0)));
async function aesCtr(key, iv, data) {
  const c = globalThis.crypto && crypto.subtle;
  if (!c) throw new Error("This browser cannot unlock FM27 tactic files (no Web Crypto). Try Chrome, Edge, Safari or Firefox.");
  const k = await c.importKey("raw", key, { name: "AES-CTR" }, false, ["decrypt"]);
  return new Uint8Array(await c.decrypt({ name: "AES-CTR", counter: iv, length: 128 }, k, data));
}
async function readTacticFile(buf) {
  const b = new Uint8Array(buf);
  if (tacStarts(b, 0, [3, 1, "c", "a", "t", "."])) return decodeTac(b);
  if (tacStarts(b, 0, [2, 1, "f", "m", "f", "."])) throw new Error("This looks like an FM26 (or older) tactic file. Scout Lab reads FM27 tactic files: in FM27 open Tactics › Manage tactics › Export, then load that .fmf here.");
  if (!tacStarts(b, 0, [2, 1, "a", "f", "e", "."])) throw new Error("This isn't an FM tactic file. In FM27 export it from Tactics › Manage tactics › Export (it ends in .fmf).");
  const dirAt = 9 + TAC_U64(b, 9);
  if (!(dirAt > 26 && dirAt < b.length - 9) || !tacStarts(b, dirAt, [2, 1, "f", "m", "f", "."])) throw new Error("The tactic file's index is missing or damaged. Export it again from FM27.");
  const dir = fzstd.decompress(b.subarray(dirAt + 9));
  let o = 0; const str = () => { const n = TAC_U32(dir, o); if (n > 4096 || o + 4 + n > dir.length) throw new Error("bad index"); const s = new TextDecoder().decode(dir.subarray(o + 4, o + 4 + n)); o += 4 + n; return s; };
  const files = [];
  const walk = () => {
    const nf = TAC_U32(dir, o); o += 4; if (nf > 1000) throw new Error("bad index");
    for (let i = 0; i < nf; i++) { const base = str(), ext = str(); const off = TAC_U64(dir, o), stored = TAC_U64(dir, o + 8), raw = TAC_U64(dir, o + 16); o += 40; files.push({ base, ext, off, stored, raw }); }
    const nd = TAC_U32(dir, o); o += 4; if (nd > 1000) throw new Error("bad index");
    for (let i = 0; i < nd; i++) { str(); walk(); }
  };
  str(); walk();
  const f = files.find(x => x.ext.toLowerCase() === ".tac");
  if (!f) throw new Error("There's no tactic inside this file.");
  const at = 26 + f.off, kl = TAC_U32(b, at), il = TAC_U32(b, at + 4);
  if (kl !== 16 || il !== 16) throw new Error("This tactic file uses a format Scout Lab doesn't know yet.");
  const ct = b.subarray(at + 8 + kl + il, at + f.stored);
  const plain = await aesCtr(b.slice(at + 8, at + 8 + kl), b.slice(at + 8 + kl, at + 8 + kl + il), ct);
  const tac = fzstd.decompress(plain, new Uint8Array(f.raw));
  return decodeTac(tac);
}
// team-instruction bits inside the 17 settings bytes after the name
function decodeTi(s) {
  const pick = (map, v) => map[v] ?? null;
  const pa = s[6], at = s[7], tr = s[8], mv = s[9], gk = s[10], gkk = s[11], ins = s[12], ln = s[13], pr = s[14], bh = s[15], tp = s[16];
  return {
    "passing-directness": pick({ 0x10: "Much Shorter", 0x08: "Shorter", 0: "Standard", 0x04: "More Direct", 0x02: "Much More Direct" }, pa & 0x1e),
    "tempo": pick({ 0x200: "Much Lower", 0x100: "Lower", 0: "Standard", 0x80: "Higher", 0x40: "Much Higher" }, (gkk & 0xc0) | ((ins & 3) << 8)),
    "attacking-width": (ins & 0xfc) === 0x50 ? "Narrower" : pick({ 0x20: "Much Narrower", 0x80: "Narrower", 0: "Standard", 0x08: "Wider", 0x04: "Much Wider" }, ins & 0xac),
    "creative-freedom": pick({ 0x40: "More Expressive", 0: "Balanced", 0x10: "More Disciplined", 0x50: "Balanced" }, ins & 0x50),
    "build-up-strategy": pick({ 0: "Balanced", 0x100: "Bypass Press", 0x80: "Play Through Press" }, (pa & 0x80) | ((at & 1) << 8)),
    "progress-through": pick({ 0: "Balanced", 0x100: "Both Flanks", 0x20: "Left", 0x80: "Middle", 0x40: "Right" }, (tr & 0xe0) | ((mv & 1) << 8)),
    "pass-reception": pick({ 0: "Balanced", 0x20: "Pass Into Space", 0x40: "Pass To Feet" }, pa & 0x60),
    "supporting-runs": pick({ 0: "Balanced", 0x10: "Both Flanks", 0x20: "Left", 0x40: "Right" }, mv & 0x70),
    "patience": pick({ 0: "Standard", 0x200: "Hit Early Crosses", 0x2: "Work Ball Into Box" }, ((at & 2) << 8) | (tr & 2)),
    "crossing-style": pick({ 0: "Balanced", 0x04: "Floated Crosses", 0x10: "Low Crosses", 0x08: "Whipped Crosses" }, at & 0x1c),
    "dribbling": pick({ 0: "Balanced", 0x40: "Discourage", 0x20: "Encourage" }, at & 0x60),
    "shots-from-distance": pick({ 0: "Balanced", 0x100: "Discourage", 0x80: "Encourage" }, (at & 0x80) | ((tr & 1) << 8)),
    "time-wasting": pick({ 0x80: "Less Often", 0: "Standard", 0x40: "More Often" }, bh & 0xc0),
    "play-for-set-pieces": (tr & 4) ? "Play For Set Pieces" : "Keep Ball in Play",
    "attacking-transition": tr === 1 ? "Counter-Attack" : pick({ 0x08: "Counter-Attack", 0: "Standard", 0x10: "Hold Shape" }, tr & 0x18),
    "defensive-transition": pick({ 0x40: "Counter-Press", 0: "Standard", 0x80: "Regroup" }, pr & 0xc0),
    "goal-kicks": pick({ 0: "Mixed", 0x10: "Short", 0x20: "Long" }, gkk & 0x30),
    "gk-distribution": pick({ 0: "Balanced", 0x08: "Centre-Backs", 0x10: "Full-Backs", 0x20: "Flanks", 0x80: "Playmaker", 0x100: "Target Forward" }, (gk & 0xb8) | ((gkk & 1) << 8)),
    "gk-distribution-speed": pick({ 0: "Balanced", 0x04: "Distribute Quickly", 0x08: "Slow Pace Down" }, gkk & 0x0c),
    "line-of-engagement": pick({ 0x20: "High Press", 0x40: "Mid Block", 0x80: "Low Block" }, ln & 0xe0),
    "defensive-line": pick({ 0x01: "Much Higher", 0x02: "Higher", 0: "Standard", 0x04: "Lower", 0x08: "Much Lower" }, ln & 0x0f),
    "defensive-line-behaviour": pick({ 0: "Balanced", 0x20: "Drop Off More", 0x10: "Step Up More" }, bh & 0x30),
    "trigger-press": pick({ 0x10: "Much Less Often", 0x08: "Less Often", 0: "Standard", 0x04: "More Often", 0x02: "Much More Often" }, pr & 0x1e),
    "tackling": pick({ 0x01: "Get Stuck In", 0: "Standard", 0x02: "Stay On Feet" }, bh & 0x03),
    "pressing-trap": pick({ 0: "Balanced", 0x01: "Trap Inside", 0x02: "Trap Outside" }, tp & 0x03),
    "prevent-short-gk-distribution": (pr & 0x20) ? "Yes" : "No",
    "cross-engagement": pick({ 0: "Balanced", 0x08: "Invite Crosses", 0x04: "Stop Crosses" }, tp & 0x0c),
  };
}
// role bit values -> FM27 role names (names used in the rest of Scout Lab); "?" = name not confirmed for FM27
const B = n => 2n ** BigInt(n);
const IP_BITS = new Map([
  [1n, "Goalkeeper"], [B(12), "Ball-Playing GK"], [B(53), "No-Nonsense GK"],
  [B(1), "Centre-Back"], [B(24), "Ball-Playing CB"], [B(29), "No-Nonsense CB"], [B(51), "Wide CB"], [B(54), "Overlapping CB"], [B(14), "Advanced CB?"],
  [B(2), "Full-Back"], [B(3), "Wing-Back"], [B(36), "Inside Full-Back?"], [B(38), "Advanced Wing-Back"], [B(44), "Inverted Wing-Back?"], [B(52), "Inverted Full-Back?"], [B(55), "Playmaking Wing-Back"],
  [B(4), "Defensive Midfielder"], [B(15), "Deep-Lying Playmaker"], [B(16), "Box-to-Box Midfielder"], [B(35), "Half-Back"], [B(46), "Box-to-Box Playmaker"],
  [B(28), "Defensive Midfielder?"], [B(33), "Defensive Midfielder?"], [B(39), "Deep-Lying Playmaker?"], [B(50), "Box-to-Box Midfielder?"],
  [B(5), "Central Midfielder"], [B(57), "Midfield Playmaker"], [B(56), "Channel Midfielder"], [B(48), "Wide Central Midfielder"], [B(47), "Channel Midfielder?"],
  [B(9), "Attacking Midfielder"], [B(17), "Advanced Playmaker"], [B(32), "Free Role?"], [B(37), "Advanced Playmaker?"], [B(41), "Second Striker?"],
  [B(6), "Wide Midfielder"], [B(7), "Winger"], [B(27), "Inside Forward"], [B(45), "Wide Forward"], [B(49), "Inside Winger?"], [B(43), "Playmaking Winger?"], [B(30), "Wide Midfielder?"], [B(42), "Half-Space Winger?"],
  [B(10), "Deep-Lying Forward"], [B(11), "Centre Forward"], [B(18), "Target Forward"], [B(19), "Poacher"], [B(20), "Centre Forward?"], [B(31), "Channel Forward"], [B(40), "False Nine"],
]);
const OOP_NAMES = ["Goalkeeper", "Sweeper Keeper", "Line-Holding Keeper", "Centre-Back", "Stopping CB", "Covering CB", "Wide CB", "Stopping Wide CB", "Covering Wide CB", "Full-Back", "Pressing Full-Back", "Holding Full-Back",
  "Wing-Back", "Pressing Wing-Back", "Holding Wing-Back", "Defensive Midfielder", "Dropping DM", "Pressing DM", "Screening DM", "Wide Covering DM", "Central Midfielder"];
const OOP_BITS = new Map(OOP_NAMES.map((n, i) => [B(i), n]));
[[27, "Pressing CM"], [28, "Screening CM"], [29, "Wide Covering CM"], [30, "Attacking Midfielder"], [31, "Tracking AM"], [32, "Central Outlet AM"], [33, "Splitting Outlet AM"], [35, "Wide Midfielder"], [36, "Tracking Wide Midfielder"], [37, "Wide Outlet Midfielder"],
  [38, "Winger"], [39, "Tracking Winger"], [40, "Inverting Outlet Winger"], [41, "Wide Outlet Winger"], [42, "Centre Forward"], [43, "Tracking CF"], [44, "Central Outlet CF"], [45, "Splitting Outlet CF"]].forEach(([b, n]) => OOP_BITS.set(B(b), n));
const DUTY_MASK = B(21) | B(22) | B(23) | B(25) | B(26) | B(34);
const POS_BITS = { 1: "GK", 2: "DC", 4: "DR", 8: "DL", 0x10: "DC", 0x20: "WBR", 0x40: "WBL", 0x80: "DM", 0x100: "MR", 0x200: "ML", 0x400: "MC", 0x800: "AMR", 0x1000: "AML", 0x2000: "AMC", 0x4000: "ST", 0x8000: "ST", 0x10000: "ST" };
function decodeTac(b) {
  if (!tacStarts(b, 0, [3, 1, "c", "a", "t", "."])) throw new Error("This isn't an FM27 tactic.");
  const nl = TAC_U32(b, 16); if (!nl || nl > 1024) throw new Error("The tactic name is damaged.");
  const name = new TextDecoder().decode(b.subarray(20, 20 + nl)).trim();
  const so = 20 + nl + 12, set = b.subarray(so, so + 17);
  const mentality = MENTALITIES[set[2] - 1] || "Balanced";
  let first = -1; for (let i = so; i < b.length - 3; i++) if (b[i] === 0x44 && b[i + 1] === 0 && b[i + 2] === 2) { first = i; break; }
  if (first < 0) throw new Error("No player roles found in this tactic.");
  // the tactical style ("Tiki-Taka", "Custom Gegenpress"…) is the last readable string before the roles
  let style = null;
  for (let o = so; o < first - 5; o++) { const n = TAC_U32(b, o); if (n > 0 && n < 64 && o + 4 + n <= first) { const s = b.subarray(o + 4, o + 4 + n); if (s.every(c => c >= 0x20 && c < 0x7f)) { const t = new TextDecoder().decode(s).trim(); if (t !== name && /[A-Za-z]{3}/.test(t)) style = t; } } }
  const recs = []; let o = first;
  while (b[o] === 0x44 && b[o + 1] === 0 && b[o + 2] === 2 && recs.length < 40) {
    const mask = TAC_U32(b, o + 3), nOpt = TAC_U32(b, o + 10); if (nOpt > 128) break;
    const opts = []; for (let k = 0; k < nOpt; k++) opts.push(TAC_BIG(b, o + 14 + 24 * k));
    const selAt = o + 14 + 24 * nOpt; if (selAt + 12 > b.length) break;
    recs.push({ mask, sel: TAC_BIG(b, selAt + 4), opts });
    o = selAt + 12; if (!(b[o] === 0x44 && b[o + 1] === 0) && b[o + 1] === 0x44) o++;
  }
  if (recs.length < 22) throw new Error("This tactic's player roles are incomplete.");
  const posOf = m => { const base = m & 0x1ffff, side = m & 0x100000 ? "L" : m & 0x200000 ? "R" : base === 0x8000 ? "R" : base === 0x10000 ? "L" : "C"; return { code: POS_BITS[base] || "MC", side }; };
  const roleOf = (map, v) => { const r = map.get(v & ~DUTY_MASK); return r || null; };
  const slots = [];
  for (let i = 0; i + 1 < recs.length && slots.length < 11; i += 2) {
    const a = recs[i], z = recs[i + 1], pa = posOf(a.mask), pz = posOf(z.mask);
    const ipR = roleOf(IP_BITS, a.sel), opR = roleOf(OOP_BITS, z.sel);
    slots.push({
      ip: { ...pa, role: (ipR || "Balanced").replace("?", ""), guess: !ipR || ipR.endsWith("?"), opts: [...new Set(a.opts.map(v => roleOf(IP_BITS, v)).filter(Boolean).map(r => r.replace("?", "")))] },
      oop: { ...pz, role: opR || "Balanced", guess: !opR, opts: [...new Set(z.opts.map(v => roleOf(OOP_BITS, v)).filter(Boolean))] },
    });
  }
  return { name, style: style || "Custom", mentality, ti: decodeTi(set), slots, read: new Date().toISOString().slice(0, 10) };
}

// ----- shape helpers -----
const TAC_ROW = { GK: 0, DL: 1, DC: 1, DR: 1, WCB: 1, WBL: 2, WBR: 2, DM: 3, ML: 4, MC: 4, MR: 4, AML: 5, AMC: 5, AMR: 5, ST: 6 };
const TAC_FLANK = { DL: "L", WBL: "L", ML: "L", AML: "L", DR: "R", WBR: "R", MR: "R", AMR: "R" };
function tacPlace(list) { // list of {code, side}: adds x (0..100, left to right) and y
  const groups = {};
  list.forEach((p, i) => { const k = p.code; (groups[k] = groups[k] || []).push(i); });
  const xs = list.map(() => 50);
  Object.entries(groups).forEach(([code, ix]) => {
    if (CODE_X[code] != null) { ix.forEach(i => xs[i] = CODE_X[code]); return; }
    const ord = ix.slice().sort((a, b) => "LCR".indexOf(list[a].side) - "LCR".indexOf(list[b].side));
    const n = ord.length, span = code === "ST" ? 24 : n >= 3 ? 40 : 26;
    ord.forEach((i, k) => xs[i] = n === 1 ? 50 : 50 - span / 2 + span * k / (n - 1));
  });
  return list.map((p, i) => ({ ...p, x: xs[i], y: CODE_Y[p.code] ?? 50 }));
}
function tacShape(list) {
  const n = r => list.filter(p => p.code !== "GK" && TAC_ROW[p.code] === r).length;
  const d = n(1) + n(2), rows = [d, n(3), n(4), n(5), n(6)].filter(x => x);
  const wide = list.filter(p => ["AML", "AMR", "ML", "MR", "WBL", "WBR"].includes(p.code)).length;
  return rows.join("-") + (n(3) ? " DM" : "") + (list.some(p => p.code === "AMC") ? " AM" : "") + (wide >= 2 ? " Wide" : " Narrow");
}
// FM27 role families used by the rules
const R_WIDE = new Set(["Full-Back", "Wing-Back", "Advanced Wing-Back", "Winger", "Wide Midfielder", "Wide Forward", "Overlapping CB"]);
const R_INSIDE = new Set(["Inside Full-Back", "Inverted Full-Back", "Inside Wing-Back", "Inverted Wing-Back", "Playmaking Wing-Back", "Inside Winger", "Inside Forward", "Half-Space Winger", "Playmaking Winger"]);
const R_PM = new Set(["Deep-Lying Playmaker", "Box-to-Box Playmaker", "Midfield Playmaker", "Advanced Playmaker", "Playmaking Wing-Back", "Playmaking Winger", "Free Role"]);
const R_RUN = new Set(["Channel Forward", "Poacher", "Centre Forward", "Inside Forward", "Wide Forward", "Second Striker", "Attacking Midfielder", "Channel Midfielder", "Free Role", "Advanced Wing-Back"]);
const R_LINK = new Set(["Deep-Lying Forward", "False Nine", "Target Forward"]);
const R_FWD = new Set(["Wing-Back", "Advanced Wing-Back", "Overlapping CB", "Box-to-Box Midfielder", "Box-to-Box Playmaker", "Inside Wing-Back", "Advanced CB"]);
const R_REST = new Set(["Centre-Back", "Ball-Playing CB", "No-Nonsense CB", "Wide CB", "Defensive Midfielder", "Half-Back", "Deep-Lying Playmaker", "Inside Full-Back", "Inverted Full-Back", "Full-Back", "Central Midfielder"]);
const O_OUT = new Set(["Central Outlet AM", "Splitting Outlet AM", "Wide Outlet Midfielder", "Inverting Outlet Winger", "Wide Outlet Winger", "Central Outlet CF", "Splitting Outlet CF"]);
const O_PRESS = new Set(["Pressing Full-Back", "Pressing Wing-Back", "Pressing DM", "Pressing CM"]);
const O_TRACK = new Set(["Tracking AM", "Tracking Wide Midfielder", "Tracking Winger", "Tracking CF"]);
const O_HOLD = new Set(["Holding Full-Back", "Holding Wing-Back", "Screening DM", "Screening CM", "Dropping DM", "Wide Covering DM", "Wide Covering CM", "Covering CB", "Covering Wide CB"]);
// key attributes for each out-of-possession role (FM26/27 roles reference); base roles use their position's defending set
const OOP_KEYS = {
  "Goalkeeper": ["Positioning", "Concentration", "Command Of Area"], "Sweeper Keeper": ["Rushing Out (Tendency)", "Anticipation", "Decisions", "Acceleration"], "Line-Holding Keeper": ["Positioning", "Concentration"],
  "Centre-Back": ["Marking", "Tackling", "Positioning", "Heading"], "Stopping CB": ["Aggression", "Tackling", "Strength", "Bravery"], "Covering CB": ["Anticipation", "Pace", "Marking", "Concentration"],
  "Wide CB": ["Marking", "Tackling", "Positioning", "Pace"], "Stopping Wide CB": ["Aggression", "Tackling", "Strength"], "Covering Wide CB": ["Anticipation", "Pace", "Marking"],
  "Full-Back": ["Marking", "Tackling", "Positioning", "Concentration"], "Pressing Full-Back": ["Work Rate", "Anticipation", "Aggression", "Stamina"], "Holding Full-Back": ["Concentration", "Positioning", "Marking"],
  "Wing-Back": ["Work Rate", "Stamina", "Tackling", "Positioning"], "Pressing Wing-Back": ["Work Rate", "Anticipation", "Aggression", "Stamina"], "Holding Wing-Back": ["Concentration", "Positioning", "Marking"],
  "Defensive Midfielder": ["Tackling", "Positioning", "Anticipation", "Teamwork"], "Pressing DM": ["Anticipation", "Work Rate", "Aggression", "Stamina"], "Dropping DM": ["Positioning", "Anticipation", "Decisions"],
  "Screening DM": ["Concentration", "Positioning", "Marking"], "Wide Covering DM": ["Work Rate", "Anticipation", "Pace"],
  "Central Midfielder": ["Tackling", "Work Rate", "Teamwork", "Positioning"], "Pressing CM": ["Anticipation", "Work Rate", "Aggression", "Stamina"], "Screening CM": ["Concentration", "Positioning", "Marking"], "Wide Covering CM": ["Work Rate", "Anticipation", "Pace"],
  "Attacking Midfielder": ["Work Rate", "Teamwork", "Anticipation"], "Tracking AM": ["Stamina", "Work Rate", "Marking"], "Central Outlet AM": ["Anticipation", "Off The Ball", "Decisions"], "Splitting Outlet AM": ["Anticipation", "Off The Ball", "Pace"],
  "Wide Midfielder": ["Work Rate", "Stamina", "Teamwork"], "Tracking Wide Midfielder": ["Stamina", "Work Rate", "Marking"], "Wide Outlet Midfielder": ["Anticipation", "Off The Ball", "Pace"],
  "Winger": ["Work Rate", "Stamina", "Teamwork"], "Tracking Winger": ["Stamina", "Work Rate", "Marking"], "Wide Outlet Winger": ["Off The Ball", "Pace", "Anticipation"], "Inverting Outlet Winger": ["Anticipation", "Off The Ball", "Decisions"],
  "Centre Forward": ["Work Rate", "Anticipation", "Off The Ball"], "Tracking CF": ["Work Rate", "Stamina", "Marking"], "Central Outlet CF": ["Anticipation", "Off The Ball", "Decisions", "Strength"], "Splitting Outlet CF": ["Anticipation", "Off The Ball", "Pace"],
};
const OOP_ABBR = { "Line-Holding Keeper": "LHK", "Sweeper Keeper": "SK", "Inverting Outlet Winger": "IOW", "Wide Outlet Winger": "WOW", "Central Outlet CF": "COCF", "Splitting Outlet CF": "SOCF", "Tracking CF": "TCF", "Pressing CM": "PCM", "Screening CM": "SCM",
  "Tracking Winger": "TW", "Tracking AM": "TAM", "Central Outlet AM": "COAM", "Splitting Outlet AM": "SOAM", "Holding Full-Back": "HFB", "Pressing Full-Back": "PFB", "Covering CB": "CCB", "Stopping CB": "SCB", "Pressing DM": "PDM", "Screening DM": "SDM", "Dropping DM": "DDM" };
const tacAbbr = r => ROLE_ABBR[r] || OOP_ABBR[r] || r.split(/[\s-]+/).map(w => w[0]).join("").toUpperCase();

// ----- the working tactic: file + the user's edits -----
const TAC_KEY = "scoutlab-tactic";
function tacLoadStore() { try { const v = JSON.parse(localStorage.getItem(TAC_KEY) || "null"); if (v && v.file && v.file.slots) S.myTac = v; } catch (e) { } }
function tacSave(fromCloud) { try { if (S.myTac) localStorage.setItem(TAC_KEY, JSON.stringify(S.myTac)); else localStorage.removeItem(TAC_KEY); } catch (e) { } if (!fromCloud) cloudSmallPush("tactic"); }
function tacWorking() {
  const M = S.myTac; if (!M || !M.file) return null;
  const E = M.edits || {}, f = M.file;
  const ti = { ...f.ti, ...(E.ti || {}) };
  const slots = f.slots.map((s, i) => ({ i, ip: { ...s.ip, role: (E.ip || {})[i] || s.ip.role, edited: !!(E.ip || {})[i] }, oop: { ...s.oop, role: (E.oop || {})[i] || s.oop.role, edited: !!(E.oop || {})[i] } }));
  // a back three: the outside centre-backs are the Wide CB slots
  const dcs = slots.filter(s => s.ip.code === "DC");
  if (dcs.length === 3) dcs.forEach(s => { if (s.ip.side !== "C" && s.ip.role === "Wide CB") s.ip.code = "WCB"; });
  const ipP = tacPlace(slots.map(s => s.ip)), opP = tacPlace(slots.map(s => s.oop));
  slots.forEach((s, k) => { Object.assign(s.ip, { x: ipP[k].x, y: ipP[k].y }); Object.assign(s.oop, { x: opP[k].x, y: opP[k].y }); });
  return { name: f.name, style: f.style, mentality: E.mentality || f.mentality, ti, slots, fileTi: f.ti, fileMent: f.mentality, edited: !!(Object.keys(E.ti || {}).length || Object.keys(E.ip || {}).length || Object.keys(E.oop || {}).length || E.mentality) };
}

// ----- player fit: every slot filled from the squad (IP role 70%, OOP role 30%) -----
function tacFit(W, sq) {
  if (!sq) return null;
  if (!squadKinds(sq).includes("attr")) return null;
  if (rateCache.sq !== sq.id) { rateCache.clear(); rateCache.sq = sq.id; }
  const players = buildModel({ ...sq, id: sq.id + "|attr", mode: "attr" }).players.filter(p => p.a && Object.keys(p.a).length > 8 && posCodes(p.position || p.bestPos).size);
  if (!players.length) return null;
  const codes = new Map(players.map(p => { const c = posCodes(p.position || p.bestPos); if (c.has("DC")) c.add("WCB"); return [p.ix, c]; }));
  const oopR = (p, role, code) => { const k = OOP_KEYS[role] || OOP_KEYS[{ GK: "Goalkeeper", DC: "Centre-Back", WCB: "Wide CB", DL: "Full-Back", DR: "Full-Back", WBL: "Wing-Back", WBR: "Wing-Back", DM: "Defensive Midfielder", MC: "Central Midfielder", AMC: "Attacking Midfielder", ML: "Wide Midfielder", MR: "Wide Midfielder", AML: "Winger", AMR: "Winger", ST: "Centre Forward" }[code]] || []; return mean(k.map(a => p.a[a])); };
  const slots = W.slots.map(s => {
    const code = s.ip.code, g = CODE_GROUP[code], role = ROLES[g] && ROLES[g][s.ip.role] ? s.ip.role : "Balanced";
    const cand = players.map(p => {
      const c = codes.get(p.ix), exact = canPlay(c, code), adj = !exact && CODE_ADJ[code] && canPlay(c, CODE_ADJ[code]);
      if (!exact && !adj) return null;
      const ipv = rateRole(p, g, role); if (ipv == null) return null;
      const oc = s.oop.code, oopOk = oc === code || canPlay(c, oc) || (CODE_ADJ[oc] && canPlay(c, CODE_ADJ[oc])) || (TAC_ROW[oc] === TAC_ROW[code]);
      const opv = oopR(p, s.oop.role, oc) ?? ipv;
      const fit = 0.7 * ipv + 0.3 * opv - (adj ? 0.4 : 0) - (oopOk ? 0 : 0.5);
      const best = bestRoleIn(p, code);
      return { p, ipv, opv, fit, adj, oopOk, best };
    });
    return { s, code, g, role, cand };
  });
  const BIG = 1e6, m = Math.max(players.length, slots.length);
  const cost = slots.map(x => Array.from({ length: m }, (_, j) => j < players.length && x.cand[j] ? -x.cand[j].fit : BIG));
  const asg = hungarian(cost), used = new Set();
  slots.forEach((x, i) => { const j = asg[i]; x.pick = j >= 0 && j < players.length ? x.cand[j] : null; if (x.pick) used.add(x.pick.p.ix); });
  slots.forEach(x => { x.alts = x.cand.filter(c => c && c !== x.pick).sort((a, b) => b.fit - a.fit).slice(0, 3); });
  const xi = slots.filter(x => x.pick).map(x => x.pick.p);
  const A = (ps, names) => mean(ps.flatMap(p => names.map(n => p.a[n])));
  const byG = f => slots.filter(x => x.pick && f(x)).map(x => x.pick.p);
  const out = byG(x => x.code !== "GK"), cbs = byG(x => x.g === "CB"), sts = byG(x => x.code === "ST"), att = byG(x => ["ST", "AML", "AMR", "AMC", "ML", "MR"].includes(x.code));
  const Mx = {
    tech: A(out, ["Passing", "First Touch", "Technique", "Composure", "Decisions"]), press: A(out, ["Work Rate", "Stamina", "Aggression", "Anticipation", "Teamwork"]),
    cbPace: A(cbs, ["Pace", "Acceleration"]), cbAir: A(cbs, ["Heading", "Jumping Reach", "Strength"]), stAir: A(sts, ["Heading", "Jumping Reach", "Strength"]),
    attPace: A(att, ["Pace", "Acceleration", "Off The Ball"]), dribble: A(att, ["Dribbling", "Flair"]), cross: A(byG(x => ["FB", "Wingers"].includes(x.g)), ["Crossing"]),
    longShots: A(att, ["Long Shots"]), stamina: A(out, ["Stamina", "Natural Fitness"]), decisions: A(out, ["Decisions", "Anticipation"]), gkPass: A(byG(x => x.code === "GK"), ["Passing", "Kicking", "Composure"]),
  };
  const fits = slots.filter(x => x.pick).map(x => x.pick.fit);
  return { slots, M: Mx, avg: fits.length ? fits.reduce((a, b) => a + b, 0) / fits.length : null, n: players.length };
}

