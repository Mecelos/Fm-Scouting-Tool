  // ---------- span region: season statistics ----------
  function frameEnd(buf, start, end) {
    if (start + 5 > end) fail("frame runs past its region");
    const d = buf[start + 4];
    if (d & 0x08) fail("invalid frame header");
    const single = !!(d & 0x20);
    let pos = start + 5 + (single ? 0 : 1) + [0, 1, 2, 4][d & 3] + [single ? 1 : 0, 2, 4, 8][d >> 6];
    for (;;) {
      if (pos + 3 > end) fail("frame runs past its region");
      const bh = buf[pos] | (buf[pos + 1] << 8) | (buf[pos + 2] << 16), type = (bh >> 1) & 3, size = bh >>> 3;
      if (type === 3 || size > 128 * 1024) fail("invalid block");
      pos += 3 + (type === 1 ? 1 : size);
      if (bh & 1) break;
    }
    if (d & 0x04) pos += 4;
    if (pos > end) fail("frame runs past its region");
    return pos;
  }
  async function regionFrames(src, region) {
    // read the region in windows; walk frame headers without decompressing
    const WIN = 16 * 1024 * 1024, frames = [];
    let winStart = -1, win = null;
    const get = async (o, n) => {
      if (!win || o < winStart || o + n > winStart + win.length) { winStart = o; win = await src.read(o, Math.min(Math.max(n, WIN), region.end - o)); }
      return win.subarray(o - winStart, o - winStart + n);
    };
    let pos = region.start;
    while (pos < region.end) {
      const m = u32(await get(pos, 4), 0);
      if (m >= 0x184D2A50 && m <= 0x184D2A5F) { pos += 8 + u32(await get(pos + 4, 4), 0); continue; }
      if (m !== 0xFD2FB528) fail("expected a compressed frame in the span region");
      // walk blocks; frame may be larger than the window: load enough
      let endPos = null, span = 1024 * 1024;
      while (endPos == null) {
        const n = Math.min(span, region.end - pos), b = await get(pos, n);
        try { endPos = pos + frameEnd(b, 0, n); }
        catch (e) { if (n >= region.end - pos) throw e; span *= 4; }
      }
      frames.push({ offset: pos, size: endPos - pos });
      pos = endPos;
    }
    return { frames, get };
  }
  function walkSeason(body, L) {
    const head = new Uint8Array(8); head.set(ascii("\x03\x01tad."), 0); head[6] = L.schema & 255; head[7] = L.schema >> 8;
    for (let k = 0; k < 8; k++) if (body[k] !== head[k]) return null;
    const end = body.length, recs = [];
    const slots = (pos, count) => {
      const lines = [];
      for (let k = 0; k < count; k++) {
        if (pos >= end) return null;
        if (body[pos] === 0) { lines.push(null); pos++; }
        else if (body[pos] === L.lineMarker[0] && body[pos + 1] === L.lineMarker[1] && pos + L.lineBytes <= end) { lines.push(pos); pos += L.lineBytes; }
        else return null;
      }
      return [lines, pos];
    };
    let pos = 8;
    for (;;) {
      if (pos >= end) return null;
      if (body[pos] === 0) break;
      if (body[pos] !== 1 || pos + 5 + L.headerBytes > end) return null;
      const key = u32(body, pos + 1);
      let r = slots(pos + 5 + L.headerBytes, L.ownSlots); if (!r) return null;
      const own = r[0]; pos = r[1] + L.blockBytes;
      if (pos + 4 > end) return null;
      const oc = u32(body, pos); if (oc > L.maxOther) return null; pos += 4;
      const others = [];
      for (let k = 0; k < oc; k++) {
        const t = pos + L.otherLead; if (t + 4 > end) return null;
        const teamId = u32(body, t);
        r = slots(t + 4, L.otherSlots); if (!r) return null;
        others.push([teamId, r[0]]); pos = r[1];
      }
      if (pos + 4 > end) return null;
      const ic = u32(body, pos); if (ic > L.maxRatingItems) return null;
      pos += 4 + ic * L.ratingItem;
      if (pos >= end) return null;
      const fe = body[pos]; if (fe > L.maxForm) return null;
      pos += 1 + fe * L.formEntry;
      recs.push({ key, own, others });
    }
    if (pos + 1 + L.footer !== end) return null;
    return recs;
  }
  function decodeLine(body, o, gk, L) {
    const r = {};
    const rd = (off, code) => code === "B" ? body[o + off] : code === "h" ? i16(body, o + off) : u16(body, o + off);
    for (const [name, off, code, unit] of [...SEASON_FIELDS, ...(gk ? SEASON_GK : SEASON_OUTFIELD)]) {
      if (L.unsupported.includes(name)) continue;
      const v = rd(off, code); r[name] = unit === 1 ? v : v / unit;
    }
    const rated = body[o + L.rated];
    r.average_rating = rated ? u16(body, o + L.ratingSum) / (rated * L.ratingScale) : null;
    return r;
  }
  async function readSeasonStats(src, idx, L) {
    const region = idx.regions[SPAN_REGION]; if (!region) return null;
    const { frames, get } = await regionFrames(src, region);
    const header = new Uint8Array(8); header.set(ascii("\x03\x01tad."), 0); header[6] = L.schema & 255; header[7] = L.schema >> 8;
    const walked = [];
    for (const f of frames) {
      const prefix = await get(f.offset, Math.min(f.size, 128 * 1024 + 32));
      const h = zstdHead(prefix, 8);
      if (!h || h.length < 8 || h.some((v, k) => v !== header[k])) continue;
      const body = zstd(await get(f.offset, f.size));
      const recs = walkSeason(body, L);
      if (recs) walked.push({ body, recs });
    }
    if (walked.length !== 1) return null;
    return walked[0];
  }

  // ---------- archived seasons ----------
  function walkHistoryIndex(body, H) {
    const head = H.indexHeader;
    for (let k = 0; k < head.length; k++) if (body[k] !== head[k]) return null;
    let pos = head.length; const end = body.length;
    const word = () => { if (pos + 4 > end) throw 0; const v = u32(body, pos); pos += 4; return v; };
    const words = adjacent => { const c = word(); if (c > (end - pos) / 4) throw 0; const out = new Array(c); let prev = 0; for (let k = 0; k < c; k++) { const v = word(); out[k] = adjacent ? (v + prev) >>> 0 : v; prev = v; } return out; };
    try {
      const singles = words(false), lc = word(); if (lc > (end - pos) / 4) return null;
      const lists = new Array(lc); for (let k = 0; k < lc; k++) lists[k] = words(true);
      const free = words(false);
      if (word() !== H.unitBytes) return null;
      if (end - pos !== H.footer.length) return null;
      for (let k = 0; k < H.footer.length; k++) if (body[pos + k] !== H.footer[k]) return null;
      return { singles, lists, free };
    } catch (e) { return null; }
  }
  async function readHistory(src, idx, T, clubs, fm27) {
    const H = fm27 ? HISTORY_FM27 : HISTORY_FM26, L = fm27 ? SEASON_FM27 : SEASON_FM26;
    if (!idx.sections[H.section]) return null;
    const region = idx.regions[SPAN_REGION]; if (!region) return null;
    const { frames, get } = await regionFrames(src, region);
    let index = null;
    for (const f of frames) {
      const prefix = await get(f.offset, Math.min(f.size, 128 * 1024 + 32));
      const h = zstdHead(prefix, H.indexHeader.length);
      if (!h || h.length < H.indexHeader.length || h.some((v, k) => v !== H.indexHeader[k])) continue;
      const w = walkHistoryIndex(zstd(await get(f.offset, f.size)), H);
      if (!w) continue;
      if (index) fail("two frames each read as the season history index");
      index = w;
    }
    if (!index) fail("the season history index was not found");
    const archive = await readSection(src, idx, H.section), hb = H.archiveHeader.length, payload = archive.length - hb;
    for (let k = 0; k < hb; k++) if (archive[k] !== H.archiveHeader[k]) fail("the season history archive has an unexpected header");
    if (payload % H.unitBytes) fail("the season history archive is not whole units");
    // owners: a player's selector picks his list; lists are unique to one player
    const lists = index.lists, owner = new Int32Array(lists.length).fill(-1);
    let total = 0;
    for (let i = 0; i < T.n; i++) {
      const s = T.histSel[i]; if (s === MISSING || s >= lists.length || !lists[s].length) continue;
      if (owner[s] >= 0) fail("two players share a season history list");
      owner[s] = i; total += lists[s].length;
    }
    // keep club competitions (league, cup, continental) with minutes; rebuild each unit as a season line
    const player = new Int32Array(total), year = new Uint16Array(total), kind = new Uint8Array(total), team = new Uint32Array(total), club = new Int32Array(total).fill(-1), comp = new Uint16Array(total), youth = new Uint8Array(total);
    const lines = new Uint8Array(total * HIST_ROW), clubIndex = new Map(clubs.clubs.map((c, k) => [c.uid, k]));
    let r = 0, units = 0;
    for (let s = 0; s < lists.length; s++) {
      const i = owner[s]; if (i < 0) continue;
      for (const off of lists[s]) {
        if (off % H.unitBytes || off >= payload) fail("a season history reference is outside the archive");
        const at = hb + off; units++;
        if (archive[at] !== 0 || archive[at + 31] >= H.kindNames.length) fail("a season history unit has an unexpected marker");
        const kd = archive[at + 31]; if (kd < 1 || kd > 3) continue;
        const o = r * HIST_ROW;
        lines[o] = L.lineMarker[0]; lines[o + 1] = L.lineMarker[1];
        lines.set(archive.subarray(at + 13, at + 17), o + 2);
        lines.set(archive.subarray(at + 24, at + 29), o + 6);
        lines.set(archive.subarray(at + 17, at + 20), o + 11);
        lines[o + 14] = archive[at + 29];
        lines.set(archive.subarray(at + 20, at + 24), o + 15);
        lines.set(archive.subarray(at + 32, at + 32 + HIST_ROW - 19), o + 19);
        if (u16(lines, o + 4) === 0 && !lines[o + 6] && !lines[o + 7]) continue;   // no minutes, no appearances
        const t = u32(archive, at + 1);
        player[r] = i; year[r] = u16(archive, at + 11); kind[r] = kd; team[r] = t; comp[r] = u16(archive, at + 5);
        youth[r] = seniorTeam(clubs, t) ? 0 : 1;
        const tc = t !== MISSING ? clubs.teamToClub.get(t) : null;
        if (tc) { const k = clubIndex.get(tc.uid); if (k != null) club[r] = k; }
        r++;
      }
    }
    const cut = a => a.slice(0, r);
    return { n: r, units, player: cut(player), year: cut(year), kind: cut(kind), team: cut(team), club: cut(club), comp: cut(comp), youth: cut(youth), lines: lines.slice(0, r * HIST_ROW), rowBytes: HIST_ROW };
  }
  // one archived row back as stats (same fields and units as this season's)
  function historyLine(T, r, cols, k) { decodeLineInto(T.hist.lines, r * T.hist.rowBytes, T.pos[T.hist.player[r] * 15] >= 18, T.meta.game === "FM26" ? SEASON_FM26 : SEASON_FM27, cols, k); }

