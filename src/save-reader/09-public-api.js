  // ---------- public ----------
  async function readSave(input, opts) {
    opts = opts || {};
    const progress = opts.progress || (() => {});
    const src = source(input);
    progress("Reading the save directory", 0.02);
    const idx = await readIndex(src);
    const summary = await readSection(src, idx, "save_game_summary");
    const version = findVersion(summary);
    if (!version) fail("The game version could not be read from this save.", "version");
    if (version.major !== 26 && version.major !== 27) fail(`This save is from FM${version.major}. Scout Lab reads FM26 and FM27 saves.`, "version");
    const fm27 = version.major === 27;
    const info = await readSection(src, idx, "game_info");
    let clock = gameClock(info, fm27 ? GAME_INFO_FM27 : GAME_INFO_FM26);
    const sclock = summaryClock(summary, version.build);
    if (sclock) clock = { dbVersion: clock ? clock.dbVersion : null, date: sclock };
    const strings = summaryStrings(summary);
    if (!clock || !clock.date) {
      // fall back to the summary's own date (after the club uid)
      for (const s of strings) { const d = decodeDate(summary, s.end + 4); if (d && d.y > 2000) { clock = { dbVersion: null, date: d }; } }
    }
    if (!clock || !clock.date) fail("The save's in-game date could not be read, so ages can't be worked out.", "layout");
    progress("Unpacking the game database", 0.08);
    const db = await readSection(src, idx, "game_db");
    progress("Reading names and clubs", 0.35);
    const pools = locateNamePools(db);
    const clubs = readClubs(db, fm27 ? CLUB_TABLE_FM27 : CLUB_TABLE_FM26);
    progress("Finding players", 0.5);
    const located = locatePlayers(db, pools.end);
    progress(`Reading ${located.recs.length.toLocaleString()} players`, 0.6);
    const T = decodePlayers(db, located, clubs, pools, clock.date, fm27 ? PERSON_FM27 : PERSON_FM26);
    // managed club: a summary string followed by the uid of a club with that short name
    const managed = [];
    strings.forEach((s, i) => {
      if (s.end + 4 > summary.length) return;
      const c = clubs.byUid.get(u32(summary, s.end));
      if (c && c.short === s.text) managed.push({ club: c.name, short: c.short, uid: c.uid, manager: i > 0 && strings[i - 1].end === s.lenAt ? strings[i - 1].text : null });
    });
    // no club in the summary (the save was made while the manager had no job): take it from the save's name
    // ("Patryk Slowinski - Leicester (v02)"), picking the matching club with the most players
    if (!managed.length) {
      const nm = String(idx.saveName || src.name || "").replace(/^.*[\\/]/, "").replace(/\.fm$/i, "").replace(/^\d{6,}_/, "").replace(/_/g, " ");
      const m = nm.match(/ - (.+?)(?:\s*\(v?\d+\)|\s+\d+)?\s*$/), want = m ? m[1].trim().toLowerCase() : "";
      if (want.length >= 3) {
        const count = new Map(); for (let i = 0; i < T.n; i++) { const k = T.clubIdx[i]; if (k >= 0) count.set(k, (count.get(k) || 0) + 1); }
        let best = null, bestN = 0;
        T.clubs.forEach((name, k) => { const u = T.clubUid[k], c = clubs.byUid.get(u), sh = c ? String(c.short || "").toLowerCase() : "", nl = String(name).toLowerCase();
          if (!(sh === want || nl === want || nl.startsWith(want + " ") || sh.startsWith(want))) return;
          const n = count.get(k) || 0; if (n > bestN) { best = { club: name, short: c ? c.short : name, uid: u, manager: null, fromName: true }; bestN = n; } });
        if (best) managed.push(best);
      }
    }
    progress("Reading season stats", 0.8);
    let statsError = null;
    T.stats = {};
    try {
      const L = fm27 ? SEASON_FM27 : SEASON_FM26, season = await readSeasonStats(src, idx, L);
      if (season) {
        const byP = new Map(); for (let i = 0; i < T.n; i++) byP.set(T.pindex[i], i);
        // a player's season is stored per team: his registered team's lines, then one set per other team he played for.
        // League / All competitions count first-team games only; U23/U21/U19/U18 and B/II teams go to "youth"
        const SLOT = { league: [1, true], overall: [5, true], youth: [5, false] };
        const per = new Map();   // player -> [[teamId, lines]]
        season.recs.forEach(rec => { const i = byP.get(rec.key - 1); if (i == null || per.has(i)) return; per.set(i, [[T.teamId[i], rec.own], ...rec.others]); });
        for (const kind of Object.keys(SLOT)) {
          const [slot, wantSenior] = SLOT[kind], row = new Int32Array(T.n).fill(-1), lines = [];
          per.forEach((teams, i) => { const ls = teams.filter(([t, l]) => l[slot] != null && seniorTeam(clubs, t) === wantSenior).map(([, l]) => l[slot]); if (!ls.length) return; row[i] = lines.length; lines.push([i, ls]); });
          const cols = {}; STAT_FIELDS.forEach(f => { if (!L.unsupported.includes(f)) cols[f] = new Float32Array(lines.length).fill(NaN); });
          const one = {}; Object.keys(cols).forEach(f => { one[f] = new Float32Array(1); });
          lines.forEach(([i, ls], r) => {
            const gk = T.pos[i * 15] >= 18; decodeLineInto(season.body, ls[0], gk, L, cols, r);
            if (ls.length < 2) return;
            let rw = cols.average_rating[r] === cols.average_rating[r] ? cols.average_rating[r] * (cols.rated_appearances[r] || 0) : 0, rn = rw ? cols.rated_appearances[r] || 0 : 0;
            for (let q = 1; q < ls.length; q++) {
              decodeLineInto(season.body, ls[q], gk, L, one, 0);
              for (const f in cols) { if (f === "average_rating") continue; const v = one[f][0]; if (v !== v) continue; const a = cols[f][r]; cols[f][r] = a !== a ? v : a + v; }
              const ar = one.average_rating[0], ra = one.rated_appearances[0] || 0; if (ar === ar && ra) { rw += ar * ra; rn += ra; }
            }
            cols.average_rating[r] = rn ? rw / rn : NaN;
          });
          T.stats[kind] = { n: lines.length, row, cols };
        }
        T.statsV = 2;
        // team totals for the Data Hub: every first team's players' lines added up (league, all competitions)
        try { T.teams = teamTotals(T, clubs, per, season.body, L); } catch (e) { T.teams = null; }
      } else statsError = "The season statistics could not be found in this save.";
    } catch (e) { statsError = e.message; }
    progress("Reading matches", 0.9);
    try { T.matches = await readMatches(src, idx, clubs, managed[0] ? managed[0].uid : null); } catch (e) { T.matches = null; }
    try { T.upcoming = await readUpcoming(src, idx, clubs, managed[0] ? managed[0].uid : null, clock.date.iso); } catch (e) { T.upcoming = null; }
    let historyError = null;
    progress("Reading past seasons", 0.92);
    try { T.hist = await readHistory(src, idx, T, clubs, fm27); } catch (e) { T.hist = null; historyError = e.message; }
    delete T.histSel;
    let staffError = null;
    progress("Reading staff", 0.96);
    try { T.staff = readStaff(db, clubs, located, T, pools, clock.date, fm27 ? PERSON_FM27 : PERSON_FM26, fm27 ? STAFF_FM27 : STAFF_FM26); } catch (e) { T.staff = null; staffError = e.message; }
    // keep only players worth scouting: CA 100+, plus everyone at your own club (youth included). Done once, here, so every page,
    // score and ranking works on the smaller pool, and storing / reopening the save is about 5 times lighter.
    let cut = null;
    try { const mine = managed[0] ? clubs.clubs.findIndex(c => c.uid === managed[0].uid) : -1; cut = compactPlayers(T, i => T.ca[i] >= MIN_CA || (mine >= 0 && T.clubIdx[i] === mine)); } catch (e) { cut = null; }
    progress("Done", 1);
    let named = 0, withClub = 0; for (let i = 0; i < T.n; i++) { if (T.name[i]) named++; if (T.clubIdx[i] >= 0) withClub++; }
    T.meta = { cut, game: "FM" + version.major, build: version.build, saveName: idx.saveName, gameDate: clock.date.iso, dbVersion: clock.dbVersion, managed, statsError, historyError, staffError,
      check: { players: T.n, repeats: located.repeats, clubsTableBound: clubs.tableBound, clubs: clubs.clubs.length, named, withClub, withStats: T.stats.league ? T.stats.league.n : 0, withStatsOverall: T.stats.overall ? T.stats.overall.n : 0 } };
    return T;
  }
  const MIN_CA = 100;
  // the same cut for a save stored by an older Scout Lab (read before the cut existed): used when the tool reopens it
  function cutStored(T) {
    if (!T || !T.n || !T.ca || (T.meta && T.meta.cut)) return null;
    const m0 = T.meta && T.meta.managed && T.meta.managed[0], mine = m0 && T.clubUid ? T.clubUid.indexOf(m0.uid) : -1;
    const cut = compactPlayers(T, i => T.ca[i] >= MIN_CA || (mine >= 0 && T.clubIdx[i] === mine));
    if (T.meta) T.meta.cut = cut; return cut;
  }
  // drop players in place: every per-player array (length n, or n × a fixed width) keeps the kept rows in order;
  // season stats and past-season rows are re-pointed. Returns { minCA, before, after }.
  function compactPlayers(T, keepFn) {
    const n = T.n, keep = []; for (let i = 0; i < n; i++) if (keepFn(i)) keep.push(i);
    if (keep.length === n) return { minCA: MIN_CA, before: n, after: n };
    const m = keep.length, newIx = new Int32Array(n).fill(-1); keep.forEach((i, j) => { newIx[i] = j; });
    const pick = (v) => {
      if (!v || typeof v === "string" || v.length == null || v.length === 0 || v.length % n) return v;
      const w = v.length / n, out = Array.isArray(v) ? new Array(m * w) : new v.constructor(m * w);
      for (let j = 0; j < m; j++) { const i = keep[j]; for (let k = 0; k < w; k++) out[j * w + k] = v[i * w + k]; }
      return out;
    };
    for (const k of Object.keys(T)) { const v = T[k]; if (k === "clubs" || k === "clubShort" || k === "clubUid") continue; if (Array.isArray(v) || ArrayBuffer.isView(v)) T[k] = pick(v); }
    for (const kind of Object.keys(T.stats || {})) {   // season stats: keep the lines of kept players, renumbered
      const st = T.stats[kind]; if (!st || !st.row) continue;
      const lines = []; keep.forEach((i, j) => { if (st.row[i] >= 0) lines.push([j, st.row[i]]); });
      const row = new Int32Array(m).fill(-1), cols = {};
      for (const f in st.cols) { const a = st.cols[f], o = new a.constructor(lines.length); lines.forEach(([, r], q) => { o[q] = a[r]; }); cols[f] = o; }
      lines.forEach(([j], q) => { row[j] = q; });
      T.stats[kind] = { n: lines.length, row, cols };
    }
    if (T.hist && T.hist.player) {   // past seasons: only kept players' rows
      const H = T.hist, rows = []; for (let r = 0; r < H.n; r++) if (newIx[H.player[r]] >= 0) rows.push(r);
      const sub = a => { const o = new a.constructor(rows.length); rows.forEach((r, q) => { o[q] = a[r]; }); return o; };
      const lines = new Uint8Array(rows.length * H.rowBytes); rows.forEach((r, q) => lines.set(H.lines.subarray(r * H.rowBytes, (r + 1) * H.rowBytes), q * H.rowBytes));
      ["year", "kind", "team", "club", "comp", "youth"].forEach(k => { if (H[k]) H[k] = sub(H[k]); });
      H.player = Int32Array.from(rows, r => newIx[H.player[r]]); H.lines = lines; H.n = rows.length;
    }
    T.n = m;
    return { minCA: MIN_CA, before: n, after: m };
  }
  // transferable buffers of a table (for postMessage)
  function tableBuffers(T) {
    const out = [];
    const add = v => { if (ArrayBuffer.isView(v)) out.push(v.buffer); };
    Object.values(T).forEach(add);
    Object.values(T.stats || {}).forEach(k => { add(k.row); Object.values(k.cols).forEach(add); });
    if (T.hist) Object.values(T.hist).forEach(add);
    if (T.staff) Object.values(T.staff).forEach(add);
    if (T.teams) Object.values(T.teams).forEach(add);
    if (T.matches) Object.values(T.matches).forEach(add);
    return out;
  }
  // one player back as a plain object (checks and debugging)
  function playerObject(T, i, kind) {
    const pos = {}; POSITION_CODES.forEach((c, k) => { pos[c] = T.pos[i * 15 + k]; });
    const q = POSITION_CODES.map((c, k) => [T.pos[i * 15 + k], c]).filter(x => x[0] >= 15).sort((a, b) => b[0] - a[0]);
    const attrs = {}; ATTRIBUTE_ORDER.forEach((a, k) => { attrs[a] = T.attrs[i * 52 + k]; });
    const pers = {}; PERSONALITY_ORDER.forEach((a, k) => { pers[a] = T.pers[i * 8 + k]; });
    const b = T.birth[i], bd = b ? decodeDate(Uint8Array.of(b & 255, (b >>> 8) & 255, (b >>> 16) & 255, b >>> 24), 0) : null;
    const k = T.clubIdx[i], stats = {};
    Object.entries(T.stats || {}).forEach(([kd, S]) => { const r = S.row[i]; if (r >= 0) { stats[kd] = {}; Object.entries(S.cols).forEach(([f, c]) => { stats[kd][f] = isNaN(c[r]) ? null : Math.round(c[r] * 1e4) / 1e4; }); } });
    return { uid: T.uid[i], pindex: T.pindex[i], name: T.name[i] || null, age: T.age[i] < 0 ? null : T.age[i], birth: bd ? bd.iso : null, nation: T.nation[i] < 0 ? null : T.nation[i],
      height: T.height[i], ca: T.ca[i], pa: T.pa[i] < 0 ? null : T.pa[i], teamId: T.teamId[i] === MISSING ? null : T.teamId[i], club: k >= 0 ? T.clubs[k] : null, clubUid: k >= 0 ? T.clubUid[k] : null,
      value: isNaN(T.value[i]) ? null : T.value[i], positions: pos, natural: q.filter(x => x[0] >= 18).map(x => x[1]), accomplished: q.filter(x => x[0] < 18).map(x => x[1]),
      attrs, personality: pers, leftFoot: T.feet[i * 2], rightFoot: T.feet[i * 2 + 1], stats };
  }

  // ---------- Scout Lab table: the same columns an FM27 export has, stored by column ----------
  const ATTR_NAME = { crossing: "Crossing", dribbling: "Dribbling", finishing: "Finishing", heading: "Heading", long_shots: "Long Shots", marking: "Marking", off_the_ball: "Off The Ball",
    passing: "Passing", penalty_taking: "Penalty Taking", tackling: "Tackling", vision: "Vision", handling: "Handling", aerial_reach: "Aerial Reach", command_of_area: "Command Of Area",
    communication: "Communication", kicking: "Kicking", throwing: "Throwing", anticipation: "Anticipation", decisions: "Decisions", one_on_ones: "One On Ones", positioning: "Positioning",
    reflexes: "Reflexes", first_touch: "First Touch", technique: "Technique", flair: "Flair", corners: "Corners", teamwork: "Teamwork", work_rate: "Work Rate", long_throws: "Long Throws",
    eccentricity: "Eccentricity", rushing_out: "Rushing Out (Tendency)", punching: "Punching (Tendency)", acceleration: "Acceleration", free_kick_taking: "Free Kick Taking", strength: "Strength",
    stamina: "Stamina", pace: "Pace", jumping_reach: "Jumping Reach", leadership: "Leadership", balance: "Balance", bravery: "Bravery", aggression: "Aggression", agility: "Agility",
    natural_fitness: "Natural Fitness", determination: "Determination", composure: "Composure", concentration: "Concentration" };
  // FM position string ("D (RLC), WB (L), DM") from the 15 ratings: natural (18+) and accomplished (15-17) positions
  function positionString(pos, minRating) {
    const ok = c => (pos[c] || 0) >= minRating, out = [];
    if (ok("GK")) out.push("GK");
    const side = (pre, l, c, r) => { const s = (ok(r) ? "R" : "") + (ok(l) ? "L" : "") + (c && ok(c) ? "C" : ""); if (s) out.push(`${pre} (${s})`); };
    side("D", "DL", "DC", "DR"); side("WB", "WBL", null, "WBR");
    if (ok("DM")) out.push("DM");
    side("M", "ML", "MC", "MR"); side("AM", "AML", "AMC", "AMR");
    if (ok("STC")) out.push("ST (C)");
    return out.join(", ");
  }
  function bestPosition(pos) {
    let best = null; for (const c of POSITION_CODES) if (c !== "SW" && (!best || pos[c] > pos[best])) best = c;
    return best ? positionString({ [best]: 20 }, 20) : "";
  }
  const pct = (a, b) => (b ? (100 * a) / b : null);
  const per90 = (v, m) => (m ? (v * 90) / m : null);
  // [header, value(player, stats line)] — totals are per-90'd by Scout Lab from Minutes, like an export's totals
  const STAT_COLS = [
    ["Minutes", (p, s) => s && s.minutes], ["Appearances", (p, s) => s && `${s.starts} (${s.substitute_appearances})`], ["Starts", (p, s) => s && s.starts],
    ["Av Rat", (p, s) => s && s.average_rating], ["NP-xG", (p, s) => s && s.non_penalty_expected_goals], ["xG", (p, s) => s && s.expected_goals],
    ["Goals", (p, s) => s && s.goals], ["Pens S", (p, s) => s && s.penalties_scored], ["Pens", (p, s) => s && s.penalties_taken], ["Shots", (p, s) => s && s.shots],
    ["ShT", (p, s) => s && s.shots_on_target], ["Conv %", (p, s) => s && pct(s.goals, s.shots)], ["Shot %", (p, s) => s && pct(s.shots_on_target, s.shots)],
    ["Shots From Outside The Box Per 90 minutes", (p, s) => s && per90(s.shots_outside_box, s.minutes)], ["xG-OP", (p, s) => s && s.goals - s.expected_goals],
    ["xG/shot", (p, s) => s && (s.shots ? s.expected_goals / s.shots : null)], ["xA", (p, s) => s && s.expected_assists], ["Ast", (p, s) => s && s.assists],
    ["K Ps", (p, s) => s && s.key_passes], ["OP-KP", (p, s) => s && s.open_play_key_passes], ["CCC", (p, s) => s && s.clear_cut_chances_created],
    ["Pr Passes", (p, s) => s && s.progressive_passes], ["Drb", (p, s) => s && s.dribbles], ["Ps C", (p, s) => s && s.passes_completed], ["Pas A", (p, s) => s && s.passes_attempted],
    ["Pas %", (p, s) => s && pct(s.passes_completed, s.passes_attempted)], ["Poss Lost/90", (p, s) => s && per90(s.possession_lost, s.minutes)],
    ["Poss Won/90", (p, s) => s && per90(s.possession_won, s.minutes)], ["OP-Crs A", (p, s) => s && s.open_play_crosses_attempted],
    ["OP-Crs C", (p, s) => s && s.open_play_crosses_completed], ["OP-Cr %", (p, s) => s && s.open_play_crosses_completed != null ? pct(s.open_play_crosses_completed, s.open_play_crosses_attempted) : null],
    ["Cr A", (p, s) => s && s.crosses_attempted], ["Cr C", (p, s) => s && s.crosses_completed], ["Cr C/A", (p, s) => s && pct(s.crosses_completed, s.crosses_attempted)],
    ["Hdrs A", (p, s) => s && s.aerial_challenges_attempted], ["Hdrs", (p, s) => s && s.headers_won],
    ["Hdr %", (p, s) => s && s.headers_won != null ? pct(s.headers_won, s.aerial_challenges_attempted) : null], ["K Hdrs/90", (p, s) => s && per90(s.key_headers, s.minutes)],
    ["Hdrs L/90", (p, s) => s && s.headers_won != null && s.aerial_challenges_attempted != null ? per90(s.aerial_challenges_attempted - s.headers_won, s.minutes) : null],
    ["Tck C", (p, s) => s && s.tackles_completed], ["K Tck/90", (p, s) => s && per90(s.key_tackles, s.minutes)], ["Tck R", (p, s) => s && pct(s.tackles_completed, s.tackles_attempted)],
    ["Itc", (p, s) => s && s.interceptions], ["Blk", (p, s) => s && s.blocks], ["Shts Blckd", (p, s) => s && s.shots_blocked], ["Clear", (p, s) => s && s.clearances],
    ["Pres A", (p, s) => s && s.pressures_attempted], ["Pres C", (p, s) => s && s.pressures_completed],
    ["Sprints", (p, s) => s && s.high_intensity_sprints], ["Distance", (p, s) => s && s.distance_km], ["MLG", (p, s) => s && s.mistakes_leading_to_goal],
    ["Yel", (p, s) => s && s.yellow_cards], ["Red", (p, s) => s && s.red_cards], ["Fouls Against", (p, s) => s && s.fouls_against], ["Fouls", (p, s) => s && s.fouls_made],
    ["xGP", (p, s) => s && s.expected_goals_prevented], ["Svh", (p, s) => s && s.saves_held], ["Svp", (p, s) => s && s.saves_parried], ["Svt", (p, s) => s && s.saves_tipped],
    ["Sv %", (p, s) => s && s.saves_held != null && s.shots_on_target_faced ? pct(s.saves_held + s.saves_parried + s.saves_tipped, s.shots_on_target_faced) : null],
    ["Conc", (p, s) => s && s.goals_allowed], ["Clean Sheets", (p, s) => s && s.clean_sheets],
  ];
  G.FMSaveReader = { readSave, cutStored, readIndex, tableBuffers, playerObject, positionString, bestPosition, historyLine, STAT_COLS, ATTR_NAME, POSITION_CODES, ATTRIBUTE_ORDER, PERSONALITY_ORDER, STAT_FIELDS, HISTORY_KINDS: HISTORY.kindNames, STAFF_RATINGS: STAFF_RATINGS.map(r => r[0]), STAFF_PREFS: STAFF_PREFS.map(p => p[0]) };
})(typeof self !== "undefined" ? self : globalThis);
