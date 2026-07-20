// Aggregates every module's Drizzle schema. Each epic-module adds its own file
// here as its slice lands (identity, community, billing, research, config).
export * from './community.schema';
export * from './config.schema';
export * from './identity.schema';
