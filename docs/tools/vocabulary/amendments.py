"""Andrew's review of the ligament groupings, 2026-08-24.

He confirmed the joint segmentation in all five regions and asked only for restated blocks to
go, plus a handful of renames and two content corrections. Each instruction is recorded here
verbatim in `WHY` so the document can be traced back to what he actually said.

Three terms he asked to delete appear **nowhere else in the document**, so they are rescued into
the surviving block and marked, rather than dropped silently — they are back with him.
"""

RESCUE_NOTE = "retained — appears nowhere else, awaiting Andrew"

WHY = {
    "cervical-rename": "amend from 'sub axial cervical spine'",
    "cervical-dissolve": ("Other upper cervical stabilisers — ligamentum nuchae can belong in "
                          "cervical spine; atlantoaxial and atlantooccipital can go in their "
                          "respective headings"),
    "ul-scapular": "'scapular ligaments' section can be removed",
    "ul-forearm": ("'Forearm' — keep this in (anatomically needs to be here for the "
                   "differentiation; these injuries are very rare)"),
    "ul-cmc": "carpometacarpal joints listed twice? — this section only needs to be in once",
    "ul-ipj": ("proximal and distal interphalangeal joints should both have 1) radial collateral "
               "ligament 2) ulnar collateral ligament 3) palmar ligament — these can replace the "
               "current three listed in each of these sections"),
    "thoracic": "the two headings here are perfect",
    "lumbar": "two headings 1) lumbar 2) lumbosacral: the restated list can be removed",
    "ll-hip": "hip joint restated section can be removed",
    "ll-iom": "interosseous membrane needs to remain",
    "ll-deltoid": ("the superficial layer is listed differently — this can be bullet-pointed and "
                   "placed above the deep layer"),
    "ll-ankle": "ankle restated collaterals can be removed",
    "ll-calc": "calcaneocuboid restated can be removed",
    "ll-plantar": "plantar structures restated can be removed",
    "rescued-terms": ("yes these can be removed — the ligaments are detailed as lateral or medial "
                      "in the document already"),
    "pelvic-ring": ("pelvic ring is the union of the bones already detailed in the document. A "
                    "fracture of the pelvic ring must therefore involve a fracture of one of those "
                    "or a joint injury and we have each joint in the document"),
    "finger-joints": ("finger joints comprise of the proximal and distal interphalangeal joints — "
                      "the ligaments mentioned in 'finger joints' are therefore already listed"),
    "pubic-rami": ("these are aspects of the pubic bone, so as long as we have the pubic bone in "
                   "there and its conditions we are covered comprehensively"),
}

# Blocks to delete outright. Every term in these survives elsewhere, except where `RESCUE` names it.
DROP = {
    ("Cervical spine", "Other upper cervical stabilisers"),
    ("Upper limb", "Scapular ligaments — restated"),
    ("Upper limb", "Carpometacarpal joints — restated"),
    ("Lumbar spine", "Restated — a second pass over the segmental list"),
    ("Lower limb", "Hip joint — restated"),
    ("Lower limb", "Ankle — restated collaterals"),
    ("Lower limb", "Calcaneocuboid — restated"),
    ("Lower limb", "Plantar structures — restated"),
    ("Upper limb", "Finger joints — restated collaterals"),
}

RENAME = {
    ("Cervical spine", "Sub-axial cervical spine"): "Cervical spine",
    ("Upper limb", "Forearm — restated, with interosseous detail"): "Forearm",
}

# Nothing is rescued any more. The three terms held back on 2026-08-24 — Intermetacarpal,
# Intermetatarsal and Interosseous ligaments — were put to Andrew, who confirmed they go:
# "yes these can be removed — the ligaments are detailed as lateral or medial in the document
# already". They now leave with the blocks he asked to delete.
RESCUE = {}

# Terms moved out of a dropped block to the block Andrew named for them.
MOVE = {
    ("Cervical spine", "Atlantoaxial capsular ligaments"): "Atlantoaxial ligaments",
    ("Cervical spine", "Atlanto-occipital capsular ligaments"): "Atlanto-occipital ligaments",
    # Ligamentum nuchae is already in the cervical spine block, so dissolving its old home
    # simply resolves the duplicate — nothing to move.
}

# Whole-block content replacements Andrew dictated.
REPLACE = {
    ("Upper limb", "Proximal interphalangeal joints"):
        ["Radial collateral ligament", "Ulnar collateral ligament", "Palmar ligament"],
    ("Upper limb", "Distal interphalangeal joints"):
        ["Radial collateral ligament", "Ulnar collateral ligament", "Palmar ligament"],
}

# The deltoid layers were run-on lines, one of them wrapped mid-phrase. Same ligaments, as a list.
EXPAND = {
    ("Lower limb", "Deltoid/medial collateral ligament:"): [
        ("Superficial layer", ["Tibionavicular ligament", "Superficial tibiocalcaneal ligament",
                               "Posterior tibiotalar ligament"]),
        ("Deep layer", ["Deep tibiotalar ligament", "Anterior tibiotalar ligament"]),
        (None, ["Anterior talocrural capsule", "Posterior talocrural capsule"]),
    ],
}

# Every block has now been reviewed. Andrew on the finger restatement, 2026-08-24: "finger joints
# comprise of the proximal and distal interphalangeal joints — the ligaments mentioned in 'finger
# joints' are therefore already listed in our document."
STILL_PROPOSED = set()


def apply(region, blocks):
    """Applies Andrew's amendments to one region's ligament blocks."""
    by_name = {b["name"]: b for b in blocks}
    rescued, moved = [], []

    for b in blocks:
        for term, dest in list(RESCUE.items()) + list(MOVE.items()):
            if term[0] != region:
                continue
            hit = [it for it in b["items"] if it["text"] == term[1]]
            if hit and (region, b["name"]) in DROP:
                (rescued if (term in RESCUE) else moved).append((hit[0], dest, term in RESCUE))

    out = []
    for b in blocks:
        if (region, b["name"]) in DROP:
            continue
        key = (region, b["name"])
        if key in REPLACE:
            b["items"] = [{"text": t, "depth": 0, "page": b["items"][0]["page"]} for t in REPLACE[key]]
            b["andrew"] = True
        if key in EXPAND:
            page = b["items"][0]["page"]
            items = []
            for label, terms in EXPAND[key]:
                if label:
                    items.append({"text": label, "depth": 0, "page": page})
                items.extend({"text": t, "depth": 1 if label else 0, "page": page} for t in terms)
            b["items"] = items
            b["andrew"] = True
        for item, dest, is_rescue in rescued + moved:
            if dest == b["name"]:
                if is_rescue:
                    item = dict(item, note=RESCUE_NOTE)
                b["items"].append(item)
        b["name"] = RENAME.get(key, b["name"])
        b["confirmed"] = (region, b["name"]) not in STILL_PROPOSED
        out.append(b)
    return out
