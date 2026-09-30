import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { githubToken, repoRoot } from "@/lib/config";
import { nowIso } from "@/lib/ids";
import type { GithubSource, SourceKind } from "@/lib/types";

const ISSUE_RE =
  /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:issues|pull)\/(\d+)(?:\/)?(?:#.*)?$/i;

export function parseGithubUrl(raw: string): {
  owner: string;
  repo: string;
  number: number;
  url: string;
} | null {
  const trimmed = raw.trim();
  const match = trimmed.match(ISSUE_RE);
  if (!match) return null;
  const owner = match[1];
  const repo = match[2];
  const number = Number(match[3]);
  return {
    owner,
    repo,
    number,
    url: `https://github.com/${owner}/${repo}/issues/${number}`,
  };
}

type GithubIssuePayload = {
  html_url: string;
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels?: { name: string }[] | string[];
  user?: { login: string } | null;
  pull_request?: unknown;
};

function labelNames(labels: GithubIssuePayload["labels"]): string[] {
  if (!labels) return [];
  return labels.map((label) => (typeof label === "string" ? label : label.name));
}

function toSource(
  payload: GithubIssuePayload,
  parsed: { owner: string; repo: string; number: number; url: string },
  offlineFallback: boolean
): GithubSource {
  const isPr = Boolean(payload.pull_request);
  const kind: SourceKind = isPr ? "github_issue" : "github_issue";
  return {
    kind,
    url: payload.html_url || parsed.url,
    owner: parsed.owner,
    repo: parsed.repo,
    number: payload.number ?? parsed.number,
    title: payload.title || `Issue #${parsed.number}`,
    body: payload.body ?? "",
    labels: labelNames(payload.labels),
    state: payload.state || "unknown",
    author: payload.user?.login ?? null,
    fetchedAt: nowIso(),
    offlineFallback,
  };
}

function loadFixture(): GithubIssuePayload {
  const fixturePath = path.join(repoRoot(), "fixtures/github-issue.json");
  if (!existsSync(fixturePath)) {
    throw new Error("GitHub fetch failed and no offline fixture is present.");
  }
  return JSON.parse(readFileSync(fixturePath, "utf8")) as GithubIssuePayload;
}

export async function fetchGithubSource(url: string): Promise<GithubSource> {
  const parsed = parseGithubUrl(url);
  if (!parsed) {
    const trimmed = url.trim();
    if (!/^https?:\/\//i.test(trimmed)) {
      throw new Error("Paste a public GitHub issue or bounty URL.");
    }
    return {
      kind: "bounty_url",
      url: trimmed,
      owner: null,
      repo: null,
      number: null,
      title: "External bounty",
      body: `Imported from ${trimmed}. Bound locally as an evidence-only mission until a GitHub issue URL is supplied.`,
      labels: ["bounty"],
      state: "open",
      author: null,
      fetchedAt: nowIso(),
      offlineFallback: false,
    };
  }

  const api = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Northbridge-ProofForge",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = githubToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(api, { headers, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status}`);
    }
    const payload = (await response.json()) as GithubIssuePayload;
    return toSource(payload, parsed, false);
  } catch {
    const fixture = loadFixture();
    const source = toSource(fixture, parsed, true);
    source.url = parsed.url;
    source.owner = parsed.owner;
    source.repo = parsed.repo;
    source.number = parsed.number;
    source.title = `${source.title} (offline fixture)`;
    return source;
  }
}
