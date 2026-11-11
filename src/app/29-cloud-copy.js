// ---------- cloud copy: the loaded save, kept with Scout Lab on claude.ai so every device opens it ----------
// One db document ("cloud/save") points at the save's packed data, stored as text assets (base64 of gzip, under 20 MiB each).
const CLOUD = { db: null, assets: null, doc: null, state: "off", msg: "", pct: 0, checked: false };
const CLOUD_DOC = "cloud/save", CLOUD_CHUNK = 14 * 1024 * 1024;
const cloudBlobUrl = id => "/_blob/" + id;
// pack the save (typed arrays as raw bytes, everything else as JSON) into one buffer
function packSave(sv) {
  const parts = []; let off = 0;
  const walk = v => {
    if (ArrayBuffer.isView(v)) { const b = new Uint8Array(v.buffer, v.byteOffset, v.byteLength); const at = off; parts.push(b); off += b.length; const pad = (8 - (off % 8)) % 8; if (pad) { parts.push(new Uint8Array(pad)); off += pad; } return { $ta: v.constructor.name, o: at, n: v.length }; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") { const o = {}; for (const k in v) if (k[0] !== "_") o[k] = walk(v[k]); return o; }
    return v;
  };
  const tree = walk({ save: sv, leagues: CLUB_LEAGUES });
  const json = new TextEncoder().encode(JSON.stringify(tree)), head = new Uint8Array(8);
  new DataView(head.buffer).setUint32(0, json.length, true);
  const jpad = (8 - (json.length % 8)) % 8;
  return new Blob([head, json, new Uint8Array(jpad), ...parts]);
}
async function unpackSave(buf) {
  const u8 = new Uint8Array(buf), jl = new DataView(buf).getUint32(0, true);
  const tree = JSON.parse(new TextDecoder().decode(u8.subarray(8, 8 + jl)));
  const base = 8 + jl + ((8 - (jl % 8)) % 8);
  const T = { Uint8Array, Int8Array, Uint16Array, Int16Array, Uint32Array, Int32Array, Float32Array, Float64Array };
  const back = v => {
    if (Array.isArray(v)) return v.map(back);
    if (v && typeof v === "object") {
      if (v.$ta) { const C = T[v.$ta]; return new C(buf.slice(base + v.o, base + v.o + v.n * C.BYTES_PER_ELEMENT)); }
      const o = {}; for (const k in v) o[k] = back(v[k]); return o;
    }
    return v;
  };
  return back(tree);
}
const canGzip = () => typeof CompressionStream !== "undefined" && typeof DecompressionStream !== "undefined";
async function gzipBlob(blob, how) { return new Response(blob.stream().pipeThrough(new (how === "gz" ? CompressionStream : DecompressionStream)("gzip"))).blob(); }
function blobToBase64(blob) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = () => rej(r.error); r.readAsDataURL(blob); }); }
function base64ToBytes(s) { const bin = atob(s.trim()), out = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) out[k] = bin.charCodeAt(k); return out; }
const cloudSay = (state, msg, pct) => { CLOUD.state = state; CLOUD.msg = msg || ""; CLOUD.pct = pct || 0; const el = $("#cloudline"); if (el) el.innerHTML = cloudLineHtml(); renderSaveNote(); };
async function cloudInit() {
  try {
    if (!window.claude || typeof window.claude.use !== "function") { CLOUD.checked = true; return; }
    const [db, assets] = await Promise.all([window.claude.use("db"), window.claude.use("assets")]);
    CLOUD.db = db; CLOUD.assets = assets; CLOUD.checked = true;
    if (!db) { if (S.dataPage) render(); return; }
    cloudSmallPull();
    const snap = await CLOUD.db.doc(CLOUD_DOC).get();
    CLOUD.doc = snap.exists ? snap.data() : null;
    CLOUD.state = CLOUD.doc ? "ready" : "empty";
    // another device saved a newer copy: open it here
    if (CLOUD.doc && CLOUD.doc.chunks && (!SAVE || (SAVE.id !== CLOUD.doc.saveId && (CLOUD.doc.at || 0) > (SAVE.at || 0)))) await cloudDownload(true);
    else if (S.dataPage) render();
  } catch (e) { CLOUD.checked = true; cloudSay("error", "Your cloud copy couldn't be checked: " + (e.message || e.code || e)); }
}
// small things that follow you between devices: the shortlist and your loaded tactic (newest copy wins)
const SMALL = {
  shortlist: { get: () => typeof SL !== "undefined" && SL.length ? SL : null, set: v => { SL = Array.isArray(v) ? v : []; slSave(SL, true); } },
  tactic: { get: () => S.myTac || null, set: v => { S.myTac = v && v.file ? v : null; tacSave(true); } },
};
const smallAt = k => { try { return +localStorage.getItem("scoutlab-" + k + "-at") || 0; } catch (e) { return 0; } };
const smallTouch = (k, t) => { try { localStorage.setItem("scoutlab-" + k + "-at", String(t || Date.now())); } catch (e) { } };
async function cloudSmallPull() {
  if (!CLOUD.db) return;
  let changed = false;
  for (const k of Object.keys(SMALL)) {
    try {
      const sn = await CLOUD.db.doc("cloud/" + k).get(), r = sn.exists ? sn.data() : null, la = smallAt(k);
      if (r && (r.at || 0) > la) { SMALL[k].set(r.json ? JSON.parse(r.json) : null); smallTouch(k, r.at); changed = true; }
      else if (la > ((r && r.at) || 0)) await CLOUD.db.doc("cloud/" + k).set({ json: JSON.stringify(SMALL[k].get()), at: la });
    } catch (e) { }
  }
  if (changed) render();
}
const smallTimers = {};
function cloudSmallPush(k) {
  smallTouch(k);
  if (!CLOUD.db) return;
  clearTimeout(smallTimers[k]);
  smallTimers[k] = setTimeout(async () => { try { await CLOUD.db.doc("cloud/" + k).set({ json: JSON.stringify(SMALL[k].get()), at: smallAt(k) }); } catch (e) { } }, 1500);
}
async function cloudUpload() {
  if (!SAVE || !CLOUD.db || !CLOUD.assets) return;
  if (CLOUD.uploading) { CLOUD.again = true; return; }   // a newer save arrived mid-upload: send it next
  CLOUD.uploading = true; CLOUD.again = false;
  try { await cloudUploadOnce(); } finally { CLOUD.uploading = false; }
  if (CLOUD.again && SAVE && (!CLOUD.doc || CLOUD.doc.saveId !== SAVE.id)) cloudUpload();
}
async function cloudUploadOnce() {
  const sv = SAVE;
  try {
    cloudSay("busy", "Packing your save for the cloud", 2);
    let blob = packSave(sv); const raw = blob.size;
    const gz = canGzip(); if (gz) blob = await gzipBlob(blob, "gz");
    try { const u = (await CLOUD.assets.list()).usage, old = CLOUD.doc && CLOUD.doc.bytes || 0; if (u && u.maxBytes && u.bytes - old + blob.size * 1.34 > u.maxBytes) { cloudSay("error", `Your cloud space is full (${Math.round(u.bytes / 1e6)} of ${Math.round(u.maxBytes / 1e6)} MB). This save needs about ${Math.round(blob.size * 1.34 / 1e6)} MB.`); return; } } catch (e) { }
    const ids = [], n = Math.ceil(blob.size / CLOUD_CHUNK);
    for (let k = 0; k < n; k++) {
      cloudSay("busy", `Saving to your cloud: part ${k + 1} of ${n}`, 5 + 90 * k / n);
      const text = await blobToBase64(blob.slice(k * CLOUD_CHUNK, (k + 1) * CLOUD_CHUNK));
      let res = null;
      for (let tries = 0; tries < 2 && !res; tries++) { try { res = await CLOUD.assets.upload(new Blob([text], { type: "text/plain" }), { type: "text/plain" }); } catch (e) { if (e.code !== "store_unavailable" || tries) throw e; await new Promise(r => setTimeout(r, 1500)); } }
      ids.push(res.id);
    }
    const prev = CLOUD.doc && CLOUD.doc.chunks || [];
    const doc = { v: 1, saveId: sv.id, at: sv.at || Date.now(), file: sv.file, gameDate: sv.meta.gameDate, game: sv.meta.game, players: sv.meta.check.named || sv.n, seasons: hasHistory() ? pastYears().length : 0,
      chunks: ids, gz, bytes: blob.size, raw, savedAt: new Date().toISOString() };
    await CLOUD.db.doc(CLOUD_DOC).set(doc);
    CLOUD.doc = doc;
    // the new copy replaces the old one: remove the old parts (nothing points at them now)
    for (const id of prev) if (!ids.includes(id)) { try { await CLOUD.assets.delete(id); } catch (e) { } }
    cloudSay("ready", "");
  } catch (e) {
    const why = { quota_or_state: "your cloud space is full", too_large: "a part was too large", rate_limited: "too many uploads at once; try again in a minute", upstream_auth: "please reload and sign in again", not_granted: "only the owner or an editor can save to the cloud" }[e.code] || (e.message || e.code || "unknown error");
    cloudSay("error", "The save couldn't be saved to your cloud: " + why + ". It is still loaded here.");
  }
}
async function cloudDownload(auto) {
  const d = CLOUD.doc; if (!d || !d.chunks) return;
  try {
    const parts = [];
    for (let k = 0; k < d.chunks.length; k++) {
      cloudSay("busy", `Getting your save from the cloud: part ${k + 1} of ${d.chunks.length}`, 5 + 85 * k / d.chunks.length);
      const r = await fetch(cloudBlobUrl(d.chunks[k])); if (!r.ok) throw new Error("part " + (k + 1) + " is missing (" + r.status + ")");
      parts.push(base64ToBytes(await r.text()));
    }
    cloudSay("busy", "Opening your save", 95);
    let blob = new Blob(parts); if (d.gz) blob = await gzipBlob(blob, "gunzip");
    const pkg = await unpackSave(await blob.arrayBuffer());
    const sv = pkg.save; if (!sv || sv.v !== 2 || !sv.n) throw new Error("the cloud copy is not a Scout Lab save");
    Object.entries(pkg.leagues || {}).forEach(([c, v]) => { if (!CLUB_LEAGUES[c]) CLUB_LEAGUES[c] = v; });
    SAVE = sv; SAVE.at = d.at; SAVE.fromCloud = d.savedAt;
    installSave(!auto || !S.ds.some(d => d.fromSave)); clearCaches();
    if (DB.db) { await keepSave(); await saveClubLeagues(); try { await snapTake(); } catch (e) { } try { await tsnapTake(); } catch (e) { } }
    await saveDatasets();
    cloudSay("ready", ""); render();
  } catch (e) { cloudSay("error", "Your save couldn't be opened from the cloud: " + (e.message || e.code || e)); }
}
async function cloudRemove() {
  const d = CLOUD.doc; if (!d || !CLOUD.db) return;
  try {
    await CLOUD.db.doc(CLOUD_DOC).delete();
    if (CLOUD.assets) for (const id of d.chunks || []) { try { await CLOUD.assets.delete(id); } catch (e) { } }
    CLOUD.doc = null; cloudSay("empty", "");
  } catch (e) { cloudSay("error", "The cloud copy couldn't be removed: " + (e.message || e.code)); }
}
const mb = b => (b / 1048576).toFixed(b < 10485760 ? 1 : 0) + " MB";
function cloudLineHtml() {
  const d = CLOUD.doc;
  if (!CLOUD.checked) return `<span class="muted">Checking your cloud copy…</span>`;
  if (!CLOUD.db) return `<span class="muted">Not available here: the cloud copy works in Scout Lab on claude.ai, signed in (not in a downloaded copy of the page).</span>`;
  if (CLOUD.state === "busy") return `<span>${esc(CLOUD.msg)}</span><span class="progress"><span style="width:${Math.round(CLOUD.pct)}%"></span></span>`;
  const err = CLOUD.state === "error" ? `<span class="bad">${esc(CLOUD.msg)}</span> ` : "";
  if (!d) return err + `<span class="muted">No save in your cloud yet.</span>`;
  const same = SAVE && SAVE.id === d.saveId;
  return err + `<span>${same ? "✓ This save is in your cloud" : "Your cloud holds"}: <b>${esc(d.file || "save")}</b> · in-game ${esc(d.gameDate || "?")} · ${(d.players || 0).toLocaleString()} players${d.seasons ? ` · ${d.seasons} past season${d.seasons > 1 ? "s" : ""}` : ""} · ${mb(d.bytes * 1.34)} · saved ${esc(new Date(d.savedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</span>`;
}
function renderCloudPanel() {
  const d = CLOUD.doc, can = !!CLOUD.assets, busy = CLOUD.state === "busy", same = SAVE && d && SAVE.id === d.saveId;
  return `<section class="panel"><div class="ph"><h3>Cloud copy (your other devices)</h3></div>
    <p class="small muted">The loaded save is kept with Scout Lab on claude.ai, so your laptop, tablet and computer all open the same players, seasons and stats without the .fm file. Load a newer save on any device and the others pick it up next time they open Scout Lab.</p>
    <p class="small" id="cloudline">${cloudLineHtml()}</p>
    ${CLOUD.db ? `<div class="addrow">
      ${can && SAVE && !same ? `<button class="primary" data-act="cloudup" ${busy ? "disabled" : ""}>Save this save to the cloud</button>` : ""}
      ${d && !same ? `<button class="ghost" data-act="clouddown" ${busy ? "disabled" : ""}>Open the cloud save here</button>` : ""}
      ${can ? `<label class="small"><input type="checkbox" id="cloudAuto" ${S.cloudAuto !== false ? "checked" : ""}> Save to the cloud automatically when I load a save</label>` : ""}
      ${can && d ? `<button class="ghost small" data-act="cloudrm" ${busy ? "disabled" : ""}>${S.cloudRmArm ? "Tap again to remove the cloud copy" : "Remove cloud copy"}</button>` : ""}
    </div>${!can ? `<p class="small muted">Only the owner (or an editor) of this Scout Lab can save to its cloud; you can still open what's there.</p>` : ""}` : ""}
  </section>`;
}

