# Web Traffic Quality & Bot Anomaly Screener

## What it answers

How much of your reported traffic is human, what share comes from bots and low-quality visits, and which filters should you apply in reporting?

## When to use it

When traffic spikes without matching conversions, before reporting vanity metrics upward, or when a new paid placement delivers suspiciously cheap visits.

## What you need

An analytics export or server log CSV with at least one of: user agent, network domain (or ASN or ISP), session duration, or pages per session. Sessions, bounce rate and conversions columns add precision, and an extra segment column (source, country or campaign) adds a breakdown. Rows can hold single sessions or aggregates.

## How it works

Each row gets classified:

- **Bot:** the user agent matches headless browsers, automation libraries or crawlers (HeadlessChrome, Selenium, Puppeteer, python-requests, curl and others), or the network name matches a cloud or hosting provider (AWS, Google Cloud, Azure, DigitalOcean, OVH, Hetzner and others)
- **Suspect:** duration at or below the zero-second threshold, one page, and a bounce rate of 90% or more
- **Human:** everything else

The tool then aggregates by network, normalized user agent and your segment column. A segment gets flagged when it carries meaningful volume and either 60% or more of it is non-human, or its conversion rate sits more than 3 standard errors below the human rate at under a quarter of it.

## Reading the results

The banner gives the human, bot and suspect split, plus the conversion rate after filtering. The segmentation criteria block produces copy-ready rules for a GA4 exclusion segment and a server log regex.

## Limits and cautions

- Network matching uses names, not IP ranges, so residential proxy bots slip through.
- Suspect is not proof. Slow pages and quick tab closes also produce zero-second visits.
- GA4 already filters known bots from the IAB list. What this finds is on top of that.

```csv template
user_agent,network_domain,country,source,sessions,avg_session_duration,pages_per_session,bounce_rate,conversions
Mozilla/5.0 (Windows NT 10.0) Chrome/126.0,verizon.net,US,organic,48,94,3.1,0.41,2
Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/125.0,amazonaws.com,US,display,180,0.2,1.0,0.99,0
```
