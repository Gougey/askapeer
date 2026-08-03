/**
 * Category colour: token key → CSS variable.
 *
 * The API stores a *key* (`teal`, `blue`…) rather than a colour, because the value differs
 * per theme: `--color-category-teal` is a deep teal on light and a pale one on dark. A
 * stored colour would freeze every category to whichever theme it was picked in, and would
 * put a raw value outside `globals.css`, which is the one file allowed to hold them.
 *
 * The allowlist is what stops that guarantee leaking: an unknown key from the database can
 * never reach the DOM as a colour, so a typo in the admin console (S13) can't inject
 * arbitrary CSS into a `style` attribute. Unknown or absent → the accent every category
 * used before this existed, which is a correct-looking fallback rather than a broken one.
 */
const CATEGORY_TOKENS: Record<string, string> = {
  teal: 'var(--color-category-teal)',
  blue: 'var(--color-category-blue)',
  violet: 'var(--color-category-violet)',
  magenta: 'var(--color-category-magenta)',
  slate: 'var(--color-category-slate)',
};

export const DEFAULT_CATEGORY_COLOUR = 'var(--color-accent)';

/** The CSS colour for a category, safe to drop straight into a `style` prop. */
export function categoryColour(colour: string | null | undefined): string {
  if (!colour) return DEFAULT_CATEGORY_COLOUR;
  return CATEGORY_TOKENS[colour] ?? DEFAULT_CATEGORY_COLOUR;
}
