# Attribution Window Normalizer

## What it answers

Which platform is actually cheapest once every platform counts conversions the same way? Meta defaults to 7-day click plus 1-day view, Google Ads to 30-day click, and TikTok to its own mix. Comparing their CPAs directly compares different rulers.

## When to use it

Before you move budget between platforms based on platform-reported CPA or ROAS.

## What you need

For each platform: spend, reported conversions, the click window and view window it used, and the share of its conversions that came from view-through. Then choose a target click window and whether to keep view-through conversions.

Optional: conversion lag data from your CRM or analytics (days from click to conversion, with counts), your own deduplicated total of conversions, and revenue per conversion.

## How it works

A conversion lag curve F(d) gives the share of all conversions that happen within d days of the click. The tool uses your lag data when supplied; otherwise it uses a typical ecommerce curve (65% same day, 88% by day 7, 97% by day 28).

Each platform's click conversions scale by F(target window) / F(reported window). A 30-day count shrinks toward a 7-day target, and a 1-day count grows toward it, capped at 3x. View-through conversions either drop out or scale the same way. The tool then recomputes CPA and ROAS on the common basis and compares the sum of platform claims with your own total to show double counting.

## Reading the results

The banner flags when normalization reorders the platforms by CPA, which is the case that changes budget decisions. The overlap figure shows how far the platforms together over-claim against your own total.

## Limits and cautions

- The method assumes the conversion lag is similar across platforms. Upper-funnel platforms often have longer lags.
- Normalized numbers are directional. They correct for window length, not for platforms claiming the same conversion.
- For budget reallocation, a holdout or geo test (see the Experiment Analyzer) beats any attribution adjustment.

```csv template
days_to_convert,conversions
0,650
1,210
3,90
7,60
14,40
28,25
```
