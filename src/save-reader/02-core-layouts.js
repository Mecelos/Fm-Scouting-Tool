// FM save reader for Scout Lab: the parts of fmsave (MIT, Randal S. Olson, github.com/rhiever/fmsave)
// that Scout Lab needs, ported to JavaScript so a save can be read in any browser, phone included.
// Container: 26-byte header + Zstandard frames + a zstd trailer listing the named frames.
// game_db: name pools, club table, player records (+ person blocks); span region: season statistics.
// Layouts: FM27 build 27.0.0+2486695 (fmsave's registered build) and FM26 26.3.x.
// Needs fzstd (MIT, github.com/101arrowz/fzstd) as global `fzstd`.
(function (G) {
  "use strict";
  const MISSING = 0xFFFFFFFF;
  const td = new TextDecoder("utf-8", { fatal: true });
  const tdLoose = new TextDecoder("utf-8");
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const i16 = (b, o) => { const v = u16(b, o); return v & 0x8000 ? v - 0x10000 : v; };
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const u64 = (b, o) => u32(b, o) + u32(b, o + 4) * 4294967296;
  const fail = (msg, kind) => { const e = new Error(msg); e.kind = kind || "corrupt"; throw e; };
  function find(b, needle, from, to) {
    // first index i in [from, to - needle.length] where needle matches; scans for its least common-looking byte
    const n = needle.length, end = Math.min(to == null ? b.length : to, b.length) - n;
    let piv = 0; for (let k = 0; k < n; k++) { const v = needle[k]; if (v !== 0 && v !== 1 && v !== 255) { piv = k; break; } }
    const pv = needle[piv];
    let i = Math.max(0, from | 0);
    while (i <= end) {
      const j = b.indexOf(pv, i + piv);
      if (j < 0) return -1;
      i = j - piv;
      if (i > end) return -1;
      let k = 0; while (k < n && b[i + k] === needle[k]) k++;
      if (k === n) return i;
      i++;
    }
    return -1;
  }
  const bytes = (...a) => Uint8Array.from(a);
  const ascii = s => Uint8Array.from(s, c => c.charCodeAt(0));
  const p32 = v => bytes(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255);
  function str(b, s, e, loose) { try { return (loose ? tdLoose : td).decode(b.subarray(s, e)); } catch (_) { return null; } }
  function lpString(b, o, max) { // u32 length + UTF-8
    if (o + 4 > b.length) fail("string runs past its section");
    const n = u32(b, o); if (n > max || o + 4 + n > b.length) fail("string too long");
    return [str(b, o + 4, o + 4 + n, true), o + 4 + n];
  }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function decodeDate(b, o) {
    if (o < 0 || o + 4 > b.length) return null;
    const packed = u16(b, o), year = u16(b, o + 2), doy = packed & 0x1FF;
    if (year < 1901 || year > 2200) return null;
    if (doy < 1 || doy > (isLeap(year) ? 366 : 365)) return null;
    const d = new Date(Date.UTC(year, 0, 1)); d.setUTCDate(doy);
    return { y: year, m: d.getUTCMonth() + 1, d: d.getUTCDate(), iso: d.toISOString().slice(0, 10) };
  }

  // ---------- layouts ----------
  const POSITION_CODES = ["GK", "SW", "DL", "DC", "DR", "DM", "ML", "MC", "MR", "AML", "AMC", "AMR", "STC", "WBL", "WBR"];
  const ATTRIBUTE_ORDER = ["crossing", "dribbling", "finishing", "heading", "long_shots", "marking", "off_the_ball", "passing", "penalty_taking", "tackling", "vision", "handling", "aerial_reach", "command_of_area", "communication", "kicking", "throwing", "anticipation", "decisions", "one_on_ones", "positioning", "reflexes", "first_touch", "technique", "flair", "corners", "teamwork", "work_rate", "long_throws", "eccentricity", "rushing_out", "punching", "acceleration", "free_kick_taking", "strength", "stamina", "pace", "jumping_reach", "leadership", "dirtiness", "balance", "bravery", "consistency", "aggression", "agility", "important_matches", "injury_proneness", "versatility", "natural_fitness", "determination", "composure", "concentration"];
  const PERSONALITY_ORDER = ["adaptability", "ambition", "loyalty", "pressure", "professionalism", "sportsmanship", "temperament", "controversy"];
  const PLAYER = { marker: bytes(0x01, 0x00, 0x6c, 0x07), markerOffset: 102, pindex: -19, uid: -15, uidCopy: -11, allocatedUidMin: 2000000000, kind: -7, kinds: [2, 3],
    homeRep: -6, curRep: -4, worldRep: -2, ca: 0, caRange: [0, 200], pa: 2, paRange: [-10, 200], repBucket: 8, repBucketRange: [0, 200], teamId: 16,
    ratings: 24, ratingsCount: 15, ratingRange: [1, 20], attrs: 39, attrCount: 54, attrRange: [1, 100], editedAbilityMax: 255, editedAttrMax: 125,
    leftFoot: 24, rightFoot: 25, transferValue: 93, valuePlaceholder: 300000000, joinDate: 98, height: 121, decodeExtent: 122, personWindowStart: 100 };
  const PERSON_FM26 = { personality: 21, personalityCount: 8, personalityRange: [1, 20], dateZero: 14, dateZeroCount: 7, legalMin: 2, legalMax: 80, nameIdLimit: 1 << 23,
    legalNameFromBlock: 19, traitBitsFromBlock: -8, nation: 13, unique: false };
  const PERSON_FM27 = { ...PERSON_FM26, personality: 22, dateZero: 15, nation: 14, unique: true };
  const NAME_POOLS = { signature: [46421, 0, 1024, 256, 2048, 0], maxName: 1024, maxScale: 1024, unchecked: [5, 6, 7, 8] };
  const CLUB_RECORDS = { anchor: bytes(255, 255, 255, 255), anchorOffset: 17, clubIndex: 0, uid: 4, uidCopy: 8, zeroByte: 12, nation: 13, faNation: 21, nationCopy: 25, city: 29, longName: 39, nationRange: [0, 999], maxName: 255, stopGap: 64 * 1024 };
  const step = (count, lead) => ({ count, lead });
  const CLUB_TABLE_FM26 = { headerBytes: 5, countRange: [1, 200000], ordinary: 0, extended: 12, extendedPrefix: 4, prefix: 26, maxName: 16384,
    afterNames: [step(0, 8), step(1, 4)], baseFinanceTag: 0, fullFinanceTag: 1, emptyFinanceTag: 2, baseFinanceBytes: 45,
    fullFinance: [step(0, 70), ...[0, 1, 2, 3].flatMap(() => [step(0, 235), step(1, 8), step(1, 8)]), step(0, 67), step(1, 230), step(4, 49), step(0, 71), step(1, 19), step(0, 67)],
    afterFinance: [step(1, 25), step(1, 12), step(0, 9), step(1, 4), step(1, 4), step(1, 4), step(1, 4), step(1, 4), step(1, 16), step(2, 28)], maxEntries: 100000 };
  const CLUB_TABLE_FM27 = { ...CLUB_TABLE_FM26, fullFinance: [step(0, 66), ...CLUB_TABLE_FM26.fullFinance.slice(1)],
    afterFinance: CLUB_TABLE_FM26.afterFinance.map((s, i) => (i === 5 || i === 6 || i === 7) ? step(2, s.lead) : s) };
  const TEAM_LISTS = { nullTriple: Uint8Array.from([1, 0, 0x6c, 7, 1, 0, 0x6c, 7, 1, 0, 0x6c, 7]), floatAnchor: bytes(0, 0, 0x80, 0x3f), floatAnchorOffset: 33, minFloatAnchor: 40,
    countsOffset: 37, firstEntry: 25, firstLead: 2, secondEntry: 12, secondLead: 1, filler: 9, teamCountRange: [1, 8], teamIdRange: [1, 3000000], affiliateMax: 8 };
  const SEASON_FIELDS = [["minutes", 4, "H", 1], ["starts", 6, "B", 1], ["substitute_appearances", 7, "B", 1], ["rated_appearances", 8, "B", 1], ["goals", 9, "B", 1], ["assists", 10, "B", 1],
    ["goals_allowed", 11, "B", 1], ["penalties_taken", 12, "B", 1], ["penalties_scored", 13, "B", 1], ["player_of_the_match", 14, "B", 1], ["red_cards", 15, "B", 1], ["yellow_cards", 16, "B", 1],
    ["clean_sheets", 17, "B", 1], ["passes_attempted", 27, "H", 1], ["passes_completed", 29, "H", 1], ["tackles_attempted", 31, "H", 1], ["tackles_completed", 33, "H", 1], ["dribbles", 39, "H", 1],
    ["fouls_made", 41, "H", 1], ["fouls_against", 43, "H", 1], ["shots", 45, "H", 1], ["shots_on_target", 47, "H", 1], ["mistakes_leading_to_goal", 59, "H", 1], ["distance_km", 65, "H", 10],
    ["offsides", 67, "H", 1], ["key_passes", 73, "H", 1], ["key_tackles", 75, "H", 1], ["key_headers", 77, "H", 1], ["interceptions", 79, "H", 1], ["clear_cut_chances_created", 81, "H", 1],
    ["possession_lost", 87, "H", 1], ["possession_won", 89, "H", 1], ["expected_goals", 91, "H", 100], ["expected_assists", 93, "H", 100], ["free_kick_shots", 99, "H", 1],
    ["open_play_crosses_attempted", 109, "H", 1], ["shots_outside_box", 111, "H", 1], ["expected_goals_prevented", 113, "h", 100], ["high_intensity_sprints", 115, "H", 1],
    ["progressive_passes", 119, "H", 1], ["pressures_attempted", 121, "H", 1], ["pressures_completed", 123, "H", 1], ["open_play_key_passes", 125, "H", 1],
    ["non_penalty_expected_goals", 127, "H", 100], ["crosses_attempted", 131, "H", 1], ["crosses_completed", 133, "H", 1], ["shots_blocked", 135, "H", 1]];
  const SEASON_OUTFIELD = [["aerial_challenges_attempted", 35, "H", 1], ["headers_won", 37, "H", 1], ["open_play_crosses_completed", 71, "H", 1], ["blocks", 83, "H", 1], ["clearances", 95, "H", 1]];
  const SEASON_GK = [["saves_held", 35, "H", 1], ["saves_parried", 37, "H", 1], ["saves_tipped", 69, "H", 1], ["shots_on_target_faced", 83, "H", 1]];
  const SEASON_FM26 = { schema: 15, headerBytes: 16, ownSlots: 8, otherSlots: 6, lineBytes: 139, lineMarker: bytes(1, 6), blockBytes: 20, otherLead: 1, maxOther: 16, ratingItem: 8, maxRatingItems: 256,
    formEntry: 3, maxForm: 16, footer: 16, ratingSum: 2, rated: 8, ratingScale: 10, unsupported: ["goals_outside_box"],
    slotKinds: ["non_competitive", "league", "cup", "continental", "international", "overall", "calendar_year_overall", "calendar_year_international"] };
  const SEASON_FM27 = { ...SEASON_FM26, lineMarker: bytes(1, 7), lineBytes: 155, unsupported: ["goals_outside_box", "pressures_attempted", "pressures_completed"] };
  // archived seasons: one unit per player, team, season and competition type (fmsave season_history)
  const HISTORY = { section: "player_stats_hist_dt", indexHeader: ascii("\x03\x01tad.\x04\x00"), selectorFromBlock: -21,
    kindNames: ["non_competitive", "league", "cup", "continental", "international"] };
  const HISTORY_FM26 = { ...HISTORY, archiveHeader: ascii("\x03\x01tmc.\x06\x00"), unitBytes: 152, footer: bytes(6, 0) };
  const HISTORY_FM27 = { ...HISTORY, archiveHeader: ascii("\x03\x01tmc.\x07\x00"), unitBytes: 168, footer: bytes(7, 0) };
  const HIST_ROW = 140;   // a rebuilt season line (the first 140 bytes hold every field)
  const GAME_INFO_FM26 = { dbVersionLen: 8, dbVersionMax: 64, dateAfter: 172, filenameCountAfter: 165 };
  const GAME_INFO_FM27 = { dbVersionLen: 8, dbVersionMax: 64, dateAfter: 174, filenameCountAfter: 167 };
  const SPAN_REGION = "unlisted_after_non_pl_hist_ls";

