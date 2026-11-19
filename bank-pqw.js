/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_PQW = (function(){
const module = undefined;
'use strict';
/* Question types for AQA particles (3.2.1), quantum phenomena (3.2.2) and waves (3.3). */
const TOPICS = {
  PA: 'Atoms, isotopes and specific charge', PN: 'Stable and unstable nuclei', PP: 'Antiparticles and photons', PI: 'Particle interactions', PC: 'Classification, quarks and conservation laws',
  QP: 'The photoelectric effect', QE: 'Energy levels and photon emission', QW: 'Wave–particle duality',
  WP: 'Progressive waves', WL: 'Longitudinal and transverse waves', WS: 'Stationary waves', WI: 'Interference', WD: 'Diffraction', WR: 'Refraction and optical fibres'
};
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

/* ---------- graph paper (shared with the other banks) ---------- */
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
const NUCLEON = `Take the mass of a proton and the mass of a neutron to be 1.67 × 10<sup>−27</sup> kg.`;
const scN = (z, a) => z * QE / (a * MP);
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

T.PA1 = R => {
  const [name, sym, Z, Am] = R.pick(NUCLIDES), k = R.pick([1, 2]), sc = scN(Z, Am), sci = k * QE / (Am * MP);
  return { stem: `An atom of ${name} can be represented by ${nuc(Am, Z, sym)}.<br>${NUCLEON}`,
    parts: [
      text(`State the number of protons, neutrons and electrons in a neutral atom of ${nuc(Am, Z, sym)}.`, 2, `${Z} protons and ${Z} electrons ✓<br>${Am - Z} neutrons ✓`),
      calc(`Calculate the specific charge of the nucleus of ${nuc(Am, Z, sym)}.`, 3, sc, CKG, `Charge of nucleus ${eq(`= ${Z} × 1.60 × 10<sup>−19</sup> = ${N(Z * QE)} C`)} ✓<br>Mass of nucleus ${eq(`= ${Am} × 1.67 × 10<sup>−27</sup> = ${N(Am * MP)} kg`)} ✓<br>${eq(`specific charge = ${N(Z * QE)} / ${N(Am * MP)} = ${A(sc)} ${CKG}`)} ✓`),
      calc(`The atom loses ${plural(k, 'electron')} to become an ion.<br>Calculate the specific charge of the ion. The mass of the electrons is negligible.`, 2, sci, CKG, `Charge of ion ${eq(`= ${k === 1 ? '' : k + ' × '}1.60 × 10<sup>−19</sup>${k === 1 ? '' : ` = ${N(k * QE)}`} C`)} ✓<br>${eq(`specific charge = ${N(k * QE)} / ${N(Am * MP)} = ${A(sci)} ${CKG}`)} ✓`),
      text('State what is meant by isotopes.', 2, 'Atoms (nuclei) with the same number of protons ✓<br>but different numbers of neutrons ✓', ['Accept “same proton number, different nucleon number”.'])
    ] };
};
T.PA2 = R => {
  const [name, sym, Z, Am] = R.pick(NUCLIDES.filter(n => [3, 11, 12, 13, 19, 20, 26, 29].includes(n[2]))), k = R.pick(Z === 3 || Z === 11 || Z === 19 ? [1] : [2, 3].filter(x => x <= (Z === 13 || Z === 26 ? 3 : 2))), sc = k * QE / (Am * MP);
  return { stem: `An ion of ${name}, ${nuc(Am, Z, sym)}, has a charge of +${N(k * QE)} C.<br>${NUCLEON}`,
    parts: [
      text('Determine the number of electrons in the ion.', 2, `The charge is +${k}<i>e</i>, so the ion has lost ${plural(k, 'electron')} ✓<br>Number of electrons ${eq(`= ${Z} − ${k} = ${Z - k}`)} ✓`),
      calc('Calculate the specific charge of the ion.', 2, sc, CKG, `Mass ${eq(`= ${Am} × 1.67 × 10<sup>−27</sup> = ${N(Am * MP)} kg`)} ✓<br>${eq(`specific charge = ${N(k * QE)} / ${N(Am * MP)} = ${A(sc)} ${CKG}`)} ✓`, { guide: ['The mass of the electrons is negligible.'] }),
      text('State which constituent of the atom has the largest specific charge. Explain your answer.', 2, 'The electron ✓<br>It has the same size of charge as a proton but a much smaller mass ✓')
    ] };
};
T.PA3 = R => {
  const [name, sym, Z, a1, a2] = R.pick([['chlorine', 'Cl', 17, 35, 37], ['carbon', 'C', 6, 12, 14], ['uranium', 'U', 92, 235, 238], ['oxygen', 'O', 8, 16, 18], ['copper', 'Cu', 29, 63, 65], ['neon', 'Ne', 10, 20, 22]]), sc = scN(Z, a1);
  return { stem: `${nuc(a1, Z, sym)} and ${nuc(a2, Z, sym)} are two isotopes of ${name}.<br>${NUCLEON}`,
    parts: [
      text('State one similarity and one difference between the nuclei of the two isotopes.', 2, `Both contain ${Z} protons ✓<br>${nuc(a2, Z, sym)} contains ${a2 - a1} more neutrons (${a2 - Z} rather than ${a1 - Z}) ✓`),
      calc(`Calculate the specific charge of a nucleus of ${nuc(a1, Z, sym)}.`, 3, sc, CKG, `Charge ${eq(`= ${Z} × 1.60 × 10<sup>−19</sup> = ${N(Z * QE)} C`)} ✓<br>Mass ${eq(`= ${a1} × 1.67 × 10<sup>−27</sup> = ${N(a1 * MP)} kg`)} ✓<br>${eq(`specific charge = ${A(sc)} ${CKG}`)} ✓`),
      text(`Explain, without further calculation, how the specific charge of a nucleus of ${nuc(a2, Z, sym)} compares with your answer.`, 2, 'It is smaller ✓<br>The charge is the same but the mass is greater ✓')
    ] };
};
T.PA4 = R => {
  const [name, sym, Z, Am] = R.pick(NUCLIDES), sc = Number(scN(Z, Am).toPrecision(3)), zc = sc * Am * MP / QE;
  return { stem: `The nucleus of an atom contains ${Am} nucleons. The specific charge of the nucleus is ${N(sc)} ${CKG}.<br>${NUCLEON}`,
    parts: [
      text('State what is meant by the specific charge of a particle.', 1, 'Its charge divided by its mass (charge per unit mass) ✓'),
      { q: 'Determine the number of protons in the nucleus.', marks: 3, ans: Z, unit: '', show: String(Z), ms: `Mass of nucleus ${eq(`= ${Am} × 1.67 × 10<sup>−27</sup> = ${N(Am * MP)} kg`)} ✓<br>Charge ${eq(`= ${N(sc)} × ${N(Am * MP)} = ${N(sc * Am * MP)} C`)} ✓<br>Number of protons ${eq(`= ${N(sc * Am * MP)} / 1.60 × 10<sup>−19</sup> = ${N(zc)}`)}, so ${Z} ✓` },
      text('State the number of neutrons in the nucleus.', 1, `${eq(`${Am} − ${Z} = ${Am - Z}`)} ✓`),
      text(`State the number of electrons in a neutral atom of this element and explain your answer.`, 2, `${Z} ✓<br>A neutral atom has equal numbers of protons and electrons (their charges are equal and opposite) ✓`)
    ] };
};
T.PA5 = R => {
  const scp = QE / MP, sce = QE / ME, ratio = sce / scp, which = R.pick(['proton', 'neutron']);
  return { stem: `This question is about the constituents of the atom.<br>mass of proton = 1.67 × 10<sup>−27</sup> kg &nbsp;&nbsp; mass of electron = 9.11 × 10<sup>−31</sup> kg`,
    parts: [
      calc('Calculate the specific charge of a proton.', 2, scp, CKG, `${eq('specific charge = 1.60 × 10<sup>−19</sup> / 1.67 × 10<sup>−27</sup>')} ✓<br>${eq(`= ${A(scp)} ${CKG}`)} ✓`),
      calc('Calculate the specific charge of an electron.', 1, sce, CKG, `${eq(`1.60 × 10<sup>−19</sup> / 9.11 × 10<sup>−31</sup> = ${A(sce)} ${CKG}`)} ✓`),
      calc('Calculate the ratio &nbsp; specific charge of an electron ÷ specific charge of a proton.', 1, ratio, '', `${eq(`${A(sce)} / ${A(scp)} = ${A(ratio)}`)} ✓`, { guide: ['Accept answers that round to 1.8 × 10<sup>3</sup>.'] }),
      which === 'neutron' ? text('State the specific charge of a neutron. Explain your answer.', 2, 'Zero ✓<br>A neutron has no charge ✓')
        : text('State the specific charge of a neutral atom. Explain your answer.', 2, 'Zero ✓<br>The atom has no overall charge (equal numbers of protons and electrons) ✓')
    ] };
};

const ALPHA = [['uranium', 'U', 92, 238, 'thorium', 'Th'], ['radium', 'Ra', 88, 226, 'radon', 'Rn'], ['polonium', 'Po', 84, 210, 'lead', 'Pb'], ['americium', 'Am', 95, 241, 'neptunium', 'Np'], ['thorium', 'Th', 90, 232, 'radium', 'Ra'], ['plutonium', 'Pu', 94, 239, 'uranium', 'U']];
const BETA = [['carbon', 'C', 6, 14, 'nitrogen', 'N'], ['strontium', 'Sr', 38, 90, 'yttrium', 'Y'], ['iodine', 'I', 53, 131, 'xenon', 'Xe'], ['cobalt', 'Co', 27, 60, 'nickel', 'Ni'], ['potassium', 'K', 19, 40, 'calcium', 'Ca'], ['caesium', 'Cs', 55, 137, 'barium', 'Ba']];
const ANU = `${ov('ν')}<sub>e</sub>`, NU = 'ν<sub>e</sub>';

T.PN1 = R => {
  const a = R.chance(.5);
  return { stem: 'The strong nuclear force acts between the nucleons in a nucleus.',
    parts: [
      text('Explain why a nucleus that contains many protons can be stable.', 2, 'The protons repel each other with the electrostatic force ✓<br>The strong nuclear force is attractive (at these separations) and balances the repulsion, holding the nucleons together ✓'),
      text('Describe how the strong nuclear force between two nucleons varies with their separation.', 3, 'Repulsive at separations below about 0.5 fm ✓<br>Attractive from about 0.5 fm up to about 3 fm ✓<br>Falls rapidly to zero (negligible) beyond about 3 fm ✓', ['Accept any value between 3 fm and 4 fm for the range.']),
      a ? text('Sketch a graph to show how the strong nuclear force between two nucleons varies with their separation. Show repulsion as positive and label the separation axis with approximate values.', 3, 'Repulsive (positive) and steep at separations below about 0.5 fm ✓<br>Crosses the axis at about 0.5 fm and becomes attractive (negative), with a minimum ✓<br>Returns towards zero by about 3 fm ✓')
        : text('State two differences between the strong nuclear force and the electrostatic force between two protons.', 2, 'The strong nuclear force has a short range (about 3 fm); the electrostatic force has an infinite range ✓<br>The strong nuclear force is attractive (except below 0.5 fm); the electrostatic force between protons is always repulsive ✓')
    ] };
};
T.PN2 = R => {
  const [pn, ps, Z, Am, dn, ds] = R.pick(ALPHA), sc = 2 * QE / (4 * MP);
  return { stem: `A nucleus of ${pn}, ${nuc(Am, Z, ps)}, decays by emitting an alpha particle. The daughter nucleus is an isotope of ${dn} (${ds}).`,
    parts: [
      text('State the proton number and the nucleon number of the daughter nucleus.', 2, `Proton number ${eq(`= ${Z} − 2 = ${Z - 2}`)} ✓<br>Nucleon number ${eq(`= ${Am} − 4 = ${Am - 4}`)} ✓`),
      text('Write the equation for this decay.', 2, `${eq(`${nuc(Am, Z, ps)} → ${nuc(Am - 4, Z - 2, ds)} + ${nuc(4, 2, 'α')}`)}<br>Alpha particle shown as ${nuc(4, 2, 'α')} (or ${nuc(4, 2, 'He')}) ✓<br>Daughter nucleus correct and both sides balance ✓`),
      calc(`Calculate the specific charge of an alpha particle.<br>${NUCLEON}`, 2, sc, CKG, `${eq('specific charge = (2 × 1.60 × 10<sup>−19</sup>) / (4 × 1.67 × 10<sup>−27</sup>)')} ✓<br>${eq(`= ${A(sc)} ${CKG}`)} ✓`),
      text('Explain why nuclei with a very large number of nucleons are unstable.', 2, 'The strong nuclear force has a short range, so each nucleon is attracted only by its near neighbours ✓<br>The electrostatic repulsion acts between all the protons (long range), so in a large nucleus it is not balanced ✓')
    ] };
};
T.PN3 = R => {
  const [pn, ps, Z, Am, dn, ds] = R.pick(BETA);
  return { stem: `A nucleus of ${pn}, ${nuc(Am, Z, ps)}, decays by β<sup>−</sup> emission. The daughter nucleus is an isotope of ${dn} (${ds}).`,
    parts: [
      text('State the proton number and the nucleon number of the daughter nucleus.', 2, `Proton number ${eq(`= ${Z} + 1 = ${Z + 1}`)} ✓<br>Nucleon number = ${Am} (unchanged) ✓`),
      text('Write the equation for this decay.', 2, `${eq(`${nuc(Am, Z, ps)} → ${nuc(Am, Z + 1, ds)} + ${nuc(0, '−1', 'β')} + ${ANU}`)}<br>Daughter nucleus and β<sup>−</sup> particle (electron) correct ✓<br>(Electron) antineutrino included ✓`),
      text('The existence of the neutrino was suggested before it was detected.<br>Explain why.', 2, 'The β<sup>−</sup> particles are emitted with a range of kinetic energies (up to a maximum) ✓<br>For energy to be conserved, another particle must carry away the remaining energy ✓'),
      text('State the change in quark structure that takes place in β<sup>−</sup> decay.', 1, 'A down quark changes into an up quark (d → u) ✓')
    ] };
};
T.PN4 = R => {
  const [pn, ps, Z, Am] = R.pick(ALPHA), na = R.pick([1, 2, 3]), nb = R.pick([1, 2]), A2 = Am - 4 * na, Z2 = Z - 2 * na + nb, same = Z2 === Z;
  return { stem: `A nucleus of ${pn}, ${nuc(Am, Z, ps)}, is the first nucleus in a decay series. After ${plural(na, 'alpha decay')} and ${plural(nb, 'β<sup>−</sup> decay')} a nucleus <b>X</b> is formed.`,
    parts: [
      text('Determine the nucleon number of <b>X</b>.', 2, `Each alpha decay reduces the nucleon number by 4; β<sup>−</sup> decay does not change it ✓<br>${eq(`${Am} − (${na} × 4) = ${A2}`)} ✓`),
      text('Determine the proton number of <b>X</b>.', 2, `Each alpha decay reduces the proton number by 2 and each β<sup>−</sup> decay increases it by 1 ✓<br>${eq(`${Z} − (${na} × 2) + ${nb} = ${Z2}`)} ✓`),
      text('Determine the number of neutrons in <b>X</b>.', 1, `${eq(`${A2} − ${Z2} = ${A2 - Z2}`)} ✓`),
      same ? text(`State and explain the relationship between <b>X</b> and the original ${pn} nucleus.`, 2, `<b>X</b> is an isotope of ${pn} ✓<br>It has the same number of protons (${Z}) but a different number of neutrons ✓`)
        : text(`Explain whether <b>X</b> is an isotope of ${pn}.`, 1, `It is not, because its proton number (${Z2}) is different from that of ${pn} (${Z}) ✓`)
    ] };
};
T.PN5 = R => {
  const [pn, ps, Z, Am] = R.pick(BETA);
  return { stem: `A nucleus of ${nuc(Am, Z, ps)} has too many neutrons to be stable.`,
    parts: [
      text('State the type of decay that this nucleus is most likely to undergo.', 1, 'β<sup>−</sup> decay ✓'),
      text('Describe what happens in the nucleus during this decay.', 2, 'A neutron changes into a proton ✓<br>An electron (β<sup>−</sup> particle) and an (electron) antineutrino are emitted ✓'),
      text('State how the proton number and the nucleon number of the nucleus change.', 2, `The proton number increases by 1 (to ${Z + 1}) ✓<br>The nucleon number does not change (${Am}) ✓`),
      text('Name the interaction responsible for this decay and its exchange particle.', 2, 'The weak interaction ✓<br>W<sup>−</sup> boson ✓')
    ] };
};

/* ----- antiparticles and photons ----- */
const REST = { electron: 0.510999, proton: 938.257, neutron: 939.551, muon: 105.659 };
const MEV = 1.60e-13;
T.PP1 = R => {
  const lam = R.pick(rng(400, 700, 25)), P = R.pick([2, 5, 10, 20, 40, 60]), f = C / (lam * 1e-9), E = H * f, n = P / E;
  return { stem: `A lamp emits light of wavelength ${lam} nm.`,
    parts: [
      calc('Calculate the frequency of the light.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>c</i>/<i>λ</i> = 3.00 × 10<sup>8</sup> / ${N(lam * 1e-9)}`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`, { guide: ['Award one mark if nm is not converted to m.'] }),
      calc('Calculate the energy of one photon of this light.', 2, E, 'J', `${eq(`<i>E</i> = <i>hf</i> = 6.63 × 10<sup>−34</sup> × ${A(f)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      calc('Express this energy in eV.', 1, E / QE, 'eV', `${eq(`${A(E)} / 1.60 × 10<sup>−19</sup> = ${A(E / QE)} eV`)} ✓`),
      calc(`The lamp emits ${V(P, 'W')} of power as light of this wavelength.<br>Calculate the number of photons emitted each second.`, 2, n, '', `Energy emitted each second = ${N(P, 2)} J ✓<br>${eq(`number = ${N(P, 2)} / ${A(E)} = ${A(n)}`)} ✓`)
    ] };
};
T.PP2 = R => {
  const p = R.pick(['electron', 'proton']), anti = p === 'electron' ? 'positron' : 'antiproton', E0 = REST[p], EJ = E0 * MEV, f = EJ / H, lam = H * C / EJ, wl = R.chance(.5);
  return { stem: `${p === 'electron' ? 'An electron and a positron' : 'A proton and an antiproton'} that are almost at rest meet and annihilate. The rest energy of ${p === 'electron' ? 'an electron' : 'a proton'} is ${N(E0, 6)} MeV.`,
    parts: [
      text('State what is meant by annihilation.', 2, 'A particle and its antiparticle meet and their mass is converted into energy ✓<br>in the form of (two) photons ✓'),
      text('State the minimum energy, in MeV, of each photon produced.', 1, `${N(E0, 3)} MeV (the rest energy of the ${p}) ✓`),
      calc('Calculate this energy in J.', 2, EJ, 'J', `${eq(`${N(E0, 6)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup>`)} ✓<br>${eq(`= ${A(EJ)} J`)} ✓`),
      wl ? calc('Calculate the wavelength of each photon.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>hc</i>/<i>E</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${A(EJ)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`)
        : calc('Calculate the frequency of each photon.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>E</i>/<i>h</i> = ${A(EJ)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      text('Explain why two photons are produced rather than one.', 1, 'To conserve momentum: the two photons travel in opposite directions ✓')
    ] };
};
T.PP3 = R => {
  const Eg = R.pick(rng(1.5, 4.0, 0.25)), Emin = 2 * REST.electron, Ek = Eg - Emin, fmin = Emin * MEV / H;
  return { stem: `A photon can produce an electron and a positron by pair production. The rest energy of an electron is 0.510999 MeV.`,
    parts: [
      text('State what is meant by pair production.', 2, 'A photon is converted into a particle and its corresponding antiparticle ✓<br>The energy of the photon becomes the mass (rest energy) and kinetic energy of the pair ✓'),
      calc('Calculate the minimum photon energy, in MeV, needed to produce an electron and a positron.', 2, Emin, 'MeV', `The photon must supply the rest energy of both particles ✓<br>${eq(`2 × 0.510999 = ${N(Emin, 4)} MeV`)} ✓`, { show: N(Emin, 4) }),
      calc('Calculate the frequency of a photon that has this minimum energy.', 3, fmin, 'Hz', `${eq(`<i>E</i> = ${N(Emin, 4)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(Emin * MEV)} J`)} ✓<br>${eq(`<i>f</i> = <i>E</i>/<i>h</i> = ${A(Emin * MEV)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i> = ${A(fmin)} Hz`)} ✓`),
      calc(`A photon of energy ${N(Eg, 3)} MeV produces an electron and a positron.<br>Calculate the total kinetic energy, in MeV, of the two particles.`, 2, Ek, 'MeV', `${eq(`kinetic energy = photon energy − total rest energy = ${N(Eg, 3)} − ${N(Emin, 4)}`)} ✓<br>${eq(`= ${A(Ek)} MeV`)} ✓`)
    ] };
};
T.PP4 = R => {
  const [p, anti, extra, E0] = R.pick([['proton', 'antiproton', 'baryon number (+1 and −1)', REST.proton], ['electron', 'positron', 'lepton number (+1 and −1)', REST.electron], ['neutron', 'antineutron', 'baryon number (+1 and −1)', REST.neutron], ['muon (μ<sup>−</sup>)', 'antimuon (μ<sup>+</sup>)', 'lepton number (+1 and −1)', REST.muon]]);
  const neutral = p === 'neutron', EJ = E0 * MEV;
  return { stem: `Every particle has a corresponding antiparticle. The rest energy of the ${p} is ${N(E0, 6)} MeV.`,
    parts: [
      text(`Name the antiparticle of the ${p}.`, 1, `The ${anti} ✓`),
      neutral ? text('State one property that is the same for the neutron and its antiparticle, and one property that is different.', 2, 'Same: rest mass (rest energy), or both have zero charge ✓<br>Different: baryon number (+1 and −1), or quark structure (udd and antiquarks) ✓')
        : text(`State one property that is the same for the ${p.split(' ')[0]} and its antiparticle, and one property that is different.`, 2, `Same: rest mass (rest energy) ✓<br>Different: charge (equal and opposite), or ${extra} ✓`),
      text(`State the rest energy, in MeV, of the ${anti.split(' ')[0]}.`, 1, `${N(E0, 6)} MeV (the same as the ${p.split(' ')[0]}) ✓`),
      calc(`Calculate the rest energy of the ${p.split(' ')[0]} in J.`, 2, EJ, 'J', `${eq(`${N(E0, 6)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup>`)} ✓<br>${eq(`= ${A(EJ)} J`)} ✓`)
    ] };
};
T.PP5 = R => {
  const E = R.pick([0.25, 0.40, 0.50, 0.66, 0.80, 1.2, 1.5, 2.0, 2.5]), EJ = E * MEV, f = EJ / H, lam = C / f;
  return { stem: `A nucleus emits a photon of energy ${N(E, 2)} MeV.`,
    parts: [
      calc('Calculate the energy of the photon in J.', 1, EJ, 'J', `${eq(`${N(E, 2)} × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup> = ${A(EJ)} J`)} ✓`),
      calc('Calculate the frequency of the photon.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>E</i>/<i>h</i> = ${A(EJ)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      calc('Calculate the wavelength of the photon.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = 3.00 × 10<sup>8</sup> / ${A(f)}`)} (or ${eq('<i>λ</i> = <i>hc</i>/<i>E</i>')}) ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('State the region of the electromagnetic spectrum to which this photon belongs.', 1, 'Gamma radiation ✓'),
      text('State what is meant by a photon.', 1, 'A packet (quantum) of electromagnetic energy ✓')
    ] };
};

/* ----- particle interactions ----- */
const INTER = {
  bm: { name: 'β<sup>−</sup> decay', fig: { inL: 'n', outL: 'p', inR: null, outR: [SVGSUP('e', '−'), '<tspan font-weight="700">B</tspan>'], boson: '<tspan font-weight="700">A</tspan>' }, boson: 'W<sup>−</sup>', B: `electron antineutrino (${ANU})`, eqn: `n → p + e<sup>−</sup> + ${ANU}`,
    Q: '0 → (+1) + (−1) + 0', L: '0 → 0 + (+1) + (−1)', aria: 'Diagram of beta-minus decay: a neutron changes into a proton and emits exchange particle A, which decays into an electron and particle B' },
  bp: { name: 'β<sup>+</sup> decay', fig: { inL: 'p', outL: 'n', inR: null, outR: [SVGSUP('e', '+'), '<tspan font-weight="700">B</tspan>'], boson: '<tspan font-weight="700">A</tspan>' }, boson: 'W<sup>+</sup>', B: `electron neutrino (${NU})`, eqn: `p → n + e<sup>+</sup> + ${NU}`,
    Q: '(+1) → 0 + (+1) + 0', L: '0 → 0 + (−1) + (+1)', aria: 'Diagram of beta-plus decay: a proton changes into a neutron and emits exchange particle A, which decays into a positron and particle B' },
  ec: { name: 'electron capture', fig: { inL: 'p', outL: 'n', inR: SVGSUP('e', '−'), outR: ['<tspan font-weight="700">B</tspan>'], boson: '<tspan font-weight="700">A</tspan>' }, boson: 'W<sup>+</sup>', B: `electron neutrino (${NU})`, eqn: `p + e<sup>−</sup> → n + ${NU}`,
    Q: '(+1) + (−1) → 0 + 0', L: '0 + (+1) → 0 + (+1)', aria: 'Diagram of electron capture: a proton and an electron interact through exchange particle A; a neutron and particle B leave' },
  ep: { name: 'an electron–proton collision', fig: { inL: 'p', outL: 'n', inR: SVGSUP('e', '−'), outR: ['<tspan font-weight="700">B</tspan>'], boson: '<tspan font-weight="700">A</tspan>' }, boson: 'W<sup>−</sup>', B: `electron neutrino (${NU})`, eqn: `p + e<sup>−</sup> → n + ${NU}`,
    Q: '(+1) + (−1) → 0 + 0', L: '0 + (+1) → 0 + (+1)', aria: 'Diagram of an electron-proton collision: an electron and a proton interact through exchange particle A; a neutron and particle B leave' }
};
T.PI1 = R => {
  const [inter, ex] = R.pick([['electromagnetic', 'virtual photon (γ)'], ['weak', 'W boson (W<sup>+</sup> or W<sup>−</sup>)'], ['strong nuclear', 'gluon (accept pion between nucleons)']]);
  return { stem: 'There are four fundamental interactions: gravity, electromagnetic, weak and strong nuclear.',
    parts: [
      text('Explain what is meant by an exchange particle.', 2, 'A (virtual) particle that is passed between two interacting particles ✓<br>It transfers momentum (energy, force) between them and so is responsible for the force ✓'),
      text(`State the exchange particle of the ${inter} interaction.`, 1, `${cap(ex)} ✓`),
      text('State which class of particles experiences the strong nuclear interaction.', 1, 'Hadrons (baryons and mesons) ✓', ['Leptons do not experience the strong interaction.']),
      text('State the interaction that is responsible for β<sup>−</sup> decay.', 1, 'The weak interaction ✓'),
      text('State which two of the four interactions have an infinite range.', 1, 'Gravity and the electromagnetic interaction ✓')
    ] };
};
T.PI2 = R => {
  const k = R.pick(['bm', 'bp', 'ec', 'ep']), I = INTER[k], decay = k === 'bm' || k === 'bp';
  return { stem: `<b>Figure 1</b> represents ${I.name}. <b>A</b> is an exchange particle and <b>B</b> is a lepton.${k === 'ec' ? ' In electron capture the exchange particle is emitted by the proton.' : k === 'ep' ? ' In this collision the exchange particle is emitted by the electron.' : ''}`,
    figs: [feynFig(I.fig, I.aria)],
    parts: [
      text('Identify the exchange particle <b>A</b>.', 1, `${I.boson} boson ✓`),
      text('Identify particle <b>B</b>.', 1, `${cap(I.B)} ✓`),
      text('State the interaction that is responsible for this process.', 1, 'The weak interaction ✓'),
      text(`Write an equation for ${decay ? 'this decay' : 'this process'}.`, 2, `${eq(I.eqn)}<br>Correct particles on the left-hand side and nucleon on the right ✓<br>Correct lepton${decay ? 's' : ''} on the right-hand side ✓`),
      text('Show that charge and lepton number are both conserved.', 2, `Charge: ${eq(I.Q)} ✓<br>Lepton number: ${eq(I.L)} ✓`)
    ] };
};
T.PI3 = R => {
  const p = R.pick([['electrons', SVGSUP('e', '−')], ['protons', 'p']]);
  const fig = feynFig({ inL: p[1], outL: p[1], inR: p[1], outR: [p[1]], boson: '<tspan font-weight="700">A</tspan>' }, `Diagram of two ${p[0]} repelling each other by exchanging particle A`);
  return { stem: `<b>Figure 1</b> represents the electromagnetic repulsion between two ${p[0]}. <b>A</b> is the exchange particle.`, figs: [fig],
    parts: [
      text('Identify the exchange particle <b>A</b>.', 1, 'Virtual photon (γ) ✓'),
      text('State the range of the electromagnetic interaction.', 1, 'Infinite ✓'),
      text(`Explain, in terms of the exchange particle, why the two ${p[0]} repel each other.`, 2, 'The exchange particle is emitted by one particle and absorbed by the other ✓<br>It transfers momentum between them, so they move apart ✓'),
      text('State one difference between the exchange particle of the electromagnetic interaction and the exchange particles of the weak interaction.', 1, 'The photon has zero rest mass (W bosons have a non-zero rest mass) <b>or</b> the photon is uncharged (W bosons are charged) ✓')
    ] };
};
T.PI4 = R => {
  const k = R.pick(['ec', 'bp', 'bm']), I = INTER[k];
  const desc = { ec: ['a proton in the nucleus interacts with an inner-shell electron of the atom', 'The proton changes into a neutron and an electron neutrino is emitted'], bp: ['a proton in the nucleus changes into a neutron', 'A positron and an electron neutrino are emitted'], bm: ['a neutron in the nucleus changes into a proton', 'An electron and an electron antineutrino are emitted'] }[k];
  return { stem: `Some unstable nuclei decay by ${I.name}.`,
    parts: [
      text(`Describe what happens in ${I.name}.`, 2, `${cap(desc[0])} ✓<br>${desc[1]} ✓`),
      text('Write an equation for the process.', 2, `${eq(I.eqn)}<br>Left-hand side and nucleon on the right correct ✓<br>Lepton(s) on the right correct ✓`),
      text(`Draw a diagram to represent ${I.name}. Label all the particles, including the exchange particle.`, 3, `Incoming ${k === 'bm' ? 'neutron' : 'proton'} and outgoing ${k === 'bm' ? 'proton' : 'neutron'} meeting at one vertex ✓<br>Exchange particle labelled ${I.boson} joining the two vertices ✓<br>${k === 'ec' ? 'Incoming electron and outgoing electron neutrino at the other vertex' : k === 'bp' ? 'Positron and electron neutrino leaving the other vertex' : 'Electron and electron antineutrino leaving the other vertex'} ✓`),
      text('State how the nucleon number and the proton number of the nucleus change.', 2, `The nucleon number does not change ✓<br>The proton number ${k === 'bm' ? 'increases' : 'decreases'} by 1 ✓`)
    ] };
};
T.PI5 = R => {
  const k = R.pick(['bp', 'bm']), I = INTER[k];
  return { stem: 'The weak interaction is carried by W bosons.',
    parts: [
      text('State two properties of W bosons.', 2, 'They have a non-zero rest mass (they are massive) ✓<br>They are charged (W<sup>+</sup> or W<sup>−</sup>) <b>or</b> they have a very short range (about 0.001 fm) ✓'),
      text('State which particles are affected by the weak interaction.', 1, 'All particles (both hadrons and leptons) ✓'),
      text(`Draw a diagram to represent ${I.name}. Label all the particles.`, 3, `${k === 'bm' ? 'Neutron changing into a proton' : 'Proton changing into a neutron'} at one vertex ✓<br>Exchange particle labelled ${I.boson} ✓<br>${k === 'bm' ? 'Electron and electron antineutrino' : 'Positron and electron neutrino'} leaving the other vertex ✓`),
      text('Give one piece of evidence that this decay is caused by the weak interaction and not by the strong interaction.', 1, 'Leptons are involved (leptons do not experience the strong interaction) <b>or</b> a quark changes flavour ✓')
    ] };
};

/* ----- classification, quarks, conservation ----- */
const UB = ov('u'), DB = ov('d'), SB = ov('s');
const HADRONS = [
  ['proton', 'p', 'baryon', 'uud', 1, 1, 0, '(+⅔) + (+⅔) + (−⅓)'], ['neutron', 'n', 'baryon', 'udd', 0, 1, 0, '(+⅔) + (−⅓) + (−⅓)'],
  ['antiproton', ov('p'), 'antibaryon', `${UB}${UB}${DB}`, -1, -1, 0, '(−⅔) + (−⅔) + (+⅓)'], ['antineutron', ov('n'), 'antibaryon', `${UB}${DB}${DB}`, 0, -1, 0, '(−⅔) + (+⅓) + (+⅓)'],
  ['positive pion', 'π<sup>+</sup>', 'meson', `u${DB}`, 1, 0, 0, '(+⅔) + (+⅓)'], ['negative pion', 'π<sup>−</sup>', 'meson', `${UB}d`, -1, 0, 0, '(−⅔) + (−⅓)'],
  ['positive kaon', 'K<sup>+</sup>', 'meson', `u${SB}`, 1, 0, 1, '(+⅔) + (+⅓)'], ['negative kaon', 'K<sup>−</sup>', 'meson', `${UB}s`, -1, 0, -1, '(−⅔) + (−⅓)'],
  ['neutral kaon', 'K<sup>0</sup>', 'meson', `d${SB}`, 0, 0, 1, '(−⅓) + (+⅓)']
];
const sgn = n => n > 0 ? '+' + n : n < 0 ? '−' + (-n) : '0';
T.PC1 = R => {
  const [name, sym, cls, qk, Q, B, S, sum] = R.pick(HADRONS), three = cls !== 'meson';
  return { stem: `The ${name} (${sym}) is a hadron.`,
    parts: [
      text(`State whether the ${name} is a baryon, an antibaryon or a meson. Give a reason for your answer.`, 2, `${cap(cls)} ✓<br>It consists of ${cls === 'baryon' ? 'three quarks' : cls === 'antibaryon' ? 'three antiquarks' : 'a quark and an antiquark'} ✓`),
      text(`State the quark structure of the ${name}.`, 1, `${qk} ✓`),
      text(`Show that your quark structure gives the correct charge for the ${name}.`, 2, `Charges of the ${three ? 'three' : 'two'} quarks: ${eq(sum)} ✓<br>Total ${eq(`= ${sgn(Q)}`)}, the charge of the ${name} ✓`, ['Quark charges: u +⅔, d −⅓, s −⅓; antiquarks have the opposite charge.']),
      text(`State the baryon number and the strangeness of the ${name}.`, 2, `Baryon number = ${sgn(B)} ✓<br>Strangeness = ${sgn(S)} ✓`)
    ] };
};
const PQ = { p: ['p', 1, 1, 0], n: ['n', 0, 1, 0], pb: [ov('p'), -1, -1, 0], em: ['e<sup>−</sup>', -1, 0, 1], ep: ['e<sup>+</sup>', 1, 0, -1], ve: [NU, 0, 0, 1], ave: [ANU, 0, 0, -1], pip: ['π<sup>+</sup>', 1, 0, 0], pim: ['π<sup>−</sup>', -1, 0, 0], pi0: ['π<sup>0</sup>', 0, 0, 0] };
const REACTIONS = [[['p', 'p'], ['p', 'p', 'pi0']], [['p', 'pim'], ['n', 'pi0']], [['n'], ['p', 'em', 've']], [['p', 'p'], ['p', 'pip']], [['p', 'em'], ['n', 'ave']], [['p'], ['n', 'ep', 've']], [['p', 'pb'], ['pip', 'pim']], [['p', 'n'], ['p', 'p', 'pim']], [['n'], ['p', 'ep', 've']], [['n', 'pip'], ['p', 'pi0']], [['p', 'pim'], ['n', 'pip']], [['n'], ['p', 'em', 'ave']]];
T.PC2 = R => {
  const [L, Rr] = R.pick(REACTIONS), side = (arr, i) => arr.map(k => `(${sgn(PQ[k][i])})`).join(' + '), tot = (arr, i) => arr.reduce((a, k) => a + PQ[k][i], 0);
  const names = ['Charge', 'Baryon number', 'Lepton number'], okk = [1, 2, 3].map(i => tot(L, i) === tot(Rr, i)), allowed = okk.every(Boolean);
  const line = i => `${names[i - 1]}: ${eq(`${side(L, i)} → ${side(Rr, i)}`)}, so ${eq(`${sgn(tot(L, i))} → ${sgn(tot(Rr, i))}`)}: ${okk[i - 1] ? 'conserved' : 'not conserved'} ✓`;
  const broken = names.filter((n, i) => !okk[i]).map(n => n.toLowerCase());
  return { stem: `A student suggests that the following interaction can take place.<br>${eq(`${L.map(k => PQ[k][0]).join(' + ')} → ${Rr.map(k => PQ[k][0]).join(' + ')}`)}`,
    parts: [
      text('Determine whether charge is conserved.', 1, line(1)),
      text('Determine whether baryon number is conserved.', 1, line(2)),
      text('Determine whether lepton number is conserved.', 1, line(3)),
      text('State and explain whether the interaction can take place.', 1, allowed ? 'It can take place, because charge, baryon number and lepton number are all conserved ✓' : `It cannot take place, because ${broken.join(' and ')} ${broken.length > 1 ? 'are' : 'is'} not conserved ✓`)
    ] };
};
T.PC3 = R => {
  const minus = R.chance(.5), from = minus ? 'neutron' : 'proton', to = minus ? 'proton' : 'neutron';
  return { stem: `In β<sup>${minus ? '−' : '+'}</sup> decay a ${from} in a nucleus changes into a ${to}.`,
    parts: [
      text('State the quark structure of a proton and of a neutron.', 2, 'Proton: uud ✓<br>Neutron: udd ✓'),
      text(`State the change in quark structure that takes place in β<sup>${minus ? '−' : '+'}</sup> decay.`, 1, minus ? 'A down quark changes into an up quark (d → u) ✓' : 'An up quark changes into a down quark (u → d) ✓'),
      text(`The ${minus ? 'down quark emits a W<sup>−</sup>' : 'up quark emits a W<sup>+</sup>'} boson when it changes.<br>Show that charge is conserved in this change.`, 2, minus ? `${eq('d → u + W<sup>−</sup>')}: charge ${eq('(−⅓) → (+⅔) + (−1)')} ✓<br>${eq('(+⅔) + (−1) = −⅓')}, so charge is conserved ✓` : `${eq('u → d + W<sup>+</sup>')}: charge ${eq('(+⅔) → (−⅓) + (+1)')} ✓<br>${eq('(−⅓) + (+1) = +⅔')}, so charge is conserved ✓`),
      text('State the particles that the W boson decays into.', 1, minus ? 'An electron and an electron antineutrino ✓' : 'A positron and an electron neutrino ✓'),
      text('Name the only stable baryon, into which all other baryons eventually decay.', 1, 'The proton ✓')
    ] };
};
T.PC4 = R => {
  const plus = R.chance(.5), K = plus ? 'K<sup>+</sup>' : 'K<sup>−</sup>', S = plus ? 1 : -1, qk = plus ? `u${SB}` : `${UB}s`;
  const pi = plus ? 'π<sup>+</sup>' : 'π<sup>−</sup>', mu = plus ? 'μ<sup>+</sup>' : 'μ<sup>−</sup>', nmu = plus ? 'ν<sub>μ</sub>' : `${ov('ν')}<sub>μ</sub>`;
  return { stem: `The ${K} kaon is a strange particle with quark structure ${qk}.`,
    parts: [
      text(`State the strangeness of the ${K} kaon.`, 1, `${sgn(S)} ✓`, ['The strange quark has strangeness −1 and the antistrange quark has strangeness +1.']),
      text('Strange particles are always produced in pairs.<br>Explain why.', 2, 'They are produced through the strong interaction ✓<br>The strong interaction conserves strangeness, so a particle and a particle of opposite strangeness must be produced together ✓'),
      text(`The kaon can decay as shown.<br>${eq(`${K} → ${pi} + π<sup>0</sup>`)}<br>State the interaction responsible for this decay and give a reason for your answer.`, 2, 'The weak interaction ✓<br>Strangeness is not conserved (it changes from ' + sgn(S) + ' to 0), which is only possible in the weak interaction ✓'),
      text(`The kaon can also decay as shown.<br>${eq(`${K} → ${mu} + ${nmu}`)}<br>Show that lepton number is conserved in this decay.`, 1, `Muon lepton number: ${eq(plus ? '0 → (−1) + (+1)' : '0 → (+1) + (−1)')}, so it is conserved ✓`)
    ] };
};
T.PC5 = R => {
  const minus = R.chance(.5), E0 = REST.muon, EJ = E0 * MEV;
  const eqn = minus ? `μ<sup>−</sup> → e<sup>−</sup> + ${ANU} + ν<sub>μ</sub>` : `μ<sup>+</sup> → e<sup>+</sup> + ${NU} + ${ov('ν')}<sub>μ</sub>`;
  return { stem: `A muon decays as shown.<br>${eq(eqn)}<br>The rest energy of a muon is 105.659 MeV.`,
    parts: [
      text('State the class of particles to which all the particles in this decay belong.', 1, 'Leptons ✓'),
      text('Show that electron lepton number and muon lepton number are both conserved.', 2, `Electron lepton number: ${eq(minus ? '0 → (+1) + (−1) + 0' : '0 → (−1) + (+1) + 0')} ✓<br>Muon lepton number: ${eq(minus ? '(+1) → 0 + 0 + (+1)' : '(−1) → 0 + 0 + (−1)')} ✓`),
      text('State the interaction responsible for this decay.', 1, 'The weak interaction ✓'),
      text('State one similarity and one difference between a muon (μ<sup>−</sup>) and an electron.', 2, 'Similarity: same charge <b>or</b> both are leptons ✓<br>Difference: the muon has a much greater rest mass (rest energy) <b>or</b> the muon is unstable ✓'),
      calc('Calculate the rest energy of a muon in J.', 2, EJ, 'J', `${eq('105.659 × 10<sup>6</sup> × 1.60 × 10<sup>−19</sup>')} ✓<br>${eq(`= ${A(EJ)} J`)} ✓`)
    ] };
};
T.PC6 = R => {
  const [name, sym, cls, qk, Q, B, S, sum] = R.pick(HADRONS);
  return { stem: `A hadron has the quark structure ${qk}.`,
    parts: [
      text('Determine the charge of the hadron.', 2, `${eq(sum)} ✓<br>${eq(`= ${sgn(Q)}`)} ✓`, ['Quark charges: u +⅔, d −⅓, s −⅓; antiquarks have the opposite charge.']),
      text('State the baryon number of the hadron.', 1, `${sgn(B)} ✓`, ['Each quark has baryon number +⅓ and each antiquark −⅓.']),
      text('State the strangeness of the hadron.', 1, `${sgn(S)} ✓`),
      text('Identify the hadron and state whether it is a baryon, an antibaryon or a meson.', 2, `${cap(name)} (${sym}) ✓<br>${cap(cls)} ✓`)
    ] };
};

/* ====================== QUANTUM PHENOMENA ====================== */
const METALS = [['caesium', 2.1], ['potassium', 2.3], ['sodium', 2.4], ['calcium', 2.9], ['magnesium', 3.7], ['zinc', 4.3]];
const EV = x => `${N(x, 2)} × 1.60 × 10<sup>−19</sup>`;

T.QP1 = R => {
  const q = find(() => { const [m, phi] = R.pick(METALS), lam = R.pick(rng(200, 500, 25)); return { m, phi, lam, E: H * C / (lam * 1e-9) }; }, q => q.E > q.phi * QE * 1.15);
  const { m, phi, lam, E } = q, pJ = phi * QE, f0 = pJ / H, Ek = E - pJ;
  return { stem: `Light of wavelength ${lam} nm is incident on a clean ${m} surface. The work function of ${m} is ${N(phi, 2)} eV. Photoelectrons are emitted from the surface.`,
    parts: [
      calc(`Calculate the work function of ${m} in J.`, 1, pJ, 'J', `${eq(`${EV(phi)} = ${A(pJ)} J`)} ✓`),
      calc(`Calculate the threshold frequency of ${m}.`, 2, f0, 'Hz', `${eq(`<i>f</i><sub>0</sub> = <i>φ</i>/<i>h</i> = ${A(pJ)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i><sub>0</sub> = ${A(f0)} Hz`)} ✓`),
      calc('Calculate the energy of a photon of the incident light.', 2, E, 'J', `${eq(`<i>E</i> = <i>hc</i>/<i>λ</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${N(lam * 1e-9)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓`),
      calc('Calculate the maximum kinetic energy of the photoelectrons.', 2, Ek, 'J', `${eq(`<i>E</i><sub>k(max)</sub> = <i>hf</i> − <i>φ</i> = ${A(E)} − ${A(pJ)}`)} ✓<br>${eq(`<i>E</i><sub>k(max)</sub> = ${A(Ek)} J`)} ✓`),
      text('Explain why the photoelectrons are emitted with a range of kinetic energies up to this maximum.', 2, 'The work function is the minimum energy needed to remove an electron from the surface ✓<br>Electrons below the surface need more energy to escape (they lose energy reaching the surface), so they leave with less kinetic energy ✓')
    ] };
};
T.QP2 = R => {
  const f0 = R.pick(rng(4.5, 9.0, 0.5)) * 1e14, f = f0 * R.pick([1.4, 1.5, 1.6, 1.8, 2.0]), phi = H * f0, Ek = H * f - phi, v = Math.sqrt(2 * Ek / ME), up = R.chance(.5);
  return { stem: `A metal surface has a threshold frequency of ${N(f0, 2)} Hz. Electromagnetic radiation of frequency ${N(f, 3)} Hz is incident on the surface.`,
    parts: [
      text('State what is meant by the threshold frequency.', 1, 'The minimum frequency of electromagnetic radiation that causes photoelectrons to be emitted from the surface ✓'),
      calc('Calculate the work function of the metal.', 2, phi, 'J', `${eq(`<i>φ</i> = <i>hf</i><sub>0</sub> = 6.63 × 10<sup>−34</sup> × ${N(f0, 2)}`)} ✓<br>${eq(`<i>φ</i> = ${A(phi)} J`)} ✓`),
      calc('Calculate the maximum kinetic energy of the photoelectrons.', 2, Ek, 'J', `${eq(`<i>E</i><sub>k(max)</sub> = <i>hf</i> − <i>φ</i> = (6.63 × 10<sup>−34</sup> × ${N(f, 3)}) − ${A(phi)}`)} ✓<br>${eq(`<i>E</i><sub>k(max)</sub> = ${A(Ek)} J`)} ✓`),
      calc('Calculate the maximum speed of the photoelectrons.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(Ek)} / 9.11 × 10<sup>−31</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text(`The intensity of the radiation is ${up ? 'doubled' : 'halved'} without changing its frequency.<br>State and explain the effect on the maximum kinetic energy of the photoelectrons and on the number emitted each second.`, 3, `The maximum kinetic energy does not change, because the energy of each photon (<i>hf</i>) is unchanged ✓<br>The number of photoelectrons emitted each second ${up ? 'doubles' : 'halves'} ✓<br>because ${up ? 'twice as many' : 'half as many'} photons arrive each second and each photon can release one electron ✓`)
    ] };
};
T.QP3 = R => {
  const q = find(() => { const f = R.pick(rng(7.5, 15, 0.5)) * 1e14, Vs = R.pick(rng(0.4, 2.4, 0.1)); return { f, Vs, phi: H * f - Vs * QE }; }, q => q.phi > 2.9e-19 && q.phi < 7.5e-19);
  const { f, Vs, phi } = q, Ek = Vs * QE;
  return { stem: `Radiation of frequency ${N(f, 2)} Hz is incident on the metal cathode of a photocell. The stopping potential is found to be ${N(Vs, 2)} V.`,
    parts: [
      text('State what is meant by the stopping potential.', 2, 'The (minimum) potential difference that reduces the photoelectric current to zero ✓<br>It is just large enough to stop the photoelectrons that have the maximum kinetic energy ✓'),
      calc('Calculate the maximum kinetic energy of the photoelectrons.', 2, Ek, 'J', `${eq(`<i>E</i><sub>k(max)</sub> = <i>eV</i><sub>s</sub> = 1.60 × 10<sup>−19</sup> × ${N(Vs, 2)}`)} ✓<br>${eq(`<i>E</i><sub>k(max)</sub> = ${A(Ek)} J`)} ✓`),
      calc('Calculate the work function of the metal in J.', 2, phi, 'J', `${eq(`<i>φ</i> = <i>hf</i> − <i>E</i><sub>k(max)</sub> = (6.63 × 10<sup>−34</sup> × ${N(f, 2)}) − ${A(Ek)}`)} ✓<br>${eq(`<i>φ</i> = ${A(phi)} J`)} ✓`),
      calc('Express the work function in eV.', 1, phi / QE, 'eV', `${eq(`${A(phi)} / 1.60 × 10<sup>−19</sup> = ${A(phi / QE)} eV`)} ✓`)
    ] };
};
T.QP4 = R => {
  const f0 = R.pick([4, 5, 6]), phi = H * f0 * 1e14;
  const fig = graph({ x: [0, 12, 2], y: [0, 6, 1], div: 5, xl: `frequency / 10${sup(14)} Hz`, yl: `maximum kinetic energy / 10${sup(-19)} J`, curves: [{ f: x => H * (x - f0) * 1e14 / 1e-19, from: f0, to: 12 }] });
  const y12 = H * (12 - f0) * 1e14;
  return { stem: `<b>Figure 1</b> shows how the maximum kinetic energy of the photoelectrons emitted from a metal surface varies with the frequency of the incident radiation.`, figs: [fig],
    parts: [
      { q: 'Use <b>Figure 1</b> to determine the threshold frequency of the metal.', marks: 1, ans: f0 * 1e14, unit: 'Hz', show: N(f0 * 1e14, 2), tol: .04, ms: `The line meets the frequency axis at ${eq(`${N(f0 * 1e14, 2)} Hz`)} ✓`, guide: ['Reading from the graph: allow ± 0.2 × 10<sup>14</sup> Hz.'] },
      calc('Calculate the work function of the metal.', 2, phi, 'J', `${eq(`<i>φ</i> = <i>hf</i><sub>0</sub> = 6.63 × 10<sup>−34</sup> × ${N(f0 * 1e14, 2)}`)} ✓<br>${eq(`<i>φ</i> = ${A(phi)} J`)} ✓`),
      { q: 'Use the gradient of the graph in <b>Figure 1</b> to determine a value for the Planck constant.', marks: 3, ans: H, unit: 'J s', show: '6.6 × 10<sup>−34</sup>', tol: .05, ms: `The gradient is equal to the Planck constant ✓<br>Uses a large triangle, for example ${eq(`(${N(y12 / 1e-19, 2)} × 10<sup>−19</sup> − 0) / ((12 − ${f0}.0) × 10<sup>14</sup>)`)} ✓<br>${eq('<i>h</i> = 6.6 × 10<sup>−34</sup> J s')} ✓`, guide: ['Reading from the graph: allow 6.3 to 6.9 × 10<sup>−34</sup> J s.', 'Award a maximum of two marks if the powers of ten on the axes are ignored.'] },
      text('The experiment is repeated with a metal that has a larger work function.<br>Describe how the line for this metal compares with the line in <b>Figure 1</b>.', 2, 'It has the same gradient (it is parallel), because the gradient is <i>h</i> ✓<br>It meets the frequency axis at a higher frequency (it is shifted to the right) ✓')
    ] };
};
T.QP5 = R => {
  const [m, phi] = R.pick(METALS), f0 = phi * QE / H;
  return { stem: `When light is incident on a metal surface, photoelectrons are emitted only if the frequency of the light is above the threshold frequency.`,
    parts: [
      text('Explain why the existence of a threshold frequency cannot be explained by the wave model of light.', 3, 'In the wave model, energy arrives continuously and is shared by all the electrons ✓<br>so light of any frequency should eventually give an electron enough energy to escape (if it is bright enough or shines for long enough) ✓<br>but below the threshold frequency no electrons are emitted, however intense the light ✓'),
      text('Explain how the photon model of light accounts for the threshold frequency.', 3, 'Light consists of photons, each of energy <i>hf</i> ✓<br>One photon is absorbed by one electron (a one-to-one interaction) ✓<br>An electron is emitted only if the photon energy is at least equal to the work function, <i>hf</i> ≥ <i>φ</i> ✓'),
      calc(`The work function of ${m} is ${N(phi, 2)} eV.<br>Calculate the threshold frequency of ${m}.`, 3, f0, 'Hz', `${eq(`<i>φ</i> = ${EV(phi)} = ${A(phi * QE)} J`)} ✓<br>${eq(`<i>f</i><sub>0</sub> = <i>φ</i>/<i>h</i> = ${A(phi * QE)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i><sub>0</sub> = ${A(f0)} Hz`)} ✓`)
    ] };
};
T.QP6 = R => {
  const lam = R.pick([200, 220, 240, 250, 260, 270]), phi = 4.3, E = Number((H * C / (lam * 1e-9) / QE).toPrecision(3)), Ek = E - phi;
  return { stem: `A clean zinc plate is placed on the cap of a gold-leaf electroscope and given a negative charge, so that the leaf rises. When ultraviolet radiation of wavelength ${lam} nm is shone on the plate, the leaf slowly falls.`,
    parts: [
      text('Explain why the leaf falls.', 2, 'The ultraviolet photons cause photoelectrons to be emitted from the zinc (photoelectric effect) ✓<br>The plate and leaf lose negative charge, so the repulsion between the leaf and the stem decreases ✓'),
      text('Explain why the leaf does not fall when very bright visible light is used instead.', 2, 'The frequency of visible light is below the threshold frequency of zinc (the photon energy is less than the work function) ✓<br>Increasing the intensity gives more photons, but each photon still has too little energy to release an electron ✓'),
      calc(`The work function of zinc is 4.3 eV.<br>Calculate the maximum kinetic energy, in eV, of the photoelectrons.`, 3, Ek, 'eV', `Photon energy ${eq(`= <i>hc</i>/<i>λ</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${N(lam * 1e-9)} = ${N(E * QE, 3)} J`)} ✓<br>${eq(`= ${N(E * QE, 3)} / 1.60 × 10<sup>−19</sup> = ${N(E, 3)} eV`)} ✓<br>${eq(`<i>E</i><sub>k(max)</sub> = ${N(E, 3)} − 4.3 = ${N(Ek, 3)} eV`)} ✓`, { show: N(Ek, 3) }),
      text('State what would be observed if the electroscope were given a positive charge instead. Explain your answer.', 2, 'The leaf would not fall ✓<br>Any electrons emitted are attracted back to the positive plate, so the charge on the plate does not decrease ✓')
    ] };
};

/* ----- energy levels ----- */
const HYD = [-13.6, -3.40, -1.51, -0.85, -0.54];
const hydFig = () => levelFig(HYD.slice(0, 4).map((e, i) => ({ name: 'n = ' + (i + 1), e: N(e, 3) })).concat([{ name: 'ionisation', e: '0' }]), 'eV', 'Energy levels of the hydrogen atom: n = 1 at minus 13.6 eV, n = 2 at minus 3.40 eV, n = 3 at minus 1.51 eV, n = 4 at minus 0.85 eV and the ionisation level at 0 eV. Not to scale.');
const ATOMS = [[-10.4, -5.5, -3.7, -1.6], [-9.8, -5.1, -3.0, -1.8], [-12.0, -6.4, -3.6, -2.2], [-8.6, -4.5, -2.8, -1.4]];
const F1 = x => x.toFixed(1).replace('-', '−');
const lvlName = i => i === 0 ? 'ground state' : 'level ' + 'ABC'[i - 1];
const atomFig = L => levelFig(L.map((e, i) => ({ name: lvlName(i), e: F1(e) })).concat([{ name: 'ionisation', e: '0' }]), 'eV', `Energy levels of an atom: ${L.map((e, i) => `${lvlName(i)} at ${e} eV`).join(', ')}, and the ionisation level at 0 eV. Not to scale.`);

T.QE1 = R => {
  const hi = R.pick([2, 3, 4]), lo = R.pick([1, 2].filter(x => x < hi)), dE = HYD[hi - 1] - HYD[lo - 1], EJ = dE * QE, wl = R.chance(.5), f = EJ / H, lam = H * C / EJ, top = R.pick([3, 4]);
  return { stem: `<b>Figure 1</b> shows some of the energy levels of a hydrogen atom.`, figs: [hydFig()],
    parts: [
      calc(`An electron moves from level <i>n</i> = ${hi} to level <i>n</i> = ${lo}.<br>Calculate the energy, in J, of the photon that is emitted.`, 2, EJ, 'J', `${eq(`energy = (${N(HYD[hi - 1], 3)}) − (${N(HYD[lo - 1], 3)}) = ${N(dE, 3)} eV`)} ✓<br>${eq(`= ${N(dE, 3)} × 1.60 × 10<sup>−19</sup> = ${A(EJ)} J`)} ✓`),
      wl ? calc('Calculate the wavelength of this photon.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>hc</i>/<i>E</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${A(EJ)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`)
        : calc('Calculate the frequency of this photon.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>E</i>/<i>h</i> = ${A(EJ)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      calc('State the ionisation energy of hydrogen in eV and calculate it in J.', 2, 13.6 * QE, 'J', `13.6 eV ✓<br>${eq(`13.6 × 1.60 × 10<sup>−19</sup> = ${A(13.6 * QE)} J`)} ✓`),
      text(`A hydrogen atom is excited to level <i>n</i> = ${top}.<br>State the number of different photon energies that could be emitted as the atom returns to the ground state.`, 1, `${top * (top - 1) / 2} ✓`, [top === 3 ? 'The transitions are 3→2, 3→1 and 2→1.' : 'The transitions are 4→3, 4→2, 4→1, 3→2, 3→1 and 2→1.'])
    ] };
};
T.QE2 = R => {
  const L = R.pick(ATOMS), gaps = L.slice(1).map(e => e - L[0]), k = R.pick([1, 2]);       // highest level the electron can excite
  const E0 = Number((gaps[k - 1] + (gaps[k] - gaps[k - 1]) * R.pick([.3, .5, .7])).toPrecision(2)), left = E0 - gaps[k - 1], EJ = gaps[k - 1] * QE, lam = H * C / EJ;
  return { stem: `<b>Figure 1</b> shows the lowest energy levels of an atom. An electron with a kinetic energy of ${F1(E0)} eV collides with the atom, which is in its ground state.`, figs: [atomFig(L)],
    parts: [
      text('Explain what is meant by excitation.', 2, 'An electron in the atom moves to a higher energy level ✓<br>by absorbing exactly the energy difference between the two levels (from a collision or from a photon) ✓'),
      text('Determine the highest level to which the atom can be excited by this collision.', 2, `Energy needed to reach ${lvlName(k)} ${eq(`= (${F1(L[k])}) − (${F1(L[0])}) = ${F1(gaps[k - 1])} eV`)}, which is less than ${F1(E0)} eV ✓<br>${cap(lvlName(k + 1))} needs ${F1(gaps[k])} eV, which is more than the electron has, so the highest is ${lvlName(k)} ✓`),
      calc(`Calculate the kinetic energy, in eV, of the colliding electron after it has excited the atom to ${lvlName(k)}.`, 1, left, 'eV', `${eq(`${F1(E0)} − ${F1(gaps[k - 1])} = ${F1(left)} eV`)} ✓`, { show: F1(left) }),
      calc(`The atom then returns directly to the ground state.<br>Calculate the wavelength of the photon emitted.`, 3, lam, 'm', `${eq(`<i>E</i> = ${F1(gaps[k - 1])} × 1.60 × 10<sup>−19</sup> = ${A(EJ)} J`)} ✓<br>${eq(`<i>λ</i> = <i>hc</i>/<i>E</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${A(EJ)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`)
    ] };
};
T.QE3 = R => {
  const L = R.pick(ATOMS), Ei = -L[0], EJ = Ei * QE, f = EJ / H, gap = L[1] - L[0], Ep = Number((gap + (L[2] - L[1]) * .45).toPrecision(2));
  return { stem: `<b>Figure 1</b> shows the lowest energy levels of an atom.`, figs: [atomFig(L)],
    parts: [
      text('State what is meant by the ionisation energy of an atom.', 1, 'The minimum energy needed to remove an electron completely from the atom in its ground state ✓'),
      calc('Calculate the ionisation energy of this atom in J.', 2, EJ, 'J', `Ionisation energy = ${F1(Ei)} eV ✓<br>${eq(`${F1(Ei)} × 1.60 × 10<sup>−19</sup> = ${A(EJ)} J`)} ✓`),
      calc('Calculate the minimum frequency of a photon that can ionise the atom from its ground state.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>E</i>/<i>h</i> = ${A(EJ)} / 6.63 × 10<sup>−34</sup>`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      text(`A photon of energy ${F1(Ep)} eV is incident on the atom in its ground state.<br>Explain why this photon is not absorbed.`, 2, `A photon is absorbed only if its energy is exactly equal to the difference between two energy levels ✓<br>${F1(Ep)} eV does not match any difference from the ground state (${F1(gap)} eV to ${lvlName(1)}, ${F1(L[2] - L[0])} eV to ${lvlName(2)}) ✓`)
    ] };
};
T.QE4 = R => {
  const lam = R.pick([254, 185]), E = H * C / (lam * 1e-9), vis = R.pick([436, 546, 578]), Ev = H * C / (vis * 1e-9);
  return { stem: 'A fluorescent tube contains mercury vapour at low pressure. The inside of the glass tube has a phosphor coating.',
    parts: [
      text('Explain how the mercury vapour produces ultraviolet radiation when there is a current in the tube.', 3, 'Electrons moving through the tube collide with mercury atoms ✓<br>The collisions excite the mercury atoms: electrons in the atoms move to higher energy levels ✓<br>The atoms de-excite and emit photons of ultraviolet radiation ✓'),
      text('Explain the purpose of the phosphor coating.', 3, 'The coating absorbs the ultraviolet photons and its atoms are excited ✓<br>The atoms de-excite in smaller steps (through intermediate levels) ✓<br>emitting photons of lower energy, which are in the visible part of the spectrum ✓'),
      calc(`Mercury emits ultraviolet radiation of wavelength ${lam} nm.<br>Calculate the energy, in eV, of a photon of this radiation.`, 3, E / QE, 'eV', `${eq(`<i>E</i> = <i>hc</i>/<i>λ</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${N(lam * 1e-9)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓<br>${eq(`= ${A(E)} / 1.60 × 10<sup>−19</sup> = ${A(E / QE)} eV`)} ✓`),
      calc(`The coating emits visible light of wavelength ${vis} nm.<br>Calculate the energy, in J, of a photon of this light.`, 2, Ev, 'J', `${eq(`<i>E</i> = <i>hc</i>/<i>λ</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${N(vis * 1e-9)}`)} ✓<br>${eq(`<i>E</i> = ${A(Ev)} J`)} ✓`)
    ] };
};
T.QE5 = R => {
  const [lam, hi] = R.pick([[656, 3], [486, 4]]), E = H * C / (lam * 1e-9), EeV = E / QE;
  return { stem: `The visible line spectrum of hydrogen contains a line of wavelength ${lam} nm. <b>Figure 1</b> shows some of the energy levels of a hydrogen atom.`, figs: [hydFig()],
    parts: [
      text('Explain how line spectra provide evidence that the electrons in atoms have discrete energy levels.', 3, 'A line spectrum contains only certain wavelengths (frequencies), so the photons emitted have only certain energies ✓<br>Each photon is emitted when an electron moves from a higher energy level to a lower one ✓<br>The photon energy equals the difference between the two levels (<i>hf</i> = <i>E</i><sub>1</sub> − <i>E</i><sub>2</sub>), so the levels must have fixed values ✓'),
      calc(`Calculate the energy, in eV, of a photon of wavelength ${lam} nm.`, 3, EeV, 'eV', `${eq(`<i>E</i> = <i>hc</i>/<i>λ</i> = (6.63 × 10<sup>−34</sup> × 3.00 × 10<sup>8</sup>) / ${N(lam * 1e-9)}`)} ✓<br>${eq(`<i>E</i> = ${A(E)} J`)} ✓<br>${eq(`= ${A(E)} / 1.60 × 10<sup>−19</sup> = ${A(EeV)} eV`)} ✓`),
      text('Use <b>Figure 1</b> to identify the transition that produces this line.', 2, `Difference between <i>n</i> = ${hi} and <i>n</i> = 2 ${eq(`= (${N(HYD[hi - 1], 3)}) − (−3.40) = ${N(HYD[hi - 1] + 3.40, 3)} eV`)} ✓<br>So the electron moves from <i>n</i> = ${hi} to <i>n</i> = 2 ✓`)
    ] };
};
T.QE6 = R => {
  const Vv = R.pick([5.0, 8.0, 10, 12, 15, 20, 25]), EJ = Vv * QE, v = Math.sqrt(2 * EJ / ME), L = R.pick(ATOMS), gap = L[1] - L[0], can = Vv >= gap;
  return { stem: `An electron is accelerated from rest through a potential difference of ${N(Vv, 2)} V.`,
    parts: [
      text('State what is meant by one electron volt.', 1, 'The energy gained by an electron when it is accelerated through a potential difference of 1 volt (1.60 × 10<sup>−19</sup> J) ✓'),
      calc('Calculate the kinetic energy gained by the electron in J.', 1, EJ, 'J', `${eq(`<i>E</i><sub>k</sub> = <i>eV</i> = 1.60 × 10<sup>−19</sup> × ${N(Vv, 2)} = ${A(EJ)} J`)} ✓`),
      calc('Calculate the speed of the electron.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(EJ)} / 9.11 × 10<sup>−31</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      text(`The electron collides with an atom that is in its ground state. The ground state of the atom is at ${F1(L[0])} eV and its first excited level is at ${F1(L[1])} eV.<br>Determine whether the electron can excite the atom.`, 2, `Energy needed ${eq(`= (${F1(L[1])}) − (${F1(L[0])}) = ${F1(gap)} eV`)} ✓<br>The electron has ${N(Vv, 2)} eV, which is ${can ? 'more' : 'less'} than this, so it ${can ? 'can' : 'cannot'} excite the atom ✓`)
    ] };
};

/* ----- wave-particle duality ----- */
T.QW1 = R => {
  const v = R.pick(rng(1.5, 9.0, 0.5)) * 1e6, p = ME * v, lam = H / p, vp = H / (MP * lam);
  return { stem: `An electron travels at a speed of ${N(v, 2)} ${MS1}.`,
    parts: [
      calc('Calculate the momentum of the electron.', 1, p, 'kg m s<sup>−1</sup>', `${eq(`<i>p</i> = <i>mv</i> = 9.11 × 10<sup>−31</sup> × ${N(v, 2)} = ${A(p)} kg m s<sup>−1</sup>`)} ✓`),
      calc('Calculate the de Broglie wavelength of the electron.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>h</i>/<i>mv</i> = 6.63 × 10<sup>−34</sup> / ${A(p)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      calc('Calculate the speed of a proton that has the same de Broglie wavelength as this electron.', 2, vp, MS1, `Same wavelength means the same momentum, so ${eq(`<i>v</i> = <i>h</i>/<i>mλ</i> = 6.63 × 10<sup>−34</sup> / (1.67 × 10<sup>−27</sup> × ${A(lam)})`)} ✓<br>${eq(`<i>v</i> = ${A(vp)} ${MS1}`)} ✓`),
      text('State one piece of experimental evidence that electrons have wave properties.', 1, 'Electrons are diffracted (for example by a thin crystal or graphite film, giving a pattern of rings) ✓')
    ] };
};
T.QW2 = R => {
  const Vv = R.pick([500, 1000, 1500, 2000, 2500, 3000, 4000, 5000]), EJ = Vv * QE, v = Math.sqrt(2 * EJ / ME), lam = H / (ME * v), up = R.chance(.5);
  return { stem: `In an electron diffraction tube, electrons are accelerated from rest through a potential difference of ${Vv} V. They pass through a thin graphite film and form a pattern of rings on a fluorescent screen.`,
    parts: [
      calc('Calculate the kinetic energy of an electron as it reaches the graphite.', 1, EJ, 'J', `${eq(`<i>E</i><sub>k</sub> = <i>eV</i> = 1.60 × 10<sup>−19</sup> × ${Vv} = ${A(EJ)} J`)} ✓`),
      calc('Calculate the speed of the electron.', 2, v, MS1, `${eq(`<i>v</i> = √(2<i>E</i><sub>k</sub>/<i>m</i>) = √(2 × ${A(EJ)} / 9.11 × 10<sup>−31</sup>)`)} ✓<br>${eq(`<i>v</i> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the de Broglie wavelength of the electron.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>h</i>/<i>mv</i> = 6.63 × 10<sup>−34</sup> / (9.11 × 10<sup>−31</sup> × ${A(v)})`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text(`The potential difference is ${up ? 'increased' : 'decreased'}.<br>State and explain what happens to the diameter of the rings.`, 3, `The electrons reach the graphite with a ${up ? 'greater' : 'smaller'} speed (momentum) ✓<br>so their de Broglie wavelength is ${up ? 'shorter' : 'longer'} ✓<br>They are diffracted ${up ? 'less' : 'more'}, so the rings ${up ? 'become smaller (move closer together)' : 'become larger (move further apart)'} ✓`)
    ] };
};
T.QW3 = R => {
  const [name, m, mtxt] = R.pick([['neutron', 1.67e-27, '1.67 × 10<sup>−27</sup>'], ['alpha particle', 6.64e-27, '6.64 × 10<sup>−27</sup>'], ['proton', 1.67e-27, '1.67 × 10<sup>−27</sup>']]), v = R.pick(rng(2, 9, 1)) * R.pick([1e3, 1e4, 1e5]), lam = H / (m * v);
  return { stem: 'Light and electrons can each behave as a wave and as a particle.',
    parts: [
      text('State one phenomenon that shows that light behaves as a wave and one that shows that it behaves as a particle.', 2, 'Wave: diffraction or interference ✓<br>Particle: the photoelectric effect ✓'),
      text('State one phenomenon that shows that electrons behave as a wave and one that shows that they behave as a particle.', 2, 'Wave: electron diffraction ✓<br>Particle: deflection in an electric or magnetic field (or ionisation, or collisions) ✓'),
      calc(`${cap(name === 'alpha particle' ? 'an alpha particle' : 'a ' + name)} of mass ${mtxt} kg travels at a speed of ${N(v, 2)} ${MS1}.<br>Calculate its de Broglie wavelength.`, 2, lam, 'm', `${eq(`<i>λ</i> = <i>h</i>/<i>mv</i> = 6.63 × 10<sup>−34</sup> / (${mtxt} × ${N(v, 2)})`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('State what happens to the de Broglie wavelength of a particle when its momentum is doubled.', 1, 'It halves ✓')
    ] };
};
T.QW4 = R => {
  const m = R.pick([0.046, 0.058, 0.16, 0.42]), obj = { 0.046: 'golf ball', 0.058: 'tennis ball', 0.16: 'cricket ball', 0.42: 'football' }[m], v = R.pick([20, 25, 30, 40, 50]), lam = H / (m * v), sp = R.pick([1.0, 1.5, 2.0, 2.5]) * 1e-10, ve = H / (ME * sp);
  return { stem: `A ${obj} of mass ${N(m, 2)} kg travels at a speed of ${v} ${MS1}.`,
    parts: [
      calc(`Calculate the de Broglie wavelength of the ${obj}.`, 2, lam, 'm', `${eq(`<i>λ</i> = <i>h</i>/<i>mv</i> = 6.63 × 10<sup>−34</sup> / (${N(m, 2)} × ${v})`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text(`Explain why the ${obj} does not show observable diffraction when it passes through a gap.`, 2, 'Diffraction is significant only when the wavelength is similar to the width of the gap ✓<br>The wavelength of the ball is far smaller than any possible gap (far smaller than an atom) ✓'),
      calc(`The atoms in a crystal are ${N(sp, 2)} m apart.<br>Calculate the speed of an electron whose de Broglie wavelength is equal to this spacing.`, 2, ve, MS1, `${eq(`<i>v</i> = <i>h</i>/<i>mλ</i> = 6.63 × 10<sup>−34</sup> / (9.11 × 10<sup>−31</sup> × ${N(sp, 2)})`)} ✓<br>${eq(`<i>v</i> = ${A(ve)} ${MS1}`)} ✓`),
      text('Explain why electrons travelling at about this speed are diffracted by the crystal.', 1, 'Their wavelength is about the same as the spacing between the atoms, which act like the gaps of a diffraction grating ✓')
    ] };
};
T.QW5 = R => {
  const E = R.pick([50, 80, 100, 150, 200, 250, 400]), EJ = E * QE, p = Math.sqrt(2 * ME * EJ), lam = H / p;
  return { stem: `An electron has a kinetic energy of ${E} eV.`,
    parts: [
      calc('Calculate the kinetic energy of the electron in J.', 1, EJ, 'J', `${eq(`${E} × 1.60 × 10<sup>−19</sup> = ${A(EJ)} J`)} ✓`),
      calc('Calculate the momentum of the electron.', 3, p, 'kg m s<sup>−1</sup>', `${eq('<i>E</i><sub>k</sub> = ½<i>mv</i><sup>2</sup>')} and ${eq('<i>p</i> = <i>mv</i>')}, so ${eq('<i>p</i> = √(2<i>mE</i><sub>k</sub>)')} (or calculates <i>v</i> first) ✓<br>${eq(`<i>p</i> = √(2 × 9.11 × 10<sup>−31</sup> × ${A(EJ)})`)} ✓<br>${eq(`<i>p</i> = ${A(p)} kg m s<sup>−1</sup>`)} ✓`),
      calc('Calculate the de Broglie wavelength of the electron.', 1, lam, 'm', `${eq(`<i>λ</i> = <i>h</i>/<i>p</i> = 6.63 × 10<sup>−34</sup> / ${A(p)} = ${A(lam)} m`)} ✓`),
      text('The kinetic energy of the electron is increased.<br>State and explain what happens to its de Broglie wavelength.', 2, 'The wavelength decreases ✓<br>The momentum increases and <i>λ</i> = <i>h</i>/<i>p</i> ✓')
    ] };
};
T.QW6 = R => {
  const v = R.pick(rng(1.0, 2.5, 0.25)) * 1e7, m = 6.64e-27, lam = H / (m * v);
  return { stem: 'In 1923 de Broglie suggested that particles of matter have wave properties.',
    parts: [
      text('State the de Broglie hypothesis.', 2, 'Particles of matter (such as electrons) also have a wave-like nature ✓<br>with a wavelength given by <i>λ</i> = <i>h</i>/<i>mv</i>, where <i>mv</i> is the momentum of the particle ✓'),
      text('De Broglie’s idea was not accepted at first.<br>Explain how a new theory such as this comes to be accepted by the scientific community.', 2, 'The theory makes predictions that are tested by experiment (electron diffraction was observed a few years later) ✓<br>The results are published, peer reviewed and repeated by other scientists ✓'),
      calc(`An alpha particle of mass 6.64 × 10<sup>−27</sup> kg travels at a speed of ${N(v, 3)} ${MS1}.<br>Calculate its de Broglie wavelength.`, 2, lam, 'm', `${eq(`<i>λ</i> = <i>h</i>/<i>mv</i> = 6.63 × 10<sup>−34</sup> / (6.64 × 10<sup>−27</sup> × ${N(v, 3)})`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('An electron travels at the same speed as the alpha particle.<br>State and explain how its de Broglie wavelength compares with that of the alpha particle.', 2, 'The wavelength of the electron is much longer ✓<br>It has a much smaller mass, so a much smaller momentum at the same speed ✓')
    ] };
};

/* ====================== WAVES ====================== */
const DEGS = x => N(x, 3) + '°';
const asinD = x => Math.asin(x) * 180 / Math.PI;

/* ----- progressive waves ----- */
T.WP1 = R => {
  const lam = R.pick([0.4, 0.8]), a = R.pick([2, 3, 4]), f = R.pick([5, 10, 20, 25, 50]), fr = R.pick([[0.25, 90, 'π/2'], [0.5, 180, 'π'], [0.75, 270, '3π/2']]), d = lam * fr[0], c = f * lam;
  const fig = graph({ x: [0, 2.0, 0.4], y: [-(a + 1), a + 1, 1], div: 4, xl: 'distance / m', yl: 'displacement / cm', curves: [{ f: x => a * Math.sin(2 * Math.PI * x / lam), from: 0, to: 2.0 }] });
  return { stem: `<b>Figure 1</b> shows how the displacement of the particles in a progressive wave varies with distance along the wave at one instant. The frequency of the wave is ${f} Hz.`, figs: [fig],
    parts: [
      { q: 'State the amplitude of the wave.', marks: 1, ans: a, unit: 'cm', show: N(a, 2), ms: `${N(a, 2)} cm ✓`, guide: ['Reading from the graph: allow ± 0.1 cm.'] },
      { q: 'Determine the wavelength of the wave.', marks: 1, ans: lam, unit: 'm', show: N(lam, 2), ms: `${N(lam, 2)} m (the distance for one complete cycle) ✓`, guide: ['Reading from the graph: allow ± 0.02 m.'] },
      calc('Calculate the speed of the wave.', 2, c, MS1, `${eq(`<i>c</i> = <i>fλ</i> = ${f} × ${N(lam, 2)}`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${MS1}`)} ✓`),
      calc('Calculate the period of the wave.', 1, 1 / f, 's', `${eq(`<i>T</i> = 1/<i>f</i> = 1/${f} = ${A(1 / f)} s`)} ✓`),
      { q: `Determine the phase difference between two points on the wave that are ${N(d, 2)} m apart.`, marks: 2, ans: fr[1], unit: '°', show: String(fr[1]), ms: `${eq(`${N(d, 2)} / ${N(lam, 2)} = ${fr[0]}`)} of a wavelength ✓<br>${eq(`phase difference = ${fr[0]} × 360° = ${fr[1]}°`)} (${fr[2]} rad) ✓` }
    ] };
};
T.WP2 = R => {
  const Tm = R.pick([4, 5, 8, 10]), a = R.pick([0.2, 0.3, 0.4]), f = 1000 / Tm, c = R.pick([330, 340, 345]), lam = c / f;
  const fig = graph({ x: [0, 20, 4], y: [-0.5, 0.5, 0.1], div: 4, xl: 'time / ms', yl: 'displacement / mm', curves: [{ f: x => a * Math.sin(2 * Math.PI * x / Tm), from: 0, to: 20 }] });
  return { stem: `A sound wave travels through air. <b>Figure 1</b> shows how the displacement of one air particle varies with time. The speed of sound in air is ${c} ${MS1}.`, figs: [fig],
    parts: [
      { q: 'Determine the period of the wave.', marks: 1, ans: Tm, unit: 'ms', show: N(Tm, 2), ms: `${N(Tm, 2)} ms (${N(Tm * 1e-3, 2)} s) ✓`, guide: ['Reading from the graph: allow ± 0.2 ms.'] },
      calc('Calculate the frequency of the wave.', 2, f, 'Hz', `${eq(`<i>f</i> = 1/<i>T</i> = 1 / ${N(Tm * 1e-3, 2)}`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`, { guide: ['Award one mark if ms is not converted to s.'] }),
      calc('Calculate the wavelength of the wave.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = ${c} / ${A(f)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('State the amplitude of the wave.', 1, `${N(a, 2)} mm ✓`, ['Reading from the graph: allow ± 0.02 mm.']),
      text('State the phase difference between two points on the wave that are half a wavelength apart.', 1, '180° (π rad) ✓')
    ] };
};
T.WP3 = R => {
  const [fM, lam] = R.pick([[100, 3.00], [150, 2.00], [75, 4.00], [60, 5.00], [200, 1.50], [120, 2.50]]), fr = R.pick([[0.25, 90], [0.5, 180], [0.75, 270]]), d = lam * fr[0], Tp = 1 / (fM * 1e6);
  return { stem: `A radio station broadcasts at a frequency of ${fM} MHz. Radio waves travel through air at 3.00 × 10<sup>8</sup> ${MS1}.`,
    parts: [
      calc('Calculate the wavelength of the radio waves.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = 3.00 × 10<sup>8</sup> / ${N(fM * 1e6, 2)}`)} ✓<br>${eq(`<i>λ</i> = ${N(lam, 3)} m`)} ✓`, { show: N(lam, 3), guide: ['Award one mark if MHz is not converted to Hz.'] }),
      calc('Calculate the period of the radio waves.', 2, Tp, 's', `${eq(`<i>T</i> = 1/<i>f</i> = 1 / ${N(fM * 1e6, 2)}`)} ✓<br>${eq(`<i>T</i> = ${A(Tp)} s`)} ✓`),
      { q: `Calculate the phase difference, in degrees, between two points on the wave that are ${N(d, 3)} m apart along its direction of travel.`, marks: 2, ans: fr[1], unit: '°', show: String(fr[1]), ms: `${eq(`${N(d, 3)} / ${N(lam, 3)} = ${fr[0]}`)} of a wavelength ✓<br>${eq(`${fr[0]} × 360° = ${fr[1]}°`)} ✓` },
      text('State what is meant by the frequency of a wave.', 1, 'The number of complete waves (oscillations) passing a point each second ✓')
    ] };
};
T.WP4 = R => {
  const fM = R.pick([1.5, 2.0, 2.5, 3.5, 5.0]), c = 1540, lam = c / (fM * 1e6), depth = R.pick([4.0, 6.0, 8.0, 10, 12]), t = 2 * depth * 1e-2 / c;
  return { stem: `An ultrasound scanner emits pulses of ultrasound of frequency ${N(fM, 2)} MHz. The speed of ultrasound in body tissue is ${c} ${MS1}.`,
    parts: [
      text('State what is meant by the wavelength of a wave.', 1, 'The shortest distance between two points on the wave that are in phase (for example between adjacent crests) ✓'),
      calc('Calculate the wavelength of the ultrasound in body tissue.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = ${c} / ${N(fM * 1e6, 2)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      calc(`A pulse is reflected from a boundary ${N(depth, 2)} cm below the skin.<br>Calculate the time between the pulse being emitted and the reflection being detected.`, 3, t, 's', `Distance travelled ${eq(`= 2 × ${N(depth * 1e-2, 2)} = ${N(2 * depth * 1e-2, 2)} m`)} ✓<br>${eq(`<i>t</i> = distance / speed = ${N(2 * depth * 1e-2, 2)} / ${c}`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`, { guide: ['Award two marks for an answer that uses the depth only once.'] }),
      text('The ultrasound passes from tissue into bone, where it travels faster.<br>State what happens to its frequency and to its wavelength.', 2, 'The frequency does not change ✓<br>The wavelength increases ✓')
    ] };
};
T.WP5 = R => {
  const n = R.pick([10, 12, 15, 20, 24, 30]), t = R.pick([4.0, 5.0, 6.0, 8.0, 10]), k = R.pick([4, 5, 8, 10]), lamc = R.pick([1.5, 2.0, 2.5, 3.0, 4.0]), dist = k * lamc, f = n / t, c = f * lamc * 1e-2;
  return { stem: `Water waves are produced in a ripple tank. ${n} complete waves pass a point in ${N(t, 2)} s. The distance between one crest and the crest ${k} wavelengths further on is ${N(dist, 3)} cm.`,
    parts: [
      calc('Calculate the frequency of the waves.', 1, f, 'Hz', `${eq(`<i>f</i> = ${n} / ${N(t, 2)} = ${A(f)} Hz`)} ✓`),
      calc('Calculate the wavelength of the waves.', 1, lamc * 1e-2, 'm', `${eq(`<i>λ</i> = ${N(dist, 3)} / ${k} = ${N(lamc, 2)} cm = ${A(lamc * 1e-2)} m`)} ✓`, { guide: [`Accept ${N(lamc, 2)} cm.`] }),
      calc('Calculate the speed of the waves.', 2, c, MS1, `${eq(`<i>c</i> = <i>fλ</i> = ${A(f)} × ${A(lamc * 1e-2)}`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${MS1}`)} ✓`),
      text('The waves move into shallower water, where they travel more slowly.<br>State and explain what happens to the wavelength of the waves.', 2, 'The wavelength decreases ✓<br>The frequency stays the same and <i>c</i> = <i>fλ</i>, so a smaller speed gives a shorter wavelength ✓')
    ] };
};

/* ----- longitudinal and transverse waves, polarisation ----- */
T.WL1 = R => {
  const f = R.pick([256, 320, 440, 512, 680, 850]), lam = Number((340 / f).toPrecision(2)), c = f * lam;
  return { stem: 'Waves can be transverse or longitudinal.',
    parts: [
      text('Describe the difference between a transverse wave and a longitudinal wave.', 2, 'In a transverse wave the oscillations are perpendicular to the direction of energy transfer (direction of travel) ✓<br>In a longitudinal wave the oscillations are parallel to the direction of energy transfer ✓'),
      text('Give one example of a transverse wave and one example of a longitudinal wave.', 2, 'Transverse: any electromagnetic wave, or a wave on a string ✓<br>Longitudinal: sound ✓'),
      text('State which type of wave can be polarised. Explain your answer.', 2, 'Transverse waves ✓<br>Polarisation restricts the oscillations to one plane; the oscillations of a longitudinal wave are along the direction of travel, so there is no plane to select ✓'),
      calc(`A sound wave of frequency ${f} Hz has a wavelength of ${N(lam, 2)} m.<br>Calculate the speed of the sound.`, 2, c, MS1, `${eq(`<i>c</i> = <i>fλ</i> = ${f} × ${N(lam, 2)}`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${MS1}`)} ✓`)
    ] };
};
T.WL2 = R => {
  const glare = R.chance(.5);
  return { stem: 'Unpolarised light passes through a polarising filter. A second polarising filter, the analyser, is placed after the first and rotated slowly through 360°.',
    parts: [
      text('State what is meant by polarised light.', 1, 'Light in which the oscillations (of the electric field) are in one plane only ✓'),
      text('Describe how the intensity of the light leaving the analyser changes as it is rotated through 360°.', 3, 'Maximum intensity when the transmission axes of the two filters are parallel ✓<br>The intensity falls to zero when the axes are at 90° to each other ✓<br>There are two maxima and two minima in one complete rotation ✓'),
      glare ? text('Explain how polarising sunglasses reduce the glare from the surface of water.', 2, 'Light reflected from the surface is partly polarised (mostly in the horizontal plane) ✓<br>The filter in the sunglasses is aligned to absorb light polarised in this plane, so the reflected light is reduced ✓')
        : text('Explain why the intensity of unpolarised light is reduced when it passes through a single polarising filter.', 2, 'Unpolarised light has oscillations in all planes perpendicular to its direction of travel ✓<br>The filter transmits only the component in one plane and absorbs the rest ✓'),
      text('Explain why this experiment shows that light is a transverse wave.', 1, 'Only transverse waves can be polarised ✓')
    ] };
};
T.WL3 = R => {
  const fM = R.pick([500, 600, 750, 800, 1000]), lam = C / (fM * 1e6), pol = R.pick(['vertically', 'horizontally']);
  return { stem: `A television transmitter emits ${pol} polarised waves of frequency ${fM} MHz. A receiving aerial consists of metal rods.`,
    parts: [
      text('Explain why the rods of the receiving aerial must be aligned with the plane of polarisation of the waves.', 2, 'The waves are polarised, so their electric field oscillates in one plane only ✓<br>The signal is strongest when the rods are parallel to this plane ✓'),
      text('The aerial is rotated through 90° about the direction in which the waves are travelling.<br>State and explain what happens to the strength of the signal received.', 2, 'The signal falls to a minimum (zero) ✓<br>The rods are now perpendicular to the plane in which the waves are polarised ✓'),
      calc('Calculate the wavelength of the waves.', 2, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = 3.00 × 10<sup>8</sup> / ${N(fM * 1e6, 2)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('State one property that all electromagnetic waves have in common.', 1, 'They all travel at the same speed in a vacuum <b>or</b> they are all transverse ✓')
    ] };
};
T.WL4 = R => {
  const dcm = R.pick([20, 25, 40, 50, 68, 85]), f = 340 / (dcm * 1e-2), te = R.pick([0.40, 0.50, 0.80, 1.2, 1.5]), dist = 340 * te / 2;
  return { stem: `A loudspeaker produces a sound wave in air. The distance between the centres of two adjacent compressions is ${dcm} cm. The speed of sound in air is 340 ${MS1}.`,
    parts: [
      text('Describe how the air particles move as the sound wave passes.', 2, 'They oscillate about fixed (equilibrium) positions ✓<br>along the direction in which the wave travels, forming compressions and rarefactions ✓'),
      calc('Calculate the frequency of the sound.', 2, f, 'Hz', `The wavelength is ${N(dcm * 1e-2, 2)} m ✓<br>${eq(`<i>f</i> = <i>c</i>/<i>λ</i> = 340 / ${N(dcm * 1e-2, 2)} = ${A(f)} Hz`)} ✓`),
      text('Explain why sound waves cannot be polarised.', 1, 'Sound is a longitudinal wave: the oscillations are along the direction of travel, so they cannot be restricted to one plane ✓'),
      calc(`A short pulse of the sound is reflected from a wall and returns to the loudspeaker ${N(te, 2)} s after it was emitted.<br>Calculate the distance from the loudspeaker to the wall.`, 2, dist, 'm', `Total distance ${eq(`= 340 × ${N(te, 2)} = ${A(340 * te)} m`)} ✓<br>${eq(`distance to wall = ${A(340 * te)} / 2 = ${A(dist)} m`)} ✓`)
    ] };
};
T.WL5 = R => {
  const lc = R.pick([2.8, 3.0, 3.2]), f = C / (lc * 1e-2);
  return { stem: `A microwave transmitter emits polarised microwaves of wavelength ${N(lc, 2)} cm towards a receiver. A grille of parallel metal rods is placed between the transmitter and the receiver.`,
    parts: [
      text('State what oscillates in an electromagnetic wave.', 1, 'Electric and magnetic fields (at right angles to each other and to the direction of travel) ✓'),
      calc('Calculate the frequency of the microwaves.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>c</i>/<i>λ</i> = 3.00 × 10<sup>8</sup> / ${N(lc * 1e-2, 2)}`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      text('The grille is rotated through 360° in its own plane.<br>Describe and explain how the signal at the receiver changes.', 3, 'The signal varies between a maximum and a minimum (zero), with two maxima and two minima in one rotation ✓<br>The signal is a minimum when the rods are parallel to the plane of polarisation (the electric field), because the rods absorb the waves ✓<br>The signal is a maximum when the rods are perpendicular to the plane of polarisation ✓'),
      text('State what this experiment shows about microwaves.', 1, 'They are transverse waves ✓')
    ] };
};

/* ----- stationary waves ----- */
T.WS1 = R => {
  const q = find(() => { const l = R.pick([0.40, 0.50, 0.60, 0.65, 0.80, 1.0, 1.2]), Tn = R.pick([20, 30, 40, 50, 60, 80, 100]), mu = R.pick([0.50, 0.80, 1.0, 1.5, 2.0, 2.5, 4.0]) * 1e-3; return { l, Tn, mu, c: Math.sqrt(Tn / mu) }; }, q => q.c / (2 * q.l) > 40 && q.c / (2 * q.l) < 500);
  const { l, Tn, mu, c } = q, f = c / (2 * l), k = R.pick([[4, 'doubles', '√4 = 2'], [9, 'trebles', '√9 = 3']]);
  return { stem: `A string is stretched between two fixed supports ${N(l, 2)} m apart. The tension in the string is ${N(Tn, 2)} N and its mass per unit length is ${N(mu, 2)} kg m<sup>−1</sup>. The string vibrates at its first harmonic.`,
    parts: [
      calc('Calculate the frequency of the first harmonic.', 3, f, 'Hz', `${eq(`<i>f</i> = (1/2<i>l</i>) √(<i>T</i>/<i>μ</i>) = (1 / (2 × ${N(l, 2)})) × √(${N(Tn, 2)} / ${N(mu, 2)})`)} ✓<br>${eq(`√(<i>T</i>/<i>μ</i>) = ${A(c)}`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      calc('Calculate the speed of the waves on the string.', 2, c, MS1, `${eq(`<i>λ</i> = 2<i>l</i> = ${N(2 * l, 2)} m`)} and ${eq(`<i>c</i> = <i>fλ</i> = ${A(f)} × ${N(2 * l, 2)}`)} (or ${eq('<i>c</i> = √(<i>T</i>/<i>μ</i>)')}) ✓<br>${eq(`<i>c</i> = ${A(c)} ${MS1}`)} ✓`),
      text(`The tension is increased to ${k[0]} times its original value.<br>State and explain what happens to the frequency of the first harmonic.`, 2, `The frequency ${k[1]} ✓<br>The frequency is proportional to √<i>T</i> and ${k[2]} ✓`),
      text('State what is meant by a node.', 1, 'A point on a stationary wave where the amplitude (displacement) is always zero ✓')
    ] };
};
T.WS2 = R => {
  const n = R.pick([2, 3, 4]), L = R.pick([0.60, 0.90, 1.2, 1.5, 1.8]), f = R.pick([60, 90, 120, 150, 180, 240]), lam = 2 * L / n, c = f * lam, ord = ['', 'first', 'second', 'third', 'fourth'][n];
  return { stem: `<b>Figure 1</b> shows a stationary wave on a string that is fixed at both ends. The length of the string is ${N(L, 2)} m and the frequency of vibration is ${f} Hz.`, figs: [stringFig(n, `${N(L, 2)} m`)],
    parts: [
      text('State which harmonic is shown in <b>Figure 1</b>.', 1, `The ${ord} harmonic ✓`),
      calc('Determine the wavelength of the waves on the string.', 2, lam, 'm', `Each loop is half a wavelength, so ${n} loops ${eq(`= ${n}<i>λ</i>/2 = ${N(L, 2)} m`)} ✓<br>${eq(`<i>λ</i> = 2 × ${N(L, 2)} / ${n} = ${A(lam)} m`)} ✓`),
      calc('Calculate the speed of the waves on the string.', 2, c, MS1, `${eq(`<i>c</i> = <i>fλ</i> = ${f} × ${A(lam)}`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${MS1}`)} ✓`),
      calc('Calculate the frequency of the first harmonic of this string.', 1, f / n, 'Hz', `${eq(`${f} / ${n} = ${A(f / n)} Hz`)} ✓`),
      text('Explain how the stationary wave is formed.', 3, 'Waves travel along the string and are reflected at the fixed ends ✓<br>The reflected waves superpose with the waves travelling in the opposite direction, which have the same frequency (and amplitude) ✓<br>At nodes the waves always cancel (they meet in antiphase); at antinodes they reinforce (they meet in phase) ✓')
    ] };
};
T.WS3 = R => {
  const micro = R.chance(.5);
  if (micro){
    const d = R.pick([1.4, 1.5, 1.6]), lam = 2 * d * 1e-2, f = C / lam;
    return { stem: `A microwave transmitter is aimed at a metal plate, which reflects the microwaves back towards the transmitter. A detector moved along the line between the transmitter and the plate finds positions of minimum signal that are ${N(d, 2)} cm apart.`,
      parts: [
        text('Explain why there are positions of minimum signal.', 3, 'The reflected waves superpose with the incident waves, forming a stationary wave ✓<br>The minima are nodes ✓<br>where the two waves always meet in antiphase and cancel ✓'),
        calc('Calculate the wavelength of the microwaves.', 2, lam, 'm', `Adjacent nodes are half a wavelength apart ✓<br>${eq(`<i>λ</i> = 2 × ${N(d, 2)} cm = ${A(lam)} m`)} ✓`),
        calc('Calculate the frequency of the microwaves.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>c</i>/<i>λ</i> = 3.00 × 10<sup>8</sup> / ${A(lam)}`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
        text('State the name given to the positions of maximum signal.', 1, 'Antinodes ✓')
      ] };
  }
  const d = R.pick([10, 17, 20, 25, 34]), lam = 2 * d * 1e-2, f = 340 / lam;
  return { stem: `A loudspeaker faces a wall, which reflects the sound back towards the loudspeaker. A small microphone moved along the line between the loudspeaker and the wall finds positions of minimum loudness that are ${d} cm apart. The speed of sound in air is 340 ${MS1}.`,
    parts: [
      text('Explain why there are positions of minimum loudness.', 3, 'The reflected waves superpose with the incident waves, forming a stationary wave ✓<br>The minima are nodes ✓<br>where the two waves always meet in antiphase and cancel ✓'),
      calc('Calculate the wavelength of the sound.', 2, lam, 'm', `Adjacent nodes are half a wavelength apart ✓<br>${eq(`<i>λ</i> = 2 × ${d} cm = ${A(lam)} m`)} ✓`),
      calc('Calculate the frequency of the sound.', 2, f, 'Hz', `${eq(`<i>f</i> = <i>c</i>/<i>λ</i> = 340 / ${A(lam)}`)} ✓<br>${eq(`<i>f</i> = ${A(f)} Hz`)} ✓`),
      text('State the name given to the positions of maximum loudness.', 1, 'Antinodes ✓')
    ] };
};
T.WS4 = R => {
  const q = find(() => { const mg = R.pick([1.2, 1.5, 2.0, 2.4, 3.0, 4.0]), Lt = R.pick([1.0, 1.2, 1.5, 2.0]), M = R.pick([0.20, 0.40, 0.50, 0.80, 1.0]), l = R.pick([0.50, 0.60, 0.80, 1.0]); return { mg, Lt, M, l, mu: mg * 1e-3 / Lt }; }, q => q.l < q.Lt && isNice(q.mu, 2));
  const { mg, Lt, M, l, mu } = q, Tn = M * 9.81, f1 = Math.sqrt(Tn / mu) / (2 * l);
  return { stem: `A student investigates stationary waves on a string. A ${N(Lt, 2)} m length of the string has a mass of ${N(mg, 2)} g. The string passes over a pulley and is kept in tension by a ${N(M, 2)} kg mass hanging from its end. The length of string that vibrates is ${N(l, 2)} m.`,
    parts: [
      calc('Calculate the mass per unit length of the string.', 1, mu, 'kg m<sup>−1</sup>', `${eq(`<i>μ</i> = ${N(mg * 1e-3, 2)} / ${N(Lt, 2)} = ${A(mu)} kg m<sup>−1</sup>`)} ✓`),
      calc('Calculate the tension in the string.', 1, Tn, 'N', `${eq(`<i>T</i> = <i>mg</i> = ${N(M, 2)} × 9.81 = ${A(Tn)} N`)} ✓`),
      calc('Calculate the frequency of the first harmonic.', 2, f1, 'Hz', `${eq(`<i>f</i> = (1/2<i>l</i>) √(<i>T</i>/<i>μ</i>) = (1 / (2 × ${N(l, 2)})) × √(${A(Tn)} / ${A(mu)})`)} ✓<br>${eq(`<i>f</i> = ${A(f1)} Hz`)} ✓`),
      calc('Calculate the frequency of the third harmonic.', 1, 3 * f1, 'Hz', `${eq(`3 × ${A(f1)} = ${A(3 * f1)} Hz`)} ✓`),
      text('Sketch the appearance of the string when it vibrates at its third harmonic. Label the nodes N and the antinodes A.', 2, 'Three loops between the fixed ends ✓<br>Four nodes (including one at each end) and three antinodes, correctly labelled ✓')
    ] };
};
T.WS5 = R => {
  const d = R.pick([0.15, 0.20, 0.25, 0.30, 0.40]), f = R.pick([50, 80, 100, 120, 200]), lam = 2 * d, c = f * lam;
  return { stem: `A stationary wave is set up on a stretched string by a vibration generator of frequency ${f} Hz. Adjacent nodes are ${N(d, 2)} m apart.`,
    parts: [
      text('State two differences between a stationary wave and a progressive wave.', 2, 'Any two ✓✓:<br>A stationary wave does not transfer energy along the string; a progressive wave does.<br>In a stationary wave the amplitude varies from zero at the nodes to a maximum at the antinodes; in a progressive wave every point has the same amplitude.<br>Between adjacent nodes all points of a stationary wave are in phase; in a progressive wave the phase changes continuously along the wave.'),
      calc('Calculate the wavelength of the waves on the string.', 1, lam, 'm', `${eq(`<i>λ</i> = 2 × ${N(d, 2)} = ${A(lam)} m`)} ✓`),
      calc('Calculate the speed of the waves on the string.', 2, c, MS1, `${eq(`<i>c</i> = <i>fλ</i> = ${f} × ${A(lam)}`)} ✓<br>${eq(`<i>c</i> = ${A(c)} ${MS1}`)} ✓`),
      text('State the phase difference between two points on the string that are on opposite sides of a node, in adjacent loops.', 1, '180° (π rad): they are in antiphase ✓')
    ] };
};
T.WS6 = R => {
  const [Tn, mu, g] = R.pick([[6.4, 1.0e-3, 40], [10, 1.0e-3, 50], [14.4, 1.0e-3, 60], [16, 2.5e-3, 40], [25, 2.5e-3, 50], [36, 2.5e-3, 60]]);
  const fig = graph({ x: [0, 4, 1], y: [0, 250, 50], div: 5, xl: `1 / length  /  m${sup(-1)}`, yl: 'frequency / Hz', curves: [{ f: x => g * x, from: 0, to: 4 }] });
  return { stem: `A student investigates how the frequency <i>f</i> of the first harmonic of a stretched string depends on its length <i>l</i>. The tension in the string is kept at ${N(Tn, 3)} N. <b>Figure 1</b> shows a graph of <i>f</i> against 1/<i>l</i>.`, figs: [fig],
    parts: [
      text('State what the graph shows about the relationship between <i>f</i> and <i>l</i>.', 1, 'The frequency is inversely proportional to the length (the graph of <i>f</i> against 1/<i>l</i> is a straight line through the origin) ✓'),
      { q: 'Determine the gradient of the graph.', marks: 2, ans: g, unit: 'Hz m', show: N(g, 2), tol: .04, ms: `Uses a triangle that covers at least half of the line ✓<br>${eq(`gradient = ${N(g, 2)} Hz m`)} ✓`, guide: [`Reading from the graph: allow ${N(g * .96, 3)} to ${N(g * 1.04, 3)} Hz m.`] },
      calc('Use the gradient to calculate the mass per unit length of the string.', 3, mu, 'kg m<sup>−1</sup>', `${eq('<i>f</i> = (1/2<i>l</i>) √(<i>T</i>/<i>μ</i>)')}, so ${eq('gradient = ½ √(<i>T</i>/<i>μ</i>)')} ✓<br>${eq(`<i>μ</i> = <i>T</i> / (4 × gradient<sup>2</sup>) = ${N(Tn, 3)} / (4 × ${N(g, 2)}<sup>2</sup>)`)} ✓<br>${eq(`<i>μ</i> = ${A(mu)} kg m<sup>−1</sup>`)} ✓`),
      text('State two measurements, other than frequency, that the student must make, and the instrument used for each.', 2, 'The vibrating length of the string, with a metre ruler ✓<br>The mass of the hanging masses (to find the tension), with a balance ✓')
    ] };
};

/* ----- interference ----- */
T.WI1 = R => {
  const q = find(() => { const lam = R.pick(rng(450, 650, 10)), s = R.pick([0.20, 0.25, 0.40, 0.50, 0.80]), D = R.pick([1.2, 1.5, 2.0, 2.5, 3.0]); return { lam, s, D, w: lam * 1e-9 * D / (s * 1e-3) }; }, q => q.w > 1e-3 && q.w < 9e-3);
  const { lam, s, D, w } = q, ch = R.pick([['The separation of the slits is halved', 'doubles', 'the fringe spacing is inversely proportional to the slit separation'], ['The screen is moved to twice the distance from the slits', 'doubles', 'the fringe spacing is proportional to the distance from the slits to the screen'], ['The light is replaced by light of a shorter wavelength', 'decreases', 'the fringe spacing is proportional to the wavelength']]);
  return { stem: `<b>Figure 1</b> shows an arrangement used to produce interference fringes. Laser light of wavelength ${lam} nm is incident on a double slit. The slit separation <i>s</i> is ${N(s, 2)} mm and the distance <i>D</i> from the slits to the screen is ${N(D, 2)} m.`, figs: [slitFig('laser')],
    parts: [
      calc('Calculate the fringe spacing.', 2, w, 'm', `${eq(`<i>w</i> = <i>λD</i>/<i>s</i> = (${N(lam * 1e-9)} × ${N(D, 2)}) / ${N(s * 1e-3, 2)}`)} ✓<br>${eq(`<i>w</i> = ${A(w)} m`)} ✓`, { guide: ['Award one mark if nm or mm is not converted to m.'] }),
      text('Explain how a bright fringe is formed on the screen.', 2, 'Light from the two slits arrives in phase, so the waves superpose constructively ✓<br>This happens where the path difference is a whole number of wavelengths ✓'),
      text(`${ch[0]}.<br>State and explain what happens to the fringe spacing.`, 2, `The fringe spacing ${ch[1]} ✓<br>because ${ch[2]} (<i>w</i> = <i>λD</i>/<i>s</i>) ✓`),
      text('Explain why a laser is a suitable light source for this experiment.', 2, 'It is monochromatic (a single wavelength) ✓<br>It is coherent, so the light from the two slits has a constant phase difference ✓')
    ] };
};
T.WI2 = R => {
  const q = find(() => { const lam = R.pick(rng(450, 650, 5)), s = R.pick([0.25, 0.40, 0.50]), D = R.pick([1.5, 2.0, 2.5, 3.0]), n = R.pick([5, 8, 10]); const w = lam * 1e-9 * D / (s * 1e-3); return { lam, s, D, n, x: Number((n * w * 1e3).toPrecision(3)) }; }, q => q.x > 10 && q.x < 60);
  const { s, D, n, x } = q, w = x / n * 1e-3, lam = w * s * 1e-3 / D;
  return { stem: `A student uses a laser and a double slit to produce interference fringes on a screen, as shown in <b>Figure 1</b>. The slit separation <i>s</i> is ${N(s, 2)} mm and the distance <i>D</i> from the slits to the screen is ${N(D, 2)} m. The student measures the distance across ${n} fringe spacings as ${N(x, 3)} mm.`, figs: [slitFig('laser')],
    parts: [
      calc('Calculate the fringe spacing.', 1, w, 'm', `${eq(`<i>w</i> = ${N(x, 3)} / ${n} = ${N(x / n, 3)} mm = ${A(w)} m`)} ✓`),
      text('Explain why the student measured across several fringe spacings.', 1, 'To reduce the percentage uncertainty in the fringe spacing ✓'),
      calc('Calculate the wavelength of the laser light.', 3, lam, 'm', `${eq('<i>λ</i> = <i>ws</i>/<i>D</i>')} ✓<br>${eq(`<i>λ</i> = (${A(w)} × ${N(s * 1e-3, 2)}) / ${N(D, 2)}`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      text('State two safety precautions that should be taken when using the laser.', 2, 'Any two ✓✓:<br>Never look directly into the beam.<br>Avoid reflections (do not point the beam at shiny surfaces).<br>Wear laser safety goggles.<br>Display a warning sign, or keep the beam below eye level.'),
      text('The laser is replaced by a source of white light with a single slit in front of it.<br>Describe the appearance of the fringes.', 2, 'The central fringe is white ✓<br>The other fringes are spectra, with blue nearest the centre and red furthest from it (and they overlap further out) ✓')
    ] };
};
T.WI3 = R => {
  const [f, lam] = R.pick([[850, 0.40], [680, 0.50], [1700, 0.20], [425, 0.80]]), k = R.pick([1, 2, 3, 4]), s1 = R.pick([2.4, 3.0, 3.6, 4.2]), s2 = s1 + k * lam / 2, cons = k % 2 === 0;
  return { stem: `Two loudspeakers <b>S<sub>1</sub></b> and <b>S<sub>2</sub></b> are connected to the same signal generator and emit sound of frequency ${f} Hz in phase. A microphone is placed at a point <b>P</b>, which is ${N(s1, 3)} m from <b>S<sub>1</sub></b> and ${N(s2, 3)} m from <b>S<sub>2</sub></b>. The speed of sound in air is 340 ${MS1}.`,
    parts: [
      text('Explain why the two loudspeakers are coherent sources.', 2, 'They emit waves of the same frequency ✓<br>with a constant phase difference ✓'),
      calc('Calculate the wavelength of the sound.', 1, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = 340 / ${f} = ${A(lam)} m`)} ✓`),
      text('Determine whether the sound at <b>P</b> is a maximum or a minimum.', 3, `Path difference ${eq(`= ${N(s2, 3)} − ${N(s1, 3)} = ${N(s2 - s1, 2)} m`)} ✓<br>${eq(`${N(s2 - s1, 2)} / ${A(lam)} = ${k / 2}`)} wavelength${k === 2 ? '' : 's'} ✓<br>${cons ? 'A whole number of wavelengths, so the waves arrive in phase and the sound is a maximum' : 'An odd number of half wavelengths, so the waves arrive in antiphase and the sound is a minimum'} ✓`),
      text('The connections to one of the loudspeakers are reversed.<br>State what happens to the sound at <b>P</b>.', 1, cons ? 'It becomes a minimum (the waves now arrive in antiphase) ✓' : 'It becomes a maximum (the waves now arrive in phase) ✓')
    ] };
};
T.WI4 = R => {
  const lam = R.pick([450, 500, 550, 600, 650]), k = R.pick([3, 4, 5, 6, 7]), pd = k * lam / 2, bright = k % 2 === 0, m = R.pick([2, 3]);
  return { stem: `Light of wavelength ${lam} nm from two coherent sources meets at a point <b>P</b> on a screen. The path difference between the two waves at <b>P</b> is ${pd} nm.`,
    parts: [
      text('State what is meant by path difference.', 1, 'The difference between the distances travelled by the two waves from their sources to the point ✓'),
      text('Determine whether <b>P</b> is at the centre of a bright fringe or a dark fringe.', 3, `${eq(`${pd} / ${lam} = ${k / 2}`)} wavelength${k === 2 ? '' : 's'} ✓<br>${bright ? 'A whole number of wavelengths, so the waves arrive in phase' : 'An odd number of half wavelengths, so the waves arrive in antiphase'} ✓<br>${bright ? 'Constructive interference: a bright fringe' : 'Destructive interference: a dark fringe'} ✓`),
      calc(`Calculate the path difference at the centre of the ${m === 2 ? 'second' : 'third'} dark fringe from the centre of the pattern.`, 1, (m - 0.5) * lam, 'nm', `${eq(`${m - 0.5} × ${lam} = ${N((m - 0.5) * lam, 4)} nm`)} ✓`, { show: N((m - 0.5) * lam, 4) }),
      text('State two conditions that are needed for two light sources to produce an observable interference pattern.', 2, 'The sources must be coherent (same frequency and a constant phase difference) ✓<br>The waves must have similar amplitudes <b>or</b> the light must be monochromatic ✓')
    ] };
};
T.WI5 = R => {
  const lam = R.pick(rng(520, 640, 10)), s = R.pick([0.30, 0.40, 0.50, 0.60]), D = R.pick([1.5, 2.0, 2.5]), w = lam * 1e-9 * D / (s * 1e-3);
  return { stem: `Light from a lamp passes through a filter that transmits light of wavelength ${lam} nm, then through a single narrow slit, and then falls on a double slit. Fringes are seen on a screen ${N(D, 2)} m from the double slit. The separation of the two slits is ${N(s, 2)} mm.`,
    parts: [
      text('Explain the purpose of the single slit.', 2, 'Light from the single slit diffracts and illuminates both slits of the double slit ✓<br>so the double slit acts as two coherent sources ✓'),
      text('Explain the purpose of the filter.', 1, 'It makes the light monochromatic, so the fringes are clear (fringes for different wavelengths would otherwise overlap) ✓'),
      calc('Calculate the fringe spacing.', 2, w, 'm', `${eq(`<i>w</i> = <i>λD</i>/<i>s</i> = (${N(lam * 1e-9)} × ${N(D, 2)}) / ${N(s * 1e-3, 2)}`)} ✓<br>${eq(`<i>w</i> = ${A(w)} m`)} ✓`),
      text('Each of the two slits is made narrower without changing their separation.<br>State and explain the effect on the fringes.', 2, 'The fringe spacing does not change (it does not depend on the slit width), but the fringes are dimmer ✓<br>More fringes are visible (the pattern is wider) because the light is diffracted more by narrower slits ✓')
    ] };
};

/* ----- diffraction ----- */
T.WD1 = R => {
  const q = find(() => { const Nl = R.pick([300, 400, 500, 600]), lam = R.pick(rng(450, 650, 10)), n = R.pick([1, 2]); return { Nl, lam, n, d: 1e-3 / Nl }; }, q => q.n * q.lam * 1e-9 / q.d < 0.9);
  const { Nl, lam, n, d } = q, th = asinD(n * lam * 1e-9 / d), nmax = Math.floor(d / (lam * 1e-9) + 1e-9), ord = n === 1 ? 'first' : 'second';
  return { stem: `Light of wavelength ${lam} nm is incident normally on a diffraction grating that has ${Nl} lines per mm.`,
    parts: [
      calc('Calculate the spacing of the lines on the grating.', 1, d, 'm', `${eq(`<i>d</i> = 1 × 10<sup>−3</sup> / ${Nl} = ${A(d)} m`)} ✓`),
      calc(`Calculate the angle of diffraction of the ${ord}-order maximum.`, 3, th, '°', `${eq(`<i>d</i> sin <i>θ</i> = <i>nλ</i>`)}, so ${eq(`sin <i>θ</i> = (${n} × ${N(lam * 1e-9)}) / ${A(d)}`)} ✓<br>${eq(`sin <i>θ</i> = ${N(n * lam * 1e-9 / d, 3)}`)} ✓<br>${eq(`<i>θ</i> = ${N(th, 3)}°`)} ✓`),
      { q: 'Determine the highest order of maximum that can be observed.', marks: 2, ans: nmax, unit: '', show: String(nmax), ms: `The largest possible value of sin <i>θ</i> is 1, so ${eq(`<i>n</i> ≤ <i>d</i>/<i>λ</i> = ${A(d)} / ${N(lam * 1e-9)} = ${N(d / (lam * 1e-9), 3)}`)} ✓<br>The highest order is ${nmax} ✓` },
      { q: 'State the total number of maxima that can be observed.', marks: 1, ans: 2 * nmax + 1, unit: '', show: String(2 * nmax + 1), ms: `${eq(`(2 × ${nmax}) + 1 = ${2 * nmax + 1}`)} (${nmax} on each side of the central maximum) ✓` }
    ] };
};
T.WD2 = R => {
  const q = find(() => { const Nl = R.pick([300, 400, 500, 600]), lam0 = R.pick(rng(430, 660, 1)), d = 1e-3 / Nl; return { Nl, d, th2: Number(asinD(2 * lam0 * 1e-9 / d).toPrecision(3)), s: 2 * lam0 * 1e-9 / d }; }, q => q.s < 0.85);
  const { Nl, d, th2 } = q, lam = d * Math.sin(deg(th2)) / 2, th1 = asinD(lam / d);
  return { stem: `A student uses a diffraction grating with ${Nl} lines per mm to measure the wavelength of light from a laser. The light is incident normally on the grating. The second-order maximum is at an angle of ${N(th2, 3)}° to the central maximum.`,
    parts: [
      calc('Calculate the wavelength of the laser light.', 3, lam, 'm', `${eq(`<i>d</i> = 1 × 10<sup>−3</sup> / ${Nl} = ${A(d)} m`)} ✓<br>${eq(`<i>λ</i> = <i>d</i> sin <i>θ</i> / <i>n</i> = (${A(d)} × sin ${N(th2, 3)}°) / 2`)} ✓<br>${eq(`<i>λ</i> = ${A(lam)} m`)} ✓`),
      calc('Calculate the angle of the first-order maximum.', 2, th1, '°', `${eq(`sin <i>θ</i> = <i>λ</i>/<i>d</i> = ${A(lam)} / ${A(d)} = ${N(lam / d, 3)}`)} ✓<br>${eq(`<i>θ</i> = ${N(th1, 3)}°`)} ✓`),
      text('The laser is replaced by a source of white light.<br>Describe the pattern that is seen.', 2, 'The central maximum is white ✓<br>Each of the other orders is a spectrum, with violet (blue) diffracted least and red diffracted most ✓'),
      text('State one application of diffraction gratings.', 1, 'Analysing the spectra of light, for example to identify the elements present in a star ✓')
    ] };
};
T.WD3 = R => {
  const a = R.chance(.5), b = R.chance(.5);
  return { stem: 'Monochromatic light from a laser passes through a single narrow slit and falls on a screen.',
    parts: [
      text('Describe the diffraction pattern seen on the screen.', 3, 'A central bright fringe that is twice as wide as the other bright fringes ✓<br>The central fringe is much brighter, and the intensity of the other fringes decreases with distance from the centre ✓<br>The bright fringes are separated by dark fringes ✓'),
      text(`The slit is made ${a ? 'narrower' : 'wider'}.<br>State two changes to the central maximum.`, 2, `It becomes ${a ? 'wider' : 'narrower'} ✓<br>It becomes ${a ? 'dimmer (less light passes through)' : 'brighter'} ✓`),
      text(`The laser is replaced by one that emits light of a ${b ? 'longer' : 'shorter'} wavelength.<br>State the effect on the width of the central maximum.`, 1, `It becomes ${b ? 'wider' : 'narrower'} ✓`),
      text('The laser is replaced by a source of white light.<br>Describe the pattern that is seen.', 2, 'The central maximum is white ✓<br>The other fringes are coloured (spectra), with blue on the side nearer the centre and red on the outer side ✓')
    ] };
};
T.WD4 = R => {
  const q = find(() => { const Nl = R.pick([250, 300, 400, 500, 600]), lam = R.pick(rng(450, 650, 10)); return { Nl, lam, d: 1e-3 / Nl }; }, q => q.lam * 1e-9 / q.d < 0.5);
  const { Nl, lam, d } = q, th = asinD(lam * 1e-9 / d);
  return { stem: `Light of wavelength ${lam} nm is incident normally on a diffraction grating with ${Nl} lines per mm. The grating equation is <i>d</i> sin <i>θ</i> = <i>nλ</i>.`,
    parts: [
      text('Explain why a maximum is produced at angles given by this equation.', 3, 'The path difference between light from adjacent slits is <i>d</i> sin <i>θ</i> ✓<br>For a maximum the light from all the slits must arrive in phase ✓<br>so the path difference must be a whole number of wavelengths, <i>nλ</i> ✓'),
      calc('Calculate the angle <i>θ</i> for the first-order maximum.', 3, th, '°', `${eq(`<i>d</i> = 1 × 10<sup>−3</sup> / ${Nl} = ${A(d)} m`)} ✓<br>${eq(`sin <i>θ</i> = <i>λ</i>/<i>d</i> = ${N(lam * 1e-9)} / ${A(d)} = ${N(lam * 1e-9 / d, 3)}`)} ✓<br>${eq(`<i>θ</i> = ${N(th, 3)}°`)} ✓`),
      calc('Calculate the angle between the two first-order maxima.', 1, 2 * th, '°', `${eq(`2 × ${N(th, 3)}° = ${N(2 * th, 3)}°`)} ✓`),
      text('The grating is replaced by one with more lines per mm.<br>State the effect on the angle of the first-order maximum.', 1, 'It increases (the line spacing <i>d</i> is smaller) ✓')
    ] };
};
T.WD5 = R => {
  const Nl = R.pick([300, 400, 500, 600]), d = 1e-3 / Nl, tr = asinD(656e-9 / d), tb = asinD(486e-9 / d);
  return { stem: `Light from a hydrogen discharge lamp contains red light of wavelength 656 nm and blue-green light of wavelength 486 nm. The light is incident normally on a diffraction grating that has ${Nl} lines per mm.`,
    parts: [
      calc('Calculate the angle of the first-order maximum for the red light.', 3, tr, '°', `${eq(`<i>d</i> = 1 × 10<sup>−3</sup> / ${Nl} = ${A(d)} m`)} ✓<br>${eq(`sin <i>θ</i> = <i>λ</i>/<i>d</i> = 6.56 × 10<sup>−7</sup> / ${A(d)} = ${N(656e-9 / d, 3)}`)} ✓<br>${eq(`<i>θ</i> = ${N(tr, 3)}°`)} ✓`),
      calc('Calculate the angle of the first-order maximum for the blue-green light.', 1, tb, '°', `${eq(`sin <i>θ</i> = 4.86 × 10<sup>−7</sup> / ${A(d)} = ${N(486e-9 / d, 3)}`)}, so ${eq(`<i>θ</i> = ${N(tb, 3)}°`)} ✓`),
      calc('Calculate the angle between these two first-order maxima.', 1, tr - tb, '°', `${eq(`${N(tr, 3)}° − ${N(tb, 3)}° = ${N(tr - tb, 2)}°`)} ✓`, { show: N(tr - tb, 2) }),
      text('State and explain how this angle compares with the angle between the same two colours in the second order.', 2, 'The angle is larger in the second order ✓<br>sin <i>θ</i> is doubled for each colour, so the colours are spread out more ✓')
    ] };
};
T.WD6 = R => {
  const f = R.pick([170, 340, 425, 680]), lam = 340 / f;
  return { stem: 'Waves spread out when they pass through a gap.',
    parts: [
      text('State the name of this effect.', 1, 'Diffraction ✓'),
      text('State and explain how the width of the gap affects the amount of spreading.', 2, 'The spreading is greatest when the width of the gap is about equal to the wavelength ✓<br>A gap much wider than the wavelength gives very little spreading ✓'),
      text('Plane water waves approach a gap whose width is about the same as their wavelength.<br>Sketch the wavefronts before and after the gap.', 2, 'Semicircular wavefronts after the gap, spreading through a wide angle ✓<br>The same wavelength (spacing of wavefronts) before and after the gap ✓'),
      calc(`Sound of frequency ${f} Hz passes through a doorway. The speed of sound in air is 340 ${MS1}.<br>Calculate the wavelength of the sound.`, 1, lam, 'm', `${eq(`<i>λ</i> = <i>c</i>/<i>f</i> = 340 / ${f} = ${A(lam)} m`)} ✓`),
      text('Explain why this sound can be heard round the corner of the doorway although light does not bend round it.', 2, 'The wavelength of the sound is similar to the width of the doorway, so it is diffracted through a large angle ✓<br>The wavelength of light is very much smaller than the doorway, so its diffraction is negligible ✓')
    ] };
};

/* ----- refraction and optical fibres ----- */
const GLASS = [1.45, 1.50, 1.52, 1.55, 1.60];
T.WR1 = R => {
  const n = R.pick(GLASS), i = R.pick([30, 40, 50, 60]), r = asinD(Math.sin(deg(i)) / n), v = C / n, tc = asinD(1 / n);
  const fig = rayFig({ top: 'air', bottom: 'glass', from: 'top', inc: i, refr: r, aria: `A ray of light in air meets a horizontal glass surface at an angle of incidence of ${i} degrees and is refracted towards the normal in the glass` });
  return { stem: `<b>Figure 1</b> shows a ray of light travelling from air into a glass block. The angle of incidence is ${i}° and the refractive index of the glass is ${N(n, 3)}.`, figs: [fig],
    parts: [
      calc('Calculate the angle of refraction in the glass.', 3, r, '°', `${eq('<i>n</i><sub>1</sub> sin <i>θ</i><sub>1</sub> = <i>n</i><sub>2</sub> sin <i>θ</i><sub>2</sub>')}, so ${eq(`1.00 × sin ${i}° = ${N(n, 3)} × sin <i>θ</i><sub>2</sub>`)} ✓<br>${eq(`sin <i>θ</i><sub>2</sub> = ${N(Math.sin(deg(i)) / n, 3)}`)} ✓<br>${eq(`<i>θ</i><sub>2</sub> = ${N(r, 3)}°`)} ✓`),
      calc('Calculate the speed of light in the glass.', 2, v, MS1, `${eq(`<i>c</i><sub>s</sub> = <i>c</i>/<i>n</i> = 3.00 × 10<sup>8</sup> / ${N(n, 3)}`)} ✓<br>${eq(`<i>c</i><sub>s</sub> = ${A(v)} ${MS1}`)} ✓`),
      calc('Calculate the critical angle for the boundary between this glass and air.', 2, tc, '°', `${eq(`sin <i>θ</i><sub>c</sub> = 1/<i>n</i> = 1 / ${N(n, 3)}`)} ✓<br>${eq(`<i>θ</i><sub>c</sub> = ${N(tc, 3)}°`)} ✓`),
      text('State what happens to the frequency and to the wavelength of the light as it enters the glass.', 2, 'The frequency does not change ✓<br>The wavelength decreases ✓')
    ] };
};
T.WR2 = R => {
  const q = find(() => { const n = R.pick(GLASS), th = R.pick([25, 30, 35, 45, 50, 55, 60]); return { n, th, tc: asinD(1 / n) }; }, q => Math.abs(q.th - q.tc) > 3);
  const { n, th, tc } = q, tir = th > tc, out = tir ? null : asinD(n * Math.sin(deg(th)));
  const fig = rayFig({ top: 'air', bottom: 'glass', from: 'bottom', inc: th, refr: null, aria: `A ray of light inside a glass block meets the boundary with air at an angle of ${th} degrees to the normal` });
  return { stem: `<b>Figure 1</b> shows a ray of light inside a glass block. The ray meets the boundary between the glass and air at an angle of incidence of ${th}°. The refractive index of the glass is ${N(n, 3)}.`, figs: [fig],
    parts: [
      text('State what is meant by the critical angle.', 1, 'The angle of incidence (in the denser medium) for which the angle of refraction is 90° ✓'),
      calc('Calculate the critical angle for the boundary between the glass and air.', 2, tc, '°', `${eq(`sin <i>θ</i><sub>c</sub> = 1/<i>n</i> = 1 / ${N(n, 3)}`)} ✓<br>${eq(`<i>θ</i><sub>c</sub> = ${N(tc, 3)}°`)} ✓`),
      text('State and explain what happens to the ray at the boundary.', 2, tir ? `The ray is totally internally reflected ✓<br>The angle of incidence (${th}°) is greater than the critical angle (${N(tc, 3)}°) ✓` : `The ray is refracted into the air, bending away from the normal (a weak ray is also reflected) ✓<br>The angle of incidence (${th}°) is less than the critical angle (${N(tc, 3)}°) ✓`),
      tir ? text('State the angle between the reflected ray and the normal.', 1, `${th}° (the angle of reflection equals the angle of incidence) ✓`)
        : calc('Calculate the angle of refraction in the air.', 2, out, '°', `${eq(`${N(n, 3)} × sin ${th}° = 1.00 × sin <i>θ</i><sub>2</sub>`)}, so ${eq(`sin <i>θ</i><sub>2</sub> = ${N(n * Math.sin(deg(th)), 3)}`)} ✓<br>${eq(`<i>θ</i><sub>2</sub> = ${N(out, 3)}°`)} ✓`)
    ] };
};
T.WR3 = R => {
  const [n1, n2] = R.pick([[1.50, 1.45], [1.52, 1.47], [1.55, 1.48], [1.60, 1.50], [1.48, 1.46], [1.62, 1.52]]), tc = asinD(n2 / n1), v = C / n1, Lk = R.pick([2.0, 5.0, 10, 20, 50]), t = Lk * 1e3 / v;
  return { stem: `<b>Figure 1</b> shows a ray of light travelling along a step-index optical fibre. The refractive index of the core is ${N(n1, 3)} and the refractive index of the cladding is ${N(n2, 3)}.`, figs: [fibreFig()],
    parts: [
      calc('Calculate the critical angle at the boundary between the core and the cladding.', 2, tc, '°', `${eq(`sin <i>θ</i><sub>c</sub> = <i>n</i><sub>2</sub>/<i>n</i><sub>1</sub> = ${N(n2, 3)} / ${N(n1, 3)}`)} ✓<br>${eq(`<i>θ</i><sub>c</sub> = ${N(tc, 3)}°`)} ✓`),
      calc('Calculate the speed of light in the core.', 2, v, MS1, `${eq(`<i>c</i><sub>s</sub> = <i>c</i>/<i>n</i> = 3.00 × 10<sup>8</sup> / ${N(n1, 3)}`)} ✓<br>${eq(`<i>c</i><sub>s</sub> = ${A(v)} ${MS1}`)} ✓`),
      calc(`Calculate the time taken for light to travel along the axis of a ${N(Lk, 2)} km length of the fibre.`, 2, t, 's', `${eq(`<i>t</i> = distance / speed = ${N(Lk * 1e3, 2)} / ${A(v)}`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`),
      text('State two functions of the cladding.', 2, 'Any two ✓✓:<br>It protects the surface of the core from scratches, which would let light escape.<br>It stops light passing between fibres that touch (prevents crossover).<br>It provides the boundary with a lower refractive index needed for total internal reflection.')
    ] };
};
T.WR4 = R => {
  const n = R.pick([1.46, 1.48, 1.50, 1.52]), Lk = R.pick([10, 20, 40, 50, 80]), v = C / n, t = Lk * 1e3 / v;
  return { stem: 'Pulses of light are sent along an optical fibre. The pulses become broader as they travel along the fibre.',
    parts: [
      text('Explain how modal (multipath) dispersion causes pulse broadening.', 2, 'Rays enter the fibre at different angles and so travel paths of different lengths along the fibre ✓<br>They take different times to arrive, so the pulse spreads out in time ✓'),
      text('State how modal dispersion can be reduced.', 1, 'Use a fibre with a very narrow core (a monomode fibre) ✓'),
      text('Explain what is meant by material dispersion and state how it can be reduced.', 2, 'Different wavelengths travel at different speeds in the glass (the refractive index depends on wavelength), so they arrive at different times ✓<br>Use monochromatic light (a laser) ✓'),
      text('State one consequence of pulse broadening for the signal.', 1, 'Pulses overlap, so information is lost (or the rate at which pulses can be sent is limited) ✓'),
      calc(`The refractive index of the core is ${N(n, 3)}.<br>Calculate the time taken for a pulse to travel ${Lk} km along the axis of the fibre.`, 3, t, 's', `${eq(`<i>c</i><sub>s</sub> = <i>c</i>/<i>n</i> = 3.00 × 10<sup>8</sup> / ${N(n, 3)} = ${A(v)} ${MS1}`)} ✓<br>${eq(`<i>t</i> = ${N(Lk * 1e3, 2)} / ${A(v)}`)} ✓<br>${eq(`<i>t</i> = ${A(t)} s`)} ✓`)
    ] };
};
T.WR5 = R => {
  const n2 = R.pick([1.50, 1.52, 1.55, 1.60]), i = R.pick([30, 40, 50, 60]), r = asinD(1.33 * Math.sin(deg(i)) / n2), tc = asinD(1.33 / n2);
  const fig = rayFig({ top: 'water', bottom: 'glass', from: 'top', inc: i, refr: r, aria: `A ray of light in water meets a horizontal glass surface at an angle of incidence of ${i} degrees and is refracted towards the normal in the glass` });
  return { stem: `<b>Figure 1</b> shows a ray of light travelling from water into glass. The angle of incidence is ${i}°. The refractive index of water is 1.33 and the refractive index of the glass is ${N(n2, 3)}.`, figs: [fig],
    parts: [
      text('State what is meant by the refractive index of a substance.', 1, 'The ratio of the speed of light in a vacuum to the speed of light in the substance (<i>n</i> = <i>c</i>/<i>c</i><sub>s</sub>) ✓'),
      calc('Calculate the angle of refraction in the glass.', 3, r, '°', `${eq('<i>n</i><sub>1</sub> sin <i>θ</i><sub>1</sub> = <i>n</i><sub>2</sub> sin <i>θ</i><sub>2</sub>')}, so ${eq(`1.33 × sin ${i}° = ${N(n2, 3)} × sin <i>θ</i><sub>2</sub>`)} ✓<br>${eq(`sin <i>θ</i><sub>2</sub> = ${N(1.33 * Math.sin(deg(i)) / n2, 3)}`)} ✓<br>${eq(`<i>θ</i><sub>2</sub> = ${N(r, 3)}°`)} ✓`),
      text('State in which of the two substances light travels more slowly. Give a reason for your answer.', 1, 'The glass, because it has the greater refractive index ✓'),
      calc('Calculate the critical angle for light travelling from the glass towards the water.', 2, tc, '°', `${eq(`sin <i>θ</i><sub>c</sub> = <i>n</i><sub>2</sub>/<i>n</i><sub>1</sub> = 1.33 / ${N(n2, 3)}`)} ✓<br>${eq(`<i>θ</i><sub>c</sub> = ${N(tc, 3)}°`)} ✓`)
    ] };
};
T.WR6 = R => {
  const tc = R.pick([38.0, 39.5, 40.5, 41.0, 42.0, 43.5]), n = 1 / Math.sin(deg(tc)), v = C / n;
  return { stem: `A student directs a ray of light through the curved face of a semicircular glass block towards the centre of its flat face. The student increases the angle of incidence at the flat face until the ray just fails to emerge into the air. This happens at an angle of incidence of ${N(tc, 3)}°.`,
    parts: [
      text('State the two conditions needed for total internal reflection.', 2, 'The light must be travelling from a substance with a higher refractive index towards one with a lower refractive index ✓<br>The angle of incidence must be greater than the critical angle ✓'),
      calc('Calculate the refractive index of the glass.', 2, n, '', `${eq(`<i>n</i> = 1 / sin <i>θ</i><sub>c</sub> = 1 / sin ${N(tc, 3)}°`)} ✓<br>${eq(`<i>n</i> = ${A(n)}`)} ✓`),
      calc('Calculate the speed of light in the glass.', 2, v, MS1, `${eq(`<i>c</i><sub>s</sub> = <i>c</i>/<i>n</i> = 3.00 × 10<sup>8</sup> / ${A(n)}`)} ✓<br>${eq(`<i>c</i><sub>s</sub> = ${A(v)} ${MS1}`)} ✓`),
      text('Explain why the ray is not refracted when it enters the block through the curved face.', 1, 'It travels along a radius, so it meets the curved face along the normal (angle of incidence of 0°) ✓')
    ] };
};

/* ---------- engine ---------- */
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
