/**
 * Schema migrations for Northbridge ProofForge.
 * Version 1 is the initial schema in src/lib/db/schema.sql.
 * When columns or keys change: add a new version here AND update schema.sql
 * so a fresh install creates the current database.
 */
import { getDb, initDb } from "../src/lib/db/client";
import { SCHEMA_VERSION } from "../src/lib/config";
import { nowIso } from "../src/lib/ids";

const MIGRATIONS: Record<number, (db: ReturnType<typeof getDb>) => void> = {
  1: () => {
    // Applied by schema.sql via initDb().
  },
};

function appliedVersions(): Set<number> {
  const db = getDb();
  const rows = db.prepare("SELECT version FROM schema_migrations").all() as {
    version: number;
  }[];
  return new Set(rows.map((row) => row.version));
}

initDb();
const applied = appliedVersions();
for (let version = 1; version <= SCHEMA_VERSION; version += 1) {
  if (applied.has(version)) continue;
  const migrate = MIGRATIONS[version];
  if (!migrate) {
    throw new Error(`Missing migration for schema version ${version}`);
  }
  migrate(getDb());
  getDb()
    .prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)")
    .run(version, nowIso());
  console.log(`Applied migration v${version}`);
}
console.log(`Schema current at v${SCHEMA_VERSION}`);
