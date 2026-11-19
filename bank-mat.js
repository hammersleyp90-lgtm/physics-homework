/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_MAT = (function(){
const module = undefined;
'use strict';
/* Question types for AQA materials (3.4.2). */
const TOPICS = { HK: 'Density and Hooke’s law', SN: 'Elastic strain energy', YM: 'Stress, strain and the Young modulus' };
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
/* ---------- materials (AQA 3.4.2) ---------- */
const G = 9.81;
/* --- density and Hooke's law --- */
T.HK1 = R => {
  const [metal, rho] = R.pick([['aluminium', 2700], ['copper', 8960], ['steel', 7850], ['brass', 8500], ['lead', 11300]]), d = R.pick([8.0, 10, 12, 20]), L = R.pick([5.0, 8.0, 12]), L2 = R.pick([1.5, 2.0, 2.5]);
  const V = PI * Math.pow(d / 2e3, 2) * L / 100, m = r3(rho * V * 1000), rc = m / 1000 / V, m2 = rc * PI * Math.pow(d / 2e3, 2) * L2;
  return { stem: `A solid cylindrical rod of ${metal} has a diameter of ${N(d, 2)} mm and a length of ${N(L, 2)} cm. Its mass is ${N(m, 3)} g.`,
    parts: [
      text('State what is meant by density.', 1, 'Mass per unit volume ✓'),
      calc('Calculate the volume of the rod in m<sup>3</sup>.', 3, V, 'm<sup>3</sup>', `Radius ${eq(`= ${N(d / 2e3, 2)} m`)} and length ${eq(`= ${N(L / 100, 2)} m`)} ✓<br>${eq(`<i>V</i> = π<i>r</i><sup>2</sup><i>L</i> = π × (${N(d / 2e3, 2)})<sup>2</sup> × ${N(L / 100, 2)}`)} ✓<br>${eq(`<i>V</i> = ${A(V)} m<sup>3</sup>`)} ✓`, { guide: ['Award a maximum of two marks if the diameter is used in place of the radius.'] }),
      calc(`Calculate the density of the ${metal}.`, 2, rc, KGM3, `${eq(`<i>ρ</i> = <i>m</i>/<i>V</i> = ${N(m / 1000, 3)} / ${A(V)}`)} ✓<br>${eq(`<i>ρ</i> = ${A(rc)} ${KGM3}`)} ✓`),
      calc(`Calculate the mass of a ${N(L2, 2)} m length of rod of the same diameter.`, 2, m2, 'kg', `${eq(`<i>m</i> = <i>ρ</i>π<i>r</i><sup>2</sup><i>L</i> = ${A(rc)} × π × (${N(d / 2e3, 2)})<sup>2</sup> × ${N(L2, 2)}`)} ✓<br>${eq(`<i>m</i> = ${A(m2)} kg`)} ✓`)
    ] };
};
T.HK2 = R => {
  const [F, x] = R.pick([[4.0, 32], [6.0, 48], [8.0, 50], [10, 80], [5.0, 25]]), k = F / (x / 1000), F2 = R.pick([2.5, 3.0, 7.0]);
  return { stem: `A spring extends by ${x} mm when a load of ${N(F, 2)} N is hung from it. The spring obeys Hooke’s law.`,
    parts: [
      text('State Hooke’s law.', 2, 'The extension is directly proportional to the force applied ✓<br>up to the limit of proportionality ✓'),
      calc('Calculate the spring constant of the spring.', 2, k, 'N m<sup>−1</sup>', `${eq(`<i>k</i> = <i>F</i>/Δ<i>L</i> = ${N(F, 2)} / ${N(x / 1000, 2)}`)} ✓<br>${eq(`<i>k</i> = ${A(k)} N m<sup>−1</sup>`)} ✓`, { guide: ['Award one mark if mm is not converted to m.'] }),
      calc(`Calculate the extension of the spring when the load is ${N(F2, 2)} N.`, 1, F2 / k, 'm', `${eq(`Δ<i>L</i> = ${N(F2, 2)} / ${A(k)} = ${A(F2 / k)} m`)} ✓`),
      calc(`Calculate the elastic strain energy stored in the spring when the load is ${N(F, 2)} N.`, 2, .5 * F * x / 1000, 'J', `${eq(`<i>E</i> = ½<i>F</i>Δ<i>L</i> = ½ × ${N(F, 2)} × ${N(x / 1000, 2)}`)} ✓<br>${eq(`<i>E</i> = ${A(.5 * F * x / 1000)} J`)} ✓`)
    ] };
};
T.HK3 = R => {
  const k = R.pick([20, 25, 40, 50]), W = R.pick([2.0, 4.0, 5.0]), x = W / k;
  return { stem: `Two identical springs each have a spring constant of ${k} N m<sup>−1</sup>. The springs have negligible mass and obey Hooke’s law. A load of ${N(W, 2)} N is available.`,
    parts: [
      calc('Calculate the extension of one spring when the load hangs from it.', 2, x, 'm', `${eq(`Δ<i>L</i> = <i>F</i>/<i>k</i> = ${N(W, 2)} / ${k}`)} ✓<br>${eq(`Δ<i>L</i> = ${A(x)} m`)} ✓`),
      calc('The springs are joined end to end (in series) and the load is hung from them.<br>Calculate the total extension.', 2, 2 * x, 'm', `Each spring carries the full load, so each extends by ${A(x)} m ✓<br>${eq(`2 × ${A(x)} = ${A(2 * x)} m`)} ✓`),
      calc('The springs are now hung side by side (in parallel) and the load is shared equally between them.<br>Calculate the extension.', 2, x / 2, 'm', `Each spring carries half the load, ${N(W / 2, 2)} N ✓<br>${eq(`Δ<i>L</i> = ${N(W / 2, 2)} / ${k} = ${A(x / 2)} m`)} ✓`),
      calc('Calculate the effective spring constant of the two springs in series.', 1, k / 2, 'N m<sup>−1</sup>', `${eq(`${N(W, 2)} / ${A(2 * x)} = ${A(k / 2)} N m<sup>−1</sup>`)} ✓`)
    ] };
};
T.HK4 = R => {
  const k = R.pick([25, 40, 50]), m = R.pick([0.10, 0.20]), E8 = .5 * k * .08 * .08;
  const fig = graph({ x: [0, 10, 2], y: [0, 5, 1], div: 5, xl: 'extension / cm', yl: 'force / N', curves: [{ f: x => k * x / 100, from: 0, to: 10 }] });
  return { stem: `<b>Figure 1</b> shows how the force applied to a spring varies with its extension.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the spring constant of the spring in N m<sup>−1</sup>.', marks: 3, ans: k, unit: 'N m<sup>−1</sup>', show: String(k), tol: .05, ms: `The spring constant is the gradient of the graph ✓<br>gradient ${eq(`= ${N(k / 10, 2)} / 0.10`)}, with the extension in m ✓<br>${eq(`<i>k</i> = ${k} N m<sup>−1</sup>`)} ✓`, guide: ['Award a maximum of two marks if cm is not converted to m.'] },
      { q: 'Determine the elastic strain energy stored in the spring when its extension is 8.0 cm.', marks: 2, ans: E8, unit: 'J', show: A(E8), tol: .06, ms: `Energy = area under the graph ${eq(`= ½ × ${N(k * .08, 2)} × 0.080`)} ✓<br>${eq(`= ${A(E8)} J`)} ✓` },
      calc(`A mass of ${N(m, 2)} kg is hung from the spring.<br>Calculate the extension of the spring.`, 2, m * G / k, 'm', `${eq(`<i>F</i> = <i>mg</i> = ${N(m, 2)} × 9.81 = ${A(m * G)} N`)} ✓<br>${eq(`Δ<i>L</i> = ${A(m * G)} / ${k} = ${A(m * G / k)} m`)} ✓`, { tol: .05 }),
      text('State how the graph would show that the limit of proportionality had been exceeded.', 1, 'It would stop being a straight line (it would curve, with a larger extension for each extra newton) ✓')
    ] };
};
T.HK5 = R => {
  const [alloy, a, ra, b, rb] = R.pick([['brass', 'copper', 8960, 'zinc', 7130], ['solder', 'tin', 7310, 'lead', 11340], ['bronze', 'copper', 8960, 'tin', 7310]]), ma = R.pick([140, 210, 280]), mb = R.pick([60, 90, 120]), Va = ma / 1000 / ra, Vb = mb / 1000 / rb, rho = (ma + mb) / 1000 / (Va + Vb);
  return { stem: `A sample of ${alloy} is made by melting together ${ma} g of ${a} and ${mb} g of ${b}.<br>density of ${a} = ${ra} ${KGM3}<br>density of ${b} = ${rb} ${KGM3}`,
    parts: [
      calc(`Calculate the volume of the ${a}.`, 2, Va, 'm<sup>3</sup>', `${eq(`<i>V</i> = <i>m</i>/<i>ρ</i> = ${N(ma / 1000, 2)} / ${ra}`)} ✓<br>${eq(`<i>V</i> = ${A(Va)} m<sup>3</sup>`)} ✓`),
      calc(`Calculate the volume of the ${b}.`, 1, Vb, 'm<sup>3</sup>', `${eq(`${N(mb / 1000, 2)} / ${rb} = ${A(Vb)} m<sup>3</sup>`)} ✓`),
      calc(`Calculate the density of the ${alloy}.`, 2, rho, KGM3, `${eq(`<i>ρ</i> = total mass / total volume = ${N((ma + mb) / 1000, 2)} / (${A(Va)} + ${A(Vb)})`)} ✓<br>${eq(`<i>ρ</i> = ${A(rho)} ${KGM3}`)} ✓`),
      text('State the assumption made in this calculation.', 1, 'The volume of the alloy is equal to the sum of the volumes of the two metals (there is no change in volume on mixing) ✓')
    ] };
};
T.HK6 = R => {
  const k = R.pick([24, 28, 32, 36]), m = R.pick([200, 300, 400]);
  return { stem: `A student is asked to determine the spring constant of a spring using a clamp stand, a metre ruler and a set of 100 g masses.`,
    parts: [
      text('Describe how the student should carry out the experiment and use the results to find the spring constant.', 4, 'Measure the length of the spring with no load, using the ruler clamped vertically beside it ✓<br>Add the masses one at a time, measuring the new length each time and calculating the extension ✓<br>Plot a graph of force (weight of the masses) against extension ✓<br>The spring constant is the gradient of the straight-line part of the graph ✓'),
      text('State one way of reducing the uncertainty in the measurements of extension.', 1, 'Use a pointer (or set square) on the spring and read the scale at eye level to avoid parallax error (or: repeat the readings while unloading and take a mean) ✓'),
      text('State one safety precaution.', 1, 'Wear eye protection in case the spring snaps or flies off (or: clamp the stand to the bench; keep feet clear of falling masses) ✓'),
      calc(`The student finds that the spring constant is ${k} N m<sup>−1</sup>.<br>Calculate the extension of the spring when a total mass of ${m} g hangs from it.`, 2, m / 1000 * G / k, 'm', `${eq(`<i>F</i> = ${N(m / 1000, 2)} × 9.81 = ${A(m / 1000 * G)} N`)} ✓<br>${eq(`Δ<i>L</i> = ${A(m / 1000 * G)} / ${k} = ${A(m / 1000 * G / k)} m`)} ✓`)
    ] };
};
/* --- elastic strain energy --- */
T.SN1 = R => {
  const k = R.pick([200, 400, 500, 800]), x = R.pick([0.040, 0.050, 0.080]), m = R.pick([0.050, 0.10, 0.20]), E = .5 * k * x * x, v = Math.sqrt(2 * E / m);
  return { stem: `A spring of spring constant ${k} N m<sup>−1</sup> is compressed by ${N(x, 2)} m and used to launch a trolley of mass ${N(m, 2)} kg along a smooth horizontal track.`,
    parts: [
      calc('Calculate the maximum force exerted by the spring.', 1, k * x, 'N', `${eq(`<i>F</i> = <i>k</i>Δ<i>L</i> = ${k} × ${N(x, 2)} = ${A(k * x)} N`)} ✓`),
      calc('Calculate the elastic strain energy stored in the compressed spring.', 2, E, 'J', `${eq(`<i>E</i> = ½<i>k</i>Δ<i>L</i><sup>2</sup> = ½ × ${k} × ${N(x, 2)}<sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      calc('Calculate the speed of the trolley as it leaves the spring. Assume that all the stored energy is transferred to the trolley.', 2, v, MS1, `${eq(`½<i>mv</i><sup>2</sup> = ${A(E)}, so <i>v</i> = √(2 × ${A(E)} / ${N(m, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text('The spring is now compressed by twice the distance.<br>State the effect on the energy stored and on the speed of the trolley.', 2, 'The energy stored is four times as great ✓<br>The speed is twice as great ✓')
    ] };
};
T.SN2 = R => {
  const Fm = R.pick([8, 10]), xm = 20, Wl = 2 / 3 * Fm * xm / 100, Wd = Fm * xm / 100 / 3;
  const fig = graph({ x: [0, 20, 5], y: [0, 10, 2], div: 5, xl: 'extension / cm', yl: 'force / N', curves: [{ f: x => Fm * Math.sqrt(x / xm), from: 0, to: xm, name: 'loading', at: [5, Fm * .5 + 1.6] }, { f: x => Fm * x * x / (xm * xm), from: 0, to: xm, name: 'unloading', at: [14.5, Fm * .5 - 2.6] }] });
  return { stem: `<b>Figure 1</b> shows how the force on a rubber band varies with its extension as it is stretched (loading) and then allowed to shorten again (unloading).`, figs: [fig],
    parts: [
      text('State and explain whether the rubber band obeys Hooke’s law.', 1, 'No: the graph is not a straight line, so the extension is not proportional to the force ✓'),
      text('State and explain whether the deformation of the rubber band is elastic.', 1, 'Yes: the extension returns to zero when the force is removed ✓'),
      text('State what is represented by the area between the loading curve and the unloading curve.', 1, 'The energy dissipated in the rubber band (transferred to thermal energy) during one cycle ✓'),
      { q: 'Use <b>Figure 1</b> to estimate the work done in stretching the rubber band to an extension of 20 cm.', marks: 3, ans: Wl, unit: 'J', show: A(Wl), tol: .12, ms: `Work done = area under the loading curve ✓<br>Counts squares (or uses trapezia) and converts using the area of one square, with the extension in m ✓<br>${eq(`<i>W</i> ≈ ${A(Wl)} J`)} ✓`, guide: [`Allow ${N(Wl * .9, 2)} to ${N(Wl * 1.1, 2)} J.`] },
      { q: 'Estimate the energy dissipated in the rubber band during the cycle.', marks: 2, ans: Wd, unit: 'J', show: A(Wd), tol: .2, ms: `Area between the two curves (or work done in loading minus the area under the unloading curve) ✓<br>${eq(`≈ ${A(Wd)} J`)} ✓`, guide: [`Allow ${N(Wd * .8, 2)} to ${N(Wd * 1.2, 2)} J.`] }
    ] };
};
T.SN3 = R => {
  const m = R.pick([60, 70, 80]), L0 = R.pick([15, 20, 25]), x = R.pick([18, 20, 24]), Ep = m * G * (L0 + x), k = 2 * Ep / (x * x), Fm = k * x;
  return { stem: `A bungee jumper of mass ${m} kg steps off a platform attached to an elastic cord of unstretched length ${L0} m. At the lowest point of the jump the cord has stretched by ${x} m and the jumper is momentarily at rest. Air resistance is negligible and the cord obeys Hooke’s law.`,
    parts: [
      calc('Calculate the gravitational potential energy lost by the jumper between the platform and the lowest point.', 2, Ep, 'J', `Height fallen ${eq(`= ${L0} + ${x} = ${L0 + x} m`)} ✓<br>${eq(`${m} × 9.81 × ${L0 + x} = ${A(Ep)} J`)} ✓`),
      text('State the elastic strain energy stored in the cord at the lowest point. Explain your answer.', 2, `${A(Ep)} J ✓<br>The jumper has no kinetic energy at the lowest point, so all the gravitational potential energy lost has been transferred to the cord ✓`),
      calc('Calculate the spring constant of the cord.', 2, k, 'N m<sup>−1</sup>', `${eq(`½<i>k</i>Δ<i>L</i><sup>2</sup> = ${A(Ep)}, so <i>k</i> = (2 × ${A(Ep)}) / ${x}<sup>2</sup>`)} ✓<br>${eq(`<i>k</i> = ${A(k)} N m<sup>−1</sup>`)} ✓`),
      calc('Calculate the tension in the cord at the lowest point.', 1, Fm, 'N', `${eq(`<i>F</i> = <i>k</i>Δ<i>L</i> = ${A(k)} × ${x} = ${A(Fm)} N`)} ✓`),
      calc('Calculate the acceleration of the jumper at the lowest point.', 2, (Fm - m * G) / m, MS2, `Resultant force ${eq(`= ${A(Fm)} − (${m} × 9.81) = ${A(Fm - m * G)} N`)} upwards ✓<br>${eq(`<i>a</i> = ${A(Fm - m * G)} / ${m} = ${A((Fm - m * G) / m)} ${MS2}`)} ✓`)
    ] };
};
T.SN4 = R => {
  const k = R.pick([150, 200, 300]), x = R.pick([0.050, 0.060, 0.080]), m = R.pick([0.020, 0.025, 0.040]), E = .5 * k * x * x, h = E / (m * G), ha = r2(h * R.pick([.7, .8, .85])), eff = m * G * ha / E;
  return { stem: `A toy launcher fires a ball of mass ${N(m, 2)} kg vertically upwards. The spring in the launcher has a spring constant of ${k} N m<sup>−1</sup> and is compressed by ${N(x, 2)} m before the ball is released.`,
    parts: [
      calc('Calculate the elastic strain energy stored in the compressed spring.', 2, E, 'J', `${eq(`<i>E</i> = ½<i>k</i>Δ<i>L</i><sup>2</sup> = ½ × ${k} × ${N(x, 2)}<sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      calc('Calculate the maximum height the ball could reach if all this energy were transferred to gravitational potential energy.', 2, h, 'm', `${eq(`<i>mg</i>Δ<i>h</i> = ${A(E)}, so Δ<i>h</i> = ${A(E)} / (${N(m, 2)} × 9.81)`)} ✓<br>${eq(`Δ<i>h</i> = ${A(h)} m`)} ✓`),
      calc(`The ball actually rises ${N(ha, 2)} m.<br>Calculate the efficiency of the energy transfer.`, 2, eff, '', `Useful energy ${eq(`= ${N(m, 2)} × 9.81 × ${N(ha, 2)} = ${N(m * G * ha, 4)} J`)} ✓<br>efficiency ${eq(`= ${N(m * G * ha, 4)} / ${N(E, 4)} = ${A(eff)}`)} ✓`),
      text('Suggest one reason why the ball does not reach the calculated height.', 1, 'Some energy is transferred to thermal energy by friction in the launcher or by air resistance (or to kinetic energy of the spring) ✓')
    ] };
};
T.SN5 = R => {
  const [F1, F2, perm] = R.pick([[80, 100, 5.5], [60, 90, 5.0], [80, 80, 6.0]]), k = F1 / 2e-3, W = (.5 * 2 * F1 + .5 * (F1 + F2) * 6) / 1000, rec = .5 * F2 * (8 - perm) / 1000;
  const fig = graph({ x: [0, 10, 2], y: [0, 100, 20], div: 5, xl: 'extension / mm', yl: 'force / N', curves: [{ f: pw([[0, 0], [2, F1], [8, F2]]), from: 0, to: 8, name: 'loading', at: [4.2, Math.min(96, (F1 + F2) / 2 + 9)] }, { f: pw([[perm, 0], [8, F2]]), from: perm, to: 8, name: 'unloading', at: [8.6, F2 / 2] }] });
  return { stem: `<b>Figure 1</b> shows how the force on a copper wire varies with its extension as the wire is loaded and then unloaded.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the permanent extension of the wire.', marks: 1, ans: perm, unit: 'mm', show: N(perm, 2), tol: .05, ms: `${N(perm, 2)} mm (where the unloading line meets the extension axis) ✓` },
      { q: 'Determine the stiffness (force per unit extension) of the wire for small extensions, in N m<sup>−1</sup>.', marks: 2, ans: k, unit: 'N m<sup>−1</sup>', show: A(k), tol: .06, ms: `gradient of the first straight section ${eq(`= ${F1} / (2.0 × 10<sup>−3</sup>)`)} ✓<br>${eq(`= ${A(k)} N m<sup>−1</sup>`)} ✓` },
      { q: 'Determine the total work done in stretching the wire to an extension of 8.0 mm.', marks: 3, ans: W, unit: 'J', show: A(W), tol: .06, ms: `Work done = area under the loading line ✓<br>${eq(`(½ × 2.0 × 10<sup>−3</sup> × ${F1}) + (½ × (${F1} + ${F2}) × 6.0 × 10<sup>−3</sup>)`)} ✓<br>${eq(`= ${A(W)} J`)} ✓`, guide: ['Award a maximum of two marks if mm is not converted to m.'] },
      { q: 'Determine the energy recovered when the wire is unloaded.', marks: 2, ans: rec, unit: 'J', show: A(rec), tol: .08, ms: `Area under the unloading line ${eq(`= ½ × ${F2} × (8.0 − ${N(perm, 2)}) × 10<sup>−3</sup>`)} ✓<br>${eq(`= ${A(rec)} J`)} ✓` },
      text('State what has happened to the rest of the work done on the wire.', 1, 'It has been used to deform the wire permanently (plastic deformation) and is transferred to thermal energy in the wire ✓')
    ] };
};
/* --- stress, strain and the Young modulus --- */
const METALS = [['steel', 2.0e11], ['copper', 1.2e11], ['brass', 1.0e11], ['aluminium', 7.0e10]];
T.YM1 = R => {
  const [metal, E0] = R.pick(METALS), d = R.pick([0.28, 0.36, 0.45, 0.56]), L = R.pick([1.5, 2.0, 2.5, 3.0]), F = R.pick([20, 30, 40, 50]), Ar = PI * Math.pow(d / 2e3, 2), x = r2(F * L / (Ar * E0) * 1000), stress = F / Ar, strain = x / 1000 / L, E = stress / strain;
  return { stem: `A ${metal} wire of length ${N(L, 2)} m and diameter ${N(d, 2)} mm is stretched by a force of ${F} N. The extension of the wire is ${N(x, 2)} mm.`,
    parts: [
      calc('Calculate the cross-sectional area of the wire.', 2, Ar, 'm<sup>2</sup>', `${eq(`<i>A</i> = π<i>r</i><sup>2</sup> = π × (${N(d / 2e3, 2)})<sup>2</sup>`)} ✓<br>${eq(`<i>A</i> = ${A(Ar)} m<sup>2</sup>`)} ✓`),
      calc('Calculate the tensile stress in the wire.', 2, stress, 'Pa', `${eq(`stress = <i>F</i>/<i>A</i> = ${F} / ${A(Ar)}`)} ✓<br>${eq(`= ${A(stress)} Pa`)} ✓`),
      calc('Calculate the tensile strain of the wire.', 1, strain, '', `${eq(`strain = Δ<i>L</i>/<i>L</i> = ${N(x / 1000, 2)} / ${N(L, 2)} = ${A(strain)}`)} ✓`),
      calc(`Calculate the Young modulus of the ${metal}.`, 2, E, 'Pa', `${eq(`<i>E</i> = stress / strain = ${A(stress)} / ${A(strain)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} Pa`)} ✓`)
    ] };
};
T.YM2 = R => {
  const [metal, E] = R.pick(METALS), d = R.pick([0.50, 0.80, 1.0, 1.2]), L = R.pick([2.0, 3.0, 4.0]), F = R.pick([60, 80, 120, 150]), Ar = PI * Math.pow(d / 2e3, 2), stress = F / Ar, strain = stress / E, x = strain * L;
  return { stem: `A ${metal} wire of length ${N(L, 2)} m and diameter ${N(d, 2)} mm supports a load of ${F} N. The Young modulus of ${metal} is ${N(E, 2)} Pa.`,
    parts: [
      calc('Calculate the tensile stress in the wire.', 3, stress, 'Pa', `${eq(`<i>A</i> = π × (${N(d / 2e3, 2)})<sup>2</sup> = ${A(Ar)} m<sup>2</sup>`)} ✓<br>${eq(`stress = ${F} / ${A(Ar)}`)} ✓<br>${eq(`= ${A(stress)} Pa`)} ✓`),
      calc('Calculate the tensile strain of the wire.', 2, strain, '', `${eq(`strain = stress / <i>E</i> = ${A(stress)} / ${N(E, 2)}`)} ✓<br>${eq(`= ${A(strain)}`)} ✓`),
      calc('Calculate the extension of the wire.', 1, x, 'm', `${eq(`Δ<i>L</i> = strain × <i>L</i> = ${A(strain)} × ${N(L, 2)} = ${A(x)} m`)} ✓`),
      calc('Calculate the elastic strain energy stored in the wire.', 2, .5 * F * x, 'J', `${eq(`<i>E</i> = ½<i>F</i>Δ<i>L</i> = ½ × ${F} × ${A(x)}`)} ✓<br>${eq(`= ${A(.5 * F * x)} J`)} ✓`)
    ] };
};
T.YM3 = R => {
  const [E, sp] = R.pick([[100, 200], [120, 240], [70, 140]]), sm = sp * 1.4;
  const f = x => x <= 2 ? sp * x / 2 : x <= 8 ? sp + (sm - sp) * (1 - Math.pow((8 - x) / 6, 2)) : sm - (x - 8) * (x - 8) * sm * .02;
  const fig = graph({ x: [0, 10, 2], y: [0, 400, 100], div: 5, xl: `strain / 10${sup(-3)}`, yl: 'stress / MPa', curves: [{ f, from: 0, to: 10 }] });
  return { stem: `<b>Figure 1</b> shows a stress–strain graph for a metal wire that is stretched until it breaks.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the Young modulus of the metal in Pa.', marks: 3, ans: E * 1e9, unit: 'Pa', show: N(E * 1e9, 2), tol: .06, ms: `Young modulus = gradient of the straight section ✓<br>${eq(`(${sp} × 10<sup>6</sup>) / (2.0 × 10<sup>−3</sup>)`)} ✓<br>${eq(`<i>E</i> = ${N(E * 1e9, 2)} Pa`)} ✓`, guide: ['Award a maximum of two marks if the powers of ten on the axes are ignored.'] },
      { q: 'State the strain at the limit of proportionality.', marks: 1, ans: 2e-3, unit: '', show: '2.0 × 10<sup>−3</sup>', tol: .12, ms: `${eq('2.0 × 10<sup>−3</sup>')} (where the graph stops being a straight line) ✓` },
      { q: 'Use <b>Figure 1</b> to determine the ultimate tensile stress of the metal.', marks: 1, ans: sm * 1e6, unit: 'Pa', show: N(sm * 1e6, 3), tol: .05, ms: `The maximum stress on the graph, ${eq(`${N(sm, 3)} MPa = ${N(sm * 1e6, 3)} Pa`)} ✓` },
      text('Describe the behaviour of the wire at strains greater than the elastic limit.', 2, 'It deforms plastically: a small increase in stress gives a large increase in strain ✓<br>It does not return to its original length when the stress is removed (it has a permanent extension) ✓'),
      text('State and explain whether the metal is ductile or brittle.', 1, 'Ductile, because it undergoes a large plastic deformation before it breaks ✓')
    ] };
};
T.YM4 = R => {
  const [metal, E0] = R.pick(METALS.slice(0, 2)), d = R.pick([0.19, 0.25, 0.31]), L = R.pick([2.0, 2.5, 3.0]), Ar = PI * Math.pow(d / 2e3, 2), Gd = r3(E0 * Ar / L), E = Gd * L / Ar;
  return { stem: `A student determines the Young modulus of ${metal} by hanging loads from a long, thin wire and measuring its extension.`,
    parts: [
      text('State the measurements that must be made, other than the load, and a suitable instrument for each.', 3, 'Diameter of the wire, with a micrometer (at several places, taking a mean) ✓<br>Original length of the wire, with a metre ruler or tape measure ✓<br>Extension of the wire, with a vernier scale or travelling microscope (or a marker moving along a fixed mm scale) ✓'),
      calc(`The wire has a length of ${N(L, 2)} m and a diameter of ${N(d, 2)} mm. A graph of force against extension is a straight line with a gradient of ${N(Gd, 3)} N m<sup>−1</sup>.<br>Calculate the Young modulus of ${metal}.`, 3, E, 'Pa', `${eq(`<i>A</i> = π × (${N(d / 2e3, 3)})<sup>2</sup> = ${A(Ar)} m<sup>2</sup>`)} ✓<br>${eq(`<i>E</i> = <i>FL</i>/<i>A</i>Δ<i>L</i> = gradient × <i>L</i>/<i>A</i> = ${N(Gd, 3)} × ${N(L, 2)} / ${A(Ar)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} Pa`)} ✓`),
      text('Explain why a long, thin wire is used.', 1, 'It gives a larger extension for a given load, which reduces the percentage uncertainty in the extension ✓'),
      text('State one safety precaution for this experiment.', 1, 'Wear eye protection in case the wire snaps (or: place a padded tray under the load; keep feet clear) ✓')
    ] };
};
T.YM5 = R => {
  const sb = R.pick([4.0e8, 5.0e8, 1.1e9]), d = R.pick([6.0, 8.0, 10, 12]), sf = R.pick([4, 5]), Ar = PI * Math.pow(d / 2e3, 2), Fm = sb * Ar;
  return { stem: `A steel cable of diameter ${N(d, 2)} mm is used to support loads. The breaking stress of the steel is ${N(sb, 2)} Pa.`,
    parts: [
      text('State what is meant by tensile stress and by breaking stress.', 2, 'Tensile stress is the tensile force per unit cross-sectional area ✓<br>Breaking stress is the stress at which the material breaks (fractures) ✓'),
      calc('Calculate the maximum load that the cable can support before it breaks.', 3, Fm, 'N', `${eq(`<i>A</i> = π × (${N(d / 2e3, 2)})<sup>2</sup> = ${A(Ar)} m<sup>2</sup>`)} ✓<br>${eq(`<i>F</i> = stress × <i>A</i> = ${N(sb, 2)} × ${A(Ar)}`)} ✓<br>${eq(`<i>F</i> = ${A(Fm)} N`)} ✓`),
      calc(`For safety, the working load must be no more than one ${sf === 4 ? 'quarter' : 'fifth'} of this value.<br>Calculate the maximum working load.`, 1, Fm / sf, 'N', `${eq(`${A(Fm)} / ${sf} = ${A(Fm / sf)} N`)} ✓`),
      text('Describe the stress–strain graph for a brittle material such as glass.', 2, 'A straight line through the origin up to the point of fracture ✓<br>There is no (or very little) plastic deformation before it breaks ✓')
    ] };
};
T.YM6 = R => {
  const n = R.pick([2, 3]), kd = R.pick([2, 0.5]), xA = R.pick([1.2, 2.0, 3.0]), st = R.pick([8.0e7, 1.2e8, 1.5e8]), sn = R.pick([6.0e-4, 8.0e-4, 1.0e-3]), ratio = n / (kd * kd);
  return { stem: `Two wires <b>A</b> and <b>B</b> are made from the same metal. <b>B</b> is ${n === 2 ? 'twice' : 'three times'} as long as <b>A</b> and has ${kd === 2 ? 'twice' : 'half'} the diameter of <b>A</b>. The same tensile force is applied to each wire, and both obey Hooke’s law.`,
    parts: [
      calc('Calculate the ratio stress in <b>B</b> ÷ stress in <b>A</b>.', 2, 1 / (kd * kd), '', `Area is proportional to diameter<sup>2</sup>, so the area of B is ${kd === 2 ? '4 times' : 'one quarter of'} the area of A ✓<br>ratio ${eq(`= ${A(1 / (kd * kd))}`)} ✓`),
      text('State the ratio strain in <b>B</b> ÷ strain in <b>A</b>. Give a reason.', 1, `${A(1 / (kd * kd))}, because strain = stress / Young modulus and the Young modulus is the same ✓`),
      calc(`The extension of <b>A</b> is ${N(xA, 2)} mm.<br>Calculate the extension of <b>B</b>.`, 2, xA * ratio, 'mm', `Extension = strain × length, so the ratio of extensions ${eq(`= ${A(1 / (kd * kd))} × ${n} = ${A(ratio)}`)} ✓<br>${eq(`${N(xA, 2)} × ${A(ratio)} = ${A(xA * ratio)} mm`)} ✓`),
      calc(`In another test, a wire is under a stress of ${N(st, 2)} Pa and has a strain of ${N(sn, 2)}.<br>Calculate the elastic strain energy stored per unit volume of the wire.`, 2, .5 * st * sn, 'J m<sup>−3</sup>', `${eq(`energy per unit volume = ½ × stress × strain = ½ × ${N(st, 2)} × ${N(sn, 2)}`)} ✓<br>${eq(`= ${A(.5 * st * sn)} J m<sup>−3</sup>`)} ✓`)
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
