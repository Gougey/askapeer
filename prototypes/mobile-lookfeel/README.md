# Askapeer — Mobile Look-and-Feel Prototype

An early **look-and-feel prototype** of the mobile web experience. A self-contained, static HTML file with mock content — **no backend, authentication, identity verification, or payment**. The goal at this stage is to validate the shape and feel of the app before building anything real.

## The three areas

Modelled on the LinkedIn feed / messages / notifications split:

- **Feed** — peer-reviewed articles filtered to the body areas you follow.
- **Discussions** — live Q&A threads from verified peers, ranked by kudos, including structured de-identified case discussions.
- **Activity** — your own questions and the responses coming back.

Plus a central **Ask** action to post a question or a de-identified case, and a pseudonymous **Profile**.

## Design principles reflected in the prototype

- **Anonymity shown, not stated** — no photos anywhere; handles use monogram tiles; no specialty, grade, or employer is ever displayed. Kudos is the only status signal.
- **Mobile-first** — bottom tab bar, thumb-reachable Ask button, horizontal swipe between sections.
- **Patient safety by design** — a case discussion cannot be posted until every de-identification checklist item and the attestation are complete.

## Running it

It's a single static file. Open `index.html` directly, or serve the folder:

```bash
cd prototypes/mobile-lookfeel
python -m http.server 5178
```

Then visit http://localhost:5178 — best viewed in a mobile viewport.

A `.claude/launch.json` config at the repo root also points at this folder for editor/tooling launch integration.
