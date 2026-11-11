// ---------- Data Hub: how your team performs, section by section, against every team in your league ----------
// Team numbers = all of a first team's players' season lines added up (league games, or all competitions).
// League = the clubs your team meets in that competition (read from the save's match store). Games = starts / 11.
const HUB_TABS = [["overview", "Overview"], ["attack", "Attacking"], ["create", "Creating"], ["progress", "Progressing"], ["defend", "Defending"], ["intensity", "Pressing & intensity"], ["aerial", "Aerial"], ["gk", "Goalkeeping"], ["discipline", "Discipline"]];
// [key, label, value(t) per game unless noted, higher is better?, decimals, unit]
const hubPer = f => t => t.g ? t.v(f) / t.g : NaN;
const hubRatio = (a, b, pct = true) => t => { const x = typeof a === "function" ? a(t) : t.v(a), y = typeof b === "function" ? b(t) : t.v(b); return y > 0 ? (pct ? 100 : 1) * x / y : NaN; };
const HUB_M = {
  goals: ["Goals / game", hubPer("goals"), 1, 2], xg: ["xG / game", hubPer("expected_goals"), 1, 2], npxg: ["Non-penalty xG / game", hubPer("non_penalty_expected_goals"), 1, 2],
  gmx: ["Goals − xG (season)", t => t.v("goals") - t.v("expected_goals"), 1, 1],
  shots: ["Shots / game", hubPer("shots"), 1, 1], sot: ["Shots on target / game", hubPer("shots_on_target"), 1, 1], shotpct: ["Shots on target %", hubRatio("shots_on_target", "shots"), 1, 0, "%"],
  xgshot: ["xG per shot", hubRatio("expected_goals", "shots", false), 1, 2], conv: ["Conversion % (goals / shots)", hubRatio("goals", "shots"), 1, 1, "%"],
  outbox: ["Shots from outside the box / game", hubPer("shots_outside_box"), 0, 1], pens: ["Penalties scored", t => t.v("penalties_scored"), 1, 0],
  assists: ["Assists / game", hubPer("assists"), 1, 2], xa: ["xA / game", hubPer("expected_assists"), 1, 2], kp: ["Key passes / game", hubPer("key_passes"), 1, 1], opkp: ["Open-play key passes / game", hubPer("open_play_key_passes"), 1, 1],
  ccc: ["Clear-cut chances created / game", hubPer("clear_cut_chances_created"), 1, 2], crs: ["Crosses / game", hubPer("crosses_attempted"), 0, 1], crspct: ["Cross completion %", hubRatio("crosses_completed", "crosses_attempted"), 1, 0, "%"],
  opcrs: ["Open-play crosses / game", hubPer("open_play_crosses_attempted"), 0, 1],
  pas: ["Passes / game", hubPer("passes_attempted"), 1, 0], paspct: ["Pass completion %", hubRatio("passes_completed", "passes_attempted"), 1, 1, "%"], prog: ["Progressive passes / game", hubPer("progressive_passes"), 1, 1],
  drb: ["Dribbles / game", hubPer("dribbles"), 1, 1], plost: ["Possession lost / game", hubPer("possession_lost"), 0, 1], fwon: ["Fouls won / game", hubPer("fouls_against"), 1, 1],
  tck: ["Tackles / game", hubPer("tackles_attempted"), 1, 1], tckpct: ["Tackles won %", hubRatio("tackles_completed", "tackles_attempted"), 1, 0, "%"], ktck: ["Key tackles / game", hubPer("key_tackles"), 1, 2],
  int: ["Interceptions / game", hubPer("interceptions"), 1, 1], blk: ["Blocks / game", hubPer("blocks"), 1, 1], shblk: ["Shots blocked / game", hubPer("shots_blocked"), 1, 1], clr: ["Clearances / game", hubPer("clearances"), 1, 1],
  pwon: ["Possession won / game", hubPer("possession_won"), 1, 1], mist: ["Mistakes leading to a goal", t => t.v("mistakes_leading_to_goal"), 0, 0],
  dist: ["Distance covered / game (km)", hubPer("distance_km"), 1, 1], spr: ["High-intensity sprints / game", hubPer("high_intensity_sprints"), 1, 0], fouls: ["Fouls made / game", hubPer("fouls_made"), 0, 1],
  aer: ["Aerial duels / game", hubPer("aerial_challenges_attempted"), 1, 1], hdr: ["Headers won / game", hubPer("headers_won"), 1, 1], hdrpct: ["Headers won %", hubRatio("headers_won", "aerial_challenges_attempted"), 1, 0, "%"], khdr: ["Key headers / game", hubPer("key_headers"), 1, 2],
  conc: ["Goals conceded / game", t => t.g ? t.k("goals_allowed") / t.g : NaN, 0, 2], sotf: ["Shots on target faced / game", t => t.g ? t.k("shots_on_target_faced") / t.g : NaN, 0, 1],
  savepct: ["Save %", t => { const s = t.k("saves_held") + t.k("saves_parried") + t.k("saves_tipped"), f = t.k("shots_on_target_faced"); return f > 0 ? 100 * s / f : NaN; }, 1, 0, "%"],
  xgp: ["xG prevented / game", t => t.g ? t.k("expected_goals_prevented") / t.g : NaN, 1, 2], cs: ["Clean sheets %", t => t.g ? 100 * t.k("clean_sheets") / t.g : NaN, 1, 0, "%"],
  yel: ["Yellow cards / game", hubPer("yellow_cards"), 0, 2], red: ["Red cards", t => t.v("red_cards"), 0, 0], offs: ["Offsides / game", hubPer("offsides"), 0, 1],
  rating: ["Average rating", t => t.r, 1, 2],
};
// each section: metrics, two scatter charts [x, y, labels for the four corners: top-right, top-left, bottom-right, bottom-left], and the player stats behind it
const HUB_SEC = {
  attack: { title: "Attacking", lead: "goal output and shooting", m: ["goals", "xg", "npxg", "gmx", "shots", "sot", "shotpct", "xgshot", "conv", "outbox", "pens"],
    charts: [["Goal output", "xg", "goals", ["High scoring", "Clinical finishing", "Wasteful finishing", "Struggling to create"]],
             ["Shooting", "shots", "xgshot", ["Lots of good shots", "Patient shooting", "Speculative shooting", "Few, poor shots"]]],
    pl: ["goals", "expected_goals", "shots", "shots_on_target", "non_penalty_expected_goals"] },
  create: { title: "Creating", lead: "chances and crosses", m: ["assists", "xa", "kp", "opkp", "ccc", "crs", "opcrs", "crspct"],
    charts: [["Chance creation", "kp", "ccc", ["Very creative", "Few but big chances", "Lots of half-chances", "Not creating enough"]],
             ["Crossing", "crs", "crspct", ["Lots, accurate", "Few, accurate", "Lots, inaccurate", "Few, inaccurate"]]],
    pl: ["assists", "expected_assists", "key_passes", "clear_cut_chances_created", "crosses_completed"] },
  progress: { title: "Progressing", lead: "passing, carrying and keeping the ball", m: ["pas", "paspct", "prog", "drb", "plost", "fwon"],
    charts: [["Passing", "pas", "paspct", ["Lots, accurate", "Fewer, accurate", "Lots, careless", "Direct and loose"]],
             ["Progression", "prog", "drb", ["Pass and carry", "Carrying it forward", "Passing it forward", "Struggling to progress"]]],
    pl: ["passes_attempted", "progressive_passes", "dribbles", "possession_lost", "key_passes"] },
  defend: { title: "Defending", lead: "winning the ball and protecting the goal", m: ["tck", "tckpct", "ktck", "int", "blk", "shblk", "clr", "pwon", "conc", "mist"],
    charts: [["Tackling", "tck", "tckpct", ["Lots, winning them", "Few, winning them", "Lots, losing them", "Few, losing them"]],
             ["Defensive actions", "int", "clr", ["Busy defence", "Clearing a lot", "Reading the play", "Quiet defence"]]],
    pl: ["tackles_completed", "interceptions", "blocks", "clearances", "possession_won"] },
  intensity: { title: "Pressing & intensity", lead: "winning it back and running", m: ["pwon", "spr", "dist", "fouls", "tck", "int"],
    charts: [["Pressing intensity", "pwon", "spr", ["Intense press", "Efficient press", "Running, not winning it", "Passive"]],
             ["Work rate", "dist", "spr", ["High work rate", "Short and sharp", "Lots of km, few sprints", "Low work rate"]]],
    pl: ["possession_won", "high_intensity_sprints", "distance_km", "tackles_attempted", "interceptions"] },
  aerial: { title: "Aerial", lead: "headers in both boxes", m: ["aer", "hdr", "hdrpct", "khdr"],
    charts: [["Aerial", "aer", "hdrpct", ["Lots, winning them", "Few, winning them", "Lots, losing them", "Few, losing them"]]],
    pl: ["aerial_challenges_attempted", "headers_won", "key_headers"] },
  gk: { title: "Goalkeeping", lead: "the goalkeeper and the goals you concede", m: ["conc", "sotf", "savepct", "xgp", "cs"],
    charts: [["Goalkeeping", "sotf", "savepct", ["Busy, saving them", "Quiet, saving them", "Busy, conceding", "Quiet, conceding"]]],
    pl: ["goals_allowed", "shots_on_target_faced", "expected_goals_prevented", "clean_sheets"] },
  discipline: { title: "Discipline", lead: "fouls, cards and offsides", m: ["fouls", "yel", "red", "offs", "fwon"],
    charts: [["Fouls", "fouls", "fwon", ["Physical games", "Winning fouls", "Giving fouls away", "Clean games"]]], pl: ["fouls_made", "yellow_cards", "red_cards", "fouls_against"] },
};
// what to try in FM when a stat is weak (FM27 team instruction names)
const HUB_TRY = {
  npxg: "Get players into better positions before shooting: <b>Final third: Standard</b> instead of Work Ball Into Box lets them attack the box sooner; a striker with good off the ball and anticipation helps more than shooting more.",
  xg: "Same as non-penalty xG: better chances, not more shots. Runners into the box (a Box-to-Box Midfielder, an attacking full-back) raise it.",
  xgshot: "Too many hopeful shots: <b>Shots from distance: Discourage</b>, unless you have real long-shot specialists.",
  shots: "Not shooting enough: <b>Tempo: Standard or Higher</b> and <b>Final third: Standard</b> stop the endless recycling.",
  goals: "If xG is fine but goals are low, it's finishing or luck — give it time, or look for a striker with better finishing and composure.",
  ccc: "No big chances: <b>Pass reception: Pass Into Space</b> to find runs in behind, and a creative role (Advanced Playmaker) behind the striker.",
  xa: "Your passers aren't finding dangerous positions: put your best passer in a creative role and give the team someone making runs.",
  kp: "More players need to look forward: <b>Creative freedom: More Expressive</b> lets creative players try the killer pass.",
  prog: "The ball isn't moving forward: a deep playmaker, <b>Build-up: Play Through Press</b> with good passers, or full-backs who carry it.",
  paspct: "Passes going astray: <b>Passing directness: Shorter</b> and <b>Pass reception: Pass To Feet</b>, or players with better passing and composure.",
  plost: "Giving the ball away too much: shorter passing, <b>Creative freedom: More Disciplined</b>, and fewer dribblers in deep areas.",
  pwon: "Not winning the ball back: <b>Trigger press: More Often</b>, a higher line of engagement, and pressing roles (Pressing DM, Pressing Full-Back) for players with work rate and stamina.",
  int: "Reading the game: midfielders with anticipation and positioning; a <b>Screening DM</b> sits in passing lanes.",
  tck: "If you're conceding, add ball-winners; if not, low tackles just means you have the ball a lot (that's fine).",
  tckpct: "Losing tackles: <b>Tackling: Stay On Feet</b> stops rash challenges; players with tackling and bravery win more.",
  conc: "Conceding too many: check shots faced. Lots of shots = <b>Line of engagement: Mid Block</b> or a holding midfielder; few shots but many goals = the keeper.",
  sotf: "Allowing too many shots on target: protect the box with a Screening DM or <b>Defensive line: Standard</b> if you're caught behind.",
  savepct: "Keeper not saving enough: compare his xG prevented. If it's negative over 900+ minutes, he's the problem.",
  xgp: "Negative xG prevented over many games = your keeper is costing goals. A goalkeeper upgrade is one of the cheapest fixes in FM.",
  spr: "Not running: players with low stamina or work rate, or tired legs — rotate more, or pick roles that suit them.",
  hdrpct: "Losing headers: <b>Goal kicks: Short</b>, <b>Cross engagement: Stop Crosses</b>, or a taller, braver centre-back.",
  aer: "Few aerial duels is usually a style (short passing), not a problem.",
  crspct: "Crosses not finding anyone: <b>Crossing style: Low Crosses</b> to short strikers, or Whipped for a target man; or cross less.",
  fouls: "Giving fouls away: <b>Tackling: Stay On Feet</b>.",
  yel: "Too many bookings: <b>Tackling: Stay On Feet</b>; check aggressive players.",
};
const HUB_PL_LABEL = { goals: "Goals", expected_goals: "xG", shots: "Shots", shots_on_target: "On target", non_penalty_expected_goals: "NP-xG", assists: "Assists", expected_assists: "xA", key_passes: "Key passes",
  clear_cut_chances_created: "Big chances made", crosses_completed: "Crosses completed", passes_attempted: "Passes", progressive_passes: "Progressive passes", dribbles: "Dribbles", possession_lost: "Possession lost",
  tackles_completed: "Tackles won", interceptions: "Interceptions", blocks: "Blocks", clearances: "Clearances", possession_won: "Possession won", high_intensity_sprints: "Sprints", distance_km: "Distance (km)",
  tackles_attempted: "Tackles", aerial_challenges_attempted: "Aerial duels", headers_won: "Headers won", key_headers: "Key headers", goals_allowed: "Conceded", shots_on_target_faced: "SoT faced",
  expected_goals_prevented: "xG prevented", clean_sheets: "Clean sheets", fouls_made: "Fouls", yellow_cards: "Yellows", red_cards: "Reds", fouls_against: "Fouls won" };
const HUB_RADAR = [["goals", "Gl/Gm"], ["xg", "xG/Gm"], ["shots", "Sh/Gm"], ["shotpct", "Shot %"], ["paspct", "Pas %"], ["prog", "Prog/Gm"], ["tckpct", "Tck %"], ["int", "Int/Gm"], ["conc", "Conc/Gm"], ["sotf", "SoT ag/Gm"]];
const hubF = () => S.hubF || (S.hubF = {});
const hubKind = () => (hubF().kind === "overall" ? "overall" : "league");
function hubData() {
  const TM = SAVE && SAVE.teams, M = SAVE && SAVE.matches; if (!TM || !M) return null;
  const kind = hubKind(), F = TM.fields, G = TM.gkFields, nf = F.length, ng = G.length, arr = TM[kind], gar = TM[kind + "Gk"], fi = new Map(F.map((f, q) => [f, q])), gi = new Map(G.map((f, q) => [f, q]));
  const key = [SAVE.id, kind, hubF().comp || ""].join("|"); if (SAVE._hub && SAVE._hub.key === key) return SAVE._hub;
  const byTeam = new Map(); for (let k = 0; k < TM.n; k++) byTeam.set(TM.team[k], k);
  const my = SAVE.meta.managed && SAVE.meta.managed[0], myClub = my ? SAVE.clubs.findIndex((c, k) => SAVE.clubUid[k] === my.uid) : -1;
  // your first team = the team id of your club with the most starts
  let myTeam = null, best = -1; for (let k = 0; k < TM.n; k++) if (TM.club[k] === myClub) { const s = arr[k * nf + fi.get("starts")]; if (s > best) { best = s; myTeam = TM.team[k]; } }
  // competitions your team played; the league = the one with 10-24 teams where you played most
  const compTeams = new Map(), myCount = new Map();
  for (let r = 0; r < M.n; r++) { const c = M.comp[r]; let s = compTeams.get(c); if (!s) compTeams.set(c, s = new Set()); s.add(M.home[r]); s.add(M.away[r]); if (M.home[r] === myTeam || M.away[r] === myTeam) myCount.set(c, (myCount.get(c) || 0) + 1); }
  const comps = [...myCount.keys()].filter(c => !/friendl/i.test(M.comps[c])).map(c => ({ c, name: M.comps[c], teams: compTeams.get(c).size, mine: myCount.get(c) })).sort((a, b) => b.mine - a.mine);
  const leagueGuess = comps.filter(x => x.teams >= 10 && x.teams <= 24).sort((a, b) => b.mine - a.mine)[0] || comps[0];
  const comp = comps.find(x => x.name === hubF().comp) || leagueGuess;
  const peers = comp ? [...compTeams.get(comp.c)].filter(t => byTeam.has(t)) : [];
  if (myTeam != null && !peers.includes(myTeam)) peers.push(myTeam);
  const teams = peers.map(t => { const k = byTeam.get(t), v = f => { const q = fi.get(f); return q == null ? NaN : arr[k * nf + q]; }, kk = f => { const q = gi.get(f); return q == null ? NaN : gar[k * ng + q]; };
    const g = Math.round(v("starts") / 11); return { t, ix: k, club: TM.club[k], name: SAVE.clubs[TM.club[k]], short: SAVE.clubShort && SAVE.clubShort[TM.club[k]] || SAVE.clubs[TM.club[k]], g, v, k: kk, r: NaN, mine: t === myTeam }; })
    .filter(x => x.g > 0);
  // every metric for every team, then ranks and league averages
  const val = {}, rank = {}, avg = {}, pct = {};
  Object.entries(HUB_M).forEach(([m, [, fn, hi]]) => {
    const vals = teams.map(t => fn(t)), ok = vals.filter(x => x === x); val[m] = vals; avg[m] = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : NaN;
    const sorted = ok.slice().sort((a, b) => hi ? b - a : a - b);
    rank[m] = vals.map(x => x === x ? sorted.indexOf(x) + 1 : null);
    pct[m] = vals.map(x => { if (!(x === x) || ok.length < 2) return null; const below = ok.filter(y => hi ? y < x : y > x).length, eq = ok.filter(y => y === x).length - 1; return 100 * (below + eq / 2) / (ok.length - 1); });
  });
  return (SAVE._hub = { key, kind, comp, comps, teams, val, rank, avg, pct, myTeam, myClub, n: teams.length });
}
const hubFmt = (m, x) => { if (!(x === x) || x == null) return "–"; const d = HUB_M[m][3], u = HUB_M[m][4] || ""; return (Math.abs(x) >= 1000 ? Math.round(x).toLocaleString() : x.toFixed(d)) + u; };
const hubWord = p => p == null ? "" : p >= 80 ? "Excellent" : p >= 60 ? "Above average" : p >= 40 ? "Average" : p >= 20 ? "Below average" : "Poor";
const hubCls = p => p == null ? "" : p >= 60 ? "okc" : p >= 40 ? "" : p >= 20 ? "warnc" : "bad";
function hubTeamIx(D) { const f = hubF(); let i = D.teams.findIndex(t => t.t === +f.team); if (i < 0) i = D.teams.findIndex(t => t.mine); return i < 0 ? 0 : i; }
function hubCmpIx(D) { const f = hubF(); const i = D.teams.findIndex(t => t.t === +f.cmp); return i; }
// ---- charts ----
function hubScatter(D, title, mx, my_, corners, ti, ci) {
  const W = 320, H = 230, P = 34, xs = D.val[mx], ys = D.val[my_], ok = D.teams.map((t, i) => xs[i] === xs[i] && ys[i] === ys[i]);
  const xv = xs.filter((x, i) => ok[i]), yv = ys.filter((y, i) => ok[i]); if (xv.length < 3) return "";
  const pad = (a, b) => { const r = (b - a) || Math.abs(a) || 1; return [a - r * 0.08, b + r * 0.08]; };
  const [x0, x1] = pad(Math.min(...xv), Math.max(...xv)), [y0, y1] = pad(Math.min(...yv), Math.max(...yv));
  const X = x => P + (x - x0) / (x1 - x0) * (W - P - 8), Y = y => H - P + 6 - (y - y0) / (y1 - y0) * (H - P - 14);
  const ax = X(D.avg[mx]), ay = Y(D.avg[my_]);
  let s = `<svg viewBox="0 0 ${W} ${H}" class="hubsc" role="img" aria-label="${esc(title)}">`;
  s += `<line x1="${ax}" y1="8" x2="${ax}" y2="${H - P + 6}" class="hubavg"/><line x1="${P}" y1="${ay}" x2="${W - 8}" y2="${ay}" class="hubavg"/>`;
  const cl = [[W - 10, 18, "end"], [P + 4, 18, "start"], [W - 10, H - P, "end"], [P + 4, H - P, "start"]];
  corners.forEach((c, k) => { s += `<text x="${cl[k][0]}" y="${cl[k][1]}" text-anchor="${cl[k][2]}" class="hubcorner">${esc(c)}</text>`; });
  D.teams.forEach((t, i) => { if (!ok[i] || i === ti || i === ci) return; s += `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="4.5" class="hubdot"><title>${esc(t.name)}: ${hubFmt(mx, xs[i])}, ${hubFmt(my_, ys[i])}</title></circle>`; });
  [[ci, "hubcmp"], [ti, "hubme"]].forEach(([i, c]) => { if (i == null || i < 0 || !ok[i]) return; const x = X(xs[i]), y = Y(ys[i]); s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.5" class="${c}"><title>${esc(D.teams[i].name)}: ${hubFmt(mx, xs[i])}, ${hubFmt(my_, ys[i])}</title></circle><text x="${x > W - 90 ? x - 9 : x + 9}" y="${y + 4}" text-anchor="${x > W - 90 ? "end" : "start"}" class="hublbl ${c}t">${esc(D.teams[i].short)}</text>`; });
  s += `<text x="${(P + W) / 2}" y="${H - 4}" text-anchor="middle" class="hubax">${esc(HUB_M[mx][0])}</text><text x="10" y="${(H - P) / 2}" transform="rotate(-90 10 ${(H - P) / 2})" text-anchor="middle" class="hubax">${esc(HUB_M[my_][0])}</text></svg>`;
  // the corner the team sits in
  const tx = xs[ti], ty = ys[ti]; let verdict = "";
  if (tx === tx && ty === ty) { const right = tx >= D.avg[mx], up = ty >= D.avg[my_]; verdict = corners[up ? (right ? 0 : 1) : (right ? 2 : 3)]; }
  return `<div class="hubcard"><h4>${esc(title)}</h4>${s}<p class="small">${verdict ? `<b>${esc(D.teams[ti].short)}:</b> ${esc(verdict.toLowerCase())}` : ""}</p></div>`;
}
function hubRadar(D, ti, ci) {
  const W = 300, H = 270, cx = W / 2, cy = H / 2 + 4, R = 98, n = HUB_RADAR.length;
  const pt = (k, p) => { const a = -Math.PI / 2 + 2 * Math.PI * k / n, r = R * (p == null ? 0 : Math.max(0.04, p / 100)); return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; };
  let s = `<svg viewBox="0 0 ${W} ${H}" class="hubrad" role="img" aria-label="General performance radar">`;
  [25, 50, 75, 100].forEach(g => { s += `<polygon class="hubgrid${g === 50 ? " mid" : ""}" points="${HUB_RADAR.map((x, k) => pt(k, g).map(v => v.toFixed(1)).join(",")).join(" ")}"/>`; });
  HUB_RADAR.forEach(([m, l], k) => { const [x, y] = pt(k, 118); s += `<text x="${x.toFixed(1)}" y="${(y + 3).toFixed(1)}" text-anchor="middle" class="hubax">${esc(l)}</text>`; });
  [[ci, "hubcmp"], [ti, "hubme"]].forEach(([i, c]) => { if (i == null || i < 0) return; s += `<polygon class="${c}poly" points="${HUB_RADAR.map(([m], k) => pt(k, D.pct[m][i]).map(v => v.toFixed(1)).join(",")).join(" ")}"/>`; });
  return s + `</svg>`;
}
// ---- sections ----
function hubSecScore(D, m, i) { const ps = m.map(k => D.pct[k][i]).filter(p => p != null); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null; }
function hubTable(D, ms, ti, ci) {
  const best = m => { let b = -1; D.val[m].forEach((x, i) => { if (x === x && (b < 0 || D.rank[m][i] < D.rank[m][b])) b = i; }); return b; };
  let h = `<div class="tscroll"><table class="heat hubt"><thead><tr><th class="left">Stat</th><th class="num">${esc(D.teams[ti].short)}</th>${ci >= 0 ? `<th class="num">${esc(D.teams[ci].short)}</th>` : ""}<th class="num">League avg</th><th class="num">Rank</th><th class="left">vs league</th><th class="left ph1">Best</th></tr></thead><tbody>`;
  ms.forEach(m => { const p = D.pct[m][ti], b = best(m);
    h += `<tr><td class="left">${esc(HUB_M[m][0])}${typeof itip === "function" ? itip(m) : ""}${HUB_M[m][2] ? "" : ` <span class="muted small">(lower is better)</span>`}</td><td class="num"><b>${hubFmt(m, D.val[m][ti])}</b></td>${ci >= 0 ? `<td class="num">${hubFmt(m, D.val[m][ci])}</td>` : ""}<td class="num">${hubFmt(m, D.avg[m])}</td>
      <td class="num">${D.rank[m][ti] ? D.rank[m][ti] + "<small>/" + D.n + "</small>" : "–"}</td><td class="left"><span class="hubbar"><i style="width:${p == null ? 0 : Math.max(3, p)}%" class="${hubCls(p)}"></i></span> <span class="small ${hubCls(p)}">${hubWord(p)}</span></td>
      <td class="left ph1 small muted">${b >= 0 ? esc(D.teams[b].short) + " " + hubFmt(m, D.val[m][b]) : ""}</td></tr>`; });
  return h + `</tbody></table></div>`;
}
function hubPlayers(D, sec, ti) {
  const t = D.teams[ti], kind = D.kind, st = SAVE.stats[kind]; if (!st) return "";
  const fl = HUB_SEC[sec].pl, mins = i => st.cols.minutes[st.row[i]] || 0;
  const ids = []; for (let i = 0; i < SAVE.n; i++) if (SAVE.clubIdx[i] === t.club && SAVE.teamSlot[i] === 0 && st.row[i] >= 0 && mins(i) >= 90) ids.push(i);
  if (!ids.length) return "";
  const v = (i, f) => { const c = st.cols[f]; return c ? c[st.row[i]] : NaN; }, tot = f => SAVE.teams.gkFields.includes(f) ? t.k(f) : t.v(f);
  const main = fl[0]; ids.sort((a, b) => (v(b, main) || 0) - (v(a, main) || 0) || mins(b) - mins(a));
  const lab = f => HUB_PL_LABEL[f] || f.replace(/_/g, " ").replace(/\b\w/, c => c.toUpperCase());
  let h = `<div class="tscroll"><table class="heat hubt hubpl"><thead><tr><th class="left">Player</th><th class="num">Mins</th>${fl.map(f => `<th class="num">${esc(lab(f))}<br><small class="muted">total · /90 · share</small></th>`).join("")}</tr></thead><tbody>`;
  ids.slice(0, S.hubAll ? 40 : 10).forEach(i => {
    h += `<tr><td class="left">${scStar(i)}<button class="linkbtn" data-sci="${i}">${esc(SAVE.name[i])}</button> <span class="small muted">${esc(savePos().str[i])}</span></td><td class="num">${Math.round(mins(i)).toLocaleString()}</td>`;
    fl.forEach(f => { const x = v(i, f), T = tot(f), sh = T > 0 && x === x ? 100 * x / T : NaN, p90 = x === x && mins(i) ? 90 * x / mins(i) : NaN;
      h += `<td class="num">${x === x ? (Math.abs(x) < 10 && x % 1 ? x.toFixed(1) : Math.round(x)) : "–"} <span class="small muted">· ${p90 === p90 ? p90.toFixed(2) : "–"} · ${sh === sh ? Math.round(sh) + "%" : "–"}</span></td>`; });
    h += `</tr>`; });
  h += `</tbody></table></div>${ids.length > 10 ? `<p class="small"><button class="linkbtn" data-hubact="all">${S.hubAll ? "Show top 10" : `Show all ${Math.min(40, ids.length)}`}</button></p>` : ""}`;
  return h;
}
function hubSummaryLine(D, sec, i) {
  const s = hubSecScore(D, HUB_SEC[sec].m, i); if (s == null) return "";
  const w = s >= 75 ? "well above average" : s >= 58 ? "above average" : s >= 42 ? "around average" : s >= 25 ? "below average" : "well below average";
  return `<span class="${hubCls(s)}"><b>${esc(D.teams[i].short)}</b> ${D.teams[i].mine ? "are" : "is"} ${w}</span> in ${esc(HUB_SEC[sec].lead)} <span class="muted">(score ${Math.round(s)}/100)</span>`;
}
function hubStrengths(D, ti) {
  const all = Object.keys(HUB_M).filter(m => D.pct[m][ti] != null && !["gmx", "pens", "red", "mist", "rating"].includes(m));
  const s = all.slice().sort((a, b) => D.pct[b][ti] - D.pct[a][ti]);
  const li = list => list.map(m => `<li><b>${esc(HUB_M[m][0])}</b> ${hubFmt(m, D.val[m][ti])} <span class="muted small">· ${D.rank[m][ti]}${["st", "nd", "rd"][((D.rank[m][ti] + 90) % 100 - 10) % 10 - 1] || "th"} of ${D.n}, league avg ${hubFmt(m, D.avg[m])}</span></li>`).join("");
  return `<div class="hubsw"><div><h4 class="okc">Strengths</h4><ul>${li(s.slice(0, 6))}</ul></div><div><h4 class="bad">Weaknesses</h4><ul>${li(s.slice(-6).reverse())}</ul></div></div>`;
}
function renderHub(main) {
  closeDrawer(true);
  if (!SAVE) { main.innerHTML = `<section class="panel addpanel"><h3>The Data Hub needs your save</h3><p class="muted">Every team's numbers this season are read from your FM27 save.</p><button class="primary" data-act="datapage">Load your save</button></section>`; return; }
  if (!SAVE.teams || !SAVE.matches) { main.innerHTML = `<section class="panel addpanel"><h3>Load your save once more</h3><p class="muted">The Data Hub reads team totals and the season's matches, which this stored copy of your save was read without.</p><button class="primary" data-act="datapage">Load your save</button></section>`; return; }
  const D = hubData(); if (!D || !D.teams.length) { main.innerHTML = `<section class="panel"><p class="muted">Your team's matches weren't found in this save.</p></section>`; return; }
  const tab = HUB_TABS.some(x => x[0] === S.hubTab) ? S.hubTab : "overview", ti = hubTeamIx(D), ci = hubCmpIx(D), T = D.teams[ti], f = hubF();
  const opts = D.teams.slice().sort((a, b) => a.name.localeCompare(b.name));
  let h = `<section class="panel hubhead"><div class="ph"><h3>Data Hub: ${esc(T.name)}</h3><span class="muted small">${esc(D.comp ? D.comp.name : "")} · ${T.g} games · ${hubKind() === "league" ? "league games" : "all competitions"} · compared with the ${D.n} teams in the league</span></div>
    <div class="filters"><label class="small">Team <select class="hubin" data-f="team">${opts.map(t => `<option value="${t.t}" ${t === T ? "selected" : ""}>${esc(t.name)}${t.mine ? " (you)" : ""}</option>`).join("")}</select></label>
    <label class="small">Compare with <select class="hubin" data-f="cmp"><option value="">League average only</option>${opts.filter(t => t !== T).map(t => `<option value="${t.t}" ${ci >= 0 && D.teams[ci] === t ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></label>
    <label class="small">League <select class="hubin" data-f="comp">${D.comps.map(c => `<option ${D.comp && c.name === D.comp.name ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
    <label class="small">Stats <select class="hubin" data-f="kind"><option value="league" ${hubKind() === "league" ? "selected" : ""}>League games</option><option value="overall" ${hubKind() === "overall" ? "selected" : ""}>All competitions</option></select></label></div></section>`;
  if (tab === "overview") {
    const tiles = [["goals", "Goals"], ["xg", "xG"], ["conc", "Conceded"], ["sotf", "SoT faced"], ["paspct", "Pass %"], ["xgp", "xG prevented"]];
    h += `<section class="tiles hubtiles">${tiles.map(([m, l]) => { const tot = m === "paspct" ? hubFmt(m, D.val[m][ti]) : m === "conc" ? Math.round(T.k("goals_allowed")) : m === "sotf" ? Math.round(T.k("shots_on_target_faced")) : m === "xgp" ? T.k("expected_goals_prevented").toFixed(1) : m === "goals" ? Math.round(T.v("goals")) : T.v("expected_goals").toFixed(1);
      return `<div class="tile"><b>${tot}</b><span>${l}${m === "paspct" ? "" : ` · ${hubFmt(m, D.val[m][ti])}/gm`}</span><small class="${hubCls(D.pct[m][ti])}">${D.rank[m][ti] || "–"} of ${D.n}</small></div>`; }).join("")}</section>
      <section class="hubgrid2"><div class="panel"><div class="ph"><h3>General performance</h3><span class="small muted">percentile in the league · <span class="hubme-k">■</span> ${esc(T.short)}${ci >= 0 ? ` <span class="hubcmp-k">■</span> ${esc(D.teams[ci].short)}` : ""} · dashed ring = league average</span></div>${hubRadar(D, ti, ci)}</div>
      <div class="panel"><div class="ph"><h3>Section by section</h3></div><div class="hubsecs">${HUB_TABS.slice(1).map(([k, l]) => { const s = hubSecScore(D, HUB_SEC[k].m, ti); return `<button class="hubsecb" data-hubtab="${k}"><b>${esc(l)}</b><span class="hubbar"><i style="width:${s == null ? 0 : Math.max(3, s)}%" class="${hubCls(s)}"></i></span><span class="small ${hubCls(s)}">${s == null ? "–" : Math.round(s) + " · " + hubWord(s)}</span></button>`; }).join("")}</div></div></section>
      ${typeof learnBox === "function" ? learnBox("<b>Start here:</b> the radar shows 10 key stats as percentiles against your league (bigger = better; the dashed ring is average). The section bars on the right turn each area into one score — open the lowest one first.", "radar") : ""}
      <section class="panel"><div class="ph"><h3>Strengths and weaknesses</h3><span class="small muted">every stat, ranked against the league</span></div>${hubStrengths(D, ti)}</section>
      <section class="hubcharts">${hubScatter(D, "Goal output", "xg", "goals", HUB_SEC.attack.charts[0][3], ti, ci)}${hubScatter(D, "Attack vs defence", "xg", "conc", ["Open: score and concede", "Struggling", "Dominant", "Tight, low-scoring"], ti, ci)}${hubScatter(D, "Passing", "pas", "paspct", HUB_SEC.progress.charts[0][3], ti, ci)}${hubScatter(D, "Pressing intensity", "pwon", "spr", HUB_SEC.intensity.charts[0][3], ti, ci)}</section>`;
  } else {
    const sec = HUB_SEC[tab];
    const weak = sec.m.filter(m => !["crs", "opcrs", "aer"].includes(m) && D.pct[m][ti] != null && D.pct[m][ti] < 35 && HUB_TRY[m]).sort((a, b) => D.pct[a][ti] - D.pct[b][ti]).slice(0, 3);
    const STYLE = ["crs", "opcrs", "outbox", "pas", "aer", "tck", "blk", "clr", "shblk", "fouls", "fwon", "dist", "pens", "gmx", "mist", "red", "offs"];   // volume = a style, not a quality
    const strong = sec.m.filter(m => !STYLE.includes(m) && D.pct[m][ti] != null && D.pct[m][ti] >= 75).sort((a, b) => D.pct[b][ti] - D.pct[a][ti]).slice(0, 2);
    const plain = `${strong.length ? `Strong: ${strong.map(m => `<b>${esc(HUB_M[m][0].replace(/ \/ game.*$/, "").toLowerCase())}</b>`).join(", ")}. ` : ""}${weak.length ? `Weak: ${weak.map(m => `<b>${esc(HUB_M[m][0].replace(/ \/ game.*$/, "").toLowerCase())}</b>`).join(", ")}.` : "Nothing in this section is a real weakness."}`;
    h += `<section class="panel"><div class="ph"><h3>${esc(sec.title)}</h3><span class="small muted">${esc(sec.lead)}</span></div><p>${hubSummaryLine(D, tab, ti)}${ci >= 0 ? ` · ${hubSummaryLine(D, tab, ci)}` : ""}</p><p class="small">${plain}</p>
      ${weak.length && T.mine ? `<div class="hubtry"><h4>What to try</h4><ul>${weak.map(m => `<li><b>${esc(HUB_M[m][0])}</b> (${D.rank[m][ti]} of ${D.n}): ${HUB_TRY[m]}</li>`).join("")}</ul><p class="small muted">Change one thing at a time, then check this tab again after 4–5 games.</p></div>` : ""}
      ${typeof learnBox === "function" ? learnBox("Rank 1 = best in the league for that stat. The bar shows the same as a percentile: full = best, half = average. Read the stats together — e.g. few tackles is fine if you also concede few goals.", "defvol") : ""}
      <details class="hubmore"${typeof learnOn === "function" && !learnOn() ? " open" : ""}><summary>All ${sec.m.length} stats for this section</summary>${hubTable(D, sec.m, ti, ci)}</details></section>
      <section class="hubcharts">${sec.charts.map(c => hubScatter(D, c[0], c[1], c[2], c[3], ti, ci)).join("")}</section>
      ${typeof learnBox === "function" ? learnBox("<b>How to read the charts:</b> every dot is a team in your league; yours is orange. The lines are the league average, so the four boxes mean different styles — the label in each corner says which. Hover or tap a dot for the team.", "scatter") : ""}
      <section class="panel"><div class="ph"><h3>Who does it for ${esc(T.short)}</h3><span class="small muted">${hubKind() === "league" ? "league" : "all"} games this season · share = of the team's total</span></div>${hubPlayers(D, tab, ti)}</section>`;
  }
  h += `<p class="small muted">Team numbers are all of a first team's players' stats this season added up, per game (games = starts ÷ 11). Conceded, shots on target faced, saves and xG prevented come from the goalkeepers. FM27 saves don't store pressures, possession % or the opposition's shots and xG, so those Data Hub panels aren't here yet. Dots: every team in the ${esc(D.comp ? D.comp.name : "league")}; lines = league average.</p>`;
  main.innerHTML = h; renderSaveNote();
  if (S.sel != null && S.adCtx) inAdCtx(() => openPlayer(panelScore(), S.sel, true));
}
const hubTabsHtml = () => { const t = HUB_TABS.some(x => x[0] === S.hubTab) ? S.hubTab : "overview"; return HUB_TABS.map(([k, l]) => `<button class="ptab" data-hubtab="${k}" aria-selected="${!S.guide && !S.dataPage && k === t}">${l}</button>`).join(""); };
document.addEventListener("click", e => {
  const t = e.target.closest("[data-hubtab], [data-hubact]"); if (!t) return;
  if (t.dataset.hubtab) { S.guide = false; S.dataPage = false; S.mode = "hub"; S.hubTab = t.dataset.hubtab; S.sel = null; S.adCtx = null; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.hubact === "all") { const y = window.scrollY; S.hubAll = !S.hubAll; render(); window.scrollTo(0, y); }
});
document.addEventListener("change", e => {
  const t = e.target; if (!t.classList || !t.classList.contains("hubin")) return;
  const f = hubF(); f[t.dataset.f] = t.value; if (t.dataset.f === "comp" || t.dataset.f === "kind") { f.team = ""; f.cmp = ""; }
  render();
});

