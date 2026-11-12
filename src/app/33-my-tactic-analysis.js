// ----- the analysis: findings by section, four scores with their working, the closest FM style -----
function tacAnalyse(W, F) {
  const T = W.ti, lv = id => tiLv(T, id), M = F ? F.M : null, out = [];
  const ip = W.slots.map(s => s.ip), op = W.slots.map(s => s.oop);
  const ipR = ip.map(s => s.role), opR = op.map(s => s.role), has = (arr, set) => arr.filter(r => set.has(r)).length;
  const ment = MENTALITIES.indexOf(W.mentality) - 3; // -3..+3
  const add = (sec, kind, title, why, fix) => out.push({ sec, kind, title, why, fix: fix || [] });
  const v = id => T[id];
  const ok = x => x != null;
  // in possession
  if (lv("passing-directness") <= -1 && v("build-up-strategy") === "Bypass Press") add("ip", "conflict", "Short passing, but the build-up clears it long", `Passing is set to ${v("passing-directness")}, yet Build-up is Bypass Press, which tells the defenders to go long when pressed. One of the two will not be doing anything.`, ["Set Build-up to <b>Play Through Press</b> (or Balanced) so the short build-up can happen", "Or keep Bypass Press and move passing to Standard"]);
  if (lv("passing-directness") >= 1 && v("build-up-strategy") === "Play Through Press") add("ip", "conflict", "Direct passing with a play-through build-up", `${v("passing-directness")} passing wants the ball forward early, while Play Through Press wants it worked out short under pressure.`, ["Pick one: <b>Bypass Press</b> to match the direct passing, or shorter passing to match the build-up"]);
  if (v("goal-kicks") === "Short" && v("build-up-strategy") === "Bypass Press") add("tr", "conflict", "Short goal kicks into a build-up that goes long", "The keeper rolls it short, then the defenders are told to clear it under pressure: you invite the press without a plan to beat it.", ["Set Goal kicks to <b>Mixed</b>, or Build-up to <b>Play Through Press</b>"]);
  if (v("goal-kicks") === "Long" && (v("build-up-strategy") === "Play Through Press" || lv("passing-directness") <= -1)) add("tr", "conflict", "Long goal kicks in a short-passing side", "Every restart skips the build-up the rest of the tactic is designed around.", ["Set Goal kicks to <b>Short</b> or Mixed"]);
  if (lv("tempo") <= -1 && v("attacking-transition") === "Counter-Attack") add("tr", "conflict", "Counter-attacks at a slow tempo", `The team breaks the moment it wins the ball, then ${v("tempo")} tempo asks it to slow down. The break loses its speed.`, ["Set When the ball is won to <b>Standard</b> or Hold Shape, or raise tempo"]);
  if (v("attacking-transition") === "Hold Shape" && v("gk-distribution-speed") === "Distribute Quickly") add("tr", "minor", "The keeper hurries, the team holds", "Distribute Quickly springs a fast restart, but Hold Shape tells the team to slow down and keep structure.", ["Set GK distribution speed to <b>Balanced</b>"]);
  if (v("pass-reception") === "Pass Into Space" && lv("tempo") <= -1) add("ip", "minor", "Passes into space at a slow tempo", "Runners get the ball played ahead of them, but the slow tempo gives defenders time to recover first.", ["Use <b>Pass To Feet</b> for a patient side"]);
  if (v("patience") === "Work Ball Into Box" && v("shots-from-distance") === "Encourage") add("ip", "conflict", "Work it into the box… or shoot from distance", "Both can't be true: one waits for the clear chance, the other takes the early shot.", ["Set Shots from distance to <b>Discourage</b> (tested better) or Balanced"]);
  if (v("patience") === "Work Ball Into Box" && v("shots-from-distance") === "Discourage") add("ip", "good", "Patient final third", "Work Ball Into Box with fewer long shots: fewer but better chances. Discouraging long shots was one of the tested positives.");
  if (v("patience") === "Hit Early Crosses" && ["Low Crosses", "Whipped Crosses"].includes(v("crossing-style"))) add("ip", "good", "Early crosses with a sharp delivery", `Early + ${v("crossing-style")} was the best-tested crossing combination.`);
  if (v("crossing-style") === "Floated Crosses") add("ip", "risk", "Floated crosses", "Floated crosses tested weakest: they give the keeper and defenders time.", ["Use <b>Whipped</b> or Low crosses unless you have a dominant target man"]);
  const stR = ip.filter(s => s.code === "ST").map(s => s.role);
  if (v("crossing-style") === "Low Crosses" && stR.includes("Target Forward")) add("ip", "minor", "Low crosses to a target man", "A Target Forward wins headers; low crosses go to feet.", ["Use <b>Whipped Crosses</b> with a Target Forward (tested: whipped + work ball into box + pass to feet)"]);
  if (["Floated Crosses", "Whipped Crosses"].includes(v("crossing-style")) && M && M.stAir != null && M.stAir < 11) add("ip", "risk", "High crosses, but your striker isn't strong in the air", `Your striker averages ${M.stAir.toFixed(1)} for heading, jumping reach and strength.`, ["Switch to <b>Low Crosses</b>, or play a Target Forward who wins headers"]);
  if (v("attacking-width") === "Much Narrower" && v("progress-through") === "Both Flanks") add("ip", "conflict", "Narrow shape told to attack down both flanks", "Much Narrower pulls everyone inside, then Progress through Both Flanks sends the ball out wide where nobody is.", ["Set Progress through to <b>Middle</b> or Balanced, or widen the shape"]);
  if (lv("attacking-width") >= 2 && v("progress-through") === "Middle") add("ip", "conflict", "Very wide shape that only uses the middle", "Much Wider stretches the pitch, then the ball is forced through the centre.", ["Set Progress through to <b>Both Flanks</b> or Balanced"]);
  if (v("time-wasting") === "More Often" && ment >= 1) add("ip", "conflict", "Wasting time with a front-foot mentality", `${W.mentality} asks for urgency; More Often time wasting slows every restart.`, ["Keep time wasting for when you are protecting a lead"]);
  if (v("play-for-set-pieces") === "Play For Set Pieces" && lv("passing-directness") <= -1) add("ip", "minor", "Short passing that also hunts set pieces", "Play For Set Pieces pushes the ball into corners and free kicks instead of keeping the passing rhythm.", ["Set to <b>Keep Ball in Play</b> for a possession side"]);
  if (v("dribbling") === "Encourage" && M && M.dribble != null && M.dribble < 11.5) add("ip", "risk", "Dribbling encouraged without the dribblers", `Your attackers average ${M.dribble.toFixed(1)} for dribbling and flair.`, ["Set Dribbling to <b>Balanced</b>"]);
  if (v("dribbling") === "Encourage" && M && M.dribble != null && M.dribble >= 14) add("ip", "good", "Dribblers allowed to dribble", `Encourage dribbling tested positive, and your attackers average ${M.dribble.toFixed(1)} for dribbling and flair.`);
  if (lv("tempo") >= 2 && ment >= 2) add("ip", "risk", "Very high tempo on top of an attacking mentality", "Attacking already raises the tempo. Much Higher on top tends to turn into rushed passes and turnovers.", ["Drop Tempo one step to <b>Higher</b>"]);
  if (lv("passing-directness") <= -1 && M && M.tech != null && M.tech < 12) add("ip", "risk", "Short passing needs technical players", `Your XI averages ${M.tech.toFixed(1)} for passing, first touch, technique, composure and decisions. Short passing under pressure needs about 13+.`, ["Move Passing to <b>Standard</b>, or keep it and add Play Through Press only once the XI is more technical"]);
  if (lv("passing-directness") <= -1 && M && M.tech != null && M.tech >= 14) add("ip", "good", "Your XI can play short", `Passing, first touch, technique, composure and decisions average ${M.tech.toFixed(1)} across the XI: short passing suits them.`);
  if (v("pass-reception") === "Pass Into Space" && M && M.attPace != null && M.attPace < 12) add("ip", "risk", "Balls into space for slow runners", `Your attackers average ${M.attPace.toFixed(1)} for pace, acceleration and off the ball.`, ["Use <b>Pass To Feet</b> or Balanced"]);
  if (v("shots-from-distance") === "Encourage" && M && M.longShots != null && M.longShots < 12) add("ip", "risk", "Long shots encouraged, but your attackers are poor shooters from range", `Long shots average ${M.longShots.toFixed(1)} across your attackers.`, ["Set Shots from distance to <b>Discourage</b> (tested better)"]);
  // shape and roles in possession
  ["L", "R"].forEach(fl => {
    const side = ip.filter(s => TAC_FLANK[s.code] === fl || (s.code === "DC" && false));
    const holders = side.filter(s => R_WIDE.has(s.role) && s.role !== "Overlapping CB").length + ip.filter(s => s.role === "Overlapping CB" && s.side === fl).length;
    const name = fl === "L" ? "left" : "right";
    if (side.length && !holders && !(v("supporting-runs") === "Both Flanks" || v("supporting-runs") === (fl === "L" ? "Left" : "Right"))) add("shape", "risk", `Nobody holds the width on the ${name}`, `With the ball, the ${name} side has ${side.map(s => `${CODE_LABEL[s.code] || s.code} ${s.role}`).join(" and ")}: both come inside, so the ${name} touchline is empty and the opposition full-back can tuck in.`, [`Make one of them a width role: <b>${side.some(s => ["AML", "AMR", "ML", "MR"].includes(s.code)) ? "Winger or Wide Forward" : "Wing-Back"}</b>`, `Or keep both inside and set Supporting runs to the ${name}`]);
    const fb = side.find(s => ["DL", "DR", "WBL", "WBR"].includes(s.code));
    if (fb && R_INSIDE.has(fb.role) && (v("supporting-runs") === "Both Flanks" || v("supporting-runs") === (fl === "L" ? "Left" : "Right"))) add("ip", "conflict", `Overlaps asked for on the ${name}, but the full-back tucks inside`, `${fb.role} moves inside, so the overlapping runs the instruction asks for won't come from him.`, [`Set Supporting runs away from the ${name}, or use a Wing-Back there`]);
    const wide = side.filter(s => R_WIDE.has(s.role)), inside = side.filter(s => R_INSIDE.has(s.role));
    if (wide.length === 1 && inside.length === 1) add("shape", "good", `Balanced ${name} flank`, `${wide[0].role} holds the width and ${inside[0].role} attacks the half-space: one outside, one inside, so they don't crowd the same lane.`);
  });
  const pms = ip.filter(s => R_PM.has(s.role));
  if (pms.length >= 3) add("shape", "risk", `${pms.length} playmakers`, `${pms.map(s => s.role).join(", ")} all want the ball. Too many playmakers crowd the same central zones and slow the attack down.`, ["Change one of them to a runner or a holding role, e.g. the <b>" + (pms.find(s => ["Box-to-Box Playmaker", "Playmaking Wing-Back"].includes(s.role)) || pms[pms.length - 1]).role + "</b>"]);
  const pwb = ip.find(s => s.role === "Playmaking Wing-Back"), dpm = ip.find(s => ["Deep-Lying Playmaker", "Box-to-Box Playmaker"].includes(s.role) && TAC_ROW[s.code] === 3);
  if (pwb && dpm) add("shape", "risk", "Two playmakers drifting into the same zone", `The ${pwb.role} moves inside into the area where the ${dpm.role} (${CODE_LABEL[dpm.code]}) already plays. They stack in one lane instead of giving two passing options.`, ["Make the wing-back a <b>Full-Back or Wing-Back</b>, or the midfielder a <b>Defensive Midfielder</b>"]);
  const sts = ip.filter(s => s.code === "ST"), runners = ip.filter(s => R_RUN.has(s.role) && s.code !== "ST");
  if (sts.length === 1 && !runners.length && !ip.some(s => s.code === "AMC")) add("shape", "risk", "The striker is on his own", `${sts[0].role} has no attacking midfielder or inside runner near him.`, ["Make one wide player an <b>Inside Forward</b>, or add an AM role behind him"]);
  if (sts.length === 1 && R_LINK.has(sts[0].role) && runners.length < 2) add("shape", "risk", "A link-up striker with few runners", `${sts[0].role} drops or holds the ball for others, but only ${runners.length} player${runners.length === 1 ? "" : "s"} run beyond him.`, ["Add a runner: <b>Inside Forward</b>, Channel Midfielder or Attacking Midfielder"]);
  const threat = ip.filter(s => R_RUN.has(s.role)).length;
  if (threat <= 1) add("shape", "risk", "Few goal threats", "Only one role makes runs into the box. Goals will depend on one player.", ["Turn a wide player or midfielder into a runner (<b>Inside Forward</b>, Wide Forward, Channel Midfielder)"]);
  if (threat >= 3) add("shape", "good", `${threat} goal threats`, `${ip.filter(s => R_RUN.has(s.role)).map(s => s.role).join(", ")} all attack the box, so goals can come from several places.`);
  const rest = ip.filter(s => R_REST.has(s.role)).length, fwd = ip.filter(s => R_FWD.has(s.role));
  if (rest <= 3) add("tr", "risk", `Only ${rest} players stay back when you attack`, "If the ball is lost, fewer than four players are behind it to stop the counter.", ["Make a full-back <b>Inside Full-Back</b> or Full-Back, or use a Defensive Midfielder"]);
  if (rest >= 5) add("tr", "good", `${rest} players stay back when you attack`, "A solid rest defence: when the ball is lost, there are enough players behind it to stop the counter.");
  // transitions
  if (v("defensive-transition") === "Counter-Press" && v("line-of-engagement") === "Low Block") add("tr", "minor", "Counter-press, then drop into a low block", "The team presses straight after losing the ball but its resting block is deep, so the press starts a long way from where it ends.", ["Use <b>Regroup</b> with a low block, or raise the block"]);
  if (v("defensive-transition") === "Regroup" && v("line-of-engagement") === "High Press") add("tr", "minor", "Regroup, then press high", "Regroup drops back after losing the ball, but the resting shape presses high: the team keeps running back and then forward again.", ["Use <b>Standard</b> or Counter-Press with a high press"]);
  if (v("defensive-transition") === "Counter-Press" && fwd.length >= 3) add("tr", "risk", "Counter-press with many players committed forward", `${fwd.map(s => s.role).join(", ")} are high when the ball goes. If the first press is beaten, few are left.`, ["Keep counter-press but make one of them a holding role, or use <b>Standard</b>"]);
  if (v("defensive-transition") === "Counter-Press" && M && M.press != null && M.press < 12) add("tr", "risk", "Counter-press needs runners", `Your XI averages ${M.press.toFixed(1)} for work rate, stamina, aggression, anticipation and teamwork.`, ["Set When the ball is lost to <b>Standard</b> or Regroup"]);
  const outl = op.filter(s => O_OUT.has(s.role));
  if (v("attacking-transition") === "Counter-Attack" && outl.length) add("tr", "good", "Outlets ready for the counter", `${outl.map(s => s.role).join(" and ")} stay ready to break, which is exactly what Counter-Attack wants.`);
  if (v("attacking-transition") === "Hold Shape" && outl.length >= 2) add("tr", "minor", "Outlets wait, but the team holds the ball", `${outl.map(s => s.role).join(" and ")} stay high to break, yet Hold Shape tells the team not to counter.`, ["Set When the ball is won to <b>Standard</b>, or use Tracking roles instead of outlets"]);
  // goalkeeper
  const gkd = v("gk-distribution");
  if (gkd === "Target Forward" && !ipR.includes("Target Forward")) add("tr", "conflict", "Keeper aims for a target man you don't play", "Distribution to the Target Forward needs a Target Forward role up front.", ["Set GK distribution to <b>Centre-Backs</b> or Balanced"]);
  if (gkd === "Playmaker" && !ip.some(s => R_PM.has(s.role) && TAC_ROW[s.code] <= 4)) add("tr", "conflict", "Keeper aims for a playmaker you don't have deep", "There's no deep playmaker to receive it.", ["Pick <b>Centre-Backs</b> or add a Deep-Lying Playmaker"]);
  if (gkd === "Full-Backs" && ip.filter(s => ["DL", "DR", "WBL", "WBR"].includes(s.code)).every(s => R_INSIDE.has(s.role))) add("tr", "minor", "Keeper aims for full-backs who move inside", "Both full-backs tuck in, so the wide outlet isn't there.", ["Pick <b>Centre-Backs</b>"]);
  if (ok(gkd) && gkd === "Centre-Backs" && v("goal-kicks") === "Long") add("tr", "conflict", "Long goal kicks, short distribution", "Goal kicks go long but open-play distribution goes to the centre-backs.", ["Make both short or both long"]);
  if (v("prevent-short-gk-distribution") === "Yes" && v("line-of-engagement") === "Low Block") add("oop", "conflict", "Pressing the keeper from a low block", "The forwards are told to stop the keeper's short pass, but the block sits deep, so they press alone.", ["Set Press the keeper's short pass to <b>No</b>, or raise the block"]);
  // out of possession
  const loe = ["Low Block", "Mid Block", "High Press"].indexOf(v("line-of-engagement")), dl = lv("defensive-line");
  if (loe === 2 && dl <= -1) add("oop", "risk", "A gap between the press and the back line", `The press starts high but the defensive line sits ${v("defensive-line")}. That band of pitch belongs to the midfield alone.`, ["Move one setting a step towards the other (e.g. Defensive line <b>Standard</b>)", "Or keep it and make sure a holding midfielder (Screening DM) polices that space"]);
  if (loe === 0 && dl >= 1) add("oop", "conflict", "A low block with a high line", "The front players sit deep while the back line pushes up: space opens behind the defence with no pressure on the ball.", ["Set Defensive line to <b>Lower</b> or Standard"]);
  if (loe === 1 && dl === -1) add("oop", "good", "Mid block with a slightly lower line", "A slightly lower line outperformed the extremes in testing, and it keeps the block compact with the mid-block press.");
  if (Math.abs(dl) === 2) add("oop", "risk", `${v("defensive-line")} defensive line`, "The extremes tested worse than a slightly lower line.", ["Move it one step towards Standard"]);
  if (dl >= 1 && v("defensive-line-behaviour") === "Drop Off More") add("oop", "conflict", "High line that keeps dropping off", "The line is set high, then told to drop off more. It ends up nowhere in particular.", ["Pick one: <b>Balanced</b> behaviour with the high line, or a lower line"]);
  if (dl <= -1 && v("defensive-line-behaviour") === "Step Up More") add("oop", "conflict", "Deep line that keeps stepping up", "A low line protects the space behind, but Step Up More gives that space away.", ["Set Line behaviour to <b>Balanced</b>"]);
  if (dl <= -1 && v("defensive-line-behaviour") === "Drop Off More") add("oop", "good", "A deep, patient back line", "Lower line + drop off more: little space behind, the team defends its box. Pair it with a screen in front.");
  const tpz = lv("trigger-press");
  if (tpz >= 1 && loe === 0) add("oop", "conflict", "Pressing often from a low block", "The block waits deep, then players are told to jump out and press often: gaps open in the block.", ["Set Trigger press to <b>Standard</b>, or raise the block"]);
  if (tpz <= -1 && loe === 2) add("oop", "conflict", "A high press that rarely presses", "High Press sets where pressing starts, then Trigger press says not to.", ["Set Trigger press to <b>Standard</b> or More Often"]);
  if (tpz >= 1 && v("line-of-engagement") !== "Low Block") add("oop", "good", "Pressing more often", "More frequent pressing tested as fewer goals conceded and more scored, as long as the players have the legs.");
  if ((loe === 2 || tpz >= 1) && M && M.press != null && M.press < 12) add("oop", "risk", "Pressing asks a lot of your players", `Work rate, stamina, aggression, anticipation and teamwork average ${M.press.toFixed(1)} across the XI.`, ["Lower Trigger press one step, or the block to <b>Mid Block</b>"]);
  if ((loe === 2 || tpz >= 1) && M && M.press != null && M.press >= 14) add("oop", "good", "A squad built to press", `Work rate, stamina, aggression, anticipation and teamwork average ${M.press.toFixed(1)}.`);
  if (dl >= 1 && M && M.cbPace != null && M.cbPace < 12) add("oop", "risk", "High line with slow centre-backs", `Your centre-backs average ${M.cbPace.toFixed(1)} for pace and acceleration: balls over the top will hurt.`, ["Drop the Defensive line to <b>Standard</b> or Lower"]);
  if (dl <= -1 && M && M.cbPace != null && M.cbPace >= 15) add("oop", "tip", "Fast centre-backs in a deep line", `Your centre-backs average ${M.cbPace.toFixed(1)} for pace and acceleration. They could hold a Standard line and squeeze the pitch.`);
  if (v("tackling") === "Get Stuck In") add("oop", "good", "Get Stuck In", "Get Stuck In tested better than Stay On Feet (card risk wasn't measured).");
  if (v("tackling") === "Stay On Feet") add("oop", "tip", "Stay On Feet", "In testing, Get Stuck In did better. Keep Stay On Feet only for a booked or rash defence.", ["Try <b>Get Stuck In</b> or Standard"]);
  if (v("cross-engagement") === "Invite Crosses" && M && M.cbAir != null && M.cbAir >= 14) add("oop", "good", "Inviting crosses into strong headers", `Invite Crosses tested better, and your centre-backs average ${M.cbAir.toFixed(1)} in the air.`);
  if (v("cross-engagement") === "Invite Crosses" && M && M.cbAir != null && M.cbAir < 12) add("oop", "risk", "Inviting crosses with small centre-backs", `Your centre-backs average ${M.cbAir.toFixed(1)} for heading, jumping reach and strength.`, ["Set Cross engagement to <b>Balanced</b>"]);
  if (v("pressing-trap") === "Trap Inside" && !opR.some(r => ["Screening DM", "Defensive Midfielder", "Pressing DM", "Screening CM"].includes(r))) add("oop", "risk", "Trapping inside without a midfield screen", "Trap Inside pushes the ball into the middle, but no screening midfielder waits there to win it.", ["Add a <b>Screening DM</b> or set the trap to Balanced"]);
  if (outl.length >= 3) add("oop", "risk", `${outl.length} outlets don't defend`, `${outl.map(s => s.role).join(", ")} stay up when you don't have the ball, so only ${11 - 1 - outl.length} players defend.`, ["Change one outlet to a <b>Tracking</b> role"]);
  // outlets that do the same job, outlets in a pressing side, and what the team asks of its runners
  const outC = op.filter(s => ["AMC", "ST"].includes(s.code) && /^(Central|Splitting) Outlet/.test(s.role));
  ["Central", "Splitting"].forEach(k => { const same = outC.filter(s => s.role.startsWith(k)); if (same.length >= 2) add("oop", "risk", `Two ${k.toLowerCase()} outlets`, `${same.map(s => s.role).join(" and ")} both wait ${k === "Central" ? "in the middle" : "to run between the centre-backs"} for the same ball. They take each other's space and one of them is wasted.`, [`Make one a <b>${k === "Central" ? "Splitting" : "Central"}</b> outlet: one shows for the ball, the other runs in behind`]); });
  if (loe === 2 && outl.length) add("oop", "risk", "Outlets in a high press", `${outl.map(s => s.role).join(" and ")} wait for the ball instead of pressing, so the high press starts a man short.`, ["Use <b>Centre Forward</b> / <b>Winger</b> / <b>Attacking Midfielder</b> without the ball, or a Mid Block"]);
  const runIn = ip.filter(s => R_RUN.has(s.role) || s.role === "Winger").length;
  if (v("pass-reception") === "Pass Into Space" && runIn < 2) add("ip", "risk", "Passes into space with few runners", `Pass Into Space plays the ball ahead of runners, but only ${runIn} role${runIn === 1 ? "" : "s"} make that run.`, ["Use <b>Balanced</b> reception, or add a runner (Inside Forward, Channel Forward, Poacher)"]);
  if (v("attacking-transition") === "Counter-Attack" && ip.filter(s => R_RUN.has(s.role)).length < 2) add("tr", "risk", "Counter-attacks with few runners", "The team breaks the moment it wins the ball, but fewer than two roles run beyond it. Counters end with the ball going sideways.", ["Add a runner up front (Poacher, Channel Forward, Inside Forward), or use <b>Standard</b> transition"]);
  const gkO = op.find(s => s.code === "GK");
  if (gkO && gkO.role === "Sweeper Keeper" && dl <= -1) add("oop", "minor", "A sweeper keeper behind a deep line", "A Sweeper Keeper rushes out to cover space behind a high line. With a deep line there's little space to sweep.", ["Use <b>Goalkeeper</b> or Line-Holding Keeper"]);
  if (gkO && gkO.role === "Line-Holding Keeper" && dl >= 1) add("oop", "conflict", "A line-holding keeper behind a high line", "The space behind a high line needs a keeper who comes out.", ["Use <b>Sweeper Keeper</b>"]);
  if (gkO && gkO.role === "Line-Holding Keeper" && dl <= 0) add("oop", "good", "Keeper matches the line", "A Line-Holding Keeper suits a deeper line: he stays on his line where the space is.");
  const cbO = op.filter(s => ["DC", "WCB"].includes(s.code)).map(s => s.role);
  if (cbO.filter(r => /Stopping/.test(r)).length >= 2 && !cbO.some(r => /Covering/.test(r))) add("oop", "risk", "Both centre-backs step out", "Two stopping centre-backs both jump to engage: nobody covers behind them.", ["Make one a <b>Covering CB</b>"]);
  if (cbO.some(r => /Stopping/.test(r)) && cbO.some(r => /Covering/.test(r))) add("oop", "good", "Stopper and cover", "One centre-back steps out, the other covers behind him: a classic partnership.");
  if (cbO.length === 2 && cbO.some(r => /Covering/.test(r)) && !cbO.some(r => /Stopping/.test(r))) add("oop", "good", "A covering centre-back", "One centre-back drops to cover the space behind, the other holds: safe against balls over the top.");
  const screen = op.filter(s => ["Screening DM", "Screening CM", "Dropping DM", "Defensive Midfielder"].includes(s.role)).length;
  if (!screen && op.filter(s => O_PRESS.has(s.role) && ["DM", "MC"].includes(s.code)).length >= 1 && !op.some(s => s.code === "DM")) add("oop", "risk", "No midfield screen", "Without the ball the central midfielders press forward and nobody sits in front of the defence.", ["Make one midfielder a <b>Screening</b> role"]);
  const movers = W.slots.filter(s => s.ip.code !== s.oop.code || Math.abs(s.ip.x - s.oop.x) > 15);
  const far = movers.filter(s => Math.abs(TAC_ROW[s.ip.code] - TAC_ROW[s.oop.code]) >= 2);
  if (far.length) add("shape", "risk", `${far.length} player${far.length > 1 ? "s" : ""} change lines a long way`, `${far.map(s => `${CODE_LABEL[s.ip.code]} → ${CODE_LABEL[s.oop.code]}`).join(", ")}: they cover two lines every time possession changes, and arrive late.`, ["Keep in- and out-of-possession positions within one line of each other"]);
  else if (movers.length && movers.length <= 3) add("shape", "good", "Connected shapes", `${movers.length} player${movers.length > 1 ? "s move" : " moves"} between the two shapes (${movers.map(s => `${CODE_LABEL[s.ip.code]} → ${CODE_LABEL[s.oop.code]}`).join(", ")}), each by one line: quick to reorganise.`);
  // mentality vs block
  if (ment <= -2 && loe === 2) add("oop", "conflict", `${W.mentality} mentality with a high press`, "The mentality asks for few risks; the high press is a big one.", ["Use a <b>Mid Block</b>, or raise the mentality"]);
  if (ment >= 2 && loe === 0) add("oop", "conflict", `${W.mentality} mentality from a low block`, "An attacking mentality and a deep block pull the team in opposite directions.", ["Use a <b>Mid Block</b>, or lower the mentality"]);
  // instruction overload
  const changed = TI_DEF.filter(d => T[d[0]] != null && T[d[0]] !== d[4]).length;
  if (changed >= 18) add("ip", "tip", `${changed} of ${TI_DEF.length} instructions changed`, "Lots of changes make it hard to tell what is working. Keep one main idea with the ball and one without; leave the rest at default unless it fixes a problem you've seen.");
  // player fit notes
  if (F) F.slots.forEach(x => {
    if (!x.pick) add("players", "risk", `No one for ${CODE_LABEL[x.code]} · ${x.role}`, `Nobody in your squad plays ${CODE_NAME[x.code]} or next to it.`, ["Sign one, or change the slot"]);
    else if (x.pick.best && x.pick.best.role !== x.role && x.pick.best.v - x.pick.ipv >= 0.8 && x.role !== "Balanced") add("players", "tip", `${x.pick.p.name}: better as ${x.pick.best.role}`, `He rates ${x.pick.ipv.toFixed(1)} as ${x.role} but ${x.pick.best.v.toFixed(1)} as ${x.pick.best.role} in the same position.`, [`Try <b>${x.pick.best.role}</b> at ${CODE_LABEL[x.code]}, if it still fits the shape`]);
    if (x.pick && x.pick.fit < 11) add("players", "risk", `${CODE_LABEL[x.code]} is a weak spot`, `${x.pick.p.name} fits ${x.role} at ${x.pick.fit.toFixed(1)}/20, the lowest in your XI.`, ["A target for the transfer window, or pick a role he suits better"]);
  });
  return out;
}
// four scores: what the tactic does, not how good it is
function tacScores(W, A, F) {
  const T = W.ti, lv = id => tiLv(T, id), ment = MENTALITIES.indexOf(W.mentality) - 3;
  const ip = W.slots.map(s => s.ip), op = W.slots.map(s => s.oop), cnt = (arr, set) => arr.filter(s => set.has(s.role)).length;
  const loe = ["Low Block", "Mid Block", "High Press"].indexOf(T["line-of-engagement"]);
  const S4 = { create: [], safe: [], solid: [], coh: [] }, f = (k, txt, val) => { if (val) S4[k].push({ txt, val }); };
  f("create", `${W.mentality} mentality`, ment * 5);
  f("create", `Tempo ${T.tempo}`, lv("tempo") * 3);
  f("create", `Attacking width ${T["attacking-width"]}`, lv("attacking-width") * 2);
  f("create", `Creative freedom ${T["creative-freedom"]}`, T["creative-freedom"] === "More Expressive" ? 5 : T["creative-freedom"] === "More Disciplined" ? -5 : 0);
  f("create", `${cnt(ip, R_RUN)} players run into the box`, (cnt(ip, R_RUN) - 2) * 4);
  f("create", `${cnt(ip, R_PM)} playmaker${cnt(ip, R_PM) === 1 ? "" : "s"}`, Math.min(cnt(ip, R_PM), 2) * 3 - Math.max(0, cnt(ip, R_PM) - 2) * 3);
  f("create", "Dribbling encouraged", T.dribbling === "Encourage" ? 4 : T.dribbling === "Discourage" ? -3 : 0);
  f("create", "Supporting runs", T["supporting-runs"] !== "Balanced" ? 3 : 0);
  f("create", "Counter-attacks when the ball is won", T["attacking-transition"] === "Counter-Attack" ? 5 : T["attacking-transition"] === "Hold Shape" ? -4 : 0);
  f("create", "Crossing set", T["crossing-style"] && T["crossing-style"] !== "Balanced" && T["crossing-style"] !== "Floated Crosses" ? 2 : 0);
  f("create", "Empty flank", -6 * A.filter(x => /holds the width/.test(x.title)).length);
  f("create", "Isolated striker", A.some(x => /on his own|few runners/.test(x.title)) ? -6 : 0);
  f("safe", `${cnt(ip, R_REST)} players stay back with the ball`, (cnt(ip, R_REST) - 4) * 5);
  f("safe", `${cnt(ip, R_FWD)} defenders/midfielders bomb forward`, -cnt(ip, R_FWD) * 3);
  f("safe", `When the ball is lost: ${T["defensive-transition"]}`, T["defensive-transition"] === "Regroup" ? 8 : T["defensive-transition"] === "Counter-Press" ? -6 : 0);
  f("safe", `Line of engagement: ${T["line-of-engagement"]}`, (1 - loe) * 6);
  f("safe", `Defensive line ${T["defensive-line"]}`, -lv("defensive-line") * 4);
  f("safe", `${W.mentality} mentality`, -ment * 4);
  f("safe", `${cnt(op, O_OUT)} outlets stay up`, -cnt(op, O_OUT) * 3);
  f("safe", "Hold Shape when the ball is won", T["attacking-transition"] === "Hold Shape" ? 4 : T["attacking-transition"] === "Counter-Attack" ? -3 : 0);
  f("safe", "Players changing lines far", -5 * W.slots.filter(s => Math.abs(TAC_ROW[s.ip.code] - TAC_ROW[s.oop.code]) >= 2).length);
  f("solid", `Line of engagement: ${T["line-of-engagement"]}`, (1 - loe) * 6);
  f("solid", `Defensive line ${T["defensive-line"]}`, lv("defensive-line") <= -1 ? 4 : lv("defensive-line") >= 2 ? -5 : 0);
  f("solid", `${cnt(op, O_HOLD)} holding / screening / covering roles`, cnt(op, O_HOLD) * 3);
  f("solid", `${cnt(op, O_TRACK)} tracking roles`, cnt(op, O_TRACK) * 3);
  f("solid", `${cnt(op, O_PRESS)} pressing roles`, -cnt(op, O_PRESS) * 2);
  f("solid", `${cnt(op, O_OUT)} outlets don't defend`, -cnt(op, O_OUT) * 3);
  f("solid", `Tackling ${T.tackling}`, T.tackling === "Get Stuck In" ? 3 : 0);
  f("solid", "Drop off more", T["defensive-line-behaviour"] === "Drop Off More" ? 3 : T["defensive-line-behaviour"] === "Step Up More" ? -3 : 0);
  f("solid", "Narrower shape", lv("attacking-width") <= -1 ? 2 : 0);
  if (F && F.M.cbAir != null) f("solid", `Centre-backs in the air (${F.M.cbAir.toFixed(1)})`, Math.round((F.M.cbAir - 13) * 2));
  const conf = A.filter(x => x.kind === "conflict"), minor = A.filter(x => x.kind === "minor");
  conf.forEach(x => f("coh", x.title, -10)); minor.forEach(x => f("coh", x.title, -4));
  A.filter(x => x.kind === "good").forEach(x => f("coh", x.title, 2));
  const tot = (k, base) => Math.max(0, Math.min(100, Math.round(base + S4[k].reduce((s, x) => s + x.val, 0))));
  return [
    { k: "create", name: "Chance creation", q: "How many ways does it make a chance?", v: tot("create", 50), f: S4.create },
    { k: "safe", name: "Transition safety", q: "How protected is it the moment the ball is lost?", v: tot("safe", 50), f: S4.safe },
    { k: "solid", name: "Solidity", q: "How hard is the set shape to play through?", v: tot("solid", 50), f: S4.solid },
    { k: "coh", name: "Coherence", q: "Do the choices agree with each other?", v: tot("coh", 90), f: S4.coh },
  ];
}
function tacClosest(W) {
  return Object.entries(TAC_PRESETS).map(([k, p]) => {
    const diff = TI_DEF.filter(d => W.ti[d[0]] != null && p.s[d[0]] != null && W.ti[d[0]] !== p.s[d[0]]);
    return { k, p, diff, same: TI_DEF.length - diff.length };
  }).sort((a, b) => a.diff.length - b.diff.length);
}
function tacHeadline(W, A, sc) {
  const T = W.ti, ip = tacShape(W.slots.map(s => s.ip)), op = tacShape(W.slots.map(s => s.oop));
  const movers = W.slots.filter(s => s.ip.code !== s.oop.code).length;
  const bits = [];
  bits.push(`It lines up ${ip} with the ball and ${op} without it${movers ? `, with ${movers} player${movers > 1 ? "s" : ""} moving between the two` : ""}.`);
  const b = [];
  if (tiLv(T, "passing-directness") <= -1) b.push("keeps the ball with short passes"); else if (tiLv(T, "passing-directness") >= 1) b.push("plays direct");
  if (T["build-up-strategy"] === "Play Through Press") b.push("plays out under pressure"); else if (T["build-up-strategy"] === "Bypass Press") b.push("goes long when pressed");
  if (tiLv(T, "tempo") <= -1) b.push("at a patient tempo"); else if (tiLv(T, "tempo") >= 1) b.push("at a high tempo");
  if (T.patience === "Work Ball Into Box") b.push("and works the ball into the box"); else if (T.patience === "Hit Early Crosses") b.push("and crosses early");
  if (b.length) bits.push("On the ball it " + b.join(", ") + ".");
  const o = [];
  o.push(T["line-of-engagement"] === "High Press" ? "presses high" : T["line-of-engagement"] === "Low Block" ? "sits in a low block" : "defends in a mid block");
  if (tiLv(T, "defensive-line") <= -1) o.push("with a deeper line"); else if (tiLv(T, "defensive-line") >= 1) o.push("with a high line");
  if (T["defensive-transition"] === "Counter-Press") o.push("and counter-presses when it loses the ball"); else if (T["defensive-transition"] === "Regroup") o.push("and regroups when it loses the ball");
  bits.push("Without it it " + o.join(" ") + ".");
  const c = A.filter(x => x.kind === "conflict").length, r = A.filter(x => x.kind === "risk").length;
  bits.push(c ? `${c} setting${c > 1 ? "s argue" : " argues"} with another, and ${r} thing${r === 1 ? "" : "s"} could cost you.` : r ? `Nothing argues with itself; ${r} thing${r === 1 ? "" : "s"} could cost you.` : "Nothing argues with itself.");
  return bits.join(" ");
}

// ----- view -----
function tacPitch(W, F) {
  const Y = y => (116 - y * 1.08).toFixed(1);
  let s = `<svg class="pitch tacpitch" viewBox="0 0 100 120" role="img" aria-label="Tactic shape with and without the ball"><rect x="1" y="1" width="98" height="118" rx="2" class="pg"/>
    <g class="pl"><rect x="3" y="3" width="94" height="114"/><line x1="3" y1="60" x2="97" y2="60"/><circle cx="50" cy="60" r="9"/><rect x="27" y="3" width="46" height="15"/><rect x="27" y="102" width="46" height="15"/></g>`;
  W.slots.forEach(sl => { if (Math.abs(sl.ip.x - sl.oop.x) + Math.abs(sl.ip.y - sl.oop.y) > 4) s += `<line x1="${sl.ip.x}" y1="${Y(sl.ip.y)}" x2="${sl.oop.x}" y2="${Y(sl.oop.y)}" class="tmove"/><circle cx="${sl.oop.x}" cy="${Y(sl.oop.y)}" r="2.6" class="toop"/><text x="${sl.oop.x}" y="${Y(sl.oop.y)}" class="sc tsc2">${esc(tacAbbr(sl.oop.role))}</text>`; });
  W.slots.forEach((sl, k) => {
    const pk = F && F.slots[k] && F.slots[k].pick, x = sl.ip.x, y = Y(sl.ip.y), tx = Math.min(87, Math.max(13, x));
    const col = pk ? attrColorFill(pk.fit) : "var(--panel2)";
    const nm = pk ? pk.p.name.split(" ").slice(-1)[0] : CODE_LABEL[sl.ip.code] || sl.ip.code;
    s += `<g class="slot"${pk ? ` data-spos="${CODE_GROUP[sl.ip.code] === "CM" ? "CM" : CODE_GROUP[sl.ip.code]}" data-open="${pk.p.ix}"` : ""} tabindex="${pk ? 0 : -1}"><circle cx="${x}" cy="${y}" r="4.2" style="fill:${col}"/><text x="${x}" y="${y}" class="sc">${esc(tacAbbr(sl.ip.role))}</text>
      <text x="${tx}" y="${(+y + 7.4).toFixed(1)}" class="sn">${esc(nm.length > 13 ? nm.slice(0, 12) + "…" : nm)}</text>${pk ? `<text x="${tx}" y="${(+y + 11.2).toFixed(1)}" class="sf">${pk.fit.toFixed(1)}</text>` : ""}</g>`;
  });
  return s + `</svg>`;
}
const attrColorFill = v => v >= 15 ? "#2f8f55" : v >= 13 ? "#4a7f3c" : v >= 11 ? "#6a6a32" : "#8a4a3a";
const TAC_KIND = { conflict: ["bad", "Argues with another setting"], minor: ["warn", "Small clash"], risk: ["warn", "Could cost you"], good: ["good", "Strength"], tip: ["", "Worth a try"] };
function tacFindingHtml(x) {
  const [cls, lbl] = TAC_KIND[x.kind];
  return `<div class="tfind k-${cls || "tip"}"><div class="tfh"><span class="tag ${cls}">${lbl}</span><b>${esc(x.title)}</b></div><div class="small">${esc(x.why)}</div>${x.fix.length ? `<ul class="tfix small">${x.fix.map(t => `<li>${t}</li>`).join("")}</ul>` : ""}</div>`;
}
function tacSection(key, title, sub, W, A, rowsHtml) {
  const list = A.filter(x => x.sec === key), order = ["conflict", "risk", "minor", "tip", "good"];
  list.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind));
  const nBad = list.filter(x => ["conflict", "risk", "minor"].includes(x.kind)).length, nGood = list.filter(x => x.kind === "good").length;
  return `<section class="panel tsec" id="tsec-${key}"><div class="ph"><h3>${esc(title)}</h3><span class="muted small">${esc(sub)}</span><span class="tcount">${nGood ? `<span class="tag good">${nGood} strength${nGood > 1 ? "s" : ""}</span>` : ""}${nBad ? `<span class="tag warn">${nBad} to look at</span>` : ""}</span></div>
    <div class="tsgrid">${rowsHtml ? `<div class="tirows">${rowsHtml}</div>` : ""}<div class="tfinds">${list.length ? list.map(tacFindingHtml).join("") : `<p class="small muted">Nothing stands out here: these settings agree with each other and with your squad.</p>`}</div></div></section>`;
}
function tacTiRows(W, sec) {
  return TI_DEF.filter(d => d[2] === sec).map(([id, label, , opts, neu]) => {
    const val = W.ti[id], ed = W.fileTi[id] !== val, preset = TAC_PRESETS[W.style.replace(/^Custom\s+/, "")] || null;
    return `<label class="tirow${val !== neu ? " chg" : ""}"><span class="til">${esc(label)}</span><select class="tacti" data-ti="${id}">${val == null ? `<option value="" selected>? (not read)</option>` : ""}${opts.map(o => `<option ${o === val ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>${ed ? `<span class="tag warn" title="Changed here, not in the file">edited</span>` : ""}</label>`;
  }).join("");
}
function renderMyTactic(sq) {
  const W = tacWorking();
  const load = `<input type="file" id="tacFile" accept=".fmf,.tac" hidden>`;
  if (!W) return `<section class="panel addpanel">${load}<h3>Analyse your FM27 tactic</h3>
    <p class="muted">In FM27 go to <b>Tactics › Manage tactics › Export</b>. The file ends in <code>.fmf</code> and is saved in <code>Documents › Sports Interactive › Football Manager 27 › tactics</code>.</p>
    <label class="drop" for="tacFile"><span>Choose or drop your tactic file (.fmf)</span></label>
    ${S.tacErr ? `<p class="err">${esc(S.tacErr)}</p>` : ""}
    <p class="small muted">Scout Lab reads the file in your browser (nothing is uploaded), then goes through it section by section: shape, in possession, transitions, out of possession and your players in each slot. ${sq ? "Your squad fills the formation." : "Load your squad or save too and it will fill the formation with your players."}</p></section>`;
  const F = tacFit(W, sq), A = tacAnalyse(W, F), SC = tacScores(W, A, F), CL = tacClosest(W), best = CL[0];
  const ipS = tacShape(W.slots.map(s => s.ip)), opS = tacShape(W.slots.map(s => s.oop));
  let h = `${load}<section class="panel tachead"><div class="ph"><h3>${esc(W.name)}</h3><span class="muted small">${esc(W.style)} · read ${esc(S.myTac.file.read || "")}${W.edited ? " · <b>edited here</b>" : ""}</span>
    <span class="setctl"><label for="tacFile" class="ghost small btnlike">Load another</label>${W.edited ? `<button class="ghost small" data-act="tacreset">Undo my edits</button>` : ""}<button class="ghost small" data-act="tacremove">Remove</button>${SAVE ? `<button class="primary small" data-sctab="up" title="Everyone in your save who performs better in each slot's role">Find upgrades →</button>` : ""}</span></div>
    <div class="tsum"><span class="tag big">With the ball <b>${esc(ipS)}</b></span><span class="tag big">Without <b>${esc(opS)}</b></span>
    <label class="tag big tment">Mentality <select class="tacment">${MENTALITIES.map(m => `<option ${m === W.mentality ? "selected" : ""}>${m}</option>`).join("")}</select></label>
    ${F && F.avg != null ? `<span class="tag big good">Squad fit <b>${F.avg.toFixed(1)}</b>/20</span>` : ""}<span class="tag big" title="Of the ${TI_DEF.length} team instructions, how many match the game's own style">Closest style <b>${esc(best.k)}</b> · ${best.same}/${TI_DEF.length} match</span></div>
    <p class="theadline">${esc(tacHeadline(W, A, SC))}</p>
    <nav class="tnav">${[["shape", "Shape & roles"], ["ip", "In possession"], ["tr", "Transitions & keeper"], ["oop", "Out of possession"], ["players", "Your players"], ["style", "Vs FM's styles"], ["summary", "Summary"]].map(([k, l]) => `<button class="ptab small" data-tgo="${k}">${l}</button>`).join("")}</nav></section>`;
  // scores
  h += `<section class="panel"><div class="ph"><h3>What it does</h3><span class="muted small">four scores with the working behind each · high isn't "good", it's what the tactic chooses</span></div><div class="tscores">${SC.map(x => {
    const fs = x.f.slice().sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
    return `<details class="tscore"><summary><span class="tsv" style="color:${x.v >= 65 ? "var(--good)" : x.v >= 40 ? "var(--ink)" : "var(--accent)"}">${x.v}</span><span><b>${x.name}</b><span class="small muted"> ${esc(x.q)}</span></span></summary><ul class="tfac small">${fs.length ? fs.map(y => `<li><span class="${y.val > 0 ? "okc" : "bad"}">${y.val > 0 ? "+" : ""}${y.val}</span> ${esc(y.txt)}</li>`).join("") : "<li class='muted'>Nothing moves this score: everything sits at default.</li>"}</ul></details>`;
  }).join("")}</div></section>`;
  // shape & roles
  const roleRows = W.slots.map((sl, k) => {
    const ipOpts = [...new Set([...(sl.ip.opts && sl.ip.opts.length ? sl.ip.opts : codeRoles(sl.ip.code).filter(r => r !== "Balanced")), sl.ip.role])];
    const opOpts = [...new Set([...(sl.oop.opts && sl.oop.opts.length ? sl.oop.opts : []), sl.oop.role])];
    return `<div class="trole"><b class="sll">${esc(CODE_LABEL[sl.ip.code] || sl.ip.code)}</b><select class="tacrole" data-ph="ip" data-i="${k}" aria-label="Role with the ball">${ipOpts.map(r => `<option ${r === sl.ip.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
      <span class="muted small">${sl.oop.code !== sl.ip.code ? `→ ${esc(CODE_LABEL[sl.oop.code] || sl.oop.code)}` : "without:"}</span><select class="tacrole" data-ph="oop" data-i="${k}" aria-label="Role without the ball">${opOpts.map(r => `<option ${r === sl.oop.role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>${sl.ip.guess && !sl.ip.edited ? `<span class="tag warn" title="FM27 role name not confirmed for this code: check it matches your game, or pick the right one">check</span>` : ""}</div>`;
  }).join("");
  h += `<section class="panel tsec" id="tsec-shape"><div class="ph"><h3>Shape & roles</h3><span class="muted small">filled circles = with the ball · small circles + lines = where they go without it</span></div>
    <div class="lgrid"><div class="pitchwrap">${tacPitch(W, F)}</div><div><div class="troles">${roleRows}</div><div class="tfinds">${A.filter(x => x.sec === "shape").sort((a, b) => ["conflict", "risk", "minor", "tip", "good"].indexOf(a.kind) - ["conflict", "risk", "minor", "tip", "good"].indexOf(b.kind)).map(tacFindingHtml).join("") || `<p class="small muted">The roles fit together.</p>`}</div></div></div></section>`;
  h += tacSection("ip", "In possession", "how it builds, progresses and finishes", W, A, tacTiRows(W, "ip"));
  h += tacSection("tr", "Transitions & keeper", "the moments the ball changes hands, and restarts", W, A, tacTiRows(W, "tr"));
  h += tacSection("oop", "Out of possession", "where it presses, how deep it defends", W, A, tacTiRows(W, "oop"));
  // players
  if (F) {
    h += `<section class="panel tsec" id="tsec-players"><div class="ph"><h3>Your players in this tactic</h3><span class="muted small">fit = 70% his rating in the role with the ball + 30% the key attributes of the role without it, out of 20</span></div><div class="tplayers">${F.slots.map(x => {
      const pk = x.pick;
      return `<div class="slotrow"><div class="slh"><b class="sll">${esc(CODE_LABEL[x.code] || x.code)}</b><span class="small"><b>${esc(x.s.ip.role)}</b> <span class="muted">/ ${esc(x.s.oop.role)}</span></span>${pk ? `<b class="slfit" style="background:var(--panel)"><span style="color:${attrColor(pk.fit)}">${pk.fit.toFixed(1)}</span></b>` : ""}</div>
        <div class="slp">${pk ? `<button class="linkbtn" data-spos="${x.g}" data-open="${pk.p.ix}">${esc(pk.p.name)}</button> <span class="muted small">${pk.p.age ?? "?"} · with ${pk.ipv.toFixed(1)} · without ${pk.opv.toFixed(1)}${pk.adj ? ` · plays ${esc(CODE_LABEL[CODE_ADJ[x.code]])}` : ""}${!pk.oopOk ? ` · not natural at ${esc(CODE_LABEL[x.s.oop.code])}` : ""}</span>${pk.best && pk.best.role !== x.role && pk.best.v - pk.ipv >= 0.5 ? `<div class="small muted">Best role here: <b>${esc(pk.best.role)}</b> ${pk.best.v.toFixed(1)}</div>` : ""}` : `<span class="bad small">Nobody in the squad plays ${esc(CODE_NAME[x.code] || x.code)}</span>`}</div>
        ${x.alts.length ? `<div class="slalt small muted">Options: ${x.alts.map(c => `<button class="linkbtn" data-spos="${x.g}" data-open="${c.p.ix}">${esc(c.p.name)}</button> ${c.fit.toFixed(1)}`).join(" · ")}</div>` : ""}</div>`;
    }).join("")}</div><div class="tfinds tfinds2">${A.filter(x => x.sec === "players").map(tacFindingHtml).join("")}</div></section>`;
  } else h += `<section class="panel" id="tsec-players"><p class="muted">Load your squad (or your FM save) to fill this tactic with your players and check that they suit it.</p></section>`;
  // vs styles
  h += `<section class="panel" id="tsec-style"><div class="ph"><h3>Against FM27's own styles</h3><span class="muted small">how many of the ${TI_DEF.length} team instructions match each style · closest doesn't mean it is that style</span></div><div class="tscroll"><table class="gtable"><thead><tr><th>Style</th><th class="num">Match</th><th>Mentality</th><th>Differences from yours</th></tr></thead><tbody>${CL.map((x, i) => `<tr${i === 0 ? ` class="rsel"` : ""}><td class="left"><b>${esc(x.k)}</b></td><td class="num">${x.same}/${TI_DEF.length}</td><td class="small">${esc(x.p.m)}${x.p.m === W.mentality ? "" : ` <span class="muted">(yours ${esc(W.mentality)})</span>`}</td><td class="small">${i < 3 ? x.diff.map(d => `${esc(d[1])}: <b>${esc(W.ti[d[0]])}</b> <span class="muted">vs ${esc(x.p.s[d[0]])}</span>`).join(" · ") : x.diff.length + " different"}</td></tr>`).join("")}</tbody></table></div></section>`;
  // summary: every recommended change, changes in bold, with the reason
  const fixes = A.filter(x => ["conflict", "risk", "minor"].includes(x.kind) && x.fix.length).sort((a, b) => ["conflict", "risk", "minor"].indexOf(a.kind) - ["conflict", "risk", "minor"].indexOf(b.kind));
  const keep = A.filter(x => x.kind === "good");
  h += `<section class="panel" id="tsec-summary"><div class="ph"><h3>Summary</h3><span class="muted small">what to change, and why · changes in bold</span></div>
    <div class="tsumgrid"><div><h4>Change</h4>${fixes.length ? `<ul class="why">${fixes.map(x => `<li>${x.fix[0]} <span class="muted">— ${esc(x.title.toLowerCase())}: ${esc(x.why)}</span></li>`).join("")}</ul>` : `<p class="small muted">Nothing needs changing.</p>`}</div>
    <div><h4>Keep</h4>${keep.length ? `<ul class="why">${keep.map(x => `<li><b class="okc">${esc(x.title)}</b> <span class="muted">— ${esc(x.why)}</span></li>`).join("")}</ul>` : `<p class="small muted">—</p>`}</div></div>
    <p class="small muted">Change one or two things at a time and give it a few matches: familiarity matters, and every change is a test. Findings come from the FM26/27 tactical knowledge base (tested results marked "tested") and the roles and instructions reference. Role and instruction names are read from your file; anything marked "check" or "?" couldn't be confirmed, so set it to what your game shows and the analysis updates.</p></section>`;
  if (typeof tacExportHtml === "function") h += tacExportHtml("mine");
  return h;
}
// ----- events -----
async function tacLoadFile(file) {
  S.tacErr = null;
  try {
    if (file.size > 5e6) throw new Error("That file is too big to be a tactic.");
    const buf = await file.arrayBuffer(), T = await readTacticFile(buf), u8 = new Uint8Array(buf);
    S.myTac = { file: T, edits: {}, fname: file.name, raw: u8[2] === 0x61 && typeof b64e === "function" ? b64e(u8) : null }; tacSave();
  } catch (e) { S.tacErr = e.message || String(e); }
  render();
}
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "tacFile" && t.files && t.files[0]) { tacLoadFile(t.files[0]); return; }
  if (!S.myTac) return;
  const E = S.myTac.edits = S.myTac.edits || {};
  const y = window.scrollY;
  if (t.classList.contains("tacti")) { E.ti = { ...(E.ti || {}), [t.dataset.ti]: t.value || null }; if (S.myTac.file.ti[t.dataset.ti] === t.value) delete E.ti[t.dataset.ti]; }
  else if (t.classList.contains("tacrole")) { const ph = t.dataset.ph, i = +t.dataset.i; E[ph] = { ...(E[ph] || {}), [i]: t.value }; if (S.myTac.file.slots[i][ph].role === t.value) delete E[ph][i]; }
  else if (t.classList.contains("tacment")) { E.mentality = t.value === S.myTac.file.mentality ? undefined : t.value; }
  else return;
  tacSave(); render(); window.scrollTo(0, y);
});
document.addEventListener("click", e => {
  const t = e.target.closest("[data-act], [data-tgo]"); if (!t) return;
  if (t.dataset.tgo) { const el = document.getElementById("tsec-" + t.dataset.tgo); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
  if (t.dataset.act === "tacreset" && S.myTac) { S.myTac.edits = {}; tacSave(); render(); }
  if (t.dataset.act === "tacremove") { S.myTac = null; tacSave(); render(); }
});
document.addEventListener("dragover", e => { if (e.target.closest && e.target.closest("label[for=tacFile]")) e.preventDefault(); });
document.addEventListener("drop", e => { const l = e.target.closest && e.target.closest("label[for=tacFile]"); if (l && e.dataTransfer.files[0]) { e.preventDefault(); tacLoadFile(e.dataTransfer.files[0]); } });
tacLoadStore();

