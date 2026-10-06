/* Deterministic sample datasets for the Experiment Analyzer */
(function (g) {
'use strict';
const MT = g.MT, S = MT.stat, DAY = 86400000, D0 = Date.UTC(2026, 0, 1);
const iso = i => MT.fmt.date(D0 + i * DAY);
function ar1(rng, n, rho, sd) { const o = new Array(n); let p = 0; for (let i = 0; i < n; i++) { p = rho * p + sd * rng.n(); o[i] = p; } return o; }
function common(rng, T) { const rw = []; let s = 0; for (let i = 0; i < T; i++) { s += 6 * rng.n(); rw.push(s); } return MT.range(T).map(i => 1000 + 1.8 * i + 70 * Math.sin(2 * Math.PI * i / 7) + 25 * Math.sin(2 * Math.PI * i / 45) + rw[i]); }
const toCSV = (heads, cols) => MT.toCSV([heads].concat(cols[0].map((_, i) => cols.map((c, j) => j === 0 ? c[i] : (Math.round(c[i] * 10) / 10)))));
const S_ = MT.samples = {};
/* geo test, 12 donor regions. shifting=true makes the treated-donor relationship change over time (favours BSTS) */
S_.geo = function (o) {
  o = o || {}; const J = o.J || 12, T = o.T || 140, ev = o.ev || 100, lift = o.lift == null ? 0.08 : o.lift, rng = MT.rng(o.seed || 1), com = common(rng, T), donors = [];
  for (let j = 0; j < J; j++) { const a = 0.4 + 1.2 * rng.u(), idio = ar1(rng, T, 0.7, 10 + 10 * rng.u()); donors.push(com.map((c, i) => a * c + idio[i])); }
  const wA = new Array(J).fill(0), wB = new Array(J).fill(0); wA[0] = 0.5; wA[1] = 0.3; wA[2] = 0.2; wB[5] = 0.5; wB[6] = 0.3; wB[7] = 0.2; const noise = ar1(rng, T, 0.5, 8);
  const cov = com.map((c, i) => 100 + 0.05 * c + 6 * Math.sin(i / 9) + 3 * rng.n()), drift = o.drift ? ar1(rng, T, 0.97, o.drift) : new Array(T).fill(0);
  const treated = MT.range(T).map(i => { const f = o.shifting ? i / (T - 1) : 0; let v = drift[i]; for (let j = 0; j < J; j++) v += ((1 - f) * wA[j] + f * wB[j]) * donors[j][i]; v += noise[i] + (o.cov ? 1.5 * (cov[i] - 100) : 0); return i >= ev ? v * (1 + lift) : v; });
  const heads = ['date', 'treated_region'].concat(donors.map((_, j) => 'region_' + String(j + 1).padStart(2, '0'))).concat(o.cov ? ['category_demand_index'] : []);
  return { csv: toCSV(heads, [MT.range(T).map(iso), treated].concat(donors).concat(o.cov ? [cov] : [])), covs: o.cov ? ['category_demand_index'] : [], eventDate: iso(ev), treatedCol: 'treated_region', truth: { lift, avgEffect: lift * S.mean(treated.slice(ev).map(v => v / (1 + lift))) } };
};
S_.oneControl = function (o) {
  o = o || {}; const T = o.T || 120, ev = o.ev || 80, lift = o.lift == null ? 0.06 : o.lift, rng = MT.rng(o.seed || 4), com = common(rng, T), n1 = ar1(rng, T, 0.5, 9), n2 = ar1(rng, T, 0.5, 9);
  const control = com.map((c, i) => 0.8 * c + n1[i]), base = com.map((c, i) => (o.parallel === false ? 0.95 : 0.8) * c + 60 + n2[i]), treated = base.map((v, i) => i >= ev ? v * (1 + lift) : v);
  return { csv: toCSV(['date', 'treated_market', 'control_market'], [MT.range(T).map(iso), treated, control]), eventDate: iso(ev), treatedCol: 'treated_market', truth: { lift } };
};
S_.noControl = function (o) {
  o = o || {}; const T = o.T || 120, ev = o.ev || 90, shift = o.shift == null ? 60 : o.shift, rng = MT.rng(o.seed || 3), n = ar1(rng, T, 0.5, 20);
  const y = MT.range(T).map(i => 1000 + 2 * i + 80 * Math.sin(2 * Math.PI * i / 7) + n[i] + (i >= ev ? shift : 0));
  return { csv: toCSV(['date', 'daily_signups'], [MT.range(T).map(iso), y]), eventDate: iso(ev), treatedCol: 'daily_signups', truth: { shift } };
};
S_.short = function (o) {
  o = o || {}; const T = 35, ev = 28, rng = MT.rng(o.seed || 4), n = ar1(rng, T, 0.3, 18);
  const y = MT.range(T).map(i => 500 + 50 * Math.sin(2 * Math.PI * i / 7) + n[i] + (i >= ev ? 45 : 0));
  return { csv: toCSV(['date', 'leads'], [MT.range(T).map(iso), y]), eventDate: iso(ev), treatedCol: 'leads', truth: { shift: 45 } };
};
/* aggregated factorial: headline x image x cta on conversion */
S_.mvBinary = function (o) {
  o = o || {}; const rng = MT.rng(o.seed || 9), rows = [['headline', 'image', 'cta', 'visitors', 'conversions']], n = o.n || 4000;
  const H = { 'Original': 1, 'Benefit-led': 1.12 }, I = { 'Current photo': 1, 'Lifestyle': 0.97 }, C = { 'Control: Learn more': 1, 'Get started': 1.18 };
  for (const h in H) for (const im in I) for (const c in C) { const p = 0.05 * H[h] * I[im] * C[c], x = Math.round(n * p + Math.sqrt(n * p * (1 - p)) * rng.n()); rows.push([h, im, c, n, x]); }
  return MT.toCSV(rows);
};
/* raw continuous factorial (revenue per visitor) */
S_.mvContinuous = function (o) {
  o = o || {}; const rng = MT.rng(o.seed || 12), rows = [['price_display', 'badge', 'revenue']], n = o.n || 300;
  for (const p of ['Monthly', 'Annual first']) for (const b of ['None', 'Best value']) for (let i = 0; i < n; i++) { let v = rng.u() < 0.1 + (p === 'Annual first' ? 0.02 : 0) + (b === 'Best value' ? 0.005 : 0) ? 40 + Math.exp(rng.n() * 0.5 + 2) * (p === 'Annual first' ? 1.25 : 1) : 0; rows.push([p, b, v.toFixed(2)]); }
  return MT.toCSV(rows);
};
S_.abRawContinuous = function (o) {
  o = o || {}; const rng = MT.rng(o.seed || 21), rows = [['variant', 'revenue']];
  for (const [v, lift, n] of [['control', 0, 600], ['new_checkout', 0.12, 600]]) for (let i = 0; i < n; i++) rows.push([v, (rng.u() < 0.18 ? Math.exp(3.4 + 0.7 * rng.n()) * (1 + lift) : 0).toFixed(2)]);
  return MT.toCSV(rows);
};
})(window);
