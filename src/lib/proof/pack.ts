import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { packsDir } from "@/lib/config";
import { digestOf } from "@/lib/hash";
import { HOUSEHOLD } from "@/lib/household";
import { nowIso } from "@/lib/ids";
import type {
  ArtifactRecord,
  CommandResult,
  GithubSource,
  MissionBounds,
  PolicyReport,
  ProofPack,
  PublicProof,
  VerifierReport,
} from "@/lib/types";

export function buildProofPack(input: {
  packId: string;
  missionId: string;
  runId: string;
  source: GithubSource;
  title: string;
  objective: string;
  bounds: MissionBounds;
  acceptance: string[];
  rewardLabel: string;
  policy: PolicyReport;
  operator: string;
  startedAt: string;
  finishedAt: string;
  commands: CommandResult[];
  artifacts: ArtifactRecord[];
  verifier: VerifierReport;
}): { pack: ProofPack; publicProof: PublicProof; filePath: string } {
  const createdAt = nowIso();
  const unsigned: Omit<ProofPack, "digest"> = {
    schema: "northbridge.proofpack.v1",
    packId: input.packId,
    missionId: input.missionId,
    runId: input.runId,
    createdAt,
    household: {
      name: HOUSEHOLD.name,
      nodeId: HOUSEHOLD.nodeId,
      runner: input.operator,
      verifier: "independent-local",
    },
    source: input.source,
    mission: {
      title: input.title,
      objective: input.objective,
      bounds: input.bounds,
      acceptance: input.acceptance,
      rewardLabel: input.rewardLabel,
    },
    policy: input.policy,
    runner: {
      nodeId: HOUSEHOLD.nodeId,
      operator: input.operator,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
      commands: input.commands,
      artifactDigests: input.artifacts.map((artifact) => ({
        name: artifact.name,
        sha256: artifact.sha256,
        bytes: artifact.bytes,
      })),
    },
    verifier: input.verifier,
  };
  const digest = digestOf(unsigned);
  const pack: ProofPack = { ...unsigned, digest };

  const publicProof: PublicProof = {
    schema: "northbridge.publicproof.v1",
    packId: pack.packId,
    missionId: pack.missionId,
    digest: pack.digest,
    title: pack.mission.title,
    sourceUrl: pack.source.url,
    accepted: false,
    settled: false,
    credit: null,
    settlementSignature: null,
    cluster: null,
    summary: pack.verifier.summary,
    verifierPassed: pack.verifier.passed,
    createdAt,
  };

  mkdirSync(/*turbopackIgnore: true*/ packsDir(), { recursive: true });
  const filePath = path.join(packsDir(), `${pack.packId}.json`);
  writeFileSync(/*turbopackIgnore: true*/ filePath, JSON.stringify(pack, null, 2), "utf8");
  writeFileSync(
    /*turbopackIgnore: true*/
    path.join(packsDir(), `${pack.packId}.public.json`),
    JSON.stringify(publicProof, null, 2),
    "utf8"
  );

  return { pack, publicProof, filePath };
}

export function markPublicProof(
  publicProof: PublicProof,
  patch: Partial<PublicProof>
): PublicProof {
  return { ...publicProof, ...patch };
}
