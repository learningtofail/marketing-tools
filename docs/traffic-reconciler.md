# Reported-to-Verified Traffic Reconciler

## What it answers

How many of the clicks your ad platforms bill you for actually arrive on the site as analytics sessions, and which campaigns lose an abnormal share?

## When to use it

Monthly paid media QA, or whenever a campaign's cost rises without a matching rise in site traffic.

## What you need

One row per campaign with platform clicks and analytics sessions for the same date range and the same UTM campaign. Spend is optional and lets the tool price the gap. Set the expected session-to-click range from a campaign you trust (default 80% to 105%).

## How it works

For each campaign the tool computes sessions divided by clicks and classifies it:

- **In range:** between your low and high bounds
- **Low:** below the low bound
- **Investigate:** below 75% of the low bound
- **Above range:** more sessions than expected, usually duplicate tags or UTMs shared across campaigns

Spend on the gap equals the clicks below the expected ratio times the campaign's cost per click.

## Reading the results

Start with the Investigate rows. Display, Demand Gen and Performance Max placements often show low ratios because of accidental clicks and invalid traffic. Search campaigns sitting low usually point to a slow landing page, a broken redirect or a consent banner that blocks analytics before the page loads.

## Limits and cautions

- Some loss is normal: people close the tab, ad blockers drop the analytics beacon, and consent rules suppress tracking.
- Match date ranges and time zones exactly, or the ratios mean nothing.
- Pair this with the Web Traffic Quality & Bot Anomaly Screener to check the sessions that did arrive.

```csv template
campaign,platform_clicks,sessions,spend
brand_search,18200,17100,9100
nonbrand_generic,42000,36800,52500
```
