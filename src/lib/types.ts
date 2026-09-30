export type MissionStatus =
  | "bounded"
  | "running"
  | "verified"
  | "packed"
  | "submitted"
  | "accepted"
  | "rejected"
  | "settled"
  | "failed";

export type SourceKind = "github_issue" | "bounty_url";

export type MissionBounds = {
  maxMinutes: number;
  execution: "local-evidence-only";
  writes: "none";
  network: string[];
  humanGates: string[];
};

export type PolicyFinding = {
  id: string;
  severity: "info" | "warn" | "block";
  message: string;
};

export type PolicyReport = {
  allowed: boolean;
  findings: PolicyFinding[];
  evidenceOnly: boolean;
};

export type GithubSource = {
  kind: SourceKind;
  url: string;
  owner: string | null;
  repo: string | null;
  number: number | null;
  title: string;
  body: string;
  labels: string[];
  state: string;
  author: string | null;
  fetchedAt: string;
  offlineFallback: boolean;
};

export type CommandResult = {
  cmd: string;
  status: "ok" | "fail";
  ms: number;
  detail?: string;
};

export type ArtifactRecord = {
  name: string;
  path: string;
  sha256: string;
  bytes: number;
};

export type VerifierCheck = {
  id: string;
  passed: boolean;
  detail: string;
};

export type VerifierReport = {
  passed: boolean;
  checks: VerifierCheck[];
  summary: string;
};

export type ProofPack = {
  schema: "northbridge.proofpack.v1";
  packId: string;
  missionId: string;
  runId: string;
  createdAt: string;
  household: {
    name: string;
    nodeId: string;
    runner: string;
    verifier: string;
  };
  source: GithubSource;
  mission: {
    title: string;
    objective: string;
    bounds: MissionBounds;
    acceptance: string[];
    rewardLabel: string;
  };
  policy: PolicyReport;
  runner: {
    nodeId: string;
    operator: string;
    startedAt: string;
    finishedAt: string;
    commands: CommandResult[];
    artifactDigests: { name: string; sha256: string; bytes: number }[];
  };
  verifier: VerifierReport;
  digest: string;
};

export type PublicProof = {
  schema: "northbridge.publicproof.v1";
  packId: string;
  missionId: string;
  digest: string;
  title: string;
  sourceUrl: string;
  accepted: boolean;
  settled: boolean;
  credit: number | null;
  settlementSignature: string | null;
  cluster: string | null;
  summary: string;
  verifierPassed: boolean;
  createdAt: string;
};

export type EventKind =
  | "source.imported"
  | "mission.bounded"
  | "proof.ran"
  | "proof.verified"
  | "pack.created"
  | "pack.submitted"
  | "review.accepted"
  | "review.rejected"
  | "credit.granted"
  | "settle.submitted"
  | "settle.confirmed"
  | "settle.failed";

export type SettlementRecord = {
  id: string;
  missionId: string;
  packId: string;
  cluster: string;
  rpcUrl: string;
  payerPubkey: string;
  payeePubkey: string;
  lamports: number;
  memo: string;
  signature: string | null;
  slot: number | null;
  status: "pending" | "confirmed" | "failed";
  error: string | null;
  createdAt: string;
  confirmedAt: string | null;
};
