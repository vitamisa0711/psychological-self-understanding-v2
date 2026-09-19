/**
 * Unicode-aware word-boundary helper.
 *
 * JavaScript's `\b` is defined in terms of the ASCII `\w` class, so it does
 * not treat Vietnamese letters that carry combining/precomposed diacritics
 * (e.g. the "ị" in "bị", the "à" in "là") as word characters. A pattern like
 * /\bbạn\s+bị\b/i therefore silently fails to match at the trailing `\b`,
 * because the transition from "ị" to a space is a non-word→non-word
 * transition as far as `\b` is concerned.
 *
 * `fixViBoundary` rewrites every `\b` in a pattern's source into an
 * equivalent boundary assertion defined over the Unicode letter/number
 * classes instead, so boundaries work correctly around Vietnamese text.
 * Behavior for pure-ASCII patterns is unchanged.
 */

const WORD_CHAR_CLASS = "[\\p{L}\\p{N}_]";
const UNICODE_WORD_BOUNDARY =
  `(?:(?<=${WORD_CHAR_CLASS})(?!${WORD_CHAR_CLASS})` +
  `|(?<!${WORD_CHAR_CLASS})(?=${WORD_CHAR_CLASS}))`;

export function fixViBoundary(re: RegExp): RegExp {
  // Only rewrite unescaped `\b` (not `\\b` literal backslash-b, which never
  // occurs in these patterns, and not inside a character class like [\b]).
  const src = re.source.replace(/\\b/g, UNICODE_WORD_BOUNDARY);
  const flags = re.flags.includes("u") ? re.flags : re.flags + "u";
  return new RegExp(src, flags);
}

export function fixViBoundaries(patterns: RegExp[]): RegExp[] {
  return patterns.map(fixViBoundary);
}
