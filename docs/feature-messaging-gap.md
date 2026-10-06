# Feature-to-Messaging Gap Analyzer

## What it answers

Which shipped features does your launch copy never mention, and which does it name without telling customers why they should care?

## When to use it

Reviewing release announcements, launch emails, landing pages and sales decks against the actual changelog.

## What you need

Release notes with one feature per line or bullet (headings and blank lines are ignored), and the marketing copy. Choose match strictness: loose (34% of a feature's terms), balanced (50%) or strict (67%).

## How it works

1. Each feature line becomes a set of stemmed content words. Stop words and release-note filler (added, new, improved, support and similar) drop out.
2. The copy splits into sentences, each with its own term set.
3. For each feature the tool finds the sentence with the highest share of the feature's terms.
   - **Covered with benefit:** the best sentence meets the strictness threshold and it, or the sentence after it, contains outcome language (save, faster, reduce, without, so you can, lets you, in seconds and similar).
   - **Feature only:** the sentence matches but carries no benefit language.
   - **Scattered:** no single sentence matches, but the terms appear across the copy.
   - **Missing:** the terms barely appear.

## Reading the results

The coverage matrix sorts gaps first and shows the best-matching sentence for each feature. The "Copy to write" table gives a sentence pattern for each gap. Feature-only rows usually need just a benefit clause added.

## Limits and cautions

- Keyword overlap misses paraphrases. "Night theme" will not match "dark mode". Check Missing rows for synonyms before writing new copy.
- Benefit detection uses a word list, so it rewards outcome language, not quality. A human still judges whether the benefit is compelling.
