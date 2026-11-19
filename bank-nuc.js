/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_NUC = (function(){
const module = undefined;
'use strict';
/* Question types for AQA nuclear physics (3.8). */
const TOPICS = { NR: 'Rutherford scattering', NA: 'Alpha, beta and gamma radiation', ND: 'Radioactive decay', NI: 'Nuclear instability', NS: 'Nuclear radius', NE: 'Mass and energy', NF: 'Induced fission and nuclear reactors' };
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
/* ---------- nuclear physics (AQA 3.8) ---------- */
const U = 1.661e-27, MEVU = 931.5, NAV = 6.02e23, EPS = 8.85e-12, YEAR = 3.15e7, MALPHA = 6.64e-27;
const F5 = x => x.toFixed(5).replace('-', '−');
const ts = n => n === 1 ? '' : 's';
const UDATA = '1 u = 1.661 × 10<sup>−27</sup> kg = 931.5 MeV';
const NTARGET = [['gold', 79], ['silver', 47], ['copper', 29], ['lead', 82], ['platinum', 78]];
const PREC = 'Any two ✓✓:<br>Handle the source with long tongs (never by hand).<br>Point the source away from people, or stand behind shielding.<br>Keep the source in its lead-lined box when it is not in use, so the exposure time is as short as possible.';

/* --- Rutherford scattering --- */
T.NR1 = R => {
  const metal = R.pick(['gold', 'gold', 'silver']);
  return { stem: `In the Rutherford scattering experiment, a narrow beam of alpha particles was directed at a thin ${metal} foil in an evacuated chamber. A detector was moved round the foil to count the alpha particles scattered through different angles.`,
    parts: [
      text('State three observations made in this experiment.', 3, 'Most alpha particles passed straight through the foil with little or no deflection ✓<br>A small number were deflected through large angles ✓<br>A very small number (about 1 in 8000) were deflected through more than 90° (came back from the foil) ✓'),
      text('Explain what these observations show about the structure of the atom.', 3, 'Most of the atom is empty space ✓<br>The atom contains a positively charged nucleus, which repels the positive alpha particles ✓<br>The nucleus is very small compared with the atom and contains most of its mass ✓'),
      text(R.chance(.5) ? 'Explain why the chamber was evacuated.' : `Explain why the ${metal} foil had to be very thin.`, 1, R.chance(.5) && false ? '' : null)
    ] };
};
T.NR1 = (old => R => { const q = old(R), P = q.parts[2]; P.ms = /evacuated/.test(P.q) ? 'Alpha particles have a range of only a few centimetres in air (they would be stopped or scattered by air molecules before reaching the foil or the detector) ✓' : 'So that each alpha particle is scattered by only one nucleus (or so that the alpha particles are not absorbed by the foil) ✓'; return q; })(T.NR1);
function alphaFig(){
  let b = `<circle cx="300" cy="150" r="9" fill="#000"/>` + tx(300, 185, 'nucleus', 'font-size="13"');
  [['A', 50], ['B', 118], ['C', 150]].forEach(([n, y]) => { b += ln(40, y, 150, y, 'stroke-width="1.8"') + head(150, y, 1, 0) + tx(26, y + 5, n, 'font-weight="700"'); });
  return svgWrap(400, 220, 'Three alpha particles A, B and C travelling to the right towards a nucleus. A is far above the nucleus, B is slightly above it and C is heading straight for it', b + tx(95, 30, 'alpha particles', 'font-size="13"'));
}
T.NR2 = R => {
  const [metal, Z] = R.pick(NTARGET);
  return { stem: `<b>Figure 1</b> shows three alpha particles <b>A</b>, <b>B</b> and <b>C</b> approaching a ${metal} nucleus. All three have the same initial kinetic energy. <b>C</b> is travelling directly towards the centre of the nucleus.`, figs: [alphaFig()],
    parts: [
      text('State the type of force that acts between an alpha particle and the nucleus.', 1, 'Electrostatic (electromagnetic) repulsion ✓'),
      text('Describe the path of each alpha particle.', 3, '<b>A</b> continues almost in a straight line (very small deflection upwards) ✓<br><b>B</b> is deflected upwards, away from the nucleus, through a much larger angle than <b>A</b> ✓<br><b>C</b> slows down, stops momentarily and returns along its original path (deflected through 180°) ✓', ['Paths must curve away from the nucleus and never cross to the other side of it.']),
      text('Describe the energy changes of <b>C</b> as it approaches the nucleus and then moves away.', 2, 'As it approaches, its kinetic energy is transferred to electric potential energy, until its kinetic energy is zero at the distance of closest approach ✓<br>As it moves away, the potential energy is transferred back to kinetic energy (it leaves with its original kinetic energy) ✓')
    ] };
};
T.NR3 = R => {
  const [metal, Z] = R.pick(NTARGET), E = R.pick([4.8, 5.0, 5.3, 5.5, 6.0, 7.7]), Ej = E * 1e6 * QE, r = 2 * Z * QE * QE / (4 * Math.PI * EPS * Ej);
  return { stem: `An alpha particle with a kinetic energy of ${N(E, 2)} MeV travels directly towards the nucleus of a ${metal} atom. The proton number of ${metal} is ${Z}.<br>permittivity of free space = 8.85 × 10<sup>−12</sup> F m<sup>−1</sup>`,
    parts: [
      calc('Calculate the kinetic energy of the alpha particle in J.', 1, Ej, 'J', `${eq(`${N(E, 2)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ej)} J`)} ✓`),
      calc('Calculate the distance of closest approach of the alpha particle to the centre of the nucleus.', 3, r, 'm', `At closest approach all the kinetic energy has become electric potential energy: ${eq('<i>E</i><sub>k</sub> = <i>Qq</i> / 4π<i>ε</i><sub>0</sub><i>r</i>')} ✓<br>${eq(`<i>r</i> = (2 × ${Z} × (1.60 × 10<sup>−19</sup>)<sup>2</sup>) / (4π × 8.85 × 10<sup>−12</sup> × ${A(Ej)})`)} ✓<br>${eq(`<i>r</i> = ${A(r)} m`)} ✓`, { guide: [`Award a maximum of two marks if the charge of the alpha particle is taken as <i>e</i> (giving ${A(r / 2)} m).`] }),
      text('Explain why this distance gives an upper limit for the radius of the nucleus.', 1, 'The alpha particle is turned back before it reaches the nucleus, so the radius of the nucleus must be smaller than this distance ✓'),
      text('State and explain how the distance of closest approach changes for an alpha particle with a greater initial kinetic energy.', 2, 'The distance is smaller ✓<br>More kinetic energy must be transferred to potential energy, and the potential energy is inversely proportional to the separation ✓')
    ] };
};
T.NR4 = R => {
  const rn = R.pick([5.0e-15, 6.0e-15, 7.0e-15]), ra = R.pick([1.3e-10, 1.4e-10, 1.5e-10]), ratio = ra / rn, frac = Math.pow(rn / ra, 3);
  return { stem: `Before the Rutherford scattering experiment, the atom was thought to be a sphere of positive charge with electrons spread through it (the “plum pudding” model).`,
    parts: [
      text('Explain why the results of the alpha scattering experiment could not be explained by the plum pudding model.', 3, 'In the plum pudding model the positive charge and the mass are spread throughout the atom ✓<br>so alpha particles would experience only very small forces and all would pass through with very small deflections ✓<br>but a few alpha particles were deflected through angles greater than 90°, which needs a concentrated charge and mass ✓'),
      calc(`An atom has a radius of ${N(ra, 2)} m and its nucleus has a radius of ${N(rn, 2)} m.<br>Calculate the ratio radius of atom ÷ radius of nucleus.`, 1, ratio, '', `${eq(`${N(ra, 2)} / ${N(rn, 2)} = ${A(ratio)}`)} ✓`),
      calc('Calculate the fraction of the volume of the atom that is occupied by the nucleus.', 2, frac, '', `Volume is proportional to radius<sup>3</sup>, so fraction ${eq(`= (${N(rn, 2)} / ${N(ra, 2)})<sup>3</sup>`)} ✓<br>${eq(`= ${A(frac)}`)} ✓`),
      text('State how this result is supported by the observations of the scattering experiment.', 1, 'Most alpha particles pass straight through the foil without being deflected, because they do not pass close to a nucleus ✓')
    ] };
};
T.NR5 = R => {
  const [metal, Z] = R.pick(NTARGET), r = R.pick([3.0e-14, 4.0e-14, 5.0e-14, 6.0e-14]), Ej = 2 * Z * QE * QE / (4 * Math.PI * EPS * r), Em = Ej / QE / 1e6, v = Math.sqrt(2 * Ej / MALPHA);
  return { stem: `An alpha particle is fired directly at the nucleus of a ${metal} atom. It comes to rest momentarily at a distance of ${N(r, 2)} m from the centre of the nucleus. The proton number of ${metal} is ${Z}.<br>permittivity of free space = 8.85 × 10<sup>−12</sup> F m<sup>−1</sup><br>mass of alpha particle = 6.64 × 10<sup>−27</sup> kg`,
    parts: [
      text('State the charge of the alpha particle and the charge of the nucleus in terms of <i>e</i>.', 2, `Alpha particle: +2<i>e</i> ✓<br>Nucleus: +${Z}<i>e</i> ✓`),
      calc('Calculate the initial kinetic energy of the alpha particle in J.', 3, Ej, 'J', `The initial kinetic energy equals the electric potential energy at closest approach: ${eq('<i>E</i><sub>k</sub> = <i>Qq</i> / 4π<i>ε</i><sub>0</sub><i>r</i>')} ✓<br>${eq(`<i>E</i><sub>k</sub> = (2 × ${Z} × (1.60 × 10<sup>−19</sup>)<sup>2</sup>) / (4π × 8.85 × 10<sup>−12</sup> × ${N(r, 2)})`)} ✓<br>${eq(`<i>E</i><sub>k</sub> = ${A(Ej)} J`)} ✓`),
      calc('Express this energy in MeV.', 1, Em, 'MeV', `${eq(`${A(Ej)} / 1.60 × 10<sup>−19</sup> = ${N(Em * 1e6)} eV = ${A(Em)} MeV`)} ✓`),
      calc('Calculate the initial speed of the alpha particle.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(Ej)} / 6.64 × 10<sup>−27</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`)
    ] };
};

/* --- alpha, beta and gamma radiation --- */
T.NA1 = R => {
  const kind = R.pick(['ag', 'bg', 'ab', 'b', 'abg']), bg = R.pick([24, 30, 36]);
  const a = /a/.test(kind) ? R.pick([420, 510, 640]) : 0, b = /b/.test(kind) ? R.pick([280, 350, 460]) : 0, g = /g/.test(kind) ? R.pick([150, 190, 240]) : 0;
  const jit = () => Math.round((R() - .5) * 8);
  const none = bg + a + b + g, paper = bg + b + g + jit(), al = bg + g + jit(), lead = bg + Math.round(g * .12) + (g ? 0 : jit() / 2 | 0);
  const names = [a && 'alpha', b && 'beta', g && 'gamma'].filter(Boolean), list = names.length === 1 ? names[0] + ' only' : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
  return { stem: `A student places a radioactive source 2 cm from a Geiger–Müller tube and records the count in one minute with different absorbers between the source and the tube.<br>No absorber: ${none} counts<br>Sheet of paper: ${paper} counts<br>3 mm of aluminium: ${al} counts<br>20 mm of lead: ${lead} counts<br>With the source removed, the count in one minute is ${bg}.`,
    parts: [
      calc('Calculate the corrected count rate, in counts per minute, with no absorber.', 1, none - bg, 'counts per minute', `${eq(`${none} − ${bg} = ${none - bg} counts per minute`)} ✓`, { show: String(none - bg) }),
      text('Deduce which types of radiation the source emits. Explain your answer.', 4, `${a ? 'The count falls a lot when paper is added, so alpha radiation is present' : 'Paper makes no significant difference to the count, so there is no alpha radiation'} ✓<br>${b ? 'The count falls a lot when the paper is replaced by aluminium, so beta radiation is present' : 'Aluminium gives (about) the same count as paper, so there is no beta radiation'} ✓<br>${g ? 'The count with aluminium is still well above background and is reduced by lead, so gamma radiation is present' : 'The count with aluminium is about equal to the background count, so there is no gamma radiation'} ✓<br>The source emits ${list} ✓`, ['Small differences between counts are due to the random nature of radioactive decay.']),
      text('Explain why the source must be placed close to the tube for this test.', 1, 'Alpha particles have a range of only a few centimetres in air, so they would not reach the tube from further away ✓'),
      text('State two safety precautions the student should take when using the source.', 2, PREC)
    ] };
};
T.NA2 = R => {
  const bg = R.pick([0.5, 0.6, 0.8]), d1 = R.pick([0.10, 0.15, 0.20]), d2 = R.pick([0.25, 0.30, 0.40, 0.50, 0.60]), C1 = R.pick([90, 120, 150, 200, 240]), C2 = C1 * d1 * d1 / (d2 * d2);
  return { stem: `A Geiger–Müller tube is placed ${N(d1, 2)} m from a small source of gamma radiation. The count rate is ${N(C1 + bg, 4)} s<sup>−1</sup>. The background count rate is ${N(bg, 2)} s<sup>−1</sup>.`,
    parts: [
      calc('Calculate the corrected count rate.', 1, C1, 's<sup>−1</sup>', `${eq(`${N(C1 + bg, 4)} − ${N(bg, 2)} = ${N(C1, 3)} s<sup>−1</sup>`)} ✓`, { show: N(C1, 3) }),
      calc(`The tube is moved so that it is ${N(d2, 2)} m from the source.<br>Calculate the corrected count rate at this distance.`, 2, C2, 's<sup>−1</sup>', `Count rate is proportional to 1/<i>d</i><sup>2</sup>, so ${eq(`<i>C</i> = ${N(C1, 3)} × (${N(d1, 2)} / ${N(d2, 2)})<sup>2</sup>`)} ✓<br>${eq(`<i>C</i> = ${A(C2)} s<sup>−1</sup>`)} ✓`),
      calc('Calculate the count rate that is recorded at this distance.', 1, C2 + bg, 's<sup>−1</sup>', `${eq(`${C2.toFixed(1)} + ${N(bg, 2)} = ${(C2 + bg).toFixed(1)} s<sup>−1</sup>`)} ✓`, { show: (C2 + bg).toFixed(1) }),
      text('Explain why the intensity of gamma radiation from a point source obeys an inverse-square law.', 2, 'The radiation spreads out equally in all directions and is not absorbed by the air ✓<br>The same energy passes through the surface of a sphere of area 4π<i>r</i><sup>2</sup>, so the energy per second per unit area is proportional to 1/<i>r</i><sup>2</sup> ✓'),
      text('Explain why alpha radiation in air does not obey an inverse-square law.', 1, 'Alpha particles are absorbed by the air (they ionise it strongly and have a range of only a few centimetres) ✓')
    ] };
};
T.NA3 = R => {
  const tb = R.pick([5, 10]), rb = R.pick([24, 27, 30, 33]), Nb = rb * tb, tsr = R.pick([2, 4, 5]), rs = R.pick([186, 215, 248, 312]), Ns = (rs + rb) * tsr;
  return { stem: `A student measures the count rate from a source of β<sup>−</sup> radiation. With no source present, the detector records ${Nb} counts in ${tb} minutes. With the source in place, it records ${Ns} counts in ${tsr} minutes.`,
    parts: [
      text('State two sources of background radiation.', 2, 'Any two ✓✓:<br>Radon gas (from rocks and soil).<br>Cosmic rays.<br>Rocks and building materials.<br>Food and drink.<br>Medical uses, nuclear weapons testing or nuclear accidents.'),
      calc('Calculate the background count rate in counts per minute.', 1, rb, 'counts per minute', `${eq(`${Nb} / ${tb} = ${rb} counts per minute`)} ✓`, { show: String(rb) }),
      calc('Calculate the corrected count rate from the source in counts per minute.', 2, rs, 'counts per minute', `${eq(`${Ns} / ${tsr} = ${rs + rb} counts per minute`)} ✓<br>${eq(`${rs + rb} − ${rb} = ${rs} counts per minute`)} ✓`, { show: String(rs) }),
      text('Explain why the background count was recorded over several minutes.', 1, 'Radioactive decay is random, so a larger total count has a smaller percentage uncertainty ✓'),
      text('State what a β<sup>−</sup> particle is and give its approximate range in air.', 2, 'A fast-moving electron (emitted from the nucleus) ✓<br>About 1 m (accept a few tens of centimetres to a few metres) ✓')
    ] };
};
T.NA4 = R => {
  const [use, rad, why1, why2, hl, whyhl] = R.pick([
    ['to monitor the thickness of aluminium foil as it is manufactured. The source is on one side of the moving foil and a detector is on the other', 'Beta', 'Alpha radiation would be stopped completely by the foil', 'Gamma radiation would hardly be absorbed at all, so the count would not change noticeably when the thickness changed', 'A long half-life', 'so that the count rate does not fall during use (the source does not need frequent replacement or recalibration)'],
    ['in a smoke detector. The radiation ionises the air in a small chamber, and smoke entering the chamber reduces the current', 'Alpha', 'Alpha radiation is strongly ionising, so it produces a measurable current in a small volume of air', 'It has a range of only a few centimetres in air and is stopped by the casing, so it is not a hazard to people in the room', 'A long half-life', 'so that the detector keeps working for many years without the source being replaced'],
    ['as a medical tracer. It is injected into a patient and the radiation is detected outside the body', 'Gamma', 'Gamma radiation is very penetrating, so it passes out of the body to the detector', 'It is only weakly ionising, so it does less damage to cells than alpha or beta radiation', 'A short half-life (a few hours)', 'long enough for the measurements to be made, but short enough that the patient is not exposed for a long time'],
    ['to find a leak in an underground water pipe. The source is added to the water and a detector is moved along the ground above the pipe', 'Gamma', 'Gamma radiation is penetrating enough to pass through the soil to the detector', 'Alpha and beta radiation would be absorbed by the pipe or the soil', 'A short half-life (hours or days)', 'so that the water does not stay radioactive for long']]);
  return { stem: `A radioactive source is used ${use}.`,
    parts: [
      text('State which type of radiation, alpha, beta or gamma, the source should emit.', 1, `${rad} ✓`),
      text('Explain your choice.', 2, `${why1} ✓<br>${why2} ✓`),
      text('State and explain whether the source should have a long or a short half-life.', 2, `${hl} ✓<br>${whyhl} ✓`),
      text('Compare the ionising power and the range in air of alpha, beta and gamma radiation.', 2, 'Ionising power: alpha is the most strongly ionising and gamma the least ✓<br>Range in air: alpha a few centimetres, beta about a metre, gamma is very long (it follows an inverse-square law) ✓')
    ] };
};
T.NA5 = R => {
  const act = R.pick([2.0e9, 4.0e9, 5.0e9, 8.0e9]), E = R.pick([0.36, 0.66, 1.25]), Ej = E * 1e6 * QE, P = act * Ej, r = R.pick([0.50, 0.80, 1.5, 2.0]), I = P / (4 * Math.PI * r * r);
  return { stem: `A small gamma source has an activity of ${N(act, 2)} Bq. Each decay produces one gamma photon of energy ${E} MeV. The source radiates equally in all directions.`,
    parts: [
      calc('Calculate the energy of one photon in J.', 1, Ej, 'J', `${eq(`${E} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ej)} J`)} ✓`),
      calc('Calculate the power radiated by the source.', 1, P, 'W', `${eq(`${N(act, 2)} × ${A(Ej)} = ${A(P)} W`)} ✓`),
      calc(`Calculate the intensity of the gamma radiation ${N(r, 2)} m from the source.`, 2, I, 'W m<sup>−2</sup>', `${eq(`<i>I</i> = <i>P</i> / 4π<i>r</i><sup>2</sup> = ${A(P)} / (4π × ${N(r, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>I</i> = ${A(I)} W m<sup>−2</sup>`)} ✓`),
      calc('Calculate the distance from the source at which the intensity is one quarter of this value.', 2, 2 * r, 'm', `Intensity is proportional to 1/<i>r</i><sup>2</sup>, so the distance must double ✓<br>${eq(`2 × ${N(r, 2)} = ${A(2 * r)} m`)} ✓`),
      text('State two ways of reducing the dose received by a person working with this source.', 2, 'Any two ✓✓:<br>Stay as far from the source as possible (use long-handled tongs).<br>Keep the exposure time as short as possible.<br>Use shielding (thick lead or concrete) between the source and the person.')
    ] };
};
T.NA6 = R => {
  const k = R.pick([64000, 48000, 36000]), ymax = { 64000: 700, 48000: 500, 36000: 400 }[k];
  const fig = graph({ x: [0, 50, 10], y: [0, ymax, 100], div: 5, xl: 'distance / cm', yl: `corrected count rate / s${sup(-1)}`, curves: [{ f: x => k / (x * x), from: 10, to: 50 }] });
  return { stem: `<b>Figure 1</b> shows how the corrected count rate from a gamma source varies with the distance between the source and the detector.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the corrected count rate at a distance of 20 cm.', marks: 1, ans: k / 400, unit: 's<sup>−1</sup>', show: N(k / 400, 3), tol: .08, ms: `${eq(`${N(k / 400, 3)} s<sup>−1</sup>`)} ✓`, guide: ['Reading from the graph: allow ± 10 s<sup>−1</sup>.'] },
      text('Use data from <b>Figure 1</b> to show that the count rate follows an inverse-square law.', 3, `Reads the count rate at two (or more) distances, for example ${N(k / 100, 3)} s<sup>−1</sup> at 10 cm and ${N(k / 1600, 3)} s<sup>−1</sup> at 40 cm ✓<br>Calculates count rate × distance<sup>2</sup> for each: ${eq(`${N(k / 100, 3)} × 10<sup>2</sup> = ${N(k, 2)}`)} and ${eq(`${N(k / 1600, 3)} × 40<sup>2</sup> = ${N(k, 2)}`)} ✓<br>The product is constant, so count rate is proportional to 1/distance<sup>2</sup> ✓`, ['Accept: doubling the distance reduces the count rate to one quarter, shown for two pairs of readings.']),
      calc('Predict the corrected count rate at a distance of 80 cm.', 2, k / 6400, 's<sup>−1</sup>', `${eq(`<i>C</i> = ${N(k / 1600, 3)} × (40 / 80)<sup>2</sup>`)} (or ${eq(`${N(k, 2)} / 80<sup>2</sup>`)}) ✓<br>${eq(`<i>C</i> = ${A(k / 6400)} s<sup>−1</sup>`)} ✓`, { tol: .1 })
    ] };
};

/* --- radioactive decay --- */
const ISO_SHORT = [['iodine-131', 8.02, 'days', 86400], ['sodium-24', 15.0, 'hours', 3600], ['technetium-99m', 6.0, 'hours', 3600], ['radon-222', 3.82, 'days', 86400], ['phosphorus-32', 14.3, 'days', 86400]];
T.ND1 = R => {
  const [iso, Th, unit, sec] = R.pick(ISO_SHORT), Nn = R.pick([2.0e15, 4.0e15, 5.0e14, 8.0e14, 1.5e16]), lam = Math.LN2 / (Th * sec), A0 = lam * Nn, t = R.pick(unit === 'days' ? [5.0, 10, 20, 30] : [4.0, 10, 20, 36]), At = A0 * Math.exp(-lam * t * sec);
  return { stem: `A sample contains ${N(Nn, 2)} nuclei of ${iso}, which has a half-life of ${N(Th, 3)} ${unit}.`,
    parts: [
      calc(`Calculate the decay constant of ${iso} in s<sup>−1</sup>.`, 2, lam, 's<sup>−1</sup>', `${eq(`<i>T</i><sub>½</sub> = ${N(Th, 3)} × ${sec} = ${N(Th * sec)} s`)} ✓<br>${eq(`<i>λ</i> = ln 2 / <i>T</i><sub>½</sub> = 0.693 / ${N(Th * sec)} = ${A(lam)} s<sup>−1</sup>`)} ✓`),
      calc('Calculate the activity of the sample.', 2, A0, 'Bq', `${eq(`<i>A</i> = <i>λN</i> = ${A(lam)} × ${N(Nn, 2)}`)} ✓<br>${eq(`<i>A</i> = ${A(A0)} Bq`)} ✓`),
      calc(`Calculate the activity of the sample ${N(t, 2)} ${unit} later.`, 3, At, 'Bq', `${eq(`<i>λt</i> = ${A(lam)} × ${N(t, 2)} × ${sec} = ${N(lam * t * sec)}`)} (or ${eq(`<i>t</i>/<i>T</i><sub>½</sub> = ${N(t / Th)}`)} half-lives) ✓<br>${eq(`<i>A</i> = <i>A</i><sub>0</sub>e<sup>−<i>λt</i></sup> = ${A(A0)} × e<sup>−${N(lam * t * sec)}</sup>`)} ✓<br>${eq(`<i>A</i> = ${A(At)} Bq`)} ✓`),
      text('State what is meant by the half-life of a radioactive isotope.', 1, 'The time taken for the number of nuclei of the isotope (or the activity) to fall to half its initial value ✓')
    ] };
};
T.ND2 = R => {
  const Th = R.pick([10, 20, 40]), A0 = R.pick([80, 60, 40]), unit = R.pick(['minutes', 'hours']), sec = unit === 'hours' ? 3600 : 60, lam = Math.LN2 / (Th * sec), N0 = A0 * 1e3 / lam;
  const fig = graph({ x: [0, 5 * Th, Th], y: [0, A0, A0 === 60 ? 10 : A0 / 4], div: 5, xl: `time / ${unit}`, yl: 'activity / kBq', curves: [{ f: x => A0 * Math.pow(.5, x / Th), from: 0, to: 5 * Th }] });
  return { stem: `<b>Figure 1</b> shows how the activity of a sample of a radioactive isotope varies with time.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the half-life of the isotope.', marks: 2, ans: Th, unit, show: String(Th), tol: .08, ms: `Reads the time for the activity to halve, for example from ${A0} kBq to ${A0 / 2} kBq ✓<br>${eq(`<i>T</i><sub>½</sub> = ${Th} ${unit}`)} ✓`, guide: [`Reading from the graph: allow ${N(Th * .92, 2)} to ${N(Th * 1.08, 2)} ${unit}.`, 'Using more than one pair of readings and taking a mean is good practice.'] },
      calc('Calculate the decay constant of the isotope in s<sup>−1</sup>.', 2, lam, 's<sup>−1</sup>', `${eq(`<i>T</i><sub>½</sub> = ${Th} × ${sec} = ${N(Th * sec, 2)} s`)} ✓<br>${eq(`<i>λ</i> = 0.693 / ${N(Th * sec, 2)} = ${A(lam)} s<sup>−1</sup>`)} ✓`, { tol: .08 }),
      calc('Calculate the number of nuclei of the isotope in the sample at time = 0.', 2, N0, '', `${eq(`<i>N</i> = <i>A</i>/<i>λ</i> = ${N(A0 * 1e3, 2)} / ${A(lam)}`)} ✓<br>${eq(`<i>N</i> = ${A(N0)}`)} ✓`, { tol: .08, guide: ['Award one mark if kBq is not converted to Bq.'] }),
      calc(`Calculate the activity of the sample after ${8 * Th} ${unit}.`, 2, A0 * 1e3 / 256, 'Bq', `${eq(`${8 * Th} ${unit} = 8 half-lives`)} ✓<br>${eq(`<i>A</i> = ${N(A0 * 1e3, 2)} / 2<sup>8</sup> = ${A(A0 * 1e3 / 256)} Bq`)} ✓`, { tol: .08 })
    ] };
};
const ISO_LONG = [['cobalt-60', 60, 5.27], ['strontium-90', 90, 28.8], ['caesium-137', 137, 30.2], ['americium-241', 241, 432], ['plutonium-238', 238, 87.7]];
T.ND3 = R => {
  const [iso, M, Ty] = R.pick(ISO_LONG), mug = R.pick([0.50, 1.0, 2.0, 5.0]), m = mug * 1e-6, Nn = m / M * NAV, lam = Math.LN2 / (Ty * YEAR), act = lam * Nn, t10 = Math.log(10) / Math.LN2 * Ty;
  return { stem: `A source contains ${N(mug, 2)} μg of ${iso}. The half-life of ${iso} is ${N(Ty, 3)} years and its molar mass is ${M} g mol<sup>−1</sup>.<br>Avogadro constant = 6.02 × 10<sup>23</sup> mol<sup>−1</sup><br>1 year = 3.15 × 10<sup>7</sup> s`,
    parts: [
      calc(`Calculate the number of nuclei of ${iso} in the source.`, 2, Nn, '', `${eq(`<i>N</i> = (${N(m, 2)} / ${M}) × 6.02 × 10<sup>23</sup>`)} ✓<br>${eq(`<i>N</i> = ${A(Nn)}`)} ✓`, { guide: ['Award one mark if μg is not converted to g.'] }),
      calc(`Calculate the decay constant of ${iso} in s<sup>−1</sup>.`, 2, lam, 's<sup>−1</sup>', `${eq(`<i>T</i><sub>½</sub> = ${N(Ty, 3)} × 3.15 × 10<sup>7</sup> = ${N(Ty * YEAR)} s`)} ✓<br>${eq(`<i>λ</i> = 0.693 / ${N(Ty * YEAR)} = ${A(lam)} s<sup>−1</sup>`)} ✓`),
      calc('Calculate the activity of the source.', 2, act, 'Bq', `${eq(`<i>A</i> = <i>λN</i> = ${A(lam)} × ${A(Nn)}`)} ✓<br>${eq(`<i>A</i> = ${A(act)} Bq`)} ✓`),
      calc('Calculate the time, in years, for the activity of the source to fall to 10% of its initial value.', 2, t10, 'years', `${eq('0.10 = e<sup>−<i>λt</i></sup>, so <i>t</i> = ln 10 / <i>λ</i>')} ✓<br>${eq(`<i>t</i> = (ln 10 / ln 2) × ${N(Ty, 3)} = ${A(t10)} years`)} ✓`)
    ] };
};
T.ND4 = R => {
  const pc = R.pick([84, 78, 71, 62, 55, 47, 38, 29, 21]), lam = Math.LN2 / 5730, age = Math.log(100 / pc) / lam, what = R.pick(['a wooden bowl', 'a piece of charcoal from an ancient fire', 'a wooden beam from an old ship', 'a fragment of bone']);
  return { stem: `Living organisms contain a small, constant proportion of radioactive carbon-14, which has a half-life of 5730 years. The activity of the carbon in ${what} is found to be ${pc}% of the activity of the same mass of carbon from a living organism.`,
    parts: [
      text('Explain why the proportion of carbon-14 is constant in a living organism but decreases after it dies.', 2, 'While it is alive the organism keeps taking in carbon (from the atmosphere or its food), which replaces the carbon-14 that decays ✓<br>After it dies no more carbon is taken in, so the number of carbon-14 nuclei falls as they decay ✓'),
      calc('Calculate the decay constant of carbon-14 in year<sup>−1</sup>.', 1, lam, 'year<sup>−1</sup>', `${eq(`<i>λ</i> = ln 2 / 5730 = ${A(lam)} year<sup>−1</sup>`)} ✓`),
      calc('Calculate the age of the sample in years.', 3, age, 'years', `${eq(`${N(pc / 100, 2)} = e<sup>−<i>λt</i></sup>`)} ✓<br>${eq(`<i>t</i> = ln(1 / ${N(pc / 100, 2)}) / ${A(lam)}`)} ✓<br>${eq(`<i>t</i> = ${A(age)} years`)} ✓`),
      text('Explain why this method is not reliable for samples that are more than about 50 000 years old.', 2, 'After many half-lives very little carbon-14 remains, so the activity of the sample is very low ✓<br>It is then difficult to distinguish from the background count (the percentage uncertainty is large) ✓')
    ] };
};
T.ND5 = R => {
  const lam = R.pick([1.4e-11, 2.5e-9, 7.3e-10, 3.8e-12, 9.2e-8]), Nn = R.pick([2.0e18, 5.0e17, 6.0e16, 3.0e19]), dt = R.pick([10, 60, 100]), dN = lam * Nn * dt, Th = Math.LN2 / lam;
  return { stem: `The decay constant of a radioactive isotope is ${N(lam, 2)} s<sup>−1</sup>. A sample contains ${N(Nn, 2)} nuclei of the isotope.`,
    parts: [
      text('Radioactive decay is described as random. State what this means.', 1, 'It is impossible to predict when a particular nucleus will decay (or which nucleus will decay next); each nucleus has the same probability of decaying in a given time ✓'),
      text('State what is meant by the decay constant.', 1, 'The probability that a nucleus decays in unit time (per second) ✓'),
      calc(`Calculate the number of nuclei that decay in ${dt} s.`, 2, dN, '', `${eq(`Δ<i>N</i> = <i>λN</i>Δ<i>t</i> = ${N(lam, 2)} × ${N(Nn, 2)} × ${dt}`)} ✓<br>${eq(`Δ<i>N</i> = ${A(dN)}`)} ✓`),
      calc('Calculate the half-life of the isotope in s.', 2, Th, 's', `${eq(`<i>T</i><sub>½</sub> = ln 2 / <i>λ</i> = 0.693 / ${N(lam, 2)}`)} ✓<br>${eq(`<i>T</i><sub>½</sub> = ${A(Th)} s`)} ✓`),
      text(`Explain why the equation Δ<i>N</i> = <i>λN</i>Δ<i>t</i> can be used in this calculation even though <i>N</i> changes as nuclei decay.`, 1, `${dt} s is very short compared with the half-life, so <i>N</i> (and the activity) hardly changes during this time ✓`)
    ] };
};
T.ND6 = R => {
  const lam = R.pick([0.020, 0.025, 0.040, 0.050]), y0 = R.pick([8, 9]), Th = Math.LN2 / lam;
  const fig = graph({ x: [0, 100, 20], y: [0, 10, 2], div: 5, xl: 'time / s', yl: 'ln (activity / Bq)', curves: [{ f: x => y0 - lam * x, from: 0, to: 100 }] });
  return { stem: `A student measures the activity <i>A</i> of a sample of a short-lived isotope at different times <i>t</i>. <b>Figure 1</b> shows a graph of ln <i>A</i> against <i>t</i>.`, figs: [fig],
    parts: [
      text('Explain why the graph is a straight line with a negative gradient.', 2, `${eq('<i>A</i> = <i>A</i><sub>0</sub>e<sup>−<i>λt</i></sup>, so ln <i>A</i> = ln <i>A</i><sub>0</sub> − <i>λt</i>')} ✓<br>This has the form <i>y</i> = <i>mx</i> + <i>c</i>, with gradient −<i>λ</i> ✓`),
      { q: 'Use <b>Figure 1</b> to determine the decay constant of the isotope.', marks: 3, ans: lam, unit: 's<sup>−1</sup>', show: N(lam, 2), tol: .08, ms: `Uses a triangle that covers at least half of the line ✓<br>gradient ${eq(`= (${N(y0 - lam * 100, 2)} − ${y0}.0) / (100 − 0) = −${N(lam, 2)}`)} ✓<br>${eq(`<i>λ</i> = ${N(lam, 2)} s<sup>−1</sup>`)} ✓`, guide: [`Reading from the graph: allow ${N(lam * .93, 2)} to ${N(lam * 1.07, 2)} s<sup>−1</sup>.`] },
      calc('Calculate the half-life of the isotope.', 2, Th, 's', `${eq(`<i>T</i><sub>½</sub> = ln 2 / <i>λ</i> = 0.693 / ${N(lam, 2)}`)} ✓<br>${eq(`<i>T</i><sub>½</sub> = ${A(Th)} s`)} ✓`, { tol: .08 })
    ] };
};
T.ND7 = R => {
  const [iso, Th] = R.pick([['technetium-99m', 6.0], ['iodine-123', 13.2], ['fluorine-18', 1.83]]), A0 = R.pick([400, 500, 600, 800]), t1 = R.pick(Th < 3 ? [1.0, 2.5, 4.0] : [4.0, 9.0, 15]), lam = Math.LN2 / Th, A1 = A0 * Math.exp(-lam * t1), Af = R.pick([10, 20, 25]), tf = Math.log(A0 / Af) / lam;
  return { stem: `A hospital prepares a sample of ${iso} with an activity of ${A0} MBq for use as a medical tracer. The half-life of ${iso} is ${N(Th, 3)} hours.`,
    parts: [
      calc(`Calculate the decay constant of ${iso} in hour<sup>−1</sup>.`, 1, lam, 'hour<sup>−1</sup>', `${eq(`<i>λ</i> = ln 2 / ${N(Th, 3)} = ${A(lam)} hour<sup>−1</sup>`)} ✓`),
      calc(`The sample is injected into a patient ${N(t1, 2)} hours after it is prepared.<br>Calculate the activity of the sample when it is injected.`, 2, A1, 'MBq', `${eq(`<i>A</i> = <i>A</i><sub>0</sub>e<sup>−<i>λt</i></sup> = ${A0} × e<sup>−${A(lam)} × ${N(t1, 2)}</sup>`)} ✓<br>${eq(`<i>A</i> = ${A(A1)} MBq`)} ✓`),
      calc(`Calculate the time after preparation at which the activity of the sample has fallen to ${Af} MBq.`, 3, tf, 'hours', `${eq(`${Af} = ${A0} e<sup>−<i>λt</i></sup>`)} ✓<br>${eq(`<i>t</i> = ln(${A0} / ${Af}) / ${A(lam)}`)} ✓<br>${eq(`<i>t</i> = ${A(tf)} hours`)} ✓`),
      text('Explain why an isotope with a half-life of a few hours is suitable for use as a medical tracer.', 2, 'The half-life is long enough for the tracer to reach the organ and for the measurements to be made ✓<br>It is short enough for the activity in the patient to fall quickly afterwards, which limits the dose received ✓')
    ] };
};

/* --- nuclear instability --- */
const stab = z => z + 0.0065 * z * z;
function nzFig(){
  const lab = (name, at) => ({ f: () => -1, from: 0, to: 0, name, at });
  return graph({ x: [0, 100, 20], y: [0, 160, 40], div: 4, xl: 'proton number Z', yl: 'neutron number N', curves: [{ f: stab, from: 0, to: 83 }, { f: z => z, from: 0, to: 100, name: 'N = Z', at: [88, 76] }, lab('P', [40, 72]), lab('Q', [66, 80]), lab('R', [90, 146]), lab('line of stability', [50, 124])] });
}
T.NI1 = R => ({ stem: `<b>Figure 1</b> shows the line of stability on a graph of neutron number <i>N</i> against proton number <i>Z</i>. The line <i>N</i> = <i>Z</i> is also shown. <b>P</b>, <b>Q</b> and <b>R</b> mark three regions in which unstable nuclei are found: <b>P</b> is above the line of stability, <b>Q</b> is below it and <b>R</b> is beyond its upper end.`, figs: [nzFig()],
  parts: [
    text('Describe how the neutron number of stable nuclei varies with proton number.', 2, 'For light nuclei (<i>Z</i> up to about 20) <i>N</i> is equal to <i>Z</i> ✓<br>For heavier nuclei <i>N</i> is greater than <i>Z</i>, and the ratio <i>N</i>/<i>Z</i> increases (to about 1.5) ✓'),
    text('Explain why heavy stable nuclei contain more neutrons than protons.', 2, 'The electrostatic repulsion between protons has a long range, so it grows rapidly as the number of protons increases ✓<br>Extra neutrons increase the attractive strong nuclear force (and the separation of the protons) without adding to the repulsion ✓'),
    text('State and explain the type of decay expected for a nucleus in region <b>P</b>.', 2, 'β<sup>−</sup> decay ✓<br>The nucleus has too many neutrons; in β<sup>−</sup> decay a neutron changes into a proton, which moves the nucleus towards the line of stability ✓'),
    text('State the type of decay expected for a nucleus in region <b>Q</b>.', 1, 'β<sup>+</sup> decay (or electron capture) ✓'),
    text('State the type of decay expected for a nucleus in region <b>R</b>.', 1, 'Alpha decay ✓')
  ] });
T.NI2 = R => {
  const [p, Ap, Zp, d, Ad, Zd] = R.pick([['uranium-238', 238, 92, 'lead-206', 206, 82], ['thorium-232', 232, 90, 'lead-208', 208, 82], ['uranium-235', 235, 92, 'lead-207', 207, 82], ['neptunium-237', 237, 93, 'bismuth-209', 209, 83]]), na = (Ap - Ad) / 4, nb = 2 * na - (Zp - Zd);
  return { stem: `A nucleus of ${p} (proton number ${Zp}) decays through a series of alpha and β<sup>−</sup> decays until it becomes a stable nucleus of ${d} (proton number ${Zd}).`,
    parts: [
      text('State how the nucleon number and the proton number of a nucleus change in an alpha decay and in a β<sup>−</sup> decay.', 2, 'Alpha decay: nucleon number decreases by 4 and proton number decreases by 2 ✓<br>β<sup>−</sup> decay: nucleon number does not change and proton number increases by 1 ✓'),
      calc('Determine the number of alpha decays in the series.', 2, na, '', `Only alpha decay changes the nucleon number: ${eq(`${Ap} − ${Ad} = ${Ap - Ad}`)} ✓<br>${eq(`${Ap - Ad} / 4 = ${na}`)} alpha decays ✓`, { show: String(na) }),
      calc('Determine the number of β<sup>−</sup> decays in the series.', 2, nb, '', `${na} alpha decays reduce the proton number by ${2 * na}, to ${Zp - 2 * na} ✓<br>The final proton number is ${Zd}, so there are ${eq(`${Zd} − ${Zp - 2 * na} = ${nb}`)} β<sup>−</sup> decays ✓`, { show: String(nb) }),
      text('Explain why β<sup>−</sup> decays occur in a series that starts with alpha decays.', 1, 'Each alpha decay removes two protons and two neutrons, which leaves a nucleus with too many neutrons for its proton number (above the line of stability), so β<sup>−</sup> decay follows ✓')
    ] };
};
T.NI3 = R => {
  const e1 = R.pick([0.35, 0.48, 0.66, 0.84]), e2 = n2(e1 + R.pick([0.51, 0.72, 1.17])), d = n2(e2 - e1), EdJ = d * 1e6 * QE, E1J = e1 * 1e6 * QE, lam = H * C / E1J;
  const fig = levelFig([{ name: 'ground state', e: '0' }, { name: 'level A', e: e1.toFixed(2) }, { name: 'level B', e: e2.toFixed(2) }], 'MeV', 'Energy levels of a nucleus: ground state at 0, level A and level B above it');
  return { stem: `After a β<sup>−</sup> decay, the daughter nucleus is left in an excited state. <b>Figure 1</b> shows the energy levels of the daughter nucleus. The nucleus is in level <b>B</b> immediately after the decay.`, figs: [fig],
    parts: [
      text('State how the excited nucleus loses its excess energy.', 1, 'It emits a gamma photon (as it moves to a lower energy level) ✓'),
      calc('The nucleus moves from level <b>B</b> to level <b>A</b>.<br>Calculate the energy, in J, of the photon that is emitted.', 2, EdJ, 'J', `${eq(`${e2.toFixed(2)} − ${e1.toFixed(2)} = ${d.toFixed(2)} MeV`)} ✓<br>${eq(`${d.toFixed(2)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(EdJ)} J`)} ✓`),
      calc('The nucleus then moves from level <b>A</b> to the ground state.<br>Calculate the wavelength of the photon that is emitted.', 3, lam, 'm', `${eq(`<i>E</i> = ${e1.toFixed(2)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(E1J)} J`)} ✓<br>${eq(`<i>λ</i> = <i>hc</i>/<i>E</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${A(E1J)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('State the number of different photon energies that could be emitted as nuclei in level <b>B</b> return to the ground state.', 1, '3 (B to A, A to ground state, and B directly to ground state) ✓')
    ] };
};
T.NI4 = R => {
  const [pn, ps, Z, Am, dn, ds] = R.pick([['fluorine', 'F', 9, 18, 'oxygen', 'O'], ['carbon', 'C', 6, 11, 'boron', 'B'], ['sodium', 'Na', 11, 22, 'neon', 'Ne'], ['nitrogen', 'N', 7, 13, 'carbon', 'C'], ['oxygen', 'O', 8, 15, 'nitrogen', 'N']]);
  return { stem: `A nucleus of ${pn}-${Am}, ${nuc(Am, Z, ps)}, is unstable and decays by β<sup>+</sup> emission to an isotope of ${dn} (${ds}).`,
    parts: [
      text(`State why a nucleus of ${pn}-${Am} decays by β<sup>+</sup> emission and not by β<sup>−</sup> emission.`, 1, 'It has too few neutrons (too many protons) to be stable: it lies below the line of stability ✓'),
      text('Write the equation for this decay.', 2, `${eq(`${nuc(Am, Z, ps)} → ${nuc(Am, Z - 1, ds)} + ${nuc(0, '+1', 'e')} + ν<sub>e</sub>`)}<br>Daughter nucleus ${nuc(Am, Z - 1, ds)} ✓<br>Positron and electron neutrino ✓`, [`Accept ${nuc(0, '+1', 'β')} for the positron.`]),
      text(`A nucleus of ${pn}-${Am} can also decay by electron capture.<br>Write the equation for this process.`, 2, `${eq(`${nuc(Am, Z, ps)} + ${nuc(0, '−1', 'e')} → ${nuc(Am, Z - 1, ds)} + ν<sub>e</sub>`)}<br>Electron on the left-hand side and the same daughter nucleus ✓<br>Electron neutrino on the right-hand side ✓`),
      text('State how the neutron number and the proton number of the nucleus change in each of these processes, and how this moves the nucleus on a graph of <i>N</i> against <i>Z</i>.', 2, 'The neutron number increases by 1 and the proton number decreases by 1 ✓<br>The nucleus moves up and to the left (diagonally), towards the line of stability ✓')
    ] };
};
T.NI5 = R => {
  const [iso, E, use] = R.pick([['technetium-99m', 0.140, true], ['barium-137m', 0.662, false], ['technetium-99m', 0.140, true]]), Ej = E * 1e6 * QE, f = Ej / H, lam = C / f;
  return { stem: `A nucleus of ${iso} is in a metastable state. It decays to its ground state by emitting a gamma photon of energy ${N(E, 3)} MeV.`,
    parts: [
      text('State what is meant by a metastable state.', 1, 'An excited state of the nucleus that lasts for an unusually long time before the nucleus emits a gamma photon ✓'),
      text('State how the nucleon number and the proton number of the nucleus change when the gamma photon is emitted.', 1, 'Neither changes ✓'),
      calc('Calculate the frequency of the gamma photon.', 3, f, 'Hz', `${eq(`<i>E</i> = ${N(E, 3)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ej)} J`)} ✓<br>${eq(`<i>f</i> = <i>E</i>/<i>h</i> = ${A(Ej)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      calc('Calculate the wavelength of the gamma photon.', 1, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = 3.00 × 10<sup>8</sup> / ${A(f)} = ${A(lam)} m`)} ✓`),
      text(use ? 'Technetium-99m is widely used as a tracer in medical diagnosis.<br>Give two reasons why a source that emits only gamma radiation is suitable for this.' : 'Give two reasons why a source that emits only gamma radiation is more suitable than an alpha source as a tracer inside the body.', 2, 'Gamma radiation is very penetrating, so it leaves the body and can be detected outside ✓<br>It is weakly ionising, so it causes much less damage to cells than alpha or beta radiation ✓')
    ] };
};
T.NI6 = R => {
  const [Am, Z, sym, name] = R.pick([[238, 92, 'U', 'uranium'], [232, 90, 'Th', 'thorium'], [226, 88, 'Ra', 'radium'], [210, 82, 'Pb', 'lead'], [234, 91, 'Pa', 'protactinium']]), seq = R.pick([['α', 'β', 'β'], ['α', 'α', 'β'], ['β', 'α', 'β'], ['β', 'β', 'α'], ['α', 'β', 'α']]);
  const step = (s, d) => d === 'α' ? [s[0] - 4, s[1] - 2] : [s[0], s[1] + 1], s1 = step([Am, Z], seq[0]), s3 = seq.slice(1).reduce(step, s1), nm = d => d === 'α' ? 'an alpha decay' : 'a β<sup>−</sup> decay', same = s3[1] === Z;
  return { stem: `A nucleus of ${name}, ${nuc(Am, Z, sym)}, undergoes three decays in turn: ${nm(seq[0])}, then ${nm(seq[1])}, then ${nm(seq[2])}.`,
    parts: [
      text('State the nucleon number and the proton number of the nucleus after the first decay.', 2, `Nucleon number ${s1[0]} ✓<br>Proton number ${s1[1]} ✓`),
      text('Determine the nucleon number and the proton number of the nucleus after all three decays.', 2, `Nucleon number ${s3[0]} ✓<br>Proton number ${s3[1]} ✓`),
      calc('Calculate the number of neutrons in the final nucleus.', 1, s3[0] - s3[1], '', `${eq(`${s3[0]} − ${s3[1]} = ${s3[0] - s3[1]}`)} ✓`, { show: String(s3[0] - s3[1]) }),
      text(`State and explain whether the final nucleus is an isotope of ${name}.`, 2, `${same ? 'Yes' : 'No'} ✓<br>It has ${same ? 'the same proton number' : 'a different proton number'} (${s3[1]}${same ? '' : `, not ${Z}`})${same ? ' but a different nucleon number' : ''} ✓`)
    ] };
};

/* --- nuclear radius --- */
const NUCS = [['carbon-12', 12], ['oxygen-16', 16], ['aluminium-27', 27], ['calcium-40', 40], ['iron-56', 56], ['silver-108', 108], ['gold-197', 197], ['lead-208', 208], ['uranium-238', 238]];
const R0S = `<i>R</i><sub>0</sub>`, FM = n => `${n} × 10<sup>−15</sup> m`;
T.NS1 = R => {
  const [nm, An] = R.pick(NUCS), R0 = R.pick([1.2, 1.25, 1.3, 1.4]) * 1e-15, r = R0 * Math.cbrt(An), vol = 4 / 3 * Math.PI * r * r * r, m = An * U, rho = m / vol;
  return { stem: `The radius <i>R</i> of a nucleus with nucleon number <i>A</i> is given by <i>R</i> = ${R0S}<i>A</i><sup>1/3</sup>, where ${R0S} = ${N(R0, 3)} m.<br>${UDATA}`,
    parts: [
      calc(`Calculate the radius of a nucleus of ${nm}.`, 2, r, 'm', `${eq(`<i>R</i> = ${N(R0, 3)} × ${An}<sup>1/3</sup>`)} ✓<br>${eq(`<i>R</i> = ${A(r)} m`)} ✓`),
      calc('Calculate the volume of the nucleus.', 2, vol, 'm<sup>3</sup>', `${eq(`<i>V</i> = (4/3)π<i>R</i><sup>3</sup> = (4/3)π × (${A(r)})<sup>3</sup>`)} ✓<br>${eq(`<i>V</i> = ${A(vol)} m<sup>3</sup>`)} ✓`),
      calc('Estimate the mass of the nucleus in kg.', 1, m, 'kg', `${eq(`${An} × 1.661 × 10<sup>−27</sup> = ${A(m)} kg`)} ✓`),
      calc('Calculate the density of the nucleus.', 2, rho, 'kg m<sup>−3</sup>', `${eq(`<i>ρ</i> = <i>m</i>/<i>V</i> = ${A(m)} / ${A(vol)}`)} ✓<br>${eq(`<i>ρ</i> = ${A(rho)} kg m<sup>−3</sup>`)} ✓`),
      text('State how this density compares with the density of ordinary matter and what this suggests about the structure of an atom.', 1, 'It is very much greater (by a factor of about 10<sup>14</sup>), so most of the mass of an atom is in a very small nucleus and most of the atom is empty space ✓')
    ] };
};
T.NS2 = R => {
  const R0 = R.pick([1.2, 1.25, 1.3]), [nm, An] = R.pick(NUCS.slice(3));
  const fig = graph({ x: [0, 6, 1], y: [0, 8, 2], div: 5, xl: `A${sup(1)}ᐟ${sup(3)}`, yl: `nuclear radius / 10${sup(-15)} m`, curves: [{ f: x => R0 * x, from: 0, to: 6 }] });
  return { stem: `The radii <i>R</i> of several nuclei are measured by electron diffraction. <b>Figure 1</b> shows a graph of <i>R</i> against <i>A</i><sup>1/3</sup>, where <i>A</i> is the nucleon number.`, figs: [fig],
    parts: [
      text('State what the graph shows about the relationship between <i>R</i> and <i>A</i>.', 1, '<i>R</i> is directly proportional to <i>A</i><sup>1/3</sup> (a straight line through the origin) ✓'),
      { q: `Use <b>Figure 1</b> to determine the constant ${R0S} in the equation <i>R</i> = ${R0S}<i>A</i><sup>1/3</sup>.`, marks: 3, ans: R0 * 1e-15, unit: 'm', show: N(R0 * 1e-15, 3), tol: .05, ms: `${R0S} is the gradient of the graph ✓<br>Uses a large triangle, for example ${eq(`(${N(R0 * 6, 3)} × 10<sup>−15</sup> − 0) / (6.0 − 0)`)} ✓<br>${eq(`${R0S} = ${N(R0 * 1e-15, 3)} m`)} ✓`, guide: [`Reading from the graph: allow ${N(R0 * .96, 3)} to ${N(R0 * 1.04, 3)} × 10<sup>−15</sup> m.`, 'Award a maximum of two marks if the power of ten on the axis is ignored.'] },
      calc(`Calculate the radius of a nucleus of ${nm}.`, 2, R0 * 1e-15 * Math.cbrt(An), 'm', `${eq(`<i>R</i> = ${N(R0 * 1e-15, 3)} × ${An}<sup>1/3</sup>`)} ✓<br>${eq(`<i>R</i> = ${A(R0 * 1e-15 * Math.cbrt(An))} m`)} ✓`, { tol: .05 }),
      text('Explain what the relationship between <i>R</i> and <i>A</i> shows about the density of nuclear matter.', 2, 'The volume of a nucleus is proportional to <i>R</i><sup>3</sup>, so it is proportional to <i>A</i> (to the mass of the nucleus) ✓<br>Mass ÷ volume is therefore the same for all nuclei: the density of nuclear matter is constant ✓')
    ] };
};
T.NS3 = R => {
  const v = find(() => { const [nm, An] = R.pick(NUCS.slice(0, 5)), E = R.pick([300, 350, 400, 420, 450, 500]); const lam = H * C / (E * 1e6 * QE), s = 0.61 * lam / (1.2e-15 * Math.cbrt(An)); return { nm, An, E, lam, th: Math.round(Math.asin(Math.min(s, 1)) * 180 / Math.PI), s }; }, x => x.s < .8 && x.s > .3);
  const Ej = v.E * 1e6 * QE, r = 0.61 * v.lam / Math.sin(deg(v.th));
  return { stem: `A beam of electrons, each of energy ${v.E} MeV, is directed at a thin sample of ${v.nm}. The electrons are diffracted by the nuclei, and the first minimum of the diffraction pattern is at an angle <i>θ</i> of ${v.th}° to the original direction of the beam.<br>The angle of the first minimum is given by sin <i>θ</i> = 0.61<i>λ</i>/<i>R</i>, where <i>R</i> is the radius of the nucleus. At this energy the de Broglie wavelength of an electron is given by <i>λ</i> = <i>hc</i>/<i>E</i>.`,
    parts: [
      calc('Calculate the de Broglie wavelength of the electrons.', 2, v.lam, 'm', `${eq(`<i>E</i> = ${v.E} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ej)} J`)} ✓<br>${eq(`<i>λ</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${A(Ej)} = ${A(v.lam)} m`)} ✓`),
      calc(`Calculate the radius of the ${v.nm} nucleus.`, 2, r, 'm', `${eq(`<i>R</i> = 0.61<i>λ</i> / sin <i>θ</i> = (0.61 × ${A(v.lam)}) / sin ${v.th}°`)} ✓<br>${eq(`<i>R</i> = ${A(r)} m`)} ✓`),
      text('Sketch a graph to show how the intensity of the diffracted electrons varies with the angle of diffraction.', 2, 'Intensity is greatest at 0° and falls steeply as the angle increases ✓<br>It falls to a minimum (not zero) and then rises to a much smaller maximum ✓'),
      text('Give two reasons why high-energy electrons are more suitable than alpha particles for measuring the radius of a nucleus.', 2, 'Electrons are leptons, so they are not affected by the strong nuclear force ✓<br>They are not repelled by the nucleus, so they can be diffracted by it and give its radius directly (alpha particles only give an upper limit, from the distance of closest approach) ✓')
    ] };
};
T.NS4 = R => {
  const R0 = R.pick([1.2, 1.25, 1.3, 1.4]) * 1e-15, rho = U / (4 / 3 * Math.PI * R0 * R0 * R0);
  return { stem: `The radius of a nucleus with nucleon number <i>A</i> is given by <i>R</i> = ${R0S}<i>A</i><sup>1/3</sup>, where ${R0S} = ${N(R0, 3)} m. The mass of a nucleon is about 1.661 × 10<sup>−27</sup> kg.`,
    parts: [
      text('Show that the density of a nucleus does not depend on its nucleon number.', 3, `Mass of nucleus ${eq('= <i>Am</i>')}, where <i>m</i> is the mass of a nucleon ✓<br>Volume ${eq(`= (4/3)π<i>R</i><sup>3</sup> = (4/3)π${R0S}<sup>3</sup><i>A</i>`)} ✓<br>Density ${eq(`= <i>Am</i> / (4/3)π${R0S}<sup>3</sup><i>A</i> = 3<i>m</i> / 4π${R0S}<sup>3</sup>`)}, in which <i>A</i> cancels ✓`),
      calc('Calculate the density of nuclear matter.', 3, rho, 'kg m<sup>−3</sup>', `${eq(`<i>ρ</i> = 3<i>m</i> / 4π${R0S}<sup>3</sup>`)} ✓<br>${eq(`<i>ρ</i> = (3 × 1.661 × 10<sup>−27</sup>) / (4π × (${N(R0, 3)})<sup>3</sup>)`)} ✓<br>${eq(`<i>ρ</i> = ${A(rho)} kg m<sup>−3</sup>`)} ✓`),
      text('State what the constant density suggests about the way nucleons are arranged in a nucleus.', 1, 'The nucleons are packed closely together with (about) the same separation in every nucleus ✓'),
      text('Explain why the density of an atom is very much less than the density of its nucleus.', 1, 'Nearly all the mass of the atom is in the nucleus, but the volume of the atom is very much greater than the volume of the nucleus ✓')
    ] };
};
T.NS5 = R => {
  const R0 = R.pick([1.2, 1.25, 1.3]) * 1e-15, [n1, A1] = R.pick(NUCS.slice(0, 4)), [n2_, A2] = R.pick(NUCS.slice(5)), r1 = Number((R0 * Math.cbrt(A1)).toPrecision(3)), R0c = r1 / Math.cbrt(A1), r2 = R0c * Math.cbrt(A2);
  return { stem: `The radius of a nucleus of ${n1} is ${N(r1, 3)} m. The radius <i>R</i> of a nucleus is related to its nucleon number <i>A</i> by <i>R</i> = ${R0S}<i>A</i><sup>1/3</sup>.`,
    parts: [
      calc(`Calculate the constant ${R0S}.`, 2, R0c, 'm', `${eq(`${R0S} = <i>R</i> / <i>A</i><sup>1/3</sup> = ${N(r1, 3)} / ${A1}<sup>1/3</sup>`)} ✓<br>${eq(`${R0S} = ${A(R0c)} m`)} ✓`),
      calc(`Calculate the radius of a nucleus of ${n2_}.`, 2, r2, 'm', `${eq(`<i>R</i> = ${A(R0c)} × ${A2}<sup>1/3</sup>`)} (or ${eq(`${N(r1, 3)} × (${A2} / ${A1})<sup>1/3</sup>`)}) ✓<br>${eq(`<i>R</i> = ${A(r2)} m`)} ✓`),
      calc(`Calculate the ratio volume of a ${n2_} nucleus ÷ volume of a ${n1} nucleus.`, 2, A2 / A1, '', `Volume is proportional to <i>R</i><sup>3</sup>, which is proportional to <i>A</i> ✓<br>${eq(`${A2} / ${A1} = ${A(A2 / A1)}`)} ✓`),
      text('State one method of measuring the radius of a nucleus.', 1, 'Diffraction of high-energy electrons by the nucleus (accept: closest approach of alpha particles, as an upper limit) ✓')
    ] };
};
T.NS6 = R => {
  const R0 = R.pick([1.2, 1.3, 1.4]) * 1e-15, rho = U / (4 / 3 * Math.PI * R0 * R0 * R0), M = R.pick([2.8e30, 3.0e30, 3.6e30, 4.0e30]), vol = M / rho, r = Math.cbrt(3 * vol / (4 * Math.PI));
  return { stem: `A neutron star is made of matter that has about the same density as an atomic nucleus. The radius of a nucleus with nucleon number <i>A</i> is ${R0S}<i>A</i><sup>1/3</sup>, where ${R0S} = ${N(R0, 2)} m. The mass of a nucleon is 1.661 × 10<sup>−27</sup> kg.`,
    parts: [
      calc('Calculate the density of nuclear matter by considering a single nucleon (<i>A</i> = 1).', 3, rho, 'kg m<sup>−3</sup>', `Volume ${eq(`= (4/3)π × (${N(R0, 2)})<sup>3</sup> = ${A(4 / 3 * Math.PI * R0 * R0 * R0)} m<sup>3</sup>`)} ✓<br>${eq(`<i>ρ</i> = 1.661 × 10<sup>−27</sup> / ${A(4 / 3 * Math.PI * R0 * R0 * R0)}`)} ✓<br>${eq(`<i>ρ</i> = ${A(rho)} kg m<sup>−3</sup>`)} ✓`),
      calc(`A neutron star has a mass of ${N(M, 2)} kg.<br>Calculate the radius of the neutron star.`, 3, r, 'm', `${eq(`<i>V</i> = <i>M</i>/<i>ρ</i> = ${N(M, 2)} / ${A(rho)} = ${A(vol)} m<sup>3</sup>`)} ✓<br>${eq(`<i>r</i> = (3<i>V</i> / 4π)<sup>1/3</sup>`)} ✓<br>${eq(`<i>r</i> = ${A(r)} m`)} ✓`),
      text('State one assumption made in this calculation.', 1, 'The density of the neutron star is uniform and equal to the density of a nucleus (the star is a sphere of closely packed neutrons) ✓')
    ] };
};

/* --- mass and energy --- */
const MPU = 1.00728, MNU = 1.00867, MASSDATA = `mass of proton = 1.00728 u<br>mass of neutron = 1.00867 u<br>1 u = 931.5 MeV`;
T.NE1 = R => {
  const [nm, sym, Z, Am, mass] = R.pick([['helium-4', 'He', 2, 4, 4.00151], ['carbon-12', 'C', 6, 12, 11.99671], ['oxygen-16', 'O', 8, 16, 15.99052], ['iron-56', 'Fe', 26, 56, 55.92068], ['lithium-7', 'Li', 3, 7, 7.01436], ['uranium-235', 'U', 92, 235, 234.99346]]);
  const sum = Z * MPU + (Am - Z) * MNU, dm = sum - mass, be = dm * MEVU, per = be / Am;
  return { stem: `The mass of a nucleus of ${nm}, ${nuc(Am, Z, sym)}, is ${F5(mass)} u.<br>${MASSDATA}`,
    parts: [
      text('State the number of protons and the number of neutrons in the nucleus.', 1, `${Z} protons and ${Am - Z} neutrons ✓`),
      calc('Calculate the mass defect of the nucleus in u.', 2, dm, 'u', `Total mass of separate nucleons ${eq(`= (${Z} × 1.00728) + (${Am - Z} × 1.00867) = ${F5(sum)} u`)} ✓<br>Mass defect ${eq(`= ${F5(sum)} − ${F5(mass)} = ${F5(dm)} u`)} ✓`, { show: F5(dm), tol: .002 }),
      calc('Calculate the binding energy of the nucleus in MeV.', 1, be, 'MeV', `${eq(`${F5(dm)} × 931.5 = ${N(be, 4)} MeV`)} ✓`, { show: N(be, 4), tol: .003 }),
      calc('Calculate the binding energy per nucleon of the nucleus.', 1, per, 'MeV', `${eq(`${N(be, 4)} / ${Am} = ${N(per, 3)} MeV`)} per nucleon ✓`, { show: N(per, 3), tol: .005 }),
      text('State what is meant by the binding energy of a nucleus and explain why the binding energy per nucleon is a useful measure of stability.', 2, 'The binding energy is the energy needed to separate a nucleus completely into its individual protons and neutrons ✓<br>The greater the binding energy per nucleon, the more energy is needed to remove each nucleon, so the more stable the nucleus (iron-56 has about the greatest value) ✓')
    ] };
};
function semf(a){ const z = a / (2 + 0.015 * Math.pow(a, 2 / 3)); return Math.max(0, 15.75 - 17.8 * Math.pow(a, -1 / 3) - 0.711 * z * (z - 1) * Math.pow(a, -4 / 3) - 23.7 * (a - 2 * z) * (a - 2 * z) / (a * a)); }
T.NE2 = R => {
  const bf = R.pick([8.4, 8.5, 8.6]), bu = 7.6, Af = R.pick([235, 236]), E = Af * (bf - bu);
  const fig = graph({ x: [0, 240, 40], y: [0, 10, 2], div: 4, xl: 'nucleon number A', yl: 'binding energy per nucleon / MeV', curves: [{ f: semf, from: 2, to: 240 }] });
  return { stem: `<b>Figure 1</b> shows, in simplified form, how the binding energy per nucleon varies with nucleon number.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to estimate the nucleon number of the most stable nuclei.', marks: 1, ans: 58, unit: '', show: '60', tol: .22, ms: 'About 60 (the peak of the curve) ✓', guide: ['Allow any value from 50 to 70. The most stable nucleus is iron-56.'] },
      text('Explain, with reference to <b>Figure 1</b>, why energy is released when two light nuclei fuse.', 2, 'The nucleus formed has a greater binding energy per nucleon than the two light nuclei ✓<br>so the total binding energy increases (the mass decreases), and the difference is released ✓'),
      calc(`In the fission of a nucleus with ${Af} nucleons, the binding energy per nucleon increases from ${N(bu, 2)} MeV to an average of ${N(bf, 2)} MeV for the fragments.<br>Estimate the energy released in MeV.`, 2, E, 'MeV', `Increase in binding energy per nucleon ${eq(`= ${N(bf, 2)} − ${N(bu, 2)} = ${N(bf - bu, 2)} MeV`)} ✓<br>Energy released ${eq(`≈ ${Af} × ${N(bf - bu, 2)} = ${A(E)} MeV`)} ✓`),
      text('Explain why fusion releases more energy per nucleon than fission.', 1, 'The curve is much steeper at low nucleon numbers, so the increase in binding energy per nucleon is much greater in fusion ✓'),
      text('Explain why a nucleus of iron-56 cannot release energy by fission or by fusion.', 1, 'It is at the peak of the curve, so either process would produce nuclei with a smaller binding energy per nucleon (energy would have to be supplied) ✓')
    ] };
};
T.NE3 = R => {
  const [a, am, b, bm, x] = R.pick([[nuc(141, 56, 'Ba'), 140.91441, nuc(92, 36, 'Kr'), 91.92616, 3], [nuc(140, 54, 'Xe'), 139.92165, nuc(94, 38, 'Sr'), 93.91536, 2]]), mU = 235.04393;
  const dm = mU + MNU - am - bm - x * MNU, E = dm * MEVU, Ej = E * 1e6 * QE, Nn = 1000 / 235 * NAV, tot = Nn * Ej;
  return { stem: `One possible fission reaction of uranium-235 is<br>${eq(`${nuc(235, 92, 'U')} + ${nuc(1, 0, 'n')} → ${a} + ${b} + <i>x</i> ${nuc(1, 0, 'n')}`)}<br>masses: ${nuc(235, 92, 'U')} = ${F5(mU)} u &nbsp; ${a} = ${F5(am)} u &nbsp; ${b} = ${F5(bm)} u &nbsp; neutron = 1.00867 u<br>1 u = 931.5 MeV<br>Avogadro constant = 6.02 × 10<sup>23</sup> mol<sup>−1</sup>`,
    parts: [
      calc('Determine <i>x</i>, the number of neutrons released.', 1, x, '', `Nucleon number is conserved: ${eq(`235 + 1 = ${a.match(/<sup>(\d+)/)[1]} + ${b.match(/<sup>(\d+)/)[1]} + <i>x</i>, so <i>x</i> = ${x}`)} ✓`, { show: String(x) }),
      calc('Calculate the decrease in mass, in u, in this reaction.', 2, dm, 'u', `Mass before ${eq(`= ${F5(mU)} + 1.00867 = ${F5(mU + MNU)} u`)}; mass after ${eq(`= ${F5(am)} + ${F5(bm)} + (${x} × 1.00867) = ${F5(am + bm + x * MNU)} u`)} ✓<br>Decrease ${eq(`= ${F5(dm)} u`)} ✓`, { show: F5(dm), tol: .003 }),
      calc('Calculate the energy released in MeV.', 1, E, 'MeV', `${eq(`${F5(dm)} × 931.5 = ${N(E, 4)} MeV`)} ✓`, { show: N(E, 4), tol: .005 }),
      calc('Calculate the energy, in J, released by the fission of all the nuclei in 1.0 kg of uranium-235.', 3, tot, 'J', `Number of nuclei ${eq(`= (1000 / 235) × 6.02 × 10<sup>23</sup> = ${N(Nn)}`)} ✓<br>Energy per fission ${eq(`= ${N(E, 4)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${N(Ej)} J`)} ✓<br>Total ${eq(`= ${N(Nn)} × ${N(Ej)} = ${A(tot)} J`)} ✓`, { tol: .01 }),
      text('State the form in which most of this energy is released.', 1, 'Kinetic energy of the fission fragments (and of the neutrons) ✓')
    ] };
};
T.NE4 = R => {
  const [lhs, m1, m2, rhs, m3, m4, l1, l2, l3, l4] = R.pick([[`${nuc(2, 1, 'H')} + ${nuc(3, 1, 'H')}`, 2.01410, 3.01605, `${nuc(4, 2, 'He')} + ${nuc(1, 0, 'n')}`, 4.00260, 1.00867, nuc(2, 1, 'H'), nuc(3, 1, 'H'), nuc(4, 2, 'He'), 'neutron'], [`${nuc(2, 1, 'H')} + ${nuc(2, 1, 'H')}`, 2.01410, 2.01410, `${nuc(3, 2, 'He')} + ${nuc(1, 0, 'n')}`, 3.01603, 1.00867, nuc(2, 1, 'H'), null, nuc(3, 2, 'He'), 'neutron'], [`${nuc(2, 1, 'H')} + ${nuc(2, 1, 'H')}`, 2.01410, 2.01410, `${nuc(3, 1, 'H')} + ${nuc(1, 1, 'H')}`, 3.01605, 1.00783, nuc(2, 1, 'H'), null, nuc(3, 1, 'H'), nuc(1, 1, 'H')]]);
  const dm = m1 + m2 - m3 - m4, E = dm * MEVU, Ej = E * 1e6 * QE;
  return { stem: `A fusion reaction that could be used in a power station is<br>${eq(`${lhs} → ${rhs}`)}<br>masses: ${l1} = ${F5(m1)} u${l2 ? ` &nbsp; ${l2} = ${F5(m2)} u` : ''} &nbsp; ${l3} = ${F5(m3)} u &nbsp; ${l4} = ${F5(m4)} u<br>1 u = 931.5 MeV`,
    parts: [
      calc('Calculate the decrease in mass, in u, in this reaction.', 2, dm, 'u', `Mass before ${eq(`= ${F5(m1)} + ${F5(m2)} = ${F5(m1 + m2)} u`)}; mass after ${eq(`= ${F5(m3)} + ${F5(m4)} = ${F5(m3 + m4)} u`)} ✓<br>Decrease ${eq(`= ${F5(dm)} u`)} ✓`, { show: F5(dm), tol: .003 }),
      calc('Calculate the energy released in MeV.', 1, E, 'MeV', `${eq(`${F5(dm)} × 931.5 = ${N(E, 3)} MeV`)} ✓`, { show: N(E, 3), tol: .006 }),
      calc('Calculate the energy released in J.', 1, Ej, 'J', `${eq(`${N(E, 3)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ej)} J`)} ✓`, { tol: .01 }),
      text('Explain why a very high temperature is needed for fusion to take place.', 2, 'The nuclei are both positively charged, so they repel each other ✓<br>They need a very large kinetic energy to get close enough (about 10<sup>−15</sup> m) for the strong nuclear force to act and fuse them ✓'),
      text('Explain, in terms of binding energy, why energy is released in this reaction.', 2, 'The nucleus produced has a greater binding energy per nucleon than the nuclei that fuse ✓<br>so the total binding energy increases, and the increase is released as kinetic energy of the products ✓')
    ] };
};
T.NE5 = R => {
  const [pn, ps, mp, ds, md] = R.pick([[nuc(226, 88, 'Ra'), 'radium-226', 226.02541, nuc(222, 86, 'Rn'), 222.01758], [nuc(210, 84, 'Po'), 'polonium-210', 209.98287, nuc(206, 82, 'Pb'), 205.97446], [nuc(238, 92, 'U'), 'uranium-238', 238.05079, nuc(234, 90, 'Th'), 234.04360]]), ma = 4.00260;
  const dm = mp - md - ma, E = dm * MEVU, Ej = E * 1e6 * QE, v = Math.sqrt(2 * Ej / (ma * U));
  return { stem: `A nucleus of ${ps} decays by alpha emission:<br>${eq(`${pn} → ${ds} + ${nuc(4, 2, 'He')}`)}<br>masses: ${pn} = ${F5(mp)} u &nbsp; ${ds} = ${F5(md)} u &nbsp; ${nuc(4, 2, 'He')} = ${F5(ma)} u<br>${UDATA}`,
    parts: [
      calc('Calculate the decrease in mass, in u, in this decay.', 2, dm, 'u', `${eq(`${F5(mp)} − (${F5(md)} + ${F5(ma)})`)} ✓<br>${eq(`= ${F5(dm)} u`)} ✓`, { show: F5(dm), tol: .003 }),
      calc('Calculate the energy released in MeV.', 1, E, 'MeV', `${eq(`${F5(dm)} × 931.5 = ${N(E, 3)} MeV`)} ✓`, { show: N(E, 3), tol: .006 }),
      calc('Calculate the energy released in J.', 1, Ej, 'J', `${eq(`${N(E, 3)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ej)} J`)} ✓`, { tol: .01 }),
      text('The nucleus is at rest before it decays.<br>Explain why the alpha particle gains much more kinetic energy than the daughter nucleus.', 2, 'Momentum is conserved, so the alpha particle and the daughter nucleus move apart with equal and opposite momentum ✓<br>The alpha particle has a much smaller mass, so it has a much greater speed and, since <i>E</i><sub>k</sub> = <i>p</i><sup>2</sup>/2<i>m</i>, much more kinetic energy ✓'),
      calc('Estimate the speed of the alpha particle, assuming that it gains all the energy released.', 2, v, MS1, `${eq(`<i>m</i> = 4.00260 × 1.661 × 10<sup>−27</sup> = ${N(ma * U)} kg`)} ✓<br>${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(Ej)} / ${N(ma * U)}) = ${A(v)} ${MS1}`)} ✓`, { tol: .01 })
    ] };
};
T.NE6 = R => {
  const P = R.pick([3.8e26, 3.85e26, 3.9e26]), dm = P / (C * C), yr = dm * YEAR, Eu = U * C * C;
  return { stem: `Energy is released in the Sun by the fusion of hydrogen nuclei. The Sun radiates energy at a rate of ${N(P, 3)} W.<br>1 u = 1.661 × 10<sup>−27</sup> kg<br>1 year = 3.15 × 10<sup>7</sup> s`,
    parts: [
      text('State what is meant by the mass defect of a nucleus.', 1, 'The difference between the mass of the nucleus and the total mass of its separate protons and neutrons ✓'),
      text('Show that a mass of 1 u is equivalent to an energy of about 930 MeV.', 2, `${eq(`<i>E</i> = <i>mc</i><sup>2</sup> = 1.661 × 10<sup>−27</sup> × (3.00 × 10<sup>8</sup>)<sup>2</sup> = ${N(Eu)} J`)} ✓<br>${eq(`${N(Eu)} / 1.60 × 10<sup>−19</sup> = ${N(Eu / QE)} eV = ${N(Eu / QE / 1e6)} MeV`)} ✓`, ['The value on the data sheet, 931.5 MeV, uses more precise values of the constants.']),
      calc('Calculate the mass lost by the Sun each second.', 2, dm, 'kg', `${eq(`Δ<i>m</i> = <i>E</i>/<i>c</i><sup>2</sup> = ${N(P, 3)} / (3.00 × 10<sup>8</sup>)<sup>2</sup>`)} ✓<br>${eq(`Δ<i>m</i> = ${A(dm)} kg`)} ✓`),
      calc('Calculate the mass lost by the Sun in one year.', 1, yr, 'kg', `${eq(`${A(dm)} × 3.15 × 10<sup>7</sup> = ${A(yr)} kg`)} ✓`),
      text('Explain why the products of a fusion reaction have less mass than the nuclei that fuse.', 1, 'The products have a greater total binding energy (they are more tightly bound), and the energy released is equivalent to the mass lost, <i>E</i> = <i>mc</i><sup>2</sup> ✓')
    ] };
};

/* --- induced fission and nuclear reactors --- */
T.NF1 = R => ({ stem: `A thermal nuclear reactor uses the induced fission of uranium-235.`,
  parts: [
    text('Describe what happens in the induced fission of a uranium-235 nucleus.', 2, 'The nucleus absorbs a (thermal) neutron and becomes unstable ✓<br>It splits into two smaller nuclei (fission fragments) and releases two or three neutrons (and energy) ✓'),
    text('Explain what is meant by a chain reaction.', 2, 'The neutrons released by one fission go on to cause further fissions ✓<br>which release more neutrons, so the reaction keeps itself going (it is self-sustaining) ✓'),
    text('Explain what is meant by the critical mass.', 2, 'The minimum mass of fissile material needed for a chain reaction to be sustained ✓<br>With a smaller mass, too many neutrons escape through the surface (or are absorbed without causing fission) ✓'),
    text(R.chance(.5) ? 'Explain why the neutrons must be slowed down in the reactor.' : 'State what is meant by a thermal neutron.', 1, 'x'),
    text('State the condition needed for the reactor to produce power at a steady rate.', 1, 'On average exactly one neutron from each fission goes on to cause another fission ✓')
  ] });
T.NF1 = (old => R => { const q = old(R), P = q.parts[3]; P.ms = /slowed/.test(P.q) ? 'Slow (thermal) neutrons are much more likely to be absorbed by uranium-235 nuclei and cause fission than the fast neutrons released in fission ✓' : 'A slow-moving neutron, with a kinetic energy similar to that of the molecules of the moderator (about 0.025 eV; in thermal equilibrium with the moderator) ✓'; return q; })(T.NF1);
T.NF2 = R => {
  const [mod, keep] = R.pick([['graphite', 0.86], ['heavy water', 0.48], ['beryllium', 0.81]]), E0 = R.pick([1.0, 2.0, 2.5]), Ef = R.pick([0.025, 0.040, 0.050]), ratio = E0 * 1e6 / Ef, n = Math.log(ratio) / Math.log(1 / keep), nu = Math.ceil(n);
  return { stem: `The neutrons released in fission have a mean kinetic energy of ${N(E0, 2)} MeV. In a reactor with a ${mod} moderator, a neutron keeps on average ${Math.round(keep * 100)}% of its kinetic energy in each collision with a moderator nucleus. The neutrons must be slowed until their kinetic energy is ${N(Ef, 2)} eV.`,
    parts: [
      text('Explain why the neutrons released in fission must be slowed down.', 2, 'Fast neutrons are unlikely to cause fission of uranium-235 (they are more likely to escape or be absorbed by uranium-238) ✓<br>Slow (thermal) neutrons are much more likely to be absorbed by uranium-235 and cause fission, which keeps the chain reaction going ✓'),
      calc('Calculate the ratio initial kinetic energy ÷ final kinetic energy for a neutron.', 1, ratio, '', `${eq(`${N(E0, 2)} × 10<sup>6</sup> / ${N(Ef, 2)} = ${A(ratio)}`)} ✓`),
      calc('Calculate the number of collisions needed to slow a neutron down.', 3, nu, '', `After <i>n</i> collisions the energy is ${eq(`<i>E</i><sub>0</sub> × ${keep.toFixed(2)}<sup><i>n</i></sup>`)}, so ${eq(`${keep.toFixed(2)}<sup><i>n</i></sup> = 1 / ${A(ratio)}`)} ✓<br>${eq(`<i>n</i> = ln(${A(ratio)}) / ln(1 / ${keep.toFixed(2)}) = ${N(n, 3)}`)} ✓<br>so about ${nu} collisions ✓`, { show: String(nu), tol: .03 }),
      text('State two properties needed by the material used as a moderator.', 2, 'Its nuclei must have a small mass (similar to that of a neutron), so that a neutron loses a large fraction of its kinetic energy in each collision ✓<br>It must not absorb neutrons (it should scatter them elastically) ✓')
    ] };
};
T.NF3 = R => {
  const cool = R.pick([['water', 'pressurised water'], ['carbon dioxide gas', 'carbon dioxide']]);
  return { stem: `The core of a thermal nuclear reactor contains fuel rods, a moderator and control rods. A coolant of ${cool[1]} is pumped through the core.`,
    parts: [
      text('State the function of the control rods and name a suitable material for them.', 2, 'They absorb neutrons, which controls the rate of fission ✓<br>Boron (or cadmium) ✓'),
      text('The control rods are lowered further into the core.<br>State and explain the effect on the power output of the reactor.', 2, 'The power output decreases ✓<br>More neutrons are absorbed, so fewer are available to cause fission and the number of fissions per second falls ✓'),
      text('State the function of the coolant and give one property that it should have.', 2, 'It transfers thermal energy from the core to a heat exchanger (where steam is produced to drive turbines) ✓<br>A high specific heat capacity (or: it does not become very radioactive; it is not corrosive; it can be pumped easily) ✓'),
      text('Describe how the reactor is shut down in an emergency.', 1, 'The control rods are dropped fully into the core, so they absorb enough neutrons to stop the chain reaction ✓')
    ] };
};
T.NF4 = R => ({ stem: `The fuel rods in a nuclear reactor are replaced after several years. The spent fuel rods are high-level radioactive waste.`,
  parts: [
    text('Explain why spent fuel rods are much more radioactive than new fuel rods.', 2, 'They contain fission fragments, which are neutron-rich and therefore unstable (β<sup>−</sup> and gamma emitters) ✓<br>Many of these have short half-lives, so their activity is very high (uranium has a very long half-life and a low activity) ✓'),
    text('Describe how the spent fuel rods are treated when they are first removed from the reactor.', 2, 'They are removed by remote handling (behind shielding), because of the intense radiation ✓<br>They are stored under water in cooling ponds for several years, because they continue to release thermal energy as the fission fragments decay ✓'),
    text('Describe how high-level waste is stored for the long term.', 2, 'It is vitrified (sealed in glass) and placed in thick steel containers ✓<br>The containers are stored deep underground in geologically stable rock (away from water supplies) ✓'),
    text('Explain why the reactor core is surrounded by a thick concrete shield.', 1, 'It absorbs the neutrons and gamma radiation that escape from the core, which protects the workers ✓'),
    text(R.chance(.5) ? 'State one benefit of using nuclear power to generate electricity.' : 'State one risk of using nuclear power to generate electricity.', 1, 'x')
  ] });
T.NF4 = (old => R => { const q = old(R), P = q.parts[4]; P.ms = /benefit/.test(P.q) ? 'No carbon dioxide (greenhouse gas) is emitted in operation (or: a very large amount of energy is released from a small mass of fuel; the supply is reliable) ✓' : 'Radioactive waste must be stored safely for thousands of years (or: an accident could release radioactive material into the environment) ✓'; return q; })(T.NF4);
T.NF5 = R => {
  const P = R.pick([2400, 3000, 3200, 3600]), eff = R.pick([33, 35, 36, 40]), Ef = 200e6 * QE, rate = P * 1e6 / Ef, m = rate * 86400 * 235 * U, out = P * eff / 100;
  return { stem: `The core of a nuclear reactor produces thermal energy at a rate of ${P} MW. Each fission of a uranium-235 nucleus releases 200 MeV. The power station converts thermal energy to electrical energy with an efficiency of ${eff}%.<br>mass of a uranium-235 atom = 235 u, where 1 u = 1.661 × 10<sup>−27</sup> kg`,
    parts: [
      calc('Calculate the energy released by one fission in J.', 1, Ef, 'J', `${eq(`200 × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Ef)} J`)} ✓`),
      calc('Calculate the number of fissions each second in the core.', 2, rate, 's<sup>−1</sup>', `${eq(`${N(P * 1e6, 2)} / ${A(Ef)}`)} ✓<br>${eq(`= ${A(rate)} s<sup>−1</sup>`)} ✓`, { guide: ['Award one mark if MW is not converted to W.'] }),
      calc('Calculate the mass of uranium-235 that undergoes fission in one day.', 3, m, 'kg', `Number of fissions in one day ${eq(`= ${A(rate)} × 86 400 = ${N(rate * 86400)}`)} ✓<br>Mass of one atom ${eq(`= 235 × 1.661 × 10<sup>−27</sup> = ${N(235 * U)} kg`)} ✓<br>Mass ${eq(`= ${N(rate * 86400)} × ${N(235 * U)} = ${A(m)} kg`)} ✓`),
      calc('Calculate the electrical power output of the power station in MW.', 1, out, 'MW', `${eq(`${(eff / 100).toFixed(2)} × ${P} = ${N(out, 4)} MW`)} ✓`, { show: N(out, 4) }),
      text('State what happens to the rest of the thermal energy.', 1, 'It is transferred to the surroundings as waste thermal energy (for example through the cooling towers) ✓')
    ] };
};
T.NF6 = R => {
  const [nm, M] = R.pick([['carbon-12', 12], ['deuterium (hydrogen-2)', 2], ['beryllium-9', 9]]), v0 = R.pick([1.4e7, 2.0e7, 2.4e7]), k = (M - 1) / (M + 1), v1 = v0 * k, lost = 1 - k * k;
  return { stem: `A neutron of mass <i>m</i> travelling at ${N(v0, 2)} ${MS1} makes a head-on elastic collision with a stationary nucleus of ${nm}, which has a mass <i>M</i> of ${M}<i>m</i>. After a head-on elastic collision, the speed of the neutron is <i>v</i>(<i>M</i> − <i>m</i>)/(<i>M</i> + <i>m</i>), where <i>v</i> is its speed before the collision.`,
    parts: [
      text('State what is meant by an elastic collision.', 1, 'A collision in which the total kinetic energy is conserved ✓'),
      calc('Calculate the speed of the neutron after the collision.', 2, v1, MS1, `${eq(`${N(v0, 2)} × (${M} − 1) / (${M} + 1)`)} ✓<br>${eq(`= ${A(v1)} ${MS1}`)} ✓`),
      calc('Calculate the fraction of its kinetic energy that the neutron loses in the collision.', 2, lost, '', `Kinetic energy is proportional to speed<sup>2</sup>, so fraction remaining ${eq(`= (${M - 1} / ${M + 1})<sup>2</sup> = ${N(k * k)}`)} ✓<br>Fraction lost ${eq(`= 1 − ${N(k * k)} = ${A(lost)}`)} ✓`),
      text('Explain why the nuclei of a moderator should have a small mass.', 2, 'The smaller the mass of the nucleus (the closer it is to the mass of a neutron), the greater the fraction of kinetic energy the neutron loses in each collision ✓<br>so fewer collisions are needed to slow the neutron to thermal energies (it is less likely to be absorbed or to escape first) ✓')
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
