# GTM Container Auditor

## What it answers

What in your Google Tag Manager container is dead weight, broken, duplicated, deprecated or risky?

## When to use it

Before a GA4 or consent migration, when onboarding a client container, or as a quarterly cleanup.

## What you need

A container export JSON. In GTM go to Admin, then Export Container, and pick the workspace or version. The browser parses the file locally and uploads nothing.

## How it works

The tool builds a reference map from tags to triggers and from every `{{variable}}` reference to its definition, then flags:

**Tags**
- No firing trigger and no role as a setup or teardown tag, so the tag never fires (high)
- A firing trigger that does not exist (high)
- Universal Analytics tags, which stopped processing data in 2023 (high)
- Legacy Floodlight and legacy remarketing tag types (medium)
- Custom HTML that uses `document.write` or `eval` (medium), loads scripts over HTTP (high), or pastes vendor pixels that skip templates and consent controls (low)
- Duplicate tags with identical type, parameters and triggers, which double count events (high)
- Paused tags left in the container (low)

**Triggers:** unused triggers and duplicate trigger conditions (low).

**Variables:** unused variables (low), plus references to variables that do not exist and are not enabled built-ins (high).

The tool also counts tags without consent settings.

**Health score** starts at 100 and subtracts 12 per high, 3 per medium and 1 per low issue, with a floor of 0.

## Reading the results

Work down the findings table from high severity. Download the cleanup list as a CSV ticket list.

## Limits and cautions

- The audit reads configuration, not live behavior. Confirm each deletion in GTM Preview mode.
- Custom templates and server-side containers get only the generic checks.
