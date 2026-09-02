"""Loads Part 2 of Andrew's list into `community.tags.synonyms` (slice S18b).

    python3 docs/tools/vocabulary/synonyms.py           # report only
    python3 docs/tools/vocabulary/synonyms.py --write   # also write the migration

Synonyms are not a table — they are a `text[]` on the tag row — so this is a data top-up with
no schema change, and it improves two things at once with no code change: forum search folds
`name || synonyms` into both its tsvector and trigram paths, and the research-feed classifier
matches a tag on its name *or* any synonym.

**Part 2 is search vocabulary, not taxonomy** (Andrew, 2026-08-27), so only the preferred terms
that already name a tag can be loaded here; the rest belong to the standalone thesaurus in S18a.
The Part 1 expansion barely changes that — it lifts the matchable set from 85 terms to 90 —
because Part 2 is mostly conditions phrased differently, not the anatomy Part 1 added.

Four rules decide what is *not* loaded, each because loading it would be wrong rather than
merely useless. A wrong synonym is worse than a missing one: it silently mis-files content
instead of just failing to find it.

- **Asterisked aliases are dropped everywhere they appear.** The asterisk is the source's own
  "read the footnote" marker, and both recorded footnotes forbid an otherwise obvious mapping —
  DDH is not a synonym for every acetabular dysplasia, and "runner's knee" must not resolve to
  one condition. Dropping the alias only where it carries the asterisk would miss the second
  case, which appears unmarked under patellofemoral pain syndrome.
- **An alias meaning two different tags is dropped.** One does: *herniated disc*, which Part 2
  gives to both *Disc extrusion* and *Disc herniation*.
- **An alias that is itself a tag is dropped and reported.** Six are. Making *Subdeltoid
  bursitis* a synonym of *Subacromial bursitis* when both are tags is a merge decision, not a
  synonym, and it is Andrew's to make.
- **A bare abbreviation of four characters or less is held back.** The classifier applies its
  ambiguity guard to tag *names* only — `[...nameVariants(tag.name, ambiguous), ...tag.synonyms]`
  — so a short synonym enters unguarded, and a single-token variant matches on bare presence in
  a title. `psa`, `mps` and `ocd` all mean something else in a medical corpus, and this is the
  same shape as the documented false positive where a materials-science paper on stress fracture
  in alloys matched the clinical tag. These are not rejected, just unproven: the admin tag screen
  dry-runs a proposed synonym against the real corpus and shows the titles that would newly
  match, which is the evidence needed to add them one at a time.
- **Existing synonyms are unioned, never overwritten.** Migration 0025 hand-tuned eleven tags
  against the live corpus; this must not undo that.

A preferred term that names more than one tag row updates all of them — the taxonomy repeats a
condition across regions by design, and each copy should match the same words.
"""
import sys, os, re, collections
from pathlib import Path

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from extract import build_model
import taxonomy as T

ROOT = Path(D).resolve().parents[2]
OUT = ROOT / "apps" / "api" / "drizzle" / "0031_seed_part2_synonyms.sql"
SEED25 = ROOT / "apps" / "api" / "drizzle" / "0025_seed_clinical_synonyms.sql"


def existing_synonyms():
    """What 0025 already put on a tag, so the union can be computed at generation time.

    It addresses tags by name, in two forms — `WHERE "name" = 'x'` and `WHERE "name" IN (...)`
    for the calf muscles that share a set — so both are read here."""
    out = collections.defaultdict(set)
    for stmt in re.findall(r"^UPDATE .*?;", SEED25.read_text(), re.S | re.M):
        m = re.search(r"SET \"synonyms\" = ARRAY\[(.*?)\]\s*WHERE \"name\" (=|IN)\s*(.*?);",
                      stmt, re.S)
        if not m:
            sys.exit(f"could not read a 0025 statement:\n{stmt}")
        terms = [t.replace("''", "'").lower() for t in re.findall(r"'((?:[^']|'')*)'", m.group(1))]
        for name in re.findall(r"'((?:[^']|'')*)'", m.group(3)):
            out[T.norm(name.replace("''", "'"))].update(terms)
    return out


def plan():
    b = build_model()
    p = T.plan()

    # every tag row after the Part 1 load, indexed by normalised name
    rows = collections.defaultdict(list)
    renamed = {r["id"]: r["now"] for r in p["renames"]}
    for t in p["live"].values():
        rows[T.norm(renamed.get(t["id"], t["name"]))].append(
            dict(id=t["id"], name=renamed.get(t["id"], t["name"])))
    for i in p["inserts"]:
        rows[T.norm(i["name"])].append(dict(id=i["id"], name=i["name"]))
    retired = {r["id"] for r in p["retires"]}

    pairs = []
    for t in b["part2"]:
        if t["heading"] == "Grading":
            continue
        for r in t["rows"]:
            if r["preferred"]:
                pairs.append((r["preferred"], r["synonyms"]))

    starred = {T.norm(s.replace("*", "")) for _, syns in pairs for s in syns if "*" in s}
    alias_targets = collections.defaultdict(set)
    for pref, syns in pairs:
        for s in syns:
            alias_targets[T.norm(s.replace("*", ""))].add(T.norm(pref))
    ambiguous = {a for a, targets in alias_targets.items()
                 if len({x for x in targets if x in rows}) > 1}
    is_tag = set(rows)

    have = existing_synonyms()
    updates, skipped = {}, collections.defaultdict(list)
    matched_terms = 0
    for pref, syns in pairs:
        k = T.norm(pref)
        if k not in rows:
            continue
        matched_terms += 1
        keep = []
        for s in syns:
            a = T.norm(s.replace("*", ""))
            clean = s.replace("*", "").strip().lower()
            if not a:
                continue
            if a in starred:
                skipped["footnoted in the source"].append((pref, clean)); continue
            if a in ambiguous:
                skipped["means more than one tag"].append((pref, clean)); continue
            if a in is_tag:
                skipped["is itself a tag — a merge question"].append((pref, clean)); continue
            if " " not in a and len(a) <= 4:
                skipped["a bare abbreviation — needs a dry run first"].append((pref, clean))
                continue
            if a == k:
                continue
            keep.append(clean)
        if not keep:
            continue
        for row in rows[k]:
            if row["id"] in retired:
                continue
            cur = updates.setdefault(row["id"], dict(name=row["name"],
                                                     syns=set(have.get(k, set()))))
            cur["syns"].update(keep)
    return dict(updates=updates, skipped=skipped, matched=matched_terms,
                total=len(pairs), have=have)


def emit_sql(p):
    n_rows = len(p["updates"])
    n_syn = len({s for u in p["updates"].values() for s in u["syns"]})
    L = [f"""-- Part 2 of Andrew Renshaw's August 2026 vocabulary: synonyms for the tags that have one.
--
-- Generated by `docs/tools/vocabulary/synonyms.py` — do not hand-edit; change the pipeline and
-- re-run. Slice S18b in the backlog.
--
-- `synonyms` is a `text[]` on the tag row, not a table, so this is a data top-up with no schema
-- change that improves two things at once with no code change: forum search folds
-- `name || synonyms` into both its tsvector and trigram paths, and the research-feed classifier
-- matches a tag on its name *or* any synonym. Before this, {len(p['have'])} tags had synonyms.
--
-- {p['matched']} of Part 2's {p['total']} preferred terms name a tag; a term that names more than
-- one tag row updates all of them, because the taxonomy repeats a condition across regions by
-- design and each copy should match the same words. That is {n_rows} rows, {n_syn} distinct terms.
--
-- Each UPDATE writes the **union** of what the tag already had and what Part 2 adds — migration
-- 0025 hand-tuned eleven tags against the live corpus and must not be undone.
--
-- What is deliberately NOT loaded, because a wrong synonym silently mis-files content:"""]
    for reason, items in sorted(p["skipped"].items()):
        L.append(f"--   {len(items):>2} {reason}")
        for pref, s in items:
            L.append(f"--        {pref} <- {s}")
    L.append("")
    for tid, u in sorted(p["updates"].items(), key=lambda kv: kv[1]["name"]):
        arr = ", ".join(T.q(s) for s in sorted(u["syns"]))
        L.append(f"-- {u['name']}")
        L.append(f"UPDATE \"community\".\"tags\" SET \"synonyms\" = ARRAY[{arr}] "
                 f"WHERE \"id\" = {T.q(tid)};--> statement-breakpoint")
    return "\n".join(L) + "\n"


if __name__ == "__main__":
    p = plan()
    print(f"Part 2: {p['matched']} of {p['total']} preferred terms name a tag")
    print(f"  {len(p['updates'])} tag rows updated, "
          f"{len({s for u in p['updates'].values() for s in u['syns']})} distinct synonym terms")
    print(f"  tags carrying synonyms: {len(p['have'])} -> {len(p['updates'])}")
    for reason, items in sorted(p["skipped"].items()):
        print(f"\n  skipped — {reason} ({len(items)}):")
        for pref, s in items:
            print(f"    {pref} <- {s}")
    if "--write" in sys.argv:
        OUT.write_text(emit_sql(p))
        print(f"\nwrote {OUT.relative_to(ROOT)}")
