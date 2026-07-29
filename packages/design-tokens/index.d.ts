/**
 * Types for the AskaPeer design tokens. Hand-written rather than emitted: the source is
 * plain ESM so it can be imported by a build script, a bundler, or a React Native client
 * with no compile step in between.
 */

/** A literal value, or a reference to another token by name (without the `--`). */
export type TokenValue = string | { alias: string };

export type Token = {
  /** Token name without the leading `--`, e.g. `color-accent`. */
  name: string;
  value: TokenValue;
  /** Documentation carried through into the generated CSS. */
  comment?: string;
};

export type TokenGroup = {
  /** Section heading, emitted as a CSS comment above the group. */
  comment?: string;
  tokens: Token[];
};

/** Colour and type — the light theme, which is also the base the dark theme overrides. */
export declare const lightGroups: TokenGroup[];

/**
 * Spacing, layout, radius and elevation. Emitted as plain `:root` custom properties
 * rather than into Tailwind's `@theme`, because the style guide's names collide with
 * Tailwind's utility namespaces and mean different values — see the comment on the
 * implementation.
 */
export declare const geometryGroups: TokenGroup[];

/** Dark-theme geometry overrides — shadows only; spacing and radius are theme independent. */
export declare const darkGeometryGroups: TokenGroup[];

/** Dark-theme overrides — only the tokens that genuinely differ, colour and geometry both. */
export declare const darkOverrides: Token[];

/**
 * A flat map of fully resolved token values for one theme: aliases followed, nothing left
 * as `var()`. This is the form to use on any platform without CSS custom properties.
 */
export declare function resolveTheme(theme?: 'light' | 'dark'): Record<string, string>;

/**
 * The CSS token layer as written into globals.css: the `@theme` block (colour, type), the
 * plain `:root` block (geometry), and the dark-scheme override covering both.
 */
export declare function toCss(): string;
