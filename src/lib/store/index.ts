/**
 * Northbridge ProofForge state store.
 *
 * No native database. State is one JSON document held in memory and persisted
 * through a pluggable backend:
 *
 *   file   – data/proofforge.json (default for local dev / CLI demo)
 *   memory – process memory only (default on Vercel without Redis; per-instance demo)
 *   redis  – Upstash / Vercel KV REST API (durable across serverless instances)
 *
 * Reads are synchronous against the in-memory copy. Request handlers call
 * `hydrateStore()` before reading and `flushStore()` after mutating, which is
 * a no-op for file/memory backends.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "@/lib/config";
import { emptyStore, type StoreData } from "@/lib/store/types";

export type StoreBackend = "file" | "memory" | "redis";

type GlobalStore = {
  data: StoreData | null;
  dirty: boolean;
  loadedFrom: string | null;
};

const g = globalThis as typeof globalThis & { __proofforgeStore?: GlobalStore };

function state(): GlobalStore {
  if (!g.__proofforgeStore) {
    g.__proofforgeStore = { data: null, dirty: false, loadedFrom: null };
  }
  return g.__proofforgeStore;
}

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function storeBackend(): StoreBackend {
  const explicit = process.env.PROOFFORGE_STORE?.toLowerCase();
  if (explicit === "file" || explicit === "memory" || explicit === "redis") return explicit;
  if (redisConfig()) return "redis";
  if (process.env.VERCEL) return "memory";
  return "file";
}

export function storeFilePath(): string {
  return process.env.PROOFFORGE_STORE_PATH ?? path.join(dataDir(), "proofforge.json");
}

function redisKey(): string {
  return process.env.PROOFFORGE_STORE_KEY ?? "northbridge:proofforge:store";
}

function normalize(raw: unknown): StoreData {
  const base = emptyStore();
  if (!raw || typeof raw !== "object") return base;
  const value = raw as Partial<StoreData>;
  return { ...base, ...value, schema: "northbridge.store.v2" };
}

function loadFile(): StoreData {
  const file = storeFilePath();
  if (!existsSync(/*turbopackIgnore: true*/ file)) return emptyStore();
  try {
    return normalize(JSON.parse(readFileSync(/*turbopackIgnore: true*/ file, "utf8")));
  } catch {
    return emptyStore();
  }
}

function saveFile(data: StoreData): void {
  const file = storeFilePath();
  mkdirSync(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(/*turbopackIgnore: true*/ tmp, JSON.stringify(data), "utf8");
  renameSync(/*turbopackIgnore: true*/ tmp, file);
}

/** Synchronous access to the current in-memory store. */
export function getStore(): StoreData {
  const s = state();
  if (!s.data) {
    s.data = storeBackend() === "file" ? loadFile() : emptyStore();
    s.loadedFrom = storeBackend();
  } else if (storeBackend() === "file") {
    // Another process (CLI demo, second dev worker) may have written newer state.
    const onDisk = loadFile();
    if (onDisk.revision > s.data.revision) s.data = onDisk;
  }
  return s.data;
}

/** Mark the store mutated. File backend writes through immediately. */
export function touchStore(): void {
  const s = state();
  const data = getStore();
  data.revision += 1;
  s.dirty = true;
  if (storeBackend() === "file") {
    saveFile(data);
    s.dirty = false;
  }
}

async function redisCommand(args: (string | number)[]): Promise<unknown> {
  const cfg = redisConfig();
  if (!cfg) throw new Error("Redis store selected but UPSTASH_REDIS_REST_URL/TOKEN are not set.");
  const response = await fetch(cfg.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Redis store HTTP ${response.status}`);
  const body = (await response.json()) as { result?: unknown; error?: string };
  if (body.error) throw new Error(`Redis store: ${body.error}`);
  return body.result;
}

/** Pull the latest durable state (Redis). No-op for file/memory backends. */
export async function hydrateStore(): Promise<StoreData> {
  if (storeBackend() !== "redis") return getStore();
  const s = state();
  const raw = (await redisCommand(["GET", redisKey()])) as string | null;
  const remote = raw ? normalize(JSON.parse(raw)) : emptyStore();
  if (!s.data || remote.revision >= s.data.revision) {
    s.data = remote;
    s.dirty = false;
  }
  return s.data;
}

/** Persist pending mutations (Redis). No-op for file/memory backends. */
export async function flushStore(): Promise<void> {
  const s = state();
  if (storeBackend() !== "redis" || !s.dirty || !s.data) return;
  await redisCommand(["SET", redisKey(), JSON.stringify(s.data)]);
  s.dirty = false;
}

/** Run a request handler against hydrated state and persist afterwards. */
export async function withStore<T>(fn: () => T | Promise<T>): Promise<T> {
  await hydrateStore();
  try {
    return await fn();
  } finally {
    await flushStore();
  }
}

/** Wipe all household state (used by `npm run db:init` and the demo reset). */
export function resetStore(): void {
  const s = state();
  s.data = emptyStore();
  s.data.revision = Date.now();
  s.dirty = true;
  if (storeBackend() === "file") {
    saveFile(s.data);
    s.dirty = false;
  }
}

export function storeInfo() {
  const data = getStore();
  return {
    backend: storeBackend(),
    revision: data.revision,
    durable: storeBackend() !== "memory",
    missions: data.missions.length,
    events: data.events.length,
  };
}
