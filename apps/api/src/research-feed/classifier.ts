/**
 * Rule-based classification of an article against the clinical taxonomy (EPIC-I; the
 * architecture spec's "Classification (MVP)").
 *
 * Ported from the working prototype, which earned every rule here the hard way. No vector
 * embeddings: pgvector is a documented upgrade path if this proves too noisy at scale, but
 * building it now would be speculative when the simple approach demonstrably works.
 *
 * **MeSH is not used yet.** `community.tags.mesh_id` exists and EPIC-I §5 calls it the
 * mechanism by which interests match indexed articles — but it is populated on 0 of 588
 * tags, so text matching is what there is. MeSH is the precision upgrade, not the starting
 * point.
 */

/** Words carrying no topical signal, which would otherwise widen every proximity window. */
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'of', 'the', 'in', 'on', 'to', 'for', 'with', 'or', 'at', 'by',
  'from', 'into', 'other', 'others', 'related', 'disorders', 'disorder', 'syndrome',
  'conditions', 'condition', 'joint', 'region', 'unspecified',
]);

/**
 * Crude suffix stemming — enough to bridge "tendinopathies"/"tendinopathy" and
 * "injuries"/"injury" without dragging in a stemmer dependency. Porter would be more
 * correct and is not worth it for matching two-to-four word clinical phrases.
 */
function stem(word: string): string {
  if (word.length <= 4) return word;
  for (const [suffix, replacement] of [
    ['ies', 'y'],
    ['ses', 's'],
    ['es', ''],
    ['s', ''],
  ] as const) {
    if (word.endsWith(suffix)) return word.slice(0, -suffix.length) + replacement;
  }
  return word;
}

export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(stem);
}

function significantWords(tagName: string): string[] {
  return tagName
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .map(stem);
}

/**
 * The name forms a tag can be recognised by.
 *
 * **A parenthetical is sometimes a gloss and sometimes a disambiguator, and the difference
 * decides whether it can be dropped.** 47 of the 588 tags carry one. Because every word of
 * a name had to appear, *Femoroacetabular impingement (FAI)* demanded the literal token
 * "fai", so a paper titled "…a patient decision aid for Femoroacetabular Impingement
 * Syndrome" matched nothing. Dropping the parenthetical fixes that.
 *
 * But dropping it indiscriminately is worse than the bug. *Rotatores (cervical)*,
 * *(thoracic)* and *(lumbar)* are three different muscles distinguished only by that
 * parenthetical — exactly the sibling-collision pattern that also produced *Nerve (elbow)*
 * and *Nerve (wrist)*. Reduced to bare "Rotatores" all three collapse into one term which,
 * thanks to the stemmer, matches "rotator" and fired on all 92 rotator-cuff papers in the
 * corpus.
 *
 * The taxonomy itself says which is which: **if more than one tag shares a base name, the
 * parenthetical is carrying the meaning and must stay.** An abbreviation still gets its own
 * variant either way — "(FAI)" is a name this literature uses, while "(upper fibres)" would
 * match half the corpus alone.
 */
function nameVariants(tagName: string, ambiguousBases: Set<string>): string[] {
  const parentheticals = [...tagName.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].trim());
  const base = tagName.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const abbreviations = parentheticals.filter((p) => /^[A-Z]{2,6}$/.test(p));
  // Keep the full name when the base alone would be ambiguous; otherwise prefer the base,
  // which is the form real text actually uses.
  const primary = !base || ambiguousBases.has(base.toLowerCase()) ? tagName : base;
  return [primary, ...abbreviations];
}

/** A tag with its match forms worked out once, rather than per article. */
export type PreparedTag = { id: string; depth: number; variants: string[][] };

/**
 * Resolve every tag's match forms up front.
 *
 * Done once per ingest rather than once per article: the taxonomy is identical for all of
 * them, and recomputing 588 tags' word lists for each of 1,290 articles is three-quarters
 * of a million string splits to reach the same answer.
 */
export function prepareTaxonomy(tags: ClassifiableTag[]): PreparedTag[] {
  const baseCounts = new Map<string, number>();
  for (const tag of tags) {
    const base = tag.name.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (base) baseCounts.set(base, (baseCounts.get(base) ?? 0) + 1);
  }
  const ambiguous = new Set([...baseCounts].filter(([, n]) => n > 1).map(([name]) => name));

  return tags.map((tag) => ({
    id: tag.id,
    depth: tag.depth,
    // A tag matches on its name *or* any synonym — the same tag reached through more of the
    // words clinicians actually use ("MTSS", "shin splints"). Empty until Andrew's list
    // lands, at which point recall improves with no code change.
    variants: [...nameVariants(tag.name, ambiguous), ...tag.synonyms]
      .map(significantWords)
      .filter((words) => words.length > 0),
  }));
}

/**
 * Does this tag appear in these tokens?
 *
 * **A proximity window, not a phrase match and not bare co-occurrence.** Exact phrases are
 * too brittle — abstracts say "ACL injuries", never the literal tag string. But requiring
 * only that every word appears *somewhere* lets common words collide: during prototype
 * testing a materials-science paper about stress fracture in alloys matched the clinical
 * *Stress fracture* tag that way. A window keeps tolerance for word order and inflection
 * while ruling out incidental co-occurrence across a whole abstract.
 */
function matchesIn(words: string[], tokens: string[]): boolean {
  if (words.length === 0) return false;
  if (words.length === 1) return tokens.includes(words[0]);
  const windowSize = words.length + 3; // a couple of filler words is normal
  for (let i = 0; i <= tokens.length - words.length; i++) {
    const window = tokens.slice(i, i + windowSize);
    if (words.every((w) => window.includes(w))) return true;
  }
  return false;
}

export type ClassifiableTag = {
  id: string;
  name: string;
  synonyms: string[];
  /** Depth in the taxonomy: 0 for a root region, higher for a leaf. Drives specificity. */
  depth: number;
};

export type TagMatch = {
  tagId: string;
  confidence: number;
  matchedIn: 'title' | 'abstract' | 'both';
};

/**
 * The confidence floor a match must clear to be stored.
 *
 * Set here rather than at the query, because a match this weak is noise in every context —
 * but note the design deliberately stores confidence rather than a bare join row, so
 * *raising* the bar later is a query change, not a re-ingest.
 */
export const MIN_CONFIDENCE = 0.3;

/**
 * Classify one article against the whole taxonomy.
 *
 * The false-positive surface grows with the taxonomy, not the corpus, and this taxonomy is
 * 588 nodes deep with entries like *Foot*, *Hip*, *Chest*, *Nerve* and *Bone* — words that
 * are common English in other domains. Three things hold the line:
 *
 * 1. **The corpus is domain-bounded before this runs** (the ingestion queries), so a
 *    materials-science paper never gets the chance to be mis-filed. This does most of the
 *    work, which is why the corpus queries are the highest-leverage setting in the slice.
 * 2. **Specificity weighting** — matching *Medial tibial stress syndrome* is a claim;
 *    matching *Lower limb* is barely a category. Depth is the proxy.
 * 3. **A title match outranks an abstract match**, because a paper's title states its
 *    subject where an abstract merely mentions things.
 */
export function classify(
  article: { title: string; abstract: string | null },
  tags: PreparedTag[],
): TagMatch[] {
  const titleTokens = tokenise(article.title);
  const abstractTokens = article.abstract ? tokenise(article.abstract) : [];
  const matches: TagMatch[] = [];

  for (const tag of tags) {
    const { variants } = tag;
    if (variants.length === 0) continue;

    const inTitle = variants.some((words) => matchesIn(words, titleTokens));
    /**
     * **A one-word tag has to earn it in the title.**
     *
     * After the taxonomy's stop words are stripped, a good number of grouping nodes come
     * down to a single common word — *Bone*, *Nerve*, *Posterior*, *Inflammatory*,
     * *Superficial*, and *Knee Other* (which reduces to "knee"). Measured on the first
     * real 1,290-article corpus, these matched overwhelmingly in abstracts and almost
     * never in titles: *Bone* 142 abstract-only against 2 title, *Inflammatory* 112
     * against 2. That is not a paper about bone, it is a paper that says "bone".
     *
     * A title states a subject; an abstract merely mentions things. So a multi-word tag
     * may match anywhere, and a single-word one must appear in the title.
     */
    const inAbstract =
      abstractTokens.length > 0 &&
      variants.some((words) => words.length > 1 && matchesIn(words, abstractTokens));
    if (!inTitle && !inAbstract) continue;

    const matchedIn = inTitle && inAbstract ? 'both' : inTitle ? 'title' : 'abstract';
    const confidence = score(tag, matchedIn);
    if (confidence < MIN_CONFIDENCE) continue;
    matches.push({ tagId: tag.id, confidence, matchedIn });
  }

  return matches;
}

/**
 * Position weight × specificity.
 *
 * A shallow tag matched only in an abstract lands below `MIN_CONFIDENCE` and is dropped —
 * which is the intended behaviour for "this paper says the word 'foot' somewhere".
 */
function score(tag: PreparedTag, matchedIn: TagMatch['matchedIn']): number {
  const position = matchedIn === 'both' ? 1 : matchedIn === 'title' ? 0.9 : 0.6;
  // 0.4 at a root region, approaching 1 at a leaf. Depth is capped so a very deep branch
  // does not out-shout a genuinely specific match higher up.
  const specificity = Math.min(1, 0.4 + Math.min(tag.depth, 3) * 0.2);
  return Math.round(position * specificity * 100) / 100;
}
