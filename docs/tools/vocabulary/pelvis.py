"""Reconstruct the pelvis region into the same Muscles / Ligaments / Conditions shape the
other five regions use, plus a Bones & landmarks branch the pelvis alone enumerates.

Every move is by explicit group index — no heuristics — because the source's own headings
are unreliable here (three are only introducers with no items, one is the tail of a wrapped
line, and 'Common associated conditions' is used six times for six different bones)."""
import re

# Parentheticals are qualifiers, not distinguishing names: "Coccygeus (ischiococcygeus)"
# and "Coccygeus" are the same muscle written twice, so they must dedupe to one term.
key = lambda s: re.sub(r"[^a-z0-9]+", " ", re.sub(r"\([^)]*\)", "", s).lower()).strip()

# The two ligaments the per-bone lists carry that the consolidated block D does not.
# Named explicitly rather than folded by group, because their parent groups mix ligaments
# belonging to different joints.
TERM_ROUTE = {
    "posterior sacroiliac ligament": "Sacroiliac / posterior pelvis",
    "iliac portion of the inguinal ligament": "Pubic / anterior pelvis",
}

# index -> (branch, group name).  M=Muscles L=Ligaments B=Bones & landmarks C=Conditions
# None = an introducer heading carrying no terms of its own.
PLAN = {
    0: ("M", "Abdominal / trunk"),      1: ("M", "Gluteal / deep hip"),
    2: ("M", "Iliopsoas / anterior hip"), 3: ("M", "Adductors / medial thigh"),
    4: ("M", "Hamstrings"),             5: ("M", "Pelvic floor"),
    6: ("M", "Perineal muscles"),
    7: ("B", "Ilium"),                  8: ("L", "+route"),
    9: ("C", "Ilium"),                 10: ("B", "Ischium"),
    11: ("L", "+route"), 12: ("C", "Ischium"),
    13: ("B", "Pubis"),                14: ("C", "Pubis"),
    15: ("B", "Acetabulum"),           16: ("C", "Acetabulum"),
    17: ("B", "Sacroiliac joint"),     18: ("C", "Sacroiliac joint"),
    19: ("B", "Sacrum"),               20: ("C", "Sacrum"),
    21: ("B", "Coccyx"),               22: ("C", "Coccyx"),
    # 24/25 dropped on Andrew's instruction 2026-08-24: "pelvic ring is the union of the bones
    # already detailed in the document. A fracture of the pelvic ring must therefore involve a
    # fracture of one of those or a joint injury and we have each joint in the document."
    23: (None, None),                  24: (None, None),
    25: (None, None),                  26: (None, None),
    27: ("B", "Inguinal region"),      28: ("C", "Inguinal region"),
    29: ("M", "Pelvic floor"),         30: ("C", "Pelvic floor"),
    31: (None, None),                  32: ("M", "Perineal muscles"),
    33: ("C", "Perineum"),             34: (None, None),
    35: ("L", "Sacroiliac / posterior pelvis"), 36: ("L", "Pubic / anterior pelvis"),
    37: ("L", "Hip / acetabulum"),     38: ("L", "Sacrum / coccyx"),
    39: ("L", "Pelvic floor / perineum"),
}
BRANCH = {"M": "Muscles", "L": "Ligaments", "B": "Bones & landmarks", "C": "Conditions"}
ORDER = ["M", "L", "B", "C"]

def rebuild(region):
    """region: the parsed pelvis dict. Returns (new_subs, notes)."""
    flat = [g for s in region["subs"] for g in s["groups"]] + \
           [{"name": "(loose)", "items": s["loose"]} for s in region["subs"] if s["loose"]]
    # Block D (the consolidated ligament list, indices 35-39) is canonical, so it is filled
    # before the earlier per-bone ligament groups are reconciled against it.
    order = [i for i in range(len(flat)) if not (PLAN.get(i, (None,))[0] == "L" and i < 35)] + [8, 11]
    buckets = {b: {} for b in ORDER}          # branch -> group name -> items
    merged = []
    for i in order:
        g = flat[i]
        if i not in PLAN:
            raise SystemExit(f"pelvis plan missing index {i}: {g['name']!r}")
        branch, name = PLAN[i]
        if branch is None:
            continue
        if name == "+route":
            present = {key(it["text"]) for grp in buckets[branch].values() for it in grp}
            added = []
            for it in g["items"]:
                k = key(it["text"])
                if k in present:
                    continue
                dest = TERM_ROUTE.get(k)
                if dest is None:
                    raise SystemExit(f"unrouted pelvis ligament {it['text']!r} (group {g['name']!r})")
                buckets[branch][dest].append(it)
                present.add(k)
                added.append(it["text"])
            merged.append((g["name"], "Ligaments (reconciled against the consolidated list)",
                           len(g["items"]) - len(added), added))
            continue
        bucket = buckets[branch].setdefault(name, [])
        seen = {key(it["text"]) for it in bucket}
        added = []
        for it in g["items"]:
            # Dedupe *within* the source group too: "Superior pubic ramus" and "Inferior pubic
            # ramus" are each listed twice under Pubis. Andrew 2026-08-24: the rami are aspects
            # of the pubic bone, so one entry each covers it.
            if key(it["text"]) in seen:
                continue
            seen.add(key(it["text"]))
            added.append(it)
        dupes = len(g["items"]) - len(added)
        if bucket and dupes:
            merged.append((g["name"], BRANCH[branch] + " → " + name, dupes, [a["text"] for a in added]))
        bucket.extend(added)
    subs = []
    for b in ORDER:
        if not buckets[b]:
            continue
        subs.append({"name": BRANCH[b], "loose": [],
                     "groups": [{"name": n, "items": its} for n, its in buckets[b].items()]})
    return subs, merged
