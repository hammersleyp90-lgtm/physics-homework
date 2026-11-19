/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_FMX = (function(){
const module = undefined;
'use strict';
/* Question types for AQA further mechanics (3.6.1). */
const TOPICS = { CM: 'Circular motion', SH: 'Simple harmonic motion', SS: 'Simple harmonic systems', FV: 'Forced vibrations and resonance' };
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
/* ---------- further mechanics (AQA 3.6.1) ---------- */
const G = 9.81, RAD = 'rad s<sup>−1</sup>';
/* --- circular motion --- */
T.CM1 = R => {
  const r = R.pick([0.15, 0.25, 0.40]), Tp = R.pick([0.50, 0.80, 1.2]), m = R.pick([0.050, 0.20]), w = 2 * PI / Tp, v = w * r, a = w * w * r;
  return { stem: `A small object of mass ${N(m, 2)} kg is placed on a horizontal turntable, ${N(r, 2)} m from the centre. The turntable rotates at a steady rate, completing one revolution every ${N(Tp, 2)} s. The object does not slip.`,
    parts: [
      calc('Calculate the angular speed of the turntable.', 2, w, RAD, `${eq(`<i>ω</i> = 2π/<i>T</i> = 2π / ${N(Tp, 2)}`)} ✓<br>${eq(`<i>ω</i> = ${A(w)} ${RAD}`)} ✓`),
      calc('Calculate the speed of the object.', 1, v, MS1, `${eq(`<i>v</i> = <i>ωr</i> = ${A(w)} × ${N(r, 2)} = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the centripetal acceleration of the object.', 2, a, MS2, `${eq(`<i>a</i> = <i>ω</i><sup>2</sup><i>r</i> = ${A(w)}<sup>2</sup> × ${N(r, 2)}`)} ✓<br>${eq(`<i>a</i> = ${A(a)} ${MS2}`)} ✓`),
      calc('Calculate the resultant force on the object.', 1, m * a, 'N', `${eq(`<i>F</i> = <i>ma</i> = ${N(m, 2)} × ${A(a)} = ${A(m * a)} N`)} ✓`),
      text('State the direction of this force and name the force that provides it.', 2, 'Towards the centre of the turntable ✓<br>Friction between the object and the turntable ✓')
    ] };
};
T.CM2 = R => {
  const m = R.pick([900, 1200, 1500]), r = R.pick([25, 40, 60]), F = R.pick([5000, 6000, 8000]), vm = Math.sqrt(F * r / m), F12 = m * 144 / r;
  return { stem: `A car of mass ${m} kg travels round a level roundabout in a circle of radius ${r} m. The maximum frictional force that the road can exert sideways on the tyres is ${F} N.`,
    parts: [
      calc('Calculate the centripetal force needed for the car to travel round the roundabout at 12 m s<sup>−1</sup>.', 2, F12, 'N', `${eq(`<i>F</i> = <i>mv</i><sup>2</sup>/<i>r</i> = ${m} × 12<sup>2</sup> / ${r}`)} ✓<br>${eq(`<i>F</i> = ${A(F12)} N`)} ✓`),
      calc('Calculate the maximum speed at which the car can travel round the roundabout without skidding.', 3, vm, MS1, `Friction provides the centripetal force: ${eq(`<i>mv</i><sup>2</sup>/<i>r</i> = ${F}`)} ✓<br>${eq(`<i>v</i> = √(${F} × ${r} / ${m})`)} ✓<br>${eq(`<i>v</i> = ${A(vm)} ${MS1}`)} ✓`),
      text('Describe what happens if the car travels faster than this.', 1, 'Friction cannot provide enough centripetal force, so the car cannot follow the curve and skids outwards (it travels in a path of larger radius) ✓'),
      text('State and explain the effect on the maximum safe speed when the road is wet.', 1, 'It is lower, because the maximum frictional force is smaller ✓')
    ] };
};
T.CM3 = R => {
  const m = R.pick([0.20, 0.30, 0.50]), r = R.pick([0.60, 0.80, 1.0]), vt = R.pick([3.5, 4.0, 5.0]), Tt = m * vt * vt / r - m * G, vb = Math.sqrt(vt * vt + 4 * G * r), Tb = m * vb * vb / r + m * G;
  return { stem: `A ball of mass ${N(m, 2)} kg is whirled in a vertical circle of radius ${N(r, 2)} m on the end of a light string. The speed of the ball at the top of the circle is ${N(vt, 2)} ${MS1}.`,
    parts: [
      calc('Calculate the tension in the string when the ball is at the top of the circle.', 2, Tt, 'N', `At the top, the tension and the weight both act towards the centre: ${eq('<i>T</i> + <i>mg</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>T</i> = (${N(m, 2)} × ${N(vt, 2)}<sup>2</sup> / ${N(r, 2)}) − (${N(m, 2)} × 9.81) = ${A(Tt)} N`)} ✓`),
      calc('Calculate the speed of the ball at the bottom of the circle.', 2, vb, MS1, `The ball falls through 2<i>r</i>, so ${eq(`½<i>mv</i><sup>2</sup> = ½<i>mu</i><sup>2</sup> + <i>mg</i>(2<i>r</i>)`)} ✓<br>${eq(`<i>v</i> = √(${N(vt, 2)}<sup>2</sup> + (4 × 9.81 × ${N(r, 2)})) = ${A(vb)} ${MS1}`)} ✓`),
      calc('Calculate the tension in the string when the ball is at the bottom of the circle.', 2, Tb, 'N', `At the bottom ${eq('<i>T</i> − <i>mg</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>T</i> = (${N(m, 2)} × ${A(vb)}<sup>2</sup> / ${N(r, 2)}) + (${N(m, 2)} × 9.81) = ${A(Tb)} N`)} ✓`),
      calc('Calculate the minimum speed that the ball can have at the top of the circle if the string is to stay taut.', 2, Math.sqrt(G * r), MS1, `The string is just taut when the tension is zero, so the weight alone provides the centripetal force: ${eq('<i>mg</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>v</i> = √(9.81 × ${N(r, 2)}) = ${A(Math.sqrt(G * r))} ${MS1}`)} ✓`),
      text('State where in the circle the string is most likely to break.', 1, 'At the bottom, where the tension is greatest ✓')
    ] };
};
T.CM4 = R => {
  const v = R.pick([80, 100, 150]), r = R.pick([800, 1500, 2500]), m = R.pick([2.0e4, 6.0e4]), th = Math.atan(v * v / (r * G)) * 180 / PI, L = m * G / cosD(th);
  return { stem: `An aircraft of mass ${N(m, 2)} kg flies at a constant speed of ${v} ${MS1} in a horizontal circle of radius ${r} m. To do this the aircraft banks, so that its wings are tilted at an angle <i>θ</i> to the horizontal. The lift force acts at right angles to the wings.`,
    parts: [
      calc('Calculate the centripetal acceleration of the aircraft.', 1, v * v / r, MS2, `${eq(`<i>a</i> = <i>v</i><sup>2</sup>/<i>r</i> = ${v}<sup>2</sup> / ${r} = ${A(v * v / r)} ${MS2}`)} ✓`),
      text('Explain why the aircraft must bank in order to turn.', 1, 'Banking tilts the lift force so that it has a horizontal component, which provides the centripetal force ✓'),
      calc('Calculate the angle <i>θ</i>.', 3, th, '°', `Vertically ${eq('<i>L</i> cos <i>θ</i> = <i>mg</i>')} and horizontally ${eq('<i>L</i> sin <i>θ</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`tan <i>θ</i> = <i>v</i><sup>2</sup>/<i>rg</i> = ${v}<sup>2</sup> / (${r} × 9.81)`)} ✓<br>${eq(`<i>θ</i> = ${A(th)}°`)} ✓`),
      calc('Calculate the lift force on the aircraft.', 2, L, 'N', `${eq(`<i>L</i> = <i>mg</i> / cos <i>θ</i> = (${N(m, 2)} × 9.81) / cos ${A(th)}°`)} ✓<br>${eq(`<i>L</i> = ${A(L)} N`)} ✓`)
    ] };
};
T.CM5 = R => {
  const m = R.pick([60, 70, 80]), w = 2 * PI / 8.64e4, v = w * 6.37e6, a = w * w * 6.37e6;
  return { stem: `A person of mass ${m} kg stands on the equator. The Earth rotates once every 8.64 × 10<sup>4</sup> s and the radius of the Earth is 6.37 × 10<sup>6</sup> m.`,
    parts: [
      calc('Calculate the angular speed of the Earth.', 2, w, RAD, `${eq('<i>ω</i> = 2π/<i>T</i> = 2π / 8.64 × 10<sup>4</sup>')} ✓<br>${eq(`<i>ω</i> = ${A(w)} ${RAD}`)} ✓`),
      calc('Calculate the speed of the person due to the rotation of the Earth.', 1, v, MS1, `${eq(`<i>v</i> = <i>ωr</i> = ${A(w)} × 6.37 × 10<sup>6</sup> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the centripetal acceleration of the person.', 1, a, MS2, `${eq(`<i>a</i> = <i>ω</i><sup>2</sup><i>r</i> = (${A(w)})<sup>2</sup> × 6.37 × 10<sup>6</sup> = ${A(a)} ${MS2}`)} ✓`),
      text('Explain why the person is accelerating although their speed is constant.', 2, 'Velocity is a vector, and the direction of the velocity is continually changing ✓<br>Acceleration is the rate of change of velocity, so there is an acceleration (towards the centre of the circle) ✓'),
      calc('Calculate the resultant force needed to keep the person moving in this circle.', 1, m * a, 'N', `${eq(`<i>F</i> = <i>ma</i> = ${m} × ${A(a)} = ${A(m * a)} N`)} ✓`),
      text('State how this affects the reading on bathroom scales at the equator, compared with the reading at the poles.', 1, 'The reading is slightly smaller at the equator (part of the gravitational force provides the centripetal force) ✓')
    ] };
};
T.CM6 = R => {
  const r = R.pick([20, 30, 45]), m = R.pick([1000, 1200]), v = R.pick([10, 12]), Nt = m * G - m * v * v / r, vl = Math.sqrt(G * r), Nb = m * G + m * v * v / r;
  return { stem: `A car of mass ${m} kg travels at ${v} ${MS1} over a hump-back bridge. The road over the bridge is an arc of a vertical circle of radius ${r} m.`,
    parts: [
      calc('Calculate the force that the road exerts on the car at the top of the bridge.', 3, Nt, 'N', `The resultant force towards the centre (downwards) is the centripetal force: ${eq('<i>mg</i> − <i>R</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>R</i> = (${m} × 9.81) − (${m} × ${v}<sup>2</sup> / ${r})`)} ✓<br>${eq(`<i>R</i> = ${A(Nt)} N`)} ✓`),
      calc('Calculate the speed at which the car would just lose contact with the road at the top of the bridge.', 2, vl, MS1, `Contact is lost when <i>R</i> = 0, so ${eq('<i>mg</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>v</i> = √(9.81 × ${r}) = ${A(vl)} ${MS1}`)} ✓`),
      calc(`The car later passes at ${v} ${MS1} through the bottom of a dip in the road, which is an arc of a circle of the same radius.<br>Calculate the force that the road exerts on the car at the bottom of the dip.`, 2, Nb, 'N', `The resultant force is now upwards: ${eq('<i>R</i> − <i>mg</i> = <i>mv</i><sup>2</sup>/<i>r</i>')} ✓<br>${eq(`<i>R</i> = (${m} × 9.81) + (${m} × ${v}<sup>2</sup> / ${r}) = ${A(Nb)} N`)} ✓`)
    ] };
};
/* --- simple harmonic motion --- */
T.SH1 = R => {
  const Am = R.pick([0.020, 0.050, 0.080]), f = R.pick([0.50, 2.0, 5.0]), w = 2 * PI * f, t = R.pick([0.10, 0.30]) / (f > 1 ? f : 1), x = Am * Math.cos(w * t);
  return { stem: `An object moves with simple harmonic motion of amplitude ${N(Am, 2)} m and frequency ${N(f, 2)} Hz. At time <i>t</i> = 0 the object is at its maximum positive displacement, so its displacement is given by <i>x</i> = <i>A</i> cos <i>ωt</i>.`,
    parts: [
      text('State the two conditions for an object to move with simple harmonic motion.', 2, 'The acceleration is directly proportional to the displacement from the equilibrium position ✓<br>The acceleration is always directed towards the equilibrium position (opposite in direction to the displacement) ✓'),
      calc('Calculate the angular frequency <i>ω</i>.', 1, w, RAD, `${eq(`<i>ω</i> = 2π<i>f</i> = 2π × ${N(f, 2)} = ${A(w)} ${RAD}`)} ✓`),
      calc('Calculate the maximum speed of the object.', 2, w * Am, MS1, `${eq(`<i>v</i><sub>max</sub> = <i>ωA</i> = ${A(w)} × ${N(Am, 2)}`)} ✓<br>${eq(`= ${A(w * Am)} ${MS1}`)} ✓`),
      calc('Calculate the maximum acceleration of the object.', 2, w * w * Am, MS2, `${eq(`<i>a</i><sub>max</sub> = <i>ω</i><sup>2</sup><i>A</i> = ${A(w)}<sup>2</sup> × ${N(Am, 2)}`)} ✓<br>${eq(`= ${A(w * w * Am)} ${MS2}`)} ✓`),
      calc(`Calculate the displacement of the object at <i>t</i> = ${N(t, 2)} s.`, 2, x, 'm', `${eq(`<i>x</i> = <i>A</i> cos <i>ωt</i> = ${N(Am, 2)} × cos (${A(w)} × ${N(t, 2)})`)}, with the calculator in radians ✓<br>${eq(`<i>x</i> = ${A(x)} m`)} ✓`, { guide: ['Award one mark if the calculator is in degree mode.'] })
    ] };
};
T.SH2 = R => {
  const Am = R.pick([2, 4, 5]), Tp = R.pick([0.5, 1.0, 2.0]), f = 1 / Tp, vm = 2 * PI * f * Am / 100;
  const fig = graph({ x: [0, 2, 0.5], y: [-6, 6, 2], div: 5, xl: 'time / s', yl: 'displacement / cm', curves: [{ f: t => Am * Math.cos(2 * PI * t / Tp), from: 0, to: 2 }] });
  return { stem: `<b>Figure 1</b> shows how the displacement of an object moving with simple harmonic motion varies with time.`, figs: [fig],
    parts: [
      { q: 'State the amplitude of the oscillation.', marks: 1, ans: Am, unit: 'cm', show: N(Am, 2), tol: .06, ms: `${N(Am, 2)} cm ✓` },
      { q: 'Determine the period of the oscillation.', marks: 1, ans: Tp, unit: 's', show: N(Tp, 2), tol: .06, ms: `${N(Tp, 2)} s (the time for one complete cycle) ✓` },
      calc('Calculate the frequency of the oscillation.', 1, f, 'Hz', `${eq(`<i>f</i> = 1/<i>T</i> = 1 / ${N(Tp, 2)} = ${A(f)} Hz`)} ✓`, { tol: .06 }),
      calc('Calculate the maximum speed of the object.', 2, vm, MS1, `${eq(`<i>v</i><sub>max</sub> = 2π<i>fA</i> = 2π × ${A(f)} × ${N(Am / 100, 2)}`)} ✓<br>${eq(`= ${A(vm)} ${MS1}`)} ✓`, { tol: .08, guide: ['Award one mark if cm is not converted to m.'] }),
      text('State one time at which the object has its maximum speed. Explain your answer.', 1, `${N(Tp / 4, 2)} s (or any time at which the displacement is zero): the gradient of the displacement–time graph is steepest there ✓`),
      text('Describe the graph of velocity against time for this motion.', 2, 'A curve of the same shape and period, starting at zero and going negative first (a −sin curve) ✓<br>It is a quarter of a cycle out of phase with the displacement: the velocity is zero when the displacement is a maximum ✓')
    ] };
};
T.SH3 = R => {
  const Am = R.pick([0.050, 0.10, 0.12]), Tp = R.pick([0.50, 1.2, 2.0]), x = Am * R.pick([.5, .6, .8]), w = 2 * PI / Tp, v = w * Math.sqrt(Am * Am - x * x);
  return { stem: `A mass oscillates with simple harmonic motion of amplitude ${N(Am, 2)} m and period ${N(Tp, 2)} s.`,
    parts: [
      calc('Calculate the angular frequency of the oscillation.', 1, w, RAD, `${eq(`<i>ω</i> = 2π/<i>T</i> = 2π / ${N(Tp, 2)} = ${A(w)} ${RAD}`)} ✓`),
      calc('Calculate the maximum speed of the mass.', 1, w * Am, MS1, `${eq(`<i>ωA</i> = ${A(w)} × ${N(Am, 2)} = ${A(w * Am)} ${MS1}`)} ✓`),
      calc(`Calculate the speed of the mass when its displacement is ${N(x, 2)} m.`, 3, v, MS1, `${eq('<i>v</i> = ±<i>ω</i>√(<i>A</i><sup>2</sup> − <i>x</i><sup>2</sup>)')} ✓<br>${eq(`<i>v</i> = ${A(w)} × √(${N(Am, 2)}<sup>2</sup> − ${N(x, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the magnitude of the acceleration of the mass at this displacement.', 1, w * w * x, MS2, `${eq(`<i>a</i> = <i>ω</i><sup>2</sup><i>x</i> = ${A(w)}<sup>2</sup> × ${N(x, 2)} = ${A(w * w * x)} ${MS2}`)} ✓`),
      text('State the direction of this acceleration.', 1, 'Towards the equilibrium position (opposite to the displacement) ✓')
    ] };
};
T.SH4 = R => {
  const w = R.pick([5, 10]), ym = w === 5 ? 1 : 4, f = w / (2 * PI);
  const fig = graph({ x: [-4, 4, 1], y: [-ym, ym, ym / 2], div: 5, xl: 'displacement / cm', yl: `acceleration / m s${sup(-2)}`, curves: [{ f: x => -w * w * x / 100, from: -4, to: 4 }] });
  return { stem: `<b>Figure 1</b> shows how the acceleration of an oscillating object varies with its displacement from the equilibrium position.`, figs: [fig],
    parts: [
      text('State two features of <b>Figure 1</b> that show that the object is moving with simple harmonic motion.', 2, 'It is a straight line through the origin, so the acceleration is proportional to the displacement ✓<br>The gradient is negative, so the acceleration is always in the opposite direction to the displacement ✓'),
      { q: 'Determine the gradient of the graph in s<sup>−2</sup>.', marks: 2, ans: -w * w, unit: 's<sup>−2</sup>', show: '−' + w * w, tol: .07, ms: `${eq(`gradient = (${N(-w * w * .04, 2)} − ${N(w * w * .04, 2)}) / (0.040 − (−0.040))`)}, with the displacement in m ✓<br>${eq(`= −${w * w} s<sup>−2</sup>`)} ✓`, guide: ['Award one mark if cm is not converted to m.'] },
      calc('Calculate the angular frequency of the oscillation.', 1, w, RAD, `${eq(`gradient = −<i>ω</i><sup>2</sup>, so <i>ω</i> = √${w * w} = ${N(w, 2)} ${RAD}`)} ✓`, { show: N(w, 2), tol: .05 }),
      calc('Calculate the frequency of the oscillation.', 1, f, 'Hz', `${eq(`<i>f</i> = <i>ω</i>/2π = ${N(w, 2)} / 2π = ${A(f)} Hz`)} ✓`, { tol: .05 }),
      calc('Calculate the period of the oscillation.', 1, 1 / f, 's', `${eq(`<i>T</i> = 1/<i>f</i> = ${A(1 / f)} s`)} ✓`, { tol: .05 })
    ] };
};
T.SH5 = R => {
  const f = R.pick([2.0, 4.0]), Am = R.pick([0.030, 0.050]), m = R.pick([0.10, 0.25]), w = 2 * PI * f, K = .5 * m * w * w * Am * Am;
  return { stem: `A mass of ${N(m, 2)} kg oscillates with simple harmonic motion of frequency ${N(f, 2)} Hz and amplitude ${N(Am, 2)} m.`,
    parts: [
      text('State the phase difference between the displacement and the velocity, and between the displacement and the acceleration.', 2, 'Displacement and velocity: π/2 rad (90°, a quarter of a cycle) ✓<br>Displacement and acceleration: π rad (180°, they are in antiphase) ✓'),
      text('State the position of the mass when its speed is greatest and when the magnitude of its acceleration is greatest.', 2, 'Greatest speed: at the equilibrium position (zero displacement) ✓<br>Greatest acceleration: at maximum displacement (the amplitude) ✓'),
      calc('Calculate the maximum kinetic energy of the mass.', 3, K, 'J', `${eq(`<i>v</i><sub>max</sub> = 2π<i>fA</i> = 2π × ${N(f, 2)} × ${N(Am, 2)} = ${A(w * Am)} ${MS1}`)} ✓<br>${eq(`<i>E</i><sub>k</sub> = ½<i>mv</i><sup>2</sup> = ½ × ${N(m, 2)} × ${A(w * Am)}<sup>2</sup>`)} ✓<br>${eq(`<i>E</i><sub>k</sub> = ${A(K)} J`)} ✓`)
    ] };
};
/* --- simple harmonic systems --- */
T.SS1 = R => {
  const m = R.pick([0.20, 0.40, 0.50]), e = R.pick([0.040, 0.050, 0.10]), k = m * G / e, Tp = 2 * PI * Math.sqrt(m / k);
  return { stem: `A mass of ${N(m, 2)} kg is hung from a vertical spring and stretches it by ${N(e, 2)} m. The mass is then pulled down a little further and released, so that it oscillates.`,
    parts: [
      calc('Calculate the spring constant of the spring.', 2, k, 'N m<sup>−1</sup>', `${eq(`<i>k</i> = <i>mg</i>/Δ<i>L</i> = (${N(m, 2)} × 9.81) / ${N(e, 2)}`)} ✓<br>${eq(`<i>k</i> = ${A(k)} N m<sup>−1</sup>`)} ✓`),
      calc('Calculate the period of the oscillations.', 2, Tp, 's', `${eq(`<i>T</i> = 2π√(<i>m</i>/<i>k</i>) = 2π√(${N(m, 2)} / ${A(k)})`)} ✓<br>${eq(`<i>T</i> = ${A(Tp)} s`)} ✓`),
      calc('Calculate the frequency of the oscillations.', 1, 1 / Tp, 'Hz', `${eq(`<i>f</i> = 1/<i>T</i> = ${A(1 / Tp)} Hz`)} ✓`),
      text('The mass is replaced by one of twice the mass.<br>State and explain the effect on the period.', 2, 'The period increases by a factor of √2 ✓<br>The period is proportional to √<i>m</i> ✓'),
      text('State the effect on the period of releasing the mass from a larger displacement.', 1, 'No effect: the period does not depend on the amplitude ✓')
    ] };
};
T.SS2 = R => {
  const l = R.pick([0.500, 0.800, 1.200]), t20 = Number((20 * 2 * PI * Math.sqrt(l / 9.81)).toFixed(1)), Tp = t20 / 20, g = 4 * PI * PI * l / (Tp * Tp);
  return { stem: `A student measures the time for 20 complete oscillations of a simple pendulum of length ${l.toFixed(3)} m. The time is ${t20.toFixed(1)} s.`,
    parts: [
      calc('Calculate the period of the pendulum.', 1, Tp, 's', `${eq(`${t20.toFixed(1)} / 20 = ${N(Tp, 3)} s`)} ✓`, { show: N(Tp, 3) }),
      calc('Calculate the value of the acceleration of free fall given by these results.', 3, g, MS2, `${eq('<i>T</i> = 2π√(<i>l</i>/<i>g</i>), so <i>g</i> = 4π<sup>2</sup><i>l</i>/<i>T</i><sup>2</sup>')} ✓<br>${eq(`<i>g</i> = 4π<sup>2</sup> × ${l.toFixed(3)} / ${N(Tp, 3)}<sup>2</sup>`)} ✓<br>${eq(`<i>g</i> = ${A(g)} ${MS2}`)} ✓`),
      text('Explain why the student timed 20 oscillations instead of one.', 1, 'It reduces the percentage uncertainty in the period (the reaction-time uncertainty is spread over 20 oscillations) ✓'),
      text('State why the pendulum must swing through a small angle.', 1, 'The equation for the period (and simple harmonic motion) only applies for small angles, less than about 10° ✓'),
      text('State the effect on the period of using a bob of greater mass.', 1, 'No effect ✓')
    ] };
};
T.SS3 = R => {
  const m = R.pick([0.20, 0.50]), k = R.pick([20, 40, 50]), Am = R.pick([0.050, 0.10]), E = .5 * k * Am * Am, vm = Math.sqrt(k / m) * Am;
  return { stem: `A mass of ${N(m, 2)} kg is attached to a spring of spring constant ${k} N m<sup>−1</sup> and oscillates on a smooth horizontal surface with an amplitude of ${N(Am, 2)} m.`,
    parts: [
      calc('Calculate the total energy of the oscillating system.', 2, E, 'J', `At maximum displacement all the energy is elastic potential energy: ${eq(`½<i>kA</i><sup>2</sup> = ½ × ${k} × ${N(Am, 2)}<sup>2</sup>`)} ✓<br>${eq(`= ${A(E)} J`)} ✓`),
      calc('Calculate the maximum speed of the mass.', 2, vm, MS1, `${eq(`½<i>mv</i><sup>2</sup> = ${A(E)}, so <i>v</i> = √(2 × ${A(E)} / ${N(m, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(vm)} ${MS1}`)} ✓`),
      text(`Calculate the potential energy and the kinetic energy of the system when the displacement is ${N(Am / 2, 2)} m.`, 2, `Potential energy ${eq(`= ½ × ${k} × ${N(Am / 2, 2)}<sup>2</sup> = ${A(E / 4)} J`)} (one quarter of the total) ✓<br>Kinetic energy ${eq(`= ${N(E, 4)} − ${N(E / 4, 4)} = ${A(.75 * E)} J`)} ✓`),
      text('Describe how the kinetic energy and the potential energy vary with displacement during one oscillation.', 2, 'The potential energy is zero at the equilibrium position and a maximum at each end (a parabola); the kinetic energy is a maximum at the centre and zero at each end ✓<br>Their sum is constant at every displacement ✓')
    ] };
};
T.SS4 = R => {
  const gm = R.pick([9.6, 9.8, 10.0]), grad = 4 * PI * PI / gm;
  const fig = graph({ x: [0, 1, 0.2], y: [0, 5, 1], div: 5, xl: 'length / m', yl: `(period)${sup(2)} / s${sup(2)}`, curves: [{ f: x => grad * x, from: 0, to: 1 }] });
  return { stem: `A student measures the period <i>T</i> of a simple pendulum for different lengths <i>l</i>. <b>Figure 1</b> shows a graph of <i>T</i><sup>2</sup> against <i>l</i>.`, figs: [fig],
    parts: [
      text('Explain why the graph is a straight line through the origin.', 2, `${eq('<i>T</i> = 2π√(<i>l</i>/<i>g</i>), so <i>T</i><sup>2</sup> = (4π<sup>2</sup>/<i>g</i>)<i>l</i>')} ✓<br><i>T</i><sup>2</sup> is directly proportional to <i>l</i>, with gradient 4π<sup>2</sup>/<i>g</i> ✓`),
      { q: 'Determine the gradient of the graph.', marks: 2, ans: grad, unit: 's<sup>2</sup> m<sup>−1</sup>', show: A(grad), tol: .05, ms: `Uses a triangle that covers at least half of the line ✓<br>${eq(`gradient = ${N(grad, 3)} / 1.0 = ${A(grad)} s<sup>2</sup> m<sup>−1</sup>`)} ✓`, guide: [`Reading from the graph: allow ${N(grad * .96, 3)} to ${N(grad * 1.04, 3)} s<sup>2</sup> m<sup>−1</sup>.`] },
      calc('Use the gradient to calculate the acceleration of free fall.', 2, gm, MS2, `${eq(`<i>g</i> = 4π<sup>2</sup> / gradient = 4π<sup>2</sup> / ${A(grad)}`)} ✓<br>${eq(`<i>g</i> = ${N(gm, 3)} ${MS2}`)} ✓`, { show: N(gm, 3), tol: .05 }),
      text('In a second experiment the student measures each length to the top of the bob instead of to its centre.<br>State the effect on the graph.', 1, 'The line has the same gradient but no longer passes through the origin (every length is too small by the same amount, so there is an intercept) ✓'),
      text('State one advantage of finding <i>g</i> from the gradient of a graph instead of from a single pair of readings.', 1, 'It uses all the data and reduces the effect of random errors (and a systematic error in the length does not change the gradient) ✓')
    ] };
};
T.SS5 = R => {
  const [pl, gp] = R.pick([['the Moon', 1.62], ['Mars', 3.71]]), l = R.pick([0.25, 0.50, 1.0]), TE = 2 * PI * Math.sqrt(l / 9.81), TP = 2 * PI * Math.sqrt(l / gp);
  return { stem: `A simple pendulum of length ${N(l, 2)} m and a mass–spring system are set oscillating on the Earth. Both are then taken to ${pl}, where the acceleration of free fall is ${gp} ${MS2}.`,
    parts: [
      calc('Calculate the period of the pendulum on the Earth.', 2, TE, 's', `${eq(`<i>T</i> = 2π√(<i>l</i>/<i>g</i>) = 2π√(${N(l, 2)} / 9.81)`)} ✓<br>${eq(`<i>T</i> = ${A(TE)} s`)} ✓`),
      calc(`Calculate the period of the pendulum on ${pl}.`, 2, TP, 's', `${eq(`<i>T</i> = 2π√(${N(l, 2)} / ${gp})`)} ✓<br>${eq(`<i>T</i> = ${A(TP)} s`)} ✓`),
      text(`State and explain how the period of the mass–spring system on ${pl} compares with its period on the Earth.`, 2, 'It is the same ✓<br>The period depends only on the mass and the spring constant (<i>T</i> = 2π√(<i>m</i>/<i>k</i>)), not on <i>g</i> ✓'),
      text('State one difference in the behaviour of the mass–spring system in the two places.', 1, `The equilibrium extension of the spring is smaller on ${pl}, because the weight of the mass is smaller ✓`)
    ] };
};
T.SS6 = R => {
  const k = R.pick([20, 25, 40]), grad = 4 * PI * PI / k, T3 = 2 * PI * Math.sqrt(.3 / k);
  const fig = graph({ x: [0, 0.5, 0.1], y: [0, 1, 0.2], div: 5, xl: 'mass / kg', yl: `(period)${sup(2)} / s${sup(2)}`, curves: [{ f: x => grad * x, from: 0, to: 0.5 }] });
  return { stem: `A student measures the period <i>T</i> of a mass–spring system for different masses <i>m</i>. <b>Figure 1</b> shows a graph of <i>T</i><sup>2</sup> against <i>m</i>.`, figs: [fig],
    parts: [
      { q: 'Determine the gradient of the graph.', marks: 2, ans: grad, unit: 's<sup>2</sup> kg<sup>−1</sup>', show: A(grad), tol: .05, ms: `Uses a triangle that covers at least half of the line ✓<br>${eq(`gradient = ${N(grad * .5, 3)} / 0.50 = ${A(grad)} s<sup>2</sup> kg<sup>−1</sup>`)} ✓` },
      calc('Use the gradient to calculate the spring constant.', 3, k, 'N m<sup>−1</sup>', `${eq('<i>T</i><sup>2</sup> = (4π<sup>2</sup>/<i>k</i>)<i>m</i>, so gradient = 4π<sup>2</sup>/<i>k</i>')} ✓<br>${eq(`<i>k</i> = 4π<sup>2</sup> / ${A(grad)}`)} ✓<br>${eq(`<i>k</i> = ${N(k, 3)} N m<sup>−1</sup>`)} ✓`, { show: N(k, 3), tol: .05 }),
      calc('Calculate the period of the system when the mass is 0.30 kg.', 1, T3, 's', `${eq(`<i>T</i> = √(${A(grad)} × 0.30) = ${A(T3)} s`)} ✓`, { tol: .05 }),
      text('In practice the line does not pass exactly through the origin. Suggest why.', 1, 'The spring itself has mass, which also oscillates (so there is a period even with no added mass) ✓')
    ] };
};
/* --- forced vibrations and resonance --- */
T.FV1 = R => ({ stem: `Oscillating systems can undergo free vibrations and forced vibrations.`,
  parts: [
    text('State what is meant by free vibrations.', 1, 'Oscillations with no external periodic force acting, so the system oscillates at its natural frequency ✓'),
    text('State what is meant by forced vibrations.', 1, 'Oscillations produced by an external periodic driving force; the system oscillates at the frequency of the driver ✓'),
    text('Explain what is meant by resonance.', 2, 'It occurs when the driving frequency is equal to the natural frequency of the system ✓<br>The amplitude of the oscillations is then a maximum (energy is transferred most efficiently from the driver) ✓'),
    text('State the phase difference between the driver and the driven system at resonance.', 1, 'π/2 rad (90°), with the displacement of the driven system lagging behind the driver ✓'),
    text(R.chance(.5) ? 'Give one example of resonance that is useful and one example that is a nuisance or a danger.' : 'Give two examples of resonance, one useful and one harmful.', 2, 'Useful: tuning a radio circuit, a microwave oven, musical instruments (stationary waves) or MRI ✓<br>Harmful: vibration of a bridge in the wind or under marching feet, or of parts of a car or washing machine at certain speeds ✓')
  ] });
T.FV2 = R => {
  const k = R.pick([50, 80, 200]), m = R.pick([0.20, 0.50]), f0 = Math.sqrt(k / m) / (2 * PI);
  return { stem: `A mass of ${N(m, 2)} kg hangs from a spring of spring constant ${k} N m<sup>−1</sup>. The top of the spring is attached to a vibration generator, whose frequency can be varied.`,
    parts: [
      calc('Calculate the natural frequency of the mass–spring system.', 2, f0, 'Hz', `${eq(`<i>f</i> = (1/2π)√(<i>k</i>/<i>m</i>) = (1/2π)√(${k} / ${N(m, 2)})`)} ✓<br>${eq(`<i>f</i> = ${A(f0)} Hz`)} ✓`),
      text('The frequency of the vibration generator is increased slowly from zero to a value well above the natural frequency.<br>Describe how the amplitude of the mass changes.', 3, 'At low frequencies the amplitude is small (about equal to that of the driver) ✓<br>It increases to a sharp maximum when the driving frequency equals the natural frequency ✓<br>It then decreases, becoming very small at high frequencies ✓'),
      text('The mass is now made to oscillate in a beaker of water, which increases the damping.<br>State two ways in which the graph of amplitude against driving frequency changes.', 2, 'The maximum amplitude is smaller ✓<br>The peak is broader (and occurs at a slightly lower frequency) ✓')
    ] };
};
T.FV3 = R => {
  const n = R.pick([3, 5]), pc = R.pick([10, 20]), fr = Math.pow(1 - pc / 100, n);
  return { stem: `The oscillations of real systems are damped.`,
    parts: [
      text('State what is meant by damping.', 1, 'The removal of energy from an oscillating system by resistive forces, so that the amplitude decreases ✓'),
      text('Describe the motion of a lightly damped system after it is displaced and released.', 2, 'It oscillates with an amplitude that decreases gradually (exponentially) with time ✓<br>The period stays (almost) constant ✓'),
      text('Describe the motion of a critically damped system after it is displaced and released.', 2, 'It returns to the equilibrium position without oscillating ✓<br>in the shortest possible time ✓'),
      text('State how the motion of a heavily (over-) damped system differs from this.', 1, 'It also returns without oscillating, but takes longer to reach equilibrium ✓'),
      calc(`The amplitude of a lightly damped oscillator decreases by ${pc}% in each cycle.<br>Calculate the fraction of the original amplitude that remains after ${n} cycles.`, 2, fr, '', `${eq(`(${(1 - pc / 100).toFixed(2)})<sup>${n}</sup>`)} ✓<br>${eq(`= ${A(fr)}`)} ✓`)
    ] };
};
T.FV4 = R => {
  const L = R.pick([0.25, 0.40, 0.64]), Tp = 2 * PI * Math.sqrt(L / G);
  return { stem: `In a demonstration of resonance, several light pendulums of different lengths hang from a horizontal string. A heavy “driver” pendulum of length ${N(L, 2)} m hangs from the same string and is set swinging. After a short time all the light pendulums are oscillating.`,
    parts: [
      calc('Calculate the period of the driver pendulum.', 2, Tp, 's', `${eq(`<i>T</i> = 2π√(<i>l</i>/<i>g</i>) = 2π√(${N(L, 2)} / 9.81)`)} ✓<br>${eq(`<i>T</i> = ${A(Tp)} s`)} ✓`),
      text('State the frequency at which every light pendulum oscillates.', 1, `The frequency of the driver pendulum, ${A(1 / Tp)} Hz ✓`),
      text('State and explain which light pendulum oscillates with the largest amplitude.', 2, `The one of length ${N(L, 2)} m ✓<br>Its natural frequency is equal to the driving frequency, so it resonates ✓`),
      text('Compare the phase of this pendulum, and of a much shorter pendulum, with the phase of the driver.', 2, 'The pendulum of the same length lags a quarter of a cycle (π/2 rad) behind the driver ✓<br>A much shorter pendulum oscillates almost in phase with the driver ✓')
    ] };
};
T.FV5 = R => {
  const [m, k] = R.pick([[2.0e5, 8.0e6], [2.0e5, 2.0e7], [5.0e5, 2.0e7], [1.0e5, 1.6e7]]), f0 = Math.sqrt(k / m) / (2 * PI), fw = R.pick([1.0, 1.6, 2.0]), near = Math.abs(fw - f0) / f0 < .12;
  return { stem: `A footbridge can be modelled as a mass of ${N(m, 2)} kg supported by a spring of spring constant ${N(k, 2)} N m<sup>−1</sup>. People walking across the bridge apply a periodic force to it at a frequency of ${N(fw, 2)} Hz.`,
    parts: [
      calc('Calculate the natural frequency of the bridge.', 2, f0, 'Hz', `${eq(`<i>f</i> = (1/2π)√(<i>k</i>/<i>m</i>) = (1/2π)√(${N(k, 2)} / ${N(m, 2)})`)} ✓<br>${eq(`<i>f</i> = ${A(f0)} Hz`)} ✓`),
      text('State and explain whether the bridge is likely to oscillate with a large amplitude.', 2, `${near ? 'Yes' : 'No'} ✓<br>The driving frequency of ${N(fw, 2)} Hz is ${near ? 'close to' : 'not close to'} the natural frequency of ${A(f0)} Hz, so resonance ${near ? 'occurs' : 'does not occur'} ✓`),
      text('Describe two ways in which engineers can reduce large oscillations of a bridge.', 2, 'Fit dampers, which remove energy from the oscillations ✓<br>Change the stiffness or the mass of the bridge so that its natural frequency is well away from the driving frequency ✓'),
      text('Explain why a column of soldiers is told to break step when crossing a bridge.', 1, 'Marching in step applies a regular periodic force, which could match the natural frequency of the bridge and cause resonance ✓')
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
