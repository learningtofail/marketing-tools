"""Smoke test: every built tool loads, runs its sample, and logs no page errors.
Usage: python3 tests/e2e/smoke.py site/   (needs playwright + chromium)"""
import sys, os, glob
from playwright.sync_api import sync_playwright

site = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'site')
chrome = os.environ.get('PW_CHROMIUM_PATH')
pages = sorted(p for p in glob.glob(os.path.join(site, '*.html')) if not p.endswith('index.html'))
bad = 0
with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=chrome) if chrome else pw.chromium.launch()
    for path in pages:
        pg = b.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        pg.goto('file://' + path)
        smp = pg.query_selector('#smp') or pg.query_selector('[data-s]')
        if smp: smp.click()
        go = pg.query_selector('#go') or pg.query_selector('#run')
        if go and go.is_enabled(): go.click()
        pg.wait_for_timeout(400)
        has = pg.query_selector('.verdict, .stats, .stat-tile, table.t') is not None
        status = 'ok ' if (not errs and has) else 'BAD'
        if status == 'BAD': bad += 1
        print(status, os.path.basename(path), errs[:2], '' if has else 'no output rendered')
        pg.close()
    b.close()
sys.exit(1 if bad else 0)
