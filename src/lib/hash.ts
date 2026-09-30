import { createHash } from "node:crypto";

export function sha256Hex(input: string | Buffer | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

export function digestOf(value: unknown): string {
  return `sha256:${sha256Hex(canonicalJson(value))}`;
}
