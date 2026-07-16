#!/usr/bin/env python3
"""Wraps a pandoc HTML body fragment (read from stdin) in the docs-site template."""
import sys

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
    body = sys.stdin.read()
    html = TEMPLATE.format(title=title, body=body)
    with open(out_path, "w") as f:
        f.write(html)

if __name__ == "__main__":
    main()
