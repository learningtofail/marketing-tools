"""Sample-driven checks. Each case uploads a real-world style file into a built tool, runs it and asserts on the visible result.
Usage: python3 tests/e2e/manifest.py site/ [tool-slug]"""
import sys, os, json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, '..', 'samples')
site = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'site')
only = sys.argv[2] if len(sys.argv) > 2 else None

# tool, file, must contain, must not contain
CASES = [
    ('traffic-reconciler', '01-happy-ecommerce-ads-vs-ga4.csv', ['display_prospecting', 'Investigate'], ['No usable rows']),
    ('traffic-reconciler', '02-messy-quebec-bilingual-lead-gen.csv', ['4 judged campaigns', 'added together', 'not numbers', 'Data quality'], ['No usable rows', 'Total\t']),
    ('traffic-reconciler', '06-edge-tiny-volume-and-zero-clicks.csv', ['Too few clicks', 'zero clicks', 'Above range', 'dup_tag_campaign'], ['Sessions are 87% of platform clicks; 1 of']),
]

bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ['PW_CHROMIUM_PATH']) if os.environ.get('PW_CHROMIUM_PATH') else pw.chromium.launch()
    for tool, fname, must, mustnot in CASES:
        if only and tool != only: continue
        pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + os.path.join(site, tool + '.html'))
        pg.set_input_files('input[type=file]', os.path.join(SAMPLES, tool, fname)); pg.wait_for_timeout(300)
        pg.click('#go'); pg.wait_for_timeout(400)
        text = pg.inner_text('main')
        miss = [m for m in must if m not in text]; hit = [m for m in mustnot if m in text]
        ok = not (miss or hit or errs)
        bad += not ok
        print('ok ' if ok else 'BAD', tool, fname, 'missing=%s' % miss if miss else '', 'unexpected=%s' % hit if hit else '', errs[:1] if errs else '')
        pg.close()
    b.close()
sys.exit(1 if bad else 0)
