# Paid Social Creative & Frequency Decay Monitor

## What it answers

Which ads are wearing out, how far each has fallen from its best performance, and whether rising frequency drives the decline?

## When to use it

Weekly creative reviews on Meta, TikTok, LinkedIn or any platform where the same audience sees the same ads repeatedly.

## What you need

Daily rows per creative with date, creative or ad name, impressions and clicks. Spend and conversions unlock CPA tracking. A frequency column is used when present. Without one, the tool estimates frequency as one plus cumulative impressions divided by the audience size you enter. Choose a trend window of 7, 14 or 30 days.

## How it works

1. Each creative's days are sorted, and rolling CTR and CPA are computed over the trend window. Windows need at least 500 impressions to count.
2. **CTR decay** = one minus current rolling CTR divided by the peak rolling CTR.
3. **CPA rise** = current rolling CPA divided by the best rolling CPA (windows with at least 3 conversions), minus one.
4. **Frequency response:** an OLS regression of daily CTR on frequency over the latest window. A significantly negative slope means CTR falls as the same people see the ad more often.

Status rules, with editable thresholds:

- **Burnout:** CTR down at least 30% from peak, and either frequency at 4 or above or CPA up at least 40%. Alternatively, CPA up 60% or more on its own.
- **Fatigue approaching:** CTR down at least 15%, CPA up at least 20%, or frequency at 2.5 or above with a negative CTR slope.
- **Healthy:** none of the above.

## Reading the results

The status table sorts the worst creatives first, with a recommended action. Select any creative to see daily and rolling CTR, frequency and rolling CPA over time. Prepare replacements for Fatigue Approaching creatives now, because production usually takes longer than the remaining useful life.

## Limits and cautions

- CTR also falls when a platform expands delivery into colder audiences, not only from fatigue.
- Estimated frequency depends heavily on the audience size you enter. Use the platform's frequency column when it exists.
- Creatives with under 7 days of data show as Insufficient data.

```csv template
date,creative,impressions,clicks,spend,conversions,frequency
2026-07-01,UGC_video_A,14200,199,156.20,9,1.05
2026-07-02,UGC_video_A,13800,190,151.80,8,1.11
```
