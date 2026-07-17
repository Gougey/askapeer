# Standard Medical Taxonomies — Research Note

**Status**: Decision record — the taxonomy portion of FD-4 / §1.2 is now **resolved** (Andrew Renshaw's input, 2026-07-17). The research below is retained for context; the Decision section states what was chosen.
**Date**: 17 July 2026 (decision added 2026-07-17)
**Author**: Adrian Hall (Technical Lead), researched with Claude Code

Background research on whether Askapeer's forum tag vocabulary should be built from scratch or anchored to an existing standard medical taxonomy. Supported the FD-4 decision (forum organisation) and the taxonomy-unification item in `docs/2026-07-14-technical-specs-open-questions.md` (§1.2).

Related design context: the agreed forum structure is **one category + many tags per post** (EPIC-C spec, Sections 2–3; category = content type, tags = the unified clinical vocabulary below).

---

## Decision (Andrew Renshaw's input, 2026-07-17)

Andrew reviewed the approach and provided concrete lists. Decisions taken with Adrian:

**1. Model confirmed (FD-4).** Content-type **categories** (a short admin-managed set — e.g. Clinical Case, Research, Career, Equipment, General) plus many **tags** per post. Andrew agrees with a limited category set and a curated tag list.

**2. One unified tag vocabulary — a single maintained table, used by both surfaces.** Andrew supplied one list for tagging case posts (anatomical **regions**) and a different, broader list for filtering the **news feed** (regions **+** muscles **+** structures **+** pathologies). They overlap. Rather than maintain two lists, they are **combined into one controlled vocabulary** (Adrian's call: "one list is correct"), because a case post legitimately needs a clinical tag like *tendinopathy* **in addition to** a region like *knee* — not regions alone. Each term carries a **facet** (`region` / `muscle` / `structure` / `pathology`) and, for regions, a **grouping** (Upper limb / Lower limb). Both case posts and news-feed interests draw from the same table; the facet is organising metadata (for grouping the composer and filtering the feed), **not** a wall between the two surfaces. This is the concrete resolution of §1.2 (and unifies the vocabulary side of §1.1). The table must support additions going forward (Andrew will keep contributing terms) — which the EPIC-J tag-vocabulary management already provides.

**3. OSIICS omitted entirely.** Andrew floated it as an *optional* box but worried its complexity would put people off ("rarely used in the UK… I'd fear that including this might put people off"). An optional classification field would also complicate the model for little near-term return (no injury-audit use case yet). **Dropped** — this supersedes the OSIICS recommendation further down this note.

**4. MeSH retained as an internal mapping only.** Not member-facing and not OSIICS's replacement — an optional `mesh_id` per term, behind the scenes, so news-feed relevance (Europe PMC/PubMed are MeSH-indexed) and the search synonym dictionary get literature interop for free. Seeded opportunistically; never shown to or filled in by members.

**5. Muscle list pending.** Andrew will supply a fuller list of commonly-injured muscles from his medical system; the four already implied by his news-feed list (hamstring, quadriceps, adductor, calf) are seeded now, more added to the same table later.

### Agreed seed vocabulary

The initial rows for the unified table (canonical label → facet, grouping, synonyms). Extended over time via EPIC-J.

| Facet | Term | Grouping | Synonyms / notes |
|---|---|---|---|
| region | Head and neck | — | includes cervical spine |
| region | Chest | — | |
| region | Thoracic spine | — | |
| region | Lumbar spine | — | |
| region | Abdomen | — | "abdominal" |
| region | Pelvis | — | |
| region | Groin | — | (news-feed list; near hip/adductor) |
| region | Shoulder | Upper limb | |
| region | Upper arm | Upper limb | |
| region | Elbow | Upper limb | |
| region | Forearm | Upper limb | "lower arm" |
| region | Wrist/hand | Upper limb | single term (Andrew) |
| region | Hip | Lower limb | |
| region | Thigh | Lower limb | anterior + posterior |
| region | Knee | Lower limb | |
| region | Lower leg | Lower limb | anterior + posterior |
| region | Ankle | Lower limb | |
| region | Foot | Lower limb | |
| muscle | Hamstring | — | |
| muscle | Quadriceps | — | |
| muscle | Adductor | — | |
| muscle | Calf | — | (Andrew's fuller muscle list to follow) |
| structure | Anterior cruciate ligament | — | "ACL" |
| structure | Achilles | — | Achilles tendon |
| pathology | Tendinopathy | — | |
| pathology | Osteochondral | — | |

**Note on Ankle/foot:** Andrew's post list combined "ankle/foot" as one entry, but his news-feed list separated Ankle and Foot; the unified table uses the **granular** Ankle and Foot rows (the composer can still present them grouped). **Upper limb / Lower limb** exist as grouping parents.

---

## The landscape

Several standard vocabularies exist, but they serve different purposes and most are far heavier than a discussion forum needs:

| Taxonomy | Purpose | Fit for Askapeer |
|---|---|---|
| **SNOMED CT** | Comprehensive clinical terminology for coding patient records; NHS-mandated in England | Overkill — hundreds of thousands of concepts, designed to code patient data (which we must not store). Too granular for tagging discussions |
| **ICD-11** (WHO) | Diagnosis/disease classification | A diagnosis-coding axis, not a browsing or free-tagging one |
| **ICF** (WHO) | Functioning, disability & health — function-focused | Physiotherapy-native and a good conceptual fit, but a rehab framework, probably too structured for casual tagging |
| **MeSH** (US NLM) | Indexing the medical literature (PubMed/MEDLINE) | Strong candidate — see below |
| **OSIICS** (Orchard) | Sports-injury surveillance classification | Sports-medicine-native — the domain source Andrew will recognise |

## MeSH — availability (verified 17 July 2026)

The reason MeSH is interesting here: **the research feed (EPIC-I) already pulls from Europe PMC / PubMed, and those databases index everything with MeSH terms.** Anchoring or mapping the forum tags to MeSH means forum tags and research-feed classification share one vocabulary — directly addressing the "three unreconciled vocabularies" gap (§1.2).

- **Free**: publicly available from the US National Library of Medicine (a US government body). No fee.
- **License**: NLM Terms and Conditions (replaced the old MoU in Nov 2018) — effectively free to use/redistribute with acknowledgement; no restriction on the kind of reuse we'd need.
- **Formats**: XML, MARC 21, and **RDF**, all regularly updated. **The plain ASCII format was discontinued in January 2026** — do not build against it.
- **Programmatic access**: NCBI E-utilities; a MeSH RDF API (SPARQL endpoint + RESTful interface at `id.nlm.nih.gov/mesh/`, with a Swagger UI); and direct file downloads.
- **Structure**: hierarchical tree — Anatomy [A], Diseases [C], Techniques [E], etc. — which maps naturally onto both body-area and condition/treatment tags.

**Assessment**: the "map our tags to MeSH" plan is low-effort and well-supported (live API *and* downloadable files, free), and it's the one genuinely load-bearing reason to anchor to a standard — literature interop with the feed.

## OSIICS — availability (verified 17 July 2026)

- **Free**: for researchers and sports-medicine professionals.
- **License**: **Version 16 is CC BY 4.0** (permissive — reuse freely with attribution). Version 15 was the more restrictive CC BY-NC-ND, so **use v16** (released 1 November 2025).
- **Format**: an **online spreadsheet** of the full code set (English + Spanish/Italian translations) — genuinely machine-readable, not just a PDF.
- **Size/structure**: ~1,500+ codes, hierarchical — body region (letter, e.g. C = chest) → tissue type (letter) → pathology (number), e.g. `CxBxx`. v16 notably expanded female-athlete diagnoses.
- **Attribution**: acknowledgement requested for commercial/scientific use.

**Assessment**: usable (a CC BY spreadsheet, importable directly), but it's a *diagnosis-coding* system (fine-grained injury pathology), not a browsing taxonomy. ~1,500 codes is far too many to put in front of a member choosing a tag. **Superseded — see the Decision section above: OSIICS is omitted entirely.** Andrew (the domain source this note assumed would want it) judged it too complex for the audience, even as an optional field, and there's no injury-audit use case yet to justify the model cost. Left here for the record.

## Recommendation (as it stood before Andrew's input — now settled by the Decision section above)

Neither availability nor licensing blocked the approach. What was recommended, and how it landed:

- **Member-facing tags**: a short, curated, human-friendly list — small enough to browse — starting from Andrew's body-part list. → **Adopted**, and extended with muscles/structures/pathologies into the one unified vocabulary (Decision, above).
- **Map that list to MeSH** underneath, for research-feed interop. → **Adopted** as an internal-only optional `mesh_id`.
- **Use OSIICS v16 as a reference** for the condition/injury tags. → **Dropped** — Andrew judged it too complex even as an optional field (Decision, above).
- **Do not** adopt SNOMED/ICD wholesale — too granular. → **Held** (still the right call).

## Sources

- MeSH download (NLM): https://www.nlm.nih.gov/databases/download/mesh.html
- MeSH RDF: https://id.nlm.nih.gov/mesh/
- OSIICS v16 (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC13008443/
- About OSIICS (John Orchard): https://www.johnorchard.com/about-osiics.html
