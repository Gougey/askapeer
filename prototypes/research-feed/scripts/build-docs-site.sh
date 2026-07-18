#!/bin/bash
# Regenerates public/docs/*.html from the canonical markdown specs in docs/.
# Run locally (needs pandoc + python3); the fly.io container just serves the
# committed output, it doesn't run this script itself.
#
# Usage: ./scripts/build-docs-site.sh   (run from prototypes/research-feed/)

set -euo pipefail
cd "$(dirname "$0")/.."
REPO_ROOT="$(cd ../.. && pwd)"
OUT="public/docs"
SPECS="$REPO_ROOT/docs/superpowers/specs"

mkdir -p "$OUT"

# slug | source markdown path | display title | one-line description | group
DOCS=(
  "prd|$REPO_ROOT/docs/askapeer-prd-v0.1.md|PRD v0.1|Full product requirements document — source of truth for scope, personas, verification model, and open stakeholder decisions.|PRD"
  "architecture|$SPECS/2026-07-14-askapeer-architecture-design.md|Technical Architecture Specification|Cross-cutting architecture underpinning all epics: stack, hosting, data model, identity/pseudonymity enforcement, auth.|Architecture"
  "epic-a|$SPECS/2026-07-14-epic-a-verification-technical-spec.md|EPIC-A — Verification|Registration, identity verification pipeline, admin review queue.|Epics"
  "epic-b|$SPECS/2026-07-14-epic-b-handles-profile-technical-spec.md|EPIC-B — Handles/Profile|Pseudonymous handle creation, profile visibility, follows.|Epics"
  "epic-c|$SPECS/2026-07-14-epic-c-forum-technical-spec.md|EPIC-C — Forum|Posting, commenting, tagging, search, personalised feed.|Epics"
  "epic-d|$SPECS/2026-07-14-epic-d-kudos-technical-spec.md|EPIC-D — Kudos|Kudos awarding and answer ranking.|Epics"
  "epic-e|$SPECS/2026-07-14-epic-e-case-discussions-technical-spec.md|EPIC-E — Case Discussions|De-identification checklist, attestation, patient-safety policy.|Epics"
  "epic-f|$SPECS/2026-07-14-epic-f-moderation-technical-spec.md|EPIC-F — Moderation|Content reporting, moderation actions, audited identity access.|Epics"
  "epic-g|$SPECS/2026-07-14-epic-g-notifications-technical-spec.md|EPIC-G — Notifications|In-app and email notifications.|Epics"
  "epic-h|$SPECS/2026-07-14-epic-h-subscription-payments-technical-spec.md|EPIC-H — Subscription/Payments|Subscription lifecycle, billing, access gating.|Epics"
  "epic-i|$SPECS/2026-07-14-epic-i-research-feed-technical-spec.md|EPIC-I — Research Feed|Research/news feed ingestion, scoring, member interests.|Epics"
  "epic-j|$SPECS/2026-07-17-epic-j-administration-configuration-technical-spec.md|EPIC-J — Administration & Configuration|Categories, taxonomy, handle blocklist, tunable settings, admin audit — the Administrator role.|Epics"
  "screen-functional-spec|$REPO_ROOT/docs/2026-07-18-screen-functional-spec.md|Screen & Functional Spec|Mobile-first mapping of the tech specs onto app screens: navigation, per-screen content, data→API, and surfaced spec-gaps.|Client"
  "open-questions|$REPO_ROOT/docs/2026-07-14-technical-specs-open-questions.md|Consolidated Open Questions|Every open question/conflict across all specs, gathered for team review.|Review"
  "taxonomy-standards|$REPO_ROOT/docs/2026-07-17-taxonomy-standards-research.md|Taxonomy Standards Research|Candidate standard medical taxonomies (MeSH, OSIICS) for the forum tag vocabulary — input to FD-4.|Review"
)

for entry in "${DOCS[@]}"; do
  IFS='|' read -r slug src title desc group <<< "$entry"
  echo "Building $slug from $src"
  body_html=$(pandoc "$src" -f markdown -t html)
  python3 "$(dirname "$0")/wrap-doc.py" "$slug" "$title" "$OUT/$slug.html" <<< "$body_html"
done

python3 "$(dirname "$0")/build-index.py" "$OUT/index.html" "${DOCS[@]}"

echo "Done. Output in $OUT/"
