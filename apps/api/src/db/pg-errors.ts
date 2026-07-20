/**
 * Postgres unique_violation (23505). Drizzle wraps driver errors in DrizzleQueryError,
 * so the code can sit on the error or anywhere down its `cause` chain — hence the walk
 * rather than a single property read.
 */
export function isUniqueViolation(err: unknown): boolean {
  let e: unknown = err;
  for (let i = 0; i < 5 && e; i++) {
    if ((e as { code?: string }).code === '23505') return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}
