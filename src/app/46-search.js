// ---------- Search box in the top bar: any player or club in the loaded save, from any tab ----------
// A player opens his side panel; a club opens the Next opponent report on that team. "/" jumps to the box.
const GS = { list: [], at: 0 };
const gsNorm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function gsIndex() { // lower-case, accent-free names, built once per save
  if (SAVE._gs) return SAVE._gs;
  const names = new Array(SAVE.n); for (let i = 0; i < SAVE.n; i++) names[i] = gsNorm(SAVE.name[i]);
  const clubs = [], TM = SAVE.teams, seen = new Set();   // clubs the save has team numbers for (so a report exists)
  if (TM) for (let k = 0; k < TM.n; k++) { const c = TM.club[k]; if (c < 0 || seen.has(c)) continue; seen.add(c); clubs.push({ t: TM.team[k], c, full: gsNorm(SAVE.clubs[c]), short: gsNorm(SAVE.clubShort && SAVE.clubShort[c]), rep: 0 }); }
  const byClub = new Map(clubs.map(x => [x.c, x]));   // a club's weight in the results = its best-known player
  if (SAVE.rep) for (let i = 0; i < SAVE.n; i++) { const x = byClub.get(SAVE.clubIdx[i]); if (x && SAVE.rep[i * 3 + 2] > x.rep) x.rep = SAVE.rep[i * 3 + 2]; }
  return (SAVE._gs = { names, clubs });
}
const gsRank = (name, q) => name.startsWith(q) ? 0 : name.includes(" " + q) ? 1 : name.includes(q) ? 2 : -1;
function gsFind(raw) {
  const q = gsNorm(raw).trim(); if (q.length < 2 || !SAVE) return [];
  const ix = gsIndex(), pl = [], cl = [];
  for (let i = 0; i < SAVE.n; i++) { const r = gsRank(ix.names[i], q); if (r >= 0) pl.push([r, -(SAVE.rep ? SAVE.rep[i * 3 + 2] : 0), i]); }
  pl.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  ix.clubs.forEach(x => { const r = Math.min(...[gsRank(x.full, q), gsRank(x.short, q)].filter(v => v >= 0), 9); if (r < 9) cl.push([r, x]); });
  cl.sort((a, b) => (a[0] > 1) - (b[0] > 1) || b[1].rep - a[1].rep || a[1].full.localeCompare(b[1].full));
  const pc = savePos();
  return cl.slice(0, 3).map(([, x]) => ({ kind: "club", t: x.t, name: SAVE.clubs[x.c], sub: "Club · opponent report" }))
    .concat(pl.slice(0, 8).map(([, , i]) => ({ kind: "player", i, name: SAVE.name[i], sub: [pc.str[i], SAVE.age[i] >= 0 ? SAVE.age[i] + " yrs" : "", SAVE.clubIdx[i] >= 0 ? (SAVE.clubShort && SAVE.clubShort[SAVE.clubIdx[i]]) || SAVE.clubs[SAVE.clubIdx[i]] : "No club"].filter(Boolean).join(" · ") })));
}
function gsDraw() {
  const box = document.getElementById("gResults"), inp = document.getElementById("gSearch"); if (!box || !inp) return;
  const q = inp.value;
  if (!SAVE) { box.hidden = !q; box.innerHTML = `<p class="small muted gsnone">Load your save to search its players and clubs.</p>`; return; }
  if (gsNorm(q).trim().length < 2) { box.hidden = true; GS.list = []; return; }
  GS.list = gsFind(q); GS.at = Math.min(GS.at, Math.max(0, GS.list.length - 1));
  box.hidden = false;
  box.innerHTML = GS.list.length ? GS.list.map((x, k) => `<button class="gsrow" data-gs="${k}" aria-selected="${k === GS.at}"><b>${esc(x.name)}</b><span class="small muted">${esc(x.sub)}</span></button>`).join("") : `<p class="small muted gsnone">Nobody found for "${esc(q)}".</p>`;
}
function gsClose(clear) { const box = document.getElementById("gResults"), inp = document.getElementById("gSearch"); if (box) box.hidden = true; if (clear && inp) { inp.value = ""; inp.blur(); } GS.list = []; GS.at = 0; }
function gsGo(k) {
  const x = GS.list[k]; if (!x) return; gsClose(true);
  if (x.kind === "player") { adOpen(x.i); return; }
  hubF().mxOpp = String(x.t); S.guide = false; S.dataPage = false; S.mode = "matches"; S.mxTab = "opp"; S.sel = null; S.adCtx = null; render(); window.scrollTo(0, 0);
}
document.addEventListener("input", e => { if (e.target.id === "gSearch") { GS.at = 0; gsDraw(); } });
document.addEventListener("focusin", e => { if (e.target.id === "gSearch" && e.target.value) gsDraw(); });
document.addEventListener("click", e => {
  const r = e.target.closest("[data-gs]"); if (r) { gsGo(+r.dataset.gs); return; }
  if (!e.target.closest(".gsearch")) gsClose(false);
  const h = document.querySelector(".helpmenu[open]"); if (h && (!e.target.closest(".helpmenu") || e.target.closest(".helppop button"))) h.open = false;   // the Help menu closes after a choice or a click elsewhere
});
document.addEventListener("keydown", e => {
  const inp = document.getElementById("gSearch"); if (!inp) return;
  if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "") && !(document.activeElement || {}).isContentEditable) { e.preventDefault(); inp.focus(); inp.select(); return; }
  if (document.activeElement !== inp) return;
  if (e.key === "Escape") { gsClose(true); }
  else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!GS.list.length) return; GS.at = (GS.at + (e.key === "ArrowDown" ? 1 : -1) + GS.list.length) % GS.list.length; gsDraw(); }
  else if (e.key === "Enter") { e.preventDefault(); gsGo(GS.at); }
});
// narrow screens: the two groups of pages become two menus
document.addEventListener("change", e => { const t = e.target; if (!t.classList || !t.classList.contains("navsel") || !t.value) return; const b = document.querySelector(`.modes button[data-mode="${t.value}"]`); if (b) b.click(); });
function gsSyncNav() { document.querySelectorAll(".navsel").forEach(s => { const on = !S.guide && !S.dataPage && [...s.options].some(o => o.value === S.mode); s.value = on ? S.mode : ""; s.classList.toggle("on", on); }); }
