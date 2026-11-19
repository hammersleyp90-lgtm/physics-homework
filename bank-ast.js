/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_AST = (function(){
const module = undefined;
'use strict';
/* Question types for AQA astrophysics (3.9). */
const TOPICS = { AT: 'Telescopes', AM: 'Magnitudes and distances', AB: 'Black-body radiation and stellar classification', AH: 'The Hertzsprung–Russell diagram and stellar evolution', AZ: 'Cosmology' };
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
/* ---------- astrophysics (AQA 3.9) ---------- */
const SIG = 5.67e-8, WIEN = 2.90e-3, PC = 3.08e16, LYR = 9.46e15, AUM = 1.50e11, LSUN = 3.85e26, RSUN = 6.96e8, MSUN = 1.99e30, GC = 6.67e-11, MPC = 3.08e22;
const SIGD = 'Stefan constant <i>σ</i> = 5.67 × 10<sup>−8</sup> W m<sup>−2</sup> K<sup>−4</sup>', WIEND = 'Wien constant = 2.90 × 10<sup>−3</sup> m K', PCD = '1 pc = 3.08 × 10<sup>16</sup> m = 3.26 light years', HD = 'Hubble constant <i>H</i> = 65 km s<sup>−1</sup> Mpc<sup>−1</sup>', CD = 'speed of light <i>c</i> = 3.00 × 10<sup>8</sup> m s<sup>−1</sup>';
const mg = x => (x < 0 ? '−' : x > 0 && false ? '+' : '') + Math.abs(x).toFixed(Math.abs(x * 10 % 1) > 1e-6 ? 2 : 1), lg = Math.log10;
/* --- telescopes --- */
T.AT1 = R => {
  const fo = R.pick([0.80, 1.2, 2.0]), fe = R.pick([0.020, 0.025, 0.050]), M = fo / fe;
  return { stem: `An astronomical refracting telescope is made from two converging lenses of focal lengths ${N(fo, 2)} m and ${N(fe, 2)} m. The telescope is used in normal adjustment.`,
    parts: [
      text('State which lens is used as the objective and give one other way in which the objective differs from the eyepiece.', 1, `The ${N(fo, 2)} m lens (the longer focal length); it also has the larger diameter, to collect more light ✓`),
      calc('Calculate the angular magnification of the telescope.', 2, M, '', `${eq(`<i>M</i> = <i>f</i><sub>o</sub>/<i>f</i><sub>e</sub> = ${N(fo, 2)} / ${N(fe, 2)}`)} ✓<br>${eq(`<i>M</i> = ${A(M)}`)} ✓`),
      calc('Calculate the distance between the two lenses.', 1, fo + fe, 'm', `${eq(`<i>f</i><sub>o</sub> + <i>f</i><sub>e</sub> = ${N(fo, 2)} + ${N(fe, 2)} = ${(fo + fe).toFixed(3)} m`)} ✓`, { show: (fo + fe).toFixed(3) }),
      text('Describe the main features of a ray diagram for this telescope, for light from a distant object that is off the principal axis.', 3, 'Parallel rays from the object arrive at the objective at an angle to the axis ✓<br>They are brought to a focus in the focal plane of the objective, forming a real, inverted intermediate image; this plane is also the focal plane of the eyepiece ✓<br>The rays leave the eyepiece parallel to each other (the final image is at infinity) and at a larger angle to the axis ✓')
    ] };
};
T.AT2 = R => {
  const al = R.pick([1.5e-4, 2.0e-4, 2.4e-4]), fo = R.pick([0.90, 1.2, 1.5]), fe = R.pick([0.010, 0.020, 0.030]), M = fo / fe, ls = [0.050, 0.25, 1.5].map(x => x * R.pick([1, 2]));
  return { stem: `When Jupiter is viewed without a telescope, it subtends an angle of ${N(al, 2)} rad at the eye. It is then viewed through a refracting telescope in normal adjustment. The objective has a focal length of ${N(fo, 2)} m and the eyepiece has a focal length of ${N(fe, 2)} m.`,
    parts: [
      text('State what is meant by the angular magnification of a telescope in normal adjustment.', 1, 'The angle subtended at the eye by the image ÷ the angle subtended at the unaided eye by the object ✓'),
      text('State what is meant by normal adjustment.', 1, 'The final image is formed at infinity (the lenses are separated by the sum of their focal lengths) ✓'),
      calc('Calculate the angle subtended at the eye by the image of Jupiter.', 2, M * al, 'rad', `${eq(`<i>M</i> = <i>f</i><sub>o</sub>/<i>f</i><sub>e</sub> = ${N(fo, 2)} / ${N(fe, 2)} = ${A(M)}`)} ✓<br>${eq(`angle = ${A(M)} × ${N(al, 2)} = ${A(M * al)} rad`)} ✓`),
      calc(`Three other converging lenses have focal lengths of ${N(ls[0], 2)} m, ${N(ls[1], 2)} m and ${N(ls[2], 2)} m.<br>Calculate the greatest angular magnification that can be obtained using two of these lenses as a telescope.`, 2, ls[2] / ls[0], '', `Use the longest focal length as the objective and the shortest as the eyepiece ✓<br>${eq(`<i>M</i> = ${N(ls[2], 2)} / ${N(ls[0], 2)} = ${A(ls[2] / ls[0])}`)} ✓`),
      text('State one disadvantage of using a very high magnification.', 1, 'The image is dimmer and any aberrations (or the limit of resolution) become more obvious; the field of view is smaller ✓')
    ] };
};
T.AT3 = R => ({ stem: `Most large optical telescopes are reflecting telescopes with the Cassegrain arrangement.`,
  parts: [
    text('Describe the Cassegrain arrangement.', 3, 'A large concave (parabolic) primary mirror collects the light ✓<br>A small convex secondary mirror, in front of the primary, reflects the light back ✓<br>through a hole in the centre of the primary mirror to the eyepiece or detector ✓'),
    text('Explain what is meant by chromatic aberration.', 2, 'A lens refracts different wavelengths by different amounts, so each colour is brought to a focus at a different point ✓<br>The image has coloured fringes (it cannot be sharply focused for all colours at once) ✓'),
    text('Explain what is meant by spherical aberration and how it is avoided in a reflecting telescope.', 2, 'Rays parallel to the axis that strike a spherical mirror (or lens) at different distances from the axis are brought to a focus at different points ✓<br>A parabolic mirror is used, which brings all rays parallel to the axis to the same focus ✓'),
    text(R.chance(.5) ? 'State one advantage, other than those related to aberrations, of a large reflecting telescope over a large refracting telescope.' : 'Give one reason, other than aberrations, why the largest telescopes are reflectors and not refractors.', 1, 'A mirror can be supported from behind, so it can be made much larger (a large lens sags under its own weight and is hard to make free of flaws) ✓')
  ] });
T.AT4 = R => {
  const v = find(() => { const D = R.pick([0.20, 1.0, 2.4, 8.0]), lam = R.pick([5.0e-7, 5.5e-7, 6.0e-7]), dl = R.pick([10, 50, 200]), s = R.pick([5.0, 20, 100]); const th = lam / D, an = s * AUM / (dl * LYR); return { D, lam, dl, s, th, an }; }, x => Math.abs(x.an - x.th) / x.th > .25);
  const ok = v.an > v.th;
  return { stem: `A telescope with an objective of diameter ${N(v.D, 2)} m is used to observe two stars that are ${N(v.s, 2)} AU apart and ${v.dl} light years from the Earth. The light has a wavelength of ${N(v.lam, 2)} m.<br>1 AU = 1.50 × 10<sup>11</sup> m<br>1 light year = 9.46 × 10<sup>15</sup> m`,
    parts: [
      text('State the Rayleigh criterion for two point sources to be just resolved.', 2, 'The central maximum of the diffraction pattern of one source ✓<br>coincides with the first minimum of the diffraction pattern of the other ✓'),
      calc('Calculate the minimum angular separation that the telescope can resolve.', 2, v.th, 'rad', `${eq(`<i>θ</i> ≈ <i>λ</i>/<i>D</i> = ${N(v.lam, 2)} / ${N(v.D, 2)}`)} ✓<br>${eq(`<i>θ</i> = ${A(v.th)} rad`)} ✓`),
      calc('Calculate the angular separation of the two stars as seen from the Earth.', 2, v.an, 'rad', `${eq(`angle = separation / distance = (${N(v.s, 2)} × 1.50 × 10<sup>11</sup>) / (${v.dl} × 9.46 × 10<sup>15</sup>)`)} ✓<br>${eq(`= ${A(v.an)} rad`)} ✓`),
      text('State and explain whether the telescope can resolve the two stars.', 1, `${ok ? 'Yes' : 'No'}: their angular separation is ${ok ? 'greater' : 'smaller'} than the minimum angle the telescope can resolve ✓`)
    ] };
};
T.AT5 = R => {
  const D1 = R.pick([0.10, 0.15]), D2 = R.pick([0.60, 1.2, 2.4]), ratio = D2 * D2 / (D1 * D1), re = Math.pow(D1 / 0.0070, 2);
  return { stem: `An amateur astronomer has a telescope with an objective of diameter ${N(D1, 2)} m. A university observatory has a telescope with an objective of diameter ${N(D2, 2)} m. Both telescopes use a CCD as the detector.`,
    parts: [
      calc('Calculate the ratio collecting power of the observatory telescope ÷ collecting power of the amateur telescope.', 2, ratio, '', `Collecting power is proportional to (diameter)<sup>2</sup> ✓<br>${eq(`(${N(D2, 2)} / ${N(D1, 2)})<sup>2</sup> = ${A(ratio)}`)} ✓`),
      calc('The pupil of a dark-adapted eye has a diameter of 7.0 mm.<br>Calculate how many times more light the amateur telescope collects than the unaided eye.', 2, re, '', `${eq(`(${N(D1, 2)} / 7.0 × 10<sup>−3</sup>)<sup>2</sup>`)} ✓<br>${eq(`= ${A(re)}`)} ✓`),
      text('State what is meant by the quantum efficiency of a detector.', 1, 'The percentage of the incident photons that are detected ✓'),
      text('State two advantages of a CCD over the eye as a detector for a telescope.', 2, 'Any two ✓✓:<br>Much higher quantum efficiency (about 80% compared with about 1%), so fainter objects can be detected.<br>It detects wavelengths outside the visible spectrum.<br>Long exposures can be used and the image is stored digitally for analysis.', ['The specification compares the eye and the CCD in terms of quantum efficiency, resolution and convenience of use. Accept a correct point about resolution.'])
    ] };
};
T.AT6 = R => {
  const D = R.pick([25, 64, 76]), th = 0.21 / D, tho = 5.0e-7 / 0.15;
  return { stem: `A radio telescope has a dish of diameter ${D} m and detects radio waves of wavelength 0.21 m. A small optical telescope has an objective of diameter 0.15 m and is used with light of wavelength 5.0 × 10<sup>−7</sup> m.`,
    parts: [
      calc('Calculate the minimum angular separation that the radio telescope can resolve.', 2, th, 'rad', `${eq(`<i>θ</i> ≈ <i>λ</i>/<i>D</i> = 0.21 / ${D}`)} ✓<br>${eq(`<i>θ</i> = ${A(th)} rad`)} ✓`),
      calc('Calculate the minimum angular separation that the optical telescope can resolve.', 1, tho, 'rad', `${eq(`5.0 × 10<sup>−7</sup> / 0.15 = ${A(tho)} rad`)} ✓`),
      text('State and explain which telescope has the better resolving power.', 1, 'The optical telescope: it can resolve a much smaller angle, because the ratio wavelength ÷ diameter is much smaller ✓'),
      text('Explain why the dish of a radio telescope can be made from wire mesh.', 1, 'The wavelength is much larger than the holes in the mesh, so the waves are reflected as if from a solid surface (the surface need only be accurate to about λ/20) ✓'),
      text('Explain why telescopes that detect X-rays or ultraviolet radiation are placed in orbit.', 2, 'These wavelengths are absorbed by the atmosphere of the Earth ✓<br>so they do not reach telescopes on the ground ✓')
    ] };
};
/* --- magnitudes and distances --- */
T.AM1 = R => {
  const m1 = R.pick([0.4, 1.2, 2.1]), m2 = m1 + R.pick([1.5, 2.5, 3.0, 4.0]), ratio = Math.pow(2.51, m2 - m1);
  return { stem: `Two stars <b>X</b> and <b>Y</b> have apparent magnitudes of ${m1.toFixed(1)} and ${m2.toFixed(1)}. A difference of 1 on the magnitude scale corresponds to a brightness ratio of 2.51.`,
    parts: [
      text('State what is meant by apparent magnitude.', 1, 'A measure of how bright a star appears as seen from the Earth ✓'),
      text('State which star appears brighter. Give a reason.', 1, '<b>X</b>, because it has the smaller (lower) apparent magnitude ✓'),
      calc('Calculate the ratio brightness of the brighter star ÷ brightness of the dimmer star.', 2, ratio, '', `${eq(`2.51<sup>(${m2.toFixed(1)} − ${m1.toFixed(1)})</sup> = 2.51<sup>${(m2 - m1).toFixed(1)}</sup>`)} ✓<br>${eq(`= ${A(ratio)}`)} ✓`),
      text('On the Hipparcos scale, state the apparent magnitude of the brightest stars and of the faintest stars visible to the unaided eye.', 1, 'Brightest: 1; faintest visible: 6 ✓'),
      text('State the brightness ratio that corresponds to a difference of 5 magnitudes.', 1, '100 ✓'),
      calc(`A third star appears 100 times brighter than <b>Y</b>.<br>Calculate its apparent magnitude.`, 1, m2 - 5, '', `${eq(`${m2.toFixed(1)} − 5 = ${mg(m2 - 5)}`)} ✓`, { show: mg(m2 - 5) })
    ] };
};
T.AM2 = R => {
  const p = R.pick([0.20, 0.13, 0.050, 0.38, 0.77]), d = 1 / p;
  return { stem: `The distance to a nearby star is found by measuring its parallax. The star has a parallax angle of ${p.toFixed(p < .1 ? 3 : 2)} seconds of arc.<br>${PCD}`,
    parts: [
      text('State what is meant by one parsec.', 2, 'The distance at which a length of 1 AU (the radius of the orbit of the Earth) ✓<br>subtends an angle of 1 second of arc ✓'),
      calc('Calculate the distance to the star in parsecs.', 2, d, 'pc', `${eq(`<i>d</i> = 1/<i>p</i> = 1 / ${p.toFixed(p < .1 ? 3 : 2)}`)} ✓<br>${eq(`<i>d</i> = ${A(d)} pc`)} ✓`),
      calc('Calculate this distance in light years.', 1, d * 3.26, 'light years', `${eq(`${A(d)} × 3.26 = ${A(d * 3.26)} light years`)} ✓`),
      calc('Calculate this distance in metres.', 1, d * PC, 'm', `${eq(`${A(d)} × 3.08 × 10<sup>16</sup> = ${A(d * PC)} m`)} ✓`),
      text('Explain why parallax can only be used to find the distances of relatively close stars.', 1, 'For distant stars the parallax angle is too small to measure accurately ✓')
    ] };
};
T.AM3 = R => {
  const [nm, m, d] = R.pick([['Sirius', -1.46, 2.64], ['Vega', 0.03, 7.68], ['Betelgeuse', 0.42, 197], ['Polaris', 1.98, 133], ['Rigel', 0.13, 264]]), M = m - 5 * lg(d / 10), ratio = Math.pow(2.51, 4.8 - M);
  return { stem: `The star ${nm} has an apparent magnitude of ${mg(m)} and is ${N(d)} pc from the Earth. The absolute magnitude of the Sun is 4.8.`,
    parts: [
      text('State what is meant by absolute magnitude.', 1, 'The apparent magnitude that a star would have if it were 10 pc from the Earth ✓'),
      calc(`Calculate the absolute magnitude of ${nm}.`, 3, M, '', `${eq('<i>m</i> − <i>M</i> = 5 log(<i>d</i>/10)')} ✓<br>${eq(`<i>M</i> = ${mg(m)} − 5 log(${N(d)} / 10)`)} ✓<br>${eq(`<i>M</i> = ${M.toFixed(2).replace('-', '−')}`)} ✓`, { show: M.toFixed(2).replace('-', '−'), abs: .06 }),
      text(`State and explain whether ${nm} emits more or less power than the Sun.`, 1, 'More: its absolute magnitude is lower (more negative) than that of the Sun ✓'),
      calc(`Calculate the ratio power output of ${nm} ÷ power output of the Sun.`, 2, ratio, '', `${eq(`2.51<sup>(4.8 − (${M.toFixed(2).replace('-', '−')}))</sup> = 2.51<sup>${(4.8 - M).toFixed(2)}</sup>`)} ✓<br>${eq(`= ${A(ratio)}`)} ✓`, { tol: .08 })
    ] };
};
T.AM4 = R => {
  const [m, M] = R.pick([[8.2, 3.1], [12.4, -1.5], [6.5, 4.8], [10.0, 0.6], [3.4, 5.9]]), d = 10 * Math.pow(10, (m - M) / 5);
  return { stem: `A star has an apparent magnitude of ${mg(m)} and an absolute magnitude of ${mg(M)}.<br>${PCD}`,
    parts: [
      text('State, without calculation, whether the star is closer than or further than 10 pc from the Earth. Explain your answer.', 1, m > M ? 'Further: it appears dimmer (its apparent magnitude is greater) than it would at 10 pc ✓' : 'Closer: it appears brighter (its apparent magnitude is smaller) than it would at 10 pc ✓'),
      calc('Calculate the distance to the star in parsecs.', 3, d, 'pc', `${eq(`<i>m</i> − <i>M</i> = 5 log(<i>d</i>/10), so log(<i>d</i>/10) = (${mg(m)} − ${M < 0 ? '(' + mg(M) + ')' : mg(M)}) / 5 = ${((m - M) / 5).toFixed(2).replace('-', '−')}`)} ✓<br>${eq(`<i>d</i> = 10<sup>(1 ${m >= M ? '+' : '−'} ${Math.abs((m - M) / 5).toFixed(2)})</sup> = 10<sup>${(1 + (m - M) / 5).toFixed(2)}</sup>`)} ✓<br>${eq(`<i>d</i> = ${A(d)} pc`)} ✓`),
      calc('Calculate this distance in light years.', 1, d * 3.26, 'light years', `${eq(`${A(d)} × 3.26 = ${A(d * 3.26)} light years`)} ✓`),
      text('Dust between the star and the Earth absorbs some of its light.<br>State and explain the effect of this on the distance calculated.', 2, 'The calculated distance is too large ✓<br>The star appears dimmer than it should, so its apparent magnitude is too large ✓')
    ] };
};
T.AM5 = R => {
  const sets = R.pick([[['P', 1.2, -3.5], ['Q', 4.0, 4.0], ['R', 0.4, 2.1]], [['P', 2.5, 2.5], ['Q', -0.3, 1.4], ['R', 3.1, -5.2]], [['P', 5.2, 6.8], ['Q', 1.9, -2.7], ['R', 0.8, 0.8]]]);
  const bright = sets.slice().sort((a, b) => a[1] - b[1])[0][0], power = sets.slice().sort((a, b) => a[2] - b[2])[0][0], close = sets.filter(s => s[1] < s[2]).map(s => s[0]), ten = sets.filter(s => s[1] === s[2]).map(s => s[0]);
  return { stem: `The apparent magnitude <i>m</i> and absolute magnitude <i>M</i> of three stars are:<br>${sets.map(([n, m, M]) => `star <b>${n}</b>: <i>m</i> = ${mg(m)}, <i>M</i> = ${mg(M)}`).join('<br>')}`,
    parts: [
      text('State and explain which star appears brightest from the Earth.', 2, `<b>${bright}</b> ✓<br>It has the lowest apparent magnitude ✓`),
      text('State and explain which star has the greatest power output.', 2, `<b>${power}</b> ✓<br>It has the lowest (most negative) absolute magnitude ✓`),
      text('State and explain which star is closer to the Earth than 10 pc.', 2, `<b>${close.join(' and ')}</b> ✓<br>Its apparent magnitude is lower than its absolute magnitude, so it appears brighter than it would at 10 pc ✓`),
      text('State the distance from the Earth of the star whose apparent and absolute magnitudes are equal.', 1, `Star <b>${ten[0]}</b> is 10 pc from the Earth ✓`)
    ] };
};
T.AM6 = R => {
  const m = R.pick([14.2, 16.8, 19.5, 22.1]), d = 10 * Math.pow(10, (m + 19.3) / 5);
  return { stem: `A type 1a supernova is observed in a distant galaxy. At its peak it has an apparent magnitude of ${m.toFixed(1)}. All type 1a supernovae reach a peak absolute magnitude of −19.3.<br>${PCD}`,
    parts: [
      text('Explain why type 1a supernovae can be used as standard candles.', 2, 'They all have the same peak absolute magnitude (the same peak power output), which is known ✓<br>so comparing this with the apparent magnitude gives the distance ✓'),
      calc('Calculate the distance to the galaxy in parsecs.', 3, d, 'pc', `${eq(`log(<i>d</i>/10) = (<i>m</i> − <i>M</i>)/5 = (${m.toFixed(1)} − (−19.3)) / 5 = ${((m + 19.3) / 5).toFixed(2)}`)} ✓<br>${eq(`<i>d</i> = 10 × 10<sup>${((m + 19.3) / 5).toFixed(2)}</sup>`)} ✓<br>${eq(`<i>d</i> = ${A(d)} pc`)} ✓`),
      calc('Calculate this distance in light years.', 1, d * 3.26, 'light years', `${eq(`${A(d)} × 3.26 = ${A(d * 3.26)} light years`)} ✓`),
      text('State what observations of very distant type 1a supernovae have shown about the expansion of the Universe.', 1, 'The expansion is accelerating (the supernovae are dimmer, so further away, than expected), which is evidence for dark energy ✓')
    ] };
};
/* --- black-body radiation and stellar classification --- */
T.AB1 = R => {
  const lam = R.pick([290, 410, 500, 650, 970]), Tk = WIEN / (lam * 1e-9);
  return { stem: `The radiation from a star can be treated as black-body radiation. The spectrum of a star has its peak intensity at a wavelength of ${lam} nm.<br>${WIEND}`,
    parts: [
      text('State what is meant by a black body.', 1, 'An object that absorbs all the electromagnetic radiation that falls on it (and is a perfect emitter of radiation at all wavelengths) ✓'),
      calc('Calculate the surface temperature of the star.', 2, Tk, 'K', `${eq(`<i>λ</i><sub>max</sub><i>T</i> = 2.90 × 10<sup>−3</sup>, so <i>T</i> = 2.90 × 10<sup>−3</sup> / ${N(lam * 1e-9)}`)} ✓<br>${eq(`<i>T</i> = ${A(Tk)} K`)} ✓`),
      text('Describe the shape of a graph of intensity against wavelength for a black body.', 2, 'The intensity rises steeply from zero at short wavelengths to a single peak ✓<br>then falls more gradually towards zero at long wavelengths ✓'),
      text('State two ways in which this graph changes for a hotter black body of the same size.', 2, 'The peak is at a shorter wavelength ✓<br>The peak is higher and the area under the curve is greater (more power is emitted at every wavelength) ✓')
    ] };
};
T.AB2 = R => {
  const [Rr, Tk] = R.pick([[6.96e8, 5800], [1.2e9, 9900], [2.0e10, 4000], [5.0e9, 12000], [3.5e8, 3500]]), Ar = 4 * PI * Rr * Rr, P = SIG * Ar * Math.pow(Tk, 4);
  return { stem: `A star has a radius of ${N(Rr)} m and a surface temperature of ${Tk} K.<br>${SIGD}<br>${WIEND}<br>power output of the Sun = 3.85 × 10<sup>26</sup> W`,
    parts: [
      calc('Calculate the surface area of the star.', 1, Ar, 'm<sup>2</sup>', `${eq(`<i>A</i> = 4π<i>r</i><sup>2</sup> = 4π × (${N(Rr)})<sup>2</sup> = ${A(Ar)} m<sup>2</sup>`)} ✓`),
      calc('Calculate the power output of the star.', 2, P, 'W', `${eq(`<i>P</i> = <i>σAT</i><sup>4</sup> = 5.67 × 10<sup>−8</sup> × ${A(Ar)} × ${Tk}<sup>4</sup>`)} ✓<br>${eq(`<i>P</i> = ${A(P)} W`)} ✓`),
      calc('Calculate the ratio power output of the star ÷ power output of the Sun.', 1, P / LSUN, '', `${eq(`${A(P)} / 3.85 × 10<sup>26</sup> = ${A(P / LSUN)}`)} ✓`),
      calc('Calculate the wavelength at which the spectrum of the star has its peak intensity.', 2, WIEN / Tk, 'm', `${eq(`<i>λ</i><sub>max</sub> = 2.90 × 10<sup>−3</sup> / ${Tk}`)} ✓<br>${eq(`= ${A(WIEN / Tk)} m`)} ✓`),
      text('State the assumption made in these calculations.', 1, 'The star radiates as a black body ✓')
    ] };
};
T.AB3 = R => {
  const [desc, k, Tk, kind] = R.pick([['a red supergiant', 1.0e5, 3500, 'far larger than the Sun'], ['a white dwarf', 2.5e-3, 25000, 'far smaller than the Sun (about the size of the Earth)'], ['a red giant', 100, 4000, 'much larger than the Sun'], ['a main sequence star', 25, 9900, 'a little larger than the Sun']]), P = k * LSUN, Rr = Math.sqrt(P / (4 * PI * SIG * Math.pow(Tk, 4)));
  return { stem: `A star has a power output of ${N(P)} W and a surface temperature of ${Tk} K.<br>${SIGD}<br>radius of the Sun = 6.96 × 10<sup>8</sup> m`,
    parts: [
      calc('Calculate the radius of the star.', 3, Rr, 'm', `${eq('<i>P</i> = <i>σAT</i><sup>4</sup> and <i>A</i> = 4π<i>r</i><sup>2</sup>, so <i>r</i> = √(<i>P</i> / 4π<i>σT</i><sup>4</sup>)')} ✓<br>${eq(`<i>r</i> = √(${N(P)} / (4π × 5.67 × 10<sup>−8</sup> × ${Tk}<sup>4</sup>))`)} ✓<br>${eq(`<i>r</i> = ${A(Rr)} m`)} ✓`),
      calc('Calculate the ratio radius of the star ÷ radius of the Sun.', 1, Rr / RSUN, '', `${eq(`${A(Rr)} / 6.96 × 10<sup>8</sup> = ${A(Rr / RSUN)}`)} ✓`),
      text('Suggest what type of star this is. Give a reason.', 2, `${cap(desc)} ✓<br>It is ${kind}, and has a ${Tk > 8000 ? 'high' : 'low'} surface temperature ✓`),
      text('Two stars have the same surface temperature, but one has a much greater power output.<br>State what can be deduced about this star.', 1, 'It has a much larger surface area (radius), because the power emitted per unit area is the same for both ✓')
    ] };
};
const CLASSES = [['O', 'blue', '25 000 K to 50 000 K', 'helium ions, helium atoms and hydrogen'], ['B', 'blue', '11 000 K to 25 000 K', 'helium atoms and hydrogen'], ['A', 'blue-white', '7500 K to 11 000 K', 'hydrogen (strongest) and ionised metals'], ['F', 'white', '6000 K to 7500 K', 'ionised metals'], ['G', 'yellow-white', '5000 K to 6000 K', 'ionised and neutral metals'], ['K', 'orange', '3500 K to 5000 K', 'neutral metals'], ['M', 'red', 'below 3500 K', 'neutral atoms and titanium oxide (TiO)']];
T.AB4 = R => {
  const [c, col, tr, lines] = R.pick(CLASSES);
  return { stem: `Stars are classified into spectral classes according to the absorption lines in their spectra. A star is in spectral class ${c}.`,
    parts: [
      text('List the seven main spectral classes in order, starting with the hottest.', 1, 'O, B, A, F, G, K, M ✓'),
      text(`State the colour and the approximate surface temperature of a class ${c} star.`, 2, `${cap(col)} ✓<br>${tr} ✓`),
      text(`State the prominent absorption lines in the spectrum of a class ${c} star.`, 1, `Lines due to ${lines} ✓`),
      text('The hydrogen Balmer absorption lines are strongest in class A stars. They are weak in the spectra of both much hotter and much cooler stars.<br>Explain these observations.', 3, 'Balmer absorption lines are produced when hydrogen atoms with electrons in the <i>n</i> = 2 level absorb photons ✓<br>In cooler stars nearly all the hydrogen atoms are in the ground state (<i>n</i> = 1), so few can absorb at these wavelengths ✓<br>In much hotter stars most of the hydrogen is ionised (or excited to higher levels), so again few atoms have electrons in <i>n</i> = 2 ✓'),
      text('State the spectral class of the Sun.', 1, 'G ✓')
    ] };
};
T.AB5 = R => {
  const dl = R.pick([4.2, 8.6, 25, 36]), Ps = 1370 * 4 * PI * AUM * AUM, d = dl * LYR, I = Ps / (4 * PI * d * d);
  return { stem: `The intensity of the radiation from the Sun at the Earth (the solar constant) is 1370 W m<sup>−2</sup>. The Earth is 1.50 × 10<sup>11</sup> m from the Sun.<br>1 light year = 9.46 × 10<sup>15</sup> m`,
    parts: [
      calc('Calculate the power output of the Sun.', 2, Ps, 'W', `${eq(`<i>I</i> = <i>P</i>/4π<i>d</i><sup>2</sup>, so <i>P</i> = 1370 × 4π × (1.50 × 10<sup>11</sup>)<sup>2</sup>`)} ✓<br>${eq(`<i>P</i> = ${A(Ps)} W`)} ✓`),
      calc(`A star with the same power output as the Sun is ${N(dl, 2)} light years from the Earth.<br>Calculate the intensity of its radiation at the Earth.`, 3, I, 'W m<sup>−2</sup>', `${eq(`<i>d</i> = ${N(dl, 2)} × 9.46 × 10<sup>15</sup> = ${N(d)} m`)} ✓<br>${eq(`<i>I</i> = ${A(Ps)} / (4π × (${N(d)})<sup>2</sup>)`)} ✓<br>${eq(`<i>I</i> = ${A(I)} W m<sup>−2</sup>`)} ✓`),
      text('State two assumptions made in using the inverse-square law for the radiation from a star.', 2, 'The star radiates equally in all directions ✓<br>No radiation is absorbed (or scattered) between the star and the Earth ✓')
    ] };
};
T.AB6 = R => {
  const T1 = R.pick([3000, 4000]), T2 = R.pick([6000, 12000]), ratio = Math.pow(T2 / T1, 4);
  return { stem: `Two stars <b>X</b> and <b>Y</b> have the same radius. <b>X</b> has a surface temperature of ${T1} K and <b>Y</b> has a surface temperature of ${T2} K.<br>${WIEND}`,
    parts: [
      calc('Calculate the ratio power output of <b>Y</b> ÷ power output of <b>X</b>.', 2, ratio, '', `The areas are equal, so the power is proportional to <i>T</i><sup>4</sup> ✓<br>${eq(`(${T2} / ${T1})<sup>4</sup> = ${A(ratio)}`)} ✓`),
      calc('Calculate the wavelength of peak intensity for <b>X</b>.', 1, WIEN / T1, 'm', `${eq(`2.90 × 10<sup>−3</sup> / ${T1} = ${A(WIEN / T1)} m`)} ✓`),
      calc('Calculate the wavelength of peak intensity for <b>Y</b>.', 1, WIEN / T2, 'm', `${eq(`2.90 × 10<sup>−3</sup> / ${T2} = ${A(WIEN / T2)} m`)} ✓`),
      text('State and explain which star appears red.', 1, '<b>X</b>: its peak is in the infrared, so in the visible spectrum it emits most strongly at the red end ✓'),
      calc(`A third star <b>Z</b> has the same power output as <b>X</b> but a surface temperature of ${T2} K.<br>Calculate the ratio radius of <b>Z</b> ÷ radius of <b>X</b>.`, 2, Math.pow(T1 / T2, 2), '', `${eq('<i>r</i><sup>2</sup><i>T</i><sup>4</sup> is the same for both, so the radius is proportional to 1/<i>T</i><sup>2</sup>')} ✓<br>${eq(`(${T1} / ${T2})<sup>2</sup> = ${A(Math.pow(T1 / T2, 2))}`)} ✓`)
    ] };
};
/* --- HR diagram and stellar evolution --- */
function hrFig(L){
  const x0 = 80, x1 = 400, y0 = 30, y1 = 280; let b = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#fff" stroke="#000" stroke-width="1.5"/>`;
  b += `<polygon points="96,52 128,44 392,250 372,268" fill="#e3e7ee" stroke="#000" stroke-width="1"/><ellipse cx="318" cy="118" rx="44" ry="24" fill="#e3e7ee" stroke="#000" stroke-width="1"/><ellipse cx="262" cy="50" rx="92" ry="11" fill="#e3e7ee" stroke="#000" stroke-width="1"/><ellipse cx="150" cy="240" rx="40" ry="15" fill="#e3e7ee" stroke="#000" stroke-width="1"/>`;
  b += tx(240, 153, L[0], 'font-weight="700" font-size="16"') + tx(318, 124, L[1], 'font-weight="700" font-size="16"') + tx(150, 246, L[2], 'font-weight="700" font-size="16"') + tx(262, 55, L[3], 'font-weight="700" font-size="14"');
  [[-10, y0], [-5, 80], [0, 130], [5, 180], [10, 230], [15, y1]].forEach(([v, y]) => { b += ln(x0 - 5, y, x0, y) + tx(x0 - 10, y + 5, String(v).replace('-', '−'), 'text-anchor="end" font-size="13"'); });
  [['50 000', x0], ['10 000', 187], ['6000', 240], ['2500', x1]].forEach(([v, x]) => { b += ln(x, y1, x, y1 + 5) + tx(x, y1 + 20, v, 'font-size="13"'); });
  b += tx(240, y1 + 40, 'temperature / K', 'font-size="14"') + `<text x="24" y="155" text-anchor="middle" font-size="14" transform="rotate(-90 24 155)">absolute magnitude</text>`;
  return svgWrap(430, 330, 'A Hertzsprung–Russell diagram of absolute magnitude against temperature, with temperature decreasing to the right. Four regions are shaded and labelled: a diagonal band from top left to bottom right, a region above the band on the right, a region at the bottom left, and a region across the top', b);
}
T.AH1 = R => {
  const L = shuf(R, ['A', 'B', 'C', 'D']), names = ['main sequence stars', 'red giants', 'white dwarfs', 'supergiants'];
  const order = ['A', 'B', 'C', 'D'].map(l => [l, names[L.indexOf(l)]]);
  return { stem: `<b>Figure 1</b> shows a Hertzsprung–Russell (HR) diagram. Four regions are labelled <b>A</b>, <b>B</b>, <b>C</b> and <b>D</b>.`, figs: [hrFig(L)],
    parts: [
      text('Name the type of star found in each of the four regions.', 4, order.map(([l, n]) => `<b>${l}</b>: ${n} ✓`).join('<br>')),
      text('State how the temperature scale on an HR diagram differs from the scale on most graphs.', 1, 'Temperature decreases from left to right (and the scale is not linear) ✓'),
      text('State the region in which the Sun is found, and its approximate absolute magnitude and temperature.', 1, `Region <b>${L[0]}</b> (the main sequence), with an absolute magnitude of about +5 and a temperature of about 6000 K ✓`),
      text(`A star in region <b>${L[1]}</b> has the same temperature as a star in region <b>${L[0]}</b>.<br>State and explain how the sizes of the two stars compare.`, 2, `The star in region <b>${L[1]}</b> is much larger ✓<br>It has a lower absolute magnitude, so a much greater power output; at the same temperature the power per unit area is the same, so its surface area must be much greater ✓`)
    ] };
};
T.AH2 = R => ({ stem: `The Sun is a main sequence star. In about five billion years it will leave the main sequence.`,
  parts: [
    text('Describe how a star like the Sun is formed and what makes it a main sequence star.', 2, 'A cloud of gas and dust (a nebula) collapses under gravity and heats up, forming a protostar ✓<br>When the core is hot enough, hydrogen nuclei fuse to form helium; the star is then stable on the main sequence ✓'),
    text('Describe what happens to the Sun after the hydrogen in its core has been used up, until it becomes a white dwarf.', 3, 'The core contracts and heats up, and the outer layers expand and cool: the star becomes a red giant ✓<br>Helium fuses in the core (to form carbon and oxygen) ✓<br>When fusion stops, the outer layers are thrown off as a planetary nebula, leaving the hot, dense core as a white dwarf ✓'),
    text('Describe the path of the Sun on an HR diagram during this evolution.', 2, 'It moves up and to the right, from the main sequence into the red giant region ✓<br>It then moves down and to the left, across the main sequence, to the white dwarf region ✓'),
    text(R.chance(.5) ? 'State what eventually happens to a white dwarf.' : 'State why a white dwarf slowly becomes dimmer.', 1, 'No fusion takes place in it, so it cools and fades (eventually becoming a black dwarf) ✓')
  ] });
T.AH3 = R => {
  const k = R.pick([5, 10, 20, 4.0e6]), M = k * MSUN, Rs = 2 * GC * M / (C * C);
  return { stem: `A black hole has a mass of ${k > 100 ? N(k, 2) : k} times the mass of the Sun.<br>mass of the Sun = 1.99 × 10<sup>30</sup> kg<br>gravitational constant <i>G</i> = 6.67 × 10<sup>−11</sup> N m<sup>2</sup> kg<sup>−2</sup><br>${CD}`,
    parts: [
      text('State the defining property of a black hole.', 1, 'Its escape velocity is greater than the speed of light ✓'),
      text('State what is meant by the event horizon of a black hole.', 1, 'The boundary at which the escape velocity equals the speed of light; nothing inside it can escape (its radius is the Schwarzschild radius) ✓'),
      calc('Calculate the Schwarzschild radius of this black hole.', 3, Rs, 'm', `${eq(`<i>M</i> = ${k > 100 ? N(k, 2) : k} × 1.99 × 10<sup>30</sup> = ${N(M)} kg`)} ✓<br>${eq(`<i>R</i><sub>s</sub> = 2<i>GM</i>/<i>c</i><sup>2</sup> = (2 × 6.67 × 10<sup>−11</sup> × ${N(M)}) / (3.00 × 10<sup>8</sup>)<sup>2</sup>`)} ✓<br>${eq(`<i>R</i><sub>s</sub> = ${A(Rs)} m`)} ✓`),
      text('State the defining property of a neutron star.', 1, 'It is made of neutrons and has the density of nuclear matter ✓'),
      text('Describe how a neutron star or a black hole is formed.', 2, 'A star much more massive than the Sun runs out of fuel and its core collapses very rapidly ✓<br>The outer layers are blown away in a supernova (a rapid, very large increase in absolute magnitude); the collapsed core remains as a neutron star or, if it is massive enough, a black hole ✓')
    ] };
};
T.AH4 = R => {
  const Mg = R.pick([-0.5, 0.0, 0.5]), Mm = R.pick([5.5, 6.0, 7.0]), pr = Math.pow(2.51, Mm - Mg), rr = Math.sqrt(pr);
  return { stem: `A red giant and a main sequence star are both in spectral class K, so they have the same surface temperature. The absolute magnitude of the red giant is ${mg(Mg)} and the absolute magnitude of the main sequence star is ${mg(Mm)}. A difference of 1 in absolute magnitude corresponds to a power ratio of 2.51.`,
    parts: [
      calc('Calculate the ratio power output of the red giant ÷ power output of the main sequence star.', 2, pr, '', `${eq(`2.51<sup>(${mg(Mm)} − ${Mg < 0 ? '(' + mg(Mg) + ')' : mg(Mg)})</sup> = 2.51<sup>${(Mm - Mg).toFixed(1)}</sup>`)} ✓<br>${eq(`= ${A(pr)}`)} ✓`),
      text('Explain why the red giant must have a larger surface area than the main sequence star.', 2, 'Both have the same temperature, so (by Stefan’s law) they emit the same power per unit area ✓<br>The red giant emits more power in total, so its surface area must be greater ✓'),
      calc('Calculate the ratio radius of the red giant ÷ radius of the main sequence star.', 2, rr, '', `Power is proportional to <i>r</i><sup>2</sup> at the same temperature, so the ratio of radii ${eq(`= √${A(pr)}`)} ✓<br>${eq(`= ${A(rr)}`)} ✓`),
      text('A white dwarf has a much higher surface temperature than the Sun but a much smaller power output.<br>State what this shows about the white dwarf.', 1, 'It has a very small surface area (it is much smaller than the Sun, about the size of the Earth) ✓')
    ] };
};
T.AH5 = R => {
  const k = R.pick([1.4, 2.0]), rk = R.pick([10, 12, 15]), M = k * MSUN, V = 4 / 3 * PI * Math.pow(rk * 1e3, 3), rho = M / V;
  return { stem: `A neutron star has a mass of ${k.toFixed(1)} times the mass of the Sun and a radius of ${rk} km.<br>mass of the Sun = 1.99 × 10<sup>30</sup> kg`,
    parts: [
      calc('Calculate the volume of the neutron star.', 1, V, 'm<sup>3</sup>', `${eq(`(4/3)π × (${N(rk * 1e3, 2)})<sup>3</sup> = ${A(V)} m<sup>3</sup>`)} ✓`),
      calc('Calculate the mean density of the neutron star.', 2, rho, 'kg m<sup>−3</sup>', `${eq(`<i>ρ</i> = <i>M</i>/<i>V</i> = (${k.toFixed(1)} × 1.99 × 10<sup>30</sup>) / ${A(V)}`)} ✓<br>${eq(`<i>ρ</i> = ${A(rho)} kg m<sup>−3</sup>`)} ✓`),
      text('State how this density compares with the density of an atomic nucleus.', 1, 'It is about the same (of the order of 10<sup>17</sup> kg m<sup>−3</sup>) ✓'),
      text('Describe how the absolute magnitude of a type 1a supernova changes with time.', 2, 'It rises rapidly to a peak value of about −19.3 (in about 20 days) ✓<br>then decreases gradually over the following weeks and months ✓'),
      text('State what is thought to cause a gamma-ray burst, and why a nearby burst would be dangerous.', 2, 'The collapse of a supergiant star to form a neutron star or a black hole ✓<br>It releases an enormous amount of energy as gamma radiation in a narrow beam (comparable with the total energy output of the Sun over its whole lifetime), which could damage the atmosphere and living things on the Earth ✓', ['The specification gives the collapse of a supergiant star as the cause. Merging neutron stars is also a correct cause of short bursts.'])
    ] };
};
/* --- cosmology --- */
T.AZ1 = R => {
  const [nm, l0] = R.pick([['hydrogen', 656.3], ['hydrogen', 486.1], ['calcium', 393.4]]), z0 = R.pick([0.012, 0.025, 0.040, 0.067]), lo = Number((l0 * (1 + z0)).toFixed(1)), z = (lo - l0) / l0, v = z * C;
  return { stem: `A spectral line of ${nm} has a wavelength of ${l0} nm when measured in a laboratory. In the spectrum of a distant galaxy, the same line has a wavelength of ${lo.toFixed(1)} nm.<br>${CD}`,
    parts: [
      text('State what is meant by red shift.', 1, 'An increase in the observed wavelength of radiation from a source that is moving away from the observer ✓'),
      calc('Calculate the red shift <i>z</i> of the galaxy.', 2, z, '', `${eq(`<i>z</i> = Δ<i>λ</i>/<i>λ</i> = (${lo.toFixed(1)} − ${l0}) / ${l0}`)} ✓<br>${eq(`<i>z</i> = ${A(z)}`)} ✓`),
      calc('Calculate the speed of the galaxy relative to the Earth.', 2, v, MS1, `${eq(`<i>v</i> = <i>zc</i> = ${A(z)} × 3.00 × 10<sup>8</sup>`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text('State the direction in which the galaxy is moving relative to the Earth.', 1, 'Away from the Earth (it is receding) ✓'),
      text('State the condition for the equation <i>z</i> = <i>v</i>/<i>c</i> to be valid.', 1, 'The speed <i>v</i> must be much less than the speed of light ✓', ['The data sheet gives Δ<i>f</i>/<i>f</i> = −Δ<i>λ</i>/<i>λ</i> = <i>v</i>/<i>c</i> and <i>z</i> = −<i>v</i>/<i>c</i>, with <i>v</i> taken as positive for a source moving towards the observer. Here only the size of <i>v</i> is used.'])
    ] };
};
T.AZ2 = R => {
  const v = R.pick([1300, 3250, 6500, 13000]), d = v / 65, Hs = 65e3 / MPC, age = 1 / Hs, yrs = age / 3.15e7;
  return { stem: `A galaxy is receding from the Earth at ${v} km s<sup>−1</sup>.<br>${HD}<br>1 Mpc = 3.08 × 10<sup>22</sup> m<br>1 year = 3.15 × 10<sup>7</sup> s`,
    parts: [
      text('State Hubble’s law.', 1, 'The speed at which a galaxy recedes is directly proportional to its distance from us (<i>v</i> = <i>Hd</i>) ✓'),
      calc('Calculate the distance to the galaxy in Mpc.', 2, d, 'Mpc', `${eq(`<i>d</i> = <i>v</i>/<i>H</i> = ${v} / 65`)} ✓<br>${eq(`<i>d</i> = ${A(d)} Mpc`)} ✓`),
      calc('Express the Hubble constant in s<sup>−1</sup>.', 2, Hs, 's<sup>−1</sup>', `${eq('65 km s<sup>−1</sup> Mpc<sup>−1</sup> = 6.5 × 10<sup>4</sup> m s<sup>−1</sup> / 3.08 × 10<sup>22</sup> m')} ✓<br>${eq(`= ${A(Hs)} s<sup>−1</sup>`)} ✓`),
      calc('Use your answer to estimate the age of the Universe in years.', 2, yrs, 'years', `${eq(`age ≈ 1/<i>H</i> = 1 / ${A(Hs)} = ${A(age)} s`)} ✓<br>${eq(`${A(age)} / 3.15 × 10<sup>7</sup> = ${A(yrs)} years`)} ✓`),
      text('State the assumption made in this estimate.', 1, 'The Universe has expanded at a constant rate since the Big Bang ✓')
    ] };
};
T.AZ3 = R => {
  const dl = R.pick([0.066, 0.11, 0.22]), Td = R.pick([2.5, 4.0, 10]), v = C * dl / 656.28, r = v * Td * 86400 / (2 * PI);
  return { stem: `The spectrum of a binary star system contains a hydrogen line whose laboratory wavelength is 656.28 nm. As the two identical stars orbit their common centre of mass, the line splits into two and recombines. The maximum shift of each line from 656.28 nm is ${dl} nm, and the orbital period is ${N(Td, 2)} days. The orbit is seen edge-on.<br>${CD}`,
    parts: [
      text('Explain why the line splits into two and then recombines.', 3, 'When one star is moving towards the Earth and the other away, their light is Doppler shifted in opposite directions (one to shorter and one to longer wavelength), so two lines are seen ✓<br>The split is greatest when the stars are moving directly along the line of sight ✓<br>When the stars are moving across the line of sight there is no shift, so the lines coincide ✓'),
      calc('Calculate the orbital speed of each star.', 2, v, MS1, `${eq(`Δ<i>λ</i>/<i>λ</i> = <i>v</i>/<i>c</i>, so <i>v</i> = 3.00 × 10<sup>8</sup> × ${dl} / 656.28`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the radius of the orbit of each star.', 2, r, 'm', `${eq(`<i>T</i> = ${N(Td, 2)} × 86 400 = ${N(Td * 86400)} s and <i>v</i> = 2π<i>r</i>/<i>T</i>`)} ✓<br>${eq(`<i>r</i> = (${A(v)} × ${N(Td * 86400)}) / 2π = ${A(r)} m`)} ✓`),
      text('State how the apparent magnitude of this system varies with time if the stars pass in front of each other.', 1, 'It dips (the system appears dimmer) twice in each orbital period, when one star eclipses the other ✓')
    ] };
};
T.AZ4 = R => {
  const z = R.pick([0.16, 0.20, 0.30]), I = R.pick([5.0e-13, 1.0e-12, 2.0e-12]), v = z * 3.0e5, d = v / 65, dm = d * MPC, P = 4 * PI * dm * dm * I;
  return { stem: `A quasar has a red shift of ${z.toFixed(2)}. The intensity of its radiation at the Earth is ${N(I, 2)} W m<sup>−2</sup>.<br>${HD}<br>1 Mpc = 3.08 × 10<sup>22</sup> m<br>${CD}`,
    parts: [
      calc('Calculate the speed at which the quasar is receding, in km s<sup>−1</sup>.', 1, v, 'km s<sup>−1</sup>', `${eq(`<i>v</i> = <i>zc</i> = ${z.toFixed(2)} × 3.00 × 10<sup>5</sup> = ${A(v)} km s<sup>−1</sup>`)} ✓`),
      calc('Calculate the distance to the quasar in Mpc.', 2, d, 'Mpc', `${eq(`<i>d</i> = <i>v</i>/<i>H</i> = ${A(v)} / 65`)} ✓<br>${eq(`<i>d</i> = ${A(d)} Mpc`)} ✓`),
      calc('Calculate the power output of the quasar.', 3, P, 'W', `${eq(`<i>d</i> = ${A(d)} × 3.08 × 10<sup>22</sup> = ${N(dm)} m`)} ✓<br>${eq(`<i>P</i> = 4π<i>d</i><sup>2</sup><i>I</i> = 4π × (${N(dm)})<sup>2</sup> × ${N(I, 2)}`)} ✓<br>${eq(`<i>P</i> = ${A(P)} W`)} ✓`),
      text('The power output of the whole Milky Way galaxy is about 10<sup>37</sup> W.<br>State how the power output of the quasar compares with this.', 1, `It is much greater (by a factor of about ${N(P / 1e37, 1)}) ✓`),
      text('State what a quasar is thought to be.', 1, 'The nucleus of an active galaxy: a supermassive black hole surrounded by a disc of matter that emits radiation as it falls in ✓')
    ] };
};
T.AZ5 = R => {
  const [pn, rp] = R.pick([['Jupiter', 7.0e7], ['Neptune', 2.5e7], ['the Earth', 6.4e6]]), rs = R.pick([7.0e8, 3.5e8]), fr = Math.pow(rp / rs, 2);
  return { stem: `An exoplanet with the same radius as ${pn} (${N(rp, 2)} m) orbits a star of radius ${N(rs, 2)} m. The planet is detected by the transit method.`,
    parts: [
      text('Explain why it is very difficult to observe an exoplanet directly.', 2, 'The planet is very much dimmer than its star, so its reflected light is lost in the glare of the star ✓<br>The angular separation of the planet and the star is very small, so they are hard to resolve ✓'),
      text('Describe the transit method of detecting an exoplanet.', 2, 'The apparent brightness (magnitude) of the star is measured over a long time ✓<br>It dips slightly, at regular intervals, each time the planet passes in front of the star ✓'),
      calc('Calculate the fraction by which the brightness of the star decreases during a transit.', 2, fr, '', `The planet blocks a fraction of the light equal to the ratio of the areas of the two discs: ${eq(`(${N(rp, 2)} / ${N(rs, 2)})<sup>2</sup>`)} ✓<br>${eq(`= ${A(fr)}`)} ✓`),
      text('State one limitation of the transit method.', 1, 'It only works if the orbit of the planet is seen (almost) edge-on from the Earth ✓'),
      text('Describe one other method of detecting exoplanets.', 1, 'The radial velocity method: the star and planet orbit their common centre of mass, so the light from the star shows a small periodic Doppler shift ✓')
    ] };
};
T.AZ6 = R => {
  const Hk = R.pick([65, 70, 72]), Hs = Hk * 1e3 / MPC, yrs = 1 / Hs / 3.15e7;
  const fig = graph({ x: [0, 200, 50], y: [0, 15, 5], div: 5, xl: 'distance / Mpc', yl: `recession speed / 10${sup(3)} km s${sup(-1)}`, curves: [{ f: x => Hk * x / 1000, from: 0, to: 200 }] });
  return { stem: `<b>Figure 1</b> shows how the recession speed of galaxies varies with their distance from the Earth.<br>1 Mpc = 3.08 × 10<sup>22</sup> m<br>1 year = 3.15 × 10<sup>7</sup> s`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the Hubble constant in km s<sup>−1</sup> Mpc<sup>−1</sup>.', marks: 2, ans: Hk, unit: 'km s<sup>−1</sup> Mpc<sup>−1</sup>', show: String(Hk), tol: .05, ms: `The Hubble constant is the gradient: ${eq(`(${N(Hk * .2, 3)} × 10<sup>3</sup>) / 200`)} ✓<br>${eq(`<i>H</i> = ${Hk} km s<sup>−1</sup> Mpc<sup>−1</sup>`)} ✓`, guide: [`Reading from the graph: allow ${Math.round(Hk * .96)} to ${Math.round(Hk * 1.04)} km s<sup>−1</sup> Mpc<sup>−1</sup>.`] },
      calc('Express this value in s<sup>−1</sup>.', 2, Hs, 's<sup>−1</sup>', `${eq(`(${Hk} × 10<sup>3</sup>) / 3.08 × 10<sup>22</sup>`)} ✓<br>${eq(`= ${A(Hs)} s<sup>−1</sup>`)} ✓`, { tol: .05 }),
      calc('Estimate the age of the Universe in years.', 2, yrs, 'years', `${eq(`1/<i>H</i> = ${A(1 / Hs)} s`)} ✓<br>${eq(`${A(1 / Hs)} / 3.15 × 10<sup>7</sup> = ${A(yrs)} years`)} ✓`, { tol: .05 }),
      text('State two pieces of evidence, other than the red shift of galaxies, that support the Big Bang theory.', 2, 'The cosmic microwave background radiation (black-body radiation at about 2.7 K, coming from all directions) ✓<br>The relative abundance of hydrogen and helium in the Universe (about 3 : 1 by mass) ✓')
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
