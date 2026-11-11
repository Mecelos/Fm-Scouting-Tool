// ---------- import ----------
let addFiles = [];   // [{name, text}]
function bindAdd() {
  const fi = $("#fileIn"), ta = $("#pasteIn"), drop = $(".drop");
  if (!fi) return;
  const take = files => {
    addFiles = []; const list = [...files];
    Promise.all(list.map(f => new Promise(res => { const rd = new FileReader(); rd.onload = () => res({ name: f.name, text: String(rd.result) }); rd.onerror = () => res(null); rd.readAsText(f); })))
      .then(arr => { addFiles = arr.filter(Boolean); drop.querySelector("span").textContent = addFiles.map(f => f.name).join(", ") || "Couldn't read the file"; ta.value = ""; });
  };
  fi.onchange = () => fi.files.length && take(fi.files);
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); e.dataTransfer.files.length && take(e.dataTransfer.files); };
  ta.oninput = () => { addFiles = ta.value.trim() ? [{ name: "pasted", text: ta.value }] : []; };
}
function loadExport() {
  try {
    if (!addFiles.length) throw new Error("Nothing to load yet. Choose a file or paste the CSV text first.");
    const role = $("#addRole").value, date = new Date().toISOString().slice(0, 10);
    const made = [];
    addFiles.forEach((f, n) => {
      const t = parseExport(f.text);
      const kinds = detectKinds(t.headers);
      kinds.forEach(mode => made.push({ id: "ds" + Date.now() + "-" + n + mode, mode, pos: S.pos, role, date, file: f.name, combined: kinds.length > 1, ...t }));
    });
    made.forEach(d => { S.ds.push(d); S.active[d.mode + "|" + d.pos] = d.id; });
    if (made.reduce((n, d) => n + learnLeagues(d), 0)) { saveClubLeagues(); if (SAVE) { installSave(false); clearCaches(); } }
    if (!made.some(d => d.mode === S.mode)) S.mode = made[0].mode;
    S.adding = false; S.addErr = ""; addFiles = []; S.sel = null; S.sort = null; S.type = null;
    saveDatasets(); render();
  } catch (e) { S.addErr = e.message; render(); }
}

// ---------- events ----------
document.addEventListener("click", e => {
  const t = e.target.closest("button, [data-pid], th[data-sort], [data-spos], [data-tform], tr[data-adi], tr[data-sid], th[data-ssort]");
  if (!t) return;
  // staff
  if (t.dataset.stab) { S.guide = false; S.dataPage = false; S.mode = "staff"; S.stab = t.dataset.stab; S.sSel = null; S.sShowAll = false; render(); window.scrollTo(0, 0); return; }
  if (t.dataset.sprole) { setStaffPanelRole(t.dataset.sprole); return; }
  if (t.dataset.sgo) { const [tb, rl] = t.dataset.sgo.split("|"); S.mode = "staff"; S.stab = tb; S.sRole = { ...(S.sRole || {}), [tb]: rl }; S.sSel = null; S.sShowAll = false; closeDrawer(true); render(); window.scrollTo(0, 0); return; }
  const ssh = t.closest("th[data-ssort]"); if (ssh) { setStaffSort(ssh.dataset.ssort); const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (t.dataset.sfrm) { const f = { ...(S.sF || {}) }; delete f[t.dataset.sfrm]; S.sF = f; render(); return; }
  if (t.dataset.afrm) { const f = { ...(S.attrF || {}) }; delete f[t.dataset.afrm]; S.attrF = f; render(); return; }
  if (t.dataset.sid != null && !t.dataset.act) { openStaff(+t.dataset.sid); return; }
  if (t.dataset.mode) { S.adCtx = null; S.guide = false; S.dataPage = false; S.mode = t.dataset.mode; S.sel = null; S.cmp = null; S.sort = null; S.cat = "overall"; S.type = null; S.adding = false; render(); return; }
  if (t.dataset.spos) { S.adCtx = null; S.guide = false; S.dataPage = false; if (t.dataset.mode2) S.mode = t.dataset.mode2; S.spos = t.dataset.spos; S.sel = t.dataset.open ? +t.dataset.open : null; S.pRole = null; S.cmp = null; S.adding = false; S.showAll = false; render(); if (S.sel == null) window.scrollTo(0, 0); return; }
  if (t.dataset.adi != null) { adOpen(+t.dataset.adi); return; }
  if (t.dataset.adpos) { S.adPos = t.dataset.adpos; S.guide = false; S.dataPage = false; if (S.mode !== "all") S.mode = "all"; renderTabs(); savePrefs(); if ($("#adwrap")) adRefresh(); else render(); return; }
  if (t.dataset.adcat) { const k = t.dataset.adcat, s = new Set(adCatsOn()); s.has(k) ? s.delete(k) : s.add(k); S.adTypes = Object.keys(AD_CATS).filter(x => s.has(x)); adRankByTypes(); hideAdTip(); render(); return; }
  if (t.dataset.adgroup) { const g = new Set(S.adGroups || AD_DEFAULT_GROUPS); g.has(t.dataset.adgroup) ? g.delete(t.dataset.adgroup) : g.add(t.dataset.adgroup); S.adGroups = Object.keys(AD_GROUPS).filter(x => g.has(x)); const x = $("#adwrap") ? $("#adwrap").scrollLeft : 0; render(); return; }
  if (t.dataset.adsort) { const k = t.dataset.adsort, c = (AD.cols || []).find(x => x.k === k); S.adSort = S.adSort && S.adSort.k === k ? (S.adSort.d === -1 ? { k, d: 1 } : null) : { k, d: c && c.t === "str" ? 1 : -1 }; const x = $("#adwrap") ? $("#adwrap").scrollLeft : 0; render(); const w = $("#adwrap"); if (w) w.scrollLeft = x; if (lastPointer !== "mouse") showAdTip(document.querySelector(`#adwrap th[data-k="${k}"]`), true); return; }
  if (t.dataset.adleg) { S.adLegendPos = t.dataset.adleg; S.adLegendOpen = true; const y = window.scrollY, x = $("#adwrap") ? $("#adwrap").scrollLeft : 0; render(); window.scrollTo(0, y); const w = $("#adwrap"); if (w) w.scrollLeft = x; return; }
  if (t.dataset.tform) { S.tForm = t.dataset.tform; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (t.dataset.pos) { S.guide = false; S.dataPage = false; S.pos = t.dataset.pos; S.sel = null; S.cmp = null; S.sort = null; S.cat = "overall"; S.type = null; S.adding = false; S.showAll = false; render(); return; }
  if (t.dataset.ds) { S.active[key()] = t.dataset.ds; S.adding = false; S.sel = null; S.cmp = null; render(); return; }
  if (t.dataset.role) { if (t.closest("#drawer")) setPanelRole(t.dataset.role); else setRole(t.dataset.role); return; }
  if (t.dataset.cat) { S.cat = t.dataset.cat; S.sort = null; S.sortDir = -1; render(); return; }
  if (t.dataset.type !== undefined && t.classList.contains("tchip")) { S.type = t.dataset.type || null; render(); return; }
  const th = t.closest("th[data-sort]");
  if (th) { const k = th.dataset.sort; if (S.sort === k || (!S.sort && (k === S.cat || (k === "overall" && S.cat === "overall")))) S.sortDir *= -1; else { S.sort = k; S.sortDir = k === "name" || k === "type" ? 1 : -1; } render(); return; }
  const act = t.dataset.act;
  if (act === "sfadd" || act === "afadd") {
    const st = act === "sfadd", at = $(st ? "#sfAttr" : "#afAttr"), mn = $(st ? "#sfMin" : "#afMin"), v = Math.round(+mn.value);
    if (!at.value || !(v >= 1 && v <= 20)) { mn.focus(); mn.classList.add("bad"); return; }
    if (st) S.sF = { ...(S.sF || {}), [at.value]: v }; else S.attrF = { ...(S.attrF || {}), [at.value]: v };
    const y = window.scrollY; render(); window.scrollTo(0, y); return;
  }
  if (act === "sfclear") { S.sF = {}; render(); return; }
  if (act === "sprolereset") { setStaffPanelRole(null); return; }
  if (act === "afclear") { S.attrF = {}; render(); return; }
  if (act === "sshowall") { S.sShowAll = !S.sShowAll; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (act === "sbandadd" || act === "sbandrm" || act === "sbandreset") {
    let b = staffBands().map(x => [...x]);
    if (act === "sbandadd") b.push([1, "New word"]); else if (act === "sbandrm") b.splice(+t.dataset.k, 1); else b = null;
    S.sBands = b && b.length ? b : null; S.sBandsOpen = true; const y = window.scrollY; render(); window.scrollTo(0, y); return;
  }
  if (act === "guide") { S.guide = !S.guide; if (S.guide) S.dataPage = false; render(); return; }
  if (act === "datapage") { S.dataPage = !S.dataPage; S.guide = false; S.wiped = false; render(); window.scrollTo(0, 0); return; }
  if (act === "loadsave") { loadSaveFile(); return; }
  if (act === "cloudup") { cloudUpload(); return; }
  if (act === "clouddown") { cloudDownload(false); return; }
  if (act === "cloudrm") { if (!S.cloudRmArm) { S.cloudRmArm = true; render(); setTimeout(() => { if (S.cloudRmArm) { S.cloudRmArm = false; if (S.dataPage) render(); } }, 3000); return; } S.cloudRmArm = false; cloudRemove().then(() => render()); return; }
  if (act === "adfa") { S.adFA = !S.adFA; const x = $("#adwrap") ? $("#adwrap").scrollLeft : 0; render(); const w = $("#adwrap"); if (w) w.scrollLeft = x; return; }
  if (act === "adcolor") { S.adColor = !S.adColor; const x = $("#adwrap") ? $("#adwrap").scrollLeft : 0; render(); const w = $("#adwrap"); if (w) w.scrollLeft = x; return; }
  if (act === "adcatsall" || act === "adcatsnone") { S.adTypes = act === "adcatsall" ? Object.keys(AD_CATS) : []; adRankByTypes(); hideAdTip(); render(); return; }
  if (act === "adreset") { S.adF = {}; S.adQ = ""; S.adPos = "all"; S.adSort = null; S.adFA = false; render(); return; }
  if (act === "removesave") {
    if (!t.dataset.confirm) { t.dataset.confirm = "1"; t.textContent = "Tap again to remove the save"; t.classList.add("danger"); setTimeout(() => { if (t.isConnected) { t.textContent = "Remove this save"; delete t.dataset.confirm; t.classList.remove("danger"); } }, 3000); return; }
    removeSave(); return;
  }
  if (act === "wipe") {
    if (!t.dataset.confirm) { t.dataset.confirm = "1"; t.textContent = "Tap again to wipe everything"; t.classList.add("danger"); setTimeout(() => { if (t.isConnected) { t.textContent = "Wipe all data"; delete t.dataset.confirm; t.classList.remove("danger"); } }, 3000); return; }
    wipeAll(); return;
  }
  if (act === "add") { S.adding = true; S.addErr = ""; addFiles = []; render(); return; }
  if (act === "cancel") { S.adding = false; render(); return; }
  if (act === "load") { loadExport(); return; }
  if (act === "loadsquad") { loadSquad(); return; }
  if (act === "mapyouth") { S.mapYouth = !S.mapYouth; const y = window.scrollY; render(); window.scrollTo(0, y); return; }
  if (act === "resetlineup") { const l = { ...(S.lineups || {}) }; delete l[S.formation]; S.lineups = l; S.squadRole = {}; render(); return; }
  if (act === "squadexample") { loadSquadExample(); return; }
  if (act === "usetactic") { useTactic(); return; }
  if (act === "showall") { S.showAll = !S.showAll; render(); return; }
  if (act === "close") { closeDrawer(); return; }
  if (act === "pback") { pBack(); return; }
  if (act === "prolereset") { inAdCtx(() => setPanelRole(pageRole())); return; }
  if (act === "cmpabove") { inAdCtx(() => { const sc = panelScore(); const r = sc.rows.find(x => x.p.ix === S.sel); if (r && r.above) { S.cmp = r.above.p.ix; openPlayer(sc, S.sel, true); } }); return; }
  if (act === "adgo") { if (!S.adCtx) return; S.mode = S.adCtx.mode; S.pos = S.adCtx.pos; S.adCtx = null; render(); window.scrollTo(0, 0); return; }
  if (act === "remove") {
    const a = S.mode === "squad" ? squadDs() : activeDs(); if (!a) return;
    if (!t.dataset.confirm) { t.dataset.confirm = "1"; t.textContent = a.fromSave ? "Tap again to remove the whole save" : "Tap again to remove"; t.classList.add("danger"); setTimeout(() => { if (t.isConnected) { t.textContent = "Remove"; delete t.dataset.confirm; t.classList.remove("danger"); } }, 3000); return; }
    if (a.fromSave) { removeSave(); return; }
    S.ds = S.ds.filter(d => d.id !== a.id); modelCache.delete(a.id); S.sel = null; saveDatasets(); render(); return;
  }
  const pr = t.closest("[data-pid]");
  if (pr && !t.closest("#drawer")) { S.cmp = null; S.pRole = null; S.adOver = null; S.adCtx = adHost() ? S.adCtx : null; openPlayer(panelScore(), +pr.dataset.pid); return; }
});
// wide screens: a data page grows only as wide as its widest table needs (more columns visible, never stretched),
// up to the whole window; big tables run to the bottom of the window. Text pages keep the readable 1840px.
const WRAP_CAP = 1840;
function fitLayout(pass) {
  pass = pass || 0;
  const main = document.getElementById("main"); if (!main) return;
  const z = +(S.uiScale || 100) / 100, data = !S.guide && !S.dataPage && innerWidth > 900;
  const root = document.documentElement, cur = parseFloat(getComputedStyle(root).getPropertyValue("--wrapmax")) || WRAP_CAP;
  const key = [S.mode, S.pos, S.spos, S.scTab, S.guide, S.dataPage, innerWidth, z].join("|");
  // a new page starts from the normal width; the passes below only grow it
  if (pass === 0 && key !== S._fitKey) { S._fitKey = key; if (cur !== WRAP_CAP) { root.style.setProperty("--wrapmax", WRAP_CAP + "px"); document.body.classList.remove("widepage"); return requestAnimationFrame(() => fitLayout(1)); } }
  let want = 0;
  if (data) {
    const mw = main.getBoundingClientRect().width / z;
    main.querySelectorAll(".adwrap, .tscroll").forEach(box => {
      const t = box.querySelector("table"); if (!t || t.rows.length < 6 || box.closest("details:not([open])")) return;
      const w0 = t.style.width; t.style.width = "max-content"; const nat = t.offsetWidth; t.style.width = w0;
      if (nat > box.clientWidth + 2) want = Math.max(want, Math.ceil(cur + (nat - box.clientWidth) + 2));
    });
  }
  const screen = Math.max(WRAP_CAP, innerWidth / z);
  if (want > cur + 1 && cur < screen - 1) {
    root.style.setProperty("--wrapmax", Math.round(Math.min(want, screen)) + "px"); document.body.classList.add("widepage");
    if (pass < 4) return requestAnimationFrame(() => fitLayout(pass + 1));
  }
  if (!data) return;
  main.querySelectorAll(".adwrap, .tscroll").forEach(box => {
    const t = box.querySelector("table"); if (!t || t.rows.length < 25) return;
    const top = box.getBoundingClientRect().top / z + scrollY / z;
    const h = Math.max(380, Math.floor(innerHeight / z - top - 16));
    if (box.classList.contains("adwrap")) box.style.height = h + "px"; else box.style.maxHeight = h + "px";
  });
}
let fitTimer = null;
const fitSoon = ms => { clearTimeout(fitTimer); fitTimer = setTimeout(fitLayout, ms); };
addEventListener("resize", () => fitSoon(150));
// tables are sometimes drawn a moment after the page: re-measure whenever the page's content changes
try { new MutationObserver(muts => { if (muts.some(m => m.type === "childList" && (m.target.id === "main" || (m.target.closest && m.target.closest(".tscroll, .adwrap, .tsec, .panel")) || m.addedNodes.length > 2))) fitSoon(60); }).observe(document.getElementById("main") || document.body, { childList: true, subtree: true }); } catch (e) { }
function applyScale() { requestAnimationFrame(() => fitLayout()); const v = +(S.uiScale || 100); try { document.body.style.zoom = v === 100 ? "" : v / 100; } catch (e) { } const sel = document.getElementById("uiScale"); if (sel) sel.value = String(v); }
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "uiScale") { S.uiScale = +t.value; savePrefs(); applyScale(); return; }
  if (t.id === "myClubIn" && SAVE) { const v = t.value.trim(); if (v && saveClubChoices().includes(v)) setMyClub(v).then(() => render()); return; }
  if (t.id === "roleSel") { const a = activeDs(); a.role = t.value; S.pRole = null; saveDatasets(); render(); }
  else if (t.id === "drawerRole") { setPanelRole(t.value); }
  else if (t.id === "sqRole") { S.squadRole = { ...S.squadRole, [S.spos]: t.value }; S.sel = null; S.pRole = null; render(); }
  else if (t.id === "formation") { S.formation = t.value; S.squadRole = {}; render(); }
  else if (t.id === "pickBy") { S.pickBy = t.value; render(); }
  else if (t.id === "tStyle" || t.id === "tBack" || t.id === "tForm" || t.id === "tOop") { S[t.id] = t.value; if (t.id === "tBack") S.tForm = "best"; if (t.id !== "tOop") S.tOop = "best"; const y = window.scrollY; render(); window.scrollTo(0, y); }
  else if (t.classList.contains("slotpos") || t.classList.contains("slotrole")) {
    const slots = currentSlots().map(x => ({ ...x })), sl = slots[+t.dataset.i];
    if (t.classList.contains("slotpos")) { const old = CODE_GROUP[sl.code]; sl.code = t.value; if (CODE_X[t.value] == null && CODE_X[old] != null) sl.x = 50; const roles = codeRoles(sl.code); if (!roles.includes(sl.role)) sl.role = roles[0]; }
    else sl.role = t.value;
    S.squadRole = { ...S.squadRole }; delete S.squadRole[CODE_GROUP[sl.code]];
    setSlots(slots); render();
  }
  else if (t.id === "maxAge") { S.maxAge = +t.value; render(); }
  else if (t.id === "sPanelRole") { setStaffPanelRole(t.value); }
  else if (t.id === "sRoleSel") { S.sRole = { ...(S.sRole || {}), [S.stab]: t.value }; S.sSel = null; render(); }
  else if (t.id === "sWho") { S.sWho = t.value; render(); }
  else if (t.id === "sAge") { S.sAge = +t.value; render(); }
  else if (t.id === "sJob") { S.sJob = t.value; render(); }
  else if (t.id === "sNotMine") { S.sNotMine = t.checked; render(); }
  else if (t.id === "sWords") { S.sWords = t.checked; const y = window.scrollY; render(); window.scrollTo(0, y); }
  else if (t.dataset.band != null) {
    const b = staffBands().map(x => [...x]), k = +t.dataset.band;
    if (b[k]) { if (t.dataset.bf === "0") { const v = Math.round(+t.value); if (v >= 1 && v <= 20) b[k][0] = v; } else if (t.value.trim()) b[k][1] = t.value.trim(); }
    S.sBands = b; S.sBandsOpen = true; const y = window.scrollY; render(); window.scrollTo(0, y);
  }
  else if (t.id === "league") { S.league = t.checked; render(); }
  else if (t.id === "faOnly") { S.faOnly = t.checked; render(); }
  else if (t.id === "sx") { S.sx = t.value; render(); }
  else if (t.id === "sy") { S.sy = t.value; render(); }
  else if (t.id === "cmpSel") { S.cmp = t.value === "" ? null : +t.value; const dr = $("#drawer"), top = dr.scrollTop; inAdCtx(() => openPlayer(panelScore(), S.sel, true)); dr.scrollTop = top; }
  else if (t.id === "minMins") { S.minMins = +t.value; render(); }
  else if (t.id === "adSeason") { S.adSeason = t.value; hideAdTip(); render(); }
  else if (t.id === "cloudAuto") { S.cloudAuto = t.checked; savePrefs(); }
  else if (t.id === "saveKind" || t.id === "saveKind2") { S.saveKind = t.value; if (SAVE) { installSave(false); clearCaches(); saveDatasets(); } render(); }
  else if (t.id === "saveWho") { S.saveWho = t.value; if (SAVE) { installSave(false); clearCaches(); saveDatasets(); } render(); }
});
document.addEventListener("input", e => {
  const t = e.target;
  if (t.id === "minMins") { const v = $("#mmv"); if (v) v.textContent = t.value; }
  if (t.id === "sQ") { S.sQ = t.value; clearTimeout(window._sqt); window._sqt = setTimeout(() => { render(); const q = $("#sQ"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
  if (t.id === "q") { S.q = t.value; clearTimeout(window._qt); window._qt = setTimeout(() => { render(); const q = $("#q"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 250); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#drawer").hidden) closeDrawer(); });
$("#scrim").addEventListener("click", () => closeDrawer());
// tooltip
const tip = $("#tip");
document.addEventListener("pointermove", e => {
  const t = e.target.closest && e.target.closest("[data-tip]");
  if (!t) { tip.hidden = true; return; }
  tip.textContent = t.dataset.tip; tip.hidden = false;
  const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8), y = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 8);
  tip.style.left = x + "px"; tip.style.top = y + "px";
});
document.addEventListener("pointerleave", () => { tip.hidden = true; });

// ---------- boot ----------
(async function boot() {
  loadPrefs(); applyScale();
  const ok = await DB.open();
  let stored = ok ? await DB.get("datasets") : undefined;
  const cleared = ok ? await DB.get("cleared") : false;
  if (Array.isArray(stored) && (stored.length || cleared)) S.ds = stored;
  else { S.ds = exampleDatasets(); if (ok) await saveDatasets(); else S.saved = false; }
  if (!ok) S.saved = false;
  // roles that moved position between versions (FM27: box-to-box roles are DM roles) fall back to Balanced
  S.ds.forEach(d => { if (d.role === "Wide Playmaker") d.role = "Playmaking Winger"; if (ROLES[d.pos] && !ROLES[d.pos][d.role]) d.role = "Balanced"; });
  Object.keys(S.squadRole || {}).forEach(k => { if (!ROLES[k] || !ROLES[k][S.squadRole[k]]) delete S.squadRole[k]; });
  if (ok) {
    CLUB_LEAGUES = (await DB.get("clubleagues")) || {};
    let learned = 0; S.ds.forEach(d => { learned += learnLeagues(d); }); if (learned) saveClubLeagues();
    let sv = await DB.get("save");
    if (sv && sv.packed && sv.blob) { try { sv = (await unpackSave(await sv.blob.arrayBuffer())).save; } catch (e) { sv = null; S.saveErr = "Your stored save couldn't be opened: load it once more."; } }
    if (sv && sv.v === 2 && sv.n) { SAVE = sv; if (!sv.statsV) S.saveErr = "Load your save once more: Scout Lab now keeps youth and B team games (U23/U21/U19/U18, II) out of league stats, and this stored copy was read before that."; installSave(false); snapList().then(l => { if (!l.some(x => x.gameDate === SAVE.meta.gameDate)) snapTake().catch(() => { }); }); tsnapList().then(l => { if (!l.some(x => x.gameDate === SAVE.meta.gameDate)) tsnapTake().catch(() => { }); }); }
    else if (sv) { await DB.set("save", null); S.saveErr = "Scout Lab's save format changed: load your save once more."; }
  }
  if (S.saveRoles) Object.keys(S.saveRoles).forEach(id => { const d = S.ds.find(x => x.id === id); if (d && ROLES[d.pos] && ROLES[d.pos][S.saveRoles[id]]) d.role = S.saveRoles[id]; });
  render();
  cloudInit();
  if (typeof sdInit === "function") sdInit();
})();

