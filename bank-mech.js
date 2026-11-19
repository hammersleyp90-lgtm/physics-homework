/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_MECH = (function(){
const module = undefined;
'use strict';
/* Question types for AQA mechanics (3.4.1). */
const TOPICS = { VS: 'Scalars and vectors', MO: 'Moments', SL: 'Motion along a straight line', PJ: 'Projectile motion', NL: 'Newton’s laws of motion', MT: 'Momentum', WE: 'Work, energy and power', CE: 'Conservation of energy' };
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
/* ---------- mechanics (AQA 3.4.1) ---------- */
const G = 9.81, MS2 = 'm s<sup>−2</sup>', KGMS = 'kg m s<sup>−1</sup>';
const sinD = x => Math.sin(deg(x)), cosD = x => Math.cos(deg(x)), tanD = x => Math.tan(deg(x));
const arrow = (x1, y1, x2, y2) => ln(x1, y1, x2, y2, 'stroke-width="1.8"') + head(x2, y2, x2 - x1, y2 - y1);
const tri = (x, y) => `<polygon points="${x},${y} ${x - 11},${y + 20} ${x + 11},${y + 20}" fill="#e9edf2" stroke="#000" stroke-width="1.4"/>`;
// a horizontal beam: pivots [{at, label}], loads [{at, label}] drawn as downward arrows, dims [{a, b, label, row}]; positions are fractions of the beam
function beamFig(o){
  const x0 = 60, x1 = 380, y = 110, X = f => x0 + (x1 - x0) * f; let b = `<rect x="${x0}" y="${y}" width="${x1 - x0}" height="12" fill="#e9edf2" stroke="#000" stroke-width="1.5"/>`;
  (o.pivots || []).forEach(p => { b += tri(X(p.at), y + 12) + (p.label ? tx(X(p.at), y + 50, p.label, 'font-weight="700"') : ''); });
  (o.loads || []).forEach(l => { b += arrow(X(l.at), y + 12, X(l.at), y + 62) + tx(X(l.at), y + 80, l.label); });
  (o.dims || []).forEach(d => { const yy = y - 22 - 30 * (d.row || 0); b += dimLine(X(d.a), yy, X(d.b), yy) + ln(X(d.a), yy - 6, X(d.a), y - 3, 'stroke-width="0.8"') + ln(X(d.b), yy - 6, X(d.b), y - 3, 'stroke-width="0.8"') + tx((X(d.a) + X(d.b)) / 2, yy - 7, d.label, 'font-size="14"'); });
  (o.marks || []).forEach(k => { const yy = y - 16 - 24 * (k.row || 0); b += ln(X(k.at), y - 2, X(k.at), yy + 4, 'stroke-width="0.9"') + tx(X(k.at), yy - 2, k.label, 'font-size="13"'); });
  return svgWrap(440, 215, o.aria, b + tx(400, 205, 'not to scale', 'font-size="12"'));
}
function inclineFig(angle, aria){
  const a = deg(24), x0 = 50, y0 = 200, L = 320, x1 = x0 + L * Math.cos(a), y1 = y0 - L * Math.sin(a); let b = `<polygon points="${x0},${y0} ${n2(x1)},${y0} ${n2(x1)},${n2(y1)}" fill="#e9edf2" stroke="#000" stroke-width="1.5"/>`;
  const cx = x0 + 170 * Math.cos(a), cy = y0 - 170 * Math.sin(a);
  b += `<g transform="translate(${n2(cx)} ${n2(cy)}) rotate(-24)"><rect x="-30" y="-36" width="60" height="36" fill="#fff" stroke="#000" stroke-width="1.6"/></g>`;
  b += `<path d="M ${x0 + 62} ${y0} A 62 62 0 0 0 ${n2(x0 + 62 * Math.cos(a))} ${n2(y0 - 62 * Math.sin(a))}" fill="none" stroke="#000" stroke-width="1.1"/>` + tx(x0 + 86, y0 - 9, angle + '°');
  return svgWrap(420, 225, aria, b + tx(cx + 2, cy - 62, 'block', 'font-size="13"') + tx(380, 218, 'not to scale', 'font-size="12"'));
}
function hangFig(angle){
  let b = `<rect x="60" y="22" width="300" height="10" fill="#c9ced6" stroke="#000" stroke-width="1.2"/>` + ln(110, 32, 210, 130, 'stroke-width="1.8"') + ln(310, 32, 210, 130, 'stroke-width="1.8"') + ln(210, 32, 210, 130, 'stroke-dasharray="5 4" stroke-width="1"') + ln(210, 130, 210, 160, 'stroke-width="1.8"');
  b += `<rect x="186" y="160" width="48" height="36" fill="#e9edf2" stroke="#000" stroke-width="1.5"/>` + tx(192, 96, angle + '°', 'font-size="14"') + tx(229, 96, angle + '°', 'font-size="14"') + tx(128, 92, 'string', 'font-size="13"') + tx(294, 92, 'string', 'font-size="13"') + tx(270, 184, 'load', 'font-size="13"');
  return svgWrap(420, 215, 'A load hanging from two strings that are fixed to a ceiling. Each string makes the same angle with the vertical', b + tx(380, 208, 'not to scale', 'font-size="12"'));
}
function pulleyFig(){
  let b = `<rect x="40" y="110" width="270" height="14" fill="#c9ced6" stroke="#000" stroke-width="1.2"/>` + ln(60, 124, 60, 200, 'stroke-width="3"') + ln(290, 124, 290, 200, 'stroke-width="3"');
  b += `<rect x="90" y="78" width="70" height="24" fill="#e9edf2" stroke="#000" stroke-width="1.5"/><circle cx="105" cy="104" r="6" fill="#fff" stroke="#000" stroke-width="1.4"/><circle cx="145" cy="104" r="6" fill="#fff" stroke="#000" stroke-width="1.4"/>`;
  b += ln(160, 90, 322, 90, 'stroke-width="1.4"') + `<circle cx="322" cy="102" r="12" fill="#fff" stroke="#000" stroke-width="1.5"/>` + ln(310, 110, 322, 102, 'stroke-width="2"') + ln(334, 102, 334, 160, 'stroke-width="1.4"') + `<rect x="318" y="160" width="32" height="30" fill="#e9edf2" stroke="#000" stroke-width="1.5"/>`;
  return svgWrap(420, 215, 'A trolley on a horizontal table. A string from the trolley passes over a pulley at the edge of the table to a hanging mass', b + tx(125, 66, 'trolley', 'font-size="13"') + tx(240, 80, 'string', 'font-size="13"') + tx(352, 86, 'pulley', 'font-size="13"', ) + tx(385, 180, 'mass', 'font-size="13"') + tx(175, 145, 'table', 'font-size="13"'));
}
const pw = (pts) => x => { for (let i = 0; i + 1 < pts.length; i++){ const [xa, ya] = pts[i], [xb, yb] = pts[i + 1]; if (x >= xa - 1e-9 && x <= xb + 1e-9) return ya + (yb - ya) * (x - xa) / (xb - xa || 1); } return -1; };

/* --- scalars and vectors --- */
T.VS1 = R => {
  const F = R.pick([80, 120, 150, 200, 250]), th = R.pick([25, 30, 35, 40, 50, 60]), [lst, vec] = R.pick([['speed, velocity, mass, weight, energy, acceleration', 'Velocity, weight and acceleration'], ['distance, displacement, force, power, momentum, time', 'Displacement, force and momentum'], ['work done, momentum, temperature, force, speed, displacement', 'Momentum, force and displacement']]);
  return { stem: `A sledge is pulled along horizontal ground by a rope. The tension in the rope is ${F} N and the rope makes an angle of ${th}° with the horizontal.`,
    parts: [
      text('State the difference between a scalar quantity and a vector quantity.', 2, 'A scalar has magnitude only ✓<br>A vector has both magnitude and direction ✓'),
      calc('Calculate the horizontal component of the tension.', 2, F * cosD(th), 'N', `${eq(`${F} × cos ${th}°`)} ✓<br>${eq(`= ${A(F * cosD(th))} N`)} ✓`),
      calc('Calculate the vertical component of the tension.', 1, F * sinD(th), 'N', `${eq(`${F} × sin ${th}° = ${A(F * sinD(th))} N`)} ✓`),
      text(`State which of the following quantities are vectors:<br>${lst}`, 2, `${vec} ✓✓`, ['Award one mark for two correct with no incorrect quantity, or for all three correct with one incorrect quantity.'])
    ] };
};
T.VS2 = R => {
  const vb = R.pick([1.5, 2.0, 2.5, 3.0]), vc = R.pick([0.80, 1.0, 1.2, 1.5]), w = R.pick([40, 60, 90, 120]), v = Math.hypot(vb, vc), ang = Math.atan(vc / vb) * 180 / Math.PI, t = w / vb;
  return { stem: `A boat is steered straight across a river that is ${w} m wide. The boat travels at ${N(vb, 2)} ${MS1} relative to the water. The water flows parallel to the banks at ${N(vc, 2)} ${MS1}.`,
    parts: [
      calc('Calculate the magnitude of the resultant velocity of the boat.', 2, v, MS1, `${eq(`<i>v</i> = √(${N(vb, 2)}<sup>2</sup> + ${N(vc, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the angle between the resultant velocity and the direction straight across the river.', 2, ang, '°', `${eq(`tan <i>θ</i> = ${N(vc, 2)} / ${N(vb, 2)}`)} ✓<br>${eq(`<i>θ</i> = ${A(ang)}°`)} ✓`),
      calc('Calculate the time taken for the boat to cross the river.', 2, t, 's', `Only the component of velocity across the river matters: ${eq(`<i>t</i> = ${w} / ${N(vb, 2)}`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the distance the boat is carried downstream while it crosses.', 1, vc * t, 'm', `${eq(`${N(vc, 2)} × ${A(t)} = ${A(vc * t)} m`)} ✓`)
    ] };
};
T.VS3 = R => {
  const W = R.pick([12, 20, 30, 45, 60]), th = R.pick([25, 30, 35, 40, 50, 60]), Tn = W / (2 * cosD(th));
  return { stem: `<b>Figure 1</b> shows a load of weight ${W} N hanging in equilibrium from two strings. Each string makes an angle of ${th}° with the vertical.`, figs: [hangFig(th)],
    parts: [
      text('State the condition for the load to be in equilibrium.', 1, 'The resultant force on it is zero (the three forces form a closed triangle) ✓'),
      calc('Calculate the tension in each string.', 3, Tn, 'N', `The vertical components of the two tensions support the weight: ${eq(`2<i>T</i> cos ${th}° = ${W}`)} ✓<br>${eq(`<i>T</i> = ${W} / (2 × cos ${th}°)`)} ✓<br>${eq(`<i>T</i> = ${A(Tn)} N`)} ✓`),
      text('The strings are replaced by longer strings fixed to the same points on the ceiling.<br>State and explain what happens to the tension in each string.', 2, 'The tension decreases ✓<br>Each string makes a smaller angle with the vertical, so a larger fraction of each tension acts vertically (cos <i>θ</i> is larger) and a smaller tension supports the same weight ✓'),
      text('Explain why the two strings can never be pulled perfectly horizontal while they support the load.', 1, 'A horizontal string has no vertical component of tension, so nothing would balance the weight (the tension would need to be infinite) ✓')
    ] };
};
T.VS4 = R => {
  const m = R.pick([1.5, 2.0, 4.0, 5.0, 8.0]), th = R.pick([15, 20, 25, 30, 35]), W = m * G;
  return { stem: `<b>Figure 1</b> shows a block of mass ${N(m, 2)} kg at rest on a rough slope that makes an angle of ${th}° with the horizontal.`, figs: [inclineFig(th, 'A block at rest on a slope')],
    parts: [
      calc('Calculate the weight of the block.', 1, W, 'N', `${eq(`<i>W</i> = <i>mg</i> = ${N(m, 2)} × 9.81 = ${A(W)} N`)} ✓`),
      calc('Calculate the component of the weight that acts parallel to the slope.', 2, W * sinD(th), 'N', `${eq(`<i>W</i> sin <i>θ</i> = ${A(W)} × sin ${th}°`)} ✓<br>${eq(`= ${A(W * sinD(th))} N`)} ✓`),
      calc('Calculate the component of the weight that acts perpendicular to the slope.', 1, W * cosD(th), 'N', `${eq(`<i>W</i> cos <i>θ</i> = ${A(W)} × cos ${th}° = ${A(W * cosD(th))} N`)} ✓`),
      text('State the magnitude and direction of the frictional force on the block. Explain your answer.', 2, `${A(W * sinD(th))} N, acting up the slope ✓<br>The block is in equilibrium, so friction balances the component of the weight down the slope ✓`),
      text('State the magnitude of the normal reaction of the slope on the block.', 1, `${A(W * cosD(th))} N (equal to the component of the weight perpendicular to the slope) ✓`),
      text('The angle of the slope is gradually increased.<br>State what happens to the frictional force while the block remains at rest.', 1, 'It increases (it stays equal to <i>W</i> sin <i>θ</i>) ✓')
    ] };
};
T.VS5 = R => {
  const m = R.pick([0.20, 0.25, 0.40, 0.50]), th = R.pick([15, 20, 25, 30, 35]), W = m * G, Tn = W / cosD(th), F = W * tanD(th);
  return { stem: `A pendulum bob of mass ${N(m, 2)} kg hangs from a string. A horizontal force <i>F</i> pulls the bob to one side and holds it at rest with the string at ${th}° to the vertical.`,
    parts: [
      text('The three forces acting on the bob are drawn to scale as a vector diagram, each starting where the previous one ends.<br>State and explain the shape that is produced.', 2, 'A closed triangle ✓<br>The bob is in equilibrium, so the resultant force is zero and the vectors return to the starting point ✓'),
      calc('Calculate the weight of the bob.', 1, W, 'N', `${eq(`${N(m, 2)} × 9.81 = ${A(W)} N`)} ✓`),
      calc('Calculate the tension in the string.', 2, Tn, 'N', `Resolving vertically: ${eq(`<i>T</i> cos ${th}° = ${A(W)}`)} ✓<br>${eq(`<i>T</i> = ${A(Tn)} N`)} ✓`),
      calc('Calculate the force <i>F</i>.', 2, F, 'N', `Resolving horizontally: ${eq(`<i>F</i> = <i>T</i> sin ${th}° = ${A(Tn)} × sin ${th}°`)} (or ${eq(`<i>F</i> = <i>W</i> tan ${th}°`)}) ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`)
    ] };
};
T.VS6 = R => {
  const a = R.pick([3.0, 4.0, 6.0, 8.0]), b = R.pick([2.0, 3.0, 5.0, 6.0]), t = R.pick([1.5, 2.0, 2.5, 3.0]), d = Math.hypot(a, b), brg = Math.atan(b / a) * 180 / Math.PI;
  return { stem: `A walker travels ${N(a, 2)} km due north and then ${N(b, 2)} km due east. The whole journey takes ${N(t, 2)} hours.`,
    parts: [
      calc('Calculate the total distance travelled.', 1, a + b, 'km', `${eq(`${N(a, 2)} + ${N(b, 2)} = ${A(a + b)} km`)} ✓`),
      calc('Calculate the magnitude of the displacement of the walker from the starting point.', 2, d, 'km', `${eq(`√(${N(a, 2)}<sup>2</sup> + ${N(b, 2)}<sup>2</sup>)`)} ✓<br>${eq(`= ${A(d)} km`)} ✓`),
      calc('Calculate the direction of the displacement as an angle east of north.', 2, brg, '°', `${eq(`tan <i>θ</i> = ${N(b, 2)} / ${N(a, 2)}`)} ✓<br>${eq(`<i>θ</i> = ${A(brg)}°`)} east of north ✓`),
      calc('Calculate the average speed of the walker in km h<sup>−1</sup>.', 1, (a + b) / t, 'km h<sup>−1</sup>', `${eq(`${A(a + b)} / ${N(t, 2)} = ${A((a + b) / t)} km h<sup>−1</sup>`)} ✓`),
      calc('Calculate the magnitude of the average velocity of the walker in km h<sup>−1</sup>.', 1, d / t, 'km h<sup>−1</sup>', `${eq(`${A(d)} / ${N(t, 2)} = ${A(d / t)} km h<sup>−1</sup>`)} ✓`),
      text('Explain why these two answers are different.', 1, 'Average speed uses the total distance travelled; average velocity uses the displacement, which is the shorter straight-line distance from start to finish ✓')
    ] };
};

/* --- moments --- */
T.MO1 = R => {
  const v = find(() => { const W1 = R.pick([300, 400, 450, 600]), d1 = R.pick([1.2, 1.5, 1.8, 2.0]), W2 = R.pick([500, 600, 750, 900]); return { W1, d1, W2, d: W1 * d1 / W2 }; }, x => x.d >= .5 && x.d <= 2.2 && x.W1 !== x.W2), Wb = R.pick([150, 200, 250]);
  const fig = beamFig({ aria: 'A beam balanced on a central pivot with a load on each side', pivots: [{ at: .5 }], loads: [{ at: .1, label: `${v.W1} N` }, { at: .8, label: `${v.W2} N` }], dims: [{ a: .1, b: .5, label: `${N(v.d1, 2)} m` }, { a: .5, b: .8, label: '<tspan font-style="italic">d</tspan>' }] });
  return { stem: `<b>Figure 1</b> shows a uniform beam balanced horizontally on a pivot at its centre. A load of ${v.W1} N is ${N(v.d1, 2)} m from the pivot on one side and a load of ${v.W2} N is a distance <i>d</i> from the pivot on the other side. The weight of the beam is ${Wb} N.`, figs: [fig],
    parts: [
      text('State what is meant by the moment of a force about a point.', 1, 'The force multiplied by the perpendicular distance from the point to the line of action of the force ✓'),
      text('State the principle of moments.', 2, 'For a body in equilibrium ✓<br>the sum of the clockwise moments about any point equals the sum of the anticlockwise moments about that point ✓'),
      calc('Calculate the distance <i>d</i>.', 2, v.d, 'm', `${eq(`${v.W2} × <i>d</i> = ${v.W1} × ${N(v.d1, 2)}`)} ✓<br>${eq(`<i>d</i> = ${A(v.d)} m`)} ✓`),
      calc('Calculate the force that the pivot exerts on the beam.', 1, v.W1 + v.W2 + Wb, 'N', `${eq(`${v.W1} + ${v.W2} + ${Wb} = ${v.W1 + v.W2 + Wb} N`)} (upwards) ✓`, { show: String(v.W1 + v.W2 + Wb) }),
      text('Explain why the weight of the beam was not needed to calculate <i>d</i>.', 1, 'The beam is uniform, so its weight acts at its centre, which is at the pivot: it has no moment about the pivot ✓')
    ] };
};
T.MO2 = R => {
  const L = R.pick([3.0, 4.0, 5.0]), W = R.pick([200, 300, 400]), WL = R.pick([500, 600, 800]), x = R.pick(L === 3 ? [0.5, 1.0, 2.0, 2.5] : L === 4 ? [1.0, 1.5, 2.5, 3.0] : [1.0, 2.0, 3.0, 4.0]), FB = (W * L / 2 + WL * x) / L, FA = W + WL - FB;
  const fig = beamFig({ aria: 'A plank resting on a support at each end, with a load between the supports', pivots: [{ at: .02, label: 'A' }, { at: .98, label: 'B' }], loads: [{ at: .02 + .96 * x / L, label: `${WL} N` }], dims: [{ a: .02, b: .02 + .96 * x / L, label: `${N(x, 2)} m` }, { a: .02, b: .98, label: `${N(L, 2)} m`, row: 1 }] });
  return { stem: `<b>Figure 1</b> shows a uniform plank of weight ${W} N and length ${N(L, 2)} m resting on two supports <b>A</b> and <b>B</b>, one at each end. A load of ${WL} N rests on the plank ${N(x, 2)} m from <b>A</b>.`, figs: [fig],
    parts: [
      text('State where the weight of the plank acts. Give a reason for your answer.', 1, `At its centre (${N(L / 2, 2)} m from <b>A</b>), because the plank is uniform ✓`),
      calc('By taking moments about <b>A</b>, calculate the force that support <b>B</b> exerts on the plank.', 3, FB, 'N', `Clockwise moments about A ${eq(`= (${W} × ${N(L / 2, 2)}) + (${WL} × ${N(x, 2)}) = ${A(W * L / 2 + WL * x)} N m`)} ✓<br>${eq(`<i>F</i><sub>B</sub> × ${N(L, 2)} = ${A(W * L / 2 + WL * x)}`)} ✓<br>${eq(`<i>F</i><sub>B</sub> = ${A(FB)} N`)} ✓`),
      calc('Calculate the force that support <b>A</b> exerts on the plank.', 2, FA, 'N', `Total upward force = total downward force: ${eq(`<i>F</i><sub>A</sub> + ${A(FB)} = ${W} + ${WL}`)} ✓<br>${eq(`<i>F</i><sub>A</sub> = ${A(FA)} N`)} ✓`),
      text('The load is moved closer to <b>B</b>.<br>State what happens to the force at each support.', 2, 'The force at <b>B</b> increases ✓<br>The force at <b>A</b> decreases by the same amount (the total stays the same) ✓')
    ] };
};
T.MO3 = R => {
  const d = R.pick([0.36, 0.40, 0.45, 0.50]), F = R.pick([12, 15, 20, 25]), tq = F * d;
  return { stem: `A driver turns a steering wheel of diameter ${N(d, 2)} m by applying a force of ${F} N with each hand. The two forces act at opposite ends of a diameter, in opposite directions, along tangents to the wheel.`,
    parts: [
      text('State what is meant by a couple.', 2, 'A pair of forces that are equal in magnitude and opposite in direction ✓<br>which act along different (parallel) lines, so they do not act through the same point ✓'),
      calc('Calculate the moment of the couple.', 2, tq, 'N m', `${eq(`moment = force × perpendicular distance between the forces = ${F} × ${N(d, 2)}`)} ✓<br>${eq(`= ${A(tq)} N m`)} ✓`),
      calc('The driver now uses only one hand.<br>Calculate the force that this hand must apply along a tangent to produce the same moment about the centre of the wheel.', 2, 2 * F, 'N', `${eq(`<i>F</i> × ${N(d / 2, 3)} = ${A(tq)}`)} ✓<br>${eq(`<i>F</i> = ${2 * F} N`)} ✓`, { show: String(2 * F) }),
      text('Explain why a couple produces rotation without any linear acceleration.', 1, 'The two forces are equal and opposite, so the resultant force is zero, but their moments act in the same sense ✓')
    ] };
};
T.MO4 = R => {
  const p = R.pick([30.0, 35.0, 40.0]), xm = R.pick([5.0, 10.0, 15.0]), m = R.pick([50, 100, 150, 200]), M = m * (p - xm) / (50 - p);
  const fig = beamFig({ aria: 'A metre ruler balanced on a pivot, with a mass hanging near one end', pivots: [{ at: p / 100 }], loads: [{ at: xm / 100, label: `${m} g mass` }], marks: [{ at: 0, label: '0' }, { at: xm / 100, label: `${N(xm, 3)} cm`, row: 1 }, { at: p / 100, label: `${N(p, 3)} cm` }, { at: .5, label: '50.0 cm', row: 1 }, { at: 1, label: '100 cm' }] });
  return { stem: `<b>Figure 1</b> shows a uniform metre ruler balanced horizontally on a pivot at the ${N(p, 3)} cm mark. A ${m} g mass hangs from the ${N(xm, 3)} cm mark.`, figs: [fig],
    parts: [
      text('State what is meant by the centre of mass of an object.', 1, 'The point at which the whole weight (mass) of the object can be taken to act ✓'),
      calc('Calculate the mass of the ruler in g.', 3, M, 'g', `The weight of the ruler acts at the 50.0 cm mark, ${eq(`50.0 − ${N(p, 3)} = ${N(50 - p, 3)} cm`)} from the pivot ✓<br>Moments about the pivot: ${eq(`${m} × (${N(p, 3)} − ${N(xm, 3)}) = <i>M</i> × ${N(50 - p, 3)}`)} ✓<br>${eq(`<i>M</i> = ${A(M)} g`)} ✓`, { guide: ['<i>g</i> cancels, so masses can be used in place of weights.'] }),
      calc('Calculate the force that the pivot exerts on the ruler.', 2, (M + m) / 1000 * G, 'N', `Total mass ${eq(`= ${A(M)} + ${m} = ${A(M + m)} g = ${A((M + m) / 1000)} kg`)} ✓<br>${eq(`${A((M + m) / 1000)} × 9.81 = ${A((M + m) / 1000 * G)} N`)} ✓`),
      text('The mass is replaced by a larger mass hanging from the same mark.<br>State the direction in which the pivot must be moved to balance the ruler again.', 1, 'Towards the hanging mass (towards the 0 cm end) ✓')
    ] };
};
T.MO5 = R => {
  const L = R.pick([1.2, 1.5, 2.0]), W = R.pick([60, 80, 120]), S = R.pick([100, 150, 200]), th = R.pick([30, 35, 40, 45, 50]), M = W * L / 2 + S * L, Tn = M / (L * sinD(th));
  let b = ln(70, 20, 70, 205, 'stroke-width="4"') + `<rect x="70" y="150" width="270" height="10" fill="#e9edf2" stroke="#000" stroke-width="1.4"/>` + ln(340, 150, 70, 50, 'stroke-width="1.6"') + `<circle cx="74" cy="155" r="5" fill="#000"/>`;
  b += arrow(205, 160, 205, 200) + tx(205, 216, `${W} N`) + arrow(340, 160, 340, 200) + tx(352, 216, `${S} N`) + tx(278, 142, th + '°', 'font-size="14"') + tx(188, 86, 'cable', 'font-size="13"') + tx(40, 160, 'hinge', 'font-size="13"') + tx(40, 40, 'wall', 'font-size="13"');
  return { stem: `<b>Figure 1</b> shows a uniform horizontal beam of length ${N(L, 2)} m and weight ${W} N. One end is attached to a wall by a hinge. The other end is supported by a cable that makes an angle of ${th}° with the beam. A sign of weight ${S} N hangs from the end of the beam.`, figs: [svgWrap(420, 228, 'A horizontal beam hinged to a wall at one end and held up by a cable from its other end to the wall. The weight of the beam acts at its centre and a sign hangs from its far end', b + tx(385, 30, 'not to scale', 'font-size="12"'))],
    parts: [
      text('Explain why the force that the hinge exerts on the beam has no moment about the hinge.', 1, 'Its line of action passes through the hinge, so its perpendicular distance from the hinge is zero ✓'),
      calc('Calculate the total clockwise moment about the hinge.', 2, M, 'N m', `${eq(`(${W} × ${N(L / 2, 2)}) + (${S} × ${N(L, 2)})`)} ✓<br>${eq(`= ${A(M)} N m`)} ✓`),
      calc('Calculate the tension in the cable.', 3, Tn, 'N', `Perpendicular (vertical) component of the tension ${eq(`= <i>T</i> sin ${th}°`)} ✓<br>${eq(`<i>T</i> sin ${th}° × ${N(L, 2)} = ${A(M)}`)} ✓<br>${eq(`<i>T</i> = ${A(Tn)} N`)} ✓`),
      calc('Calculate the horizontal component of the force that the hinge exerts on the beam.', 2, Tn * cosD(th), 'N', `It balances the horizontal component of the tension ✓<br>${eq(`${A(Tn)} × cos ${th}° = ${A(Tn * cosD(th))} N`)} (away from the wall) ✓`)
    ] };
};
T.MO6 = R => {
  const a = R.pick([1.0, 1.2, 1.5]), L = R.pick([3.0, 3.6, 4.0]), W = R.pick([600, 700, 800]), Wb = R.pick([200, 250, 300]), FB = W * L / a, FA = FB - W, FB2 = (W * L + Wb * L / 2) / a;
  return { stem: `A horizontal diving board of length ${N(L, 2)} m is bolted down at one end <b>A</b> and rests on a support <b>B</b>, which is ${N(a, 2)} m from <b>A</b>. A diver of weight ${W} N stands at the free end of the board. At first the weight of the board can be ignored.`,
    parts: [
      calc('By taking moments about <b>A</b>, calculate the force that the support <b>B</b> exerts on the board.', 2, FB, 'N', `${eq(`<i>F</i><sub>B</sub> × ${N(a, 2)} = ${W} × ${N(L, 2)}`)} ✓<br>${eq(`<i>F</i><sub>B</sub> = ${A(FB)} N`)} (upwards) ✓`),
      calc('Calculate the magnitude of the force that the bolt at <b>A</b> exerts on the board.', 2, FA, 'N', `Resultant vertical force is zero: ${eq(`<i>F</i><sub>A</sub> = ${A(FB)} − ${W}`)} ✓<br>${eq(`<i>F</i><sub>A</sub> = ${A(FA)} N`)} ✓`),
      text('State and explain the direction of the force at <b>A</b>.', 1, 'Downwards: without it the board would rotate about <b>B</b> (the upward force at <b>B</b> is greater than the weight of the diver) ✓'),
      calc(`The board is uniform and has a weight of ${Wb} N.<br>Calculate the force at <b>B</b> when the weight of the board is included.`, 2, FB2, 'N', `${eq(`<i>F</i><sub>B</sub> × ${N(a, 2)} = (${W} × ${N(L, 2)}) + (${Wb} × ${N(L / 2, 2)})`)} ✓<br>${eq(`<i>F</i><sub>B</sub> = ${A(FB2)} N`)} ✓`)
    ] };
};

/* --- motion along a straight line --- */
T.SL1 = R => {
  const u = R.pick([10, 12, 15]), v = R.pick([25, 27, 30]), t = R.pick([5.0, 6.0, 8.0]), d = R.pick([45, 60, 75]), a = (v - u) / t, s = (u + v) / 2 * t, a2 = v * v / (2 * d), t2 = 2 * d / v;
  return { stem: `A car travelling along a straight road accelerates uniformly from ${u} ${MS1} to ${v} ${MS1} in ${N(t, 2)} s. The driver then brakes, and the car decelerates uniformly to rest in a distance of ${d} m.`,
    parts: [
      calc('Calculate the acceleration of the car.', 2, a, MS2, `${eq(`<i>a</i> = (<i>v</i> − <i>u</i>)/<i>t</i> = (${v} − ${u}) / ${N(t, 2)}`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`),
      calc('Calculate the distance travelled while the car accelerates.', 2, s, 'm', `${eq(`<i>s</i> = ½(<i>u</i> + <i>v</i>)<i>t</i> = ½ × (${u} + ${v}) × ${N(t, 2)}`)} ✓<br>${eq(`<i>s</i> = ${A(s)} m`)} ✓`),
      calc('Calculate the magnitude of the deceleration of the car while it brakes.', 2, a2, MS2, `${eq(`<i>v</i><sup>2</sup> = <i>u</i><sup>2</sup> + 2<i>as</i>, so 0 = ${v}<sup>2</sup> + (2 × <i>a</i> × ${d})`)} ✓<br>${eq(`<i>a</i> = −${A(a2)} ${MS2}`)}, so the deceleration is ${A(a2)} ${MS2} ✓`),
      calc('Calculate the time taken for the car to stop.', 2, t2, 's', `${eq(`<i>s</i> = ½(<i>u</i> + <i>v</i>)<i>t</i>, so ${d} = ½ × ${v} × <i>t</i>`)} (or ${eq('<i>t</i> = <i>u</i>/<i>a</i>')}) ✓<br>${eq(`<i>t</i> = ${A(t2)} s`)} ✓`)
    ] };
};
T.SL2 = R => {
  const V = R.pick([10, 15, 20]), t1 = R.pick([5, 10]), t2 = R.pick([15, 20]), t3 = R.pick([25, 30]), dist = .5 * V * t1 + V * (t2 - t1) + .5 * V * (t3 - t2);
  const fig = graph({ x: [0, 30, 5], y: [0, 25, 5], div: 5, xl: 'time / s', yl: `velocity / m s${sup(-1)}`, curves: [{ f: pw([[0, 0], [t1, V], [t2, V], [t3, 0]]), from: 0, to: t3 }] });
  return { stem: `<b>Figure 1</b> shows how the velocity of a cyclist travelling along a straight road varies with time.`, figs: [fig],
    parts: [
      text(`Describe the motion of the cyclist during the first ${t1} s.`, 1, 'Uniform (constant) acceleration from rest ✓'),
      { q: `Determine the acceleration of the cyclist during the first ${t1} s.`, marks: 2, ans: V / t1, unit: MS2, show: A(V / t1), tol: .06, ms: `Acceleration = gradient ${eq(`= ${V} / ${t1}`)} ✓<br>${eq(`= ${A(V / t1)} ${MS2}`)} ✓` },
      { q: 'Determine the total distance travelled by the cyclist.', marks: 3, ans: dist, unit: 'm', show: A(dist), tol: .05, ms: `Distance = area under the graph ✓<br>${eq(`(½ × ${t1} × ${V}) + (${t2 - t1} × ${V}) + (½ × ${t3 - t2} × ${V})`)} ✓<br>${eq(`= ${A(dist)} m`)} ✓` },
      calc('Calculate the average speed of the cyclist for the whole journey.', 1, dist / t3, MS1, `${eq(`${A(dist)} / ${t3} = ${A(dist / t3)} ${MS1}`)} ✓`, { tol: .05 }),
      { q: `Determine the magnitude of the deceleration of the cyclist during the last ${t3 - t2} s.`, marks: 1, ans: V / (t3 - t2), unit: MS2, show: A(V / (t3 - t2)), tol: .06, ms: `${eq(`${V} / ${t3 - t2} = ${A(V / (t3 - t2))} ${MS2}`)} ✓` }
    ] };
};
T.SL3 = R => {
  const h = R.pick([20, 31, 45, 80]), u = R.pick([12, 15, 18]), t = Math.sqrt(2 * h / G), v = G * t, H = u * u / (2 * G), tt = 2 * u / G;
  return { stem: `A stone is dropped from rest from a bridge and falls ${h} m to the water below. Air resistance is negligible.`,
    parts: [
      calc('Calculate the time taken for the stone to reach the water.', 2, t, 's', `${eq(`<i>s</i> = ½<i>gt</i><sup>2</sup>, so <i>t</i> = √(2 × ${h} / 9.81)`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the speed of the stone as it reaches the water.', 2, v, MS1, `${eq(`<i>v</i> = <i>gt</i> = 9.81 × ${A(t)}`)} (or ${eq(`<i>v</i> = √(2 × 9.81 × ${h})`)}) ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc(`A second stone is thrown vertically upwards from the bridge at ${u} ${MS1}.<br>Calculate the maximum height that it reaches above the bridge.`, 2, H, 'm', `At the top <i>v</i> = 0: ${eq(`0 = ${u}<sup>2</sup> − (2 × 9.81 × <i>s</i>)`)} ✓<br>${eq(`<i>s</i> = ${A(H)} m`)} ✓`),
      calc('Calculate the time taken for the second stone to return to the level of the bridge.', 2, tt, 's', `Time to the top ${eq(`= ${u} / 9.81 = ${A(u / G)} s`)} ✓<br>Total time ${eq(`= 2 × ${A(u / G)} = ${A(tt)} s`)} ✓`)
    ] };
};
T.SL4 = R => {
  const d = R.pick([60, 80, 100]), t1 = 20, t2 = R.pick([30, 40]), t3 = R.pick([50, 60]);
  const fig = graph({ x: [0, 60, 10], y: [0, 100, 20], div: 5, xl: 'time / s', yl: 'displacement / m', curves: [{ f: pw([[0, 0], [t1, d], [t2, d], [t3, 0]]), from: 0, to: t3 }] });
  return { stem: `<b>Figure 1</b> shows how the displacement of a runner from a starting line varies with time.`, figs: [fig],
    parts: [
      { q: `Determine the velocity of the runner during the first ${t1} s.`, marks: 2, ans: d / t1, unit: MS1, show: A(d / t1), tol: .06, ms: `Velocity = gradient ${eq(`= ${d} / ${t1}`)} ✓<br>${eq(`= ${A(d / t1)} ${MS1}`)} ✓` },
      text(`Describe the motion of the runner between ${t1} s and ${t2} s.`, 1, `Stationary (at rest), ${d} m from the starting line ✓`),
      { q: `Determine the velocity of the runner between ${t2} s and ${t3} s.`, marks: 2, ans: -d / (t3 - t2), unit: MS1, show: A(-d / (t3 - t2)), tol: .06, ms: `${eq(`gradient = (0 − ${d}) / (${t3} − ${t2})`)} ✓<br>${eq(`= ${A(-d / (t3 - t2))} ${MS1}`)} (the negative sign shows the runner is moving back towards the start) ✓`, guide: [`Award one mark for ${A(d / (t3 - t2))} ${MS1} with no indication of direction.`] },
      calc('Calculate the average speed of the runner for the whole journey.', 1, 2 * d / t3, MS1, `${eq(`(${d} + ${d}) / ${t3} = ${A(2 * d / t3)} ${MS1}`)} ✓`, { tol: .06 }),
      text('State the average velocity of the runner for the whole journey. Explain your answer.', 1, 'Zero, because the final displacement is zero (the runner returns to the starting line) ✓')
    ] };
};
T.SL5 = R => {
  const gm = R.pick([9.6, 9.8, 10.0]), k = gm / 2;
  const fig = graph({ x: [0, 0.5, 0.1], y: [0, 2.5, 0.5], div: 5, xl: `(time)${sup(2)} / s${sup(2)}`, yl: 'distance fallen / m', curves: [{ f: x => k * x, from: 0, to: 0.5 }] });
  return { stem: `A student determines the acceleration of free fall by timing a steel ball as it falls from rest through different distances <i>s</i>. <b>Figure 1</b> shows a graph of <i>s</i> against <i>t</i><sup>2</sup>, where <i>t</i> is the time of fall.`, figs: [fig],
    parts: [
      text('Explain why the graph is a straight line through the origin.', 2, `The ball falls from rest with constant acceleration, so ${eq('<i>s</i> = ½<i>gt</i><sup>2</sup>')} ✓<br><i>s</i> is directly proportional to <i>t</i><sup>2</sup>, with gradient ½<i>g</i> ✓`),
      { q: 'Determine the gradient of the graph.', marks: 2, ans: k, unit: MS2, show: N(k, 2), tol: .05, ms: `Uses a triangle that covers at least half of the line ✓<br>gradient ${eq(`= ${N(k * .5, 3)} / 0.50 = ${N(k, 2)} ${MS2}`)} ✓`, guide: [`Reading from the graph: allow ${N(k * .96, 3)} to ${N(k * 1.04, 3)} ${MS2}.`] },
      calc('Use the gradient to calculate the acceleration of free fall.', 1, gm, MS2, `${eq(`<i>g</i> = 2 × gradient = 2 × ${N(k, 2)} = ${N(gm, 2)} ${MS2}`)} ✓`, { show: N(gm, 2), tol: .05 }),
      text('State the two quantities that are measured in this experiment and a suitable instrument for each.', 2, 'The distance fallen, with a metre ruler ✓<br>The time of fall, with an electronic timer started and stopped by the ball (an electromagnet release and a trapdoor switch, or light gates) ✓'),
      text('Suggest one reason why the value obtained may be smaller than the accepted value.', 1, 'Air resistance acts on the ball (or: the electromagnet does not release the ball at the instant the timer starts, so the measured times are too long) ✓')
    ] };
};
T.SL6 = R => {
  const v = R.pick([20, 25, 30]), tr = R.pick([0.60, 0.70, 0.80]), a = R.pick([5.0, 6.0, 7.5]), dt = v * tr, db = v * v / (2 * a);
  return { stem: `A car is travelling at ${v} ${MS1} when the driver sees a hazard ahead. The reaction time of the driver is ${N(tr, 2)} s. When the brakes are applied, the car decelerates uniformly at ${N(a, 2)} ${MS2}.`,
    parts: [
      calc('Calculate the distance travelled by the car during the reaction time (the thinking distance).', 1, dt, 'm', `${eq(`${v} × ${N(tr, 2)} = ${A(dt)} m`)} ✓`),
      calc('Calculate the distance travelled while the car brakes (the braking distance).', 2, db, 'm', `${eq(`<i>v</i><sup>2</sup> = <i>u</i><sup>2</sup> + 2<i>as</i>, so 0 = ${v}<sup>2</sup> − (2 × ${N(a, 2)} × <i>s</i>)`)} ✓<br>${eq(`<i>s</i> = ${A(db)} m`)} ✓`),
      calc('Calculate the total stopping distance.', 1, dt + db, 'm', `${eq(`${A(dt)} + ${A(db)} = ${A(dt + db)} m`)} ✓`),
      calc('Calculate the time for which the brakes are applied.', 1, v / a, 's', `${eq(`<i>t</i> = <i>u</i>/<i>a</i> = ${v} / ${N(a, 2)} = ${A(v / a)} s`)} ✓`),
      text('The car now travels at twice the speed, with the same deceleration.<br>State and explain the effect on the braking distance.', 2, 'The braking distance is four times as great ✓<br>because the braking distance is proportional to the square of the initial speed (<i>s</i> = <i>u</i><sup>2</sup>/2<i>a</i>) ✓')
    ] };
};
T.SL7 = R => {
  const u = R.pick([8.0, 10, 12]), h = R.pick([30, 40, 55]), H = u * u / (2 * G), v = Math.sqrt(u * u + 2 * G * h), t = (v + u) / G;
  return { stem: `A ball is thrown vertically upwards at ${N(u, 2)} ${MS1} from the edge of a cliff. It rises, then falls past the edge of the cliff and into the sea, which is ${h} m below the point from which it was thrown. Air resistance is negligible.`,
    parts: [
      calc('Calculate the maximum height reached by the ball above the point from which it was thrown.', 2, H, 'm', `${eq(`0 = ${N(u, 2)}<sup>2</sup> − (2 × 9.81 × <i>s</i>)`)} ✓<br>${eq(`<i>s</i> = ${A(H)} m`)} ✓`),
      calc('Calculate the speed of the ball as it reaches the sea.', 2, v, MS1, `Taking downwards as positive, <i>u</i> = −${N(u, 2)} ${MS1} and <i>s</i> = ${h} m: ${eq(`<i>v</i><sup>2</sup> = ${N(u, 2)}<sup>2</sup> + (2 × 9.81 × ${h})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the total time for which the ball is in the air.', 2, t, 's', `${eq(`<i>t</i> = (<i>v</i> − <i>u</i>)/<i>a</i> = (${A(v)} − (−${N(u, 2)})) / 9.81`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      text('State the acceleration of the ball at the highest point of its motion.', 1, `9.81 ${MS2} downwards (the acceleration is the same throughout the motion) ✓`)
    ] };
};

/* --- projectile motion --- */
const NOAIR = 'Air resistance is negligible.';
T.PJ1 = R => {
  const u = R.pick([8.0, 12, 15, 20]), h = R.pick([12, 20, 31, 45]), t = Math.sqrt(2 * h / G), vy = G * t, v = Math.hypot(u, vy), ang = Math.atan(vy / u) * 180 / Math.PI;
  return { stem: `A ball is thrown horizontally at ${N(u, 2)} ${MS1} from the top of a cliff that is ${h} m high. ${NOAIR}`,
    parts: [
      calc('Calculate the time taken for the ball to reach the ground.', 2, t, 's', `Vertically, the ball starts from rest: ${eq(`<i>s</i> = ½<i>gt</i><sup>2</sup>, so <i>t</i> = √(2 × ${h} / 9.81)`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the horizontal distance from the foot of the cliff to the point where the ball lands.', 1, u * t, 'm', `${eq(`${N(u, 2)} × ${A(t)} = ${A(u * t)} m`)} ✓`),
      calc('Calculate the vertical component of the velocity of the ball as it lands.', 1, vy, MS1, `${eq(`<i>v</i> = <i>gt</i> = 9.81 × ${A(t)} = ${A(vy)} ${MS1}`)} ✓`),
      calc('Calculate the speed of the ball as it lands.', 2, v, MS1, `${eq(`<i>v</i> = √(${N(u, 2)}<sup>2</sup> + ${A(vy)}<sup>2</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the angle below the horizontal at which the ball is travelling as it lands.', 2, ang, '°', `${eq(`tan <i>θ</i> = ${A(vy)} / ${N(u, 2)}`)} ✓<br>${eq(`<i>θ</i> = ${A(ang)}°`)} ✓`)
    ] };
};
T.PJ2 = R => {
  const u = R.pick([20, 25, 30]), th = R.pick([30, 35, 40, 50, 60]), ux = u * cosD(th), uy = u * sinD(th), t = uy / G, H = uy * uy / (2 * G), rng = ux * 2 * t;
  return { stem: `A ball is kicked from level ground at ${u} ${MS1} at an angle of ${th}° above the horizontal. ${NOAIR}`,
    parts: [
      calc('Calculate the horizontal component of the initial velocity.', 1, ux, MS1, `${eq(`${u} × cos ${th}° = ${A(ux)} ${MS1}`)} ✓`),
      calc('Calculate the vertical component of the initial velocity.', 1, uy, MS1, `${eq(`${u} × sin ${th}° = ${A(uy)} ${MS1}`)} ✓`),
      calc('Calculate the time taken for the ball to reach its maximum height.', 2, t, 's', `At maximum height the vertical velocity is zero: ${eq(`0 = ${A(uy)} − 9.81<i>t</i>`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the maximum height reached by the ball.', 2, H, 'm', `${eq(`0 = ${A(uy)}<sup>2</sup> − (2 × 9.81 × <i>s</i>)`)} ✓<br>${eq(`<i>s</i> = ${A(H)} m`)} ✓`),
      calc('Calculate the horizontal distance travelled by the ball before it lands.', 2, rng, 'm', `Time of flight ${eq(`= 2 × ${A(t)} = ${A(2 * t)} s`)} ✓<br>Range ${eq(`= ${A(ux)} × ${A(2 * t)} = ${A(rng)} m`)} ✓`),
      text('State the velocity of the ball at its maximum height.', 1, `${A(ux)} ${MS1} horizontally (the vertical component is zero) ✓`)
    ] };
};
T.PJ3 = R => {
  const u = R.pick([10, 15, 20]), h = R.pick([1.2, 1.8, 2.5]), t = Math.sqrt(2 * h / G);
  return { stem: `Two identical balls are released at the same instant from a height of ${N(h, 2)} m above level ground. Ball <b>A</b> is dropped from rest. Ball <b>B</b> is projected horizontally at ${u} ${MS1}.`,
    parts: [
      text('State and explain which ball reaches the ground first when air resistance is negligible.', 2, 'They reach the ground at the same time ✓<br>Both have zero initial vertical velocity and the same vertical acceleration; the horizontal motion of <b>B</b> does not affect its vertical motion ✓'),
      text('Explain why the horizontal component of the velocity of ball <b>B</b> is constant.', 1, 'There is no horizontal force on the ball (the only force is its weight, which acts vertically) ✓'),
      calc('Calculate the horizontal distance travelled by ball <b>B</b> before it lands.', 2, u * t, 'm', `${eq(`<i>t</i> = √(2 × ${N(h, 2)} / 9.81) = ${A(t)} s`)} ✓<br>${eq(`${u} × ${A(t)} = ${A(u * t)} m`)} ✓`),
      text('Describe three ways in which the path of a projectile launched at an angle above the horizontal is changed by air resistance.', 3, 'The maximum height is lower ✓<br>The range is shorter ✓<br>The path is no longer symmetrical: the descent is steeper than the ascent ✓')
    ] };
};
T.PJ4 = R => {
  const h = R.pick([0.80, 0.90, 1.2]), x = R.pick([0.50, 0.65, 0.90, 1.1]), t = Math.sqrt(2 * h / G), u = x / t, vy = G * t, v = Math.hypot(u, vy);
  return { stem: `A marble rolls off the edge of a horizontal table and lands on the floor ${N(x, 2)} m from the foot of the table. The table top is ${N(h, 2)} m above the floor. ${NOAIR}`,
    parts: [
      calc('Calculate the time for which the marble is in the air.', 2, t, 's', `${eq(`<i>s</i> = ½<i>gt</i><sup>2</sup>, so <i>t</i> = √(2 × ${N(h, 2)} / 9.81)`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the speed of the marble as it leaves the table.', 2, u, MS1, `${eq(`<i>u</i> = ${N(x, 2)} / ${A(t)}`)} ✓<br>${eq(`<i>u</i> = ${A(u)} ${MS1}`)} ✓`),
      calc('Calculate the speed of the marble as it reaches the floor.', 2, v, MS1, `Vertical component ${eq(`= 9.81 × ${A(t)} = ${A(vy)} ${MS1}`)} ✓<br>${eq(`<i>v</i> = √(${A(u)}<sup>2</sup> + ${A(vy)}<sup>2</sup>) = ${A(v)} ${MS1}`)} ✓`),
      text('The marble is replaced by one that leaves the table at twice the speed.<br>State the effect on the time in the air and on the horizontal distance travelled.', 1, 'The time is unchanged and the horizontal distance doubles ✓')
    ] };
};
T.PJ5 = R => {
  const v = find(() => { const u = R.pick([18, 20, 24]), th = R.pick([35, 40, 45]), d = R.pick([15, 20, 25]), Hw = R.pick([3.0, 4.0, 5.0, 8.0, 10]); const ux = u * cosD(th), uy = u * sinD(th), t = d / ux, y = uy * t - .5 * G * t * t; return { u, th, d, Hw, ux, uy, t, y }; }, x => x.y > 1 && Math.abs(x.y - x.Hw) > .4);
  const clears = v.y > v.Hw;
  return { stem: `A ball is kicked from level ground at ${v.u} ${MS1} at ${v.th}° above the horizontal, towards a wall that is ${v.d} m away and ${N(v.Hw, 2)} m high. ${NOAIR}`,
    parts: [
      text('Calculate the horizontal and vertical components of the initial velocity.', 2, `Horizontal ${eq(`= ${v.u} × cos ${v.th}° = ${A(v.ux)} ${MS1}`)} ✓<br>Vertical ${eq(`= ${v.u} × sin ${v.th}° = ${A(v.uy)} ${MS1}`)} ✓`),
      calc('Calculate the time taken for the ball to reach the wall.', 2, v.t, 's', `${eq(`<i>t</i> = ${v.d} / ${A(v.ux)}`)} ✓<br>${eq(`<i>t</i> = ${A(v.t)} s`)} ✓`),
      calc('Calculate the height of the ball above the ground when it reaches the wall.', 2, v.y, 'm', `${eq(`<i>s</i> = <i>ut</i> − ½<i>gt</i><sup>2</sup> = (${A(v.uy)} × ${A(v.t)}) − (½ × 9.81 × ${A(v.t)}<sup>2</sup>)`)} ✓<br>${eq(`<i>s</i> = ${A(v.y)} m`)} ✓`),
      text('State whether the ball passes over the wall.', 1, `${clears ? 'Yes' : 'No'}: at the wall the ball is ${A(v.y)} m above the ground, which is ${clears ? 'more' : 'less'} than ${N(v.Hw, 2)} m ✓`)
    ] };
};
T.PJ6 = R => {
  const v = R.pick([50, 60, 80]), h = R.pick([120, 180, 320, 500]), t = Math.sqrt(2 * h / G);
  return { stem: `An aircraft flies horizontally at a constant ${v} ${MS1}, ${h} m above level ground. It releases a package of supplies. ${NOAIR}`,
    parts: [
      calc('Calculate the time taken for the package to reach the ground.', 2, t, 's', `${eq(`<i>t</i> = √(2 × ${h} / 9.81)`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the horizontal distance travelled by the package while it falls.', 2, v * t, 'm', `The package keeps the horizontal velocity of the aircraft: ${eq(`${v} × ${A(t)}`)} ✓<br>${eq(`= ${A(v * t)} m`)} ✓`),
      text('Describe the path of the package as seen by an observer on the ground.', 1, 'A curve (parabola), moving forwards as it falls ✓'),
      text('Describe the position of the package relative to the aircraft while it falls.', 1, 'It stays directly below the aircraft (it has the same horizontal velocity) ✓'),
      text('State how the landing point changes if air resistance is not negligible.', 1, 'The package lands short of the calculated point (it is slowed horizontally, so it falls behind the aircraft) ✓')
    ] };
};

/* --- Newton's laws of motion --- */
T.NL1 = R => {
  const m = R.pick([900, 1200, 1500]), F = R.pick([3000, 3600, 4500]), Rf = R.pick([600, 900, 1200]), v = R.pick([20, 25]), a = (F - Rf) / m;
  return { stem: `A car of mass ${m} kg moves along a straight, level road. The driving force is ${F} N and the total resistive force is ${Rf} N.`,
    parts: [
      text('State Newton’s second law of motion.', 1, 'The resultant force on an object is proportional to (equal to) its rate of change of momentum (for constant mass, <i>F</i> = <i>ma</i>) ✓'),
      calc('Calculate the resultant force on the car.', 1, F - Rf, 'N', `${eq(`${F} − ${Rf} = ${F - Rf} N`)} ✓`, { show: String(F - Rf) }),
      calc('Calculate the acceleration of the car.', 2, a, MS2, `${eq(`<i>a</i> = <i>F</i>/<i>m</i> = ${F - Rf} / ${m}`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`),
      calc(`Calculate the time the car would take to reach ${v} ${MS1} from rest if this acceleration stayed constant.`, 2, v / a, 's', `${eq(`<i>t</i> = <i>v</i>/<i>a</i> = ${v} / ${A(a)}`)} ✓<br>${eq(`<i>t</i> = ${A(v / a)} s`)} ✓`),
      text('Explain why, in practice, the acceleration decreases as the speed of the car increases.', 2, 'Air resistance increases with speed ✓<br>so the resultant force decreases (for the same driving force), and the acceleration decreases ✓')
    ] };
};
T.NL2 = R => {
  const m = R.pick([60, 70, 80]), a = R.pick([0.80, 1.2, 1.5, 2.0]), Rup = m * (G + a), Rdn = m * (G - a);
  return { stem: `A person of mass ${m} kg stands on bathroom scales in a lift. The scales measure the force that they exert upwards on the person.`,
    parts: [
      calc(`The lift accelerates upwards at ${N(a, 2)} ${MS2}.<br>Calculate the reading on the scales in N.`, 3, Rup, 'N', `Resultant force upwards: ${eq('<i>R</i> − <i>mg</i> = <i>ma</i>')} ✓<br>${eq(`<i>R</i> = ${m} × (9.81 + ${N(a, 2)})`)} ✓<br>${eq(`<i>R</i> = ${A(Rup)} N`)} ✓`),
      calc(`The lift later accelerates downwards at ${N(a, 2)} ${MS2}.<br>Calculate the reading on the scales.`, 2, Rdn, 'N', `${eq(`<i>mg</i> − <i>R</i> = <i>ma</i>, so <i>R</i> = ${m} × (9.81 − ${N(a, 2)})`)} ✓<br>${eq(`<i>R</i> = ${A(Rdn)} N`)} ✓`),
      text('State and explain the reading on the scales when the lift moves upwards at a constant velocity.', 2, `${A(m * G)} N (equal to the weight of the person) ✓<br>There is no acceleration, so the resultant force is zero ✓`),
      text('State the reading on the scales if the lift were in free fall.', 1, 'Zero ✓')
    ] };
};
T.NL3 = R => {
  const v = find(() => { const m = R.pick([2.0, 3.0, 5.0]), th = R.pick([20, 25, 30, 35]), Ff = R.pick([3.0, 4.0, 5.0, 6.0]); return { m, th, Ff, comp: m * G * sinD(th) }; }, x => x.comp - x.Ff > 2), s = R.pick([1.5, 2.0, 3.0]), res = v.comp - v.Ff, a = res / v.m, sp = Math.sqrt(2 * a * s);
  return { stem: `<b>Figure 1</b> shows a block of mass ${N(v.m, 2)} kg on a slope that makes an angle of ${v.th}° with the horizontal. The block is released from rest and slides down the slope. A constant frictional force of ${N(v.Ff, 2)} N acts on the block.`, figs: [inclineFig(v.th, 'A block on a slope')],
    parts: [
      calc('Calculate the component of the weight of the block that acts down the slope.', 2, v.comp, 'N', `${eq(`<i>mg</i> sin <i>θ</i> = ${N(v.m, 2)} × 9.81 × sin ${v.th}°`)} ✓<br>${eq(`= ${A(v.comp)} N`)} ✓`),
      calc('Calculate the resultant force on the block.', 1, res, 'N', `${eq(`${N(v.comp, 4)} − ${N(v.Ff, 2)} = ${A(res)} N`)} (down the slope) ✓`),
      calc('Calculate the acceleration of the block.', 2, a, MS2, `${eq(`<i>a</i> = <i>F</i>/<i>m</i> = ${A(res)} / ${N(v.m, 2)}`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`),
      calc(`Calculate the speed of the block after it has moved ${N(s, 2)} m down the slope.`, 2, sp, MS1, `${eq(`<i>v</i><sup>2</sup> = 2<i>as</i> = 2 × ${A(a)} × ${N(s, 2)}`)} ✓<br>${eq(`<i>v</i> = ${A(sp)} ${MS1}`)} ✓`),
      text('Explain why the normal reaction of the slope does not affect the acceleration of the block.', 1, 'It acts perpendicular to the slope, so it has no component along the direction of motion (it balances the perpendicular component of the weight) ✓')
    ] };
};
T.NL4 = R => {
  const M = R.pick([0.80, 1.0, 1.2, 1.5]), m = R.pick([0.10, 0.20, 0.30]), a = m * G / (M + m), Tn = M * a;
  return { stem: `<b>Figure 1</b> shows a trolley of mass ${N(M, 2)} kg on a smooth horizontal table. A light string joins the trolley to a mass of ${N(m, 2)} kg, which hangs over a frictionless pulley. The system is released from rest.`, figs: [pulleyFig()],
    parts: [
      calc('Calculate the acceleration of the trolley.', 3, a, MS2, `The weight of the hanging mass accelerates the total mass: ${eq(`<i>mg</i> = (<i>M</i> + <i>m</i>)<i>a</i>`)} ✓<br>${eq(`<i>a</i> = (${N(m, 2)} × 9.81) / (${N(M, 2)} + ${N(m, 2)})`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`),
      calc('Calculate the tension in the string.', 2, Tn, 'N', `The tension is the resultant force on the trolley: ${eq(`<i>T</i> = <i>Ma</i> = ${N(M, 2)} × ${A(a)}`)} ✓<br>${eq(`<i>T</i> = ${A(Tn)} N`)} ✓`),
      text('Explain why the tension in the string is less than the weight of the hanging mass.', 2, 'The hanging mass is accelerating downwards ✓<br>so there must be a resultant downward force on it: its weight is greater than the tension ✓'),
      text('In practice there is friction between the trolley and the table.<br>State the effect on the acceleration.', 1, 'The acceleration is smaller ✓')
    ] };
};
T.NL5 = R => {
  const m = R.pick([2.0e4, 5.0e4, 8.0e4]), Th = m * G * R.pick([1.3, 1.5, 1.8]), Tr = Number(Th.toPrecision(2)), a = (Tr - m * G) / m;
  return { stem: `A book rests on a horizontal table.`,
    parts: [
      text('State Newton’s third law of motion.', 2, 'When body A exerts a force on body B, body B exerts a force on body A that is equal in magnitude and opposite in direction ✓<br>The two forces are of the same type and act on different bodies ✓'),
      text('The weight of the book is the gravitational pull of the Earth on the book.<br>State the force that forms a Newton’s third law pair with the weight of the book.', 1, 'The gravitational pull of the book on the Earth (upwards) ✓'),
      text('Explain why the weight of the book and the normal reaction of the table on the book are not a Newton’s third law pair.', 2, 'They both act on the same body (the book) ✓<br>They are different types of force (gravitational and contact) ✓'),
      calc(`A rocket of mass ${N(m, 2)} kg is launched vertically. Its engines produce a thrust of ${N(Tr, 2)} N.<br>Calculate the initial acceleration of the rocket.`, 2, a, MS2, `Resultant force ${eq(`= ${N(Tr, 2)} − (${N(m, 2)} × 9.81) = ${A(Tr - m * G)} N`)} ✓<br>${eq(`<i>a</i> = ${A(Tr - m * G)} / ${N(m, 2)} = ${A(a)} ${MS2}`)} ✓`),
      text('Use Newton’s third law to explain how the rocket engines produce an upward force on the rocket.', 1, 'The rocket pushes the exhaust gases downwards, so the gases push the rocket upwards with an equal force ✓')
    ] };
};
T.NL6 = R => {
  const m = R.pick([70, 80, 90]), D = R.pick([300, 400, 500]), W = m * G, a = (W - D) / m;
  return { stem: `A skydiver of total mass ${m} kg jumps from a stationary balloon and falls vertically.`,
    parts: [
      text('State the acceleration of the skydiver at the instant of leaving the balloon. Give a reason.', 1, `9.81 ${MS2}, because the only force acting is the weight (there is no air resistance at zero speed) ✓`),
      calc('Calculate the air resistance on the skydiver at terminal velocity.', 2, W, 'N', `At terminal velocity the resultant force is zero, so air resistance = weight ✓<br>${eq(`${m} × 9.81 = ${A(W)} N`)} ✓`),
      calc(`Calculate the acceleration of the skydiver at the instant when the air resistance is ${D} N.`, 2, a, MS2, `Resultant force ${eq(`= ${A(W)} − ${D} = ${A(W - D)} N`)} ✓<br>${eq(`<i>a</i> = ${A(W - D)} / ${m} = ${A(a)} ${MS2}`)} ✓`),
      text('Explain why the skydiver reaches a terminal velocity.', 3, 'As the speed increases, the air resistance increases ✓<br>so the resultant force, and therefore the acceleration, decreases ✓<br>When the air resistance equals the weight, the resultant force is zero and the velocity is constant ✓')
    ] };
};
T.NL7 = R => {
  const M = R.pick([1000, 1200, 1400]), mt = R.pick([300, 400, 500]), F = R.pick([2400, 3000, 3600]), Rt = R.pick([100, 150, 200]), a = (F - Rt) / (M + mt), Tn = mt * a + Rt;
  return { stem: `A car of mass ${M} kg tows a trailer of mass ${mt} kg along a straight, level road. The driving force on the car is ${F} N. A resistive force of ${Rt} N acts on the trailer; the resistive forces on the car are negligible.`,
    parts: [
      calc('Calculate the acceleration of the car and trailer.', 2, a, MS2, `${eq(`<i>a</i> = (${F} − ${Rt}) / (${M} + ${mt})`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`),
      calc('Calculate the tension in the tow bar.', 3, Tn, 'N', `For the trailer: ${eq(`<i>T</i> − ${Rt} = <i>ma</i>`)} ✓<br>${eq(`<i>T</i> = (${mt} × ${A(a)}) + ${Rt}`)} ✓<br>${eq(`<i>T</i> = ${A(Tn)} N`)} ✓`),
      text('State the magnitude and direction of the force that the tow bar exerts on the car.', 1, `${A(Tn)} N backwards (opposite to the direction of motion) ✓`),
      calc('The tow bar breaks.<br>Calculate the acceleration of the car immediately afterwards, if the driving force is unchanged.', 1, F / M, MS2, `${eq(`${F} / ${M} = ${A(F / M)} ${MS2}`)} ✓`)
    ] };
};

/* --- momentum --- */
T.MT1 = R => {
  const m1 = R.pick([0.80, 1.0, 1.2, 2.0]), u1 = R.pick([1.5, 2.0, 3.0]), m2 = R.pick([0.40, 0.60, 1.0]), v = m1 * u1 / (m1 + m2), k1 = .5 * m1 * u1 * u1, k2 = .5 * (m1 + m2) * v * v;
  return { stem: `A trolley of mass ${N(m1, 2)} kg travelling at ${N(u1, 2)} ${MS1} collides with a stationary trolley of mass ${N(m2, 2)} kg. The trolleys stick together and move off as one.`,
    parts: [
      text('State the principle of conservation of momentum.', 2, 'The total momentum of a system of interacting bodies is constant ✓<br>provided that no external resultant force acts on the system ✓'),
      calc('Calculate the speed of the trolleys immediately after the collision.', 2, v, MS1, `${eq(`${N(m1, 2)} × ${N(u1, 2)} = (${N(m1, 2)} + ${N(m2, 2)}) × <i>v</i>`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the kinetic energy lost in the collision.', 3, k1 - k2, 'J', `Before: ${eq(`½ × ${N(m1, 2)} × ${N(u1, 2)}<sup>2</sup> = ${N(k1, 4)} J`)} ✓<br>After: ${eq(`½ × ${N(m1 + m2, 2)} × ${A(v)}<sup>2</sup> = ${N(k2, 4)} J`)} ✓<br>Lost ${eq(`= ${N(k1, 4)} − ${N(k2, 4)} = ${A(k1 - k2)} J`)} ✓`),
      text('State the type of collision that has taken place.', 1, 'Inelastic ✓')
    ] };
};
T.MT2 = R => {
  const [m1, m2, u1, v1] = R.pick([[2.0, 1.0, 3.0, 1.0], [3.0, 1.0, 4.0, 2.0], [1.0, 3.0, 4.0, -2.0], [2.0, 1.0, 3.0, 1.5], [3.0, 2.0, 5.0, 2.0], [1.5, 0.50, 4.0, 2.5]]), v2 = (m1 * u1 - m1 * v1) / m2, k1 = .5 * m1 * u1 * u1, k2 = .5 * m1 * v1 * v1 + .5 * m2 * v2 * v2, el = Math.abs(k1 - k2) < 1e-6;
  return { stem: `A ball <b>X</b> of mass ${N(m1, 2)} kg travelling at ${N(u1, 2)} ${MS1} collides head-on with a stationary ball <b>Y</b> of mass ${N(m2, 2)} kg. After the collision, <b>X</b> ${v1 < 0 ? `rebounds at ${N(-v1, 2)} ${MS1} in the opposite direction` : `continues in the same direction at ${N(v1, 2)} ${MS1}`}.`,
    parts: [
      text('State what is meant by an elastic collision.', 1, 'A collision in which the total kinetic energy is conserved ✓'),
      calc('Calculate the speed of <b>Y</b> after the collision.', 3, v2, MS1, `Momentum before ${eq(`= ${N(m1, 2)} × ${N(u1, 2)} = ${A(m1 * u1)} ${KGMS}`)} ✓<br>${eq(`${A(m1 * u1)} = (${N(m1, 2)} × ${v1 < 0 ? '(−' + N(-v1, 2) + ')' : N(v1, 2)}) + (${N(m2, 2)} × <i>v</i>)`)} ✓<br>${eq(`<i>v</i> = ${A(v2)} ${MS1}`)} ✓`, v1 < 0 ? { guide: ['The velocity of X after the collision is negative because it has reversed direction.'] } : {}),
      calc('Calculate the total kinetic energy before the collision.', 1, k1, 'J', `${eq(`½ × ${N(m1, 2)} × ${N(u1, 2)}<sup>2</sup> = ${A(k1)} J`)} ✓`),
      calc('Calculate the total kinetic energy after the collision.', 2, k2, 'J', `${eq(`(½ × ${N(m1, 2)} × ${N(Math.abs(v1), 2)}<sup>2</sup>) + (½ × ${N(m2, 2)} × ${A(v2)}<sup>2</sup>)`)} ✓<br>${eq(`= ${A(k2)} J`)} ✓`),
      text('State and explain whether the collision is elastic.', 1, el ? 'Elastic, because the total kinetic energy is the same before and after ✓' : 'Inelastic, because the total kinetic energy is smaller after the collision ✓')
    ] };
};
T.MT3 = R => {
  const [what, m] = R.pick([['tennis ball', 0.058], ['cricket ball', 0.16], ['football', 0.45], ['squash ball', 0.024]]), u = R.pick([12, 15, 20, 25]), v = R.pick([8.0, 10]), t = R.pick([0.020, 0.050, 0.10]), dp = m * (u + v), F = dp / t;
  return { stem: `A ${what} of mass ${N(m, 2)} kg hits a wall at right angles at ${u} ${MS1} and rebounds along the same line at ${N(v, 2)} ${MS1}. The ball is in contact with the wall for ${N(t, 2)} s.`,
    parts: [
      calc('Calculate the magnitude of the change in momentum of the ball.', 3, dp, KGMS, `The velocity changes direction, so the change in velocity ${eq(`= ${u} + ${N(v, 2)} = ${A(u + v)} ${MS1}`)} ✓<br>${eq(`Δ<i>p</i> = ${N(m, 2)} × ${A(u + v)}`)} ✓<br>${eq(`Δ<i>p</i> = ${A(dp)} ${KGMS}`)} ✓`, { guide: [`Award one mark for subtracting the speeds (giving ${A(m * (u - v))} ${KGMS}).`] }),
      calc('Calculate the average force that the wall exerts on the ball.', 2, F, 'N', `${eq(`<i>F</i> = Δ<i>p</i>/Δ<i>t</i> = ${A(dp)} / ${N(t, 2)}`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`),
      text('State the magnitude and direction of the average force that the ball exerts on the wall.', 1, `${A(F)} N, in the direction in which the ball was originally moving (into the wall) ✓`),
      text('The momentum of the ball is not conserved in this collision. Explain why this does not contradict the principle of conservation of momentum.', 1, 'An external force (from the wall) acts on the ball; the total momentum of the ball and the wall (and the Earth) is conserved ✓')
    ] };
};
T.MT4 = R => {
  const v = find(() => { const Fm = R.pick([200, 400, 600]), Td = R.pick([20, 40]), [what, m] = R.pick([['cricket ball', 0.16], ['football', 0.42], ['hockey ball', 0.16], ['golf ball', 0.046]]); return { Fm, Td, what, m, I: .5 * Fm * Td * 1e-3 }; }, x => x.I / x.m < 60 && x.I / x.m > 8);
  const fig = graph({ x: [0, 40, 10], y: [0, v.Fm, v.Fm / 4], div: 5, xl: 'time / ms', yl: 'force / N', curves: [{ f: pw([[0, 0], [v.Td / 2, v.Fm], [v.Td, 0]]), from: 0, to: v.Td }] });
  return { stem: `<b>Figure 1</b> shows how the force on a stationary ${v.what} varies with time when it is struck. The mass of the ball is ${N(v.m, 2)} kg.`, figs: [fig],
    parts: [
      text('State what is represented by the area under the graph.', 1, 'The impulse given to the ball (its change in momentum) ✓'),
      { q: 'Determine the impulse given to the ball.', marks: 2, ans: v.I, unit: 'N s', show: A(v.I), tol: .06, ms: `Area ${eq(`= ½ × ${N(v.Td * 1e-3, 2)} × ${v.Fm}`)} ✓<br>${eq(`= ${A(v.I)} N s`)} ✓`, guide: ['Award one mark if ms is not converted to s.'] },
      calc('Calculate the speed of the ball as it leaves.', 2, v.I / v.m, MS1, `${eq(`impulse = <i>mv</i>, so <i>v</i> = ${A(v.I)} / ${N(v.m, 2)}`)} ✓<br>${eq(`<i>v</i> = ${A(v.I / v.m)} ${MS1}`)} ✓`, { tol: .06 }),
      calc('Calculate the average force on the ball during the impact.', 1, v.Fm / 2, 'N', `${eq(`${A(v.I)} / ${N(v.Td * 1e-3, 2)} = ${A(v.Fm / 2)} N`)} ✓`, { tol: .06 }),
      text('A softer ball of the same mass is given the same impulse.<br>Describe how the graph for this ball differs from <b>Figure 1</b>.', 2, 'The contact time is longer and the maximum force is smaller ✓<br>The area under the graph is the same ✓')
    ] };
};
T.MT5 = R => {
  const mA = R.pick([0.50, 0.80, 1.0]), mB = R.pick([1.0, 1.5, 2.0]), vA = R.pick([0.60, 0.90, 1.2]), vB = mA * vA / mB, kA = .5 * mA * vA * vA, kB = .5 * mB * vB * vB;
  return { stem: `Two stationary trolleys <b>A</b> and <b>B</b> are held together with a compressed spring between them. <b>A</b> has a mass of ${N(mA, 2)} kg and <b>B</b> has a mass of ${N(mB, 2)} kg. When they are released, <b>A</b> moves off at ${N(vA, 2)} ${MS1}.`,
    parts: [
      text('State the total momentum of the two trolleys after they are released. Explain your answer.', 2, 'Zero ✓<br>The total momentum before release was zero and no external force acts, so momentum is conserved (the trolleys have equal and opposite momentum) ✓'),
      calc('Calculate the speed of <b>B</b>.', 2, vB, MS1, `${eq(`${N(mA, 2)} × ${N(vA, 2)} = ${N(mB, 2)} × <i>v</i>`)} ✓<br>${eq(`<i>v</i> = ${A(vB)} ${MS1}`)} (in the opposite direction to A) ✓`),
      calc('Calculate the total kinetic energy of the trolleys.', 2, kA + kB, 'J', `${eq(`(½ × ${N(mA, 2)} × ${N(vA, 2)}<sup>2</sup>) + (½ × ${N(mB, 2)} × ${A(vB)}<sup>2</sup>) = ${A(kA)} + ${A(kB)}`)} ✓<br>${eq(`= ${A(kA + kB)} J`)} ✓`),
      text('State the source of this kinetic energy.', 1, 'Elastic potential (strain) energy stored in the compressed spring ✓')
    ] };
};
T.MT6 = R => {
  const m = R.pick([60, 70, 80]), v = R.pick([13, 15, 20]), t1 = R.pick([0.040, 0.050]), t2 = R.pick([0.25, 0.30, 0.40]), p = m * v;
  return { stem: `A passenger of mass ${m} kg is in a car travelling at ${v} ${MS1} when the car hits a wall and stops. Without an air bag, the passenger would be brought to rest by the dashboard in ${N(t1, 2)} s. With an air bag and seat belt, the passenger is brought to rest in ${N(t2, 2)} s.`,
    parts: [
      calc('Calculate the momentum of the passenger before the collision.', 1, p, KGMS, `${eq(`${m} × ${v} = ${A(p)} ${KGMS}`)} ✓`),
      calc('Calculate the average force on the passenger without the air bag.', 2, p / t1, 'N', `${eq(`<i>F</i> = Δ<i>p</i>/Δ<i>t</i> = ${A(p)} / ${N(t1, 2)}`)} ✓<br>${eq(`<i>F</i> = ${A(p / t1)} N`)} ✓`),
      calc('Calculate the average force on the passenger with the air bag and seat belt.', 1, p / t2, 'N', `${eq(`${A(p)} / ${N(t2, 2)} = ${A(p / t2)} N`)} ✓`),
      text('Explain, in terms of momentum, how an air bag reduces the risk of injury.', 2, 'The change in momentum of the passenger is the same, but it takes place over a longer time ✓<br>so the rate of change of momentum, and therefore the force on the passenger, is smaller ✓'),
      text('State one other feature of a car that reduces the force on the passengers in the same way.', 1, 'Crumple zones (or seat belts that stretch slightly) ✓')
    ] };
};
T.MT7 = R => {
  const rate = R.pick([8.0, 12, 15, 20]), v = R.pick([10, 15, 20]), F = rate * v;
  return { stem: `A hose directs a horizontal jet of water at a vertical wall. Water leaves the hose at ${v} ${MS1} at a rate of ${N(rate, 2)} kg s<sup>−1</sup>. The water hits the wall at right angles and does not rebound.`,
    parts: [
      calc('Calculate the momentum lost by the water that hits the wall in one second.', 1, F, KGMS, `${eq(`${N(rate, 2)} × ${v} = ${A(F)} ${KGMS}`)} ✓`),
      text('Calculate the force that the water exerts on the wall. Explain your answer.', 3, `Force on the water = rate of change of momentum ✓<br>${eq(`= ${A(F)} N`)} ✓<br>By Newton’s third law, the water exerts an equal and opposite force of ${A(F)} N on the wall ✓`),
      text('State and explain how the force would change if the water rebounded from the wall.', 2, 'The force would be greater ✓<br>The change in momentum of the water each second would be greater (up to twice as large if it rebounded at the same speed) ✓'),
      calc(`Calculate the force on the wall if the speed of the water is doubled. The cross-sectional area of the jet is unchanged.`, 1, 4 * F, 'N', `Both the speed and the mass arriving each second double, so the force is four times as large: ${eq(`4 × ${A(F)} = ${A(4 * F)} N`)} ✓`)
    ] };
};

/* --- work, energy and power --- */
T.WE1 = R => {
  const F = R.pick([80, 120, 150]), th = R.pick([20, 25, 30, 40]), s = R.pick([15, 25, 40]), t = R.pick([20, 30, 50]), W = F * s * cosD(th);
  return { stem: `A child pulls a sledge at a constant speed across level snow using a rope. The tension in the rope is ${F} N and the rope makes an angle of ${th}° with the horizontal. The sledge moves ${s} m in ${t} s.`,
    parts: [
      calc('Calculate the work done by the child on the sledge.', 2, W, 'J', `${eq(`<i>W</i> = <i>Fs</i> cos <i>θ</i> = ${F} × ${s} × cos ${th}°`)} ✓<br>${eq(`<i>W</i> = ${A(W)} J`)} ✓`),
      calc('Calculate the average power developed by the child.', 2, W / t, 'W', `${eq(`<i>P</i> = <i>W</i>/<i>t</i> = ${A(W)} / ${t}`)} ✓<br>${eq(`<i>P</i> = ${A(W / t)} W`)} ✓`),
      text('Explain why the vertical component of the tension does no work.', 1, 'There is no displacement in the vertical direction (the force is perpendicular to the motion) ✓'),
      calc('Calculate the frictional force on the sledge.', 1, F * cosD(th), 'N', `The speed is constant, so friction equals the horizontal component of the tension: ${eq(`${F} × cos ${th}° = ${A(F * cosD(th))} N`)} ✓`),
      text('State the energy transfer that takes place as the sledge moves.', 1, 'The work done by the child is transferred to thermal (internal) energy of the sledge and snow, by friction ✓')
    ] };
};
T.WE2 = R => {
  const v = R.pick([25, 30]), Rf = R.pick([600, 800, 1000]), m = R.pick([1000, 1200, 1500]), th = R.pick([3.0, 4.0, 5.0]), P = Rf * v, ex = m * G * sinD(th), P2 = (Rf + ex) * v, v2 = P / (Rf + ex);
  return { stem: `A car of mass ${m} kg travels at a constant ${v} ${MS1} along a level road. The total resistive force on the car is ${Rf} N.`,
    parts: [
      calc('Calculate the power output of the engine.', 2, P, 'W', `At constant velocity the driving force equals the resistive force ✓<br>${eq(`<i>P</i> = <i>Fv</i> = ${Rf} × ${v} = ${A(P)} W`)} ✓`),
      calc(`The car now climbs a hill that makes an angle of ${N(th, 2)}° with the horizontal.<br>Calculate the component of the weight of the car that acts down the slope.`, 2, ex, 'N', `${eq(`<i>mg</i> sin <i>θ</i> = ${m} × 9.81 × sin ${N(th, 2)}°`)} ✓<br>${eq(`= ${A(ex)} N`)} ✓`),
      calc(`Calculate the power needed to keep the car moving at ${v} ${MS1} up the hill. Assume that the resistive force is unchanged.`, 2, P2, 'W', `Driving force ${eq(`= ${Rf} + ${A(ex)} = ${N(Rf + ex, 4)} N`)} ✓<br>${eq(`<i>P</i> = ${N(Rf + ex, 4)} × ${v} = ${A(P2)} W`)} ✓`),
      calc('Calculate the steady speed of the car on the hill if the power output stays at its original value.', 2, v2, MS1, `${eq(`<i>v</i> = <i>P</i>/<i>F</i> = ${A(P)} / ${N(Rf + ex, 4)}`)} ✓<br>${eq(`<i>v</i> = ${A(v2)} ${MS1}`)} ✓`, { guide: ['This assumes that the resistive force is still the same at the lower speed.'] })
    ] };
};
T.WE3 = R => {
  const m = R.pick([20, 40, 50, 75]), h = R.pick([3.0, 6.0, 10]), t = R.pick([8.0, 12, 15]), E = m * G * h, Pu = E / t, Pin = Number((Pu / R.pick([0.60, 0.65, 0.75, 0.80])).toPrecision(2)), eff = Pu / Pin;
  return { stem: `An electric motor lifts a load of mass ${m} kg through a vertical height of ${N(h, 2)} m in ${N(t, 2)} s at a constant speed. The electrical power supplied to the motor is ${N(Pin, 2)} W.`,
    parts: [
      calc('Calculate the gain in gravitational potential energy of the load.', 2, E, 'J', `${eq(`Δ<i>E</i><sub>p</sub> = <i>mg</i>Δ<i>h</i> = ${m} × 9.81 × ${N(h, 2)}`)} ✓<br>${eq(`= ${A(E)} J`)} ✓`),
      calc('Calculate the useful output power of the motor.', 1, Pu, 'W', `${eq(`${A(E)} / ${N(t, 2)} = ${A(Pu)} W`)} ✓`),
      calc('Calculate the efficiency of the motor.', 2, eff, '', `${eq(`efficiency = useful output power / input power = ${A(Pu)} / ${N(Pin, 2)}`)} ✓<br>${eq(`= ${A(eff)}`)} (${A(eff * 100)}%) ✓`),
      calc('Calculate the energy wasted while the load is lifted.', 2, Pin * t - E, 'J', `Energy supplied ${eq(`= ${N(Pin, 2)} × ${N(t, 2)} = ${N(Pin * t, 4)} J`)} ✓<br>Wasted ${eq(`= ${N(Pin * t, 4)} − ${N(E, 4)} = ${A(Pin * t - E)} J`)} ✓`),
      text('State one way in which energy is wasted.', 1, 'Heating of the motor windings by the current (or: friction in the bearings or pulley) ✓')
    ] };
};
T.WE4 = R => {
  const F1 = R.pick([30, 40, 50]), s1 = R.pick([4, 6]), s2 = R.pick([8, 10]), m = R.pick([2.0, 4.0, 5.0]), W1 = F1 * s1, W = W1 + .5 * F1 * (s2 - s1), v = Math.sqrt(2 * W / m);
  const fig = graph({ x: [0, 10, 2], y: [0, 50, 10], div: 5, xl: 'displacement / m', yl: 'force / N', curves: [{ f: pw([[0, F1], [s1, F1], [s2, 0]]), from: 0, to: s2 }] });
  return { stem: `<b>Figure 1</b> shows how the resultant force on a trolley of mass ${N(m, 2)} kg varies with its displacement. The trolley starts from rest and the force acts in the direction of motion.`, figs: [fig],
    parts: [
      text('State what is represented by the area under the graph.', 1, 'The work done on the trolley ✓'),
      { q: `Determine the work done on the trolley during the first ${s1} m.`, marks: 2, ans: W1, unit: 'J', show: A(W1), tol: .05, ms: `${eq(`<i>W</i> = <i>Fs</i> = ${F1} × ${s1}`)} ✓<br>${eq(`= ${A(W1)} J`)} ✓` },
      { q: 'Determine the total work done on the trolley.', marks: 2, ans: W, unit: 'J', show: A(W), tol: .05, ms: `Area of triangle ${eq(`= ½ × (${s2} − ${s1}) × ${F1} = ${A(.5 * F1 * (s2 - s1))} J`)} ✓<br>Total ${eq(`= ${A(W1)} + ${A(.5 * F1 * (s2 - s1))} = ${A(W)} J`)} ✓` },
      calc(`Calculate the speed of the trolley after it has moved ${s2} m.`, 2, v, MS1, `The work done equals the kinetic energy gained: ${eq(`½ × ${N(m, 2)} × <i>v</i><sup>2</sup> = ${A(W)}`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`, { tol: .05 })
    ] };
};
T.WE5 = R => {
  const n = R.pick([60, 80, 120]), h = R.pick([4.5, 6.0, 8.0]), eff = R.pick([60, 70, 75, 80]), W1 = 70 * G, E = n * W1 * h, P = E / 60, Pin = P / (eff / 100);
  return { stem: `An escalator lifts ${n} people each minute through a vertical height of ${N(h, 2)} m. The mean mass of a person is 70 kg. The efficiency of the escalator is ${eff}%.`,
    parts: [
      calc('Calculate the mean weight of one person.', 1, W1, 'N', `${eq(`70 × 9.81 = ${A(W1)} N`)} ✓`),
      calc('Calculate the useful work done by the escalator in one minute.', 2, E, 'J', `${eq(`${n} × ${A(W1)} × ${N(h, 2)}`)} ✓<br>${eq(`= ${A(E)} J`)} ✓`),
      calc('Calculate the useful output power of the escalator.', 1, P, 'W', `${eq(`${A(E)} / 60 = ${A(P)} W`)} ✓`),
      calc('Calculate the input power to the escalator.', 2, Pin, 'W', `${eq(`input power = useful output power / efficiency = ${A(P)} / ${(eff / 100).toFixed(2)}`)} ✓<br>${eq(`= ${A(Pin)} W`)} ✓`),
      text('Explain why the length of the escalator is not needed in this calculation.', 1, 'The gain in gravitational potential energy depends only on the vertical height gained, not on the distance moved along the slope ✓')
    ] };
};
T.WE6 = R => {
  const m = R.pick([900, 1200, 1500]), v = R.pick([15, 20, 30]), F = R.pick([6000, 7500, 9000]), K = .5 * m * v * v, d = K / F;
  return { stem: `A car of mass ${m} kg is travelling at ${v} ${MS1} on a level road when the driver brakes. The brakes exert a constant force of ${F} N.`,
    parts: [
      calc('Calculate the kinetic energy of the car before the brakes are applied.', 2, K, 'J', `${eq(`<i>E</i><sub>k</sub> = ½<i>mv</i><sup>2</sup> = ½ × ${m} × ${v}<sup>2</sup>`)} ✓<br>${eq(`= ${A(K)} J`)} ✓`),
      calc('Calculate the distance the car travels before it stops.', 2, d, 'm', `Work done by the brakes = kinetic energy lost: ${eq(`${F} × <i>s</i> = ${A(K)}`)} ✓<br>${eq(`<i>s</i> = ${A(d)} m`)} ✓`),
      text('State the energy transfer that takes place in the brakes.', 1, 'Kinetic energy of the car is transferred to thermal (internal) energy of the brakes ✓'),
      text('The car now travels at twice the speed and the braking force is the same.<br>State and explain the effect on the distance travelled before the car stops.', 2, 'The distance is four times as great ✓<br>The kinetic energy is proportional to <i>v</i><sup>2</sup>, so four times as much work must be done by the same force ✓')
    ] };
};

/* --- conservation of energy --- */
T.CE1 = R => {
  const m = R.pick([60, 70, 80]), h = R.pick([30, 45, 60]), L = R.pick([150, 200, 250]), v0 = Math.sqrt(2 * G * h), va = Math.round(v0 * R.pick([.6, .7, .8])), Ep = m * G * h, Ek = .5 * m * va * va, Wr = Ep - Ek;
  return { stem: `A skier of mass ${m} kg starts from rest at the top of a slope and descends through a vertical height of ${h} m. The slope is ${L} m long.`,
    parts: [
      calc('Calculate the gravitational potential energy lost by the skier.', 1, Ep, 'J', `${eq(`<i>mg</i>Δ<i>h</i> = ${m} × 9.81 × ${h} = ${A(Ep)} J`)} ✓`),
      calc('Calculate the speed the skier would have at the bottom if there were no resistive forces.', 2, v0, MS1, `${eq(`½<i>mv</i><sup>2</sup> = <i>mg</i>Δ<i>h</i>, so <i>v</i> = √(2 × 9.81 × ${h})`)} ✓<br>${eq(`<i>v</i> = ${A(v0)} ${MS1}`)} ✓`),
      calc(`The actual speed of the skier at the bottom is ${va} ${MS1}.<br>Calculate the kinetic energy of the skier at the bottom.`, 1, Ek, 'J', `${eq(`½ × ${m} × ${va}<sup>2</sup> = ${A(Ek)} J`)} ✓`),
      calc('Calculate the work done against resistive forces.', 2, Wr, 'J', `Work done against resistive forces = potential energy lost − kinetic energy gained ✓<br>${eq(`${A(Ep)} − ${A(Ek)} = ${A(Wr)} J`)} ✓`),
      calc('Calculate the mean resistive force on the skier.', 2, Wr / L, 'N', `${eq(`<i>F</i> = <i>W</i>/<i>s</i> = ${A(Wr)} / ${L}`)} ✓<br>${eq(`<i>F</i> = ${A(Wr / L)} N`)} ✓`)
    ] };
};
T.CE2 = R => {
  const m = R.pick([0.20, 0.30, 0.50]), h = R.pick([0.15, 0.20, 0.30, 0.45]), v = Math.sqrt(2 * G * h), vh = Math.sqrt(G * h);
  return { stem: `A pendulum bob of mass ${N(m, 2)} kg is pulled to one side so that it is ${N(h, 2)} m higher than its lowest position. It is then released from rest. Air resistance is negligible.`,
    parts: [
      calc('Calculate the maximum speed of the bob.', 3, v, MS1, `Potential energy lost = kinetic energy gained: ${eq('<i>mg</i>Δ<i>h</i> = ½<i>mv</i><sup>2</sup>')} ✓<br>${eq(`<i>v</i> = √(2 × 9.81 × ${N(h, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the maximum kinetic energy of the bob.', 1, m * G * h, 'J', `${eq(`${N(m, 2)} × 9.81 × ${N(h, 2)} = ${A(m * G * h)} J`)} ✓`),
      calc(`Calculate the speed of the bob when it is ${N(h / 2, 2)} m above its lowest position.`, 2, vh, MS1, `It has fallen ${N(h / 2, 2)} m: ${eq(`<i>v</i> = √(2 × 9.81 × ${N(h / 2, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(vh)} ${MS1}`)} ✓`),
      text('Explain why the maximum speed does not depend on the mass of the bob.', 1, 'Both the potential energy lost and the kinetic energy gained are proportional to the mass, so the mass cancels ✓')
    ] };
};
T.CE3 = R => {
  const m = R.pick([0.15, 0.20, 0.25]), u = R.pick([14, 16, 20]), K = .5 * m * u * u, H = u * u / (2 * G), ha = Math.floor(H * R.pick([.8, .85, .9])), lost = K - m * G * ha;
  return { stem: `A ball of mass ${N(m, 2)} kg is thrown vertically upwards at ${u} ${MS1}.`,
    parts: [
      calc('Calculate the initial kinetic energy of the ball.', 1, K, 'J', `${eq(`½ × ${N(m, 2)} × ${u}<sup>2</sup> = ${A(K)} J`)} ✓`),
      calc('Calculate the maximum height the ball would reach if there were no air resistance.', 2, H, 'm', `${eq(`<i>mg</i>Δ<i>h</i> = ${A(K)}, so Δ<i>h</i> = ${A(K)} / (${N(m, 2)} × 9.81)`)} ✓<br>${eq(`Δ<i>h</i> = ${A(H)} m`)} ✓`),
      calc(`The ball actually reaches a maximum height of ${ha} m.<br>Calculate the energy transferred to the surroundings as the ball rises.`, 2, lost, 'J', `Potential energy gained ${eq(`= ${N(m, 2)} × 9.81 × ${ha} = ${N(m * G * ha, 4)} J`)} ✓<br>${eq(`${N(K, 4)} − ${N(m * G * ha, 4)} = ${A(lost)} J`)} ✓`),
      calc('Calculate the mean force of air resistance on the ball as it rises.', 2, lost / ha, 'N', `${eq(`<i>F</i> = <i>W</i>/<i>s</i> = ${A(lost)} / ${ha}`)} ✓<br>${eq(`<i>F</i> = ${A(lost / ha)} N`)} ✓`),
      text(`Explain why the ball returns to the thrower at a speed less than ${u} ${MS1}.`, 1, 'Work is done against air resistance on the way up and on the way down, so the ball has less kinetic energy when it returns ✓')
    ] };
};
T.CE4 = R => {
  const h1 = R.pick([1.5, 2.0, 2.5]), h2 = Number((h1 * R.pick([.5, .6, .7])).toPrecision(2)), v1 = Math.sqrt(2 * G * h1), v2 = Math.sqrt(2 * G * h2), fr = 1 - h2 / h1;
  return { stem: `A ball is dropped from rest from a height of ${N(h1, 2)} m onto a hard floor. It rebounds to a height of ${N(h2, 2)} m. Air resistance is negligible.`,
    parts: [
      calc('Calculate the speed of the ball just before it hits the floor.', 2, v1, MS1, `${eq(`½<i>mv</i><sup>2</sup> = <i>mg</i>Δ<i>h</i>, so <i>v</i> = √(2 × 9.81 × ${N(h1, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(v1)} ${MS1}`)} ✓`),
      calc('Calculate the speed of the ball just after it leaves the floor.', 1, v2, MS1, `${eq(`<i>v</i> = √(2 × 9.81 × ${N(h2, 2)}) = ${A(v2)} ${MS1}`)} ✓`),
      calc('Calculate the fraction of the kinetic energy of the ball that is lost in the bounce.', 2, fr, '', `Kinetic energy is proportional to the height: fraction remaining ${eq(`= ${N(h2, 2)} / ${N(h1, 2)} = ${A(h2 / h1)}`)} ✓<br>Fraction lost ${eq(`= 1 − ${A(h2 / h1)} = ${A(fr)}`)} ✓`),
      text('State what happens to the energy that is lost.', 1, 'It is transferred to thermal (internal) energy of the ball and the floor (and a little sound) ✓'),
      calc('Calculate the height reached after the second bounce, assuming that the same fraction of energy is lost in each bounce.', 2, h2 * h2 / h1, 'm', `${eq(`${N(h2, 2)} × ${A(h2 / h1)}`)} ✓<br>${eq(`= ${A(h2 * h2 / h1)} m`)} ✓`)
    ] };
};
T.CE5 = R => {
  const rate = R.pick([2.0e3, 5.0e3, 8.0e3]), h = R.pick([40, 80, 150]), eff = R.pick([80, 85, 90]), P = rate * G * h, out = P * eff / 100, v = Math.sqrt(2 * G * h);
  return { stem: `In a hydroelectric power station, water falls through a vertical height of ${h} m to the turbines at a rate of ${N(rate, 2)} kg s<sup>−1</sup>. The power station converts ${eff}% of the gravitational potential energy lost by the water to electrical energy.`,
    parts: [
      calc('Calculate the gravitational potential energy lost by the water each second.', 2, P, 'J', `${eq(`<i>mg</i>Δ<i>h</i> = ${N(rate, 2)} × 9.81 × ${h}`)} ✓<br>${eq(`= ${A(P)} J`)} ✓`),
      calc('Calculate the electrical power output of the power station.', 2, out, 'W', `${eq(`${(eff / 100).toFixed(2)} × ${A(P)}`)} ✓<br>${eq(`= ${A(out)} W`)} ✓`),
      calc('Calculate the speed at which the water would reach the turbines if all the potential energy lost were transferred to kinetic energy.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>g</i>Δ<i>h</i>) = √(2 × 9.81 × ${h})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text('Give one reason why not all the potential energy lost is converted to electrical energy.', 1, 'The water still has kinetic energy when it leaves the turbines (or: friction in the pipes and turbine bearings; heating in the generator) ✓')
    ] };
};
T.CE6 = R => {
  const v = R.pick([8.5, 9.0, 9.5, 10]), m = R.pick([70, 75, 80]), K = .5 * m * v * v, h = v * v / (2 * G);
  return { stem: `A pole-vaulter of mass ${m} kg reaches a speed of ${N(v, 2)} ${MS1} at the end of the run-up. The pole is used to convert kinetic energy to gravitational potential energy.`,
    parts: [
      calc('Calculate the kinetic energy of the vaulter at the end of the run-up.', 2, K, 'J', `${eq(`½ × ${m} × ${N(v, 2)}<sup>2</sup>`)} ✓<br>${eq(`= ${A(K)} J`)} ✓`),
      calc('Calculate the greatest height through which the centre of mass of the vaulter could rise if all this kinetic energy were converted to gravitational potential energy.', 2, h, 'm', `${eq(`<i>mg</i>Δ<i>h</i> = ½<i>mv</i><sup>2</sup>, so Δ<i>h</i> = ${N(v, 2)}<sup>2</sup> / (2 × 9.81)`)} ✓<br>${eq(`Δ<i>h</i> = ${A(h)} m`)} ✓`),
      calc('The centre of mass of the vaulter is 1.0 m above the ground during the run-up.<br>Estimate the height of the bar that the vaulter could clear.', 1, h + 1, 'm', `${eq(`${A(h)} + 1.0 = ${A(h + 1)} m`)} ✓`),
      text('Give one reason why the height cleared could be less than this and one reason why it could be more.', 2, 'Less: the vaulter still needs some kinetic energy to move over the bar, and some energy is dissipated in the pole and by air resistance ✓<br>More: the vaulter does extra work with the arms by pushing on the pole ✓')
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
