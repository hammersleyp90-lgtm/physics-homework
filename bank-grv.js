/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_GRV = (function(){
const module = undefined;
'use strict';
/* Question types for AQA gravitational fields (3.7.2). */
const TOPICS = { GN: 'Newton’s law and gravitational field strength', GP: 'Gravitational potential', GO: 'Orbits of planets and satellites' };
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
/* ---------- gravitational fields (AQA 3.7.2) ---------- */
const GC = 6.67e-11, MEA = 5.97e24, REA = 6.37e6, MSUN = 1.99e30, NKG = 'N kg<sup>−1</sup>', JKG = 'J kg<sup>−1</sup>';
const GD = 'gravitational constant <i>G</i> = 6.67 × 10<sup>−11</sup> N m<sup>2</sup> kg<sup>−2</sup>', EDATA = `mass of the Earth = 5.97 × 10<sup>24</sup> kg<br>radius of the Earth = 6.37 × 10<sup>6</sup> m<br>${GD}`;
const PLANETS = [['Mars', 6.42e23, 3.39e6], ['the Moon', 7.35e22, 1.74e6], ['Venus', 4.87e24, 6.05e6], ['Jupiter', 1.90e27, 6.99e7], ['Mercury', 3.30e23, 2.44e6]];
const pdata = ([n, M, Rr]) => `mass of ${n} = ${N(M)} kg<br>radius of ${n} = ${N(Rr)} m<br>${GD}`;
/* --- Newton's law and field strength --- */
T.GN1 = R => {
  const m = R.pick([500, 1200, 2500]), h = R.pick([400, 800, 2000]), r = REA + h * 1e3, F = GC * MEA * m / (r * r);
  return { stem: `A satellite of mass ${m} kg orbits the Earth at a height of ${h} km above the surface.<br>${EDATA}`,
    parts: [
      text('State Newton’s law of gravitation.', 2, 'The gravitational force between two point masses is proportional to the product of their masses ✓<br>and inversely proportional to the square of their separation ✓'),
      calc('Calculate the distance of the satellite from the centre of the Earth.', 1, r, 'm', `${eq(`6.37 × 10<sup>6</sup> + ${N(h * 1e3, 2)} = ${A(r)} m`)} ✓`),
      calc('Calculate the gravitational force on the satellite.', 2, F, 'N', `${eq(`<i>F</i> = <i>GMm</i>/<i>r</i><sup>2</sup> = (6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup> × ${m}) / (${A(r)})<sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`, { guide: ['Award one mark if the height is used in place of the distance from the centre of the Earth.'] }),
      calc('Calculate the gravitational field strength at the position of the satellite.', 1, F / m, NKG, `${eq(`<i>g</i> = <i>F</i>/<i>m</i> = ${A(F)} / ${m} = ${A(F / m)} ${NKG}`)} ✓`),
      text('Explain why an astronaut in the satellite appears to be weightless although the gravitational field strength is not zero.', 1, 'The astronaut and the satellite have the same acceleration towards the Earth (both are in free fall), so there is no contact force between them ✓')
    ] };
};
T.GN2 = R => {
  const k = R.pick([1, 2, 3]), m = R.pick([70, 80, 90]), g0 = GC * MEA / (REA * REA), gh = g0 / ((k + 1) * (k + 1));
  return { stem: `The gravitational field of the Earth is radial.<br>${EDATA}`,
    parts: [
      text('State what is meant by gravitational field strength.', 1, 'The force per unit mass on a small mass placed at that point ✓'),
      calc('Calculate the gravitational field strength at the surface of the Earth.', 2, g0, NKG, `${eq(`<i>g</i> = <i>GM</i>/<i>r</i><sup>2</sup> = (6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup>) / (6.37 × 10<sup>6</sup>)<sup>2</sup>`)} ✓<br>${eq(`<i>g</i> = ${A(g0)} ${NKG}`)} ✓`),
      calc(`Calculate the gravitational field strength at a height above the surface equal to ${k === 1 ? 'the radius' : k === 2 ? 'twice the radius' : 'three times the radius'} of the Earth.`, 2, gh, NKG, `The distance from the centre is ${k + 1} times the radius, so <i>g</i> is reduced by a factor of ${eq(`${k + 1}<sup>2</sup> = ${(k + 1) * (k + 1)}`)} ✓<br>${eq(`<i>g</i> = ${A(g0)} / ${(k + 1) * (k + 1)} = ${A(gh)} ${NKG}`)} ✓`),
      calc(`Calculate the weight of an astronaut of mass ${m} kg at this height.`, 1, m * gh, 'N', `${eq(`${m} × ${A(gh)} = ${A(m * gh)} N`)} ✓`),
      text('Describe how the gravitational field strength varies with distance from the centre of the Earth, for points above the surface.', 1, 'It is inversely proportional to the square of the distance from the centre ✓')
    ] };
};
T.GN3 = R => {
  const P = R.pick(PLANETS), [n, M, Rr] = P, m = R.pick([180, 900, 1025]), g = GC * M / (Rr * Rr), rho = M / (4 / 3 * PI * Rr * Rr * Rr);
  return { stem: `A space probe of mass ${m} kg lands on the surface of ${n}.<br>${pdata(P)}`,
    parts: [
      calc(`Calculate the gravitational field strength at the surface of ${n}.`, 2, g, NKG, `${eq(`<i>g</i> = <i>GM</i>/<i>r</i><sup>2</sup> = (6.67 × 10<sup>−11</sup> × ${N(M)}) / (${N(Rr)})<sup>2</sup>`)} ✓<br>${eq(`<i>g</i> = ${A(g)} ${NKG}`)} ✓`),
      calc(`Calculate the weight of the probe on ${n}.`, 1, m * g, 'N', `${eq(`${m} × ${A(g)} = ${A(m * g)} N`)} ✓`),
      calc(`Calculate the ratio weight of the probe on ${n} ÷ weight of the probe on the Earth.`, 1, g / 9.81, '', `${eq(`${A(g)} / 9.81 = ${A(g / 9.81)}`)} ✓`),
      calc(`Calculate the mean density of ${n}.`, 2, rho, 'kg m<sup>−3</sup>', `${eq(`<i>V</i> = (4/3)π<i>r</i><sup>3</sup> = (4/3)π × (${N(Rr)})<sup>3</sup> = ${N(4 / 3 * PI * Rr * Rr * Rr)} m<sup>3</sup>`)} ✓<br>${eq(`<i>ρ</i> = ${N(M)} / ${N(4 / 3 * PI * Rr * Rr * Rr)} = ${A(rho)} kg m<sup>−3</sup>`)} ✓`),
      text('Two planets have the same mean density but different radii.<br>State and explain which has the greater surface gravitational field strength.', 1, 'The larger planet: <i>g</i> = <i>GM</i>/<i>r</i><sup>2</sup> and <i>M</i> is proportional to <i>r</i><sup>3</sup>, so <i>g</i> is proportional to <i>r</i> ✓')
    ] };
};
T.GN4 = R => {
  const [a, Ma, b, Mb, D] = R.pick([['the Earth', 5.97e24, 'the Moon', 7.35e22, 3.84e8], ['planet P', 4.0e24, 'moon Q', 1.0e23, 4.0e8], ['planet P', 8.1e24, 'moon Q', 9.0e22, 3.0e8]]), x = D / (1 + Math.sqrt(Mb / Ma)), g = GC * Ma / (x * x);
  return { stem: `There is a point on the line between the centre of ${a} and the centre of ${b} at which the resultant gravitational field strength due to the two bodies is zero.<br>mass of ${a} = ${N(Ma)} kg<br>mass of ${b} = ${N(Mb)} kg<br>distance between their centres = ${N(D)} m<br>${GD}`,
    parts: [
      text(`Explain why this point is closer to ${b} than to ${a}.`, 1, `${cap(b)} has the smaller mass, so the point must be closer to it for its field strength to equal that of ${a} ✓`),
      calc(`Calculate the distance of this point from the centre of ${a}.`, 3, x, 'm', `The field strengths are equal: ${eq(`<i>GM</i><sub>1</sub>/<i>x</i><sup>2</sup> = <i>GM</i><sub>2</sub>/(<i>D</i> − <i>x</i>)<sup>2</sup>`)} ✓<br>${eq(`(<i>D</i> − <i>x</i>)/<i>x</i> = √(${N(Mb)} / ${N(Ma)}) = ${N(Math.sqrt(Mb / Ma))}`)} ✓<br>${eq(`<i>x</i> = ${N(D)} / (1 + ${N(Math.sqrt(Mb / Ma))}) = ${A(x)} m`)} ✓`),
      calc(`Calculate the gravitational field strength at this point due to ${a} alone.`, 2, g, NKG, `${eq(`<i>g</i> = (6.67 × 10<sup>−11</sup> × ${N(Ma)}) / (${A(x)})<sup>2</sup>`)} ✓<br>${eq(`<i>g</i> = ${A(g)} ${NKG}`)} ✓`),
      text('State whether the gravitational potential is zero at this point. Explain your answer.', 1, 'No: potential is a scalar and both contributions are negative, so they add and do not cancel ✓')
    ] };
};
T.GN5 = R => {
  const GM = R.pick([4.0e14, 3.2e14, 2.0e14]), r0 = Math.sqrt(GM / 10) / 1e6, g = r => GM / (r * r * 1e12);
  const fig = graph({ x: [0, 40, 10], y: [0, 10, 2], div: 5, xl: `distance from the centre of the planet / 10${sup(6)} m`, yl: `gravitational field strength / N kg${sup(-1)}`, curves: [{ f: g, from: r0, to: 40 }] });
  return { stem: `<b>Figure 1</b> shows how the gravitational field strength of a planet varies with distance from its centre, for points above its surface.<br>${GD}`, figs: [fig],
    parts: [
      { q: `Use <b>Figure 1</b> to determine the gravitational field strength at a distance of 10 × 10<sup>6</sup> m from the centre.`, marks: 1, ans: g(10), unit: NKG, show: A(g(10)), tol: .07, ms: `${eq(`${A(g(10))} ${NKG}`)} ✓`, guide: [`Reading from the graph: allow ± 0.2 ${NKG}.`] },
      text('Use data from <b>Figure 1</b> to show that the field strength follows an inverse-square law.', 3, `Reads a second value, for example ${A(g(20))} ${NKG} at 20 × 10<sup>6</sup> m ✓<br>Doubling the distance reduces the field strength to one quarter: ${eq(`${A(g(10))} / 4 = ${A(g(20))}`)} ✓<br>(or shows that <i>gr</i><sup>2</sup> is constant) so <i>g</i> is proportional to 1/<i>r</i><sup>2</sup> ✓`),
      calc('Calculate the mass of the planet.', 2, GM / GC, 'kg', `${eq(`<i>M</i> = <i>gr</i><sup>2</sup>/<i>G</i> = (${A(g(10))} × (1.0 × 10<sup>7</sup>)<sup>2</sup>) / 6.67 × 10<sup>−11</sup>`)} ✓<br>${eq(`<i>M</i> = ${A(GM / GC)} kg`)} ✓`, { tol: .08 }),
      calc(`Predict the gravitational field strength 80 × 10<sup>6</sup> m from the centre of the planet.`, 1, g(80), NKG, `${eq(`${A(g(40))} / 4 = ${A(g(80))} ${NKG}`)} (one quarter of the value at 40 × 10<sup>6</sup> m) ✓`, { tol: .1 })
    ] };
};
T.GN6 = R => {
  const m1 = R.pick([5.0, 10, 20]), m2 = R.pick([0.50, 1.0]), r = R.pick([0.10, 0.15, 0.20]), F = GC * m1 * m2 / (r * r), W = m2 * 9.81;
  return { stem: `In a laboratory experiment, a lead sphere of mass ${N(m1, 2)} kg is placed so that its centre is ${N(r, 2)} m from the centre of a second lead sphere of mass ${N(m2, 2)} kg.<br>${GD}`,
    parts: [
      calc('Calculate the gravitational force between the spheres.', 2, F, 'N', `${eq(`<i>F</i> = <i>Gm</i><sub>1</sub><i>m</i><sub>2</sub>/<i>r</i><sup>2</sup> = (6.67 × 10<sup>−11</sup> × ${N(m1, 2)} × ${N(m2, 2)}) / ${N(r, 2)}<sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = ${A(F)} N`)} ✓`),
      calc('Calculate the weight of the smaller sphere.', 1, W, 'N', `${eq(`${N(m2, 2)} × 9.81 = ${A(W)} N`)} ✓`),
      calc('Calculate the ratio force between the spheres ÷ weight of the smaller sphere.', 1, F / W, '', `${eq(`${A(F)} / ${A(W)} = ${A(F / W)}`)} ✓`, { tol: .02 }),
      text('Explain why the gravitational attraction between everyday objects is not noticed.', 1, 'The force is extremely small compared with the other forces acting, such as weight and friction ✓'),
      text('Explain why the distance used in the calculation is measured between the centres of the spheres.', 1, 'A uniform sphere behaves as if all its mass were concentrated at its centre ✓'),
      calc('Calculate the acceleration of the smaller sphere that this force alone would produce.', 1, F / m2, MS2, `${eq(`<i>a</i> = <i>F</i>/<i>m</i> = ${A(F)} / ${N(m2, 2)} = ${A(F / m2)} ${MS2}`)} ✓`)
    ] };
};
/* --- gravitational potential --- */
T.GP1 = R => {
  const P = R.pick(PLANETS), [n, M, Rr] = P, m = R.pick([1.0, 250, 1500]), V = -GC * M / Rr;
  return { stem: `This question is about the gravitational potential at the surface of ${n}.<br>${pdata(P)}`,
    parts: [
      text('State what is meant by the gravitational potential at a point.', 2, 'The work done per unit mass ✓<br>in moving a small mass from infinity to that point ✓'),
      calc(`Calculate the gravitational potential at the surface of ${n}.`, 2, V, JKG, `${eq(`<i>V</i> = −<i>GM</i>/<i>r</i> = −(6.67 × 10<sup>−11</sup> × ${N(M)}) / ${N(Rr)}`)} ✓<br>${eq(`<i>V</i> = ${A(V)} ${JKG}`)} ✓`),
      text('Explain why gravitational potential is always negative.', 1, 'The potential is zero at infinity, and gravity is attractive, so work must be done on a mass to move it away to infinity (energy is released as it moves in) ✓'),
      calc(`Calculate the minimum energy needed to move a mass of ${m === 1 ? '1.0' : m} kg from the surface of ${n} to infinity.`, 2, -V * m, 'J', `${eq(`<i>W</i> = <i>m</i>Δ<i>V</i> = ${m === 1 ? '1.0' : m} × (0 − (${A(V)}))`)} ✓<br>${eq(`<i>W</i> = ${A(-V * m)} J`)} ✓`)
    ] };
};
T.GP2 = R => {
  const m = R.pick([800, 1500, 2000]), r1 = R.pick([7.0e6, 8.0e6]), r2 = R.pick([1.2e7, 2.0e7, 4.2e7]), V1 = -GC * MEA / r1, V2 = -GC * MEA / r2, dV = V2 - V1;
  return { stem: `A satellite of mass ${m} kg is moved from a circular orbit of radius ${N(r1, 2)} m to a circular orbit of radius ${N(r2, 2)} m around the Earth.<br>mass of the Earth = 5.97 × 10<sup>24</sup> kg<br>${GD}`,
    parts: [
      calc('Calculate the gravitational potential at the lower orbit.', 2, V1, JKG, `${eq(`<i>V</i> = −<i>GM</i>/<i>r</i> = −(6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup>) / ${N(r1, 2)}`)} ✓<br>${eq(`<i>V</i> = ${A(V1)} ${JKG}`)} ✓`),
      calc('Calculate the gravitational potential at the higher orbit.', 1, V2, JKG, `${eq(`−(6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup>) / ${N(r2, 2)} = ${A(V2)} ${JKG}`)} ✓`),
      calc('Calculate the change in gravitational potential.', 1, dV, JKG, `${eq(`(${A(V2)}) − (${A(V1)}) = ${A(dV)} ${JKG}`)} ✓`),
      calc('Calculate the change in the gravitational potential energy of the satellite.', 2, m * dV, 'J', `${eq(`Δ<i>E</i><sub>p</sub> = <i>m</i>Δ<i>V</i> = ${m} × ${A(dV)}`)} ✓<br>${eq(`Δ<i>E</i><sub>p</sub> = ${A(m * dV)} J`)} ✓`),
      text('State whether the gravitational potential energy of the satellite increases or decreases. Explain your answer.', 1, 'It increases: work is done against the gravitational attraction of the Earth (the potential becomes less negative) ✓')
    ] };
};
T.GP3 = R => {
  const P = R.pick([['the Earth', MEA, REA], ...PLANETS]), [n, M, Rr] = P, v = Math.sqrt(2 * GC * M / Rr);
  return { stem: `The escape velocity of ${n} is the minimum speed with which an object must be projected from its surface to escape completely from its gravitational field.<br>${pdata(P)}`,
    parts: [
      text('Show that the escape velocity is given by <i>v</i> = √(2<i>GM</i>/<i>r</i>).', 2, `The initial kinetic energy must equal the gain in potential energy in moving to infinity: ${eq('½<i>mv</i><sup>2</sup> = <i>GMm</i>/<i>r</i>')} ✓<br>The mass <i>m</i> cancels, giving ${eq('<i>v</i> = √(2<i>GM</i>/<i>r</i>)')} ✓`),
      calc(`Calculate the escape velocity of ${n}.`, 2, v, MS1, `${eq(`<i>v</i> = √(2 × 6.67 × 10<sup>−11</sup> × ${N(M)} / ${N(Rr)})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text('Explain why the escape velocity does not depend on the mass of the object.', 1, 'Both the kinetic energy and the potential energy needed are proportional to the mass of the object, so it cancels ✓'),
      text('Explain why a rocket can leave the planet without ever reaching the escape velocity.', 1, 'Its engines keep doing work on it as it rises; the escape velocity applies only to an unpowered projectile ✓'),
      text('State what happens to the kinetic energy of an unpowered projectile as it moves away from the planet.', 1, 'It decreases, as it is transferred to gravitational potential energy ✓')
    ] };
};
T.GP4 = R => {
  const GM = GC * MEA, [ra, rb] = R.pick([[10, 20], [10, 40], [20, 40]]), m = R.pick([200, 500, 1000]), V = r => -GM / (r * 1e6) / 1e6, dV = V(rb) - V(ra), g = GM / (ra * ra * 1e12);
  const fig = graph({ x: [0, 40, 10], y: [-70, 0, 10], div: 5, xl: `distance from the centre of the Earth / 10${sup(6)} m`, yl: `gravitational potential / MJ kg${sup(-1)}`, curves: [{ f: V, from: 6.37, to: 40 }] });
  return { stem: `<b>Figure 1</b> shows how the gravitational potential of the Earth varies with distance from its centre, for points above the surface.`, figs: [fig],
    parts: [
      { q: `Use <b>Figure 1</b> to determine the gravitational potential ${ra} × 10<sup>6</sup> m from the centre of the Earth.`, marks: 1, ans: V(ra) * 1e6, unit: JKG, show: A(V(ra) * 1e6), tol: .06, ms: `${eq(`${N(V(ra), 3)} MJ kg<sup>−1</sup> = ${A(V(ra) * 1e6)} ${JKG}`)} ✓`, guide: ['Reading from the graph: allow ± 1 MJ kg<sup>−1</sup>.'] },
      { q: `Determine the change in gravitational potential between ${ra} × 10<sup>6</sup> m and ${rb} × 10<sup>6</sup> m from the centre.`, marks: 2, ans: dV * 1e6, unit: JKG, show: A(dV * 1e6), tol: .08, ms: `Potential at ${rb} × 10<sup>6</sup> m ${eq(`= ${N(V(rb), 3)} MJ kg<sup>−1</sup>`)} ✓<br>${eq(`Δ<i>V</i> = (${N(V(rb), 3)}) − (${N(V(ra), 3)}) = ${N(dV, 3)} MJ kg<sup>−1</sup> = ${A(dV * 1e6)} ${JKG}`)} ✓` },
      calc(`Calculate the energy needed to move a satellite of mass ${m} kg between these two distances.`, 2, m * dV * 1e6, 'J', `${eq(`<i>W</i> = <i>m</i>Δ<i>V</i> = ${m} × ${A(dV * 1e6)}`)} ✓<br>${eq(`<i>W</i> = ${A(m * dV * 1e6)} J`)} ✓`, { tol: .08, guide: ['This is the change in potential energy only; the change in kinetic energy between two orbits is not included.'] }),
      text('State what is represented by the gradient of the graph.', 1, 'The gravitational field strength (<i>g</i> = −Δ<i>V</i>/Δ<i>r</i>; the magnitude of the gradient equals <i>g</i>) ✓'),
      calc(`Calculate the gravitational field strength ${ra} × 10<sup>6</sup> m from the centre of the Earth.`, 2, g, NKG, `For a radial field ${eq('<i>g</i> = <i>GM</i>/<i>r</i><sup>2</sup> = |<i>V</i>|/<i>r</i>')}: ${eq(`${A(-V(ra) * 1e6)} / ${N(ra * 1e6, 2)}`)} ✓<br>${eq(`<i>g</i> = ${A(g)} ${NKG}`)} ✓`, { tol: .08, guide: ['Accept a value from the gradient of a tangent drawn at this point.'] })
    ] };
};
T.GP5 = R => {
  const h = R.pick([20, 50, 120]), m = R.pick([5.0, 40, 75]), dV = 9.81 * h;
  return { stem: `Close to the surface of the Earth the gravitational field is almost uniform, with a field strength of 9.81 ${NKG}.`,
    parts: [
      calc(`Calculate the change in gravitational potential when an object is raised through ${h} m.`, 2, dV, JKG, `${eq(`Δ<i>V</i> = <i>g</i>Δ<i>h</i> = 9.81 × ${h}`)} ✓<br>${eq(`Δ<i>V</i> = ${A(dV)} ${JKG}`)} ✓`),
      calc(`Calculate the work done in raising a mass of ${N(m, 2)} kg through this height.`, 2, m * dV, 'J', `${eq(`<i>W</i> = <i>m</i>Δ<i>V</i> = ${N(m, 2)} × ${A(dV)}`)} ✓<br>${eq(`<i>W</i> = ${A(m * dV)} J`)} ✓`),
      text('Describe the equipotential surfaces close to the surface of the Earth.', 1, 'Horizontal surfaces (parallel to the ground), equally spaced for equal changes of potential ✓'),
      text('State the work done when a mass is moved along an equipotential surface.', 1, 'Zero ✓'),
      text('Explain why the equation Δ<i>V</i> = <i>g</i>Δ<i>h</i> cannot be used for a height of several thousand kilometres.', 1, 'The field strength is not constant over such a distance: it decreases with distance from the Earth ✓')
    ] };
};
T.GP6 = R => {
  const m = R.pick([400, 1000, 1800]), r = R.pick([7.0e6, 8.0e6, 1.0e7]), Ek = GC * MEA * m / (2 * r), Ep = -2 * Ek, v = Math.sqrt(GC * MEA / r);
  return { stem: `A satellite of mass ${m} kg is in a circular orbit of radius ${N(r, 2)} m around the Earth.<br>mass of the Earth = 5.97 × 10<sup>24</sup> kg<br>${GD}`,
    parts: [
      calc('Calculate the speed of the satellite.', 2, v, MS1, `${eq(`<i>GMm</i>/<i>r</i><sup>2</sup> = <i>mv</i><sup>2</sup>/<i>r</i>, so <i>v</i> = √(<i>GM</i>/<i>r</i>) = √(6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup> / ${N(r, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the kinetic energy of the satellite.', 1, Ek, 'J', `${eq(`½ × ${m} × (${A(v)})<sup>2</sup> = ${A(Ek)} J`)} ✓`),
      calc('Calculate the gravitational potential energy of the satellite.', 2, Ep, 'J', `${eq(`<i>E</i><sub>p</sub> = −<i>GMm</i>/<i>r</i> = −(6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup> × ${m}) / ${N(r, 2)}`)} ✓<br>${eq(`<i>E</i><sub>p</sub> = ${A(Ep)} J`)} ✓`),
      calc('Calculate the total energy of the satellite.', 1, Ek + Ep, 'J', `${eq(`${A(Ek)} + (${A(Ep)}) = ${A(Ek + Ep)} J`)} ✓`),
      text('The satellite moves to an orbit of smaller radius.<br>State what happens to its kinetic energy, its potential energy and its total energy.', 2, 'The kinetic energy increases and the potential energy decreases (becomes more negative) ✓<br>The total energy decreases ✓')
    ] };
};
/* --- orbits --- */
T.GO1 = R => {
  const h = R.pick([400, 600, 1000]), r = REA + h * 1e3, v = Math.sqrt(GC * MEA / r), Tp = 2 * PI * r / v;
  return { stem: `A satellite is in a circular orbit ${h} km above the surface of the Earth.<br>${EDATA}`,
    parts: [
      calc('Calculate the radius of the orbit.', 1, r, 'm', `${eq(`6.37 × 10<sup>6</sup> + ${N(h * 1e3, 2)} = ${A(r)} m`)} ✓`),
      calc('Calculate the speed of the satellite.', 3, v, MS1, `The gravitational force provides the centripetal force: ${eq('<i>GMm</i>/<i>r</i><sup>2</sup> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>v</i> = √(<i>GM</i>/<i>r</i>) = √(6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup> / ${A(r)})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the period of the orbit.', 2, Tp, 's', `${eq(`<i>T</i> = 2π<i>r</i>/<i>v</i> = (2π × ${A(r)}) / ${A(v)}`)} ✓<br>${eq(`<i>T</i> = ${A(Tp)} s`)} ✓`),
      calc('Calculate the number of orbits the satellite completes in one day.', 1, 86400 / Tp, '', `${eq(`86 400 / ${A(Tp)} = ${A(86400 / Tp)}`)} ✓`)
    ] };
};
T.GO2 = R => {
  const [n, M, Rr, Tp, tl] = R.pick([['the Earth', MEA, REA, 86400, '24 hours (8.64 × 10<sup>4</sup> s)'], ['Mars', 6.42e23, 3.39e6, 8.86e4, '8.86 × 10<sup>4</sup> s'], ['the Earth', MEA, REA, 86400, '24 hours (8.64 × 10<sup>4</sup> s)']]), r = Math.cbrt(GC * M * Tp * Tp / (4 * PI * PI));
  return { stem: `A synchronous satellite stays above the same point on the surface of a planet. For the Earth this is called a geostationary orbit. ${cap(n)} rotates once every ${tl}.<br>mass of ${n} = ${N(M)} kg<br>radius of ${n} = ${N(Rr)} m<br>${GD}`,
    parts: [
      text('State two features of the orbit of a synchronous satellite, other than its period.', 2, 'It is above the equator (in the equatorial plane) ✓<br>It moves in the same direction as the planet rotates ✓'),
      calc(`Calculate the radius of the synchronous orbit of ${n}.`, 3, r, 'm', `${eq('<i>GMm</i>/<i>r</i><sup>2</sup> = <i>m</i>(2π/<i>T</i>)<sup>2</sup><i>r</i>, so <i>r</i><sup>3</sup> = <i>GMT</i><sup>2</sup>/4π<sup>2</sup>')} ✓<br>${eq(`<i>r</i><sup>3</sup> = (6.67 × 10<sup>−11</sup> × ${N(M)} × (${N(Tp)})<sup>2</sup>) / 4π<sup>2</sup> = ${N(r * r * r)} m<sup>3</sup>`)} ✓<br>${eq(`<i>r</i> = ${A(r)} m`)} ✓`),
      calc('Calculate the height of the satellite above the surface.', 1, r - Rr, 'm', `${eq(`${A(r)} − ${N(Rr)} = ${A(r - Rr)} m`)} ✓`),
      text('State one use of geostationary satellites and explain why this orbit is suitable.', 1, 'Communications or television broadcasting: the satellite stays in a fixed position in the sky, so dishes on the ground do not need to track it ✓')
    ] };
};
const MOONS = [['Io', 4.22e8, 1.77], ['Europa', 6.71e8, 3.55], ['Ganymede', 1.07e9, 7.15], ['Callisto', 1.88e9, 16.7]];
T.GO3 = R => {
  const [n2_, r2] = R.pick(MOONS.slice(1)), T2 = 1.77 * Math.pow(r2 / 4.22e8, 1.5);
  return { stem: `Io and ${n2_} are two of the moons of Jupiter. Io has an orbital radius of 4.22 × 10<sup>8</sup> m and a period of 1.77 days. ${n2_} has an orbital radius of ${N(r2)} m.`,
    parts: [
      text('State Kepler’s third law.', 1, 'The square of the period of an orbit is proportional to the cube of its radius (<i>T</i><sup>2</sup> ∝ <i>r</i><sup>3</sup>) ✓'),
      text('Show that Kepler’s third law follows from Newton’s law of gravitation for a circular orbit.', 3, `The gravitational force provides the centripetal force: ${eq('<i>GMm</i>/<i>r</i><sup>2</sup> = <i>mω</i><sup>2</sup><i>r</i>')} ✓<br>${eq('<i>ω</i> = 2π/<i>T</i>')} ✓<br>${eq('<i>T</i><sup>2</sup> = 4π<sup>2</sup><i>r</i><sup>3</sup>/<i>GM</i>')}, and 4π<sup>2</sup>/<i>GM</i> is constant for all the moons of one planet ✓`),
      calc(`Calculate the period of ${n2_} in days.`, 3, T2, 'days', `${eq('(<i>T</i><sub>2</sub>/<i>T</i><sub>1</sub>)<sup>2</sup> = (<i>r</i><sub>2</sub>/<i>r</i><sub>1</sub>)<sup>3</sup>')} ✓<br>${eq(`<i>T</i><sub>2</sub> = 1.77 × (${N(r2)} / 4.22 × 10<sup>8</sup>)<sup>3/2</sup>`)} ✓<br>${eq(`<i>T</i><sub>2</sub> = ${A(T2)} days`)} ✓`)
    ] };
};
T.GO4 = R => {
  const [sat, body, r, Tp] = R.pick([['The Earth', 'the Sun', 1.50e11, 3.16e7], ['The Moon', 'the Earth', 3.84e8, 2.36e6], ['Io', 'Jupiter', 4.22e8, 1.53e5], ['Titan', 'Saturn', 1.22e9, 1.38e6]]), M = 4 * PI * PI * r * r * r / (GC * Tp * Tp), v = 2 * PI * r / Tp;
  return { stem: `${sat} orbits ${body} in an almost circular orbit of radius ${N(r)} m with a period of ${N(Tp)} s.<br>${GD}`,
    parts: [
      calc(`Calculate the orbital speed of ${sat === 'The Earth' ? 'the Earth' : sat === 'The Moon' ? 'the Moon' : sat}.`, 2, v, MS1, `${eq(`<i>v</i> = 2π<i>r</i>/<i>T</i> = (2π × ${N(r)}) / ${N(Tp)}`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the centripetal acceleration.', 1, v * v / r, MS2, `${eq(`<i>a</i> = <i>v</i><sup>2</sup>/<i>r</i> = (${A(v)})<sup>2</sup> / ${N(r)} = ${A(v * v / r)} ${MS2}`)} ✓`),
      calc(`Calculate the mass of ${body}.`, 3, M, 'kg', `${eq('<i>GMm</i>/<i>r</i><sup>2</sup> = <i>mv</i><sup>2</sup>/<i>r</i>, so <i>M</i> = <i>v</i><sup>2</sup><i>r</i>/<i>G</i>')} (or ${eq('<i>M</i> = 4π<sup>2</sup><i>r</i><sup>3</sup>/<i>GT</i><sup>2</sup>')}) ✓<br>${eq(`<i>M</i> = ((${A(v)})<sup>2</sup> × ${N(r)}) / 6.67 × 10<sup>−11</sup>`)} ✓<br>${eq(`<i>M</i> = ${A(M)} kg`)} ✓`),
      text('State why the mass of the orbiting body is not needed in this calculation.', 1, 'It appears on both sides of the equation (in the gravitational force and in the centripetal force) and cancels ✓')
    ] };
};
T.GO5 = R => {
  const h = R.pick([200, 300, 500]), r = REA + h * 1e3, Tp = 2 * PI * Math.sqrt(r * r * r / (GC * MEA));
  return { stem: `A satellite used to map the surface of the Earth is in a low polar orbit, ${h} km above the surface.<br>${EDATA}`,
    parts: [
      calc('Calculate the period of the satellite.', 3, Tp, 's', `${eq(`<i>r</i> = 6.37 × 10<sup>6</sup> + ${N(h * 1e3, 2)} = ${A(r)} m`)} ✓<br>${eq(`<i>T</i> = 2π√(<i>r</i><sup>3</sup>/<i>GM</i>) = 2π√((${A(r)})<sup>3</sup> / (6.67 × 10<sup>−11</sup> × 5.97 × 10<sup>24</sup>))`)} ✓<br>${eq(`<i>T</i> = ${A(Tp)} s`)} ✓`),
      calc('Calculate the number of orbits completed in 24 hours.', 1, 86400 / Tp, '', `${eq(`86 400 / ${A(Tp)} = ${A(86400 / Tp)}`)} ✓`),
      text('Explain why a polar orbit allows the satellite to map the whole surface of the Earth.', 2, 'The satellite passes over both poles while the Earth rotates beneath it ✓<br>so on each orbit it passes over a different strip of the surface, and eventually covers all of it ✓'),
      text('State one advantage of a low orbit, compared with a geostationary orbit, for a satellite that takes images of the surface.', 1, 'It is much closer to the surface, so the images show finer detail (higher resolution) ✓')
    ] };
};
T.GO6 = R => {
  const [n, GM, sc] = R.pick([['the Earth', GC * MEA, 21], ['Mars', GC * 6.42e23, 20], ['the Earth', GC * MEA, 21]]), grad = 4 * PI * PI / GM, gu = grad * Math.pow(10, sc) / 1e8, M = GM / GC;
  const fig = graph({ x: [0, 10, 2], y: [0, 10, 2], div: 5, xl: `(orbital radius)${sup(3)} / 10${sup(sc)} m${sup(3)}`, yl: `(period)${sup(2)} / 10${sup(8)} s${sup(2)}`, curves: [{ f: x => gu * x, from: 0, to: Math.min(10, 10 / gu) }] });
  return { stem: `<b>Figure 1</b> shows a graph of <i>T</i><sup>2</sup> against <i>r</i><sup>3</sup> for satellites in circular orbits around ${n}, where <i>T</i> is the period and <i>r</i> is the radius of the orbit.<br>${GD}`, figs: [fig],
    parts: [
      text('Explain why the graph is a straight line through the origin.', 2, `${eq('<i>T</i><sup>2</sup> = (4π<sup>2</sup>/<i>GM</i>)<i>r</i><sup>3</sup>')} ✓<br>so <i>T</i><sup>2</sup> is directly proportional to <i>r</i><sup>3</sup> (Kepler’s third law), with gradient 4π<sup>2</sup>/<i>GM</i> ✓`),
      { q: 'Determine the gradient of the graph in s<sup>2</sup> m<sup>−3</sup>.', marks: 2, ans: grad, unit: 's<sup>2</sup> m<sup>−3</sup>', show: A(grad), tol: .06, ms: `Uses a large triangle and includes the powers of ten from both axes, for example ${eq(`(${N(gu * 8, 3)} × 10<sup>8</sup>) / (8.0 × 10<sup>${sc}</sup>)`)} ✓<br>${eq(`gradient = ${A(grad)} s<sup>2</sup> m<sup>−3</sup>`)} ✓`, guide: ['Award one mark if the powers of ten are ignored.'] },
      calc(`Use the gradient to calculate the mass of ${n}.`, 3, M, 'kg', `${eq('gradient = 4π<sup>2</sup>/<i>GM</i>, so <i>M</i> = 4π<sup>2</sup> / (<i>G</i> × gradient)')} ✓<br>${eq(`<i>M</i> = 4π<sup>2</sup> / (6.67 × 10<sup>−11</sup> × ${A(grad)})`)} ✓<br>${eq(`<i>M</i> = ${A(M)} kg`)} ✓`, { tol: .07 })
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
