/* ===== Scoring model (hidden from the UI) =====
   Stats: each metric -> percentile within the pool (min minutes applied); category = weighted mean of metric percentiles;
          overall = weighted mean of category scores using the role's emphasis.
   Attributes: role score = weighted mean of 1-20 attributes. Weights = role key (3) / preferred (1.5) attributes
          + FM27 engine baseline, x FM27 engine multipliers (fm-arena FM27 attribute test). FM26 delta guide = support only. */

const POSITIONS = ["GK", "FB", "CB", "DM", "CM", "AM", "Wingers", "ST"];

// ---------- stat metrics ----------
// a: header aliases (short FM name + full tooltip name). tot: total-column aliases used to derive per 90 when the /90 column is missing.
// inv: lower is better.
const METRICS = {
  npxg90: { l: "NP-xG/90", a: ["NP-xG/90", "Non Penalty Expected Goals per 90", "npxG/90"], tot: ["NP-xG", "Non Penalty Expected Goals"] },
  xg90: { l: "xG/90", a: ["xG/90", "Expected Goals per 90 minutes"], tot: ["xG", "Expected Goals"] },
  gls90: { l: "Goals/90", a: ["Goals per 90 minutes", "Gls/90", "Goals/90"], tot: ["Gls", "Goals"] },
  npg90: { l: "Non-penalty goals/90", a: ["NPG/90", "Non Penalty Goals per 90"] },
  shot90: { l: "Shots/90", a: ["Shot/90", "Shots per 90 minutes", "Shots/90"], tot: ["Shots"] },
  sht90: { l: "On target/90", a: ["ShT/90", "Shots on Target per 90"], tot: ["ShT", "Shots on Target"] },
  obox90: { l: "Outside-box shots/90", a: ["Shots From Outside The Box Per 90 minutes"] },
  conv: { l: "Conversion %", a: ["Conv %", "Conversion Rate (%)", "Conversion Rate"] },
  shotpct: { l: "Shots on target %", a: ["Shot %", "Shots on Target Percentage"] },
  xgop90: { l: "xG overperf/90", a: ["xG-OP/90"], tot: ["xG-OP", "Expected Goals Overperformance"] },
  xa90: { l: "xA/90", a: ["xA/90", "Expected Assists per 90 minutes"], tot: ["xA", "Expected Assists"] },
  kp90: { l: "Key passes/90", a: ["KP/90", "Key Passes per 90"], tot: ["K Ps", "Key Passes", "Key"] },
  opkp90: { l: "Open-play key passes/90", a: ["OP-KP/90", "Open Play Key Passes per 90"], tot: ["OP-KP"] },
  chc90: { l: "Chances created/90", a: ["Ch C/90", "Chances Created per 90"], tot: ["Ch C", "Chances Created"] },
  ast90: { l: "Assists/90", a: ["Asts/90", "Assists per 90 minutes"], tot: ["Ast", "Assists"] },
  ccc90: { l: "Clear-cut chances/90", a: ["CCC/90"], tot: ["CCC", "Clear Cut Chances Created"] },
  prp90: { l: "Progressive passes/90", a: ["Pr passes/90", "Progressive Passes per 90"], tot: ["Pr Passes", "Progressive Passes", "PsP"] },
  drb90: { l: "Dribbles/90", a: ["Drb/90", "Dribbles per 90"], tot: ["Drb", "Dribbles"] },
  psc90: { l: "Passes completed/90", a: ["Ps C/90", "Passes Completed per 90"], tot: ["Ps C", "Passes Completed"] },
  psa90: { l: "Passes attempted/90", a: ["Ps A/90", "Passes Attempted per 90"], tot: ["Pas A", "Passes Attempted"] },
  pas: { l: "Pass %", a: ["Pas %", "Pass Completion Percentage", "Pass Completion Ratio"] },
  plost90: { l: "Possession lost/90", a: ["Poss Lost/90", "Possession Lost per 90"], inv: true },
  opcrc90: { l: "Open-play crosses done/90", a: ["OP-Crs C/90", "Open Play Crosses Completed per 90"], tot: ["OP-Crs C", "Open Play Crosses Completed"] },
  opcra90: { l: "Open-play crosses tried/90", a: ["OP-Crs A/90", "Open Play Crosses Attempted per 90"], tot: ["OP-Crs A", "Open Play Crosses Attempted"] },
  cra90: { l: "Crosses tried/90", a: ["Crs A/90", "Crosses Attempted per 90"], tot: ["Cr A", "Crosses Attempted"] },
  crc90: { l: "Crosses done/90", a: ["Cr C/90", "Crosses Completed per 90"], tot: ["Cr C", "Crosses Completed"] },
  opcrpct: { l: "Open-play cross %", a: ["OP-Cr %", "Open Play Cross Completion Percentage"] },
  crca: { l: "Cross completion", a: ["Cr C/A", "Crosses Completed Ratio"] },
  aera90: { l: "Headers tried/90", a: ["Aer A/90", "Headers Attempted per 90"], tot: ["Hdrs A", "Headers Attempted"] },
  hdrw90: { l: "Headers won/90", a: ["Hdrs W/90", "Headers Won per 90"], tot: ["Hdrs", "Headers Won"] },
  hdrpct: { l: "Header win %", a: ["Hdr %", "Headers Won Percentage"] },
  khdr90: { l: "Key headers/90", a: ["K Hdrs/90", "Key Headers per 90"] },
  hdrl90: { l: "Headers lost/90", a: ["Hdrs L/90", "Headers Lost per 90"], inv: true },
  tck90: { l: "Tackles won/90", a: ["Tck/90", "Tackles Completed per 90"], tot: ["Tck W", "Tackles Won", "Tackled Completed", "Tackles Completed", "Tck C"] },
  ktck90: { l: "Key tackles/90", a: ["K Tck/90", "Key Tackles per 90"] },
  tckr: { l: "Tackle win %", a: ["Tck R", "Tackle Completion Percentage", "Tackle Ratio"] },
  int90: { l: "Interceptions/90", a: ["Int/90", "Interceptions per 90"], tot: ["Itc", "Interceptions"] },
  blk90: { l: "Blocks/90", a: ["Blk/90", "Blocks per 90"], tot: ["Blk", "Blocks"] },
  shblk90: { l: "Shots blocked/90", a: ["Shts Blckd/90", "Shots Blocked per 90"], tot: ["Shts Blckd", "Shots Blocked"] },
  clr90: { l: "Clearances/90", a: ["Clr/90", "Clearances per 90"], tot: ["Clear", "Clearances"] },
  pwon90: { l: "Possession won/90", a: ["Poss Won/90", "Possession Won per 90"] },
  presa90: { l: "Pressures tried/90", a: ["Pres A/90", "Pressures Attempted per 90"], tot: ["Pres A"] },
  presc90: { l: "Pressures won/90", a: ["Pres C/90", "Pressures Completed per 90"], tot: ["Pres C"] },
  spr90: { l: "Sprints/90", a: ["Sprints/90", "High Intensity Sprints per 90 minutes"], tot: ["Sprints"] },
  dist90: { l: "Distance/90 (km)", a: ["Dist/90", "Distance Covered per 90 Minutes"], tot: ["Distance", "Distance Covered"] },
  mlg90: { l: "Errors to goal/90", a: ["MLG/90"], tot: ["MLG", "Mistakes Leading to Goals"], inv: true },
  yel90: { l: "Yellows/90", a: ["Yel/90"], tot: ["Yel", "Yellow Cards"], inv: true },
  red90: { l: "Reds/90", a: ["Red/90"], tot: ["Red", "Red Cards", "Red (cards)"], inv: true },
  rating: { l: "Avg rating", a: ["Rating", "Average Rating", "Av Rat", "Average Rating Club", "Avg.", "Avg"] },
  xgshot: { l: "xG per shot", a: ["xG/shot", "xG per shot", "Expected Goals per Shot"] },
  xsvpct: { l: "Expected save %", a: ["xSv %", "Expected Save Percentage"] },
  // goalkeeping (columns not in the current view yet; recognised when added)
  xgp90: { l: "xG prevented/90", a: ["xGP/90", "Expected Goals Prevented per 90", "xG Prevented per 90"], tot: ["xGP", "Expected Goals Prevented"] },
  svpct: { l: "Save %", a: ["Sv %", "Save Percentage", "Saves Percentage"] },
  sv90: { l: "Saves/90", a: ["Svt/90", "Saves/90", "Saves per 90", "Saves Per 90 Minutes"] },
  conc90: { l: "Conceded/90", a: ["Conc/90", "Con/90", "Conceded per 90 minutes", "Goals Conceded per 90", "Goals Conceded Per 90 Minutes"], tot: ["Conc", "Goals Conceded"], inv: true },
  cs90: { l: "Clean sheets/90", a: ["Cln/90", "Clean Sheets/90", "Clean sheets per 90", "Clean Sheets per 90 minutes"], tot: ["Clean Sheets", "Shutouts"] },
  // context (shown and plottable, not scored)
  tgls90: { l: "Team goals/90 (with him)", a: ["Tgls/90", "Team Goals per 90 Minutes"] },
  tcon90: { l: "Team conceded/90 (with him)", a: ["Tcon/90", "Team Goals Conceded per 90 minutes"], inv: true },
  winpct: { l: "Game win %", a: ["Game Win Ratio"] },
  ppg: { l: "Points per game", a: ["Pts/Gm", "Points Won Per Game"] },
  fwon90: { l: "Fouls won/90", a: ["Fouls Against/90"], tot: ["Fouls Against"] },
  fmade90: { l: "Fouls made/90", a: ["Fouls Made/90"], tot: ["Fouls", "Fouls Made"], inv: true },
};

// ---------- stat categories ----------
const CATS = {
  goal: { l: "Goal threat", m: { npxg90: 3, shot90: 1, sht90: 1.5 } },
  output: { l: "Goals & assists", m: { gls90: 1, npg90: 1, ast90: 1 } },
  finish: { l: "Finishing", m: { xgop90: 2, conv: 1, shotpct: 1, xgshot: 1 } },
  create: { l: "Chance creation", m: { xa90: 3, opkp90: 2, ccc90: 2, chc90: 1.5, kp90: 1 } },
  prog: { l: "Progression", m: { prp90: 3, drb90: 1.5 } },
  dribble: { l: "Dribbling", m: { drb90: 1 } },
  retain: { l: "Ball retention", m: { pas: 2, plost90: 2, psc90: 1.5 } },
  cross: { l: "Crossing", m: { opcrc90: 2, opcrpct: 1.5, crc90: 1, cra90: 0.5 } },
  aerial: { l: "Aerial", m: { hdrw90: 2.5, hdrpct: 2, khdr90: 1, hdrl90: 0.5 } },
  defend: { l: "Defending", m: { int90: 2.5, tck90: 2, ktck90: 1, tckr: 1, blk90: 1 } },
  clear: { l: "Clearance", m: { clr90: 3, shblk90: 1.5, blk90: 1, hdrw90: 1 } },
  press: { l: "Ball winning", m: { pwon90: 3, presc90: 2, presa90: 1 } },
  work: { l: "Running", m: { spr90: 2, dist90: 1.5 } },
  disc: { l: "Discipline", m: { mlg90: 2, yel90: 1, red90: 1 } },
  gkstop: { l: "Shot stopping", m: { xgp90: 3, svpct: 2, sv90: 0.5, conc90: 1, cs90: 1 } },
  gkdist: { l: "Distribution", m: { pas: 2, psc90: 1.5, prp90: 1 } },
};

const POS_CATS = {
  GK: ["gkstop", "gkdist", "aerial", "disc"],
  CB: ["defend", "aerial", "clear", "press", "retain", "prog", "disc"],
  FB: ["defend", "press", "cross", "prog", "create", "output", "work", "retain"],
  DM: ["press", "defend", "prog", "retain", "aerial", "work", "disc"],
  CM: ["prog", "create", "retain", "press", "defend", "goal", "output", "work"],
  AM: ["create", "goal", "output", "prog", "dribble", "retain", "press", "work"],
  Wingers: ["create", "goal", "output", "dribble", "cross", "work", "prog", "press"],
  ST: ["goal", "output", "finish", "create", "aerial", "press", "dribble", "retain", "work"],
};

// ---------- attributes ----------
const ATTRS = {
  technical: ["Corners", "Crossing", "Dribbling", "Finishing", "First Touch", "Free Kick Taking", "Heading", "Long Shots", "Long Throws", "Marking", "Passing", "Penalty Taking", "Tackling", "Technique"],
  mental: ["Aggression", "Anticipation", "Bravery", "Composure", "Concentration", "Decisions", "Determination", "Flair", "Leadership", "Off The Ball", "Positioning", "Teamwork", "Vision", "Work Rate"],
  physical: ["Acceleration", "Agility", "Balance", "Jumping Reach", "Natural Fitness", "Pace", "Stamina", "Strength"],
  goalkeeping: ["Aerial Reach", "Command Of Area", "Communication", "Eccentricity", "Handling", "Kicking", "One On Ones", "Punching (Tendency)", "Reflexes", "Rushing Out (Tendency)", "Throwing"],
};
const ATTR_SHORT = {
  Cor: "Corners", Cro: "Crossing", Dri: "Dribbling", Fin: "Finishing", Fir: "First Touch", Fre: "Free Kick Taking", Hea: "Heading",
  Lon: "Long Shots", "L Th": "Long Throws", Mar: "Marking", Pen: "Penalty Taking", Tck: "Tackling", Tec: "Technique",
  Agg: "Aggression", Ant: "Anticipation", Bra: "Bravery", Cmp: "Composure", Cnt: "Concentration", Dec: "Decisions", Det: "Determination",
  Fla: "Flair", Ldr: "Leadership", OtB: "Off The Ball", Tea: "Teamwork", "Team Work": "Teamwork", Vis: "Vision", Wor: "Work Rate",
  Acc: "Acceleration", Agi: "Agility", Bal: "Balance", Jum: "Jumping Reach", Nat: "Natural Fitness", Pac: "Pace", Sta: "Stamina", Str: "Strength",
  Aer: "Aerial Reach", Cmd: "Command Of Area", Com: "Communication", Ecc: "Eccentricity", Han: "Handling", Kic: "Kicking",
  "1v1": "One On Ones", Pun: "Punching (Tendency)", Ref: "Reflexes", TRO: "Rushing Out (Tendency)", "Rushing Out": "Rushing Out (Tendency)",
  Punching: "Punching (Tendency)", Thr: "Throwing",
};

// FM27 engine (fm-arena FM27 attribute test): tier 1 Acc/Pace, tier 2 JR/WR/Stamina, tier 3 Anticipation/Strength,
// tier 4 Finishing/Determination/Concentration/Dribbling. Nerfed: Agility, Aggression, Composure (to < 1/4), Balance/Long Shots (~1/2).
const FM27_MULT = {
  Acceleration: 1.5, Pace: 1.5, "Jumping Reach": 1.35, "Work Rate": 1.35, Stamina: 1.35, Anticipation: 1.2, Strength: 1.2,
  Determination: 1.1, Finishing: 1.0, Concentration: 1.0, Dribbling: 1.0,
  Agility: 0.6, Aggression: 0.6, Composure: 0.6, Balance: 0.75, "Long Shots": 0.75,
};
const FM27_BASE = { Acceleration: 1, Pace: 1, "Jumping Reach": 0.75, "Work Rate": 0.75, Stamina: 0.75, Anticipation: 0.5, Strength: 0.5, Determination: 0.3 };

// attribute clusters (shown as chips / table columns in the Attributes view)
const ACL = {
  engine27: { l: "FM27 engine", m: { Acceleration: 4, Pace: 4, "Jumping Reach": 3, "Work Rate": 3, Stamina: 3, Anticipation: 2, Strength: 2, Determination: 1, Concentration: 1 } },
  speed: { l: "Speed", m: { Acceleration: 3, Pace: 3, Agility: 1 } },
  stamina: { l: "Engine", m: { Stamina: 3, "Work Rate": 3, "Natural Fitness": 1.5, Teamwork: 1 } },
  aerial: { l: "Aerial", m: { "Jumping Reach": 3, Heading: 2.5, Strength: 1.5, Bravery: 1 } },
  finishing: { l: "Finishing", m: { Finishing: 3, "Off The Ball": 2, Composure: 1.5, Anticipation: 1.5, Determination: 1 } },
  creativity: { l: "Creativity", m: { Vision: 3, Passing: 2, Technique: 2, Flair: 1.5, Decisions: 1 } },
  passing: { l: "Passing", m: { Passing: 3, "First Touch": 2, Technique: 1.5, Decisions: 1.5, Composure: 1, Teamwork: 1 } },
  carrying: { l: "Carrying", m: { Dribbling: 3, Acceleration: 1.5, Agility: 1, Balance: 1, Technique: 1, Flair: 1 } },
  crossing: { l: "Crossing", m: { Crossing: 3, Technique: 1.5, "Off The Ball": 1, Decisions: 1 } },
  defending: { l: "Defending", m: { Positioning: 3, Tackling: 2.5, Marking: 2.5, Anticipation: 2, Concentration: 2, Decisions: 1 } },
  pressing: { l: "Pressing", m: { "Work Rate": 3, Stamina: 2, Aggression: 1.5, Teamwork: 1.5, Acceleration: 1.5, Bravery: 1 } },
  mentality: { l: "Mentality", m: { Determination: 2, Composure: 1.5, Concentration: 1.5, Decisions: 1.5, Bravery: 1, Teamwork: 1, Leadership: 0.5 } },
  gkstop: { l: "Shot stopping", m: { Reflexes: 3, "One On Ones": 2.5, Handling: 2, Agility: 1.5, Positioning: 1.5 } },
  gkcommand: { l: "Command", m: { "Command Of Area": 3, "Aerial Reach": 3, Communication: 2, "Jumping Reach": 1.5, Bravery: 1 } },
  gkdist: { l: "Distribution", m: { Kicking: 3, Passing: 2, Throwing: 1.5, Vision: 1.5, Composure: 1.5, "First Touch": 1 } },
  gksweep: { l: "Sweeping", m: { "Rushing Out (Tendency)": 3, Anticipation: 2, Acceleration: 2, Pace: 1.5, Decisions: 1.5 } },
};
const POS_ACL = {
  GK: ["gkstop", "gkcommand", "gkdist", "gksweep", "mentality"],
  CB: ["defending", "aerial", "speed", "passing", "mentality", "engine27"],
  FB: ["defending", "speed", "stamina", "crossing", "carrying", "passing", "engine27"],
  DM: ["defending", "pressing", "passing", "stamina", "mentality", "speed", "engine27"],
  CM: ["passing", "creativity", "stamina", "carrying", "defending", "finishing", "engine27"],
  AM: ["creativity", "passing", "carrying", "finishing", "speed", "stamina", "engine27"],
  Wingers: ["speed", "carrying", "creativity", "crossing", "finishing", "stamina", "engine27"],
  ST: ["finishing", "aerial", "speed", "passing", "carrying", "pressing", "engine27"],
};

