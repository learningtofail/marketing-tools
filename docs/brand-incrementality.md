# Paid Search Brand Incrementality Estimator

## What it answers

How many of your paid brand search conversions would have happened anyway through the organic listing, and what does each truly incremental conversion cost?

## When to use it

You bid on your own brand name and someone asks whether that spend earns its keep. Use it after a brand pause test, or before one to see what level of incrementality the program needs to break even.

## What you need

**Pause test mode.** Daily rows covering at least 7 days before and 7 days after you paused brand ads, with the date, paid brand clicks and organic brand clicks. Spend and conversions are optional. Set the pause start date.

**Assumption mode.** No file. Enter an assumed incrementality percentage.

**Both modes.** Monthly brand ad spend, monthly paid brand clicks, the brand click conversion rate, and the contribution margin per conversion.

## How it works

In pause test mode the tool compares average daily organic brand clicks before and after the pause. The rise in organic clicks, divided by the paid clicks that disappeared, is the recapture rate. Incrementality equals one minus recapture. A Welch t-test checks whether the organic change exceeds noise, and a bootstrap gives a 95% confidence interval on incrementality.

From incrementality it derives:

- **Incremental conversions** = paid conversions times incrementality
- **Incremental CPA** = spend divided by incremental conversions
- **Break-even incrementality** = spend divided by (paid conversions times margin)
- **Net contribution** = incremental conversions times margin, minus spend

A sensitivity table shows incremental CPA and net contribution from 5% to 100% incrementality.

## Reading the results

Compare reported CPA with incremental CPA. When incrementality sits below the break-even line, the brand program loses money even if its reported CPA looks cheap. A wide confidence interval means the test was too short or too noisy to decide.

## Limits and cautions

- A pause test underestimates incrementality when competitors bid on your brand, because pausing hands them the top slot.
- Avoid promotions, launches and seasonal peaks inside the test window.
- Run the pause for at least two full weeks so each weekday appears at least twice.

```csv template
date,paid_clicks,organic_clicks,spend,paid_conversions,organic_conversions
2026-07-01,270,216,359.10,22,17
2026-07-02,265,219,352.45,21,18
```
