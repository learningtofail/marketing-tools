"""Example-files check. For every examples/<slug>/manifest.json:
  - the built page site/<slug>.html has a collapsed <details class="examples"> card
  - every manifest file exists in examples/<slug>/ and in site/examples/<slug>/, and has a matching download link
  - every file in examples/<slug>/ (except manifest.json) is listed in the manifest
  - the page has no absolute or index.html links added by the card
Usage: python3 build.py && python3 tests/e2e/examples.py   (no browser needed)"""
import json, os, re, sys, glob
from urllib.parse import quote, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
errs = []
def bad(m): errs.append(m)

slugs = sorted(os.path.basename(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, 'examples', '*', 'manifest.json')))
if not slugs: bad('no examples/*/manifest.json found')
total = 0
for slug in slugs:
    edir = os.path.join(ROOT, 'examples', slug)
    items = json.load(open(os.path.join(edir, 'manifest.json'), encoding='utf-8'))
    page_path = os.path.join(ROOT, 'site', slug + '.html')
    if not os.path.exists(page_path): bad('%s: site/%s.html missing (run build.py)' % (slug, slug)); continue
    page = open(page_path, encoding='utf-8').read()
    m = re.search(r'<details class="card examples"(?! open)[^>]*>(.*?)</details>', page, re.S)
    if not m: bad('%s: collapsed Example files <details> not found' % slug); continue
    card = m.group(1)
    if 'Example files' not in card: bad('%s: card is not titled Example files' % slug)
    links = [unquote(h) for h in re.findall(r'<a [^>]*href="([^"]+)"[^>]*download', card)]
    listed = set()
    for it in items:
        for key in ('label', 'kind', 'note'):
            if not it.get(key): bad('%s: entry missing %s' % (slug, key))
        if it.get('kind') not in ('happy', 'messy', 'trap'): bad('%s: bad kind %r' % (slug, it.get('kind')))
        if '—' in it.get('note', '') or '–' in it.get('note', ''): bad('%s: dash in note %r' % (slug, it.get('label')))
        if not it.get('file') and not it.get('values'): bad('%s: entry %r has neither file nor values' % (slug, it.get('label')))
        f = it.get('file')
        if not f: continue
        listed.add(f); total += 1
        if not os.path.exists(os.path.join(edir, f)): bad('%s: %s missing on disk' % (slug, f))
        if not os.path.exists(os.path.join(ROOT, 'site', 'examples', slug, f)): bad('%s: %s not copied to site/examples' % (slug, f))
        target = 'examples/%s/%s' % (slug, f)
        if target not in links: bad('%s: no download link for %s' % (slug, f))
    for href in links:
        if not href.startswith('examples/%s/' % slug) or not os.path.exists(os.path.join(ROOT, 'site', href)):
            bad('%s: link target does not exist: %s' % (slug, href))
    on_disk = {n for n in os.listdir(edir) if n != 'manifest.json'}
    for n in sorted(on_disk - listed): bad('%s: %s is in the folder but not in the manifest' % (slug, n))
    if re.search(r'href="index\.html"|fetch\(|https?://', card): bad('%s: card contains a forbidden pattern' % slug)
print('examples check: %d tools, %d files, %d problems' % (len(slugs), total, len(errs)))
for e in errs: print('  FAIL', e)
sys.exit(1 if errs else 0)
