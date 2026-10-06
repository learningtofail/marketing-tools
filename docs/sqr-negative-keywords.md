# Search Query Report Bleed & Negative Keyword Extractor

## What it answers

Which search terms are wasting money, and which negative keywords (phrase and exact) stop the bleed without blocking queries that convert?

## When to use it

Weekly or monthly search term reviews, especially on broad match, Performance Max and newly launched campaigns.

## What you need

A search terms report from Google Ads or Microsoft Ads with the search term, clicks, impressions, cost and conversions. The tool skips report title rows above the header and ignores total rows. Add protected terms (your brand and core product words) that should never be negated. Edit the list of irrelevant intent modifiers such as free, jobs, pdf and login.

## How it works

1. **N-gram mining.** Every term splits into 1, 2 and 3-word phrases. The tool sums cost, clicks and conversions for each phrase across all the terms that contain it. A phrase with zero conversions, cost above your threshold and at least N distinct terms becomes a **phrase-match negative**.
2. **Modifier scan.** Any term containing one of your irrelevant modifiers is grouped under that modifier as a phrase negative candidate.
3. **Exact negatives.** Individual terms with zero conversions and spend or clicks above threshold, or a CTR below your floor on enough impressions, become **exact-match negatives**, unless a phrase negative already covers them.
4. **Protection.** Any candidate that contains or sits inside a protected term drops out.

Savings equal the historical spend on terms each negative would have blocked.

## Reading the results

Start with the phrase list, because one phrase negative can block dozens of future variants. The copy buttons output Google Ads syntax: `"phrase"` and `[exact]`. The CSV download imports into Google Ads Editor after you add the campaign or list column.

## Limits and cautions

- Zero conversions over a short window does not always mean zero value. Check terms with assisted conversions or long sales cycles before negating.
- Single-word phrase negatives are powerful and risky. Review every one.
- Savings are historical. Future spend moves to other terms unless you also cut budget.

```csv template
Search term,Clicks,Impr.,Cost,Conversions
crm software,52,624,161.20,5
free crm software download,38,760,98.80,0
```
