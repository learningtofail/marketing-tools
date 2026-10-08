# Requests from the ad-claims-flagger / feature-messaging-gap / quality-score-scorer / sqr-negative-keywords repair

No shared-lib change was needed to ship these fixes. Follow-ups outside the files this pass was allowed to edit:

1. Guide pages (`docs/<slug>.md`) still describe the old behaviour and need a rewrite by whoever owns docs:
   - `docs/quality-score-scorer.md` says the tool estimates Google's three Quality Score components. The tool now shows a copy readiness score out of 100 with its own weights, tri-state manual checks and a policy-risk flag.
   - `docs/ad-claims-flagger.md` says English only; the tool now has a partial French rule set and never shows a green clearance.
   - `docs/sqr-negative-keywords.md` and `docs/feature-messaging-gap.md` should mention the evidence gate (zero conversions only count when the chance of luck is under 10 percent), the Held back table, and the Lines left out table.
2. `MT.stem` and `MT.tokens` in the lib are ASCII only and fold neither plurals nor accents. quality-score-scorer, feature-messaging-gap and sqr-negative-keywords each carry a local Unicode-aware tokenizer and plural/accent-insensitive stem. A shared `MT.tokensU` and `MT.stemU` would remove the duplication.
3. `MT.readTable` takes its delimiter from the first non-empty line, so a one-cell title line above a semicolon-separated French export forces comma parsing. sqr-negative-keywords works around it by trimming title lines before calling `readTable`; an optional `opts.delim` or a header-row detector that scores each line for at least 3 cells would make the workaround unnecessary.
4. The manifest runner fills `#f_<key>` only. Tools that use plain ids (`#txt`, `#kw`) had to be renamed to `f_*` ids to be testable; a `setup.paste` map of selector to value would avoid renames.
