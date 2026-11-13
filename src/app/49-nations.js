// ---------- Nationality: the save stores each player's nation as a number (its place in FM27's nation list) ----------
// FM keeps the names in its own database files, not in the save, so the list is written out here. It was matched from
// the best-known players of each number (FM orders nations by continent, then alphabetically). Numbers not listed show "".
const NATION_NAMES = (() => {
  const N = [];
  const put = (start, names) => names.forEach((n, k) => { if (n) N[start + k] = n; });
  put(0, ["Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cameroon", "Cape Verde", "Central African Rep.", "Chad",
    "Djibouti", "Egypt", "Equatorial Guinea", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Ivory Coast",
    "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco",
    "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda", "São Tomé e Príncipe", "Senegal", "Seychelles", "Sierra Leone", "Somalia",
    "South Africa", "Sudan", "Eswatini", "Tanzania", "Congo", "Togo", "Tunisia", "Uganda", "DR Congo", "Zambia", "Zimbabwe"]);
  put(51, ["Afghanistan", "Bahrain", "Bangladesh", "Brunei", "China", "Hong Kong", "India", "Indonesia", "Iran", "Iraq",
    "Japan", "Jordan", "Cambodia", "Kazakhstan", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon", "Macau", "Malaysia",
    "Maldives", "Myanmar", "Nepal", "North Korea", "Oman", "Pakistan", "Qatar", "Saudi Arabia", "Singapore", "South Korea",
    "Sri Lanka", "Syria", "Chinese Taipei", "Tajikistan", "Thailand", "Philippines", "Turkmenistan", "UAE", "Uzbekistan", "Vietnam", "Yemen"]);
  put(92, ["Antigua & Barbuda", "Aruba", "Barbados", "Belize", "Bermuda", "Canada", "Cayman Islands", "Costa Rica", "Cuba", "Dominica",
    "El Salvador", "Grenada", "Guatemala", "Guyana", "Haiti", "Honduras", "Jamaica", "Mexico", "Curaçao", "Nicaragua",
    "Panama", "Puerto Rico", "St Kitts & Nevis", "St Lucia", "St Vincent & Grenadines", "Suriname", "Bahamas", "Trinidad & Tobago", "United States"]);
  put(126, ["Albania", "Andorra", "Armenia", "Austria", "Azerbaijan", "Belgium", "Belarus", "Bosnia & Herzegovina", "Bulgaria", "Croatia",
    "Cyprus", "Czech Republic", "Denmark", "England", "Estonia", "Faroe Islands", "Finland", "France", "Georgia", "Germany",
    "Greece", "Hungary", "Iceland", "Israel", "Italy", "Latvia", "Liechtenstein", "Lithuania", "Luxembourg", "North Macedonia",
    "Malta", "Moldova", "Netherlands", "Northern Ireland", "Norway", "Poland", "Portugal", "Republic of Ireland", "Romania", "Russia",
    "San Marino", "Scotland", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Türkiye", "Ukraine", "Wales", "Serbia"]);
  put(177, ["Australia", "Cook Islands", "Fiji", "New Zealand", "Papua New Guinea", "Solomon Islands", "Tahiti", "Tonga", "Vanuatu", "Samoa"]);
  put(187, ["Argentina", "Bolivia", "Brazil", "Chile", "Colombia", "Ecuador", "Paraguay", "Peru", "Uruguay", "Venezuela", "Palestine"]);
  put(201, ["American Samoa", "Mongolia", "Guam", "Eritrea", "Anguilla", "", "Montserrat", "US Virgin Islands", "Turks & Caicos", "New Caledonia",
    "Bhutan", "Dominican Republic"]);
  put(216, ["Gibraltar", "", "", "Kosovo"]);
  put(225, ["French Guiana", "Guadeloupe", "Martinique", "", "", "Réunion", "Mayotte", "", "", "Comoros", "", "Timor-Leste", "", "", "Zanzibar",
    "South Sudan", "", "", "Northern Mariana Islands", "", "", "", "Montenegro"]);
  return N;
})();
const nationName = k => (k != null && k >= 0 && NATION_NAMES[k]) || "";
const saveNat = i => SAVE && SAVE.nation ? nationName(SAVE.nation[i]) : "";
