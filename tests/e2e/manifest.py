"""Sample-driven checks. Each case uploads a real-world style file into a built tool, runs it and asserts on the visible result.
Usage: python3 tests/e2e/manifest.py site/ [tool-slug]"""
import sys, os, json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
SAMPLES = os.path.join(HERE, '..', 'samples')
site = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'site')
only = sys.argv[2] if len(sys.argv) > 2 else None

# tool, file, must contain, must not contain, optional setup {radio:{name:value}, fields:{id:value}, selects:{selector:value}, date:value}
CASES = [
    ('traffic-reconciler', '01-happy-ecommerce-ads-vs-ga4.csv', ['display_prospecting', 'Investigate'], ['No usable rows']),
    ('traffic-reconciler', '02-messy-quebec-bilingual-lead-gen.csv', ['4 judged campaigns', 'added together', 'not numbers', 'Data quality'], ['No usable rows', 'Total\t']),
    ('traffic-reconciler', '06-edge-tiny-volume-and-zero-clicks.csv', ['Too few clicks', 'zero clicks', 'Above range', 'dup_tag_campaign'], ['Sessions are 87% of platform clicks; 1 of']),
    ('brand-incrementality', '01_happy_b2b_saas_brand_pause.csv', ['34% incremental', 'Welch p <0.0001'], ['p 1.000'], {'radio': {'mode': 'test'}, 'date': '2026-03-30', 'fields': {'spend': '15000', 'clicks': '6270', 'cvr': '6', 'val': '320'}}),
    ('brand-incrementality', '02_messy_local_services_brand_pause.csv', ['repeated day row'], ['0% to -'], {'radio': {'mode': 'test'}, 'date': '2026-05-25', 'fields': {'spend': '30000', 'clicks': '16200', 'cvr': '9', 'val': '90'}, 'selects': {'#cp': 'Brand Ads Clicks', '#co': 'Brand SEO clicks'}}),
    ('brand-incrementality', '03_trap_promo_confound_apparel_brand_pause.csv', ['Inconclusive'], ['loses $8,500'], {'radio': {'mode': 'test'}, 'date': '2026-09-28', 'fields': {'spend': '8500', 'clicks': '9000', 'cvr': '4.5', 'val': '38'}}),
    ('brand-incrementality', '04_trap_partial_pause_travel_brand.csv', ['partial pause', '9% incremental'], [], {'radio': {'mode': 'test'}, 'date': '2026-02-23', 'fields': {'spend': '18000', 'clicks': '11300', 'cvr': '7', 'val': '55'}}),
    ('cac-payback-modeler', 'a-saas-happy.json', ['Cash payback in 6.2 months', '4.10'], ['Not paid back', '0.00x'], {'nofile': True}),
    ('cac-payback-modeler', 'b-subscription-box-messy.json', ['13.1 months', '1.72'], [], {'nofile': True, 'curve': 'curve-paste-tab-separated-percent.txt'}),
    ('cac-payback-modeler', 'b-subscription-box-messy.json', ['13.1 months', 'read as fractions'], [], {'nofile': True, 'curve': 'curve-fractions-wrong-units.txt'}),
    ('cac-payback-modeler', 'c-marketplace-organic-mix-trap.json', ['6.1 months', '5.4 months'], ['Cash payback in 1.5 months'], {'nofile': True, 'fields': {'pcust': '18'}}),
]

bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=os.environ['PW_CHROMIUM_PATH']) if os.environ.get('PW_CHROMIUM_PATH') else pw.chromium.launch()
    for case in CASES:
        tool, fname, must, mustnot = case[:4]; setup = case[4] if len(case) > 4 else {}
        if only and tool != only: continue
        pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto('file://' + os.path.join(site, tool + '.html'))
        if setup.get('nofile'):
            for k, v in json.load(open(os.path.join(SAMPLES, tool, fname))).items():
                if k.startswith('_') or k == 'curve_clean' or pg.query_selector('#f_' + k) is None: continue
                (pg.select_option if k == 'basis' else pg.fill)('#f_' + k, str(v))
            if 'curve' in setup: pg.fill('#f_curve', open(os.path.join(SAMPLES, tool, setup['curve'])).read().strip())
        else:
            pg.set_input_files('input[type=file]', os.path.join(SAMPLES, tool, fname)); pg.wait_for_timeout(300)
        for name, val in setup.get('radio', {}).items(): pg.check('input[name=%s][value=%s]' % (name, val))
        for sel, val in setup.get('selects', {}).items(): pg.select_option(sel, val)
        if 'date' in setup: pg.fill('#pd', setup['date'])
        for fid, val in setup.get('fields', {}).items(): pg.fill('#f_' + fid, val)
        if pg.query_selector('#go'): pg.click('#go')
        pg.wait_for_timeout(400)
        text = pg.inner_text('main')
        miss = [m for m in must if m not in text]; hit = [m for m in mustnot if m in text]
        ok = not (miss or hit or errs)
        bad += not ok
        print('ok ' if ok else 'BAD', tool, fname, 'missing=%s' % miss if miss else '', 'unexpected=%s' % hit if hit else '', errs[:1] if errs else '')
        pg.close()
    b.close()
sys.exit(1 if bad else 0)
