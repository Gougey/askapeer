"""Turns Part 1 of Andrew's list into a migration against the live tag taxonomy.

    python3 docs/tools/vocabulary/taxonomy.py           # report only
    python3 docs/tools/vocabulary/taxonomy.py --write   # also write the migration

**This is not a re-seed.** Migration 0010 cleared `community.tags` before inserting, which it
could afford to because nothing referenced a tag yet. Now three tables do — `post_tags`,
`member_interests` and `article_tags` — so an id that changes is a link that breaks. Every
existing row therefore keeps its id, and the load is expressed as the four operations that
turn the v2.0 tree into Andrew's: **rename, insert, move, retire**.

Most of the work is *move*, not insert, and that is the whole reason this file exists. The
v2.0 seed flattened the levels the source only implied: it holds one group called
`Shoulder Rotator Cuff` where Andrew's list has `Shoulder` containing `Rotator Cuff`. Matching
on the parent path alone would read every leaf under it as new and duplicate 126 tags that are
already carrying posts. Identity here is therefore **the normalised name within its branch**,
and a node whose parent has changed is moved rather than re-created.

What the operations mean:

- **rename** — same tag, better spelling. Ten live names carry a stray backslash from the v2.0
  seed's double-escaping (`Guyon\\'s canal syndrome`), and two use `--` for an en dash.
- **insert** — a term or group Andrew's list has and the taxonomy does not: the ligaments axis
  (absent entirely), the pelvis region (absent entirely), and the restored parent levels.
- **move** — an existing tag re-parented under a restored level. Id preserved, so its posts,
  interests and article matches come with it.
- **retire** — the flattened compound groups (`Hand Thenar`, `Knee Meniscus`) once their
  children have moved out. Retired rather than deleted: `listTags` already stops descending at
  a retired node, so they vanish from the picker while anything tagged with the group itself is
  left intact.

Nothing is deleted, and a live term Andrew's list happens not to carry is left where it is.
"""
import sys, os, re, json, collections, unicodedata, uuid
from pathlib import Path

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from model import part1

ROOT = Path(D).resolve().parents[2]
SEED = ROOT / "apps" / "api" / "drizzle" / "0010_seed_clinical_taxonomy.sql"
OUT = ROOT / "apps" / "api" / "drizzle" / "0030_expand_clinical_taxonomy.sql"

# New ids are uuid5 over the tag's path, so a term lands on the same id in every environment.
# 0010's own scheme was not committed and is not recoverable, which is exactly the failure this
# avoids repeating — local and live have already diverged once on category ids.
NS = uuid.uuid5(uuid.NAMESPACE_DNS, "taxonomy.askapeer.com")

# --------------------------------------------------------------------- mapping
# Andrew's regions carry his wording; the taxonomy's carry v2.0's. `None` means the region does
# not exist yet. Branch names follow the live convention — the region, then the axis.
REGIONS = {
    "Cervical spine":               "Cervical Spine (Neck)",
    "Upper limb":                   "Upper Limb",
    "Thoracic spine":               "Thoracic Spine",
    "Lumbar spine":                 "Lumbar Spine",
    "Lower limb":                   "Lower Limb",
    "Pelvis, hip and pelvic floor": None,
}
NEW_REGION_NAME = {"Pelvis, hip and pelvic floor": "Pelvis, Hip and Pelvic Floor"}

# The axis a branch becomes, and the facet everything under it takes. `structure` has been in
# the enum since 0004 and unused until now — ligaments and bony landmarks are what it is for.
BRANCH = {
    "Muscles":           ("{r} Muscles",           "muscle"),
    "Conditions":        ("{r} MSK conditions",    "pathology"),
    "Ligaments":         ("{r} ligaments",         "structure"),
    "Bones & landmarks": ("{r} bones & landmarks", "structure"),
}


def norm(s):
    """Identity for matching: case, accents, dash style and the seed's stray backslashes."""
    s = unicodedata.normalize("NFKD", s).lower().replace("\\", "")
    s = s.replace("–", "-").replace("—", "-").replace("’", "'")
    s = re.sub(r"-{2,}", "-", s)
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def read_seed():
    """The live tree as 0010 left it — the repo's record of what is in the database."""
    sql = SEED.read_text()
    rows = re.findall(
        r"\('([0-9a-f-]{36})', '((?:[^']|'')*)', '(\w+)'::\"community\"\.\"tag_facet\", "
        r"(NULL|'[0-9a-f-]{36}'), (\d+)\)", sql)
    if len(rows) != 588:
        sys.exit(f"expected 588 seed rows, parsed {len(rows)} — has 0010 changed?")
    live = {t: dict(id=t, name=n.replace("''", "'"), facet=f,
                    parent=None if p == "NULL" else p.strip("'"), order=int(o))
            for t, n, f, p, o in rows}
    kids = collections.defaultdict(list)
    for t in live.values():
        kids[t["parent"]].append(t)
    return live, kids


def plan(seeded=None):
    """`seeded` maps a normalised tag name to the synonyms 0025 gave it; passed in by
    `synonyms.py`, which owns the parsing of that migration."""
    seeded = seeded or {}
    live, kids = read_seed()

    def child(pid, name):
        for k in kids[pid]:
            if norm(k["name"]) == norm(name):
                return k

    def subtree(rid):
        out, stack = [], list(kids[rid])
        while stack:
            n = stack.pop(); out.append(n); stack += kids[n["id"]]
        return out

    regions, _, _ = part1()
    inserts, moves, renames, sorts, retires, dupes, keeps = [], [], [], [], [], [], []
    counts = collections.Counter()

    for r in regions:
        rname = REGIONS[r["name"]] or NEW_REGION_NAME[r["name"]]
        lr = child(None, REGIONS[r["name"]]) if REGIONS[r["name"]] else None
        if lr is None:
            rid = str(uuid.uuid5(NS, rname))
            inserts.append(dict(id=rid, name=rname, facet="region", parent=None,
                                order=len(REGIONS), path=rname))
            counts["insert"] += 1
        else:
            rid = lr["id"]

        for si, s in enumerate(r["subs"], 1):
            bname, facet = BRANCH[s["name"]]
            bname = bname.format(r=rname)
            ls = child(rid, bname) if lr else None
            if ls is None:
                bid = str(uuid.uuid5(NS, f"{rname}/{bname}"))
                inserts.append(dict(id=bid, name=bname, facet=facet, parent=rid,
                                    order=si, path=f"{rname}/{bname}"))
                counts["insert"] += 1
                idx = {}
            else:
                bid = ls["id"]
                idx = collections.defaultdict(list)
                for n in subtree(bid):
                    idx[norm(n["name"])].append(n)

            taken = {}

            def conv(groups):
                out = []
                for g in groups:
                    out.append(dict(kind="group", name=g["name"],
                                    children=conv(g.get("children", [])) +
                                             [dict(kind="leaf", name=i["text"], children=[])
                                              for i in g["items"]]))
                return out
            tree = conv(s["groups"]) + [dict(kind="leaf", name=i["text"], children=[])
                                        for i in s["loose"]]

            def resolve(nodes, parent_id):
                for n in nodes:
                    cands = [c for c in idx.get(norm(n["name"]), []) if c["id"] not in taken]
                    m = next((c for c in cands if c["parent"] == parent_id), None) or \
                        (cands[0] if cands else None)
                    n["live"] = m
                    if m:
                        taken[m["id"]] = n
                    resolve(n["children"], m["id"] if m else None)
            resolve(tree, bid)

            pairs_by_flat = {}

            def index_pairs(nodes, parent_name):
                for n in nodes:
                    if parent_name:
                        # v2.0 flattened a two-level pair two ways: by running the names
                        # together (`Shoulder Rotator Cuff`) and, where that would have
                        # collided, by bracketing the parent (`Nerve (elbow)` — the seed's one
                        # true sibling clash, split this way per Andy).
                        pairs_by_flat[norm(f"{parent_name} {n['name']}")] = n
                        pairs_by_flat[norm(f"{n['name']} ({parent_name})")] = n
                    index_pairs(n["children"], n["name"])
            index_pairs(tree, None)

            def emit(nodes, parent_id, path):
                # `tags_parent_name_unique` forbids two siblings sharing a name, and the source
                # repeats one term verbatim inside its own group (*Ulnocarpal ligament complex*,
                # under the wrist ligaments). That is a typing artefact, not a distinction, so
                # the repeat is dropped and reported rather than allowed to fail the migration.
                seen_here = set()
                kept = []
                for n in nodes:
                    if norm(n["name"]) in seen_here:
                        dupes.append(dict(path=path, name=n["name"]))
                        continue
                    seen_here.add(norm(n["name"]))
                    kept.append(n)
                nodes = kept
                for order, n in enumerate(nodes, 1):
                    m = n["live"]
                    if m is None:
                        nid = str(uuid.uuid5(NS, f"{path}/{n['name']}"))
                        n["assigned"] = nid
                        inserts.append(dict(id=nid, name=n["name"], facet=facet,
                                            parent=parent_id, order=order,
                                            path=f"{path}/{n['name']}"))
                        counts["insert"] += 1
                    else:
                        nid = m["id"]
                        n["assigned"] = nid
                        if m["parent"] != parent_id:
                            moves.append(dict(id=nid, name=m["name"], parent=parent_id,
                                              order=order, path=f"{path}/{n['name']}"))
                            counts["move"] += 1
                        else:
                            counts["same"] += 1
                            if m["order"] != order:
                                sorts.append(dict(id=nid, order=order, name=m["name"]))
                        if m["name"] != n["name"]:
                            renames.append(dict(id=nid, was=m["name"], now=n["name"]))
                    emit(n["children"], nid, f"{path}/{n['name']}")
            emit(tree, bid, f"{rname}/{bname}")
            for n in pairs_by_flat.values():
                n["resolved"] = n.get("assigned")

            if ls is not None:
                for n in subtree(bid):
                    if n["id"] in taken:
                        continue
                    # Two very different kinds of leftover, and only one of them is retired.
                    if not kids[n["id"]]:
                        # A *term* Andrew's list no longer carries. Kept exactly where it is:
                        # the load is additive, and a tag a member has already put on a post
                        # must not disappear underneath them.
                        keeps.append(dict(id=n["id"], name=n["name"], path=f"{rname}/{bname}"))
                        counts["keep"] += 1
                    else:
                        # A *flattened group* — `Shoulder Rotator Cuff` — whose children have all
                        # been moved under the restored two-level structure. Retiring one whose
                        # children had not all moved would hide them, so that is checked, not
                        # assumed.
                        stranded = [k["name"] for k in kids[n["id"]] if k["id"] not in taken]
                        if stranded:
                            sys.exit(f"refusing to retire {n['name']!r}: {len(stranded)} children "
                                     f"would be hidden with it — {stranded[:3]}")
                        # `Shoulder Rotator Cuff` becomes `Shoulder` > `Rotator Cuff`, so the
                        # tag that replaces it is the child whose parent's name and its own
                        # concatenate to the retired name. Recorded because a retired group may
                        # carry synonyms (0025 gave this one "rotator cuff") and the classifier
                        # walks tags without regard to `retired_at` — leaving them behind would
                        # have a hidden tag going on matching articles while its visible
                        # replacement matched nothing.
                        heir = pairs_by_flat.get(norm(n["name"]))
                        retires.append(dict(id=n["id"], name=n["name"], path=f"{rname}/{bname}",
                                            heir=heir, synonyms=seeded.get(norm(n["name"]), [])))
                        counts["retire"] += 1
    return dict(inserts=inserts, moves=moves, renames=renames, sorts=sorts,
                retires=retires, dupes=dupes, keeps=keeps, counts=counts, live=live)


# ------------------------------------------------------------------------ sql
def q(s):
    """Postgres string literal. Doubling the quote is the *only* escape — 0010 also emitted a
    backslash, which is why ten live tags are called things like `Guyon\\'s canal syndrome`."""
    if "\\" in s:
        sys.exit(f"refusing to emit a name containing a backslash: {s!r}")
    return "'" + s.replace("'", "''") + "'"


def emit_sql(p):
    L = []
    W = L.append
    n_ins, n_mov, n_ren, n_ret = (len(p[k]) for k in ("inserts", "moves", "renames", "retires"))
    W(f"""-- Expand the clinical taxonomy to Andrew Renshaw's August 2026 list, Part 1.
--
-- Generated by `docs/tools/vocabulary/taxonomy.py` from
-- `docs/Body Part, Conditions, and Synonym List.pdf` — do not hand-edit; change the pipeline
-- and re-run. The document it also produces is `docs/body-part-condition-and-synonym-list.md`.
--
-- **Unlike 0010, this does not clear the table.** `post_tags`, `member_interests` and
-- `article_tags` all reference `community.tags` now, so every existing row keeps its id and
-- the load is expressed as four operations:
--
--   {n_ren:>4} rename   spelling only — ten names carry a stray backslash from 0010's
--                     double-escaping, two use `--` where the source has an en dash
--   {n_ins:>4} insert   the ligaments axis (absent entirely), the pelvis region (absent
--                     entirely), and the parent levels the v2.0 seed flattened
--   {n_mov:>4} move     existing tags re-parented under those restored levels — ids kept, so
--                     their posts, interests and article matches move with them
--   {n_ret:>4} retire   the flattened compound groups (`Hand Thenar`, `Knee Meniscus`) now that
--                     their children have moved out. Retired, not deleted: `listTags` stops
--                     descending at a retired node, so they leave the picker while anything
--                     already tagged with the group itself is untouched
--
-- Taxonomy size {len(p['live'])} -> {len(p['live']) + n_ins}. Nothing is deleted, and
-- `Post-operative cervical fusion rehabilitation` — the one live term Andrew's list does not
-- carry — is deliberately left exactly where it is.
--
-- Order matters: children move out before their old parent is retired.""")
    W("")

    # --- preflight ------------------------------------------------------------
    touched = sorted({r["id"] for r in p["renames"]} | {m["id"] for m in p["moves"]}
                     | {s["id"] for s in p["sorts"]} | {r["id"] for r in p["retires"]}
                     | {i["parent"] for i in p["inserts"] if i["parent"]}
                     - {i["id"] for i in p["inserts"]})
    W("-- Every row this migration renames, moves, retires or hangs a new child from must be")
    W("-- present. A database that has drifted from the v2.0 seed fails here, loudly, instead of")
    W("-- half-applying and leaving the tree in a shape nobody has looked at.")
    W("DO $$")
    W("DECLARE missing int;")
    W("BEGIN")
    W("  SELECT count(*) INTO missing FROM (VALUES")
    W(",\n".join(f"    ({q(i)}::uuid)" for i in touched))
    W("  ) AS expected(id)")
    W("  WHERE NOT EXISTS (SELECT 1 FROM \"community\".\"tags\" t WHERE t.id = expected.id);")
    W("  IF missing > 0 THEN")
    W("    RAISE EXCEPTION 'clinical taxonomy has drifted from the v2.0 seed: % of "
      f"{len(touched)} expected tags are missing', missing;")
    W("  END IF;")
    W("END $$;--> statement-breakpoint")
    W("")

    # --- renames --------------------------------------------------------------
    W("-- 1. Spelling. Same tags, same ids — these names are visible to members.")
    for r in p["renames"]:
        W(f"UPDATE \"community\".\"tags\" SET \"name\" = {q(r['now'])} "
          f"WHERE \"id\" = {q(r['id'])};--> statement-breakpoint")
    W("")

    # --- inserts --------------------------------------------------------------
    W(f"-- 2. The {n_ins} new rows, parents first. Ids are uuid5 over the tag's path, so a term")
    W("-- lands on the same id in every environment — local and live have already drifted once.")
    W("INSERT INTO \"community\".\"tags\" (\"id\",\"name\",\"facet\",\"parent_id\",\"sort_order\") VALUES")
    vals = []
    for i in p["inserts"]:
        parent = f"{q(i['parent'])}" if i["parent"] else "NULL"
        vals.append(f"  ({q(i['id'])}, {q(i['name'])}, "
                    f"{q(i['facet'])}::\"community\".\"tag_facet\", {parent}, {i['order']})")
    W(",\n".join(vals) + ";--> statement-breakpoint")
    W("")

    # --- moves ----------------------------------------------------------------
    W(f"-- 3. The {n_mov} re-parentings. Each of these ids may already be on a post, in a")
    W("-- member's interests, or matched to an article — which is exactly why they move rather")
    W("-- than being inserted again.")
    for m in p["moves"]:
        W(f"UPDATE \"community\".\"tags\" SET \"parent_id\" = {q(m['parent'])}, "
          f"\"sort_order\" = {m['order']} WHERE \"id\" = {q(m['id'])};"
          f"--> statement-breakpoint")
    W("")

    # --- sort -----------------------------------------------------------------
    W(f"-- 4. Reading order, for the {len(p['sorts'])} tags that stayed put but shifted in the list.")
    for s in p["sorts"]:
        W(f"UPDATE \"community\".\"tags\" SET \"sort_order\" = {s['order']} "
          f"WHERE \"id\" = {q(s['id'])};--> statement-breakpoint")
    W("")

    # --- carry synonyms across the retirement ----------------------------------
    carried = [r for r in p["retires"] if r["synonyms"]]
    if carried:
        W(f"-- 5. Hand each retiring group's synonyms to the tag that replaces it. The classifier")
        W("-- walks `community.tags` without regard to `retired_at`, so a retired tag keeps")
        W("-- matching articles; leaving these behind would have a tag nobody can see collecting")
        W("-- the matches its visible replacement should be getting.")
        for r in carried:
            arr = ", ".join(q(x) for x in sorted(r["synonyms"]))
            W(f"-- {r['name']} -> {r['heir']['name']}")
            W(f"UPDATE \"community\".\"tags\" SET \"synonyms\" = ARRAY[{arr}] "
              f"WHERE \"id\" = {q(r['heir']['assigned'])};--> statement-breakpoint")
            W(f"UPDATE \"community\".\"tags\" SET \"synonyms\" = '{{}}' "
              f"WHERE \"id\" = {q(r['id'])};--> statement-breakpoint")
        W("")

    # --- retire ---------------------------------------------------------------
    W(f"-- 6. Retire the {n_ret} flattened groups, last, now that nothing hangs beneath them.")
    for r in p["retires"]:
        W(f"UPDATE \"community\".\"tags\" SET \"retired_at\" = now() "
          f"WHERE \"id\" = {q(r['id'])};--> statement-breakpoint")
    return "\n".join(L) + "\n"


def report(p):
    c = p["counts"]
    print("Part 1 load plan")
    print(f"  unchanged {c['same']}   insert {len(p['inserts'])}   move {len(p['moves'])}   "
          f"rename {len(p['renames'])}   reorder {len(p['sorts'])}   retire {len(p['retires'])}")
    print(f"  taxonomy {len(p['live'])} -> {len(p['live']) + len(p['inserts'])}")
    print(f"\n  renames ({len(p['renames'])}):")
    for r in p["renames"]:
        print(f"    {r['was']!r} -> {r['now']!r}")
    print(f"\n  retired flattened groups ({len(p['retires'])}):")
    for r in p["retires"]:
        print(f"    {r['path']}: {r['name']}")
    print(f"\n  kept — in the taxonomy, not in Andrew's list ({len(p['keeps'])}):")
    for k in p["keeps"]:
        print(f"    {k['path']}: {k['name']}")
    print(f"\n  dropped as an exact repeat within its own group ({len(p['dupes'])}):")
    for d in p["dupes"]:
        print(f"    {d['path']}: {d['name']}")


if __name__ == "__main__":
    # Imported here rather than at module scope: `synonyms.py` imports this module, and it owns
    # the reading of 0025 that the retire step needs to hand a group's synonyms to its heir.
    from synonyms import existing_synonyms
    p = plan(existing_synonyms())
    report(p)
    if "--write" in sys.argv:
        OUT.write_text(emit_sql(p))
        print(f"\nwrote {OUT.relative_to(ROOT)}")
