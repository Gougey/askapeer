/**
 * Spelling correction for search — the pure half. `npm run verify:spelling -w apps/api`.
 *
 * **Correct the words, not the results.** Both searches AND every word together, so a single
 * typo ("return ti sport") is enough to empty the page however good the other five words are.
 * The forum's older fallback compared the *whole query* to post titles by trigram similarity;
 * that is a guess at what someone meant to *find*. This instead guesses what each word was
 * meant to *be*, against a dictionary of real words, and then runs the ordinary search on the
 * corrected text — so what comes back is an exact match for a query the member can read.
 *
 * Everything here is deterministic and free of the database, which is why it is split out:
 * the service supplies "is this word known?" and "what is near it?", and this file decides.
 */

/** A word shorter than this is never guessed at: "ti" is as near to "tip" as to "to". */
export const MIN_CORRECTABLE_LENGTH = 4;

/** One token of the query the member typed, with enough kept to rebuild it exactly. */
type Token = {
  /** The token as typed, punctuation and all. */
  raw: string;
  /** The bare word, lower-cased, when the token is a single correctable word; else null. */
  word: string | null;
};

/** What a correction did to one word: replaced it, or dropped it as unknowable. */
export type WordChange = { from: string; to: string | null };

export type Correction = { query: string; changes: WordChange[] };

export type Candidate = { word: string; ndoc: number };

/**
 * Split the query on whitespace and say which tokens are plain words.
 *
 * ⚠️ **A negated word is never corrected.** `-runner` excludes; misspelt, it excludes nothing,
 * which cannot be what emptied the page — and "correcting" it would silently change which
 * results are *removed*. `or` is `websearch_to_tsquery`'s operator, not a word. Anything with a
 * digit or an inner symbol (`ACL-R`, `T2`, `L4/5`) is left exactly as typed: those are codes,
 * and a dictionary of English words has nothing useful to say about them.
 */
export function tokenise(query: string): Token[] {
  return query
    .split(/\s+/)
    .filter((raw) => raw !== '')
    .map((raw) => {
      if (raw.startsWith('-')) return { raw, word: null };
      const bare = raw.replace(/^["'(]+|["'),.;:!?]+$/g, '').toLowerCase();
      if (!/^[a-z]+$/.test(bare) || bare === 'or') return { raw, word: null };
      return { raw, word: bare };
    });
}

/** The distinct words worth asking the database about, in the order typed. */
export function correctableWords(query: string): string[] {
  return [...new Set(tokenise(query).flatMap((t) => (t.word ? [t.word] : [])))];
}

/**
 * Edit distance with adjacent transpositions counted as one edit (optimal string alignment).
 *
 * Plain Levenshtein scores "ligamnet" two edits from "ligament", the same as "liga" is from
 * "ligamnet" by trigrams — and the commonest typo on a phone keyboard *is* two letters swapped.
 */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Every word one edit away — each swap, deletion, substitution and insertion of a-z.
 *
 * ⚠️ **Why this exists alongside the trigram shortlist.** A swap is the commonest phone typo
 * and the one trigrams handle worst: it breaks most of the word's trigrams. Andrew's "retrun"
 * shares more with "retro", "retrospective" and "retrograde" than with "return", so on live
 * "return" fell outside the top ten and he was offered "retro sport". Looking these up exactly
 * guarantees every one-edit word is considered however crowded the trigram neighbourhood is.
 * About 54 × length variants, checked in one indexed `= any(...)`.
 */
export function singleEdits(word: string): string[] {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const out = new Set<string>();
  for (let i = 0; i <= word.length; i++) {
    const head = word.slice(0, i);
    const tail = word.slice(i);
    if (tail) out.add(head + tail.slice(1));
    if (tail.length > 1) out.add(head + tail[1] + tail[0] + tail.slice(2));
    for (const ch of letters) {
      if (tail) out.add(head + ch + tail.slice(1));
      out.add(head + ch + tail);
    }
  }
  out.delete(word);
  return [...out];
}

/** How far a word may be from its correction — tighter for short words, which collide more. */
export function maxDistance(word: string): number {
  return word.length <= 4 ? 1 : word.length <= 8 ? 2 : 3;
}

/**
 * The best correction for one unknown word, or null to drop it.
 *
 * **Nearest first, then commonest.** Trigram similarity finds the candidates but is a poor
 * judge between them — it preferred "liga" to "ligament" and "ankh" to "ankle". Edit distance
 * decides, and among equally near words the one that appears in more papers wins, because it is
 * the likelier thing to have meant.
 */
export function chooseCorrection(word: string, candidates: Candidate[]): string | null {
  if (word.length < MIN_CORRECTABLE_LENGTH) return null;
  const limit = maxDistance(word);
  let best: { word: string; distance: number; ndoc: number } | null = null;
  for (const c of candidates) {
    if (c.word === word) continue;
    const distance = editDistance(word, c.word);
    if (distance > limit) continue;
    if (
      !best ||
      distance < best.distance ||
      (distance === best.distance && c.ndoc > best.ndoc) ||
      (distance === best.distance && c.ndoc === best.ndoc && c.word < best.word)
    ) {
      best = { word: c.word, distance, ndoc: c.ndoc };
    }
  }
  return best?.word ?? null;
}

/**
 * Rebuild the query with each unknown word replaced or dropped.
 *
 * ⚠️ **Dropping is deliberate.** An unknown word that nothing is near cannot match anything, and
 * because every word is required it guarantees an empty page; leaving it in would make the
 * correction pointless. The screen names what was changed, so nothing is dropped silently.
 *
 * Null when nothing changed, or when nothing would be left to search for.
 */
export function applyCorrections(
  query: string,
  unknown: ReadonlySet<string>,
  corrections: ReadonlyMap<string, string | null>,
): Correction | null {
  const changes: WordChange[] = [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokenise(query)) {
    if (!token.word || !unknown.has(token.word)) {
      out.push(token.raw);
      continue;
    }
    const to = corrections.get(token.word) ?? null;
    if (!seen.has(token.word)) {
      changes.push({ from: token.word, to });
      seen.add(token.word);
    }
    // Keep any quote or bracket the word was wearing, so a phrase stays a phrase.
    const rebuilt = token.raw.toLowerCase().replace(token.word, to ?? '');
    if (/[a-z0-9]/i.test(rebuilt) || /["()]/.test(rebuilt)) out.push(rebuilt);
  }
  if (changes.length === 0) return null;
  const corrected = out.join(' ').replace(/\s+/g, ' ').trim();
  if (!/[a-z]/i.test(corrected.replace(/(^|\s)-\S+/g, ''))) return null;
  return { query: corrected, changes };
}
