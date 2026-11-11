  // ---------- byte source over a File / Blob / Uint8Array ----------
  function source(input) {
    if (input instanceof Uint8Array) return { size: input.length, name: "save", read: async (o, n) => input.subarray(o, o + n) };
    if (input && typeof input.read === "function") return input;
    return { size: input.size, name: input.name, read: async (o, n) => new Uint8Array(await input.slice(o, o + n).arrayBuffer()) };
  }
  function zstd(data, size) {
    try { return size ? fzstd.decompress(data, new Uint8Array(size)) : fzstd.decompress(data); }
    catch (e) { fail("a compressed part could not be unpacked (" + (e.message || e) + "). If the game was saving, wait and try again."); }
  }
  // decompress only the first `want` bytes of a frame (streaming, stops after the first output)
  function zstdHead(data, want) {
    let out = null;
    const parts = [];
    let got = 0;
    try {
      const d = new fzstd.Decompress((chunk) => { if (got < want) { parts.push(chunk); got += chunk.length; } });
      const STEP = 32 * 1024;
      for (let o = 0; o < data.length && got < want; o += STEP) d.push(data.subarray(o, Math.min(data.length, o + STEP)), o + STEP >= data.length);
    } catch (e) { if (!got) return null; }
    out = new Uint8Array(Math.min(want, got)); let p = 0;
    for (const c of parts) { const take = Math.min(c.length, out.length - p); out.set(c.subarray(0, take), p); p += take; if (p >= out.length) break; }
    return out;
  }

  // ---------- container ----------
  const FILE_MAGIC = ascii("\x02\x01fmf.");
  async function readIndex(src) {
    const head = await src.read(0, 26);
    if (head.length < 26 || find(head, FILE_MAGIC, 0, 6) !== 0) fail("This is not a Football Manager save (.fm).", "notsave");
    const trailerAt = 9 + u64(head, 9);
    if (!(trailerAt >= 26 && trailerAt < src.size - 9)) fail("the save directory is missing. If the game was saving, wait and try again.");
    const trailer = await src.read(trailerAt, src.size - trailerAt);
    if (find(trailer, FILE_MAGIC, 0, 6) !== 0) fail("the save directory is damaged");
    const dir = zstd(trailer.subarray(9));
    let [saveName, c] = lpString(dir, 0, 4096);
    c += 4;
    const entries = [];
    for (;;) {
      if (c + 4 > dir.length) break;
      const nl = u32(dir, c); if (nl < 1 || nl > 256) break;
      const extLenAt = c + 4 + nl, tail = extLenAt + 8;
      if (tail + 40 > dir.length) break;
      const name = str(dir, c + 4, extLenAt), ext = str(dir, extLenAt + 4, tail);
      if (!name || !/^[A-Za-z0-9_]+$/.test(name) || u32(dir, extLenAt) !== 4 || !ext || !/^\.[A-Za-z0-9]{3}$/.test(ext)) break;
      entries.push({ name, ext, offset: 26 + u64(dir, tail), csize: u64(dir, tail + 8), dsize: u64(dir, tail + 16) });
      c = tail + 40;
    }
    entries.sort((a, b) => a.offset - b.offset);
    const sections = {}, regions = {};
    let cursor = 26, prev = "header";
    entries.forEach(e => {
      if (e.offset > cursor) regions["unlisted_after_" + prev] = { start: cursor, end: e.offset };
      if (e.ext === ".dat" || e.ext === ".cmt") { sections[e.name] = e; prev = e.name; } else prev = e.name + e.ext;
      cursor = e.offset + e.csize;
    });
    if (trailerAt > cursor) regions["unlisted_after_" + prev] = { start: cursor, end: trailerAt };
    if (!Object.keys(sections).length) fail("the save directory lists no sections");
    return { saveName, entries, sections, regions, trailerAt };
  }
  async function readSection(src, idx, name) {
    const e = idx.sections[name]; if (!e) fail("the save has no '" + name + "' section");
    const comp = await src.read(e.offset, e.csize);
    const out = zstd(comp, e.dsize);
    if (out.length !== e.dsize) fail("section " + name + " unpacked to the wrong size");
    return out;
  }
  const sectionSchema = b => u16(b, 6);

  // ---------- metadata ----------
  const VERSION_RE = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,4})\+([0-9]{1,10})$/;
  function findVersion(summary) {
    for (let i = 4; i < summary.length - 4; i++) {
      const ch = summary[i];
      if (ch < 0x30 || ch > 0x39) continue;
      if (i > 0 && (summary[i - 1] === 0x2e || (summary[i - 1] >= 0x30 && summary[i - 1] <= 0x39))) continue;
      const n = u32(summary, i - 4);
      if (!n || n > 32 || i + n > summary.length) continue;
      const s = str(summary, i, i + n); if (!s) continue;
      const m = VERSION_RE.exec(s);
      if (m && !m[1].startsWith("0")) return { major: +m[1], build: s, buildNumber: +m[4] };
    }
    return null;
  }
  function summaryStrings(summary) {
    const out = []; let c = 8;
    while (c + 4 <= summary.length) {
      const n = u32(summary, c);
      if (n >= 2 && n <= 120 && c + 4 + n <= summary.length) {
        const s = str(summary, c + 4, c + 4 + n);
        if (s && [...s].every(ch => ch.codePointAt(0) >= 0x20)) { out.push({ text: s, lenAt: c, end: c + 4 + n }); c += 4 + n; continue; }
      }
      c++;
    }
    return out;
  }
  // the displayed save clock (fmsave read_summary_clock): setup string, build string, counted division names,
  // 8-byte manager header, manager name, club name, club uid, then the date. game_info can hold the previous day.
  function summaryClock(summary, build) {
    try {
      let [, o] = lpString(summary, 8, 65536);
      const [ver, o2] = lpString(summary, o, 32); o = o2;
      if (ver !== build) return null;
      const nd = u32(summary, o); if (nd > 4096) return null; o += 4;
      for (let k = 0; k < nd; k++) o = lpString(summary, o, 1024)[1];
      o = lpString(summary, o + 8, 1024)[1];
      o = lpString(summary, o, 1024)[1];
      return decodeDate(summary, o + 4);
    } catch (e) { return null; }
  }
  function gameClock(info, L) {
    try {
      const [dbVersion, vEnd] = lpString(info, L.dbVersionLen, L.dbVersionMax);
      const countAt = vEnd + L.filenameCountAfter;
      const count = u32(info, countAt);
      if (count > 256) return null;
      let c = countAt + 4;
      for (let k = 0; k < count; k++) c = lpString(info, c, 4096)[1];
      return { dbVersion, date: decodeDate(info, vEnd + (c - (countAt + 4)) + L.dateAfter) };
    } catch (_) { return null; }
  }

