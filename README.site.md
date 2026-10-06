# Marketing Tools

21 browser-based tools for experiment analysis, unit economics, paid media, tracking governance, technical SEO and compliance. Every page is a single self-contained HTML file: no server code, no build step on the host, no external requests, no cookies and no analytics.

## Deploying on your own site

Copy the `.html` files to any folder your web server serves. Each tool works on its own, so you can publish all 21, a subset, or embed one page on a different site. `index.html` is an optional directory page that links to the rest.

- **Nginx, Apache, Caddy:** drop the files in a directory under the web root.
- **Docker:** `docker run -d -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine`
- **Cloudflare Pages, Netlify, GitHub Pages:** upload the folder as a static site.

The pages also run straight from disk (`file://`), which suits offline or air-gapped use.

## Privacy

All calculation happens in the visitor's browser. Uploaded files are read with the FileReader API and never leave the device. Each tool remembers its last inputs in the browser's localStorage under keys that start with `mt:`, so visitors can come back to their work. "Clear saved inputs" on each page removes them. Large pasted files (over 250,000 characters) are not saved.

## Features on every tool

- **How it works:** a guide at the bottom of each page covering what the tool answers, inputs, method, how to read results and limits
- **CSV template:** a download of the expected columns, for tools that take files
- **Print or save PDF:** a print layout that hides inputs and controls and keeps the results
- **Ctrl + Enter** (Cmd + Enter on Mac) runs the tool
- **Sample data** button on every tool
- **Light and dark themes**, with the choice remembered

## Documentation

`docs/` holds the guide for each tool as Markdown, the same text that appears on the tool page. Use it in a repo wiki or a docs site.

## Rebuilding from source

The source project (`src/`, `docs/`, `assets/`, `build.py`, `site.config.json`) rebuilds this folder with `python3 build.py`, which needs Python 3 and `pip install markdown`. Settings in `site.config.json`:

| Key | Effect |
|---|---|
| `brand` | Name in the header and page titles |
| `home_url` | Where the header and "All tools" links point. Set `""` to remove the links for pages published on their own |
| `standalone` | `true` inlines all CSS and JS into each page. `false` shares `assets/` across pages, which makes the site smaller |
| `google_fonts` | `true` loads the display fonts from Google Fonts. Off by default so pages make no third-party requests |
| `base_url` | Absolute URL of the folder, used for canonical tags, for example `https://example.com/tools` |
