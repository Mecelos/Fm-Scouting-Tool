// ---------- charts ----------
function stackParts(sc, r) {
  const parts = {}; let other = 0;
  if (sc.kind === "stats") {
    const mw = sc.mw, have = Object.keys(mw).filter(k => r.mp[k] != null);
    const W = have.reduce((t, k) => t + mw[k], 0); if (!W || !r.raw) return null;
    const f = r.overall / r.raw;
    have.forEach(k => { const c = sc.primCat[k], v = mw[k] * r.mp[k] / W * f; if (sc.stackKeys.includes(c)) parts[c] = (parts[c] || 0) + v; else other += v; });
  } else {
    const w = sc.weights, have = Object.keys(w).filter(a => r.p.a[a] != null), W = have.reduce((t, a) => t + w[a], 0); if (!W) return null;
    have.forEach(a => { const g = attrGroup(a), v = w[a] * r.p.a[a] / W; if (sc.stackKeys.includes(g)) parts[g] = (parts[g] || 0) + v; else other += v; });
  }
  return { parts, other };
}
const stackLabel = (sc, k) => sc.kind === "stats" ? CATS[k].l : k;
function stackLegend(sc) {
  return `<div class="legend stackleg">${sc.stackKeys.map((k, i) => `<span><i class="sw s${i + 1}"></i>${esc(stackLabel(sc, k))}</span>`).join("")}<span><i class="sw s0"></i>Other ${sc.kind === "stats" ? "categories" : "attributes"}</span></div>`;
}
function barChart(sc, rows, cat) {
  const max = scoreMax(sc);
  const stacked = cat === "overall";
  return (stacked ? stackLegend(sc) : "") + `<div class="hbars" role="list">${rows.map((r, i) => {
    const v = cat === "overall" ? r.overall : r.cs[cat];
    let tip = `${r.p.name} · ${r.p.club || "no club"}\n${cat === "overall" ? scoreName(sc) : sc.catLabel(cat)}: ${scoreFmt(sc, v)}`;
    let fill = `<span class="hbf ${i < 3 ? "top" : ""}" style="width:${Math.max(1, (v ?? 0) / max * 100).toFixed(1)}%"></span>`;
    const sp = stacked ? stackParts(sc, r) : null;
    if (sp) {
      const segs = sc.stackKeys.map((k, j) => [j + 1, sp.parts[k] || 0, stackLabel(sc, k)]).concat([[0, sp.other, "Other"]]).filter(x => x[1] > 0.01);
      tip += "\n" + segs.map(x => `${x[2]}: ${sc.kind === "attr" ? x[1].toFixed(1) : Math.round(x[1])}`).join("\n");
      fill = `<span class="hstack" style="width:${Math.max(1, (v ?? 0) / max * 100).toFixed(1)}%">${segs.map(x => `<span class="seg s${x[0]}" style="flex:${x[1].toFixed(3)}"></span>`).join("")}</span>`;
    }
    return `<button class="hb" role="listitem" data-pid="${r.p.ix}" data-tip="${esc(tip)}"><span class="hbn">${esc(r.p.name)}</span><span class="hbt">${fill}</span><span class="hbv">${scoreFmt(sc, v)}</span></button>`;
  }).join("")}</div>`;
}

function radar(axes, series, max) {
  const W = 360, H = 320, cx = W / 2, cy = H / 2 + 4, R = 112, n = axes.length;
  if (n < 3) return `<p class="muted small">Needs at least 3 categories for a radar.</p>`;
  const pt = (i, v) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = R * Math.max(0, Math.min(1, (v ?? 0) / max)); return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)]; };
  let s = `<svg viewBox="-70 -4 ${W + 140} ${H + 8}" class="radar" role="img" aria-label="Radar">`;
  [0.25, 0.5, 0.75, 1].forEach(f => { s += `<polygon class="${f === 0.5 ? "ring mid" : "ring"}" points="${axes.map((_, i) => pt(i, max * f).join(",")).join(" ")}"/>`; });
  axes.forEach((a, i) => {
    const [x2, y2] = pt(i, max); s += `<line x1="${cx}" y1="${cy}" x2="${x2}" y2="${y2}" class="spoke"/>`;
    const [lx, ly] = pt(i, max * 1.17); const anc = Math.abs(lx - cx) < 8 ? "middle" : lx < cx ? "end" : "start";
    s += `<text x="${lx}" y="${ly + 4}" text-anchor="${anc}" class="rlabel">${esc(a)}</text>`;
  });
  series.forEach(se => {
    const pts = se.v.map((v, i) => pt(i, v));
    s += `<polygon points="${pts.map(p => p.join(",")).join(" ")}" class="rpoly ${se.cls}"/>`;
    if (se.dots) pts.forEach((p, i) => { if (se.v[i] != null) s += `<circle cx="${p[0]}" cy="${p[1]}" r="4" class="rdot ${se.cls}" data-tip="${esc(axes[i] + ": " + (se.fmt ? se.fmt(se.v[i]) : Math.round(se.v[i] ?? 0)))}"/>`; });
  });
  return s + `</svg>`;
}

function waterfall(cb) {
  let items = [...cb.items].sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
  const N = 10;
  if (items.length > N) { const rest = items.slice(N - 1); items = items.slice(0, N - 1); items.push({ l: `${rest.length} others`, d: rest.reduce((t, x) => t + x.d, 0) }); }
  items.sort((a, b) => b.d - a.d);
  if (cb.ease) items.push(cb.ease);
  let cum = cb.start.v;
  const steps = items.map(it => { const a = cum; cum += it.d; return { ...it, a, b: cum }; });
  const vals = [cb.start.v, cb.end.v, ...steps.flatMap(s => [s.a, s.b])];
  let lo = minOf(vals), hi = maxOf(vals); const pad = (hi - lo) * 0.1 || 1; lo -= pad; hi += pad;
  const X = v => (v - lo) / (hi - lo) * 100;
  const row = (l, left, width, cls, val, strong) => `<div class="wfr ${strong ? "wft" : ""}"><span class="wfl">${esc(l)}</span><span class="wftr"><span class="wfb ${cls}" style="left:${left.toFixed(2)}%;width:${Math.max(0.8, width).toFixed(2)}%"></span></span><span class="wfv">${val}</span></div>`;
  let h = `<div class="wf">` + row(cb.start.l, 0, X(cb.start.v), "tot", cb.fmtT(cb.start.v), true);
  steps.forEach(s => { const a = X(Math.min(s.a, s.b)), b = X(Math.max(s.a, s.b)); h += row(s.l, a, b - a, s.ease ? "ease" : s.d >= 0 ? "up" : "down", cb.fmt(s.d)); });
  h += row(cb.end.l, 0, X(cb.end.v), "tot end", cb.fmtT(cb.end.v), true) + `</div>`;
  if (cb.easeNote) h += `<p class="small muted"><span class="wfhatch"></span> ${esc(cb.easeNote)}</p>`;
  if (cb.missing.length) h += `<p class="small muted">No data for: ${cb.missing.map(esc).join(", ")}.</p>`;
  if (cb.zero.length) h += `<p class="small muted">Not part of this role's score: ${cb.zero.map(esc).join(", ")}.</p>`;
  return h;
}

function strengths(sc, r) {
  const out = { good: [], bad: [] };
  if (sc.kind === "stats") {
    sc.cats.forEach(c => { const p = r.cr[c]; if (p == null) return; if (p >= 80) out.good.push([p, `${CATS[c].l} · ${pctTxt(p)}`]); else if (p <= 25) out.bad.push([p, `${CATS[c].l} · ${pctTxt(p)}`]); });
    const roleMetrics = new Set(Object.keys(sc.mw).filter(k => sc.mw[k] >= 1));
    const ms = Object.entries(r.mp).filter(([k, p]) => p != null && p >= 92 && r.p.m[k] && roleMetrics.has(k)).sort((a, b) => b[1] - a[1]).slice(0, 3);
    out.stand = ms.map(([k, p]) => `${METRICS[k].l} ${fmtVal(k, r.p.m[k])} · ${pctTxt(p)}`);
  } else {
    const w = sc.weights;
    const rel = Object.keys(w).filter(a => r.ap[a] != null);
    out.stand = rel.filter(a => r.ap[a] >= 85).sort((a, b) => r.ap[b] - r.ap[a] || r.p.a[b] - r.p.a[a]).slice(0, 3).map(a => `${a} ${Math.round(r.p.a[a])} · ${pctTxt(r.ap[a])}`);
    const keyA = Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 10).map(x => x[0]);
    out.bad = keyA.filter(a => r.ap[a] != null && r.ap[a] <= 20).sort((a, b) => r.ap[a] - r.ap[b]).slice(0, 3).map(a => [r.ap[a], `${a} ${Math.round(r.p.a[a])} · ${pctTxt(r.ap[a])}`]);
    sc.cats.forEach(c => { const p = r.cr[c]; if (p != null && p >= 85) out.good.push([p, `${ACL[c].l} · ${pctTxt(p)}`]); });
  }
  out.good.sort((a, b) => b[0] - a[0]); out.bad.sort((a, b) => a[0] - b[0]);
  out.good = out.good.slice(0, 3).map(x => x[1]); out.bad = out.bad.slice(0, 3).map(x => x[1]);
  return out;
}

function h2h(sc, r, o) {
  const max = sc.kind === "stats" ? 50 : 6;
  const fmt = (d, fine) => (d > 0 ? "+" : "") + (sc.kind === "attr" ? d.toFixed(fine ? 2 : 1) : fine ? d.toFixed(1) : Math.round(d));
  const rows = [[scoreName(sc), r.overall, o.overall, true], ...sc.cats.map(c => [sc.catLabel(c), r.cs[c], o.cs[c]])];
  return `<div class="h2h"><div class="h2head"><span class="me">◀ ${esc(r.p.name)} better</span><span class="cmp">${esc(o.p.name)} better ▶</span></div>${rows.map(([l, a, b, strong]) => {
    if (a == null || b == null) return `<div class="h2r"><span class="h2l">${esc(l)}</span><span class="h2t"><span class="h2mid"></span></span><span class="h2v muted">–</span></div>`;
    const d = a - b, w = Math.min(50, Math.abs(d) / max * 50);
    return `<div class="h2r ${strong ? "wft" : ""}"><span class="h2l">${esc(l)}</span><span class="h2t"><span class="h2mid"></span><span class="h2b ${d >= 0 ? "me" : "cmp"}" style="${d >= 0 ? "right" : "left"}:50%;width:${w.toFixed(1)}%"></span></span><span class="h2v ${d >= 0 ? "me" : "cmp"}">${fmt(d, strong)}</span></div>`;
  }).join("")}</div>`;
}

function spread(sc, r) {
  const mx = scoreMax(sc), W = 200;
  const xp = v => 5 + (W - 10) * Math.max(0, Math.min(1, v / mx));
  return `<div class="spread">${sc.cats.map(c => {
    const bins = new Map(); sc.rows.forEach(x => { const v = x.cs[c]; if (v == null) return; const k = Math.round(xp(v) / 2) * 2; bins.set(k, (bins.get(k) || 0) + 1); });
    const md = median(sc.rows.map(x => x.cs[c]));
    let s = `<svg viewBox="0 0 ${W} 18" class="strip" aria-hidden="true">`;
    bins.forEach((n, x) => { s += `<circle cx="${x}" cy="9" r="2.4" class="sd" style="opacity:${Math.min(0.85, 0.18 + 0.09 * n).toFixed(2)}"/>`; });
    if (md != null) s += `<line x1="${xp(md)}" x2="${xp(md)}" y1="2" y2="16" class="smed"/>`;
    if (r.cs[c] != null) s += `<circle cx="${xp(r.cs[c])}" cy="9" r="5.5" class="sme"/>`;
    s += `</svg>`;
    return `<div class="sprow"><span class="spl">${esc(sc.catLabel(c))}</span>${s}<span class="spv">${scoreFmt(sc, r.cs[c])}</span></div>`;
  }).join("")}<p class="small muted">Each dot is a player in the pool; the line is the median; the big dot is ${esc(r.p.name)}.</p></div>`;
}

function axisOptions(sc) {
  const o = [["overall", scoreName(sc)]];
  sc.cats.forEach(c => o.push(["c:" + c, sc.catLabel(c)]));
  o.push(["value", "Transfer value"], ["age", "Age"]);
  if (sc.kind === "stats") { if (sc.model.hasMins) o.push(["mins", "Minutes"], ["goals", "Goals (total)"], ["assists", "Assists (total)"]); sc.model.metrics.forEach(k => o.push(["m:" + k, METRICS[k].l])); }
  else sc.model.attrs.forEach(a => o.push(["a:" + a, a]));
  return o;
}
function axisVal(r, k) {
  if (k === "overall") return r.overall; if (k === "value") return r.p.val; if (k === "age") return r.p.age; if (k === "mins") return r.p.mins;
  if (k === "goals") return tot(r.p, "gls90"); if (k === "assists") return tot(r.p, "ast90");
  if (k.startsWith("c:")) return r.cs[k.slice(2)];
  if (k.startsWith("m:")) return r.p.m[k.slice(2)];
  if (k.startsWith("a:")) return r.p.a[k.slice(2)];
  return null;
}
function niceTicks(lo, hi, n = 5) {
  const span = hi - lo || 1, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= n) || mag * 10;
  const t = []; for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) t.push(+v.toFixed(10)); return t;
}
const minOf = a => { let m = Infinity; for (const v of a) if (v < m) m = v; return m; };
const maxOf = a => { let m = -Infinity; for (const v of a) if (v > m) m = v; return m; };
const SCATTER_MAX = 2500;
function scatter(sc, rows, kx, ky, labels) {
  const W = 1000, H = 456, L = 56, Rr = 18, T = 32, B = 44;
  let pts = rows.map(r => ({ r, x: axisVal(r, kx), y: axisVal(r, ky) })).filter(d => d.x != null && d.y != null && (kx !== "value" || d.x > 0) && (ky !== "value" || d.y > 0));
  // very big pools (a whole save): plot the best SCATTER_MAX by score, plus the selected player
  let capped = 0;
  if (pts.length > SCATTER_MAX) { capped = pts.length; pts = pts.sort((a, b) => (b.r.overall ?? -1e9) - (a.r.overall ?? -1e9)).filter((d, k) => k < SCATTER_MAX || d.r.p.ix === S.sel); }
  if (!pts.length) return `<p class="muted">No players have both values.</p>`;
  const logX = kx === "value", logY = ky === "value";
  const tx = v => logX ? Math.log10(v) : v, ty = v => logY ? Math.log10(v) : v;
  let x0 = minOf(pts.map(d => tx(d.x))), x1 = maxOf(pts.map(d => tx(d.x))), y0 = minOf(pts.map(d => ty(d.y))), y1 = maxOf(pts.map(d => ty(d.y)));
  if (x0 === x1) { x0 -= 1; x1 += 1; } if (y0 === y1) { y0 -= 1; y1 += 1; }
  const px = v => L + (W - L - Rr) * (tx(v) - x0) / (x1 - x0), py = v => T + (H - T - B) * (1 - (ty(v) - y0) / (y1 - y0));
  const lbl = k => (axisOptions(sc).find(o => o[0] === k) || [k, k])[1];
  const fmtAx = (k, v) => k === "value" ? fmtMoney(v) : Math.abs(v) >= 100 ? Math.round(v) : +v.toFixed(2);
  let s = (capped ? `<p class="small muted">Showing the best ${SCATTER_MAX.toLocaleString()} of ${capped.toLocaleString()} players by score. Narrow it with the filters, or use All data for everyone.</p>` : "") + `<svg viewBox="0 0 ${W} ${H}" class="scatter" role="img" aria-label="${esc(lbl(kx))} vs ${esc(lbl(ky))}">`;
  const decades = [1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
  const xt = logX ? decades.filter(v => Math.log10(v) >= x0 - 0.01 && Math.log10(v) <= x1 + 0.01) : niceTicks(x0, x1);
  const yt = logY ? decades.filter(v => Math.log10(v) >= y0 - 0.01 && Math.log10(v) <= y1 + 0.01) : niceTicks(y0, y1);
  xt.forEach(v => { s += `<line class="grid" x1="${px(v)}" x2="${px(v)}" y1="${T}" y2="${H - B}"/><text class="tick" x="${px(v)}" y="${H - B + 16}" text-anchor="middle">${fmtAx(kx, v)}</text>`; });
  yt.forEach(v => { s += `<line class="grid" x1="${L}" x2="${W - Rr}" y1="${py(v)}" y2="${py(v)}"/><text class="tick" x="${L - 6}" y="${py(v) + 4}" text-anchor="end">${fmtAx(ky, v)}</text>`; });
  const mx = median(pts.map(d => d.x)), my = median(pts.map(d => d.y));
  s += `<line class="medline" x1="${px(mx)}" x2="${px(mx)}" y1="${T}" y2="${H - B}"/><line class="medline" x1="${L}" x2="${W - Rr}" y1="${py(my)}" y2="${py(my)}"/>`;
  const valueVsScore = kx === "value" && ky === "overall";
  if (valueVsScore) {
    const q = [["▲ Bargains", L + 2, T - 12, "start"], ["Stars ▲", W - Rr, T - 12, "end"], ["Cheap depth", L + 8, H - B - 8, "start"], ["Overpriced", W - Rr - 8, H - B - 8, "end"]];
    q.forEach(([t, x, y, a]) => { s += `<text class="quad" x="${x}" y="${y}" text-anchor="${a}">${t}</text>`; });
    if (sc.fairLine) {
      const [a, b] = sc.fairLine, X0 = Math.pow(10, x0), X1 = Math.pow(10, x1);
      const yA = a + b * x0, yB = a + b * x1;
      const clampY = v => Math.max(y0, Math.min(y1, v));
      s += `<line class="fairline" x1="${px(X0)}" y1="${py(clampY(yA))}" x2="${px(X1)}" y2="${py(clampY(yB))}"/><text class="fairlbl" x="${px(X1) - 4}" y="${py(clampY(yB)) - 6}" text-anchor="end">Fair price line</text>`;
    }
  }
  s += `<text class="axl" x="${(L + W - Rr) / 2}" y="${H - 6}" text-anchor="middle">${esc(lbl(kx))}${logX ? " (log scale)" : ""} →</text>`;
  s += `<text class="axl" transform="translate(13 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${esc(lbl(ky))} →</text>`;
  const topIds = new Set(labels.map(r => r.p.ix));
  pts.sort((a, b) => (topIds.has(a.r.p.ix) ? 1 : 0) - (topIds.has(b.r.p.ix) ? 1 : 0));
  const sized = sc.kind === "stats" && sc.model.hasMins;
  pts.forEach(d => {
    const sel = S.sel === d.r.p.ix, top = topIds.has(d.r.p.ix);
    const rad = sel ? 7.5 : sized ? 2.5 + 4 * Math.sqrt(Math.min(3000, d.r.p.mins || 0) / 3000) : top ? 5.5 : 4;
    const tip = `${d.r.p.name} · ${d.r.p.club || "no club"}${d.r.type ? " · " + d.r.type : ""}\n${lbl(kx)}: ${kx === "value" ? d.r.p.valTxt : fmtAx(kx, d.x)}\n${lbl(ky)}: ${ky === "value" ? d.r.p.valTxt : fmtAx(ky, d.y)}${sized ? `\n${d.r.p.mins} mins` : ""}`;
    s += `<circle cx="${px(d.x)}" cy="${py(d.y)}" r="${rad.toFixed(1)}" class="dot ${top ? "dot-top" : ""} ${sel ? "dot-sel" : ""}" data-pid="${d.r.p.ix}" data-tip="${esc(tip)}"/>`;
  });
  const placed = [];
  pts.filter(d => topIds.has(d.r.p.ix) || S.sel === d.r.p.ix).sort((a, b) => py(a.y) - py(b.y)).forEach(d => {
    const cx = px(d.x), cy = py(d.y), wlen = d.r.p.name.length * 6.4 + 6;
    const right = cx < W - 150;
    for (const dy of [-8, 15, -21, 28]) {
      const x = right ? cx + 9 : cx - 9, y = cy + dy, xs = right ? x : x - wlen;
      if (y < T + 8 || y > H - B - 2) continue;
      if (placed.some(q => xs < q[0] + q[2] && q[0] < xs + wlen && Math.abs(q[1] - y) < 13)) continue;
      placed.push([xs, y, wlen]);
      s += `<line class="leader" x1="${cx}" y1="${cy}" x2="${right ? x - 2 : x + 2}" y2="${y - 4}"/><text class="dlabel" x="${x}" y="${y}" text-anchor="${right ? "start" : "end"}">${esc(d.r.p.name)}</text>`;
      break;
    }
  });
  return s + `</svg>`;
}

