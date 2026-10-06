"""Sample-driven checks. Each case uploads a real-world style file into a built tool, runs it and asserts on the visible result.
Usage: python3 tests/e2e/manifest.py site/ [tool-slug]"""
import sys, os, json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, '..', 'samples')
site = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'site')
only = sys.argv[2] if len(sys.argv) > 2 else None

# Cases live in tests/e2e/cases/<tool>.json: [{tool, file, must, mustnot, setup?}].
# setup keys: radio {name:value}, fields {id:value}, selects {selector:value}, pre {selector:value} (applied before upload), date, nofile, jsonfields, hist, po, curve, btn.
CASES = []
for f in sorted(os.listdir(os.path.join(HERE, 'cases'))):
    for c in json.load(open(os.path.join(HERE, 'cases', f))): CASES.append((c['tool'], c['file'], c['must'], c['mustnot'], c.get('setup', {})))

bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ['PW_CHROMIUM_PATH']) if os.environ.get('PW_CHROMIUM_PATH') else pw.chromium.launch()
    for case in CASES:
        tool, fname, must, mustnot = case[:4]; setup = case[4] if len(case) > 4 else {}
        if only and tool != only: continue
        pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + os.path.join(site, tool + '.html'))
        for sel, val in setup.get('pre', {}).items(): pg.select_option(sel, val)
        if setup.get('nofile'):
            data = json.load(open(os.path.join(SAMPLES, tool, fname)))
            if setup.get('jsonfields'): data = data['fields']
            if 'hist' in setup: pg.fill('#hist', open(os.path.join(SAMPLES, tool, setup['hist']), newline='').read())
            for i, (d, q) in enumerate(setup.get('po', [])):
                pg.fill('[data-i="%d"][data-k="d"]' % i, str(d)); pg.fill('[data-i="%d"][data-k="q"]' % i, str(q))
            for k, v in data.items():
                if k.startswith('_') or k == 'curve_clean' or pg.query_selector('#f_' + k) is None: continue
                (pg.select_option if k == 'basis' else pg.fill)('#f_' + k, str(v))
            if 'curve' in setup: pg.fill('#f_curve', open(os.path.join(SAMPLES, tool, setup['curve'])).read().strip())
        else:
            pg.set_input_files('input[type=file] >> nth=0', os.path.join(SAMPLES, tool, fname)); pg.wait_for_timeout(300)
        for name, val in setup.get('radio', {}).items(): pg.check('input[name=%s][value=%s]' % (name, val))
        for sel, val in setup.get('selects', {}).items(): pg.select_option(sel, val)
        if 'date' in setup: pg.fill('#pd', setup['date'])
        for fid, val in setup.get('fields', {}).items(): pg.fill('#f_' + fid, val)
        btn = setup.get('btn') or ('#go' if pg.query_selector('#go') else None)
        if btn: pg.click(btn)
        pg.wait_for_timeout(1200 if setup.get('btn') else 400)
        text = pg.inner_text('main')
        miss = [m for m in must if m not in text]; hit = [m for m in mustnot if m in text]
        ok = not (miss or hit or errs)
        bad += not ok
        print('ok ' if ok else 'BAD', tool, fname, 'missing=%s' % miss if miss else '', 'unexpected=%s' % hit if hit else '', errs[:1] if errs else '')
        pg.close()
    b.close()
sys.exit(1 if bad else 0)
