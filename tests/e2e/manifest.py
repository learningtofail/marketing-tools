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
    ('gtm-container-auditor', '01-ecommerce-clean-web-container.json', ['health 100', 'No issues found'], ['Missing trigger']),
    ('gtm-container-auditor', '02-b2b-saas-messy-agency-container.json', ['Disabled built-in variable', 'DLV - not defined', 'Duplicate tags'], ['{{firstName}}', 'Missing trigger']),
    ('gtm-container-auditor', '03-trap-trigger-group-healthcare-booking.json', ['Unused variable'], ['Unused trigger', 'Missing trigger']),
    ('gtm-container-auditor', '04-server-side-container-publisher.json', ['Server-side container'], ['no consent settings.']),
    ('gtm-container-auditor', '05-large-enterprise-retail-container.json', ['34 unused', '185 unused', 'Showing the first 150'], []),
    ('demand-capacity-guardrail', 'a_happy_inputs.json', ['$2,328', 'Day-1 forecast 332'], ['Day-1 forecast 0'], {'nofile': True, 'jsonfields': True, 'hist': 'a_happy_history.csv', 'po': [(20, 5000)]}),
    ('demand-capacity-guardrail', 'b_messy_inputs.json', ['History checks', 'not numbers'], ['Day-1 forecast 0'], {'nofile': True, 'jsonfields': True, 'hist': 'b_messy_history.txt'}),
    ('demand-capacity-guardrail', 'c_trap_inputs.json', ['too few to fit a trend'], ['day 60 forecast 819'], {'nofile': True, 'jsonfields': True, 'hist': 'c1_trap_ramp_history.csv'}),
    ('demand-capacity-guardrail', 'c_trap_inputs.json', ['zero-sales day', 'stock-outs'], ['Day-1 forecast 0'], {'nofile': True, 'jsonfields': True, 'hist': 'c2_trap_censored_history.csv'}),
    ('creative-decay-monitor', '01-happy-dtc-skincare-meta.csv', ['1 burned out, 1 approaching fatigue, 1 healthy', 'Insufficient data'], []),
    ('creative-decay-monitor', '02-messy-quebec-travel-fr-semicolon.csv', ['Check delivery change', 'Paused 18 days', 'Data quality'], ['No usable rows']),
    ('creative-decay-monitor', '02b-control-same-data-clean-iso-dot-decimal.csv', ['Check delivery change', 'Paused 18 days'], ['No usable rows']),
    ('creative-decay-monitor', '03-trap-b2b-linkedin-lowvolume-flat-truth.csv', ['0 burned out, 0 approaching fatigue, 6 healthy'], ['Retire or refresh now']),
    ('creative-decay-monitor', '05-trap-ctr-only-scaling-not-fatigue.csv', ['Check delivery change'], ['Retire or refresh now']),
    ('experiment-analyzer', '01_happy_ecommerce_checkout_raw.csv', ['+0.57 pp', 'p = 0.018', 'Positive and statistically significant'], [], {'pre': {'#abMetric': 'binary', '#abFmt': 'raw'}, 'btn': '#run'}),
    ('experiment-analyzer', '04a_messy_travel_booking_binary_raw.csv', ['Variant spellings treated as one group', 'exact copies', 'left out'], ['Holm-adjusted'], {'pre': {'#abMetric': 'binary', '#abFmt': 'raw'}, 'btn': '#run'}),
    ('experiment-analyzer', '04b_messy_travel_booking_value_raw.csv', ['+1.1% relative', 'counted as zero'], ['-45'], {'pre': {'#abMetric': 'continuous', '#abFmt': 'raw'}, 'btn': '#run'}),
    ('experiment-analyzer', '05_trap_srm_healthcare_booking_raw.csv', ['Do not act on this result yet', 'Sample ratio mismatch'], ['Positive and statistically significant'], {'pre': {'#abMetric': 'binary', '#abFmt': 'raw'}, 'btn': '#run'}),
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
