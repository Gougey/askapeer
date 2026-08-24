
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

For context in the discussion that follows this document. **No mapping or loading has been done.**

The live taxonomy holds **588 tag rows** (538 distinct names, repeated across branches by design)
under 5 region roots, seeded from Andrew's Body Part List v2.0 in July 2026. Of those, **11 carry
search synonyms**.

Measured against that, this new list contains **1,996 distinct terms**, of which **1,557 do not
currently exist as a tag**:

| Part | Distinct terms | Already a tag | Not yet a tag |
|---|---:|---:|---:|
| 1. Anatomy and conditions | 920 | 439 | 481 |
| 2. Synonyms (preferred terms) | 334 | 76 | 258 |
| 3. Assessment and treatment | 823 | 0 | 823 |

Three observations worth carrying into the discussion:

- **Part 2 is the immediately valuable piece.** Only 76 of its preferred terms match a live tag, but
  those 76 would bring **138 synonyms** — against the 11 tags that have any today. That is the
  known weak spot in feed classification, and it needs no taxonomy changes to land.
- **Part 3 is a different kind of vocabulary.** It has *zero* overlap with the body-part taxonomy
  because it describes tests, treatments and equipment rather than anatomy or pathology. It is not
  an extension of the tag tree; it is either a second dimension or out of scope.
- **Part 1 is roughly half new.** 481 new terms against 588 existing rows is not a top-up, it is a
  significant expansion — and the interests picker already offers members the whole tree, so
  anything added here lands in front of them.

---

## Appendix C — Andrew's review, 2026-08-24

Andrew reviewed Part 1 and confirmed the ligament groupings in all five regions. His amendments
are applied above and recorded verbatim in `docs/tools/vocabulary/amendments.py`: the restated
blocks removed, the cervical upper-stabiliser block dissolved into its respective headings,
*Forearm* and the interosseous membrane kept, the interphalangeal joints given radial collateral /
ulnar collateral / palmar ligament, and the deltoid layers turned into proper lists.

**Three questions went back to him**, and until they are answered nothing here is final:

1. **Three terms would have been lost.** *Intermetacarpal ligaments* (in the carpometacarpal
   section he asked to remove) and *Intermetatarsal ligaments* and *Interosseous ligaments* (in
   the plantar section he asked to remove) appear **nowhere else in the document**. They have been
   moved into the surviving block and marked *awaiting Andrew* rather than deleted.

2. **"Pelvic ring can be removed" — which of the two?** The source itself disagrees about them.
   *Bones & landmarks → Pelvic ring* is headed "already detailed above" and is safe to drop.
   *Conditions → Pelvic ring* is headed "Common injuries — **not** already detailed above" and
   holds **12 conditions found nowhere else**, including pelvic ring fracture, APC injury, lateral
   compression injury, vertical shear injury and pelvic ring diastasis. Both are untouched pending
   his answer.

3. **"Finger joints — restated collaterals"** was not mentioned while he was specifying the
   contents of the PIP and DIP joints immediately above it. It is left in place, still marked as
   a proposal.

He also asked what the two duplicate term names were: *Superior pubic ramus* and *Inferior pubic
ramus*, each listed twice in Pelvis → Bones & landmarks → Pubis. The structure-health table now
names duplicates rather than only counting them.
