# Bulk Redirect Mapper & Loop Validator

## What it answers

Is this migration redirect map safe to deploy? The tool finds loops, chains, conflicts and invalid targets, then outputs a clean 1-to-1 map in your server's format.

## When to use it

Site migrations, URL restructures, domain moves, and any time you merge a new batch of redirects with an existing list.

## What you need

A two-column list of source URL and target URL. A header row is optional. Sources and targets can be full URLs or root-relative paths. Set your site host, how to treat trailing slashes, query strings and letter case, and the status code (301, 302 or 308).

## How it works

1. **Validate rows.** The tool rejects empty values, non-HTTP protocols (`javascript:`, `ftp:`), relative paths without a leading slash, and whitespace.
2. **Normalize** each URL into a matching key using your slash, query and case settings. It warns when a source host differs from your site host.
3. **Dedupe.** An identical repeat is dropped (low severity). A repeated source with a different target is a conflict: the first row wins (high).
4. **Self-references**, where source equals target, are removed (high).
5. **Graph walk.** Every rule is an edge. From each source the tool follows targets that are themselves sources. A revisited node is a **loop** (high, excluded from export). A walk longer than one hop is a **chain**, and the tool collapses it to the final destination (medium).
6. **Export** as Apache `.htaccess` (mod_rewrite with anchored, escaped patterns and query-string conditions), an Nginx `map` block, a Cloudflare bulk redirect CSV, a Netlify or Cloudflare Pages `_redirects` file, or plain CSV.

## Reading the results

Red means the map still contains blocking problems: loops, conflicts, self-references or invalid rows. Fix them at the source by deciding the canonical URL for each loop, then rerun. The consolidated map shows how many hops each rule saved.

## Limits and cautions

- Rows are exact matches. The tool does not evaluate wildcard and regex rules or existing server rules.
- The tool never requests the URLs, so a target that returns 404 goes undetected. Crawl the final targets with Screaming Frog before launch.
- Test the `.htaccess` output on staging first. Rule order and existing RewriteBase settings can interact.

```csv template
source,target
/old-page,/new-page
https://www.example.com/blog/post,https://www.example.com/insights/post
```
