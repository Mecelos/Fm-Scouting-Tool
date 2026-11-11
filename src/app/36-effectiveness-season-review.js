// ---------- Tactical effectiveness (Scout Lab's estimate, modelled on FM27's breakdown) for every player in the save ----------
// FM27 builds Tactical Effectiveness from Tactical Understanding, Player Ability, Player Buy-In and Next Match Info.
// FM doesn't publish the formula, so this is an estimate for YOUR loaded tactic, 0-100 each:
//   Player Ability   = 60% fit for his best slot in your tactic (role with + without the ball) + 40% capability (CA against your XI)
//   Understanding    = his tactical attributes (decisions, anticipation, teamwork, positioning, off the ball, vision, concentration),
//                      lowered by your tactic's complexity (how many instructions differ from default)
//   Buy-In           = personality: professionalism, adaptability, temperament, determination
//   Overall          = 45% ability + 30% understanding + 25% buy-in. Next Match Info is about your opposition scouting, not the player.
const TE = { key: null, ov: null, ab: null, und: null, buy: null, slot: null, slots: [], xiCA: 0, cx: 0 };
function teKey() { const W = typeof tacWorking === "function" ? tacWorking() : null; return W && SAVE ? [SAVE.id, W.name, JSON.stringify(S.myTac.edits || {}), (SAVE.meta.managed[0] || {}).uid].join("|") : ""; }
function teComplexity(W) { // 0 = everything default, 1 = every instruction changed
  const changed = TI_DEF.filter(d => W.ti[d[0]] != null && W.ti[d[0]] !== d[4]).length;
  return Math.min(1, changed / TI_DEF.length);
}
function teCompute() {
  const key = teKey(); if (!key) { TE.key = null; TE.ov = null; return false; }
  if (TE.key === key) return true;
  const W = tacWorking(), n = SAVE.n, F = FR.ATTRIBUTE_ORDER, P = FR.PERSONALITY_ORDER, pc = savePos();
  const ai = a => F.indexOf(a), pi = a => P.indexOf(a);
  const TACT = ["decisions", "anticipation", "teamwork", "positioning", "off_the_ball", "vision", "concentration"].map(ai);
  const BUY_P = ["professionalism", "adaptability", "temperament"].map(pi), DET = ai("determination");
  // your XI's level (from the tactic's best XI, else your 11 best by CA)
  const sq = squadDs(), Fit = sq ? tacFit(W, sq) : null, uidIx = saveUidIndex();
  let xi = Fit ? Fit.slots.filter(x => x.pick).map(x => uidIx.get(x.pick.p.uid)).filter(x => x != null) : [];
  if (xi.length < 8) xi = saveManagedIdx().filter(i => SAVE.ca[i] > 0).sort((a, b) => SAVE.ca[b] - SAVE.ca[a]).slice(0, 11);
  const xiCA = xi.length ? xi.reduce((s, i) => s + SAVE.ca[i], 0) / xi.length : 120;
  const cx = teComplexity(W);
  // one fit check per distinct (position, role with, role without)
  const slots = [], seen = new Set();
  W.slots.forEach(sl => { const k = sl.ip.code + "|" + sl.ip.role + "|" + sl.oop.role; if (!seen.has(k)) { seen.add(k); slots.push(sl); } });
  const ov = new Float32Array(n).fill(NaN), ab = new Float32Array(n).fill(NaN), und = new Float32Array(n).fill(NaN), buy = new Float32Array(n).fill(NaN), slot = new Int8Array(n).fill(-1);
  const cl = v => Math.max(0, Math.min(1, v));
  const codeCache = new Map();
  for (let i = 0; i < n; i++) {
    if (!SAVE.name[i] || !(SAVE.ca[i] > 0)) continue;
    const s = pc.str[i]; let codes = codeCache.get(s); if (!codes) { codes = posCodes(s); if (codes.has("DC")) codes.add("WCB"); codeCache.set(s, codes); }
    let best = -1, bk = -1, p = null;
    for (let k = 0; k < slots.length; k++) {
      if (!canPlay(codes, slots[k].ip.code)) continue;
      if (!p) { const a = {}; ATTR_COLS.forEach(([nm, kk]) => { const v = SAVE.attrs[i * 52 + kk]; if (v) a[nm] = v; }); p = { ix: "te" + i, a }; }
      const sl = slots[k], g = CODE_GROUP[sl.ip.code], role = ROLES[g] && ROLES[g][sl.ip.role] ? sl.ip.role : "Balanced";
      const ipv = roleRating(p, g, role, sl.ip.code); if (ipv == null) continue;
      const keys = OOP_KEYS[sl.oop.role] || [], opv = keys.length ? mean(keys.map(x => p.a[x])) : null;
      const fit = 0.7 * ipv + 0.3 * (opv ?? ipv); if (fit > best) { best = fit; bk = k; }
    }
    const cap = cl((SAVE.ca[i] - (xiCA - 45)) / 75); // your XI's average = 0.6, 30 CA above it = 1
    const a = bk < 0 ? 100 * 0.4 * cap * 0.6 : 100 * (0.6 * cl((best - 8) / 10) + 0.4 * cap); // no position in your tactic: capped low
    const tv = TACT.map(k => SAVE.attrs[i * 52 + k]).filter(v => v > 0), t = tv.length ? tv.reduce((x, y) => x + y, 0) / tv.length : NaN;
    const u = t === t ? 100 * cl((t - 6) / 13) * (1 - 0.3 * cx) : NaN;
    const bv = BUY_P.map(k => SAVE.pers[i * 8 + k]).concat([SAVE.attrs[i * 52 + DET]]).filter(v => v > 0), b = bv.length ? 100 * cl((bv.reduce((x, y) => x + y, 0) / bv.length - 5) / 15) : NaN;
    ab[i] = a; und[i] = u; buy[i] = b; slot[i] = bk;
    ov[i] = 0.45 * a + 0.3 * (u === u ? u : 50) + 0.25 * (b === b ? b : 50);
  }
  Object.assign(TE, { key, ov, ab, und, buy, slot, slots, xiCA, cx });
  return true;
}
// FM-style 10-bar gauge
function teGauge(v) {
  if (!(v === v)) return "";
  const n = Math.max(1, Math.min(10, Math.round(v / 10))), col = v >= 70 ? "var(--good)" : v >= 55 ? "#d6c13a" : v >= 40 ? "var(--accent)" : "var(--bad)";
  let h = `<span class="tegauge" title="${Math.round(v)}/100">`;
  for (let k = 1; k <= 10; k++) h += `<i${k <= n ? ` style="background:${col}"` : ""}></i>`;
  return h + `</span><b class="tev">${Math.round(v)}</b>`;
}
function teColumns(add) {
  if (!teCompute()) return;
  const T = TE;
  add("te_all", "Effectiveness", "te", "num", i => T.ov[i], { d: 0, bench: "te", w: 108, fmt: v => teGauge(v), rfmt: v => Math.round(v), dk: "te_all" });
  add("te_ab", "Ability", "te", "num", i => T.ab[i], { d: 0, bench: "te", w: 58, dk: "te_ab" });
  add("te_und", "Understand", "te", "num", i => T.und[i], { d: 0, bench: "te", w: 66, dk: "te_und" });
  add("te_buy", "Buy-in", "te", "num", i => T.buy[i], { d: 0, bench: "te", w: 58, dk: "te_buy" });
  add("te_slot", "Best slot", "te", "str", i => { const k = T.slot[i]; if (k < 0) return ""; const sl = T.slots[k]; return (CODE_LABEL[sl.ip.code] || sl.ip.code) + " " + tacAbbr(sl.ip.role); }, { w: 96, dk: "te_slot" });
}

// ---------- My squad › Season review: each player graded per category for his position, position priorities, upgrades ----------
// Uses the same scoring as the position tabs (squadEval): his stats ranked against every player in that position's pool
// (league-adjusted when that's on), plus his attributes for his role. Percentiles, 0-100.
const RV_BANDS = [[98, "Elite", "rv-el"], [88, "Very good", "rv-gd"], [65, "Good", "rv-gd"], [40, "Average", "rv-av"], [20, "Below par", "rv-bp"], [0, "Poor", "rv-po"]];
const rvBand = v => RV_BANDS.find(b => v >= b[0]);
const RV_POS = { GK: "goalkeeper", FB: "full-back", CB: "centre-back", DM: "defensive midfielder", CM: "central midfielder", AM: "attacking midfielder", Wingers: "winger", ST: "striker" };
// enough minutes to judge: a quarter of your busiest player's minutes this season (at least 90, at most 60% of the Stats minimum)
function rvMinMins() {
  const sq = squadDs(); let mx = 0;
  if (sq) squadModelPlayers(sq).forEach(p => { if ((p.mins || 0) > mx) mx = p.mins; });
  return Math.max(90, Math.min(Math.round((S.minMins || 500) * 0.6), Math.round(mx * 0.25 / 10) * 10));
}
function rvCatsOf(e) { return e && e.st ? POS_CATS[e.pos].filter(c => e.st.rows.some(r => r.cs && r.cs[c] != null)) : []; }
function rvSummary(r, e, cats) {
  const cs = r.sr.cs, have = cats.filter(c => cs[c] != null).sort((a, b) => cs[b] - cs[a]);
  const strong = have.filter(c => cs[c] >= 70).slice(0, 2), weak = have.filter(c => cs[c] < 35).reverse().slice(0, 2);
  const L = c => CATS[c].l.toLowerCase(), ov = r.sr.orank;
  let s = ov >= 85 ? `One of the best ${RV_POS[e.pos]}s` : (ov >= 70 ? "A good " : ov >= 45 ? "An average " : ov >= 25 ? "A below-par " : "A poor ") + RV_POS[e.pos];
  s += " this season by the numbers";
  if (strong.length) s += `; strong in ${strong.map(L).join(" and ")}`;
  if (weak.length) s += `${strong.length ? ", but" : ";"} weak in ${weak.map(L).join(" and ")}`;
  return s + ".";
}
// past seasons from the save's history: minutes, rating, goals, assists per season
function rvHistory(p) {
  if (!SAVE || !p.uid || typeof hasHistory !== "function" || !hasHistory()) return "";
  const i = saveUidIndex().get(p.uid); if (i == null) return "";
  const kind = saveKind(), out = [];
  pastYears().slice(-4).forEach(y => {
    const st = seasonStats(y, kind); if (!st) return; const r = st.row[i]; if (r == null || r < 0) return;
    const g = f => st.cols[f] ? st.cols[f][r] : NaN, mins = g("minutes"); if (!(mins > 0)) return;
    const rat = g("average_rating");
    out.push(`<span class="rvh"><b>${esc(seasonShort(y))}</b> ${Math.round(mins).toLocaleString()} min${rat === rat && rat > 0 ? ` · ${rat.toFixed(2)}` : ""} · ${Math.round(g("goals") || 0)}G ${Math.round(g("assists") || 0)}A</span>`);
  });
  return out.length ? `<div class="rvhist small muted">Past seasons: ${out.join("")}</div>` : "";
}
// his main position (from the save), so each player is reviewed once
const RV_MAIN = { GK: "GK", FB: "FB", CB: "CB", DM: "DM", CM: "CM", AM: "AM", W: "Wingers", ST: "ST" };
function rvMain(p) { if (!SAVE || !p.uid) return null; const i = saveUidIndex().get(p.uid); return i == null ? null : RV_MAIN[savePos().bench[i]] || null; }
function rvOpenBtn(p, pos) {
  const i = SAVE && p.uid ? saveUidIndex().get(p.uid) : null;
  return i != null ? `${starForP(p)}<button class="linkbtn" data-sci="${i}"><b>${esc(p.name)}</b></button>` : `<button class="linkbtn" data-spos="${pos}" data-open="${p.ix}"><b>${esc(p.name)}</b></button>`;
}
// upgrades for one of your players: same position, same season, at least 60% of his minutes, better than him
function rvUpgrades(r, e, cats) {
  const F = scF(), budget = F.tBud, maxAge = F.tAge ?? 30, fa = F.tFA !== false, caGap = F.rvCA ?? 15;
  const caOf = p => { if (!SAVE || !p.uid) return null; const i = saveUidIndex().get(p.uid); return i == null || !(SAVE.ca[i] > 0) ? null : SAVE.ca[i]; };
  const myCA = caOf(r.p);
  const minM = Math.max(rvMinMins(), (r.p.mins || 0) * 0.6);
  const ok = x => !x.p.mine && x.p.ref && (x.p.age == null || x.p.age <= maxAge) && (myCA == null || caGap === "" || (caOf(x.p) ?? 0) >= myCA - caGap) && (fa || x.p.club !== FA_CLUB) && (budget == null || budget === "" || x.p.club === FA_CLUB || (x.p.val ?? Infinity) <= budget * 1e6);
  const weak = cats.filter(c => r.sr.cs[c] != null && r.sr.cs[c] < 50).sort((a, b) => r.sr.cs[a] - r.sr.cs[b]).slice(0, 3);
  const perfKey = x => x.sr && x.sr.cs ? (weak.length ? mean(weak.map(c => x.sr.cs[c])) * 0.6 + (x.sr.orank ?? 0) * 0.4 : x.sr.orank) : null;
  const rows = e.prim.rows.filter(ok);
  const myA = r.ar ? r.ar.orank : null, myP = perfKey(r), myC = r.cmb;
  const attrs = e.at ? rows.filter(x => x.ar && x.ar.orank != null && (myA == null || x.ar.orank > myA + 3)).sort((a, b) => b.ar.orank - a.ar.orank).slice(0, 3) : [];
  const perf = rows.filter(x => x.sr && (x.p.mins || 0) >= minM && perfKey(x) != null && perfKey(x) > (myP ?? 0) + 3).sort((a, b) => perfKey(b) - perfKey(a)).slice(0, 3);
  const comb = rows.filter(x => x.cmb != null && x.sr && (x.p.mins || 0) >= minM && x.cmb > (myC ?? 0) + 3).sort((a, b) => b.cmb - a.cmb).slice(0, 3);
  const deltas = x => x.sr && x.sr.cs ? cats.filter(c => x.sr.cs[c] != null && r.sr.cs[c] != null).map(c => [c, Math.round(x.sr.cs[c] - r.sr.cs[c])]).filter(d => d[1] >= 10).sort((a, b) => b[1] - a[1]).slice(0, 3) : [];
  const card = (x, why) => `<div class="rvup">${rvOpenBtn(x.p, e.pos)}<span class="small muted">${x.p.age ?? "?"} · ${esc(x.p.club || "")}${caOf(x.p) ? ` · CA ${caOf(x.p)}` : ""} · ${x.p.club === FA_CLUB ? "free" : x.p.val != null ? esc(fmtMoney(x.p.val)) : "–"}${x.p.mins ? ` · ${Math.round(x.p.mins).toLocaleString()} min` : ""}</span>
    <span class="small">${why(x)}</span>${deltas(x).length ? `<span class="small">${deltas(x).map(([c, d]) => `<span class="okc">+${d}</span> ${esc(CATS[c].l)}`).join(" · ")}</span>` : ""}</div>`;
  const sec = (title, list, why, empty) => `<div class="rvsec"><h5>${title}</h5>${list.length ? list.map(x => card(x, why)).join("") : `<p class="small muted">${empty}</p>`}</div>`;
  return `<div class="rvups">${sec("Attributes only", attrs, x => `Attributes for ${esc(e.role)}: <b>${Math.round(x.ar.orank)}</b> vs ${myA != null ? Math.round(myA) : "–"}`, "Nobody with clearly better attributes within your filters.")}
    ${sec("Performance only", perf, x => `Season ${weak.length ? `in his weak areas (${weak.map(c => esc(CATS[c].l.toLowerCase())).join(", ")})` : "overall"}: <b>${Math.round(perfKey(x))}</b> vs ${Math.round(myP ?? 0)}`, "Nobody performed clearly better over similar minutes.")}
    ${sec("Combined", comb, x => `Stats + attributes: <b>${Math.round(x.cmb)}</b> vs ${myC != null ? Math.round(myC) : "–"}`, "Nobody clearly better on both.")}</div>`;
}
function renderReview(sq) {
  if (!sq) return `<section class="panel"><p class="muted">Load your squad or save first.</p></section>`;
  const { need } = scNeeds(), minM = rvMinMins(), open = S.rvOpen || (S.rvOpen = new Set());
  const F = scF();
  let h = `<section class="panel"><div class="ph"><h3>Season review</h3><span class="muted small">every player graded per category against his position this season (percentiles, ${S.league ? "league-adjusted" : "not league-adjusted"}) · ${minM}+ minutes · tap a player for upgrades</span></div>
    <div class="filters">${scNum("tBud", "Upgrade budget £M (blank = any)", F.tBud, 1, 110)}${scNum("tAge", "Max age", F.tAge ?? 30)}${SAVE ? scNum("rvCA", "Ability (CA) at most this far below yours", F.rvCA ?? 15, 5, 96) : ""}${scChk("tFA", "Include free agents", F.tFA !== false)}
    <span class="poolnote">${RV_BANDS.map(b => `<span class="rvchip ${b[2]}">${b[1]}</span>`).join(" ")} · Elite = top 2% of his position (best in the league), Very good = top 12%, Good = top 35%</span></div></section>`;
  const pri = [];
  POSITIONS.forEach(pos => {
    // the pool uses the review's minimum (scaled to the season so far), not the Stats tab's slider
    const keep = S.minMins; S.minMins = minM; let e; try { e = squadEval(pos); } finally { S.minMins = keep; }
    if (!e || !e.st) return;
    const cats = rvCatsOf(e); if (!cats.length) return;
    const mine = e.mine.filter(r => r.sr && r.sr.cs && (r.p.mins || 0) >= minM && (rvMain(r.p) || pos) === pos).sort((a, b) => (b.p.mins || 0) - (a.p.mins || 0));
    if (!mine.length) return;
    const n = need[pos] || 1, starters = mine.slice(0, n);
    const avg = c => { const v = starters.map(r => r.sr.cs[c]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
    const ov = mean(starters.map(r => r.sr.orank).filter(x => x != null));
    const weakest = cats.map(c => [c, avg(c)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1])[0];
    const prio = ov == null ? "–" : ov < 45 ? "High" : ov < 62 ? "Medium" : "Low";
    pri.push({ pos, prio, ov, weakest });
    h += `<section class="panel rvpos" id="rv-${pos}"><div class="ph"><h3>${esc(PL_LABEL[pos] || pos)}</h3><span class="tag ${prio === "High" ? "bad" : prio === "Medium" ? "warn" : "good"}">Upgrade priority: ${prio}</span>
      <span class="muted small">starters (most minutes): ${starters.map(r => esc(r.p.name)).join(", ")} · average ${ov != null ? Math.round(ov) : "–"}${weakest ? ` · weakest area: <b>${esc(CATS[weakest[0]].l)}</b> (${Math.round(weakest[1])})` : ""}</span></div>
      <div class="tscroll"><table class="heat rvt"><thead><tr><th class="left">Player</th><th class="num">Mins</th><th class="num">Overall</th>${cats.map(c => `<th class="num" title="${esc(CATS[c].l)}">${esc(CATS[c].l)}</th>`).join("")}<th class="left">Summary</th></tr></thead><tbody>`;
    mine.forEach(r => {
      const key = pos + "|" + (r.p.uid || r.p.ix), isOpen = open.has(key);
      h += `<tr class="${starters.includes(r) ? "rvstart" : ""}"><td class="left">${rvOpenBtn(r.p, pos)}</td><td class="num">${Math.round(r.p.mins || 0).toLocaleString()}</td>
        <td class="num"><b class="rvchip ${rvBand(r.sr.orank ?? 0)[2]}">${r.sr.orank != null ? Math.round(r.sr.orank) : "–"}</b></td>
        ${cats.map(c => { const v = r.sr.cs[c]; return `<td class="num">${v == null ? "–" : `<span class="rvchip ${rvBand(v)[2]}">${Math.round(v)}</span>`}</td>`; }).join("")}
        <td class="left small rvsum">${esc(rvSummary(r, e, cats))} <button class="linkbtn small" data-rvopen="${esc(key)}">${isOpen ? "Hide upgrades" : "Find upgrades"}</button></td></tr>`;
      if (isOpen) h += `<tr class="rvexp"><td colspan="${cats.length + 4}">${rvHistory(r.p)}${rvUpgrades(r, e, cats)}</td></tr>`;
    });
    h += `</tbody></table></div></section>`;
  });
  if (!pri.length) return h + `<section class="panel"><p class="muted">No season stats to review yet: load your save (or a squad export with stats) once your players have played some minutes (${minM}+).</p></section>`;
  const order = { High: 0, Medium: 1, Low: 2, "–": 3 };
  pri.sort((a, b) => order[a.prio] - order[b.prio] || (a.ov ?? 0) - (b.ov ?? 0));
  const top = `<section class="panel"><div class="ph"><h3>Where to strengthen</h3><span class="muted small">positions ranked by how your starters graded this season</span></div><div class="rvpri">${pri.map(x => `<a class="rvp" href="#rv-${x.pos}"><b>${esc(PL_LABEL[x.pos] || x.pos)}</b><span class="tag ${x.prio === "High" ? "bad" : x.prio === "Medium" ? "warn" : "good"}">${x.prio}</span><span class="small muted">${x.ov != null ? Math.round(x.ov) : "–"}${x.weakest ? ` · weakest ${esc(CATS[x.weakest[0]].l.toLowerCase())}` : ""}</span></a>`).join("")}</div></section>`;
  return h.replace(`</section>`, `</section>${top}`);
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-rvopen]"); if (!t) return;
  const s = S.rvOpen || (S.rvOpen = new Set()), k = t.dataset.rvopen, y = window.scrollY;
  s.has(k) ? s.delete(k) : s.add(k); render(); window.scrollTo(0, y);
});

