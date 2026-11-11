// ---------- guide ----------
function renderGuide() {
  const lbl = k => k === "npg90" ? "Non-penalty goals/90" : METRICS[k].l;
  const tierRows = POSITIONS.map(pos => {
    const imp = IMPACT[pos] || {};
    const by = w => Object.keys(imp).filter(k => imp[k] === w && !(k === "gls90" && imp.npg90)).map(lbl);
    return `<tr><th>${pos}</th><td>${by(3).map(esc).join(", ")}</td><td>${by(2).map(esc).join(", ")}</td></tr>`;
  }).join("");
  const roleRows = POSITIONS.map(pos => `<tr><th>${pos}</th><td>${Object.keys(ROLES[pos]).filter(r => r !== "Balanced").map(esc).join(", ")}</td></tr>`).join("");
  const lg = [["England", "Premier League"], ["England", "EFL Championship"], ["England", "EFL League One"], ["England", "EFL League Two"], ["England", "National League"],
    ["Spain", "LaLiga"], ["Germany", "Bundesliga"], ["Italy", "Serie A"], ["France", "Ligue 1"], ["Brazil", "Brasileirão"], ["Portugal", "Liga Portugal"], ["Netherlands", "Eredivisie"],
    ["Norway", "Eliteserien"], ["United States", "MLS"], ["Germany", "2. Bundesliga"], ["Scotland", "Scottish Premiership"], ["Saudi Arabia", "Saudi Pro League"], ["Colombia", "Primera B"], ["South Africa", "PSL"], ["Ghana", "Premier League"]]
    .map(([c, d]) => `<tr><td>${esc(d)} <span class="muted">(${esc(c)})</span></td><td class="num">${leagueFactor(c, d).k.toFixed(2)}</td></tr>`).join("");
  return `<article class="guide">
  <header class="ghead"><h2>How Scout Lab works</h2><p class="muted">Ranks players from your FM27 exports by position and role, using two views: <b>Stats</b> (what he has done in matches) and <b>Attributes</b> (what FM says he can do). A player who scores well on both is the strongest signal.</p>
  <button class="primary" data-act="guide">Back to the tool</button></header>

  <section><h3>1. Getting your data in</h3><ol>
    <li>In FM27, filter <b>Player Database</b> (or open your <b>Squad</b>) with your Scout Lab view and press <b>F7</b>. The plugin saves a CSV in <code>Documents › Sports Interactive › Football Manager 27 › FM27PlayerExport › Exports CSV</code>.</li>
    <li>Here, pick the position tab (GK to ST), click <b>+ Add export</b>, choose the file and the <b>role</b>, then <b>Load</b>.</li>
    <li>One file with attributes and stats fills both <b>Stats</b> and <b>Attributes</b>. Two separate files can be selected together.</li>
    <li>Uploads are saved in this browser only. Phone and PC each keep their own.</li></ol></section>

  <section><h3>2. Who a player is compared with</h3><ul>
    <li>Only the other players in the <b>same file</b> who have at least the <b>minimum minutes</b> (slider, 500 by default). A DM file and a CM file are separate scales.</li>
    <li>Under about 30 players the page warns that rankings are rough.</li></ul></section>

  <section><h3>3. The Stats score (0–100, 50 = pool average)</h3><ol>
    <li><b>League strength.</b> Each stat is adjusted by how strong his league is (Premier League = 1.00). Volume stats are multiplied by it, "lower is better" stats divided by it, and percentages and running only half-adjusted. Switch it off with the tick box to compare.</li>
    <li><b>Percentile.</b> Each stat becomes a percentile in the pool: 90 = better than 90% of them. For "lower is better" stats (possession lost, headers lost, errors, cards) it is flipped, so high is still good.</li>
    <li><b>Tier weights by position.</b> Tier 1 ×3, Tier 2 ×2, Tier 3 ×1, Tier 4 ×0.5. Tier 1 = the stats that most directly create or prevent goals for that position (table below).</li>
    <li><b>Role tilt.</b> The role you pick multiplies stats in its main areas by up to ×1.6 and the rest down to ×0.4. "Balanced" uses the pure tiers.</li>
    <li><b>Weighted average</b> of the percentiles gives the raw score.</li>
    <li><b>Easing toward 50.</b> Under ~1,350 minutes the score is pulled toward 50 (less evidence). Players in leagues FM doesn't track in detail (yellow <b>Basic stats</b> tag) are judged only on goals, xG, xA and shots, and eased further. The panel always shows the unadjusted score.</li></ol>
    <div class="tscroll"><table class="gtable"><thead><tr><th>Position</th><th>Tier 1 (×3)</th><th>Tier 2 (×2)</th></tr></thead><tbody>${tierRows}</tbody></table></div>
    <p class="small muted">Full list with weights for the chosen role: open "How the score works" under the scatter on any tab.</p></section>

  <section><h3>4. The Attributes rating (out of 20)</h3><ul>
    <li>The role's <b>key attributes count ×3</b>, <b>preferred ×1.5</b> (FM26 role definitions, unchanged in FM27).</li>
    <li>Plus a baseline for what matters most in the FM27 match engine (fm-arena FM27 test): Acceleration, Pace, Jumping Reach, Work Rate, Stamina, Anticipation, Strength, Determination.</li>
    <li>Then scaled by FM27 importance: Pace and Acceleration ×1.5; Jumping Reach, Work Rate, Stamina ×1.35; Anticipation, Strength ×1.2; Balance, Long Shots ×0.75; Agility, Aggression, Composure ×0.6 (nerfed in FM27).</li>
    <li>Rating = weighted average of his attributes, out of 20. The attribute groups (Speed, Aerial, Defending…) are simple averages for "best for each need".</li></ul></section>

  <section><h3>5. Extras</h3><ul>
    <li><b>Goals</b> exclude penalties when the file has Goals and Pens S.</li>
    <li><b>Player type</b> (Poacher, Target man, Ball winner…) comes from the categories he ranks highest in. <b>All-rounder</b> = good almost everywhere.</li>
    <li><b>Fair value</b> = what a player of his score and age usually costs in this pool. <b>Bargain</b> = half that or less; <b>Pricey</b> = twice or more. It does not account for league, so cheap players from weaker leagues show as bargains. That is the Moneyball idea.</li>
    <li><b>Best roles</b> = the roles his output (Stats) or attributes fit best.</li></ul></section>

  <section><h3>6. Reading the main page</h3><ol>
    <li><b>Filters</b>: minutes, max age, search, league adjustment, player type.</li>
    <li><b>Free agents only</b>: just the players with no club (signable without a fee). Free agents are always in the Attributes tabs, whoever the tabs hold; in Stats they need minutes this season like everyone. All data has the same button.</li>
    <li><b>Attribute filters</b>: pick an attribute, type the minimum (1–20) and press Add, e.g. Passing 13 and Pace 15; add as many as you like and tap a chip to remove it. They apply to every position tab, on Stats and Attributes (Stats uses the player's attributes from your save or attributes file). They narrow what is shown; rankings stay against the whole pool.</li>
    <li><b>Summary tiles</b>.</li>
    <li><b>Best overall</b>: top 5; the coloured bar shows what each score is made of.</li>
    <li><b>Best for each need</b>: top 5 per category (swipe on a phone).</li>
    <li><b>Best by budget and age</b>: under €1M, €1–5M, over €5M, U21, U23.</li>
    <li><b>Explore</b>: category chips, top-10 chart and a sortable colour table (blue = good, red = poor; "vs fair" = price against fair value).</li>
    <li><b>Scatter</b>: value against score. Top-left = <b>Bargains</b>; above the green line = cheap for his level; bigger dot = more minutes.</li>
    <li><b>How the score works</b>: every stat's tier, weight and how much it agrees with FM's match rating in this pool.</li></ol></section>

  <section><h3>7. The player panel (tap a name)</h3><ul>
    <li><b>Ability (CA / PA)</b> (from your save): his hidden current and potential ability, 1–200, and his room to grow. The position tables have CA and PA columns too (tap to sort).</li>
    <li><b>Positions</b> (from your save): FM's own rating for him at all 14 positions, on a pitch like FM's profile. Green = Natural (18–20), light green = Accomplished (15–17), yellow = Competent (12–14), orange = Unconvincing (9–11), red = Awkward (5–8), dark = Ineffective (1–4). Hover or tap a dot for the number. All data has the same numbers as a column group (Position ratings) you can filter.</li>
    <li><b>Role</b> (menu at the top, or tap a role chip): rescores him and his rank for that role <b>in the panel only</b>; the page keeps its role. "Back to …" returns to the page's role. The chips are his <b>best 3 roles in this position</b>, only from roles FM offers where he is listed; his best roles across every position he plays are in My squad › Roles.</li>
    <li><b>Tiles</b>: score, rank, fair value, minutes. <b>Gap</b> to the players above and below (under 1 point = a coin flip).</li>
    <li><b>Stands out / Weak spots</b>.</li>
    <li><b>Why he scores X</b>: each stat's plus or minus from the pool average of 50, plus any easing.</li>
    <li><b>Compare</b>: pick anyone or "vs #1" for head-to-head bars.</li>
    <li><b>Where he sits in the pool</b>: him against every player, per category.</li>
    <li><b>How to read him</b>: when both a stats and an attributes file are loaded, compares his output (stats percentile) with his ability (attributes percentile): strong on both, output ahead of ability (often a weaker league or team), ability ahead of output (wrong role, weak team, few minutes), or weak on both.</li>
    <li><b>Every stat</b>: real value per 90 with the season total under it, bar and percentile (right-hand number). Goals & assists also shows his goals (non-penalty), assists and minutes. Higher-is-better first, lower-is-better underneath.</li>
    <li>His score from the <b>other view</b> (Attributes or Stats), matched by Unique ID.</li></ul></section>

  <section><h3>8. My squad</h3><ol>
    <li>Click <b>My squad</b> at the top and load your Squad screen export (F7). Players are split into GK, FB, CB, DM, CM, AM, Wingers and ST from FM's <b>Position</b> column (M C = CM, AM C = AM). Someone listed as D (RLC) shows in both FB and CB.</li>
    <li>Each position is judged against the <b>scouting export loaded in that position's tab</b> (Stats and/or Attributes). Your players and that pool are scored together, so a 70 means he is better than 70% of the players you scouted there.</li>
    <li><b>vs pool</b> = the stats percentile and the attributes percentile averaged. The stats part counts less when he has few minutes, the same easing as the score.</li>
    <li><b>Formation & roles</b> (Overview): pick a formation, then set each slot's position (D L, WB R, DM, AM C…) and in-possession role, like FM's tactic screen. The best XI is picked from your squad for exactly those roles: every player is scored in every slot he can play, and the 11 are chosen together so the total fit is highest, with nobody used twice. Pick by attributes + stats (default), attributes only (closest to FM's stars) or stats only. Your shape and roles are remembered per formation.</li>
    <li><b>Roles tab</b>: the top 5 players by attributes with their best role, the top 5 per position, then the squad role map.</li>
    <li><b>Squad role map</b> (Roles tab): every player with his best 3 roles by attributes, only from the positions FM lists for him, plus his best role in each of those positions. Youth players with no minutes are hidden until you tap Show.</li>
    <li><b>Overview</b> also has a row per position (starters, cover, age, best stats score, best attribute rating, verdict) and where to strengthen first. It works for any club: load that club's Squad export.</li>
    <li><b>Position tabs</b>: your best player and why (what drives his score, what stands out, weak spots, next best), all your players ranked, depth, and <b>who would improve it</b> from your scouting file, with the ones that cost no more than him.</li>
    <li>Verdict uses your weakest starter: 70+ Strong, 50–70 Solid, 30–50 Could upgrade, under 30 Priority upgrade. No scouting file for a position = only ranked inside your squad.</li></ol></section>

  <section><h3>8b. Tactic tab (suggested tactic)</h3><ol>
    <li><b>Formation</b>: all 18 shapes are tried. In each, every slot is filled by the player whose best role there (attributes, out of 20) is highest, the 11 are picked together, and the shape is scored 75% starting XI + 25% cover (the next man per slot) + a bonus for each of your 8 best players who starts. Players only listed next door (LB for LWB, CM for AM) can fill a slot at a small cost; a D C can play the wide centre-back slot of a back three.</li>
    <li><b>Style</b>: Auto compares the XI's technique (control possession), pressing attributes (high press) and attackers' pace and movement (counter-attack) with the XI's own average. Override it with the Style menu, limit to a back four or three, or pick any formation.</li>
    <li><b>Roles in possession</b>: each player's best role, then adjusted so roles work as partnerships (Mastering FM26): one ball-player and one stayer at centre-back, one wide and one inside player per flank, no more than one playmaker per line, a holding midfielder when there is no DM, a runner plus a link up front, and enough players behind the ball (rest defence). Every change shows what it costs.</li>
    <li><b>Roles out of possession</b> (FM26 roles reference): chosen by each role's key attributes (e.g. Stopping CB = Aggression, Tackling, Strength; Covering CB = Anticipation, Pace, Marking) and by the shape: one stopper and one cover, the side with an attacking full-back tracks back, at most two players stay high as outlets.</li>
    <li><b>Team instructions</b>: the tactics board style presets as a base, then changed by your XI's attributes with the reason next to each (slow centre-backs = lower line and drop off; strong pressing attributes = press more; quick attackers = pass into space; aerial centre-backs = invite crosses). Tested findings are built in: slightly lower line over extremes, Get Stuck In, Invite Crosses, whipped crosses, discourage long shots, trigger press More Often but never the extreme. Bold = changed from FM's default; "Set these in FM" lists only the changes.</li>
    <li><b>Player instructions</b>: at most two per player, only for standout attributes. <b>Set pieces</b>: load the box if your centre-backs dominate in the air, otherwise short routines; best taker by Corners, Crossing and Technique.</li>
    <li><b>Plan B / Plan C</b>: same shapes, different risk: more cautious roles and less pressing to protect a lead; one more runner and more directness when chasing.</li>
    <li><b>Use in Formation & roles</b> copies the shape and roles to the Overview's best XI, where you can still change any slot.</li></ol></section>

  <section><h3>8c. Loading your FM save (no exports needed)</h3><ol>
    <li>Tap <b>Data</b> (top right), choose your career's <b>.fm</b> file and tap <b>Load save</b>. On a PC it is in <code>Documents › Sports Interactive › Football Manager 27 › games</code>; on a phone or tablet pick it from your cloud folder (OneDrive, Google Drive, Dropbox, iCloud). Save in FM first.</li>
    <li>Every player in the save is split by position into all seven tabs, in <b>Stats</b> and <b>Attributes</b>, with the same columns an export has. Your club is found in the save and fills <b>My squad</b>, and every position is compared with the save's players there.</li>
    <li>Stats are this season's numbers, <b>League only</b> (default) or <b>All competitions</b>; switch any time on the Data page or in All data. Attributes are the real values, scouted or not.</li>
    <li><b>Players in the tabs</b>: by default anyone who played this season. "Played this season, or 23 and under" adds young players and "Everyone in the save" adds the rest to the Attributes tabs (slower on big saves). All data always lists everyone.</li>
    <li><b>League strength</b>: a save doesn't name divisions. Scout Lab learns each club's Division and Based In from any export you load (now or later) and remembers them; clubs it hasn't seen get the default adjustment.</li>
    <li>The save is read in your browser and kept there until you load a newer one or remove it. Your exports stay too: each tab shows the save as its own file (green <b>Save</b> tag) next to them. On claude.ai it is also kept in your <b>cloud copy</b> (8f), so your other devices open it without the .fm file.</li>
    <li><b>Wipe all data</b> (Data page) removes the save, all exports, your squad and all settings from this browser.</li>
    <li>The reader is a JavaScript version of <b>fmsave</b> (open source, MIT) for FM26 and FM27 saves. A new FM patch can change the save layout; if a save stops loading, the message says so.</li></ol></section>

  <section><h3>8d. All data (every player, every number)</h3><ol>
    <li>Tap <b>All data</b> (top). Every player in your loaded save is in one table with every in-game number. It handles 200,000+ players: only the rows on screen are drawn.</li>
    <li><b>Columns</b> (the panel on the left; on a phone, tap Columns above the table): pick the <b>stat types</b> (General, Physical, Goalkeeping, Defending, Aerial, Discipline, Passing, Progressing, Creating, Crossing, Attacking; each is labelled above its columns), whether numbers show as <b>season totals</b>, <b>per 90</b> or <b>percentages</b>, and the player columns (info, attributes, hidden & personality). "None" then one type shows just that type.</li>
    <li><b>Scores</b>: each stat type starts with a <b>Score</b> (0–100): his percentile rank on that type's per-90s and percentages against everyone else in the save who played at least a quarter of a regular starter's minutes for the period (at least 300; the Score heading shows the exact number) (Goalkeeping: goalkeepers only; outfield types: outfield players only). 100 = best in the save, 50 = the middle. Hover the Score heading for exactly which stats and weights it uses. Ticking or unticking stat types <b>ranks the table best to worst</b> on them: one type = that type's score, several = the <b>Overall</b> score (their average), shown next to his name. Use the position tabs at the top to rank within a position.</li>
    <li>Headings are abbreviated (xG, KP, Tck W…). <b>Hover a heading</b> (on a phone, tap it) for the full name and a sentence or two on what it means.</li>
    <li><b>Headings</b> show the lowest and highest value in the save. Per 90s and percentages use players with 300+ minutes, so a 1-minute cameo doesn't set the record.</li>
    <li><b>Min / max</b> under each heading filters the table; fill one or both, on as many columns as you like (e.g. xG /90 min 0.35 + Age max 23 + Minutes min 900). Text columns take "contains". Position chips at the top narrow it to a tab's positions; the search box finds a player or club. <b>Clear filters</b> resets everything.</li>
    <li>Tap a <b>heading</b> to sort (tap again to flip). Tap a <b>player</b> to open his panel (role scores, every stat, season by season) over the table; All data stays put behind it. The panel's link opens him in his best position tab.</li>
    <li><b>Colours</b>: red = poor, yellow = average, green = good, judged for <b>his position</b> (from his best position). Per 90s, percentages and ratings are compared with what a regular player in that position does per 90 (coloured from 300+ minutes). Season totals are compared with what a regular starter has by this point of the season, so early in the season 4 xG can be green for a striker and by May it takes about 13. Fewer-is-better numbers (fouls, cards, possession lost, errors) are judged on his rate. Attributes: red 6 or less, green 15+.</li>
    <li>The exact numbers behind each colour, for every position, are in <b>How the colours work</b> under the table. Turn colours off with <b>Colours on/off</b>.</li></ol></section>

  <section><h3>8e. Past seasons and all-time</h3><ol>
    <li>FM keeps every finished season's stats inside the save, so nothing needs storing at the end of a season: load your latest save and every past season comes with it, one more each year.</li>
    <li><b>All data › Season</b>: <b>This season</b>, any past season (e.g. 2027/28), or <b>All-time</b> (every season added up, this one included). Past seasons and All-time list the players with stats in them; the Club column shows the club he played most of that season for. All-time adds a <b>Seasons</b> column. Colours, scores, filters and ranking all work on the season you pick: totals are judged against a regular starter for that period, per 90s against his position.</li>
    <li><b>League only / All competitions</b> works for past seasons too (All competitions = league + cups + continental).</li>
    <li><b>Player panel › Season by season</b>: every season he has in the save, newest first, with apps, minutes, goals, assists, xG, xA, key passes, progressive passes, dribbles, tackles, interceptions, headers and passing (per 90 and %), and his rating; goalkeepers get conceded, clean sheets, save % and xG prevented. All-time at the bottom. Cells are coloured for his position once a season has 300+ minutes.</li>
    <li><b>Compare players across seasons</b>: in All data type several names separated by commas in the search (e.g. "Haaland, Mbappe"), then pick a season or All-time.</li>
    <li>Lines from this season can be stored too: the part of the season a player spent at his earlier club before a move, and calendar-year leagues (e.g. Brazil, MLS, Scandinavia). They show as "… · earlier clubs & calendar leagues" in the Season picker and "(earlier)" in his panel, and count in All-time.</li>
    <li>Seasons from before your career (FM's own database history) can hold only apps, goals, assists and rating; the other stats count only from seasons that recorded them, and their per 90s use those seasons' minutes. A player who retires leaves the save, so his history goes with him.</li></ol></section>

  <section><h3>8f. Cloud copy (laptop, tablet, computer)</h3><ol>
    <li>On claude.ai, the save you load is also kept with Scout Lab online (Data page › <b>Cloud copy</b>). Open Scout Lab on any other device signed in to your account and it opens the same save, with every season, without the .fm file.</li>
    <li>Load a newer save on any device and it replaces the cloud copy; the others pick it up next time they open Scout Lab. "Save to the cloud automatically when I load a save" is on by default; untick it to upload only when you press <b>Save this save to the cloud</b>.</li>
    <li><b>Open the cloud save here</b> switches a device to the cloud copy; <b>Remove cloud copy</b> (tap twice) deletes it. Wipe all data clears this browser only, not the cloud.</li>
    <li>The cloud copy is packed and compressed (a 230,000-player save with 5 seasons is a few tens of MB). It works only in Scout Lab on claude.ai, not in a downloaded copy of the page. Only you (or people you make editors) can save to it; people you share Scout Lab with can open it.</li></ol></section>

  <section><h3>8g. Staff (every club's backroom staff, from your save)</h3><ol>
    <li>FM shows staff attributes as words (Good, Very Good, Elite…). The save keeps the number behind each word; Scout Lab reads it and shows it out of 20. Tick <b>Show FM's words</b> to see the words instead.</li>
    <li>22 attributes: <b>coaching</b> Attacking, Defending, Possession, Technical, Tactical, Fitness, Goalkeeping, Set pieces, Working with youngsters; <b>mental</b> Determination, Motivating, People management, Authority, Adaptability; <b>knowledge</b> Judging player ability and potential, Judging staff ability, Negotiating, Tactical knowledge; <b>medical and data</b> Physiotherapy, Sports science, Analysing data. Hover (phone: tap) a heading for what it means.</li>
    <li><b>How a job is rated</b> (out of 20): a weighted average where the job's main attribute counts ×3 and related attributes ×2. For coaches, <b>Motivating, Determination and Authority count ×2</b> (they drive how well a coach coaches whatever his speciality) and People management ×1, so people skills are about 40% of a coach's rating. The main attribute is only about a fifth of it, so an all-rounder beats a one-attribute specialist: a coach with Attacking 17, Technical 16 and Motivating 18 rates well above one with Attacking 20 and 8s elsewhere. Other jobs weigh people skills ×1. Each page prints its exact recipe.</li>
    <li><b>Tabs</b>: My staff · Assistant · Coaches (all-round, attacking, defending, possession, technical, tactical) · Fitness · GK coach · Set pieces · Youth (head of youth development, youth coach) · Medical (physio, head physio, sports scientist, head of sports science, doctor) · Scouts (scout, chief scout) · Analysts (performance, recruitment, head of analysis) · Directors (director of football, technical director) · Managers · All staff.</li>
    <li><b>Free agents</b> (unemployed staff) are in every list by default. <b>Who</b>: In this job + free agents (default) · In this job (at a club) · Free agents only · Any staff member. A free agent counts for a job when it is his usual job (the save stores one for most people: Unemployed · usually Manager, Physio…); with none stored, when it is one of his 2 best jobs by attributes. National-team staff (they hold a contract) and board members (each club lists its board) are not free agents.</li>
    <li>Each job page: <b>Rate them as</b> (the job's variants) and <b>Who</b>; filters for age, name or club (commas for several), hiding your club, and <b>attribute filters</b> (e.g. Attacking 15+); tiles; your people in that job with their rank; the 5 best; <b>Better than your best</b> (best upgrades, those on the same wage or less, those 40 or under, and free agents); the best for each part of the job; and a sortable colour table (top 50, or up to 1,000).</li>
    <li><b>My staff</b>: your best person for every key job, his rank among everyone in that job in the save, a verdict (top 10% Strong, top 30% Solid, top 60% Could upgrade, below that Priority upgrade) someone better for no more than 1.5× his wage, and the best free agent who beats him; then everyone at your club with every attribute and the job he'd rank highest in.</li>
    <li><b>The staff panel</b> (tap anyone): his rating and rank for the job, wage and contract, why he rates what he does (each attribute's share), the best jobs for him (judged against the people doing each job, so jobs compare fairly), all 22 attributes with FM's word, how he likes a team run (his preferences, 1–20: attacking, pressing, tempo…) and his personality. His hidden ability (CA/PA) is shown too.</li>
    <li><b>In-game words</b> (bottom of every staff page): the word FM shows for each number. They start as FM26's words as players measured them; change a word or a cut-off, add or remove one, or reset.</li>
    <li>Staff come from the save only (not exports): everyone working at a club, every club's board, and every unemployed member of staff. Job names are the save's own codes; a few were named from who holds them (fitness coach, set piece coach, chief scout, recruitment analyst, head of performance analysis, head of recruitment, doctor, owner, president). A save loaded before this version needs loading once more.</li></ol></section>

  <section><h3>9. League strength examples</h3><div class="tscroll"><table class="gtable narrow"><thead><tr><th>League</th><th class="num">Factor</th></tr></thead><tbody>${lg}</tbody></table></div>
    <p class="small muted">Each league gets a rating on the 0–100 league-strength scale from Opta Power Rankings (July 2026) and Global Football Rankings (November 2026), averaged where both rate it. European top flights also take 30% from the UEFA 5-year country coefficient (2021/22–2025/26). Smaller European leagues with no published rating use the UEFA coefficient plus an estimate; most of Asia, Africa, Central America and Oceania are estimates on the same scale. Lower divisions use their own published rating where there is one (Championship, LaLiga 2, Serie B, Liga Portugal 2, USL Championship…), otherwise a typical step down. Factor = how much of a Premier League stat it is worth: Championship ≈ 0.79, League One ≈ 0.69, League Two ≈ 0.63.</p></section>

  <section><h3>10. Roles per tab</h3><div class="tscroll"><table class="gtable"><tbody>${roleRows}</tbody></table></div>
    <p class="small muted">FM26 in-possession roles (unchanged in FM27). Attacking-midfield (AM C) roles have their own AM tab (Attacking Midfielder and Advanced Playmaker also appear under CM, as FM allows them at M C); wide-midfield roles sit under Wingers. "Balanced" = no role tilt.</p></section>

  <section><h3>11. Worth knowing</h3><ul>
    <li>League factors, stat tiers and role attribute lists are estimates. FM's match rating is used as a check, not the target, because it leans heavily on goals and assists.</li>
    <li>Stats show output so far and depend on his club's role and tactic; attributes don't. Look for players good on both.</li>
    <li>If FM squeezes a column (Auto size), the plugin still reads it. If a column is missing, check "Columns: … recognised" at the bottom of each tab.</li></ul></section>
  <section id="g-team"><h3>12. Analysing your team</h3>
    <p class="small muted">Judge over 5–10 games, not one. A printable version is in FM27-Team-Analysis-Guide.pdf.</p>
    <h4>Routine</h4><ul>
    <li><b>After every match:</b> score vs xG, shots on target, clear-cut chances for and against. Lucky or better? How did you concede?</li>
    <li><b>Every 5 games:</b> team numbers, each player's role numbers in the Data Hub, Squad export into My squad, change 1–2 things at most.</li>
    <li><b>Before every match:</b> scouting report, 1–2 role changes and opposition instructions, keep the formation.</li></ul>
    <h4>Team numbers</h4><div class="tscroll"><table class="gtable"><thead><tr><th>Number</th><th>Warning sign</th></tr></thead><tbody>
    <tr><td>xG for / against per game</td><td>xG against rising over 5 games</td></tr>
    <tr><td>Goals vs xG</td><td>Well above = lucky, will drop · well below = poor finishing or poor chances</td></tr>
    <tr><td>Conceded vs xG against</td><td>Well above = check the keeper</td></tr>
    <tr><td>Clear-cut chances for / against</td><td>More against than for</td></tr>
    <tr><td>How and when you concede</td><td>One type keeps repeating (set pieces, crosses, counters) · late goals = fitness, subs, mentality</td></tr>
    <tr><td>Possession lost in own half</td><td>High = tempo too high or passers not good enough</td></tr></tbody></table></div>
    <h4>Lucky or good?</h4><div class="tscroll"><table class="gtable narrow"><thead><tr><th>Results</th><th>xG diff.</th><th>Read it as</th></tr></thead><tbody>
    <tr><td>Good</td><td>Positive</td><td>Genuinely good: change nothing</td></tr><tr><td>Good</td><td>Negative</td><td>Lucky: expect a dip</td></tr>
    <tr><td>Bad</td><td>Positive</td><td>Unlucky: keep the plan</td></tr><tr><td>Bad</td><td>Negative</td><td>Genuinely poor: change roles, one at a time</td></tr></tbody></table></div>
    <h4>Per position (depends on the role)</h4><div class="tscroll"><table class="gtable"><tbody>
    <tr><th>GK</th><td>xG prevented/90 (main one), save %, errors; pass % if ball-playing. Clean sheets are a team stat.</td></tr>
    <tr><th>FB</th><td>Attacking (WB, AWB): progressive passes, open-play crosses, xA, dribbles, sprints · defensive (FB): tackle %, interceptions, headers lost · inverted: pass %, progressive passes.</td></tr>
    <tr><th>CB</th><td>Header %, interceptions, blocks, clearances, errors · Ball-Playing CB: + progressive passes · Wide CB: + carries.</td></tr>
    <tr><th>DM</th><td>Possession won, interceptions, tackles, low possession lost · DLP: + progressive passes · Box-to-Box (BBM/BBP, picked from DM in FM27): distance, pressures, tackles + late box arrivals.</td></tr>
    <tr><th>CM</th><td>Central Midfielder: pass %, progressive passes, tackles · playmakers (MP, AP): key passes, xA, progressive passes · Channel Midfielder: xA, runs into the channel.</td></tr>
    <tr><th>AM</th><td>Attacking midfielders (AM C): xA and non-penalty xG first, then open-play key passes, clear-cut chances, progressive passes, goals and assists; dribbles, shots and ball retention after. Compared only with other AM Cs. Attacking Midfielder / Second Striker: more weight on goals · Advanced Playmaker: more on progressive passes and keeping the ball.</td></tr>
    <tr><th>Wingers</th><td>Dribbles, xA, key passes, progressive carries · Winger: crosses · Inside Forward: shots, xG.</td></tr>
    <tr><th>ST</th><td>Non-penalty xG/90, shots on target, goals vs xG · link roles (DLF, F9, SS): xA, key passes · Target Forward: headers won.</td></tr></tbody></table></div>
    <p class="small muted">Average rating is a check only: it leans on goals and assists.</p>
    <h4>Using Scout Lab for it</h4><ul>
    <li><b>Strong on both:</b> keep · <b>Output ahead of ability:</b> enjoy it, expect a drop against stronger teams · <b>Ability ahead of output:</b> change his role or partner before selling · <b>Weak on both:</b> replace.</li>
    <li>vs pool under 30 in My squad = priority upgrade for that position.</li></ul>
    <h4>Are the roles working together?</h4><ul>
    <li><b>Pass combinations:</b> do the planned partners find each other (FB → winger, DM → playmaker, striker → striker)?</li>
    <li><b>Average positions</b> with and without the ball: big gaps between lines? Two players in one zone?</li>
    <li><b>Each flank:</b> one player wide, one inside. <b>Striker pair:</b> one runner, one link player.</li>
    <li><b>Role job:</b> a Winger should cross, an Inside Forward should shoot. <b>Rest defence:</b> 3–4 players behind the ball when you attack.</li></ul>
    <div class="tscroll"><table class="gtable"><thead><tr><th>You see</th><th>Try first</th></tr></thead><tbody>
    <tr><td>Constant turnovers</td><td>Lower tempo one step, or simpler roles</td></tr>
    <tr><td>Striker isolated</td><td>Link role next to him (DLF/SS), or an AM</td></tr>
    <tr><td>Crowded midfield</td><td>One playmaker only; the others Central Midfielder or a DM role</td></tr>
    <tr><td>Empty wing</td><td>One Winger, or the full-back overlaps</td></tr>
    <tr><td>Exposed after losing the ball</td><td>One full-back stays deeper, or a holding DM</td></tr>
    <tr><td>Conceding counters</td><td>One fewer attacking role, Regroup</td></tr>
    <tr><td>Many shots, little xG</td><td>Work Ball Into Box, discourage long shots</td></tr></tbody></table></div>
    <h4>Adapting to the opponent (roles, not formation)</h4>
    <div class="tscroll"><table class="gtable"><thead><tr><th>If they have / do…</th><th>Change</th></tr></thead><tbody>
    <tr><td>A dangerous playmaker</td><td>Tight Mark or Trigger Press on him, or a holding DM to screen</td></tr>
    <tr><td>Fast wingers / attacking full-backs</td><td>Full-Back instead of Wing-Back; Wide Midfielder instead of Winger on that side</td></tr>
    <tr><td>A high press</td><td>More direct, bypass the press, Channel Forward in behind</td></tr>
    <tr><td>A deep block</td><td>Lower tempo, more width, early/whipped crosses, AP or Second Striker between the lines</td></tr>
    <tr><td>Three central midfielders</td><td>One striker as DLF/Second Striker dropping in; wide mids narrower</td></tr>
    <tr><td>A weak full-back</td><td>Overload that flank: Winger + overlapping full-back</td></tr>
    <tr><td>Slow centre-backs</td><td>Pass Into Space, Channel Forward, Counter-Attack</td></tr>
    <tr><td>Strength in the air</td><td>Low and early crosses instead of high ones</td></tr></tbody></table></div>
    <p class="small muted">Positive when you're the favourite, Balanced or Cautious when you're the underdog. Keep 2–3 familiar versions of one tactic (normal, protect a lead, chase a goal). Change one or two things and check the next games.</p></section>

  <p><button class="primary" data-act="guide">Back to the tool</button></p>
</article>`;
}
function renderSaveNote() { const n = $("#savenote"); if (!n) return; n.textContent = typeof CLOUD !== "undefined" && CLOUD.state === "busy" ? CLOUD.msg + " (" + Math.round(CLOUD.pct) + "%)" : SAVE && SAVE.fromCloud ? "Save opened from your cloud" : S.saved ? "Exports are saved in this browser" : "Couldn't save in this browser; exports last until you close the page"; }

