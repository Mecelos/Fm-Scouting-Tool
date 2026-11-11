  // ---------- Data Hub: team totals and the season's matches ----------
  const TEAM_GK = ["goals_allowed", "clean_sheets", "saves_held", "saves_parried", "saves_tipped", "shots_on_target_faced", "expected_goals_prevented"];
  function teamTotals(T, clubs, per, body, L) {
    const clubIndex = new Map(clubs.clubs.map((c, k) => [c.uid, k])), idx = new Map(), teams = [];
    const fields = STAT_FIELDS.filter(f => !L.unsupported.includes(f));
    const KIND = { league: 1, overall: 5 };
    const acc = {}; Object.keys(KIND).forEach(k => { acc[k] = { f: [], g: [] }; });
    const slotOf = t => { if (idx.has(t)) return idx.get(t); const tc = clubs.teamToClub.get(t); const k = tc ? clubIndex.get(tc.uid) : null; if (k == null) return -1;
      const n = teams.length; idx.set(t, n); teams.push([t, k]); Object.keys(KIND).forEach(kd => { acc[kd].f.push(new Float64Array(fields.length)); acc[kd].g.push(new Float64Array(TEAM_GK.length)); }); return n; };
    const one = {}; STAT_FIELDS.forEach(f => { one[f] = new Float32Array(1); });
    const fq = fields.map((f, q) => [f, q]).filter(([f]) => f !== "average_rating"), gq = TEAM_GK.map((f, q) => [f, q]);
    per.forEach((list, i) => {
      const gk = T.pos[i * 15] >= 18;
      for (const kd in KIND) {
        const sl = KIND[kd], ls = list.filter(([t, lines]) => lines[sl] != null && seniorTeam(clubs, t)); if (!ls.length) continue;
        const kst = T.stats[kd], r = kst ? kst.row[i] : -1;
        ls.forEach(([t, lines]) => {
          const n = slotOf(t); if (n < 0) return;
          let src = kst ? kst.cols : null, at = r;
          if (ls.length > 1 || r < 0 || !src) { for (const f in one) one[f][0] = NaN; decodeLineInto(body, lines[sl], gk, L, one, 0); src = one; at = 0; }   // one team only: reuse the decoded line
          const F = acc[kd].f[n]; for (const [f, q] of fq) { const c = src[f]; if (!c) continue; const v = c[at]; if (v === v) F[q] += v; }
          if (gk) { const G = acc[kd].g[n]; for (const [f, q] of gq) { const c = src[f]; if (!c) continue; const v = c[at]; if (v === v) G[q] += v; } }
        });
      }
    });
    const n = teams.length, out = { n, team: Uint32Array.from(teams.map(x => x[0])), club: Int32Array.from(teams.map(x => x[1])), fields, gkFields: TEAM_GK.slice() };
    for (const kd in KIND) {
      const F = new Float32Array(n * fields.length), G = new Float32Array(n * TEAM_GK.length);
      for (let k = 0; k < n; k++) { F.set(acc[kd].f[k], k * fields.length); G.set(acc[kd].g[k], k * TEAM_GK.length); }
      out[kd] = F; out[kd + "Gk"] = G;
    }
    return out;
  }
  // the season's matches from the match statistics store: competition, home and away team
  // goals list in a match record: after "ff ff" + 16 zero bytes, u32 count, then 16-byte entries:
  // scorer key, assist key (ffffffff = none), match tick, side (0 home / 1 away: the scorer's team), type (0 open play, 1 set piece?, 2 penalty, 3 own goal, 4/5 shoot-out scored/missed), minute, extra
  function matchGoals(h) {
    let best = -1;
    for (let o = 0; o + 18 <= Math.min(h.length, 1500); o++) {
      if (h[o] !== 0xff || h[o + 1] !== 0xff) continue;
      let z = true; for (let k = 2; k < 18; k++) if (h[o + k] !== 0) { z = false; break; } if (!z) continue;
      const c = o + 18; if (c + 4 > h.length) continue; const n = u32(h, c); if (n > 40 || c + 4 + n * 16 > h.length) continue;
      let ok = true; for (let k = 0; k < n && ok; k++) { const e = c + 4 + 16 * k; if (h[e + 12] > 1 || h[e + 13] > 6 || h[e + 14] > 130) ok = false; }
      if (ok) best = c;
    }
    if (best < 0) return null;
    const n = u32(h, best), out = [];
    for (let k = 0; k < n; k++) { const e = best + 4 + 16 * k; out.push([u32(h, e), u32(h, e + 4), h[e + 12], h[e + 13], h[e + 14]]); }
    return out;
  }
  // a match record's player keys -> names ("0b 02 <key> 02 <player> 02 ffffffff <first> <last>")
  function matchNames(d, keys) {
    const want = new Set(keys.filter(k => k !== 0xffffffff)), out = new Map(); if (!want.size) return out;
    for (let o = 0; o + 24 < d.length && out.size < want.size; o++) {
      if (d[o] !== 0x0b || d[o + 1] !== 2 || d[o + 6] !== 2 || d[o + 11] !== 2 || d[o + 12] !== 0xff || d[o + 15] !== 0xff) continue;
      const k = u32(d, o + 2); if (!want.has(k) || out.has(k)) continue;
      const L1 = u32(d, o + 16); if (!(L1 > 0 && L1 < 40)) continue; const f = new TextDecoder().decode(d.subarray(o + 20, o + 20 + L1));
      const L2 = u32(d, o + 20 + L1), l = L2 > 0 && L2 < 40 ? new TextDecoder().decode(d.subarray(o + 24 + L1, o + 24 + L1 + L2)) : "";
      out.set(k, (f + " " + l).trim());
    }
    return out;
  }
  async function readMatches(src, idx, clubs, myUid) {
    if (!idx.sections.match_stats_cfg) return null;
    const d = await readSection(src, idx, "match_stats_cfg");
    const comps = [], compIx = new Map(), mid = [], comp = [], home = [], away = [], full = [], hg = [], ag = [], ev = [], mine = [];
    const isMine = t => { const tc = clubs.teamToClub.get(t); return myUid != null && tc && tc.uid === myUid; };
    const isTeam = t => clubs.teamToClub.has(t) || clubs.fielded.has(t);
    const tag = ascii("pks_");
    for (let p = find(d, tag, 0, d.length); p >= 0; p = find(d, tag, p + 4, d.length)) {
      let q = p + 4; while (q < d.length && d[q] >= 48 && d[q] <= 57) q++;
      const n = u32(d, q + 6); if (!(n > 0 && n < 100000)) continue;
      let e = q + 10; const base = e + n * 12 + 13;
      for (let k = 0; k < n; k++, e += 12) {
        const id = u32(d, e), off = u32(d, e + 4), sz = u32(d, e + 8), at = base + off;
        if (at + sz > d.length || u32(d, at) !== 0xfd2fb528) continue;
        const h = zstdHead(d.subarray(at, at + sz), 1600); if (!h || h.length < 200) continue;
        let name = null;
        for (let o = 40; o < 140 && !name; o++) { const L = u32(h, o); if (L >= 3 && L <= 60 && o + 4 + L <= h.length) { let ok = true; for (let c = 0; c < L; c++) { const ch = h[o + 4 + c]; if (ch < 32 || ch === 127) { ok = false; break; } } if (ok) name = new TextDecoder().decode(h.subarray(o + 4, o + 4 + L)); } }
        const ts = [];
        for (let o = 100; o + 6 <= h.length && ts.length < 2; o++) if (h[o] === 3 && h[o + 1] === 2) { const t = u32(h, o + 2); if (isTeam(t)) { ts.push(t); o += 5; } }
        if (!name || ts.length < 2) continue;
        let c = compIx.get(name); if (c == null) { c = comps.length; comps.push(name); compIx.set(name, c); }
        const g = matchGoals(h); let a = 255, b = 255;
        if (g) { a = 0; b = 0; g.forEach(([, , side, type, minute]) => { if (type >= 4) return; if ((type === 3) === (side === 1)) a++; else b++; ev.push(mid.length, minute, side, type); }); }
        if (g && g.length && (isMine(ts[0]) || isMine(ts[1]))) {   // your matches: who scored and assisted
          let names = new Map(); try { names = matchNames(zstd(d.subarray(at, at + sz)), g.flatMap(x => [x[0], x[1]])); } catch (e) { }
          mine.push({ r: mid.length, goals: g.filter(x => x[3] < 4).map(([s, as, side, type, minute]) => ({ m: minute, side: type === 3 ? 1 - side : side, type, by: names.get(s) || "", as: names.get(as) || "" })),
            shoot: g.filter(x => x[3] >= 4).map(([s, , side, type]) => ({ side, scored: type === 4, by: names.get(s) || "" })) });
        }
        mid.push(id); comp.push(c); home.push(ts[0]); away.push(ts[1]); full.push(sz > 120000 ? 1 : 0); hg.push(a); ag.push(b);
      }
    }
    // events: [match row, minute, side of the scorer's team, type] per goal; own goals count for the other side (side here = team credited)
    const E = Uint16Array.from(ev); for (let k = 0; k < E.length; k += 4) if (E[k + 3] === 3) E[k + 2] = 1 - E[k + 2];
    return { n: mid.length, comps, id: Uint32Array.from(mid), comp: Uint16Array.from(comp), home: Uint32Array.from(home), away: Uint32Array.from(away), full: Uint8Array.from(full),
      hg: Uint8Array.from(hg), ag: Uint8Array.from(ag), ev: E, mine, v: 2 };
  }
  // your upcoming games, from the inbox (news). The save keeps no readable fixture list, but match previews and opposition
  // reports name the game: "<u16 date: day of year in the low 9 bits, counted from 1> <u16 year> ... <your team u32> 00 <opponent u32>".
  // Returns every such game on or after the save date, earliest first: [{ date: "YYYY-MM-DD", team, club }].
  async function readUpcoming(src, idx, clubs, myUid, today) {
    if (!idx.sections.news || myUid == null || !today) return null;
    const d = await readSection(src, idx, "news");
    const Y = +today.slice(0, 4), clubIx = new Map(clubs.clubs.map((c, k) => [c.uid, k]));
    const mine = []; clubs.teamToClub.forEach((tc, t) => { if (tc.uid === myUid && tc.slot === 0) mine.push(t); });
    const isTeam = t => clubs.teamToClub.has(t) || clubs.fielded.has(t), found = new Map();
    for (const me of mine) {
      const pat = new Uint8Array([me & 255, (me >> 8) & 255, (me >> 16) & 255, me >>> 24]);
      for (let o = find(d, pat, 45, d.length); o >= 0; o = find(d, pat, o + 1, d.length)) {
        for (const at of [o + 5, o - 5]) {
          if (at + 4 > d.length || d[at > o ? o + 4 : o - 1] !== 0) continue;
          const t = u32(d, at); if (t === me || mine.includes(t) || !isTeam(t)) continue;
          let iso = null;
          for (let k = Math.min(o, at) - 4; k >= o - 40 && !iso; k--) {
            const y = u16(d, k + 2), day = u16(d, k) & 0x1ff;
            if ((y === Y || y === Y + 1) && day >= 1 && day <= 366) iso = new Date(Date.UTC(y, 0, day)).toISOString().slice(0, 10);
          }
          if (!iso || iso < today) continue;
          const tc = clubs.teamToClub.get(t), key = iso + "|" + t;
          if (!found.has(key)) found.set(key, { date: iso, team: t, club: tc && clubIx.has(tc.uid) ? clubIx.get(tc.uid) : -1 });
        }
      }
    }
    return [...found.values()].sort((a, b) => a.date.localeCompare(b.date));
  }
  // first team of a club (not its U23/U21/U19/U18 side, not a B/II team it fields); teams we can't place count as first teams
  function seniorTeam(clubs, t) {
    if (t == null || t === MISSING) return true;
    if (clubs.fielded.has(t)) return false;
    const tc = clubs.teamToClub.get(t); return tc ? tc.slot === 0 : true;
  }
  function decodeLineInto(body, o, gk, L, cols, r) {
    const rd = (off, code) => code === "B" ? body[o + off] : code === "h" ? i16(body, o + off) : u16(body, o + off);
    for (const [name, off, code, unit] of SEASON_FIELDS) { if (!L.unsupported.includes(name)) cols[name][r] = unit === 1 ? rd(off, code) : rd(off, code) / unit; }
    for (const [name, off, code, unit] of (gk ? SEASON_GK : SEASON_OUTFIELD)) cols[name][r] = unit === 1 ? rd(off, code) : rd(off, code) / unit;
    const rated = body[o + L.rated];
    cols.average_rating[r] = rated ? u16(body, o + L.ratingSum) / (rated * L.ratingScale) : NaN;
  }

