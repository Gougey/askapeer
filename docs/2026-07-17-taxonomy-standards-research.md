# Standard Medical Taxonomies — Research Note

**Status**: Reference — input to FD-4 / taxonomy unification
**Date**: 17 July 2026
**Author**: Adrian Hall (Technical Lead), researched with Claude Code

Background research on whether Askapeer's forum tag vocabulary should be built from scratch or anchored to an existing standard medical taxonomy. Supports the still-open FD-4 decision (forum organisation) and the taxonomy-unification item in `docs/2026-07-14-technical-specs-open-questions.md` (§1.2). Not a decision — input for the conversation with Andrew Renshaw.

Related design context: the agreed forum structure is **one category + many tags per post** (EPIC-C spec, Sections 2–3; category = content type, tags = body areas / conditions / treatments). This note is about where the *tag* vocabulary comes from.

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

**Assessment**: usable (a CC BY spreadsheet, importable directly), but it's a *diagnosis-coding* system (fine-grained injury pathology), not a browsing taxonomy. ~1,500 codes is far too many to put in front of a member choosing a tag. Better as a **reference/mapping source for the condition/injury tags, and a credibility signal for Andrew**, than as the literal member-facing list.

## Recommendation

Neither availability nor licensing blocks the approach. Refined recommendation for the FD-4 / Andrew conversation:

- **Member-facing tags**: a short, curated, human-friendly list — small enough to browse — starting from Andrew's existing body-part list.
- **Map that list to MeSH** underneath, for the research-feed interop (the real payoff of anchoring to a standard).
- **Use OSIICS v16 as a reference** when building the condition/injury portion of the curated list — sports-medicine-native and the name Andrew knows — but don't expose its ~1,500 codes directly.
- **Do not** adopt SNOMED/ICD wholesale — too granular; would make tagging a chore and browsing overwhelming.

## Sources

- MeSH download (NLM): https://www.nlm.nih.gov/databases/download/mesh.html
- MeSH RDF: https://id.nlm.nih.gov/mesh/
- OSIICS v16 (PMC): https://pmc.ncbi.nlm.nih.gov/articles/PMC13008443/
- About OSIICS (John Orchard): https://www.johnorchard.com/about-osiics.html
