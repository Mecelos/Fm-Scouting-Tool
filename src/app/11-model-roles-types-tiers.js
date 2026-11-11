// ---------- roles (FM26 in-possession roles; unchanged in FM27) ----------
// sw: stat-category emphasis. k: key attributes (x3). p: preferred attributes (x1.5).
const R = (sw, k, p) => ({ sw, k, p });
const ROLES = {
  GK: {
    "Balanced": R({ gkstop: 3, gkdist: 1, aerial: 1, disc: 0.5 }, ["Reflexes", "One On Ones", "Command Of Area", "Handling", "Agility"], ["Bravery", "Positioning", "Concentration", "Aerial Reach"]),
    "Goalkeeper": R({ gkstop: 3, aerial: 1, gkdist: 0.5, disc: 0.5 }, ["Reflexes", "Handling", "One On Ones", "Positioning", "Concentration", "Aerial Reach", "Command Of Area"], ["Agility", "Communication", "Kicking", "Decisions", "Anticipation"]),
    "Ball-Playing GK": R({ gkstop: 2.5, gkdist: 2, disc: 0.5 }, ["Reflexes", "Handling", "Passing", "Kicking", "Composure", "Vision", "Positioning"], ["First Touch", "Decisions", "One On Ones", "Concentration"]),
    "No-Nonsense GK": R({ gkstop: 3, aerial: 1.5, disc: 0.5 }, ["Reflexes", "Handling", "Aerial Reach", "Command Of Area", "Positioning", "Kicking"], ["Bravery", "Strength", "Jumping Reach", "Concentration"]),
  },
  CB: {
    "Balanced": R({ defend: 3, aerial: 2.5, clear: 1.5, press: 1, retain: 1, prog: 0.5, disc: 1 }, ["Jumping Reach", "Pace", "Strength", "Positioning", "Balance"], ["Heading", "Marking", "Tackling", "Anticipation", "Concentration"]),
    "Centre-Back": R({ defend: 3, aerial: 2.5, clear: 1.5, press: 1, retain: 1, disc: 1 }, ["Heading", "Marking", "Positioning", "Tackling", "Jumping Reach", "Strength", "Anticipation"], ["Concentration", "Decisions", "Composure", "Pace", "Bravery"]),
    "Ball-Playing CB": R({ defend: 2.5, aerial: 2, retain: 2, prog: 2, clear: 0.5, disc: 1 }, ["Heading", "Marking", "Tackling", "Passing", "Positioning", "Composure", "Jumping Reach"], ["First Touch", "Technique", "Vision", "Decisions", "Anticipation", "Strength"]),
    "No-Nonsense CB": R({ aerial: 3, clear: 3, defend: 2.5, press: 1, disc: 1 }, ["Heading", "Marking", "Tackling", "Positioning", "Strength", "Jumping Reach"], ["Bravery", "Aggression", "Concentration", "Anticipation"]),
    "Advanced CB": R({ prog: 3, retain: 2.5, defend: 2, press: 1, aerial: 1 }, ["Passing", "First Touch", "Composure", "Decisions", "Tackling", "Positioning"], ["Vision", "Technique", "Anticipation", "Marking", "Teamwork", "Stamina"]),
    "Overlapping CB": R({ defend: 2.5, prog: 2, aerial: 1.5, press: 1, retain: 1 }, ["Tackling", "Marking", "Positioning", "Pace", "Stamina", "Dribbling"], ["Passing", "Crossing", "Off The Ball", "Acceleration", "Work Rate"]),
    "Wide CB": R({ defend: 3, aerial: 2, prog: 1.5, press: 1, retain: 1 }, ["Tackling", "Marking", "Positioning", "Heading", "Pace"], ["Passing", "Dribbling", "Stamina", "Acceleration", "Work Rate", "Anticipation"]),
  },
  FB: {
    "Balanced": R({ defend: 2.5, press: 1.5, cross: 1.5, prog: 1.5, create: 1, work: 1, retain: 1 }, ["Acceleration", "Pace", "Balance", "Anticipation", "Tackling"], ["Marking", "Positioning", "Stamina", "Work Rate", "Crossing", "Off The Ball"]),
    "Full-Back": R({ defend: 3, press: 1.5, cross: 1, prog: 1, retain: 1, work: 1 }, ["Tackling", "Marking", "Positioning", "Anticipation", "Concentration", "Teamwork"], ["Crossing", "Passing", "Pace", "Stamina", "Work Rate", "Decisions"]),
    "Inside Full-Back": R({ defend: 3, aerial: 2, clear: 1.5, retain: 1.5 }, ["Tackling", "Marking", "Positioning", "Strength", "Heading", "Composure"], ["Passing", "Anticipation", "Concentration", "Jumping Reach", "Pace"]),
    "Inverted Full-Back": R({ retain: 2.5, prog: 2.5, defend: 2, press: 1 }, ["Passing", "Tackling", "Positioning", "Decisions", "Composure", "First Touch"], ["Technique", "Vision", "Teamwork", "Anticipation", "Marking"]),
    "Wing-Back": R({ cross: 2.5, prog: 2, work: 2, defend: 1.5, create: 1.5, press: 1 }, ["Crossing", "Dribbling", "Tackling", "Off The Ball", "Stamina", "Work Rate", "Teamwork", "Acceleration"], ["Pace", "Passing", "Technique", "Marking", "Positioning", "Anticipation", "Decisions"]),
    "Inside Wing-Back": R({ prog: 2.5, create: 2, retain: 1.5, work: 1.5, defend: 1 }, ["Passing", "Dribbling", "Off The Ball", "Stamina", "Work Rate", "Decisions"], ["Technique", "Vision", "Tackling", "First Touch", "Acceleration"]),
    "Inverted Wing-Back": R({ prog: 2.5, retain: 2.5, create: 1.5, defend: 1.5, work: 1 }, ["Passing", "First Touch", "Technique", "Decisions", "Composure", "Teamwork", "Stamina"], ["Vision", "Dribbling", "Tackling", "Anticipation", "Work Rate", "Acceleration"]),
    "Playmaking Wing-Back": R({ create: 3, prog: 2.5, retain: 2, cross: 1, defend: 1 }, ["Passing", "Vision", "Technique", "First Touch", "Decisions", "Teamwork"], ["Dribbling", "Crossing", "Composure", "Stamina", "Off The Ball"]),
    "Advanced Wing-Back": R({ cross: 2.5, create: 2.5, dribble: 2, work: 2, prog: 1.5, defend: 0.5 }, ["Crossing", "Dribbling", "Technique", "Off The Ball", "Acceleration", "Pace", "Stamina", "Work Rate"], ["Flair", "First Touch", "Passing", "Agility", "Balance", "Teamwork", "Tackling"]),
  },
  DM: {
    "Balanced": R({ press: 3, defend: 2.5, prog: 1.5, retain: 1.5, aerial: 0.5, work: 1, disc: 1 }, ["Tackling", "Aggression", "Acceleration", "Pace", "Strength"], ["Positioning", "Anticipation", "Work Rate", "Stamina", "Passing"]),
    "Defensive Midfielder": R({ press: 3, defend: 3, retain: 1.5, prog: 1, work: 1, disc: 1 }, ["Tackling", "Positioning", "Anticipation", "Concentration", "Teamwork", "Marking"], ["Passing", "Decisions", "Composure", "Work Rate", "Stamina", "Strength", "Aggression"]),
    "Deep-Lying Playmaker": R({ prog: 3, retain: 3, create: 1.5, press: 1, defend: 1 }, ["Passing", "First Touch", "Technique", "Vision", "Composure", "Decisions", "Teamwork"], ["Anticipation", "Positioning", "Balance", "Off The Ball"]),
    "Half-Back": R({ defend: 3, aerial: 2, retain: 2, press: 1.5, clear: 1, disc: 1 }, ["Marking", "Tackling", "Positioning", "Anticipation", "Concentration", "Composure", "Decisions"], ["Heading", "Passing", "Strength", "Jumping Reach", "Teamwork", "Bravery"]),
    // FM27: the box-to-box roles are picked from the DM position
    "Box-to-Box Midfielder": R({ work: 2.5, press: 2, prog: 2, defend: 1.5, goal: 1.5, create: 1 }, ["Passing", "Tackling", "Off The Ball", "Stamina", "Work Rate", "Teamwork"], ["Dribbling", "First Touch", "Long Shots", "Anticipation", "Decisions", "Positioning", "Acceleration", "Pace", "Strength", "Determination"]),
    "Box-to-Box Playmaker": R({ prog: 3, create: 2, work: 2, retain: 1.5, press: 1 }, ["Passing", "First Touch", "Technique", "Vision", "Decisions", "Stamina", "Work Rate", "Off The Ball"], ["Dribbling", "Composure", "Anticipation", "Tackling", "Teamwork", "Acceleration", "Flair"]),
  },
  CM: {
    "Balanced": R({ prog: 2, create: 2, retain: 2, press: 1.5, defend: 1.5, goal: 1, work: 1 }, ["Passing", "Technique", "Vision", "Off The Ball", "Tackling"], ["First Touch", "Decisions", "Work Rate", "Stamina", "Acceleration", "Pace"]),
    "Central Midfielder": R({ retain: 2.5, prog: 2, press: 1.5, defend: 1.5, create: 1, work: 1 }, ["Passing", "First Touch", "Decisions", "Teamwork", "Tackling"], ["Technique", "Vision", "Anticipation", "Composure", "Work Rate", "Stamina", "Positioning", "Off The Ball"]),
    "Channel Midfielder": R({ create: 2.5, dribble: 2, work: 2, prog: 1.5, goal: 1.5, cross: 1 }, ["Off The Ball", "Anticipation", "Decisions", "Work Rate", "Stamina", "Acceleration"], ["Dribbling", "Passing", "Technique", "First Touch", "Pace", "Finishing", "Composure"]),
    "Midfield Playmaker": R({ prog: 3, retain: 3, create: 2, press: 0.5 }, ["Passing", "First Touch", "Technique", "Vision", "Decisions", "Composure", "Teamwork"], ["Off The Ball", "Anticipation", "Flair", "Dribbling", "Balance"]),
    "Wide Central Midfielder": R({ retain: 2.5, prog: 2, create: 2, press: 1.5, work: 1 }, ["Passing", "First Touch", "Decisions", "Teamwork", "Technique", "Vision"], ["Tackling", "Work Rate", "Stamina", "Off The Ball", "Composure"]),
    "Attacking Midfielder": R({ create: 3, goal: 2.5, dribble: 1.5, prog: 1, finish: 1 }, ["First Touch", "Passing", "Technique", "Off The Ball", "Decisions", "Vision", "Flair"], ["Dribbling", "Long Shots", "Finishing", "Anticipation", "Composure", "Acceleration", "Agility"]),
    "Advanced Playmaker": R({ create: 3, prog: 2.5, retain: 2, dribble: 1 }, ["First Touch", "Passing", "Technique", "Vision", "Composure", "Decisions", "Off The Ball", "Teamwork"], ["Dribbling", "Flair", "Anticipation", "Agility"]),
  },
  // attacking midfield (AM C): the number 10s, judged on chances, goals and carrying rather than on deep midfield work
  AM: {
    "Balanced": R({ create: 3, goal: 2, prog: 1.5, dribble: 1.5, retain: 1, press: 0.5, work: 0.5 }, ["First Touch", "Passing", "Technique", "Vision", "Off The Ball", "Decisions"], ["Dribbling", "Flair", "Composure", "Anticipation", "Long Shots", "Acceleration", "Agility"]),
    "Attacking Midfielder": R({ create: 3, goal: 2.5, dribble: 1.5, prog: 1, finish: 1 }, ["First Touch", "Passing", "Technique", "Off The Ball", "Decisions", "Vision", "Flair"], ["Dribbling", "Long Shots", "Finishing", "Anticipation", "Composure", "Acceleration", "Agility"]),
    "Advanced Playmaker": R({ create: 3, prog: 2.5, retain: 2, dribble: 1 }, ["First Touch", "Passing", "Technique", "Vision", "Composure", "Decisions", "Off The Ball", "Teamwork"], ["Dribbling", "Flair", "Anticipation", "Agility"]),
    "Free Role": R({ create: 3, dribble: 2, goal: 2, prog: 1.5 }, ["Passing", "Technique", "First Touch", "Vision", "Flair", "Off The Ball", "Decisions", "Dribbling"], ["Composure", "Anticipation", "Agility", "Acceleration", "Long Shots", "Finishing"]),
    "Second Striker": R({ goal: 2.5, create: 1.5, press: 1, finish: 1, work: 1 }, ["Finishing", "First Touch", "Off The Ball", "Anticipation", "Composure", "Acceleration", "Work Rate"], ["Dribbling", "Passing", "Technique", "Decisions", "Concentration", "Pace", "Stamina", "Balance", "Agility"]),
    "Channel Midfielder": R({ create: 2.5, dribble: 2, work: 2, prog: 1.5, goal: 1.5, cross: 1 }, ["Off The Ball", "Anticipation", "Decisions", "Work Rate", "Stamina", "Acceleration"], ["Dribbling", "Passing", "Technique", "First Touch", "Pace", "Finishing", "Composure"]),
  },
  Wingers: {
    "Balanced": R({ create: 2.5, dribble: 2, goal: 1.5, cross: 1.5, work: 1.5, prog: 1, press: 0.5 }, ["Dribbling", "Decisions", "Off The Ball", "Acceleration", "Pace"], ["Finishing", "Composure", "Technique", "Stamina", "Work Rate"]),
    "Winger": R({ cross: 3, dribble: 2, create: 2, work: 1.5, prog: 1 }, ["Crossing", "Dribbling", "Technique", "Acceleration", "Agility", "Off The Ball"], ["First Touch", "Passing", "Work Rate", "Pace", "Stamina", "Flair"]),
    "Half-Space Winger": R({ create: 2.5, dribble: 2, goal: 2, prog: 1.5, work: 1 }, ["Dribbling", "Passing", "Technique", "Off The Ball", "Acceleration", "Decisions"], ["Vision", "First Touch", "Flair", "Agility", "Composure", "Finishing"]),
    "Inside Winger": R({ create: 3, dribble: 2, prog: 1.5, goal: 1.5, cross: 1 }, ["Dribbling", "Passing", "Technique", "Vision", "Acceleration", "Off The Ball"], ["Crossing", "First Touch", "Flair", "Agility", "Long Shots", "Decisions"]),
    "Playmaking Winger": R({ create: 3, prog: 2, retain: 1.5, cross: 1, dribble: 1 }, ["Passing", "Vision", "Technique", "First Touch", "Decisions", "Dribbling", "Crossing", "Off The Ball"], ["Composure", "Teamwork", "Agility", "Flair"]),
    "Wide Forward": R({ goal: 3, dribble: 2, finish: 1.5, create: 1, work: 1 }, ["Finishing", "Off The Ball", "Dribbling", "Acceleration", "Pace", "Composure"], ["Crossing", "First Touch", "Technique", "Anticipation", "Agility", "Work Rate"]),
    "Inside Forward": R({ goal: 3, dribble: 2, finish: 1.5, create: 1.5, work: 1 }, ["Dribbling", "Finishing", "First Touch", "Technique", "Off The Ball", "Acceleration", "Agility", "Anticipation", "Composure"], ["Long Shots", "Passing", "Flair", "Pace", "Balance", "Work Rate"]),
    "Wide Midfielder": R({ cross: 2, press: 2, work: 2, create: 1.5, defend: 1.5, retain: 1 }, ["Passing", "Crossing", "Tackling", "Decisions", "Teamwork", "Work Rate", "Stamina"], ["First Touch", "Technique", "Off The Ball", "Vision", "Positioning", "Concentration"]),
  },
  ST: {
    "Balanced": R({ goal: 3, finish: 1.5, create: 1.5, aerial: 1, press: 1, dribble: 0.5, retain: 0.5, work: 0.5 }, ["Finishing", "Determination", "Off The Ball", "Acceleration", "Jumping Reach"], ["Pace", "Anticipation", "Composure", "Heading", "First Touch"]),
    "Centre Forward": R({ goal: 3, finish: 1.5, aerial: 1.5, create: 1, retain: 1, press: 0.5 }, ["Finishing", "First Touch", "Heading", "Off The Ball", "Composure", "Strength", "Acceleration", "Anticipation"], ["Dribbling", "Passing", "Technique", "Pace", "Jumping Reach", "Decisions", "Balance", "Agility", "Vision", "Teamwork"]),
    "Poacher": R({ goal: 4, finish: 2, aerial: 0.5 }, ["Finishing", "Off The Ball", "Anticipation", "Composure", "Acceleration"], ["First Touch", "Heading", "Technique", "Decisions", "Pace", "Balance"]),
    "Target Forward": R({ aerial: 3, goal: 2, retain: 1, create: 0.5, finish: 0.5 }, ["Heading", "Strength", "Jumping Reach", "Bravery", "Balance", "Finishing"], ["First Touch", "Composure", "Off The Ball", "Teamwork", "Anticipation", "Aggression", "Passing"]),
    "Deep-Lying Forward": R({ create: 2.5, retain: 2, prog: 1.5, goal: 1.5, aerial: 0.5 }, ["First Touch", "Passing", "Technique", "Composure", "Decisions", "Off The Ball", "Teamwork"], ["Finishing", "Vision", "Anticipation", "Balance", "Strength", "Flair"]),
    "False Nine": R({ create: 3, prog: 2, dribble: 1.5, retain: 1.5, goal: 1 }, ["Dribbling", "First Touch", "Passing", "Technique", "Vision", "Composure", "Decisions", "Off The Ball", "Agility"], ["Finishing", "Flair", "Anticipation", "Teamwork", "Acceleration", "Balance"]),
    "Channel Forward": R({ goal: 2, dribble: 1.5, work: 1.5, create: 1.5, press: 1, cross: 0.5 }, ["Off The Ball", "Acceleration", "Pace", "Finishing", "Dribbling", "Work Rate", "Stamina"], ["First Touch", "Crossing", "Technique", "Anticipation", "Composure", "Decisions", "Agility"]),
    "Second Striker": R({ goal: 2.5, create: 1.5, press: 1, finish: 1, work: 1 }, ["Finishing", "First Touch", "Off The Ball", "Anticipation", "Composure", "Acceleration", "Work Rate"], ["Dribbling", "Passing", "Technique", "Decisions", "Concentration", "Pace", "Stamina", "Balance", "Agility"]),
  },
};

// actual goals & assists (separate from the underlying xG / xA numbers) - weight in each role's score
const OUTPUT_W = { ST: 1.5, Wingers: 1, AM: 1, CM: 0.75, FB: 0.5 };
for (const pos in OUTPUT_W) for (const r in ROLES[pos]) if (ROLES[pos][r].sw.output == null) ROLES[pos][r].sw.output = OUTPUT_W[pos];
Object.assign(ROLES.ST["Poacher"].sw, { output: 2.5 }); Object.assign(ROLES.ST["Target Forward"].sw, { output: 1 }); Object.assign(ROLES.ST["False Nine"].sw, { output: 1 });
Object.assign(ROLES.CM["Attacking Midfielder"].sw, { output: 1.25 }); Object.assign(ROLES.CM["Midfield Playmaker"].sw, { output: 0.5 });
Object.assign(ROLES.AM["Attacking Midfielder"].sw, { output: 1.5 }); Object.assign(ROLES.AM["Free Role"].sw, { output: 1.25 }); Object.assign(ROLES.AM["Advanced Playmaker"].sw, { output: 0.75 }); ROLES.AM["Second Striker"].sw.output = 1.75;
Object.assign(ROLES.Wingers["Inside Forward"].sw, { output: 1.5 }); Object.assign(ROLES.Wingers["Wide Forward"].sw, { output: 1.5 }); Object.assign(ROLES.Wingers["Playmaking Winger"].sw, { output: 0.75 }); 

// final attribute weights for a role
function roleAttrWeights(pos, role) {
  const r = (ROLES[pos] || {})[role] || (ROLES[pos] || {})["Balanced"];
  const w = {};
  const add = (a, v) => { w[a] = (w[a] || 0) + v; };
  r.k.forEach(a => add(a, 3));
  r.p.forEach(a => add(a, 1.5));
  if (pos !== "GK") {
    Object.entries(FM27_BASE).forEach(([a, v]) => add(a, v));
    Object.keys(w).forEach(a => { if (FM27_MULT[a]) w[a] *= FM27_MULT[a]; });
  }
  return w;
}


// ---------- player types (auto tags) ----------
// signature = categories (stats) / clusters (attributes) that define the type; scored on the player's rank within the pool.
const TYPES_STATS = {
  GK: { "Shot-stopper": { gkstop: 3 }, "Distributor": { gkdist: 3 }, "Commander": { aerial: 3 } },
  CB: { "Stopper": { defend: 2, press: 1 }, "Aerial": { aerial: 3, clear: 1 }, "Ball-player": { prog: 2, retain: 2 }, "Clearer": { clear: 3 } },
  FB: { "Defender": { defend: 2, press: 1 }, "Crosser": { cross: 3, create: 1 }, "Progressor": { prog: 2, create: 1 }, "Runner": { work: 2, cross: 1 } },
  DM: { "Ball winner": { press: 2, defend: 2 }, "Deep playmaker": { prog: 2, retain: 2 }, "Anchor": { defend: 2, aerial: 1, disc: 1 }, "Runner": { work: 2, press: 1 } },
  CM: { "Playmaker": { prog: 2, retain: 2, create: 1 }, "Creator": { create: 2, goal: 1 }, "Ball winner": { press: 2, defend: 1.5 }, "Box-to-box": { work: 2, press: 1, goal: 1 }, "Goal threat": { goal: 2, output: 1 } },
  AM: { "Playmaker": { prog: 2, create: 2, retain: 1 }, "Creator": { create: 3 }, "Goal threat": { goal: 2, output: 1 }, "Dribbler": { dribble: 2, prog: 1 }, "Presser": { press: 2, work: 1 } },
  Wingers: { "Creator": { create: 2, cross: 1 }, "Dribbler": { dribble: 2, prog: 1 }, "Goal threat": { goal: 2, output: 1 }, "Crosser": { cross: 3 }, "Worker": { work: 1.5, press: 1.5 } },
  ST: { "Poacher": { goal: 2, finish: 1, output: 1 }, "Target man": { aerial: 3, goal: 1 }, "Runner": { work: 2, dribble: 1.5 }, "Creator": { create: 2, retain: 1 }, "Presser": { press: 2, work: 1 } },
};
const TYPES_ATTR = {
  GK: { "Shot-stopper": { gkstop: 3 }, "Commander": { gkcommand: 3 }, "Distributor": { gkdist: 3 }, "Sweeper": { gksweep: 3 } },
  CB: { "Stopper": { defending: 3 }, "Aerial": { aerial: 3 }, "Ball-player": { passing: 3 }, "Quick": { speed: 3 } },
  FB: { "Defender": { defending: 3 }, "Speedster": { speed: 3 }, "Crosser": { crossing: 3 }, "Carrier": { carrying: 3 }, "Engine": { stamina: 3 } },
  DM: { "Destroyer": { defending: 2, pressing: 2 }, "Deep playmaker": { passing: 3 }, "Anchor": { defending: 2, mentality: 1 }, "Engine": { stamina: 3 } },
  CM: { "Playmaker": { passing: 2, creativity: 2 }, "Ball winner": { defending: 2, pressing: 1 }, "Box-to-box": { stamina: 2, pressing: 1 }, "Dribbler": { carrying: 3 }, "Goal threat": { finishing: 3 } },
  AM: { "Playmaker": { passing: 2, creativity: 2 }, "Creator": { creativity: 3 }, "Dribbler": { carrying: 3 }, "Goal threat": { finishing: 3 }, "Runner": { speed: 2, stamina: 1 } },
  Wingers: { "Speedster": { speed: 3 }, "Dribbler": { carrying: 3 }, "Creator": { creativity: 3 }, "Crosser": { crossing: 3 }, "Inside forward": { finishing: 2, carrying: 1 } },
  ST: { "Poacher": { finishing: 3, speed: 1 }, "Target man": { aerial: 3 }, "Runner": { speed: 2, stamina: 1 }, "Link-up": { passing: 2, creativity: 1 }, "Presser": { pressing: 3 } },
};

// ---------- stat impact tiers (per position) ----------
// Tier 1 = 3 (directly creates / prevents goals, most predictive), Tier 2 = 2, Tier 3 = 1, Tier 4 = 0.5 (context / volume).
// The overall stats score is a weighted average of stat percentiles using these weights; the chosen role tilts them
// (stats in the role's main categories x up to 1.6, stats outside them x 0.4). "Balanced" = pure impact weights.
const T1 = 3, T2 = 2, T3 = 1, T4 = 0.5;
const tiers = (a, b, c, d) => Object.assign({}, ...[[a, T1], [b, T2], [c, T3], [d, T4]].map(([ks, w]) => Object.fromEntries(ks.map(k => [k, w]))));
const IMPACT = {
  ST: tiers(["npxg90", "gls90"], ["sht90", "xa90", "ast90", "hdrw90"], ["shot90", "xgop90", "conv", "xgshot", "ccc90", "opkp90", "hdrpct", "plost90"], ["chc90", "kp90", "drb90", "presc90", "pwon90", "pas", "spr90", "khdr90"]),
  Wingers: tiers(["xa90", "npxg90"], ["opkp90", "ccc90", "gls90", "ast90", "drb90", "prp90"], ["opcrc90", "chc90", "sht90", "plost90", "kp90"], ["presc90", "pwon90", "spr90", "dist90", "opcrpct", "shot90", "conv"]),
  AM: tiers(["xa90", "npxg90"], ["opkp90", "ccc90", "prp90", "gls90", "ast90"], ["drb90", "sht90", "plost90", "pas", "pwon90", "kp90"], ["presc90", "dist90", "spr90", "chc90", "conv", "shot90"]),
  CM: tiers(["prp90", "xa90"], ["pwon90", "int90", "opkp90", "plost90", "pas"], ["tck90", "presc90", "npxg90", "ccc90", "drb90", "psc90", "gls90", "ast90"], ["tckr", "dist90", "spr90", "hdrw90", "kp90", "mlg90"]),
  DM: tiers(["pwon90", "int90"], ["tck90", "tckr", "prp90", "plost90", "pas"], ["presc90", "blk90", "hdrw90", "psc90", "ktck90", "mlg90"], ["hdrpct", "dist90", "clr90", "yel90", "xa90"]),
  CB: tiers(["hdrpct", "int90", "mlg90"], ["hdrw90", "tckr", "blk90", "plost90", "pas"], ["clr90", "shblk90", "tck90", "prp90", "pwon90", "khdr90"], ["presc90", "hdrl90", "ktck90", "yel90", "red90", "dist90"]),
  FB: tiers(["tck90", "int90", "prp90"], ["xa90", "opcrc90", "pwon90", "tckr", "plost90"], ["opkp90", "drb90", "spr90", "hdrpct", "pas", "presc90"], ["crc90", "opcrpct", "dist90", "mlg90", "ast90", "hdrw90"]),
  GK: tiers(["xgp90"], ["svpct", "mlg90", "conc90"], ["pas", "cs90"], ["psc90", "prp90"]),
};
Object.values(IMPACT).forEach(t => { if (t.gls90) t.npg90 = t.gls90; });
const TIER_NAME = { 3: "Tier 1", 2: "Tier 2", 1: "Tier 3", 0.5: "Tier 4" };
function statWeights(pos, role, metrics, cats) {
  const imp = IMPACT[pos] || {}, rd = (ROLES[pos] || {})[role];
  const bal = !rd || role === "Balanced", sw = bal ? null : rd.sw;
  const maxsw = bal ? 1 : Math.max(...Object.values(sw));
  const w = {};
  metrics.forEach(k => {
    if (!imp[k]) return;
    let t = 1;
    if (!bal) { const s = Math.max(0, ...cats.filter(c => k in CATS[c].m).map(c => sw[c] || 0)) / maxsw; t = 0.4 + 1.2 * s; }
    w[k] = imp[k] * t;
  });
  return w;
}

