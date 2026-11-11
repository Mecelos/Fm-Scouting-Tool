/* ===== League strength (hidden) =====
   Every league gets a rating on the 0-100 league-strength scale used by Opta Power Rankings and Global Football Rankings
   (Premier League ~ 91.5). Sources, blended:
     - Opta Power Rankings, league average team rating (Jul 2026, top 50 leagues incl. some second tiers)
     - Global Football Rankings league ratings (2 Nov 2026, 106 leagues incl. many second/third tiers)
     - UEFA 5-year association coefficients 2021/22-2025/26: 30% of a European top flight's rating, and half of the rating
       for European leagues that have no published rating (the other half is an estimate)
     - estimates on the same scale for leagues with no published rating (Asia, Africa, CONCACAF, Oceania)
   factor k = exp(-0.022 x (91.5 - rating)): Premier League 1.00, Championship ~0.79, League One ~0.69, League Two ~0.63.
   Applied to stats before percentiles: volume per-90 x k, "lower is better" / k, success rates and running x (0.5 + 0.5k).
   Attributes are not adjusted (they are absolute in FM). */
const LEAGUE_RATING = {
  "England": 91.5, "Spain": 85.7, "Germany": 85.6, "Italy": 85.1, "France": 84.4, "Brazil": 83.5, "Belgium": 82.3,
  "Portugal": 81.8, "Argentina": 81.7, "Netherlands": 80.7, "Türkiye": 79.8, "Norway": 79.7, "Mexico": 79.6, "Poland": 79.5,
  "United States": 79.5, "Colombia": 79.4, "Czechia": 79.2, "Ecuador": 79.2, "Denmark": 79.2, "Greece": 78.8, "Switzerland": 78.5,
  "Austria": 78.3, "Chile": 78.1, "Croatia": 78.0, "Paraguay": 77.9, "Cyprus": 77.5, "Japan": 77.5, "Uruguay": 77.3,
  "Sweden": 76.9, "Russia": 76.9, "Hungary": 76.7, "South Korea": 76.4, "Scotland": 76.2, "Azerbaijan": 75.8, "Israel": 75.7,
  "Peru": 75.6, "Saudi Arabia": 75.5, "Ukraine": 75.5, "Morocco": 75.5, "Bulgaria": 75.3, "Romania": 75.2, "Egypt": 75.2,
  "Serbia": 75.1, "Costa Rica": 74.8, "Slovenia": 74.8, "Bolivia": 74.8, "Venezuela": 74.7, "Algeria": 74.7, "Slovakia": 74.6,
  "South Africa": 74.1, "Honduras": 74.1, "Iran": 74.0, "UAE": 73.6, "Australia": 73.1, "Bosnia & Herzegovina": 73.0, "Finland": 73.0,
  "Qatar": 72.2, "Ireland": 71.9, "Tunisia": 71.0, "Kazakhstan": 70.7, "Latvia": 70.5, "Iceland": 70.2, "Georgia": 70.1,
  "Guatemala": 70.0, "China PR": 69.7, "Armenia": 69.5, "Kosovo": 69.2, "Panama": 69.0, "Canada": 68.6, "Moldova": 68.4,
  "Albania": 67.6, "Uzbekistan": 67.0, "El Salvador": 67.0, "Belarus": 67.0, "Estonia": 66.6, "North Macedonia": 66.5, "Lithuania": 66.5,
  "Faroe Islands": 66.2, "Thailand": 66.0, "Tanzania": 66.0, "Montenegro": 66.0, "Northern Ireland": 65.8, "Malta": 65.4, "India": 65.0,
  "Iraq": 65.0, "DR Congo": 65.0, "Jordan": 64.0, "Ivory Coast": 64.0, "Luxembourg": 63.5, "Indonesia": 63.0, "Senegal": 63.0,
  "Nigeria": 63.0, "Ghana": 63.0, "Angola": 63.0, "Jamaica": 63.0, "Wales": 62.5, "Malaysia": 62.0, "Vietnam": 62.0,
  "Zambia": 62.0, "Libya": 62.0, "Sudan": 62.0, "Kuwait": 61.0, "Bahrain": 61.0, "Cameroon": 61.0, "Mali": 61.0,
  "Trinidad & Tobago": 61.0, "Andorra": 60.6, "Gibraltar": 60.2, "Oman": 60.0, "Kenya": 60.0, "Guinea": 60.0, "Nicaragua": 60.0,
  "New Zealand": 60.0, "Uganda": 59.0, "Zimbabwe": 59.0, "Burkina Faso": 59.0, "Haiti": 59.0, "Lebanon": 58.0, "Syria": 58.0,
  "Tajikistan": 58.0, "Ethiopia": 58.0, "Benin": 58.0, "Rwanda": 58.0, "Dominican Republic": 58.0, "Palestine": 57.0, "Hong Kong": 57.0,
  "Turkmenistan": 57.0, "Kyrgyzstan": 57.0, "Togo": 57.0, "Mozambique": 57.0, "Gabon": 57.0, "Congo": 57.0, "Singapore": 56.0,
  "Malawi": 56.0, "Namibia": 56.0, "Botswana": 56.0, "Mauritania": 56.0, "Cape Verde": 56.0, "Suriname": 56.0, "Cambodia": 55.0,
  "Myanmar": 55.0, "Madagascar": 55.0, "Puerto Rico": 55.0, "Cuba": 55.0, "Philippines": 54.0, "Niger": 54.0, "Burundi": 54.0,
  "Martinique": 54.0, "Guadeloupe": 54.0, "San Marino": 53.9, "Sierra Leone": 53.0, "The Gambia": 53.0, "Eq. Guinea": 52.0, "Liberia": 52.0,
  "Eswatini": 52.0, "Fiji": 52.0, "Tahiti": 52.0, "Laos": 50.0, "Chad": 50.0, "Guinea-Bissau": 50.0, "South Sudan": 50.0,
  "Zanzibar": 50.0, "Mauritius": 50.0, "Barbados": 50.0, "New Caledonia": 50.0, "Solomon Islands": 50.0, "Somalia": 48.0, "Bhutan": 45.0,
  "Bahamas": 45.0,
};
const DIV_RATING = {
  "England|2": 80.8, "Spain|2": 78.7, "Germany|2": 78.1, "Italy|2": 75.4, "France|2": 75.4, "Portugal|2": 75.0,
  "England|3": 74.9, "Argentina|2": 74.9, "Chile|2": 74.3, "Colombia|2": 73.1, "Ecuador|2": 73.0, "Brazil|2": 72.9,
  "Belgium|2": 72.1, "Switzerland|2": 72.1, "Russia|2": 71.1, "England|4": 70.5, "Paraguay|2": 70.5, "Czechia|2": 70.2,
  "Netherlands|2": 69.6, "Portugal|3": 69.4, "Peru|2": 69.4, "Austria|2": 69.1, "United States|2": 69.1, "Uruguay|2": 69.0,
  "South Korea|2": 68.9, "Israel|2": 68.6, "Venezuela|2": 67.5, "Scotland|2": 67.2, "Romania|2": 66.4, "Saudi Arabia|2": 66.4,
  "Serbia|2": 65.5, "Qatar|2": 65.0, "Belgium|3": 64.5, "Cyprus|2": 64.5, "Finland|2": 63.4, "England|5": 63.0,
  "Slovenia|2": 63.0, "Ukraine|2": 62.0, "Bosnia & Herzegovina|2": 61.0, "Georgia|2": 60.5, "Scotland|3": 60.2, "UAE|2": 59.4,
  "Latvia|2": 53.2,
};
const PL_RATING = 91.5, K_SLOPE = 0.022, DEFAULT_RATING = 56;
// rating points below the country's top flight when a division has no published rating (median of the published lists)
const TIER_GAP = [0, 0, 9, 16, 21, 27, 32, 36, 40, 43, 46];
const COUNTRY_ALIAS = {
  "Turkey": "Türkiye", "Czech Republic": "Czechia", "U.S.A.": "United States", "USA": "United States", "China": "China PR",
  "Korea Republic": "South Korea", "Republic of Ireland": "Ireland", "N.Ireland": "Northern Ireland", "U.A.E.": "UAE", "United Arab Emirates": "UAE",
  "Bosnia and Herzegovina": "Bosnia & Herzegovina", "Bosnia-Herzegovina": "Bosnia & Herzegovina", "Côte d'Ivoire": "Ivory Coast", "Cote d'Ivoire": "Ivory Coast",
  "Congo DR": "DR Congo", "Hong Kong (China PR)": "Hong Kong", "Kyrgyz Republic": "Kyrgyzstan", "Cabo Verde": "Cape Verde", "Gambia": "The Gambia",
  "Holland": "Netherlands", "Trinidad and Tobago": "Trinidad & Tobago", "Equatorial Guinea": "Eq. Guinea",
};
// FM shows these top flights with lower-league-sounding names (e.g. "Régionale 1", "Division d'Honneur")
const TOP_ONLY = new Set(["Martinique", "Guadeloupe", "New Caledonia", "Tahiti", "Zanzibar", "Chad", "Guinea-Bissau", "Solomon Islands", "Fiji"]);

// countries whose top flight FM calls "First Division"
const FIRST_IS_TOP = new Set(["Mexico", "Colombia", "Spain", "Chile", "Uruguay", "Czechia", "Slovakia", "Cyprus", "Andorra", "Brazil", "Togo",
  "Peru", "Bolivia", "Ecuador", "Paraguay", "Costa Rica", "Belgium", "Hungary", "The Gambia"]);

// explicit tiers: "Country|Division" -> tier (FM names and real names)
const LEAGUE_TIER = {
  "England|Premier League": 1, "England|Sky Bet Championship": 2, "England|Sky Bet League One": 3, "England|Sky Bet League Two": 4,
  "England|Enterprise National": 5, "England|Enterprise North": 6, "England|Enterprise South": 6,
  "England|EFL Championship": 2, "England|EFL League One": 3, "England|EFL League Two": 4, "England|National League": 5,
  "England|National League North": 6, "England|National League South": 6,
  "Spain|First Division": 1, "Spain|Second Division": 2, "Spain|Spanish Federation 1A": 3, "Spain|Spanish Federation 1B": 3, "Spain|LaLiga": 1, "Spain|LaLiga 2": 2,
  "Germany|Bundesliga": 1, "Germany|Bundesliga 2": 2, "Germany|2. Bundesliga": 2, "Germany|3. Liga": 3,
  "Italy|Serie A": 1, "Italy|Serie BKT": 2, "Italy|Serie B": 2,
  "France|Ligue 1": 1, "France|Ligue 2 BKT": 2, "France|Ligue 2": 2, "France|Ligue 3": 3, "France|National - A": 3, "France|National - B": 3,
  "Scotland|William Hill Premiership": 1, "Scotland|William Hill Championship": 2, "Scotland|William Hill League 1": 3, "Scotland|William Hill League 2": 4,
  "Scotland|Scottish Premiership": 1, "Scotland|Scottish Championship": 2, "Scotland|Scottish League 1": 3, "Scotland|Scottish League 2": 4,
  "Portugal|Premier League": 1, "Portugal|Second League": 2, "Portugal|Liga Portugal": 1, "Portugal|Liga Portugal 2": 2,
  "Netherlands|Eredivisie": 1, "Netherlands|Keuken Kampioen Divisie": 2, "Netherlands|Eerste Divisie": 2,
  "Belgium|Jupiler Pro League": 1, "Belgium|Challenger Pro League": 2, "Belgium|Profvoetbal 1A": 1, "Belgium|Profvoetbal 1B": 2,
  "Saudi Arabia|ROSHN Saudi League": 1, "Saudi Arabia|First Division League": 2, "Saudi Arabia|Saudi 1st Division": 2,
  "U.S.A.|MLS": 1, "U.S.A.|USSL-C Eastern Conference": 2, "U.S.A.|USSL-C Western Conference": 2, "U.S.A.|USSL Division One": 3,
  "United States|MLS": 1, "United States|USLC Eastern Conference": 2, "United States|USLC Western Conference": 2, "United States|USL1": 3,
  "Japan|J1 League": 1, "Japan|J2 League": 2, "Japan|J3 League": 3, "Serbia|SuperLeague": 1, "Serbia|First League": 2,
  "Israel|National League": 2, "Israel|Liga Leumit": 2, "Georgia|Georgian National League": 1, "Georgia|National League 2": 2, "Georgia|Erovnuli Liga": 1, "Georgia|Erovnuli Liga 2": 2,
  "Greece|Super League 1": 1, "Greece|Super League": 1, "Greece|Super League 2": 2,
  "Indonesia|Super League": 1, "Türkiye|Super League": 1, "Türkiye|1. League": 2, "Türkiye|Süper Lig": 1, "Austria|Premier Division": 1, "Austria|First Division": 2,
  "Austria|Bundesliga": 1, "Austria|2. Liga": 2,
  "Sweden|First Division Elite": 3, "Sweden|First Division North": 3, "Sweden|First Division South": 3, "Sweden|Allsvenskan": 1, "Sweden|Superettan": 2,
  "Argentina|Federal A": 3, "Argentina|Liga Profesional": 1, "Argentina|Primera Nacional": 2,
  "Switzerland|Super League": 1, "Switzerland|Challenge League": 2, "Switzerland|Promotion League": 3,
  "Denmark|3F Superliga": 1, "Denmark|Betinia Liga": 2, "Denmark|Superliga": 1, "Denmark|1. Division": 2,
  "South Africa|National First Division": 2, "South Africa|NFD": 2, "Finland|First Div. Championship": 2, "Finland|Veikkausliiga": 1, "Finland|Ykkösliiga": 2,
  "Albania|First Category": 2, "Albania|Kat. e Parë": 2, "Jamaica|JFF Championship": 2,
  "Brazil|Brasileirão": 1, "Brazil|Brasileirão Série B": 2, "Brazil|Brasileirão Série C": 3,
  "Colombia|Primera A": 1, "Colombia|Primera B": 2, "Colombia|Primera C": 3, "Uruguay|1ª División": 1, "Uruguay|2ª División": 2,
  "Chile|Liga de Primera": 1, "Chile|Liga de Ascenso": 2,
  "Poland|Ekstraklasa": 1, "Poland|1. Liga": 2, "Poland|2. Liga": 3, "Czechia|FNL": 2, "Croatia|HNL": 1, "Croatia|1. NL": 2, "Croatia|2. NL": 3,
  "Slovenia|1. SNL": 1, "Slovenia|2. SNL": 2, "Montenegro|1. CFL": 1, "Montenegro|2. CFL": 2,
  "Norway|Eliteserien": 1, "Norway|1. divisjon": 2, "Iceland|Besta deild karla": 1, "Iceland|1. deild karla": 2,
  "Moldova|Super Liga": 1, "Moldova|Liga 1": 2, "Moldova|Divizia B": 3, "Hungary|NB I": 1, "Hungary|NB II": 2, "Romania|Liga I": 1, "Romania|Liga II": 2,
  "Ireland|Men's Premier Division": 1, "Ireland|Men's First Division": 2, "Qatar|2nd Division League": 2, "Nigeria|NPFL": 1,
  "Serbia|Super liga Srbije": 1, "Serbia|Prva liga Srbije": 2, "Ukraine|UPL": 1, "Ukraine|PFL": 2, "Russia|RPL": 1, "Russia|FNL": 2,
  "China PR|CSL": 1, "China PR|CFL1": 2, "China PR|CFL2": 3, "Bulgaria|Parva Liga": 1, "Bulgaria|Vtora Liga": 2,
  "Tunisia|Ligue 2 - A": 2, "Tunisia|Ligue 2 - B": 2, "Peru|Liga 1": 1, "Peru|Liga 2": 2, "Mexico|Liga MX": 1, "Mexico|Liga de Expansión MX": 2,
  "Indonesia|Championship East": 2, "Indonesia|Championship West": 2,
};
// country-specific patterns, checked before the general ones
const TIER_RULES = [
  ["Poland", /^3\. liga/, 4], ["Poland", /^4\. liga/, 5], ["Türkiye", /^1\. lig/, 2], ["Türkiye", /^2\. lig/, 3], ["Türkiye", /^3\. lig/, 4],
  ["Switzerland", /^1\. liga/, 4], ["Switzerland", /^2\. liga/, 5], ["Czechia", /čfl|msfl/, 3], ["Czechia", /divize/, 4],
  ["Slovakia", /^2\. liga/, 2], ["Slovakia", /^3\. liga/, 3], ["Hungary", /nb iii/, 3], ["Romania", /liga iii/, 3], ["Romania", /liga iv/, 4],
  ["Bulgaria", /tafl|treta|third amateur/, 3], ["Spain", /preferente/, 6], ["Portugal", /^liga 3/, 3], ["Portugal", /campeonato de portugal/, 4],
  ["Mexico", /liga premier.*serie b/, 4], ["Mexico", /liga premier/, 3], ["Mexico", /expansi/, 2], ["Nigeria", /nnl/, 2], ["Nigeria", /lower/, 4],
  ["Bosnia & Herzegovina", /prva liga/, 2], ["Belgium", /1st national|nationale 1/, 3], ["Belgium", /division 2|2nd amateur/, 4], ["Belgium", /division 3|3rd amateur/, 5],
  ["Wales", /cymru (north|south)/, 2], ["New Zealand", /central league|northern league|southern league/, 2], ["Saudi Arabia", /second division/, 3], ["Saudi Arabia", /1st division/, 2],
  ["Israel", /liga alef/, 3], ["Russia", /second league/, 3], ["Ukraine", /druha|second league/, 3], ["France", /national 3/, 5], ["France", /national 2/, 4],
  ["Italy", /eccellenza/, 5], ["Italy", /promozione/, 6], ["Germany", /oberliga/, 5], ["Germany", /verbandsliga|landesliga/, 6],
];
function leagueTier(country, div) {
  const key = country + "|" + div;
  if (LEAGUE_TIER[key]) return LEAGUE_TIER[key];
  const d = div.toLowerCase();
  for (const [c, re, t] of TIER_RULES) if (c === country && re.test(d)) return t;
  if (TOP_ONLY.has(country)) return /\b2\b|deux/.test(d) ? 2 : 1;
  if (country === "England") {
    if (/(northern premier (east|west|midlands)|southern (league )?division one|isthmian (north|south))/.test(d)) return 8;
    if (/(northern premier|southern premier|isthmian)/.test(d)) return 7;
    if (/(midland|wessex|combined counties|united counties|northern league|western league|hellenic|spartan|eastern counties|north west counties|northern counties|southern combination|essex senior)/.test(d)) return 9;
  }
  if (/(provinci|provenci|^r\d|\br1\b|regionale|régionale|division d'honneur|oblast|amateur|county|district)/.test(d)) return 6;
  if (/(3ª federaci|tercera|lower|future cup|eerste klasse|western cape|senior league|hessia|rp\/saar|lowland|highland|oberliga)/.test(d)) return 5;
  if (/(national 2|segunda federaci|league two|serie d|regional|\brl\b|regionalliga|liga 3 seria|third division group|nb iii|tafl|division 4|derde divisie)/.test(d)) return 4;
  if (/(third|3rd|3\. liga|serie c|série c|primera federaci|federation 1|league one|ligue 3|mlsnp|usl1|second division gr|third league|division 3|primera c|divizia b|national - |tweede divisie|liga 3\b)/.test(d)) return 3;
  if (/(second|segunda|bundesliga 2|2\. bundesliga|serie b|série b|ligue 2|championship|liga 2|laliga 2|portugal 2|\b1b\b|primera b|primera nacional|ascenso|nb ii\b|liga ii\b|2nd|2ª|super league 2|challenge|keuken|\bj2\b|uslc|usl championship|ykkösliiga|superettan|erovnuli liga 2|division b|linafoot b|first division league|national first|d2\b|first category|1\. continental|1\. insular|1st division)/.test(d)) return 2;
  if (/first division|first div/.test(d)) return FIRST_IS_TOP.has(country) ? 1 : 2;
  return 1;
}
function divRating(country, tier, top) {
  if (tier <= 1) return top;
  const r = DIV_RATING[country + "|" + tier];
  if (r != null) return r;
  return Math.min(top - (TIER_GAP[tier] ?? 48), divRating(country, tier - 1, top) - 4);
}
function leagueFactor(country, div) {
  country = (country || "").trim(); div = (div || "").trim();
  country = COUNTRY_ALIAS[country] || country;
  const known = country in LEAGUE_RATING;
  const top = known ? LEAGUE_RATING[country] : DEFAULT_RATING;
  const tier = !div || div === "-" ? 0 : leagueTier(country, div);
  const rating = tier === 0 ? top - 7 : divRating(country, tier, top);
  return { k: +Math.exp(-K_SLOPE * Math.max(0, PL_RATING - rating)).toFixed(3), tier, known, rating: +rating.toFixed(1) };
}

