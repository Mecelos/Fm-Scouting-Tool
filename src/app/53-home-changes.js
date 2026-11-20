// ---------- Home > Since your last save: your squad now against the snapshot of your previous save (35-development-planner) ----------
// who improved, who dropped off (ability and attributes), who arrived, who left, and the squad's value
function homeChangesHtml() {
  if (typeof snapList !== "function" || !SAVE || !SAVE.meta || !SAVE.meta.gameDate) return "";
  if (!SNAPS) { snapList().then(() => { if (S.mode === "home") { const y = window.scrollY; render(); window.scrollTo(0, y); } }); return ""; }
  const m = SAVE.meta.managed && SAVE.meta.managed[0], club = m ? m.club : "", cur = SAVE.meta.gameDate;
  const base = SNAPS.filter(x => x.club === club && x.gameDate < cur).pop();
  const head = `<div class="ph"><h3>Since your last save</h3>`;
  if (!base) return "";   // nothing to compare yet: the box appears once a later save is loaded
  const map = new Map(); for (let k = 0; k < base.uid.length; k++) map.set(base.uid[k], k);
  const amap = new Map(); for (let k = 0; k < base.mu.length; k++) amap.set(base.mu[k], k);
  const mine = saveManagedIdx(), nowU = new Set(mine.map(i => SAVE.uid[i])), ux = saveUidIndex();
  const days = Math.round((new Date(cur) - new Date(base.gameDate)) / 864e5);
  const when = new Date(base.gameDate + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  // ability and attribute changes for players in both
  const attrs = i => { const k = amap.get(SAVE.uid[i]); if (k == null) return []; const out = []; ATTR_COLS.forEach(([lab, a]) => { const o = base.ma[k * 52 + a], n = SAVE.attrs[i * 52 + a]; if (o && n && o !== n) out.push([lab, n - o]); }); return out.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])); };
  const ch = mine.filter(i => amap.has(SAVE.uid[i])).map(i => { const k = map.get(SAVE.uid[i]); const dca = k != null && base.ca[k] > 0 && SAVE.ca[i] > 0 ? SAVE.ca[i] - base.ca[k] : 0; const at = attrs(i); return { i, dca, at, sum: at.reduce((s, x) => s + x[1], 0) }; });
  const up = ch.filter(x => x.dca > 0 || (x.dca === 0 && x.sum > 0)).sort((a, b) => b.dca - a.dca || b.sum - a.sum);
  const down = ch.filter(x => x.dca < 0 || (x.dca === 0 && x.sum < 0)).sort((a, b) => a.dca - b.dca || a.sum - b.sum);
  const arrived = mine.filter(i => !amap.has(SAVE.uid[i])).sort((a, b) => (SAVE.ca[b] || 0) - (SAVE.ca[a] || 0));
  const left = [...base.mu].filter(u => !nowU.has(u)).map(u => { const i = ux.get("s" + u); return { u, i, ca: i != null ? SAVE.ca[i] || 0 : 0 }; }).sort((a, b) => b.ca - a.ca);
  let v0 = 0, v1 = 0; mine.forEach(i => { const k = map.get(SAVE.uid[i]); if (k == null) return; const a = base.val[k], b = SAVE.value[i]; if (a === a && b === b) { v0 += a; v1 += b; } });
  const pl = i => `<button class="linkbtn" data-sci="${i}">${esc(SAVE.name[i])}</button>`;
  const atTxt = at => at.slice(0, 3).map(([l, d]) => `${l} ${d > 0 ? "+" : ""}${d}`).join(", ");
  const row = x => `<li>${pl(x.i)} <span class="small"><b class="${x.dca > 0 || (!x.dca && x.sum > 0) ? "okc" : "bad"}">${x.dca ? (x.dca > 0 ? "+" : "") + x.dca + " CA" : (x.sum > 0 ? "+" : "") + x.sum + " attr"}</b>${x.at.length ? ` <span class="muted">${esc(atTxt(x.at))}</span>` : ""}</span></li>`;
  const list = (a, f, none) => a.length ? `<ul>${a.slice(0, 5).map(f).join("")}</ul>${a.length > 5 ? `<p class="small muted">and ${a.length - 5} more</p>` : ""}` : `<p class="small muted">${none}</p>`;
  const dv = v1 - v0, verdict = `${up.length} improved, ${down.length} dropped off, ${arrived.length} arrived, ${left.length} left${v0 ? `; squad value ${dv >= 0 ? "up" : "down"} ${esc(saveMoney(Math.abs(dv)))}` : ""}.`;
  return `<section class="panel">${head}<span class="small muted">compared with your save of ${esc(when)} (${days} day${days === 1 ? "" : "s"} earlier) · <button class="linkbtn" data-sctab="dev">full development page →</button></span></div>
    <p class="readbox">${verdict}</p>
    <div class="homeatt">
      <div><h4>Improved</h4>${list(up, row, "Nobody yet.")}</div>
      <div><h4>Dropped off</h4>${list(down, row, "Nobody: good.")}</div>
      <div><h4>Arrived</h4>${list(arrived, i => `<li>${pl(i)} <span class="small muted">CA ${SAVE.ca[i] || "–"}</span></li>`, "Nobody new.")}</div>
      <div><h4>Left</h4>${list(left, x => x.i != null ? `<li>${pl(x.i)} <span class="small muted">now ${esc(SAVE.clubIdx[x.i] >= 0 ? SAVE.clubs[SAVE.clubIdx[x.i]] : "without a club")}</span></li>` : `<li class="small muted">A player no longer in the save</li>`, "Nobody.")}</div>
    </div><p class="small muted">CA = current ability (hidden in FM). Attribute changes are your players' visible attributes, biggest first.</p></section>`;
}
