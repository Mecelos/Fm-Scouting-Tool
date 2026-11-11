  // ---------- players ----------
  function locatePlayers(db, namePoolsEnd) {
    const L = PLAYER, out = [], seenAt = new Set();
    const lo = Math.min(L.ratingRange[0], L.attrRange[0]), hi = Math.max(L.ratingRange[1], L.editedAttrMax);
    const patternAt = p => {
      for (let k = 0; k < L.ratingsCount; k++) { const v = db[p + k]; if (v < L.ratingRange[0] || v > L.ratingRange[1]) return false; }
      for (let k = 0; k < L.attrCount; k++) { const v = db[p + L.ratingsCount + k]; if (v < L.attrRange[0] || v > L.editedAttrMax) return false; }
      return true;
    };
    const accept = (rec, checkPattern) => {
      const h0 = rec + L.pindex;
      if (h0 < 0 || rec + L.kind < 0 || rec + Math.max(L.attrs + L.attrCount, L.kind + 1) > db.length || rec + L.teamId + 4 > db.length) return null;
      const uid = u32(db, rec + L.uid), uidCopy = u32(db, rec + L.uidCopy);
      if (uid === 0 || uid === MISSING || uidCopy === 0 || uidCopy === MISSING) return null;
      const kindOk = L.kinds.includes(db[rec + L.kind]);
      if (uid !== uidCopy && (uid < L.allocatedUidMin || !kindOk)) return null;
      const ca = u16(db, rec + L.ca), pa = i16(db, rec + L.pa);
      let maxAttr = 0; for (let k = 0; k < L.attrCount; k++) if (db[rec + L.attrs + k] > maxAttr) maxAttr = db[rec + L.attrs + k];
      let hiCA = L.caRange[1], hiPA = L.paRange[1];
      if (ca > hiCA || pa > hiPA || maxAttr > L.attrRange[1]) {
        if (uid !== uidCopy || !kindOk) return null;
        hiCA = hiPA = L.editedAbilityMax;
      }
      if (!(ca >= L.caRange[0] && ca <= hiCA && pa >= L.paRange[0] && pa <= hiPA)) return null;
      const bucket = db[rec + L.repBucket];
      if (bucket < L.repBucketRange[0] || bucket > L.repBucketRange[1]) return null;
      if (checkPattern && !patternAt(rec + L.ratings)) return null;
      return { rec, pindex: u32(db, rec + L.pindex), uid };
    };
    // 1. marker anchor
    let hit = find(db, L.marker, 0);
    while (hit >= 0) {
      const rec = hit - L.markerOffset, a = accept(rec, true);
      if (a && rec + L.decodeExtent <= db.length) { out.push(a); seenAt.add(rec); }
      hit = find(db, L.marker, hit + 1);
    }
    // 2. completeness pass after the name pools: ratings then attributes, non-overlapping matches
    const need = L.ratingsCount + L.attrCount;
    let p = namePoolsEnd;
    const n = db.length;
    while (p < n) {
      // find a run of `need` bytes inside [lo, hi]
      let runStart = -1, len = 0;
      for (; p < n; p++) { const v = db[p]; if (v >= lo && v <= hi) { if (!len) runStart = p; len++; if (len >= need) break; } else len = 0; }
      if (p >= n) break;
      let runEnd = runStart + need; while (runEnd < n && db[runEnd] >= lo && db[runEnd] <= hi) runEnd++;
      let q = runStart;
      while (q + need <= runEnd) {
        if (patternAt(q)) {
          const rec = q - L.ratings;
          if (!seenAt.has(rec)) { const a = accept(rec, false); if (a && rec + L.decodeExtent <= db.length) { out.push(a); seenAt.add(rec); } }
          q += need;
        } else q++;
      }
      p = runEnd;
    }
    out.sort((a, b) => a.rec - b.rec);
    // a repeated pindex or uid means the layout does not fit; keep the first
    const seenP = new Set(), seenU = new Set(), recs = [];
    let repeats = 0;
    out.forEach(r => { if (seenP.has(r.pindex) || seenU.has(r.uid)) { repeats++; return; } seenP.add(r.pindex); seenU.add(r.uid); recs.push(r); });
    return { recs, repeats };
  }
  function closingHeader(db, personId, from, to, uidFloor, uidCeil) {
    if (personId >= MISSING) return null;
    const needle = p32(personId + 1), last = db.length - 12;
    let found = null, hit = find(db, needle, from, to);
    while (hit >= 0 && hit <= last) {
      const uid = u32(db, hit + 4), copy = u32(db, hit + 8);
      if (uid === copy && uid !== MISSING && uid > uidFloor && (uidCeil == null || uid <= uidCeil)) { if (found) return null; found = [hit, uid]; }
      hit = find(db, needle, hit + 1, to);
    }
    return found;
  }
  function personDecoder(db, pools, clock, P) {
    const zeroOff = P.personality - 1, inRange = v => v >= P.personalityRange[0] && v <= P.personalityRange[1];
    const nameCache = [new Map(), new Map()];
    const pn = (k, offs, id) => { const c = nameCache[k]; if (c.has(id)) return c.get(id); const v = poolName(db, offs, id); c.set(id, v); return v; };
    function tryAt(birth, windowEnd) {
      if (birth - 4 < 0 || birth + 4 > db.length) return null;
      const packed = u16(db, birth), year = u16(db, birth + 2);
      if (packed >> 9) return null;
      const doy = packed & 0x1FF; if (doy < 1 || doy > 366) return null;
      if (year < 1901 || year > clock.y) return null;
      const z = birth + P.dateZero; for (let k = 0; k < P.dateZeroCount; k++) if (db[z + k] !== 0) return null;
      let legal = 0;
      if (u32(db, birth - 4) !== 0) {
        legal = -1;
        for (let L = P.legalMin; L <= P.legalMax; L++) { const at = birth - 4 - L; if (at < 0) return null; if (u32(db, at) === L) { legal = L; break; } }
        if (legal < 0) return null;
      }
      const block = birth - P.legalNameFromBlock - legal, nb = block + P.traitBitsFromBlock;
      if (nb < 0) return null;
      const firstId = u32(db, nb + 8), surId = u32(db, nb + 13), commonId = u32(db, nb + 18);
      if (db[nb + 12] || db[nb + 17] || db[nb + 22]) return null;
      const lim = P.nameIdLimit;
      if ((firstId !== MISSING && firstId >= lim) || (surId !== MISSING && surId >= lim) || (commonId !== MISSING && commonId >= lim)) return null;
      const bd = decodeDate(db, birth);
      let age = null;
      if (bd) age = clock.y - bd.y - ((clock.m < bd.m || (clock.m === bd.m && clock.d < bd.d)) ? 1 : 0);
      const nation = u16(db, birth + P.nation);
      const first = pn(0, pools.first, firstId), last = pn(1, pools.sur, surId);
      let common = null;
      if (commonId !== MISSING) for (const offs of [pools.common, pools.first, pools.sur]) { const v = poolName(db, offs, commonId); if (v != null) { common = v; break; } }
      const legalName = legal ? str(db, block + P.legalNameFromBlock, block + P.legalNameFromBlock + legal, true) : null;
      const joined = first != null && last != null ? first + " " + last : first != null ? first : last;
      return { name: common != null ? common : joined != null ? joined : legalName, birthRaw: bd ? u32(db, birth) : 0, age, nation, persAt: birth + P.personality, block };
    }
    return function decode(start, end) {
      const s = start + zeroOff, need = P.personalityCount;
      let found = null;
      for (let z = s; z + need < end; z++) {
        if (db[z] !== 0) continue;
        let ok = true; for (let k = 1; k <= need; k++) if (!inRange(db[z + k])) { ok = false; break; }
        if (!ok) continue;
        const r = tryAt(z - zeroOff, end);
        if (!r) continue;
        if (!P.unique) return r;
        if (found) return null;
        found = r;
      }
      return found;
    };
  }
  const SCALE = new Uint8Array(256).map((_, v) => Math.max(1, Math.floor((v + 2) / 5)));
  // every player into one compact table (typed arrays by column), so 200,000+ players fit in memory and storage
  function decodePlayers(db, located, clubs, pools, clock, P) {
    const L = PLAYER, persons = personDecoder(db, pools, clock, P), recs = located.recs, n = recs.length;
    const clubIndex = new Map(clubs.clubs.map((c, k) => [c.uid, k]));
    const T = { v: 2, n, name: new Array(n), uid: new Uint32Array(n), pindex: new Uint32Array(n), teamId: new Uint32Array(n), clubIdx: new Int32Array(n).fill(-1), teamSlot: new Int8Array(n).fill(-1),
      age: new Int16Array(n).fill(-1), birth: new Uint32Array(n), nation: new Int32Array(n).fill(-1), height: new Uint8Array(n), ca: new Int16Array(n), pa: new Int16Array(n), histSel: new Uint32Array(n).fill(MISSING),
      value: new Float64Array(n).fill(NaN), rep: new Uint16Array(n * 3), pos: new Uint8Array(n * 15), feet: new Uint8Array(n * 2), attrs: new Uint8Array(n * 52), pers: new Uint8Array(n * 8), traits: new Uint8Array(n * 8),
      clubs: clubs.clubs.map(c => c.name), clubShort: clubs.clubs.map(c => c.short), clubUid: Float64Array.from(clubs.clubs.map(c => c.uid)) };
    for (let i = 0; i < n; i++) {
      const { rec, pindex, uid } = recs[i];
      const last = i === n - 1, winEnd = last ? db.length : recs[i + 1].rec;
      const teamRaw = u32(db, rec + L.teamId);
      T.uid[i] = uid; T.pindex[i] = pindex; T.teamId[i] = teamRaw;
      const tc = teamRaw !== MISSING ? clubs.fielded.get(teamRaw) || clubs.teamToClub.get(teamRaw) : null;
      if (tc) { const k = clubIndex.get(tc.uid); if (k != null) { T.clubIdx[i] = k; T.teamSlot[i] = tc.slot; } }
      T.pos.set(db.subarray(rec + L.ratings, rec + L.ratings + L.ratingsCount), i * 15);
      let ai = 0;
      for (let k = 0; k < L.attrCount; k++) { if (k === L.leftFoot || k === L.rightFoot) continue; T.attrs[i * 52 + ai++] = SCALE[db[rec + L.attrs + k]]; }
      T.feet[i * 2] = SCALE[db[rec + L.attrs + L.leftFoot]]; T.feet[i * 2 + 1] = SCALE[db[rec + L.attrs + L.rightFoot]];
      const tv = u32(db, rec + L.transferValue);
      if (!(tv === MISSING || tv === L.valuePlaceholder || tv === 0)) T.value[i] = tv;
      T.height[i] = db[rec + L.height]; T.ca[i] = u16(db, rec + L.ca); T.pa[i] = i16(db, rec + L.pa);
      T.rep[i * 3] = u16(db, rec + L.homeRep); T.rep[i * 3 + 1] = u16(db, rec + L.curRep); T.rep[i * 3 + 2] = u16(db, rec + L.worldRep);
      const nextUid = last ? null : u32(db, winEnd + L.uid);
      const closing = closingHeader(db, pindex, rec + L.decodeExtent, winEnd, uid, nextUid);
      const person = persons(rec + L.personWindowStart, closing ? closing[0] : winEnd);
      if (person) {
        T.name[i] = person.name || ""; T.birth[i] = person.birthRaw; if (person.age != null) T.age[i] = person.age; T.nation[i] = person.nation;
        T.pers.set(db.subarray(person.persAt, person.persAt + 8), i * 8);
        if (person.block >= 8) T.traits.set(db.subarray(person.block - 8, person.block), i * 8);   // player traits: a 64-bit set just before the name block
        const so = person.block + HISTORY.selectorFromBlock;
        if (so >= rec && so + 4 <= winEnd) T.histSel[i] = u32(db, so);
      } else T.name[i] = "";
    }
    return T;
  }
  const STAT_FIELDS = [...new Set([...SEASON_FIELDS, ...SEASON_OUTFIELD, ...SEASON_GK].map(f => f[0]))].concat(["average_rating"]);
