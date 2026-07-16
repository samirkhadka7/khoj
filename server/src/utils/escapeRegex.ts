/**
 * Escape regex metacharacters in untrusted input before passing to `new RegExp(...)`.
 *
 * Without this, a query like `(((a)))` or `(a+)+$` could either:
 *   - cause catastrophic backtracking (ReDoS), OR
 *   - silently match unintended documents.
 *
 * Mirror of MDN's recommended escape — covers every char with special meaning
 * in a JS regex.
 */
export const escapeRegex = (input: string): string =>
  input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
