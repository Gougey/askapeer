#!/usr/bin/env python3
"""Wraps a pandoc HTML body fragment (read from stdin) in the docs-site template."""
import re
import sys

# Every spec's hand-written "## Contents" section (and the consolidated
# open-questions doc's "Organised in N parts" list) links to anchors like
# "#1-scope", matching GitHub's heading-slug convention. Pandoc generates its
# own heading ids differently (it drops leading numbers/punctuation, e.g.
# "## 1. Scope" -> id="scope", and collapses punctuation differently, e.g.
# em-dashes), so the two never actually match. Rather than replicate pandoc's
# slug algorithm (fragile, and it has quirks like the em-dash case), this
# finds every "pure navigation" ordered list — one where every <li> is just a
# fragment link, no other content — and rewrites each link to the *actual* id
# pandoc assigned to the corresponding heading, matched positionally: the Nth
# link in the list is assumed to point at the Nth id-bearing heading that
# follows the list in the document.
OL_BLOCK_RE = re.compile(r'<ol[^>]*>(.*?)</ol>', re.DOTALL)


def fix_toc_links(html):
    def is_pure_nav_list(block):
        frag_hrefs = re.findall(r'href="#[^"]+"', block)
        other_hrefs = re.findall(r'href="(?!#)[^"]+"', block)
        n_li = block.count('<li>')
        return not other_hrefs and len(frag_hrefs) >= 2 and len(frag_hrefs) == n_li

    result = []
    pos = 0
    for match in OL_BLOCK_RE.finditer(html):
        result.append(html[pos:match.start()])
        block = match.group(1)
        if is_pure_nav_list(block):
            hrefs = re.findall(r'href="#[^"]+"', block)
            remainder = html[match.end():]
            real_ids = re.findall(r'\sid="([^"]+)"', remainder)[: len(hrefs)]
            if len(real_ids) == len(hrefs):
                ids_iter = iter(real_ids)
                block = re.sub(
                    r'href="#[^"]+"', lambda _: f'href="#{next(ids_iter)}"', block
                )
            else:
                print(
                    f"warning: nav list has {len(hrefs)} links but only "
                    f"{len(real_ids)} headings follow — leaving links unfixed",
                    file=sys.stderr,
                )
        result.append(html[match.start():match.start(1)])
        result.append(block)
        result.append(html[match.end(1):match.end()])
        pos = match.end()
    result.append(html[pos:])
    return "".join(result)

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>{title} — Askapeer</title>
<link rel="stylesheet" href="/docs/assets/docs.css" />
</head>
<body>
<div class="topbar">
  <a href="/docs/">&larr; Askapeer docs</a>
  <span class="doc-label">{title}</span>
</div>
<main>
{body}
</main>
</body>
</html>
"""

def main():
    slug, title, out_path = sys.argv[1], sys.argv[2], sys.argv[3]
    body = fix_toc_links(sys.stdin.read())
    html = TEMPLATE.format(title=title, body=body)
    with open(out_path, "w") as f:
        f.write(html)

if __name__ == "__main__":
    main()
