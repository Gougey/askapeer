#!/usr/bin/env python3
"""Builds the docs-site index.html from the same slug|src|title|desc|group entries
used by build-docs-site.sh."""
import sys
from collections import OrderedDict

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Askapeer — Technical Documents</title>
<link rel="stylesheet" href="/docs/assets/docs.css" />
</head>
<body>
<div class="topbar">
  <span class="doc-label">Askapeer — Technical Documents</span>
</div>
<main class="index-main">
<h1>Askapeer — Technical Documents</h1>
<p class="index-intro">PRD and technical specs, for team reference. Not a production build — planning documents only, some sections still in draft or awaiting sign-off (see each doc's status line, and the consolidated open-questions doc for known gaps and conflicts).</p>
{groups}
</main>
<footer class="site-footer">Generated from the markdown sources in <code>docs/</code>; regenerate with <code>scripts/build-docs-site.sh</code> after editing a spec.</footer>
</body>
</html>
"""

def main():
    out_path = sys.argv[1]
    entries = sys.argv[2:]
    groups = OrderedDict()
    for entry in entries:
        slug, src, title, desc, group = entry.split("|")
        groups.setdefault(group, []).append((slug, title, desc))

    group_html = []
    for group, docs in groups.items():
        cards = "\n".join(
            f'<a class="doc-card" href="/docs/{slug}.html">'
            f'<div class="doc-title">{title}</div>'
            f'<div class="doc-desc">{desc}</div></a>'
            for slug, title, desc in docs
        )
        group_html.append(f'<div class="doc-group"><h2>{group}</h2>{cards}</div>')

    html = TEMPLATE.format(groups="\n".join(group_html))
    with open(out_path, "w") as f:
        f.write(html)

if __name__ == "__main__":
    main()
