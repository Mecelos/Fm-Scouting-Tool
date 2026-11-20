// ---------- Scouting knowledge: the nations each staff member knows, read from the save (0-100 per nation) ----------
// FM shows the number as a word. Checked on FM27 screens: 100 Complete, 90 Outstanding, 60 and 77 Exceptional, 47 Extensive,
// 30 Very Good, 17 Above Average, 10 and 12 Average, 1 Minimal. Where each band starts between those is a best guess.
const KNOW_WORDS = [[100, "Complete"], [80, "Outstanding"], [60, "Exceptional"], [40, "Extensive"], [30, "Very Good"], [20, "Good"],
  [15, "Above Average"], [10, "Average"], [5, "Basic"], [1, "Minimal"]];
const KNOW_MIN = 10; // Average or better counts as a nation he knows
const KNOW_WEIGHT = { "Complete": 1, "Outstanding": 0.9, "Exceptional": 0.8, "Extensive": 0.7, "Very Good": 0.6, "Good": 0.5, "Above Average": 0.45, "Average": 0.4 }; // knowledge points per nation
const KNOW_MIX = { rating: 0.6, know: 0.4 }; // overall score on the Scout knowledge tab
const hasKnow = () => !!(SAVE && SAVE.staff && SAVE.staff.knowAt);
const knowWord = v => { for (const [lo, w] of KNOW_WORDS) if (v >= lo) return w; return "None"; };
const knowNation = k => nationName(k) || "Nation " + k;
function sKnow(i) { // [[nation, 0-100]] best first
  if (!hasKnow()) return [];
  const ST = SAVE.staff, out = [];
  for (let k = ST.knowAt[i]; k < ST.knowAt[i + 1]; k++) out.push([ST.knowNat[k], ST.knowVal[k]]);
  return out.sort((a, b) => b[1] - a[1] || knowNation(a[0]).localeCompare(knowNation(b[0])));
}
function knowData() { // per person: nations at Average or better, complete nations, knowledge points
  if (SAVE._know) return SAVE._know;
  const ST = SAVE.staff, n = ST.n, cnt = new Uint16Array(n), comp = new Uint16Array(n), pts = new Float32Array(n);
  if (hasKnow()) for (let i = 0; i < n; i++) for (let k = ST.knowAt[i]; k < ST.knowAt[i + 1]; k++) {
    const v = ST.knowVal[k]; if (v < KNOW_MIN) continue;
    cnt[i]++; if (v >= 100) comp[i]++; pts[i] += KNOW_WEIGHT[knowWord(v)] || 0;
  }
  return (SAVE._know = { cnt, comp, pts });
}
function knowLevel(i, nat) { const ST = SAVE.staff; for (let k = ST.knowAt[i]; k < ST.knowAt[i + 1]; k++) if (ST.knowNat[k] === nat) return ST.knowVal[k]; return 0; }
const knowTxt = i => { const d = knowData(); return `${d.cnt[i]} nation${d.cnt[i] === 1 ? "" : "s"}` + (d.comp[i] ? ` · ${d.comp[i]} complete` : ""); };
const knowShort = (i, m) => sKnow(i).filter(x => x[1] >= KNOW_MIN).slice(0, m).map(([n, v]) => knowNation(n) + (v >= 100 ? " ✓" : "")).join(", ");
// percentile (0-100) of each person's value within the pool; ties share the middle
function poolPct(pool, f) {
  const v = pool.map(f).sort((a, b) => a - b), n = v.length, out = new Map();
  const lowerBound = x => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (v[m] < x) lo = m + 1; else hi = m; } return lo; };
  const upperBound = x => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (v[m] <= x) lo = m + 1; else hi = m; } return lo; };
  pool.forEach(i => { const x = f(i), a = lowerBound(x), b = upperBound(x); out.set(i, n ? (a + (b - a) / 2) / n * 100 : 0); });
  return out;
}

// the side panel's box: every nation he knows, any level
function knowPanelHtml(i) {
  if (!hasKnow()) return `<h4>Scouting knowledge</h4><p class="small muted">Load your save again (Data) to see which nations he knows.</p>`;
  const l = sKnow(i), d = knowData();
  if (!l.length) return `<h4>Scouting knowledge</h4><p class="small muted">The save lists no nations for him.</p>`;
  return `<h4>Scouting knowledge <small class="muted">${d.cnt[i]} at Average or better${d.comp[i] ? ` · ${d.comp[i]} complete` : ""} · ${l.length} in all</small></h4>
    <div class="whyst">${l.map(([n, v]) => `<div class="mrow"><span class="mlab">${esc(knowNation(n))}</span><span class="mval">${esc(knowWord(v))}</span><span class="mtrack"><span style="width:${v}%;background:${v >= KNOW_MIN ? heat(v) : "var(--line2)"}"></span></span><span class="mpct">${v}</span></div>`).join("")}</div>
    <p class="small muted">Knowledge out of 100 as the save keeps it (FM shows it as a word). Nations at Average or better count towards his total.</p>`;
}

// ---------- Staff > Scout knowledge: scouts ranked by scouting ability and nation knowledge together ----------
function renderScoutKnowledge() {
  const tab = "Know", role = staffRoleOf(tab), roles = STAFF_TAB[tab][2], who = staffWho(), d = staffData(), kd = knowData();
  let h = `<div class="setsbar"><span class="setctl"><label for="sRoleSel" class="small muted">Rate them as</label><select id="sRoleSel">${roles.map(r => `<option ${r === role ? "selected" : ""}>${esc(r)}</option>`).join("")}</select>
    <label for="sWho" class="small muted">Who</label><select id="sWho">${Object.entries(STAFF_WHO).map(([k, l]) => `<option value="${k}" ${who === k ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></span></div>`;
  if (!hasKnow()) return h + `<section class="panel"><h3>Load your save once more</h3><p class="muted">This save was loaded before Scout Lab read scouting knowledge. Load it again (<button class="linkbtn" data-act="datapage">Data</button>) and every scout's nations appear here.</p></section>`;
  const rat = staffRating(role), pool = staffPool(role, who).filter(i => !isNaN(rat[i]));
  const pr = poolPct(pool, i => rat[i]), pk = poolPct(pool, i => kd.pts[i]);
  const over = new Map(pool.map(i => [i, KNOW_MIX.rating * pr.get(i) + KNOW_MIX.know * pk.get(i)]));
  pool.sort((a, b) => over.get(b) - over.get(a) || rat[b] - rat[a]);
  const rank = new Map(pool.map((i, k) => [i, k + 1]));
  // nations anyone here knows, for the "must know" filter
  const natN = new Map(); pool.forEach(i => sKnow(i).forEach(([n, v]) => { if (v >= KNOW_MIN) natN.set(n, (natN.get(n) || 0) + 1); }));
  const nat = S.sKNat != null && natN.has(S.sKNat) ? S.sKNat : null;
  let rows = staffFilter(pool); if (nat != null) rows = rows.filter(i => knowLevel(i, nat) >= KNOW_MIN);
  h += `<details class="rolehow"><summary class="small muted"><b>Overall</b> (out of 100) mixes his scouting rating and the nations he knows. <span class="howlink">How the score works</span></summary><p class="small muted"><b>Overall</b> (out of 100) = ${KNOW_MIX.rating * 100}% his ${esc(role.toLowerCase())} rating + ${KNOW_MIX.know * 100}% his nation knowledge, each judged against the ${pool.length.toLocaleString()} people here. Knowledge points: each nation at Average or better counts (${Object.entries(KNOW_WEIGHT).map(([w, x]) => w + " " + x).join(", ")}). This score is only used on this tab; the Scouts tab still rates scouting ability alone.</p></details>`;
  const extra = `<label class="fl"><span class="small muted">Must know (Average or better)</span><select id="sKNat"><option value="">Any nation</option>${[...natN].sort((a, b) => knowNation(a[0]).localeCompare(knowNation(b[0]))).map(([n, c]) => `<option value="${n}" ${n === nat ? "selected" : ""}>${esc(knowNation(n))} (${c.toLocaleString()})</option>`).join("")}</select></label>`;
  h += staffFiltersHtml(extra);
  const mineIn = pool.filter(i => d.mine.has(i)), myBest = mineIn[0], best = rows[0];
  const most = [...rows].sort((a, b) => kd.cnt[b] - kd.cnt[a] || kd.pts[b] - kd.pts[a] || rat[b] - rat[a]);
  h += `<section class="tiles">${[["People shown", rows.length.toLocaleString()], ["Best overall", best != null ? `${Math.round(over.get(best))} · ${SAVE.staff.name[best]}` : "–"],
    ["Most nations", most[0] != null ? `${kd.cnt[most[0]]} · ${SAVE.staff.name[most[0]]}` : "–"], ["Your best", myBest != null ? `${Math.round(over.get(myBest))} · #${rank.get(myBest)}` : "Nobody in this job"]]
    .map(([l, v]) => `<div class="tile"><span class="tv">${esc(v)}</span><span class="tl">${esc(l)}</span></div>`).join("")}</section>`;
  if (mineIn.length) h += `<section><div class="sh"><h3>Your ${esc(rolePlural(role))}</h3><span class="muted small">overall rank among ${pool.length.toLocaleString()}</span></div><div class="mylist">${mineIn.slice(0, 8).map(i => knowRow(i, rat, over, rank)).join("")}</div></section>`;
  h += `<section><div class="sh"><h3>Best ${esc(rolePlural(role))}: ability and knowledge${nat != null ? " · know " + esc(knowNation(nat)) : ""}</h3><span class="muted small">overall out of 100</span></div><div class="cards">${rows.slice(0, 5).map(i => `<button class="card" data-sid="${i}"><span class="rank">#${rank.get(i)}</span><span class="cname">${esc(SAVE.staff.name[i])}</span>
      <span class="cmeta">${esc(isFreeStaff(i) ? staffJobName(i) : sClub(i))} · ${sAge(i) ?? "?"} · ${esc(staffJobName(i))}</span>
      <span class="cscore">${Math.round(over.get(i))}<small>/100 · rating ${rat[i].toFixed(1)}</small></span>
      <span class="cmeta">${esc(knowTxt(i))}: ${esc(knowShort(i, 4)) || "none"}</span>
      <span class="ctags">${isFreeStaff(i) ? `<span class="tag good">Free agent</span>` : `<span class="tag">${esc(sWage(i))}</span>`}${d.mine.has(i) ? `<span class="tag good">Your club</span>` : ""}</span></button>`).join("") || `<p class="muted">Nobody matches the filters.</p>`}</div></section>`;
  h += `<section><div class="sh"><h3>Quick picks</h3><span class="muted small">from the people shown</span></div>${staffTiersHtml([["Most nations known", most], ["Most complete nations", [...rows].sort((a, b) => kd.comp[b] - kd.comp[a] || kd.cnt[b] - kd.cnt[a] || rat[b] - rat[a])],
    ["Best overall aged 40 or under", rows.filter(i => sAge(i) != null && sAge(i) <= 40)], ["Free agents (no club to pay)", rows.filter(isFreeStaff)]], i => knowRow(i, rat, over, rank), "Nobody matches the filters.")}</section>`;
  h += `<section class="panel tablepanel">${knowTable(rows, rat, over, rank, nat)}</section>`;
  return h;
}
function knowRow(i, rat, over, rank) {
  return `<button class="trow" data-sid="${i}"><span class="tn">${esc(SAVE.staff.name[i])}${isFreeStaff(i) ? `<span class="inf fa">free</span>` : ""}</span><span class="tm">${esc(isFreeStaff(i) ? staffJobName(i) : sClub(i))} · ${sAge(i) ?? "?"} · #${rank.get(i)} · ${esc(knowTxt(i))} · rating ${rat[i].toFixed(1)}</span><b>${Math.round(over.get(i))}</b></button>`;
}
function knowTable(rows, rat, over, rank, nat) {
  const ss = staffSort(), k = ss.k, dir = ss.d, kd = knowData();
  const val = (i, c) => c === "overall" ? over.get(i) : c === "rating" ? rat[i] : c === "know" ? kd.cnt[i] + kd.pts[i] / 1000 : c === "comp" ? kd.comp[i] : c === "nat" ? (nat != null ? knowLevel(i, nat) : 0)
    : c === "name" ? SAVE.staff.name[i] : c === "club" ? sClub(i) : c === "age" ? sAge(i) : c === "wage" ? (isNaN(SAVE.staff.wage[i]) ? null : SAVE.staff.wage[i]) : c === "end" ? SAVE.staff.cEnd[i] || null : c === "job" ? staffJobName(i) : sAttr(i, c);
  const sorted = [...rows].sort((a, b) => { const x = val(a, k), y = val(b, k); if (typeof x === "string" || typeof y === "string") return dir * -String(x ?? "").localeCompare(String(y ?? "")); return dir * ((x ?? -1e9) - (y ?? -1e9)); });
  const lim = S.sShowAll ? 1000 : 50, shown = sorted.slice(0, lim);
  const th = (c, l, cls = "", title = "") => `<th class="${cls} ${k === c ? "sorted" : ""}" data-ssort="${c}"${title ? ` data-tip="${esc(title)}"` : ""}><button>${esc(l)}${k === c ? (dir < 0 ? " ↓" : " ↑") : ""}</button></th>`;
  let s = `<div class="tscroll"><table class="heat stafft"><thead><tr><th class="num">#</th>${th("name", "Name", "left")}${th("job", "Job", "left")}${th("age", "Age", "num")}${th("wage", "Wage", "num")}${th("end", "Contract", "num", "When his contract ends")}`
    + th("overall", "Overall", "num strong", "Scouting rating and nation knowledge together, out of 100") + th("rating", "Rating", "num", "Scouting rating out of 20") + th("know", "Nations", "num", "Nations he knows at Average or better")
    + th("comp", "Complete", "num", "Nations he knows completely") + (nat != null ? th("nat", knowNation(nat), "num", "His knowledge of " + knowNation(nat) + " (0-100)") : "") + `<th class="left">Knows best</th></tr></thead><tbody>`;
  shown.forEach(i => {
    s += `<tr data-sid="${i}" class="${S.sSel === i ? "rsel" : ""}"><td class="num muted">${rank.get(i)}</td><td class="left pl"><span class="pn">${esc(SAVE.staff.name[i])}${staffData().mine.has(i) ? `<span class="inf">yours</span>` : ""}${isFreeStaff(i) ? `<span class="inf fa">free</span>` : ""}</span><span class="pc">${esc(sClub(i))}</span></td>
      <td class="left small">${esc(staffJobName(i))}</td><td class="num">${sAge(i) ?? "–"}</td><td class="num">${esc(sWage(i).replace(" p/w", ""))}</td><td class="num small">${SAVE.staff.cEnd[i] ? sDate(SAVE.staff.cEnd[i]).getUTCFullYear() : "–"}</td>
      <td class="num strong hc" style="background:${heat(over.get(i))}">${Math.round(over.get(i))}</td><td class="num" title="${esc(bandTxt(rat[i]))}">${rat[i].toFixed(1)}</td><td class="num">${kd.cnt[i]}</td><td class="num">${kd.comp[i] || "–"}</td>
      ${nat != null ? `<td class="num" title="${esc(knowWord(knowLevel(i, nat)))}">${knowLevel(i, nat)}</td>` : ""}<td class="left small">${esc(knowShort(i, 5)) || "–"}</td></tr>`;
  });
  s += `</tbody></table></div>`;
  if (sorted.length > 50) s += `<button class="ghost more" data-act="sshowall">${S.sShowAll ? "Show top 50" : sorted.length > 1000 ? `Show top 1,000 of ${sorted.length.toLocaleString()}` : `Show all ${sorted.length.toLocaleString()}`}</button>`;
  return s;
}

// ---------- My staff > Scouting coverage: which nations your scouts know, the gaps, and who would fill them ----------
const KNOW_GOOD = 30;          // Very Good or better = "covered"
const KNOW_TOP_PLAYERS = 2000; // the save's best players by ability decide which nations matter
const KNOW_KEY_NATIONS = 15;
function knowCoverageHtml() {
  if (!hasKnow() || !SAVE.ca || !SAVE.nation) return "";
  const d = staffData(), scouts = [...d.mine].filter(i => [14, 44].includes(staffJobCode(i)));
  if (!scouts.length) return `<section><div class="sh"><h3>Scouting coverage</h3></div><p class="muted">You have no scouts at the club, so no nation is covered. Staff › Scout knowledge shows who knows the most nations.</p></section>`;
  const best = new Map(); scouts.forEach(i => sKnow(i).forEach(([n, v]) => { if (v > (best.get(n) || 0)) best.set(n, v); }));
  // nations that matter: where the save's best players come from
  const ix = []; for (let i = 0; i < SAVE.n; i++) if (SAVE.ca[i] > 0 && SAVE.nation[i] >= 0) ix.push(i);
  ix.sort((a, b) => SAVE.ca[b] - SAVE.ca[a]);
  const tally = new Map(); ix.slice(0, KNOW_TOP_PLAYERS).forEach(i => tally.set(SAVE.nation[i], (tally.get(SAVE.nation[i]) || 0) + 1));
  const key = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, KNOW_KEY_NATIONS);
  const gaps = key.filter(([n]) => (best.get(n) || 0) < KNOW_GOOD);
  const covered = [...best.entries()].filter(([, v]) => v >= KNOW_GOOD).sort((a, b) => b[1] - a[1]);
  // who would fill the most gaps: anyone who could be your scout (in the job or a free agent), not already yours
  const rat = staffRating("Scout"), pool = staffPool("Scout", "both").filter(i => !isNaN(rat[i]) && !d.mine.has(i));
  const fills = gaps.length ? pool.map(i => [i, gaps.filter(([n]) => knowLevel(i, n) >= KNOW_GOOD).map(([n]) => n)]).filter(x => x[1].length)
    .sort((a, b) => b[1].length - a[1].length || rat[b[0]] - rat[a[0]]) : [];
  const freeFill = fills.filter(x => isFreeStaff(x[0])).slice(0, 2), clubFill = fills.filter(x => !isFreeStaff(x[0])).slice(0, 3);
  const chip = ([n, v]) => `<span class="tag ${v >= KNOW_GOOD ? "good" : v >= KNOW_MIN ? "warn" : "bad"}" title="${esc(v ? knowWord(v) + " (" + v + ")" : "Nobody at your club knows it")}">${esc(knowNation(n))}</span>`;
  const who = ([i, ns]) => `<li><button class="linkbtn" data-sid="${i}">${esc(SAVE.staff.name[i])}</button> <span class="small muted">${esc(isFreeStaff(i) ? "free agent" : sClub(i))} · ${sAge(i) ?? "?"} yrs · scout ${rat[i].toFixed(1)}${isFreeStaff(i) ? "" : " · " + esc(sWage(i))}</span>: covers <b>${ns.map(knowNation).map(esc).join(", ")}</b></li>`;
  const verdict = !gaps.length ? `<b>Covered:</b> your scouts know all ${key.length} nations the best players come from.`
    : `<b>${gaps.length} gap${gaps.length > 1 ? "s" : ""}:</b> nobody at your club knows ${gaps.map(([n]) => esc(knowNation(n))).join(", ")} well.${fills[0] ? ` Best fix: <b>${esc(SAVE.staff.name[fills[0][0]])}</b> covers ${fills[0][1].length} of them.` : ""}`;
  return `<section><div class="sh"><h3>Scouting coverage</h3><span class="muted small">your ${scouts.length} scout${scouts.length > 1 ? "s" : ""} against the ${key.length} nations most of the save's best ${KNOW_TOP_PLAYERS.toLocaleString()} players come from</span></div>
    <div class="panel"><p class="readbox ${gaps.length ? "warn" : "good"}">${verdict}</p>
    <p class="small"><b>Key nations</b> <span class="muted">(green Very Good or better, amber Average to Good, red nobody)</span><br>${key.map(([n]) => chip([n, best.get(n) || 0])).join(" ")}</p>
    ${gaps.length ? `<h4>Who would fill the gaps</h4>${fills.length ? `<ul class="why">${clubFill.concat(freeFill).map(who).join("")}</ul>` : `<p class="small muted">No scout in the save knows these nations well.</p>`}` : ""}
    <p class="small muted">All nations your scouts know well (${covered.length}): ${covered.map(([n]) => esc(knowNation(n))).join(", ") || "none"}. Click a scout for his full list.</p></div></section>`;
}

// player panel: do your scouts know where he's from? (FM only shows a player's attributes clearly if they do)
function knowPlayerTag(p) {
  if (!p || p.mine || !hasKnow() || !SAVE.nation || !p.uid) return "";
  const i = saveUidIndex().get(p.uid); if (i == null) return "";
  const nat = SAVE.nation[i]; if (nat == null || nat < 0) return "";
  const d = staffData(); let v = 0, who = null;
  d.mine.forEach(s => { if (![14, 44].includes(staffJobCode(s))) return; const x = knowLevel(s, nat); if (x > v) { v = x; who = s; } });
  const nn = esc(knowNation(nat));
  return v >= KNOW_GOOD ? `<span class="tag good" title="${esc(SAVE.staff.name[who])} knows ${nn}: ${esc(knowWord(v))}">Your scouts know ${nn}</span>`
    : v >= KNOW_MIN ? `<span class="tag warn" title="Best at your club: ${esc(SAVE.staff.name[who])}, ${esc(knowWord(v))}. His attributes in FM may be rough estimates.">Your scouts know ${nn} a little</span>`
    : `<span class="tag bad" title="His attributes in FM may be hidden or rough until a scout who knows ${nn} watches him. Staff › Scout knowledge finds one.">Nobody at your club knows ${nn}</span>`;
}

// a row of short lists; lists with nobody in them are left out, and if all are empty one line says so (used by Staff pages)
function staffTiersHtml(lists, row, none) {
  const full = lists.filter(([, ix]) => ix.length);
  if (!full.length) return `<p class="muted small">${none}</p>`;
  return `<div class="tiers">${full.map(([h, ix]) => `<div class="tier"><h4>${esc(h)}</h4>${ix.slice(0, 5).map(row).join("")}</div>`).join("")}</div>`;
}
