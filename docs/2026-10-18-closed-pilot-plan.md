# Closed pilot — plan of action

**Status:** in progress · **Owner:** Adrian · **Updated:** 18 October 2026

About fifteen of Andrew Renshaw's colleagues are coming onto live Askapeer. This is the plan for getting them there safely: what was decided, what is built, and what is still to do.

## Decisions (Adrian, 17 October 2026)

1. **Invited colleagues skip the identity check.** Verification is still simulated, and its stand-in screen is a mock that real clinicians should never see. Andrew vouching for a colleague stands in for it, and each approval is recorded as "pilot allowlist", so the audit trail says the checks were not run.
2. **All existing member data is cleared before the pilot, including the audit logs.** Everything so far is test data — the founders' and the seeded demo's. A database backup is taken first, so nothing is unrecoverable.
3. **Andrew sends the invitation himself, from his own address.** It lands better than mail from a new domain, and it carries his endorsement.

## Findings that shaped the plan

- **Live registration was open to anyone with the URL.** With verification simulated, the stand-in identity screen let an applicant approve themselves. The invitation list is therefore the access control for the pilot, not a convenience.
- **Email is the biggest risk.** Andrew's own sign-in codes were accepted by his Microsoft 365 mail system and then filtered before reaching him, four times in August. Colleagues on the same email domain are likely to hit the same problem.
- **There is no payment wall.** Billing is not built and the paywall is off.

## Done

| What | Where |
|---|---|
| Invitation-only registration — invited emails are approved on registering; anyone else is refused and nothing about them is stored | Live since 18 October (PR #178) |
| Operator tool — add, remove and list invitations; dry-run and run the clear-down | `node dist/cli/pilot.js` on the API machine (see DEVELOPMENT.md, "Closed pilot") |
| Clear-down dry run on live — would clear 36 members, 74 posts and 843 kudos; keeps every article, the tag vocabulary and the configuration | Run 18 October; nothing changed |
| Welcome guide — registering, the six-digit code, choosing a handle, the home screen on iPhone and Android, finding your way around | `/welcome` on the app |
| Draft invitation email for Andrew | "Pilot — Invitation Email (draft)" on this site |

## To do

**From Andrew**
- [ ] The list of email addresses, and each person's professional body.
- [ ] Which email domains they use. If any share his Microsoft 365 domain, or are NHS or university addresses, ask their IT to allow mail from `mail.askapeer.co.uk` before the invitations go out.
- [ ] A start date, and a small first wave (Andrew plus two or three colleagues) a few days ahead of the rest.
- [ ] Three to five genuine starter questions to post on day one, so nobody arrives to an empty forum.

**From us**
- [ ] A short privacy notice. Colleagues' real names and registration numbers are real personal data.
- [ ] Settle the research backfill's load on the database. On 18 October it briefly starved the API (about 12:00–12:50); slowing it, or running it overnight only, must be done before invitations go out.
- [ ] Rehearse the whole journey on a real iPhone and a real Android phone, with a fresh address on Andrew's email domain.

**Go-live, in order**
1. Take a database backup.
2. Run the clear-down's dry run, read the counts, then run it for real.
3. Import the invitation list, including Adrian, Paul and Andrew.
4. The three founders register again and post the starter questions.
5. First wave: Andrew and two or three colleagues. Watch sign-ins for two or three days.
6. Everyone else.

## During the pilot

- Watch for colleagues who registered but never signed in — that is the signature of a sign-in code that was filtered.
- No reclassify runs or taxonomy migrations without notice. A reclassify caused a 90-minute outage in September.
- A weekly check-in with Andrew, turning feedback into a short list.
- Kudos "levels" are deferred until Adrian and Andrew have talked them through. The pilot runs on kudos as it is today.
