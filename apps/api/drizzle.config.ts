import { resolve } from 'node:path';
import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load the workspace-root .env (drizzle-kit runs with cwd = apps/api).
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

export default defineConfig({
  schema: './src/db/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://askapeer:askapeer@localhost:5432/askapeer',
  },
});
