  // ---------- name pools ----------
  function locateNamePools(db) {
    const L = NAME_POOLS, sig = new Uint8Array(24), dv = new DataView(sig.buffer);
    L.signature.forEach((w, i) => dv.setUint32(i * 4, w, true));
    const prefix = sig.subarray(0, 5);
    let found = null, at = -1;
    while ((at = find(db, prefix, at + 1)) >= 0) {
      if (at + 24 > db.length) break;
      const st = db.slice(at, at + 24); L.unchecked.forEach(k => { st[k] = 0; });
      const w = [0, 1, 2, 3, 4, 5].map(i => u32(st, i * 4));
      const scale = w[3] / L.signature[3];
      if (!(Number.isInteger(scale) && scale >= 1 && scale <= L.maxScale && w[0] === L.signature[0] && w[1] === L.signature[1]
        && w[2] === L.signature[2] * scale && w[4] === L.signature[4] * scale && w[5] === L.signature[5])) continue;
      const pools = readPools(db, at + 24);
      if (!pools) continue;
      if (found) fail("the name pools are not unique", "layout");
      found = pools;
    }
    if (!found) fail("the name pools were not found", "layout");
    return found;
  }
  function readPools(db, cursor) {
    const pools = [];
    for (let p = 0; p < 3; p++) {
      if (cursor + 4 > db.length) return null;
      const count = u32(db, cursor); let pos = cursor + 4;
      if (count * 8 > db.length - pos) return null;
      const offs = new Uint32Array(count);
      for (let i = 0; i < count; i++) {
        if (pos + 8 > db.length) return null;
        const id = u32(db, pos), len = u32(db, pos + 4);
        if (id !== i || len > NAME_POOLS.maxName) return null;
        offs[i] = pos + 4; pos += 8 + len;
      }
      if (pos > db.length) return null;
      pools.push(offs); cursor = pos;
    }
    return { first: pools[0], sur: pools[1], common: pools[2], end: cursor };
  }
  function poolName(db, offs, idx) {
    if (idx === MISSING || idx < 0 || idx >= offs.length) return null;
    const at = offs[idx], n = u32(db, at);
    if (!n) return null;
    return str(db, at + 4, at + 4 + n, true);
  }

  // ---------- clubs ----------
  function steps(db, pos, list, max) {
    for (const s of list) {
      let count = 1;
      if (s.count) {
        if (pos + s.count > db.length) return null;
        count = s.count === 1 ? db[pos] : s.count === 2 ? u16(db, pos) : u32(db, pos);
        pos += s.count;
        if (count > max) return null;
      }
      pos += count * s.lead;
      if (pos > db.length) return null;
    }
    return pos;
  }
  function clubTableRecord(db, body, T) {
    if (body < 0 || body >= db.length) return null;
    const kind = db[body];
    if (kind !== T.ordinary && kind !== T.extended) return null;
    let c = body + 1 + T.prefix + (kind === T.extended ? T.extendedPrefix : 0);
    for (let k = 0; k < 2; k++) {
      if (c + 4 > db.length) return null;
      const n = u32(db, c); if (n > T.maxName) return null;
      c += 4 + n; if (c > db.length) return null;
    }
    c = steps(db, c, T.afterNames, T.maxEntries);
    if (c == null || c >= db.length) return null;
    const fin = db[c]; c += 1;
    if (fin === T.baseFinanceTag) c += T.baseFinanceBytes;
    else if (fin === T.fullFinanceTag) c = steps(db, c, T.fullFinance, T.maxEntries);
    else if (fin !== T.emptyFinanceTag) return null;
    if (c == null || c > db.length) return null;
    const teamCounts = c;
    c = steps(db, c, T.afterFinance, T.maxEntries);
    if (c == null || c + 12 > db.length) return null;
    return { body, footer: c, uid: u32(db, c + 4), teamCounts };
  }
  function walkClubTable(db, head, T) {
    if (head < 0 || head + T.headerBytes > db.length) return null;
    const count = u32(db, head);
    if (count < T.countRange[0] || count > T.countRange[1] || db[head + 4] !== 0 || count > db.length / 12) return null;
    let c = head + T.headerBytes; const rows = [], seen = new Set();
    for (let i = 0; i < count; i++) {
      const row = clubTableRecord(db, c, T); if (!row) return null;
      const stored = u32(db, row.footer), uid = u32(db, row.footer + 4);
      if (stored !== i || uid === 0 || uid === MISSING || seen.has(uid)) return null;
      seen.add(uid); rows.push(row); c = row.footer + 12;
    }
    return rows;
  }
  function clubNames(db, start) {
    const L = CLUB_RECORDS, at = start + L.longName;
    if (at + 4 > db.length) return null;
    const ln = u32(db, at); if (ln < 1 || ln > L.maxName) return null;
    const sAt = at + 4 + ln; if (sAt + 4 > db.length) return null;
    const sn = u32(db, sAt); if (sn < 1 || sn > L.maxName) return null;
    if (sAt + 4 + sn > db.length) return null;
    const name = str(db, at + 4, sAt), short = str(db, sAt + 4, sAt + 4 + sn);
    return name == null || short == null ? null : [name, short];
  }
  function acceptClub(db, start, identity, allowMissingNation) {
    const L = CLUB_RECORDS, inR = v => v >= L.nationRange[0] && v <= L.nationRange[1];
    const nation = u32(db, start + L.nation), missingMain = allowMissingNation && nation === MISSING;
    if (!missingMain && !inR(nation)) return null;
    if (!inR(u32(db, start + L.nationCopy)) || !inR(u32(db, start + L.faNation))) return null;
    if (!identity || missingMain) {
      const uid = u32(db, start + L.uid);
      if (u32(db, start + L.uidCopy) !== uid) return null;
      if (!identity) identity = [u32(db, start + L.clubIndex) + 1, uid + 1];
    }
    const names = clubNames(db, start); if (!names) return null;
    return { start, index: identity[0], uid: identity[1] >>> 0, nation: missingMain ? null : nation, name: names[0], short: names[1] };
  }
  function scanClubRecords(db) {
    const L = CLUB_RECORDS, hdr = 43, recs = [];
    let last = 0, hit = find(db, L.anchor, L.anchorOffset);
    while (hit >= 0) {
      const start = hit - L.anchorOffset;
      if (recs.length && start - last >= L.stopGap) break;
      if (start + hdr <= db.length && db[start + L.zeroByte] === 0) {
        const r = acceptClub(db, start, null, false);
        if (r) { recs.push(r); last = start; }
      }
      hit = find(db, L.anchor, hit + 1);
    }
    return { recs, scanEnd: recs.length ? Math.min(last + L.stopGap, db.length) : db.length };
  }
  function parseTeamList(db, start, end) {
    const L = TEAM_LISTS; let c = start + L.countsOffset;
    for (const [eb, lead] of [[L.firstEntry, L.firstLead], [L.secondEntry, L.secondLead]]) {
      if (c >= end) return null;
      const s = c + 1, e = s + db[c] * eb;
      if (e > end) return null;
      for (let p = s; p < e; p += eb) if (db[p] !== lead) return null;
      c = e;
    }
    const tcAt = c + L.filler; if (tcAt >= end) return null;
    const tc = db[tcAt];
    if (tc < L.teamCountRange[0] || tc > L.teamCountRange[1]) return null;
    const ids = [], s = tcAt + 1;
    if (s + tc * 4 > end) return null;
    for (let k = 0; k < tc; k++) { const id = u32(db, s + k * 4); if (id < L.teamIdRange[0] || id > L.teamIdRange[1]) return null; ids.push(id); }
    // then the affiliated-team list: teams other club records store but this club fields (its B and youth sides)
    const ac = s + tc * 4, aff = [];
    if (ac < end) {
      const n = db[ac];
      if (n >= 1 && n <= L.affiliateMax && ac + 1 + n * 4 <= end) {
        for (let k = 0; k < n; k++) { const id = u32(db, ac + 1 + k * 4); if (id < L.teamIdRange[0] || id > L.teamIdRange[1]) { aff.length = 0; break; } aff.push(id); }
      }
    }
    ids.aff = aff; ids.affAt = ac;
    return ids;
  }
  function readTeamList(db, start, end, countsStart) {
    const L = TEAM_LISTS;
    if (countsStart != null) return parseTeamList(db, countsStart - L.countsOffset, end) || [];
    const t = find(db, L.nullTriple, start, end);
    if (t >= 0) { const r = parseTeamList(db, t, end); if (r) return r; }
    let f = find(db, L.floatAnchor, start + L.minFloatAnchor, end);
    while (f >= 0) { const r = parseTeamList(db, f - L.floatAnchorOffset, end); if (r) return r; f = find(db, L.floatAnchor, f + 1, end); }
    return [];
  }
  function readClubs(db, T) {
    const L = CLUB_RECORDS;
    let { recs, scanEnd } = scanClubRecords(db);
    let bound = null;
    // the counted club table authenticates every club (full saves)
    const prefixEnd = recs.length ? recs[0].start + L.anchorOffset + 4 : db.length;
    const anchorDist = L.anchorOffset - L.zeroByte, heads = new Set();
    let hit = find(db, L.anchor, 0, prefixEnd);
    while (hit >= 0) {
      for (const extra of [0, T.extendedPrefix]) {
        const body = hit - anchorDist - extra, head = body - T.headerBytes;
        if (head < 0 || db[head + 4] !== 0) continue;
        if (db[body] !== (extra ? T.extended : T.ordinary)) continue;
        const row = clubTableRecord(db, body, T); if (!row) continue;
        const count = u32(db, head);
        const plausible = count >= T.countRange[0] && count <= T.countRange[1];
        const closesFirst = recs.length && row.footer === recs[0].start;
        if ((plausible || closesFirst) && row.uid !== 0 && row.uid !== MISSING) heads.add(head);
      }
      hit = find(db, L.anchor, hit + 1, prefixEnd);
    }
    const tables = [];
    [...heads].sort((a, b) => a - b).forEach(h => {
      const rows = walkClubTable(db, h, T); if (!rows) return;
      const tEnd = rows[rows.length - 1].footer + 12;
      if (recs.every(r => rows[0].body <= r.start + L.zeroByte && r.start + L.zeroByte < tEnd)) tables.push(rows);
    });
    if (tables.length === 1) {
      const rows = tables[0]; bound = [];
      rows.forEach((row, i) => {
        const extra = db[row.body] === T.extended ? T.extendedPrefix : 0;
        const start = row.body + extra - L.zeroByte;
        if (i && extra) return;
        if (i && find(db, L.anchor, start + L.anchorOffset, start + L.anchorOffset + 4) < 0) return;
        const uid = i === 0 ? 0 : (rows[i - 1].uid + 1) >>> 0;
        let r = acceptClub(db, start, [i, uid], i !== 0);
        if (r && r.nation == null && !readTeamList(db, start, row.footer, row.teamCounts).length) r = null;
        if (!r) return;
        r.start = i === 0 ? row.body : start; r.end = row.footer; r.teamCounts = row.teamCounts;
        bound.push(r);
      });
    }
    const clubs = bound || recs;
    if (!bound) clubs.forEach((r, i) => { r.end = i + 1 < clubs.length ? clubs[i + 1].start : scanEnd; });
    const teamToClub = new Map(), byUid = new Map(), lists = new Map();
    clubs.forEach(r => {
      byUid.set(r.uid, r);
      const ids = readTeamList(db, r.start, r.end, r.teamCounts); lists.set(r, ids); r.teamListEnd = ids.affAt != null ? ids.affAt : null;
      ids.forEach((id, slot) => { if (!teamToClub.has(id)) teamToClub.set(id, { uid: r.uid, slot }); });
    });
    // a team another club controls is fielded by that club (fmsave affiliate_team_to_club): its players are the parent's
    const fielded = new Map(), parentOf = new Map();
    clubs.slice().sort((a, b) => a.start - b.start).forEach(r => {
      const ids = lists.get(r), own = ids.length, taken = [];
      (ids.aff || []).forEach(id => {
        const st = teamToClub.get(id);
        if (!st || st.uid === r.uid || fielded.has(id) || taken.includes(id)) return;
        taken.push(id); fielded.set(id, { uid: r.uid, slot: own + taken.length - 1, storedBy: st.uid });
        if (!parentOf.has(st.uid)) parentOf.set(st.uid, r.uid);
      });
    });
    return { clubs, teamToClub, fielded, parentOf, byUid, lists, tableBound: !!bound };
  }

