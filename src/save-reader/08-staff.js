  // ---------- staff (fmsave readers/staff.py): everyone a club employs who is not a player ----------
  // A club lists its staff in three lists after its affiliated teams (0 medical, 1 coaching, 2 recruitment). Every contract
  // record whose selector is not a player belongs to the staff object whose header sits just in front of it.
  // An object holds CA/PA, 26 preference slots and 26 more bytes; FM keeps the staff ratings in those (1-100, or 1-20).
  const STAFF = { uid: 4, uidCopy: 8, kind: 12, staffKind: 1, humanKind: 9, allocatedUidMin: 2000000000, entryCount: 13, entryBytes: 7, abilityBase: 21,
    abilityRange: [1, 200], r4: 4, codes: 5, codeCount: 8, codeSet: new Set([3, 4, 7, 22, 27, 28, 29, 30, 32, 33, 35, 62, 63, 64]), sentinel: 13, sentinelValue: 12,
    prefs: 14, prefCount: 26, prefRange: [1, 20], prefSkip: 13, prefSentinel: [2, 100], b40: 40, b40Count: 26, b40Range: [1, 100],
    listCount: 3, listMax: 0xFFFFFF, headerSearch: 32768, blockAfterTag: 60, blockSearch: 4096, listOnlySearch: 20000,
    tag: bytes(1, 0, 0x6c, 7), selector: 5, teamId: 9, wage: 17, start: -19, tailBase: 66, tailStep: 29, tailMax: 200, tailEvent: 42, tailEnd: 28, job: 16, offer: 19 };
  const STAFF_FM26 = { ...STAFF, listCountBytes: 1, unsetCodesOk: false, noContract: null };
  const STAFF_FM27 = { ...STAFF, listCountBytes: 2, unsetCodesOk: true, noContract: { selector: 16, lead: [5, 5] } };
  // [name, where, slot, top of its scale]: "b" = the 26 bytes at +40, "p" = the preference slots, "a" = personality adaptability
  const STAFF_RATINGS = [["goalkeeping", "b", 1, 100], ["judging_player_ability", "b", 2, 100], ["judging_player_potential", "b", 3, 100], ["people_management", "b", 4, 100],
    ["motivating", "b", 5, 100], ["physiotherapy", "b", 6, 100], ["tactical_knowledge", "b", 7, 100], ["attacking", "b", 8, 100], ["defending", "b", 9, 100], ["fitness", "b", 10, 100],
    ["possession", "b", 11, 100], ["technical", "b", 12, 100], ["tactical", "b", 13, 100], ["analysing_data", "b", 18, 100], ["sports_science", "b", 21, 100], ["negotiating", "b", 23, 100],
    ["judging_staff_ability", "b", 24, 100], ["set_pieces", "b", 25, 100], ["authority", "p", 4, 20], ["working_with_youngsters", "p", 12, 20], ["determination", "p", 13, 100], ["adaptability", "a", 0, 20]];
  const STAFF_PREFS = [["attacking", 0], ["business", 1], ["directness", 3], ["interference", 6], ["patience", 9], ["trigger_press", 10], ["resources", 11], ["buying_players", 14],
    ["mind_games", 15], ["flexibility", 21], ["hardness_of_training", 22], ["squad_rotation", 23], ["tempo", 24], ["width", 25]];
  function readStaff(db, clubs, located, T, pools, clock, P, S) {
    const pidSet = new Set(); for (let i = 0; i < T.n; i++) pidSet.add(T.pindex[i]);
    const recs = located.recs, recPidx = Uint32Array.from(recs.map(r => r.pindex)), recOff = recs.map(r => r.rec);
    const clubOf = team => { const f = clubs.fielded.get(team); if (f) return f.uid; const t = clubs.teamToClub.get(team); return t ? t.uid : null; };
    const slotOf = team => { const t = clubs.teamToClub.get(team) || clubs.fielded.get(team); return t ? t.slot : -1; };
    // ability block: [ca, pa, block offset] or null, plus the shares a header with distinct uid words must pass
    function block(h) {
      const ec = h + S.entryCount; if (ec >= db.length) return null;
      const at = h + S.abilityBase + S.entryBytes * db[ec], end = at + S.b40 + S.b40Count;
      if (at < 0 || end > db.length) return null;
      let slotsOk = true; for (let k = 0; k < S.prefCount; k++) { if (k === S.prefSkip) continue; const v = db[at + S.prefs + k]; if (!(v >= S.prefRange[0] && v <= S.prefRange[1]) && !(k === S.prefSentinel[0] && v === S.prefSentinel[1])) { slotsOk = false; break; } }
      let furtherOk = true; for (let k = 0; k < S.b40Count; k++) { const v = db[at + S.b40 + k]; if (v < S.b40Range[0] || v > S.b40Range[1]) { furtherOk = false; break; } }
      const ca = u16(db, at), pa = i16(db, at + 2), sig = ca >= S.abilityRange[0] && ca <= S.abilityRange[1] && pa >= S.abilityRange[0] && pa <= S.abilityRange[1] && db[at + S.sentinel] === S.sentinelValue;
      return { at, ca, pa, sig, slotsOk, furtherOk };
    }
    function header(h) { // [uid, kind] of a sound header at h
      if (h < 0 || h + 13 > db.length) return null;
      const uid = u32(db, h + S.uid), other = u32(db, h + S.uidCopy), kind = db[h + S.kind];
      if (uid === 0 || uid === MISSING || other === 0 || other === MISSING) return null;
      if (uid !== other) { if (uid < S.allocatedUidMin || kind !== S.staffKind) return null; const b = block(h); if (!b || !b.sig || !b.slotsOk || !b.furtherOk) return null; }
      return [uid, kind];
    }
    const b0 = id => id & 255, b1 = id => (id >>> 8) & 255, b2 = id => (id >>> 16) & 255, b3 = id => id >>> 24;
    function headerBehind(pid, tag) { // nearest sound staff header with this person id in front of his record
      const lo = Math.max(tag - S.headerSearch, 0), x0 = b0(pid), x1 = b1(pid), x2 = b2(pid), x3 = b3(pid);
      for (let p = tag - 4; p >= lo; p--) {
        if (db[p] !== x0 || db[p + 1] !== x1 || db[p + 2] !== x2 || db[p + 3] !== x3) continue;
        const v = header(p); if (v && v[1] === S.staffKind) return p;
      }
      return -1;
    }
    function locateTail(t) {
      const first = t - S.tailBase; if (first < 0) return -1;
      const ok = (E, k) => E >= 0 && E + S.tailEvent + 4 <= db.length && db[E] === 0 && db[E + 1] === 0 && db[E + 3] === 3 && u32(db, E + 4) === 4 && u32(db, E + S.tailEvent) === k;
      for (let k = 0; k <= S.tailMax; k++) { const E = first - S.tailStep * k; if (E < 0) break; if (ok(E, k)) return E; }
      return -1;
    }
    const startOf = t => { const d = decodeDate(db, t + S.start); return d ? u32(db, t + S.start) : 0; };
    // closed club records: a hit inside one is club data, not a person's record
    const spans = clubs.clubs.slice().sort((a, b) => a.start - b.start).slice(0, -1);
    const teamTop = TEAM_LISTS.teamIdRange[1] >>> 16;
    // 1. the club lists
    const listed = new Map(); // "club|pid" -> [list numbers]
    clubs.clubs.forEach(r => {
      const tle = r.teamListEnd; if (tle == null) return;
      const end = Math.min(r.end, db.length); if (tle >= end) return;
      let c = tle + 1 + 4 * db[tle]; const lists = [];
      for (let k = 0; k < S.listCount; k++) {
        if (c + S.listCountBytes > end) break;
        const nv = S.listCountBytes === 1 ? db[c] : u16(db, c); c += S.listCountBytes;
        const ve = c + 4 * nv; if (ve > end) break;
        const vals = []; for (let p = c; p < ve; p += 4) vals.push(u32(db, p)); lists.push(vals); c = ve;
      }
      if (lists.length !== S.listCount || lists.some(l => l.some(v => v !== 0 && (v < 1 || v > S.listMax)))) return;
      lists.forEach((l, k) => l.forEach(v => { if (!v) return; const pid = v - 1; if (pidSet.has(pid)) return; const key = r.uid + "|" + pid; const a = listed.get(key); if (a) { if (!a.includes(k)) a.push(k); } else listed.set(key, [k]); }));
    });
    // 2. contract records (one pass over the section)
    const recsBy = new Map(), headerBy = new Map(), byTeamClub = new Map(), playerC = new Map();
    let cp = 0, hit = find(db, S.tag, 0);
    while (hit >= 0) {
      const t = hit; let next = t + 1;
      if (t + 13 <= db.length && db[t + 8] === 0 && db[t + 12] === 0 && db[t + 11] <= teamTop) {
        next = t + 13;
        while (cp < spans.length && spans[cp].end <= t) cp++;
        if (!(cp < spans.length && spans[cp].start <= t)) {
          const sel = u32(db, t + S.selector);
          if (sel !== 0) {
            const pid = sel - 1;
            if (pidSet.has(pid)) {
              // a player's contract: same record layout as staff (wage, start, end); kept for the contract watch
              const E = locateTail(t);
              if (E >= 0 && !(t + S.selector + S.offer + 4 <= db.length && db[t + S.selector + S.offer] === 1 && db[t + S.selector + S.offer + 1] === 0 && db[t + S.selector + S.offer + 2] === 0x6c && db[t + S.selector + S.offer + 3] === 7)) {
                let l = playerC.get(pid); if (!l) playerC.set(pid, l = []);
                const team = u32(db, t + S.teamId);
                l.push({ t, club: clubOf(team), wage: u32(db, t + S.wage), start: startOf(t), end: decodeDate(db, E + S.tailEnd) ? u32(db, E + S.tailEnd) : 0 });
              }
            } else {
              const E = locateTail(t);
              if (E >= 0 && !(t + S.selector + S.offer + 4 <= db.length && db[t + S.selector + S.offer] === 1 && db[t + S.selector + S.offer + 1] === 0 && db[t + S.selector + S.offer + 2] === 0x6c && db[t + S.selector + S.offer + 3] === 7)) {
                let own = recsBy.get(pid);
                if (!own) { const h = headerBehind(pid, t); if (h >= 0) { headerBy.set(pid, h); own = []; recsBy.set(pid, own); } }
                if (own) { const team = u32(db, t + S.teamId); own.push({ t, team, club: clubOf(team), wage: u32(db, t + S.wage), start: startOf(t), end: decodeDate(db, E + S.tailEnd) ? u32(db, E + S.tailEnd) : 0, job: db[t + S.selector + S.job] }); }
              }
            }
          }
        }
      }
      hit = find(db, S.tag, next);
    }
    // 3. roles held with no contract (FM27: the board, owners, presidents)
    const roles = new Map(), roleHeader = new Map();
    if (S.noContract) {
      const NC = S.noContract; cp = 0; hit = find(db, S.tag, 0);
      while (hit >= 0) {
        const t = hit, s0 = t + NC.selector; let next = t + 1;
        if (s0 + 8 <= db.length && db[s0 - 2] === NC.lead[0] && db[s0 - 1] === NC.lead[1] && db[s0 + 3] === 0 && db[s0 + 7] === 0 && db[s0 + 6] <= teamTop) {
          next = s0 + 8;
          while (cp < spans.length && spans[cp].end <= t) cp++;
          if (!(cp < spans.length && spans[cp].start <= t)) {
            const sel = u32(db, s0), team = u32(db, s0 + 4), pid = sel - 1, club = sel ? clubOf(team) : null;
            if (sel && !pidSet.has(pid) && club != null && !roles.has(club + "|" + pid)) {
              let h = roleHeader.get(pid); if (h == null) { h = headerBehind(pid, t); if (h >= 0) roleHeader.set(pid, h); }
              if (h >= 0) roles.set(club + "|" + pid, { t, team, job: s0 + S.job < db.length ? db[s0 + S.job] : null });
            }
          }
        }
        hit = find(db, S.tag, next);
      }
      roleHeader.forEach((h, pid) => { if (!headerBy.has(pid)) headerBy.set(pid, h); });
    }
    // 4. listed people with no record: their object lies between the two player records around their id
    const listedPids = [...new Set([...listed.keys()].map(k => +k.split("|")[1]))].sort((a, b) => a - b);
    listedPids.forEach(pid => {
      if (headerBy.has(pid)) return;
      let lo = 0, hi = recPidx.length; while (lo < hi) { const m = (lo + hi) >> 1; if (recPidx[m] < pid) lo = m + 1; else hi = m; }
      const ws = lo === 0 ? 0 : recOff[lo - 1], we = Math.max(lo < recOff.length ? recOff[lo] + PLAYER.pindex : db.length, ws);
      const needle = p32(pid); let found = -1, amb = false, h = find(db, needle, ws, we);
      while (h >= 0) { const v = header(h); if (v && v[1] === S.staffKind) { if (found >= 0) { amb = true; break; } found = h; } h = find(db, needle, h + 1, we); }
      if (!amb && found >= 0) headerBy.set(pid, found);
    });
    // 5. merge: a person a club lists and pays is one row; an affiliate side's listing of its parent's man is the parent's
    const latest = list => list.reduce((b, r) => (r.start > b.start || (r.start === b.start && r.t < b.t)) ? r : b);
    // players: the contract with the club he is at (else the newest one)
    T.cWage = new Float64Array(T.n).fill(NaN); T.cEnd = new Uint32Array(T.n); T.cStart = new Uint32Array(T.n); T.cLoan = new Uint8Array(T.n); T.cClub = new Float64Array(T.n).fill(NaN);
    for (let i = 0; i < T.n; i++) {
      const l = playerC.get(T.pindex[i]); if (!l) continue;
      const cu = T.clubIdx[i] >= 0 ? T.clubUid[T.clubIdx[i]] : null, at = l.filter(r => r.club === cu);
      const r = latest(at.length ? at : l);
      T.cWage[i] = r.wage; T.cEnd[i] = r.end; T.cStart[i] = r.start; if (r.club != null) T.cClub[i] = r.club; if (!at.length) T.cLoan[i] = 1;
    }
    const contracted = new Map(), clubsBy = new Map();
    recsBy.forEach((list, pid) => {
      if (!headerBy.has(pid)) return;
      const byClub = new Map(); list.forEach(r => { if (r.club == null) return; if (!byClub.has(r.club)) byClub.set(r.club, []); byClub.get(r.club).push(r); });
      byClub.forEach((l, club) => { contracted.set(club + "|" + pid, latest(l)); if (!clubsBy.has(pid)) clubsBy.set(pid, new Set()); clubsBy.get(pid).add(club); });
    });
    const rows = new Map(); // key -> { club, pid, rec, lists, listedBy }
    listed.forEach((lists, key) => {
      const [club, pid] = key.split("|").map(Number); if (!headerBy.has(pid)) return;
      const own = contracted.get(key);
      if (own) { rows.set(key, { club, pid, rec: own, lists, listedBy: club }); return; }
      const parent = clubs.parentOf.get(club), cc = clubsBy.get(pid);
      if (parent != null && cc && cc.has(parent)) { rows.set(parent + "|" + pid, { club: parent, pid, rec: contracted.get(parent + "|" + pid), lists, listedBy: club }); return; }
      if (parent != null && roles.has(parent + "|" + pid) && !roles.has(key)) { rows.set(parent + "|" + pid, { club: parent, pid, rec: null, lists, listedBy: club }); return; }
      rows.set(key, { club, pid, rec: null, lists, listedBy: club });
    });
    contracted.forEach((rec, key) => { if (!rows.has(key)) { const [club, pid] = key.split("|").map(Number); rows.set(key, { club, pid, rec, lists: [], listedBy: null }); } });
    roles.forEach((_, key) => { const [club, pid] = key.split("|").map(Number); if (!rows.has(key) && headerBy.has(pid)) rows.set(key, { club, pid, rec: null, lists: [], listedBy: null }); });
    // 6. objects: header, ability block and name block, once per person
    const playerHeaders = recOff.map(o => o + PLAYER.pindex), staffHeaders = [...headerBy.values()];
    const bounds = Float64Array.from(new Set([...playerHeaders, ...staffHeaders])).sort();
    const nextHeader = h => { let lo = 0, hi = bounds.length; while (lo < hi) { const m = (lo + hi) >> 1; if (bounds[m] <= h) lo = m + 1; else hi = m; } return lo < bounds.length ? bounds[lo] : null; };
    const persons = personDecoder(db, pools, clock, P), objects = new Map();
    const rowList = [...rows.values()];
    new Set(rowList.map(r => r.pid)).forEach(pid => {
      const h = headerBy.get(pid), hv = header(h); if (!hv) return;
      const [uid, kind] = hv, blk = kind === S.staffKind ? block(h) : null;
      const nh = nextHeader(h), nv = nh != null ? header(nh) : null;
      const closing = closingHeader(db, pid, h + S.kind + 1, nh == null ? db.length : nh + 4, uid, nh == null ? null : (nv ? nv[0] : null));
      const boundary = P.unique && closing ? closing[0] : nh;
      const own = recsBy.get(pid), t = own ? latest(own).t : null;
      let ws, we;
      if (t == null) { ws = h + S.kind; we = h + S.listOnlySearch; } else { ws = t + S.blockAfterTag; we = t + S.blockSearch; }
      if (boundary != null) we = Math.min(we, boundary); we = Math.max(Math.min(we, db.length), ws);
      objects.set(pid, { h, uid, kind, blk: blk && blk.sig ? blk : null, person: persons(ws, we) });
    });
    // 7. unemployed: staff objects no club list, contract or role points at. National-team staff hold a contract
    // record (its team is no club's), so they are in recsBy and stay out; offers don't count as a job.
    const taken = new Set([...recsBy.keys(), ...rowList.map(r => r.pid)]); roles.forEach((_, k) => taken.add(+k.split("|")[1]));
    const knownH = new Set(headerBy.values()), freeH = new Map(), seenPid = new Map();
    // person ids are dense: a "header" whose id is far past every known person's is other data that happens to fit
    let maxPid = 0; for (let k = 0; k < recPidx.length; k++) if (recPidx[k] > maxPid) maxPid = recPidx[k]; headerBy.forEach((_, pid) => { if (pid > maxPid) maxPid = pid; });
    const pidCap = maxPid + 5000;
    // a club's board: after its two names come the director of football (u32 at +3), a count byte (+8) and that many
    // person ids (+9). FM27 also keeps their roles as records; FM26 keeps only this list, so it is what places the board.
    const boardOf = new Map(); // pid -> [club uid, job or null]
    clubs.clubs.forEach(c => {
      const at = c.start + CLUB_RECORDS.longName; if (at + 4 > db.length) return;
      const ln = u32(db, at); if (ln < 1 || ln > CLUB_RECORDS.maxName) return;
      const sAt = at + 4 + ln; if (sAt + 4 > db.length) return;
      const sn = u32(db, sAt); if (sn < 1 || sn > CLUB_RECORDS.maxName) return;
      const ne = sAt + 4 + sn, end = Math.min(c.end, db.length); if (ne + 9 > end) return;
      const cnt = db[ne + 8]; if (cnt > 40 || ne + 9 + 4 * cnt > end) return;
      const ids = []; for (let k = 0; k < cnt; k++) ids.push(u32(db, ne + 9 + 4 * k));
      if (ids.some(v => v === 0 || v === MISSING || v - 1 > pidCap)) return;
      ids.forEach(v => { if (!boardOf.has(v - 1)) boardOf.set(v - 1, [c.uid, null]); });
      const dof = u32(db, ne + 3); if (dof && dof !== MISSING && dof - 1 <= pidCap && !boardOf.has(dof - 1)) boardOf.set(dof - 1, [c.uid, 10]);
    });
    const scanFrom = recOff.length ? Math.max(0, recOff[0] - 4096) : 0, last = db.length - 64;
    for (let p = scanFrom; p < last; p++) {
      if (db[p + 12] !== S.staffKind) continue;
      const uid = u32(db, p + 4); if (uid === 0 || uid === MISSING) continue;
      const other = u32(db, p + 8); if (other === 0 || other === MISSING || (uid !== other && uid < S.allocatedUidMin)) continue;
      if (knownH.has(p)) continue;
      const b = block(p); if (!b || !b.sig || !b.slotsOk || !b.furtherOk) continue;
      const pid = u32(db, p); if (pid > pidCap || pidSet.has(pid) || taken.has(pid)) continue;
      if (seenPid.has(pid)) { freeH.delete(pid); seenPid.set(pid, -1); continue; } // two headers carry him: neither can be shown his
      seenPid.set(pid, p); freeH.set(pid, p);
    }
    const freeRows = [], usedPers = new Set();
    objects.forEach(o => { if (o.person) usedPers.add(o.person.persAt); });
    if (freeH.size) {
      const fb = Float64Array.from(new Set([...bounds, ...freeH.values()])).sort();
      const nextH = h => { let lo = 0, hi = fb.length; while (lo < hi) { const m = (lo + hi) >> 1; if (fb[m] <= h) lo = m + 1; else hi = m; } return lo < fb.length ? fb[lo] : null; };
      freeH.forEach((h, pid) => {
        const hv = header(h); if (!hv) return;
        const nh = nextH(h), nv = nh != null ? header(nh) : null;
        const closing = closingHeader(db, pid, h + S.kind + 1, nh == null ? db.length : nh + 4, hv[0], nh == null ? null : (nv ? nv[0] : null));
        const boundary = P.unique && closing ? closing[0] : nh;
        let we = h + S.listOnlySearch; if (boundary != null) we = Math.min(we, boundary); we = Math.max(Math.min(we, db.length), h + S.kind);
        const person = persons(h + S.kind, we);
        if (!person || !person.name || usedPers.has(person.persAt)) return;
        usedPers.add(person.persAt);
        const blk = block(h), bd = boardOf.get(pid);
        if (bd) { const r4 = db[blk.at + S.r4]; freeRows.push({ club: bd[0], pid, rec: null, lists: [], listedBy: null, boardJob: bd[1] != null ? bd[1] : [4, 6, 8, 66, 70].includes(r4) ? r4 : 6, o: { h, uid: hv[0], kind: hv[1], blk, person } }); return; }
        freeRows.push({ club: null, pid, rec: null, lists: [], listedBy: null, free: true, o: { h, uid: hv[0], kind: hv[1], blk, person } });
      });
      freeRows.sort((a, b) => a.o.h - b.o.h);
    }
    // 8. the table, in object order then club uid; the unemployed after everyone with a club
    rowList.forEach(r => { r.o = objects.get(r.pid); });
    const out = rowList.filter(r => r.o && r.o.kind === S.staffKind).sort((a, b) => a.o.h - b.o.h || a.club - b.club).concat(freeRows);
    const n = out.length, clubIndex = new Map(clubs.clubs.map((c, k) => [c.uid, k])), NR = STAFF_RATINGS.length;
    const ST = { n, name: new Array(n), uid: new Uint32Array(n), age: new Int16Array(n).fill(-1), birth: new Uint32Array(n), nation: new Int32Array(n).fill(-1),
      clubIdx: new Int32Array(n).fill(-1), listedIdx: new Int32Array(n).fill(-1), teamSlot: new Int8Array(n).fill(-1), job: new Int16Array(n).fill(-1), lists: new Uint8Array(n),
      contract: new Uint8Array(n), free: new Uint8Array(n), usual: new Int16Array(n).fill(-1), wage: new Float64Array(n).fill(NaN), cStart: new Uint32Array(n), cEnd: new Uint32Array(n), ca: new Int16Array(n).fill(-1), pa: new Int16Array(n).fill(-1),
      rat: new Uint8Array(n * NR), pers: new Uint8Array(n * 8), pref: new Uint8Array(n * STAFF_PREFS.length), ratings: STAFF_RATINGS.map(r => [r[0], r[3]]), prefs: STAFF_PREFS.map(p => p[0]) };
    out.forEach((r, i) => {
      const o = r.o, p = o.person, b = o.blk;
      ST.name[i] = p && p.name ? p.name : ""; ST.uid[i] = o.uid;
      if (p) { if (p.age != null) ST.age[i] = p.age; ST.birth[i] = p.birthRaw; ST.nation[i] = p.nation; ST.pers.set(db.subarray(p.persAt, p.persAt + 8), i * 8); }
      if (r.free) ST.free[i] = 1;
      const k = r.club == null ? null : clubIndex.get(r.club); if (k != null) ST.clubIdx[i] = k;
      if (r.listedBy != null) { const lk = clubIndex.get(r.listedBy); if (lk != null) ST.listedIdx[i] = lk; }
      r.lists.forEach(l => { ST.lists[i] |= 1 << l; });
      let team = null, job = null;
      if (r.rec) { team = r.rec.team; job = r.rec.job; ST.contract[i] = 1; ST.wage[i] = r.rec.wage; ST.cStart[i] = r.rec.start; ST.cEnd[i] = r.rec.end; }
      else if (r.boardJob != null) job = r.boardJob;
      else { const role = roles.get(r.club + "|" + r.pid); if (role) { team = role.team; job = role.job; } }
      if (team != null) ST.teamSlot[i] = slotOf(team);
      if (job != null) ST.job[i] = job;
      if (b) {
        ST.ca[i] = b.ca; ST.pa[i] = b.pa; ST.usual[i] = db[b.at + S.r4];
        STAFF_RATINGS.forEach(([, where, slot, top], j) => {
          const v = where === "b" ? db[b.at + S.b40 + slot] : where === "p" ? db[b.at + S.prefs + slot] : (p ? db[p.persAt] : 0);
          ST.rat[i * NR + j] = v >= 1 && v <= top ? v : 0;
        });
        STAFF_PREFS.forEach(([, slot], j) => { ST.pref[i * STAFF_PREFS.length + j] = db[b.at + S.prefs + slot]; });
      } else if (p) ST.rat[i * NR + NR - 1] = db[p.persAt];
    });
    if (G.__staffDebug) { G.__staffDebug.push({ out, objects, recOff, clubs }); G.__lastDb = db; }
    return ST;
  }

