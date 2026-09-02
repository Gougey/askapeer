
---

## Appendix A — things to check with Andrew

Reproduced faithfully above; listed here because each looks like an editing artefact or an
unfinished decision rather than clinical intent.

**1. The BAMIC muscle-injury grades are missing grade 1.** The source lists the tags required as:
`0a, 0b, 2a, 2b, 2c, 3a, 3b, 3c, 4, 4c` (p54). Grades `1a`, `1b` and `1c` are absent, and a bare
`4` sits alongside `4c`. If grade 1 was meant to be omitted deliberately, that is worth recording;
otherwise three tags are missing.

**2. The cartilage grading is incomplete and has a probable typo.** The source gives `1/I`, `2/II`,
`3/II` (p55) — the third is presumably `3/III`, and there is no grade 4.

**3. The ligament-grading table is half-finished.** "Grade 1" and its synonyms appear twice, and
Grades 2 and 3 are loose text outside the table rather than rows in it (pp54–55). The content is
recoverable, but the structure is not.

**4. A stray heading `R` sits on p44**, immediately after the `Reinjury` row — which is the one row
in the whole synonym set with no synonyms at all. It reads like an edit that was interrupted
mid-word.

**5. Instructions to us are embedded in the content.** Three headings carry build notes rather than
clinical terms:
- p40 — "Pelvic ring- **needs to be added as an individual term**- Bones / structures (already detailed above)"
- p54 — "British Athletics Muscle Injury Classification — 'BAMIC' **(both terms needed for tags)**"
- p54 — "MRI / Magnetic resonance imaging **(both needed as tags)**"

These are actionable, but they need to move out of the term list and into a decision.

**6. Sixteen preferred terms appear in two different synonym tables.** The lettered tables run by
pathology (I–O) and then by region (P–U), so the same condition is reached twice. Most of that is
harmless, and only three rows need a decision:

- **Ten are identical** in both tables — merge on sight, nothing is lost.
- **Three are subsets**: the region table simply carries fewer aliases than the pathology table
  (*Achilles tendinopathy*, *Gluteal tendinopathy*, *De Quervain tenosynovitis*). Taking the union
  loses nothing either.
- **Three genuinely disagree**, and neither side contains the other: The lettered tables run by pathology (I–O) and then by region (P–U), so
the same condition is reached twice. Examples:

| Term | In the pathology table | In the region table |
|---|---|---|
| Bursitis | Bursa inflammation; inflammation of a bursa | Inflamed bursa; bursal inflammation |
| Chondromalacia patellae | Patellar chondromalacia; patellar cartilage softening | Patellofemoral cartilage degeneration |
| Meniscal tear | Meniscus tear; meniscal injury | Torn meniscus |

For those three, whether to keep the union or whether the difference signals a real distinction is a
clinical judgement — not one to make silently in code. The other thirteen can be merged mechanically.

**7. Two deliberate clinical caveats are recorded as footnotes** and must survive into whatever data
model this becomes, because both warn against a synonym mapping that would otherwise look obvious:

> \*DDH is a developmental disorder rather than simply a synonym for every form of acetabular dysplasia.

> \*"Runner's knee" is ambiguous and should not be treated as a unique synonym because it is also
> commonly used for patellofemoral pain syndrome.

**8. The pelvis is drafted twice, and both drafts are in the file.** This is the single largest
structural problem in the document, and it is a formatting accident rather than a clinical one. The
region is written once bone by bone — Ilium, Ischium, Pubis, Acetabulum, SI joint, Sacrum, Coccyx,
Pelvic ring, Inguinal region, each with its own landmarks, ligaments and conditions — and then again
at the end, consolidated by structure type. The evidence that these are two passes over the same
material rather than two different lists:

- The perineal muscles are listed **twice, identically** — all seven terms, same order.
- The pelvic floor muscles are listed twice, the second adding only *Levator ani*.
- The consolidated ligament block (*Pelvic ligaments:* → Sacroiliac / posterior pelvis, Pubic /
  anterior pelvis, Hip / acetabulum, Sacrum / coccyx, Pelvic floor / perineum) already contains 9
  of the 12 ligaments named in the earlier per-bone groups. Only *Posterior sacroiliac ligament*
  and *Iliac portion of the inguinal ligament* are unique to the earlier pass.

The compounding formatting problem is that the block introducers were never styled as headings:
*Pelvic ring…*, *Inguinal region…*, *Perineum:* and *Pelvic ligaments:* each carry no terms of their
own, one of them wrapped onto a second line that then read as its own heading, and the *Acetabulum*
introducer is not bold at all — it is plain text sitting at the heading indent. That is why six
consecutive groups all appear as *Common associated conditions* with nothing to say which bone each
belongs to.

The document above reconciles the two drafts into the standard shape. **Andrew should confirm the
reconciliation**, in particular that the consolidated ligament block is the one he intends to keep.

**9. Two landmarks are listed twice inside the same group.** *Superior pubic ramus* and *Inferior
pubic ramus* each appear twice in the Pubis landmarks list. Left in place above rather than silently
removed, since a duplicate is the kind of thing worth seeing.

**10. 154 terms in Part 1 appear in more than one region** — "Medial collateral ligament" appears
seven times, "Lateral collateral ligament" six. This is correct anatomy (the knee and the elbow both
have one), and it matches how the live taxonomy already works: a tag's identity is its name *within
its parent*, not globally. Noted only so it is not mistaken for duplication to be cleaned up.

---

## Appendix B — how this relates to the live taxonomy

**Parts 1 and 2 are loaded.** Two generated migrations do it, and both are produced from this same
source by `docs/tools/vocabulary/taxonomy.py` and `docs/tools/vocabulary/synonyms.py` — change the
pipeline and re-run rather than editing the SQL.

### Part 1 — `0030_expand_clinical_taxonomy.sql`

The taxonomy goes from **588 rows to 1,304**. It is not a re-seed: `post_tags`,
`member_interests` and `article_tags` all reference `community.tags` now, so an id that changes is
a link that breaks. Every existing row keeps its id, and the load is expressed as four operations.

| Operation | Rows | What it is |
|---|---:|---|
| insert | 716 | the ligaments axis and the pelvis region, neither of which existed, plus the parent levels v2.0 flattened |
| move | 126 | existing tags re-parented under those restored levels — ids kept, so their posts, interests and article matches move with them |
| rename | 12 | spelling only: ten names carried a stray backslash from the v2.0 seed's double-escaping (`Guyon\'s canal syndrome`), two used `--` for an en dash |
| retire | 34 | the flattened compound groups (`Hand Thenar`, `Knee Meniscus`) once their children have moved out |
| reorder | 49 | tags that stayed put but shifted position in Andrew's list |

**Most of the work is *move*, not insert, and that is the point.** The v2.0 seed flattened the
levels this source only implies — it holds one group called `Shoulder Rotator Cuff` where Andrew's
list has `Shoulder` containing `Rotator Cuff`. Matching on the parent path alone would have read
every leaf beneath it as new and duplicated 126 tags that are already carrying content. Identity is
therefore the normalised name *within its branch*, and a tag whose parent changed is moved.

Two things are deliberately not done. `Post-operative cervical fusion rehabilitation` — the one live
term this list does not carry — is **kept exactly where it is**, because the load is additive and a
tag a member has already used must not vanish underneath them. And the flattened groups are
**retired, not deleted**: `listTags` stops descending at a retired node, so they leave the picker
while anything already tagged with the group itself is untouched.

One term is dropped: *Ulnocarpal ligament complex* appears twice inside its own group in the source,
and `tags_parent_name_unique` forbids two siblings sharing a name.

### Part 2 — `0031_seed_part2_synonyms.sql`

Synonyms are a `text[]` on the tag row, not a table, so this is a data top-up with no schema change
that improves two things at once with no code change: forum search folds `name || synonyms` into
both its tsvector and trigram paths, and the research-feed classifier matches a tag on its name *or*
any synonym. **Tags carrying synonyms go from 11 to 105**, and distinct synonym terms from 27 to 139.

**The Part 1 expansion barely helps here** — it lifts the matchable set from 85 preferred terms to
90 — because Part 2 is mostly conditions phrased differently, not the anatomy Part 1 added. Of its
349 preferred terms, 90 name a tag; the remaining 259 are search vocabulary with no tag to hang off,
which is exactly why Andrew's decision of 2026-08-27 sends them to a standalone thesaurus (S18a)
rather than the tag tree.

Twenty-three aliases are deliberately **not** loaded, because a wrong synonym is worse than a missing
one — it silently mis-files content instead of merely failing to find it:

- **Two are footnoted in the source.** Both recorded footnotes forbid an otherwise obvious mapping:
  DDH is not a synonym for every acetabular dysplasia, and "runner's knee" must not resolve to one
  condition. The asterisk is dropped wherever the alias appears, not only where it is marked —
  otherwise the unmarked *runner's knee* under patellofemoral pain syndrome would slip through.
- **Two mean more than one tag.** *herniated disc* is given to both *Disc extrusion* and *Disc
  herniation*.
- **Seven are themselves tags**, which is a merge question rather than a synonym and is Andrew's to
  answer: *Proximal hamstring tendinopathy*, *Subdeltoid bursitis*, *Disc bulge*, *pars defect*,
  *Acetabular labral tear* and *Tibial nerve entrapment*.
- **Fourteen are bare abbreviations of four characters or less** — `oa`, `as`, `ra`, `psa`, `ocd`,
  `mps`, `fai`, `cts` and the rest. The classifier applies its ambiguity guard to tag *names* only,
  so a short synonym enters unguarded and a single-token variant matches on bare presence in a
  title. `psa`, `mps` and `ocd` all mean something else in a medical corpus, and `as` is a word.
  This is the same shape as the documented false positive where a materials-science paper on stress
  fracture in alloys matched the clinical *Stress fracture* tag. **These are unproven rather than
  rejected**: the admin tag screen dry-runs a proposed synonym against the real corpus and shows
  the titles that would newly match, which is the evidence needed to add them one at a time.

Existing synonyms are **unioned, never overwritten** — migration 0025 hand-tuned eleven tags against
the live corpus and that work stands. One further hand-off: `Shoulder Rotator Cuff` carried the
synonym *rotator cuff* and is one of the groups being retired, so 0030 hands it to the `Rotator Cuff`
tag that replaces it. The classifier walks `community.tags` without regard to `retired_at`, so
without that the retired tag would have gone on collecting matches its visible replacement should
be getting.

### Part 3

Unchanged and out of scope here: it describes tests, treatments and equipment rather than anatomy or
pathology, has *zero* overlap with the body-part taxonomy, and is search vocabulary for the S18a
thesaurus.

### After deploying

The stored corpus is **not** re-tagged automatically. `POST /v1/research-feed/reclassify` re-tags it
against the new tags and synonyms with no refetch, and wants running once after this lands.

---

## Appendix C — Andrew's review, 2026-08-24

Andrew reviewed Part 1 and confirmed the ligament groupings in all five regions. His amendments
are applied above and recorded verbatim in `docs/tools/vocabulary/amendments.py`: the restated
blocks removed, the cervical upper-stabiliser block dissolved into its respective headings,
*Forearm* and the interosseous membrane kept, the interphalangeal joints given radial collateral /
ulnar collateral / palmar ligament, and the deltoid layers turned into proper lists.

**Three questions went back to him on 2026-08-24, and he answered all three the same day.**

1. **The three terms that would have been lost** — *Intermetacarpal ligaments*, *Intermetatarsal
   ligaments* and *Interosseous ligaments*. Andrew: *"yes these can be removed — the ligaments are
   detailed as lateral or medial in the document already."* Removed.

2. **Which of the two Pelvic ring blocks.** Andrew: *"pelvic ring is the union of the bones already
   detailed in the document. A fracture of the pelvic ring must therefore involve a fracture of one
   of those or a joint injury and we have each joint in the document. This can therefore be
   removed."* **Both** blocks removed — the landmarks and the injuries.

   > ⚠️ Worth revisiting if the taxonomy is ever used to tag trauma. Eleven of those twelve
   > conditions had no equivalent elsewhere, and four of them — *APC injury*, *Lateral compression
   > injury*, *Vertical shear injury*, *Combined-mechanism injury* — are the Young–Burgess
   > classification, which describes the ring as a whole and cannot be reconstructed from the
   > individual bones. Andrew's reasoning addresses fractures of the bones, which is sound; these
   > four are mechanism labels rather than fractures of any one bone.

3. **The finger restated collaterals.** Andrew: *"finger joints comprise of the proximal and distal
   interphalangeal joints — the ligaments mentioned in 'finger joints' are therefore already listed
   in our document."* Removed.

On the duplicated **pubic rami**, Andrew: *"these are aspects of the pubic bone, so as long as we
have the pubic bone in there and its conditions we are covered comprehensively."* Each now appears
once; the source listed both twice.
