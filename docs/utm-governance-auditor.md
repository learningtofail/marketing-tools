# UTM Governance Auditor

## What it answers

Which campaign URLs break your naming convention, and which UTM values split one channel into several rows in your reports?

## When to use it

Before launching campaigns, during monthly analytics hygiene, or when a channel's traffic suddenly lands in "(other)" or "Unassigned" in GA4.

## What you need

Either a list of URLs (one per line) or a CSV with a URL column and an optional sessions column. With sessions, the tool weights every issue by traffic volume. Set your convention: lowercase, no spaces or special characters, required campaign, utm_content on paid media, separator, maximum length, and approved source and medium lists.

## How it works

For each URL the tool parses and decodes the query string, then checks:

- **Blocking (high):** missing source, medium or campaign, spaces in values, no UTMs at all
- **Medium:** uppercase values or parameter names, special characters, unapproved source or medium
- **Low:** wrong separator, excessive length, unknown `utm_` parameters, missing utm_content on paid media

**Variant detection** groups values that match after lowercasing and removing spaces, hyphens and underscores (such as `Facebook`, `facebook` and `face_book`). It also flags near-misses within one edit, such as `facebok`. Each group gets a suggested canonical value.

**Governance score** = the share of URLs (or of sessions, when weighted) with no issues.

## Reading the results

Fix the variant splits first, because each split fragments historic reporting and breaks channel grouping. Download the audit CSV to hand the fixes to whoever owns the links.

## Limits and cautions

- GA4 treats values as case-sensitive, so `CPC` and `cpc` count as different mediums. The lowercase rule exists for that reason.
- The approved lists should match your GA4 channel grouping rules, or clean URLs will still land in the wrong channel.

```csv template
url,sessions
https://example.com/?utm_source=facebook&utm_medium=paid_social&utm_campaign=summer_sale,1200
https://example.com/?utm_source=Facebook&utm_medium=paid_social&utm_campaign=summer_sale,340
```
