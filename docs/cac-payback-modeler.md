# CAC, Margin & Payback Modeler

## What it answers

What does it really cost to acquire a customer, and how many months of contribution margin does it take to earn that cost back? It settles the usual Marketing and Finance disagreement by showing paid-only CAC next to fully loaded CAC.

## When to use it

Budget planning, board reporting, pricing changes, or whenever someone quotes a CAC without saying what went into it.

## What you need

For one period: new customers acquired, paid media spend, agency and creative fees, fully loaded marketing and sales headcount, and tools and overhead. For unit economics: revenue per customer per month, COGS as a percentage of revenue, other variable cost per customer, and monthly churn. You can also paste a month-by-month retention curve (for example `100,92,86,81`), which overrides the churn rate.

Choose which CAC drives payback, an optional annual discount rate, and the horizon in months.

## How it works

- **Paid (blended) CAC** = paid media spend divided by new customers
- **Fully loaded CAC** = all acquisition costs divided by new customers
- **Contribution per customer-month** = revenue minus COGS minus other variable cost
- **Retention** comes from your curve, or from (1 minus churn) raised to the month number

Each month adds retention times contribution, discounted at your rate. **Payback** is the month when cumulative contribution crosses CAC, interpolated inside the month. **LTV** is cumulative contribution over the horizon, and the tool reports LTV divided by CAC.

The sensitivity matrix recomputes payback across a grid of churn and gross margin values. Cells shade green at 12 months or less, amber up to 18, and red beyond that or when payback never arrives.

## Reading the results

A gap of more than 1.5x between paid and fully loaded CAC means paid-only reporting hides much of the real cost. Payback under 12 months is healthy for most subscription businesses. The copyable summary gives Finance the numbers along with the definitions behind them.

## Limits and cautions

- Churn is rarely constant. Early churn runs higher, so paste a real retention curve when you have one.
- Headcount allocation is a judgment call. Include only the share of time spent on acquisition.
- Revenue per customer should reflect what customers actually pay after discounts and refunds.

