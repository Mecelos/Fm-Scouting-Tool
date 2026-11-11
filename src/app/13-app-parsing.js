/* ===== FM27 Scout Lab app ===== */
const BASIC_KEEP = new Set(["npxg90", "xg90", "gls90", "npg90", "tgls90", "tcon90", "winpct", "ppg", "fwon90", "fmade90", "shot90", "sht90", "conv", "shotpct", "xgop90", "xa90", "ast90", "rating", "yel90", "red90", "mlg90"]);
const SOFT = new Set(["conv", "shotpct", "pas", "opcrpct", "crca", "hdrpct", "tckr", "svpct", "xsvpct", "spr90", "dist90", "rating"]);
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
const nk = s => String(s ?? "").toLowerCase().replace(/[^a-z0-9%\/+\-]/g, "");
let CUR = "€";

// ---------- parsing ----------
function parseDelimited(text) {
  text = text.replace(/^﻿/, "");
  const first = text.split(/\r?\n/, 1)[0] || "";
  const cnt = ch => first.split(ch).length - 1;
  const delim = [";", "\t", ","].sort((a, b) => cnt(b) - cnt(a))[0];
  const rows = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"' && cur === "") q = true;
    else if (c === delim) { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = ""; if (row.some(v => v !== "")) rows.push(row); row = [];
    } else cur += c;
  }
  row.push(cur); if (row.some(v => v !== "")) rows.push(row);
  return rows;
}
function parseHtmlTable(text) {
  const doc = new DOMParser().parseFromString(text, "text/html");
  const t = doc.querySelector("table"); if (!t) return null;
  return [...t.querySelectorAll("tr")].map(tr => [...tr.children].map(td => td.textContent.trim())).filter(r => r.length);
}
function parseExport(text) {
  const rows = /<table/i.test(text) ? parseHtmlTable(text) : parseDelimited(text);
  if (!rows || rows.length < 2) throw new Error("No table found. Paste the whole CSV (with the header row) or choose the .csv / .html file from Exports.");
  const headers = rows[0].map(h => h.trim());
  const w = headers.length;
  return { headers, rows: rows.slice(1).map(r => { const a = r.slice(0, w); while (a.length < w) a.push(""); return a; }) };
}
function num(s) {
  if (s == null) return null;
  s = String(s).trim();
  if (!s || s === "-" || /^n\/?a$/i.test(s)) return null;
  const apps = s.match(/^(\d+)\s*\((\d+)\)$/);  // "28 (2)" = 28 starts + 2 sub appearances
  if (apps) return +apps[1] + +apps[2];
  const rng = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (rng) return (+rng[1] + +rng[2]) / 2;
  let t = s.replace(/[^0-9.,\-]/g, "");
  if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, "");
  else if (t.includes(",") && !t.includes(".")) t = t.replace(",", ".");
  const v = parseFloat(t);
  return isFinite(v) ? v : null;
}
function money(s) {
  if (!s) return null;
  const parts = String(s).split(/\s+-\s+/).map(p => {
    const m = p.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*([KMB])?/i);
    if (!m) return null;
    return +m[1] * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1);
  }).filter(v => v != null);
  return parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null;
}
const fmtMoney = v => v == null ? "–" : v >= 1e6 ? CUR + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + "M" : v >= 1e3 ? CUR + Math.round(v / 1e3) + "K" : CUR + Math.round(v);
function fmtVal(key, v) {
  if (v == null) return "–";
  if (["conv", "shotpct", "pas", "opcrpct", "crca", "hdrpct", "tckr", "svpct", "xsvpct"].includes(key)) return Math.round(v) + "%";
  if (key === "rating") return v.toFixed(2);
  return Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2);
}
const pctTxt = p => p == null ? "" : p >= 50 ? `top ${Math.max(1, Math.round(100 - p))}%` : `bottom ${Math.max(1, Math.round(p))}%`;

// column lookup
function colIndex(headers, aliases) {
  const H = headers.map(nk);
  for (const a of aliases) { const i = H.indexOf(nk(a)); if (i >= 0) return i; }
  return -1;
}
const BASE = {
  name: ["Player", "Name"], club: ["Club", "Team"], age: ["Age"], mins: ["Minutes", "Mins", "Minutes Played"], value: ["Transfer Value", "Value", "Asking Price"],
  bestPos: ["Best Pos", "Best Position"], position: ["Position", "Pos"], div: ["Division", "League"], country: ["Based In"], inf: ["Inf"],
  uid: ["Unique ID", "UID", "ID"], nat: ["Nation", "Nat", "Nationality"], wage: ["Wage"], rec: ["Recommendation", "Rec", "Scout Recommendation"],
  pers: ["Personality"], foot: ["Preferred Foot"], height: ["Height"], apps: ["Appearances", "Apps"], starts: ["Starts"],
};
const ATTR_ALL = [...ATTRS.technical, ...ATTRS.mental, ...ATTRS.physical, ...ATTRS.goalkeeping];
function attrIndexMap(headers) {
  const map = {};
  headers.forEach((h, i) => {
    const t = h.trim();
    let a = ATTR_ALL.find(x => nk(x) === nk(t));
    if (!a && ATTR_SHORT[t]) a = ATTR_SHORT[t];
    if (a && !(a in map)) map[a] = i;
  });
  return map;
}
function metricIndexMap(H, hasMins) {
  const out = {};
  for (const k in METRICS) {
    const m = METRICS[k];
    const i = colIndex(H, m.a);
    if (i >= 0) { out[k] = { i, per90: false }; continue; }
    if (m.tot && hasMins) { const j = colIndex(H, m.tot); if (j >= 0) out[k] = { i: j, per90: true }; }
  }
  return out;
}
// what a file contains: "stats", "attr" or both
function detectKinds(headers) {
  const a = Object.keys(attrIndexMap(headers)).length;
  const s = Object.keys(metricIndexMap(headers, colIndex(headers, BASE.mins) >= 0)).length;
  const kinds = [];
  if (s >= 8) kinds.push("stats");
  if (a >= 8) kinds.push("attr");
  if (!kinds.length) kinds.push(a > s ? "attr" : "stats");
  return kinds;
}

