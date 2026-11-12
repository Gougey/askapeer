import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Which release this is, and exactly which build: "0.9.0", commit a3f30f4, built 12 Nov 2026.
 *
 * The version is the root `package.json`'s, the one number for the whole app, raised per
 * release (DEVELOPMENT.md, "Versions and releases"). The commit and date are stamped in by the
 * deploy as Docker build arguments, so a running machine can say what it is running: the
 * deploy workflow checks `/health` against the commit it just deployed, because a delayed
 * GitHub event once deployed an older commit over a newer one with both jobs green.
 */
export type BuildInfo = { version: string; sha: string; date: string | null };

function readVersion(): string {
  try {
    // The workspace's working directory, locally and in the image (/app/apps/api).
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), '../../package.json'), 'utf8'));
    return typeof pkg.version === 'string' ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

export const BUILD_INFO: BuildInfo = {
  version: readVersion(),
  sha: process.env.GIT_SHA || 'local',
  date: process.env.BUILD_DATE || null,
};
