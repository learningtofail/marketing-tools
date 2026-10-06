#!/usr/bin/env python3
"""Build the tool site.

    python3 build.py

Reads site.config.json:
  brand         name shown in the header and page titles
  home_url      link target for the header brand and footer ("" hides both links)
  standalone    true  -> every tool page is one self-contained HTML file (CSS and JS inlined)
                false -> pages share assets/style.css and assets/*.js
  google_fonts  true to load the display fonts from Google Fonts (a third-party request)
  base_url      optional absolute URL of the folder, used for canonical tags

Output: site/  (tool pages, index.html, docs/*.md)
"""
import json, re, glob, os, html, shutil
import markdown

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, 'site')
CFG = json.load(open(os.path.join(ROOT, 'site.config.json'), encoding='utf-8'))
if 'MT_HOME_URL' in os.environ: CFG['home_url'] = os.environ['MT_HOME_URL']  # '' hides the home links (vendored copies)
GROUPS = [
 ('Experimentation & Measurement', ['experiment-analyzer','brand-incrementality','attribution-window-normalizer','traffic-reconciler']),
 ('Unit Economics & Planning', ['cac-payback-modeler','affiliate-margin-calculator','affiliate-concentration-analyzer','promo-capacity-checker','demand-capacity-guardrail','seo-equivalent-value']),
 ('Paid Search, Social & Acquisition', ['sqr-negative-keywords','creative-decay-monitor','seasonality-visualizer','quality-score-scorer']),
 ('Data Governance, Tracking & Tagging', ['utm-governance-auditor','gtm-container-auditor','scv-gap-calculator','bot-traffic-screener']),
 ('Technical SEO', ['redirect-mapper']),
 ('Messaging & Compliance', ['feature-messaging-gap','ad-claims-flagger']),
]
FONTS = ('<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
         '<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">\n') if CFG.get('google_fonts') else ''
read = lambda p: open(os.path.join(ROOT, p), encoding='utf-8').read()
def inline_js(src): return '<script>' + src.replace('</script', '<\\/script') + '</script>'
def css_tag(): return '<style>' + read('assets/style.css') + '</style>' if CFG['standalone'] else '<link rel="stylesheet" href="assets/style.css">'
def js_tags(needs):
    files = ['lib.js'] + needs
    return '\n'.join(inline_js(read('assets/' + f)) if CFG['standalone'] else '<script src="assets/%s"></script>' % f for f in files)
def render_guide(md):
    tpl = None
    m = re.search(r'```csv template\n(.*?)```', md, re.S)
    if m: tpl = m.group(1); md = md[:m.start()] + md[m.end():]
    md = re.sub(r'^# .*\n', '', md, count=1)
    h = markdown.markdown(md, extensions=['tables', 'fenced_code', 'sane_lists'])
    h = h.replace('<table>', '<div class="table-wrap"><table class="t">').replace('</table>', '</table></div>')
    if tpl:
        h += '<h2>Input template</h2><p>Your file needs these columns. Extra columns are ignored, and column names can differ because you map them in the tool.</p><pre class="code">%s</pre><div class="actions"><button class="btn btn-secondary btn-sm" type="button" data-act="template">Download CSV template</button></div>' % html.escape(tpl.strip())
    return h, tpl

shutil.rmtree(OUT, ignore_errors=True); os.makedirs(os.path.join(OUT, 'docs'))
tpl_page, brand, home = read('template.html'), CFG.get('brand', 'Marketing Tools'), CFG.get('home_url', '')
tools = {}
for p in sorted(glob.glob(os.path.join(ROOT, 'src', '*.html'))):
    slug = os.path.basename(p)[:-5]
    src = open(p, encoding='utf-8').read()
    m = re.match(r'\s*<!--META\s*(\{.*?\})\s*-->', src, re.S)
    if not m: raise SystemExit('missing META in ' + p)
    meta = json.loads(m.group(1)); rest = src[m.end():]
    sm = re.search(r'<script>(.*)</script>\s*$', rest, re.S)
    body, script = (rest[:sm.start()], sm.group(1)) if sm else (rest, '')
    dp = os.path.join(ROOT, 'docs', slug + '.md')
    if not os.path.exists(dp): raise SystemExit('missing docs/%s.md' % slug)
    md = open(dp, encoding='utf-8').read(); guide, template = render_guide(md)
    shutil.copy(dp, os.path.join(OUT, 'docs', slug + '.md'))
    tools[slug] = meta
    group = next((g for g, s in GROUPS if slug in s), 'Tool')
    rep = {
        '{{title}}': html.escape(meta['title']), '{{desc}}': html.escape(meta['desc'], quote=True), '{{brand}}': html.escape(brand),
        '{{group}}': html.escape(group), '{{fonts}}': FONTS, '{{css}}': css_tag(), '{{js}}': js_tags(meta.get('needs', [])),
        '{{canonical}}': ('<link rel="canonical" href="%s/%s.html">\n' % (CFG['base_url'].rstrip('/'), slug)) if CFG.get('base_url') else '',
        '{{brandlink}}': ('<a class="brand serif" href="%s">%s</a>' % (html.escape(home), html.escape(brand))) if home else '<span class="brand serif">%s</span>' % html.escape(brand),
        '{{homelink}}': (' <a href="%s">All tools</a>' % html.escape(home)) if home else '',
        '{{tplbtn}}': '<button class="btn btn-secondary btn-sm" type="button" data-act="template">CSV template</button>\n    ' if template else '',
        '{{guide}}': guide, '{{slugjs}}': json.dumps(slug), '{{templatejs}}': json.dumps(template).replace('</', '<\\/') if template else 'null',
    }
    page = tpl_page
    for k, v in rep.items(): page = page.replace(k, v)
    page = page.replace('{{body}}', body).replace('{{script}}', script)
    open(os.path.join(OUT, slug + '.html'), 'w', encoding='utf-8').write(page)

cards = ''
for g, slugs in GROUPS:
    cards += '<div class="grp">%s</div><div class="tool-grid">' % html.escape(g)
    for s in slugs:
        if s not in tools: continue
        mt = tools[s]
        cards += '<a class="tool-card" href="%s.html"><h3>%s</h3><p>%s</p><span class="tag tag-accent">%s</span></a>' % (s, html.escape(mt['title']), html.escape(mt['short']), html.escape(mt.get('tag', 'Static tool')))
    cards += '</div>'
idx = read('index.template.html')
idx = re.sub(r'<link rel="preconnect".*?rel="stylesheet">\n', FONTS, idx, flags=re.S).replace('<link rel="stylesheet" href="assets/style.css">', css_tag())
idx = idx.replace('Marketing Tools', html.escape(brand)).replace('href="index.html"', 'href="%s"' % html.escape(home or 'index.html'))
idx = idx.replace('{{cards}}', cards).replace('{{count}}', str(len(tools))).replace('{{brand}}', html.escape(brand))
idx = idx.replace('Nothing is uploaded or stored.', 'Nothing is uploaded. Inputs are saved only on this device.')
idx = re.sub(r'</main>', '</main>' + (inline_js(read('assets/lib.js')) if CFG['standalone'] else '<script src="assets/lib.js"></script>'), idx, count=1) if 'lib.js' not in idx else idx.replace('<script src="assets/lib.js"></script>', inline_js(read('assets/lib.js')) if CFG['standalone'] else '<script src="assets/lib.js"></script>')
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(idx)
if not CFG['standalone']: shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(OUT, 'assets'))
readme = read('README.site.md') if os.path.exists(os.path.join(ROOT, 'README.site.md')) else ''
if readme: open(os.path.join(OUT, 'README.md'), 'w', encoding='utf-8').write(readme)
print('built', len(tools), 'tools ->', OUT, '(standalone)' if CFG['standalone'] else '(shared assets)')
