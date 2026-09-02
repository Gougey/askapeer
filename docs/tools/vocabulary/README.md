# Vocabulary document pipeline

Builds [`docs/body-part-condition-and-synonym-list.md`](../../body-part-condition-and-synonym-list.md)
from Andrew Renshaw's source PDF, `docs/Body Part, Conditions, and Synonym List.pdf`.

```bash
python3 docs/tools/vocabulary/build.py     # regenerate the document
python3 docs/tools/vocabulary/verify.py    # prove no term was lost
python3 docs/tools/vocabulary/taxonomy.py  # report the Part 1 load; --write emits the migration
python3 docs/tools/vocabulary/synonyms.py  # report the Part 2 load; --write emits the migration
```

The two loaders print a full report and write nothing without `--write`. **Re-running either
regenerates its migration in place** — so if Andrew sends a correction, edit the plan, re-run, and
review the diff on the SQL. Both are deterministic: same source, same ids, byte-identical output.

Then rebuild and redeploy the docs site:

```bash
cd prototypes/research-feed && ./scripts/build-docs-site.sh && flyctl deploy --now
```

Requires `pymupdf` and `pdfplumber`.

## Why this exists

The document is a **faithful re-formatting** — every term in the PDF reaches the output, and
nothing is invented, reworded or removed. But the source carries no numbering, no outline
levels and no indent variation: every heading on a page is the same size, weight and
position, so its hierarchy is invisible to any parser and, in several places, to a reader.

Three modules recover that structure. Each holds an **explicit, reviewable plan** rather than
a heuristic, so when Andrew sends corrections you edit a data structure and re-run — you do
not re-derive the analysis.

| File | What it decides |
|---|---|
| `extract.py` | Reads the PDF into a model. Heading level from font size, bullet depth from x-indent, Part 2 tables from real cell extraction. No judgement, just parsing. |
| `pelvis.py` | Reconciles the pelvis, which the source drafts **twice** — once bone by bone, once consolidated by structure type. Maps each source group to a branch by index, and folds the restated content. |
| `ligaments.py` | The joint boundaries inside the flat ligament runs — 58 blocks, each a contiguous slice of the original order. **Confirmed by Andrew 2026-08-24.** |
| `nesting.py` | Restores groups that are parents of other groups, which the source marks only by leaving the parent heading empty (*Hyoid Muscles* over Suprahyoid and Infrahyoid, and eight more). |
| `amendments.py` | Andrew's review of 2026-08-24, his instructions recorded verbatim. Edit here first when he sends more. |
| `build.py` | Renders the collapsible document, computes the structure-health table, and appends the prose from `appendix.md` and `grading.md`. |
| `verify.py` | Fails if any term in the PDF is missing from the output. Headings may legitimately be renamed or dropped, so those are listed rather than failed. |
| `model.py` | Assembles the Part 1 tree once, after all four plans have been applied. `build.py` renders it; `taxonomy.py` loads it. Both must see the same tree. |
| `taxonomy.py` | Turns Part 1 into `apps/api/drizzle/0030_expand_clinical_taxonomy.sql` — an **additive** load expressed as rename / insert / move / retire, never a re-seed. |
| `synonyms.py` | Turns Part 2 into `apps/api/drizzle/0031_seed_part2_synonyms.sql`, unioning with what migration 0025 already set. |

`appendix.md` and `grading.md` are the only hand-written prose; everything else in the
document is generated, so counts in the text cannot drift from the data.

## When Andrew replies

- **Confirming or moving a ligament boundary** → edit the ranges in `ligaments.py`. They are
  1-based and inclusive over each region's ligament terms in source order.
- **Deciding the restated blocks are redundant** → they are named `… — restated` in
  `ligaments.py` and folded explicitly in `pelvis.py`; drop or merge them there.
- **Correcting a parent/child grouping** → edit `NEST` in `nesting.py`.
- **A change that affects the loaded taxonomy** → re-run `taxonomy.py` / `synonyms.py`. If 0030 or
  0031 has already been applied anywhere, do **not** rewrite it — Drizzle will not re-run an applied
  migration. Write a new one for the delta instead.
- **A new PDF from Andrew** → replace the source file and re-run. The plans are keyed by
  index into the source order, so **they will not survive a re-ordered document** — check
  `verify.py` output and the structure-health table before trusting the result.

Always re-run `verify.py` after any change.
