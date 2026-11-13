// ---------- FM save (.fm): every player of the save, into every tab ----------
// The save is read in this browser (a Web Worker when allowed) by the bundled reader, a JavaScript port of
// fmsave (MIT). It becomes one compact table (typed arrays by column, 200,000+ players); each position tab
// and My squad get a dataset built from it on demand, with the same columns an FM27 export has.
let SAVE = null;
let CLUB_LEAGUES = {};           // club name -> [division, based in], learned from any export with those columns
const FR = FMSaveReader;
const SAVE_KINDS = { league: "League only", overall: "All competitions", youth: "Youth & B teams (U23/U21/U19/U18, II)" };
const saveMoney = v => v >= 1e6 ? "£" + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e3 ? "£" + Math.round(v / 1e3) + "K" : "£" + Math.round(v);
const ATTR_COLS = FR.ATTRIBUTE_ORDER.map((a, k) => [FR.ATTR_NAME[a], k]).filter(x => x[0]);
const STAT_NEEDS = { "Pres A": "pressures_attempted", "Pres C": "pressures_completed" };
function learnLeagues(ds) {
  if (!ds || ds.fromSave || !ds.headers) return 0;
  const H = ds.headers, ci = colIndex(H, BASE.club), di = colIndex(H, BASE.div), bi = colIndex(H, BASE.country);
  if (ci < 0 || (di < 0 && bi < 0)) return 0;
  let n = 0;
  ds.rows.forEach(r => {
    const c = (r[ci] || "").trim(); if (!c || c === "-") return;
    const d = di >= 0 ? (r[di] || "").trim() : "", b = bi >= 0 ? (r[bi] || "").trim() : "";
    if (!d && !b) return;
    const old = CLUB_LEAGUES[c];
    if (!old || (!old[0] && d) || (!old[1] && b)) { CLUB_LEAGUES[c] = [d || (old && old[0]) || "", b || (old && old[1]) || ""]; n++; }
  });
  return n;
}
async function saveClubLeagues() { if (DB.db) await DB.set("clubleagues", CLUB_LEAGUES); }
function saveKind() { const k = S.saveKind || "league"; return SAVE && SAVE.stats && SAVE.stats[k] ? k : SAVE && SAVE.stats && SAVE.stats.league ? "league" : null; }
const FA_CLUB = "Free agent";
const saveClub = i => { const k = SAVE.clubIdx[i]; return k >= 0 ? SAVE.clubs[k] : FA_CLUB; };
// positions (string, best position, groups bitmask, colour group) for every player, worked out once
const CODE_BENCH = { GK: "GK", SW: "CB", DL: "FB", DC: "CB", DR: "FB", DM: "DM", ML: "W", MC: "CM", MR: "W", AML: "W", AMC: "AM", AMR: "W", STC: "ST", WBL: "FB", WBR: "FB" };
function savePos() {
  if (SAVE._pc) return SAVE._pc;
  const n = SAVE.n, str = new Array(n), best = new Array(n), bits = new Uint8Array(n), bench = new Array(n), codes = FR.POSITION_CODES, o = {};
  for (let i = 0; i < n; i++) {
    let bk = null, bv = -1;
    for (let k = 0; k < 15; k++) { const v = SAVE.pos[i * 15 + k]; o[codes[k]] = v; if (k !== 1 && v > bv) { bv = v; bk = codes[k]; } }
    str[i] = FR.positionString(o, 15) || FR.positionString({ [bk]: 20 }, 20);
    best[i] = FR.positionString({ [bk]: 20 }, 20);
    bench[i] = CODE_BENCH[bk] || "CM";
    let b = 0; posGroups(str[i]).forEach(p => { b |= 1 << POSITIONS.indexOf(p); }); bits[i] = b;
  }
  return (SAVE._pc = { str, best, bits, bench });
}
function saveHeaders() {
  if (SAVE._headers) return SAVE._headers;
  const k = saveKind(), cols = k ? SAVE.stats[k].cols : {};
  return (SAVE._headers = ["Player", "Club", "Age", "Position", "Best Pos", "Transfer Value", "Division", "Based In", "Unique ID", "Height", "Preferred Foot", "Nationality",
    ...FR.STAT_COLS.map(c => c[0]).filter(h => !STAT_NEEDS[h] || cols[STAT_NEEDS[h]]), ...ATTR_COLS.map(c => c[0])]);
}
function saveStatObj(st, r) {
  const s = {}; for (const f in st.cols) { const v = st.cols[f][r]; s[f] = v !== v ? null : v; }
  return s;
}
const footTxt = (l, r) => l >= 15 && r >= 15 ? "Either" : r >= l ? (l <= 5 ? "Right Only" : "Right") : (r <= 5 ? "Left Only" : "Left");
// one player as an export row (same headers as an FM27 export)
function saveRow(i) {
  const T = SAVE, k = saveKind(), st = k ? T.stats[k] : null, r = st ? st.row[i] : -1, s = r >= 0 ? saveStatObj(st, r) : null;
  const pc = savePos(), club = saveClub(i), lg = CLUB_LEAGUES[club], v = T.value[i];
  const out = [T.name[i], club, T.age[i] < 0 ? "" : T.age[i], pc.str[i], pc.best[i], v === v ? saveMoney(v) : "", lg ? lg[0] : "", lg ? lg[1] : "", "s" + T.uid[i],
    T.height[i] ? T.height[i] + " cm" : "", footTxt(T.feet[i * 2], T.feet[i * 2 + 1]), saveNat(i)];
  const want = new Set(saveHeaders());
  FR.STAT_COLS.forEach(([h, f]) => { if (!want.has(h)) return; const x = s ? f(null, s) : null; out.push(x == null || (typeof x === "number" && !isFinite(x)) ? "" : x); });
  ATTR_COLS.forEach(([, a]) => out.push(T.attrs[i * 52 + a]));
  return out;
}
// each tab's players: Attributes = everyone chosen (by default: played this season, or 23 or younger); Stats = those with stats
const SAVE_WHO = { played: "Played this season", active: "Played this season, or 23 and under", all: "Everyone in the save" };
function saveGroups() {
  const who = SAVE_WHO[S.saveWho] ? S.saveWho : "played", kind = saveKind();
  const extra = SAVE._extra || new Set();
  if (SAVE._groups && SAVE._groups.fa === 1 && SAVE._groups.who === who && SAVE._groups.kind === kind && SAVE._groups.extra === extra.size) return SAVE._groups;
  const g = { fa: 1, who, kind, extra: extra.size, attr: {}, stats: {} }, pc = savePos(), row = kind ? SAVE.stats[kind].row : null;
  POSITIONS.forEach(p => { g.attr[p] = []; g.stats[p] = []; });
  for (let i = 0; i < SAVE.n; i++) {
    if (!SAVE.name[i]) continue;
    const played = !!row && row[i] >= 0;
    if (!extra.has(i) && SAVE.clubIdx[i] >= 0) {
      if (who === "played" && !played) continue;
      if (who === "active" && !played && !(SAVE.age[i] >= 0 && SAVE.age[i] <= 23)) continue;
    }
    const b = pc.bits[i];
    POSITIONS.forEach((p, k) => { if (b & (1 << k)) { g.attr[p].push(i); if (played) g.stats[p].push(i); } });
  }
  return (SAVE._groups = g);
}
// clubs with the most players first (senior sides before youth / women's teams of the same name)
function saveClubChoices() {
  if (SAVE._clubChoices) return SAVE._clubChoices;
  const cnt = new Map(); for (let i = 0; i < SAVE.n; i++) { const k = SAVE.clubIdx[i]; if (k >= 0) cnt.set(k, (cnt.get(k) || 0) + 1); }
  return (SAVE._clubChoices = [...new Set([...cnt.entries()].filter(([, n]) => n >= 15).sort((a, b) => b[1] - a[1]).map(([k]) => SAVE.clubs[k]))]);
}
async function setMyClub(name) {
  const cnt = new Map(); for (let i = 0; i < SAVE.n; i++) { const k = SAVE.clubIdx[i]; if (k >= 0 && SAVE.clubs[k] === name) cnt.set(k, (cnt.get(k) || 0) + 1); }
  const k = [...cnt.entries()].sort((a, b) => b[1] - a[1])[0]; if (!k) return false;
  SAVE.meta.managed = [{ club: name, short: name, uid: SAVE.clubUid[k[0]], manager: null, picked: true }];
  SAVE._mine = null; if (typeof scRoleMemo !== "undefined") scRoleMemo.k = null;
  installSave(false); if (DB.db) { try { await keepSave(); } catch (e) { } }
  return true;
}
function saveManagedIdx() {
  const m = SAVE.meta.managed && SAVE.meta.managed[0]; if (!m) return [];
  const out = []; for (let i = 0; i < SAVE.n; i++) { const k = SAVE.clubIdx[i]; if (k >= 0 && SAVE.clubUid[k] === m.uid && SAVE.name[i]) out.push(i); }
  return out;
}
function makeSaveDs(id, mode, pos, idx) {
  const d = { id, mode, pos, role: (S.saveRoles || {})[id] || "Balanced", date: SAVE.meta.gameDate, file: SAVE.file, fromSave: true, combined: mode !== "squad" };
  if (mode === "squad") d.kinds = saveKind() ? ["stats", "attr"] : ["attr"];
  let rows = null;
  Object.defineProperty(d, "headers", { get: () => SAVE ? saveHeaders() : [], enumerable: true, configurable: true });
  Object.defineProperty(d, "rows", { get: () => rows || (rows = SAVE ? idx.map(saveRow) : []), enumerable: true, configurable: true });
  Object.defineProperty(d, "saveIdx", { value: idx, enumerable: false, configurable: true });
  return d;
}
function installSave(makeActive) {
  S.ds = S.ds.filter(d => !d.fromSave);
  if (!SAVE) return;
  if (SAVE._headers) delete SAVE._headers;
  const g = saveGroups(), made = [];
  POSITIONS.forEach(pos => ["stats", "attr"].forEach(mode => made.push(makeSaveDs(`sv-${mode}-${pos}`, mode, pos, g[mode][pos]))));
  const mine = saveManagedIdx();
  if (mine.length) {
    if (makeActive) S.ds = S.ds.filter(d => d.mode !== "squad");
    if (!S.ds.some(d => d.mode === "squad")) made.push(makeSaveDs("sv-squad", "squad", "ALL", mine));
  }
  S.ds.push(...made);
  if (makeActive) made.forEach(d => { if (d.mode !== "squad") S.active[d.mode + "|" + d.pos] = d.id; });
}
function clearCaches() {
  modelCache.clear(); mergedCache.clear(); evalCache.clear(); linkCache.clear(); rateCache.clear();
  tacticMemo = { k: null, v: null }; panelCache = { k: null, v: null };
  AD.cols = null; AD.idx = null; AD.lower = null;
}
function storedSave() {
  if (!SAVE) return null;
  return { packed: 1, v: 2, n: SAVE.n, id: SAVE.id, blob: packSave(SAVE) };
}
async function keepSave() {
  if (!DB.db) return false;
  let ok = false; try { ok = await DB.set("save", storedSave()); } catch (e) { ok = false; }
  if (!ok) S.saveErr = "The save is loaded, but this browser had no room to keep it for next time.";
  return ok;
}
// the reader runs in a Web Worker built from the bundled source; if this page may not start one, it runs here
let readerVia = "";
function runSaveReader(file, onProgress) {
  const direct = () => { readerVia = "page"; return FMSaveReader.readSave(file, { progress: onProgress }); };
  let src = null;
  try { src = $("#fmsave-src").textContent; } catch (e) { }
  if (!src || typeof Worker === "undefined") return direct();
  return new Promise((resolve, reject) => {
    let started = false, w = null, url = null, done = false;
    const fallback = () => { if (done) return; done = true; try { w && w.terminate(); } catch (e) { } if (url) URL.revokeObjectURL(url); direct().then(resolve, reject); };
    try {
      const code = src + `\nself.onmessage=async e=>{try{const t=await FMSaveReader.readSave(e.data.file,{progress:(m,f)=>postMessage({type:"progress",m,f})});`
        + `postMessage({type:"done",t},FMSaveReader.tableBuffers(t));}`
        + `catch(err){postMessage({type:"error",message:String(err&&err.message||err),kind:err&&err.kind})}};postMessage({type:"ready"});`;
      url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
      w = new Worker(url);
    } catch (e) { fallback(); return; }
    w.onerror = ev => { if (!started) { ev.preventDefault && ev.preventDefault(); fallback(); } else if (!done) { done = true; w.terminate(); URL.revokeObjectURL(url); reject(new Error("the reader stopped unexpectedly (the device may have run out of memory)")); } };
    w.onmessage = ({ data }) => {
      if (data.type === "ready") { started = true; w.postMessage({ file }); return; }
      if (data.type === "progress") { onProgress(data.m, data.f); return; }
      done = true; w.terminate(); URL.revokeObjectURL(url);
      if (data.type === "done") { readerVia = "worker"; resolve(data.t); }
      else reject(Object.assign(new Error(data.message), { kind: data.kind }));
    };
    setTimeout(() => { if (!started) fallback(); }, 8000);
  });
}
let saveFile = null;
async function loadSaveFile(opts) {
  opts = opts || {};
  if (S.saveBusy) return;   // already reading one
  if (!saveFile) { const fi = $("#saveIn"); if (fi && fi.files && fi.files[0]) saveFile = fi.files[0]; }   // the picker's change event can be missed on phones: read the box itself
  if (!saveFile) { S.saveErr = "No save file has reached Scout Lab yet. Tap the box, pick your .fm file, and wait until its name and size show in the box (from Google Drive or OneDrive your phone downloads it first, which can take a minute for a big save). It then loads by itself."; render(); return; }
  S.saveErr = ""; S.saveBusy = { m: "Starting", f: 0 }; render();
  const t0 = Date.now();
  try {
    const t = await runSaveReader(saveFile, (m, f) => { S.saveBusy = { m, f }; const b = $("#savebar"), l = $("#saveprog"); if (b) b.style.width = Math.round(f * 100) + "%"; if (l) l.textContent = m; });
    S.ds.filter(d => !d.fromSave).forEach(learnLeagues);
    SAVE = Object.assign(t, { id: "save" + Date.now(), at: Date.now(), file: saveFile.name, size: saveFile.size, fileMod: saveFile.lastModified || 0, loaded: new Date().toISOString().slice(0, 10), ms: Date.now() - t0, via: readerVia });
    installSave(true);
    clearCaches();
    S.saveBusy = null; saveFile = null; S.sel = null; S.adding = false;
    if (!opts.keepPage) { S.dataPage = false; S.guide = false; S.mode = "home"; S.adCtx = null; window.scrollTo(0, 0); }   // straight to the one-page report (a save loaded by the folder watcher keeps your page)
    render();
    if (DB.db) { await keepSave(); await saveClubLeagues(); try { await snapTake(); } catch (e) { } try { await tsnapTake(); } catch (e) { } }
    await saveDatasets();
    render();
    if (CLOUD.db && CLOUD.assets && S.cloudAuto !== false) cloudUpload();
  } catch (e) {
    S.saveBusy = null;
    S.saveErr = e.kind === "notsave" ? "That file isn't a Football Manager save. Pick the .fm file of your career (Documents › Sports Interactive › Football Manager 27 › games)."
      : e.kind === "version" ? e.message
      : `This save couldn't be read: ${e.message}${/memory|allocation|Array buffer|Invalid typed array length/i.test(e.message) ? " (the device ran out of memory; try a computer, or a save with fewer leagues loaded)" : ""}`;
    render();
  }
}
async function removeSave() {
  SAVE = null; installSave(false); clearCaches();
  if (DB.db) await DB.set("save", null);
  await saveDatasets(); render();
}
async function wipeAll() {
  SAVE = null; CLUB_LEAGUES = {}; S.ds = []; clearCaches();
  Object.assign(S, { mode: "stats", pos: "ST", active: {}, minMins: 500, maxAge: 0, q: "", cat: "overall", sort: null, sortDir: -1, type: null, sel: null, cmp: null,
    spos: "Overview", squadRole: {}, formation: "4-4-2", lineups: {}, pickBy: "both", tStyle: "auto", tBack: "any", tForm: "best", pRole: null, saveRoles: {}, saveKind: "league", saveWho: "played",
    adPos: "all", adQ: "", adF: {}, adSort: null, adGroups: AD_DEFAULT_GROUPS.slice(), adTypes: null, adColor: true,
    adding: false, addErr: "", saveErr: "", dataPage: true });
  try { localStorage.removeItem("scoutlab-prefs"); } catch (e) { }
  if (DB.db) { await DB.set("datasets", []); await DB.set("save", null); await DB.set("clubleagues", {}); await DB.set("cleared", true); }
  S.wiped = true;
  render();
}
function renderDataPage() {
  const sv = SAVE, busy = S.saveBusy;
  let h = `<article class="guide datapage"><header class="ghead"><h2>Your FM save & data</h2><p class="muted">Load your FM26 or FM27 save (.fm) and every player in it fills every position tab, Stats and Attributes, My squad and All data, and every club's staff fills Staff. It is read here, in this browser; nothing is uploaded.</p>
    <button class="primary" data-act="datapage">Back to the tool</button></header>`;
  if (sv) {
    const m = sv.meta, g = saveGroups(), mg = m.managed && m.managed[0], kind = saveKind();
    const known = new Set(), clubs = new Set();
    for (let i = 0; i < sv.n; i++) { const c = sv.clubIdx[i] >= 0 ? saveClub(i) : ""; if (c) { clubs.add(c); if (CLUB_LEAGUES[c]) known.add(c); } }
    h += `<section class="panel"><div class="ph"><h3>Loaded save</h3><span class="muted small">${esc(sv.file)} · loaded ${esc(sv.loaded)}</span></div>
      <section class="tiles">${[["Players", m.check.named.toLocaleString()], ["With " + (kind === "overall" ? "first-team" : kind === "youth" ? "youth/B team" : "first-team league") + " stats", (kind ? sv.stats[kind].n : 0).toLocaleString()], ["In-game date", esc(new Date(m.gameDate + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }))], ["Your club", mg ? esc(mg.club) : "not found"], ["Game", esc(m.game) + `<small> ${esc(m.build)}</small>`]]
        .map(([l, v]) => `<div class="tile"><span class="tv">${v}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>
      <div class="addrow"><label class="small muted" for="saveKind">Stats from</label><select id="saveKind">${Object.entries(SAVE_KINDS).map(([k, l]) => `<option value="${k}" ${k === (S.saveKind || "league") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
        <label class="small muted" for="saveWho">Players in the position tabs</label><select id="saveWho">${Object.entries(SAVE_WHO).map(([k, l]) => `<option value="${k}" ${k === (SAVE_WHO[S.saveWho] ? S.saveWho : "played") ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="tscroll"><table class="gtable narrow"><thead><tr><th>Tab</th><th class="num">Attributes</th><th class="num">Stats</th></tr></thead><tbody>${POSITIONS.map(p => `<tr><td>${esc(POS_MANY[p])}</td><td class="num">${g.attr[p].length.toLocaleString()}</td><td class="num">${g.stats[p].length.toLocaleString()}</td></tr>`).join("")}${mg ? `<tr><td>My squad (${esc(mg.club)})</td><td class="num">${saveManagedIdx().length}</td><td></td></tr>` : ""}<tr><td>All data</td><td class="num">${m.check.named.toLocaleString()}</td><td></td></tr>${sv.staff ? `<tr><td>Staff (every club)</td><td class="num">${sv.staff.n.toLocaleString()}</td><td></td></tr>` : ""}</tbody></table></div>
      <ul class="why small">
        ${m.cut && m.cut.after < m.cut.before ? `<li>Kept <b>${m.cut.after.toLocaleString()}</b> of the save's ${m.cut.before.toLocaleString()} players: everyone with current ability ${m.cut.minCA}+, plus your whole club (youth included). Lower players are left out to keep Scout Lab fast; when one improves past ${m.cut.minCA}, he appears after your next save load.</li>` : ""}
        <li>Stats are this season's <b>${esc(SAVE_KINDS[kind] || "league")}</b> numbers at his current club, turned into per-90s exactly like an export.${m.statsError ? ` <span class="bad">${esc(m.statsError)} Attributes still work.</span>` : ""}</li>
        ${sv.staff ? "" : `<li class="${m.staffError ? "bad" : "muted"}">${m.staffError ? "Staff couldn't be read: " + esc(m.staffError) : "Staff: load this save once more to read every club's staff (it was loaded before Scout Lab read them)."}</li>`}
        <li>${hasHistory() ? `<b>Past seasons</b> in this save: ${pastYears().length} (${esc(pastYears().slice().reverse().map(seasonShort).join(", "))})${pastYears().length < histYears().length ? ", plus lines from this season (earlier clubs, calendar-year leagues)" : ""}; ${sv.hist.n.toLocaleString()} season lines in all. Pick one, or All-time, in <b>All data</b>; each player's panel shows his season-by-season table.` : m.historyError ? `<span class="bad">Past seasons couldn't be read: ${esc(m.historyError)}</span>` : "No past seasons are stored in this save yet (FM adds one at the end of each season)."}</li>
        <li>League strength needs each club's division, which a save doesn't name. <b>${known.size.toLocaleString()} of ${clubs.size.toLocaleString()}</b> clubs are known from your exports; for the rest the stats get the default (unknown league) adjustment. Load any export with <b>Division</b> and <b>Based In</b> columns and those clubs are learned for good.</li>
        <li>Position tabs hold the players who played this season (the minutes slider still decides who is ranked). <b>Free agents</b> are always in the Attributes tabs (tick "Free agents only" to see just them). Add young players or everyone to the Attributes tabs above; big saves get slow, especially on a phone. <b>All data</b> always has everyone.</li>
        <li>Positions: everything he is <b>accomplished</b> or <b>natural</b> at (15+ of 20). Values are FM's in pounds. Attributes are the real ones, scouted or not.</li>
        ${mg ? "" : `<li class="bad">Your club wasn't found in this save, so My squad keeps your squad export. Pick it below.</li>`}
      </ul>
      <div class="addrow"><label class="small muted" for="myClubIn">Your club</label><input id="myClubIn" list="myClubList" value="${esc(mg ? mg.club : "")}" placeholder="Type your club" style="min-width:220px">
        <datalist id="myClubList">${saveClubChoices().map(c => `<option value="${esc(c)}">`).join("")}</datalist>
        <span class="small muted">${mg && mg.fromName ? "Taken from the save's name: FM had you without a club when it saved." : mg && mg.picked ? "Picked by you." : mg ? "Read from the save." : ""}</span></div>
      <div class="addrow"><button class="ghost" data-act="removesave">Remove this save</button></div></section>`;
  }
  h += renderCloudPanel();
  h += `<section class="panel addpanel"><h3>${sv ? "Load a newer save" : "Load your save"}</h3>
    <p class="muted">Pick the <b>.fm</b> file of your career: <code>Documents › Sports Interactive › Football Manager 27 › games</code> on the PC, or from your cloud folder (OneDrive, Google Drive, Dropbox, iCloud) on any device. Save in FM first; if it's mid-save, wait and try again.</p>
    <div class="addgrid one"><label class="drop" for="saveIn"><input type="file" id="saveIn"><span>${saveFile ? esc(saveFile.name) + ` · ${(saveFile.size / 1048576).toFixed(0)} MB` : "Choose or drop your .fm save"}</span></label></div>
    <div class="addrow"><button class="primary" data-act="loadsave" ${busy ? "disabled" : ""}>${busy ? "Reading…" : "Load save"}</button></div>
    ${busy ? `<div class="progress"><i id="savebar" style="width:${Math.round(busy.f * 100)}%"></i></div><p class="small muted" id="saveprog">${esc(busy.m)}</p>` : ""}
    ${S.saveErr ? `<p class="err">${esc(S.saveErr)}</p>` : ""}
    <p class="small muted">Big saves take a while, longer on a phone (it reads only the player and stats parts). The save is kept in this browser until you load a newer one, so it stays after you close the page. Your CSV exports stay too; each tab lets you switch between them and the save.</p></section>`;
  h += typeof sdPanelHtml === "function" ? sdPanelHtml() : "";
  h += `<section class="panel danger-zone"><h3>Wipe all data</h3><p class="muted">Removes everything Scout Lab keeps in this browser: the save, every export, your squad, formations, roles, filters and settings. Other devices keep their own.</p>
    <button class="ghost dangerbtn" data-act="wipe">Wipe all data</button>${S.wiped ? `<p class="small okc">Everything was wiped.</p>` : ""}</section>`;
  return h + `</article>`;
}
function bindSaveInput() {
  const fi = $("#saveIn"), drop = fi && fi.closest(".drop");
  if (!fi) return;
  const take = f => { if (!f) return; saveFile = f; S.saveErr = ""; drop.querySelector("span").textContent = `${f.name} · ${(f.size / 1048576).toFixed(0)} MB`; };
  fi.onchange = fi.oninput = () => { const f = fi.files && fi.files[0]; if (!f || f === saveFile) return; take(f); if (!S.saveBusy) loadSaveFile(); };   // start as soon as the file arrives: no race with the Load button
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); take(e.dataTransfer.files[0]); };
}

