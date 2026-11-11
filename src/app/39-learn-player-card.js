// ---------- Learn: plain-English explanations, ⓘ tips on stats, and the Analytics basics page ----------
// Learn mode (on by default) adds a short "how to read this" under charts and key numbers. Turn it off once you don't need it.
const GLOSS = {
  per90: { t: "Per 90 / per game", d: "A total divided by time played, so a player with 900 minutes and one with 2,700 can be compared fairly. Teams are shown per game.", g: "Always compare per 90, never totals, unless minutes are similar.", fm: "Use per 90 when judging a sub or a new signing who hasn't played much." },
  pct: { t: "Percentile", d: "Where a number sits among a group. 80th percentile = better than 80% of players in his position (or teams in the league). 50 is the middle.", g: "80+ is a strength, 20 or less is a weakness. Rank works the same way: 1st of 18 is best.", fm: "Percentiles let you compare a striker's 0.4 xG/90 with a full-back's 0.4 — the number means different things in each position." },
  sample: { t: "Sample size (minutes)", d: "Numbers from a few games jump around. 300 minutes is a hint, 900 is a pattern, 1,800+ is reliable.", g: "Trust trends over 900+ minutes; treat anything under 450 as a hint only.", fm: "Don't drop or buy a player on 3 good or bad games — check his minutes first." },
  xg: { t: "xG (expected goals)", d: "How good the chances were. Each shot gets a value from 0 to 1 for how often that shot is scored — a penalty about 0.76, a header from 15 yards about 0.05. xG adds them up.", g: "Strikers: 0.4+ per 90 is good, 0.6+ is elite. Teams: 1.5+ per game is a strong attack.", fm: "Low xG = your players aren't getting into good positions; more shots won't help, better shots will." },
  npxg: { t: "Non-penalty xG", d: "xG without penalties, so a penalty taker doesn't look better than he is.", g: "Use it to judge open-play goal threat.", fm: "Best single number for 'does my attack create good chances?'." },
  xgshot: { t: "xG per shot", d: "Average quality of each shot. 0.15+ means mostly good chances; under 0.08 means lots of hopeful efforts.", g: "Teams: 0.11–0.13 is normal.", fm: "Low? Your team shoots from distance or bad angles: discourage shots from distance, or work the ball closer." },
  conv: { t: "Conversion / finishing", d: "Goals divided by shots, or goals compared with xG. Scoring more than your xG = good finishing (or luck); less = poor finishing (or bad luck).", g: "Over a long run most players score close to their xG.", fm: "A striker far below his xG over 1,000+ minutes may lack finishing or composure; over a few games it's usually luck." },
  xa: { t: "xA (expected assists)", d: "The xG of the shots a player's passes created. It rewards the pass even if the shooter misses.", g: "Creative midfielders and wingers: 0.2+ per 90 is good, 0.3+ elite.", fm: "Find your real creators: high xA but few assists = teammates are missing his chances." },
  kp: { t: "Key passes", d: "Passes that lead directly to a shot.", g: "2+ per 90 for creative players.", fm: "Lots of key passes but low xA = he creates half-chances (crosses, long shots), not big ones." },
  ccc: { t: "Clear-cut chances", d: "Chances a player is expected to score — one-on-ones, tap-ins. FM's 'big chances'.", g: "Teams creating 2+ per game are dangerous.", fm: "Low? You're not getting runners in behind or into the box: check your runners and pass-into-space settings." },
  prog: { t: "Progressive passes", d: "Passes that move the ball a good distance towards the opponent's goal.", g: "Deep playmakers and full-backs: 5+ per 90 is good.", fm: "Shows who actually moves your team up the pitch — usually your best candidates for playmaker roles." },
  drb: { t: "Dribbles", d: "Successful take-ons, beating a man with the ball.", g: "Wingers: 2+ per 90.", fm: "Players who dribble a lot break a press and pull defenders out of shape." },
  pas: { t: "Pass completion %", d: "Share of passes that reach a teammate. Depends heavily on style: short passes are easy, through balls are not.", g: "Teams: 80%+ is controlled possession, under 75% is direct.", fm: "High pass % but low xG = sterile possession (passing sideways). Low pass % in a possession team = players not good enough for it." },
  plost: { t: "Possession lost", d: "Times a player gives the ball away (bad passes, losing a duel, miscontrols). Lower is better.", g: "Compare within a position: forwards lose it more than centre-backs.", fm: "A high number from a playmaker is fine if he also creates; from a holding midfielder it's a problem." },
  tck: { t: "Tackles", d: "Attempted tackles and how many were won.", g: "Win rate 75%+ is good.", fm: "Lots of tackles can mean you defend a lot, not that you defend well — read with possession." },
  int: { t: "Interceptions", d: "Passes cut out by reading the play.", g: "Midfielders and centre-backs: 2+ per 90.", fm: "Good anticipation and positioning show up here." },
  pwon: { t: "Possession won", d: "Every time a player wins the ball back (tackle, interception, loose ball).", g: "Higher = more active defending. Teams that press win it back more.", fm: "If you set a high press but this is low, your forwards and midfielders aren't pressing — check their roles and work rate." },
  defvol: { t: "Defensive volume vs quality", d: "Teams that have the ball a lot make fewer tackles and interceptions simply because they defend less. Low volume isn't bad if you concede few.", g: "Judge defence by goals and shots conceded first, volume second.", fm: "Don't 'fix' low tackles if you're keeping clean sheets." },
  aer: { t: "Aerial duels / headers", d: "Headers contested and won.", g: "Centre-backs and target men: 60%+ won.", fm: "Losing lots of headers? Avoid long goal kicks, or get a taller centre-back." },
  spr: { t: "Sprints & distance", d: "High-intensity runs and kilometres covered — how hard a team works without and with the ball.", g: "Pressing teams sprint more.", fm: "Low sprints with a high press = the press isn't happening. Check stamina and work rate." },
  xgp: { t: "xG prevented (goalkeepers)", d: "Goals a keeper was expected to concede from the shots he faced, minus what he conceded. Positive = he saved more than expected.", g: "+0.1 per game or more is excellent; negative over a season means he's costing you.", fm: "The best single number for judging a goalkeeper." },
  conc: { t: "Goals conceded & shots faced", d: "How often you concede, and how many shots on target you allow.", g: "Fewer than 1 goal per game is a top defence.", fm: "Lots of shots faced = defence/midfield problem; few shots but many goals = keeper or bad luck." },
  capa: { t: "CA and PA", d: "Current and potential ability, FM's hidden 1–200 rating, read from your save. CA is how good he is now, PA the ceiling.", g: "Roughly: 160+ world class, 140+ top-league starter, 120+ good squad player.", fm: "Use CA to compare players, but stats tell you whether he actually performs." },
  score: { t: "Scout Lab score (0–100)", d: "Our rating: a player's stats (or attributes) for a role, turned into a percentile against his position. 90 = better than 90% of that position.", g: "70+ good, 85+ elite.", fm: "Change the role in a player's profile to see how he'd do in another job." },
  league: { t: "League adjustment", d: "A goal in a weak league is worth less than one in the Premier League. Stats from weaker leagues are scaled down so players can be compared.", g: "Players from weak leagues need very high numbers to be safe buys.", fm: "Combine with attributes: high stats in a weak league plus good attributes = safer signing." },
  scatter: { t: "Scatter charts", d: "Each dot is a team or player, placed by two numbers. The lines are the average, splitting the chart into four boxes, each labelled with what it means.", g: "Top-right is usually the good box, but read the labels.", fm: "Find your dot, read the corner label, then look at which teams sit where you want to be." },
  radar: { t: "Radar charts", d: "Each spoke is one stat, scaled as a percentile. Bigger shape = better; the dashed ring is average.", g: "Look for spikes (strengths) and dents (weaknesses), not the overall size.", fm: "Compare two players' shapes to see if a signing would play like the man he replaces." },
};
// which glossary entry explains each stat key (Data Hub and player metrics)
const GLOSS_OF = { goals: "xg", xg: "xg", npxg: "npxg", gmx: "conv", shots: "xgshot", sot: "xgshot", shotpct: "conv", xgshot: "xgshot", conv: "conv", outbox: "xgshot", assists: "xa", xa: "xa", kp: "kp", opkp: "kp", ccc: "ccc", crs: "kp", crspct: "kp", opcrs: "kp",
  pas: "pas", paspct: "pas", prog: "prog", drb: "drb", plost: "plost", tck: "tck", tckpct: "tck", ktck: "tck", int: "int", blk: "defvol", shblk: "defvol", clr: "defvol", pwon: "pwon", mist: "conc", dist: "spr", spr: "spr", fouls: "tck",
  aer: "aer", hdr: "aer", hdrpct: "aer", khdr: "aer", conc: "conc", sotf: "conc", savepct: "xgp", xgp: "xgp", cs: "conc",
  npxg90: "npxg", xg90: "xg", gls90: "xg", npg90: "xg", shot90: "xgshot", sht90: "xgshot", conv: "conv", xgop90: "conv", xa90: "xa", kp90: "kp", opkp90: "kp", chc90: "kp", ast90: "xa", ccc90: "ccc", prp90: "prog", drb90: "drb", psc90: "pas", psa90: "pas",
  plost90: "plost", tck90: "tck", tckr: "tck", ktck90: "tck", int90: "int", blk90: "defvol", clr90: "defvol", pwon90: "pwon", spr90: "spr", dist90: "spr", hdrw90: "aer", hdrpct: "aer", aera90: "aer", xgp90: "xgp", svpct: "xgp", conc90: "conc" };
const learnOn = () => S.learn !== false;
function itip(key) { const g = GLOSS[GLOSS_OF[key] || key]; return g ? `<span class="itip" tabindex="0" role="button" aria-label="What is ${esc(g.t)}?" data-gloss="${GLOSS_OF[key] || key}" data-tip="${esc(g.t + ": " + g.d)}">i</span>` : ""; }
function learnBox(html, gl) { return learnOn() ? `<div class="learnbox"><span class="lbi">i</span><div>${html}${gl ? ` <button class="linkbtn small" data-gloss="${gl}">More about ${esc(GLOSS[gl].t)}</button>` : ""}</div></div>` : ""; }
function glossPop(key, at) {
  const g = GLOSS[key]; if (!g) return; let pop = document.getElementById("glosspop");
  if (!pop) { pop = document.createElement("div"); pop.id = "glosspop"; pop.setAttribute("role", "dialog"); document.body.appendChild(pop); }
  pop.innerHTML = `<button class="ghost small gpx" data-gpclose aria-label="Close">×</button><h4>${esc(g.t)}</h4><p>${esc(g.d)}</p><p><b>What good looks like:</b> ${esc(g.g)}</p><p><b>In FM:</b> ${esc(g.fm)}</p><p class="small"><button class="linkbtn" data-mode="learn">All of Analytics basics</button></p>`;
  pop.hidden = false;
  const r = at.getBoundingClientRect(), w = Math.min(340, window.innerWidth - 24);
  pop.style.width = w + "px"; pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + "px";
  const below = r.bottom + 8, h = pop.offsetHeight; pop.style.top = (below + h < window.innerHeight - 8 ? below : Math.max(8, r.top - h - 8)) + "px";
}
document.addEventListener("click", e => {
  const t = e.target.closest("[data-gloss]");
  if (t) { e.preventDefault(); e.stopPropagation(); glossPop(t.dataset.gloss, t); return; }
  const pop = document.getElementById("glosspop"); if (pop && !pop.hidden && (e.target.closest("[data-gpclose]") || !e.target.closest("#glosspop"))) pop.hidden = true;
  const lt = e.target.closest("[data-learnset]"); if (lt) { S.learn = lt.dataset.learnset === "on"; savePrefs(); render(); }
}, true);
document.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches(".itip")) { e.preventDefault(); glossPop(e.target.dataset.gloss, e.target); } if (e.key === "Escape") { const p = document.getElementById("glosspop"); if (p) p.hidden = true; } });
const learnToggle = () => `<span class="learntg" role="group" aria-label="Explanations"><span class="small muted">Explanations</span><button class="chip ${learnOn() ? "on" : ""}" data-learnset="on" aria-pressed="${learnOn()}">On</button><button class="chip ${learnOn() ? "" : "on"}" data-learnset="off" aria-pressed="${!learnOn()}">Off</button></span>`;
// ---- Analytics basics page ----
const LESSONS = [
  ["Start here: the 5-minute routine", `<ol><li><b>Every 5 games</b>, open <button class="linkbtn" data-mode="home">Home</button>. Read the one-line verdict for your team.</li><li>Open the <b>Data Hub</b> and find your <b>lowest section</b> (the red bar).</li><li>In that section, look at <b>Who does it for us</b>: is one player dragging it down (player problem) or is everyone low (role or tactic problem)?</li><li>Change <b>one thing</b>: a player, a role or one team instruction. Write it down.</li><li>After another 5 games, check if that section moved. If it did, keep it; if not, undo it and try the next idea.</li></ol><p>That's it. Analysts don't look at everything — they find the weakest area, find why, change one thing and check again.</p>`],
  ["Totals, per 90 and per game", `<p>${esc(GLOSS.per90.d)}</p><p>${esc(GLOSS.sample.d)}</p>`],
  ["Percentiles and ranks", `<p>${esc(GLOSS.pct.d)}</p><p>Scout Lab colours them the same everywhere: <span class="okc"><b>green</b></span> = strength, white = average, <span class="warnc"><b>orange</b></span> = below average, <span class="bad"><b>red</b></span> = weakness.</p>`],
  ["Goals: xG and finishing", `<p>${esc(GLOSS.xg.d)}</p><p>${esc(GLOSS.conv.d)}</p><p><b>Rule of thumb:</b> fix low xG with tactics and players who get into the box; don't panic about finishing over a few games.</p>`],
  ["Creating: xA, key passes, big chances", `<p>${esc(GLOSS.xa.d)}</p><p>${esc(GLOSS.kp.d)} ${esc(GLOSS.ccc.d)}</p>`],
  ["Moving the ball: progression and possession", `<p>${esc(GLOSS.prog.d)} ${esc(GLOSS.drb.d)}</p><p>${esc(GLOSS.pas.d)}</p>`],
  ["Defending: volume vs quality", `<p>${esc(GLOSS.defvol.d)}</p><p>${esc(GLOSS.pwon.d)} ${esc(GLOSS.int.d)}</p>`],
  ["Goalkeepers", `<p>${esc(GLOSS.xgp.d)}</p>`],
  ["Reading the charts", `<p><b>Scatter:</b> ${esc(GLOSS.scatter.d)}</p><p><b>Radar:</b> ${esc(GLOSS.radar.d)}</p><p><b>Bars:</b> the bar length is the percentile; the word next to it (Excellent → Poor) says the same in plain English.</p>`],
  ["Stats vs attributes", `<p>Attributes (1–20) say what a player <i>can</i> do; stats say what he <i>did</i> this season. The safest signings are good at both. High attributes but poor stats = wrong role, low morale or few minutes. Great stats but modest attributes = a system player, or a weak league (Scout Lab adjusts for league strength).</p><p>${esc(GLOSS.capa.d)}</p>`],
];
function renderLearn(main) {
  closeDrawer(true);
  let h = `<section class="panel learnhead"><div class="ph"><h3>Analytics basics</h3>${learnToggle()}</div><p>You don't need to read every number. These short lessons explain the few ideas behind everything in Scout Lab, with what good looks like and how to use it in FM. Tap any <span class="itip" aria-hidden="true">i</span> next to a stat anywhere in the tool for its explanation.</p></section>
    <section class="lessons">${LESSONS.map(([t, b], k) => `<details class="lesson panel"${k === 0 ? " open" : ""}><summary><span class="lnum">${k + 1}</span>${esc(t)}</summary><div class="lbody">${b}</div></details>`).join("")}</section>
    <section class="panel"><div class="ph"><h3>Glossary</h3><span class="small muted">every stat in one place</span></div><div class="glossgrid">${Object.entries(GLOSS).map(([k, g]) => `<div class="gloss"><h5>${esc(g.t)}</h5><p class="small">${esc(g.d)}</p><p class="small"><b>Good:</b> ${esc(g.g)}</p><p class="small muted"><b>In FM:</b> ${esc(g.fm)}</p></div>`).join("")}</div></section>`;
  if (typeof TRAITS !== "undefined") { const G = [...new Set(TRAITS.map(x => x.group))];
    h += `<section class="panel"><div class="ph"><h3>Player traits</h3><span class="small muted">habits a player keeps whatever his role says</span></div><p class="small">Traits (FM's preferred moves) are on every player's profile. When Scout Lab picks a role, matching traits add a little and clashing ones take more off: a winger who cuts inside isn't asked to hug the touchline. A coach can teach or remove a trait (player's Development › Traits).</p>
      ${G.map(g => `<h4>${esc(g)}</h4><ul class="why small">${TRAITS.filter(x => x.group === g).map(x => `<li><b>${esc(x.name)}</b>: ${esc(x.what)}${x.good.size ? ` <span class="okc">Suits: ${esc([...x.good].slice(0, 4).join(", "))}${x.good.size > 4 ? "…" : ""}.</span>` : ""}${x.bad.size ? ` <span class="bad">Clashes with: ${esc([...x.bad].slice(0, 4).join(", "))}${x.bad.size > 4 ? "…" : ""}.</span>` : ""}</li>`).join("")}</ul>`).join("")}</section>`; }
  main.innerHTML = h; renderSaveNote();
}

// ---------- Player card: the top of every profile, a visual summary before the full breakdown ----------
// Elite means best in the league/world: stats in the top 2% of the position; attributes 16+ out of 20
const pctWord = p => p == null ? "–" : p >= 98 ? "Elite" : p >= 88 ? "Very good" : p >= 65 ? "Good" : p >= 40 ? "Average" : p >= 20 ? "Below average" : "Poor";
const pctCls = p => p == null ? "" : p >= 88 ? "okc" : p >= 40 ? "" : p >= 20 ? "warnc" : "bad";
const attrWord = v => v == null ? "–" : v >= 16 ? "Elite" : v >= 14 ? "Very good" : v >= 12 ? "Good" : v >= 10 ? "Average" : v >= 7 ? "Below average" : "Poor";
const attrCls = v => v == null ? "" : v >= 14 ? "okc" : v >= 10 ? "" : v >= 7 ? "warnc" : "bad";
function cardBars(rows) { // [label, value text, pct, gloss key]
  return `<div class="pcbs">${rows.map(([l, v, p, gk, av]) => `<div class="pcb"><span class="pcbl">${esc(l)}${gk ? itip(gk) : ""}</span><span class="pcbv">${v}</span><span class="pcbt"><i class="${pctCls(p)}" style="width:${p == null ? 0 : Math.max(3, p)}%"></i></span><span class="pcbw small ${av != null ? attrCls(av) : pctCls(p)}">${av != null ? attrWord(av) : pctWord(p)}</span></div>`).join("")}</div>`;
}
function cardRings(p) { // success rates from the save: shots, passes, tackles, headers (keepers: saves)
  if (!SAVE || !p.uid) return "";
  const i = saveUidIndex().get(p.uid); if (i == null) return "";
  const st = SAVE.stats[saveKind()]; if (!st || !(st.row[i] >= 0)) return "";
  const v = f => { const c = st.cols[f]; const x = c ? c[st.row[i]] : NaN; return x === x ? x : 0; };
  const gk = SAVE.pos[i * 15] >= 18, items = [];
  const add = (label, made, of, sub) => { if (of > 0) items.push(`<div class="cring">${ring(100 * made / of, 66, label)}<b>${esc(label)}</b><span class="small muted">${sub}</span></div>`); };
  if (gk) {
    const sv = v("saves_held") + v("saves_parried") + v("saves_tipped"), f = v("shots_on_target_faced");
    add("Saves", sv, f, `${Math.round(sv)} of ${Math.round(f)} on target`);
    add("Passing", v("passes_completed"), v("passes_attempted"), `${Math.round(v("passes_completed"))} of ${Math.round(v("passes_attempted"))}`);
    add("Headers", v("headers_won"), v("aerial_challenges_attempted"), `${Math.round(v("headers_won"))} of ${Math.round(v("aerial_challenges_attempted"))}`);
  } else {
    add("Shots on target", v("shots_on_target"), v("shots"), `${Math.round(v("shots_on_target"))} of ${Math.round(v("shots"))} shots`);
    add("Passing", v("passes_completed"), v("passes_attempted"), `${Math.round(v("passes_completed"))} of ${Math.round(v("passes_attempted"))}`);
    add("Tackles won", v("tackles_completed"), v("tackles_attempted"), `${Math.round(v("tackles_completed"))} of ${Math.round(v("tackles_attempted"))}`);
    add("Headers won", v("headers_won"), v("aerial_challenges_attempted"), `${Math.round(v("headers_won"))} of ${Math.round(v("aerial_challenges_attempted"))}`);
    add("Crosses", v("crosses_completed"), v("crosses_attempted"), `${Math.round(v("crosses_completed"))} of ${Math.round(v("crosses_attempted"))}`);
  }
  return items.length ? `<div class="crings">${items.slice(0, 5).join("")}</div>` : "";
}
function playerCard(sc, r) {
  const p = r.p, isS = sc.kind === "stats";
  let rows = [], best = [], worst = [];
  if (isS) {
    sc.cats.forEach(c => {
      const pc = r.cr ? r.cr[c] : r.cs[c]; if (pc == null) return;
      const ks = Object.entries(CATS[c].m).filter(([k]) => k in r.mp && r.mp[k] != null && p.m[k] != null).sort((a, b) => b[1] - a[1]);
      const k = ks.length ? ks[0][0] : null;
      rows.push([CATS[c].l, k ? `${fmtVal(k, p.m[k])} <small class="muted">${esc(METRICS[k].l)}</small>` : "", pc, k]);
    });
    const cs = rows.filter(x => x[2] != null).slice().sort((a, b) => b[2] - a[2]);
    best = cs.filter(x => x[2] >= 60).slice(0, 2).map(x => x[0].toLowerCase()); worst = cs.filter(x => x[2] < 35).slice(-2).reverse().map(x => x[0].toLowerCase());
  } else {
    const w = sc.weights, key = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 8).map(x => x[0]).filter(a => r.ap[a] != null && p.a[a] != null);
    rows = key.map(a => [a, `<b>${Math.round(p.a[a])}</b><small class="muted">/20</small>`, r.ap[a], null, p.a[a]]);
    const cs = rows.slice().sort((a, b) => b[2] - a[2]);
    best = cs.filter(x => x[2] >= 70).slice(0, 2).map(x => x[0].toLowerCase()); worst = cs.filter(x => x[2] < 30).slice(-2).reverse().map(x => x[0].toLowerCase());
  }
  if (!rows.length) return "";
  const ov = r.orank, who = (sc.role === "Balanced" ? (POS_ONE && POS_ONE[sc.pos] || sc.pos) : sc.role).toLowerCase();
  const line = `${ov != null ? `As a ${esc(who)} he's <b class="${pctCls(ov)}">${pctWord(ov).toLowerCase()}</b> — ${ov >= 99 ? "in the top 1%" : `better than ${Math.round(ov)}%`} of the ${sc.ranked.length.toLocaleString()} compared${isS ? " on this season's stats" : " on attributes"}.` : ""}
    ${best.length ? ` Best at <b>${esc(best.join(" and "))}</b>.` : ""}${worst.length ? ` Weakest at <b>${esc(worst.join(" and "))}</b>.` : ""}`;
  return `<section class="pcard"><h4>At a glance</h4><p class="pcline">${line}</p>${cardRings(p)}${cardBars(rows)}
    ${learnBox(isS ? `Each bar is a percentile against every ${esc(POS_ONE && POS_ONE[sc.pos] || sc.pos)} compared: a full bar beats everyone, half a bar is average. The number is his main stat for that area${S.league ? ", adjusted for league strength" : ""}. Change the role above to see him in another job.` : `Each bar is his attribute against every ${esc(POS_ONE && POS_ONE[sc.pos] || sc.pos)} compared, for the attributes that matter most in this role.`, "pct")}
    <p class="small muted pcmore">Full breakdown below ↓</p></section>`;
}

