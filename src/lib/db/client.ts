import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { SCHEMA_VERSION, dataDir, dbPath, repoRoot } from "@/lib/config";
import { nowIso } from "@/lib/ids";

type GlobalDb = {
  instance: DatabaseSync | null;
  path: string | null;
};

const globalDb = globalThis as typeof globalThis & { __proofforgeDb?: GlobalDb };

function openDb(): DatabaseSync {
  const file = dbPath();
  mkdirSync(dataDir(), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  return db;
}

export function getDb(): DatabaseSync {
  const file = dbPath();
  if (!globalDb.__proofforgeDb) {
    globalDb.__proofforgeDb = { instance: null, path: null };
  }
  if (!globalDb.__proofforgeDb.instance || globalDb.__proofforgeDb.path !== file) {
    globalDb.__proofforgeDb.instance?.close();
    globalDb.__proofforgeDb.instance = openDb();
    globalDb.__proofforgeDb.path = file;
  }
  return globalDb.__proofforgeDb.instance;
}

export function reloadDb(): DatabaseSync {
  if (globalDb.__proofforgeDb?.instance) {
    try {
      globalDb.__proofforgeDb.instance.close();
    } catch {
      // already closed
    }
    globalDb.__proofforgeDb.instance = null;
    globalDb.__proofforgeDb.path = null;
  }
  return getDb();
}

export function initDb(): void {
  const db = getDb();
  const schemaPath = path.join(repoRoot(), "src/lib/db/schema.sql");
  if (!existsSync(schemaPath)) {
    throw new Error(`Missing schema file at ${schemaPath}`);
  }
  db.exec(readFileSync(schemaPath, "utf8"));
  const row = db
    .prepare("SELECT version FROM schema_migrations WHERE version = ?")
    .get(SCHEMA_VERSION) as { version: number } | undefined;
  if (!row) {
    db.prepare("INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)").run(
      SCHEMA_VERSION,
      nowIso()
    );
  }
}

export function resetDbForTests(): void {
  if (globalDb.__proofforgeDb?.instance) {
    globalDb.__proofforgeDb.instance.close();
    globalDb.__proofforgeDb.instance = null;
    globalDb.__proofforgeDb.path = null;
  }
}
