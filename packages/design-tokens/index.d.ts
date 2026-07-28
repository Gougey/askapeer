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

/** The light theme, which is also the base the dark theme overrides. */
export declare const lightGroups: TokenGroup[];

/** Dark-theme overrides — only the tokens that genuinely differ. */
export declare const darkOverrides: Token[];

/**
 * A flat map of fully resolved token values for one theme: aliases followed, nothing left
 * as `var()`. This is the form to use on any platform without CSS custom properties.
 */
export declare function resolveTheme(theme?: 'light' | 'dark'): Record<string, string>;

/** The CSS token layer (`@theme` block + dark-scheme override) as written into globals.css. */
export declare function toCss(): string;
