/* Question bank engine, built from the question generator. Do not edit by hand. */
window.BANK_EL = (function(){
const module = undefined;
'use strict';
/* ---------- helpers ---------- */
function makeRand(seed){
  let a = seed >>> 0;
  const r = function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  r.pick = arr => arr[Math.floor(r() * arr.length)];
  r.chance = p => r() < p;
  return r;
}
function sig(x, n = 2){
  if (!isFinite(x)) return 'NaN';
  if (Math.abs(x) < 1e-12) return '0';
  x = Number((x * (1 + 1e-12)).toPrecision(n));          // exact halves round up (0.5375 gives 0.538)
  const e = Math.floor(Math.log10(Math.abs(x)) + 1e-9);
  const d = n - 1 - e;
  const s = d >= 0 ? x.toFixed(d) : String(Math.round(x));
  return s.replace('-', '−');
}
function isNice(x, n = 3){ return Math.abs(x - Number(x.toPrecision(n))) < 1e-9 * Math.max(1, Math.abs(x)); }
function ansStr(x){ return isNice(x, 2) ? sig(x, 2) : sig(x, 3); }
const x4 = x => isNice(x, 3) ? ansStr(x) : sig(x, 4);   // operands carried into a later step
const STATS = { fallback: 0 };
function find(gen, test){ let v; for (let i = 0; i < 2000; i++){ v = gen(); if (test(v)) return v; } STATS.fallback++; v.fallback = true; return v; }
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const OHM = 'Ω';

/* ---------- circuit drawing ---------- */
const U = 46;
const SPEC = {
  resistor:{L:.55,up:.2,dn:.2}, variable:{L:.55,up:.5,dn:.5}, thermistor:{L:.55,up:.46,dn:.46},
  ldr:{L:.55,up:.84,dn:.2}, pot:{L:.55,up:.2,dn:.2}, xbox:{L:.42,up:.3,dn:.3},
  lamp:{L:.3,up:.3,dn:.3}, ammeter:{L:.32,up:.32,dn:.32}, voltmeter:{L:.32,up:.32,dn:.32},
  cell:{L:.07,up:.38,dn:.38}, battery:{L:.42,up:.38,dn:.38},
  switch:{L:.38,up:.32,dn:.1}, diode:{L:.2,up:.22,dn:.22}, led:{L:.34,up:.72,dn:.34}
};
const POLAR = { cell:1, battery:1, diode:1, led:1 };
const key = p => Math.round(p[0] * 1000) + ',' + Math.round(p[1] * 1000);
const n2 = x => Math.round(x * 100) / 100;

function arrow(x1, y1, x2, y2, s = 7){
  const a = Math.atan2(y2 - y1, x2 - x1), c = Math.cos(a), d = Math.sin(a);
  const bx = x2 - s * c, by = y2 - s * d, w = s * 0.42;
  return `<line x1="${n2(x1)}" y1="${n2(y1)}" x2="${n2(bx)}" y2="${n2(by)}"/>` +
    `<polygon points="${n2(x2)},${n2(y2)} ${n2(bx - w * d)},${n2(by + w * c)} ${n2(bx + w * d)},${n2(by - w * c)}" fill="#000" stroke-width="1"/>`;
}
function symbol(type, o){
  const u = U, R = `<rect x="${-.55 * u}" y="${-.2 * u}" width="${1.1 * u}" height="${.4 * u}" fill="#fff"/>`;
  const L = (x1, y1, x2, y2, extra = '') => `<line x1="${n2(x1 * u)}" y1="${n2(y1 * u)}" x2="${n2(x2 * u)}" y2="${n2(y2 * u)}"${extra}/>`;
  switch (type){
    case 'resistor': case 'pot': return R;
    case 'variable': return R + arrow(-.5 * u, .46 * u, .5 * u, -.46 * u);
    case 'thermistor': return R + `<polyline points="${-.68 * u},${.43 * u} ${-.42 * u},${.43 * u} ${.46 * u},${-.43 * u}" fill="none"/>`;
    case 'ldr': return R + arrow(-.72 * u, -.8 * u, -.38 * u, -.3 * u, 6) + arrow(-.4 * u, -.8 * u, -.06 * u, -.3 * u, 6);
    case 'xbox': return `<rect x="${-.42 * u}" y="${-.3 * u}" width="${.84 * u}" height="${.6 * u}" fill="#fff"/>`;
    case 'lamp': { const d = .3 * Math.SQRT1_2; return `<circle r="${.3 * u}" fill="#fff"/>` + L(-d, -d, d, d) + L(-d, d, d, -d); }
    case 'ammeter': case 'voltmeter': return `<circle r="${.32 * u}" fill="#fff"/>`;
    case 'cell': return L(-.07, -.38, -.07, .38) + L(.07, -.2, .07, .2, ' stroke-width="3.4"');
    case 'battery': return L(-.42, -.38, -.42, .38) + L(-.28, -.2, -.28, .2, ' stroke-width="3.4"') + L(-.2, 0, .2, 0, ' stroke-dasharray="4 3"') + L(.28, -.38, .28, .38) + L(.42, -.2, .42, .2, ' stroke-width="3.4"');
    case 'switch': return (o.state === 'closed' ? L(-.26, 0, .26, 0) : L(-.27, -.03, .27, -.28)) +
      `<circle cx="${-.32 * u}" r="${.06 * u}" fill="#fff"/><circle cx="${.32 * u}" r="${.06 * u}" fill="#fff"/>`;
    case 'diode': return `<polygon points="${-.2 * u},${-.22 * u} ${-.2 * u},${.22 * u} ${.2 * u},0" fill="#fff"/>` + L(.2, -.22, .2, .22);
    case 'led': return `<circle r="${.34 * u}" fill="#fff"/>` + L(-.34, 0, -.17, 0) + L(.17, 0, .34, 0) +
      `<polygon points="${-.17 * u},${-.19 * u} ${-.17 * u},${.19 * u} ${.17 * u},0" fill="#fff"/>` + L(.17, -.19, .17, .19) +
      arrow(.1 * u, -.42 * u, .3 * u, -.68 * u, 6) + arrow(.3 * u, -.34 * u, .5 * u, -.6 * u, 6);
  }
  throw new Error('unknown symbol ' + type);
}
function subSvg(s){ return esc(s).replace(/_(\w+)/g, (m, d) => `<tspan dy="4" font-size="11">${d}</tspan><tspan dy="-4">​</tspan>`); }

class Circuit {
  constructor(){ this.comps = []; this.wires = []; this.boxes = []; }
  add(type, id, p1, p2, o = {}){ if (!SPEC[type]) throw new Error('bad type ' + type); this.comps.push({ type, id, p1, p2, o }); return this; }
  wire(...pts){ this.wires.push(pts); return this; }
  box(x1, y1, x2, y2){ this.boxes.push([x1, y1, x2, y2]); return this; }
  get(id){ return this.comps.find(c => c.id === id); }

  geom(c){
    const [x1, y1] = c.p1, [x2, y2] = c.p2, s = SPEC[c.type];
    const horiz = Math.abs(y1 - y2) < 1e-9, vert = Math.abs(x1 - x2) < 1e-9;
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    let ang = horiz ? 0 : -90, flip = false;
    if (POLAR[c.type]){ ang = Math.round(Math.atan2(uy, ux) * 180 / Math.PI); flip = (ang === 180 || ang === 90); }
    const bb = horiz ? [cx - s.L, cy - s.up, cx + s.L, cy + s.dn] : [cx - s.up, cy - s.L, cx + s.dn, cy + s.L];
    // label
    let label = null; const o = c.o;
    const chars = (o.name ? o.name.replace(/_/g, '').length : 0) + (o.sym ? o.sym.length : 0) + (o.text ? o.text.length : 0) + ((o.name || o.sym) && o.text ? 1 : 0);
    if (chars){
      const w = chars * 0.19 + 0.06, side = o.side || (horiz ? 'above' : 'right');
      let x, y, anchor;
      if (side === 'above'){ x = cx; y = cy - s.up - .14; anchor = 'middle'; }
      else if (side === 'below'){ x = cx; y = cy + s.dn + .42; anchor = 'middle'; }
      else if (side === 'right'){ x = cx + s.dn + .16; y = cy + .12; anchor = 'start'; }
      else { x = cx - s.up - .16; y = cy + .12; anchor = 'end'; }
      const lx = anchor === 'middle' ? x - w / 2 : anchor === 'start' ? x : x - w;
      label = { x, y, anchor, bb: [lx, y - .3, lx + w, y + .08] };
    }
    return { horiz, vert, len, ux, uy, cx, cy, s, ang, flip, bb, label,
      a: [cx - ux * s.L, cy - uy * s.L], b: [cx + ux * s.L, cy + uy * s.L] };
  }

  analyse(){
    const errors = [], comps = this.comps, geoms = comps.map(c => this.geom(c));
    geoms.forEach((g, i) => { if (!g.horiz && !g.vert) errors.push('component not axis-aligned: ' + comps[i].id); if (g.len < 2 * g.s.L - 1e-9) errors.push('component too short: ' + comps[i].id); });
    // attachment points
    const attach = [];
    this.wires.forEach(w => w.forEach(p => attach.push(p)));
    comps.forEach(c => { attach.push(c.p1, c.p2); if (c.type === 'pot') attach.push(c.o.w); });
    // wire segments, split at attachment points
    const segs = [];
    this.wires.forEach(w => { for (let i = 0; i + 1 < w.length; i++){
      const a = w[i], b = w[i + 1], h = Math.abs(a[1] - b[1]) < 1e-9, v = Math.abs(a[0] - b[0]) < 1e-9;
      if (h === v){ errors.push('bad wire segment ' + a + ' -> ' + b); continue; }
      const ax = h ? 0 : 1, lo = Math.min(a[ax], b[ax]), hi = Math.max(a[ax], b[ax]);
      const cuts = [lo, hi];
      attach.forEach(p => { if (Math.abs(p[1 - ax] - a[1 - ax]) < 1e-9 && p[ax] > lo + 1e-9 && p[ax] < hi - 1e-9) cuts.push(p[ax]); });
      const u = [...new Set(cuts.map(x => Math.round(x * 1000) / 1000))].sort((p, q) => p - q);
      for (let j = 0; j + 1 < u.length; j++){ const p = [0, 0], q = [0, 0]; p[ax] = u[j]; q[ax] = u[j + 1]; p[1 - ax] = q[1 - ax] = a[1 - ax]; segs.push({ a: p, b: q, wire: true }); }
    } });
    // degree
    const deg = new Map(); const inc = p => deg.set(key(p), (deg.get(key(p)) || 0) + 1);
    segs.forEach(s => { inc(s.a); inc(s.b); });
    comps.forEach(c => { inc(c.p1); inc(c.p2); if (c.type === 'pot') inc(c.o.w); });
    const dots = [];
    deg.forEach((d, k) => { const p = k.split(',').map(x => x / 1000); if (d < 2) errors.push('loose end at (' + p + ')'); if (d >= 3) dots.push(p); });
    // crossings / overlaps
    const all = segs.map(s => ({ a: s.a, b: s.b, id: 'wire' }));
    comps.forEach((c, i) => { all.push({ a: c.p1, b: c.p2, id: c.id }); if (c.type === 'pot'){ const g = geoms[i]; all.push({ a: c.o.w, b: [g.cx + (c.o.w[0] > g.cx ? .2 : -.2), g.cy], id: c.id + '.w' }); if (Math.abs(c.o.w[1] - g.cy) > 1e-9 || !g.vert) errors.push('pot wiper misaligned'); } });
    const isEnd = (s, p) => key(s.a) === key(p) || key(s.b) === key(p);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++){
      const s = all[i], t = all[j];
      const sh = Math.abs(s.a[1] - s.b[1]) < 1e-9, th = Math.abs(t.a[1] - t.b[1]) < 1e-9;
      if (sh === th){
        const ax = sh ? 0 : 1;
        if (Math.abs(s.a[1 - ax] - t.a[1 - ax]) > 1e-9) continue;
        const lo = Math.max(Math.min(s.a[ax], s.b[ax]), Math.min(t.a[ax], t.b[ax])), hi = Math.min(Math.max(s.a[ax], s.b[ax]), Math.max(t.a[ax], t.b[ax]));
        if (hi - lo > 1e-6) errors.push('overlapping lines: ' + s.id + ' / ' + t.id);
      } else {
        const h = sh ? s : t, v = sh ? t : s, P = [v.a[0], h.a[1]];
        const inH = P[0] >= Math.min(h.a[0], h.b[0]) - 1e-9 && P[0] <= Math.max(h.a[0], h.b[0]) + 1e-9;
        const inV = P[1] >= Math.min(v.a[1], v.b[1]) - 1e-9 && P[1] <= Math.max(v.a[1], v.b[1]) + 1e-9;
        if (inH && inV && !(isEnd(h, P) && isEnd(v, P))) errors.push('lines cross or touch without a junction at (' + P + '): ' + s.id + ' / ' + t.id);
      }
    }
    // bounding boxes
    const shrink = (b, e = .03) => [b[0] + e, b[1] + e, b[2] - e, b[3] - e];
    const segHits = (s, b) => Math.max(s.a[0], s.b[0]) > b[0] && Math.min(s.a[0], s.b[0]) < b[2] && Math.max(s.a[1], s.b[1]) > b[1] && Math.min(s.a[1], s.b[1]) < b[3];
    const boxHits = (p, q) => p[0] < q[2] && p[2] > q[0] && p[1] < q[3] && p[3] > q[1];
    geoms.forEach((g, i) => {
      const b = shrink(g.bb);
      all.forEach(s => { if (s.id !== comps[i].id && s.id !== comps[i].id + '.w' && segHits(s, b)) errors.push('line passes through ' + comps[i].id + ' (' + s.id + ')'); });
      for (let j = i + 1; j < geoms.length; j++) if (boxHits(b, shrink(geoms[j].bb))) errors.push('components overlap: ' + comps[i].id + ' / ' + comps[j].id);
      if (g.label){
        const lb = shrink(g.label.bb, .01);
        all.forEach(s => { if (segHits(s, lb)) errors.push('label of ' + comps[i].id + ' overlaps a line (' + s.id + ')'); });
        geoms.forEach((h, j) => { if (boxHits(lb, shrink(h.bb))) errors.push('label of ' + comps[i].id + ' overlaps ' + comps[j].id); if (j > i && h.label && boxHits(lb, shrink(h.label.bb, .01))) errors.push('labels overlap: ' + comps[i].id + ' / ' + comps[j].id); });
      }
    });
    // nets
    const parent = new Map();
    const fnd = k => { if (!parent.has(k)) parent.set(k, k); let r = k; while (parent.get(r) !== r) r = parent.get(r); parent.set(k, r); return r; };
    segs.forEach(s => parent.set(fnd(key(s.a)), fnd(key(s.b))));
    const netOf = p => fnd(key(p));
    comps.forEach(c => { if (netOf(c.p1) === netOf(c.p2)) errors.push('component short-circuited by wiring: ' + c.id); });
    // overall connectivity
    const P2 = new Map(); const f2 = k => { if (!P2.has(k)) P2.set(k, k); let r = k; while (P2.get(r) !== r) r = P2.get(r); return r; };
    comps.forEach(c => { P2.set(f2(netOf(c.p1)), f2(netOf(c.p2))); if (c.type === 'pot') P2.set(f2(netOf(c.o.w)), f2(netOf(c.p2))); });
    const roots = new Set(); comps.forEach(c => roots.add(f2(netOf(c.p1))));
    if (roots.size > 1) errors.push('circuit is not one connected network');
    return { errors, segs, dots, geoms, netOf };
  }

  render(){
    const an = this.analyse(), u = U; let body = '';
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const ext = b => { x0 = Math.min(x0, b[0]); y0 = Math.min(y0, b[1]); x1 = Math.max(x1, b[2]); y1 = Math.max(y1, b[3]); };
    this.wires.forEach(w => { w.forEach(p => ext([p[0], p[1], p[0], p[1]])); body += `<polyline points="${w.map(p => n2(p[0] * u) + ',' + n2(p[1] * u)).join(' ')}"/>`; });
    this.boxes.forEach(b => { ext(b); body += `<rect x="${b[0] * u}" y="${b[1] * u}" width="${(b[2] - b[0]) * u}" height="${(b[3] - b[1]) * u}" stroke-dasharray="6 4" stroke-width="1.1"/>`; });
    let text = '';
    this.comps.forEach((c, i) => {
      const g = an.geoms[i]; ext(g.bb); ext([c.p1[0], c.p1[1], c.p1[0], c.p1[1]]); ext([c.p2[0], c.p2[1], c.p2[0], c.p2[1]]);
      const ln = (p, q) => `<line x1="${n2(p[0] * u)}" y1="${n2(p[1] * u)}" x2="${n2(q[0] * u)}" y2="${n2(q[1] * u)}"/>`;
      body += ln(c.p1, g.a) + ln(g.b, c.p2);
      body += `<g transform="translate(${n2(g.cx * u)},${n2(g.cy * u)}) rotate(${g.ang})${g.flip ? ' scale(1,-1)' : ''}">${symbol(c.type, c.o)}</g>`;
      if (c.type === 'pot'){ const w = c.o.w, s = w[0] > g.cx ? 1 : -1; ext([w[0], w[1], w[0], w[1]]); body += arrow(w[0] * u, w[1] * u, (g.cx + s * .2) * u, g.cy * u); }
      const letter = { ammeter: 'A', voltmeter: 'V', xbox: 'X' }[c.type];
      if (letter) text += `<text x="${n2(g.cx * u)}" y="${n2(g.cy * u + 5.5)}" text-anchor="middle" font-weight="700" font-size="16">${letter}</text>`;
      if (g.label){
        ext(g.label.bb); const o = c.o; let t = '';
        if (o.name) t += `<tspan font-weight="700">${subSvg(o.name)}</tspan>`;
        if (o.sym) t += `<tspan font-style="italic" font-family="'Times New Roman',Times,serif" font-size="18">${esc(o.sym)}</tspan>`;
        if (o.text) t += ((o.name || o.sym) ? ' ' : '') + esc(o.text);
        text += `<text x="${n2(g.label.x * u)}" y="${n2(g.label.y * u)}" text-anchor="${g.label.anchor}">${t}</text>`;
      }
    });
    an.dots.forEach(p => { body += `<circle cx="${n2(p[0] * u)}" cy="${n2(p[1] * u)}" r="3.8" fill="#000"/>`; });
    const pad = .3, vx = (x0 - pad) * u, vy = (y0 - pad) * u, vw = (x1 - x0 + 2 * pad) * u, vh = (y1 - y0 + 2 * pad) * u;
    return `<svg xmlns="http://www.w3.org/2000/svg" class="circuit" viewBox="${n2(vx)} ${n2(vy)} ${n2(vw)} ${n2(vh)}" width="${Math.round(vw)}" height="${Math.round(vh)}" font-family="Arial,Helvetica,sans-serif" font-size="15" role="img" aria-label="Circuit diagram">` +
      `<rect x="${n2(vx)}" y="${n2(vy)}" width="${n2(vw)}" height="${n2(vh)}" fill="#fff"/>` +
      `<g fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter">${body}</g><g fill="#000">${text}</g></svg>`;
  }
}

/* ---------- circuit solver (modified nodal analysis), used to verify answers ---------- */
function solve(circ, over = {}){
  const an = circ.analyse(), ids = new Map(); const nid = k => { if (!ids.has(k)) ids.set(k, ids.size); return ids.get(k); };
  const els = [];
  circ.comps.forEach(c => {
    const o = Object.assign({}, c.o, over[c.id] || {}), a = nid(an.netOf(c.p1)), b = nid(an.netOf(c.p2));
    const Rr = r => ({ id: c.id, a, b, R: Math.max(r, 1e-7) });
    switch (c.type){
      case 'ammeter': els.push(Rr(1e-7)); break;
      case 'voltmeter': els.push(Rr(o.R || 1e10)); break;
      case 'switch': els.push(Rr(o.state === 'closed' ? 1e-7 : 1e13)); break;
      case 'cell': case 'battery': els.push({ id: c.id, a, b, E: o.E }); break;
      case 'diode': case 'led': els.push(o.asR !== undefined ? Rr(o.asR) : o.reverse ? Rr(1e13) : { id: c.id, a, b, E: o.Vf }); break;
      case 'pot': { const w = nid(an.netOf(c.o.w)); els.push({ id: c.id + '.1', a, b: w, R: o.R * (1 - o.frac) }, { id: c.id + '.2', a: w, b, R: o.R * o.frac }); break; }
      default: if (!(o.R >= 0)) throw new Error('no resistance for ' + c.id); els.push(Rr(o.R));
    }
  });
  const nN = ids.size - 1, src = els.filter(e => e.E !== undefined), N = nN + src.length;
  const M = Array.from({ length: N }, () => new Float64Array(N + 1));
  const ix = n => n - 1;
  els.forEach(e => { if (e.R === undefined) return; const g = 1 / e.R, i = ix(e.a), j = ix(e.b); if (i >= 0) M[i][i] += g; if (j >= 0) M[j][j] += g; if (i >= 0 && j >= 0){ M[i][j] -= g; M[j][i] -= g; } });
  src.forEach((e, k) => { const r = nN + k, i = ix(e.a), j = ix(e.b); if (i >= 0){ M[i][r] += 1; M[r][i] += 1; } if (j >= 0){ M[j][r] -= 1; M[r][j] -= 1; } M[r][N] = e.E; });
  for (let c = 0; c < N; c++){
    let p = c; for (let r = c + 1; r < N; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    if (Math.abs(M[p][c]) < 1e-300) throw new Error('singular circuit');
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < N; r++){ if (r === c) continue; const f = M[r][c] / M[c][c]; if (f) for (let k = c; k <= N; k++) M[r][k] -= f * M[c][k]; }
  }
  const x = M.map((row, i) => row[N] / row[i]), V = n => n === 0 ? 0 : x[n - 1];
  const res = { errors: an.errors, V: {}, I: {} };
  res.Vab = {}; res.Va = {}; els.forEach(e => { res.V[e.id] = Math.abs(V(e.a) - V(e.b)); res.Vab[e.id] = V(e.a) - V(e.b); res.Va[e.id] = V(e.a); res.I[e.id] = e.R !== undefined ? Math.abs(V(e.a) - V(e.b)) / e.R : Math.abs(x[nN + src.indexOf(e)]); });
  return res;
}

/* ---------- graph paper ---------- */
function axisFor(max){
  for (const m of [.01, .02, .05, .1, .2, .5, 1, 2, 5, 10, 20, 50, 100, 200, 500]){ const n = Math.ceil(max / m - 1e-9); if (n <= 6) return [n * m, m]; }
  return [max, max / 5];
}
const LAST = {};
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

/* ---------- question templates ---------- */
const PAIRS = [[6,3],[12,6],[12,4],[20,5],[30,20],[15,10],[24,12],[24,8],[40,10],[30,15],[60,30],[18,9],[10,10],[20,30],[60,40],[8,8],[90,45],[36,12]];
const RS = [2,3,4,5,6,8,10,12,15,18,20,24,30];
const ES = [1.5,3,4.5,6,9,12,15,18,24];
const sb = (a, b) => `<i>${a}</i><sub>${b}</sub>`;
const INEXACT = [];
const val = (x, unit, n = 2) => { const s = `${sig(x, n)} ${unit}`; if (!isNice(x, n)) INEXACT.push(s); return s; };
const art = (x, cap) => { const t = sig(x, 3), an = /^8/.test(t) || /^(11|18)(\.\d+)?$/.test(t); return cap ? (an ? 'An' : 'A') : (an ? 'an' : 'a'); };
const eq = s => `<span class="eq">${s}</span>`;
const TOPICS = { SP: 'Series and parallel circuits', IV: 'I–V characteristics', PD: 'Potential dividers', EMF: 'Emf and internal resistance' };

const T = {};

T.SP1 = R => {
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), r2 = sw ? b : a, r3 = sw ? a : b, r1 = R.pick(RS), E = R.pick(ES), rp = a * b / (a + b); return { r1, r2, r3, rp, E, I: E / (r1 + rp) }; },
    q => isNice(q.I) && q.I >= .05 && q.I <= 3 && isNice(q.I * q.rp / q.r3) && q.r2 !== q.r1 && q.r3 !== q.r1 && q.r2 !== q.r3);
  const { r1, r2, r3, rp, E, I } = q, Vp = I * rp, I3 = Vp / r3, fl = R.chance(.5), f = x => fl ? 6 - x : x, power = R.chance(.5);
  const c = new Circuit();
  c.add('battery', 'B', [0, 0], [3, 0], { E, text: val(E, 'V') }).add('ammeter', 'A', [3, 0], [6, 0]);
  c.wire([0, 0], [0, 3]).wire([6, 0], [6, 3]);
  c.add('resistor', 'R1', [f(0), 3], [f(2.5), 3], { R: r1, text: val(r1, OHM) }).wire([f(2.5), 3], [f(3), 3]).wire([f(3), 2.3], [f(3), 3.7]);
  c.add('resistor', 'R2', [f(3), 2.3], [f(5.5), 2.3], { R: r2, text: val(r2, OHM) }).add('resistor', 'R3', [f(3), 3.7], [f(5.5), 3.7], { R: r3, text: val(r3, OHM), side: 'below' });
  c.wire([f(5.5), 2.3], [f(5.5), 3.7]).wire([f(5.5), 3], [f(6), 3]);
  const last = power
    ? { q: `Calculate the power dissipated in the ${val(r1, OHM)} resistor.`, marks: 2, ans: I * I * r1, unit: 'W', ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${ansStr(I)}<sup>2</sup> × ${sig(r1)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(I * I * r1)} W`)} ✓` }
    : { q: `Calculate the current in the ${val(r3, OHM)} resistor.`, marks: 1, ans: I3, unit: 'A', ms: `${eq(`<i>I</i> = <i>V</i>/<i>R</i> = ${ansStr(Vp)} / ${sig(r3)} = ${ansStr(I3)} A`)} ✓` };
  return { stem: `<b>Figure 1</b> shows a circuit containing three resistors. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the total resistance of the circuit.', marks: 2, ans: r1 + rp, unit: OHM, ms: `Parallel pair: ${eq(`1/<i>R</i> = 1/${sig(r2)} + 1/${sig(r3)}`)}, so ${eq(`<i>R</i> = ${ansStr(rp)} ${OHM}`)} ✓<br>${eq(`<i>R</i><sub>total</sub> = ${sig(r1)} + ${ansStr(rp)} = ${ansStr(r1 + rp)} ${OHM}`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 1, ans: I, unit: 'A', ms: `${eq(`<i>I</i> = <i>ε</i>/<i>R</i><sub>total</sub> = ${sig(E)} / ${ansStr(r1 + rp)} = ${ansStr(I)} A`)} ✓` },
      { q: `Calculate the potential difference across the ${val(r2, OHM)} resistor.`, marks: 2, ans: Vp, unit: 'V', ms: `pd across parallel pair = current × combined resistance (or ${eq(`${sig(E)} − <i>I</i> × ${sig(r1)}`)}) ✓<br>${eq(`<i>V</i> = ${ansStr(I)} × ${ansStr(rp)} = ${ansStr(Vp)} V`)} ✓` },
      last],
    checks: [['I', 'A', I], ['V', 'R2', Vp], ['I', 'R3', I3], ['V', 'R1', I * r1]] };
};

T.SP2 = R => {
  const q = find(() => { const r1 = R.pick(RS), r2 = R.pick(RS), r3 = R.pick(RS.concat([40, 60])), E = R.pick(ES); return { r1, r2, r3, E, Ia: E / (r1 + r2), Ib: E / r3 }; },
    q => q.r1 !== q.r2 && q.r3 !== q.r1 && q.r3 !== q.r2 && isNice(q.Ia) && isNice(q.Ib) && q.Ia + q.Ib <= 4 && q.Ia >= .05);
  const { r1, r2, r3, E, Ia, Ib } = q, It = Ia + Ib, c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E, text: val(E, 'V') }).add('ammeter', 'A', [2.5, 0], [5, 0]);
  c.wire([0, 0], [0, 3.2]).wire([5, 0], [5, 3.2]);
  c.add('resistor', 'R1', [0, 1.6], [2.5, 1.6], { R: r1, text: val(r1, OHM) }).add('resistor', 'R2', [2.5, 1.6], [5, 1.6], { R: r2, text: val(r2, OHM) });
  c.add('resistor', 'R3', [0, 3.2], [5, 3.2], { R: r3, text: val(r3, OHM) });
  return { stem: `<b>Figure 1</b> shows three resistors connected to a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: `Calculate the current in the ${val(r1, OHM)} resistor.`, marks: 2, ans: Ia, unit: 'A', ms: `pd across the series pair = ${val(E, 'V')}; resistance of branch = ${sig(r1)} + ${sig(r2)} = ${ansStr(r1 + r2)} ${OHM} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(r1 + r2)} = ${ansStr(Ia)} A`)} ✓` },
      { q: `Calculate the potential difference across the ${val(r2, OHM)} resistor.`, marks: 1, ans: Ia * r2, unit: 'V', ms: `${eq(`<i>V</i> = <i>IR</i> = ${ansStr(Ia)} × ${sig(r2)} = ${ansStr(Ia * r2)} V`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: It, unit: 'A', ms: `Current in ${val(r3, OHM)} resistor = ${sig(E)} / ${sig(r3)} = ${ansStr(Ib)} A ✓<br>Currents at the junction add: ${eq(`<i>I</i> = ${ansStr(Ia)} + ${ansStr(Ib)} = ${ansStr(It)} A`)} ✓` },
      { q: 'Calculate the total power dissipated in the circuit.', marks: 2, ans: E * It, unit: 'W', ms: `${eq(`<i>P</i> = <i>εI</i> = ${sig(E)} × ${x4(It)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(E * It)} W`)} ✓` }],
    checks: [['I', 'R1', Ia], ['V', 'R2', Ia * r2], ['I', 'A', It]] };
};

T.SP3 = R => {
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), r2 = sw ? b : a, rx = sw ? a : b, r1 = R.pick(RS), E = R.pick(ES), rp = a * b / (a + b), I = E / (r1 + rp); return { r1, r2, rx, rp, E, I, V: I * rp }; },
    q => isNice(q.I) && isNice(q.V) && isNice(q.V / q.r2) && q.I >= .05 && q.I <= 3 && q.r2 !== q.rx && q.r1 !== q.r2);
  const { r1, r2, rx, E, I, V } = q, I2 = V / r2, Ix = I - I2, c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E, text: val(E, 'V') }).add('ammeter', 'A', [2.5, 0], [5, 0]);
  c.wire([0, 0], [0, 3]).wire([5, 0], [5, 3], [4.5, 3]);
  c.add('resistor', 'R1', [0, 3], [2, 3], { R: r1, text: val(r1, OHM) });
  c.wire([2, 2.3], [2, 5]).wire([4.5, 2.3], [4.5, 5]);
  c.add('resistor', 'R2', [2, 2.3], [4.5, 2.3], { R: r2, text: val(r2, OHM) }).add('resistor', 'X', [2, 3.7], [4.5, 3.7], { R: rx, name: 'X' }).add('voltmeter', 'V', [2, 5], [4.5, 5]);
  return { stem: `In <b>Figure 1</b> the battery has an emf of ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance and reads ${val(V, 'V', isNice(V, 2) ? 2 : 3)}. The ammeter has negligible resistance. Resistor <b>X</b> has an unknown resistance.`, circuit: c,
    parts: [
      { q: `Calculate the potential difference across the ${val(r1, OHM)} resistor.`, marks: 1, ans: E - V, unit: 'V', ms: `${eq(`${sig(E)} − ${ansStr(V)} = ${ansStr(E - V)} V`)} ✓ (sum of pds round the loop equals the emf)` },
      { q: 'Calculate the reading on the ammeter.', marks: 1, ans: I, unit: 'A', ms: `${eq(`<i>I</i> = ${ansStr(E - V)} / ${sig(r1)} = ${ansStr(I)} A`)} ✓` },
      { q: `Calculate the current in the ${val(r2, OHM)} resistor.`, marks: 1, ans: I2, unit: 'A', ms: `${eq(`<i>I</i> = ${ansStr(V)} / ${sig(r2)} = ${ansStr(I2)} A`)} ✓` },
      { q: 'Calculate the resistance of <b>X</b>.', marks: 2, ans: rx, unit: OHM, ms: `Current in X = ${ansStr(I)} − ${ansStr(I2)} = ${ansStr(Ix)} A ✓<br>${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${ansStr(V)} / ${ansStr(Ix)} = ${ansStr(rx)} ${OHM}`)} ✓` }],
    checks: [['V', 'V', V], ['I', 'A', I], ['I', 'R2', I2], ['I', 'X', Ix], ['V', 'R1', E - V]] };
};

T.SP4 = R => {
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), r2 = sw ? b : a, r3 = sw ? a : b, r1 = R.pick(RS), E = R.pick(ES), rp = a * b / (a + b); return { r1, r2, r3, rp, E, Io: E / (r1 + r2), Ic: E / (r1 + rp) }; },
    q => isNice(q.Io) && isNice(q.Ic) && q.Io >= .05 && q.Ic <= 3 && q.r1 !== q.r2 && q.r1 !== q.r3 && q.r2 !== q.r3);
  const { r1, r2, r3, rp, E, Io, Ic } = q, c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E, text: val(E, 'V') }).add('ammeter', 'A', [2.5, 0], [5, 0]);
  c.wire([0, 0], [0, 3]).wire([5, 0], [5, 3.7]).wire([2, 2.3], [2, 3.7]);
  c.add('resistor', 'R1', [0, 3], [2, 3], { R: r1, text: val(r1, OHM) }).add('resistor', 'R2', [2, 2.3], [5, 2.3], { R: r2, text: val(r2, OHM) });
  c.add('switch', 'S', [2, 3.7], [3.3, 3.7], { state: 'open', name: 'S', side: 'below' }).add('resistor', 'R3', [3.3, 3.7], [5, 3.7], { R: r3, text: val(r3, OHM), side: 'below' });
  return { stem: `<b>Figure 1</b> shows a circuit that includes a switch <b>S</b>. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the ammeter when <b>S</b> is open.', marks: 2, ans: Io, unit: 'A', ms: `No current in the ${val(r3, OHM)} resistor, so ${eq(`<i>R</i><sub>total</sub> = ${sig(r1)} + ${sig(r2)} = ${ansStr(r1 + r2)} ${OHM}`)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(r1 + r2)} = ${ansStr(Io)} A`)} ✓` },
      { q: `Calculate the potential difference across the ${val(r2, OHM)} resistor when <b>S</b> is open.`, marks: 1, ans: Io * r2, unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(Io)} × ${sig(r2)} = ${ansStr(Io * r2)} V`)} ✓` },
      { q: 'Calculate the reading on the ammeter when <b>S</b> is closed.', marks: 3, ans: Ic, unit: 'A', ms: `Parallel pair: ${eq(`1/<i>R</i> = 1/${sig(r2)} + 1/${sig(r3)}`)}, <i>R</i> = ${ansStr(rp)} ${OHM} ✓<br>${eq(`<i>R</i><sub>total</sub> = ${sig(r1)} + ${ansStr(rp)} = ${ansStr(r1 + rp)} ${OHM}`)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(r1 + rp)} = ${ansStr(Ic)} A`)} ✓` },
      { q: `State and explain what happens to the potential difference across the ${val(r1, OHM)} resistor when <b>S</b> is closed.`, marks: 2, ms: `The pd increases (from ${ansStr(Io * r1)} V to ${ansStr(Ic * r1)} V) ✓<br>Total resistance of the circuit decreases so the current in the ${val(r1, OHM)} resistor increases and <i>V</i> = <i>IR</i> <b>or</b> the parallel pair takes a smaller share of the emf ✓` }],
    checks: [['I', 'A', Io], ['V', 'R2', Io * r2], ['I', 'A', Ic, { S: { state: 'closed' } }], ['V', 'R1', Ic * r1, { S: { state: 'closed' } }]] };
};

T.PD1 = R => {
  const sc = R.pick([1, 1000]), uR = sc === 1 ? OHM : 'k' + OHM;
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), r2 = sw ? b : a, rl = sw ? a : b, r1 = R.pick(RS), E = R.pick([5, 6, 9, 12, 15, 24]), rp = a * b / (a + b); return { r1, r2, rl, rp, E, v1: E * r2 / (r1 + r2), v2: E * rp / (r1 + rp) }; },
    q => isNice(q.v1) && isNice(q.v2) && new Set([q.r1, q.r2, q.rl]).size === 3);
  const { r1, r2, rl, rp, E, v1, v2 } = q, c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [3, 0]).wire([0, 4], [6.6, 4]).wire([3, 2], [4.7, 2]);
  c.add('resistor', 'R1', [3, 0], [3, 2], { R: r1 * sc, text: val(r1, uR) }).add('resistor', 'R2', [3, 2], [3, 4], { R: r2 * sc, text: val(r2, uR), side: 'left' });
  c.add('voltmeter', 'V', [4.7, 2], [4.7, 4]).add('switch', 'S', [4.7, 2], [6.6, 2], { state: 'open', name: 'S' }).add('resistor', 'RL', [6.6, 2], [6.6, 4], { R: rl * sc, text: val(rl, uR) });
  return { stem: `<b>Figure 1</b> shows a potential divider circuit. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the voltmeter when switch <b>S</b> is open.', marks: 2, ans: v1, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(r2)} / (${sig(r1)} + ${sig(r2)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v1)} V`)} ✓` },
      { q: 'Calculate the reading on the voltmeter when <b>S</b> is closed.', marks: 3, ans: v2, unit: 'V', ms: `Parallel pair: ${eq(`1/<i>R</i> = 1/${sig(r2)} + 1/${sig(rl)}`)}, <i>R</i> = ${ansStr(rp)} ${uR} ✓<br>${eq(`<i>V</i> = ${sig(E)} × ${ansStr(rp)} / (${sig(r1)} + ${ansStr(rp)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v2)} V`)} ✓` },
      { q: 'Explain, without further calculation, why the voltmeter reading decreases when <b>S</b> is closed.', marks: 2, ms: `The ${val(rl, uR)} resistor is in parallel with the ${val(r2, uR)} resistor, so the resistance of the lower section of the divider decreases ✓<br>The lower section takes a smaller fraction of the emf <b>or</b> current in the ${val(r1, uR)} resistor increases so the pd across it increases ✓` }],
    checks: [['V', 'V', v1], ['V', 'V', v2, { S: { state: 'closed' } }], ['V', 'RL', v2, { S: { state: 'closed' } }]] };
};

T.PD2 = R => {
  const kind = R.pick(['thermistor', 'ldr']), top = R.chance(.5), LV = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30];
  const vb = (E, rf, rs) => E * (top ? rf : rs) / (rf + rs);
  const q = find(() => { const E = R.pick([5, 6, 9, 12]), rf = R.pick(LV), rs1 = R.pick(LV), rs2 = R.pick(LV); return { E, rf, rs1, rs2, v1: vb(E, rf, rs1), v2: vb(E, rf, rs2) }; },
    q => q.rs1 !== q.rs2 && q.rs1 !== q.rf && isNice(q.v1) && isNice(q.v2) && q.rs1 / q.rs2 < 6 && q.rs2 / q.rs1 < 6);
  const { E, rf, rs1, rs2, v1, v2 } = q, k = 'k' + OHM, th = kind === 'thermistor', nm = th ? 'thermistor' : 'LDR', fall = rs2 < rs1;
  const c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  const sOpt = { R: rs1 * 1000, name: th ? 'T' : 'L' }, fOpt = { R: rf * 1000, text: val(rf, k) };
  c.add(top ? kind : 'resistor', top ? 'S' : 'F', [3, 0], [3, 2], top ? sOpt : fOpt).add(top ? 'resistor' : kind, top ? 'F' : 'S', [3, 2], [3, 4], Object.assign({ side: 'left' }, top ? fOpt : sOpt));
  c.add('voltmeter', 'V', [5, 2], [5, 4]);
  const cond1 = th ? `At a temperature of 20 °C the resistance of the thermistor <b>T</b> is ${val(rs1, k)}.` : `In a darkened room the resistance of the LDR <b>L</b> is ${val(rs1, k)}.`;
  const change = th ? `The temperature of <b>T</b> is then ${fall ? 'increased' : 'decreased'}` : `The light intensity incident on <b>L</b> is then ${fall ? 'increased' : 'decreased'}`;
  const I2 = top ? v2 / rf : (E - v2) / rf;
  const up = top; // reading rises as sensor resistance falls when voltmeter is across the fixed resistor
  return { stem: `<b>Figure 1</b> shows ${th ? 'a thermistor' : 'a light-dependent resistor (LDR)'} connected in a potential divider circuit with ${art(rf)} ${val(rf, k)} resistor. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance.<br>${cond1}`, circuit: c,
    parts: [
      { q: `Calculate the reading on the voltmeter ${th ? 'at 20 °C' : 'in the darkened room'}.`, marks: 2, ans: v1, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(top ? rf : rs1)} / (${sig(rf)} + ${sig(rs1)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v1)} V`)} ✓` },
      { q: `${change} and the voltmeter reading becomes ${val(v2, 'V', isNice(v2, 2) ? 2 : 3)}.<br>Calculate the new resistance of the ${nm}.`, marks: 3, ans: rs2, unit: k,
        ms: top ? `Current = ${ansStr(v2)} / ${sig(rf)} = ${ansStr(I2)} mA ✓<br>pd across ${nm} = ${sig(E)} − ${ansStr(v2)} = ${ansStr(E - v2)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - v2)} / ${ansStr(I2)} = ${ansStr(rs2)} ${k}`)} ✓`
          : `pd across ${val(rf, k)} resistor = ${sig(E)} − ${ansStr(v2)} = ${ansStr(E - v2)} V ✓<br>Current = ${ansStr(E - v2)} / ${sig(rf)} = ${ansStr(I2)} mA ✓<br>${eq(`<i>R</i> = ${ansStr(v2)} / ${ansStr(I2)} = ${ansStr(rs2)} ${k}`)} ✓` },
      { q: `State and explain what happens to the voltmeter reading as the ${th ? 'temperature of <b>T</b>' : 'light intensity incident on <b>L</b>'} increases.`, marks: 3, ms: `Resistance of the ${nm} decreases ✓<br>${up ? `Current in the circuit increases <b>or</b> the ${val(rf, k)} resistor takes a larger share of the emf` : `The ${nm} takes a smaller share of the emf <b>or</b> current increases so the pd across the ${val(rf, k)} resistor increases`} ✓<br>Voltmeter reading ${up ? 'increases' : 'decreases'} ✓` }],
    checks: [['V', 'V', v1], ['V', 'V', v2, { S: { R: rs2 * 1000 } }], ['I', 'F', I2 / 1000, { S: { R: rs2 * 1000 } }]] };
};

T.PD3 = R => {
  const sc = R.pick([1, 1000]), uR = sc === 1 ? OHM : 'k' + OHM, uP = sc === 1 ? 'W' : 'mW', top = R.chance(.5), LV = [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 50];
  const vr = (E, rf, rv) => E * (top ? rf : rv) / (rf + rv);
  const q = find(() => { const E = R.pick([6, 9, 12, 15]), rf = R.pick(LV), rmax = R.pick(LV), rset = R.pick(LV); return { E, rf, rmax, rset, ve: vr(E, rf, rmax), vs: vr(E, rf, rset) }; },
    q => q.rset < q.rmax && q.rmax >= q.rf && isNice(q.ve) && isNice(q.vs) && isNice(Math.pow(top ? q.vs : q.E - q.vs, 2) / q.rf));
  const { E, rf, rmax, rset, ve, vs } = q, vf = top ? vs : E - vs, P = vf * vf / rf, c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  const vOpt = { R: rmax * sc, name: 'R' }, fOpt = { R: rf * sc, text: val(rf, uR) };
  c.add(top ? 'variable' : 'resistor', top ? 'VR' : 'F', [3, 0], [3, 2], top ? vOpt : fOpt).add(top ? 'resistor' : 'variable', top ? 'F' : 'VR', [3, 2], [3, 4], Object.assign({ side: 'left' }, top ? fOpt : vOpt));
  c.add('voltmeter', 'V', [5, 2], [5, 4]);
  const pA = top
    ? [{ q: 'State the maximum reading on the voltmeter.', marks: 1, ans: E, unit: 'V', ms: `${val(E, 'V')} ✓ (when the resistance of <b>R</b> is zero the whole emf is across the ${val(rf, uR)} resistor)` },
       { q: 'Calculate the minimum reading on the voltmeter.', marks: 2, ans: ve, unit: 'V', ms: `Minimum when <b>R</b> = ${val(rmax, uR)}: ${eq(`<i>V</i> = ${sig(E)} × ${sig(rf)} / (${sig(rf)} + ${sig(rmax)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(ve)} V`)} ✓` }]
    : [{ q: 'State the minimum reading on the voltmeter.', marks: 1, ans: 0, unit: 'V', ms: `0 V ✓ (when the resistance of <b>R</b> is zero there is no pd across it)` },
       { q: 'Calculate the maximum reading on the voltmeter.', marks: 2, ans: ve, unit: 'V', ms: `Maximum when <b>R</b> = ${val(rmax, uR)}: ${eq(`<i>V</i> = ${sig(E)} × ${sig(rmax)} / (${sig(rf)} + ${sig(rmax)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(ve)} V`)} ✓` }];
  const I = vf / rf;
  return { stem: `<b>Figure 1</b> shows a variable resistor <b>R</b> connected in series with ${art(rf)} ${val(rf, uR)} resistor and a battery of emf ${val(E, 'V')} and negligible internal resistance. The resistance of <b>R</b> can be varied from 0 to ${val(rmax, uR)}. The voltmeter has a very large resistance.`, circuit: c,
    parts: [...pA,
      { q: `<b>R</b> is adjusted until the voltmeter reads ${val(vs, 'V', isNice(vs, 2) ? 2 : 3)}.<br>Calculate the resistance of <b>R</b>.`, marks: 3, ans: rset, unit: uR,
        ms: top ? `pd across <b>R</b> = ${sig(E)} − ${ansStr(vs)} = ${ansStr(E - vs)} V ✓<br>Current = ${ansStr(vs)} / ${sig(rf)} = ${ansStr(I)} ${sc === 1 ? 'A' : 'mA'} ✓<br>${eq(`<i>R</i> = ${ansStr(E - vs)} / ${ansStr(I)} = ${ansStr(rset)} ${uR}`)} ✓`
          : `pd across ${val(rf, uR)} resistor = ${sig(E)} − ${ansStr(vs)} = ${ansStr(E - vs)} V ✓<br>Current = ${ansStr(E - vs)} / ${sig(rf)} = ${ansStr(I)} ${sc === 1 ? 'A' : 'mA'} ✓<br>${eq(`<i>R</i> = ${ansStr(vs)} / ${ansStr(I)} = ${ansStr(rset)} ${uR}`)} ✓` },
      { q: `Calculate the power dissipated in the ${val(rf, uR)} resistor at this setting.`, marks: 2, ans: P, unit: uP, ms: `${eq(`<i>P</i> = <i>V</i><sup>2</sup>/<i>R</i> = ${ansStr(vf)}<sup>2</sup> / ${sig(rf)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(P)} ${uP}`)} ✓` }],
    checks: [['V', 'V', top ? E : 0, { VR: { R: 0 } }], ['V', 'V', ve], ['V', 'V', vs, { VR: { R: rset * sc } }], ['V', 'F', vf, { VR: { R: rset * sc } }]] };
};

function emfCircuit(E, r, showVals, bottom, noV, type = 'cell'){
  const c = new Circuit();
  c.add(type, 'E', [1, 0], [2, 0], Object.assign({ E }, showVals === 'none' ? {} : showVals === 'E' ? { text: val(E, 'V', 3) } : showVals ? { text: val(E, 'V') } : { sym: 'ε' }));
  c.add('resistor', 'r', [2, 0], [4, 0], Object.assign({ R: r }, showVals === 'none' ? {} : showVals === true ? { text: val(r, OHM) } : { sym: 'r' }));
  c.box(.5, -1.05, 4.5, .55).wire([0, 0], [1, 0]).wire([4, 0], [5, 0]).wire([0, 0], [0, 3.2]).wire([5, 0], [5, 3.2]);
  if (!noV) c.add('voltmeter', 'V', [0, 1.6], [5, 1.6]);
  bottom(c);
  return c;
}
const EMFV = () => ({ es: [1.5, 3, 4.5, 6, 9, 12], rs: [.2, .25, .4, .5, .8, 1, 1.2, 1.5, 2], rt: [2, 2.5, 3, 4, 5, 6, 7.5, 8, 10, 12, 15, 20] });

T.EMF1 = R => {
  const L = EMFV();
  const q = find(() => { const E = R.pick(L.es), r = R.pick(L.rs), rt = R.pick(L.rt); return { E, r, Rx: rt - r, I: E / rt }; }, q => q.Rx >= 3 * q.r && isNice(q.I) && isNice(q.Rx, 2));
  const { E, r, Rx, I } = q, V = I * Rx, v = R.pick([0, 1, 2]), t = R.pick([2, 5, 10]);
  const c = emfCircuit(E, r, true, c => c.add('ammeter', 'A', [0, 3.2], [2.5, 3.2]).add('resistor', 'R', [2.5, 3.2], [5, 3.2], { R: Rx, text: val(Rx, OHM) }));
  const last = [
    { q: 'Calculate the power dissipated in the internal resistance of the cell.', marks: 2, ans: I * I * r, unit: 'W', ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>r</i> = ${ansStr(I)}<sup>2</sup> × ${sig(r)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(I * I * r)} W`)} ✓` },
    { q: `Calculate the energy transferred to the ${val(Rx, OHM)} resistor in ${sig(t)} minutes.`, marks: 2, ans: V * I * t * 60, unit: 'J', ms: `${eq(`<i>E</i> = <i>VIt</i> = ${ansStr(V)} × ${ansStr(I)} × ${t * 60}`)} ✓<br>${eq(`<i>E</i> = ${ansStr(V * I * t * 60)} J`)} ✓` },
    { q: 'Calculate the percentage of the power supplied by the cell that is dissipated in the external resistor.', marks: 2, ans: 100 * V / E, unit: '%', ms: `Fraction = <i>VI</i>/<i>εI</i> = <i>V</i>/<i>ε</i> = ${ansStr(V)} / ${sig(E)} ✓<br>= ${ansStr(100 * V / E)} % ✓` }][v];
  return { stem: `<b>Figure 1</b> shows a cell of emf ${val(E, 'V')} and internal resistance ${val(r, OHM)} connected to ${art(Rx)} ${val(Rx, OHM)} resistor. The ammeter has negligible resistance and the voltmeter has a very large resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: I, unit: 'A', ms: `${eq(`<i>ε</i> = <i>I</i>(<i>R</i> + <i>r</i>)`)}, so ${eq(`<i>I</i> = ${sig(E)} / (${sig(Rx)} + ${sig(r)})`)} ✓<br>${eq(`<i>I</i> = ${ansStr(I)} A`)} ✓` },
      { q: 'Calculate the reading on the voltmeter.', marks: 1, ans: V, unit: 'V', ms: `${eq(`<i>V</i> = <i>IR</i> = ${ansStr(I)} × ${sig(Rx)} = ${ansStr(V)} V`)} ✓ (or <i>ε</i> − <i>Ir</i>)` },
      { q: 'Calculate the “lost volts” in the cell.', marks: 1, ans: I * r, unit: 'V', ms: `${eq(`<i>Ir</i> = ${ansStr(I)} × ${sig(r)} = ${ansStr(I * r)} V`)} ✓ (or ${sig(E)} − ${ansStr(V)})` },
      last],
    checks: [['I', 'A', I], ['V', 'V', V], ['V', 'r', I * r]] };
};

T.EMF2 = R => {
  const L = EMFV();
  const q = find(() => { const E = R.pick(L.es), r = R.pick(L.rs), rt = R.pick(L.rt); return { E, r, Rx: rt - r, I: E / rt }; }, q => q.Rx >= 2 * q.r && isNice(q.I) && isNice(q.Rx, 2) && isNice(q.I * q.Rx));
  const { E, r, Rx, I } = q, V = I * Rx;
  const c = emfCircuit(E, r, false, c => c.add('switch', 'S', [0, 3.2], [2, 3.2], { state: 'open', name: 'S' }).add('resistor', 'R', [2, 3.2], [5, 3.2], { R: Rx, text: val(Rx, OHM) }));
  return { stem: `<b>Figure 1</b> shows a cell of emf <i>ε</i> and internal resistance <i>r</i> connected to ${art(Rx)} ${val(Rx, OHM)} resistor and a switch <b>S</b>. The voltmeter has a very large resistance.<br>When <b>S</b> is open the voltmeter reads ${val(E, 'V', 3)}. When <b>S</b> is closed the voltmeter reads ${val(V, 'V', 3)}.`, circuit: c,
    parts: [
      { q: 'State the emf of the cell.', marks: 1, ans: E, unit: 'V', ms: `${val(E, 'V', 3)} ✓ (with <b>S</b> open there is no current in the cell, so no pd across the internal resistance)` },
      { q: `Calculate the current in the ${val(Rx, OHM)} resistor when <b>S</b> is closed.`, marks: 1, ans: I, unit: 'A', ms: `${eq(`<i>I</i> = <i>V</i>/<i>R</i> = ${ansStr(V)} / ${sig(Rx)} = ${ansStr(I)} A`)} ✓` },
      { q: 'Calculate the internal resistance <i>r</i> of the cell.', marks: 2, ans: r, unit: OHM, ms: `Lost volts = ${sig(E, 3)} − ${ansStr(V)} = ${ansStr(E - V)} V ✓<br>${eq(`<i>r</i> = ${ansStr(E - V)} / ${ansStr(I)} = ${ansStr(r)} ${OHM}`)} ✓` },
      { q: 'Explain why the voltmeter reading decreases when <b>S</b> is closed.', marks: 2, ms: `There is now a current in the cell, so there is a pd across the internal resistance (lost volts = <i>Ir</i>) ✓<br>Terminal pd = <i>ε</i> − <i>Ir</i>, which is less than the emf ✓` },
      { q: 'State what is meant by the emf of a cell.', marks: 1, ms: `The (chemical) energy transferred to electrical energy per unit charge (per coulomb) passing through the cell ✓`, guide: ['Allow: the work done per coulomb in moving charge the whole way round the circuit.', 'Allow: the terminal pd of the cell when there is no current in it.'] }],
    checks: [['V', 'V', E], ['V', 'V', V, { S: { state: 'closed' } }], ['I', 'R', I, { S: { state: 'closed' } }]] };
};

T.EMF3 = R => {
  const L = EMFV();
  const q = find(() => { const E = R.pick(L.es), r = R.pick(L.rs), a = R.pick(L.rt), b = R.pick(L.rt); return { E, r, I1: E / a, I2: E / b, R1: a - r, R2: b - r }; },
    q => q.I1 < q.I2 && q.R2 > q.r && isNice(q.I1) && isNice(q.I2) && isNice(q.E - q.I1 * q.r) && isNice(q.E - q.I2 * q.r) && q.I2 / q.I1 >= 1.5);
  const { E, r, I1, I2, R1, R2 } = q, V1 = E - I1 * r, V2 = E - I2 * r;
  const c = emfCircuit(E, r, false, c => c.add('ammeter', 'A', [0, 3.2], [2.5, 3.2]).add('variable', 'VR', [2.5, 3.2], [5, 3.2], { R: R1 }));
  const f3 = x => sig(x, 3);
  return { stem: `<b>Figure 1</b> shows a circuit used to determine the emf <i>ε</i> and internal resistance <i>r</i> of a cell. The ammeter has negligible resistance and the voltmeter has a very large resistance.<br>Readings are taken for two settings of the variable resistor.` +
      `<table class="data"><thead><tr><th>Setting</th><th>Ammeter reading / A</th><th>Voltmeter reading / V</th></tr></thead><tbody><tr><td>1</td><td>${f3(I1)}</td><td>${f3(V1)}</td></tr><tr><td>2</td><td>${f3(I2)}</td><td>${f3(V2)}</td></tr></tbody></table>`, circuit: c,
    parts: [
      { q: 'Calculate the internal resistance <i>r</i> of the cell.', marks: 3, ans: r, unit: OHM, ms: `Use of ${eq(`<i>ε</i> = <i>V</i> + <i>Ir</i>`)} for both settings: ${eq(`${f3(V1)} + ${f3(I1)}<i>r</i> = ${f3(V2)} + ${f3(I2)}<i>r</i>`)} ✓<br>${eq(`<i>r</i> = (${f3(V1)} − ${f3(V2)}) / (${f3(I2)} − ${f3(I1)})`)} ✓<br>${eq(`<i>r</i> = ${ansStr(r)} ${OHM}`)} ✓` },
      { q: 'Calculate the emf <i>ε</i> of the cell.', marks: 2, ans: E, unit: 'V', ms: `${eq(`<i>ε</i> = ${f3(V1)} + ${f3(I1)} × ${ansStr(r)}`)} ✓<br>${eq(`<i>ε</i> = ${ansStr(E)} V`)} ✓` },
      { q: 'Calculate the resistance of the variable resistor for setting 2.', marks: 1, ans: R2, unit: OHM, ms: `${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${f3(V2)} / ${f3(I2)} = ${ansStr(R2)} ${OHM}`)} ✓` },
      { q: 'Calculate the maximum current the cell could deliver if its terminals were short-circuited.', marks: 1, ans: E / r, unit: 'A', ms: `${eq(`<i>I</i> = <i>ε</i>/<i>r</i> = ${ansStr(E)} / ${ansStr(r)} = ${ansStr(E / r)} A`)} ✓` }],
    checks: [['I', 'A', I1], ['V', 'V', V1], ['I', 'A', I2, { VR: { R: R2 } }], ['V', 'V', V2, { VR: { R: R2 } }]] };
};

T.EMF4 = R => {
  const q = find(() => { const E = R.pick([1.5, 3, 4.5, 6, 9, 12]), Im = R.pick([.5, 1, 2, 2.5]), f = R.pick([.4, .5, .6, .7]), r = E * f / Im; return { E, Im, r }; }, q => isNice(q.r, 2) && q.r >= .2 && q.r <= 3);
  const { E, Im, r } = q, xM = Im / 5, [yb, yM] = axisFor(E * 1.02), I1 = xM * R.pick([2, 3, 4]), V1 = E - I1 * r, R1 = V1 / I1;
  const c = emfCircuit(E, r, false, c => c.add('ammeter', 'A', [0, 3.2], [2.5, 3.2]).add('variable', 'VR', [2.5, 3.2], [5, 3.2], { R: R1 }));
  const g = graph({ x: [0, Im, xM], y: [0, yb, yM], xl: 'current / A', yl: 'terminal pd / V', curves: [{ f: x => E - x * r, from: 0, to: Im }], crosses: [.1, .25, .4, .55, .7, .85, 1].map(k => [k * Im, E - k * Im * r]) });
  return { stem: `A student uses the circuit in <b>Figure 1</b> to investigate a cell of emf <i>ε</i> and internal resistance <i>r</i>. The ammeter has negligible resistance and the voltmeter has a very large resistance. The student varies the resistance of the variable resistor and records the terminal pd and the current. <b>Figure 2</b> shows the student’s results.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the emf <i>ε</i> of the cell.', marks: 1, ans: E, unit: 'V', tol: .04, ms: `Intercept on the pd axis = ${val(E, 'V')} ✓ (pd when the current is zero)` },
      { q: 'Use <b>Figure 2</b> to determine the internal resistance <i>r</i> of the cell.', marks: 3, ans: r, unit: OHM, tol: .08, ms: `<i>V</i> = <i>ε</i> − <i>Ir</i>, so gradient = −<i>r</i> ✓<br>Gradient from a large triangle, e.g. ${eq(`(${sig(E - Im * r)} − ${sig(E)}) / (${sig(Im)} − 0)`)} ✓<br>${eq(`<i>r</i> = ${ansStr(r)} ${OHM}`)} ✓` },
      { q: `Calculate the resistance of the variable resistor when the current is ${val(I1, 'A')}.`, marks: 2, ans: R1, unit: OHM, tol: .06, ms: `Terminal pd read from graph = ${ansStr(V1)} V ✓<br>${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${ansStr(V1)} / ${sig(I1)} = ${ansStr(R1)} ${OHM}`)} ✓` },
      { q: 'Explain why the terminal pd decreases as the current increases.', marks: 2, ms: `The pd across the internal resistance (lost volts, <i>Ir</i>) increases as the current increases ✓<br>Terminal pd = <i>ε</i> − <i>Ir</i> and the emf is constant ✓` }],
    checks: [['I', 'A', I1], ['V', 'V', V1]] };
};

const lampF = (Vm, Im) => V => { const x = Math.abs(V) / Vm; return Math.sign(V) * Im * 2.5 * x / (1 + 1.5 * x); };

T.IV1 = R => {
  const o = R.pick([{ Vm: 6, Im: .5, xM: 1, yM: .1 }, { Vm: 12, Im: 2, xM: 2, yM: .5 }, { Vm: 6, Im: .3, xM: 1, yM: .05 }, { Vm: 12, Im: 1, xM: 2, yM: .2 }, { Vm: 12, Im: .5, xM: 2, yM: .1 }, { Vm: 6, Im: 1, xM: 1, yM: .2 }, { Vm: 3, Im: .2, xM: .5, yM: .05 }]);
  const f = lampF(o.Vm, o.Im), V0 = o.Vm * R.pick([1 / 6, 1 / 3, 1 / 2, 2 / 3]), I0 = Number(f(V0).toPrecision(3));
  const E = R.pick([4.5, 6, 9, 12, 15, 24].filter(e => e >= V0 + 2 && e <= V0 + 14)), Rl = V0 / I0, Rx = (E - V0) / I0;
  const c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E, text: val(E, 'V') }).add('ammeter', 'A', [2.5, 0], [5, 0]).wire([0, 0], [0, 2.4]).wire([5, 0], [5, 2.4]);
  c.add('resistor', 'R', [0, 2.4], [2.5, 2.4], { R: Rx, name: 'R' }).add('lamp', 'L', [2.5, 2.4], [5, 2.4], { R: Rl });
  const g = graph({ x: [0, o.Vm, o.xM], y: [0, o.Im, o.yM], xl: 'pd / V', yl: 'current / A', curves: [{ f, from: 0, to: o.Vm }] });
  return { stem: `<b>Figure 1</b> shows a filament lamp connected in series with a resistor <b>R</b> and a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance and reads ${val(I0, 'A', 3)}.<br><b>Figure 2</b> shows the current–pd characteristic for the lamp.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the pd across the lamp.', marks: 1, ans: V0, unit: 'V', abs: o.xM * .25, ms: `Reading from the graph at ${val(I0, 'A', 3)}: ${val(V0, 'V')} ✓ (allow ± 1 small square)` },
      { q: 'Calculate the resistance of the lamp in this circuit.', marks: 1, ans: Rl, unit: OHM, tol: .12, ms: `${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${sig(V0)} / ${sig(I0, 3)} = ${ansStr(Rl)} ${OHM}`)} ✓ (not the gradient of the graph)` },
      { q: 'Calculate the resistance of <b>R</b>.', marks: 2, ans: Rx, unit: OHM, tol: .08, ms: `pd across <b>R</b> = ${sig(E)} − ${sig(V0)} = ${ansStr(E - V0)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - V0)} / ${sig(I0, 3)} = ${ansStr(Rx)} ${OHM}`)} ✓` },
      { q: 'Explain why the resistance of the lamp increases as the current in it increases.', marks: 3, ms: `The temperature of the filament increases ✓<br>The metal ions vibrate with greater amplitude ✓<br>Conduction electrons collide with the ions more frequently, so the rate of flow of charge for a given pd is reduced ✓`, guide: ['Do not accept “particles” for ions or atoms in the second mark.', 'Allow “more frequent collisions” for the third mark.', 'Allow reference to <i>V</i>/<i>I</i> increasing, or to <i>V</i> not being proportional to <i>I</i>, as evidence from the graph; do not credit an answer that treats the gradient as the resistance.'] }],
    checks: [['I', 'A', I0], ['V', 'L', V0], ['V', 'R', E - V0]] };
};

T.IV2 = R => {
  const led = R.chance(.5), rev = R.chance(.5), c = new Circuit();
  let E, Vf, Rx, I;
  if (led){ const q = find(() => { const E = R.pick([5, 6, 9, 12]), Vf = R.pick([1.8, 2, 2.2, 3]), I = R.pick([10, 15, 20, 25, 30]) / 1000; return { E, Vf, I, Rx: (E - Vf) / I }; }, q => isNice(q.Rx, 2) && q.E - q.Vf >= 2); ({ E, Vf, I, Rx } = q); }
  else { const q = find(() => { const E = R.pick([1.5, 3, 4.5, 6, 9]), Rx = R.pick([10, 20, 22, 40, 47, 50, 80, 100, 160, 200, 220]); return { E, Vf: .7, Rx, I: (E - .7) / Rx }; }, q => isNice(q.I) && q.I <= .3); ({ E, Vf, I, Rx } = q); }
  const typ = led ? 'led' : 'diode', nm = led ? 'LED' : 'diode';
  c.add('battery', 'B', [0, 0], [5, 0], { E, text: val(E, 'V') }).wire([0, 0], [0, 2.7]).wire([5, 0], [5, 4.1]).wire([2.5, 2.7], [2.5, 4.1]);
  c.add('resistor', 'R', [0, 2.7], [2.5, 2.7], Object.assign({ R: Rx }, led ? { name: 'R' } : { text: val(Rx, OHM) }));
  c.add(typ, 'D', [2.5, 2.7], [5, 2.7], { Vf }).add('voltmeter', 'V', [2.5, 4.1], [5, 4.1]);
  const ImA = I * 1000, P = I * I * Rx * 1000;
  const first = led
    ? [{ q: 'Calculate the pd across <b>R</b> when the LED is operating normally.', marks: 1, ans: E - Vf, unit: 'V', ms: `${eq(`${sig(E)} − ${sig(Vf)} = ${ansStr(E - Vf)} V`)} ✓` },
       { q: 'Calculate the resistance of <b>R</b> that allows the LED to operate normally.', marks: 2, ans: Rx, unit: OHM, ms: `${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${ansStr(E - Vf)} / ${sig(I)}`)} (current converted to A) ✓<br>${eq(`<i>R</i> = ${ansStr(Rx)} ${OHM}`)} ✓` },
       { q: 'Calculate the power dissipated in the LED.', marks: 1, ans: Vf * ImA, unit: 'mW', ms: `${eq(`<i>P</i> = <i>VI</i> = ${sig(Vf)} × ${sig(I)} = ${ansStr(Vf * I)} W = ${ansStr(Vf * ImA)} mW`)} ✓` }]
    : [{ q: 'Calculate the current in the resistor.', marks: 2, ans: ImA, unit: 'mA', ms: `pd across resistor = ${sig(E)} − 0.70 = ${ansStr(E - Vf)} V ✓<br>${eq(`<i>I</i> = ${ansStr(E - Vf)} / ${sig(Rx)} = ${ansStr(I)} A = ${ansStr(ImA)} mA`)} ✓` },
       { q: 'Calculate the power dissipated in the resistor.', marks: 2, ans: P, unit: 'mW', ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i>`)} or ${eq(`<i>VI</i> = ${ansStr(E - Vf)} × ${ansStr(I)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(P / 1000)} W = ${ansStr(P)} mW`)} ✓` }];
  return { stem: led
      ? `<b>Figure 1</b> shows a light-emitting diode (LED) connected in series with a resistor <b>R</b> and a battery of emf ${val(E, 'V')} and negligible internal resistance. The LED operates normally when the pd across it is ${val(Vf, 'V')} and the current in it is ${val(ImA, 'mA')}. The voltmeter has a very large resistance.`
      : `<b>Figure 1</b> shows a semiconductor diode connected in series with ${art(Rx)} ${val(Rx, OHM)} resistor and a battery of emf ${val(E, 'V')} and negligible internal resistance. When the diode conducts, the pd across it is 0.70 V. The voltmeter has a very large resistance.`, circuit: c,
    parts: [...first,
      { q: `The connections to the ${nm} are now reversed.<br>State the new reading on the voltmeter.`, marks: 1, ans: E, unit: 'V', ms: `${val(E, 'V')} ✓ (the ${nm} is reverse biased so there is no current; the pd across the resistor is zero, so the whole emf is across the ${nm})` },
      { q: `Describe how the resistance of a ${led ? 'diode' : 'semiconductor diode'} varies with pd in the forward direction.`, marks: 2, ms: `Very large resistance (almost no current) until the pd reaches the threshold value (about 0.6 V for a silicon diode) ✓<br>Above this the resistance decreases rapidly as the pd increases ✓` }],
    checks: [['I', 'R', I], ['V', 'V', Vf], ['V', 'V', E, { D: { reverse: true } }]] };
};

T.IV3 = R => {
  const kind = R.pick(['resistor', 'lamp', 'diode']), c = new Circuit();
  const opts = ['fixed resistor at constant temperature', 'filament lamp', 'semiconductor diode', 'NTC thermistor at constant temperature'];
  let g, V1, I1, unitI = 'A', tol = .08, desc, correct;
  if (kind === 'resistor'){ const r = R.pick([10, 12, 15, 20, 24, 30, 40, 50, 60]), [yb, yM] = axisFor(6 / r); V1 = R.pick([2, 3, 4, 5, 6]); I1 = V1 / r; correct = 0;
    g = graph({ x: [-6, 6, 2], y: [-yb, yb, yM], xl: 'pd / V', yl: 'current / A', curves: [{ f: v => v / r, from: -6, to: 6 }] });
    desc = `The resistance is constant ✓<br>because the graph is a straight line through the origin, so current is directly proportional to pd ✓`; }
  else if (kind === 'lamp'){ const Im = R.pick([.2, .3, .4, .5, .6, 1, 2]), f = lampF(6, Im), yM = axisFor(Im)[1]; V1 = R.pick([1, 2, 3, 4, 5, 6]); I1 = f(V1); correct = 1;
    g = graph({ x: [-6, 6, 2], y: [-Im, Im, yM], xl: 'pd / V', yl: 'current / A', curves: [{ f, from: -6, to: 6 }] });
    desc = `The resistance increases as the pd increases ✓<br>because the ratio <i>V</i>/<i>I</i> increases (the current increases by smaller and smaller amounts for equal increases in pd) ✓`; }
  else { const vk = R.pick([.72, .76, .8, .84]), f = v => 100 * Math.exp((v - vk) / .06); V1 = vk - R.pick([0, .04, .08]); I1 = f(V1) / 1000; unitI = 'mA'; tol = .16; correct = 2;
    g = graph({ x: [-1, 1, .2], y: [-20, 100, 20], xl: 'pd / V', yl: 'current / mA', curves: [{ f, from: -1, to: vk }] });
    desc = `Very large resistance (negligible current) for pds below about 0.6 V ✓<br>The resistance then decreases rapidly as the pd increases ✓`; }
  I1 = Number(I1.toPrecision(2)); const Rv = V1 / I1, Idisp = unitI === 'mA' ? I1 * 1000 : I1;
  c.add('battery', 'B', [0, 0], [0, 4], { E: 6, side: 'left' }).wire([0, 0], [2, 0]).wire([0, 4], [6.8, 4]).wire([5, 2], [6.8, 2]);
  c.add('pot', 'P', [2, 0], [2, 4], { R: 20, frac: .5, w: [3, 2] }).add('ammeter', 'A', [3, 2], [5, 2]).add('xbox', 'X', [5, 2], [5, 4], { R: 100 }).add('voltmeter', 'V', [6.8, 2], [6.8, 4]);
  return { stem: `A student uses the circuit in <b>Figure 1</b> to obtain the current–pd characteristic for an electrical component <b>X</b>. The ammeter has negligible resistance and the voltmeter has a very large resistance. <b>Figure 2</b> shows the characteristic.`, circuit: c, graph: g,
    parts: [
      { q: 'Identify component <b>X</b>.', marks: 1, options: opts, correct, ms: `${opts[correct]} ✓` },
      { q: `Use <b>Figure 2</b> to determine the resistance of <b>X</b> when the pd across it is ${val(V1, 'V')}.`, marks: 2, ans: Rv, unit: OHM, tol, ms: `Current read from graph = ${sig(Idisp)} ${unitI} ✓<br>${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${sig(V1)} / ${sig(I1)} = ${ansStr(Rv)} ${OHM}`)} ✓ (allow for reading tolerance; not the gradient)` },
      { q: 'Describe how the resistance of <b>X</b> changes as the pd across it is increased from zero in the positive direction.', marks: 2, ms: desc },
      { q: 'The student uses a potential divider to vary the pd rather than a variable resistor in series with <b>X</b>.<br>State the advantage of using the potential divider.', marks: 1, ms: `The pd across <b>X</b> can be varied over the full range from zero up to the emf of the battery ✓ (a series variable resistor cannot reduce the pd to zero)` }],
    checks: [['V', 'X', 6 * (10 * 100 / 110) / (10 + 10 * 100 / 110)]] };
};

T.IV4 = R => {
  const sets = [{ Vm: 12, xM: 2, Im: .6, yM: .1, rs: [20, 24, 30, 40, 60, 120] }, { Vm: 6, xM: 1, Im: 1.2, yM: .2, rs: [5, 6, 7.5, 10, 15, 30] }];
  const s = R.pick(sets), series = R.chance(.5);
  const q = find(() => { const ra = R.pick(s.rs), rb = R.pick(s.rs), E = R.pick(series ? [6, 9, 12, 15, 18, 24] : [s.Vm / 4, s.Vm / 3, s.Vm / 2, s.Vm * 2 / 3, s.Vm].filter(e => isNice(e, 2))); return { ra, rb, E, I: series ? E / (ra + rb) : E / ra + E / rb }; }, q => q.ra < q.rb && isNice(q.I) && isNice(q.E / q.ra) && (!series || q.I <= 3));
  const { ra, rb, E, I } = q, c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E, text: val(E, 'V') }).add('ammeter', 'M', [2.5, 0], [5, 0]);
  if (series){ c.wire([0, 0], [0, 2.4]).wire([5, 0], [5, 2.4]); c.add('resistor', 'A', [0, 2.4], [2.5, 2.4], { R: ra, name: 'A' }).add('resistor', 'B2', [2.5, 2.4], [5, 2.4], { R: rb, name: 'B' }); }
  else { c.wire([0, 0], [0, 3.2]).wire([5, 0], [5, 3.2]); c.add('resistor', 'A', [0, 1.6], [5, 1.6], { R: ra, name: 'A' }).add('resistor', 'B2', [0, 3.2], [5, 3.2], { R: rb, name: 'B' }); }
  const xa = s.Vm * .8, xbp = s.Vm * .85;
  const g = graph({ x: [0, s.Vm, s.xM], y: [0, s.Im, s.yM], xl: 'pd / V', yl: 'current / A', curves: [
    { f: v => v / ra, from: 0, to: Math.min(s.Vm, s.Im * ra), name: 'A', at: [Math.min(xa, s.Im * ra * .8) - s.xM * .3, Math.min(xa, s.Im * ra * .8) / ra + s.yM * .25] },
    { f: v => v / rb, from: 0, to: s.Vm, name: 'B', at: [xbp, xbp / rb - s.yM * .7] }] });
  const VA = series ? I * ra : E;
  const last = series
    ? { q: 'Calculate the pd across resistor <b>A</b>.', marks: 1, ans: VA, unit: 'V', ms: `${eq(`<i>V</i> = <i>IR</i> = ${ansStr(I)} × ${ansStr(ra)} = ${ansStr(VA)} V`)} ✓` }
    : { q: 'Calculate the total power dissipated in the two resistors.', marks: 2, ans: E * I, unit: 'W', ms: `${eq(`<i>P</i> = <i>VI</i> = ${sig(E)} × ${ansStr(I)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(E * I)} W`)} ✓` };
  return { stem: `<b>Figure 2</b> shows the current–pd characteristics of two resistors <b>A</b> and <b>B</b>.<br><b>Figure 1</b> shows <b>A</b> and <b>B</b> connected in ${series ? 'series' : 'parallel'} with a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the resistance of <b>A</b>.', marks: 2, ans: ra, unit: OHM, tol: .05, ms: `Pair of values read from line A, using as much of the line as possible ✓<br>${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${ansStr(ra)} ${OHM}`)} ✓` },
      { q: 'Use <b>Figure 2</b> to determine the resistance of <b>B</b>.', marks: 1, ans: rb, unit: OHM, tol: .05, ms: `Pair of values read from line B, e.g. ${eq(`<i>R</i> = ${sig(s.Vm)} / ${ansStr(s.Vm / rb)} = ${ansStr(rb)} ${OHM}`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: I, unit: 'A', tol: .05, ms: series ? `${eq(`<i>R</i><sub>total</sub> = ${ansStr(ra)} + ${ansStr(rb)} = ${ansStr(ra + rb)} ${OHM}`)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(ra + rb)} = ${ansStr(I)} A`)} ✓`
        : `Each resistor has ${val(E, 'V')} across it: currents ${ansStr(E / ra)} A and ${ansStr(E / rb)} A (from the graph or <i>V</i>/<i>R</i>) ✓<br>${eq(`<i>I</i> = ${ansStr(E / ra)} + ${ansStr(E / rb)} = ${ansStr(I)} A`)} ✓` },
      last],
    checks: [['I', 'M', I], ['V', 'A', VA]] };
};

/* ---------- additional question types (modelled on AQA 7407/7408 past-paper styles) ---------- */
const kO = 'k' + OHM;
function topRow(c, E, w, amm = true, id = 'B'){
  if (amm) c.add('battery', id, [0, 0], [w / 2, 0], { E, text: val(E, 'V') }).add('ammeter', 'A', [w / 2, 0], [w, 0]);
  else c.add('battery', id, [0, 0], [w, 0], { E, text: val(E, 'V') });
  return c;
}

T.SP5 = R => {
  const q = find(() => { const [Vl, Pl] = R.pick([[6, 3], [6, 6], [6, 1.5], [3, 1.5], [3, .6], [12, 6], [12, 24], [2.5, .5], [4, 2], [12, 36], [3.5, .7], [6, 2.4]]), E = R.pick(ES); return { Vl, Pl, E, Il: Pl / Vl, Rx: (E - Vl) / (2 * Pl / Vl) }; }, q => q.E >= q.Vl + 1.5 && isNice(q.Rx, 2) && isNice(q.Il, 2));
  const { Vl, Pl, E, Il, Rx } = q, Rl = Vl * Vl / Pl, c = topRow(new Circuit(), E, 5, false);
  c.wire([0, 0], [0, 3]).wire([5, 0], [5, 3], [4.5, 3]).wire([2, 2.3], [2, 3.7]).wire([4.5, 2.3], [4.5, 3.7]);
  c.add('resistor', 'R', [0, 3], [2, 3], { R: Rx, name: 'R' }).add('lamp', 'L1', [2, 2.3], [4.5, 2.3], { R: Rl, name: 'L_1' }).add('lamp', 'L2', [2, 3.7], [4.5, 3.7], { R: Rl, name: 'L_2', side: 'below' });
  return { stem: `<b>Figure 1</b> shows two identical filament lamps <b>L<sub>1</sub></b> and <b>L<sub>2</sub></b> connected to a battery of emf ${val(E, 'V')} and negligible internal resistance. Each lamp operates at normal brightness when the pd across it is ${val(Vl, 'V')} and it dissipates a power of ${val(Pl, 'W')}. Resistor <b>R</b> is chosen so that both lamps are at normal brightness.`, circuit: c,
    parts: [
      { q: 'Calculate the current in each lamp at normal brightness.', marks: 1, ans: Il, unit: 'A', ms: `${eq(`<i>I</i> = <i>P</i>/<i>V</i> = ${sig(Pl)} / ${sig(Vl)} = ${ansStr(Il)} A`)} ✓` },
      { q: 'Calculate the resistance of <b>R</b>.', marks: 3, ans: Rx, unit: OHM, ms: `Current in <b>R</b> = 2 × ${ansStr(Il)} = ${ansStr(2 * Il)} A ✓<br>pd across <b>R</b> = ${sig(E)} − ${sig(Vl)} = ${ansStr(E - Vl)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - Vl)} / ${ansStr(2 * Il)} = ${ansStr(Rx)} ${OHM}`)} ✓` },
      { q: 'Calculate the power dissipated in <b>R</b>.', marks: 1, ans: (E - Vl) * 2 * Il, unit: 'W', ms: `${eq(`<i>P</i> = <i>VI</i> = ${ansStr(E - Vl)} × ${ansStr(2 * Il)} = ${ansStr((E - Vl) * 2 * Il)} W`)} ✓` },
      { q: 'Lamp <b>L<sub>2</sub></b> fails so that it no longer conducts.<br>Deduce, without calculation, the effect on the brightness of <b>L<sub>1</sub></b>.', marks: 3, ms: `The resistance of the parallel section increases (it is now the resistance of one lamp) ✓<br>The parallel section takes a larger share of the emf <b>or</b> the current in <b>R</b> decreases so the pd across <b>R</b> decreases ✓<br>The pd across <b>L<sub>1</sub></b> increases so it is brighter than normal (and may fail) ✓` }],
    checks: [['I', 'L1', Il], ['V', 'L2', Vl], ['I', 'R', 2 * Il], ['V', 'R', E - Vl]] };
};

T.SP6 = R => {
  const q = find(() => { const s = R.pick([[6, 3, 2], [12, 6, 4], [20, 30, 60], [10, 15, 30], [12, 12, 6], [24, 12, 8], [40, 40, 20], [18, 9, 6], [60, 20, 30], [8, 8, 4], [30, 20, 12], [15, 10, 6]]).slice().sort(() => R() - .5), E = R.pick(ES); return { s, E, Rp: 1 / (1 / s[0] + 1 / s[1] + 1 / s[2]) }; }, q => q.s.every(r => isNice(q.E / r)) && q.E / q.Rp <= 6 && new Set(q.s).size === 3);
  const { s, E, Rp } = q, I = E / Rp, t = R.pick([2, 5, 10]), k = R.pick([0, 1, 2]), c = topRow(new Circuit(), E, 5);
  c.wire([0, 0], [0, 4.5]).wire([5, 0], [5, 4.5]);
  s.forEach((r, i) => c.add('resistor', 'R' + (i + 1), [0, 1.5 * (i + 1)], [5, 1.5 * (i + 1)], { R: r, text: val(r, OHM) }));
  const Ek = E * E / s[k] * t * 60;
  return { stem: `<b>Figure 1</b> shows three resistors connected in parallel with a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the total resistance of the three resistors.', marks: 2, ans: Rp, unit: OHM, ms: `${eq(`1/<i>R</i> = 1/${sig(s[0])} + 1/${sig(s[1])} + 1/${sig(s[2])}`)} ✓<br>${eq(`<i>R</i> = ${ansStr(Rp)} ${OHM}`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 1, ans: I, unit: 'A', ms: `${eq(`<i>I</i> = ${sig(E)} / ${ansStr(Rp)} = ${ansStr(I)} A`)} ✓ (or the sum of the three branch currents)` },
      { q: `Calculate the charge that flows through the battery in ${sig(t)} minutes.`, marks: 2, ans: I * t * 60, unit: 'C', ms: `${eq(`<i>Q</i> = <i>It</i> = ${ansStr(I)} × ${t * 60}`)} ✓<br>${eq(`<i>Q</i> = ${ansStr(I * t * 60)} C`)} ✓` },
      { q: `Calculate the energy dissipated in the ${val(s[k], OHM)} resistor in this time.`, marks: 2, ans: Ek, unit: 'J', ms: `${eq(`<i>E</i> = (<i>V</i><sup>2</sup>/<i>R</i>)<i>t</i> = (${sig(E)}<sup>2</sup> / ${sig(s[k])}) × ${t * 60}`)} ✓<br>${eq(`<i>E</i> = ${ansStr(Ek)} J`)} ✓` }],
    checks: [['I', 'A', I], ['I', 'R' + (k + 1), E / s[k]], ['V', 'R1', E]] };
};

T.SP7 = R => {
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), ra = sw ? b : a, S = sw ? a : b, rb = R.pick(RS), rc = S - rb, r1 = R.pick(RS), E = R.pick(ES), rp = a * b / (a + b), I = E / (r1 + rp); return { ra, rb, rc, r1, E, rp, I, S }; },
    q => q.rc >= 2 && new Set([q.ra, q.rb, q.rc, q.r1]).size === 4 && isNice(q.I) && isNice(q.I * q.rp / q.S) && q.I >= .05 && q.I <= 3);
  const { ra, rb, rc, r1, E, rp, I, S } = q, Vp = I * rp, Ib = Vp / S, c = topRow(new Circuit(), E, 7.7);
  c.wire([0, 0], [0, 3]).wire([7.7, 0], [7.7, 3]).wire([2.5, 3], [3, 3]).wire([3, 2.3], [3, 3.7]).wire([7.2, 2.3], [7.2, 3.7]).wire([7.2, 3], [7.7, 3]);
  c.add('resistor', 'R1', [0, 3], [2.5, 3], { R: r1, text: val(r1, OHM) }).add('resistor', 'RA', [3, 2.3], [7.2, 2.3], { R: ra, text: val(ra, OHM) });
  c.add('resistor', 'RB', [3, 3.7], [5.1, 3.7], { R: rb, text: val(rb, OHM), side: 'below' }).add('resistor', 'RC', [5.1, 3.7], [7.2, 3.7], { R: rc, text: val(rc, OHM), side: 'below' });
  return { stem: `<b>Figure 1</b> shows four resistors connected to a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the total resistance of the circuit.', marks: 3, ans: r1 + rp, unit: OHM, ms: `Lower branch: ${sig(rb)} + ${sig(rc)} = ${ansStr(S)} ${OHM} ✓<br>Parallel section: ${eq(`1/<i>R</i> = 1/${sig(ra)} + 1/${ansStr(S)}`)}, <i>R</i> = ${ansStr(rp)} ${OHM} ✓<br>${eq(`<i>R</i><sub>total</sub> = ${sig(r1)} + ${ansStr(rp)} = ${ansStr(r1 + rp)} ${OHM}`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 1, ans: I, unit: 'A', ms: `${eq(`<i>I</i> = ${sig(E)} / ${ansStr(r1 + rp)} = ${ansStr(I)} A`)} ✓` },
      { q: `Calculate the current in the ${val(rb, OHM)} resistor.`, marks: 2, ans: Ib, unit: 'A', ms: `pd across parallel section = ${ansStr(I)} × ${ansStr(rp)} = ${ansStr(Vp)} V ✓<br>${eq(`<i>I</i> = ${ansStr(Vp)} / ${ansStr(S)} = ${ansStr(Ib)} A`)} ✓` },
      { q: `Calculate the pd across the ${val(rc, OHM)} resistor.`, marks: 1, ans: Ib * rc, unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(Ib)} × ${sig(rc)} = ${ansStr(Ib * rc)} V`)} ✓` }],
    checks: [['I', 'A', I], ['I', 'RB', Ib], ['V', 'RC', Ib * rc], ['V', 'RA', Vp]] };
};

T.PD4 = R => {
  const sc = R.pick([1, 1000]), uR = sc === 1 ? OHM : kO;
  const q = find(() => { const r = [0, 0, 0, 0].map(() => R.pick(RS)), E = R.pick([6, 9, 12, 15, 24]); return { r, E, va: E * r[1] / (r[0] + r[1]), vb: E * r[3] / (r[2] + r[3]), X: r[2] * r[1] / r[0] }; },
    q => new Set(q.r).size === 4 && isNice(q.va) && isNice(q.vb) && Math.abs(q.va - q.vb) > .2 && isNice(q.X, 2));
  const { r, E, va, vb, X } = q, c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [6, 0]).wire([0, 4], [6, 4]);
  c.add('resistor', 'R1', [3, 0], [3, 2], { R: r[0] * sc, text: val(r[0], uR), side: 'left' }).add('resistor', 'R2', [3, 2], [3, 4], { R: r[1] * sc, text: val(r[1], uR), side: 'left' });
  c.add('resistor', 'R3', [6, 0], [6, 2], { R: r[2] * sc, text: val(r[2], uR) }).add('resistor', 'R4', [6, 2], [6, 4], { R: r[3] * sc, text: val(r[3], uR) }).add('voltmeter', 'V', [3, 2], [6, 2]);
  return { stem: `<b>Figure 1</b> shows two potential dividers connected in parallel across a battery of emf ${val(E, 'V')} and negligible internal resistance. A voltmeter of very large resistance is connected between the mid-points of the dividers.`, circuit: c,
    parts: [
      { q: `Calculate the pd across the ${val(r[1], uR)} resistor.`, marks: 2, ans: va, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(r[1])} / (${sig(r[0])} + ${sig(r[1])})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(va)} V`)} ✓` },
      { q: `Calculate the pd across the ${val(r[3], uR)} resistor.`, marks: 1, ans: vb, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(r[3])} / (${sig(r[2])} + ${sig(r[3])}) = ${ansStr(vb)} V`)} ✓` },
      { q: 'Calculate the reading on the voltmeter.', marks: 1, ans: Math.abs(va - vb), unit: 'V', ms: `Difference between the potentials at the two mid-points: ${eq(`${ansStr(Math.max(va, vb))} − ${ansStr(Math.min(va, vb))} = ${ansStr(Math.abs(va - vb))} V`)} ✓` },
      { q: `The ${val(r[3], uR)} resistor is replaced with a resistor <b>X</b> so that the voltmeter reads zero.<br>Calculate the resistance of <b>X</b>.`, marks: 2, ans: X, unit: uR, ms: `The two dividers must share the emf in the same ratio: ${eq(`<i>X</i>/${sig(r[2])} = ${sig(r[1])}/${sig(r[0])}`)} ✓<br>${eq(`<i>X</i> = ${ansStr(X)} ${uR}`)} ✓` }],
    checks: [['V', 'R2', va], ['V', 'R4', vb], ['V', 'V', Math.abs(va - vb)], ['V', 'V', 0, { R4: { R: X * sc } }]] };
};

T.PD5 = R => {
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), r2 = sw ? b : a, rv = sw ? a : b, r1 = R.pick(RS), E = R.pick([5, 6, 9, 12, 15]), rp = a * b / (a + b); return { r1, r2, rv, rp, E, v1: E * r2 / (r1 + r2), v2: E * rp / (r1 + rp) }; }, q => isNice(q.v1) && isNice(q.v2) && q.r1 !== q.r2 && q.rv >= q.r2);
  const { r1, r2, rv, rp, E, v1, v2 } = q, c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  c.add('resistor', 'R1', [3, 0], [3, 2], { R: r1 * 1000, text: val(r1, kO) }).add('resistor', 'R2', [3, 2], [3, 4], { R: r2 * 1000, text: val(r2, kO), side: 'left' }).add('voltmeter', 'V', [5, 2], [5, 4], { R: rv * 1000 });
  return { stem: `<b>Figure 1</b> shows a potential divider connected to a battery of emf ${val(E, 'V')} and negligible internal resistance. A student measures the pd across the ${val(r2, kO)} resistor using a voltmeter that has a resistance of ${val(rv, kO)}.`, circuit: c,
    parts: [
      { q: `Calculate the pd across the ${val(r2, kO)} resistor before the voltmeter is connected.`, marks: 2, ans: v1, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(r2)} / (${sig(r1)} + ${sig(r2)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v1)} V`)} ✓` },
      { q: 'Calculate the reading on the voltmeter when it is connected as shown in <b>Figure 1</b>.', marks: 3, ans: v2, unit: 'V', ms: `Voltmeter in parallel with ${val(r2, kO)}: ${eq(`1/<i>R</i> = 1/${sig(r2)} + 1/${sig(rv)}`)}, <i>R</i> = ${ansStr(rp)} ${kO} ✓<br>${eq(`<i>V</i> = ${sig(E)} × ${ansStr(rp)} / (${sig(r1)} + ${ansStr(rp)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v2)} V`)} ✓` },
      { q: 'Explain why a voltmeter should have a resistance much greater than the resistance of the component it is connected across.', marks: 2, ms: `The combined resistance of the voltmeter and component is then almost equal to the resistance of the component alone ✓<br>so connecting the voltmeter does not significantly change the current in, or the pd across, the component ✓` }],
    checks: [['V', 'V', v2], ['V', 'V', v1, { V: { R: 1e10 } }]] };
};

T.PD6 = R => {
  const Rm = R.pick([5, 10, 20, 50]), f = t => Rm * Math.pow(10, -t / 100), T1 = R.pick([20, 40]), T2 = R.pick([60, 80]);
  const E = R.pick([5, 6, 9, 12]), Rf = R.pick([.5, 1, 2, 5].map(k => k * Rm / 5)), R1 = Number(f(T1).toPrecision(2)), R2 = f(T2), V1 = E * Rf / (Rf + R1), V2 = Number((E * Rf / (Rf + R2)).toPrecision(3)), R2c = Rf * (E - V2) / V2;
  const c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  c.add('thermistor', 'T', [3, 0], [3, 2], { R: R1 * 1000, name: 'T' }).add('resistor', 'F', [3, 2], [3, 4], { R: Rf * 1000, text: val(Rf, kO), side: 'left' }).add('voltmeter', 'V', [5, 2], [5, 4]);
  const g = graph({ x: [0, 100, 20], y: [0, Rm, Rm / 5], xl: 'temperature / °C', yl: 'resistance / k' + OHM, curves: [{ f, from: 0, to: 100 }] });
  return { stem: `<b>Figure 1</b> shows a temperature-sensing circuit. Thermistor <b>T</b> is connected in series with ${art(Rf)} ${val(Rf, kO)} resistor and a battery of emf ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance.<br><b>Figure 2</b> shows how the resistance of <b>T</b> varies with temperature.`, circuit: c, graph: g,
    parts: [
      { q: `Use <b>Figure 2</b> to determine the resistance of <b>T</b> at ${T1} °C.`, marks: 1, ans: R1, unit: kO, tol: .07, ms: `${sig(R1)} ${kO} ✓ (allow ± 1 small square)` },
      { q: `Calculate the reading on the voltmeter at ${T1} °C.`, marks: 2, ans: V1, unit: 'V', tol: .06, ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(Rf)} / (${sig(Rf)} + ${sig(R1)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(V1)} V`)} ✓` },
      { q: `The temperature of <b>T</b> is increased until the voltmeter reads ${val(V2, 'V', 3)}.<br>Determine the temperature of <b>T</b>.`, marks: 3, ans: T2, unit: '°C', abs: 6, ms: `Current = ${sig(V2, 3)} / ${sig(Rf)} = ${sig(V2 / Rf, 3)} mA <b>or</b> pd across <b>T</b> = ${sig(E - V2, 3)} V ✓<br>${eq(`<i>R</i><sub>T</sub> = ${sig(E - V2, 3)} / ${sig(V2 / Rf, 3)} = ${sig(R2c, 3)} ${kO}`)} ✓<br>Temperature read from <b>Figure 2</b> = ${T2} °C ✓ (allow ± 5 °C)` },
      { q: 'Explain why the voltmeter reading increases as the temperature of <b>T</b> increases.', marks: 2, ms: `The resistance of the thermistor decreases as its temperature increases ✓<br>The thermistor takes a smaller share of the emf (or the current increases), so the pd across the ${val(Rf, kO)} resistor increases ✓` }],
    checks: [['V', 'V', V1], ['V', 'V', E * Rf / (Rf + R2), { T: { R: R2 * 1000 } }]] };
};

T.PD7 = R => {
  const sc = R.pick([1, 1000]), uR = sc === 1 ? OHM : kO;
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), rl = sw ? b : a, RL = sw ? a : b, ru = R.pick(RS), E = R.pick([6, 9, 12, 15]), rp = a * b / (a + b); return { rl, RL, ru, E, rp, v1: E * rl / (ru + rl), v2: E * rp / (ru + rp) }; }, q => isNice(q.v1) && isNice(q.v2));
  const { rl, RL, ru, E, rp, v1, v2 } = q, Rt = ru + rl, c = new Circuit();
  c.add('battery', 'B', [0, 0], [0, 4], { E, text: val(E, 'V'), side: 'left' }).wire([0, 0], [2, 0]).wire([0, 4], [6.6, 4]).wire([3, 2], [4.7, 2]);
  c.add('pot', 'P', [2, 0], [2, 4], { R: Rt * sc, frac: rl / Rt, w: [3, 2] }).add('voltmeter', 'V', [4.7, 2], [4.7, 4]).add('switch', 'S', [4.7, 2], [6.6, 2], { state: 'open', name: 'S' }).add('resistor', 'RL', [6.6, 2], [6.6, 4], { R: RL * sc, text: val(RL, uR) });
  return { stem: `<b>Figure 1</b> shows a potentiometer of total resistance ${val(Rt, uR, isNice(Rt, 2) ? 2 : 3)} connected across a battery of emf ${val(E, 'V')} and negligible internal resistance. The sliding contact is set so that the resistance between the contact and the lower end of the potentiometer is ${val(rl, uR)}. The voltmeter has a very large resistance. <b>Figure 1</b> is not drawn to scale.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the voltmeter when switch <b>S</b> is open.', marks: 2, ans: v1, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(rl)} / ${ansStr(Rt)}`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v1)} V`)} ✓` },
      { q: 'Calculate the reading on the voltmeter when <b>S</b> is closed.', marks: 3, ans: v2, unit: 'V', ms: `Upper section = ${ansStr(Rt)} − ${sig(rl)} = ${ansStr(ru)} ${uR}; lower section in parallel with ${val(RL, uR)}: <i>R</i> = ${ansStr(rp)} ${uR} ✓<br>${eq(`<i>V</i> = ${sig(E)} × ${ansStr(rp)} / (${ansStr(ru)} + ${ansStr(rp)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v2)} V`)} ✓` },
      { q: 'With <b>S</b> open, the sliding contact is moved towards the upper end of the potentiometer.<br>State and explain what happens to the voltmeter reading.', marks: 2, ms: `The reading increases ✓<br>A larger fraction of the total resistance (and so of the emf) is between the contact and the lower end ✓` }],
    checks: [['V', 'V', v1], ['V', 'V', v2, { S: { state: 'closed' } }]] };
};

T.EMF5 = R => {
  const q = find(() => { const e = R.pick([1.5, 2, 3, 4.5, 6]), r = R.pick([.2, .25, .4, .5, .8, 1]), rt = R.pick([2, 2.5, 3, 4, 5, 6, 7.5, 8, 10, 12, 15, 20]); return { e, r, Rx: rt - 2 * r, I: 2 * e / rt }; }, q => q.Rx >= 3 * q.r && isNice(q.I) && isNice(q.Rx, 2));
  const { e, r, Rx, I } = q, V = I * Rx, c = new Circuit();
  c.wire([0, 0], [.8, 0]).wire([5.6, 0], [6.4, 0]).wire([0, 0], [0, 3.2]).wire([6.4, 0], [6.4, 3.2]).box(.4, -1.05, 6, .55);
  c.add('cell', 'E1', [.8, 0], [1.6, 0], { E: e, text: val(e, 'V') }).add('resistor', 'r1', [1.6, 0], [3.2, 0], { R: r, text: val(r, OHM) }).add('cell', 'E2', [3.2, 0], [4, 0], { E: e, text: val(e, 'V') }).add('resistor', 'r2', [4, 0], [5.6, 0], { R: r, text: val(r, OHM) });
  c.add('voltmeter', 'V', [0, 1.6], [6.4, 1.6]).add('ammeter', 'A', [0, 3.2], [3.2, 3.2]).add('resistor', 'R', [3.2, 3.2], [6.4, 3.2], { R: Rx, text: val(Rx, OHM) });
  return { stem: `<b>Figure 1</b> shows a battery made from two identical cells connected in series. Each cell has an emf of ${val(e, 'V')} and an internal resistance of ${val(r, OHM)}. The battery is connected to ${art(Rx)} ${val(Rx, OHM)} resistor. The ammeter has negligible resistance and the voltmeter has a very large resistance.`, circuit: c,
    parts: [
      { q: 'State the total emf of the battery.', marks: 1, ans: 2 * e, unit: 'V', ms: `${eq(`2 × ${sig(e)} = ${ansStr(2 * e)} V`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: I, unit: 'A', ms: `Total resistance = ${sig(Rx)} + 2 × ${sig(r)} = ${ansStr(Rx + 2 * r)} ${OHM} ✓<br>${eq(`<i>I</i> = ${ansStr(2 * e)} / ${ansStr(Rx + 2 * r)} = ${ansStr(I)} A`)} ✓` },
      { q: 'Calculate the reading on the voltmeter.', marks: 1, ans: V, unit: 'V', ms: `${eq(`<i>V</i> = <i>IR</i> = ${ansStr(I)} × ${sig(Rx)} = ${ansStr(V)} V`)} ✓` },
      { q: 'Calculate the energy dissipated each second in the internal resistance of the battery.', marks: 2, ans: I * I * 2 * r, unit: 'J', ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup>(2<i>r</i>) = ${ansStr(I)}<sup>2</sup> × (2 × ${sig(r)})`)} ✓<br>= ${ansStr(I * I * 2 * r)} J each second ✓` }],
    checks: [['I', 'A', I], ['V', 'V', V], ['V', 'r1', I * r]] };
};

T.EMF6 = R => {
  const q = find(() => { const e = R.pick([1.5, 3, 4.5, 6, 9, 12]), r = R.pick([.4, .5, .8, 1, 1.2, 2]), rt = R.pick([2, 2.5, 3, 4, 5, 6, 7.5, 8, 10, 12]); return { e, r, Rx: rt - r / 2, I: e / rt }; }, q => q.Rx >= 2 * q.r && isNice(q.I) && isNice(q.Rx, 2) && isNice(q.I / 2));
  const { e, r, Rx, I } = q, V = I * Rx, c = new Circuit();
  c.wire([0, 0], [0, 3.1]).wire([5, 0], [5, 3.1]);
  [0, 1.3].forEach((y, i) => c.add('cell', 'E' + i, [0, y], [2, y], { E: e, text: val(e, 'V') }).add('resistor', 'r' + i, [2, y], [5, y], { R: r, text: val(r, OHM) }));
  c.add('ammeter', 'A', [0, 3.1], [2.5, 3.1]).add('resistor', 'R', [2.5, 3.1], [5, 3.1], { R: Rx, text: val(Rx, OHM), side: 'below' });
  return { stem: `<b>Figure 1</b> shows two identical cells connected in parallel. Each cell has an emf of ${val(e, 'V')} and an internal resistance of ${val(r, OHM)}, shown as a separate resistor next to each cell. The cells are connected to ${art(Rx)} ${val(Rx, OHM)} resistor. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the ammeter.', marks: 3, ans: I, unit: 'A', ms: `Emf of the combination = ${val(e, 'V')}; combined internal resistance = ${sig(r)} / 2 = ${ansStr(r / 2)} ${OHM} ✓<br>${eq(`<i>I</i> = ${sig(e)} / (${sig(Rx)} + ${ansStr(r / 2)})`)} ✓<br>${eq(`<i>I</i> = ${ansStr(I)} A`)} ✓` },
      { q: 'State the current in each cell.', marks: 1, ans: I / 2, unit: 'A', ms: `${ansStr(I / 2)} A ✓ (the current divides equally between identical cells)` },
      { q: `Calculate the pd across the ${val(Rx, OHM)} resistor.`, marks: 1, ans: V, unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(I)} × ${sig(Rx)} = ${ansStr(V)} V`)} ✓` },
      { q: 'State and explain one advantage of connecting the two cells in parallel rather than using a single cell.', marks: 2, ms: `The combined internal resistance is halved, so the lost volts are smaller and the terminal pd is greater for the same load <b>or</b> each cell supplies half the current ✓<br>so more power is delivered to the load <b>or</b> the cells take longer to run down ✓` }],
    checks: [['I', 'A', I], ['I', 'r0', I / 2], ['V', 'R', V]] };
};

T.EMF7 = R => {
  const q = find(() => { const [a, b] = R.pick(PAIRS), sw = R.chance(.5), rl = sw ? b : a, rh = sw ? a : b, r = R.pick([.5, 1, 1.5, 2, 3]), E = R.pick([6, 9, 12, 15, 24]), rp = a * b / (a + b); return { rl, rh, r, E, rp, vo: E * rl / (rl + r), vc: E * rp / (rp + r) }; }, q => isNice(q.vo) && isNice(q.vc) && q.rl >= 3 * q.r && q.E / (q.rp + q.r) <= 3);
  const { rl, rh, r, E, rp, vo, vc } = q;
  const c = emfCircuit(E, r, true, c => c.add('lamp', 'L', [0, 1.6], [5, 1.6], { R: rl, name: 'L' }).add('switch', 'S', [0, 3.2], [2, 3.2], { state: 'open', name: 'S' }).add('resistor', 'H', [2, 3.2], [5, 3.2], { R: rh, text: val(rh, OHM) }), true, 'battery');
  return { stem: `<b>Figure 1</b> shows a battery of emf ${val(E, 'V')} and internal resistance ${val(r, OHM)} connected to a lamp <b>L</b>. ${art(rh, 1)} ${val(rh, OHM)} heater can be connected in parallel with the lamp by closing switch <b>S</b>. Assume that the resistance of the lamp remains constant at ${val(rl, OHM)}.`, circuit: c,
    parts: [
      { q: 'Calculate the pd across the lamp when <b>S</b> is open.', marks: 2, ans: vo, unit: 'V', ms: `${eq(`<i>I</i> = ${sig(E)} / (${sig(rl)} + ${sig(r)}) = ${ansStr(E / (rl + r))} A`)} ✓<br>${eq(`<i>V</i> = ${ansStr(E / (rl + r))} × ${sig(rl)} = ${ansStr(vo)} V`)} ✓` },
      { q: 'Calculate the pd across the lamp when <b>S</b> is closed.', marks: 3, ans: vc, unit: 'V', ms: `Lamp and heater in parallel: <i>R</i> = ${ansStr(rp)} ${OHM} ✓<br>${eq(`<i>I</i> = ${sig(E)} / (${ansStr(rp)} + ${sig(r)}) = ${ansStr(E / (rp + r))} A`)} ✓<br>${eq(`<i>V</i> = ${ansStr(E / (rp + r))} × ${ansStr(rp)} = ${ansStr(vc)} V`)} ✓` },
      { q: 'Calculate the power dissipated in the lamp when <b>S</b> is closed.', marks: 2, ans: vc * vc / rl, unit: 'W', ms: `${eq(`<i>P</i> = <i>V</i><sup>2</sup>/<i>R</i> = ${ansStr(vc)}<sup>2</sup> / ${sig(rl)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(vc * vc / rl)} W`)} ✓` },
      { q: 'Explain why the lamp becomes dimmer when <b>S</b> is closed.', marks: 3, ms: `The total resistance connected across the battery decreases, so the current in the battery increases ✓<br>The pd across the internal resistance (lost volts) increases ✓<br>The terminal pd, and so the pd across and power of the lamp, decreases ✓` }],
    checks: [['V', 'L', vo], ['V', 'L', vc, { S: { state: 'closed' } }], ['I', 'r', E / (rp + r), { S: { state: 'closed' } }]] };
};

T.EMF8 = R => {
  const L = EMFV();
  const q = find(() => { const E = R.pick(L.es), r = R.pick(L.rs), rt = R.pick(L.rt); return { E, r, Rx: rt - r, I: E / rt }; }, q => q.Rx >= 3 * q.r && isNice(q.I) && isNice(q.Rx, 2) && isNice(q.I * q.Rx));
  const { E, r, Rx, I } = q, V = I * Rx, t = R.pick([2, 5, 10]);
  const c = emfCircuit(E, r, false, c => c.add('ammeter', 'A', [0, 3.2], [2.5, 3.2]).add('resistor', 'R', [2.5, 3.2], [5, 3.2], { R: Rx, name: 'R' }));
  return { stem: `<b>Figure 1</b> shows a cell of emf ${val(E, 'V', 3)} and internal resistance <i>r</i> connected to a resistor <b>R</b>. The ammeter has negligible resistance and reads ${val(I, 'A', 3)}. The voltmeter has a very large resistance and reads ${val(V, 'V', 3)}.`, circuit: c,
    parts: [
      { q: 'Calculate the resistance of <b>R</b>.', marks: 1, ans: Rx, unit: OHM, ms: `${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${sig(V, 3)} / ${sig(I, 3)} = ${ansStr(Rx)} ${OHM}`)} ✓` },
      { q: 'Calculate the internal resistance <i>r</i> of the cell.', marks: 2, ans: r, unit: OHM, ms: `Lost volts = ${sig(E, 3)} − ${sig(V, 3)} = ${ansStr(E - V)} V ✓<br>${eq(`<i>r</i> = ${ansStr(E - V)} / ${sig(I, 3)} = ${ansStr(r)} ${OHM}`)} ✓` },
      { q: 'Calculate the percentage of the electrical power produced by the cell that is dissipated in <b>R</b>.', marks: 2, ans: 100 * V / E, unit: '%', ms: `Fraction = <i>VI</i>/<i>εI</i> = ${sig(V, 3)} / ${sig(E, 3)} ✓<br>= ${ansStr(100 * V / E)} % ✓` },
      { q: `Calculate the energy dissipated in the internal resistance in ${sig(t)} minutes.`, marks: 2, ans: I * I * r * t * 60, unit: 'J', ms: `${eq(`<i>E</i> = <i>I</i><sup>2</sup><i>rt</i> = ${sig(I, 3)}<sup>2</sup> × ${ansStr(r)} × ${t * 60}`)} ✓<br>${eq(`<i>E</i> = ${ansStr(I * I * r * t * 60)} J`)} ✓` }],
    checks: [['I', 'A', I], ['V', 'V', V]] };
};

T.IV5 = R => {
  const o = R.pick([{ Im: 10, Vm: 5 }, { Im: 10, Vm: 6 }, { Im: 20, Vm: 6 }, { Im: 5, Vm: 5 }, { Im: 20, Vm: 10 }, { Im: 50, Vm: 5 }]);
  const f = i => { const x = i / o.Im; return o.Vm * 2.5 * x / (1 + 1.5 * x); }, [yb, yM] = axisFor(o.Vm), I1 = o.Im * R.pick([.2, .4, .6, .8]), V1 = Number(f(I1).toPrecision(2));
  const E = R.pick([9, 10, 12, 15].filter(e => e >= V1 + 3)), Rt = V1 / I1 * 1000, Rx = (E - V1) / I1 * 1000, c = topRow(new Circuit(), E, 5, false);
  c.wire([0, 0], [0, 2.5]).wire([5, 0], [5, 2.5]).add('resistor', 'R', [0, 2.5], [2.5, 2.5], { R: Rx, name: 'R' }).add('thermistor', 'T', [2.5, 2.5], [5, 2.5], { R: Rt, name: 'T' });
  const g = graph({ x: [0, o.Im, o.Im / 5], y: [0, yb, yM], xl: 'current / mA', yl: 'pd / V', curves: [{ f, from: 0, to: o.Im }] });
  return { stem: `<b>Figure 2</b> shows the variation of potential difference with current for a thermistor <b>T</b>.<br><b>Figure 1</b> shows <b>T</b> in series with a fixed resistor <b>R</b> and a battery. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The current in <b>T</b> is ${val(I1, 'mA')}.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the pd across <b>T</b>.', marks: 1, ans: V1, unit: 'V', abs: yM * .3, ms: `${val(V1, 'V')} ✓ (allow ± 1 small square)` },
      { q: 'Calculate the resistance of <b>T</b> at this current.', marks: 1, ans: Rt, unit: OHM, tol: .1, ms: `${eq(`<i>R</i> = ${sig(V1)} / (${sig(I1)} × 10<sup>−3</sup>) = ${ansStr(Rt)} ${OHM}`)} ✓` },
      { q: 'Determine the resistance of <b>R</b>.', marks: 2, ans: Rx, unit: OHM, tol: .07, ms: `pd across <b>R</b> = ${sig(E)} − ${sig(V1)} = ${ansStr(E - V1)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - V1)} / (${sig(I1)} × 10<sup>−3</sup>) = ${ansStr(Rx)} ${OHM}`)} ✓` },
      { q: 'Describe and explain, with reference to temperature, how the resistance of <b>T</b> changes as the current increases.', marks: 3, ms: `The resistance decreases (the ratio <i>V</i>/<i>I</i> falls as the graph curves towards the current axis) ✓<br>A larger current increases the power dissipated, so the temperature of the thermistor rises ✓<br>More charge carriers (conduction electrons) are released as the temperature rises, so the resistance falls ✓`, guide: ['Allow: at very small currents the resistance is (almost) constant because the thermistor has not warmed up.', 'Allow “the thermistor warms up because of the increased current” for the second mark.', 'An answer that treats the gradient of the graph as the resistance can score the first mark only.'] }],
    checks: [['I', 'R', I1 / 1000], ['V', 'T', V1], ['V', 'R', E - V1]] };
};

T.IV6 = R => {
  const vk = R.pick([2.4, 2.6, 2.8]), f = v => 50 * Math.exp((v - vk) / .15), V1 = Number((vk - R.pick([.1, .2, .3])).toFixed(1)), ImA = Number(f(V1).toPrecision(2)), I = ImA / 1000;
  const E = R.pick([5, 6, 9, 12]), Rx = (E - V1) / I, c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E, text: val(E, 'V') }).add('switch', 'S', [2.5, 0], [5, 0], { state: 'open' }).wire([0, 0], [0, 2.7]).wire([5, 0], [5, 2.7]);
  c.add('led', 'D', [0, 2.7], [2.5, 2.7], { Vf: V1 }).add('resistor', 'R', [2.5, 2.7], [5, 2.7], { R: Rx, name: 'R' });
  const g = graph({ x: [0, 3, .5], y: [0, 50, 10], xl: 'pd / V', yl: 'current / mA', curves: [{ f, from: 0, to: vk }] });
  return { stem: `A light-emitting diode (LED) is used to indicate that a switch is closed, as shown in <b>Figure 1</b>. Resistor <b>R</b> limits the current in the LED. The battery has an emf of ${val(E, 'V')} and negligible internal resistance.<br><b>Figure 2</b> shows part of the characteristic graph for the LED. The circuit is designed so that the pd across the LED is ${val(V1, 'V')} when the switch is closed.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the current in the LED when the switch is closed.', marks: 1, ans: ImA, unit: 'mA', tol: .12, ms: `${sig(ImA)} mA ✓ (allow ± 1 small square)` },
      { q: 'Calculate the resistance of <b>R</b>.', marks: 3, ans: Rx, unit: OHM, tol: .12, ms: `pd across <b>R</b> = ${sig(E)} − ${sig(V1)} = ${ansStr(E - V1)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - V1)} / (${sig(ImA)} × 10<sup>−3</sup>)`)} ✓<br>${eq(`<i>R</i> = ${ansStr(Rx)} ${OHM}`)} ✓`, guide: ['Do not allow a gradient calculation for <b>R</b>.'] },
      { q: 'Calculate the power dissipated in the LED.', marks: 2, ans: V1 * ImA, unit: 'mW', tol: .12, ms: `${eq(`<i>P</i> = <i>VI</i> = ${sig(V1)} × ${sig(ImA)} × 10<sup>−3</sup>`)} ✓<br>${eq(`<i>P</i> = ${ansStr(V1 * ImA / 1000)} W = ${ansStr(V1 * ImA)} mW`)} ✓` },
      { q: 'Calculate the number of electrons that pass through the LED each second.', marks: 2, ans: I / 1.6e-19 / 1e16, unit: '× 10<sup>16</sup>', tol: .12, ms: `Charge each second = ${sig(ImA)} × 10<sup>−3</sup> C ✓<br>${eq(`<i>n</i> = ${sig(ImA)} × 10<sup>−3</sup> / 1.60 × 10<sup>−19</sup> = ${ansStr(I / 1.6e-19 / 1e16)} × 10<sup>16</sup>`)} ✓` }],
    checks: [['I', 'R', I, { S: { state: 'closed' } }], ['V', 'R', E - V1, { S: { state: 'closed' } }]] };
};

T.IV7 = R => {
  const RL = [100, 150, 200, 220, 250, 400, 430, 500, 860, 1000];
  const q = find(() => { const E = R.pick([3, 5, 6, 9, 12]), r1 = R.pick(RL), r2 = R.pick(RL); return { E, r1, r2, i1: (E - .7) / r1 * 1000, i2: (E - .7) / r2 * 1000 }; }, q => q.r1 !== q.r2 && isNice(q.i1) && isNice(q.i2));
  const { E, r1, r2, i1, i2 } = q, c = topRow(new Circuit(), E, 5);
  c.wire([0, 0], [0, 3.2]).wire([5, 0], [5, 3.2]);
  c.add('diode', 'D1', [0, 1.6], [2.5, 1.6], { Vf: .7 }).add('resistor', 'R1', [2.5, 1.6], [5, 1.6], { R: r1, text: val(r1, OHM) });
  c.add('diode', 'D2', [2.5, 3.2], [0, 3.2], { Vf: .7, reverse: true }).add('resistor', 'R2', [2.5, 3.2], [5, 3.2], { R: r2, text: val(r2, OHM) });
  const P = Math.pow(E - .7, 2) / r2 * 1000;
  return { stem: `<b>Figure 1</b> shows two semiconductor diodes and two resistors connected to a battery of emf ${val(E, 'V')} and negligible internal resistance. A diode has a pd of 0.70 V across it when it conducts and has an extremely large resistance when it is reverse biased. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: i1, unit: 'mA', ms: `Only the diode in series with the ${val(r1, OHM)} resistor is forward biased; pd across that resistor = ${sig(E)} − 0.70 = ${ansStr(E - .7)} V ✓<br>${eq(`<i>I</i> = ${ansStr(E - .7)} / ${sig(r1)} = ${ansStr(i1 / 1000)} A = ${ansStr(i1)} mA`)} ✓` },
      { q: `State the pd across the ${val(r2, OHM)} resistor.`, marks: 1, ans: 0, unit: 'V', ms: `0 V ✓ (its diode is reverse biased, so there is no current in the resistor)` },
      { q: 'The connections to the battery are now reversed.<br>Calculate the new reading on the ammeter.', marks: 2, ans: i2, unit: 'mA', ms: `Now only the diode in series with the ${val(r2, OHM)} resistor conducts ✓<br>${eq(`<i>I</i> = ${ansStr(E - .7)} / ${sig(r2)} = ${ansStr(i2 / 1000)} A = ${ansStr(i2)} mA`)} ✓` },
      { q: `Calculate the power dissipated in the ${val(r2, OHM)} resistor with the battery reversed.`, marks: 2, ans: P, unit: 'mW', ms: `${eq(`<i>P</i> = <i>V</i><sup>2</sup>/<i>R</i> = ${ansStr(E - .7)}<sup>2</sup> / ${sig(r2)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(P / 1000)} W = ${ansStr(P)} mW`)} ✓` }],
    checks: [['I', 'A', i1 / 1000], ['V', 'R2', 0], ['I', 'A', i2 / 1000, { B: { E: -E }, D1: { reverse: true }, D2: { reverse: false } }]] };
};
/* ---------- third batch: 21 more types ---------- */
const rails = (c, w, h) => c.wire([0, 0], [0, h]).wire([w, 0], [w, h]);
const leftBatt = (c, E, h = 4, label = true) => c.add('battery', 'B', [0, 0], [0, h], Object.assign({ E, side: 'left' }, label ? { text: val(E, 'V') } : {}));
const LAMPS = [[6, 3], [6, 6], [6, 1.5], [3, 1.5], [12, 6], [12, 24], [12, 36], [4, 2], [3, .5], [12, 12], [6, 12], [12, 4.8], [9, 2.7], [6, 2.4]];
const cur = (I, sc) => sc === 1 ? [I, 'A'] : [I, 'mA'];

T.SP8 = R => {
  const q = find(() => { const r1 = R.pick(RS), r2 = R.pick(RS), E = R.pick(ES); return { r1, r2, E, i1: E / r1, i2: E / r2 }; }, q => q.r1 !== q.r2 && isNice(q.i1) && isNice(q.i2) && q.i1 + q.i2 <= 5);
  const { r1, r2, E, i1, i2 } = q, c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E }).add('ammeter', 'A3', [2.5, 0], [5, 0], { name: 'A_3' }); rails(c, 5, 3.2);
  c.add('ammeter', 'A1', [0, 1.6], [2.5, 1.6], { name: 'A_1' }).add('resistor', 'R1', [2.5, 1.6], [5, 1.6], { R: r1, text: val(r1, OHM) });
  c.add('ammeter', 'A2', [0, 3.2], [2.5, 3.2], { name: 'A_2' }).add('resistor', 'R2', [2.5, 3.2], [5, 3.2], { R: r2, text: val(r2, OHM) });
  return { stem: `<b>Figure 1</b> shows two resistors connected in parallel with a battery of negligible internal resistance. The three ammeters have negligible resistance. Ammeter <b>A<sub>1</sub></b> reads ${val(i1, 'A', isNice(i1, 2) ? 2 : 3)}.`, circuit: c,
    parts: [
      { q: 'Calculate the emf of the battery.', marks: 2, ans: E, unit: 'V', ms: `pd across the ${val(r1, OHM)} resistor = ${ansStr(i1)} × ${sig(r1)} ✓<br>= ${ansStr(E)} V, which equals the emf because the battery has negligible internal resistance ✓` },
      { q: 'Calculate the reading on <b>A<sub>2</sub></b>.', marks: 1, ans: i2, unit: 'A', ms: `${eq(`<i>I</i> = ${ansStr(E)} / ${sig(r2)} = ${ansStr(i2)} A`)} ✓` },
      { q: 'Calculate the reading on <b>A<sub>3</sub></b>.', marks: 1, ans: i1 + i2, unit: 'A', ms: `${eq(`${ansStr(i1)} + ${ansStr(i2)} = ${ansStr(i1 + i2)} A`)} ✓ (charge is conserved at the junction)` },
      { q: `Calculate the power dissipated in the ${val(r2, OHM)} resistor.`, marks: 2, ans: E * i2, unit: 'W', ms: `${eq(`<i>P</i> = <i>VI</i> = ${ansStr(E)} × ${ansStr(i2)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(E * i2)} W`)} ✓` },
      { q: 'Explain how the readings on the three ammeters show that a quantity is conserved.', marks: 2, ms: `The reading on <b>A<sub>3</sub></b> equals the sum of the readings on <b>A<sub>1</sub></b> and <b>A<sub>2</sub></b> ✓<br>so charge is conserved: charge flows into the junction at the same rate as it flows out ✓`, guide: ['The second mark needs the conserved quantity to be named as charge.', 'Do not allow “current is used up” or “current across”.'] }],
    checks: [['I', 'A1', i1], ['I', 'A2', i2], ['I', 'A3', i1 + i2]] };
};

T.SP9 = R => {
  const q = find(() => { const r1 = R.pick(RS), r2 = R.pick(RS), rx = R.pick(RS), E = R.pick(ES); return { r1, r2, rx, E, I: E / (r1 + r2 + rx) }; }, q => new Set([q.r1, q.r2, q.rx]).size === 3 && isNice(q.I) && q.I >= .05 && isNice(q.I * (q.r2 + q.rx)) && isNice(q.I * q.r2) && isNice(q.I * q.r1));
  const { r1, r2, rx, E, I } = q, V = I * (r2 + rx), c = topRow(new Circuit(), E, 7.5);
  c.wire([0, 0], [0, 2.6]).wire([7.5, 0], [7.5, 4]).wire([2.5, 2.6], [2.5, 4]);
  c.add('resistor', 'R1', [0, 2.6], [2.5, 2.6], { R: r1, text: val(r1, OHM) }).add('resistor', 'R2', [2.5, 2.6], [5, 2.6], { R: r2, text: val(r2, OHM) }).add('resistor', 'X', [5, 2.6], [7.5, 2.6], { R: rx, name: 'X' }).add('voltmeter', 'V', [2.5, 4], [7.5, 4]);
  return { stem: `<b>Figure 1</b> shows three resistors connected in series with a battery of emf ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance and reads ${val(V, 'V', isNice(V, 2) ? 2 : 3)}. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: `Calculate the pd across the ${val(r1, OHM)} resistor.`, marks: 1, ans: E - V, unit: 'V', ms: `${eq(`${sig(E)} − ${ansStr(V)} = ${ansStr(E - V)} V`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 1, ans: I, unit: 'A', ms: `${eq(`<i>I</i> = ${ansStr(E - V)} / ${sig(r1)} = ${ansStr(I)} A`)} ✓` },
      { q: `Calculate the pd across the ${val(r2, OHM)} resistor.`, marks: 1, ans: I * r2, unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(I)} × ${sig(r2)} = ${ansStr(I * r2)} V`)} ✓` },
      { q: 'Calculate the resistance of <b>X</b>.', marks: 2, ans: rx, unit: OHM, ms: `pd across <b>X</b> = ${ansStr(V)} − ${ansStr(I * r2)} = ${ansStr(I * rx)} V ✓<br>${eq(`<i>R</i> = ${ansStr(I * rx)} / ${ansStr(I)} = ${ansStr(rx)} ${OHM}`)} ✓` }],
    checks: [['V', 'V', V], ['I', 'A', I], ['V', 'X', I * rx]] };
};

T.SP10 = R => {
  const q = find(() => { const r1 = R.pick(RS), r2 = R.pick(RS), E = R.pick(ES); return { r1, r2, E, Io: E / (r1 + r2), Ic: E / r1 }; }, q => q.r1 !== q.r2 && isNice(q.Io) && isNice(q.Ic) && q.Ic <= 4);
  const { r1, r2, E, Io, Ic } = q, c = topRow(new Circuit(), E, 5);
  c.wire([0, 0], [0, 2.6]).wire([5, 0], [5, 3.9]).wire([2.5, 2.6], [2.5, 3.9]);
  c.add('resistor', 'R1', [0, 2.6], [2.5, 2.6], { R: r1, text: val(r1, OHM) }).add('resistor', 'R2', [2.5, 2.6], [5, 2.6], { R: r2, text: val(r2, OHM) }).add('switch', 'S', [2.5, 3.9], [5, 3.9], { state: 'open', name: 'S', side: 'below' });
  return { stem: `<b>Figure 1</b> shows two resistors connected in series with a battery of emf ${val(E, 'V')} and negligible internal resistance. Switch <b>S</b> is connected in parallel with the ${val(r2, OHM)} resistor. The ammeter and the closed switch have negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the reading on the ammeter when <b>S</b> is open.', marks: 2, ans: Io, unit: 'A', ms: `${eq(`<i>R</i><sub>total</sub> = ${sig(r1)} + ${sig(r2)} = ${ansStr(r1 + r2)} ${OHM}`)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(r1 + r2)} = ${ansStr(Io)} A`)} ✓` },
      { q: `Calculate the pd across the ${val(r2, OHM)} resistor when <b>S</b> is open.`, marks: 1, ans: Io * r2, unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(Io)} × ${sig(r2)} = ${ansStr(Io * r2)} V`)} ✓` },
      { q: 'Calculate the reading on the ammeter when <b>S</b> is closed.', marks: 2, ans: Ic, unit: 'A', ms: `The closed switch short-circuits the ${val(r2, OHM)} resistor, so the circuit resistance is ${val(r1, OHM)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${sig(r1)} = ${ansStr(Ic)} A`)} ✓` },
      { q: `State the pd across the ${val(r2, OHM)} resistor when <b>S</b> is closed.`, marks: 1, ans: 0, unit: 'V', ms: `0 V ✓ (it is in parallel with a switch of negligible resistance, so there is no current in it)` }],
    checks: [['I', 'A', Io], ['V', 'R2', Io * r2], ['I', 'A', Ic, { S: { state: 'closed' } }], ['V', 'R2', 0, { S: { state: 'closed' } }]] };
};

T.SP11 = R => {
  const q = find(() => { const E = R.pick([6, 12, 24]), r1 = R.pick([2, 3, 4, 6, 8, 12]), r2 = R.pick([4, 6, 8, 12, 16, 24, 48]); return { E, r1, r2, p1: E * E / r1, p2: E * E / r2 }; }, q => q.r1 < q.r2 && isNice(q.p1) && isNice(q.p2) && isNice(q.E / q.r2));
  const { E, r1, r2, p1, p2 } = q, c = topRow(new Circuit(), E, 5); rails(c, 5, 3.2);
  c.add('switch', 'S1', [0, 1.6], [2, 1.6], { state: 'open', name: 'S_1' }).add('resistor', 'R1', [2, 1.6], [5, 1.6], { R: r1, text: val(r1, OHM) });
  c.add('switch', 'S2', [0, 3.2], [2, 3.2], { state: 'open', name: 'S_2' }).add('resistor', 'R2', [2, 3.2], [5, 3.2], { R: r2, text: val(r2, OHM) });
  const cl = { state: 'closed' };
  return { stem: `<b>Figure 1</b> shows the circuit for a heater that has three power settings. Two heating elements of resistance ${val(r1, OHM)} and ${val(r2, OHM)} are connected to ${art(E)} ${val(E, 'V')} supply of negligible internal resistance. Each element is controlled by its own switch. The ammeter has negligible resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the power of the heater when only <b>S<sub>1</sub></b> is closed.', marks: 2, ans: p1, unit: 'W', ms: `${eq(`<i>P</i> = <i>V</i><sup>2</sup>/<i>R</i> = ${sig(E)}<sup>2</sup> / ${sig(r1)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(p1)} W`)} ✓` },
      { q: 'Calculate the reading on the ammeter when only <b>S<sub>2</sub></b> is closed.', marks: 1, ans: E / r2, unit: 'A', ms: `${eq(`<i>I</i> = ${sig(E)} / ${sig(r2)} = ${ansStr(E / r2)} A`)} ✓` },
      { q: 'Calculate the power of the heater when both switches are closed.', marks: 2, ans: p1 + p2, unit: 'W', ms: `Power of ${val(r2, OHM)} element = ${sig(E)}<sup>2</sup> / ${sig(r2)} = ${ansStr(p2)} W ✓<br>Total = ${ansStr(p1)} + ${ansStr(p2)} = ${ansStr(p1 + p2)} W ✓` },
      { q: 'Explain why the heater has its greatest power when both switches are closed.', marks: 2, ms: `The elements are in parallel, so the total resistance is less than either resistance alone ✓<br>The pd is the same, so the current from the supply is greatest and <i>P</i> = <i>VI</i> (or <i>V</i><sup>2</sup>/<i>R</i>) is greatest ✓` }],
    checks: [['I', 'A', E / r1, { S1: cl }], ['I', 'A', E / r2, { S2: cl }], ['I', 'A', E / r1 + E / r2, { S1: cl, S2: cl }]] };
};

T.SP12 = R => {
  const q = find(() => { const a = R.pick(LAMPS), b = R.pick(LAMPS), E = R.pick(ES), ra = a[0] * a[0] / a[1], rb = b[0] * b[0] / b[1]; return { a, b, E, ra, rb, I: E / (ra + rb) }; }, q => Math.abs(q.ra - q.rb) > .2 * Math.min(q.ra, q.rb) && isNice(q.ra, 2) && isNice(q.rb, 2) && isNice(q.I) && q.I * q.ra <= q.a[0] * 1.2 && q.I * q.rb <= q.b[0] * 1.2);
  const { a, b, E, ra, rb, I } = q, c = topRow(new Circuit(), E, 5); rails(c, 5, 2.4);
  c.add('lamp', 'L1', [0, 2.4], [2.5, 2.4], { R: ra, name: 'L_1' }).add('lamp', 'L2', [2.5, 2.4], [5, 2.4], { R: rb, name: 'L_2' });
  const big = ra > rb ? 1 : 2;
  return { stem: `<b>Figure 1</b> shows two filament lamps connected in series with a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.<br><b>Table 1</b> shows the operating conditions for the lamps at normal brightness. Assume that any changes in the resistance of the lamps are negligible.` +
      `<table class="data"><thead><tr><th>Lamp</th><th>Operating voltage / V</th><th>Power / W</th></tr></thead><tbody><tr><td><b>L<sub>1</sub></b></td><td>${sig(a[0])}</td><td>${sig(a[1])}</td></tr><tr><td><b>L<sub>2</sub></b></td><td>${sig(b[0])}</td><td>${sig(b[1])}</td></tr></tbody></table>`, circuit: c,
    parts: [
      { q: 'Calculate the resistance of <b>L<sub>1</sub></b>.', marks: 2, ans: ra, unit: OHM, ms: `${eq(`<i>R</i> = <i>V</i><sup>2</sup>/<i>P</i> = ${sig(a[0])}<sup>2</sup> / ${sig(a[1])}`)} ✓<br>${eq(`<i>R</i> = ${ansStr(ra)} ${OHM}`)} ✓` },
      { q: 'Calculate the resistance of <b>L<sub>2</sub></b>.', marks: 1, ans: rb, unit: OHM, ms: `${eq(`<i>R</i> = ${sig(b[0])}<sup>2</sup> / ${sig(b[1])} = ${ansStr(rb)} ${OHM}`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: I, unit: 'A', ms: `${eq(`<i>R</i><sub>total</sub> = ${ansStr(ra)} + ${ansStr(rb)} = ${ansStr(ra + rb)} ${OHM}`)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(ra + rb)} = ${ansStr(I)} A`)} ✓` },
      { q: 'Calculate the power dissipated in <b>L<sub>1</sub></b> in this circuit.', marks: 2, ans: I * I * ra, unit: 'W', ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${ansStr(I)}<sup>2</sup> × ${ansStr(ra)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(I * I * ra)} W`)} ✓` },
      { q: 'State and explain which lamp dissipates more power in this circuit.', marks: 2, ms: `<b>L<sub>${big}</sub></b> ✓<br>The current is the same in both lamps and <i>P</i> = <i>I</i><sup>2</sup><i>R</i>, so the lamp with the larger resistance dissipates more power ✓` }],
    checks: [['I', 'A', I], ['V', 'L1', I * ra]] };
};

function sensorGraphQ(R, ldr){
  const Rm = R.pick([5, 10, 20, 50]), xm = ldr ? 1000 : 100, f = t => Rm * Math.pow(10, -t / xm), x1 = xm * R.pick([.2, .4]), x2 = xm * R.pick([.6, .8]);
  const E = R.pick([5, 6, 9, 12]), Rf = R.pick([.5, 1, 2, 5].map(k => k * Rm / 5)), R1 = Number(f(x1).toPrecision(2)), R2 = f(x2);
  const div = r => ldr ? E * r / (Rf + r) : E * Rf / (Rf + r), V1 = div(R1), V2 = Number(div(R2).toPrecision(3)), R2c = ldr ? Rf * V2 / (E - V2) : Rf * (E - V2) / V2;
  return { Rm, xm, f, x1, x2, E, Rf, R1, R2, V1, V2, R2c, div };
}
T.PD8 = R => {
  const { Rm, f, x1, x2, E, Rf, R1, R2, V1, V2, R2c, div } = sensorGraphQ(R, true), c = leftBatt(new Circuit(), E);
  c.wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  c.add('resistor', 'F', [3, 0], [3, 2], { R: Rf * 1000, text: val(Rf, kO) }).add('ldr', 'L', [3, 2], [3, 4], { R: R1 * 1000, name: 'L', side: 'left' }).add('voltmeter', 'V', [5, 2], [5, 4]);
  const g = graph({ x: [0, 1000, 200], y: [0, Rm, Rm / 5], xl: 'light intensity / lux', yl: 'resistance / k' + OHM, curves: [{ f, from: 0, to: 1000 }] });
  return { stem: `<b>Figure 1</b> shows a light-sensing circuit. A light-dependent resistor <b>L</b> is connected in series with ${art(Rf)} ${val(Rf, kO)} resistor and a battery of emf ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance.<br><b>Figure 2</b> shows how the resistance of <b>L</b> varies with light intensity.`, circuit: c, graph: g,
    parts: [
      { q: `Use <b>Figure 2</b> to determine the resistance of <b>L</b> when the light intensity is ${x1} lux.`, marks: 1, ans: R1, unit: kO, tol: .07, ms: `${sig(R1)} ${kO} ✓ (allow ± 1 small square)` },
      { q: `Calculate the reading on the voltmeter when the light intensity is ${x1} lux.`, marks: 2, ans: V1, unit: 'V', tol: .06, ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(R1)} / (${sig(Rf)} + ${sig(R1)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(V1)} V`)} ✓` },
      { q: `The light intensity is increased until the voltmeter reads ${val(V2, 'V', 3)}.<br>Determine the light intensity.`, marks: 3, ans: x2, unit: 'lux', abs: 60, ms: `pd across the ${val(Rf, kO)} resistor = ${sig(E - V2, 3)} V, so current = ${sig((E - V2) / Rf, 3)} mA ✓<br>${eq(`<i>R</i><sub>L</sub> = ${sig(V2, 3)} / ${sig((E - V2) / Rf, 3)} = ${sig(R2c, 3)} ${kO}`)} ✓<br>Light intensity read from <b>Figure 2</b> = ${x2} lux ✓ (allow ± 50 lux)` },
      { q: 'Explain why the voltmeter reading decreases as the light intensity increases.', marks: 2, ms: `The resistance of the LDR decreases as the light intensity increases ✓<br>The LDR takes a smaller share of the emf (or the current increases so the pd across the ${val(Rf, kO)} resistor increases) ✓` }],
    checks: [['V', 'V', V1], ['V', 'V', div(R2), { L: { R: R2 * 1000 } }]] };
};

T.PD9 = R => {
  const sc = R.pick([1, 1000]), uR = sc === 1 ? OHM : kO, uI = sc === 1 ? 'A' : 'mA', uP = sc === 1 ? 'W' : 'mW';
  const q = find(() => { const r = [0, 0, 0].map(() => R.pick(RS)), E = R.pick([6, 9, 12, 15, 24]); return { r, E, I: E / (r[0] + r[1] + r[2]) }; }, q => new Set(q.r).size === 3 && isNice(q.I));
  const { r, E, I } = q, c = leftBatt(new Circuit(), E, 6);
  c.wire([0, 0], [3, 0]).wire([0, 6], [6.8, 6]).wire([3, 2], [6.8, 2]).wire([3, 4], [5, 4]);
  r.forEach((x, i) => c.add('resistor', 'R' + (i + 1), [3, 2 * i], [3, 2 * i + 2], { R: x * sc, text: val(x, uR), side: 'left' }));
  c.add('voltmeter', 'V1', [5, 2], [5, 4], { name: 'V_1' }).add('voltmeter', 'V2', [6.8, 2], [6.8, 6], { name: 'V_2' });
  return { stem: `<b>Figure 1</b> shows three resistors connected in series across a battery of emf ${val(E, 'V')} and negligible internal resistance. The two voltmeters have very large resistances.`, circuit: c,
    parts: [
      { q: 'Calculate the current in the battery.', marks: 2, ans: I, unit: uI, ms: `${eq(`<i>R</i><sub>total</sub> = ${sig(r[0])} + ${sig(r[1])} + ${sig(r[2])} = ${ansStr(r[0] + r[1] + r[2])} ${uR}`)} ✓<br>${eq(`<i>I</i> = ${sig(E)} / ${ansStr(r[0] + r[1] + r[2])} = ${ansStr(I)} ${uI}`)} ✓` },
      { q: 'Calculate the reading on <b>V<sub>1</sub></b>.', marks: 1, ans: I * r[1], unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(I)} × ${sig(r[1])} = ${ansStr(I * r[1])} V`)} ✓` },
      { q: 'Calculate the reading on <b>V<sub>2</sub></b>.', marks: 1, ans: I * (r[1] + r[2]), unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(I)} × (${sig(r[1])} + ${sig(r[2])}) = ${ansStr(I * (r[1] + r[2]))} V`)} ✓` },
      { q: `Calculate the power dissipated in the ${val(r[0], uR)} resistor.`, marks: 2, ans: I * I * r[0], unit: uP, ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${ansStr(I)}<sup>2</sup> × ${sig(r[0])}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(I * I * r[0])} ${uP}`)} ✓` },
      { q: 'State how the pds across the three resistors are related to the emf of the battery, and name the conservation law that this shows.', marks: 2, ms: `The sum of the pds across the three resistors equals the emf ✓<br>Conservation of energy ✓`, guide: ['Allow: the energy transferred per coulomb by the battery equals the energy transferred per coulomb in the resistors.', 'Do not accept “conservation of charge” for the second mark.'] }],
    checks: [['I', 'R1', I / sc], ['V', 'V1', I * r[1]], ['V', 'V2', I * (r[1] + r[2])]] };
};

T.PD10 = R => {
  const q = find(() => { const [Vl, Pl] = R.pick(LAMPS), r2 = R.pick(RS), E = R.pick(ES), Il = Pl / Vl, I2 = Vl / r2; return { Vl, Pl, r2, E, Il, I2, r1: (E - Vl) / (Il + I2) }; }, q => q.E >= q.Vl + 2 && isNice(q.Il, 2) && isNice(q.I2, 2) && isNice(q.r1, 2));
  const { Vl, Pl, r2, E, Il, I2, r1 } = q, c = leftBatt(new Circuit(), E);
  c.wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  c.add('resistor', 'R1', [3, 0], [3, 2], { R: r1, name: 'R_1' }).add('resistor', 'R2', [3, 2], [3, 4], { R: r2, text: val(r2, OHM), side: 'left' }).add('lamp', 'L', [5, 2], [5, 4], { R: Vl * Vl / Pl, name: 'L' });
  return { stem: `<b>Figure 1</b> shows a potential divider used to operate a filament lamp <b>L</b> from a battery of emf ${val(E, 'V')} and negligible internal resistance. The lamp operates at normal brightness when the pd across it is ${val(Vl, 'V')} and it dissipates ${val(Pl, 'W')}. The resistance of <b>R<sub>1</sub></b> is chosen so that the lamp is at normal brightness.`, circuit: c,
    parts: [
      { q: 'Calculate the current in the lamp.', marks: 1, ans: Il, unit: 'A', ms: `${eq(`<i>I</i> = <i>P</i>/<i>V</i> = ${sig(Pl)} / ${sig(Vl)} = ${ansStr(Il)} A`)} ✓` },
      { q: `Calculate the current in the ${val(r2, OHM)} resistor.`, marks: 1, ans: I2, unit: 'A', ms: `${eq(`<i>I</i> = ${sig(Vl)} / ${sig(r2)} = ${ansStr(I2)} A`)} ✓ (same pd as the lamp)` },
      { q: 'Calculate the resistance of <b>R<sub>1</sub></b>.', marks: 3, ans: r1, unit: OHM, ms: `Current in <b>R<sub>1</sub></b> = ${ansStr(Il)} + ${ansStr(I2)} = ${ansStr(Il + I2)} A ✓<br>pd across <b>R<sub>1</sub></b> = ${sig(E)} − ${sig(Vl)} = ${ansStr(E - Vl)} V ✓<br>${eq(`<i>R</i><sub>1</sub> = ${ansStr(E - Vl)} / ${ansStr(Il + I2)} = ${ansStr(r1)} ${OHM}`)} ✓` },
      { q: `The ${val(r2, OHM)} resistor is removed from the circuit.<br>State and explain the effect on the brightness of the lamp.`, marks: 2, ms: `The lamp is brighter than normal ✓<br>The resistance of the lower section increases, so it takes a larger share of the emf (or the current in <b>R<sub>1</sub></b> falls so the pd across it falls) ✓` }],
    checks: [['V', 'L', Vl], ['I', 'L', Il], ['I', 'R2', I2], ['I', 'R1', Il + I2]] };
};

T.PD11 = R => {
  const LV = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  const q = find(() => { const r1 = R.pick(LV), r2 = R.pick(LV), E = R.pick([5, 6, 9, 12, 15]); return { r1, r2, E, I: E / (r1 + r2) }; }, q => q.r1 !== q.r2 && isNice(q.I) && isNice(q.I * q.r2));
  const { r1, r2, E, I } = q, V = I * r2, c = leftBatt(new Circuit(), E);
  c.add('ammeter', 'A', [0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  c.add('resistor', 'R1', [3, 0], [3, 2], { R: r1 * 1000, name: 'R_1' }).add('resistor', 'R2', [3, 2], [3, 4], { R: r2 * 1000, name: 'R_2', side: 'left' }).add('voltmeter', 'V', [5, 2], [5, 4]);
  return { stem: `<b>Figure 1</b> shows a potential divider connected to a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance and reads ${val(I, 'mA', 3)}. The voltmeter has a very large resistance and reads ${val(V, 'V', 3)}.`, circuit: c,
    parts: [
      { q: 'Calculate the resistance of <b>R<sub>2</sub></b>.', marks: 1, ans: r2, unit: kO, ms: `${eq(`<i>R</i><sub>2</sub> = ${sig(V, 3)} / ${sig(I, 3)} = ${ansStr(r2)} ${kO}`)} ✓ (V ÷ mA gives k${OHM})` },
      { q: 'Calculate the pd across <b>R<sub>1</sub></b>.', marks: 1, ans: E - V, unit: 'V', ms: `${eq(`${sig(E)} − ${sig(V, 3)} = ${ansStr(E - V)} V`)} ✓` },
      { q: 'Calculate the resistance of <b>R<sub>1</sub></b>.', marks: 1, ans: r1, unit: kO, ms: `${eq(`<i>R</i><sub>1</sub> = ${ansStr(E - V)} / ${sig(I, 3)} = ${ansStr(r1)} ${kO}`)} ✓` },
      { q: 'Calculate the total power dissipated in the two resistors.', marks: 2, ans: E * I, unit: 'mW', ms: `${eq(`<i>P</i> = <i>εI</i> = ${sig(E)} × ${sig(I, 3)}`)} (current in mA gives power in mW) ✓<br>${eq(`<i>P</i> = ${ansStr(E * I)} mW`)} ✓` }],
    checks: [['I', 'A', I / 1000], ['V', 'V', V]] };
};

T.PD12 = R => {
  const LV = [1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60];
  const q = find(() => { const E = R.pick([5, 6, 9, 12]), rl = R.pick(LV), rb = R.pick(LV), vt = R.pick([2, 2.5, 3, 4, 4.5, 6, 7.5, 8]); const Rv = rl * (E - vt) / vt; return { E, rl, rb, vt, Rv, v2: E * rb / (Rv + rb) }; }, q => q.vt < q.E - 1 && q.rb <= q.rl / 3 && isNice(q.Rv, 2) && isNice(q.v2));
  const { E, rl, rb, vt, Rv, v2 } = q, c = leftBatt(new Circuit(), E);
  c.wire([0, 0], [3, 0]).wire([0, 4], [5, 4]).wire([3, 2], [5, 2]);
  c.add('variable', 'VR', [3, 0], [3, 2], { R: Rv * 1000, name: 'R' }).add('ldr', 'L', [3, 2], [3, 4], { R: rl * 1000, name: 'L', side: 'left' }).add('voltmeter', 'V', [5, 2], [5, 4]);
  return { stem: `<b>Figure 1</b> shows part of a circuit that switches on a lamp automatically when it gets dark. A light-dependent resistor <b>L</b> is connected in series with a variable resistor <b>R</b> and a battery of emf ${val(E, 'V')} and negligible internal resistance. The voltmeter has a very large resistance.<br>The lamp must switch on when the pd across <b>L</b> rises to ${val(vt, 'V')}. At the light level required, the resistance of <b>L</b> is ${val(rl, kO)}.`, circuit: c,
    parts: [
      { q: `Calculate the resistance of <b>R</b> needed so that the pd across <b>L</b> is ${val(vt, 'V')} at this light level.`, marks: 3, ans: Rv, unit: kO, ms: `Current = ${sig(vt)} / ${sig(rl)} = ${ansStr(vt / rl)} mA ✓<br>pd across <b>R</b> = ${sig(E)} − ${sig(vt)} = ${ansStr(E - vt)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - vt)} / ${ansStr(vt / rl)} = ${ansStr(Rv)} ${kO}`)} ✓` },
      { q: `In bright light the resistance of <b>L</b> is ${val(rb, kO)}.<br>Calculate the reading on the voltmeter in bright light, with <b>R</b> unchanged.`, marks: 2, ans: v2, unit: 'V', ms: `${eq(`<i>V</i> = ${sig(E)} × ${sig(rb)} / (${ansStr(Rv)} + ${sig(rb)})`)} ✓<br>${eq(`<i>V</i> = ${ansStr(v2)} V`)} ✓` },
      { q: 'The resistance of <b>R</b> is increased.<br>State and explain how this changes the light level at which the lamp switches on.', marks: 2, ms: `The lamp switches on at a lower light level (when it is darker) ✓<br><b>L</b> now needs a larger resistance to take the same share of the emf, and its resistance is larger when the light intensity is lower ✓` }],
    checks: [['V', 'V', vt], ['V', 'V', v2, { L: { R: rb * 1000 } }]] };
};

T.EMF9 = R => {
  const { E, r, k } = find(() => ({ E: R.pick([1.5, 3, 4.5, 6, 9, 12]), r: R.pick([.5, 1, 1.5, 2, 2.5, 4]), k: R.pick([.5, 2, 3, 4]) }), q => isNice(q.r * q.k, 2)), R1 = r * k, P = x => E * E * x / Math.pow(x + r, 2);
  const c = emfCircuit(E, r, true, c => c.add('ammeter', 'A', [0, 3.2], [2.5, 3.2]).add('variable', 'VR', [2.5, 3.2], [5, 3.2], { R: R1, name: 'R' }));
  return { stem: `<b>Figure 1</b> shows a cell of emf ${val(E, 'V')} and internal resistance ${val(r, OHM)} connected to a variable resistor <b>R</b>. The ammeter has negligible resistance and the voltmeter has a very large resistance.`, circuit: c,
    parts: [
      { q: `Calculate the power dissipated in <b>R</b> when its resistance is ${val(R1, OHM)}.`, marks: 3, ans: P(R1), unit: 'W', ms: `${eq(`<i>I</i> = ${sig(E)} / (${sig(R1)} + ${sig(r)}) = ${ansStr(E / (R1 + r))} A`)} ✓<br>${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${x4(E / (R1 + r))}<sup>2</sup> × ${sig(R1)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(P(R1))} W`)} ✓` },
      { q: `Calculate the power dissipated in <b>R</b> when its resistance is ${val(r, OHM)}.`, marks: 2, ans: P(r), unit: 'W', ms: `${eq(`<i>I</i> = ${sig(E)} / (${sig(r)} + ${sig(r)}) = ${ansStr(E / (2 * r))} A`)} ✓<br>${eq(`<i>P</i> = ${x4(E / (2 * r))}<sup>2</sup> × ${sig(r)} = ${ansStr(P(r))} W`)} ✓ (this is the maximum power the cell can deliver)` },
      { q: `Calculate the percentage of the power produced by the cell that is dissipated in <b>R</b> when its resistance is ${val(r, OHM)}.`, marks: 1, ans: 50, unit: '%', ms: `50 % ✓ (the same current is in equal resistances, so half the power is dissipated in the internal resistance)` },
      { q: 'Explain why the power dissipated in <b>R</b> becomes very small when the resistance of <b>R</b> is made very large.', marks: 2, ms: `The current becomes very small because the total resistance is very large ✓<br>The pd across <b>R</b> cannot exceed the emf, so <i>P</i> = <i>VI</i> (≈ <i>ε</i><sup>2</sup>/<i>R</i>) tends to zero ✓` }],
    checks: [['I', 'A', E / (R1 + r)], ['V', 'V', E * R1 / (R1 + r)], ['I', 'A', E / (2 * r), { VR: { R: r } }]] };
};

T.EMF10 = R => {
  const q = find(() => { const N = R.pick([3, 4, 6]), e = R.pick([1.2, 1.5, 2]), rc = R.pick([.1, .2, .25, .5]), rt = R.pick([2, 2.5, 3, 4, 5, 6, 7.5, 8, 10, 12, 15]); return { N, e, rc, Rx: rt - N * rc, I: N * e / rt, I2: (N - 2) * e / rt }; }, q => q.Rx >= 2 * q.N * q.rc && isNice(q.I) && isNice(q.I2) && isNice(q.Rx, 2));
  const { N, e, rc, Rx, I, I2 } = q, E = N * e, r = N * rc;
  const c = emfCircuit(E, r, 'none', c => c.add('ammeter', 'A', [0, 3.2], [2.5, 3.2]).add('resistor', 'R', [2.5, 3.2], [5, 3.2], { R: Rx, text: val(Rx, OHM) }), false, 'battery');
  const words = { 3: 'three', 4: 'four', 6: 'six' }[N];
  return { stem: `<b>Figure 1</b> shows a battery connected to ${art(Rx)} ${val(Rx, OHM)} resistor. The battery, shown inside the dashed box with its total internal resistance, is made from ${words} identical cells connected in series. Each cell has an emf of ${val(e, 'V')} and an internal resistance of ${val(rc, OHM)}. The ammeter has negligible resistance and the voltmeter has a very large resistance.`, circuit: c,
    parts: [
      { q: 'Calculate the total emf of the battery.', marks: 1, ans: E, unit: 'V', ms: `${eq(`${N} × ${sig(e)} = ${ansStr(E)} V`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 2, ans: I, unit: 'A', ms: `Total internal resistance = ${N} × ${sig(rc)} = ${ansStr(r)} ${OHM} ✓<br>${eq(`<i>I</i> = ${ansStr(E)} / (${sig(Rx)} + ${ansStr(r)}) = ${ansStr(I)} A`)} ✓` },
      { q: 'Calculate the reading on the voltmeter.', marks: 1, ans: I * Rx, unit: 'V', ms: `${eq(`<i>V</i> = ${ansStr(I)} × ${sig(Rx)} = ${ansStr(I * Rx)} V`)} ✓` },
      { q: 'One of the cells is accidentally connected the wrong way round.<br>Calculate the new reading on the ammeter.', marks: 2, ans: I2, unit: 'A', ms: `The reversed cell opposes the others, so net emf = ${N - 2} × ${sig(e)} = ${ansStr((N - 2) * e)} V; the total resistance is unchanged ✓<br>${eq(`<i>I</i> = ${ansStr((N - 2) * e)} / (${sig(Rx)} + ${ansStr(r)}) = ${ansStr(I2)} A`)} ✓` }],
    checks: [['I', 'A', I], ['V', 'V', I * Rx], ['I', 'A', I2, { E: { E: (N - 2) * e } }]] };
};

T.EMF11 = R => {
  const L = EMFV();
  const q = find(() => { const E = R.pick(L.es), r = R.pick(L.rs), a = R.pick(L.rt), b = R.pick(L.rt); return { E, r, R1: a - r, R2: b - r, V1: E * (a - r) / a, V2: E * (b - r) / b }; }, q => q.R1 > q.R2 * 1.4 && q.R2 > q.r && isNice(q.R1, 2) && isNice(q.R2, 2) && isNice(q.V1) && isNice(q.V2));
  const { E, r, R1, R2, V1, V2 } = q, I1 = V1 / R1, I2 = V2 / R2, f3 = x => sig(x, 3);
  const c = emfCircuit(E, r, false, c => c.add('variable', 'VR', [0, 3.2], [5, 3.2], { R: R1, name: 'R' }));
  return { stem: `<b>Figure 1</b> shows a cell of emf <i>ε</i> and internal resistance <i>r</i> connected to a resistance box <b>R</b>. The voltmeter has a very large resistance. The voltmeter reading is recorded for two values of <b>R</b>.` +
      `<table class="data"><thead><tr><th>Resistance of R / ${OHM}</th><th>Voltmeter reading / V</th></tr></thead><tbody><tr><td>${sig(R1)}</td><td>${f3(V1)}</td></tr><tr><td>${sig(R2)}</td><td>${f3(V2)}</td></tr></tbody></table>`, circuit: c,
    parts: [
      { q: `Calculate the current in the cell when the resistance of <b>R</b> is ${val(R1, OHM)}.`, marks: 1, ans: I1, unit: 'A', ms: `${eq(`<i>I</i> = ${f3(V1)} / ${sig(R1)} = ${ansStr(I1)} A`)} ✓` },
      { q: `Calculate the current in the cell when the resistance of <b>R</b> is ${val(R2, OHM)}.`, marks: 1, ans: I2, unit: 'A', ms: `${eq(`<i>I</i> = ${f3(V2)} / ${sig(R2)} = ${ansStr(I2)} A`)} ✓` },
      { q: 'Calculate the internal resistance <i>r</i> of the cell.', marks: 3, ans: r, unit: OHM, ms: `${eq(`<i>ε</i> = <i>V</i> + <i>Ir</i>`)} for both: ${eq(`${f3(V1)} + ${ansStr(I1)}<i>r</i> = ${f3(V2)} + ${ansStr(I2)}<i>r</i>`)} ✓<br>${eq(`<i>r</i> = (${f3(V1)} − ${f3(V2)}) / (${x4(I2)} − ${x4(I1)})`)} ✓<br>${eq(`<i>r</i> = ${ansStr(r)} ${OHM}`)} ✓` },
      { q: 'Calculate the emf <i>ε</i> of the cell.', marks: 1, ans: E, unit: 'V', ms: `${eq(`<i>ε</i> = ${f3(V1)} + ${x4(I1)} × ${ansStr(r)} = ${ansStr(E)} V`)} ✓` }],
    checks: [['V', 'V', V1], ['V', 'V', V2, { VR: { R: R2 } }], ['I', 'VR', I1]] };
};

T.EMF12 = R => {
  const q = find(() => { const E1 = R.pick([9, 12, 15, 18, 24]), E2 = R.pick([6, 9, 12]), r = R.pick([.5, 1, 1.5, 2]), Rx = R.pick(RS); return { E1, E2, r, Rx, I: (E1 - E2) / (Rx + r) }; }, q => q.E1 > q.E2 && isNice(q.I) && isNice(q.Rx + q.r, 2) && q.I <= 3 && q.Rx !== q.r);
  const { E1, E2, r, Rx, I } = q, t = R.pick([10, 20, 30]), c = new Circuit();
  c.add('battery', 'B', [0, 0], [5, 0], { E: E1, text: val(E1, 'V') }); rails(c, 5, 3); c.box(1.5, 1.95, 4.75, 3.55);
  c.add('resistor', 'R', [0, 3], [1.6, 3], { R: Rx, text: val(Rx, OHM) }).add('cell', 'C', [1.6, 3], [2.8, 3], { E: E2, text: val(E2, 'V') }).add('resistor', 'r', [2.8, 3], [5, 3], { R: r, text: val(r, OHM) });
  return { stem: `<b>Figure 1</b> shows a rechargeable battery, drawn as a single cell inside the dashed box, being charged by ${art(E1)} ${val(E1, 'V')} supply of negligible internal resistance. The rechargeable battery has an emf of ${val(E2, 'V')} and an internal resistance of ${val(r, OHM)}. ${art(Rx, 1)} ${val(Rx, OHM)} resistor limits the charging current.`, circuit: c,
    parts: [
      { q: 'Calculate the charging current.', marks: 3, ans: I, unit: 'A', ms: `The two emfs are in opposition: net emf = ${sig(E1)} − ${sig(E2)} = ${ansStr(E1 - E2)} V ✓<br>Total resistance = ${sig(Rx)} + ${sig(r)} = ${ansStr(Rx + r)} ${OHM} ✓<br>${eq(`<i>I</i> = ${ansStr(E1 - E2)} / ${ansStr(Rx + r)} = ${ansStr(I)} A`)} ✓` },
      { q: 'Calculate the pd across the terminals of the rechargeable battery while it is charging.', marks: 2, ans: E2 + I * r, unit: 'V', ms: `${eq(`<i>V</i> = <i>ε</i> + <i>Ir</i> = ${sig(E2)} + ${ansStr(I)} × ${sig(r)}`)} (or ${sig(E1)} − <i>I</i> × ${sig(Rx)}) ✓<br>${eq(`<i>V</i> = ${ansStr(E2 + I * r)} V`)} ✓` },
      { q: `Calculate the power dissipated in the ${val(Rx, OHM)} resistor.`, marks: 1, ans: I * I * Rx, unit: 'W', ms: `${eq(`<i>P</i> = ${ansStr(I)}<sup>2</sup> × ${sig(Rx)} = ${ansStr(I * I * Rx)} W`)} ✓` },
      { q: `Calculate the energy stored as chemical energy in the rechargeable battery in ${t} minutes.`, marks: 2, ans: E2 * I * t * 60, unit: 'J', ms: `${eq(`<i>E</i> = <i>εIt</i> = ${sig(E2)} × ${ansStr(I)} × ${t * 60}`)} ✓<br>${eq(`<i>E</i> = ${ansStr(E2 * I * t * 60)} J`)} ✓` }],
    checks: [['I', 'R', I], ['V', 'R', I * Rx], ['V', 'r', I * r]] };
};

T.EMF13 = R => {
  const q = find(() => { const [Vl, Pl] = R.pick(LAMPS), r = R.pick([.2, .4, .5, .8, 1, 1.2, 2]), Il = Pl / Vl, E = Vl + Il * r, Rl = Vl * Vl / Pl; return { Vl, Pl, r, Il, E, Rl, v2: E * (Rl / 2) / (Rl / 2 + r) }; }, q => isNice(q.Il, 2) && isNice(q.E) && isNice(q.Rl, 2) && q.Rl >= 3 * q.r);
  const { Vl, Pl, r, Il, E, Rl, v2 } = q;
  const c = emfCircuit(E, r, 'E', c => c.add('lamp', 'L1', [0, 1.6], [5, 1.6], { R: Rl, name: 'L_1' }).add('switch', 'S', [0, 3.2], [2, 3.2], { state: 'open', name: 'S' }).add('lamp', 'L2', [2, 3.2], [5, 3.2], { R: Rl, name: 'L_2' }), true, 'battery');
  return { stem: `<b>Figure 1</b> shows a battery of emf ${val(E, 'V', 3)} and internal resistance <i>r</i> connected to a filament lamp <b>L<sub>1</sub></b>. With switch <b>S</b> open, <b>L<sub>1</sub></b> is at normal brightness: the pd across it is ${val(Vl, 'V')} and it dissipates ${val(Pl, 'W')}. Lamp <b>L<sub>2</sub></b> is identical to <b>L<sub>1</sub></b>.`, circuit: c,
    parts: [
      { q: 'Calculate the current in <b>L<sub>1</sub></b> when <b>S</b> is open.', marks: 1, ans: Il, unit: 'A', ms: `${eq(`<i>I</i> = <i>P</i>/<i>V</i> = ${sig(Pl)} / ${sig(Vl)} = ${ansStr(Il)} A`)} ✓` },
      { q: 'Calculate the internal resistance <i>r</i> of the battery.', marks: 2, ans: r, unit: OHM, ms: `Lost volts = ${sig(E, 3)} − ${sig(Vl)} = ${ansStr(E - Vl)} V ✓<br>${eq(`<i>r</i> = ${ansStr(E - Vl)} / ${ansStr(Il)} = ${ansStr(r)} ${OHM}`)} ✓` },
      { q: `<b>S</b> is now closed. Assume that the resistance of each lamp stays at ${val(Rl, OHM)}.<br>Calculate the pd across the lamps.`, marks: 3, ans: v2, unit: 'V', ms: `Two lamps in parallel: <i>R</i> = ${sig(Rl)} / 2 = ${ansStr(Rl / 2)} ${OHM} ✓<br>${eq(`<i>I</i> = ${sig(E, 3)} / (${ansStr(Rl / 2)} + ${ansStr(r)}) = ${ansStr(E / (Rl / 2 + r))} A`)} ✓<br>${eq(`<i>V</i> = ${ansStr(E / (Rl / 2 + r))} × ${ansStr(Rl / 2)} = ${ansStr(v2)} V`)} ✓` },
      { q: 'State and explain what happens to the brightness of <b>L<sub>1</sub></b> when <b>S</b> is closed.', marks: 2, ms: `<b>L<sub>1</sub></b> becomes dimmer ✓<br>The current in the battery increases, so the lost volts increase and the terminal pd (the pd across each lamp) falls ✓` }],
    checks: [['V', 'L1', Vl], ['I', 'L1', Il], ['V', 'L1', v2, { S: { state: 'closed' } }]] };
};

const LAMPG = [{ Vm: 6, Im: .5, xM: 1, yM: .1 }, { Vm: 12, Im: 2, xM: 2, yM: .5 }, { Vm: 6, Im: .3, xM: 1, yM: .05 }, { Vm: 12, Im: 1, xM: 2, yM: .2 }, { Vm: 12, Im: .5, xM: 2, yM: .1 }, { Vm: 6, Im: 1, xM: 1, yM: .2 }];
const lampGraph = (o, f, extra = []) => graph({ x: [0, o.Vm, o.xM], y: [0, o.Im, o.yM], xl: 'pd / V', yl: 'current / A', curves: [{ f, from: 0, to: o.Vm }].concat(extra) });

T.IV8 = R => {
  const o = R.pick(LAMPG), f = lampF(o.Vm, o.Im), V0 = o.xM * R.pick([1, 2, 3]), I0 = Number(f(V0).toPrecision(2)), E = 2 * V0, Rl = V0 / I0;
  const c = topRow(new Circuit(), E, 5); rails(c, 5, 2.4);
  c.add('lamp', 'L1', [0, 2.4], [2.5, 2.4], { R: Rl }).add('lamp', 'L2', [2.5, 2.4], [5, 2.4], { R: Rl });
  return { stem: `<b>Figure 1</b> shows two identical filament lamps connected in series with a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.<br><b>Figure 2</b> shows the current–pd characteristic for one of the lamps.`, circuit: c, graph: lampGraph(o, f),
    parts: [
      { q: 'State the pd across each lamp.', marks: 1, ans: V0, unit: 'V', ms: `${val(V0, 'V')} ✓ (identical lamps in series share the emf equally)` },
      { q: 'Use <b>Figure 2</b> to determine the reading on the ammeter.', marks: 1, ans: I0, unit: 'A', tol: .06, ms: `${val(I0, 'A')} ✓ (allow ± 1 small square)` },
      { q: 'Calculate the resistance of one lamp in this circuit.', marks: 1, ans: Rl, unit: OHM, tol: .07, ms: `${eq(`<i>R</i> = ${sig(V0)} / ${sig(I0)} = ${ansStr(Rl)} ${OHM}`)} ✓` },
      { q: 'Calculate the total power dissipated in the two lamps.', marks: 2, ans: E * I0, unit: 'W', tol: .07, ms: `${eq(`<i>P</i> = <i>εI</i> = ${sig(E)} × ${sig(I0)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(E * I0)} W`)} ✓` },
      { q: 'One lamp is removed and the remaining lamp is connected directly across the battery.<br>Explain why the current is less than double the value in the series circuit.', marks: 2, ms: `The pd across the lamp doubles, so it becomes hotter and its resistance increases ✓<br>Current is not proportional to pd for a filament lamp (the graph curves towards the pd axis) ✓` }],
    checks: [['I', 'A', I0], ['V', 'L1', V0]] };
};

T.IV9 = R => {
  const o = R.pick(LAMPG), f = lampF(o.Vm, o.Im), E = o.xM * R.pick([2, 3, 4, 5, 6]), Il = Number(f(E).toPrecision(2));
  const Rx = find(() => R.pick([4, 5, 6, 8, 10, 12, 15, 20, 24, 30, 40, 60]), r => isNice(E / r, 2) && E / r <= 3 * o.Im && E / r >= o.Im / 5), Ir = E / Rx;
  const c = topRow(new Circuit(), E, 5); rails(c, 5, 3.2);
  c.add('lamp', 'L', [0, 1.6], [5, 1.6], { R: E / Il }).add('resistor', 'R', [0, 3.2], [5, 3.2], { R: Rx, text: val(Rx, OHM) });
  return { stem: `<b>Figure 1</b> shows a filament lamp connected in parallel with ${art(Rx)} ${val(Rx, OHM)} resistor. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.<br><b>Figure 2</b> shows the current–pd characteristic for the lamp.`, circuit: c, graph: lampGraph(o, f),
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the current in the lamp.', marks: 1, ans: Il, unit: 'A', tol: .06, ms: `pd across lamp = ${val(E, 'V')}, so current = ${val(Il, 'A')} ✓ (allow ± 1 small square)` },
      { q: `Calculate the current in the ${val(Rx, OHM)} resistor.`, marks: 1, ans: Ir, unit: 'A', ms: `${eq(`<i>I</i> = ${sig(E)} / ${sig(Rx)} = ${ansStr(Ir)} A`)} ✓` },
      { q: 'Calculate the reading on the ammeter.', marks: 1, ans: Il + Ir, unit: 'A', tol: .05, ms: `${eq(`${sig(Il)} + ${ansStr(Ir)} = ${ansStr(Il + Ir)} A`)} ✓` },
      { q: 'Calculate the total resistance of the lamp and resistor in parallel.', marks: 2, ans: E / (Il + Ir), unit: OHM, tol: .05, ms: `${eq(`<i>R</i> = <i>V</i>/<i>I</i><sub>total</sub> = ${sig(E)} / ${ansStr(Il + Ir)}`)} ✓<br>${eq(`<i>R</i> = ${ansStr(E / (Il + Ir))} ${OHM}`)} ✓` }],
    checks: [['I', 'A', Il + Ir], ['I', 'R', Ir]] };
};

T.IV10 = R => {
  const { o, f, Rr, V0, I0, Vr } = find(() => { const o = R.pick(LAMPG), f = lampF(o.Vm, o.Im), Rr = o.Vm / o.Im * R.pick([1, 1.25, 2]), V0 = o.xM * R.pick([1, 2, 3]), I0 = Number(f(V0).toPrecision(2)); return { o, f, Rr, V0, I0, Vr: I0 * Rr }; }, q => q.Vr <= q.o.Vm * .97 && isNice(q.Vr)), E = V0 + Vr;
  const c = new Circuit(); c.add('battery', 'B', [0, 0], [2.5, 0], { E }).add('ammeter', 'A', [2.5, 0], [5, 0]); rails(c, 5, 2.4);
  c.add('resistor', 'R', [0, 2.4], [2.5, 2.4], { R: Rr, name: 'R' }).add('lamp', 'L', [2.5, 2.4], [5, 2.4], { R: V0 / I0, name: 'L' });
  const g = lampGraph(Object.assign({}, o), f, [{ f: v => v / Rr, from: 0, to: o.Vm, name: 'R', at: [o.Vm * .9, o.Vm * .9 / Rr - o.yM * .55] }]);
  return { stem: `<b>Figure 1</b> shows a filament lamp <b>L</b> connected in series with a resistor <b>R</b> and a battery of negligible internal resistance. The ammeter has negligible resistance and reads ${val(I0, 'A')}.<br><b>Figure 2</b> shows the current–pd characteristics for the lamp (the curve) and for the resistor (the straight line labelled <b>R</b>).`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the pd across the lamp.', marks: 1, ans: V0, unit: 'V', abs: o.xM * .25, ms: `${val(V0, 'V')} ✓ (allow ± 1 small square)` },
      { q: 'Use <b>Figure 2</b> to determine the pd across <b>R</b>.', marks: 1, ans: Vr, unit: 'V', abs: o.xM * .25, ms: `${ansStr(Vr)} V ✓ (allow ± 1 small square)` },
      { q: 'Calculate the emf of the battery.', marks: 1, ans: E, unit: 'V', abs: o.xM * .5, ms: `${eq(`${sig(V0)} + ${ansStr(Vr)} = ${ansStr(E)} V`)} ✓` },
      { q: 'Use <b>Figure 2</b> to determine the resistance of <b>R</b>.', marks: 2, ans: Rr, unit: OHM, tol: .06, ms: `Values read from the straight line, using as much of the line as possible ✓<br>${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${ansStr(Rr)} ${OHM}`)} ✓` }],
    checks: [['I', 'A', I0], ['V', 'R', Vr], ['V', 'L', V0]] };
};

T.IV11 = R => {
  const kind = R.pick([0, 1, 2]), Vs = R.pick([[1, 2, 4], [2, 4, 6], [1.5, 3, 6], [2, 6, 12], [3, 6, 9]]), k = R.pick([4, 5, 8, 10, 12, 20, 25, 40]);
  const f = [v => v / k, v => v / (k * (1 + v / Vs[2])), v => v * (1 + v / Vs[2]) / (2 * k)][kind];
  const Is = Vs.map(v => Number(f(v).toPrecision(3))), r1 = Vs[0] / Is[0], r3 = Vs[2] / Is[2], c = new Circuit();
  c.add('battery', 'B', [0, 0], [2.5, 0], { E: 15 }).add('variable', 'VR', [2.5, 0], [5, 0], { R: 10 }).wire([0, 0], [0, 2.8]).wire([5, 0], [5, 4.1]).wire([2.5, 2.8], [2.5, 4.1]);
  c.add('ammeter', 'A', [0, 2.8], [2.5, 2.8]).add('xbox', 'X', [2.5, 2.8], [5, 2.8], { R: r1 }).add('voltmeter', 'V', [2.5, 4.1], [5, 4.1]);
  const opts = ['X is an ohmic conductor', 'X is non-ohmic and its resistance increases as the pd increases', 'X is non-ohmic and its resistance decreases as the pd increases'];
  return { stem: `A student uses the circuit in <b>Figure 1</b> to investigate component <b>X</b>. The ammeter has negligible resistance and the voltmeter has a very large resistance. The student adjusts the variable resistor and records the readings shown in <b>Table 1</b>.` +
      `<table class="data"><thead><tr><th>Voltmeter reading / V</th><th>Ammeter reading / A</th></tr></thead><tbody>${Vs.map((v, i) => `<tr><td>${sig(v, 3)}</td><td>${sig(Is[i], 3)}</td></tr>`).join('')}</tbody></table>`, circuit: c,
    parts: [
      { q: `Calculate the resistance of <b>X</b> when the pd across it is ${val(Vs[0], 'V', 3)}.`, marks: 1, ans: r1, unit: OHM, ms: `${eq(`<i>R</i> = ${sig(Vs[0], 3)} / ${sig(Is[0], 3)} = ${ansStr(r1)} ${OHM}`)} ✓` },
      { q: `Calculate the resistance of <b>X</b> when the pd across it is ${val(Vs[2], 'V', 3)}.`, marks: 1, ans: r3, unit: OHM, ms: `${eq(`<i>R</i> = ${sig(Vs[2], 3)} / ${sig(Is[2], 3)} = ${ansStr(r3)} ${OHM}`)} ✓` },
      { q: 'Which statement about <b>X</b> is supported by the data?', marks: 1, options: opts, correct: kind, ms: `${opts[kind]} ✓` },
      { q: 'Explain how the data in <b>Table 1</b> support your answer.', marks: 2, ms: kind === 0 ? `The ratio <i>V</i>/<i>I</i> is the same (${ansStr(r1)} ${OHM}) for every pair of readings ✓<br>so the current is directly proportional to the pd (Ohm’s law is obeyed) ✓` : `The ratio <i>V</i>/<i>I</i> changes from ${ansStr(r1)} ${OHM} to ${ansStr(r3)} ${OHM} ✓<br>so the current is not directly proportional to the pd; the resistance ${kind === 1 ? 'increases' : 'decreases'} as the pd increases ✓` },
      { q: 'State one limitation of using a variable resistor in series to vary the pd across <b>X</b> in this circuit.', marks: 1, ms: `The pd across <b>X</b> cannot be reduced to zero (a potential divider arrangement would be needed) ✓` }],
    checks: [['I', 'A', Is[0], { VR: { R: (15 - Vs[0]) / Is[0] } }], ['V', 'V', Vs[0], { VR: { R: (15 - Vs[0]) / Is[0] } }]] };
};

T.IV12 = R => {
  const vk = R.pick([.72, .76, .8, .84]), f = v => 100 * Math.exp((v - vk) / .06), V1 = Number((vk - R.pick([0, .04, .08])).toFixed(2)), ImA = Number(f(V1).toPrecision(2)), E = R.pick([1.5, 3, 4.5, 6]), Rx = (E - V1) / ImA * 1000;
  const c = topRow(new Circuit(), E, 5); rails(c, 5, 2.5);
  c.add('resistor', 'R', [0, 2.5], [2.5, 2.5], { R: Rx, name: 'R' }).add('diode', 'D', [2.5, 2.5], [5, 2.5], { Vf: V1 });
  const g = graph({ x: [0, 1, .2], y: [0, 100, 20], xl: 'pd / V', yl: 'current / mA', curves: [{ f, from: 0, to: vk }] });
  return { stem: `<b>Figure 1</b> shows a semiconductor diode connected in series with a resistor <b>R</b> and a battery of emf ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance and reads ${val(ImA, 'mA')}.<br><b>Figure 2</b> shows the characteristic of the diode in the forward direction.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the pd across the diode.', marks: 1, ans: V1, unit: 'V', abs: .035, ms: `${sig(V1, 2)} V ✓ (allow ± 1 small square)` },
      { q: 'Calculate the pd across <b>R</b>.', marks: 1, ans: E - V1, unit: 'V', tol: .04, ms: `${eq(`${sig(E)} − ${sig(V1, 2)} = ${ansStr(E - V1)} V`)} ✓` },
      { q: 'Calculate the resistance of <b>R</b>.', marks: 2, ans: Rx, unit: OHM, tol: .05, ms: `${eq(`<i>R</i> = ${ansStr(E - V1)} / (${sig(ImA)} × 10<sup>−3</sup>)`)} ✓<br>${eq(`<i>R</i> = ${ansStr(Rx)} ${OHM}`)} ✓` },
      { q: 'Calculate the power dissipated in the diode.', marks: 1, ans: V1 * ImA, unit: 'mW', tol: .06, ms: `${eq(`<i>P</i> = <i>VI</i> = ${sig(V1, 2)} × ${sig(ImA)} = ${ansStr(V1 * ImA)} mW`)} ✓` },
      { q: 'The emf of the battery is doubled.<br>Explain why the pd across the diode increases only slightly.', marks: 2, ms: `Above the threshold pd the current in a diode rises very steeply for a very small increase in pd ✓<br>so almost all of the extra emf appears across <b>R</b> ✓` }],
    checks: [['I', 'A', ImA / 1000], ['V', 'R', E - V1]] };
};

T.IV13 = R => {
  const o = R.pick([{ Im: 2, R0: 1 }, { Im: 1, R0: 2 }, { Im: .5, R0: 5 }, { Im: 2, R0: 1.5 }, { Im: .5, R0: 4 }]), g0 = i => o.R0 * (1 + 3 * Math.pow(i / o.Im, 1.5)), [yb, yM] = axisFor(o.R0 * 4);
  const I1 = o.Im * R.pick([.4, .6, .8]), Rl = Number(g0(I1).toPrecision(2)), Vl = I1 * Rl, E = R.pick([6, 9, 12, 15, 24].filter(e => e >= Vl + 1.5 && e <= Vl + 14)), Rv = (E - Vl) / I1;
  const c = topRow(new Circuit(), E, 5); rails(c, 5, 2.6);
  c.add('variable', 'VR', [0, 2.6], [2.5, 2.6], { R: Rv, name: 'R' }).add('lamp', 'L', [2.5, 2.6], [5, 2.6], { R: Rl, name: 'L' });
  const g = graph({ x: [0, o.Im, o.Im / 5], y: [0, yb, yM], xl: 'current / A', yl: 'resistance / ' + OHM, curves: [{ f: g0, from: 0, to: o.Im }] });
  return { stem: `<b>Figure 1</b> shows a circuit for controlling the current in a filament lamp <b>L</b>. The battery has an emf of ${val(E, 'V')} and negligible internal resistance. The ammeter has negligible resistance.<br><b>Figure 2</b> shows how the resistance of <b>L</b> varies with the current in it. The variable resistor <b>R</b> is adjusted until the ammeter reads ${val(I1, 'A')}.`, circuit: c, graph: g,
    parts: [
      { q: 'Use <b>Figure 2</b> to determine the resistance of <b>L</b>.', marks: 1, ans: Rl, unit: OHM, tol: .08, ms: `${sig(Rl)} ${OHM} ✓ (allow ± 1 small square)` },
      { q: 'Calculate the power dissipated in <b>L</b>.', marks: 2, ans: I1 * I1 * Rl, unit: 'W', tol: .09, ms: `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${sig(I1)}<sup>2</sup> × ${sig(Rl)}`)} ✓<br>${eq(`<i>P</i> = ${ansStr(I1 * I1 * Rl)} W`)} ✓` },
      { q: 'Calculate the resistance of <b>R</b>.', marks: 2, ans: Rv, unit: OHM, tol: .08, ms: `pd across <b>L</b> = ${sig(I1)} × ${sig(Rl)} = ${ansStr(Vl)} V, so pd across <b>R</b> = ${ansStr(E - Vl)} V ✓<br>${eq(`<i>R</i> = ${ansStr(E - Vl)} / ${sig(I1)} = ${ansStr(Rv)} ${OHM}`)} ✓` },
      { q: 'A second lamp, identical to <b>L</b>, is connected in parallel with <b>L</b>. <b>R</b> is adjusted so that the pd across <b>L</b> is the same as before.<br>Deduce, without calculation, the change in the resistance of <b>R</b>.', marks: 3, ms: `The pd across <b>R</b> is unchanged (emf minus the same lamp pd) ✓<br>The current in <b>R</b> doubles because each lamp carries the same current as before ✓<br>so the resistance of <b>R</b> must decrease, to half its value (<i>R</i> = <i>V</i>/<i>I</i>) ✓`, guide: ['The final mark needs a definite statement that it is the resistance of <b>R</b> that decreases.', 'Allow a decrease stated without the factor of two.', 'Alternative: the lamps in parallel have half the resistance, so <b>R</b> must be halved to keep the same ratio of pds.'] }],
    checks: [['I', 'A', I1], ['V', 'L', Vl], ['V', 'VR', E - Vl]] };
};

/* ---------- fourth batch: the rest of section 3.5.1 (charge and pd, resistivity, energy and power); these need no circuit diagram ---------- */
Object.assign(TOPICS, { BA: 'Charge, current and potential difference', RS: 'Resistivity and superconductivity', EP: 'Energy and power' });
const QE = 1.60e-19;
const nice2 = x => Math.abs(x - Number(x.toPrecision(2))) <= 1e-9 * Math.abs(x);
const SF = (x, n = 2) => { let e = Math.floor(Math.log10(Math.abs(x)) + 1e-9), m = Number((x / Math.pow(10, e)).toPrecision(n)); if (Math.abs(m) >= 10){ m /= 10; e += 1; } return (m.toFixed(n - 1) + ' × 10<sup>' + e + '</sup>').replace(/-/g, '−'); };
const big = x => Math.abs(x) >= 1e4 || Math.abs(x) < 1e-2;
const NUM = (x, n = 2) => big(x) ? SF(x, n) : sig(x, n);
const ANS = x => nice2(x) ? NUM(x, 2) : NUM(x, 3);
// a calculation part; very large or very small answers carry their own standard-form display
const cq = (q, marks, ans, unit, ms, x) => Object.assign({ q, marks, ans, unit, ms }, big(ans) ? { show: ANS(ans) } : {}, x || {});
const tq = (q, marks, ms, guide) => Object.assign({ q, marks, ms }, guide ? { guide } : {});
const ECH = `charge of an electron = ${SF(QE, 3)} C`;
const cap = s => s[0].toUpperCase() + s.slice(1);
const METALS = [['constantan', 4.9e-7], ['nichrome', 1.1e-6], ['copper', 1.7e-8], ['aluminium', 2.7e-8], ['tungsten', 5.6e-8]];
const area = dmm => Math.PI * Math.pow(dmm * 1e-3, 2) / 4;
const AREA_MS = (d, A) => `${eq(`<i>A</i> = π<i>d</i><sup>2</sup>/4 = π × (${SF(d * 1e-3)})<sup>2</sup> / 4 = ${ANS(A)} m<sup>2</sup>`)} ✓`;
const AREA_GUIDE = 'Award one mark only for the area if the diameter is used as the radius or if mm is not converted to m.';

/* ===== charge, current and potential difference ===== */
T.BA1 = R => {
  const I = R.pick([.20, .25, .40, .50, .80, 1.2, 1.5]), tm = R.pick([2, 3, 4, 5, 8, 10]), V = R.pick([3, 6, 9, 12]), dev = R.pick(['lamp', 'heater', 'motor']);
  const t = tm * 60, Q = I * t, n = Q / QE, W = V * Q;
  return { stem: `A ${dev} is connected to a battery. The current in the ${dev} is ${val(I, 'A')} and the potential difference across it is ${val(V, 'V')}. The ${dev} is switched on for ${val(tm, 'minutes')}.<br>${ECH}`,
    parts: [
      cq(`Calculate the charge that flows through the ${dev} in this time.`, 2, Q, 'C', `${eq(`<i>t</i> = ${sig(tm)} × 60 = ${t} s`)} ✓<br>${eq(`<i>Q</i> = <i>It</i> = ${sig(I)} × ${t} = ${ANS(Q)} C`)} ✓`, { guide: ['Award one mark for an answer that uses the time in minutes.'] }),
      cq(`Calculate the number of electrons that pass through the ${dev} in this time.`, 2, n, '', `${eq(`number = <i>Q</i>/<i>e</i> = ${ANS(Q)} / ${SF(QE, 3)}`)} ✓<br>${eq(`number = ${ANS(n)}`)} ✓`),
      cq(`Calculate the energy transferred by the ${dev} in this time.`, 2, W, 'J', `${eq(`<i>W</i> = <i>QV</i> (or <i>W</i> = <i>IVt</i>) = ${ANS(Q)} × ${sig(V)}`)} ✓<br>${eq(`<i>W</i> = ${ANS(W)} J`)} ✓`),
      tq(`State what is meant by a potential difference of ${val(V, 'V')} across the ${dev}.`, 1, `${sig(V)} J of energy is transferred (from electrical energy to other forms) for each coulomb of charge that passes through the ${dev} ✓`, ['Accept “work done per unit charge” with the value. Do not accept a definition in terms of current and resistance.'])
    ] };
};

T.BA2 = R => {
  const q = find(() => { const Rr = R.pick(RS.concat([40, 50, 60])), I = R.pick([.10, .15, .20, .25, .30, .40, .50, .60]), t = R.pick([20, 30, 40, 50, 60, 90, 120]); return { Rr, I, t, Q: I * t, V: I * Rr }; },
    q => isNice(q.Q, 2) && isNice(q.V, 2) && q.V <= 24);
  const { Rr, I, t, Q, V } = q;
  return { stem: `A charge of ${val(Q, 'C')} passes through a resistor in a time of ${val(t, 's')}. The potential difference across the resistor is ${val(V, 'V')}.`,
    parts: [
      cq('Calculate the current in the resistor.', 1, I, 'A', `${eq(`<i>I</i> = <i>Q</i>/<i>t</i> = ${sig(Q)} / ${sig(t)} = ${ansStr(I)} A`)} ✓`),
      cq('Calculate the resistance of the resistor.', 2, Rr, OHM, `${eq(`<i>R</i> = <i>V</i>/<i>I</i> = ${sig(V)} / ${ansStr(I)}`)} ✓<br>${eq(`<i>R</i> = ${ansStr(Rr)} ${OHM}`)} ✓`),
      cq('Calculate the energy transferred in the resistor in this time.', 2, Q * V, 'J', `${eq(`<i>W</i> = <i>QV</i> (or <i>W</i> = <i>IVt</i>) = ${sig(Q)} × ${sig(V)}`)} ✓<br>${eq(`<i>W</i> = ${ansStr(Q * V)} J`)} ✓`),
      tq('The resistor is an ohmic conductor.<br>State what is meant by an ohmic conductor.', 2, 'The current in it is directly proportional to the potential difference across it ✓<br>provided that the temperature (physical conditions) stays constant ✓', ['“It obeys Ohm’s law” on its own does not score.', 'Accept “constant resistance” for the first mark only if the condition is also given.'])
    ] };
};

T.BA3 = R => {
  const Q = R.pick([12, 15, 18, 20, 24, 30]), tms = R.pick([.40, .50, .60, .80, 1.2, 1.5]), VM = R.pick([50, 80, 100, 120, 150, 200]);
  const I = Q / (tms * 1e-3), W = Q * VM * 1e6, n = Q / QE;
  return { stem: `In a lightning strike, a charge of ${val(Q, 'C')} is transferred between a cloud and the ground in a time of ${val(tms, 'ms')}. The potential difference between the cloud and the ground is ${val(VM, 'MV')}.<br>${ECH}`,
    parts: [
      tq('State what is meant by an electric current.', 1, 'The rate of flow of charge ✓'),
      cq('Calculate the average current during the strike.', 2, I, 'A', `${eq(`<i>t</i> = ${SF(tms * 1e-3)} s`)} ✓<br>${eq(`<i>I</i> = <i>Q</i>/<i>t</i> = ${sig(Q)} / ${SF(tms * 1e-3)} = ${ANS(I)} A`)} ✓`, { guide: ['Award one mark for an answer that uses the time in ms.'] }),
      cq('Calculate the energy transferred by the strike.', 2, W, 'J', `${eq(`<i>W</i> = <i>QV</i> = ${sig(Q)} × ${SF(VM * 1e6)}`)} ✓<br>${eq(`<i>W</i> = ${ANS(W)} J`)} ✓`, { guide: ['Award one mark for an answer with a power-of-ten error from converting MV.'] }),
      cq('Calculate the number of electrons transferred during the strike.', 2, n, '', `${eq(`number = <i>Q</i>/<i>e</i> = ${sig(Q)} / ${SF(QE, 3)}`)} ✓<br>${eq(`number = ${ANS(n)}`)} ✓`)
    ] };
};

T.BA4 = R => {
  const Iu = R.pick([20, 40, 50, 80, 120, 160, 200]), Vk = R.pick([2.0, 2.5, 4.0, 5.0, 8.0]), I = Iu * 1e-6, V = Vk * 1e3;
  const n = I / QE, Ek = QE * V, P = I * V;
  return { stem: `In an electron gun, electrons are accelerated from rest through a potential difference of ${val(Vk, 'kV')} to form a beam. The beam current is ${val(Iu, 'μA')}.<br>${ECH}`,
    parts: [
      cq('Calculate the number of electrons that pass a point in the beam each second.', 2, n, '', `Charge passing each second = ${SF(I)} C ✓<br>${eq(`number = ${SF(I)} / ${SF(QE, 3)} = ${ANS(n)}`)} ✓`, { guide: ['Award one mark for an answer with a power-of-ten error from converting μA.'] }),
      cq('Calculate, in J, the kinetic energy gained by one electron as it is accelerated.', 2, Ek, 'J', `${eq(`<i>W</i> = <i>QV</i> = ${SF(QE, 3)} × ${sig(V)}`)} ✓<br>${eq(`<i>W</i> = ${ANS(Ek)} J`)} ✓`),
      cq('Calculate the power delivered by the beam.', 2, P, 'W', `${eq(`<i>P</i> = <i>IV</i> = ${SF(I)} × ${sig(V)}`)} ✓<br>${eq(`<i>P</i> = ${ANS(P)} W`)} ✓`, { show: ANS(P) }),
      tq('The electrons travel from the cathode to the anode of the electron gun.<br>State the direction of the conventional current in the beam.', 1, 'From the anode to the cathode (opposite to the direction in which the electrons move) ✓')
    ] };
};

/* ===== resistivity and superconductivity ===== */
T.RS1 = R => {
  const [name, rho] = R.pick(METALS), d = R.pick([.19, .23, .27, .31, .38, .46, .56]), L = R.pick([.80, 1.2, 1.5, 2.0, 2.5, 3.0, 4.0]), k = R.pick([2, 3]);
  const A = area(d), Rw = rho * L / A;
  return { stem: `A ${name} wire has a length of ${val(L, 'm')} and a diameter of ${val(d, 'mm')}. The resistivity of ${name} is ${SF(rho)} Ω m.`,
    parts: [
      cq('Calculate the cross-sectional area of the wire.', 2, A, 'm<sup>2</sup>', `Diameter converted to m and halved or squared correctly ✓<br>${AREA_MS(d, A)}`, { guide: [AREA_GUIDE] }),
      cq('Calculate the resistance of the wire.', 2, Rw, OHM, `${eq(`<i>R</i> = <i>ρL</i>/<i>A</i> = ${SF(rho)} × ${sig(L)} / ${ANS(A)}`)} ✓<br>${eq(`<i>R</i> = ${ANS(Rw)} ${OHM}`)} ✓`, { show: ANS(Rw), guide: ['Allow ecf from their area in (a).'] }),
      tq(`A second ${name} wire has the same length as the first wire but ${k === 2 ? 'twice' : 'three times'} its diameter.<br>State and explain how the resistance of the second wire compares with the resistance of the first.`, 2,
        `The cross-sectional area is ${k * k} times larger (area is proportional to diameter<sup>2</sup>) ✓<br>so the resistance is ${k === 2 ? 'one quarter' : 'one ninth'} of the resistance of the first wire (resistance is inversely proportional to area) ✓`, ['Award one mark for “the resistance is smaller because the area is larger”.'])
    ] };
};

T.RS2 = R => {
  const [name, rho0] = R.pick(METALS.slice(0, 2)), d = R.pick([.19, .23, .27, .31, .38, .46]), L = R.pick([.80, 1.0, 1.2, 1.5, 2.0]);
  const A = area(d), Rg = Number((rho0 * L / A).toPrecision(3)), rho = Rg * A / L;
  return { stem: `A student determines the resistivity of ${name} using a length of ${name} wire. The student measures the length of the wire as ${val(L, 'm')}, its diameter as ${val(d, 'mm')} and its resistance as ${sig(Rg, 3)} ${OHM}.`,
    parts: [
      cq(`Calculate the resistivity of ${name} given by these measurements.`, 3, rho, 'Ω m', `${AREA_MS(d, A)}<br>${eq(`<i>ρ</i> = <i>RA</i>/<i>L</i> = ${sig(Rg, 3)} × ${ANS(A)} / ${sig(L)}`)} ✓<br>${eq(`<i>ρ</i> = ${ANS(rho)} Ω m`)} ✓`, { guide: [AREA_GUIDE] }),
      tq('Describe how the student should measure the diameter of the wire so that the value is as accurate as possible.', 2, 'Use a micrometer (screw gauge) ✓<br>Measure at several places along the wire and in different directions, then calculate the mean ✓', ['Accept digital callipers that read to 0.01 mm.', 'Checking the micrometer for a zero error is an alternative second mark.']),
      tq('The student keeps the current in the wire small during the experiment.<br>Explain why.', 2, 'A large current would heat the wire ✓<br>The resistivity (resistance) of a metal changes with temperature, so the temperature must be kept constant ✓')
    ] };
};

T.RS3 = R => {
  const g = R.pick([4, 5, 6, 8, 10, 12]), d = R.pick([.27, .31, .38, .46]), A = area(d), rho = g * A;
  const fig = graph({ x: [0, 1.0, .2], y: [0, g, g <= 6 ? 1 : 2], xl: 'length / m', yl: 'resistance / Ω', curves: [{ f: x => g * x, from: 0, to: 1.0 }] });
  return { stem: `A student measures the resistance of different lengths of a wire made from an alloy. <b>Figure 1</b> is a graph that shows how the resistance of the wire varies with its length.`, graph: fig,
    parts: [
      tq('State how the graph shows that the resistance of the wire is directly proportional to its length.', 1, 'It is a straight line that passes through the origin ✓', ['Both “straight line” and “through the origin” are needed.']),
      { q: 'Determine the gradient of the graph.', marks: 2, ans: g, unit: 'Ω m<sup>−1</sup>', tol: .04, ms: `Uses a triangle that covers at least half of the line ✓<br>${eq(`gradient = ${sig(g)} Ω m<sup>−1</sup>`)} ✓` },
      cq(`The wire has a diameter of ${val(d, 'mm')}.<br>Calculate the resistivity of the alloy.`, 3, rho, 'Ω m', `${AREA_MS(d, A)}<br>${eq('<i>R</i> = <i>ρL</i>/<i>A</i>')}, so ${eq('<i>ρ</i> = gradient × <i>A</i>')} ✓<br>${eq(`<i>ρ</i> = ${sig(g)} × ${ANS(A)} = ${ANS(rho)} Ω m`)} ✓`, { guide: [AREA_GUIDE] }),
      tq('The student repeats the experiment with a thinner wire made from the same alloy.<br>State and explain how the gradient of the graph changes.', 2, 'The gradient is greater ✓<br>The gradient is <i>ρ</i>/<i>A</i>: the resistivity is the same and the cross-sectional area is smaller ✓')
    ] };
};

T.RS4 = R => {
  const [name, Tc] = R.pick([['mercury', 4.2], ['lead', 7.2], ['niobium', 9.3], ['a niobium–tin alloy', 18], ['a ceramic compound', 92]]);
  const Rkm = R.pick([.050, .080, .10, .12, .15]), I = R.pick([400, 500, 800, 1000, 1200]), len = R.pick([2.0, 5.0, 10, 20]), Rc = Rkm * len, P = I * I * Rc;
  const short = name.replace(/^a /, 'the '), tC = Tc - 273, tShow = (Tc % 1 ? tC.toFixed(1) : String(tC)).replace('-', '−');
  return { stem: `${cap(name)} becomes a superconductor when it is cooled. The critical temperature of ${short} is ${Tc} K.`,
    parts: [
      tq('State what is meant by a superconductor.', 2, 'A material that has zero resistivity (zero resistance) ✓<br>at and below its critical temperature ✓'),
      { q: `Calculate the critical temperature of ${short} in °C.`, marks: 1, ans: tC, unit: '°C', show: tShow, ms: `${eq(`${Tc} − 273 = ${tShow} °C`)} ✓`, guide: ['Accept the use of 273.15.'] },
      tq(`Sketch a graph to show how the resistivity of ${short} varies with temperature as it is cooled from room temperature to below its critical temperature. Label the critical temperature on the temperature axis.`, 2, 'Resistivity decreases gradually as the temperature falls towards the critical temperature ✓<br>Resistivity drops suddenly (a vertical line) to zero at the labelled critical temperature and stays at zero below it ✓'),
      cq(`A copper power cable has a resistance of ${val(Rkm, OHM)} for each kilometre of its length and carries a current of ${val(I, 'A')}.<br>Calculate the power dissipated in a ${val(len, 'km')} length of the cable.`, 2, P, 'W', `${eq(`<i>R</i> = ${sig(Rkm)} × ${sig(len)} = ${ANS(Rc)} ${OHM}`)} ✓<br>${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${sig(I)}<sup>2</sup> × ${ANS(Rc)} = ${ANS(P)} W`)} ✓`),
      tq('State the power that would be dissipated if the copper cable were replaced by a superconducting cable that carries the same current, and give <b>one</b> other use of superconductors.', 2, 'Zero ✓<br>Producing strong magnetic fields, for example in MRI scanners, particle accelerators or maglev trains ✓')
    ] };
};

T.RS5 = R => {
  const kL = R.pick([[2, 'twice'], [3, 'three times'], [.5, 'half']]), kd = R.pick([[2, 'twice', '4 times'], [.5, 'half', 'one quarter of'], [3, 'three times', '9 times']]);
  const Rx = R.pick([2.0, 3.0, 4.0, 6.0, 8.0, 12]), V = R.pick([1.5, 3.0, 6.0]), Ry = Rx * kL[0] / (kd[0] * kd[0]);
  return { stem: `<b>X</b> and <b>Y</b> are two wires made from the same metal. <b>X</b> has a resistance of ${val(Rx, OHM)}. <b>Y</b> has ${kL[1]} the length of <b>X</b> and ${kd[1]} the diameter of <b>X</b>.`,
    parts: [
      cq('Calculate the resistance of <b>Y</b>.', 3, Ry, OHM, `The cross-sectional area of <b>Y</b> is ${kd[2]} the area of <b>X</b> (area is proportional to diameter<sup>2</sup>) ✓<br>${eq('<i>R</i> = <i>ρL</i>/<i>A</i>')}, so ${eq(`<i>R</i><sub>Y</sub> = ${sig(Rx)} × ${kL[0]} / ${kd[0]}<sup>2</sup>`)} ✓<br>${eq(`<i>R</i><sub>Y</sub> = ${ANS(Ry)} ${OHM}`)} ✓`, { guide: ['Award two marks for an answer that uses the diameter ratio without squaring it.'] }),
      cq(`A potential difference of ${val(V, 'V')} is applied across <b>X</b>.<br>Calculate the current in <b>X</b>.`, 1, V / Rx, 'A', `${eq(`<i>I</i> = <i>V</i>/<i>R</i> = ${sig(V)} / ${sig(Rx)} = ${ansStr(V / Rx)} A`)} ✓`),
      tq('The temperature of <b>X</b> increases.<br>Explain, in terms of the particles in the metal, why its resistance increases.', 2, 'The positive ions vibrate with a greater amplitude ✓<br>so the conduction electrons collide with the ions more often, which makes it harder for them to move through the metal ✓', ['Do not accept “the particles move faster” without a reference to vibration.'])
    ] };
};

/* ===== energy and power ===== */
T.EP1 = R => {
  const I = R.pick([4, 5, 6, 8, 10, 12]), P = 230 * I, tm = R.pick([2, 3, 4, 5]), dev = R.pick(['kettle', 'heater', 'toaster', 'hairdryer']), t = tm * 60, E = P * t;
  return { stem: `An electric ${dev} has a power of ${P} W when it is connected to a ${val(230, 'V')} mains supply.`,
    parts: [
      cq(`Calculate the current in the ${dev}.`, 2, I, 'A', `${eq(`<i>I</i> = <i>P</i>/<i>V</i> = ${P} / 230`)} ✓<br>${eq(`<i>I</i> = ${ansStr(I)} A`)} ✓`),
      cq(`Calculate the resistance of the heating element of the ${dev}.`, 2, 230 / I, OHM, `${eq(`<i>R</i> = <i>V</i><sup>2</sup>/<i>P</i> = 230<sup>2</sup> / ${P}`)} (or ${eq('<i>R</i> = <i>V</i>/<i>I</i>')}) ✓<br>${eq(`<i>R</i> = ${ansStr(230 / I)} ${OHM}`)} ✓`),
      cq(`Calculate the energy transferred by the ${dev} in ${val(tm, 'minutes')}.`, 2, E, 'J', `${eq(`<i>t</i> = ${sig(tm)} × 60 = ${t} s`)} ✓<br>${eq(`<i>E</i> = <i>Pt</i> = ${P} × ${t} = ${ANS(E)} J`)} ✓`, { guide: ['Award one mark for an answer that uses the time in minutes.'] }),
      tq(`The ${dev} is taken to a country where the mains supply is 115 V. Assume that the resistance of the ${dev} does not change.<br>State and explain how the power of the ${dev} compares with its power on the 230 V supply.`, 2, 'The power is one quarter of its value on the 230 V supply ✓<br><i>P</i> = <i>V</i><sup>2</sup>/<i>R</i>, so halving the pd with the same resistance gives one quarter of the power (or: the pd and the current both halve) ✓', ['Award one mark for “the power is smaller because the pd is smaller”.'])
    ] };
};

T.EP2 = R => {
  const q = find(() => { const Pk = R.pick([200, 400, 500, 800, 1000]), Vk = R.pick([10, 20, 25, 40, 50]), Rc = R.pick([2.0, 4.0, 5.0, 8.0, 10]), I = Pk / Vk, loss = I * I * Rc; return { Pk, Vk, Rc, I, loss, pct: loss / (Pk * 1e3) * 100 }; },
    q => isNice(q.I, 2) && isNice(q.pct, 2) && q.pct >= .05 && q.pct <= 10);
  const { Pk, Vk, Rc, I, loss, pct } = q;
  return { stem: `A power station delivers ${val(Pk, 'kW')} of electrical power to a town through cables that have a total resistance of ${val(Rc, OHM)}. The potential difference at the power-station end of the cables is ${val(Vk, 'kV')}.`,
    parts: [
      cq('Calculate the current in the cables.', 2, I, 'A', `${eq(`<i>I</i> = <i>P</i>/<i>V</i> = ${SF(Pk * 1e3)} / ${SF(Vk * 1e3)}`)} ✓<br>${eq(`<i>I</i> = ${ansStr(I)} A`)} ✓`),
      cq('Calculate the power dissipated in the cables.', 2, loss, 'W', `${eq(`<i>P</i> = <i>I</i><sup>2</sup><i>R</i> = ${ansStr(I)}<sup>2</sup> × ${sig(Rc)}`)} ✓<br>${eq(`<i>P</i> = ${ANS(loss)} W`)} ✓`, { guide: ['Do not accept the use of <i>V</i><sup>2</sup>/<i>R</i> with the pd at the power station.'] }),
      cq('Calculate the percentage of the power delivered by the power station that is dissipated in the cables.', 1, pct, '%', `${eq(`${ANS(loss)} / ${SF(Pk * 1e3)} × 100 = ${ansStr(pct)} %`)} ✓`),
      tq('Explain why electrical power is transmitted at a high potential difference.', 2, 'For the same power, a higher pd means a smaller current (<i>P</i> = <i>IV</i>) ✓<br>The power dissipated in the cables is <i>I</i><sup>2</sup><i>R</i>, so a smaller current gives much smaller energy losses ✓')
    ] };
};

T.EP3 = R => {
  const E = R.pick([3.0, 4.5, 6.0, 9.0]), I = R.pick([.20, .25, .30, .40, .50]), Q = R.pick([3600, 5400, 7200, 9000]), t = Q / I, W = Q * E;
  return { stem: `A torch contains a battery of emf ${val(E, 'V')} and negligible internal resistance. When the torch is switched on, the current in its lamp is ${val(I, 'A')}. The battery can deliver a total charge of ${Q} C before it needs to be replaced.`,
    parts: [
      cq('Calculate the power of the lamp.', 1, I * E, 'W', `${eq(`<i>P</i> = <i>IV</i> = ${sig(I)} × ${sig(E)} = ${ansStr(I * E)} W`)} ✓`),
      cq('Calculate the time for which the torch can be used before the battery needs to be replaced.', 2, t, 's', `${eq(`<i>t</i> = <i>Q</i>/<i>I</i> = ${Q} / ${sig(I)}`)} ✓<br>${eq(`<i>t</i> = ${ANS(t)} s`)} ✓`),
      cq('Calculate the total energy that the battery can transfer.', 2, W, 'J', `${eq(`<i>W</i> = <i>QV</i> = ${Q} × ${sig(E)}`)} ✓<br>${eq(`<i>W</i> = ${ANS(W)} J`)} ✓`),
      tq('A second identical lamp is connected in parallel with the first lamp.<br>State and explain how this affects the time for which the torch can be used.', 2, 'The time is halved ✓<br>Each lamp has the same pd across it and so the same current, so the current in the battery doubles and the same charge is delivered in half the time ✓')
    ] };
};

T.EP4 = R => {
  const q = find(() => { const Rr = R.pick([10, 20, 40, 50, 100, 200, 400]), I = R.pick([.05, .10, .20, .25, .50]); return { Rr, I, P: I * I * Rr }; }, q => isNice(q.P, 2) && q.P >= .1 && q.P <= 5);
  const { Rr, I, P } = q, V = I * Rr;
  return { stem: `A ${val(Rr, OHM)} resistor has a maximum power rating of ${val(P, 'W')}.`,
    parts: [
      cq('Calculate the maximum current that the resistor can carry without exceeding its power rating.', 2, I, 'A', `${eq('<i>P</i> = <i>I</i><sup>2</sup><i>R</i>')}, so ${eq(`<i>I</i> = √(<i>P</i>/<i>R</i>) = √(${sig(P)} / ${sig(Rr)})`)} ✓<br>${eq(`<i>I</i> = ${ansStr(I)} A`)} ✓`),
      cq('Calculate the maximum potential difference that can be applied across the resistor.', 2, V, 'V', `${eq(`<i>V</i> = <i>IR</i> = ${ansStr(I)} × ${sig(Rr)}`)} (or ${eq('<i>V</i> = √(<i>PR</i>)')}) ✓<br>${eq(`<i>V</i> = ${ansStr(V)} V`)} ✓`),
      cq('Two of these resistors are connected in series.<br>Calculate the maximum potential difference that can be applied across the combination.', 1, 2 * V, 'V', `Each resistor can have ${ansStr(V)} V across it, so ${eq(`2 × ${ansStr(V)} = ${ansStr(2 * V)} V`)} ✓`),
      tq('Explain why the resistor may be damaged if its power rating is exceeded.', 2, 'Energy is transferred to the resistor faster than it can be transferred to the surroundings ✓<br>so its temperature rises until it is damaged (it melts or burns) ✓')
    ] };
};

T.EP5 = R => {
  const [Pf, Pl, u] = R.pick([[40, 5.0, 2.0], [40, 6.0, 2.0], [60, 8.0, 3.0], [60, 9.0, 3.0], [100, 12, 5.0], [100, 14, 5.0]]), th = R.pick([2.0, 3.0, 4.0, 5.0]);
  const I = Pl / 230, dP = Pf - Pl, E = dP * th * 3600;
  return { stem: `A ${val(Pf, 'W')} filament lamp can be replaced by a ${val(Pl, 'W')} LED lamp that gives out the same amount of light. Both lamps are designed for a ${val(230, 'V')} mains supply.`,
    parts: [
      cq('Calculate the current in the LED lamp.', 2, I, 'A', `${eq(`<i>I</i> = <i>P</i>/<i>V</i> = ${sig(Pl)} / 230`)} ✓<br>${eq(`<i>I</i> = ${ANS(I)} A`)} ✓`),
      cq(`Each lamp would be used for ${val(th, 'hours')} every day.<br>Calculate the energy saved each day by using the LED lamp instead of the filament lamp.`, 2, E, 'J', `Difference in power = ${eq(`${sig(Pf)} − ${sig(Pl)} = ${sig(dP)} W`)} ✓<br>${eq(`<i>E</i> = <i>Pt</i> = ${sig(dP)} × ${sig(th)} × 3600 = ${ANS(E)} J`)} ✓`, { guide: ['Award one mark for an answer that uses the time in hours.'] }),
      { q: `The filament lamp transfers ${val(u, 'W')} of power as light.<br>Calculate the efficiency of the filament lamp.`, marks: 1, ans: u / Pf, unit: '', show: `${sig(u / Pf)} (${sig(u / Pf * 100)}%)`, ms: `${eq(`efficiency = useful output power / total input power = ${sig(u)} / ${sig(Pf)} = ${sig(u / Pf)}`)} (${sig(u / Pf * 100)}%) ✓` },
      tq('Explain why the LED lamp is more efficient than the filament lamp.', 2, 'The LED lamp needs a much smaller input power to give the same useful output (light) power ✓<br>so a smaller fraction of the energy supplied is wasted in heating the surroundings ✓')
    ] };
};


const TEMPLATES = Object.keys(T).sort();
function genOnly(tpl, seed){ return T[tpl](makeRand(seed * 7919 + tpl.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7))); }
function makeQuestion(tpl, seed, opts){
  opts = opts || {};
  if (!T[tpl]) throw new Error('Unknown question type ' + tpl);
  INEXACT.length = 0;
  const q = T[tpl](makeRand(seed * 7919 + tpl.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)));
  q.id = tpl; q.seed = seed; q.code = tpl + '-' + seed; q.topic = tpl.replace(/\d+/, ''); q.topicName = TOPICS[q.topic];
  q.marks = q.parts.reduce((a, p) => a + p.marks, 0);
  q.gspec = q.graph ? LAST.g : null; q.circuitSvg = q.circuit ? q.circuit.render() : '';
  finishMarkScheme(q);
  if (opts.skills !== false) addSkillMarks(q, makeRand(seed * 104729 + tpl.length * 977 + 13));
  q.marks = q.parts.reduce((a, p) => a + p.marks, 0); q.errors = q.circuit ? q.circuit.analyse().errors : [];
  return q;
}
function checkAnswer(part, x){
  const a = part.ans; if (!isFinite(x)) return false;
  if (Math.abs(a) < 1e-12) return Math.abs(x) < 1e-9;
  if (part.abs !== undefined) return Math.abs(x - a) <= part.abs + 1e-9;
  return Math.abs(x - a) <= (part.tol || .015) * Math.abs(a) + 1e-12 || Number(x.toPrecision(2)) === Number(a.toPrecision(2));
}
function stdForm(x){ const e = Math.floor(Math.log10(Math.abs(x)) + 1e-12), m = x / Math.pow(10, e); return (isNice(m, 2) ? sig(m, 2) : sig(m, 3)) + ' × 10<sup>' + e + '</sup>'; }
function disp(x){ return Math.abs(x) >= 1e4 ? stdForm(Number(x.toPrecision(3))) : ansStr(x); }
const CPD = 'Do not credit explanations that confuse current and pd, such as “current across” or “pd through”.';
const LOST = 'Condone “lost volts” for the pd across the internal resistance.';
const REVERSE = 'Allow one mark for a correct argument about the opposite change.';
const NOTJUSTV = '“The terminal pd decreases” on its own does not explain the change: it must be linked to a larger current or larger lost volts.';
const EXTRA_GUIDE = {
  PD1: { 2: [CPD] }, PD2: { 2: [REVERSE, CPD] }, PD6: { 3: [REVERSE, CPD] }, PD8: { 3: [REVERSE, CPD] },
  PD7: { 2: [CPD] }, PD10: { 3: [CPD] }, PD12: { 2: [CPD] }, SP4: { 3: [CPD] }, SP5: { 3: [CPD] }, IV13: { 3: [CPD] },
  EMF2: { 3: [LOST, CPD] }, EMF4: { 1: ['Accept “the magnitude of the gradient is <i>r</i>”.'], 3: [LOST] },
  EMF7: { 3: [LOST, NOTJUSTV, 'Treat comments about the resistance of the lamp as neutral.'] },
  EMF13: { 3: [LOST, NOTJUSTV, 'Treat comments about the resistance of the lamps as neutral.'] },
  EMF6: { 3: ['Alternative: the current in each cell is half the total current, so the lost volts in each cell are smaller.'] }
};
function finishMarkScheme(q){
  const labels = q.circuit ? q.circuit.comps.filter(c => c.o.text).map(c => c.o.text).join(' ') : '';
  const givenText = (q.stem + ' ' + q.parts.map(p => p.q).join(' ') + ' ' + labels).replace(/<[^>]+>/g, ' ');
  const tokens = h => new Set((h.replace(/<[^>]+>/g, ' ').match(/\d+(?:\.\d+)?/g) || []));
  const givenTok = tokens(givenText), L = 'abcdefg';
  q.parts.forEach((p, i) => {
    const g = (p.guide ? p.guide.slice() : []).concat((EXTRA_GUIDE[q.id] || {})[i] || []);
    p.ms = p.ms.replace(/\s*\(allow ± [^)]*\)/g, '').replace('(allow for reading tolerance; not the gradient)', '(not the gradient)');
    if (p.ans !== undefined && !p.options && (p.abs !== undefined || p.tol)){
      const lo = p.abs !== undefined ? p.ans - p.abs : p.ans * (1 - p.tol), hi = p.abs !== undefined ? p.ans + p.abs : p.ans * (1 + p.tol);
      g.unshift(`Allow answers in the range ${sig(Math.max(lo, 0), 3)} to ${sig(hi, 3)} ${p.unit}${/Figure 2|graph/.test(p.q) ? ' (reading from the graph)' : ''}.`);
    }
    if (p.ans !== undefined && !p.options){
      const mine = tokens(p.ms), ecf = [];
      for (let j = 0; j < i; j++){ const pj = q.parts[j]; if (pj.ans === undefined || pj.options || pj.ans === 0) continue; const a = ansStr(pj.ans); if (mine.has(a) && !givenTok.has(a)) ecf.push('(' + L[j] + ')'); }
      if (ecf.length) g.push('Allow ecf from their answer' + (ecf.length > 1 ? 's' : '') + ' to ' + ecf.join(' and ') + '.');
    }
    p.ms = p.ms.replace(/(^|[^\d.>])(\d{5,})(?![\d.]|<\/sup>)/g, (m, pre, d) => pre + stdForm(+d));
    p.guide = g;
  });
}
// ---------- A-level skill marks: significant figures and SI units (AQA 7408 mark scheme instructions 3.8 and 3.9) ----------
function sfRange(str){                      // [fewest, most] significant figures a typed number could have
  let t = String(str).trim().replace(/−/g, '-').replace(/^[-+]/, '').toLowerCase();
  const m = t.match(/^([\d.]+)\s*(?:e[-+]?\d+|(?:×|x|\*)\s*10\s*(?:\^|<sup>)?\s*[-−]?\d+(?:<\/sup>)?)?$/);
  if (!m) return [0, 0];
  t = m[1];
  if (t.includes('.')){ const k = t.replace('.', '').replace(/^0+/, '').length || 1; return [k, k]; }
  const d = t.replace(/^0+/, '') || '0', lo = d.replace(/0+$/, '').length || 1; return [lo, d.length];   // trailing zeros in an integer are ambiguous
}
function sfCount(str){ return sfRange(str)[0]; }
function dataSf(str){                          // sf of a printed datum; integers like 220 or 1000 are treated as 2 sf
  if (/^\d$/.test(str)) return null;              // a bare single digit is a count, not a datum
  if (str.includes('.')) return str.replace('.', '').replace(/^0+/, '').length;
  return Math.max(2, str.replace(/0+$/, '').length);
}
const SI_UNITS = {
  'A': { show: 'A', accept: ['a', 'amp', 'amps', 'ampere', 'amperes'], alt: '' },
  'V': { show: 'V', accept: ['v', 'volt', 'volts', 'jc-1', 'j/c', 'wa-1', 'w/a'], alt: 'Accept J C<sup>−1</sup> or W A<sup>−1</sup>.' },
  'W': { show: 'W', accept: ['w', 'watt', 'watts', 'js-1', 'j/s', 'va'], alt: 'Accept J s<sup>−1</sup> or V A.' },
  'Ω': { show: 'Ω', accept: ['ω', 'ohm', 'ohms', 'va-1', 'v/a'], alt: 'Accept V A<sup>−1</sup>.' },
  'J': { show: 'J', accept: ['j', 'joule', 'joules', 'nm', 'ws', 'vc'], alt: 'Accept N m, W s or V C.' },
  'C': { show: 'C', accept: ['c', 'coulomb', 'coulombs', 'as'], alt: 'Accept A s.' }
};
function normUnit(u){ return String(u).trim().toLowerCase().replace(/Ω|Ω/g, 'ω').replace(/⁻¹|\^-1|\^\(-1\)|−1|-1/g, '-1').replace(/[\s·.]/g, '').replace(/^(.*)$/, '$1'); }
function unitOk(p, typed){ return !!p.unitMark && p.unitMark.accept.includes(normUnit(typed)); }
function sfOk(p, typed){ if (!p.sfMark) return true; const [lo, hi] = sfRange(typed); return p.sfMark.accept.some(n => n >= lo && n <= hi); }
function addSkillMarks(q, rnd){
  const labels = q.circuit ? q.circuit.comps.filter(c => c.o.text).map(c => c.o.text).join(' ') : '';
  const given = (q.stem + ' ' + labels + ' ' + q.parts.map(p => p.q).join(' ')).replace(/<sup>.*?<\/sup>/g, ' ').replace(/<[^>]+>/g, ' ');
  const givenTok = new Set(given.match(/\d+(?:\.\d+)?/g) || []);
  const eligible = p => p.ans !== undefined && !p.options && p.abs === undefined && !p.tol && p.ans !== 0 && /^Calculate/.test(p.q) && !/%|10<sup>/.test(p.unit) && !p.show && p.unit !== '';
  const cands = q.parts.map((p, i) => ({ p, i })).filter(x => eligible(x.p));
  if (!cands.length) return;
  // significant-figure mark: the least precise datum used in the working decides the sf
  const sfCands = cands.map(x => { const toks = (x.p.ms.replace(/<sup>.*?<\/sup>/g, ' ').replace(/<[^>]+>/g, ' ').match(/\d+(?:\.\d+)?/g) || []).filter(t => givenTok.has(t));
    const sfs = toks.map(dataSf).filter(v => v); return Object.assign({ n: sfs.length ? Math.min(...sfs) : 0 }, x); }).filter(x => x.n >= 2 && x.n <= 3);
  let sfPart = null;
  if (sfCands.length && rnd() < 0.5){ sfPart = rnd.pick(sfCands); const p = sfPart.p, n = sfPart.n, accept = n === 2 ? [2] : [2, 3], shown = Math.abs(p.ans) >= 1e4 ? stdForm(Number(p.ans.toPrecision(n))).replace(/^[\d.]+/, m => Number(m).toFixed(n - 1)) : sig(p.ans, n);
    p.q += '<br>Give your answer to an appropriate number of significant figures.';
    p.marks += 1; p.sfMark = { n, accept, shown };
    p.ms += `<br>Answer given to ${n} significant figures (${shown} ${p.unit}) ✓`;
    p.guide = p.guide.concat([`The data used are given to ${n} significant figures, so accept answers given to ${accept.join(' or ')} significant figures.`, 'The significant-figure mark can be awarded for an incorrect answer that follows some relevant working. An answer to 1 significant figure cannot gain this mark.']); }
  // SI unit mark: a different part whose unit is an SI unit; the unit is no longer printed on the answer line
  const uCands = cands.filter(x => (!sfPart || x.i !== sfPart.i) && SI_UNITS[x.p.unit]);
  if (uCands.length && rnd() < 0.5){ const p = rnd.pick(uCands).p, U = SI_UNITS[p.unit];
    p.q += '<br>State an appropriate SI unit for your answer.';
    p.marks += 1; p.unitMark = { si: U.show, accept: U.accept };
    p.ms += `<br>Unit: ${U.show} ✓`;
    p.guide = p.guide.concat([(U.alt ? U.alt + ' ' : '') + 'Do not accept strings of base units (such as kg m<sup>2</sup> s<sup>−3</sup>). The unit mark is independent of the numerical answer.']); }
}
const ENGINE = { INEXACT, STATS, genOnly, disp, stdForm, sfCount, sfRange, unitOk, sfOk, normUnit, SI_UNITS, makeQuestion, checkAnswer, TEMPLATES, TOPICS, solve, sig, ansStr, Circuit };
if (typeof module !== 'undefined') module.exports = ENGINE;


return ENGINE;
})();
