import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load the workspace-root .env (drizzle-kit runs with cwd = apps/api).
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  // The per-epic files, not the directory: `index.ts` re-exports all of them, so scanning
  // the whole directory registers every object twice. Tables dedupe by name and hid this;
  // views do not, and warn instead.
  schema: './src/db/schema/*.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://askapeer:askapeer@localhost:5432/askapeer',
  },
});
