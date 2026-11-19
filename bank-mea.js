/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_MEA = (function(){
const module = undefined;
'use strict';
/* Question types for AQA measurements and their errors (3.1). */
const TOPICS = { UN: 'SI units, prefixes and estimates', UE: 'Errors, precision and accuracy', UC: 'Uncertainties in calculations and graphs' };
const T = {};

/* ---------- helpers ---------- */
function makeRand(seed){
  let a = seed >>> 0;
  const r = function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  return r;
}
const isNice = (x, n) => Math.abs(x - Number(x.toPrecision(n))) <= 1e-9 * Math.abs(x);
function N(x, n = 3){                          // n significant figures; standard form outside 0.01 to 10 000
  if (!isFinite(x)) return 'NaN';
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a >= 1e4 || a < 1e-2){
    let e = Math.floor(Math.log10(a) + 1e-12), m = Number((x * (1 + 1e-12) / Math.pow(10, e)).toPrecision(n));
    if (Math.abs(m) >= 10){ m /= 10; e += 1; }
    return (m.toFixed(n - 1) + ' × 10<sup>' + e + '</sup>').replace(/-/g, '−');
  }
  x = Number((x * (1 + 1e-12)).toPrecision(n));
  const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), d = n - 1 - e;
  return (d >= 0 ? x.toFixed(d) : String(Math.round(x))).replace('-', '−');
}
const A = x => isNice(x, 2) ? N(x, 2) : N(x, 3);            // answers: 2 sf when exact, otherwise 3 sf
const V = (x, unit, n = 2) => N(x, n) + (unit ? ' ' + unit : '');
const disp = x => A(x);
const eq = s => `<span class="eq">${s}</span>`;
const ov = s => `<span class="ov">${s}</span>`;              // overbar for antiparticles
const calc = (q, marks, ans, unit, ms, x) => Object.assign({ q, marks, ans, unit, ms, show: A(ans) }, x || {});
const text = (q, marks, ms, guide) => Object.assign({ q, marks, ms }, guide ? { guide } : {});
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const n2 = x => Math.round(x * 100) / 100;
const LAST = {};
const cap = s => s[0].toUpperCase() + s.slice(1);
const rng = (a, b, step) => { const o = []; for (let x = a; x <= b + 1e-9; x += step) o.push(Number(x.toPrecision(6))); return o; };
function find(gen, test){ let v; for (let i = 0; i < 3000; i++){ v = gen(); if (test(v)) return v; } throw new Error('no suitable numbers found'); }
const H = 6.63e-34, C = 3.00e8, QE = 1.60e-19, ME = 9.11e-31, MP = 1.67e-27;
const MS1 = 'm s<sup>−1</sup>', CKG = 'C kg<sup>−1</sup>';
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = n => String(n).split('').map(c => SUP[c]).join('');
const nuc = (a, z, sym) => `<sup>${a}</sup><sub>${z}</sub>${sym}`;
const deg = x => x * Math.PI / 180;

/* ---------- drawing ---------- */
const svgWrap = (w, h, aria, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" font-family="Arial,Helvetica,sans-serif" font-size="15" role="img" aria-label="${esc(aria)}"><rect width="${w}" height="${h}" fill="#fff"/>${body}</svg>`;
const ln = (x1, y1, x2, y2, o = '') => `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(x2)}" y2="${n2(y2)}" stroke="#000" stroke-width="1.6" ${o}/>`;
const tx = (x, y, s, o = '') => `<text x="${n2(x)}" y="${n2(y)}" ${/text-anchor/.test(o) ? '' : 'text-anchor="middle" '}fill="#000" ${o}>${s}</text>`;
function head(x, y, dx, dy, s = 10){ const l = Math.hypot(dx, dy), c = dx / l, d = dy / l, bx = x - s * c, by = y - s * d, w = s * 0.42; return `<polygon points="${n2(x)},${n2(y)} ${n2(bx - w * d)},${n2(by + w * c)} ${n2(bx + w * d)},${n2(by - w * c)}" fill="#000"/>`; }
const midArrow = (x1, y1, x2, y2, f = .55) => head(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, x2 - x1, y2 - y1);
const dimLine = (x1, y1, x2, y2) => ln(x1, y1, x2, y2, 'stroke-width="1.1"') + head(x1, y1, x1 - x2, y1 - y2, 7) + head(x2, y2, x2 - x1, y2 - y1, 7);

// energy levels, lowest first: [{name, e}] with e as the text of the energy
function levelFig(levels, unit, aria){
  const gap = 46, top = 44, h = top + gap * (levels.length - 1) + 40; let b = tx(250, 22, `energy / ${unit}`, 'text-anchor="start"');
  levels.forEach((L, i) => { const y = top + gap * (levels.length - 1 - i); b += ln(110, y, 240, y, 'stroke-width="2"') + tx(100, y + 5, L.name, 'text-anchor="end"') + tx(250, y + 5, L.e, 'text-anchor="start"'); });
  return svgWrap(360, h, aria, b + tx(175, h - 10, 'not to scale', 'font-size="13"'));
}
// a ray meeting a horizontal boundary; angles in degrees from the normal
function rayFig(o){
  const cx = 210, cy = 150, Lr = 115, up = o.from === 'top', s = up ? -1 : 1; let b = '';
  b += `<rect x="30" y="${cy}" width="360" height="130" fill="#e9edf2"/>` + ln(30, cy, 390, cy, 'stroke-width="2"') + ln(cx, 22, cx, 278, 'stroke-dasharray="6 4" stroke-width="1.1"');
  b += tx(52, cy - 12, o.top, 'text-anchor="start"') + tx(52, cy + 24, o.bottom, 'text-anchor="start"') + tx(cx + 6, 34, 'normal', 'text-anchor="start" font-size="13"');
  const ix = cx - Lr * Math.sin(deg(o.inc)), iy = cy + s * Lr * Math.cos(deg(o.inc));
  b += ln(ix, iy, cx, cy, 'stroke-width="2"') + midArrow(ix, iy, cx, cy);
  const lr = 62, la = deg(o.inc / 2);
  b += tx(cx - lr * Math.sin(la), cy + s * lr * Math.cos(la) + 5, o.label || (o.inc + '°'));
  if (o.refr != null){ const rx = cx + Lr * Math.sin(deg(o.refr)), ry = cy - s * Lr * Math.cos(deg(o.refr)); b += ln(cx, cy, rx, ry, 'stroke-width="2"') + midArrow(cx, cy, rx, ry); }
  return svgWrap(420, 300, o.aria, b);
}
function fibreFig(){
  let b = `<rect x="40" y="60" width="340" height="100" fill="#e9edf2" stroke="#000" stroke-width="1.4"/><rect x="40" y="82" width="340" height="56" fill="#fff" stroke="#000" stroke-width="1.4"/>`;
  const pts = [[14, 124], [40, 118], [110, 82], [210, 138], [310, 82], [380, 120]];
  for (let i = 0; i + 1 < pts.length; i++) b += ln(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 'stroke-width="1.8"') + (i % 2 ? '' : midArrow(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
  b += ln(300, 40, 300, 68, 'stroke-width="1"') + tx(300, 34, 'cladding') + ln(150, 186, 150, 122, 'stroke-width="1"') + tx(150, 202, 'core') + tx(12, 180, 'light ray', 'text-anchor="start" font-size="13"');
  return svgWrap(420, 215, 'A ray of light travelling along an optical fibre by total internal reflection at the boundary between the core and the cladding', b);
}
function slitFig(src){
  let b = `<rect x="20" y="96" width="70" height="38" fill="#e9edf2" stroke="#000" stroke-width="1.4"/>` + tx(55, 120, src, 'font-size="13"');
  b += ln(90, 115, 190, 115, 'stroke-dasharray="5 4" stroke-width="1.1"');
  b += ln(190, 30, 190, 104, 'stroke-width="4"') + ln(190, 110, 190, 120, 'stroke-width="4"') + ln(190, 126, 190, 200, 'stroke-width="4"');
  b += ln(400, 30, 400, 200, 'stroke-width="3"') + tx(400, 20, 'screen') + tx(190, 20, 'double slit');
  b += dimLine(190, 222, 400, 222) + tx(295, 242, '<tspan font-style="italic" font-family="Times New Roman,serif" font-size="18">D</tspan>');
  b += ln(196, 107, 240, 82, 'stroke-width="1"') + tx(246, 80, '<tspan font-style="italic" font-family="Times New Roman,serif" font-size="18">s</tspan>', 'text-anchor="start"');
  return svgWrap(440, 256, `${cap(src)} light incident on a double slit, with a screen a distance D from the slits. The slit separation is s. Not to scale.`, b + tx(60, 242, 'not to scale', 'font-size="13"'));
}
function stringFig(n, label){
  const x0 = 50, x1 = 390, y = 90, amp = 34; let s1 = '', s2 = '';
  for (let i = 0; i <= 170; i++){ const x = x0 + (x1 - x0) * i / 170, d = amp * Math.sin(n * Math.PI * i / 170); s1 += `${n2(x)},${n2(y - d)} `; s2 += `${n2(x)},${n2(y + d)} `; }
  let b = `<polyline points="${s1}" fill="none" stroke="#000" stroke-width="1.8"/><polyline points="${s2}" fill="none" stroke="#000" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  b += `<rect x="36" y="70" width="14" height="40" fill="#e9edf2" stroke="#000" stroke-width="1.4"/><rect x="390" y="70" width="14" height="40" fill="#e9edf2" stroke="#000" stroke-width="1.4"/>`;
  b += dimLine(50, 160, 390, 160) + ln(50, 114, 50, 166, 'stroke-width=".8"') + ln(390, 114, 390, 166, 'stroke-width=".8"') + tx(220, 182, label);
  return svgWrap(440, 196, `A stationary wave on a string fixed at both ends, vibrating with ${n} loop${n > 1 ? 's' : ''}`, b);
}
function wavy(x1, y1, x2, y2){
  const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L, k = Math.round(L / 16), steps = k * 16; let p = '';
  for (let i = 0; i <= steps; i++){ const t = i / steps, o = 5 * Math.sin(2 * Math.PI * k * t); p += `${n2(x1 + ux * L * t - uy * o)},${n2(y1 + uy * L * t + ux * o)} `; }
  return `<polyline points="${p}" fill="none" stroke="#000" stroke-width="1.5"/>`;
}
// particle interaction diagram, time running up the page. o: {inL, outL, inR (or null for a decay), outR: [..], boson}
function feynFig(o, aria){
  const lab = (x, y, s, anchor = 'middle') => tx(x, y, s, `text-anchor="${anchor}" font-size="17"`);
  const vl = [130, 150], vr = o.inR ? [290, 150] : [270, 128]; let b = '';
  b += ln(70, 262, vl[0], vl[1]) + midArrow(70, 262, vl[0], vl[1]) + ln(vl[0], vl[1], 70, 38) + midArrow(vl[0], vl[1], 70, 38) + lab(56, 276, o.inL) + lab(56, 30, o.outL);
  b += wavy(vl[0], vl[1], vr[0], vr[1]) + lab((vl[0] + vr[0]) / 2, (vl[1] + vr[1]) / 2 - 16, o.boson);
  if (o.inR){ b += ln(350, 262, vr[0], vr[1]) + midArrow(350, 262, vr[0], vr[1]) + lab(364, 276, o.inR) + ln(vr[0], vr[1], 350, 38) + midArrow(vr[0], vr[1], 350, 38) + lab(364, 30, o.outR[0]); }
  else { b += ln(vr[0], vr[1], 300, 38) + midArrow(vr[0], vr[1], 300, 38) + lab(300, 28, o.outR[0]) + ln(vr[0], vr[1], 372, 62) + midArrow(vr[0], vr[1], 372, 62) + lab(384, 56, o.outR[1]); }
  return svgWrap(420, 290, aria, b);
}
const SVGSUP = (s, p) => `${s}<tspan dy="-7" font-size="12">${p}</tspan><tspan dy="7">&#8203;</tspan>`;
const SVGSUB = (s, p) => `${s}<tspan dy="5" font-size="12">${p}</tspan><tspan dy="-5">&#8203;</tspan>`;

function graph(g){
  LAST.g = g;
  const W = g.w || 400, H = g.h || 300, ml = 70, mb = 52, mt = 16, mr = 22;
  const [xa, xb, xM] = g.x, [ya, yb, yM] = g.y, div = g.div || 5;
  const X = x => ml + (x - xa) / (xb - xa) * W, Y = y => mt + H - (y - ya) / (yb - ya) * H;
  const dec = m => Math.max(0, -Math.floor(Math.log10(m) + 1e-9));
  const fmt = (v, m) => (Math.abs(v) < 1e-9 ? '0' : v.toFixed(dec(m))).replace('-', '−');
  let minor = '', major = '', lab = '';
  const nx = Math.round((xb - xa) / xM * div), ny = Math.round((yb - ya) / yM * div);
  for (let i = 0; i <= nx; i++){ const x = X(xa + i * xM / div), s = `<line x1="${n2(x)}" y1="${mt}" x2="${n2(x)}" y2="${mt + H}"/>`; if (i % div) minor += s; else { major += s; lab += `<text x="${n2(x)}" y="${mt + H + 22}" text-anchor="middle">${fmt(xa + i * xM / div, xM)}</text>`; } }
  for (let i = 0; i <= ny; i++){ const y = Y(ya + i * yM / div), s = `<line x1="${ml}" y1="${n2(y)}" x2="${ml + W}" y2="${n2(y)}"/>`; if (i % div) minor += s; else { major += s; lab += `<text x="${ml - 8}" y="${n2(y + 5)}" text-anchor="end">${fmt(ya + i * yM / div, yM)}</text>`; } }
  const ax0 = X(Math.max(xa, Math.min(0, xb))), ay0 = Y(Math.max(ya, Math.min(0, yb)));
  let marks = '';
  (g.curves || []).forEach(c => {
    const pts = []; const n = 240;
    for (let i = 0; i <= n; i++){ const x = c.from + (c.to - c.from) * i / n, y = c.f(x); if (y >= ya - 1e-9 && y <= yb + 1e-9) pts.push(n2(X(x)) + ',' + n2(Y(y))); }
    marks += `<polyline points="${pts.join(' ')}" fill="none" stroke="#000" stroke-width="1.9" stroke-linejoin="round"/>`;
    if (c.name) marks += `<text x="${n2(X(c.at[0]))}" y="${n2(Y(c.at[1]))}" font-weight="700" font-size="16" text-anchor="middle">${esc(c.name)}</text>`;
  });
  (g.crosses || []).forEach(p => { const x = X(p[0]), y = Y(p[1]), s = 4.5; marks += `<path d="M${n2(x - s)} ${n2(y - s)}L${n2(x + s)} ${n2(y + s)}M${n2(x - s)} ${n2(y + s)}L${n2(x + s)} ${n2(y - s)}" stroke="#000" stroke-width="1.5" fill="none"/>`; });
  const tw = ml + W + mr, th = mt + H + mb;
  return `<svg xmlns="http://www.w3.org/2000/svg" class="graph" viewBox="0 0 ${tw} ${th}" width="${tw}" height="${th}" font-family="Arial,Helvetica,sans-serif" font-size="14" role="img" aria-label="Graph of ${esc(g.yl)} against ${esc(g.xl)}">` +
    `<rect width="${tw}" height="${th}" fill="#fff"/><g stroke="#c4c8cc" stroke-width="0.7">${minor}</g><g stroke="#7d848b" stroke-width="1">${major}</g>` +
    `<g stroke="#000" stroke-width="1.7"><line x1="${n2(ax0)}" y1="${mt}" x2="${n2(ax0)}" y2="${mt + H}"/><line x1="${ml}" y1="${n2(ay0)}" x2="${ml + W}" y2="${n2(ay0)}"/></g>` +
    marks + `<g fill="#000">${lab}<text x="${ml + W / 2}" y="${th - 8}" text-anchor="middle">${esc(g.xl)}</text>` +
    `<text transform="translate(18,${mt + H / 2}) rotate(-90)" text-anchor="middle">${esc(g.yl)}</text></g></svg>`;
}


/* ====================== PARTICLES ====================== */
const NUCLIDES = [['lithium', 'Li', 3, 7], ['carbon', 'C', 6, 14], ['oxygen', 'O', 8, 16], ['sodium', 'Na', 11, 23], ['magnesium', 'Mg', 12, 24], ['aluminium', 'Al', 13, 27], ['chlorine', 'Cl', 17, 37], ['potassium', 'K', 19, 39], ['calcium', 'Ca', 20, 40], ['iron', 'Fe', 26, 56], ['copper', 'Cu', 29, 63]];
/* ---------- shared extras for the later banks ---------- */
const MS2 = 'm s<sup>−2</sup>', KGM3 = 'kg m<sup>−3</sup>', PI = Math.PI;
const sinD = x => Math.sin(deg(x)), cosD = x => Math.cos(deg(x)), tanD = x => Math.tan(deg(x));
const pw = pts => x => { for (let i = 0; i + 1 < pts.length; i++){ const [xa, ya] = pts[i], [xb, yb] = pts[i + 1]; if (x >= xa - 1e-9 && x <= xb + 1e-9) return ya + (yb - ya) * (x - xa) / (xb - xa || 1); } return -1e9; };
const lab = (name, at) => ({ f: () => -1e9, from: 0, to: 0, name, at });
const shuf = (R, arr) => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--){ const j = Math.floor(R() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const r3 = x => Number(x.toPrecision(3)), r2 = x => Number(x.toPrecision(2));
const P10 = (m, e) => `${m} × 10<sup>${String(e).replace('-', '−')}</sup>`;
/* ---------- measurements and their errors (AQA 3.1) ---------- */
const F2 = (x, d = 2) => x.toFixed(d).replace('-', '−'), pct = x => N(x, 2) + '%';
/* --- SI units, prefixes and estimates --- */
T.UN1 = R => {
  const [q, u, base, via, work] = R.pick([['force', 'N', 'kg m s<sup>−2</sup>', '<i>F</i> = <i>ma</i>', 'kg × m s<sup>−2</sup>'], ['energy', 'J', 'kg m<sup>2</sup> s<sup>−2</sup>', '<i>W</i> = <i>Fs</i> (or <i>E</i> = ½<i>mv</i><sup>2</sup>)', 'kg m s<sup>−2</sup> × m'], ['pressure', 'Pa', 'kg m<sup>−1</sup> s<sup>−2</sup>', '<i>p</i> = <i>F</i>/<i>A</i>', 'kg m s<sup>−2</sup> / m<sup>2</sup>'], ['power', 'W', 'kg m<sup>2</sup> s<sup>−3</sup>', '<i>P</i> = <i>E</i>/<i>t</i>', 'kg m<sup>2</sup> s<sup>−2</sup> / s'], ['potential difference', 'V', 'kg m<sup>2</sup> s<sup>−3</sup> A<sup>−1</sup>', '<i>V</i> = <i>W</i>/<i>Q</i> and <i>Q</i> = <i>It</i>', 'kg m<sup>2</sup> s<sup>−2</sup> / A s']]);
  const [e, l, r] = R.pick([['<i>v</i><sup>2</sup> = <i>u</i><sup>2</sup> + 2<i>as</i>', '<i>v</i><sup>2</sup> and <i>u</i><sup>2</sup>: (m s<sup>−1</sup>)<sup>2</sup> = m<sup>2</sup> s<sup>−2</sup>', '2<i>as</i>: m s<sup>−2</sup> × m = m<sup>2</sup> s<sup>−2</sup>'], ['<i>s</i> = <i>ut</i> + ½<i>at</i><sup>2</sup>', '<i>s</i>: m, and <i>ut</i>: m s<sup>−1</sup> × s = m', '½<i>at</i><sup>2</sup>: m s<sup>−2</sup> × s<sup>2</sup> = m'], ['<i>v</i> = <i>u</i> + <i>at</i>', '<i>v</i> and <i>u</i>: m s<sup>−1</sup>', '<i>at</i>: m s<sup>−2</sup> × s = m s<sup>−1</sup>']]);
  return { stem: `All physical quantities can be expressed in terms of SI base units.`,
    parts: [
      text('State the SI base units of mass, length, time, electric current and temperature.', 2, 'kilogram (kg), metre (m), second (s), ampere (A) and kelvin (K) ✓✓', ['Award one mark for three or four correct.']),
      text(`Express the unit of ${q}, the ${u === 'Pa' ? 'pascal' : u === 'N' ? 'newton' : u === 'J' ? 'joule' : u === 'W' ? 'watt' : 'volt'}, in SI base units.`, 2, `Uses ${via}: ${eq(work)} ✓<br>${eq(base)} ✓`),
      text(`Show that the equation ${eq(e)} is homogeneous (that the units are the same on both sides).`, 2, `${l} ✓<br>${r}, so every term has the same units ✓`),
      text('Explain why an equation that is homogeneous is not necessarily correct.', 1, 'A check of units cannot detect a wrong numerical constant (or a missing term with the same units) ✓')
    ] };
};
const PREF = [[450, 'nm', 1e-9, 'm'], [3.3, 'kΩ', 1e3, 'Ω'], [2.5, 'MW', 1e6, 'W'], [47, 'μF', 1e-6, 'F'], [6.0, 'GHz', 1e9, 'Hz'], [0.25, 'mA', 1e-3, 'A'], [150, 'pF', 1e-12, 'F'], [8.2, 'fm', 1e-15, 'm'], [1.2, 'MΩ', 1e6, 'Ω'], [680, 'μm', 1e-6, 'm'], [35, 'ms', 1e-3, 's'], [5.6, 'TW', 1e12, 'W'], [22, 'kV', 1e3, 'V'], [90, 'μs', 1e-6, 's']];
const sv = v => v === 6 ? '6.0' : String(v), sci = x => { const e = Math.floor(Math.log10(x) + 1e-9); return `${(x / Math.pow(10, e)).toFixed(1)} × 10<sup>${String(e).replace('-', '−')}</sup>`; };
T.UN2 = R => {
  const items = shuf(R, PREF).slice(0, 6);
  return { stem: `Prefixes are used with SI units to show multiples and sub-multiples. Give each answer in standard form.`,
    parts: items.map(([v, u, f, si]) => calc(`Write ${sv(v)} ${u} in ${si}.`, 1, v * f, si, `${eq(`${sv(v)} ${u} = ${sv(v)} × 10<sup>${String(Math.round(Math.log10(f))).replace('-', '−')}</sup> ${si} = ${sci(v * f)} ${si}`)} ✓`, { show: sci(v * f) })) };
};
T.UN3 = R => {
  const est = shuf(R, [['the mass of an apple', '0.1 kg (accept 0.05 kg to 0.3 kg)'], ['the height of a classroom', '3 m (accept 2 m to 4 m)'], ['the mass of an adult', '70 kg (accept 50 kg to 100 kg)'], ['the speed of a person walking', '1.5 m s<sup>−1</sup> (accept 1 to 2 m s<sup>−1</sup>)'], ['the diameter of an atom', '10<sup>−10</sup> m'], ['the wavelength of visible light', '5 × 10<sup>−7</sup> m (accept 4 to 7 × 10<sup>−7</sup> m)'], ['the thickness of a sheet of paper', '0.1 mm (10<sup>−4</sup> m)'], ['the power of an electric kettle', '2 kW (accept 1 kW to 3 kW)'], ['the volume of a classroom', '200 m<sup>3</sup> (accept 100 to 500 m<sup>3</sup>)'], ['the time for one beat of a resting heart', '1 s (accept 0.7 s to 1.2 s)']]).slice(0, 3);
  const [what, vals, sum] = R.pick([['the kinetic energy of an adult running', 'mass ≈ 70 kg and speed ≈ 5 m s<sup>−1</sup>', '½ × 70 × 5<sup>2</sup> ≈ 900 J, so about 10<sup>3</sup> J'], ['the pressure exerted on the floor by an adult standing on both feet', 'weight ≈ 700 N and area of two feet ≈ 0.04 m<sup>2</sup>', '700 / 0.04 ≈ 2 × 10<sup>4</sup> Pa'], ['the gravitational potential energy gained by an adult climbing one flight of stairs', 'mass ≈ 70 kg and height ≈ 3 m', '70 × 9.81 × 3 ≈ 2000 J'], ['the number of atoms along a line 1 mm long', 'diameter of an atom ≈ 10<sup>−10</sup> m', '10<sup>−3</sup> / 10<sup>−10</sup> = 10<sup>7</sup> atoms']]);
  return { stem: `Physicists often make estimates of quantities to check that the result of a calculation is sensible.`,
    parts: [
      ...est.map(([q, a]) => text(`Estimate ${q}.`, 1, `About ${a} ✓`)),
      text(`Estimate ${what}. Show the values that you use.`, 3, `Sensible estimates: ${vals} ✓<br>Correct calculation with these values ✓<br>${eq(sum)} ✓`, ['Accept any answer of the same order of magnitude that follows from sensible estimates.']),
      text('State what is meant by an order of magnitude.', 1, 'A value given to the nearest power of ten ✓')
    ] };
};
T.UN4 = R => {
  const [name, eqn, re, mid, base] = R.pick([['the gravitational constant <i>G</i>', '<i>F</i> = <i>Gm</i><sub>1</sub><i>m</i><sub>2</sub>/<i>r</i><sup>2</sup>', '<i>G</i> = <i>Fr</i><sup>2</sup>/<i>m</i><sub>1</sub><i>m</i><sub>2</sub>', 'kg m s<sup>−2</sup> × m<sup>2</sup> / kg<sup>2</sup>', 'kg<sup>−1</sup> m<sup>3</sup> s<sup>−2</sup>'], ['resistivity <i>ρ</i>', '<i>ρ</i> = <i>RA</i>/<i>L</i>', '<i>R</i> = <i>V</i>/<i>I</i>, and the volt is kg m<sup>2</sup> s<sup>−3</sup> A<sup>−1</sup>, so the ohm is kg m<sup>2</sup> s<sup>−3</sup> A<sup>−2</sup>', 'kg m<sup>2</sup> s<sup>−3</sup> A<sup>−2</sup> × m<sup>2</sup> / m', 'kg m<sup>3</sup> s<sup>−3</sup> A<sup>−2</sup>'], ['the Planck constant <i>h</i>', '<i>E</i> = <i>hf</i>', '<i>h</i> = <i>E</i>/<i>f</i>', 'kg m<sup>2</sup> s<sup>−2</sup> / s<sup>−1</sup>', 'kg m<sup>2</sup> s<sup>−1</sup>'], ['the spring constant <i>k</i>', '<i>F</i> = <i>k</i>Δ<i>L</i>', '<i>k</i> = <i>F</i>/Δ<i>L</i>', 'kg m s<sup>−2</sup> / m', 'kg s<sup>−2</sup>'], ['specific heat capacity <i>c</i>', '<i>Q</i> = <i>mc</i>Δ<i>θ</i>', '<i>c</i> = <i>Q</i>/<i>m</i>Δ<i>θ</i>', 'kg m<sup>2</sup> s<sup>−2</sup> / (kg K)', 'm<sup>2</sup> s<sup>−2</sup> K<sup>−1</sup>'], ['the Young modulus <i>E</i>', '<i>E</i> = stress / strain', 'strain has no unit, so the unit is that of stress, <i>F</i>/<i>A</i>', 'kg m s<sup>−2</sup> / m<sup>2</sup>', 'kg m<sup>−1</sup> s<sup>−2</sup>']]);
  return { stem: `The equation ${eq(eqn)} is on the data and formulae sheet.`,
    parts: [
      text('Express the newton in SI base units.', 1, `${eq('kg m s<sup>−2</sup>')} ✓`),
      text('Express the joule in SI base units.', 1, `${eq('N m = kg m<sup>2</sup> s<sup>−2</sup>')} ✓`),
      text(`Use the equation to express the unit of ${name} in SI base units.`, 3, `${cap(re)} ✓<br>${eq(mid)} ✓<br>${eq(base)} ✓`),
      text('State why a quantity that is the ratio of two lengths, such as strain, has no unit.', 1, 'The units of the two lengths cancel ✓')
    ] };
};
T.UN5 = R => {
  const sf = shuf(R, [['0.0450', 3], ['6.63 × 10<sup>−34</sup>', 3], ['20.0', 3], ['0.007', 1], ['1.60', 3], ['9.8', 2], ['3.0 × 10<sup>8</sup>', 2], ['0.50', 2], ['101.3', 4]]).slice(0, 3), d = R.pick([12.6, 45.3, 8.75, 27.4]), t = R.pick([2.3, 3.7, 1.4, 5.8]), v = d / t;
  return { stem: `The number of significant figures in a result should match the precision of the data used to calculate it.`,
    parts: [
      ...sf.map(([s, n]) => text(`State the number of significant figures in the value ${s}.`, 1, `${n} ✓`)),
      calc(`A trolley travels ${d} m in ${t} s.<br>Calculate its average speed. Give your answer to an appropriate number of significant figures.`, 2, v, MS1, `${eq(`${d} / ${t} = ${N(v, 4)} ${MS1}`)} ✓<br>${eq(`= ${N(v, 2)} ${MS1}`)} to 2 significant figures ✓`, { show: N(v, 2) }),
      text('Explain your choice of the number of significant figures.', 1, `The time is given to only 2 significant figures, so the answer cannot be more precise than that ✓`)
    ] };
};
const CONV = [['72 km h<sup>−1</sup>', 'm s<sup>−1</sup>', 20, '72 × 1000 / 3600'], ['15 cm<sup>2</sup>', 'm<sup>2</sup>', 1.5e-3, '15 × (10<sup>−2</sup>)<sup>2</sup>'], ['8.9 g cm<sup>−3</sup>', 'kg m<sup>−3</sup>', 8900, '8.9 × 10<sup>−3</sup> / 10<sup>−6</sup>'], ['2.5 kW h', 'J', 9.0e6, '2500 × 3600'], ['5.0 eV', 'J', 8.0e-19, '5.0 × 1.60 × 10<sup>−19</sup>'], ['250 cm<sup>3</sup>', 'm<sup>3</sup>', 2.5e-4, '250 × (10<sup>−2</sup>)<sup>3</sup>'], ['45°', 'rad', PI / 4, '45 × π / 180'], ['1.2 mm<sup>2</sup>', 'm<sup>2</sup>', 1.2e-6, '1.2 × (10<sup>−3</sup>)<sup>2</sup>'], ['108 km h<sup>−1</sup>', 'm s<sup>−1</sup>', 30, '108 × 1000 / 3600'], ['36 minutes', 's', 2160, '36 × 60']];
T.UN6 = R => {
  const items = shuf(R, CONV).slice(0, 5);
  return { stem: `Quantities must often be converted to SI units before they are used in a calculation.`,
    parts: [...items.map(([a, u, v, w]) => calc(`Convert ${a} to ${u}.`, 1, v, u, `${eq(`${w} = ${A(v)} ${u}`)} ✓`)),
      text('Explain why 1 cm<sup>2</sup> is equal to 10<sup>−4</sup> m<sup>2</sup> and not 10<sup>−2</sup> m<sup>2</sup>.', 1, 'An area is a length multiplied by a length, so the conversion factor is applied twice: (10<sup>−2</sup> m)<sup>2</sup> = 10<sup>−4</sup> m<sup>2</sup> ✓')] };
};
/* --- errors, precision and accuracy --- */
T.UE1 = R => {
  const ex = shuf(R, [['A micrometer reads 0.02 mm when its jaws are closed.', 'Systematic (a zero error)'], ['A student starts and stops a stopwatch by hand.', 'Random (reaction time varies)'], ['A metre ruler has a worn end, so its scale starts at 2 mm.', 'Systematic'], ['The reading on a balance flickers because of draughts.', 'Random'], ['A scale is always read from the same side, at an angle.', 'Systematic (parallax error in the same direction each time)'], ['The background count is not subtracted from the readings of a Geiger counter.', 'Systematic'], ['A thermometer is read while the temperature fluctuates slightly.', 'Random']]).slice(0, 3);
  return { stem: `All measurements are affected by errors.`,
    parts: [
      text('Describe what is meant by a random error and state how its effect can be reduced.', 2, 'An error that causes readings to be scattered unpredictably about the true value ✓<br>Take repeat readings and calculate a mean (or plot a graph and draw a line of best fit) ✓'),
      text('Describe what is meant by a systematic error and state how it can be dealt with.', 2, 'An error that makes every reading differ from the true value by the same amount in the same direction ✓<br>Check for a zero error and correct the readings, or recalibrate the instrument (repeating readings does not help) ✓'),
      ...ex.map(([s, a]) => text(`State whether this causes a random error or a systematic error:<br>${s}`, 1, `${a} ✓`)),
      text('State the effect of a systematic error in every value of <i>y</i> on a straight-line graph of <i>y</i> against <i>x</i>.', 1, 'The line is shifted up or down, so the intercept changes but the gradient does not ✓')
    ] };
};
T.UE2 = R => {
  const [what, tv, unit, dp] = R.pick([['the acceleration of free fall', 9.81, MS2, 2], ['the resistance of a resistor whose true value is 47.0 Ω', 47.0, 'Ω', 1], ['the density of water, which is 1.00 g cm<sup>−3</sup>', 1.00, 'g cm<sup>−3</sup>', 2]]), s = dp === 1 ? 10 : tv < 2 ? 0.1 : 1;
  const offA = R.pick([-0.38, 0.41, -0.29]) * s, A_ = [-.01, .01, 0].map(e => tv + offA + e * (tv < 2 ? 1 : s)), B_ = [-.21, .30, -.12].map(e => tv + e * s), mA = A_.reduce((a, b) => a + b) / 3, mB = B_.reduce((a, b) => a + b) / 3, f = x => F2(x, dp);
  return { stem: `Two students each make three measurements of ${what}.<br>Student <b>A</b>: ${A_.map(f).join(', ')} ${unit}<br>Student <b>B</b>: ${B_.map(f).join(', ')} ${unit}${/true|which is/.test(what) ? '' : `<br>The accepted value is ${f(tv)} ${unit}.`}`,
    parts: [
      calc('Calculate the mean value obtained by student <b>A</b>.', 1, mA, unit, `${eq(`(${A_.map(f).join(' + ')}) / 3 = ${f(mA)} ${unit}`)} ✓`, { show: f(mA) }),
      calc('Calculate the mean value obtained by student <b>B</b>.', 1, mB, unit, `${eq(`(${B_.map(f).join(' + ')}) / 3 = ${f(mB)} ${unit}`)} ✓`, { show: f(mB) }),
      text('State and explain which student’s results are more precise.', 2, 'Student <b>A</b> ✓<br>The readings are closer together (they have a smaller range) ✓'),
      text('State and explain which student’s results are more accurate.', 2, 'Student <b>B</b> ✓<br>The mean is closer to the true (accepted) value ✓'),
      text('Suggest the type of error that affects the results of student <b>A</b>.', 1, 'A systematic error (all the readings are shifted by about the same amount) ✓'),
      text('State what is meant by the resolution of a measuring instrument.', 1, 'The smallest change in the quantity that the instrument can detect (the smallest scale division) ✓')
    ] };
};
T.UE3 = R => {
  const base = R.pick([1.42, 2.34, 0.86, 3.15]), rd = [base - .02, base + .02, base + .31, base, base + .04], good = rd.filter((_, i) => i !== 2), mean = base + .01, f = x => F2(x, 2);
  return { stem: `A student times a ball rolling down a ramp five times and records these values:<br>${rd.map(f).join(' s, ')} s`,
    parts: [
      text('Identify the anomalous result and state what should be done with it.', 1, `${f(rd[2])} s; it should be left out of the mean (and repeated if possible) ✓`),
      calc('Calculate the mean time.', 2, mean, 's', `${eq(`(${good.map(f).join(' + ')}) / 4`)} ✓<br>${eq(`= ${f(mean)} s`)} ✓`, { show: f(mean) }),
      calc('Calculate the absolute uncertainty in the mean time.', 2, .03, 's', `Uncertainty = half the range ${eq(`= (${f(base + .04)} − ${f(base - .02)}) / 2`)} ✓<br>${eq('= ± 0.03 s')} ✓`, { show: '0.03' }),
      calc('Calculate the percentage uncertainty in the mean time.', 1, 3 / mean, '%', `${eq(`(0.03 / ${f(mean)}) × 100 = ${pct(3 / mean)}`)} ✓`, { show: N(3 / mean, 2) }),
      text('Suggest one way of reducing the uncertainty in the time.', 1, 'Use light gates and an electronic timer in place of a hand-operated stopwatch (or use a longer ramp so the time is greater) ✓'),
      text('State why the mean should not be quoted to more decimal places than the readings.', 1, 'The readings are only known to 0.01 s, so extra figures would suggest a precision that the measurements do not have ✓')
    ] };
};
T.UE4 = R => {
  const L = R.pick([0.850, 1.200, 0.640]), d = R.pick([0.27, 0.31, 0.38]), I = R.pick([0.25, 0.42, 0.36]), pL = .1 / L, pd = 1 / d, pI = 1 / I, big = pd >= pI ? 'diameter' : 'current';
  return { stem: `In an experiment to find the resistivity of a wire, a student records these measurements:<br>length of wire = ${F2(L, 3)} m, measured with a metre ruler (uncertainty ± 0.001 m)<br>diameter of wire = ${F2(d, 2)} mm, measured with a micrometer (uncertainty ± 0.01 mm)<br>current = ${F2(I, 2)} A, measured with an ammeter (uncertainty ± 0.01 A)`,
    parts: [
      calc('Calculate the percentage uncertainty in the length.', 1, pL, '%', `${eq(`(0.001 / ${F2(L, 3)}) × 100 = ${pct(pL)}`)} ✓`, { show: N(pL, 2) }),
      calc('Calculate the percentage uncertainty in the diameter.', 1, pd, '%', `${eq(`(0.01 / ${F2(d, 2)}) × 100 = ${pct(pd)}`)} ✓`, { show: N(pd, 2) }),
      calc('Calculate the percentage uncertainty in the current.', 1, pI, '%', `${eq(`(0.01 / ${F2(I, 2)}) × 100 = ${pct(pI)}`)} ✓`, { show: N(pI, 2) }),
      text('State which measurement contributes most to the uncertainty in the resistivity. Explain your answer.', 2, `The diameter ✓<br>${big === 'diameter' ? 'It has the largest percentage uncertainty, and' : 'Its percentage uncertainty is large and'} it is squared to find the cross-sectional area, so its percentage uncertainty is doubled (${pct(2 * pd)}) ✓`),
      text('Suggest one way of reducing the percentage uncertainty in the diameter.', 1, 'Measure the diameter at several places along the wire and calculate a mean (or use a thicker wire) ✓'),
      text('Explain why the uncertainty in a length measured with a ruler marked in mm is taken as ± 1 mm and not ± 0.5 mm.', 1, 'Both ends of the object have to be read against the scale, and each reading has an uncertainty of ± 0.5 mm ✓')
    ] };
};
T.UE5 = R => {
  const Tp = R.pick([1.42, 1.80, 2.01, 1.10]), p1 = 20 / Tp, p20 = 20 / (20 * Tp);
  return { stem: `A student uses a stopwatch to measure the period of a pendulum, which is about ${F2(Tp, 2)} s. The uncertainty in any time measured by hand is ± 0.2 s, because of the student’s reaction time.`,
    parts: [
      calc('Calculate the percentage uncertainty if the student times one oscillation.', 2, p1, '%', `${eq(`(0.2 / ${F2(Tp, 2)}) × 100`)} ✓<br>${eq(`= ${pct(p1)}`)} ✓`, { show: N(p1, 2) }),
      calc('Calculate the percentage uncertainty if the student times 20 oscillations.', 2, p20, '%', `Time for 20 oscillations ${eq(`= 20 × ${F2(Tp, 2)} = ${N(20 * Tp, 3)} s`)} ✓<br>${eq(`(0.2 / ${N(20 * Tp, 3)}) × 100 = ${pct(p20)}`)} ✓`, { show: N(p20, 2) }),
      calc('Calculate the absolute uncertainty in the period found by timing 20 oscillations.', 1, .01, 's', `${eq('0.2 / 20 = ± 0.01 s')} ✓`, { show: '0.01' }),
      text('State the purpose of a fiducial marker in this experiment.', 1, 'It marks a fixed reference position, so the student can judge exactly when the pendulum passes it and count whole oscillations ✓'),
      text('State and explain where the fiducial marker should be placed.', 1, 'At the centre of the swing (the equilibrium position), where the pendulum moves fastest, so the moment it passes is judged most precisely ✓')
    ] };
};
/* --- uncertainties in calculations and graphs --- */
T.UC1 = R => {
  const d = R.pick([1.20, 1.56, 2.02]), L = R.pick([5.0, 6.4, 8.2]), m = Number((R.pick([2.70, 7.85, 8.96, 8.50]) * PI * d * d / 4 * L).toFixed(1)), rho = m / (PI * d * d / 4 * L), pm = 10 / m, pd = 1 / d, pL = 10 / L, tot = pm + 2 * pd + pL, ab = rho * tot / 100;
  return { stem: `A student determines the density of a metal cylinder from these measurements:<br>mass = ${F2(m, 1)} ± 0.1 g<br>diameter = ${F2(d, 2)} ± 0.01 cm<br>length = ${F2(L, 1)} ± 0.1 cm`,
    parts: [
      calc('Calculate the density of the metal in g cm<sup>−3</sup>.', 2, rho, 'g cm<sup>−3</sup>', `${eq(`<i>V</i> = π<i>d</i><sup>2</sup><i>L</i>/4 = π × ${F2(d, 2)}<sup>2</sup> × ${F2(L, 1)} / 4 = ${N(PI * d * d / 4 * L)} cm<sup>3</sup>`)} ✓<br>${eq(`<i>ρ</i> = ${F2(m, 1)} / ${N(PI * d * d / 4 * L)} = ${A(rho)} g cm<sup>−3</sup>`)} ✓`),
      calc('Calculate the percentage uncertainty in the mass.', 1, pm, '%', `${eq(`(0.1 / ${F2(m, 1)}) × 100 = ${pct(pm)}`)} ✓`, { show: N(pm, 2) }),
      calc('Calculate the percentage uncertainty in the diameter.', 1, pd, '%', `${eq(`(0.01 / ${F2(d, 2)}) × 100 = ${pct(pd)}`)} ✓`, { show: N(pd, 2) }),
      calc('Calculate the percentage uncertainty in the length.', 1, pL, '%', `${eq(`(0.1 / ${F2(L, 1)}) × 100 = ${pct(pL)}`)} ✓`, { show: N(pL, 2) }),
      calc('Calculate the percentage uncertainty in the density.', 2, tot, '%', `The diameter is squared, so its percentage uncertainty is doubled ✓<br>${eq(`${pct(pm)} + (2 × ${pct(pd)}) + ${pct(pL)} = ${pct(tot)}`)} ✓`, { show: N(tot, 2), tol: .04 }),
      calc('Calculate the absolute uncertainty in the density.', 1, ab, 'g cm<sup>−3</sup>', `${eq(`${N(tot, 2)}% of ${A(rho)} = ± ${N(ab, 1)} g cm<sup>−3</sup>`)} ✓`, { show: N(ab, 1), tol: .3 })
    ] };
};
T.UC2 = R => {
  const V = R.pick([4.8, 6.2, 9.5]), I = R.pick([0.24, 0.36, 0.52]), Rr = V / I, pV = 10 / V, pI = 1 / I, tot = pV + pI, ab = Rr * tot / 100;
  return { stem: `A student measures the potential difference across a resistor and the current in it:<br><i>V</i> = ${F2(V, 1)} ± 0.1 V<br><i>I</i> = ${F2(I, 2)} ± 0.01 A`,
    parts: [
      calc('Calculate the resistance of the resistor.', 1, Rr, 'Ω', `${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${F2(V, 1)} / ${F2(I, 2)} = ${A(Rr)} Ω`)} ✓`),
      calc('Calculate the percentage uncertainty in the potential difference.', 1, pV, '%', `${eq(`(0.1 / ${F2(V, 1)}) × 100 = ${pct(pV)}`)} ✓`, { show: N(pV, 2) }),
      calc('Calculate the percentage uncertainty in the current.', 1, pI, '%', `${eq(`(0.01 / ${F2(I, 2)}) × 100 = ${pct(pI)}`)} ✓`, { show: N(pI, 2) }),
      calc('Calculate the percentage uncertainty in the resistance.', 1, tot, '%', `Percentage uncertainties are added when quantities are divided: ${eq(`${pct(pV)} + ${pct(pI)} = ${pct(tot)}`)} ✓`, { show: N(tot, 2), tol: .04 }),
      calc('Calculate the absolute uncertainty in the resistance.', 1, ab, 'Ω', `${eq(`${N(tot, 2)}% of ${A(Rr)} = ± ${N(ab, 1)} Ω`)} ✓`, { show: N(ab, 1), tol: .3 }),
      text('State which of the two measurements should be improved first to reduce the uncertainty in the resistance. Give a reason.', 1, `The ${pI > pV ? 'current' : 'potential difference'}, because it has the larger percentage uncertainty ✓`)
    ] };
};
T.UC3 = R => {
  const l = R.pick([0.800, 1.000, 1.200]), Tp = Number((2 * PI * Math.sqrt(l / 9.81)).toFixed(2)), g = 4 * PI * PI * l / (Tp * Tp), pl = .2 / l, pT = 1 / Tp, tot = pl + 2 * pT, ab = g * tot / 100, ok = Math.abs(g - 9.81) <= ab;
  return { stem: `A student uses a simple pendulum to determine the acceleration of free fall from the equation <i>g</i> = 4π<sup>2</sup><i>l</i>/<i>T</i><sup>2</sup>. The measurements are:<br>length <i>l</i> = ${F2(l, 3)} ± 0.002 m<br>period <i>T</i> = ${F2(Tp, 2)} ± 0.01 s`,
    parts: [
      calc('Calculate the value of <i>g</i> given by these measurements.', 2, g, MS2, `${eq(`<i>g</i> = 4π<sup>2</sup> × ${F2(l, 3)} / ${F2(Tp, 2)}<sup>2</sup>`)} ✓<br>${eq(`<i>g</i> = ${A(g)} ${MS2}`)} ✓`),
      calc('Calculate the percentage uncertainty in <i>l</i>.', 1, pl, '%', `${eq(`(0.002 / ${F2(l, 3)}) × 100 = ${pct(pl)}`)} ✓`, { show: N(pl, 2) }),
      calc('Calculate the percentage uncertainty in <i>T</i>.', 1, pT, '%', `${eq(`(0.01 / ${F2(Tp, 2)}) × 100 = ${pct(pT)}`)} ✓`, { show: N(pT, 2) }),
      calc('Calculate the percentage uncertainty in <i>g</i>.', 2, tot, '%', `<i>T</i> is squared, so its percentage uncertainty is doubled ✓<br>${eq(`${pct(pl)} + (2 × ${pct(pT)}) = ${pct(tot)}`)} ✓`, { show: N(tot, 2), tol: .04 }),
      calc('Calculate the absolute uncertainty in <i>g</i>.', 1, ab, MS2, `${eq(`${N(tot, 2)}% of ${A(g)} = ± ${N(ab, 1)} ${MS2}`)} ✓`, { show: N(ab, 1), tol: .3 }),
      text(`State and explain whether the result is consistent with the accepted value of 9.81 ${MS2}.`, 1, ok ? `Yes: 9.81 ${MS2} lies within the range ${A(g)} ± ${N(ab, 1)} ${MS2} ✓` : `No: 9.81 ${MS2} lies outside the range ${A(g)} ± ${N(ab, 1)} ${MS2} ✓`)
    ] };
};
T.UC4 = R => {
  const gb = R.pick([2.45, 3.10, 4.80, 6.25]), gw = r3(gb * (1 + R.pick([.04, .06, .08]) * (R.chance(.5) ? 1 : -1))), ab = Math.abs(gb - gw), p = ab / gb * 100, [q, u] = R.pick([['resistance', 'Ω'], ['spring constant', 'N m<sup>−1</sup>'], ['speed', MS1]]);
  return { stem: `A student plots a straight-line graph with error bars to determine the ${q} of an object. The gradient of the line of best fit is ${F2(gb, 2)} ${u}. The student also draws a “worst acceptable line”, which has a gradient of ${F2(gw, 2)} ${u}.`,
    parts: [
      text('State what an error bar on a plotted point shows.', 1, 'The range within which the true value of the plotted quantity is likely to lie (the absolute uncertainty in the value) ✓'),
      text('Describe how a worst acceptable line is drawn.', 2, 'It is the steepest or the shallowest straight line ✓<br>that still passes through all the error bars ✓'),
      calc('Calculate the absolute uncertainty in the gradient.', 1, ab, u, `${eq(`${F2(Math.max(gb, gw), 2)} − ${F2(Math.min(gb, gw), 2)} = ± ${F2(ab, 2)} ${u}`)} ✓`, { show: F2(ab, 2) }),
      calc('Calculate the percentage uncertainty in the gradient.', 2, p, '%', `${eq(`(${F2(ab, 2)} / ${F2(gb, 2)}) × 100`)} ✓<br>${eq(`= ${pct(p)}`)} ✓`, { show: N(p, 2) }),
      text(`State the value of the ${q} with its uncertainty.`, 1, `${eq(`${F2(gb, 2)} ± ${F2(ab, 2)} ${u}`)} (accept ${N(gb, 2)} ± ${N(ab, 1)} ${u}) ✓`)
    ] };
};
T.UC5 = R => {
  const d = R.pick([0.27, 0.31, 0.38]), x = R.pick([2.4, 3.2, 4.5]), pF = 1.0, pL = 0.1, pd = 1 / d, px = 10 / x, tot = pF + pL + 2 * pd + px;
  return { stem: `A student determines the Young modulus of a metal from the equation <i>E</i> = <i>FL</i>/<i>A</i>Δ<i>L</i>, using these measurements:<br>force <i>F</i> = 50.0 ± 0.5 N<br>length <i>L</i> = 2.000 ± 0.002 m<br>diameter of wire = ${F2(d, 2)} ± 0.01 mm<br>extension Δ<i>L</i> = ${F2(x, 1)} ± 0.1 mm`,
    parts: [
      text('Calculate the percentage uncertainty in the force and in the length.', 2, `Force: ${eq('(0.5 / 50.0) × 100 = 1.0%')} ✓<br>Length: ${eq('(0.002 / 2.000) × 100 = 0.10%')} ✓`),
      calc('Calculate the percentage uncertainty in the diameter.', 1, pd, '%', `${eq(`(0.01 / ${F2(d, 2)}) × 100 = ${pct(pd)}`)} ✓`, { show: N(pd, 2) }),
      calc('Calculate the percentage uncertainty in the extension.', 1, px, '%', `${eq(`(0.1 / ${F2(x, 1)}) × 100 = ${pct(px)}`)} ✓`, { show: N(px, 2) }),
      calc('Calculate the percentage uncertainty in the Young modulus.', 2, tot, '%', `The area depends on diameter<sup>2</sup>, so the percentage uncertainty in the diameter is doubled ✓<br>${eq(`1.0% + 0.10% + (2 × ${pct(pd)}) + ${pct(px)} = ${pct(tot)}`)} ✓`, { show: N(tot, 2), tol: .04 }),
      text('State which measurement should be improved first and suggest how.', 2, `The ${2 * pd >= px ? 'diameter, which contributes most because its percentage uncertainty is doubled' : 'extension, which contributes most'} ✓<br>${2 * pd >= px ? 'Measure the diameter in several places and directions and use the mean (a digital micrometer with a smaller resolution would also help)' : 'Use a longer wire or a larger load to give a larger extension, or a vernier scale with a smaller resolution'} ✓`)
    ] };
};
T.UC6 = R => {
  const g = R.pick([9.62, 9.71, 9.95, 10.1, 9.4]), u = R.pick([0.15, 0.20, 0.30]), pu = u / g * 100, pdiff = Math.abs(g - 9.81) / 9.81 * 100, ok = Math.abs(g - 9.81) <= u, f = x => F2(x, 2);
  return { stem: `A student obtains a value of ${f(g)} ± ${f(u)} ${MS2} for the acceleration of free fall. The accepted value is 9.81 ${MS2}.`,
    parts: [
      calc('Calculate the percentage uncertainty in the student’s value.', 1, pu, '%', `${eq(`(${f(u)} / ${f(g)}) × 100 = ${pct(pu)}`)} ✓`, { show: N(pu, 2) }),
      calc('Calculate the percentage difference between the student’s value and the accepted value.', 2, pdiff, '%', `${eq(`(${f(Math.abs(g - 9.81))} / 9.81) × 100`)} ✓<br>${eq(`= ${pct(pdiff)}`)} ✓`, { show: N(pdiff, 2) }),
      text('State and explain whether the student’s result is consistent with the accepted value.', 2, `${ok ? 'Yes' : 'No'} ✓<br>The range of the result is ${f(g - u)} to ${f(g + u)} ${MS2}, which ${ok ? 'includes' : 'does not include'} 9.81 ${MS2} (the percentage difference is ${ok ? 'smaller' : 'larger'} than the percentage uncertainty) ✓`),
      text(ok ? 'State what the student could do to obtain a more precise result.' : 'Suggest what this shows about the experiment.', 1, ok ? 'Reduce the uncertainties, for example by timing more oscillations or using instruments with a smaller resolution ✓' : 'There is probably a systematic error that the student has not allowed for (the uncertainty has been underestimated) ✓'),
      text('State the difference between the accuracy and the precision of a result.', 1, 'Accuracy is how close the result is to the true value; precision is how close repeated measurements are to each other ✓')
    ] };
};
const TEMPLATES = Object.keys(T).sort();
function seedFor(tpl, seed){ let hsh = 0; for (const ch of tpl) hsh = (hsh * 31 + ch.charCodeAt(0)) >>> 0; return (seed * 2654435761 + hsh) >>> 0; }
function makeQuestion(tpl, seed){
  if (!T[tpl]) throw new Error('Unknown question type ' + tpl);
  const q = T[tpl](makeRand(seedFor(tpl, seed)));
  q.id = tpl; q.seed = seed; q.code = tpl + '-' + seed; q.topic = tpl.replace(/\d+/, ''); q.topicName = TOPICS[q.topic];
  q.figures = q.figs || []; q.errors = [];
  q.parts.forEach(p => { if (p.guide && !p.guide.length) delete p.guide; });
  q.marks = q.parts.reduce((a, p) => a + p.marks, 0);
  return q;
}
const ENGINE = { TOPICS, TEMPLATES, makeQuestion, disp, N, A, T };
if (typeof module !== 'undefined') module.exports = ENGINE;

return ENGINE;
})();
