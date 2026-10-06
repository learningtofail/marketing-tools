# Paid Search Seasonality Demand Curve Visualizer

## What it answers

When does demand for your category peak and trough, how large is the swing, and what bid and budget multipliers should you apply month by month and by weekday?

## When to use it

Annual planning, setting seasonality adjustments in Google Ads, and deciding when to ramp budgets ahead of peak season.

## What you need

Daily or monthly rows with a date and a demand measure: search volume from Keyword Planner or Google Trends, clicks, conversions or revenue. At least 12 months are required and 24 or more are recommended. Daily data adds weekday indices. Choose a bid response strength: cautious (50%), balanced (75%) or full (100%).

## How it works

This is classical multiplicative decomposition, following the Business Forecasting Models guide:

1. Daily data rolls up to the average per day for each month, which removes month-length bias.
2. A centered 2x12 moving average estimates the trend and cycle.
3. Each month divided by its moving average gives a seasonal ratio. Ratios average by calendar month and normalize so the 12 indices average to 1.
4. Dividing the actual values by the seasonal index gives a de-seasonalized series. A linear regression on it measures the underlying annual trend.
5. The weekday index divides each day by its centered 7-day average, averages by weekday, and normalizes.

**Budget multiplier** = the seasonal index. **Bid multiplier** = 1 + (index minus 1) times the response strength, so bids move less than demand.

## Reading the results

An index of 1.25 means that month runs 25% above an average month. The share of variation explained tells you whether seasonality matters much for this series. The trend figure separates real growth from seasonal peaks.

## Limits and cautions

- With under two years of data each index rests on one observation and mixes trend with seasonality.
- Moving holidays such as Easter, Ramadan and Lunar New Year smear across months.
- Search demand leads conversions for considered purchases. Start raising bids one to two weeks before the peak month.

```csv template
date,value
2024-01-01,1012
2024-01-02,1055
2024-01-03,1038
```
