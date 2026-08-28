"""Fourth level in Part 1: groups that are parents of other groups.

The source marks these only by leaving the parent heading empty — every heading sits at the
same size, weight and indent, so nothing else distinguishes 'Hyoid Muscles' (a parent of
Suprahyoid and Infrahyoid) from 'Scalenes' (a list of muscles). Each parent's children are
the runs that follow it, named for compartments, layers or structures that only make sense
underneath it.

Keyed by index into the branch's group list, in source order, so the plan is reviewable
against the document rather than guessed at run time.
"""

# (region, branch) -> {parent index: [child indices]}
NEST = {
    ("Cervical spine", "Muscles"):  {1: [2, 3]},
    ("Upper limb", "Muscles"):      {3: [4, 5, 6], 7: [8, 9], 10: [11, 12, 13]},
    ("Lower limb", "Muscles"):      {1: [2, 3, 4], 7: [8, 9], 10: [11, 12, 13, 14, 15]},
    ("Upper limb", "Conditions"):   {0: [1, 2, 3, 4, 5, 6, 7], 8: [9], 11: [12]},
    ("Lower limb", "Conditions"):   {3: [4, 5, 6, 7, 8, 9, 10], 11: [12]},
}

def apply(region, branch, groups):
    """Returns groups re-nested, or the original list unchanged."""
    plan = NEST.get((region, branch))
    if not plan:
        return groups
    child_of = {c: p for p, cs in plan.items() for c in cs}
    if max(list(plan) + list(child_of)) >= len(groups):
        raise SystemExit(f"nesting plan for {region}/{branch} overruns {len(groups)} groups")
    out = []
    for i, g in enumerate(groups):
        if i in child_of:
            continue
        g["children"] = [groups[c] for c in plan.get(i, [])]
        out.append(g)
    return out
