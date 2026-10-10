#!/usr/bin/env python3
"""Wraps an Artifact-style HTML fragment in a standalone document.

A page written for the Claude Artifact viewer is deliberately *not* a whole document: the
viewer supplies the doctype, the charset and viewport metas and a small reset, so the file
starts straight in at <title>, <link>, <style> and then its content. Copying such a file to
the docs site verbatim renders it in quirks mode with no viewport meta and an 8px body
margin — it looks broken on a phone and subtly wrong everywhere else.

This reproduces the skeleton the viewer would have added, so one source file serves both:
published as an artifact, and served standalone from public/docs.

Usage: wrap-fragment.py <fragment.html> <out.html>
"""
import re
import sys

# The Artifact viewer's own skeleton, as documented: light color-scheme pinned on :root,
# safe-area padding so the page runs edge to edge on a phone, zero body margin.
SKELETON_RESET = """<style>
:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
body{margin:0;font:14px system-ui,-apple-system,"Segoe UI",sans-serif}
img{max-width:100%}
[hidden]{display:none!important}
</style>"""

# Where the fragment stops declaring and starts rendering. Everything above is head
# material (title, font links, the page's own <style>); everything from here is body.
FIRST_CONTENT = re.compile(r'^[ \t]*<(div|main|header|section|article|figure|nav)\b', re.M)


def wrap(fragment: str) -> str:
    match = FIRST_CONTENT.search(fragment)
    if not match:
        raise SystemExit("wrap-fragment: found no body content in the fragment")
    head, body = fragment[: match.start()], fragment[match.start() :]

    title_match = re.search(r'<title>(.*?)</title>', head, re.S)
    if not title_match:
        raise SystemExit("wrap-fragment: the fragment has no <title>")
    title = title_match.group(1).strip()
    # The title belongs to the document we are building, not to the fragment's own head
    # material, so it is emitted once in the right place rather than twice.
    head = head.replace(title_match.group(0), "", 1)

    return (
        "<!doctype html>\n"
        '<html lang="en-GB">\n'
        "<head>\n"
        '<meta charset="utf-8" />\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />\n'
        # The other docs are titled "<doc> — Askapeer"; skip the suffix when the page's
        # own title already carries the name, so it does not read "Askapeer … — Askapeer".
        f"<title>{title}{'' if 'Askapeer' in title else ' — Askapeer'}</title>\n"
        f"{SKELETON_RESET}\n"
        f"{head.strip()}\n"
        "</head>\n"
        "<body>\n"
        f"{body.rstrip()}\n"
        "</body>\n"
        "</html>\n"
    )


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    with open(sys.argv[1], encoding="utf-8") as handle:
        wrapped = wrap(handle.read())
    with open(sys.argv[2], "w", encoding="utf-8") as handle:
        handle.write(wrapped)
