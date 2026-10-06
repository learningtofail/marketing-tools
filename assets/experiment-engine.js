/* Experiment engine: model selection + estimation for randomized (A/B/n), factorial (multivariate) and quasi-experimental tests.
   Method selection follows the "Causal Inference Model Selection Guide" decision tree. Pure functions, no DOM. */
(function (g) {
'use strict';
const MT = g.MT, S = MT.stat, M = MT.mat, isNum = MT.isNum, F = MT.fmt;
const E = MT.exp = {};
const sum = S.sum;
const tick = () => new Promise(r => setTimeout(r, 0));

/* ---------- formatting + verdict ---------- */
function fmtEff(x, res, rel) {
  if (!isNum(x)) return '—';
  if (rel) return F.spct(x, 1);
  if (res.unit === 'pp') return (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + ' pp';
  return (x >= 0 ? '+' : '') + F.n(x, Math.abs(x) < 10 ? 3 : 1);
}
E.fmtEff = fmtEff;
function pLabel(p, bound) { if (!isNum(p)) return ''; if (bound) return 'p < ' + (Math.round(p * 1000) / 1000); const s = F.p(p); return s[0] === '<' ? 'p ' + s : 'p = ' + s; }
/* comps: [{name, est, rel, sig, pAdj}] -> verdict */
function verdictFrom(res, comps, opt) {
  const better = opt.better || 'high', good = c => (better === 'low' ? -c.est : c.est) > 0, minEff = opt.minEff;
  const pos = comps.filter(c => c.sig && good(c)), neg = comps.filter(c => c.sig && !good(c));
  const small = c => isNum(minEff) && minEff > 0 && isNum(c.rel) && Math.abs(c.rel) < minEff;
  const desc = c => `${c.name}: ${fmtEff(c.est, res)} (${fmtEff(c.rel, res, true)} relative), ${pLabel(c.pAdj != null ? c.pAdj : c.p, c.pBound)}${comps.length > 1 && c.pAdj != null ? ' (Holm-adjusted)' : ''}`;
  let v;
  if (pos.length && !neg.length) {
    const best = pos.slice().sort((a, b) => Math.abs(b.est) - Math.abs(a.est))[0];
    v = { cls: 'pos', title: 'Positive and statistically significant', text: desc(best) + (pos.length > 1 ? `. ${pos.length - 1} other comparison${pos.length > 2 ? 's are' : ' is'} also significantly positive.` : '.') + (small(best) ? ` The effect is smaller than your minimum effect of interest (${F.pct(minEff, 1)}), so it may not be worth acting on.` : '') };
  } else if (neg.length && !pos.length) {
    const worst = neg.slice().sort((a, b) => Math.abs(b.est) - Math.abs(a.est))[0];
    v = { cls: 'neg', title: 'Negative and statistically significant', text: desc(worst) + (neg.length > 1 ? `. ${neg.length - 1} other comparison${neg.length > 2 ? 's are' : ' is'} also significantly negative.` : '.') + ' The change made results worse than the baseline.' };
  } else if (pos.length && neg.length) {
    v = { cls: 'neu', title: 'Mixed: some comparisons win, others lose', text: `${pos.length} significantly positive and ${neg.length} significantly negative. Review each comparison below before choosing.` };
  } else {
    v = { cls: 'neu', title: 'No statistically significant difference', text: (comps.length === 1 ? desc(comps[0]) + '. ' : '') + 'The data cannot separate the change from random noise at your chosen significance level. This is not proof of no effect.' + (res.power && isNum(res.power.mdeRel) ? ` At this sample size the test could reliably detect only a relative change of about ±${F.pct(res.power.mdeRel, 1)} (80% power). Smaller real effects remain possible.` : '') };
  }
  return v;
}
E.verdictFrom = verdictFrom;

/* ---------- A/B/n (randomized, one factor) ---------- */
/* groups: [{name, n, x}] binary | [{name, n, mean, sd, raw?:[]}] continuous. groups[0] is the control. */
E.analyzeAB = function (groups, opt) {
  const alpha = opt.alpha || 0.05, k = groups.length, c = groups[0], res = { kind: 'ab', metric: opt.metric, unit: opt.metric === 'binary' ? 'pp' : 'num', groups, comps: [], diag: [], notes: [], path: [], why: [], alpha };
  if (k < 2) throw new Error('Add at least two variants (a control and one treatment).');
  const bin = opt.metric === 'binary';
  if (!bin) groups.forEach(gp => { if (gp.raw) { gp.mean = S.mean(gp.raw); gp.sd = S.sd(gp.raw); gp.n = gp.raw.length; } });
  groups.forEach(gp => { if (!(gp.n >= 2)) throw new Error(`"${gp.name}": visitors must be at least 2.`); if (bin && (gp.x < 0 || gp.x > gp.n)) throw new Error(`"${gp.name}": conversions must be between 0 and visitors.`); if (!bin && !(gp.sd >= 0)) throw new Error(`"${gp.name}": enter a valid standard deviation.`); });
  // Sample ratio mismatch
  const N = sum(groups.map(x => x.n)); let w = opt.split && opt.split.length === k ? opt.split.slice() : new Array(k).fill(1); const ws = sum(w); w = w.map(x => x / ws);
  let chi = 0; groups.forEach((gp, i) => { chi += (gp.n - N * w[i]) ** 2 / (N * w[i]); }); const srmP = S.chi2Sf(chi, k - 1); res.srm = { chi2: chi, p: srmP };
  res.diag.push(srmP < 0.001 ? { s: 'bad', t: `Sample ratio mismatch (p = ${F.p(srmP)}). Traffic did not split as planned, which usually means a bug in assignment or tracking. Do not trust the result until this is explained.` } : srmP < 0.01 ? { s: 'warn', t: `Possible sample ratio mismatch (p = ${F.p(srmP)}). Check the assignment mechanism.` } : { s: 'ok', t: `Traffic split matches the plan (SRM chi-square p = ${F.p(srmP)}).` });
  if (bin) {
    const minN = Math.min(...groups.map(x => x.n)); if (minN < 100) res.diag.push({ s: 'warn', t: `Smallest group has only ${minN} visitors. Normal approximations are unreliable at this size.` });
    const tot = sum(groups.map(x => x.x)), pooled = tot / N;
    if (k === 2) {
      const t = groups[1], a = t.x, b = t.n - t.x, cc = c.x, d = c.n - c.x, r1 = a + b, r2 = cc + d, c1 = a + cc, c2 = b + d, minExp = Math.min(r1 * c1, r1 * c2, r2 * c1, r2 * c2) / N;
      const zt = S.twoProp(t.x, t.n, c.x, c.n, alpha), fisher = minExp < 5 ? S.fisher(a, b, cc, d) : null, bay = S.betaBinom(t.x, t.n, c.x, c.n, 40000, 7);
      const useF = fisher != null, p = useF ? fisher : zt.p;
      res.method = useF ? 'Fisher exact test' : 'Two-proportion z-test';
      res.path = ['Randomized split', 'Binary outcome (conversions / visitors)', '2 variants', useF ? 'Fisher exact test' : 'Two-proportion z-test'];
      res.why.push(useF ? `A cell has an expected count of ${minExp.toFixed(1)} (below 5), so the z approximation is unreliable. Fisher's exact test gives an exact p-value.` : 'Both groups are large enough (all expected cell counts are 5 or more) for the two-proportion z-test.', 'Randomization removes confounding, so a direct comparison of rates is valid. No counterfactual modeling is needed.');
      res.comps.push({ name: `${t.name} vs ${c.name}`, est: zt.diff, lo: zt.ciLo, hi: zt.ciHi, rel: zt.rel, relLo: zt.relLo, relHi: zt.relHi, p, pAdj: p, sig: p < alpha, rateT: zt.p1, rateC: zt.p2, bayes: bay, z: zt.z });
      res.power = { mdeAbs: S.mdeProp(zt.p2 || pooled, t.n, c.n, alpha, 0.8) }; res.power.mdeRel = zt.p2 ? res.power.mdeAbs / zt.p2 : NaN;
      res.notes.push(`Bayesian cross-check: probability the variant beats control is ${F.pct(bay.pBeat, 1)}; expected loss if you ship it is ${(bay.expLossChoose * 100).toFixed(3)} pp.`);
    } else {
      const tab = groups.map(x => [x.x, x.n - x.x]), om = S.chi2Table(tab); res.omnibus = { name: 'Chi-square test of independence', stat: om.chi2, df: om.df, p: om.p, effect: `Cramer's V = ${om.cramersV.toFixed(3)}` };
      res.method = 'Chi-square omnibus test with Holm-corrected pairwise z-tests'; res.path = ['Randomized split', 'Binary outcome (conversions / visitors)', `${k} variants (A/B/n)`, 'Chi-square omnibus + Holm pairwise'];
      res.why.push(`Testing ${k - 1} variants against one control multiplies the chance of a false positive. The omnibus test asks whether any difference exists, and Holm's correction controls the family-wise error rate across the ${k - 1} pairwise comparisons.`);
      if (om.minExpected < 5) res.diag.push({ s: 'warn', t: 'Some expected cell counts are below 5. Treat the omnibus p-value as approximate.' });
      const ps = []; groups.slice(1).forEach(t => { const zt = S.twoProp(t.x, t.n, c.x, c.n, alpha), bay = S.betaBinom(t.x, t.n, c.x, c.n, 20000, 7); ps.push(zt.p); res.comps.push({ name: `${t.name} vs ${c.name}`, est: zt.diff, lo: zt.ciLo, hi: zt.ciHi, rel: zt.rel, relLo: zt.relLo, relHi: zt.relHi, p: zt.p, rateT: zt.p1, rateC: zt.p2, bayes: bay }); });
      const adj = S.holm(ps); res.comps.forEach((x, i) => { x.pAdj = adj[i]; x.sig = adj[i] < alpha; });
      const zc = S.zCrit(alpha / (k - 1)); res.notes.push(`Confidence intervals shown are unadjusted (${F.pct(1 - alpha, 0)}). Significance uses Holm-adjusted p-values.`);
      res.power = { mdeAbs: S.mdeProp(c.x / c.n || pooled, Math.min(...groups.slice(1).map(x => x.n)), c.n, alpha / (k - 1), 0.8) }; res.power.mdeRel = c.x ? res.power.mdeAbs / (c.x / c.n) : NaN;
    }
  } else {
    groups.forEach(gp => { if (gp.raw) { gp.mean = S.mean(gp.raw); gp.sd = S.sd(gp.raw); gp.n = gp.raw.length; } });
    const minN = Math.min(...groups.map(x => x.n)); if (minN < 30) res.diag.push({ s: 'warn', t: `Smallest group has ${minN} observations. The t-test assumes roughly normal means; results are fragile below about 30 per group.` });
    let skew = NaN, zeros = NaN; if (c.raw) { skew = Math.max(...groups.map(x => Math.abs(S.skew(x.raw)))); zeros = sum(groups.map(x => x.raw.filter(v => v === 0).length)) / N; res.skew = skew; if (skew > 2) res.diag.push({ s: 'warn', t: `Heavy skew detected (max |skew| = ${skew.toFixed(1)}). Revenue-style metrics have long tails; a few large orders can drive the mean. Check the bootstrap interval and consider capping outliers.` }); if (zeros > 0.5) res.notes.push(`${F.pct(zeros, 0)} of observations are zero (zero-inflated metric). The t-test on mean per visitor is still valid at large n, but see the conversion-rate component separately.`); }
    if (k === 2) {
      const t = groups[1], wl = S.welch(t.mean, t.sd, t.n, c.mean, c.sd, c.n, alpha); let p = wl.p, method = 'Welch two-sample t-test', mw = null, boot = null, lo = wl.ciLo, hi = wl.ciHi;
      if (c.raw) { mw = S.mannWhitney(t.raw, c.raw); boot = S.bootDiff(t.raw, c.raw, 2000, 11); }
      const nonpar = c.raw && minN < 30 && skew > 1;
      if (nonpar) { p = mw.p; method = 'Mann-Whitney U test (rank-based)'; lo = boot.lo; hi = boot.hi; res.why.push(`Groups are small (n < 30) and skewed (|skew| = ${skew.toFixed(1)}), so a rank-based test is safer than a t-test. The interval is a bootstrap.`); }
      else res.why.push(c.raw ? 'Welch\'s t-test does not assume equal variances and is reliable at these sample sizes. Mann-Whitney and a bootstrap interval are shown as robustness checks.' : 'Only summary statistics were supplied, so Welch\'s t-test (unequal variances) is used. Distribution shape cannot be checked without raw data.');
      res.method = method; res.path = ['Randomized split', 'Continuous outcome (mean per user)', '2 variants', nonpar ? 'Mann-Whitney U' : 'Welch t-test'];
      res.comps.push({ name: `${t.name} vs ${c.name}`, est: wl.diff, lo, hi, rel: wl.rel, relLo: lo / c.mean, relHi: hi / c.mean, p, pAdj: p, sig: p < alpha, meanT: t.mean, meanC: c.mean, robust: mw ? { mwP: mw.p, bootLo: boot.lo, bootHi: boot.hi, welchP: wl.p } : null, t: wl.t, df: wl.df });
      const sdp = Math.sqrt((t.sd ** 2 + c.sd ** 2) / 2); res.power = { mdeAbs: S.mdeMean(sdp, t.n, c.n, alpha, 0.8) }; res.power.mdeRel = c.mean ? res.power.mdeAbs / Math.abs(c.mean) : NaN;
      if (mw && Math.abs(mw.p < alpha ? 1 : 0) !== Math.abs(wl.p < alpha ? 1 : 0)) res.diag.push({ s: 'warn', t: `Welch (p = ${F.p(wl.p)}) and Mann-Whitney (p = ${F.p(mw.p)}) disagree on significance. The result is sensitive to outliers or distribution shape.` });
    } else {
      const an = S.anova(groups); res.omnibus = { name: 'One-way ANOVA', stat: an.F, df: `${an.df1}, ${an.df2}`, p: an.p, effect: `eta-squared = ${an.etaSq.toFixed(4)}` };
      res.method = 'One-way ANOVA with Holm-corrected pairwise Welch t-tests'; res.path = ['Randomized split', 'Continuous outcome (mean per user)', `${k} variants (A/B/n)`, 'ANOVA + Holm pairwise Welch'];
      res.why.push(`With ${k} variants, ANOVA tests for any difference first and Holm's correction protects the ${k - 1} pairwise comparisons against inflated false positives.`);
      const ps = []; groups.slice(1).forEach(t => { const wl = S.welch(t.mean, t.sd, t.n, c.mean, c.sd, c.n, alpha); ps.push(wl.p); res.comps.push({ name: `${t.name} vs ${c.name}`, est: wl.diff, lo: wl.ciLo, hi: wl.ciHi, rel: wl.rel, relLo: wl.relLo, relHi: wl.relHi, p: wl.p, meanT: t.mean, meanC: c.mean }); });
      const adj = S.holm(ps); res.comps.forEach((x, i) => { x.pAdj = adj[i]; x.sig = adj[i] < alpha; });
      const sdp = Math.sqrt(sum(groups.map(x => x.sd ** 2)) / k); res.power = { mdeAbs: S.mdeMean(sdp, Math.min(...groups.slice(1).map(x => x.n)), c.n, alpha / (k - 1), 0.8) }; res.power.mdeRel = c.mean ? res.power.mdeAbs / Math.abs(c.mean) : NaN;
    }
  }
  res.notes.push('Fixed-horizon tests assume you analyse once, at the planned sample size. Repeatedly checking and stopping at the first significant result inflates false positives.');
  res.verdict = verdictFrom(res, res.comps, opt); if (res.diag.some(d => d.s === 'bad')) { res.verdict.caution = 'Sample ratio mismatch detected. Resolve it before acting on this result.'; }
  return res;
};

/* ---------- Multivariate / factorial ---------- */
/* cells: [{lv:{factor:level}, n, s}] binary | [{lv, n, mean, sd}] continuous. opt: {metric, alpha, factors:[], base:{f:level}, interactions:bool} */
E.analyzeMV = function (cells, opt) {
  const alpha = opt.alpha || 0.05, bin = opt.metric === 'binary', factors = opt.factors, res = { kind: 'mv', metric: opt.metric, unit: bin ? 'pp' : 'num', comps: [], diag: [], notes: [], path: [], why: [], alpha, cells, factors };
  const levels = {}; factors.forEach(f => { levels[f] = Array.from(new Set(cells.map(c => c.lv[f]))).sort(); });
  factors.forEach(f => { if (levels[f].length < 2) throw new Error(`Factor "${f}" has only one level in the data.`); if (levels[f].length > 8) throw new Error(`Factor "${f}" has ${levels[f].length} levels. Limit is 8; combine sparse levels.`); });
  const base = {}; factors.forEach(f => { base[f] = opt.base && levels[f].includes(opt.base[f]) ? opt.base[f] : (levels[f].find(l => /^(control|baseline|default|original|current|none|a\b)/i.test(l)) || levels[f][0]); });
  res.levels = levels; res.base = base;
  cells = cells.filter(c => c.n > 0); const Ncell = cells.length, Ntot = sum(cells.map(c => c.n));
  if (Ncell < 3) throw new Error('Need at least 3 combinations (cells) with data.');
  let inter = !!opt.interactions && factors.length >= 2;
  const build = (inter2) => { const terms = [{ n: 'Intercept', f: [] }]; factors.forEach(f => levels[f].forEach(l => { if (l !== base[f]) terms.push({ n: `${f} = ${l}`, f: [f], l: { [f]: l } }); })); if (inter2) for (let i = 0; i < factors.length; i++) for (let j = i + 1; j < factors.length; j++) { const a = factors[i], b = factors[j]; levels[a].forEach(la => { if (la === base[a]) return; levels[b].forEach(lb => { if (lb === base[b]) return; terms.push({ n: `${a} = ${la} × ${b} = ${lb}`, f: [a, b], l: { [a]: la, [b]: lb } }); }); }); } return terms; };
  let terms = build(inter);
  if (inter && terms.length >= Ncell) { inter = false; terms = build(false); res.diag.push({ s: 'warn', t: `Interactions dropped: the model would need ${build(true).length} parameters but only ${Ncell} combinations have data.` }); }
  if (terms.length >= Ncell + (inter ? 1 : 0) && Ncell <= terms.length - 1) throw new Error('More parameters than cells. Reduce factors or levels.');
  const row = lv => terms.map(t => t.n === 'Intercept' ? 1 : Object.keys(t.l).every(f => lv[f] === t.l[f]) ? 1 : 0), Xc = cells.map(c => row(c.lv)), k = terms.length;
  res.terms = terms.map(t => t.n); res.interactions = inter;
  // fit
  let beta, V, linkInv, dlink, dfRes = Infinity, logit = null, testP;
  if (bin) {
    logit = S.logit(Xc, cells.map(c => c.s), cells.map(c => c.n)); beta = logit.beta; V = logit.cov; linkInv = e => 1 / (1 + Math.exp(-e)); dlink = e => { const p = 1 / (1 + Math.exp(-e)); return p * (1 - p); };
    if (logit.separation) res.diag.push({ s: 'warn', t: 'Perfect or near-perfect separation in some cells (rates at 0% or 100%). Coefficients are unstable; collect more data or merge levels.' });
    if (!logit.converged) res.diag.push({ s: 'warn', t: 'The logistic fit did not fully converge. Interpret coefficients cautiously.' });
    res.method = 'Logistic regression' + (inter ? ' with two-way interactions' : ' (main effects)') + ' on cell counts, Wald tests, Holm-corrected'; testP = (w, df) => S.chi2Sf(w, df);
  } else {
    const A = Array.from({ length: k }, () => new Array(k).fill(0)), b = new Array(k).fill(0); cells.forEach((c, i) => { for (let a = 0; a < k; a++) { b[a] += c.n * Xc[i][a] * c.mean; for (let d = 0; d < k; d++) A[a][d] += c.n * Xc[i][a] * Xc[i][d]; } });
    const Ai = M.inv(A); beta = M.mulv(Ai, b); const meat = Array.from({ length: k }, () => new Array(k).fill(0)); cells.forEach((c, i) => { const d = c.mean - sum(Xc[i].map((x, j) => x * beta[j])), w = (c.n - 1) * c.sd * c.sd + c.n * d * d; for (let a = 0; a < k; a++) for (let e2 = 0; e2 < k; e2++) meat[a][e2] += Xc[i][a] * Xc[i][e2] * w; });
    V = M.mul(M.mul(Ai, meat), Ai).map(r => r.map(v => v * Ntot / Math.max(1, Ntot - k))); linkInv = e => e; dlink = () => 1; dfRes = Ntot - k;
    res.method = 'Weighted least squares' + (inter ? ' with two-way interactions' : ' (main effects)') + ', robust (HC1) standard errors, Wald tests, Holm-corrected'; testP = (w, df) => S.fSf(w / df, df, dfRes);
  }
  const zp = (est, se) => bin ? S.normSf2(est / se) : S.tSf2(est / se, dfRes), crit = bin ? S.zCrit(alpha) : S.tCrit(alpha, dfRes);
  // Wald joint tests
  const wald = idx => { const b = idx.map(i => beta[i]), Vs = idx.map(i => idx.map(j => V[i][j])), w = sum(M.mulv(M.inv(Vs), b).map((v, i) => v * b[i])); return { w, df: idx.length, p: testP(w, idx.length) }; };
  res.factorTests = factors.map(f => { const idx = terms.map((t, i) => t.f.includes(f) ? i : -1).filter(i => i >= 0), r = wald(idx); return { factor: f, df: r.df, w: r.w, p: r.p, scope: inter ? 'main effect and its interactions' : 'main effect' }; });
  res.interTests = []; if (inter) for (let i = 0; i < factors.length; i++) for (let j = i + 1; j < factors.length; j++) { const idx = terms.map((t, q) => t.f.length === 2 && t.f.includes(factors[i]) && t.f.includes(factors[j]) ? q : -1).filter(q => q >= 0); if (idx.length) { const r = wald(idx); res.interTests.push({ pair: `${factors[i]} × ${factors[j]}`, df: r.df, p: r.p, sig: r.p < alpha }); } }
  if (res.interTests.some(t => t.sig)) res.notes.push('At least one interaction is significant: the effect of one element depends on the value of another. Average effects below can mislead; use the combination table to pick a winner.');
  // Average marginal effects per level vs baseline (delta method)
  const wts = cells.map(c => c.n), W = sum(wts);
  const predAt = (mod) => { let mu = 0; const gr = new Array(k).fill(0); cells.forEach((c, i) => { const lv = Object.assign({}, c.lv, mod), x = row(lv), eta = sum(x.map((v, j) => v * beta[j])); mu += wts[i] * linkInv(eta); const d = dlink(eta); for (let j = 0; j < k; j++) gr[j] += wts[i] * d * x[j]; }); return { mu: mu / W, gr: gr.map(v => v / W) }; };
  const ps = [];
  factors.forEach(f => { const b0 = predAt({ [f]: base[f] }); levels[f].forEach(l => { if (l === base[f]) return; const t = predAt({ [f]: l }), est = t.mu - b0.mu, gr = t.gr.map((v, j) => v - b0.gr[j]), se = Math.sqrt(Math.max(0, sum(M.mulv(V, gr).map((v, j) => v * gr[j])))), p = se ? zp(est, se) : 1; ps.push(p); res.comps.push({ name: `${f}: ${l} vs ${base[f]}`, factor: f, level: l, est, lo: est - crit * se, hi: est + crit * se, rel: b0.mu ? est / b0.mu : NaN, relLo: b0.mu ? (est - crit * se) / b0.mu : NaN, relHi: b0.mu ? (est + crit * se) / b0.mu : NaN, p, base: b0.mu, odds: bin ? Math.exp(beta[terms.findIndex(q => q.n === `${f} = ${l}`)]) : null }); }); });
  const adj = S.holm(ps); res.comps.forEach((c, i) => { c.pAdj = adj[i]; c.sig = adj[i] < alpha; });
  // coefficient table
  res.coefs = terms.map((t, i) => ({ term: t.n, est: beta[i], se: Math.sqrt(V[i][i]), p: zp(beta[i], Math.sqrt(V[i][i])) }));
  // cell table vs control cell
  const ctrl = cells.find(c => factors.every(f => c.lv[f] === base[f])); res.cellRows = [];
  const rate = c => bin ? c.s / c.n : c.mean;
  cells.forEach(c => { res.cellRows.push({ label: factors.map(f => c.lv[f]).join(' / '), lv: c.lv, n: c.n, val: rate(c), isCtrl: c === ctrl }); });
  if (ctrl) { const cp = [], idx = []; cells.forEach((c, i) => { if (c === ctrl) return; let p, d; if (bin) { const t = S.twoProp(c.s, c.n, ctrl.s, ctrl.n, alpha); p = t.p; d = t.diff; res.cellRows[i].rel = t.rel; } else { const t = S.welch(c.mean, c.sd, c.n, ctrl.mean, ctrl.sd, ctrl.n, alpha); p = t.p; d = t.diff; res.cellRows[i].rel = t.rel; } res.cellRows[i].est = d; res.cellRows[i].p = p; cp.push(p); idx.push(i); }); const ad = S.holm(cp); idx.forEach((i, q) => { res.cellRows[i].pAdj = ad[q]; res.cellRows[i].sig = ad[q] < alpha; }); }
  res.controlCell = ctrl ? factors.map(f => base[f]).join(' / ') : null; if (!ctrl) res.notes.push('The all-baseline combination is not in the data, so combinations are not compared against a control cell.');
  // recommended combo (model-based)
  const comboBest = {}; factors.forEach(f => { let bl = base[f], bv = 0; res.comps.filter(c => c.factor === f).forEach(c => { const v = (opt.better === 'low' ? -c.est : c.est); if (c.sig && v > bv) { bv = v; bl = c.level; } }); comboBest[f] = bl; }); res.recommended = comboBest;
  const combKey = lv => factors.map(f => lv[f]).join('|'); const rc = cells.find(c => combKey(c.lv) === combKey(comboBest)); res.recommendedObserved = rc ? { val: rate(rc), n: rc.n } : null; res.recommendedPred = predictCell(comboBest);
  function predictCell(lv) { const x = row(lv), eta = sum(x.map((v, j) => v * beta[j])); return linkInv(eta); }
  // diagnostics
  const minN = Math.min(...cells.map(c => c.n)); if (minN < 100) res.diag.push({ s: 'warn', t: `Smallest combination has ${minN} observations. Multivariate tests split traffic thinly; cells this small give wide intervals.` });
  if (bin) { const lowS = cells.filter(c => c.s < 10 || c.n - c.s < 10).length; if (lowS) res.diag.push({ s: 'warn', t: `${lowS} combination${lowS > 1 ? 's have' : ' has'} fewer than 10 conversions (or non-conversions). Estimates there are unreliable.` }); }
  const eq = Ntot / Ncell; let chi = 0; cells.forEach(c => chi += (c.n - eq) ** 2 / eq); const srmP = S.chi2Sf(chi, Ncell - 1); res.srm = { p: srmP };
  res.diag.push(srmP < 0.001 ? { s: 'bad', t: `Traffic is not evenly split across combinations (chi-square p = ${F.p(srmP)}). If you planned equal allocation, check assignment.` } : { s: 'ok', t: `Traffic is evenly split across combinations (p = ${F.p(srmP)}).` });
  const allComb = factors.reduce((a, f) => a * levels[f].length, 1); if (Ncell < allComb) res.diag.push({ s: 'warn', t: `Only ${Ncell} of ${allComb} possible combinations appear in the data (fractional design). Interactions may not be estimable.` });
  res.path = ['Randomized split', `${factors.length} elements varied together (factorial)`, bin ? 'Binary outcome' : 'Continuous outcome', bin ? 'Logistic regression' : 'Weighted least squares'];
  res.why.push(`Several elements change at once, so a single A/B test per element would waste traffic and hide interactions. A regression on all cells estimates each element's effect while holding the others fixed.`, bin ? 'The outcome is binary, so a logistic model keeps predicted rates between 0 and 100%. Effects are reported as average marginal effects (percentage-point change) via the delta method.' : 'The outcome is continuous, so weighted least squares on cell means with heteroskedasticity-robust errors is used. Effects are average marginal effects in metric units.', 'Holm correction is applied across all level-vs-baseline contrasts because each is a separate hypothesis.');
  res.notes.push('Baselines: ' + factors.map(f => `${f} = ${base[f]}`).join('; ') + '.');
  res.power = { mdeRel: NaN };
  res.verdict = verdictFrom(res, res.comps, opt); if (res.verdict.cls === 'pos' || res.verdict.cls === 'neu') { const pos = res.comps.filter(c => c.sig && (opt.better === 'low' ? c.est < 0 : c.est > 0)); if (pos.length) res.verdict.text += ' Best combination by the model: ' + factors.map(f => `${f} = ${comboBest[f]}`).join(', ') + '.'; }
  if (res.diag.some(d => d.s === 'bad')) res.verdict.caution = 'Allocation problem detected. Confirm the traffic split before acting.';
  return res;
};

/* ---------- Quasi-experimental ---------- */
const col = (X, j) => X.map(r => r[j]);
const rows = cols => cols[0].map((_, i) => cols.map(c => c[i]));
const nanArr = n => new Array(n).fill(NaN);
function finishEffect(D, e, cf, y, o) { const T = y.length, post = MT.range(T - e, e); const gaps = post.map(i => y[i] - cf[i]); return { avg: S.mean(gaps), cum: sum(gaps), gaps, cfPostMean: S.mean(post.map(i => cf[i])), cfPostSum: sum(post.map(i => cf[i])) }; }

E.fitITS = function (D, e, o) {
  o = o || {}; const T = D.y.length, y = D.y, m = o.season || 0, ctrl = o.ctrl || null, alpha = o.alpha || 0.05, nP = T - e;
  const build = (i, post) => { const tc = i - e, r = [1, tc, post ? 1 : 0, post ? tc : 0]; if (m > 1) for (let s = 1; s < m; s++) r.push(i % m === s ? 1 : 0); if (ctrl) ctrl[i].forEach(v => r.push(v)); return r; };
  const X = MT.range(T).map(i => build(i, i >= e)), k = X[0].length; if (T <= k + 2) throw new Error('Too few observations for the interrupted time series model.');
  const L = S.nwLag(T), fit = S.ols(X, y, { se: L }), tcm = S.mean(MT.range(nP, e).map(i => i - e)), Lv = new Array(k).fill(0); Lv[2] = 1; Lv[3] = tcm;
  const est = sum(Lv.map((l, j) => l * fit.beta[j])), vr = sum(M.mulv(fit.cov, Lv).map((v, j) => v * Lv[j])), se = Math.sqrt(Math.max(vr, 0)), tc = S.tCrit(alpha, fit.df), p = se ? S.tSf2(est / se, fit.df) : 1;
  const cf = new Array(T), lo = nanArr(T), hi = nanArr(T);
  for (let i = 0; i < T; i++) { const x = build(i, false), f = sum(x.map((v, j) => v * fit.beta[j])); cf[i] = f; if (i >= e) { const s = Math.sqrt(Math.max(0, sum(M.mulv(fit.cov, x).map((v, j) => v * x[j])))); lo[i] = f - tc * s; hi[i] = f + tc * s; } }
  const ef = finishEffect(D, e, cf, y), r1 = (() => { const r = fit.resid; return S.corr(r.slice(1), r.slice(0, -1)); })();
  return { method: 'ITS', avg: est, avgLo: est - tc * se, avgHi: est + tc * se, cum: est * nP, cumLo: (est - tc * se) * nP, cumHi: (est + tc * se) * nP, rel: est / ef.cfPostMean, relLo: (est - tc * se) / ef.cfPostMean, relHi: (est + tc * se) / ef.cfPostMean, p, sig: p < alpha, cf, cfLo: lo, cfHi: hi,
    extra: { level: { est: fit.beta[2], se: fit.se[2], p: fit.p[2] }, slopePre: { est: fit.beta[1], se: fit.se[1], p: fit.p[1] }, slopeChange: { est: fit.beta[3], se: fit.se[3], p: fit.p[3] }, r2: fit.r2, rho1: r1, nwLag: L, k, season: m, controls: ctrl ? ctrl[0].length : 0 } };
};
E.fitPrePost = function (D, e, o) {
  o = o || {}; const T = D.y.length, y = D.y, alpha = o.alpha || 0.05, w = Math.min(e, T - e), pre = y.slice(e - w, e), post = y.slice(e, e + w), d = post.map((v, i) => v - pre[i]);
  const wil = S.wilcoxon(d), pt = S.pairedT(d), mw = S.mannWhitney(y.slice(e), y.slice(0, e)), tc = S.tCrit(alpha, Math.max(1, w - 1)), se = S.sd(d) / Math.sqrt(w), avg = S.mean(d);
  const cf = new Array(T).fill(S.mean(y.slice(0, e))), preMean = S.mean(pre), nP = T - e;
  return { method: 'PrePost', avg, avgLo: avg - tc * se, avgHi: avg + tc * se, cum: avg * nP, cumLo: (avg - tc * se) * nP, cumHi: (avg + tc * se) * nP, rel: avg / preMean, relLo: (avg - tc * se) / preMean, relHi: (avg + tc * se) / preMean, p: wil.p, sig: wil.p < alpha, cf, cfLo: nanArr(T), cfHi: nanArr(T), extra: { window: w, wilcoxon: wil, pairedT: pt, mannWhitney: mw, preMean, postMean: S.mean(post) } };
};
E.parallelTrends = function (D, e, ctrlSeries) {
  const T = D.y.length, d = D.y.map((v, i) => v - ctrlSeries[i]), dp = d.slice(0, e), n = e, f = S.ols(MT.range(n).map(i => [1, i / n]), dp, { se: S.nwLag(n) });
  const did = S.ols(MT.range(T).map(i => [1, i >= e ? 1 : 0]), d, { se: S.nwLag(T) }), gapT = (T - e - 1) / 2 + e - (n - 1) / 2, slopePerStep = f.beta[1] / n, driftBias = slopePerStep * gapT, seDiD = did.se[1];
  const lowPower = Math.abs(driftBias) > 0.5 * seDiD, pass = f.p[1] >= 0.10 && !lowPower;
  return { slope: slopePerStep, se: f.se[1] / n, p: f.p[1], n, driftBias, seDiD, pass, byDrift: f.p[1] >= 0.10 && lowPower };
};
E.fitDiD = function (D, e, o) {
  o = o || {}; const T = D.y.length, alpha = o.alpha || 0.05, c = o.control, d = D.y.map((v, i) => v - c[i]), X = MT.range(T).map(i => [1, i >= e ? 1 : 0]), L = S.nwLag(T), fit = S.ols(X, d, { se: L }), b = fit.beta[1], se = fit.se[1], tc = S.tCrit(alpha, fit.df), nP = T - e;
  const cf = c.map(v => v + fit.beta[0]), lo = nanArr(T), hi = nanArr(T); for (let i = e; i < T; i++) { lo[i] = cf[i] - tc * fit.se[0]; hi[i] = cf[i] + tc * fit.se[0]; }
  const ef = finishEffect(D, e, cf, D.y), p = fit.p[1], yT = D.y, mean = (a, s, t) => S.mean(a.slice(s, t));
  return { method: 'DiD', avg: b, avgLo: b - tc * se, avgHi: b + tc * se, cum: b * nP, cumLo: (b - tc * se) * nP, cumHi: (b + tc * se) * nP, rel: b / ef.cfPostMean, relLo: (b - tc * se) / ef.cfPostMean, relHi: (b + tc * se) / ef.cfPostMean, p, sig: p < alpha, cf, cfLo: lo, cfHi: hi,
    extra: { table: { treatPre: mean(yT, 0, e), treatPost: mean(yT, e, T), ctrlPre: mean(c, 0, e), ctrlPost: mean(c, e, T) }, nwLag: L, se } };
};
function scmFit(y, X, e) { const w = S.scmWeights(rows(X.map(c => c.slice(0, e))), y.slice(0, e)), T = y.length, cf = MT.range(T).map(i => sum(w.map((wj, j) => wj * X[j][i]))); return { w, cf }; }
function rmspe(y, cf, a, b) { let s = 0; for (let i = a; i < b; i++) s += (y[i] - cf[i]) ** 2; return Math.sqrt(s / Math.max(1, b - a)); }
E.fitSCM = function (D, e, o) {
  o = o || {}; const T = D.y.length, y = D.y, J = D.donors.length, alpha = o.alpha || 0.05, nP = T - e, Xc = D.donors.map(d => d.values), { w, cf } = scmFit(y, Xc, e);
  const rp = rmspe(y, cf, 0, e), rq = rmspe(y, cf, e, T), ratio = rq / Math.max(rp, 1e-12), ef = finishEffect(D, e, cf, y), sstPre = sum(y.slice(0, e).map(v => (v - S.mean(y.slice(0, e))) ** 2)), r2 = 1 - (rp * rp * e) / sstPre;
  const half = Math.floor(e / 2), wA = S.scmWeights(rows(Xc.map(c => c.slice(0, half))), y.slice(0, half)), wB = S.scmWeights(rows(Xc.map(c => c.slice(half, e))), y.slice(half, e)), stab = 1 - sum(wA.map((v, j) => Math.abs(v - wB[j]))) / 2;
  const lo = nanArr(T), hi = nanArr(T); for (let i = e; i < T; i++) { lo[i] = cf[i] - 1.96 * rp; hi[i] = cf[i] + 1.96 * rp; }
  let placebo = null;
  if (o.placebo !== false && J >= 3) { const ratios = [], gaps = []; for (let j = 0; j < J; j++) { const yj = Xc[j], others = Xc.filter((_, q) => q !== j), f = scmFit(yj, others, e), a = rmspe(yj, f.cf, 0, e), b = rmspe(yj, f.cf, e, T); ratios.push(b / Math.max(a, 1e-12)); gaps.push(S.mean(MT.range(nP, e).map(i => yj[i] - f.cf[i]))); } const cnt = ratios.filter(r => r >= ratio).length; placebo = { ratios, gaps, p: (1 + cnt) / (J + 1), pMin: 1 / (J + 1), n: J, rank: cnt + 1 }; }
  return { method: 'SCM', avg: ef.avg, avgLo: NaN, avgHi: NaN, cum: ef.cum, cumLo: NaN, cumHi: NaN, rel: ef.avg / ef.cfPostMean, relLo: NaN, relHi: NaN, p: placebo ? placebo.p : NaN, sig: placebo ? placebo.p < alpha : false, cf, cfLo: lo, cfHi: hi,
    extra: { weights: w.map((v, j) => ({ name: D.donors[j].name, w: v })).sort((a, b) => b.w - a.w), preRmspe: rp, postRmspe: rq, ratio, r2, stability: stab, placebo } };
};
/* Lightweight BSTS: local-level state space + spike-and-slab regression on donors, Gibbs sampled in the browser */
E.fitBSTS = function (D, e, o) {
  o = o || {}; const T = D.y.length, alpha = o.alpha || 0.05, draws = o.draws || 1000, burn = o.burn || 300, rng = MT.rng(o.seed || 42), nP = T - e;
  const names = D.donors.map(d => d.name).concat(D.covs ? D.covs.map(c => c.name) : []), raw = D.donors.map(d => d.values).concat(D.covs ? D.covs.map(c => c.values) : []);
  const m = o.season || 0; const seasonCols = []; if (m > 1) for (let s = 1; s < m; s++) { seasonCols.push(MT.range(T).map(i => i % m === s ? 1 : 0)); names.push('season ' + s); }
  const yPre = D.y.slice(0, e), my = S.mean(yPre), sy = S.sd(yPre) || 1, yS = D.y.map(v => (v - my) / sy);
  const K0 = raw.length, cols = [], forced = [], sd = [], mu = [];
  raw.forEach(c => { const cm = S.mean(c.slice(0, e)), cs = S.sd(c.slice(0, e)); mu.push(cm); sd.push(cs || 1); cols.push(c.map(v => (v - cm) / (cs || 1))); forced.push(false); });
  seasonCols.forEach(c => { mu.push(0); sd.push(1); cols.push(c.map(v => v - 1 / m)); forced.push(true); });
  const K = cols.length, xtx = cols.map(c => { let s = 0; for (let t = 0; t < e; t++) s += c[t] * c[t]; return s; });
  const aE = 16, bE = 15 * 0.2, levelSd = o.levelSd || 0.01, aN = 4, bN = 3 * levelSd * levelSd, tau2 = 1, pi = Math.min(0.5, 3 / Math.max(1, K0)), lo = Math.log(pi / (1 - pi));
  let beta = new Array(K).fill(0), gam = new Array(K).fill(0), s2 = 0.2, sn2 = levelSd * levelSd, muS = new Array(T).fill(0);
  const fitV = new Array(T).fill(0), inc = new Array(K).fill(0), bsum = new Array(K).fill(0), cfMean = new Array(T).fill(0), effAvg = [], effCum = [], cfSumD = [], perT = MT.range(nP).map(() => []);
  const mS = new Array(e), CS = new Array(e);
  for (let it = 0; it < burn + draws; it++) {
    // 1. states: forward filter backward sample (pre only)
    let mPrev = yS[0] - fitV[0], CPrev = 10;
    for (let t = 0; t < e; t++) { const R = t === 0 ? CPrev : CPrev + sn2, a = t === 0 ? mPrev : mPrev, Q = R + s2, Kg = R / Q, r = yS[t] - fitV[t]; mS[t] = a + Kg * (r - a); CS[t] = R - Kg * R; mPrev = mS[t]; CPrev = CS[t]; }
    muS[e - 1] = mS[e - 1] + Math.sqrt(Math.max(CS[e - 1], 1e-12)) * rng.n();
    for (let t = e - 2; t >= 0; t--) { const B = CS[t] / (CS[t] + sn2), mean = mS[t] + B * (muS[t + 1] - mS[t]), v = CS[t] * (1 - B); muS[t] = mean + Math.sqrt(Math.max(v, 1e-12)) * rng.n(); }
    // 2. spike and slab
    const res = new Array(e); for (let t = 0; t < e; t++) res[t] = yS[t] - muS[t] - fitV[t];
    for (let j = 0; j < K; j++) {
      const c = cols[j], bj = beta[j]; let xr = 0; for (let t = 0; t < e; t++) xr += c[t] * res[t]; xr += xtx[j] * bj;
      const v = 1 / (xtx[j] / s2 + 1 / tau2), mm = v * xr / s2, lbf = 0.5 * Math.log(v / tau2) + mm * mm / (2 * v), pr = forced[j] ? 1 : 1 / (1 + Math.exp(-(lo + lbf)));
      const inc1 = forced[j] || rng.u() < pr, nb = inc1 ? mm + Math.sqrt(v) * rng.n() : 0; gam[j] = inc1 ? 1 : 0;
      if (nb !== bj) { const d = nb - bj; for (let t = 0; t < e; t++) res[t] -= c[t] * d; for (let t = 0; t < T; t++) fitV[t] += c[t] * d; beta[j] = nb; }
    }
    // 3. variances
    let ss = 0; for (let t = 0; t < e; t++) ss += res[t] * res[t]; s2 = (bE + 0.5 * ss) / rng.gamma(aE + e / 2);
    let sd2 = 0; for (let t = 1; t < e; t++) sd2 += (muS[t] - muS[t - 1]) ** 2; sn2 = Math.max(1e-10, (bN + 0.5 * sd2) / rng.gamma(aN + (e - 1) / 2));
    if (it < burn) continue;
    for (let j = 0; j < K; j++) { inc[j] += gam[j]; bsum[j] += beta[j]; }
    for (let t = 0; t < e; t++) cfMean[t] += muS[t] + fitV[t];
    let level = muS[e - 1], sE = 0, sC = 0; const sq = Math.sqrt(s2), sn = Math.sqrt(sn2);
    for (let q = 0; q < nP; q++) { const t = e + q; level += sn * rng.n(); const ycf = level + fitV[t] + sq * rng.n(); perT[q].push(ycf); sE += yS[t] - ycf; sC += ycf; }
    effAvg.push(sE / nP); effCum.push(sE); cfSumD.push(sC);
  }
  // rebuild post counterfactual mean from draws
  const cf = new Array(T), cfLo = nanArr(T), cfHi = nanArr(T), nD = draws;
  for (let t = 0; t < e; t++) cf[t] = my + sy * (cfMean[t] / nD);
  for (let q = 0; q < nP; q++) { const a = perT[q].slice().sort((x, y2) => x - y2); cf[e + q] = my + sy * S.mean(a); cfLo[e + q] = my + sy * a[Math.floor(nD * alpha / 2)]; cfHi[e + q] = my + sy * a[Math.min(nD - 1, Math.floor(nD * (1 - alpha / 2)))]; }
  const sorted = effAvg.slice().sort((a, b) => a - b), q = f => sorted[Math.min(nD - 1, Math.max(0, Math.floor(nD * f)))] * sy;
  const avg = S.mean(effAvg) * sy, aLo = q(alpha / 2), aHi = q(1 - alpha / 2), cfSum = S.mean(cfSumD) * sy * 1 + nP * my, pLe = (effAvg.filter(v => v <= 0).length + 1) / (nD + 1), pGe = (effAvg.filter(v => v >= 0).length + 1) / (nD + 1), p = Math.max(2 / (nD + 1), Math.min(1, 2 * Math.min(pLe, pGe))), pFloor = 2 / (nD + 1);
  const actSum = sum(D.y.slice(e)), relDraws = cfSumD.map(c => actSum / (my * nP + sy * c) - 1).sort((a, b) => a - b), rq = f => relDraws[Math.min(nD - 1, Math.max(0, Math.floor(nD * f)))];
  const cfPostMean = cfSum / nP, inclusion = names.map((n, j) => ({ name: n, prob: inc[j] / nD, coef: bsum[j] / nD * sy / sd[j] })).filter((_, j) => j < K0 + (D.covs ? 0 : 0) || true).filter(x => !/^season /.test(x.name)).sort((a, b) => b.prob - a.prob);
  const pre = MT.range(e), ssr = sum(pre.map(i => (D.y[i] - cf[i]) ** 2)), sst = sum(pre.map(i => (D.y[i] - my) ** 2));
  return { method: 'BSTS', avg, avgLo: aLo, avgHi: aHi, cum: avg * nP, cumLo: aLo * nP, cumHi: aHi * nP, rel: avg / cfPostMean, relLo: rq(alpha / 2), relHi: rq(1 - alpha / 2), p, sig: (aLo > 0 || aHi < 0), cf, cfLo, cfHi, extra: { inclusion, r2: 1 - ssr / sst, postProbPositive: 1 - pLe + 1 / (nD + 1), draws: nD, levelSd, pFloor } };
};

/* ---------- selection ---------- */
E.selectQX = function (D, e, o) {
  o = o || {}; const T = D.y.length, J = D.donors.length, nPre = e, hasCov = !!(D.covs && D.covs.length), path = ['Non-randomized (no random holdout)'], why = [], warns = [], info = {};
  let model;
  const corrs = D.donors.map(d => S.corr(d.values.slice(0, e), D.y.slice(0, e))); info.corrs = corrs;
  const strong = corrs.filter(r => r > 0.7).length; info.strongDonors = strong;
  if (J === 0 && !hasCov) {
    path.push('No unexposed control series');
    if (nPre >= 60) { model = 'ITS'; path.push(`Long pre-period (${nPre} intervals, 60 or more)`, 'Interrupted time series'); why.push(`With ${nPre} pre-campaign intervals and no control group, the pre-period trend and seasonality can be modeled directly. Segmented regression estimates the immediate level shift and any slope change, with Newey-West errors for autocorrelation.`); }
    else if (nPre >= 30) { model = 'ITS'; path.push(`Borderline pre-period (${nPre} intervals, between 30 and 60)`, 'Interrupted time series (low power)'); why.push(`The guide's threshold for a reliable time-series baseline is 60 or more intervals. With ${nPre}, ITS is still the best available option but confidence intervals will be wide and seasonality may be poorly identified.`); warns.push(`Only ${nPre} pre-period intervals. Add history if you can.`); }
    else { model = 'PrePost'; path.push(`Short pre-period (${nPre} intervals, under 30)`, 'Pre/post with non-parametric tests'); why.push(`Under 30 baseline intervals is too short to model trend or seasonality. The fallback is a matched pre/post comparison with a Wilcoxon signed-rank test.`); warns.push('Pre/post designs cannot separate the campaign from trend, seasonality, or anything else that changed at the same time. Treat the result as directional only.'); }
  } else if (J === 0 && hasCov) { model = 'BSTS'; path.push('No unexposed control series', 'Time-varying covariates supplied', 'Bayesian structural time series'); why.push('No control regions, but exogenous covariates were supplied. A state-space model with regression on those covariates absorbs external shocks.'); if (nPre < 30) warns.push('Short pre-period for a covariate model.'); }
  else if (J === 1) {
    path.push('Exactly one control series'); const pt = E.parallelTrends(D, e, D.donors[0].values); info.parallel = pt;
    if (pt.pass) { model = 'DiD'; path.push(`Parallel trends holds (slope p = ${F.p(pt.p)})`, 'Difference-in-differences'); why.push(`The treated-minus-control gap shows no significant drift before launch (p = ${F.p(pt.p)}), so parallel trends is plausible and DiD isolates lift by subtracting the control's change.`); }
    else { model = 'ITS_CTRL'; path.push(pt.byDrift ? `Parallel trends doubtful (pre-trend p = ${F.p(pt.p)}, but implied drift is large relative to the effect's precision)` : `Parallel trends violated (slope p = ${F.p(pt.p)})`, 'ITS with control regressor'); why.push(pt.byDrift ? `The pre-launch gap trend is not statistically significant (p = ${F.p(pt.p)}), but the test has low power: extrapolating the observed drift would shift the DiD estimate by ${F.n(Math.abs(pt.driftBias), 1)}, more than half its standard error (${F.n(pt.seDiD, 1)}). To avoid a biased DiD, the control is used as a regressor in an interrupted time series instead.` : `The treated-minus-control gap was already trending before launch (p = ${F.p(pt.p)}), which biases DiD. The control series is used as a regressor inside an interrupted time series model instead.`); }
    if (Math.abs(corrs[0]) < 0.5) warns.push(`The control series is only weakly correlated with the treated series in the pre-period (r = ${corrs[0].toFixed(2)}). It may not be a good comparison.`);
  } else if (J < 5 || o.fewControls) {
    path.push(`${J} control series (fewer than 5)`); const avgC = MT.range(T).map(i => S.mean(D.donors.map(d => d.values[i]))), pt = E.parallelTrends(D, e, avgC); info.parallel = pt; info.avgControl = avgC;
    if (pt.pass) { model = 'DiD_AVG'; path.push(`Parallel trends holds against the control average (p = ${F.p(pt.p)})`, 'Difference-in-differences'); why.push(`The guide covers 1 or 5+ controls. With ${J}, the controls are averaged into one comparison series. Its gap to the treated series does not drift before launch (p = ${F.p(pt.p)}), so DiD applies.`); }
    else { model = 'ITS_CTRL'; path.push(`Parallel trends ${pt.byDrift ? 'doubtful' : 'violated'} (p = ${F.p(pt.p)})`, 'ITS with control regressors'); why.push(`With ${J} controls the average does not track the treated series in parallel (pre-trend p = ${F.p(pt.p)}${pt.byDrift ? '; low power with large implied drift' : ''}). ITS with the controls as regressors is used.`); }
    warns.push(`Only ${J} control series. Synthetic control and BSTS need 5 or more donors to work well.`);
  } else {
    path.push(`${J} control series (5 or more donors)`);
    const sc = E.fitSCM(D, e, { placebo: false }), dyn = sc.extra.stability < 0.5 || sc.extra.r2 < 0.8; info.scm = { r2: sc.extra.r2, stability: sc.extra.stability };
    if (hasCov) { model = 'BSTS'; path.push('Time-varying covariates supplied', 'Bayesian structural time series'); why.push('Time-varying exogenous factors (such as promo schedule or spend) were supplied, which is the guide\'s criterion for BSTS.'); }
    else if (dyn) { model = 'BSTS'; path.push(`Dynamic relationship (static SCM fit R² = ${sc.extra.r2.toFixed(2)}, weight stability ${sc.extra.stability.toFixed(2)})`, 'Bayesian structural time series'); why.push(`A fixed convex combination of donors fits the pre-period poorly (R² = ${sc.extra.r2.toFixed(2)}) or its weights shift between the first and second half of the pre-period (stability ${sc.extra.stability.toFixed(2)}). That points to a dynamic relationship, where BSTS with donor selection is the guide's recommendation.`); }
    else { model = 'SCM'; path.push(`Static relationship (R² = ${sc.extra.r2.toFixed(2)}, weight stability ${sc.extra.stability.toFixed(2)})`, 'Synthetic control'); why.push(`A fixed, non-negative weighted average of donors reproduces the pre-period closely (R² = ${sc.extra.r2.toFixed(2)}) with stable weights (${sc.extra.stability.toFixed(2)}), so the synthetic control method applies. Its weights are transparent.`); }
    if (strong < 3) warns.push(`Only ${strong} donor${strong === 1 ? '' : 's'} correlate above 0.7 with the treated series in the pre-period. The guide asks for strong donors; predictions may be weak.`);
  }
  if (o.force && o.force !== 'auto') { const map = { its: 'ITS', did: J >= 1 ? 'DiD' : null, scm: J >= 3 ? 'SCM' : null, bsts: (J >= 1 || hasCov) ? 'BSTS' : null, prepost: 'PrePost', its_ctrl: J >= 1 ? 'ITS_CTRL' : null }; const f = map[o.force]; if (f) { if (f !== model) { path.push('Manual override: ' + f); why.push(`You overrode the automatic choice (${model}) with ${f}.`); model = f; } } else warns.push('The chosen override is not possible with this data, so the automatic choice was used.'); }
  return { model, path, why, warns, info };
};
const MODEL_NAME = { ITS: 'Interrupted time series (segmented regression, Newey-West errors)', PrePost: 'Pre/post comparison with Wilcoxon signed-rank test', DiD: 'Difference-in-differences', DiD_AVG: 'Difference-in-differences (control average)', ITS_CTRL: 'Interrupted time series with control regressors', SCM: 'Synthetic control method (convex weights, placebo inference)', BSTS: 'Bayesian structural time series (spike-and-slab, Gibbs sampled)' };
E.MODEL_NAME = MODEL_NAME;
function runModel(model, D, e, o, quick) {
  const J = D.donors.length, base = { alpha: o.alpha, season: o.season, seed: o.seed };
  if (model === 'ITS') return E.fitITS(D, e, base);
  if (model === 'PrePost') return E.fitPrePost(D, e, base);
  if (model === 'DiD') return E.fitDiD(D, e, Object.assign({ control: D.donors[0].values }, base));
  if (model === 'DiD_AVG') return E.fitDiD(D, e, Object.assign({ control: MT.range(D.y.length).map(i => S.mean(D.donors.map(d => d.values[i]))) }, base));
  if (model === 'ITS_CTRL') { const cs = D.donors.map(d => d.values), nPre = e, maxK = Math.max(1, Math.min(4, Math.floor(nPre / 15))); let idx = MT.range(cs.length); if (cs.length > maxK) { const cr = cs.map(c => Math.abs(S.corr(c.slice(0, e), D.y.slice(0, e)))); idx = idx.sort((a, b) => cr[b] - cr[a]).slice(0, maxK); } const chosen = idx.map(i => cs[i]); return Object.assign(E.fitITS(D, e, Object.assign({ ctrl: rows(chosen) }, base)), { method: 'ITS_CTRL' }); }
  if (model === 'SCM') return E.fitSCM(D, e, Object.assign({ placebo: !quick }, base));
  if (model === 'BSTS') return E.fitBSTS(D, e, Object.assign({ draws: quick ? 400 : (o.draws || 1000), burn: quick ? 150 : 300 }, base));
  throw new Error('Unknown model ' + model);
}
E.runModel = runModel;
function sub(D, a, b) { return { y: D.y.slice(a, b), dates: D.dates.slice(a, b), donors: D.donors.map(d => ({ name: d.name, values: d.values.slice(a, b) })), covs: D.covs ? D.covs.map(d => ({ name: d.name, values: d.values.slice(a, b) })) : [] }; }
E.subset = sub;

/* main quasi-experimental entry: async so the UI can update progress */
E.analyzeQX = async function (D, e, opt, progress) {
  progress = progress || (() => {}); const alpha = opt.alpha || 0.05, T = D.y.length, J = D.donors.length, nP = T - e;
  const res = { kind: 'qx', unit: 'num', comps: [], diag: [], notes: [], path: [], why: [], alpha, D, e };
  if (e < 8) throw new Error(`Only ${e} observations before the launch date. Need at least 8 (ideally 30+).`); if (nP < 3) throw new Error(`Only ${nP} observations after the launch date. Need at least 3.`);
  const season = opt.season || 0, o = { alpha, season, seed: 42, draws: opt.draws };
  progress('Selecting model'); await tick();
  const sel = E.selectQX(D, e, { force: opt.force, fewControls: false }); res.path = sel.path; res.why = sel.why; res.selection = sel; sel.warns.forEach(w => res.diag.push({ s: 'warn', t: w }));
  let model = sel.model; res.modelKey = model; res.method = MODEL_NAME[model];
  progress('Fitting ' + MODEL_NAME[model]); await tick();
  const main = runModel(model, D, e, o, false); res.main = main;
  let prim = { est: main.avg, lo: main.avgLo, hi: main.avgHi, p: main.p, sig: main.sig, rel: main.rel, from: model, pBound: model === 'BSTS' && main.p <= main.extra.pFloor * 1.001 };
  if (model === 'SCM') {
    const pl = main.extra.placebo;
    if (pl && pl.pMin >= alpha) {
      progress('Donor pool too small for placebo significance; fitting BSTS for uncertainty'); await tick();
      const bs = E.fitBSTS(D, e, Object.assign({}, o, { draws: opt.draws || 1000, burn: 300 })); res.inference = bs; prim = { est: main.avg, lo: bs.avgLo, hi: bs.avgHi, p: bs.p, sig: bs.sig, rel: main.rel, from: 'SCM point estimate, BSTS interval', pBound: bs.p <= bs.extra.pFloor * 1.001 };
      res.diag.push({ s: 'warn', t: `With ${pl.n} donors the smallest possible placebo p-value is ${F.p(pl.pMin)}, which cannot reach your alpha of ${alpha}. Significance below comes from a BSTS credible interval; the SCM estimate and placebo ranking are shown as supporting evidence. About ${Math.ceil(1 / alpha) - 1} donors are needed for placebo inference alone.` });
    }
  }
  // cross-check with an alternative model
  if (opt.cross !== false) {
    let alt = null; if (model === 'SCM' && !res.inference) alt = 'BSTS'; else if (model === 'BSTS' && J >= 3) alt = 'SCM'; else if (model === 'DiD') alt = 'ITS_CTRL'; else if (model === 'ITS_CTRL' && J === 1) alt = 'DiD'; else if (model === 'DiD_AVG') alt = 'ITS_CTRL'; else if (model === 'ITS' && nP > 0 && e >= 30 && false) alt = null;
    if (alt) { progress('Cross-check with ' + alt); await tick(); try { const a = runModel(alt, D, e, o, false); res.alt = { key: alt, name: MODEL_NAME[alt], r: a }; const agree = isNum(a.avg) && Math.sign(a.avg) === Math.sign(main.avg); res.diag.push(agree ? { s: 'ok', t: `Cross-check (${alt}) agrees on direction: ${fmtEff(a.avg, res)} average effect vs ${fmtEff(main.avg, res)} from the primary model.` } : { s: 'warn', t: `Cross-check (${alt}) disagrees on direction (${fmtEff(a.avg, res)} vs ${fmtEff(main.avg, res)}). The result depends on modeling choices.` }); } catch (err) { /* alternative not estimable */ } }
  }
  // in-time placebo
  const pe = Math.floor(e / 2); res.placeboTime = null;
  if (pe >= 12 && e - pe >= 4) {
    progress('In-time placebo test'); await tick();
    try { const Dp = sub(D, 0, e), pm = model === 'SCM' && J < 3 ? 'ITS' : model, r = runModel(pm, Dp, pe, Object.assign({}, o, { draws: 400 }), true); let ps = r.p, sg = r.sig; if (model === 'SCM') { const bs = E.fitBSTS(Dp, pe, Object.assign({}, o, { draws: 400, burn: 150 })); ps = bs.p; sg = bs.sig; }
      res.placeboTime = { event: pe, est: r.avg, p: ps, sig: sg, model: pm }; res.diag.push(sg ? { s: 'bad', t: `In-time placebo FAILED: a fake launch halfway through the pre-period shows a "significant" effect (${fmtEff(r.avg, res)}, p = ${F.p(ps)}). The model is picking up drift or seasonality, so the real result may be spurious.` } : { s: 'ok', t: `In-time placebo passed: a fake launch at the midpoint of the pre-period shows no significant effect (${fmtEff(r.avg, res)}, p = ${F.p(ps)}).` }); } catch (err) { res.diag.push({ s: 'warn', t: 'In-time placebo could not be run: ' + err.message }); }
  } else res.diag.push({ s: 'warn', t: 'Pre-period too short for an in-time placebo test (needs about 16+ intervals).' });
  // in-space placebo (SCM built in; others skip)
  if (model === 'SCM' && main.extra.placebo) { const pl = main.extra.placebo; res.diag.push(pl.p < alpha ? { s: 'ok', t: `In-space placebo: the treated series ranks ${pl.rank} of ${pl.n + 1} on post/pre RMSPE ratio (p = ${F.p(pl.p)}). Its post-launch divergence is unusual compared with untreated donors.` } : { s: 'warn', t: `In-space placebo: the treated series ranks ${pl.rank} of ${pl.n + 1} on post/pre RMSPE ratio (p = ${F.p(pl.p)}). ${pl.n + 1 <= 1 / alpha ? 'The pool is too small for this to reach significance.' : 'Several untreated donors diverge as much as the treated series.'}` }); }
  if (model === 'BSTS' && J >= 5 && J <= 25 && opt.spacePlacebo !== false) {
    progress('In-space placebo (BSTS on each donor)'); await tick(); const ratios = [], tr = { post: 0, pre: 0 };
    const yy = D.y, fitR = (yv, others, name) => { const Dq = { y: yv, dates: D.dates, donors: others, covs: [] }; const r = E.fitBSTS(Dq, e, { alpha, draws: 250, burn: 100, seed: 5 }); return { avg: r.avg, sd: S.sd(yv.slice(0, e)) }; };
    const gaps = []; for (let j = 0; j < J; j++) { const others = D.donors.filter((_, q) => q !== j); if (others.length < 2) continue; const r = fitR(D.donors[j].values, others); gaps.push(Math.abs(r.avg) / (r.sd || 1)); if (j % 3 === 2) { progress(`In-space placebo ${j + 1}/${J}`); await tick(); } }
    const tg = Math.abs(main.avg) / (S.sd(yy.slice(0, e)) || 1), cnt = gaps.filter(v => v >= tg).length; res.placeboSpace = { gaps, treated: tg, p: (1 + cnt) / (gaps.length + 1), rank: cnt + 1, n: gaps.length };
    res.diag.push(res.placeboSpace.p < alpha ? { s: 'ok', t: `In-space placebo: treated effect (in pre-period SDs) ranks ${res.placeboSpace.rank} of ${gaps.length + 1} against untreated donors (p = ${F.p(res.placeboSpace.p)}).` } : { s: 'warn', t: `In-space placebo: treated effect ranks ${res.placeboSpace.rank} of ${gaps.length + 1} against untreated donors (p = ${F.p(res.placeboSpace.p)}). Untreated donors show shifts of similar size.` });
  }
  // model-specific diagnostics
  if (model === 'ITS' || model === 'ITS_CTRL') { const x = main.extra; res.diag.push(Math.abs(x.rho1) > 0.3 ? { s: 'ok', t: `Residual lag-1 autocorrelation is ${x.rho1.toFixed(2)}. Newey-West standard errors (lag ${x.nwLag}) correct for it.` } : { s: 'ok', t: `Residual autocorrelation is low (${x.rho1.toFixed(2)}); Newey-West errors (lag ${x.nwLag}) applied anyway.` }); if (x.season > 1) res.notes.push(`Seasonal dummies for period ${x.season} were included.`); }
  if (model === 'DiD' || model === 'DiD_AVG') { const pt = sel.info.parallel; if (pt) res.diag.push({ s: pt.pass ? 'ok' : 'warn', t: `Parallel trends check (pre-period gap slope): p = ${F.p(pt.p)}; drift implied bias ${F.n(pt.driftBias, 1)} vs DiD standard error ${F.n(pt.seDiD, 1)}. ${pt.pass ? 'No evidence of diverging pre-trends.' : 'Divergence detected.'} A high p-value is weak evidence when the pre-period is short.` }); const tb = main.extra.table; if (tb.ctrlPre && Math.abs(Math.log(Math.abs(tb.treatPre / tb.ctrlPre))) > Math.log(3)) res.diag.push({ s: 'warn', t: 'Treated and control series differ in scale by more than 3x. Additive DiD assumes equal absolute trends; consider indexing both series to a common base.' }); }
  if (model === 'SCM') { const x = main.extra; res.diag.push({ s: x.r2 >= 0.8 ? 'ok' : 'warn', t: `Pre-period fit: R² = ${x.r2.toFixed(3)}, RMSPE = ${F.n(x.preRmspe, 2)}. ${x.r2 >= 0.8 ? 'The synthetic control tracks the treated series well.' : 'Poor pre-period fit weakens any conclusion.'}` }); }
  if (model === 'BSTS') { const x = main.extra; res.diag.push({ s: x.r2 >= 0.7 ? 'ok' : 'warn', t: `Pre-period fit: R² = ${x.r2.toFixed(3)}. Posterior draws: ${x.draws}.` }); if (sel.info.strongDonors != null && sel.info.strongDonors < 3 && D.donors.length) res.diag.push({ s: 'warn', t: 'Few strongly correlated donors (r above 0.7). Counterfactual precision will be limited.' }); }
  if (model === 'PrePost') res.diag.push({ s: 'bad', t: 'Low-confidence design: pre/post cannot rule out trend, seasonality, or concurrent changes. Use a control series or a longer history if you can.' });
  // spend spillover reminder
  res.notes.push('Control series must be unaffected by the campaign. Ad spillover into control regions biases the estimate toward zero.');
  const relBase = main.rel; res.primary = prim; res.comps = [{ name: 'Average effect per interval, post-launch', est: prim.est, lo: prim.lo, hi: prim.hi, rel: prim.rel, p: prim.p, pAdj: prim.p, sig: prim.sig, pBound: prim.pBound }];
  res.summary = { avg: main.avg, cum: main.cum, cumLo: res.inference ? res.inference.cumLo : main.cumLo, cumHi: res.inference ? res.inference.cumHi : main.cumHi, rel: main.rel, nPost: nP, nPre: e, T };
  res.verdict = verdictFrom(res, res.comps, opt);
  if (res.placeboTime && res.placeboTime.sig) { res.verdict.caution = 'The in-time placebo test failed, so this estimate may reflect baseline drift rather than the campaign.'; if (res.verdict.cls === 'pos' || res.verdict.cls === 'neg') { res.verdict.title = (res.verdict.cls === 'pos' ? 'Apparent positive effect' : 'Apparent negative effect') + ', but validation failed'; res.verdict.cls = 'neu'; } }
  if (model === 'PrePost' && (res.verdict.cls === 'pos' || res.verdict.cls === 'neg')) { res.verdict.title += ' (directional only)'; res.verdict.caution = 'Pre/post design: cannot separate the campaign from other changes over time.'; }
  progress('Done'); return res;
};

/* ---------- QX data assembly from a parsed CSV table ---------- */
E.buildQX = function (tab, o) {
  const notes = []; let map = new Map(), names = [];
  const put = (d, u, v) => { if (!isNum(d)) return; if (!map.has(d)) map.set(d, {}); const r = map.get(d); (r[u] = r[u] || []).push(v); };
  if (o.format === 'long') { const seen = new Set(); tab.rows.forEach(r => { const u = String(r[o.unit]).trim(); seen.add(u); put(MT.parseDate(r[o.date]), u, MT.num(r[o.value])); }); names = Array.from(seen); }
  else { const cols = [o.treated].concat(o.controls || [], o.covs || []); names = cols; tab.rows.forEach(r => { const d = MT.parseDate(r[o.date]); cols.forEach(c => put(d, c, MT.num(r[c]))); }); }
  const tName = o.format === 'long' ? o.treatedUnit : o.treated; if (!names.includes(tName)) throw new Error('Treated series not found in data.');
  let dates = Array.from(map.keys()).sort((a, b) => a - b); if (dates.length < 12) throw new Error('Could not read at least 12 dated rows. Check the date column and format (YYYY-MM-DD works best).');
  const val = (d, u) => { const a = (map.get(d)[u] || []).filter(isNum); return a.length ? S.mean(a) : NaN; };
  const dup = tab.rows.length - dates.length * (o.format === 'long' ? names.length : 1); if (o.format !== 'long' && dup > 0) notes.push(`${dup} duplicate date rows were averaged.`);
  dates = dates.filter(d => isNum(val(d, tName))); const dropped = Array.from(map.keys()).length - dates.length; if (dropped) notes.push(`${dropped} dates with a missing treated value were dropped.`);
  let donorNames = o.format === 'long' ? names.filter(n => n !== tName && (!o.controls || !o.controls.length || o.controls.includes(n))) : (o.controls || []); const covNames = o.format === 'long' ? [] : (o.covs || []);
  const mk = list => list.map(n => ({ name: n, values: dates.map(d => val(d, n)) })), ok = c => c.values.every(isNum);
  let donors = mk(donorNames), covs = mk(covNames); const bad = donors.filter(c => !ok(c)).map(c => c.name).concat(covs.filter(c => !ok(c)).map(c => c.name)); if (bad.length) notes.push(`Dropped series with missing values (SCM and BSTS need complete data): ${bad.slice(0, 6).join(', ')}${bad.length > 6 ? '...' : ''}.`); donors = donors.filter(ok); covs = covs.filter(ok);
  const zeroVar = donors.filter(c => S.sd(c.values) === 0); if (zeroVar.length) { notes.push(`Dropped constant series: ${zeroVar.map(c => c.name).join(', ')}.`); donors = donors.filter(c => S.sd(c.values) > 0); }
  const y = dates.map(d => val(d, tName)); const gaps = dates.slice(1).map((d, i) => d - dates[i]), med = S.median(gaps); const irregular = gaps.filter(gp => gp > 1.5 * med).length; if (irregular) notes.push(`${irregular} gaps in the date sequence are longer than the typical interval. Missing periods are not interpolated.`);
  const e = dates.findIndex(d => d >= o.eventMs); if (e < 0) throw new Error('The launch date is after the last date in the data.'); if (e === 0) throw new Error('The launch date is at or before the first date in the data.');
  const stepDays = med / 86400000, seasonGuess = stepDays <= 1.5 ? 7 : stepDays <= 8 ? (dates.length >= 104 ? 52 : 0) : stepDays <= 32 ? (dates.length >= 24 ? 12 : 0) : 0;
  return { D: { y, dates, donors, covs }, e, notes, stepDays, seasonGuess, tName };
};
})(window);
