# Research Feed — What's in the Demo, and What's Possible

*Briefing document for stakeholder discussion (Dave). Companion to the live demo at
`prototypes/research-feed/` / https://askapeer-research-feed.fly.dev/.*

## What's actually running in this demo

The "Your feed" pane pulls real, live articles — it is not mocked data. When you pick
interest tags on the Profile pane, the app queries two free literature databases,
**Europe PMC** and **OpenAlex**, in real time. Their results are merged and de-duplicated
by DOI, then each article is checked against your chosen tags using **keyword matching**:
the code looks for your tag's words appearing near each other in the title/abstract — not
true language understanding, just pattern matching. Articles are then ranked by how many
tags they match, a rough evidence-quality score (systematic reviews and RCTs rank above
case reports, based on the source's own publication-type label), and how recent they are.
Only articles matching at least one of your tags are shown at all.

This is deliberately the simplest version of the idea that still works end-to-end. It proves
three things: that free, no-cost literature sources have enough coverage to be useful; that
simple rule-based tagging is workable as a first pass; and that a "why is this here"
explanation can be generated automatically. It does **not** prove production readiness —
there's no user accounts, no persisted learning from what you read, no protection against
low-quality or retracted papers, and the keyword matching will occasionally surface an
irrelevant result (e.g. a paper using "hip" in an unrelated statistical sense). All of that
is fixable — see below — but wasn't necessary to prove the concept.

## Potential full feature set (beyond this prototype)

- **Move ingestion off the request path.** Today every feed load calls Europe PMC/OpenAlex
  live. A production version would fetch on a schedule into Askapeer's own database
  ("ingest once, classify once, personalise for every user"), so page loads are instant and
  never depend on a third party being up.
- **Remember what's been seen.** Track per-member read/seen articles so reopening the feed
  shows what's new, not a repeat of the same list — while keeping the full archive
  searchable (an explicit platform goal: institutional memory).
- **Real semantic matching, not just keywords.** Replace/augment keyword matching with
  vector embeddings or a citation-graph model (Semantic Scholar's data is well suited to
  this) so the feed understands that "ACL" and "anterior cruciate ligament" are the same
  thing, and that a paper about it is relevant even if it never uses your exact tag word.
- **Quality and safety filtering.** Cross-check against DOAJ (legitimate open-access
  journals) and the Retraction Watch database (now free via Crossref) so predatory-journal
  content or retracted papers never reach a clinician's feed.
- **Guard against a filter bubble.** Deliberately inject some topic diversity rather than
  pure keyword-affinity ranking, so the feed doesn't ossify around only your most-followed
  areas.
- **Connect the feed to the forum.** A "Discuss this paper" action linking straight into a
  case/question thread, so the feed feeds community engagement rather than being a
  standalone reading list.
- **Privacy design for interest data.** What a member follows/reads is a new category of
  personal data that doesn't exist elsewhere on the platform — needs the same care as the
  pseudonymity model applied to everything else.
- **Licensing review before adding paid sources.** Using a commercial source (Elsevier,
  Scopus, Web of Science, Cochrane) or bulk-reusing an aggregator's content (CORE, BASE)
  inside a paid product is a different legal situation to personal/research use — needs
  sign-off before committing engineering time to integrate one.

## Data source catalogue

### Currently integrated

- **Europe PMC**
  - *Usefulness*: Mirrors PubMed + PubMed Central + preprints; includes structured
    abstracts and publication-type metadata (what powers today's evidence-type badges).
  - *Access*: Free REST/JSON API, no key required, generous limits, CORS-enabled.
  - *Licensing*: Fully open, unrestricted reuse.

- **OpenAlex**
  - *Usefulness*: Broadest coverage of any source here (240M+ works, all disciplines) —
    catches sports-science/biomechanics content that isn't PubMed-indexed. Ships its own
    topic/concept tags, which could eventually replace some of our own tagging.
  - *Access*: Free REST/JSON, no key required (an email header for a "polite pool" gets
    priority), CORS-enabled.
  - *Licensing*: Open (CC0 metadata), free for any use including commercial.
  - *Known issue*: aggregates institutional repositories (theses/dissertations)
    alongside real journal articles, sometimes mis-labelled — this prototype already
    filters those out after finding one in testing.

### Other free/open sources worth adding

- **PubMed (direct via NCBI E-utilities)**
  - *Usefulness*: Same underlying biomedical content as Europe PMC; a natural backup source.
  - *Access*: Free, XML rather than JSON (why Europe PMC was picked first); an NCBI API
    key raises rate limits.
  - *Licensing*: Open.

- **Crossref**
  - *Usefulness*: The canonical DOI registry — best for citation metadata and verifying a
    DOI is legitimate; usually lacks abstracts.
  - *Access*: Free, no key required.
  - *Licensing*: Open (CC0).

- **Retraction Watch data (via Crossref)**
  - *Usefulness*: Directly answers the "quality/retraction filtering" gap above — flags
    withdrawn papers, which matters for a clinical audience.
  - *Access*: Free, folded into the Crossref REST API since Crossref acquired and now
    maintains the database as open data (updated daily).
  - *Licensing*: Open.

- **DOAJ (Directory of Open Access Journals)**
  - *Usefulness*: Verifies a journal is legitimately vetted open-access — a cheap
    predatory-journal check.
  - *Access*: Free REST API, no key required.
  - *Licensing*: Open.

- **CORE (core.ac.uk)**
  - *Usefulness*: The largest open-access full-text aggregator — could let the feed link
    to (or excerpt) full papers, not just abstracts.
  - *Access*: Free API key via a short application form; fair-use rate limits.
  - *Licensing*: Open access content, but redistribution terms trace back to each
    underlying repository — needs per-item checking for bulk reuse.

- **ClinicalTrials.gov**
  - *Usefulness*: A trial registry, not published literature — good for an "ongoing
    trials" section, surfacing evidence before it's published.
  - *Access*: Free, modern REST API (v2), no key required.
  - *Licensing*: Open (US government data).

- **BASE (Bielefeld Academic Search Engine)**
  - *Usefulness*: Broad open-access aggregator (~400M+ documents) — useful breadth as a
    supplementary source.
  - *Access*: Free API key via application form (a few days' turnaround).
  - *Licensing*: Open access content only; check redistribution terms before bulk reuse.

- **Semantic Scholar**
  - *Usefulness*: Strong citation graph and paper-similarity data — the natural upgrade
    path to real semantic matching instead of keywords.
  - *Access*: Usable without a key but tightly rate-limited; a free API key raises the
    limit modestly; real throughput needs an approved use case.
  - *Licensing*: Open, free.

### UK clinical guidance

- **NICE (National Institute for Health and Care Excellence)**
  - *Usefulness*: The authoritative source for UK clinical guidelines — directly relevant
    given Askapeer's UK-first positioning; would let the feed surface official guidance
    alongside journal literature.
  - *Access*: Free syndication API, but requires an application (one of 4 licence types,
    approved monthly) and technical integration (XML-based).
  - *Licensing*: Free to use within the UK under the agreed licence.

### Physiotherapy-specific (best domain fit)

- **PEDro (Physiotherapy Evidence Database)**
  - *Usefulness*: The single most directly relevant source for this audience — 68,000+
    physiotherapy-specific trials, reviews, and guidelines, each quality-rated on the
    PEDro scale (a recognised physiotherapy evidence-quality score). Better domain fit
    than any general-purpose source on this list.
  - *Access*: Public web search exists; I could not confirm a public API from available
    documentation — would need to contact the PEDro team (University of Sydney / NeuRA)
    directly about data-sharing or programmatic access.
  - *Licensing*: Free to browse; bulk/API terms unconfirmed, needs direct enquiry.

### Commercial / subscription sources

- **Elsevier / ScienceDirect**
  - *Usefulness*: Strong full-text coverage of biomedical/sports-science journals.
  - *Access*: Elsevier Developer API key; full text or high volume needs an
    institutional subscription/licensing agreement.
  - *Licensing*: Commercial; not viable without a paid agreement.

- **Scopus**
  - *Usefulness*: Excellent citation metrics and curated metadata quality.
  - *Access*: API key tied to an institutional Scopus subscription.
  - *Licensing*: Commercial (Elsevier).

- **Web of Science**
  - *Usefulness*: Similar to Scopus — strong citation/impact data, widely trusted in
    academia.
  - *Access*: API access tied to a Clarivate subscription.
  - *Licensing*: Commercial.

- **Cochrane Library**
  - *Usefulness*: The gold standard for systematic-review evidence — would meaningfully
    raise the trust bar of the feed's evidence-type scoring.
  - *Access*: Abstracts and plain-language summaries are freely readable on the Cochrane
    website without a subscription; full-text/bulk API access requires a direct licensing
    conversation with Wiley (Cochrane's publisher).
  - *Licensing*: Commercial for bulk/API access; free to browse summaries.

### Not viable for this use

- **Google Scholar**
  - *Usefulness*: Broadest human-search coverage.
  - *Access*: No official API; automated scraping breaches Google's Terms of Service and
    is actively blocked.
  - *Licensing*: N/A — manual/human use only.
