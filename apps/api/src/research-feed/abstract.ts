/**
 * Turning a source's abstract markup into something we can render safely.
 *
 * Europe PMC returns `abstractText` as JATS-flavoured HTML, not plain text: 507 of the
 * first 1,198 stored abstracts carried markup, dominated by `<h4>` section headings
 * (2,075 of them) plus `<i>`, `<b>`, `<sup>`, `<sub>` and the occasional MathML block.
 * Rendered as text those tags show literally; rendered as HTML they would be third-party
 * markup injected into a trust-first platform, which is not a trade worth making for
 * italics.
 *
 * So the markup is parsed **once, at ingestion**, into a structure the app renders with
 * its own components. Nothing downstream ever sees a tag, and `dangerouslySetInnerHTML`
 * stays absent from the codebase.
 *
 * The headings are worth preserving rather than stripping: "Purpose / Methods / Results /
 * Conclusions" is the shape a clinician scans, and dropping the tags without replacing
 * them runs the sections together mid-sentence ("…with AGAD.Methods Fifty-five
 * participants…").
 */

/** One block of an abstract: a structured section, or the whole thing when unstructured. */
export type AbstractSection = { heading: string | null; body: string };

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decode the entities a source actually emits, including numeric ones. */
export function decodeEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => codePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => codePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

function codePoint(value: number): string {
  // A malformed entity must not take the ingest down; leave it as the replacement char.
  if (!Number.isFinite(value) || value < 0 || value > 0x10ffff) return '�';
  try {
    return String.fromCodePoint(value);
  } catch {
    return '�';
  }
}

/**
 * Remove inline markup, keeping the words inside it.
 *
 * MathML is dropped whole rather than unwrapped: `<mml:mi>x</mml:mi>` unwraps to a soup of
 * loose symbols that reads worse than the omission does. Titles get this same treatment —
 * four of the first 1,290 carried `<i>` around a species name.
 */
export function stripInline(text: string): string {
  // **Decode before stripping, not after.** Sources sometimes double-encode their markup,
  // so a title arrives as `Nestin&lt;sup&gt;+&lt;/sup&gt;`. Stripping first finds no tags,
  // and decoding afterwards then *produces* `<sup>` in what is supposed to be clean text —
  // which is exactly how six titles kept their markup through the first backfill.
  const decoded = decodeEntities(text);
  return decoded
    .replace(/<mml:[\s\S]*?<\/mml:[^>]*>/gi, ' ')
    // A letter or slash must follow the `<`, so statistics survive: `P<0.001` and `n>30`
    // are not markup, and a laxer pattern eats everything between them.
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split an abstract into its sections.
 *
 * Idempotent: text with no markup comes back as a single unheaded section, so this is safe
 * to run over already-clean rows — which is what the backfill relies on.
 */
export function parseAbstract(raw: string | null): {
  text: string | null;
  sections: AbstractSection[];
} {
  if (!raw) return { text: null, sections: [] };

  // Decoded up front for the same reason `stripInline` does it: a double-encoded abstract
  // carries `&lt;h4&gt;`, which would not split here and would leave the whole structured
  // abstract as one undifferentiated block.
  const decoded = decodeEntities(raw);

  // `<h4>`/`<h3>` is Europe PMC's structured-abstract heading; `<title>` is the JATS
  // equivalent that arrives inside `<sec>`.
  const parts = decoded.split(/<(?:h[1-6]|title)[^>]*>/i);
  const sections: AbstractSection[] = [];

  for (const [index, part] of parts.entries()) {
    if (!part.trim()) continue;
    // Everything before the first heading is a lead paragraph with no heading of its own.
    if (index === 0) {
      const body = stripInline(part);
      if (body) sections.push({ heading: null, body });
      continue;
    }
    const close = part.search(/<\/(?:h[1-6]|title)[^>]*>/i);
    if (close === -1) {
      const body = stripInline(part);
      if (body) sections.push({ heading: null, body });
      continue;
    }
    const heading = stripInline(part.slice(0, close));
    const body = stripInline(part.slice(close).replace(/^<\/[^>]*>/, ''));
    if (!heading && !body) continue;
    sections.push({ heading: heading || null, body });
  }

  if (sections.length === 0) {
    const body = stripInline(decoded);
    return body ? { text: body, sections: [{ heading: null, body }] } : { text: null, sections: [] };
  }

  // The flattened form is what the classifier tokenises and what the card snippet trims,
  // so neither has to know abstracts have structure at all.
  const text = sections
    .map((s) => (s.heading ? `${s.heading}: ${s.body}` : s.body))
    .join(' ')
    .trim();

  return { text: text || null, sections };
}
