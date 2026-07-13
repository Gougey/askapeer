# Technical Design Discussion: Personalised Allied Health Research Feed

## User
Is Google Scholar free to use? Does it have public APIs?

## Assistant (summary)
- Google Scholar is free to search.
- It does not provide an official public API.
- Automated scraping is discouraged and subject to blocking.
- Better API-first alternatives include PubMed, Semantic Scholar, OpenAlex, Crossref, Europe PMC and others.

---

## User
I’m looking at the viability of a news feed based on criteria including areas of interest for physiotherapists and allied health professions. Please assess Google Scholar, Elsevier, ScienceDirect, PubMed, Semantic Scholar, Scopus, Web of Science and BASE.

## Assistant (summary)
Main conclusions:
- **PubMed** – excellent, free API, ideal core source.
- **Semantic Scholar** – excellent API and citation graph.
- **Elsevier / ScienceDirect** – technically strong but licence dependent.
- **Scopus** – excellent but commercial.
- **Web of Science** – excellent but commercial.
- **BASE** – useful for open-access discovery.
- **Google Scholar** – use manually only; not suitable as a system integration.

Recommendation:
Build around PubMed + Semantic Scholar + OpenAlex/Crossref/Europe PMC, with commercial sources as optional premium enrichments.

---

## User
How would we design this?

## Assistant (detailed design)

### Architecture

External Sources
→ Scheduled ingestion
→ Normalisation
→ Deduplication
→ Topic classification
→ Quality scoring
→ Central article database
→ Personalised user feed

### Ingestion

Run scheduled background jobs (e.g. every few hours).

Each source adapter retrieves only new content since the previous successful run.

### Canonical article

Store one article regardless of how many sources contain it.

Typical fields include:
- DOI
- PMID
- Title
- Abstract
- Journal
- Publication date
- Source references
- Open-access status

### Deduplication

Priority:
1. DOI
2. PMID
3. Other identifiers
4. Normalised title/year
5. Fuzzy matching

### Controlled taxonomy

Examples:

Professions
- Physiotherapy
- Occupational Therapy
- Speech & Language Therapy
- Radiography
- Dietetics
- Podiatry

Clinical areas
- Musculoskeletal
- Neurology
- Respiratory
- Cardiovascular
- Paediatrics
- Older Adults
- Sports Rehabilitation

Conditions
- Low back pain
- Stroke
- Parkinson's disease
- COPD
- Osteoarthritis
- ACL injury

Interventions
- Exercise therapy
- Manual therapy
- Hydrotherapy
- Strength training
- Patient education
- Telerehabilitation

Evidence types
- Systematic review
- Meta-analysis
- Randomised Controlled Trial
- Guideline
- Cohort study
- Case report
- Preprint

### Classification

Use multiple methods:

- Source metadata
- Rule-based mappings
- AI classification into the controlled taxonomy
- Vector embeddings for semantic similarity

### User preferences

Store weighted interests rather than simple keywords.

Examples:
- Musculoskeletal +1.0
- Low back pain +1.5
- Sports rehabilitation +0.8
- Paediatrics -1.0

### Feed ranking

Combine:
- Topic match
- Semantic similarity
- Evidence quality
- Publication recency
- User behaviour
- Open-access bonus

### Explainability

Each recommendation should explain why it appears, e.g.:

"Recommended because you follow Low Back Pain, Exercise Therapy and Systematic Reviews."

### Recommended MVP

Sources:
- PubMed
- Semantic Scholar
- OpenAlex
- Crossref
- Europe PMC

Technology:
- ASP.NET Core
- PostgreSQL
- Background workers (Hangfire/Quartz)
- pgvector
- Redis
- Blob storage

Core services:
- Source adapters
- Normaliser
- Deduplicator
- Topic classifier
- Embedding service
- Feed ranking service

### Long-term vision

Expand beyond academic papers to include:
- NICE guidance
- NHS England
- CSP
- HCPC
- WHO
- Professional bodies
- Conferences
- Clinical news

Overall principle:

**Ingest once → classify once → personalise for every user.**
