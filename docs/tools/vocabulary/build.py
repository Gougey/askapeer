"""Builds `docs/body-part-condition-and-synonym-list.md` from the source PDF.

    python3 docs/tools/vocabulary/build.py

The document is a faithful re-formatting: every term in the PDF reaches the output, and
nothing is invented, reworded or removed. What the three companion modules add is *structure
the source implies but never styles* — `pelvis.py` reconciles a region drafted twice,
`ligaments.py` proposes the joint boundaries inside the flat ligament runs, and `nesting.py`
restores parent groups that the source marks only by leaving the heading empty. Each carries
its own reasoning and an explicit, reviewable plan; edit those when Andrew sends corrections.

Prose that is not derived from the source lives in `appendix.md` and `grading.md`.
"""
import json, re, os, sys, collections
from pathlib import Path

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
from extract import build_model
from pelvis import rebuild as rebuild_pelvis
from ligaments import apply as apply_ligaments
from nesting import apply as apply_nesting

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "docs" / "body-part-condition-and-synonym-list.md"
b = build_model()
esc = lambda s: s.replace("|", "\\|")
dash = lambda s: re.sub(r"\s*—\s*", " — ", s)
key = lambda s: re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

# ---------------------------------------------------------------- part 1 model
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

LIGAMENT_BLOCKS = 0
for _r in regions:
    for _s in _r["subs"]:
        if _s["name"] != "Ligaments":
            continue
        _blocks = apply_ligaments(_r["name"], ordered[(_r["name"], _s["name"])])
        if not _blocks:
            continue
        _s["groups"] = [{"name": bk["name"], "items": bk["items"], "src": bk["src"]} for bk in _blocks]
        _s["loose"] = []
        _s["proposed"] = sum(1 for bk in _blocks if not bk["src"])
        LIGAMENT_BLOCKS += len(_blocks)

PELVIS_MERGES = []
for _r in regions:
    if _r["name"].startswith("Pelvis"):
        _r["subs"], PELVIS_MERGES = rebuild_pelvis(_r)

def walk(groups):
    """Yield every group in the tree, parents included."""
    for g in groups:
        yield g
        yield from walk(g.get("children", []))

def stats(sub):
    all_groups = list(walk(sub["groups"]))
    names = [key(i["text"]) for g in all_groups for i in g["items"]] + [key(i["text"]) for i in sub["loose"]]
    # Uniqueness is *sibling-scoped* (tags_parent_name_unique), so only repeats under the
    # SAME parent are collisions — the same ligament under two different joints is legal.
    dupes = sum(c - 1
                for bucket in [[key(i["text"]) for i in g["items"]] for g in all_groups]
                             + [[key(i["text"]) for i in sub["loose"]]]
                for c in collections.Counter(bucket).values() if c > 1)
    # Sibling names only clash within the same parent, so each level is counted separately.
    sibling_sets = [[key(g["name"]) for g in sub["groups"]]] + \
                   [[key(c["name"]) for c in g.get("children", [])] for g in all_groups]
    gdupes = sum(c - 1 for names_ in sibling_sets
                 for c in collections.Counter(names_).values() if c > 1)
    return dict(terms=len(names), groups=len(all_groups), loose=len(sub["loose"]),
                dupes=dupes, gdupes=gdupes)

def verdict(s, proposed=0):
    """Flag for the summary line — this is what makes weak structure visible when collapsed."""
    bad = []
    if s["groups"] == 0 and s["terms"]:
        bad.append("no sub-grouping")
    elif s["loose"]:
        bad.append(f"{s['loose']} loose")
    def plural(n, w):
        if n == 1:
            return f"{n} {w}"
        return f"{n} " + (w[:-1] + "ies" if w.endswith("y") else w + "s")
    if s["dupes"]: bad.append(plural(s["dupes"], "duplicate term name"))
    if s["gdupes"]: bad.append(plural(s["gdupes"], "duplicate group name"))
    prop = f"◇ proposed grouping — {plural(proposed, 'boundary')} to confirm" if proposed else ""
    if bad and prop:
        return prop + " · ⚠ " + " · ".join(bad)
    if bad:
        return "⚠ " + " · ".join(bad)
    return prop or "✓ structured"

out = []
W = out.append

W("# Body parts, conditions and synonyms")
W("")
W("""<style>
details.tree { border-left: 2px solid var(--border, #ddd); margin: .35rem 0 .35rem .1rem; padding-left: .9rem; }
details.tree > summary { cursor: pointer; padding: .18rem 0; list-style-position: outside; }
details.tree > summary::marker { color: var(--muted, #888); }
details.tree[open] > summary { font-weight: 600; }
details.tree .count { color: var(--muted, #777); font-weight: 400; font-size: .88em; }
details.tree .ok { color: var(--muted, #777); font-weight: 400; font-size: .82em; }
details.tree .warn { color: #b3541e; font-weight: 600; font-size: .82em; }
@media (prefers-color-scheme: dark) { details.tree .warn { color: #ff9f5a; } }
details.lvl1 > summary { font-size: 1.12em; }
.treebar { margin: 1rem 0; display: flex; gap: .5rem; }
.treebar button { font: inherit; font-size: .85em; padding: .3rem .7rem; cursor: pointer;
  border: 1px solid var(--border, #ccc); background: var(--card-bg, #fff); color: inherit; border-radius: 6px; }
</style>""")
W("")
W("**Source:** `docs/Body Part, Conditions, and Synonym List.pdf` — supplied by Andrew Renshaw, "
  "August 2026. **This file is a faithful re-formatting of that PDF**, extracted programmatically "
  "rather than retyped. Nothing has been added, removed or clinically re-worded. Every section is "
  "collapsed by default so the shape is readable at a glance — click any heading to open it.")
W("")
W("> **Status: reference material, not yet a decision.** Nothing here has been mapped to the live "
  "tag taxonomy or loaded into the database.")
W("")
W("""<div class="treebar">
<button type="button" onclick="document.querySelectorAll('details.tree').forEach(d=>d.open=true)">Expand all</button>
<button type="button" onclick="document.querySelectorAll('details.tree').forEach(d=>d.open=false)">Collapse all</button>
</div>""")
W("")

# ---------------------------------------------------------------- structure health
W("## Structure health")
W("")
W("Every branch of Part 1, worst first. **The flag is about the *shape* of the list, not the "
  "clinical content** — a branch is only as loadable as its weakest column here, because the "
  "taxonomy requires each term to sit under a named parent and forbids two siblings sharing a "
  "name.")
W("")
W("| Branch | Terms | Groups | Loose terms | Duplicate names | |")
W("|---|---:|---:|---:|---:|---|")
rank = []
for r in regions:
    for s in r["subs"]:
        st = stats(s)
        st["proposed"] = s.get("proposed", 0)
        severity = st["dupes"] * 2 + st["gdupes"] * 2 + st["loose"] + (2 if st["proposed"] else 0)
        rank.append((severity, r["name"], s["name"], st))
for sev, rn, sn, st in sorted(rank, key=lambda t: -t[0]):
    v = verdict(st, st.get("proposed", 0))
    cell = v.replace("⚠", "**⚠**") if ("⚠" in v or "◇" in v) else "✓"
    W(f"| {rn} → {sn} | {st['terms']} | {st['groups']} | {st['loose']} | {st['dupes'] + st['gdupes']} | {cell} |")
W("")
W("Read that as three tiers:")
W("")
W("- **Muscles and conditions** — every term sits in a named group and nothing clashes under the "
  "same parent. These match the live taxonomy leaf for leaf and need no further input. Nine of "
  "these groups are **parents of other groups**, which the source marks only by leaving the "
  "parent heading empty: *Hyoid Muscles* over Suprahyoid and Infrahyoid, the two forearm "
  "compartments over their Superficial/Intermediate/Deep layers, *Hand* over Thenar, "
  "Hypothenar and Central, *Thigh*, *Leg (Posterior)*, *Foot*, and — in the conditions lists "
  "— *Shoulder* and *Knee* over their per-structure categories. Restoring that level is what "
  "clears the last of the duplicate group names: *Superficial* and *Deep* stop colliding once "
  "each sits under its own compartment, and the two *Nerve* groups separate under Elbow and "
  "Wrist.")
W("- **Ligaments have a proposed grouping.** The source lists most of them as one flat run — the "
  "upper limb is 140 terms with no headings at all — and 72 names repeat inside those runs. That "
  "is not disorder: the source walks each region joint by joint and restates a shared ligament "
  "when it moves on, so the repeats *are* the boundaries. Cutting the runs at those points gives "
  f"{LIGAMENT_BLOCKS} joint blocks and drops the name clashes from **72 to 1** — the survivor "
  "being a genuine nesting case, not a duplicate. The blocks are proposals and every boundary "
  "needs Andrew's eye, but he should be confirming a structure rather than inventing one.")
W("- **The pelvis has been reconstructed** and now matches the others. The source drafts that "
  "region *twice* — once bone by bone, once consolidated by structure type — and both drafts "
  "were left in the file, which is what produced the 40 groups, the six *Common associated "
  "conditions* headings and the apparent duplication. Reconciling the two drafts yields four "
  "clean branches; see the note on the region itself for every move made.")
W("")

# ---------------------------------------------------------------- part 1
W("---")
W("")
W("## Part 1 — Anatomy and conditions by region")
W("")
for r in regions:
    tot = sum(stats(s)["terms"] for s in r["subs"])
    W(f'<details class="tree lvl1">')
    W(f'<summary>{r["name"]} <span class="count">— {tot} terms, {len(r["subs"])} branches</span></summary>')
    W("")
    if r["name"].startswith("Pelvis"):
        W("> **Reconstructed — the only region where the running order has been changed.** The "
          "source drafts the pelvis twice: once bone by bone (Ilium, Ischium, Pubis, Acetabulum, "
          "SI joint, Sacrum, Coccyx, Pelvic ring, Inguinal region — each with its own landmarks, "
          "ligaments and conditions), and again consolidated by structure type at the end. Both "
          "drafts survived into the file. The two have been reconciled here into the same "
          "**Muscles / Ligaments / Conditions** shape the other regions use, plus a **Bones & "
          "landmarks** branch that only the pelvis enumerates. Six headings all reading *Common "
          "associated conditions* are renamed for the bone they describe; three headings that "
          "carried no terms of their own, and one that was only the tail of a wrapped line, are "
          "dropped as the introducers they were. **No term has been invented, reworded or "
          "removed** — only re-parented. What the two drafts disagreed on:")
        W("")
        for src, dest, dupes, added in PELVIS_MERGES:
            new = ("adds " + ", ".join(f"**{a}**" for a in added)) if added else "adds nothing new"
            W(f"> - *{src}* → {dest}: {dupes} terms already present, {new}.")
        W("")
    for s in r["subs"]:
        st = stats(s); v = verdict(st, s.get("proposed", 0))
        cls = "warn" if v.startswith("⚠") else "ok"
        W(f'<details class="tree">')
        W(f'<summary>{s["name"]} <span class="count">— {st["terms"]} terms, {st["groups"]} groups</span> '
          f'<span class="{cls}">{v}</span></summary>')
        W("")
        if s["loose"]:
            W(f'<p class="count">{len(s["loose"])} terms below sit directly under this branch with no '
              f'group heading in the source.</p>')
            W("")
            for it in s["loose"]:
                W(f"{'  ' * it['depth']}- {dash(it['text'])}")
            W("")
        if s.get("proposed"):
            W("> **Proposed grouping — headings inserted, nothing else touched.** The source lists "
              "these as one flat run, but it walks the region joint by joint and restates a shared "
              "ligament whenever it moves on, which is what marks each boundary. Every block below "
              "is a **contiguous slice of the original order** — no term has been moved, reordered, "
              "reworded or removed. The pattern is Andrew's own: the cervical spine is the one "
              "region where he wrote these headings himself, and blocks carrying his wording are "
              "marked *(Andrew's heading)*. **Every unmarked boundary needs his confirmation.**")
            W("")
        def render_group(g):
            mark = ' <span class="ok">(Andrew\'s heading)</span>' if g.get("src") else ""
            kids = g.get("children", [])
            n = len(g["items"]) + sum(len(k["items"]) for k in kids)
            sub_note = f", {len(kids)} sub-groups" if kids else ""
            W(f'<details class="tree">')
            W(f'<summary>{dash(g["name"])}{mark} <span class="count">— {n}{sub_note}</span></summary>')
            W("")
            for it in g["items"]:
                W(f"{'  ' * it['depth']}- {dash(it['text'])}")
            W("")
            for k in kids:
                render_group(k)
            W("</details>")

        for g in s["groups"]:
            render_group(g)
        W("</details>")
    W("</details>")
W("")

# ---------------------------------------------------------------- part 2
W("---")
W("")
W("## Part 2 — Synonyms")
W("")
W("Each table maps one **preferred term** to the alternatives that should resolve to it.")
W("")
for t in b["part2"]:
    if t["heading"] == "Grading":
        continue
    n = len(t["rows"]); syn = sum(len(r["synonyms"]) for r in t["rows"])
    W(f'<details class="tree lvl1">')
    W(f'<summary>{t["heading"]} <span class="count">— {n} terms, {syn} synonyms</span></summary>')
    W("")
    W("| Preferred term | Synonyms / alternative terms |")
    W("|---|---|")
    for r in t["rows"]:
        W(f"| {esc(r['preferred']) or '—'} | {esc('; '.join(r['synonyms'])) if r['synonyms'] else '—'} |")
    W("")
    W("</details>")
W("")
W(open(f"{D}/grading.md").read().replace("### Injury grading scales", "### Injury grading scales", 1))
W("")

# ---------------------------------------------------------------- part 3
W("---")
W("")
W("## Part 3 — Assessment, treatment and equipment vocabulary")
W("")
W("Fifteen numbered sections. Entries written `Name — Abbreviation` in the source have the "
  "abbreviation split into its own column.")
W("")

sections, cur_sec, cur_grp = [], None, None
for x in b["part3"]:
    if x["t"] == "section":
        cur_sec = {"name": x["text"], "groups": []}; sections.append(cur_sec); cur_grp = None
    elif x["t"] in ("group", "sub"):
        cur_grp = {"name": x["text"], "items": []}; cur_sec["groups"].append(cur_grp)
    elif x["t"] == "item" and cur_sec is not None:
        if cur_grp is None:
            cur_grp = {"name": "(ungrouped)", "items": []}; cur_sec["groups"].append(cur_grp)
        cur_grp["items"].append(x["text"])

for sec in sections:
    n = sum(len(g["items"]) for g in sec["groups"])
    W(f'<details class="tree lvl1">')
    W(f'<summary>{dash(sec["name"])} <span class="count">— {n} terms, {len(sec["groups"])} groups</span></summary>')
    W("")
    for g in sec["groups"]:
        W(f'<details class="tree">')
        W(f'<summary>{dash(g["name"])} <span class="count">— {len(g["items"])}</span></summary>')
        W("")
        W("| Term | Abbreviation / alternative |")
        W("|---|---|")
        for it in g["items"]:
            parts = re.split(r"\s*—\s*", it, maxsplit=1)
            W(f"| {esc(parts[0].strip())} | {esc(parts[1].strip()) if len(parts) > 1 else '—'} |")
        W("")
        W("</details>")
    W("</details>")
W("")
W(open(f"{D}/appendix.md").read())

OUT.write_text("\n".join(out) + "\n")
print(f"wrote {OUT.relative_to(ROOT)} — {len(out)} lines")
