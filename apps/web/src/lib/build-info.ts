/**
 * The release and build this web app is running: shown at the foot of Profile, so a member
 * reporting a problem can say exactly which version they are on. Mirrors the API's `/health`.
 * Read on the server: GIT_SHA and BUILD_DATE are runtime environment, stamped in by the deploy.
 */
export function buildInfo(): { version: string; sha: string; date: string | null } {
  return {
    version: process.env.APP_VERSION ?? 'unknown',
    sha: (process.env.GIT_SHA || 'local').slice(0, 7),
    date: process.env.BUILD_DATE || null,
  };
}
