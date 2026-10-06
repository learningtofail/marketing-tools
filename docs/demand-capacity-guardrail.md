# Demand Forecasting & Inventory Capacity Guardrail

## What it answers

Will this promotion and ad plan cause a stockout or overwhelm fulfillment, and what is the highest daily ad spend that stays safe?

## When to use it

Planning a promotion or scaling paid media for a physical product with limited stock or shipping capacity.

## What you need

Units on hand, maximum units shipped per day, safety stock, horizon in days, and incoming purchase orders (arrival day and units). Baseline demand: either a fixed daily number or recent daily unit sales (at least 8 days) for forecasting. Promotion and paid demand: promo lift, start day, length, planned daily ad spend, cost per incremental order, and units per order.

## How it works

1. **Baseline forecast.** With history, Holt's linear trend exponential smoothing (level plus trend, parameters chosen by grid search to minimize error) projects daily demand. Without history, baseline stays flat at your number.
2. **Daily demand** = baseline times promo lift during the promo window, plus paid demand (spend divided by cost per order times units per order).
3. **Day-by-day simulation.** POs arrive, the warehouse ships the lesser of demand plus backlog, available stock and capacity, and unfilled demand carries to the next day as backlog.
4. **Spend ceiling.** A binary search finds the highest daily spend that keeps backlog at zero and inventory at or above safety stock for the whole horizon.

## Reading the results

The banner names the first failure: stockout day, days over shipping capacity, or a safety stock breach. The ceiling tile shows whether planned spend sits above or below the safe limit. The charts show inventory against safety stock and demand against capacity.

## Limits and cautions

- Holt's method captures trend but not weekly seasonality. For strongly seasonal products, use the Seasonality Visualizer to adjust the baseline.
- Cost per incremental order should come from incrementality tests, not platform-reported CPA, or the ceiling will run too low.
- Backlog assumes customers wait. In practice some cancel, so stockouts cost more than the model shows.

```csv template
units_sold
240
255
248
262
270
251
266
280
```
