"""Reads the source PDF into a structural model: headings with their level, terms with their
bullet depth, and the Part 2 synonym tables as real table cells.

Heading level comes from font size, bullet depth from the text x-indent — the source carries
no numbering or outline levels, so those are the only signals available.

Run directly to dump the model as JSON; `build.py` imports `build_model` instead.
"""
import fitz, pdfplumber, json, re, os, collections
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / "docs" / "Body Part, Conditions, and Synonym List.pdf"


doc = fitz.open(SRC)
def norm(s): return re.sub(r"\s+", " ", s.replace(" ", " ")).strip()


def build_model(src=SRC):
  doc = fitz.open(src)
  rows = []
  for pno in range(len(doc)):
      for b in doc[pno].get_text("dict")["blocks"]:
          for l in b.get("lines", []):
              t = norm("".join(s["text"] for s in l["spans"]))
              if not t or t == "•": continue
              s = l["spans"][0]
              rows.append(dict(page=pno+1, text=t, size=round(s["size"],1),
                               bold="Bold" in s["font"], x0=round(l["bbox"][0]), y=round(l["bbox"][1])))

  REGION_MARK = re.compile(r"^(Cervical Spine|Upper Limb|Thoracic Spine|Lumbar Spine|Lower Limb|Muscles acting across)")

  def kind(r):
      if not r["bold"]: return None
      if r["size"] >= 23: return "section"
      if r["size"] >= 17: return "tablehead"
      if r["size"] >= 15: return "part"
      if r["size"] >= 13: return "group"
      if r["size"] >= 11:
          return "region" if (r["x0"] >= 110 and REGION_MARK.match(r["text"])) else "subgroup"
      return None

  syn_i = next(i for i,r in enumerate(rows) if r["text"] == "Synonyms" and kind(r) == "part")
  p3_i  = next(i for i,r in enumerate(rows) if r["text"].startswith("1. Assessment") and kind(r) == "section")

  REGION_NAMES = {"Cervical Spine (Neck) muscles:": "Cervical spine",
                  "Upper Limb muscles": "Upper limb",
                  "Thoracic Spine muscles": "Thoracic spine",
                  "Lumbar Spine muscles": "Lumbar spine",
                  "Lower Limb muscles": "Lower limb",
                  "Muscles acting across the pelvis/bones/joints etc:": "Pelvis, hip and pelvic floor"}

  LIG_HEAD = re.compile(r"^(cervical|upper limb|thoracic|lumbar|lower limb)\b.*\bligaments?\b:?$", re.I)

  def subsection_for(text):
      """Only a *region-prefixed* ligament heading starts the ligaments subsection — a bare
      'Ligaments' is a grouping inside the conditions list (e.g. knee ligament injuries)."""
      t = text.lower()
      if "msk conditions" in t: return "Conditions"
      if LIG_HEAD.match(text): return "Ligaments"
      return None

  # ---------------- part 1 ----------------
  p1, cur_region, cur_sub = [], None, None
  for r in rows[:syn_i]:
      k = kind(r)
      if k == "part": continue
      if k == "region":
          cur_region = REGION_NAMES.get(r["text"], r["text"])
          cur_sub = "Muscles"
          p1.append(dict(t="region", text=cur_region, page=r["page"]))
          p1.append(dict(t="sub", text="Muscles", page=r["page"]))
          continue
      if k in ("group", "subgroup"):
          sub = None if cur_region == "Pelvis, hip and pelvic floor" else subsection_for(r["text"])
          if sub and sub != cur_sub:
              cur_sub = sub
              p1.append(dict(t="sub", text=sub, page=r["page"]))
              if sub == "Ligaments" and re.match(r"^(cervical|upper limb|thoracic|lumbar|lower limb)", r["text"], re.I):
                  continue          # the heading *is* the subsection title
          p1.append(dict(t="group", text=r["text"], page=r["page"], lvl=k))
          continue
      depth = 0 if r["x0"] < 130 else 1 if r["x0"] < 165 else 2
      p1.append(dict(t="item", text=r["text"], depth=depth, page=r["page"]))

  # ---------------- part 3 ----------------
  p3 = []
  for r in rows[p3_i:]:
      k = kind(r)
      if k == "section":   p3.append(dict(t="section", text=r["text"], page=r["page"]))
      elif k == "tablehead": p3.append(dict(t="group", text=r["text"], page=r["page"]))
      elif k in ("group", "subgroup"): p3.append(dict(t="sub", text=r["text"], page=r["page"]))
      else:
          depth = 0 if r["x0"] < 130 else 1
          p3.append(dict(t="item", text=r["text"], depth=depth, page=r["page"]))

  # ---------------- part 2 ----------------
  pdf = pdfplumber.open(src)
  seen, tables = set(), []
  for pno in range(43, 55):
      for t in pdf.pages[pno].extract_tables():
          key = tuple(tuple(norm(c or "") for c in row) for row in t)
          if key in seen: continue
          seen.add(key)
          rr = []
          for cells in key[1:]:
              pref = cells[0]
              syns = [s.strip() for s in re.split(r"[;\n]", cells[1] if len(cells) > 1 else "") if s.strip()]
              if pref or syns: rr.append(dict(preferred=pref, synonyms=syns))
          tables.append(dict(page=pno+1, rows=rr))

  heads = []
  for r in rows[syn_i:p3_i]:
      if kind(r) == "tablehead":
          if heads and not re.match(r"^([A-Z]\.\s|UK |British |Types )", r["text"]) and len(r["text"]) > 2:
              heads[-1]["text"] += " " + r["text"]
          else:
              heads.append(dict(text=r["text"], page=r["page"]))
  lettered = [h for h in heads if re.match(r"^[A-Z]\.\s", h["text"])]


  return dict(part1=p1,
              part2=[dict(heading=(lettered[i]["text"] if i < len(lettered) else "Grading"), **t)
                     for i, t in enumerate(tables)],
              part3=p3, headings=heads)


if __name__ == "__main__":
    m = build_model()
    out = Path(__file__).with_name("model.json")
    json.dump(m, open(out, "w"), indent=1)
    p1 = m["part1"]
    print("regions:", [x["text"] for x in p1 if x["t"] == "region"])
    print("part 1 groups:", sum(1 for x in p1 if x["t"] == "group"),
          "terms:", sum(1 for x in p1 if x["t"] == "item"))
    print("part 2 tables:", len(m["part2"]), "rows:", sum(len(t["rows"]) for t in m["part2"]))
    print("part 3 terms:", sum(1 for x in m["part3"] if x["t"] == "item"))
    print("wrote", out)
