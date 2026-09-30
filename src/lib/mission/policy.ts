import type { GithubSource, PolicyFinding, PolicyReport } from "@/lib/types";

const BLOCK_PATTERNS: { id: string; re: RegExp; message: string }[] = [
  {
    id: "private-key",
    re: /BEGIN [A-Z ]*PRIVATE KEY|secret[_-]?key\s*[:=]/i,
    message: "Source asks for or includes private-key material.",
  },
  {
    id: "mainnet-funds",
    re: /mainnet(?:-beta)?.*\b(transfer|airdrop|payout|withdraw)\b|\bsend real (sol|funds|usdc)\b/i,
    message: "Source asks for mainnet fund movement. ProofForge stays evidence-only until accept.",
  },
];

const WARN_PATTERNS: { id: string; re: RegExp; message: string }[] = [
  {
    id: "auto-github-write",
    re: /\b(auto(?:matically)? )?(open|post|merge) (a )?(pr|pull request|comment|issue)\b/i,
    message: "GitHub writes stay human-gated. The proof node will not post or merge.",
  },
  {
    id: "deploy",
    re: /\bdeploy\b.*\b(production|mainnet)\b/i,
    message: "Production deploy is outside the local evidence bound.",
  },
];

export function scanPolicy(source: GithubSource): PolicyReport {
  const haystack = `${source.title}\n${source.body}\n${source.labels.join(" ")}`;
  const findings: PolicyFinding[] = [];

  for (const rule of BLOCK_PATTERNS) {
    if (rule.re.test(haystack)) {
      findings.push({ id: rule.id, severity: "block", message: rule.message });
    }
  }
  for (const rule of WARN_PATTERNS) {
    if (rule.re.test(haystack)) {
      findings.push({ id: rule.id, severity: "warn", message: rule.message });
    }
  }

  if (source.body.trim().length < 40) {
    findings.push({
      id: "thin-body",
      severity: "warn",
      message: "Issue body is thin. Mission bounds will be derived from the title and labels.",
    });
  }

  findings.push({
    id: "local-only",
    severity: "info",
    message: "Proof node is local and evidence-only. No GitHub writes, no custody, no mainnet.",
  });

  return {
    allowed: findings.every((finding) => finding.severity !== "block"),
    findings,
    evidenceOnly: true,
  };
}
