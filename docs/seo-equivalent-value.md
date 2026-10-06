# SEO Equivalent Value Translator

## What it answers

What would it cost to buy your non-branded organic traffic through paid search? It turns clicks into a dollar figure Finance recognizes.

## When to use it

Justifying SEO headcount or budget, reporting organic performance to leadership, or sizing the risk of an organic traffic drop.

## What you need

A Google Search Console performance export by query (clicks required, average position optional). Enter a default CPC, your brand terms to exclude, the number of days the export covers, and a replacement factor for the share of clicks you would actually buy back. Optionally paste per-query CPCs from Keyword Planner or your search terms report.

## How it works

1. The tool drops queries containing any brand term, because you would not pay for brand traffic you already own.
2. For each remaining query, equivalent value = clicks times CPC (the override, or the default) times the replacement factor.
3. It sums the values, then annualizes and converts to a monthly figure from the days covered.
4. It groups value by ranking band (positions 1 to 3, 4 to 10, 11 to 20, 21 and beyond) when position data exists.

## Reading the results

The headline figure is a replacement cost: the paid budget needed to generate the same clicks. Compare it with the SEO program's cost. The top-10 query share shows how much of the value rides on a few rankings, which is also your exposure to an algorithm update.

## Limits and cautions

- It is not revenue. Organic and paid clicks convert differently.
- Search Console hides anonymized queries, so the export undercounts total clicks. The real figure runs higher.
- A single default CPC blurs large differences between queries. Add overrides for your top 50 queries.

```csv template
query,clicks,impressions,ctr,position
running shoes,2100,29400,7.1%,2.4
best trail running shoes,960,13400,7.2%,4.1
```
