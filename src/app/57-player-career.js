// ---------- Player career page: how he's doing now, season by season, all-time, and ability over time ----------
// Opened from "Season by season" in the player panel (or a #career=<id> link). Uses FM's archived seasons (28-past-seasons),
// the position benchmarks of All data (26-all-data) and Scout Lab's save snapshots (35-development-planner).
const CAR_MIN = 300; // minutes before a season's per-90 numbers count
// key stats by position: [label, how to read it, decimals, benchmark key, lower is better]
const CAR_P90 = (a, f) => { const m = BASIC_FIELDS.has(f) ? a.v.minutes : a.dm; const v = a.v[f]; return m > 0 && v != null ? v * 90 / m : NaN; };
const CAR_PCT = (a, x, y) => a.v[y] > 0 && a.v[x] != null ? a.v[x] / a.v[y] * 100 : NaN;
const CAR_M = {
  rat: ["Average rating", a => a.v.average_rating, 2, "avr"], gls: ["Goals per 90", a => CAR_P90(a, "goals"), 2, "goals"], ast: ["Assists per 90", a => CAR_P90(a, "assists"), 2, "assists"],
  ga: ["Goals + assists per 90", a => { const g = CAR_P90(a, "goals"), s = CAR_P90(a, "assists"); return g === g && s === s ? g + s : NaN; }, 2],
  xg: ["xG per 90", a => CAR_P90(a, "expected_goals"), 2, "xg"], xa: ["xA per 90", a => CAR_P90(a, "expected_assists"), 2, "xa"], kp: ["Key passes per 90", a => CAR_P90(a, "key_passes"), 2, "kp"],
  prg: ["Progressive passes per 90", a => CAR_P90(a, "progressive_passes"), 2, "prpas"], drb: ["Dribbles per 90", a => CAR_P90(a, "dribbles"), 2, "drb"],
  tck: ["Tackles won per 90", a => CAR_P90(a, "tackles_completed"), 2, "tckc"], int: ["Interceptions per 90", a => CAR_P90(a, "interceptions"), 2, "itc"],
  hdr: ["Headers won %", a => CAR_PCT(a, "headers_won", "aerial_challenges_attempted"), 0, "hdrPct"], pas: ["Pass completion %", a => CAR_PCT(a, "passes_completed", "passes_attempted"), 0, "pasPct"],
  sot: ["Shots on target per 90", a => CAR_P90(a, "shots_on_target"), 2, "sot"],
  xgp: ["xG prevented per 90", a => CAR_P90(a, "expected_goals_prevented"), 2, "xgp"], conc: ["Conceded per 90", a => CAR_P90(a, "goals_allowed"), 2, "conc", 1],
  sv: ["Save %", a => { const s = (a.v.saves_held || 0) + (a.v.saves_parried || 0) + (a.v.saves_tipped || 0); return a.v.shots_on_target_faced > 0 ? s / a.v.shots_on_target_faced * 100 : NaN; }, 0, "svPct"],
  mins: ["Minutes", a => a.v.minutes, 0],
};
const CAR_SET = { GK: ["rat", "xgp", "sv", "conc", "pas"], CB: ["rat", "tck", "int", "hdr", "pas", "prg"], FB: ["rat", "tck", "int", "kp", "xa", "drb"], DM: ["rat", "tck", "int", "prg", "pas", "kp"],
  CM: ["rat", "prg", "kp", "xa", "tck", "pas"], AM: ["rat", "ga", "xg", "xa", "kp", "drb"], W: ["rat", "ga", "xg", "xa", "kp", "drb"], ST: ["rat", "gls", "xg", "sot", "xa", "ga"] };
const CAR_CHART = { GK: ["rat", "xgp", "sv", "mins"], CB: ["rat", "tck", "int", "mins"], FB: ["rat", "tck", "xa", "mins"], DM: ["rat", "tck", "prg", "mins"], CM: ["rat", "prg", "kp", "mins"],
  AM: ["rat", "ga", "xg", "mins"], W: ["rat", "ga", "xg", "mins"], ST: ["rat", "gls", "xg", "mins"] };
const carMins = a => a.y === "all" || !a.v.minutes ? a.v.minutes || 0 : a.v.minutes;
const carOk = (a, k) => k === "mins" || k === "rat" ? true : (BASIC_FIELDS.has({ gls: "goals", ast: "assists", ga: "goals" }[k] || "-") ? a.v.minutes >= CAR_MIN : a.dm >= CAR_MIN);
const carVal = (a, k) => { const v = CAR_M[k][1](a); return v === v && carOk(a, k) ? v : NaN; };
const carFmt = (k, v) => v !== v ? "–" : CAR_M[k][2] ? v.toFixed(CAR_M[k][2]) : Math.round(v).toLocaleString() + (/%/.test(CAR_M[k][0]) ? "%" : "");
const carLevel = (k, v, g) => { const key = CAR_M[k][3], t = key && benchFor(key, g); if (!t || v !== v) return null; const s = adScore(v, t); return [s, s >= 0.8 ? "elite" : s >= 0.6 ? "good" : s >= 0.4 ? "average" : "below average"]; };
function careerOpen(uid) {
  if (!SAVE) return; const i = saveUidIndex().get(String(uid).startsWith("s") ? String(uid) : "s" + uid); if (i == null) return;
  closeDrawer(true); if (S.mode !== "career") S.careerFrom = S.mode;
  S.mode = "career"; S.careerUid = "s" + SAVE.uid[i]; S.guide = false; S.dataPage = false;
  try { history.pushState(null, "", "#career=" + SAVE.uid[i]); } catch (e) { }
  render(); window.scrollTo(0, 0);
}
function careerClose() { S.mode = S.careerFrom && S.careerFrom !== "career" ? S.careerFrom : "home"; S.careerUid = null; try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { } render(); }
// apps, minutes, goals, assists, rating for each club he played for (archived seasons + this season)
function careerClubs(i, kind) {
  const H = SAVE.hist, by = new Map(), cur = SAVE.stats[kind], fields = Object.keys((cur || SAVE.stats.league).cols);
  const acc = c => { let a = by.get(c); if (!a) { a = { c, apps: 0, mins: 0, gls: 0, ast: 0, rw: 0, rn: 0, from: 1e9, to: 0 }; by.set(c, a); } return a; };
  const add = (c, get, y) => { const a = acc(c), n = x => { const v = get(x); return v === v ? v : 0; }; a.apps += n("starts") + n("substitute_appearances"); a.mins += n("minutes"); a.gls += n("goals"); a.ast += n("assists");
    const ar = get("average_rating"), ra = n("rated_appearances"); if (ar === ar && ra > 0) { a.rw += ar * ra; a.rn += ra; } a.from = Math.min(a.from, y); a.to = Math.max(a.to, y); };
  if (hasHistory()) { const hp = histByPlayer(), okKind = kindRows(kind), scratch = {}; fields.forEach(f => { scratch[f] = new Float64Array(1); });
    for (let q = hp.start[i]; q < hp.start[i + 1]; q++) { const r = hp.rows[q]; if (!okKind(H.kind[r], r)) continue; fields.forEach(f => { scratch[f][0] = NaN; }); FR.historyLine(SAVE, r, scratch, 0); add(H.club[r], f => scratch[f][0], H.year[r]); } }
  if (cur && cur.row[i] >= 0) { const r = cur.row[i]; add(SAVE.clubIdx[i], f => cur.cols[f] ? cur.cols[f][r] : NaN, curSeasonStart()); }
  return [...by.values()].filter(a => a.apps || a.mins).sort((a, b) => b.to - a.to || b.mins - a.mins);
}
// CA, PA and value at every save of his you loaded in Scout Lab
function careerAbility(i) {
  if (typeof SNAPS === "undefined") return [];
  if (!SNAPS) { if (typeof snapList === "function") snapList().then(() => { if (S.mode === "career") render(); }); return []; }
  const u = SAVE.uid[i], seen = new Set(), out = [];
  [...SNAPS].sort((a, b) => a.gameDate < b.gameDate ? -1 : 1).forEach(s => { if (seen.has(s.gameDate)) return; let k = -1; for (let j = 0; j < s.uid.length; j++) if (s.uid[j] === u) { k = j; break; } if (k < 0 || !(s.ca[k] > 0)) return; seen.add(s.gameDate); out.push({ d: s.gameDate, ca: s.ca[k], pa: s.pa[k], val: s.val[k] }); });
  if (!seen.has(SAVE.meta.gameDate) && SAVE.ca[i] > 0) out.push({ d: SAVE.meta.gameDate, ca: SAVE.ca[i], pa: SAVE.pa[i], val: SAVE.value[i] });
  return out;
}
// a small line chart: points [{x label, v}] oldest first; gaps where v is NaN
function carSpark(title, pts, fmt, opt = {}) {
  const W = 300, Hh = 110, L = 34, R = 10, T = 14, B = 26, ok = pts.filter(p => p.v === p.v);
  if (ok.length < 2) return `<div class="carchart"><div class="small muted">${esc(title)}</div><p class="small muted">Not enough seasons yet.</p></div>`;
  let lo = Math.min(...ok.map(p => p.v)), hi = Math.max(...ok.map(p => p.v)); if (opt.min != null) lo = Math.min(lo, opt.min); if (hi === lo) { hi += 1; lo -= 1; }
  const x = k => L + (pts.length === 1 ? 0 : k * (W - L - R) / (pts.length - 1)), y = v => T + (1 - (v - lo) / (hi - lo)) * (Hh - T - B);
  let d = "", pen = false; pts.forEach((p, k) => { if (p.v !== p.v) { pen = false; return; } d += (pen ? "L" : "M") + x(k).toFixed(1) + " " + y(p.v).toFixed(1); pen = true; });
  const last = ok[ok.length - 1], first = ok[0], up = opt.inv ? last.v < first.v : last.v > first.v;
  return `<div class="carchart"><div class="small"><b>${esc(title)}</b> <span class="muted">${esc(fmt(first.v))} → <b class="${last.v === first.v ? "" : up ? "okc" : "bad"}">${esc(fmt(last.v))}</b></span></div>
    <svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(title)} by season"><line x1="${L}" x2="${W - R}" y1="${Hh - B}" y2="${Hh - B}" stroke="var(--line)"/>
    <text x="${L - 4}" y="${y(hi) + 4}" text-anchor="end" class="cax">${esc(fmt(hi))}</text><text x="${L - 4}" y="${y(lo) + 4}" text-anchor="end" class="cax">${esc(fmt(lo))}</text>
    <path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2"/>${pts.map((p, k) => p.v === p.v ? `<circle cx="${x(k)}" cy="${y(p.v)}" r="3" fill="var(--accent)"><title>${esc(p.x)}: ${esc(fmt(p.v))}</title></circle>` : "").join("")}
    ${pts.map((p, k) => (k === 0 || k === pts.length - 1 || pts.length <= 6) ? `<text x="${x(k)}" y="${Hh - 8}" text-anchor="${k === 0 ? "start" : k === pts.length - 1 ? "end" : "middle"}" class="cax">${esc(p.x)}</text>` : "").join("")}</svg></div>`;
}
function careerHtml() {
  const i = S.careerUid ? saveUidIndex().get(S.careerUid) : null, back = `<button class="ghost" data-act="careerback">← Back</button>`;
  if (!SAVE || i == null) return `<section class="panel">${back}<p class="muted">This player isn't in the save you have loaded.</p></section>`;
  const kind = saveKind(), g = savePos().bench[i], set = CAR_SET[g] || CAR_SET.CM, list = kind ? playerSeasons(i, kind) : [];
  const cur = list.find(a => a.y === "cur"), all = list.find(a => a.y === "all"), cs = curSeasonStart();
  const past = list.filter(a => typeof a.y === "number" && a.y < cs).sort((a, b) => a.y - b.y), last = [...past].reverse().find(a => a.v.minutes > 0);
  const club = SAVE.clubIdx[i] >= 0 ? SAVE.clubs[SAVE.clubIdx[i]] : "No club";
  let h = `<section class="homehead carhead"><div>${back}<h2>${esc(SAVE.name[i])}</h2><p class="muted">${SAVE.age[i]} · ${esc(savePos().str[i])} · ${esc(club)}${saveNat(i) ? " · " + esc(saveNat(i)) : ""} · ${esc(saveMoney(SAVE.value[i]))}${SAVE.ca[i] > 0 ? ` · CA ${SAVE.ca[i]}${SAVE.pa[i] > 0 ? " / PA " + SAVE.pa[i] : ""}` : ""}</p>
    <p><button class="linkbtn" data-sci="${i}">Open his player panel</button></p></div></section>`;
  if (!list.length) return h + `<section class="panel"><p class="muted">The save holds no ${esc(kind ? SAVE_KINDS[kind].toLowerCase() : "")} stats for him yet.</p></section>`;
  // 1 the answer first
  const rows = set.map(k => { const now = cur ? carVal(cur, k) : NaN, was = last ? carVal(last, k) : NaN, car = all ? carVal(all, k) : NaN, inv = !!CAR_M[k][4];
    const d = now === now && was === was ? now - was : NaN, better = d === d && Math.abs(d) > (CAR_M[k][2] ? 0.005 : 0.5) ? (inv ? d < 0 : d > 0) : null; return { k, now, was, car, d, better, inv }; });
  const up = rows.filter(r => r.better === true).length, down = rows.filter(r => r.better === false).length, curMins = cur ? cur.v.minutes || 0 : 0;
  const rr = rows.find(r => r.k === "rat"), ratTxt = rr && rr.now === rr.now && rr.was === rr.was ? `rating ${rr.was.toFixed(2)} → ${rr.now.toFixed(2)}` : "";
  const verdict = !cur || curMins < CAR_MIN ? `<b>Too early to judge this season</b> (${Math.round(curMins)} minutes so far).${last ? ` Last season (${esc(last.label)}): ${last.v.minutes ? Math.round(last.v.minutes).toLocaleString() + " minutes" : "no minutes"}${last.v.average_rating === last.v.average_rating ? `, rating ${last.v.average_rating.toFixed(2)}` : ""}.` : ""}`
    : !last ? `<b>First season in the save:</b> no earlier season to compare with yet.`
    : `<b>${up >= down + 2 ? "Improving" : down >= up + 2 ? "Declining" : "Steady"}</b>: ${ratTxt ? ratTxt + "; " : ""}${up} of ${rows.filter(r => r.better !== null || (r.now === r.now && r.was === r.was)).length} key stats are up on last season${down ? `, ${down} down` : ""}.`;
  h += `<p class="readbox verdict">${verdict}</p>`;
  // 2 how he's doing now
  h += `<section class="panel"><div class="ph"><h3>How he's doing now</h3><span class="small muted">this season against last season and his career, for a ${esc(scGroupName ? scGroupName(g).replace(/s$/, "") : g)}</span></div>
    <div class="tscroll"><table class="gtable"><thead><tr><th>Stat</th><th class="num">This season</th><th class="num">Last season</th><th class="num">Change</th><th class="num">Career</th><th>This season for his position</th></tr></thead><tbody>
    ${rows.map(r => { const lv = carLevel(r.k, r.now, g); return `<tr><td>${esc(CAR_M[r.k][0])}</td><td class="num"><b>${carFmt(r.k, r.now)}</b></td><td class="num">${carFmt(r.k, r.was)}</td>
      <td class="num">${r.d === r.d ? `<span class="${r.better === true ? "okc" : r.better === false ? "bad" : "muted"}">${r.better === true ? "▲" : r.better === false ? "▼" : "="} ${r.d > 0 ? "+" : ""}${CAR_M[r.k][2] ? r.d.toFixed(CAR_M[r.k][2]) : Math.round(r.d)}</span>` : "–"}</td>
      <td class="num">${carFmt(r.k, r.car)}</td><td>${lv ? `<span class="tag" style="background:${adColor(lv[0])};color:#111">${esc(lv[1])}</span>` : `<span class="muted small">${r.now === r.now ? "–" : `needs ${CAR_MIN}+ minutes`}</span>`}</td></tr>`; }).join("")}
    </tbody></table></div><p class="small muted">Per-90 numbers count once a season has ${CAR_MIN}+ minutes. "Last season" is ${last ? esc(last.label) : "–"}; "career" is every season in the save together.</p></section>`;
  // 3 season by season
  const trend = past.concat(cur ? [cur] : []), ck = CAR_CHART[g] || CAR_CHART.CM;
  h += `<section class="panel"><div class="ph"><h3>Season by season</h3><span class="small muted">oldest to newest; this season so far at the right</span></div>
    <div class="carcharts">${ck.map(k => carSpark(k === "mins" ? "Minutes (finished seasons)" : CAR_M[k][0], (k === "mins" ? past : trend).map(a => ({ x: a.y === "cur" ? yy(cs) + "/" + yy(cs + 1) + " now" : yy(a.y) + "/" + yy(a.y + 1), v: a.y === "cur" && curMins < CAR_MIN ? NaN : carVal(a, k) })), v => carFmt(k, v), { inv: !!CAR_M[k][4] })).join("")}</div>
    ${seasonsHtml({ uid: S.careerUid })}</section>`;
  // 4 all-time
  const clubs = kind ? careerClubs(i, kind) : [], tot = all || cur || list[0], best = set.filter(k => k !== "mins").map(k => { const c = past.concat(cur && curMins >= CAR_MIN ? [cur] : []).filter(a => carVal(a, k) === carVal(a, k)); if (!c.length) return null;
    const b = c.sort((a, b) => CAR_M[k][4] ? carVal(a, k) - carVal(b, k) : carVal(b, k) - carVal(a, k))[0]; return [k, b]; }).filter(Boolean);
  const apps = a => (a.v.starts || 0) + (a.v.substitute_appearances || 0);
  h += `<section class="panel"><div class="ph"><h3>All-time</h3><span class="small muted">every season the save holds for him${all ? ` (${all.n} seasons)` : ""}</span></div>
    <section class="tiles">${[["Appearances", apps(tot).toLocaleString()], ["Minutes", Math.round(tot.v.minutes || 0).toLocaleString()], ["Goals", (tot.v.goals || 0).toLocaleString()], ["Assists", (tot.v.assists || 0).toLocaleString()],
      ["Average rating", tot.v.average_rating === tot.v.average_rating ? tot.v.average_rating.toFixed(2) : "–"]].map(([l, v]) => `<div class="tile"><span class="tv">${esc(v)}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>
    <div class="cargrid"><div><h4>By club</h4><div class="tscroll"><table class="gtable"><thead><tr><th>Club</th><th>Seasons</th><th class="num">Apps</th><th class="num">Mins</th><th class="num">Gls</th><th class="num">Ast</th><th class="num">Rating</th></tr></thead><tbody>
      ${clubs.map(c => `<tr><td>${esc(c.c >= 0 ? SAVE.clubs[c.c] : "?")}</td><td class="small muted">${c.from === c.to ? seasonShort(c.from) : seasonShort(c.from) + " to " + seasonShort(c.to)}</td><td class="num">${c.apps}</td><td class="num">${Math.round(c.mins).toLocaleString()}</td><td class="num">${c.gls}</td><td class="num">${c.ast}</td><td class="num">${c.rn ? (c.rw / c.rn).toFixed(2) : "–"}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">–</td></tr>`}</tbody></table></div></div>
    <div><h4>His best seasons</h4><ul class="why">${best.map(([k, a]) => `<li>${esc(CAR_M[k][0])}: <b>${carFmt(k, carVal(a, k))}</b> <span class="muted small">in ${esc(a.y === "cur" ? curSeasonLabel() + " (this season)" : a.label)}</span></li>`).join("") || `<li class="muted">Needs a season with ${CAR_MIN}+ minutes.</li>`}</ul></div></div></section>`;
  // 5 ability over time
  const ab = careerAbility(i);
  if (ab.length >= 2) {
    const lab = d => { const t = new Date(d + "T12:00:00Z"); return t.toLocaleDateString("en-GB", { month: "short" }) + " '" + String(t.getUTCFullYear()).slice(-2); };
    h += `<section class="panel"><div class="ph"><h3>Ability over time</h3><span class="small muted">at each save you loaded in Scout Lab</span></div><div class="carcharts">
      ${carSpark("Current ability (CA)", ab.map(p => ({ x: lab(p.d), v: p.ca })), v => String(Math.round(v)))}${carSpark("Potential (PA)", ab.map(p => ({ x: lab(p.d), v: p.pa > 0 ? p.pa : NaN })), v => String(Math.round(v)))}
      ${carSpark("Value", ab.map(p => ({ x: lab(p.d), v: p.val === p.val ? p.val : NaN })), v => saveMoney(v))}</div></section>`;
  }
  return h;
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-career], [data-act='careerback']"); if (!t) return;
  if (t.dataset.career) { e.preventDefault(); careerOpen(t.dataset.career); return; }
  if (history.state === null && /^#career=/.test(location.hash) && history.length > 1) history.back(); else careerClose();
});
