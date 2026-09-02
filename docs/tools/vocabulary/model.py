"""The Part 1 tree, built once and shared.

`build.py` renders this as a document; `taxonomy.py` turns it into a tag-taxonomy load. Both
need *the same* tree — the one that has been through `nesting.py`, `ligaments.py`,
`amendments.py` and `pelvis.py` — so it is assembled here rather than in either of them.

    from model import part1
    regions, pelvis_merges, ligament_blocks = part1()

Shape: `region → sub (branch) → group → item`, where a group may carry `children` (groups the
source marks only by leaving the parent heading empty) and an item carries its own bullet
`depth` within the group.
"""
import collections, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from extract import build_model
from pelvis import rebuild as rebuild_pelvis
from ligaments import apply as apply_ligaments
from nesting import apply as apply_nesting
import amendments


def part1(b=None):
    b = b or build_model()
    regions = []
    ordered = collections.defaultdict(list)
    reg = sub = grp = None
    for x in b["part1"]:
        if x["t"] == "region":
            reg = {"name": x["text"], "subs": []}; regions.append(reg); sub = grp = None
        elif x["t"] == "sub":
            sub = {"name": x["text"], "groups": [], "loose": []}; reg["subs"].append(sub); grp = None
        elif x["t"] == "group":
            grp = {"name": x["text"], "items": []}; sub["groups"].append(grp)
        elif x["t"] == "item" and sub is not None:
            (grp["items"] if grp else sub["loose"]).append(x)
            ordered[(reg["name"], sub["name"])].append(x)

    for _r in regions:
        for _s in _r["subs"]:
            _s["groups"] = [g for g in _s["groups"] if "msk conditions" not in g["name"].lower()]

    for _r in regions:
        for _s in _r["subs"]:
            _s["groups"] = apply_nesting(_r["name"], _s["name"], _s["groups"])

    ligament_blocks = 0
    for _r in regions:
        for _s in _r["subs"]:
            if _s["name"] != "Ligaments":
                continue
            _blocks = apply_ligaments(_r["name"], ordered[(_r["name"], _s["name"])])
            if not _blocks:
                continue
            _blocks = amendments.apply(_r["name"], _blocks)
            _s["groups"] = [{"name": bk["name"], "items": bk["items"], "src": bk["src"],
                             "confirmed": bk.get("confirmed", False), "andrew": bk.get("andrew", False)}
                            for bk in _blocks]
            _s["loose"] = []
            _s["proposed"] = sum(1 for bk in _blocks if not bk.get("confirmed"))
            ligament_blocks += len(_blocks)

    pelvis_merges = []
    for _r in regions:
        if _r["name"].startswith("Pelvis"):
            _r["subs"], pelvis_merges = rebuild_pelvis(_r)

    return regions, pelvis_merges, ligament_blocks


def walk(groups):
    """Yield every group in the tree, parents included."""
    for g in groups:
        yield g
        yield from walk(g.get("children", []))
