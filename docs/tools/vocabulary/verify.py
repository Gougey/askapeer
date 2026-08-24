"""Checks that the generated document still contains everything the source PDF says.

    python3 docs/tools/vocabulary/verify.py

Every *term* in Part 1 must survive verbatim — that is the guarantee the document makes, and
a restructure that quietly drops one would otherwise be invisible. Headings are allowed to
change, because the reconstruction renames some (six pelvis headings all reading "Common
associated conditions" become the bone each describes) and drops others (introducers that
carry no terms of their own); those are listed for review rather than failed.

Exits non-zero if a term has gone missing.
"""
import re
import sys
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs" / "Body Part, Conditions, and Synonym List.pdf"
DOC = ROOT / "docs" / "body-part-condition-and-synonym-list.md"

# Compare on letters and digits only: the document re-spaces em-dashes and splits table cells.
key = lambda s: re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()
# A heading is either at the heading indent, or bold. Both tests are needed: the six region
# titles ("Cervical Spine (Neck) muscles:") are bold *and* bulleted, so indent alone misreads
# them as terms, while the Acetabulum introducer is at the heading indent but not bold.
HEADING_INDENT = 100
SYNONYM_PAGES = range(43, 54)  # right-hand column is wrapped cell text, checked as whole rows

# Terms deliberately absent, on Andrew's instruction (2026-08-24). Listed individually with the
# reason, so that a term going missing for any *other* reason still fails the check.
AMENDED = {
    "Proper collateral ligaments":
        "replaced at PIP and DIP by radial/ulnar collateral and palmar ligament (Andrew)",
    "Palmar plates":
        "replaced at PIP and DIP by palmar ligament (Andrew); the singular form remains",
    "Ligamentum flavum":
        "lumbar restated list removed (Andrew); the plural 'Ligamenta flava' remains",
    "Distal tibiofibular syndesmotic ligaments":
        "ankle restated collaterals removed (Andrew); the term survives as a block heading",
}


def main():
    blob = key(DOC.read_text())
    doc = fitz.open(SRC)
    lost_terms, changed_headings, amended, checked = [], [], [], 0
    for pno in range(len(doc)):
        for block in doc[pno].get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                x = line["bbox"][0]
                if pno in SYNONYM_PAGES and x > 200:
                    continue
                text = re.sub(r"\s+", " ", "".join(s["text"] for s in line["spans"])).strip()
                if not text or text == "•" or text.startswith("Preferred condition"):
                    continue
                checked += 1
                if key(text) and key(text) not in blob:
                    if text in AMENDED:
                        amended.append((pno + 1, text))
                        continue
                    bold = "Bold" in line["spans"][0]["font"]
                    is_heading = x < HEADING_INDENT or bold
                    (changed_headings if is_heading else lost_terms).append((pno + 1, text))

    print(f"checked {checked} source lines from {SRC.name}")
    print(f"terms amended on Andrew's instruction: {len(amended)}")
    for page, text in amended:
        print(f"    p{page}: {text} — {AMENDED[text]}")
    print(f"headings renamed or dropped: {len(changed_headings)}")
    for page, text in changed_headings:
        print(f"    p{page}: {text[:72]}")
    if lost_terms:
        print(f"\nFAIL — {len(lost_terms)} terms are missing from the document:")
        for page, text in lost_terms:
            print(f"    p{page}: {text[:72]}")
        return 1
    print("\nOK — every term in the source appears in the document")
    return 0


if __name__ == "__main__":
    sys.exit(main())
