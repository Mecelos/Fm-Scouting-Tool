// ---------- Link your save folder: pick FM's "games" folder once; every 20 seconds Scout Lab looks for a newer save and loads it ----------
// "Newest" = the most recently written .fm file in the folder or its subfolders (two levels), whatever it is called: your own
// save, FM's autosave or a backup copy FM made.
// File System Access API: Chrome and Edge on a computer, in the downloaded copy (pages inside claude.ai can't open folder pickers).
const SD = { h: null, state: "off", msg: "", timer: null, seen: null, busy: false };
const sdSupported = () => typeof window.showDirectoryPicker === "function";
async function sdNewest(h, depth = 0) {
  let best = null;
  for await (const e of h.values()) {
    try {
      if (e.kind === "directory") { if (depth < 2) { const f = await sdNewest(e, depth + 1); if (f && (!best || f.lastModified > best.lastModified)) best = f; } continue; }
      if (!/\.fm$/i.test(e.name)) continue;
      const f = await e.getFile(); if (f.size > 0 && (!best || f.lastModified > best.lastModified)) best = f;
    } catch (x) { }
  }
  return best;
}
function sdSay(state, msg) { SD.state = state; SD.msg = msg || ""; const el = document.getElementById("sdline"); if (el) el.innerHTML = sdLineHtml(); renderSaveNote(); }
const sdLast = () => { try { return +localStorage.getItem("scoutlab-sd-at") || 0; } catch (e) { return 0; } };
const sdSetLast = t => { try { localStorage.setItem("scoutlab-sd-at", String(t)); } catch (e) { } };
async function sdPoll() {
  if (!SD.h || SD.busy || S.saveBusy) return;
  SD.busy = true;
  try {
    const f = await sdNewest(SD.h);
    if (!f) { sdSay("on", "No .fm saves in this folder yet. Pick Football Manager 27 › games."); return; }
    const done = Math.max(sdLast(), (SAVE && SAVE.fileMod) || 0);
    if (f.lastModified <= done) { sdSay("on", `Watching · newest save: ${f.name} (${new Date(f.lastModified).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}), already loaded`); SD.seen = null; return; }
    // wait until FM has finished writing: same size and time on two looks in a row
    const sig = f.name + "|" + f.size + "|" + f.lastModified;
    if (SD.seen !== sig) { SD.seen = sig; sdSay("on", `New save found (${f.name}): loading it once FM has finished saving…`); setTimeout(sdPoll, 8000); return; }
    SD.seen = null; sdSetLast(f.lastModified);
    saveFile = f; sdSay("loading", `Loading ${f.name}…`);
    await loadSaveFile({ keepPage: true, auto: true });
    sdSay("on", `Loaded ${f.name} · ${new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}. Watching for the next one.`);
  } catch (e) {
    if (e && e.name === "NotAllowedError") { sdStop(); sdSay("ask", "Scout Lab needs your OK to read the folder again."); }
    else sdSay("error", "The save folder couldn't be read: " + ((e && e.message) || e));
  } finally { SD.busy = false; }
}
function sdStart() { clearInterval(SD.timer); SD.timer = setInterval(sdPoll, 20000); sdPoll(); }
function sdStop() { clearInterval(SD.timer); SD.timer = null; }
async function sdLink() {
  if (!sdSupported()) { sdSay("error", "This browser can't watch a folder. Use Chrome or Edge on your computer, with the downloaded copy of Scout Lab."); return; }
  try {
    const h = await window.showDirectoryPicker({ id: "fm-games", mode: "read" });
    SD.h = h; if (DB.db) await DB.set("savedir", h); sdSay("on", "Linked " + h.name + ". Looking for saves…"); sdStart();
  } catch (e) {
    if (e && e.name === "AbortError") return;
    sdSay("error", /cross origin|sub frame|SecurityError/i.test((e && (e.message + e.name)) || "") ? "Folder linking doesn't work inside claude.ai. Download Scout Lab, open the file in Chrome or Edge on your PC and link the folder there." : "The folder couldn't be linked: " + ((e && e.message) || e));
  }
}
async function sdReconnect() {
  if (!SD.h) return sdLink();
  try { const p = await SD.h.requestPermission({ mode: "read" }); if (p === "granted") { sdSay("on", "Reconnected " + SD.h.name + "."); sdStart(); } else sdSay("ask", "Permission wasn't given. Tap Reconnect to try again."); }
  catch (e) { sdSay("error", "Couldn't reconnect: " + ((e && e.message) || e)); }
}
async function sdUnlink() { sdStop(); SD.h = null; if (DB.db) await DB.set("savedir", null); sdSay("off", "Folder unlinked."); }
async function sdInit() {
  if (!sdSupported() || !DB.db) return;
  try {
    const h = await DB.get("savedir"); if (!h || typeof h.queryPermission !== "function") return;
    SD.h = h; const p = await h.queryPermission({ mode: "read" });
    if (p === "granted") { SD.state = "on"; sdStart(); } else sdSay("ask", `Linked to ${h.name}. Tap Reconnect so Scout Lab can look for new saves (the browser asks once per visit).`);
  } catch (e) { }
}
function sdLineHtml() {
  const cls = SD.state === "error" ? "bad" : SD.state === "on" || SD.state === "loading" ? "okc" : "muted";
  return SD.msg ? `<span class="small ${cls}">${esc(SD.msg)}</span>` : "";
}
function sdPanelHtml() {
  const sup = sdSupported();
  return `<section class="panel"><div class="ph"><h3>Load new saves by itself</h3><span class="small muted">Chrome or Edge on your PC</span></div>
    <p class="muted">Link your FM save folder once (<code>Documents › Sports Interactive › Football Manager 27 › games</code>). While Scout Lab is open, it looks every 20 seconds and loads the most recently written save, whatever it's called: your own save, FM's autosave or a backup copy. After each game just save in FM (or let it autosave) and come back here.</p>
    <div class="addrow">${SD.h ? `${SD.state === "ask" ? `<button class="primary" data-sdact="reconnect">Reconnect ${esc(SD.h.name)}</button>` : `<button class="ghost" data-sdact="now">Check now</button>`}<button class="ghost" data-sdact="unlink">Unlink</button>` : `<button class="primary" data-sdact="link" ${sup ? "" : "disabled"}>Link my save folder</button>`}</div>
    <p id="sdline">${sdLineHtml()}</p>
    ${sup ? `<p class="small muted">Read-only: Scout Lab never changes your saves. Works in the downloaded copy opened in Chrome or Edge; inside claude.ai the browser blocks folder access.</p>` : `<p class="small muted">This browser can't watch a folder (it needs Chrome or Edge on a computer). On a tablet or phone, load the save by hand above.</p>`}</section>`;
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-sdact]"); if (!t) return;
  const a = t.dataset.sdact;
  if (a === "link") sdLink(); else if (a === "reconnect") sdReconnect(); else if (a === "unlink") sdUnlink().then(render); else if (a === "now") { SD.seen = null; sdPoll(); }
});

// ---------- Export a tactic back to FM27 (.fmf) ----------
// Built on the tactic file you loaded (My tactic): its formation and shape stay, and the roles, mentality and team instructions
// are written over it. The archive is rebuilt like FM's own export: each resource = [16][16][AES key][IV][AES-CTR(zstd(data))],
// then the zstd catalogue. Compression uses zstd raw blocks (valid zstd, just not smaller).
const TI_ENC = { // field -> [[byte, mask, shift]...], {option: combined value}; the inverse of decodeTi
  "passing-directness": [[[6, 0x1e, 0]], { "Much Shorter": 0x10, Shorter: 0x08, Standard: 0, "More Direct": 0x04, "Much More Direct": 0x02 }],
  "tempo": [[[11, 0xc0, 0], [12, 0x03, 8]], { "Much Lower": 0x200, Lower: 0x100, Standard: 0, Higher: 0x80, "Much Higher": 0x40 }],
  "attacking-width": [[[12, 0xac, 0]], { "Much Narrower": 0x20, Narrower: 0x80, Standard: 0, Wider: 0x08, "Much Wider": 0x04 }],
  "creative-freedom": [[[12, 0x50, 0]], { "More Expressive": 0x40, Balanced: 0, "More Disciplined": 0x10 }],
  "build-up-strategy": [[[6, 0x80, 0], [7, 0x01, 8]], { Balanced: 0, "Bypass Press": 0x100, "Play Through Press": 0x80 }],
  "progress-through": [[[8, 0xe0, 0], [9, 0x01, 8]], { Balanced: 0, "Both Flanks": 0x100, Left: 0x20, Middle: 0x80, Right: 0x40 }],
  "pass-reception": [[[6, 0x60, 0]], { Balanced: 0, "Pass Into Space": 0x20, "Pass To Feet": 0x40 }],
  "supporting-runs": [[[9, 0x70, 0]], { Balanced: 0, "Both Flanks": 0x10, Left: 0x20, Right: 0x40 }],
  "patience": [[[8, 0x02, 0], [7, 0x02, 8]], { Standard: 0, "Hit Early Crosses": 0x200, "Work Ball Into Box": 0x02 }],
  "crossing-style": [[[7, 0x1c, 0]], { Balanced: 0, "Floated Crosses": 0x04, "Low Crosses": 0x10, "Whipped Crosses": 0x08 }],
  "dribbling": [[[7, 0x60, 0]], { Balanced: 0, Discourage: 0x40, Encourage: 0x20 }],
  "shots-from-distance": [[[7, 0x80, 0], [8, 0x01, 8]], { Balanced: 0, Discourage: 0x100, Encourage: 0x80 }],
  "time-wasting": [[[15, 0xc0, 0]], { "Less Often": 0x80, Standard: 0, "More Often": 0x40 }],
  "play-for-set-pieces": [[[8, 0x04, 0]], { "Play For Set Pieces": 0x04, "Keep Ball in Play": 0 }],
  "attacking-transition": [[[8, 0x18, 0]], { "Counter-Attack": 0x08, Standard: 0, "Hold Shape": 0x10 }],
  "defensive-transition": [[[14, 0xc0, 0]], { "Counter-Press": 0x40, Standard: 0, Regroup: 0x80 }],
  "goal-kicks": [[[11, 0x30, 0]], { Mixed: 0, Short: 0x10, Long: 0x20 }],
  "gk-distribution": [[[10, 0xb8, 0], [11, 0x01, 8]], { Balanced: 0, "Centre-Backs": 0x08, "Full-Backs": 0x10, Flanks: 0x20, Playmaker: 0x80, "Target Forward": 0x100 }],
  "gk-distribution-speed": [[[11, 0x0c, 0]], { Balanced: 0, "Distribute Quickly": 0x04, "Slow Pace Down": 0x08 }],
  "line-of-engagement": [[[13, 0xe0, 0]], { "High Press": 0x20, "Mid Block": 0x40, "Low Block": 0x80 }],
  "defensive-line": [[[13, 0x0f, 0]], { "Much Higher": 0x01, Higher: 0x02, Standard: 0, Lower: 0x04, "Much Lower": 0x08 }],
  "defensive-line-behaviour": [[[15, 0x30, 0]], { Balanced: 0, "Drop Off More": 0x20, "Step Up More": 0x10 }],
  "trigger-press": [[[14, 0x1e, 0]], { "Much Less Often": 0x10, "Less Often": 0x08, Standard: 0, "More Often": 0x04, "Much More Often": 0x02 }],
  "tackling": [[[15, 0x03, 0]], { "Get Stuck In": 0x01, Standard: 0, "Stay On Feet": 0x02 }],
  "pressing-trap": [[[16, 0x03, 0]], { Balanced: 0, "Trap Inside": 0x01, "Trap Outside": 0x02 }],
  "prevent-short-gk-distribution": [[[14, 0x20, 0]], { Yes: 0x20, No: 0 }],
  "cross-engagement": [[[16, 0x0c, 0]], { Balanced: 0, "Invite Crosses": 0x08, "Stop Crosses": 0x04 }],
};
const b64e = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
function zstdRaw(data) { // a valid zstd frame made of raw (stored) blocks
  const n = data.length, blocks = Math.max(1, Math.ceil(n / 131072)), out = new Uint8Array(4 + 1 + 4 + blocks * 3 + n);
  out.set([0x28, 0xb5, 0x2f, 0xfd, 0xa0], 0); new DataView(out.buffer).setUint32(5, n, true);   // single segment, 4-byte content size
  let o = 9; for (let k = 0; k < blocks; k++) { const sz = Math.min(131072, n - k * 131072), last = k === blocks - 1 ? 1 : 0, h = last | (sz << 3);
    out[o] = h & 255; out[o + 1] = (h >> 8) & 255; out[o + 2] = (h >> 16) & 255; out.set(data.subarray(k * 131072, k * 131072 + sz), o + 3); o += 3 + sz; }
  return out;
}
async function aesCtrEnc(key, iv, data) { const k = await crypto.subtle.importKey("raw", key, { name: "AES-CTR" }, false, ["encrypt"]); return new Uint8Array(await crypto.subtle.encrypt({ name: "AES-CTR", counter: iv, length: 128 }, k, data)); }
function tacArchive(b) { // the .fmf's catalogue: every file with where its offset/stored/raw fields sit in the catalogue bytes
  const dirAt = 9 + TAC_U64(b, 9), dir = fzstd.decompress(b.subarray(dirAt + 9)), files = [];
  let o = 0; const str = () => { const n = TAC_U32(dir, o); if (n > 4096) throw new Error("bad index"); const s = new TextDecoder().decode(dir.subarray(o + 4, o + 4 + n)); o += 4 + n; return s; };
  const walk = () => { const nf = TAC_U32(dir, o); o += 4; for (let i = 0; i < nf; i++) { const base = str(), ext = str(); files.push({ base, ext, at: o, off: TAC_U64(dir, o), stored: TAC_U64(dir, o + 8), raw: TAC_U64(dir, o + 16) }); o += 40; }
    const nd = TAC_U32(dir, o); o += 4; for (let i = 0; i < nd; i++) { str(); walk(); } };
  str(); walk();
  return { dirAt, dir, files };
}
async function tacPlain(b) { // decrypted, decompressed .tac bytes of a .fmf
  const A = tacArchive(b), f = A.files.find(x => x.ext.toLowerCase() === ".tac"); if (!f) throw new Error("There's no tactic inside this file.");
  const at = 26 + f.off, ct = b.subarray(at + 40, at + f.stored), plain = await aesCtr(b.slice(at + 8, at + 24), b.slice(at + 24, at + 40), ct);
  return fzstd.decompress(plain, new Uint8Array(f.raw));
}
function tacRecords(b) { // same walk as decodeTac: where each role record's selected value sits
  const nl = TAC_U32(b, 16), so = 20 + nl + 12;
  let first = -1; for (let i = so; i < b.length - 3; i++) if (b[i] === 0x44 && b[i + 1] === 0 && b[i + 2] === 2) { first = i; break; }
  const recs = []; let o = first;
  while (first >= 0 && b[o] === 0x44 && b[o + 1] === 0 && b[o + 2] === 2 && recs.length < 40) {
    const nOpt = TAC_U32(b, o + 10); if (nOpt > 128) break;
    const opts = []; for (let k = 0; k < nOpt; k++) opts.push(TAC_BIG(b, o + 14 + 24 * k));
    const selAt = o + 14 + 24 * nOpt; recs.push({ selAt: selAt + 4, sel: TAC_BIG(b, selAt + 4), opts });
    o = selAt + 12; if (!(b[o] === 0x44 && b[o + 1] === 0) && b[o + 1] === 0x44) o++;
  }
  return { so, recs };
}
const putBig = (b, o, v) => { for (let k = 0; k < 8; k++) b[o + k] = Number((v >> BigInt(8 * k)) & 255n); };
function roleValue(map, role, rec) { // the option in this slot's list that means this role (keeps FM's own bits)
  const want = [...map.entries()].filter(([, n]) => n.replace("?", "") === role).map(([v]) => v);
  return rec.opts.find(v => want.includes(v & ~DUTY_MASK)) ?? null;
}
// write roles, mentality and instructions of W (tacWorking-like) into a copy of the .tac bytes
function tacPatch(tac, W, F) {
  const b = tac.slice(), R = tacRecords(b), set = b.subarray(R.so, R.so + 17), miss = [];
  const mi = MENTALITIES.indexOf(W.mentality); if (mi >= 0) set[2] = mi + 1;
  Object.entries(W.ti || {}).forEach(([id, v]) => { const e = TI_ENC[id]; if (!e || v == null || !(v in e[1])) return; if (F && F.ti && F.ti[id] === v) return;
    const val = e[1][v]; e[0].forEach(([by, mask, sh]) => { set[by] = (set[by] & ~mask) | ((val >> sh) & mask); }); });
  W.slots.forEach((s, i) => {
    [["ip", IP_BITS, 2 * i], ["oop", OOP_BITS, 2 * i + 1]].forEach(([ph, map, k]) => {
      const rec = R.recs[k], role = s[ph] && s[ph].role; if (!rec || !role || role === "Balanced") return;
      if (F && F.slots[i] && F.slots[i][ph].role === role) return;   // unchanged: leave FM's bytes alone
      const v = roleValue(map, role, rec); if (v == null) { miss.push(`${role} (${ph === "ip" ? "with" : "without"} the ball, ${F ? F.slots[i][ph].code : ""})`); return; }
      putBig(b, rec.selAt, v);
    });
  });
  return { tac: b, miss };
}
async function tacBuildFmf(orig, tac) {
  const A = tacArchive(orig), f = A.files.find(x => x.ext.toLowerCase() === ".tac");
  const key = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(16)), ct = await aesCtrEnc(key, iv, zstdRaw(tac));
  const res = new Uint8Array(40 + ct.length); new DataView(res.buffer).setUint32(0, 16, true); new DataView(res.buffer).setUint32(4, 16, true); res.set(key, 8); res.set(iv, 24); res.set(ct, 40);
  const order = A.files.slice().sort((a, b) => a.off - b.off), parts = [], dir = A.dir.slice(), dv = new DataView(dir.buffer);
  let off = 0;
  order.forEach(x => { const bytes = x === f ? res : orig.subarray(26 + x.off, 26 + x.off + x.stored); parts.push(bytes);
    dv.setBigUint64(x.at, BigInt(off), true); dv.setBigUint64(x.at + 8, BigInt(bytes.length), true); if (x === f) dv.setBigUint64(x.at + 16, BigInt(tac.length), true); off += bytes.length; });
  const cat = zstdRaw(dir), total = 26 + off + 9 + cat.length, out = new Uint8Array(total);
  out.set(orig.subarray(0, 26), 0); new DataView(out.buffer).setBigUint64(9, BigInt(26 + off - 9), true);
  let o = 26; parts.forEach(p => { out.set(p, o); o += p.length; });
  out.set(orig.subarray(A.dirAt, A.dirAt + 9), o); out.set(cat, o + 9);
  return out;
}
// suggestion -> the slots of your tactic file, matched position by position (same shape with and without the ball needed)
function tacMatchSuggestion(F, T) {
  const sug = suggestionAsTactic(T.slots, T.ins), side = s => "LCR".indexOf(s.side || "C");
  const byCode = (list, key) => { const g = {}; list.forEach((s, i) => { const c = s.ip.code === "WCB" ? "DC" : s.ip.code; (g[c] = g[c] || []).push(i); }); Object.values(g).forEach(ix => ix.sort((a, b) => key(list[a]) - key(list[b]))); return g; };
  const gF = byCode(F.slots, s => side(s.ip)), gS = byCode(sug.slots, s => s.ip.x), map = new Array(F.slots.length).fill(-1), diff = [];
  Object.entries(gF).forEach(([c, ix]) => { const js = gS[c] || []; ix.forEach((i, k) => { if (js[k] != null) map[i] = js[k]; }); if (js.length !== ix.length) diff.push(`${c}: yours ${ix.length}, suggested ${js.length}`); });
  Object.entries(gS).forEach(([c, js]) => { if (!gF[c]) diff.push(`${c}: yours 0, suggested ${js.length}`); });
  if (diff.length) return { ok: false, why: `It's a different formation from your tactic file (${diff.join("; ")}).` };
  const oopDiff = []; map.forEach((j, i) => { const so = sug.slots[j].oop.code, fo = F.slots[i].oop.code; if (so && fo && (so === "WCB" ? "DC" : so) !== fo && !(so === sug.slots[j].ip.code && fo === F.slots[i].ip.code)) oopDiff.push(`${F.slots[i].ip.code} defends as ${so} (yours: ${fo})`); });
  const note = oopDiff.length ? `Your file's shape without the ball is kept (the suggestion defends differently: ${oopDiff.slice(0, 3).join("; ")}${oopDiff.length > 3 ? "…" : ""}); set that in FM if you want it.` : "";
  return { ok: true, note, W: { name: F.name, mentality: sug.mentality, ti: sug.ti, slots: F.slots.map((s, i) => ({ ip: { role: sug.slots[map[i]].ip.role }, oop: { role: sug.slots[map[i]].oop.role || s.oop.role } })) } };
}
async function tacExport(kind) {
  S.texErr = ""; S.texMsg = "";
  try {
    const M = S.myTac; if (!M || !M.raw) throw new Error("Load your tactic file (.fmf) in My tactic first: the export is written over it, so FM gets your formation and shape back with the new roles and instructions.");
    const orig = b64d(M.raw), F = M.file, tac = await tacPlain(orig);
    let W, F0 = F; S._texNote = "";
    if (kind === "mine") { W = tacWorking(); W = { mentality: W.mentality, ti: W.ti, slots: W.slots.map(s => ({ ip: { role: s.ip.role }, oop: { role: s.oop.role } })) }; }
    else { const T = S._sugT; if (!T) throw new Error("Open the suggested tactic first."); const m = tacMatchSuggestion(F, T); if (!m.ok) throw new Error(m.why); W = m.W; S._texNote = m.note; }
    const P = tacPatch(tac, W, F0);
    const out = await tacBuildFmf(orig, P.tac);
    const back = await readTacticFile(out.buffer);   // read our own file back: the same reader as for FM's files
    const name = (F.name || "tactic").replace(/[^\w\- ]+/g, "").trim() || "tactic", fn = `${name} - Scout Lab.fmf`;
    const changed = W.slots.reduce((n, s, i) => n + (s.ip.role !== F.slots[i].ip.role ? 1 : 0) + (s.oop.role !== F.slots[i].oop.role ? 1 : 0), 0) - P.miss.length;
    const ok = back.slots.every((s, i) => !W.slots[i].ip.role || W.slots[i].ip.role === "Balanced" || P.miss.some(m => m.startsWith(W.slots[i].ip.role)) || s.ip.role === W.slots[i].ip.role);
    if (!ok) throw new Error("The exported file didn't read back the same: nothing was saved.");
    await tacDownload(out, fn);
    S.texMsg = `Saved <b>${esc(fn)}</b>: ${changed} role${changed === 1 ? "" : "s"}, mentality ${esc(back.mentality)} and the team instructions written over your tactic. In FM27: Tactics › Manage tactics › Import, then pick this file from Documents › Sports Interactive › Football Manager 27 › tactics (move it there first).${P.miss.length ? ` <span class="warnc">Not written (not offered in that slot in your file): ${esc(P.miss.join(", "))} — set those in FM.</span>` : ""}${S._texNote ? ` <span class="muted">${esc(S._texNote)}</span>` : ""}`;
  } catch (e) { S.texErr = e.message || String(e); }
  const y = window.scrollY; render(); window.scrollTo(0, y);
}
async function tacDownload(bytes, name) {
  try { if (window.claude && window.claude.use) { const d = await window.claude.use("downloads"); if (d) { await d.save({ filename: name, data: new Blob([bytes], { type: "application/octet-stream" }) }); return; } } } catch (e) { if (e && e.code && e.code !== "not_granted" && e.code !== "unavailable") throw e; }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
function tacExportHtml(kind) {
  const M = S.myTac, has = M && M.raw;
  return `<section class="panel texpanel"><div class="ph"><h3>Export to FM</h3><span class="muted small">${kind === "mine" ? "your tactic with the changes made here" : "this suggestion as an FM27 tactic file"}</span></div>
    ${has ? `<p class="small">${kind === "mine" ? "Writes the roles, mentality and instructions you changed here into a copy of your tactic file." : `Written over your tactic file <b>${esc(M.file.name)}</b> (its formation and shape are kept), so it works when the suggestion uses the same formation.`}</p>
      <div class="addrow"><button class="primary" data-texact="${kind}">Export .fmf</button></div>`
    : `<p class="small muted">${M && M.file ? "Load your tactic file once more in My tactic (Scout Lab now keeps a copy of the file so it can write it back)." : "Load your tactic file in My tactic first: the export is written over it, so FM gets your formation and shape back with the new roles and instructions."}</p>`}
    ${S.texErr ? `<p class="err small">${esc(S.texErr)}</p>` : ""}${S.texMsg ? `<p class="small okc">${S.texMsg}</p>` : ""}
    <p class="small muted">New in Scout Lab: the file reads back correctly here, but check it in FM after importing (roles, instructions) before your next match.</p></section>`;
}
document.addEventListener("click", e => { const t = e.target.closest("[data-texact]"); if (t) tacExport(t.dataset.texact); });

