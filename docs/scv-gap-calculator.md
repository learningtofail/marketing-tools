# Single Customer View Gap Calculator

## What it answers

How much of your customer journey data is fragmented across devices, expired cookies and unmatched systems, and what does that cost in wasted ad spend and duplicate records?

## When to use it

Building the business case for identity resolution, server-side tagging, a CDP, or a login and first-party data strategy.

## What you need

Form inputs only. Audience and behavior: people in scope, effective cookie lifetime, average days between visits, share of multi-device users, devices per multi-device user, and sessions per user per month. Identity: share of web sessions matched to a CRM ID, CRM-to-ESP match rate, and CRM duplicate rate. Money: monthly ad spend, share of spend that depends on identity (retargeting, lookalikes, frequency caps, CRM audiences), share of fragmented spend that is redundant, cost per lead, monthly leads, and ESP cost per contact. Set an uncertainty range from 0% to 40%.

## How it works

A Monte Carlo simulation runs 4,000 draws. Each draw varies every input by up to the uncertainty you set.

- **Cookie expiry between visits** = exp(minus cookie lifetime divided by average visit gap)
- **Fragmented journey share** = 1 minus (1 minus multi-device share times unmatched share) times (1 minus expiry probability times unmatched share)
- **Ghost users:** extra IDs per real person from extra devices and cookie resets, reduced where login matching stitches them
- **Ad waste** = spend times identity-dependent share times fragmented share times redundant share
- **Duplicate waste** = duplicate rate times (leads times cost per lead, plus audience times ESP cost per contact)

The tool reports the mean with an 80% range (10th to 90th percentile), and a histogram shows the full distribution.

## Reading the results

Lead with the annual cost range, not the point estimate. The levers table shows the monthly saving from raising the match rate by 10 points and from halving duplicates, which tells you where to invest first.

## Limits and cautions

- It is a structural model, not a measurement. The output is only as good as the inputs.
- Replace defaults with measured values: match rate from your CRM, and multi-device share from GA4 user-ID reports.
- Use "Rerun simulation" to confirm the range is stable.
