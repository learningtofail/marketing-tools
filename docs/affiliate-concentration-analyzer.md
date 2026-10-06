# Affiliate Revenue Concentration Risk Analyzer

## What it answers

How dependent is your affiliate program on a handful of partners, and how much revenue walks out the door if your biggest partner leaves or gets penalized by Google?

## When to use it

Quarterly program reviews, planning for risk, or before a large partner renegotiates terms.

## What you need

An affiliate network or platform export with a partner column and a revenue column. A payout column is optional and enables payout-efficiency checks. Multiple rows per partner (for example, by month) are summed.

## How it works

- **Revenue share** for each partner = partner revenue divided by total revenue
- **HHI (Herfindahl-Hirschman Index)** = the sum of squared percentage shares, from near 0 (fully spread) to 10,000 (one partner)
- **Effective number of partners** = 10,000 divided by HHI, meaning how many equal-sized partners would produce the same concentration
- **Pareto counts:** how many partners produce 50% and 80% of revenue
- **Gini coefficient** from the Lorenz curve of partner revenue
- **Loss scenarios:** revenue at risk if the top 1, 3 or 5 partners leave
- **Payout outliers:** partners whose payout per revenue dollar far exceeds the program average

Risk is **red** when HHI exceeds 2,500 or one partner holds more than 30%, and **amber** when HHI exceeds 1,500, one partner holds more than 20%, or the top 3 hold more than 60%.

## Reading the results

Focus on the effective number of partners and the top-partner loss scenario. A program with 400 active partners but an effective count of 4 carries the same risk as a program with 4 partners.

## Limits and cautions

- HHI thresholds come from antitrust practice and serve as convention, not law, for affiliate programs.
- Concentration is not automatically bad when a large partner is contractually secure and incremental. Pair this with the margin calculator.

```csv template
partner,revenue,payout
Partner A,120000,9600
Partner B,45000,3600
Partner C,8000,720
```
