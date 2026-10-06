# A/B, Multivariate & Campaign Experiment Analyzer

## What it answers

Did the change work, is the result statistically real, and did it move the metric in the good or the bad direction? The tool picks the right statistical model from the shape of your data, so you do not have to know in advance which test applies.

## When to use it

- **A/B or A/B/n test:** visitors were randomly split between two or more versions.
- **Multivariate (factorial) test:** several page elements were varied at once, such as headline by image by button.
- **Campaign or rollout without randomization:** a campaign ran in one market, channel or period, and you want its incremental effect. This is the quasi-experimental mode.

## What you need

**A/B mode.** Either summary numbers per variant (visitors and conversions, or visitors, mean and standard deviation for revenue-type metrics) or raw rows with one row per visitor and columns for variant and outcome. Mark the control variant. Optionally enter the planned traffic split so the tool can check for sample ratio mismatch.

**Multivariate mode.** One row per combination with a column for each element, the visitor count and the conversions (or mean and standard deviation), or raw rows with one row per visitor. Choose the baseline level of each element.

**Quasi-experimental mode.** A daily or weekly time series of the metric where the campaign ran, the launch date, and ideally one or more control series from markets or channels the campaign did not touch. Use wide format (one column per series) or long format (date, unit, value). Covariates such as a promo calendar or category demand are optional.

Settings shared by all modes: significance level (default 0.05), which direction is good, and the smallest effect worth acting on.

## How it works

**Randomized, two variants, conversion metric.** Two-proportion z-test. When any expected cell count falls below 5, Fisher's exact test replaces it. A Bayesian Beta-Binomial model runs as a cross-check and reports the probability that the variant beats control and the expected loss of each choice.

**Randomized, three or more variants.** A chi-square omnibus test first, then pairwise comparisons against control with Holm correction for multiple comparisons.

**Randomized, value metric.** Welch's t-test with a bootstrap confidence interval. When groups are small (under 30) and heavily skewed, Mann-Whitney becomes the primary test. Three or more variants use ANOVA plus Holm-corrected pairwise tests.

**Every randomized test** runs a sample ratio mismatch check. A mismatch means the split itself is broken, so the result is untrustworthy regardless of the p-value.

**Multivariate.** Logistic regression for conversion data, or weighted least squares with robust standard errors for value data. The tool reports the average effect of each element level, joint tests per element, optional two-way interaction tests, Holm correction, and the best-performing combination the model predicts.

**Quasi-experimental.** The tool follows a decision tree from the Causal Inference Model Selection Guide:

| Data available | Model chosen |
|---|---|
| No controls, 60 or more pre-launch periods | Interrupted time series (segmented regression, Newey-West errors) |
| No controls, 30 to 59 pre periods | Interrupted time series with a low-power warning |
| No controls, under 30 pre periods | Pre/post comparison (Wilcoxon signed-rank), flagged as weak evidence |
| One control that passes a parallel trends test | Difference-in-differences |
| One control that fails parallel trends | Interrupted time series with the control as a regressor |
| Two to four controls | Difference-in-differences on the control average, or ITS with controls |
| Five or more controls with a stable pre-period fit | Synthetic control |
| Five or more controls with a poor fit, or covariates supplied | Bayesian structural time series |

Each model is validated with an in-time placebo (a fake launch at the pre-period midpoint that should show no effect) and, where possible, an in-space placebo (the same model run on each control as if it were treated). A failed placebo downgrades the verdict.

## Reading the results

The banner gives the verdict: a significant positive effect, a significant negative effect, or no detectable effect. It then shows the estimate, its confidence or credible interval, and the p-value. The model-selection path shows why the tool picked that model. The diagnostics panel lists every check that passed or failed. If you set a smallest effect worth acting on, the verdict also says whether the interval clears it.

## Limits and cautions

- Stopping a test the moment it looks significant inflates false positives. Decide the sample size before launch.
- Quasi-experimental results rely on the controls representing what would have happened without the campaign. No statistic can prove that. The placebos only make it more credible.
- Synthetic control needs about 19 donor series before its placebo test alone can reach significance at 0.05. With fewer, the Bayesian interval drives the decision.
- The Bayesian structural time series model is a lightweight in-browser sampler, not the full CausalImpact package. Use it for decisions, and rerun it in R or Python for a published result.

```csv template
variant,visitors,conversions
Control,10000,420
Variant B,10000,468
```
