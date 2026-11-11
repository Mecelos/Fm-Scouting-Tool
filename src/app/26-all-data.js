// ---------- All data: every player of the save in one table, every number, filter by any range ----------
// Colours: red = poor, yellow = average, green = good, judged against benchmarks for his position (per 90 for
// counts, so a season total is judged against what a regular starter piles up by this point of the season).
const AD_GROUPS = { info: "Info", tot: "Season totals", p90: "Per 90", pct: "Percentages", attr: "Attributes", posr: "Position ratings", hid: "Hidden & personality", te: "Tactical effectiveness" };
const AD_DEFAULT_GROUPS = ["info", "tot", "p90", "pct"];
const AD = { cols: null, idx: null, key: null, row: 30, rangeKey: null };
const BG = ["GK", "FB", "CB", "DM", "CM", "AM", "W", "ST"];
const OUT6 = v => ({ FB: v, CB: v, DM: v, CM: v, W: v, ST: v });
// [bad, good] per 90 minutes (unless the note says otherwise) for a regular player in that position; yellow sits halfway.
// Inverse metrics (fewer is better) list the bad number first anyway: the scale runs from bad to good.
const AD_BENCH = {
  goals: { FB: [0, .07], CB: [0, .08], DM: [0, .08], CM: [.02, .17], W: [.08, .33], ST: [.18, .55] },
  xg: { FB: [.01, .07], CB: [.02, .09], DM: [.02, .09], CM: [.04, .16], W: [.09, .3], ST: [.16, .4] },
  npxg: { FB: [.01, .06], CB: [.02, .08], DM: [.02, .08], CM: [.04, .15], W: [.08, .28], ST: [.15, .38] },
  assists: { FB: [.02, .13], CB: [0, .04], DM: [.02, .09], CM: [.04, .18], W: [.07, .25], ST: [.04, .16] },
  xa: { FB: [.03, .12], CB: [.01, .04], DM: [.02, .08], CM: [.05, .17], W: [.08, .24], ST: [.05, .15] },
  shots: { FB: [.15, .7], CB: [.25, .8], DM: [.25, .9], CM: [.5, 1.6], W: [1, 2.6], ST: [1.4, 3.3] },
  sot: { FB: [.05, .25], CB: [.08, .3], DM: [.08, .3], CM: [.15, .55], W: [.35, .95], ST: [.5, 1.3] },
  kp: { FB: [.4, 1.3], CB: [.1, .45], DM: [.35, 1.1], CM: [.7, 1.9], W: [.9, 2.2], ST: [.5, 1.4] },
  opkp: { FB: [.3, 1.05], CB: [.08, .36], DM: [.28, .9], CM: [.55, 1.55], W: [.7, 1.8], ST: [.4, 1.15] },
  ccc: { FB: [.02, .15], CB: [0, .05], DM: [.02, .1], CM: [.04, .25], W: [.06, .3], ST: [.04, .22] },
  prpas: { GK: [.3, 1.5], FB: [2.5, 6], CB: [2.5, 6.5], DM: [3.5, 8], CM: [3, 7], W: [1.5, 4], ST: [.8, 2.5] },
  drb: { FB: [.25, 1.1], CB: [.05, .35], DM: [.15, .7], CM: [.3, 1.2], W: [.9, 2.8], ST: [.5, 1.7] },
  pasa: { GK: [18, 38], FB: [35, 62], CB: [40, 72], DM: [45, 78], CM: [40, 72], W: [24, 46], ST: [15, 35] },
  pasc: { GK: [12, 30], FB: [27, 52], CB: [34, 64], DM: [38, 70], CM: [33, 63], W: [18, 37], ST: [10, 26] },
  opcrsa: { FB: [.8, 3.2], CM: [.15, 1], W: [1.2, 4.2], ST: [.1, .7] },
  opcrsc: { FB: [.2, .9], CM: [.04, .3], W: [.3, 1.1], ST: [.02, .18] },
  crsa: { FB: [1, 3.8], DM: [.1, 1], CM: [.3, 2.5], W: [1.5, 5], ST: [.1, .8] },
  crsc: { FB: [.25, 1.05], DM: [.02, .3], CM: [.08, .7], W: [.35, 1.35], ST: [.02, .2] },
  aera: { FB: [1, 3], CB: [3, 7.5], DM: [1.5, 4.5], CM: [1, 3.2], W: [.7, 2.4], ST: [3, 8.5] },
  hdrs: { FB: [.5, 1.8], CB: [2, 5.2], DM: [.8, 2.6], CM: [.5, 1.8], W: [.25, 1.1], ST: [1.2, 4] },
  khdr: { CB: [.02, .2], DM: [.01, .12], ST: [.02, .2] },
  tcka: { FB: [1.6, 3.5], CB: [1.2, 2.8], DM: [2, 4.2], CM: [1.5, 3.3], W: [.9, 2.1], ST: [.5, 1.5] },
  tckc: { FB: [1.2, 2.7], CB: [.9, 2.1], DM: [1.5, 3.2], CM: [1.1, 2.5], W: [.6, 1.5], ST: [.3, 1] },
  ktck: { FB: [.02, .2], CB: [.03, .25], DM: [.03, .25], CM: [.02, .2] },
  itc: { FB: [1.1, 2.5], CB: [1.4, 3.1], DM: [1.3, 2.9], CM: [.9, 2.1], W: [.4, 1.2], ST: [.2, .8] },
  blk: { FB: [.25, .85], CB: [.4, 1.2], DM: [.3, .9], CM: [.15, .6], W: [.05, .4], ST: [.05, .35] },
  shblk: { FB: [.1, .5], CB: [.2, .8], DM: [.1, .5], CM: [.05, .35] },
  clr: { FB: [1.3, 3.8], CB: [3, 7.5], DM: [1, 3.2], CM: [.5, 1.8], W: [.15, .8], ST: [.3, 1.3] },
  pwon: { FB: [5, 10], CB: [5.5, 11], DM: [6, 12], CM: [5, 10], W: [3, 7], ST: [2, 5] },
  plost: { inv: 1, GK: [8, 3], FB: [13, 7], CB: [8, 3.5], DM: [11, 5.5], CM: [13, 7], W: [19, 11], ST: [17, 10] },
  presa: { FB: [8, 16], CB: [5, 11], DM: [10, 19], CM: [10, 19], W: [10, 18], ST: [11, 21] },
  presc: { FB: [2.5, 5.5], CB: [1.5, 4], DM: [3, 6.5], CM: [3, 6.5], W: [3, 6], ST: [3, 6.5] },
  spr: { FB: [7, 14], CB: [3, 7.5], DM: [4, 9], CM: [5, 11], W: [8, 16], ST: [6, 14] },
  dist: { FB: [10.2, 11.5], CB: [9.3, 10.6], DM: [10.6, 12], CM: [10.8, 12.3], W: [10, 11.6], ST: [9.5, 11.1] },
  fouls: { inv: 1, FB: [1.3, .5], CB: [1.4, .6], DM: [1.9, .9], CM: [1.6, .7], W: [1.4, .55], ST: [1.9, .8] },
  fouled: { FB: [.4, 1.2], CB: [.2, .8], DM: [.5, 1.4], CM: [.6, 1.8], W: [.8, 2.2], ST: [.7, 2.1] },
  yel: { inv: 1, GK: [.1, .02], ...OUT6([.3, .08]) },
  red: { inv: 1, GK: [.04, 0], ...OUT6([.04, 0]) },
  mlg: { inv: 1, GK: [.06, 0], ...OUT6([.05, 0]) },
  conc: { inv: 1, GK: [1.7, .8] },
  cs: { GK: [.15, .42], FB: [.15, .42], CB: [.15, .42], DM: [.15, .42] },
  xgp: { GK: [-.1, .1] },
  saves: { GK: [1.6, 3.2] },
  pom: { ...OUT6([0, .1]), GK: [0, .08] },
  // percentages and rates (not per 90)
  pasPct: { pct: 1, GK: [55, 78], FB: [74, 86], CB: [82, 92], DM: [82, 91], CM: [79, 90], W: [70, 84], ST: [63, 79] },
  shotPct: { pct: 1, ...OUT6([28, 45]) },
  convPct: { pct: 1, FB: [3, 12], CB: [5, 15], DM: [3, 12], CM: [4, 13], W: [7, 16], ST: [9, 20] },
  tckPct: { pct: 1, ...OUT6([65, 82]) },
  hdrPct: { pct: 1, FB: [45, 66], CB: [56, 76], DM: [46, 66], CM: [42, 62], W: [28, 50], ST: [30, 55] },
  crPct: { pct: 1, FB: [18, 32], DM: [18, 32], CM: [18, 32], W: [18, 32], ST: [15, 30] },
  svPct: { pct: 1, GK: [64, 78] },
  xgShot: { pct: 1, FB: [.04, .09], CB: [.06, .13], DM: [.04, .09], CM: [.05, .1], W: [.06, .12], ST: [.08, .16] },
  avr: { pct: 1, GK: [6.5, 7.1], ...OUT6([6.6, 7.2]) },
  xgop: { tot: 1, ...OUT6([-2.5, 2.5]) },
  play: { play: 1 },
  attr: { all: [6, 15] }, attrInv: { all: [15, 6] }, posr: { all: [8, 18] }, te: { all: [30, 80] }, ca: { all: [80, 150] }, pa: { all: [110, 170] },
};
const benchFor = (key, g) => { const b = AD_BENCH[key]; if (!b) return null; if (b.all) return b.all; if (b[g]) return b[g]; if (g === "AM" && b.CM && b.W) return [(b.CM[0] + b.W[0]) / 2, (b.CM[1] + b.W[1]) / 2]; return null; };
const AD_MIN_MINS = 300;
// stat types for the All data side filter, and what every column means (abbreviation, full name, one or two sentences)
const AD_CATS = { gen: "General", phy: "Physical", gk: "Goalkeeping", def: "Defending", aer: "Aerial", dis: "Discipline", pas: "Passing", prg: "Progressing", cre: "Creating", crs: "Crossing", att: "Attacking" };
const AD_CAT_NOTE = { gen: "minutes, apps, starts, rating, player of the match", phy: "sprints, distance covered", gk: "saves, conceded, clean sheets, xG prevented",
  def: "tackles, interceptions, blocks, clearances, pressures", aer: "aerial duels, headers won", dis: "fouls, yellow and red cards", pas: "passes, pass %, possession lost",
  prg: "progressive passes, dribbles", cre: "assists, xA, key passes, clear-cut chances", crs: "crosses, cross %", att: "goals, xG, shots, conversion, fouls won, offsides" };
const AD_CAT_OF = {
  minutes: "gen", apps: "gen", starts: "gen", average_rating: "gen", player_of_the_match: "gen",
  high_intensity_sprints: "phy", distance_km: "phy",
  goals_allowed: "gk", clean_sheets: "gk", expected_goals_prevented: "gk", saves: "gk", saves_held: "gk", saves_parried: "gk", saves_tipped: "gk", shots_on_target_faced: "gk", r_sv: "gk",
  tackles_attempted: "def", tackles_completed: "def", key_tackles: "def", r_tck: "def", interceptions: "def", blocks: "def", shots_blocked: "def", clearances: "def", possession_won: "def",
  pressures_attempted: "def", pressures_completed: "def", mistakes_leading_to_goal: "def",
  aerial_challenges_attempted: "aer", headers_won: "aer", key_headers: "aer", r_hdr: "aer",
  fouls_made: "dis", yellow_cards: "dis", red_cards: "dis",
  passes_attempted: "pas", passes_completed: "pas", r_pas: "pas", possession_lost: "pas",
  progressive_passes: "prg", dribbles: "prg",
  assists: "cre", expected_assists: "cre", key_passes: "cre", open_play_key_passes: "cre", clear_cut_chances_created: "cre",
  crosses_attempted: "crs", crosses_completed: "crs", open_play_crosses_attempted: "crs", open_play_crosses_completed: "crs", r_cr: "crs", r_opcr: "crs",
  goals: "att", expected_goals: "att", non_penalty_expected_goals: "att", xgop: "att", shots: "att", shots_on_target: "att", shots_outside_box: "att", penalties_taken: "att", penalties_scored: "att",
  r_shot: "att", r_conv: "att", r_xgs: "att", fouls_against: "att", offsides: "att",
};
const AD_DOC = {
  ...Object.fromEntries(Object.entries({ GK: "Goalkeeper", DL: "Left back", DC: "Centre-back", DR: "Right back", WBL: "Left wing-back", DM: "Defensive midfielder", WBR: "Right wing-back", ML: "Left midfielder", MC: "Central midfielder", MR: "Right midfielder", AML: "Left winger / attacking midfielder", AMC: "Attacking midfielder (centre)", AMR: "Right winger / attacking midfielder", STC: "Striker" }).map(([c, n]) => ["pr_" + c, [POS_LABEL_SHORT[c], `${n}: ${POS_LABEL[c]}`, `FM's own rating for him at ${POS_LABEL[c]}, 1–20: 18–20 Natural, 15–17 Accomplished, 12–14 Competent, 9–11 Unconvincing, 5–8 Awkward, 1–4 Ineffective.`]])),
  // info
  name: ["Player", "Player", "His name. Click or tap a row to open him in his position tab with his role scores."],
  club: ["Club", "Club", "The club he plays for now."],
  club_season: ["Club", "Club that season", "The club he played most of his minutes for in that season."],
  seasons: ["Seasons", "Seasons played", "How many seasons he has stats for in this save, this one included."],
  pos: ["Pos", "Positions", "Every position he is accomplished or natural at (15 or more out of 20 in FM)."],
  age: ["Age", "Age", "His age on the save's current date."],
  value: ["Value", "Transfer value", "FM's estimate of what he is worth, in pounds. Not his asking price: clubs often want more."],
  height: ["Ht", "Height", "His height in centimetres."],
  foot: ["Foot", "Preferred foot", "His stronger foot. \"Either\" means both feet are strong; \"Right Only\" means his left foot is very weak."],
  // general
  minutes: ["Mins", "Minutes played", "Minutes he has played this season in the chosen competitions (League only or All competitions)."],
  apps: ["Apps", "Appearances", "Matches he has played, as a starter or off the bench."],
  starts: ["Starts", "Starts", "Matches he started."],
  average_rating: ["Rat", "Average rating", "His average FM match rating out of 10. About 6.8 is a steady game; 7.2+ over a season is very good."],
  player_of_the_match: ["PoM", "Player of the match", "Times he was named player of the match."],
  high_intensity_sprints: ["Spr", "High-intensity sprints", "Flat-out sprints he made. Shows work rate and how often he runs in behind or tracks back."],
  distance_km: ["Dist", "Distance covered (km)", "Kilometres he has run. About 11 km per 90 is a hard-working midfielder."],
  // goalkeeping
  goals_allowed: ["Conc", "Goals conceded", "Goals his team let in while he was on the pitch. Fewer is better; it matters most for goalkeepers."],
  clean_sheets: ["CS", "Clean sheets", "Matches where his team didn't concede while he played."],
  expected_goals_prevented: ["xGP", "Expected goals prevented", "Goals an average keeper would have let in from the shots he faced, minus the goals he actually let in. Above 0 means he saves more than expected."],
  saves: ["Sv", "Saves", "All his saves: caught, parried and tipped away."],
  saves_held: ["Sv H", "Saves held", "Saves where he caught and held the ball."],
  saves_parried: ["Sv P", "Saves parried", "Saves he pushed away, leaving the ball in play."],
  saves_tipped: ["Sv T", "Saves tipped", "Saves he tipped over the bar or round the post."],
  shots_on_target_faced: ["SoTF", "Shots on target faced", "Shots on target he had to deal with as a goalkeeper."],
  r_sv: ["Sv%", "Save percentage", "Share of the shots on target he faced that he saved. Higher is better."],
  // defending
  tackles_attempted: ["Tck A", "Tackles attempted", "Tackles he went in for."],
  tackles_completed: ["Tck W", "Tackles won", "Tackles that won the ball."],
  key_tackles: ["K Tck", "Key tackles", "Tackles that stopped a clear chance or a dangerous attack."],
  interceptions: ["Int", "Interceptions", "Opponents' passes he cut out by reading the play."],
  blocks: ["Blk", "Blocks", "Shots, passes and crosses he blocked."],
  shots_blocked: ["Sh Blk", "Shots blocked", "Opponents' shots he blocked."],
  clearances: ["Clr", "Clearances", "Times he got the ball away from danger."],
  possession_won: ["Poss W", "Possession won", "Times he won the ball back for his team (tackles, interceptions, loose balls)."],
  aerial_challenges_attempted: ["Aer A", "Aerial challenges", "Headers he contested: jumping for the ball against an opponent."],
  headers_won: ["Hdr W", "Headers won", "Aerial challenges he won."],
  key_headers: ["K Hdr", "Key headers", "Headers FM counts as important, such as winning the ball in a dangerous moment or setting up a chance."],
  pressures_attempted: ["Prs A", "Pressures attempted", "Times he closed down an opponent who had the ball."],
  pressures_completed: ["Prs C", "Pressures completed", "Pressures that won the ball back or forced a mistake."],
  fouls_made: ["Fls", "Fouls committed", "Fouls he gave away. Fewer is better."],
  yellow_cards: ["Yel", "Yellow cards", "Yellow cards he got. Fewer is better."],
  red_cards: ["Red", "Red cards", "Red cards he got. Fewer is better."],
  mistakes_leading_to_goal: ["Err", "Errors leading to a goal", "Mistakes that led straight to an opposition goal. Fewer is better."],
  r_tck: ["Tck%", "Tackles won %", "Share of his tackles that won the ball."],
  r_hdr: ["Hdr%", "Headers won %", "Share of his aerial challenges that he won."],
  // creating
  assists: ["Ast", "Assists", "Goals scored straight from his pass or cross (the last ball before the goal)."],
  expected_assists: ["xA", "Expected assists", "The xG of the shots his passes set up. It measures how good the chances he creates are, whether or not team-mates score them."],
  key_passes: ["KP", "Key passes", "Passes that led straight to a team-mate's shot, set pieces included."],
  open_play_key_passes: ["OP KP", "Open-play key passes", "Key passes in open play only (no corners or free kicks), so it shows creativity in normal play."],
  clear_cut_chances_created: ["CCC", "Clear-cut chances created", "Passes that set up a chance FM rates as clear-cut: one a player should score, like a one-on-one or a tap-in."],
  progressive_passes: ["PrgP", "Progressive passes", "Completed passes that move the ball well up the pitch towards the opponents' goal. Shows who drives the team forward with passing."],
  passes_attempted: ["Pas A", "Passes attempted", "Passes he tried. Shows how involved he is on the ball."],
  passes_completed: ["Pas C", "Passes completed", "Passes that reached a team-mate."],
  open_play_crosses_attempted: ["OP CrA", "Open-play crosses attempted", "Crosses he tried in open play (not from corners or free kicks)."],
  open_play_crosses_completed: ["OP CrC", "Open-play crosses completed", "Open-play crosses that found a team-mate."],
  crosses_attempted: ["Cr A", "Crosses attempted", "All crosses he tried, set pieces included."],
  crosses_completed: ["Cr C", "Crosses completed", "Crosses that found a team-mate, set pieces included."],
  r_pas: ["Pas%", "Pass completion %", "Share of his passes that reached a team-mate. Safe passers score high; risky creators lower."],
  r_cr: ["Cr%", "Cross completion %", "Share of all his crosses that found a team-mate."],
  r_opcr: ["OP Cr%", "Open-play cross completion %", "Share of his open-play crosses that found a team-mate."],
  // scoring
  goals: ["Gls", "Goals", "Goals he has scored."],
  expected_goals: ["xG", "Expected goals", "How many goals an average finisher would score from the chances he shot from. High xG means he keeps getting into good scoring positions."],
  non_penalty_expected_goals: ["npxG", "Non-penalty expected goals", "Expected goals without penalties, so penalty takers don't look better than they are."],
  xgop: ["G−xG", "Goals minus expected goals", "Goals scored minus xG. Above 0 means he finishes better than his chances suggest; over a short spell it can just be luck."],
  shots: ["Sh", "Shots", "All shots he took, on target or not."],
  shots_on_target: ["SoT", "Shots on target", "Shots that would have gone in without a save (goals plus saved shots)."],
  shots_outside_box: ["Sh Out", "Shots from outside the box", "Shots from outside the penalty area. Usually poor chances, so lots of these can mean wasted attacks."],
  penalties_taken: ["Pen", "Penalties taken", "Penalties he has taken."],
  penalties_scored: ["Pen G", "Penalties scored", "Penalties he has scored."],
  r_shot: ["SoT%", "Shots on target %", "Share of his shots that were on target."],
  r_conv: ["Conv%", "Conversion rate", "Share of his shots that went in."],
  r_xgs: ["xG/Sh", "xG per shot", "Average quality of his shots. Above about 0.15 means he mostly shoots from good positions."],
  // attacking
  dribbles: ["Drb", "Dribbles", "Times he took the ball past an opponent by dribbling."],
  fouls_against: ["Fld", "Fouled", "Times he was fouled (fouls won). Skilful dribblers and strong target men win a lot."],
  offsides: ["Off", "Offsides", "Times he was caught offside."],
  possession_lost: ["Poss L", "Possession lost", "Times he gave the ball away (bad pass, lost dribble, tackled). Fewer is better, but players who take risks lose it more."],
  // ability
  ca: ["CA", "Current ability", "FM's hidden overall rating of how good he is now, out of 200. The higher it is, the better his attributes overall."],
  pa: ["PA", "Potential ability", "The highest CA he can reach, out of 200. He only gets near it with game time, good training and good coaching."],
  // attributes (1-20)
  crossing: ["Cro", "Crossing", "How accurately he delivers crosses from wide areas."],
  dribbling: ["Dri", "Dribbling", "How well he runs with the ball and beats opponents."],
  finishing: ["Fin", "Finishing", "How well he puts his chances away."],
  heading: ["Hea", "Heading", "How accurately he directs headers, to score, pass or clear."],
  long_shots: ["Lon", "Long shots", "How good he is at shooting from outside the box."],
  marking: ["Mar", "Marking", "How well he picks up and sticks to an opponent when defending."],
  off_the_ball: ["OtB", "Off the ball", "His movement without the ball: finding space and making runs into good positions."],
  passing: ["Pas", "Passing", "How accurately he passes, short and long."],
  penalty_taking: ["Pen", "Penalty taking", "How good he is at taking penalties."],
  tackling: ["Tck", "Tackling", "How well he wins the ball in a tackle without fouling."],
  vision: ["Vis", "Vision", "How well he spots passes others don't, including the killer ball."],
  handling: ["Han", "Handling", "How securely a goalkeeper holds the ball when he catches it."],
  aerial_reach: ["Aer", "Aerial reach", "How high a goalkeeper can reach for crosses and high balls."],
  command_of_area: ["Cmd", "Command of area", "How confidently a goalkeeper takes charge of his box and comes for crosses."],
  communication: ["Com", "Communication", "How well a goalkeeper organises and talks to his defence."],
  kicking: ["Kic", "Kicking", "How far and accurately a goalkeeper kicks the ball."],
  throwing: ["Thr", "Throwing", "How far and accurately a goalkeeper throws the ball out."],
  anticipation: ["Ant", "Anticipation", "How well he reads the game and sees what will happen next."],
  decisions: ["Dec", "Decisions", "How often he makes the right choice, on and off the ball."],
  one_on_ones: ["1v1", "One on ones", "How good a goalkeeper is when a striker is through on goal."],
  positioning: ["Pos", "Positioning", "How well he takes up the right defensive position (for a keeper: where he stands for shots)."],
  reflexes: ["Ref", "Reflexes", "How quickly a goalkeeper reacts to shots, especially close range."],
  first_touch: ["Fir", "First touch", "How well he controls the ball when it comes to him."],
  technique: ["Tec", "Technique", "His overall skill and touch on the ball; makes hard things look easy."],
  flair: ["Fla", "Flair", "His creativity and willingness to try the unexpected."],
  corners: ["Cor", "Corners", "How well he takes corners."],
  teamwork: ["Tea", "Teamwork", "How well he follows tactical instructions and works for the team."],
  work_rate: ["Wor", "Work rate", "How hard he works and how much he runs in a match."],
  long_throws: ["L Th", "Long throws", "How far he can throw the ball from a throw-in."],
  eccentricity: ["Ecc", "Eccentricity", "How likely a goalkeeper is to do something unexpected, like dribbling out or leaving his goal."],
  rushing_out: ["TRO", "Rushing out (tendency)", "How often a goalkeeper rushes off his line to deal with balls in behind. A habit, not a skill."],
  punching: ["Pun", "Punching (tendency)", "How often a goalkeeper punches instead of catching. A habit: higher means he punches more."],
  acceleration: ["Acc", "Acceleration", "How quickly he reaches top speed."],
  free_kick_taking: ["Fre", "Free kick taking", "How well he takes free kicks, direct and crossed."],
  strength: ["Str", "Strength", "His physical strength in duels and when holding off opponents."],
  stamina: ["Sta", "Stamina", "How long he can keep going at a high level in a match."],
  pace: ["Pac", "Pace", "His top speed."],
  jumping_reach: ["Jum", "Jumping reach", "How high he can reach when he jumps."],
  leadership: ["Ldr", "Leadership", "How much he inspires and organises his team-mates."],
  balance: ["Bal", "Balance", "How well he stays on his feet when challenged or turning."],
  bravery: ["Bra", "Bravery", "How willing he is to put his body on the line in headers, blocks and tackles."],
  aggression: ["Agg", "Aggression", "How willing he is to get stuck in physically."],
  agility: ["Agi", "Agility", "How quickly he changes direction and moves his body."],
  natural_fitness: ["Nat", "Natural fitness", "How fit he stays and how fast he recovers; also slows his decline with age."],
  determination: ["Det", "Determination", "His will to succeed and keep going when things go wrong."],
  composure: ["Cmp", "Composure", "How calm he stays on the ball under pressure."],
  concentration: ["Cnt", "Concentration", "How well he stays focused for the whole match."],
  // hidden attributes (1-20)
  consistency: ["Cons", "Consistency", "Hidden. How often he plays to his ability; low means good games and bad games."],
  dirtiness: ["Dirt", "Dirtiness", "Hidden. How likely he is to commit cynical or dirty fouls. Lower is better."],
  important_matches: ["Imp M", "Important matches", "Hidden. How well he plays in big games: finals, derbies, title deciders."],
  injury_proneness: ["Inj Pr", "Injury proneness", "Hidden. How likely he is to get injured. Lower is better."],
  versatility: ["Vers", "Versatility", "Hidden. How easily he adapts to playing out of position."],
  // personality (1-20)
  adaptability: ["Adap", "Adaptability", "Personality. How quickly he settles at a new club or in a new country."],
  te_all: ["TE", "Tactical effectiveness (estimate)", "Scout Lab's estimate of how well he would carry out your loaded tactic, out of 100, modelled on FM27's breakdown: 45% Player Ability, 30% Tactical Understanding, 25% Buy-In. Not FM's own number, which isn't stored in a way Scout Lab can read yet."],
  te_ab: ["Abil", "Player Ability (estimate)", "60% his fit for his best slot in your tactic (role with and without the ball, as My tactic), 40% his ability (CA) against your XI's average. Low if he plays no position in your tactic."],
  te_und: ["Und", "Tactical Understanding (estimate)", "His tactical attributes (decisions, anticipation, teamwork, positioning, off the ball, vision, concentration), lowered the more of your 27 team instructions differ from default (complex tactics take longer to learn)."],
  te_buy: ["Buy", "Player Buy-In (estimate)", "Personality: professionalism, adaptability, temperament and determination. FM also counts managerial support and relationships, which a save doesn't expose."],
  te_slot: ["Slot", "Best slot in your tactic", "The position and role in your loaded tactic he fits best."],
  ambition: ["Amb", "Ambition", "Personality. How much he wants to reach the top; very ambitious players push for bigger clubs."],
  loyalty: ["Loy", "Loyalty", "Personality. How attached he gets to his club; loyal players rarely ask to leave."],
  pressure: ["Pres", "Pressure", "Personality. How well he copes with pressure and expectation."],
  professionalism: ["Prof", "Professionalism", "Personality. How seriously he takes training and his career; the biggest driver of a young player's development."],
  sportsmanship: ["Spor", "Sportsmanship", "Personality. How fairly he plays and behaves."],
  temperament: ["Temp", "Temperament", "Personality. How well he keeps his cool when provoked or when things go wrong."],
  controversy: ["Cont", "Controversy", "Personality. How likely he is to say or do controversial things in the media. Lower is better."],
};
// tooltip for a heading: full name, type, one or two sentences
function adTipHtml(c) {
  if (c.k === "s_all") { const names = adCatsOn().map(k => AD_CATS[k]); return `<b>Overall score</b><span class="adtipmeta">Score, 0–100</span>The average of his ${esc(names.join(", "))} scores: how he ranks on all the stat types you've ticked, from 100 (best in the save) down to 0. Needs ${(AD.minQ || AD_MIN_MINS).toLocaleString()}+ minutes (a quarter of a regular starter's for this period).`; }
  if (c.score) return `<b>${esc(c.full)}</b><span class="adtipmeta">${esc(AD_CATS[c.cat])} · Score, 0–100</span>${esc(c.desc)}`;
  const fmt = c.per90 ? "Per 90 minutes" : c.g === "pct" ? "Percentage / rate" : c.g === "tot" ? "Season total" : c.g === "attr" ? "Attribute, 1–20" : c.k === "ca" || c.k === "pa" ? "Ability, out of 200" : c.g === "hid" ? "Hidden, 1–20" : "Player info";
  return `<b>${esc(c.full + (c.per90 ? " per 90" : ""))}</b><span class="adtipmeta">${c.cat ? `${esc(AD_CATS[c.cat])} · ` : ""}${fmt}</span>${esc(c.desc)}${c.per90 ? " Shown per 90 minutes played, so players with different minutes compare fairly." : ""}`;
}
let adTipTimer = 0;
function showAdTip(th, autoHide) {
  const c = th && (AD.cols || []).find(x => x.k === th.dataset.k); if (!c) return;
  let tip = $("#adtip"); if (!tip) { tip = document.createElement("div"); tip.id = "adtip"; tip.setAttribute("role", "tooltip"); document.body.appendChild(tip); }
  tip.innerHTML = adTipHtml(c); tip.hidden = false; AD.tipK = c.k;
  const r = th.getBoundingClientRect(), w = Math.min(300, window.innerWidth - 16);
  tip.style.maxWidth = w + "px";
  const tw = tip.offsetWidth, tht = tip.offsetHeight;
  tip.style.left = Math.max(8, Math.min(window.innerWidth - tw - 8, r.left + r.width / 2 - tw / 2)) + "px";
  tip.style.top = (r.bottom + 6 + tht < window.innerHeight ? r.bottom + 6 : Math.max(8, r.top - tht - 6)) + "px";
  clearTimeout(adTipTimer); if (autoHide) adTipTimer = setTimeout(hideAdTip, 4500);
}
function hideAdTip() { clearTimeout(adTipTimer); AD.tipK = null; const t = $("#adtip"); if (t) t.hidden = true; }
let lastPointer = "mouse";
document.addEventListener("pointerdown", e => { lastPointer = e.pointerType || "mouse"; if (!e.target.closest || !e.target.closest("#adtip")) hideAdTip(); }, true);
// colour from bad (0) through average (.5) to good (1)
function adColor(x) {
  const t = Math.max(0, Math.min(1, x));
  const R = [230, 103, 103], Y = [226, 190, 60], Gn = [79, 194, 122];
  const [a, b, u] = t < .5 ? [R, Y, t / .5] : [Y, Gn, (t - .5) / .5];
  return `rgba(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)},.34)`;
}
const adScore = (v, t) => t[1] === t[0] ? (v >= t[1] ? 1 : 0) : (v - t[0]) / (t[1] - t[0]);
// columns for the current save and stats kind
function adColumns() {
  const kind = saveKind(), sel = seasonSel(), key = (SAVE && SAVE.id) + "|" + kind + "|" + sel + "|" + (AD_GROUPS.te && (S.adGroups || []).includes("te") ? teKey() : "");
  if (AD.cols && AD.key === key) return AD.cols;
  const T = SAVE, st = kind ? seasonStats(sel, kind) : null, row = st ? st.row : null, pc = savePos();
  const raw = f => { const c = st && st.cols[f]; return c ? i => { const r = row[i]; return r < 0 ? NaN : c[r]; } : null; };
  const minsF = raw("minutes") || (() => NaN);
  const mins = i => minsF(i);
  // minutes behind the detailed stats (seasons before the career may hold only the basics)
  const dmins = st && st.dmins ? i => { const r = row[i]; return r < 0 ? NaN : st.dmins[r]; } : mins;
  AD.src = st;
  const cols = [];
  const add = (k, l, g, t, f, extra) => cols.push(Object.assign({ k, l, g, t, f }, extra || {}));
  // info
  add("name", "Player", "info", "str", i => T.name[i], { w: 170, wn: 116, sticky: 1 });
  if (st) add("s_all", "Score", "score", "num", i => adAllScore()[i], { d: 0, w: 62, score: 1 });
  add("ca", "CA", "info", "num", i => T.ca[i], { d: 0, bench: "ca" });
  add("pa", "PA", "info", "num", i => T.pa[i] < 0 ? NaN : T.pa[i], { d: 0, bench: "pa" });
  add("club", "Club", "info", "str", st && st.clubOf ? i => { const r = row[i], k = r >= 0 ? st.clubOf[r] : -1; return k >= 0 ? T.clubs[k] : saveClub(i); } : saveClub, { w: 140, wn: 104, dk: st && st.clubOf ? "club_season" : "club" });
  add("pos", "Position", "info", "str", i => pc.str[i], { w: 120, wn: 100 });
  add("age", "Age", "info", "num", i => T.age[i] < 0 ? NaN : T.age[i], { d: 0 });
  add("value", "Value", "info", "num", i => T.value[i], { fmt: v => saveMoney(v), w: 74 });
  add("height", "Height", "info", "num", i => T.height[i] || NaN, { d: 0 });
  add("foot", "Foot", "info", "str", i => footTxt(T.feet[i * 2], T.feet[i * 2 + 1]), { w: 84 });
  if ((S.adGroups || []).includes("te")) teColumns(add); // tactical effectiveness right after the player info
  // playing time
  if (st) {
    const starts = raw("starts"), subs = raw("substitute_appearances");
    const gen = () => {
      add("mins", "Minutes", "tot", "num", mins, { d: 0, bench: "play", w: 70, dk: "minutes", cat: "gen" });
      add("apps", "Apps", "tot", "num", i => starts(i) + subs(i), { d: 0, bench: "play", play: 90, dk: "apps", cat: "gen" });
      add("starts", "Starts", "tot", "num", starts, { d: 0, bench: "play", play: 90, dk: "starts", cat: "gen" });
      add("avr", "Av Rat", "tot", "num", raw("average_rating"), { d: 2, bench: "avr", rate: 1, dk: "average_rating", cat: "gen" });
      if (st.seasons) add("seasons", "Seasons", "tot", "num", i => { const r = row[i]; return r < 0 ? NaN : st.seasons[r]; }, { d: 0, dk: "seasons", cat: "gen" });
    };
    const C = [ // field, label, bench, per-90 too
      ["goals", "Goals", "goals"], ["assists", "Assists", "assists"], ["expected_goals", "xG", "xg", 2], ["non_penalty_expected_goals", "NP-xG", "npxg", 2], ["expected_assists", "xA", "xa", 2],
      ["shots", "Shots", "shots"], ["shots_on_target", "On target", "sot"], ["shots_outside_box", "Shots out box", null], ["penalties_taken", "Pens", null], ["penalties_scored", "Pens scored", null],
      ["key_passes", "Key passes", "kp"], ["open_play_key_passes", "OP key passes", "opkp"], ["clear_cut_chances_created", "CCC", "ccc"], ["progressive_passes", "Prog passes", "prpas"],
      ["dribbles", "Dribbles", "drb"], ["passes_attempted", "Passes att", "pasa"], ["passes_completed", "Passes cmp", "pasc"],
      ["open_play_crosses_attempted", "OP crosses att", "opcrsa"], ["open_play_crosses_completed", "OP crosses cmp", "opcrsc"], ["crosses_attempted", "Crosses att", "crsa"], ["crosses_completed", "Crosses cmp", "crsc"],
      ["aerial_challenges_attempted", "Aerials att", "aera"], ["headers_won", "Headers won", "hdrs"], ["key_headers", "Key headers", "khdr"],
      ["tackles_attempted", "Tackles att", "tcka"], ["tackles_completed", "Tackles won", "tckc"], ["key_tackles", "Key tackles", "ktck"], ["interceptions", "Interceptions", "itc"],
      ["blocks", "Blocks", "blk"], ["shots_blocked", "Shots blocked", "shblk"], ["clearances", "Clearances", "clr"], ["possession_won", "Poss won", "pwon"], ["possession_lost", "Poss lost", "plost"],
      ["pressures_attempted", "Pressures att", "presa"], ["pressures_completed", "Pressures cmp", "presc"],
      ["high_intensity_sprints", "Sprints", "spr"], ["distance_km", "Distance km", "dist", 1], ["fouls_made", "Fouls", "fouls"], ["fouls_against", "Fouled", "fouled"], ["offsides", "Offsides", null],
      ["yellow_cards", "Yellows", "yel"], ["red_cards", "Reds", "red"], ["mistakes_leading_to_goal", "Errors to goal", "mlg"], ["player_of_the_match", "PoM", "pom"],
      ["goals_allowed", "Conceded", "conc"], ["clean_sheets", "Clean sheets", "cs"], ["expected_goals_prevented", "xG prevented", "xgp", 2],
      ["saves_held", "Saves held", "saves"], ["saves_parried", "Saves parried", "saves"], ["saves_tipped", "Saves tipped", "saves"], ["shots_on_target_faced", "SoT faced", null],
    ];
    const savesF = (() => { const a = raw("saves_held"), b = raw("saves_parried"), c = raw("saves_tipped"); return a && b && c ? i => a(i) + b(i) + c(i) : null; })();
    const list = C.map(([f, l, b, d]) => [f, l, b, d, raw(f)]).filter(x => x[4]);
    if (savesF) list.splice(list.findIndex(x => x[0] === "saves_held"), 0, ["saves", "Saves", "saves", 0, savesF]);
    const gF = raw("goals"), xgF = raw("expected_goals");
    const ratio = (k, l, a, b, bench, scale) => { const A = typeof a === "function" ? a : raw(a), B = typeof b === "function" ? b : raw(b); if (A && B) add(k, l, "pct", "num", i => { const y = B(i); return y > 0 ? A(i) / y * (scale || 100) : NaN; }, { d: scale === 1 ? 2 : 0, bench, rate: 1, suf: scale === 1 ? "" : "%", cat: AD_CAT_OF[k] }); };
    const R = [["r_sv", "Save %", savesF, "shots_on_target_faced", "svPct"], ["r_tck", "Tackles won %", "tackles_completed", "tackles_attempted", "tckPct"],
      ["r_hdr", "Headers won %", "headers_won", "aerial_challenges_attempted", "hdrPct"], ["r_pas", "Pass %", "passes_completed", "passes_attempted", "pasPct"],
      ["r_cr", "Cross %", "crosses_completed", "crosses_attempted", "crPct"], ["r_opcr", "OP cross %", "open_play_crosses_completed", "open_play_crosses_attempted", "crPct"],
      ["r_shot", "On target %", "shots_on_target", "shots", "shotPct"], ["r_conv", "Conversion %", "goals", "shots", "convPct"], ["r_xgs", "xG per shot", "expected_goals", "shots", "xgShot", 1]].filter(r => r[2]);
    // grouped by stat type; inside each type: season totals, then per 90, then percentages
    Object.keys(AD_CATS).forEach(cat => {
      add("s_" + cat, "Score", "score", "num", i => adScoreArr(cat)[i], { d: 0, cat, w: 58, score: 1 });
      if (cat === "gen") gen();
      const mine = list.filter(x => (AD_CAT_OF[x[0]] || "gen") === cat);
      mine.forEach(([f, l, b, d, F]) => {
        add("t_" + f, l, "tot", "num", F, { d: d || 0, bench: b, dk: f, cat });
        if (f === "expected_goals" && gF && xgF) add("t_xgop", "Goals − xG", "tot", "num", i => gF(i) - xgF(i), { d: 2, bench: "xgop", dk: "xgop", cat });
      });
      mine.forEach(([f, l, b, d, F]) => { if (/^penalties|shots_on_target_faced/.test(f)) return; const mm = BASIC_FIELDS.has(f) ? mins : dmins; add("p_" + f, l + " /90", "p90", "num", i => { const m = mm(i); return m > 0 ? F(i) * 90 / m : NaN; }, { d: 2, bench: b, per90: 1, dk: f, cat, minsF: mm }); });
      R.filter(r => AD_CAT_OF[r[0]] === cat).forEach(r => ratio(...r));
    });
  }
  // attributes and hidden
  ATTR_COLS.forEach(([l, a]) => add("a_" + a, l, "attr", "num", i => T.attrs[i * 52 + a], { d: 0, bench: "attr", w: 52, dk: FR.ATTRIBUTE_ORDER[a] }));
  PITCH_SPOTS.forEach(([code]) => { const k = FR.POSITION_CODES.indexOf(code); add("pr_" + code, POS_LABEL[code], "posr", "num", i => T.pos[i * 15 + k], { d: 0, bench: "posr", w: 50, dk: "pr_" + code }); });
  FR.ATTRIBUTE_ORDER.forEach((a, k) => { if (FR.ATTR_NAME[a]) return; add("h_" + a, a.replace(/_/g, " ").replace(/^./, c => c.toUpperCase()), "hid", "num", i => T.attrs[i * 52 + k], { d: 0, bench: /injury|dirtiness/.test(a) ? "attrInv" : "attr", w: 64, dk: a }); });
  FR.PERSONALITY_ORDER.forEach((a, k) => add("q_" + a, a.replace(/^./, c => c.toUpperCase()), "hid", "num", i => T.pers[i * 8 + k], { d: 0, bench: a === "controversy" ? "attrInv" : "attr", w: 64, dk: a }));
  // a regular starter's minutes so far: 85% of what the most-used players have (95th percentile)
  let starter = 2900, seasonMax = 3420;
  if (st) {
    const m = Array.from(st.cols.minutes || []).filter(v => v > 0).sort((a, b) => a - b);
    if (m.length > 20) { seasonMax = Math.max(270, m[Math.floor(m.length * .95)]); starter = Math.max(270, seasonMax * .85); }
  }
  cols.forEach(c => { c.mins = c.minsF || mins; const d = AD_DOC[c.dk || c.k]; c.ab = d ? d[0] : c.l; c.full = d ? d[1] : c.l; c.desc = d ? d[2] : ""; });
  AD.starter = starter; AD.seasonMax = seasonMax; AD.cols = cols; AD.key = key; AD.idx = null; AD.ranges = {}; AD.sc = {}; AD.scAll = null;
  // scores rank players with a fair sample: a quarter of a regular starter's minutes for the period (at least 300)
  AD.minQ = Math.max(AD_MIN_MINS, Math.round(starter * 0.25 / 10) * 10);
  cols.forEach(c => { if (!c.score) return; c.full = c.cat ? AD_CATS[c.cat] + " score" : "Overall score"; c.desc = c.cat ? adScoreDesc(c.cat) : "x"; });
  return cols;
}
// colour for one cell
function adCellColor(c, i, v) {
  if (!S.adColor || v !== v) return null;
  if (c.score) return adColor(v / 100);
  if (!c.bench) return null;
  const g = SAVE._pc.bench[i];
  if (c.bench === "play") { const full = c.play ? AD.seasonMax / c.play : AD.seasonMax; return adColor(adScore(v, [full * .15, full * .75])); }
  const t = benchFor(c.bench, g); if (!t) return null;
  const B = AD_BENCH[c.bench];
  if (B.all) return adColor(adScore(v, t));
  const m = c.mins(i);
  if (c.rate || B.pct) return m >= AD_MIN_MINS ? adColor(adScore(v, t)) : null;
  if (B.tot) return m > 0 ? adColor(adScore(v, [t[0] * AD.starter / 2900, t[1] * AD.starter / 2900])) : null;
  if (c.per90) return m >= AD_MIN_MINS ? adColor(adScore(v, t)) : null;
  // season total: volume against a regular starter's total; for "fewer is better" stats, judge the rate instead
  if (B.inv) return m >= AD_MIN_MINS ? adColor(adScore(v * 90 / m, t)) : null;
  if (!(m > 0)) return adColor(0);
  const k = AD.starter / 90;
  return adColor(adScore(v, [t[0] * k, t[1] * k]));
}
const adFmt = (c, v) => {
  if (c.t === "str") return v == null ? "" : esc(v);
  if (v !== v || v == null) return "";
  if (c.fmt) return c.fmt(v);
  return (c.d ? v.toFixed(c.d) : Math.round(v).toLocaleString()) + (c.suf || "");
};
// range of a column (per 90 and percentages: players with 300+ minutes), worked out once
function adRange(c) {
  if (c.score) return [0, 100];
  if (AD.ranges[c.k]) return AD.ranges[c.k];
  let lo = Infinity, hi = -Infinity;
  const n = SAVE.n, needMins = c.per90 || c.rate;
  for (let i = 0; i < n; i++) {
    if (!SAVE.name[i]) continue;
    if (needMins && !(c.mins(i) >= AD_MIN_MINS)) continue;
    const v = c.f(i); if (v !== v) continue;
    if (v < lo) lo = v; if (v > hi) hi = v;
  }
  return (AD.ranges[c.k] = lo === Infinity ? null : [lo, hi]);
}
