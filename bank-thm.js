/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_THM = (function(){
const module = undefined;
'use strict';
/* Question types for AQA thermal physics (3.6.2). */
const TOPICS = { TE: 'Thermal energy transfer', TG: 'Ideal gases', TK: 'Molecular kinetic theory' };
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
/* ---------- thermal physics (AQA 3.6.2) ---------- */
const KB = 1.38e-23, RG = 8.31, NAV = 6.02e23, CW = 4200, JKK = 'J kg<sup>−1</sup> K<sup>−1</sup>', JK = 'J kg<sup>−1</sup>';
const CWD = 'specific heat capacity of water = 4200 J kg<sup>−1</sup> K<sup>−1</sup>', GASD = 'molar gas constant <i>R</i> = 8.31 J mol<sup>−1</sup> K<sup>−1</sup>', KD = 'Boltzmann constant <i>k</i> = 1.38 × 10<sup>−23</sup> J K<sup>−1</sup>', NAD = 'Avogadro constant = 6.02 × 10<sup>23</sup> mol<sup>−1</sup>';
/* --- thermal energy transfer --- */
T.TE1 = R => {
  const [metal, c0] = R.pick([['aluminium', 900], ['copper', 385], ['iron', 450], ['brass', 380]]), P = R.pick([50, 60, 100]), t = R.pick([240, 300, 600]), dT = Number((P * t / (1.0 * c0 * 1.1)).toFixed(1)), E = P * t, c = E / dT;
  return { stem: `A ${P} W electrical heater is placed in a hole in a 1.00 kg block of ${metal}. The heater is switched on for ${t} s and the temperature of the block rises by ${dT.toFixed(1)} K.`,
    parts: [
      text('State what is meant by the specific heat capacity of a substance.', 1, 'The energy needed to raise the temperature of 1 kg of the substance by 1 K (without a change of state) ✓'),
      calc('Calculate the energy supplied by the heater.', 1, E, 'J', `${eq(`<i>E</i> = <i>Pt</i> = ${P} × ${t} = ${A(E)} J`)} ✓`),
      calc(`Calculate the value of the specific heat capacity of ${metal} given by these results.`, 2, c, JKK, `${eq(`<i>c</i> = <i>Q</i>/<i>m</i>Δ<i>θ</i> = ${A(E)} / (1.00 × ${dT.toFixed(1)})`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${JKK}`)} ✓`),
      text(`The accepted value is ${c0} ${JKK}.<br>Explain why the value from the experiment is higher than this.`, 2, 'Some of the energy supplied is transferred to the surroundings (and to the heater itself) rather than to the block ✓<br>so the temperature rise is smaller than it should be, and the calculated value of <i>c</i> is too large ✓'),
      text('State one way of improving the experiment.', 1, 'Insulate the block (lag it) to reduce energy transfer to the surroundings ✓')
    ] };
};
T.TE2 = R => {
  const m = R.pick([0.050, 0.12, 0.20]), Tf = R.pick([20, 30, 50]), Q1 = m * 3.34e5, Q2 = m * CW * Tf;
  return { stem: `A block of ice of mass ${N(m, 2)} kg at 0 °C is heated until it has all melted and the water produced has reached ${Tf} °C.<br>specific latent heat of fusion of ice = 3.34 × 10<sup>5</sup> J kg<sup>−1</sup><br>${CWD}`,
    parts: [
      calc('Calculate the energy needed to melt the ice.', 2, Q1, 'J', `${eq(`<i>Q</i> = <i>ml</i> = ${N(m, 2)} × 3.34 × 10<sup>5</sup>`)} ✓<br>${eq(`<i>Q</i> = ${A(Q1)} J`)} ✓`),
      calc(`Calculate the energy needed to raise the temperature of the water from 0 °C to ${Tf} °C.`, 2, Q2, 'J', `${eq(`<i>Q</i> = <i>mc</i>Δ<i>θ</i> = ${N(m, 2)} × 4200 × ${Tf}`)} ✓<br>${eq(`<i>Q</i> = ${A(Q2)} J`)} ✓`),
      calc('Calculate the total energy supplied.', 1, Q1 + Q2, 'J', `${eq(`${A(Q1)} + ${A(Q2)} = ${A(Q1 + Q2)} J`)} ✓`),
      text('Explain, in terms of the energy of the molecules, why the temperature does not change while the ice melts.', 2, 'The energy supplied increases the potential energy of the molecules (it is used to break the bonds that hold them in a fixed structure) ✓<br>The mean kinetic energy of the molecules does not change, so the temperature stays the same ✓')
    ] };
};
T.TE3 = R => {
  const [metal, c0] = R.pick([['copper', 385], ['aluminium', 900], ['iron', 450], ['lead', 130]]), m1 = R.pick([0.20, 0.50]), m2 = R.pick([0.25, 0.40]), T0 = R.pick([15, 18, 20]);
  const Tf = Number(((m1 * c0 * 100 + m2 * CW * T0) / (m1 * c0 + m2 * CW)).toFixed(1)), Qw = m2 * CW * (Tf - T0), c = Qw / (m1 * (100 - Tf));
  return { stem: `A block of ${metal} of mass ${N(m1, 2)} kg is heated to 100.0 °C in boiling water. It is then quickly transferred to ${N(m2, 2)} kg of water at ${T0.toFixed(1)} °C in an insulated container. The final temperature of the water and the block is ${Tf.toFixed(1)} °C.<br>${CWD}`,
    parts: [
      calc('Calculate the energy gained by the water.', 2, Qw, 'J', `${eq(`<i>Q</i> = <i>mc</i>Δ<i>θ</i> = ${N(m2, 2)} × 4200 × (${Tf.toFixed(1)} − ${T0.toFixed(1)})`)} ✓<br>${eq(`<i>Q</i> = ${A(Qw)} J`)} ✓`),
      calc(`Calculate the specific heat capacity of ${metal}.`, 3, c, JKK, `Energy lost by the block = energy gained by the water ✓<br>${eq(`${N(m1, 2)} × <i>c</i> × (100.0 − ${Tf.toFixed(1)}) = ${A(Qw)}`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${JKK}`)} ✓`),
      text('State one assumption made in this calculation.', 1, 'No energy is transferred to the surroundings or to the container (or: no hot water is carried over with the block) ✓'),
      text('State and explain the effect on the calculated value if the block cools slightly while it is being transferred.', 1, 'The value is too small: the block gives less energy to the water, so the temperature rise of the water is smaller than it should be ✓')
    ] };
};
T.TE4 = R => {
  const P = R.pick([7.5, 8.5, 9.5, 10.5]), fl = R.pick([0.060, 0.080, 0.10]), Tin = R.pick([10, 15]), dT = P * 1e3 / (fl * CW);
  return { stem: `An electric shower has a heater of power ${N(P, 2)} kW. Water enters the heater at ${Tin} °C and flows through it at a rate of ${N(fl, 2)} kg s<sup>−1</sup>.<br>${CWD}`,
    parts: [
      calc('Calculate the rise in temperature of the water as it passes through the heater.', 3, dT, 'K', `In one second, energy supplied ${eq(`= ${N(P * 1e3, 2)} J`)} and mass heated ${eq(`= ${N(fl, 2)} kg`)} ✓<br>${eq(`Δ<i>θ</i> = <i>Q</i>/<i>mc</i> = ${N(P * 1e3, 2)} / (${N(fl, 2)} × 4200)`)} ✓<br>${eq(`Δ<i>θ</i> = ${A(dT)} K`)} ✓`),
      calc('Calculate the temperature of the water leaving the shower.', 1, Tin + dT, '°C', `${eq(`${Tin} + ${A(dT)} = ${A(Tin + dT)} °C`)} ✓`),
      calc('Calculate the energy supplied by the heater during a shower lasting 5.0 minutes.', 1, P * 1e3 * 300, 'J', `${eq(`${N(P * 1e3, 2)} × 300 = ${A(P * 1e3 * 300)} J`)} ✓`),
      text('State and explain what happens to the temperature of the water leaving the shower if the flow rate is reduced.', 2, 'The temperature increases ✓<br>The same energy is supplied each second to a smaller mass of water ✓')
    ] };
};
T.TE5 = R => {
  const m = R.pick([0.10, 0.20, 0.25]), P = R.pick([40, 50]), Tm = R.pick([60, 80]), t1 = R.pick([100, 200]), t2 = R.pick([300, 400]), c = P * t1 / (m * (Tm - 20)), L = P * (t2 - t1) / m;
  const fig = graph({ x: [0, 600, 100], y: [0, 100, 20], div: 5, xl: 'time / s', yl: 'temperature / °C', curves: [{ f: pw([[0, 20], [t1, Tm], [t2, Tm], [600, Tm + 14]]), from: 0, to: 600 }] });
  return { stem: `A solid of mass ${N(m, 2)} kg is heated at a constant rate of ${P} W in an insulated container. <b>Figure 1</b> shows how its temperature varies with time.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the melting point of the substance.', marks: 1, ans: Tm, unit: '°C', show: String(Tm), tol: .04, ms: `${Tm} °C (the temperature of the horizontal section) ✓` },
      text('Explain why the temperature stays constant while the substance melts, although energy is still being supplied.', 2, 'The energy supplied increases the potential energy of the molecules as the bonds between them are broken ✓<br>The mean kinetic energy of the molecules does not change, so the temperature is constant ✓'),
      { q: 'Use <b>Figure 1</b> to determine the specific heat capacity of the solid.', marks: 3, ans: c, unit: JKK, show: A(c), tol: .07, ms: `Energy supplied in the first ${t1} s ${eq(`= ${P} × ${t1} = ${A(P * t1)} J`)} ✓<br>${eq(`<i>c</i> = <i>Q</i>/<i>m</i>Δ<i>θ</i> = ${A(P * t1)} / (${N(m, 2)} × (${Tm} − 20))`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${JKK}`)} ✓` },
      { q: 'Determine the specific latent heat of fusion of the substance.', marks: 2, ans: L, unit: JK, show: A(L), tol: .07, ms: `Energy supplied while melting ${eq(`= ${P} × (${t2} − ${t1}) = ${A(P * (t2 - t1))} J`)} ✓<br>${eq(`<i>l</i> = <i>Q</i>/<i>m</i> = ${A(P * (t2 - t1))} / ${N(m, 2)} = ${A(L)} ${JK}`)} ✓` }
    ] };
};
T.TE6 = R => {
  const P = R.pick([2.0, 2.5, 3.0]), m = R.pick([0.80, 1.2, 1.5]), T0 = R.pick([15, 20]), m2 = R.pick([0.20, 0.30]), Q1 = m * CW * (100 - T0), Q2 = m2 * 2.26e6;
  return { stem: `An electric kettle of power ${N(P, 2)} kW contains ${N(m, 2)} kg of water at ${T0} °C. The kettle is switched on and left on after the water starts to boil.<br>${CWD}<br>specific latent heat of vaporisation of water = 2.26 × 10<sup>6</sup> J kg<sup>−1</sup>`,
    parts: [
      text('State what is meant by the internal energy of the water.', 1, 'The sum of the randomly distributed kinetic energies and potential energies of its molecules ✓'),
      calc('Calculate the energy needed to raise the temperature of the water to 100 °C.', 2, Q1, 'J', `${eq(`<i>Q</i> = <i>mc</i>Δ<i>θ</i> = ${N(m, 2)} × 4200 × (100 − ${T0})`)} ✓<br>${eq(`<i>Q</i> = ${A(Q1)} J`)} ✓`),
      calc('Calculate the time taken for the water to reach 100 °C. Assume that all the energy supplied is transferred to the water.', 1, Q1 / (P * 1e3), 's', `${eq(`<i>t</i> = <i>Q</i>/<i>P</i> = ${A(Q1)} / ${N(P * 1e3, 2)} = ${A(Q1 / (P * 1e3))} s`)} ✓`),
      calc(`Calculate the energy needed to change ${N(m2, 2)} kg of the boiling water into steam.`, 2, Q2, 'J', `${eq(`<i>Q</i> = <i>ml</i> = ${N(m2, 2)} × 2.26 × 10<sup>6</sup>`)} ✓<br>${eq(`<i>Q</i> = ${A(Q2)} J`)} ✓`),
      calc('Calculate the additional time for which the kettle must stay on for this to happen.', 1, Q2 / (P * 1e3), 's', `${eq(`${A(Q2)} / ${N(P * 1e3, 2)} = ${A(Q2 / (P * 1e3))} s`)} ✓`),
      text('State what is meant by the specific latent heat of vaporisation.', 1, 'The energy needed to change 1 kg of the liquid into gas without a change of temperature ✓')
    ] };
};
/* --- ideal gases --- */
T.TG1 = R => {
  const [gas, Mm] = R.pick([['oxygen', 0.032], ['nitrogen', 0.028], ['helium', 0.0040], ['argon', 0.040]]), V = R.pick([0.020, 0.050, 0.10]), p = R.pick([1.5e5, 2.0e5, 1.2e6]), tc = R.pick([17, 22, 27]), T2 = R.pick([47, 57, 77]), n = p * V / (RG * (tc + 273)), p2 = p * (T2 + 273) / (tc + 273);
  return { stem: `A cylinder of volume ${N(V, 2)} m<sup>3</sup> contains ${gas} at a pressure of ${N(p, 2)} Pa and a temperature of ${tc} °C.<br>${GASD}<br>${NAD}<br>molar mass of ${gas} = ${Mm} kg mol<sup>−1</sup>`,
    parts: [
      calc('Calculate the number of moles of gas in the cylinder.', 3, n, 'mol', `${eq(`<i>T</i> = ${tc} + 273 = ${tc + 273} K`)} ✓<br>${eq(`<i>n</i> = <i>pV</i>/<i>RT</i> = (${N(p, 2)} × ${N(V, 2)}) / (8.31 × ${tc + 273})`)} ✓<br>${eq(`<i>n</i> = ${A(n)} mol`)} ✓`, { guide: ['Award a maximum of two marks if the temperature is not converted to kelvin.'] }),
      calc('Calculate the number of molecules in the cylinder.', 1, n * NAV, '', `${eq(`${A(n)} × 6.02 × 10<sup>23</sup> = ${A(n * NAV)}`)} ✓`),
      calc('Calculate the mass of gas in the cylinder.', 1, n * Mm, 'kg', `${eq(`${A(n)} × ${Mm} = ${A(n * Mm)} kg`)} ✓`),
      calc(`Calculate the pressure in the cylinder when its temperature rises to ${T2} °C.`, 2, p2, 'Pa', `At constant volume ${eq('<i>p</i>/<i>T</i> is constant')}: ${eq(`<i>p</i> = ${N(p, 2)} × ${T2 + 273} / ${tc + 273}`)} ✓<br>${eq(`<i>p</i> = ${A(p2)} Pa`)} ✓`)
    ] };
};
T.TG2 = R => {
  const p1 = R.pick([1.0e5, 1.2e5]), V1 = R.pick([240, 300, 500]), V2 = R.pick([80, 100, 150]), T1 = R.pick([290, 300]), T2 = R.pick([350, 400]), p2 = p1 * V1 / V2, p3 = p2 * T2 / T1;
  return { stem: `A fixed mass of gas has a volume of ${V1} cm<sup>3</sup> and a pressure of ${N(p1, 2)} Pa at a temperature of ${T1} K. The gas is compressed slowly, at constant temperature, to a volume of ${V2} cm<sup>3</sup>.`,
    parts: [
      text('State Boyle’s law.', 2, 'For a fixed mass of gas at constant temperature ✓<br>the pressure is inversely proportional to the volume (<i>pV</i> is constant) ✓'),
      calc('Calculate the pressure of the gas after it has been compressed.', 2, p2, 'Pa', `${eq(`<i>p</i><sub>1</sub><i>V</i><sub>1</sub> = <i>p</i><sub>2</sub><i>V</i><sub>2</sub>, so <i>p</i><sub>2</sub> = ${N(p1, 2)} × ${V1} / ${V2}`)} ✓<br>${eq(`<i>p</i><sub>2</sub> = ${A(p2)} Pa`)} ✓`),
      calc(`The gas is then heated to ${T2} K at constant volume.<br>Calculate the new pressure.`, 2, p3, 'Pa', `${eq(`<i>p</i>/<i>T</i> is constant, so <i>p</i> = ${A(p2)} × ${T2} / ${T1}`)} ✓<br>${eq(`<i>p</i> = ${A(p3)} Pa`)} ✓`),
      text('Explain, in terms of the motion of the molecules, why the pressure increases when the gas is compressed at constant temperature.', 2, 'The molecules have the same mean speed, but they are closer together, so they hit the walls more often ✓<br>The rate of change of momentum at the walls (the force on each unit area) is therefore greater ✓')
    ] };
};
T.TG3 = R => {
  const V1 = R.pick([2.0, 3.0, 5.0]), T1 = R.pick([288, 293]), p2 = R.pick([2.0e4, 3.0e4, 5.0e4]), T2 = R.pick([220, 230, 250]), V2 = 1.0e5 * V1 * T2 / (T1 * p2), n = 1.0e5 * V1 / (RG * T1);
  return { stem: `A weather balloon is filled with helium at ground level, where the pressure is 1.0 × 10<sup>5</sup> Pa and the temperature is ${T1} K. Its volume is ${N(V1, 2)} m<sup>3</sup>. The balloon rises to a height at which the pressure is ${N(p2, 2)} Pa and the temperature is ${T2} K.<br>${GASD}`,
    parts: [
      calc('Calculate the volume of the balloon at this height.', 3, V2, 'm<sup>3</sup>', `${eq('<i>p</i><sub>1</sub><i>V</i><sub>1</sub>/<i>T</i><sub>1</sub> = <i>p</i><sub>2</sub><i>V</i><sub>2</sub>/<i>T</i><sub>2</sub>')} ✓<br>${eq(`<i>V</i><sub>2</sub> = (1.0 × 10<sup>5</sup> × ${N(V1, 2)} × ${T2}) / (${T1} × ${N(p2, 2)})`)} ✓<br>${eq(`<i>V</i><sub>2</sub> = ${A(V2)} m<sup>3</sup>`)} ✓`),
      calc('Calculate the number of moles of helium in the balloon.', 2, n, 'mol', `${eq(`<i>n</i> = <i>pV</i>/<i>RT</i> = (1.0 × 10<sup>5</sup> × ${N(V1, 2)}) / (8.31 × ${T1})`)} ✓<br>${eq(`<i>n</i> = ${A(n)} mol`)} ✓`),
      text('State two assumptions made in these calculations.', 2, 'The helium behaves as an ideal gas ✓<br>No helium escapes (the mass of gas is constant), and the pressure inside the balloon equals the pressure outside ✓')
    ] };
};
T.TG4 = R => {
  const p = R.pick([1.0e5, 1.5e5, 2.0e5]), V1 = R.pick([2.0e-3, 5.0e-3]), T2 = R.pick([360, 400, 450]), V2 = V1 * T2 / 300, W = p * (V2 - V1);
  return { stem: `A gas is trapped in a cylinder by a piston that can move freely, so the pressure of the gas stays at ${N(p, 2)} Pa. The gas has a volume of ${N(V1, 2)} m<sup>3</sup> at 300 K. It is heated to ${T2} K.`,
    parts: [
      text('State the relationship between the volume and the temperature of a fixed mass of gas at constant pressure.', 1, 'The volume is directly proportional to the absolute (kelvin) temperature ✓'),
      calc('Calculate the volume of the gas at the higher temperature.', 2, V2, 'm<sup>3</sup>', `${eq(`<i>V</i>/<i>T</i> is constant, so <i>V</i> = ${N(V1, 2)} × ${T2} / 300`)} ✓<br>${eq(`<i>V</i> = ${A(V2)} m<sup>3</sup>`)} ✓`),
      calc('Calculate the work done by the gas as it expands.', 2, W, 'J', `${eq(`<i>W</i> = <i>p</i>Δ<i>V</i> = ${N(p, 2)} × (${A(V2)} − ${N(V1, 2)})`)} ✓<br>${eq(`<i>W</i> = ${A(W)} J`)} ✓`),
      text('Explain why the energy supplied to the gas by heating is greater than the work done by the gas.', 1, 'The temperature of the gas rises, so its internal energy (the kinetic energy of its molecules) also increases ✓'),
      text('State what the area under a graph of pressure against volume represents.', 1, 'The work done by (or on) the gas ✓')
    ] };
};
T.TG5 = R => {
  const [a, b, c] = R.pick([[5.0, 4.0, 3.0], [8.0, 6.0, 3.0], [10, 7.0, 3.0]]), tc = R.pick([17, 20, 25]), V = a * b * c, Nn = 1.01e5 * V / (KB * (tc + 273)), n = Nn / NAV, m = n * 0.029;
  return { stem: `A room measures ${N(a, 2)} m by ${N(b, 2)} m by ${N(c, 2)} m. The air in the room is at a pressure of 1.01 × 10<sup>5</sup> Pa and a temperature of ${tc} °C.<br>${KD}<br>${NAD}<br>molar mass of air = 0.029 kg mol<sup>−1</sup>`,
    parts: [
      calc('Calculate the volume of the room.', 1, V, 'm<sup>3</sup>', `${eq(`${N(a, 2)} × ${N(b, 2)} × ${N(c, 2)} = ${A(V)} m<sup>3</sup>`)} ✓`),
      calc('Calculate the number of molecules of air in the room.', 3, Nn, '', `${eq(`<i>T</i> = ${tc + 273} K`)} ✓<br>${eq(`<i>N</i> = <i>pV</i>/<i>kT</i> = (1.01 × 10<sup>5</sup> × ${A(V)}) / (1.38 × 10<sup>−23</sup> × ${tc + 273})`)} ✓<br>${eq(`<i>N</i> = ${A(Nn)}`)} ✓`),
      calc('Calculate the number of moles of air in the room.', 1, n, 'mol', `${eq(`${A(Nn)} / 6.02 × 10<sup>23</sup> = ${A(n)} mol`)} ✓`),
      calc('Calculate the mass of air in the room.', 1, m, 'kg', `${eq(`${A(n)} × 0.029 = ${A(m)} kg`)} ✓`),
      calc('Calculate the density of the air.', 1, m / V, 'kg m<sup>−3</sup>', `${eq(`${A(m)} / ${A(V)} = ${A(m / V)} kg m<sup>−3</sup>`)} ✓`)
    ] };
};
T.TG6 = R => {
  const p0 = R.pick([100, 90, 110]), grad = p0 / 273;
  const fig = graph({ x: [0, 100, 20], y: [80, 160, 20], div: 5, xl: 'temperature / °C', yl: 'pressure / kPa', curves: [{ f: x => p0 * (1 + x / 273), from: 0, to: 100 }] });
  return { stem: `A student heats a fixed mass of dry air in a sealed flask of constant volume and measures its pressure at different temperatures. <b>Figure 1</b> shows the results.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the pressure of the air at 0 °C.', marks: 1, ans: p0, unit: 'kPa', show: String(p0), tol: .02, ms: `${p0} kPa ✓`, guide: ['Reading from the graph: allow ± 1 kPa.'] },
      { q: 'Determine the gradient of the graph.', marks: 2, ans: grad, unit: 'kPa K<sup>−1</sup>', show: A(grad), tol: .07, ms: `Uses a triangle that covers at least half of the line, for example ${eq(`(${N(p0 * (1 + 100 / 273), 4)} − ${p0}) / (100 − 0)`)} ✓<br>${eq(`gradient = ${A(grad)} kPa K<sup>−1</sup>`)} ✓` },
      { q: 'Use your answers to estimate the temperature, in °C, at which the pressure of the air would be zero.', marks: 2, ans: -273, unit: '°C', show: '−273', tol: .08, ms: `The pressure falls by ${A(grad)} kPa for each degree, so the temperature must fall by ${eq(`${p0} / ${A(grad)} = 273`)} degrees below 0 °C ✓<br>${eq('−273 °C')} ✓`, guide: ['Allow −255 °C to −290 °C from the candidate’s own gradient.'] },
      text('State the significance of this temperature.', 1, 'It is absolute zero (0 K): the lowest possible temperature, at which the molecules of an ideal gas would have no kinetic energy ✓'),
      text('Explain, in terms of the motion of the molecules, why the pressure increases as the temperature rises.', 2, 'The molecules move faster, so they hit the walls more often ✓<br>and each collision involves a greater change of momentum, so the force on the walls is greater ✓')
    ] };
};
/* --- molecular kinetic theory --- */
const MOLS = [['nitrogen', 4.65e-26], ['oxygen', 5.31e-26], ['helium', 6.64e-27], ['argon', 6.63e-26]];
T.TK1 = R => {
  const [gas, m] = R.pick(MOLS), tc = R.pick([20, 27, 100, 227]), Tk = tc + 273, Ek = 1.5 * KB * Tk, c = Math.sqrt(3 * KB * Tk / m);
  return { stem: `A sample of ${gas} gas is at a temperature of ${tc} °C. The mass of ${/^[aeo]/.test(gas) ? 'an' : 'a'} ${gas} ${gas === 'helium' || gas === 'argon' ? 'atom' : 'molecule'} is ${N(m)} kg.<br>${KD}<br>${GASD}`,
    parts: [
      calc('Calculate the mean kinetic energy of a particle of the gas.', 2, Ek, 'J', `${eq(`mean kinetic energy = (3/2)<i>kT</i> = 1.5 × 1.38 × 10<sup>−23</sup> × ${Tk}`)} ✓<br>${eq(`= ${A(Ek)} J`)} ✓`, { guide: ['Award one mark if the temperature is not converted to kelvin.'] }),
      calc('Calculate the root mean square speed of the particles.', 2, c, MS1, `${eq(`½<i>m</i>(<i>c</i><sub>rms</sub>)<sup>2</sup> = ${A(Ek)}, so <i>c</i><sub>rms</sub> = √(2 × ${A(Ek)} / ${N(m)})`)} ✓<br>${eq(`<i>c</i><sub>rms</sub> = ${A(c)} ${MS1}`)} ✓`),
      calc('Calculate the total kinetic energy of the particles in one mole of the gas.', 2, 1.5 * RG * Tk, 'J', `${eq(`(3/2)<i>RT</i> = 1.5 × 8.31 × ${Tk}`)} ✓<br>${eq(`= ${A(1.5 * RG * Tk)} J`)} ✓`),
      text('State the effect on the root mean square speed of doubling the absolute temperature of the gas.', 1, 'It increases by a factor of √2 (about 1.4) ✓')
    ] };
};
T.TK2 = R => {
  const [gas, rho] = R.pick([['air', 1.2], ['helium', 0.17], ['argon', 1.7], ['carbon dioxide', 1.8]]), c = Math.sqrt(3 * 1.0e5 / rho);
  return { stem: `At a pressure of 1.0 × 10<sup>5</sup> Pa and a temperature of 290 K, the density of ${gas} is ${N(rho, 2)} kg m<sup>−3</sup>.`,
    parts: [
      text('State what is meant by the root mean square speed of the molecules of a gas.', 1, 'The square root of the mean of the squares of the speeds of the molecules ✓'),
      calc(`Calculate the root mean square speed of the molecules of the ${gas}.`, 3, c, MS1, `${eq('<i>pV</i> = ⅓<i>Nm</i>(<i>c</i><sub>rms</sub>)<sup>2</sup> and <i>ρ</i> = <i>Nm</i>/<i>V</i>, so <i>p</i> = ⅓<i>ρ</i>(<i>c</i><sub>rms</sub>)<sup>2</sup>')} ✓<br>${eq(`<i>c</i><sub>rms</sub> = √(3 × 1.0 × 10<sup>5</sup> / ${N(rho, 2)})`)} ✓<br>${eq(`<i>c</i><sub>rms</sub> = ${A(c)} ${MS1}`)} ✓`),
      text('Two different gases are at the same temperature.<br>State and explain which gas has molecules with the greater root mean square speed.', 2, 'The gas whose molecules have the smaller mass ✓<br>The mean kinetic energy of the molecules is the same at the same temperature, so a smaller mass means a greater speed ✓'),
      text('The pressure of the gas is doubled at constant temperature.<br>State the effect on the root mean square speed of the molecules.', 1, 'No change (the speed depends only on the temperature; the density doubles as well) ✓')
    ] };
};
T.TK3 = R => ({ stem: `The kinetic theory model explains the behaviour of an ideal gas in terms of the motion of its molecules.`,
  parts: [
    text('State four assumptions of the kinetic theory model of an ideal gas.', 4, 'Any four ✓✓✓✓:<br>The gas contains a very large number of molecules moving in random directions with a range of speeds.<br>The volume of the molecules is negligible compared with the volume of the gas.<br>Collisions between molecules, and with the walls, are perfectly elastic.<br>There are no forces between the molecules except during collisions.<br>The duration of a collision is negligible compared with the time between collisions.<br>The molecules obey Newton’s laws of motion.'),
    text('Use the kinetic theory to explain how a gas exerts a pressure on the walls of its container.', 3, 'The molecules collide with the walls and rebound, so their momentum changes ✓<br>By Newton’s second law a force acts on each molecule, and by the third law the molecule exerts an equal and opposite force on the wall ✓<br>The very large number of collisions each second gives a steady force, and pressure is this force per unit area ✓'),
    text(R.chance(.5) ? 'Explain why the pressure of the gas increases when its volume is reduced at constant temperature.' : 'Explain why the pressure of the gas increases when more gas is pumped into the container at constant temperature.', 1, 'There are more collisions with each unit area of the walls every second (the molecules still have the same mean speed) ✓')
  ] });
T.TK4 = R => ({ stem: `A student looks through a microscope at smoke particles suspended in air in a small, brightly lit cell.`,
  parts: [
    text('Describe what the student sees.', 2, 'Bright specks of light (the smoke particles) ✓<br>moving in a random, jerky way, changing direction continually ✓'),
    text('Explain these observations.', 2, 'The smoke particles are hit by air molecules, which are too small to be seen ✓<br>The air molecules move rapidly and randomly, so the collisions are uneven and the resultant force on a smoke particle keeps changing in size and direction ✓'),
    text('State the name given to this motion and what it provides evidence for.', 1, 'Brownian motion: evidence for the existence of atoms or molecules in rapid, random motion ✓'),
    text(R.chance(.5) ? 'State and explain how the motion of the smoke particles changes when the temperature of the air is increased.' : 'State and explain how the motion would differ for larger smoke particles.', 2, 'x')
  ] });
T.TK4 = (old => R => { const q = old(R), P = q.parts[3]; P.ms = /temperature/.test(P.q) ? 'The motion becomes more vigorous (faster and more agitated) ✓<br>The air molecules have a greater mean kinetic energy, so they hit the smoke particles harder and more often ✓' : 'The motion is less noticeable (slower, smaller changes of direction) ✓<br>A larger particle has a greater mass, and the collisions on its different sides are more nearly balanced ✓'; return q; })(T.TK4);
T.TK5 = R => {
  const sp = R.pick([[300, 400, 450, 500, 600], [250, 350, 400, 500, 550], [400, 450, 500, 600, 700]]), mean = sp.reduce((a, b) => a + b) / 5, ms = sp.reduce((a, b) => a + b * b, 0) / 5, rms = Math.sqrt(ms), k = R.pick([2, 4]);
  return { stem: `Five molecules of a gas have these speeds:<br>${sp.join(' m s<sup>−1</sup>, ')} m s<sup>−1</sup>`,
    parts: [
      calc('Calculate the mean speed of the molecules.', 1, mean, MS1, `${eq(`(${sp.join(' + ')}) / 5 = ${A(mean)} ${MS1}`)} ✓`),
      calc('Calculate the mean square speed of the molecules.', 2, ms, 'm<sup>2</sup> s<sup>−2</sup>', `${eq(`(${sp.map(x => x + '<sup>2</sup>').join(' + ')}) / 5`)} ✓<br>${eq(`= ${A(ms)} m<sup>2</sup> s<sup>−2</sup>`)} ✓`),
      calc('Calculate the root mean square speed of the molecules.', 1, rms, MS1, `${eq(`√(${A(ms)}) = ${A(rms)} ${MS1}`)} ✓`),
      text('Explain why the root mean square speed, and not the mean speed, is used in the kinetic theory.', 1, 'The pressure and the mean kinetic energy depend on the mean of the squares of the speeds (kinetic energy is proportional to speed<sup>2</sup>) ✓'),
      calc(`The absolute temperature of a gas is increased to ${k} times its original value.<br>Calculate the factor by which the root mean square speed of its molecules increases.`, 2, Math.sqrt(k), '', `The mean kinetic energy is proportional to the absolute temperature, so (<i>c</i><sub>rms</sub>)<sup>2</sup> is proportional to <i>T</i> ✓<br>${eq(`factor = √${k} = ${A(Math.sqrt(k))}`)} ✓`)
    ] };
};
T.TK6 = R => {
  const n = R.pick([0.50, 1.0, 2.0]), Tk = R.pick([300, 350, 400]), dT = R.pick([50, 100]), U = 1.5 * n * RG * Tk;
  return { stem: `A container holds ${N(n, 2)} mol of a monatomic ideal gas at a temperature of ${Tk} K.<br>${GASD}<br>${KD}`,
    parts: [
      text('Explain why the internal energy of an ideal gas is equal to the total kinetic energy of its molecules.', 1, 'There are no forces between the molecules of an ideal gas (except during collisions), so they have no potential energy ✓'),
      calc('Calculate the internal energy of the gas.', 2, U, 'J', `${eq(`<i>U</i> = (3/2)<i>nRT</i> = 1.5 × ${N(n, 2)} × 8.31 × ${Tk}`)} ✓<br>${eq(`<i>U</i> = ${A(U)} J`)} ✓`),
      calc('Calculate the mean kinetic energy of one atom of the gas.', 2, 1.5 * KB * Tk, 'J', `${eq(`(3/2)<i>kT</i> = 1.5 × 1.38 × 10<sup>−23</sup> × ${Tk}`)} ✓<br>${eq(`= ${A(1.5 * KB * Tk)} J`)} ✓`),
      calc(`Calculate the energy that must be supplied to raise the temperature of the gas by ${dT} K at constant volume.`, 2, 1.5 * n * RG * dT, 'J', `At constant volume no work is done, so the energy supplied equals the increase in internal energy: ${eq(`1.5 × ${N(n, 2)} × 8.31 × ${dT}`)} ✓<br>${eq(`= ${A(1.5 * n * RG * dT)} J`)} ✓`)
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
