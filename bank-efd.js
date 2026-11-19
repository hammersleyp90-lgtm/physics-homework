/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_EFD = (function(){
const module = undefined;
'use strict';
/* Question types for AQA electric fields and capacitance (3.7.3 and 3.7.4). */
const TOPICS = { CL: 'Coulomb’s law', EF: 'Electric field strength', EV: 'Electric potential', CP: 'Capacitance and energy stored', CD: 'Capacitor charge and discharge' };
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
/* ---------- electric fields (AQA 3.7.3) ---------- */
const EPS = 8.85e-12, KC = 1 / (4 * PI * EPS), G = 9.81, GC = 6.67e-11, E0S = '4π<i>ε</i><sub>0</sub>', EPSD = 'permittivity of free space <i>ε</i><sub>0</sub> = 8.85 × 10<sup>−12</sup> F m<sup>−1</sup>';
const NC = 'N C<sup>−1</sup>', VM = 'V m<sup>−1</sup>';
function plateFig(top, bottom, dlab, beam){
  let b = `<rect x="90" y="48" width="240" height="9" fill="#555"/><rect x="90" y="150" width="240" height="9" fill="#555"/>` + tx(350, 58, top, 'text-anchor="start"') + tx(350, 160, bottom, 'text-anchor="start"');
  b += dimLine(300, 59, 300, 148) + tx(292, 108, dlab, 'text-anchor="end" font-size="14"');
  if (beam) b += ln(20, 104, 90, 104, 'stroke-width="1.6"') + head(90, 104, 1, 0) + tx(48, 92, 'electrons', 'font-size="13"');
  return svgWrap(430, 205, 'Two parallel horizontal metal plates, one above the other' + (beam ? ', with a beam of electrons entering the gap midway between them' : ''), b + tx(385, 198, 'not to scale', 'font-size="12"'));
}
/* --- Coulomb's law --- */
T.CL1 = R => {
  const q1 = R.pick([2.0, 4.0, 5.0]), q2 = R.pick([3.0, 4.0, 6.0]), neg = R.chance(.5), r = R.pick([0.10, 0.20, 0.30]), F = KC * q1 * q2 * 1e-12 / (r * r);
  return { stem: `Two small charged spheres are ${N(r, 2)} m apart. One has a charge of +${N(q1, 2)} μC and the other has a charge of ${neg ? '−' : '+'}${N(q2, 2)} μC.<br>${EPSD}`,
    parts: [
      text('State Coulomb’s law.', 2, 'The force between two point charges is directly proportional to the product of the charges ✓<br>and inversely proportional to the square of their separation ✓'),
      calc('Calculate the magnitude of the force between the spheres.', 3, F, 'N', `${eq(`<i>F</i> = <i>Q</i><sub>1</sub><i>Q</i><sub>2</sub> / ${E0S}<i>r</i><sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = (${N(q1 * 1e-6, 2)} × ${N(q2 * 1e-6, 2)}) / (4π × 8.85 × 10<sup>−12</sup> × ${N(r, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`, { guide: ['Award a maximum of two marks if μC is not converted to C.'] }),
      text('State whether the force is attractive or repulsive.', 1, neg ? 'Attractive (the charges have opposite signs) ✓' : 'Repulsive (the charges have the same sign) ✓'),
      calc('Calculate the force between the spheres when their separation is doubled.', 1, F / 4, 'N', `The force is inversely proportional to <i>r</i><sup>2</sup>: ${eq(`${A(F)} / 4 = ${A(F / 4)} N`)} ✓`)
    ] };
};
T.CL2 = R => {
  const r = R.pick([5.3e-11, 2.1e-10, 4.8e-10]), Fe = KC * QE * QE / (r * r), Fg = GC * ME * MP / (r * r), v = Math.sqrt(Fe * r / ME);
  return { stem: `In a simple model of the hydrogen atom, an electron orbits a proton in a circle of radius ${N(r, 2)} m.<br>${EPSD}<br>gravitational constant <i>G</i> = 6.67 × 10<sup>−11</sup> N m<sup>2</sup> kg<sup>−2</sup>`,
    parts: [
      calc('Calculate the electrostatic force between the electron and the proton.', 3, Fe, 'N', `${eq(`<i>F</i> = <i>e</i><sup>2</sup> / ${E0S}<i>r</i><sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = (1.60 × 10<sup>−19</sup>)<sup>2</sup> / (4π × 8.85 × 10<sup>−12</sup> × (${N(r, 2)})<sup>2</sup>)`)} ✓<br>${eq(`<i>F</i> = ${A(Fe)} N`)} ✓`),
      calc('Calculate the gravitational force between the electron and the proton.', 2, Fg, 'N', `${eq(`<i>F</i> = <i>Gm</i><sub>e</sub><i>m</i><sub>p</sub>/<i>r</i><sup>2</sup> = (6.67 × 10<sup>−11</sup> × 9.11 × 10<sup>−31</sup> × 1.67 × 10<sup>−27</sup>) / (${N(r, 2)})<sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = ${A(Fg)} N`)} ✓`),
      calc('Calculate the ratio electrostatic force ÷ gravitational force.', 1, Fe / Fg, '', `${eq(`${A(Fe)} / ${A(Fg)} = ${A(Fe / Fg)}`)} ✓`, { tol: .02 }),
      text('State what this ratio shows about the forces inside an atom.', 1, 'The gravitational force is negligible compared with the electrostatic force ✓'),
      calc('Calculate the speed of the electron in its orbit.', 2, v, MS1, `The electrostatic force provides the centripetal force: ${eq(`<i>mv</i><sup>2</sup>/<i>r</i> = ${A(Fe)}`)} ✓<br>${eq(`<i>v</i> = √(${A(Fe)} × ${N(r, 2)} / 9.11 × 10<sup>−31</sup>) = ${A(v)} ${MS1}`)} ✓`)
    ] };
};
T.CL3 = R => {
  const m = R.pick([0.50, 1.0, 2.0]), th = R.pick([5.0, 8.0, 10, 12]), r = R.pick([4.0, 6.0, 8.0]), F = m / 1000 * G * tanD(th), q = Math.sqrt(F * (r / 100) * (r / 100) / KC);
  return { stem: `Two identical small conducting spheres, each of mass ${N(m, 2)} g, hang from the same point on insulating threads. The spheres are given equal charges and come to rest ${N(r, 2)} cm apart, with each thread at ${N(th, 2)}° to the vertical.<br>${EPSD}`,
    parts: [
      text('State what can be deduced about the signs of the charges on the spheres.', 1, 'They have the same sign, because the spheres repel ✓'),
      calc('Calculate the electrostatic force on each sphere.', 3, F, 'N', `Vertically ${eq('<i>T</i> cos <i>θ</i> = <i>mg</i>')} and horizontally ${eq('<i>T</i> sin <i>θ</i> = <i>F</i>')}, so ${eq('<i>F</i> = <i>mg</i> tan <i>θ</i>')} ✓<br>${eq(`<i>F</i> = ${N(m / 1000, 2)} × 9.81 × tan ${N(th, 2)}°`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`),
      calc('Calculate the charge on each sphere.', 3, q, 'C', `${eq(`<i>F</i> = <i>Q</i><sup>2</sup> / ${E0S}<i>r</i><sup>2</sup>, so <i>Q</i> = √(<i>F</i> × ${E0S}<i>r</i><sup>2</sup>)`)} ✓<br>${eq(`<i>Q</i> = √(${A(F)} × 4π × 8.85 × 10<sup>−12</sup> × ${N(r / 100, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>Q</i> = ${A(q)} C`)} ✓`),
      calc('Calculate the number of electrons that would carry this charge.', 1, q / QE, '', `${eq(`${A(q)} / 1.60 × 10<sup>−19</sup> = ${A(q / QE)}`)} ✓`, { tol: .02 })
    ] };
};
T.CL4 = R => {
  const v = find(() => { const q1 = R.pick([20, 40, 60]), q3 = R.pick([20, 30, 80]), q = R.pick([5.0, 10]), d1 = R.pick([0.10, 0.20]), d2 = R.pick([0.10, 0.20, 0.30]); return { q1, q3, q, d1, d2, FA: KC * q1 * q * 1e-18 / (d1 * d1), FC: KC * q3 * q * 1e-18 / (d2 * d2) }; }, x => Math.abs(x.FA - x.FC) / Math.max(x.FA, x.FC) > .15);
  const res = Math.abs(v.FA - v.FC), toC = v.FA > v.FC;
  return { stem: `Three small positively charged spheres <b>A</b>, <b>B</b> and <b>C</b> lie on a straight line, with <b>B</b> between <b>A</b> and <b>C</b>. <b>A</b> has a charge of ${v.q1} nC, <b>B</b> has a charge of ${N(v.q, 2)} nC and <b>C</b> has a charge of ${v.q3} nC. <b>B</b> is ${N(v.d1, 2)} m from <b>A</b> and ${N(v.d2, 2)} m from <b>C</b>.<br>${EPSD}`,
    parts: [
      calc('Calculate the force that <b>A</b> exerts on <b>B</b>.', 2, v.FA, 'N', `${eq(`<i>F</i> = (${N(v.q1 * 1e-9, 2)} × ${N(v.q * 1e-9, 2)}) / (4π × 8.85 × 10<sup>−12</sup> × ${N(v.d1, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>F</i> = ${A(v.FA)} N`)}, directed away from A (towards C) ✓`),
      calc('Calculate the force that <b>C</b> exerts on <b>B</b>.', 2, v.FC, 'N', `${eq(`<i>F</i> = (${N(v.q3 * 1e-9, 2)} × ${N(v.q * 1e-9, 2)}) / (4π × 8.85 × 10<sup>−12</sup> × ${N(v.d2, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>F</i> = ${A(v.FC)} N`)}, directed away from C (towards A) ✓`),
      text('Determine the magnitude and direction of the resultant force on <b>B</b>.', 2, `${eq(`${N(Math.max(v.FA, v.FC), 4)} − ${N(Math.min(v.FA, v.FC), 4)} = ${A(res)} N`)} ✓<br>Towards ${toC ? 'C' : 'A'} ✓`),
      text('<b>B</b> is moved along the line until the resultant force on it is zero.<br>State and explain whether this position is nearer to <b>A</b> or to <b>C</b>.', 1, v.q1 === v.q3 ? 'It is midway between them, because the charges on A and C are equal ✓' : `Nearer to ${v.q1 < v.q3 ? 'A' : 'C'}: it must be closer to the smaller charge for the two forces to be equal ✓`)
    ] };
};
T.CL5 = R => {
  const r = R.pick([1.0e-14, 2.0e-14, 5.0e-15]), Fe = KC * QE * QE / (r * r), Fg = GC * MP * MP / (r * r);
  return { stem: `Electric fields and gravitational fields have many features in common.<br>${EPSD}<br>gravitational constant <i>G</i> = 6.67 × 10<sup>−11</sup> N m<sup>2</sup> kg<sup>−2</sup>`,
    parts: [
      text('State two similarities between the electric field of a point charge and the gravitational field of a point mass.', 2, 'Any two ✓✓:<br>Both obey an inverse-square law for force (and field strength).<br>Both are radial fields.<br>In both, the potential is inversely proportional to the distance.<br>Both have field strength equal to minus the potential gradient.'),
      text('State two differences between electric fields and gravitational fields.', 2, 'Gravitational forces are always attractive; electric forces can be attractive or repulsive ✓<br>Gravitational forces act between masses; electric forces act between charges (accept: electric forces between particles are very much stronger) ✓'),
      calc(`Calculate the electrostatic force between two protons that are ${N(r, 2)} m apart.`, 2, Fe, 'N', `${eq(`<i>F</i> = (1.60 × 10<sup>−19</sup>)<sup>2</sup> / (4π × 8.85 × 10<sup>−12</sup> × (${N(r, 2)})<sup>2</sup>)`)} ✓<br>${eq(`<i>F</i> = ${A(Fe)} N`)} ✓`),
      calc('Calculate the gravitational force between the two protons.', 2, Fg, 'N', `${eq(`<i>F</i> = (6.67 × 10<sup>−11</sup> × (1.67 × 10<sup>−27</sup>)<sup>2</sup>) / (${N(r, 2)})<sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = ${A(Fg)} N`)} ✓`)
    ] };
};
/* --- electric field strength --- */
T.EF1 = R => {
  const V = R.pick([200, 400, 600, 1500]), d = R.pick([5.0, 8.0, 10, 20]), E = V / (d / 1000), F = E * QE, a = F / ME;
  return { stem: `<b>Figure 1</b> shows two parallel metal plates ${N(d, 2)} mm apart in a vacuum. The upper plate is at a potential of +${V} V and the lower plate is at 0 V. An electron is between the plates.`, figs: [plateFig(`+${V} V`, '0 V', `${N(d, 2)} mm`)],
    parts: [
      text('State what is meant by electric field strength.', 1, 'The force per unit charge acting on a small positive charge placed at that point ✓'),
      calc('Calculate the electric field strength between the plates.', 2, E, VM, `${eq(`<i>E</i> = <i>V</i>/<i>d</i> = ${V} / ${N(d / 1000, 2)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} ${VM}`)} ✓`),
      calc('Calculate the force on the electron.', 2, F, 'N', `${eq(`<i>F</i> = <i>EQ</i> = ${A(E)} × 1.60 × 10<sup>−19</sup>`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`),
      text('State the direction of the force on the electron.', 1, 'Upwards, towards the positive plate (opposite to the direction of the field) ✓'),
      calc('Calculate the acceleration of the electron.', 2, a, MS2, `${eq(`<i>a</i> = <i>F</i>/<i>m</i> = ${A(F)} / 9.11 × 10<sup>−31</sup>`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`)
    ] };
};
T.EF2 = R => {
  const Q = R.pick([2.0, 5.0, 8.0]), r = R.pick([0.050, 0.10, 0.20]), [pn, pq] = R.pick([['proton', 1], ['alpha particle', 2]]), E = KC * Q * 1e-9 / (r * r), F = E * pq * QE;
  return { stem: `A small sphere carries a charge of +${N(Q, 2)} nC and is isolated from other charges.<br>${EPSD}`,
    parts: [
      calc(`Calculate the electric field strength ${N(r, 2)} m from the centre of the sphere.`, 3, E, NC, `${eq(`<i>E</i> = <i>Q</i> / ${E0S}<i>r</i><sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = ${N(Q * 1e-9, 2)} / (4π × 8.85 × 10<sup>−12</sup> × ${N(r, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>E</i> = ${A(E)} ${NC}`)} ✓`),
      text('State the direction of the field at this point.', 1, 'Radially outwards, directly away from the sphere ✓'),
      calc(`Calculate the force on ${pn === 'proton' ? 'a proton' : 'an alpha particle'} placed at this point.`, 2, F, 'N', `${eq(`<i>F</i> = <i>EQ</i> = ${A(E)} × ${pq === 1 ? '' : '2 × '}1.60 × 10<sup>−19</sup>`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`),
      calc('Calculate the distance from the centre of the sphere at which the field strength is one quarter of this value.', 1, 2 * r, 'm', `Field strength is proportional to 1/<i>r</i><sup>2</sup>, so the distance doubles: ${eq(`${A(2 * r)} m`)} ✓`)
    ] };
};
T.EF3 = R => {
  const v = find(() => { const u = R.pick([1.5e7, 2.0e7, 3.0e7]), L = R.pick([0.040, 0.050, 0.080]), V = R.pick([50, 100, 200]), d = R.pick([0.020, 0.025, 0.040]); const E = V / d, a = E * QE / ME, t = L / u; return { u, L, V, d, E, a, t, y: .5 * a * t * t }; }, x => x.y < x.d / 2 * .9 && x.y > 5e-4);
  return { stem: `<b>Figure 1</b> shows a beam of electrons travelling horizontally at ${N(v.u, 2)} ${MS1} as it enters the gap midway between two horizontal parallel plates. The plates are ${N(v.L, 2)} m long and ${N(v.d, 2)} m apart, and the potential difference between them is ${v.V} V. The upper plate is positive.`, figs: [plateFig(`+${v.V} V`, '0 V', `${N(v.d, 2)} m`, true)],
    parts: [
      calc('Calculate the electric field strength between the plates.', 1, v.E, VM, `${eq(`<i>E</i> = <i>V</i>/<i>d</i> = ${v.V} / ${N(v.d, 2)} = ${A(v.E)} ${VM}`)} ✓`),
      calc('Calculate the acceleration of an electron between the plates.', 2, v.a, MS2, `${eq(`<i>a</i> = <i>eE</i>/<i>m</i> = (1.60 × 10<sup>−19</sup> × ${A(v.E)}) / 9.11 × 10<sup>−31</sup>`)} ✓<br>${eq(`<i>a</i> = ${A(v.a)} ${MS2}`)} ✓`),
      calc('Calculate the time an electron spends between the plates.', 1, v.t, 's', `${eq(`<i>t</i> = ${N(v.L, 2)} / ${N(v.u, 2)} = ${A(v.t)} s`)} ✓`),
      calc('Calculate the vertical deflection of an electron as it leaves the plates.', 2, v.y, 'm', `${eq(`<i>s</i> = ½<i>at</i><sup>2</sup> = ½ × ${A(v.a)} × (${A(v.t)})<sup>2</sup>`)} ✓<br>${eq(`<i>s</i> = ${A(v.y)} m`)} (upwards) ✓`),
      text('Describe and explain the shape of the path of the electrons between the plates.', 2, 'A parabola, curving upwards towards the positive plate ✓<br>The horizontal velocity is constant and there is a constant vertical force (acceleration), as for a projectile ✓')
    ] };
};
T.EF4 = R => {
  const m = R.pick([3.2e-15, 4.8e-15, 6.4e-15, 9.6e-15]), d = R.pick([5.0, 8.0, 10]), n = R.pick([2, 3, 4, 5]), V = r3(m * G * d / 1000 / (n * QE)), E = V / (d / 1000), q = m * G / E;
  return { stem: `A negatively charged oil drop of mass ${N(m, 2)} kg is held stationary between two horizontal parallel plates that are ${N(d, 2)} mm apart. The potential difference between the plates is ${N(V, 3)} V.`,
    parts: [
      calc('Calculate the weight of the oil drop.', 1, m * G, 'N', `${eq(`${N(m, 2)} × 9.81 = ${A(m * G)} N`)} ✓`),
      calc('Calculate the electric field strength between the plates.', 1, E, VM, `${eq(`<i>E</i> = <i>V</i>/<i>d</i> = ${N(V, 3)} / ${N(d / 1000, 2)} = ${A(E)} ${VM}`)} ✓`),
      calc('Calculate the charge on the oil drop.', 3, q, 'C', `The drop is stationary, so the electric force equals the weight: ${eq('<i>EQ</i> = <i>mg</i>')} ✓<br>${eq(`<i>Q</i> = ${A(m * G)} / ${A(E)}`)} ✓<br>${eq(`<i>Q</i> = ${A(q)} C`)} ✓`),
      calc('Determine the number of excess electrons on the drop.', 1, n, '', `${eq(`${A(q)} / 1.60 × 10<sup>−19</sup> = ${N(q / QE, 3)}`)}, so ${n} electrons ✓`, { show: String(n) }),
      text('State and explain which plate is positive.', 1, 'The upper plate: the force on the negative drop must be upwards, towards the positive plate, to balance its weight ✓'),
      text('State what happens to the drop when the potential difference is increased.', 1, 'It accelerates upwards (the electric force is now greater than the weight) ✓')
    ] };
};
T.EF5 = R => {
  const Q1 = R.pick([4.0, 6.0, 8.0]), Q2 = R.pick([2.0, 3.0]), opp = R.chance(.5), d = R.pick([0.20, 0.40]), h = d / 2, E1 = KC * Q1 * 1e-9 / (h * h), E2 = KC * Q2 * 1e-9 / (h * h), res = opp ? E1 + E2 : E1 - E2, x = d / (1 + Math.sqrt(Q2 / Q1));
  return { stem: `Two small spheres <b>X</b> and <b>Y</b> are ${N(d, 2)} m apart. <b>X</b> has a charge of +${N(Q1, 2)} nC and <b>Y</b> has a charge of ${opp ? '−' : '+'}${N(Q2, 2)} nC. Point <b>M</b> is midway between them.<br>${EPSD}`,
    parts: [
      calc('Calculate the electric field strength at <b>M</b> due to <b>X</b> alone.', 2, E1, NC, `${eq(`<i>E</i> = ${N(Q1 * 1e-9, 2)} / (4π × 8.85 × 10<sup>−12</sup> × ${N(h, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>E</i> = ${A(E1)} ${NC}`)}, directed away from X ✓`),
      calc('Calculate the electric field strength at <b>M</b> due to <b>Y</b> alone.', 1, E2, NC, `${eq(`${N(Q2 * 1e-9, 2)} / (4π × 8.85 × 10<sup>−12</sup> × ${N(h, 2)}<sup>2</sup>) = ${A(E2)} ${NC}`)}, directed ${opp ? 'towards' : 'away from'} Y ✓`),
      text('Determine the magnitude and direction of the resultant field strength at <b>M</b>.', 2, `The two fields are in ${opp ? 'the same direction' : 'opposite directions'}: ${eq(`${N(E1, 4)} ${opp ? '+' : '−'} ${N(E2, 4)} = ${A(res)} ${NC}`)} ✓<br>Directed from X towards Y ✓`),
      opp ? text('Explain why there is no point on the line between <b>X</b> and <b>Y</b> at which the resultant field strength is zero.', 2, 'Between the spheres, the field due to X (away from X) and the field due to Y (towards Y) are in the same direction ✓<br>so they add and cannot cancel ✓')
        : calc('Calculate the distance from <b>X</b> of the point on the line between the spheres at which the resultant field strength is zero.', 2, x, 'm', `The two field strengths are equal: ${eq(`${N(Q1, 2)} / <i>x</i><sup>2</sup> = ${N(Q2, 2)} / (${N(d, 2)} − <i>x</i>)<sup>2</sup>`)} ✓<br>${eq(`<i>x</i> = ${N(d, 2)} / (1 + √(${N(Q2, 2)} / ${N(Q1, 2)})) = ${A(x)} m`)} ✓`)
    ] };
};
T.EF6 = R => {
  const V = R.pick([500, 2000, 5000]), E = QE * V, v = Math.sqrt(2 * E / MP);
  return { stem: `Electric fields can be represented by field lines.`,
    parts: [
      text('Describe the electric field between two oppositely charged parallel plates.', 2, 'The field is uniform: the field lines are parallel and equally spaced ✓<br>They are directed from the positive plate to the negative plate (perpendicular to the plates) ✓'),
      text('Describe the electric field around an isolated positive point charge.', 1, 'Radial field lines directed away from the charge, becoming further apart (the field weaker) with distance ✓'),
      calc(`A proton is accelerated from rest through a potential difference of ${V} V.<br>Calculate the kinetic energy gained by the proton in J.`, 1, E, 'J', `${eq(`<i>E</i><sub>k</sub> = <i>QV</i> = 1.60 × 10<sup>−19</sup> × ${V} = ${A(E)} J`)} ✓`),
      calc('Calculate the final speed of the proton.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(E)} / 1.67 × 10<sup>−27</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text('State the kinetic energy, in eV, gained by an alpha particle accelerated through the same potential difference.', 1, `${2 * V} eV (its charge is 2<i>e</i>) ✓`)
    ] };
};
/* --- electric potential --- */
T.EV1 = R => {
  const Q = R.pick([3.0, 5.0, 8.0]), r = R.pick([0.10, 0.25, 0.50]), q = R.pick([2.0, 4.0]), V = KC * Q * 1e-9 / r;
  return { stem: `A small sphere carries a charge of +${N(Q, 2)} nC.<br>${EPSD}`,
    parts: [
      text('State what is meant by the electric potential at a point.', 2, 'The work done per unit positive charge ✓<br>in moving a small test charge from infinity to that point ✓'),
      calc(`Calculate the electric potential ${N(r, 2)} m from the centre of the sphere.`, 2, V, 'V', `${eq(`<i>V</i> = <i>Q</i> / ${E0S}<i>r</i> = ${N(Q * 1e-9, 2)} / (4π × 8.85 × 10<sup>−12</sup> × ${N(r, 2)})`)} ✓<br>${eq(`<i>V</i> = ${A(V)} V`)} ✓`),
      calc(`Calculate the work done in bringing a charge of +${N(q, 2)} nC from infinity to this point.`, 2, V * q * 1e-9, 'J', `${eq(`<i>W</i> = <i>QV</i> = ${N(q * 1e-9, 2)} × ${A(V)}`)} ✓<br>${eq(`<i>W</i> = ${A(V * q * 1e-9)} J`)} ✓`),
      text('State how the potential at this point would differ if the sphere carried a negative charge of the same size.', 1, `It would have the same magnitude but be negative (−${A(V)} V) ✓`)
    ] };
};
T.EV2 = R => {
  const Q = R.pick([2.0, 4.0, 6.0]), r1 = R.pick([0.10, 0.20]), r2 = R.pick([0.40, 0.50, 0.80]), q = R.pick([5.0, 10, 20]), VA = KC * Q * 1e-6 / r1, VB = KC * Q * 1e-6 / r2, W = (VA - VB) * q * 1e-9;
  return { stem: `A small sphere carries a charge of +${N(Q, 2)} μC. Point <b>A</b> is ${N(r1, 2)} m from the centre of the sphere and point <b>B</b> is ${N(r2, 2)} m from it.<br>${EPSD}`,
    parts: [
      calc('Calculate the electric potential at <b>A</b>.', 2, VA, 'V', `${eq(`<i>V</i> = ${N(Q * 1e-6, 2)} / (4π × 8.85 × 10<sup>−12</sup> × ${N(r1, 2)})`)} ✓<br>${eq(`<i>V</i> = ${A(VA)} V`)} ✓`),
      calc('Calculate the electric potential at <b>B</b>.', 1, VB, 'V', `${eq(`${N(Q * 1e-6, 2)} / (4π × 8.85 × 10<sup>−12</sup> × ${N(r2, 2)}) = ${A(VB)} V`)} ✓`),
      calc('Calculate the potential difference between <b>A</b> and <b>B</b>.', 1, VA - VB, 'V', `${eq(`${A(VA)} − ${A(VB)} = ${A(VA - VB)} V`)} ✓`),
      calc(`Calculate the work done in moving a charge of +${N(q, 2)} nC from <b>B</b> to <b>A</b>.`, 2, W, 'J', `${eq(`<i>W</i> = <i>Q</i>Δ<i>V</i> = ${N(q * 1e-9, 2)} × ${A(VA - VB)}`)} ✓<br>${eq(`<i>W</i> = ${A(W)} J`)} ✓`),
      text('State whether the work done depends on the path taken from <b>B</b> to <b>A</b>.', 1, 'No: it depends only on the potential difference between the two points ✓')
    ] };
};
T.EV3 = R => {
  const K = R.pick([30, 45, 60]), Q = K / KC, E = K / .04;
  const fig = graph({ x: [0, 0.5, 0.1], y: [0, 600, 100], div: 5, xl: 'distance from the centre of the sphere / m', yl: 'electric potential / V', curves: [{ f: x => K / x, from: K / 600, to: 0.5 }] });
  return { stem: `<b>Figure 1</b> shows how the electric potential varies with distance from the centre of a small charged sphere.<br>${EPSD}`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the electric potential 0.20 m from the centre of the sphere.', marks: 1, ans: K / .2, unit: 'V', show: A(K / .2), tol: .06, ms: `${eq(`${A(K / .2)} V`)} ✓`, guide: ['Reading from the graph: allow ± 10 V.'] },
      text('Use data from <b>Figure 1</b> to show that the potential is inversely proportional to the distance.', 2, `Reads the potential at two (or more) distances, for example ${A(K / .1)} V at 0.10 m and ${A(K / .4)} V at 0.40 m ✓<br>Potential × distance is constant: ${eq(`${A(K / .1)} × 0.10 = ${A(K)}`)} and ${eq(`${A(K / .4)} × 0.40 = ${A(K)}`)} ✓`),
      calc('Calculate the charge on the sphere.', 2, Q, 'C', `${eq(`<i>Q</i> = ${E0S}<i>rV</i> = 4π × 8.85 × 10<sup>−12</sup> × 0.20 × ${A(K / .2)}`)} ✓<br>${eq(`<i>Q</i> = ${A(Q)} C`)} ✓`, { tol: .07 }),
      text('State how the electric field strength at a point could be found from <b>Figure 1</b>.', 1, 'It is equal to minus the gradient of the graph at that point (draw a tangent and find its gradient) ✓'),
      calc('Calculate the electric field strength 0.20 m from the centre of the sphere.', 2, E, VM, `${eq(`<i>E</i> = <i>Q</i> / ${E0S}<i>r</i><sup>2</sup> = <i>V</i>/<i>r</i> = ${A(K / .2)} / 0.20`)} ✓<br>${eq(`<i>E</i> = ${A(E)} ${VM}`)} ✓`, { tol: .07 })
    ] };
};
T.EV4 = R => {
  const V = R.pick([300, 600, 1200]), d = R.pick([20, 30, 40]), x = R.pick([5.0, 10]), Vx = V * x / d, W = QE * (V - Vx);
  return { stem: `Two horizontal parallel plates are ${d} mm apart. The upper plate is at a potential of +${V} V and the lower plate is at 0 V. Point <b>P</b> is ${N(x, 2)} mm above the lower plate.`,
    parts: [
      text('State what is meant by an equipotential surface.', 1, 'A surface on which every point is at the same potential ✓'),
      text('Describe the equipotential surfaces between the plates.', 1, 'Planes parallel to the plates, equally spaced for equal changes of potential ✓'),
      calc('Calculate the potential at <b>P</b>.', 2, Vx, 'V', `The field is uniform, so the potential increases uniformly with distance from the lower plate: ${eq(`${V} × ${N(x, 2)} / ${d}`)} ✓<br>${eq(`= ${A(Vx)} V`)} ✓`),
      calc('Calculate the work done by the field when an electron moves from <b>P</b> to the upper plate.', 2, W, 'J', `${eq(`<i>W</i> = <i>Q</i>Δ<i>V</i> = 1.60 × 10<sup>−19</sup> × (${V} − ${A(Vx)})`)} ✓<br>${eq(`<i>W</i> = ${A(W)} J`)} ✓`),
      text('State and explain the work done when a charge moves along an equipotential surface.', 1, 'Zero, because there is no change in potential (the force is perpendicular to the direction of motion) ✓')
    ] };
};
T.EV5 = R => {
  const Rr = R.pick([0.10, 0.15, 0.20]), V = R.pick([100, 150, 200]), Q = Rr * V * 1e3 / KC, E = V * 1e3 / Rr, Vmax = 3.0e6 * Rr;
  return { stem: `The dome of a Van de Graaff generator is a metal sphere of radius ${N(Rr, 2)} m. It is charged until its potential is ${V} kV. The potential at the surface of a charged sphere is the same as if all its charge were at its centre.<br>${EPSD}`,
    parts: [
      calc('Calculate the charge on the dome.', 2, Q, 'C', `${eq(`<i>Q</i> = ${E0S}<i>rV</i> = 4π × 8.85 × 10<sup>−12</sup> × ${N(Rr, 2)} × ${N(V * 1e3, 2)}`)} ✓<br>${eq(`<i>Q</i> = ${A(Q)} C`)} ✓`),
      calc('Calculate the electric field strength at the surface of the dome.', 2, E, VM, `${eq(`<i>E</i> = <i>Q</i> / ${E0S}<i>r</i><sup>2</sup> = <i>V</i>/<i>r</i> = ${N(V * 1e3, 2)} / ${N(Rr, 2)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} ${VM}`)} ✓`),
      calc(`Air becomes conducting when the electric field strength reaches 3.0 × 10<sup>6</sup> ${VM}.<br>Calculate the maximum potential to which the dome can be charged.`, 2, Vmax, 'V', `${eq(`<i>V</i> = <i>Er</i> = 3.0 × 10<sup>6</sup> × ${N(Rr, 2)}`)} ✓<br>${eq(`<i>V</i> = ${A(Vmax)} V`)} ✓`),
      text('Explain why a dome with a larger radius can reach a higher potential.', 1, 'For a given potential, the field strength at the surface (<i>V</i>/<i>r</i>) is smaller for a larger radius, so a higher potential is reached before the air breaks down ✓')
    ] };
};
T.EV6 = R => {
  const V1 = R.pick([100, 200]), V2 = R.pick([500, 800, 1200]), dV = V2 - V1, E = QE * dV, v = Math.sqrt(2 * E / ME);
  return { stem: `Point <b>A</b> in an electric field is at a potential of +${V1} V and point <b>B</b> is at a potential of +${V2} V. An electron is released from rest at <b>A</b>.`,
    parts: [
      text('State and explain the direction in which the electron moves.', 1, 'Towards <b>B</b>: an electron is negative, so it is attracted towards the point at the higher (more positive) potential ✓'),
      calc('Calculate the kinetic energy of the electron when it reaches <b>B</b>, in J.', 2, E, 'J', `${eq(`<i>E</i><sub>k</sub> = <i>Q</i>Δ<i>V</i> = 1.60 × 10<sup>−19</sup> × (${V2} − ${V1})`)} ✓<br>${eq(`<i>E</i><sub>k</sub> = ${A(E)} J`)} ✓`),
      text('State this kinetic energy in eV.', 1, `${dV} eV ✓`),
      calc('Calculate the speed of the electron at <b>B</b>.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(E)} / 9.11 × 10<sup>−31</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text('A proton is released from rest at <b>B</b>.<br>State the kinetic energy, in eV, with which it reaches <b>A</b>.', 1, `${dV} eV (it moves through the same potential difference and has a charge of the same size) ✓`)
    ] };
};
/* --- capacitance and energy stored --- */
const UF = x => x * 1e-6;
T.CP1 = R => {
  const Cu = R.pick([47, 100, 220, 470]), V = R.pick([6.0, 9.0, 12]), V2 = R.pick([3.0, 4.5]), Q = UF(Cu) * V, E = .5 * UF(Cu) * V * V;
  return { stem: `A ${Cu} μF capacitor is connected to a ${N(V, 2)} V battery and becomes fully charged.`,
    parts: [
      text('State what is meant by capacitance.', 1, 'The charge stored per unit potential difference across the capacitor ✓'),
      calc('Calculate the charge stored by the capacitor.', 2, Q, 'C', `${eq(`<i>Q</i> = <i>CV</i> = ${N(UF(Cu), 2)} × ${N(V, 2)}`)} ✓<br>${eq(`<i>Q</i> = ${A(Q)} C`)} ✓`, { guide: ['Award one mark if μF is not converted to F.'] }),
      calc('Calculate the energy stored by the capacitor.', 2, E, 'J', `${eq(`<i>E</i> = ½<i>CV</i><sup>2</sup> = ½ × ${N(UF(Cu), 2)} × ${N(V, 2)}<sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      calc(`Calculate the charge stored when the potential difference across the capacitor is ${N(V2, 2)} V.`, 1, UF(Cu) * V2, 'C', `${eq(`${N(UF(Cu), 2)} × ${N(V2, 2)} = ${A(UF(Cu) * V2)} C`)} ✓`),
      text('State the effect on the energy stored of doubling the potential difference across the capacitor.', 1, 'It is four times as great (energy is proportional to <i>V</i><sup>2</sup>) ✓')
    ] };
};
T.CP2 = R => {
  const Ar = R.pick([0.010, 0.020, 0.040]), d = R.pick([0.50, 1.0, 2.0]), [diel, er] = R.pick([['polythene', 2.3], ['mica', 6.0], ['paper', 3.5], ['waxed paper', 2.5]]), V = R.pick([50, 200]), Cc = EPS * er * Ar / (d / 1000);
  return { stem: `A parallel plate capacitor has plates of area ${N(Ar, 2)} m<sup>2</sup> separated by a sheet of ${diel} of thickness ${N(d, 2)} mm. The relative permittivity of ${diel} is ${er.toFixed(1)}.<br>${EPSD}`,
    parts: [
      calc('Calculate the capacitance of the capacitor.', 3, Cc, 'F', `${eq('<i>C</i> = <i>Aε</i><sub>0</sub><i>ε</i><sub>r</sub>/<i>d</i>')} ✓<br>${eq(`<i>C</i> = (${N(Ar, 2)} × 8.85 × 10<sup>−12</sup> × ${er.toFixed(1)}) / ${N(d / 1000, 2)}`)} ✓<br>${eq(`<i>C</i> = ${A(Cc)} F`)} ✓`, { guide: ['Award a maximum of two marks if mm is not converted to m.'] }),
      calc(`Calculate the charge stored when the potential difference across the capacitor is ${V} V.`, 2, Cc * V, 'C', `${eq(`<i>Q</i> = <i>CV</i> = ${A(Cc)} × ${V}`)} ✓<br>${eq(`<i>Q</i> = ${A(Cc * V)} C`)} ✓`),
      text('State the effect on the capacitance of halving the separation of the plates.', 1, 'It doubles ✓'),
      text('Explain, in terms of polar molecules, how the dielectric increases the capacitance.', 2, 'The polar molecules of the dielectric rotate to line up with the electric field between the plates ✓<br>Their own field opposes the applied field, which reduces the potential difference for a given charge (so more charge is stored for the same potential difference) ✓')
    ] };
};
T.CP3 = R => {
  const Cu = R.pick([20, 40, 50]), E8 = .5 * UF(Cu) * 64;
  const fig = graph({ x: [0, 10, 2], y: [0, 500, 100], div: 5, xl: 'potential difference / V', yl: 'charge / μC', curves: [{ f: x => Cu * x, from: 0, to: 10 }] });
  return { stem: `<b>Figure 1</b> shows how the charge stored by a capacitor varies with the potential difference across it.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the capacitance of the capacitor.', marks: 2, ans: UF(Cu), unit: 'F', show: N(UF(Cu), 2), tol: .05, ms: `Capacitance = gradient ${eq(`= (${Cu * 10} × 10<sup>−6</sup>) / 10`)} ✓<br>${eq(`<i>C</i> = ${N(UF(Cu), 2)} F`)} ✓`, guide: ['Award one mark if μC is not converted to C.'] },
      { q: 'Determine the energy stored by the capacitor when the potential difference across it is 8.0 V.', marks: 2, ans: E8, unit: 'J', show: A(E8), tol: .06, ms: `Energy = area under the graph ${eq(`= ½<i>QV</i> = ½ × ${N(UF(Cu) * 8, 2)} × 8.0`)} ✓<br>${eq(`= ${A(E8)} J`)} ✓` },
      text('Explain why the energy stored is ½<i>QV</i> and not <i>QV</i>.', 2, 'The potential difference across the capacitor rises from zero as charge is added ✓<br>so the average potential difference through which the charge is moved is ½<i>V</i> (the energy is the area under the graph) ✓'),
      calc('Calculate the energy stored when the potential difference is 4.0 V.', 1, E8 / 4, 'J', `Half the potential difference gives one quarter of the energy: ${eq(`${A(E8)} / 4 = ${A(E8 / 4)} J`)} ✓`, { tol: .06 })
    ] };
};
T.CP4 = R => {
  const Cu = R.pick([100, 220, 470]), V = R.pick([300, 330]), tms = R.pick([1.0, 2.0]), E = .5 * UF(Cu) * V * V, Q = UF(Cu) * V;
  return { stem: `The flash unit of a camera contains a ${Cu} μF capacitor, which is charged to ${V} V. When the flash is fired, the capacitor discharges completely through the flash tube in ${N(tms, 2)} ms.`,
    parts: [
      calc('Calculate the energy stored by the capacitor.', 2, E, 'J', `${eq(`<i>E</i> = ½<i>CV</i><sup>2</sup> = ½ × ${N(UF(Cu), 2)} × ${V}<sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      calc('Calculate the mean power delivered to the flash tube.', 2, E / (tms / 1000), 'W', `${eq(`<i>P</i> = <i>E</i>/<i>t</i> = ${A(E)} / ${N(tms / 1000, 2)}`)} ✓<br>${eq(`<i>P</i> = ${A(E / (tms / 1000))} W`)} ✓`),
      calc('Calculate the charge stored by the capacitor before the flash is fired.', 1, Q, 'C', `${eq(`<i>Q</i> = <i>CV</i> = ${N(UF(Cu), 2)} × ${V} = ${A(Q)} C`)} ✓`),
      calc('Calculate the mean current in the flash tube during the discharge.', 1, Q / (tms / 1000), 'A', `${eq(`<i>I</i> = <i>Q</i>/<i>t</i> = ${A(Q)} / ${N(tms / 1000, 2)} = ${A(Q / (tms / 1000))} A`)} ✓`),
      text('Explain why a capacitor is used to operate the flash tube, instead of connecting the tube directly to the battery of the camera.', 1, 'The capacitor can release its stored energy in a very short time, giving a much greater power (and potential difference) than the battery can supply ✓')
    ] };
};
T.CP5 = R => {
  const Cp = R.pick([200, 500, 800]), V = R.pick([12, 24, 50]), er = R.pick([2.0, 3.0, 4.0]), C0 = Cp * 1e-12, Q0 = C0 * V, E0 = .5 * C0 * V * V;
  return { stem: `An air-filled parallel plate capacitor has a capacitance of ${Cp} pF. It is connected to a ${V} V supply. A sheet of dielectric of relative permittivity ${er.toFixed(1)} is then pushed between the plates so that it fills the gap completely.`,
    parts: [
      calc('Calculate the charge stored by the capacitor before the dielectric is inserted.', 1, Q0, 'C', `${eq(`<i>Q</i> = <i>CV</i> = ${N(C0, 2)} × ${V} = ${A(Q0)} C`)} ✓`),
      calc('Calculate the capacitance with the dielectric in place.', 1, er * C0, 'F', `${eq(`${er.toFixed(1)} × ${N(C0, 2)} = ${A(er * C0)} F`)} ✓`),
      calc('The capacitor stays connected to the supply while the dielectric is inserted.<br>Calculate the charge now stored.', 1, er * Q0, 'C', `The potential difference is unchanged: ${eq(`<i>Q</i> = ${A(er * C0)} × ${V} = ${A(er * Q0)} C`)} ✓`),
      calc('Calculate the increase in the energy stored by the capacitor.', 2, (er - 1) * E0, 'J', `Before: ${eq(`½ × ${N(C0, 2)} × ${V}<sup>2</sup> = ${N(E0)} J`)}; after: ${eq(`½ × ${A(er * C0)} × ${V}<sup>2</sup> = ${N(er * E0)} J`)} ✓<br>Increase ${eq(`= ${A((er - 1) * E0)} J`)} ✓`),
      text('The experiment is repeated, but this time the capacitor is disconnected from the supply before the dielectric is inserted.<br>State and explain what happens to the potential difference across the capacitor.', 2, `It decreases (to ${A(V / er)} V) ✓<br>The charge cannot change, and the capacitance increases, so <i>V</i> = <i>Q</i>/<i>C</i> decreases ✓`)
    ] };
};
T.CP6 = R => {
  const E = R.pick([150, 200, 360]), Vk = R.pick([2.5, 3.0, 5.0]), tms = R.pick([4.0, 5.0, 10]), Cc = 2 * E / Math.pow(Vk * 1e3, 2), Q = Cc * Vk * 1e3;
  return { stem: `A defibrillator delivers a controlled electric shock to a patient by discharging a capacitor through the chest. The capacitor stores ${E} J of energy when it is charged to ${N(Vk, 2)} kV.`,
    parts: [
      text('State what is meant by a capacitance of one farad.', 1, 'One coulomb of charge is stored for each volt of potential difference across the capacitor ✓'),
      calc('Calculate the capacitance of the capacitor.', 2, Cc, 'F', `${eq(`<i>E</i> = ½<i>CV</i><sup>2</sup>, so <i>C</i> = 2<i>E</i>/<i>V</i><sup>2</sup> = (2 × ${E}) / (${N(Vk * 1e3, 2)})<sup>2</sup>`)} ✓<br>${eq(`<i>C</i> = ${A(Cc)} F`)} ✓`),
      calc('Calculate the charge stored by the capacitor.', 1, Q, 'C', `${eq(`<i>Q</i> = <i>CV</i> = ${A(Cc)} × ${N(Vk * 1e3, 2)} = ${A(Q)} C`)} ✓`),
      calc(`The capacitor discharges almost completely in ${N(tms, 2)} ms.<br>Calculate the mean current during the discharge.`, 2, Q / (tms / 1000), 'A', `${eq(`<i>I</i> = <i>Q</i>/<i>t</i> = ${A(Q)} / ${N(tms / 1000, 2)}`)} ✓<br>${eq(`<i>I</i> = ${A(Q / (tms / 1000))} A`)} ✓`),
      text('Suggest why the energy delivered to the patient is less than the energy stored by the capacitor.', 1, 'Some energy is dissipated in the resistance of the leads and electrodes (and the capacitor does not discharge completely) ✓')
    ] };
};
/* --- capacitor charge and discharge --- */
T.CD1 = R => {
  const Rk = R.pick([10, 22, 47, 100]), Cu = R.pick([100, 220, 470]), V0 = R.pick([6.0, 9.0, 12]), tau = Rk * 1e3 * UF(Cu), t = r2(tau * R.pick([.5, .8, 1.5])), Vt = V0 * Math.exp(-t / tau);
  return { stem: `A ${Cu} μF capacitor is charged to ${N(V0, 2)} V and then discharged through a ${Rk} kΩ resistor.`,
    parts: [
      calc('Calculate the time constant of the circuit.', 2, tau, 's', `${eq(`<i>RC</i> = ${N(Rk * 1e3, 2)} × ${N(UF(Cu), 2)}`)} ✓<br>${eq(`= ${A(tau)} s`)} ✓`),
      calc('Calculate the initial current in the resistor.', 1, V0 / (Rk * 1e3), 'A', `${eq(`<i>I</i> = <i>V</i>/<i>R</i> = ${N(V0, 2)} / ${N(Rk * 1e3, 2)} = ${A(V0 / (Rk * 1e3))} A`)} ✓`),
      calc(`Calculate the potential difference across the capacitor ${N(t, 2)} s after the discharge starts.`, 2, Vt, 'V', `${eq(`<i>V</i> = <i>V</i><sub>0</sub>e<sup>−<i>t</i>/<i>RC</i></sup> = ${N(V0, 2)} × e<sup>−${N(t, 2)}/${A(tau)}</sup>`)} ✓<br>${eq(`<i>V</i> = ${A(Vt)} V`)} ✓`),
      calc('Calculate the time taken for the potential difference to fall to half its initial value.', 2, tau * Math.LN2, 's', `${eq('<i>T</i><sub>½</sub> = <i>RC</i> ln 2 = 0.69<i>RC</i>')} ✓<br>${eq(`= 0.693 × ${A(tau)} = ${A(tau * Math.LN2)} s`)} ✓`)
    ] };
};
T.CD2 = R => {
  const Th = R.pick([10, 20, 40]), V0 = R.pick([12, 10, 8]), Rk = R.pick([47, 100, 220]), tau = Th / Math.LN2, Cc = tau / (Rk * 1e3);
  const fig = graph({ x: [0, 5 * Th, Th], y: [0, V0, 2], div: 5, xl: 'time / s', yl: 'potential difference / V', curves: [{ f: x => V0 * Math.pow(.5, x / Th), from: 0, to: 5 * Th }] });
  return { stem: `A capacitor is discharged through a ${Rk} kΩ resistor. <b>Figure 1</b> shows how the potential difference across the capacitor varies with time.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the time taken for the potential difference to fall to half its initial value.', marks: 1, ans: Th, unit: 's', show: String(Th), tol: .08, ms: `${Th} s (from ${V0} V to ${V0 / 2} V) ✓`, guide: [`Reading from the graph: allow ${N(Th * .92, 2)} to ${N(Th * 1.08, 2)} s.`] },
      text('Use data from <b>Figure 1</b> to show that the discharge is exponential.', 2, `Reads a second halving, for example from ${V0 / 2} V to ${V0 / 4} V, which also takes ${Th} s ✓<br>The potential difference falls by the same fraction in equal time intervals, so the decay is exponential ✓`),
      calc('Calculate the time constant of the circuit.', 2, tau, 's', `${eq('<i>T</i><sub>½</sub> = 0.69<i>RC</i>, so <i>RC</i> = <i>T</i><sub>½</sub> / ln 2')} ✓<br>${eq(`<i>RC</i> = ${Th} / 0.693 = ${A(tau)} s`)} ✓`, { tol: .08, guide: ['Accept a value read from the graph as the time for the potential difference to fall to 37% of its initial value.'] }),
      calc('Calculate the capacitance of the capacitor.', 2, Cc, 'F', `${eq(`<i>C</i> = ${A(tau)} / ${N(Rk * 1e3, 2)}`)} ✓<br>${eq(`<i>C</i> = ${A(Cc)} F`)} ✓`, { tol: .08 }),
      calc('Calculate the initial discharge current.', 1, V0 / (Rk * 1e3), 'A', `${eq(`<i>I</i> = <i>V</i>/<i>R</i> = ${V0} / ${N(Rk * 1e3, 2)} = ${A(V0 / (Rk * 1e3))} A`)} ✓`)
    ] };
};
T.CD3 = R => {
  const V = R.pick([6.0, 9.0, 12]), Rk = R.pick([10, 22, 47]), Cu = R.pick([220, 470, 1000]), tau = Rk * 1e3 * UF(Cu), Q0 = UF(Cu) * V;
  return { stem: `An uncharged ${Cu} μF capacitor is connected in series with a ${Rk} kΩ resistor, a switch and a ${N(V, 2)} V battery of negligible internal resistance. The switch is closed at time <i>t</i> = 0.`,
    parts: [
      calc('Calculate the time constant of the circuit.', 1, tau, 's', `${eq(`<i>RC</i> = ${N(Rk * 1e3, 2)} × ${N(UF(Cu), 2)} = ${A(tau)} s`)} ✓`),
      calc('Calculate the charge stored by the capacitor when it is fully charged.', 1, Q0, 'C', `${eq(`<i>Q</i><sub>0</sub> = <i>CV</i> = ${N(UF(Cu), 2)} × ${N(V, 2)} = ${A(Q0)} C`)} ✓`),
      calc(`Calculate the charge stored at <i>t</i> = ${A(tau)} s.`, 2, Q0 * (1 - Math.exp(-1)), 'C', `${eq('<i>Q</i> = <i>Q</i><sub>0</sub>(1 − e<sup>−<i>t</i>/<i>RC</i></sup>) = <i>Q</i><sub>0</sub>(1 − e<sup>−1</sup>)')} ✓<br>${eq(`<i>Q</i> = ${A(Q0)} × 0.632 = ${A(Q0 * (1 - Math.exp(-1)))} C`)} ✓`),
      calc('Calculate the time taken for the capacitor to reach 90% of its full charge.', 2, tau * Math.log(10), 's', `${eq('0.90 = 1 − e<sup>−<i>t</i>/<i>RC</i></sup>, so e<sup>−<i>t</i>/<i>RC</i></sup> = 0.10 and <i>t</i> = <i>RC</i> ln 10')} ✓<br>${eq(`<i>t</i> = ${A(tau)} × 2.30 = ${A(tau * Math.log(10))} s`)} ✓`),
      text('Describe how the current in the circuit varies with time after the switch is closed.', 2, `It has its maximum value (${A(V / (Rk * 1e3))} A) at the instant the switch is closed ✓<br>It then decreases exponentially to zero as the capacitor charges ✓`)
    ] };
};
T.CD4 = R => {
  const tau = R.pick([50, 80, 100]), y0 = R.pick([2.0, 2.5]), Rk = R.pick([100, 220, 470]), Cc = tau / (Rk * 1e3);
  const fig = graph({ x: [0, 100, 20], y: [0, 3, 0.5], div: 5, xl: 'time / s', yl: 'ln (potential difference / V)', curves: [{ f: x => y0 - x / tau, from: 0, to: 100 }] });
  return { stem: `A capacitor is discharged through a ${Rk} kΩ resistor. A student records the potential difference <i>V</i> across the capacitor at different times <i>t</i>. <b>Figure 1</b> shows a graph of ln <i>V</i> against <i>t</i>.`, figs: [fig],
    parts: [
      text('Explain why the graph is a straight line with a negative gradient.', 2, `${eq('<i>V</i> = <i>V</i><sub>0</sub>e<sup>−<i>t</i>/<i>RC</i></sup>, so ln <i>V</i> = ln <i>V</i><sub>0</sub> − <i>t</i>/<i>RC</i>')} ✓<br>This has the form <i>y</i> = <i>mx</i> + <i>c</i>, with gradient −1/<i>RC</i> ✓`),
      { q: 'Determine the gradient of the graph.', marks: 2, ans: -1 / tau, unit: 's<sup>−1</sup>', show: A(-1 / tau), tol: .08, ms: `Uses a triangle that covers at least half of the line: ${eq(`(${N(y0 - 100 / tau, 3)} − ${y0.toFixed(2)}) / (100 − 0)`)} ✓<br>${eq(`gradient = ${A(-1 / tau)} s<sup>−1</sup>`)} ✓` },
      calc('Calculate the time constant of the circuit.', 1, tau, 's', `${eq(`<i>RC</i> = −1 / gradient = 1 / ${A(1 / tau)} = ${A(tau)} s`)} ✓`, { tol: .08 }),
      calc('Calculate the capacitance of the capacitor.', 2, Cc, 'F', `${eq(`<i>C</i> = ${A(tau)} / ${N(Rk * 1e3, 2)}`)} ✓<br>${eq(`<i>C</i> = ${A(Cc)} F`)} ✓`, { tol: .08 }),
      text('State how the initial potential difference across the capacitor could be found from the graph.', 1, 'The intercept on the ln <i>V</i> axis is ln <i>V</i><sub>0</sub>, so <i>V</i><sub>0</sub> = e<sup>intercept</sup> ✓')
    ] };
};
T.CD5 = R => {
  const n = R.pick([2, 3, 5]), fr = Math.exp(-n);
  return { stem: `A student investigates the discharge of a capacitor through a fixed resistor.`,
    parts: [
      text('Describe how the student could obtain data to plot a graph of potential difference against time for the discharge.', 2, 'Connect a voltmeter (or a data logger) across the capacitor, charge the capacitor and then let it discharge through the resistor ✓<br>Record the potential difference at regular time intervals, using a stopwatch (or the data logger) ✓'),
      text('Describe how the charge on the capacitor, the potential difference across it and the current in the resistor each vary with time during the discharge.', 2, 'All three decrease exponentially with time ✓<br>with the same time constant (they all fall to 37% of their initial values in a time <i>RC</i>) ✓'),
      text('The experiment is repeated with a resistor of greater resistance and the same initial potential difference.<br>State two differences in the discharge.', 2, 'The discharge takes longer (the time constant is greater) ✓<br>The initial current is smaller ✓'),
      calc(`Calculate the fraction of the initial charge that remains on a capacitor after a time equal to ${n} time constants.`, 1, fr, '', `${eq(`e<sup>−${n}</sup> = ${A(fr)}`)} ✓`)
    ] };
};
T.CD6 = R => {
  const V0 = R.pick([9.0, 12]), Vt = V0 === 12 ? R.pick([6.0, 8.0, 9.0]) : R.pick([4.5, 6.0]), Rk = R.pick([100, 220, 470]), Cu = R.pick([47, 100, 220]), tau = Rk * 1e3 * UF(Cu), t = -tau * Math.log(1 - Vt / V0), E = .5 * UF(Cu) * Vt * Vt;
  return { stem: `In a timing circuit, an uncharged ${Cu} μF capacitor is charged through a ${Rk} kΩ resistor from a ${N(V0, 2)} V supply. An alarm sounds when the potential difference across the capacitor reaches ${N(Vt, 2)} V.`,
    parts: [
      calc('Calculate the time constant of the circuit.', 1, tau, 's', `${eq(`<i>RC</i> = ${N(Rk * 1e3, 2)} × ${N(UF(Cu), 2)} = ${A(tau)} s`)} ✓`),
      calc('Calculate the time between the start of charging and the alarm sounding.', 3, t, 's', `${eq(`<i>V</i> = <i>V</i><sub>0</sub>(1 − e<sup>−<i>t</i>/<i>RC</i></sup>), so e<sup>−<i>t</i>/<i>RC</i></sup> = 1 − ${N(Vt, 2)}/${N(V0, 2)} = ${N(1 - Vt / V0, 3)}`)} ✓<br>${eq(`<i>t</i> = −${A(tau)} × ln ${N(1 - Vt / V0, 3)}`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      calc('Calculate the energy stored by the capacitor when the alarm sounds.', 2, E, 'J', `${eq(`<i>E</i> = ½<i>CV</i><sup>2</sup> = ½ × ${N(UF(Cu), 2)} × ${N(Vt, 2)}<sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      text('State one change to the circuit that would increase the time before the alarm sounds.', 1, 'Use a resistor of greater resistance or a capacitor of greater capacitance (either increases the time constant) ✓')
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
