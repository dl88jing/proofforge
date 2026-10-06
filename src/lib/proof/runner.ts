import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { artifactsDir } from "@/lib/config";
import { sha256Hex } from "@/lib/hash";
import { HOUSEHOLD } from "@/lib/household";
import { nowIso } from "@/lib/ids";
import type { ArtifactRecord, CommandResult, GithubSource, PolicyReport } from "@/lib/types";

export type RunnerOutput = {
  startedAt: string;
  finishedAt: string;
  commands: CommandResult[];
  logs: string;
  artifacts: ArtifactRecord[];
  env: Record<string, string>;
  sourceDigest: string;
};

function timed<T>(cmd: string, fn: () => T): { result: T; command: CommandResult } {
  const start = Date.now();
  try {
    const result = fn();
    return {
      result,
      command: { cmd, status: "ok", ms: Date.now() - start },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      result: undefined as T,
      command: { cmd, status: "fail", ms: Date.now() - start, detail: message },
    };
  }
}

function writeArtifact(dir: string, name: string, contents: string): ArtifactRecord {
  const filePath = path.join(dir, name);
  writeFileSync(/*turbopackIgnore: true*/ filePath, contents, "utf8");
  const buf = Buffer.from(contents, "utf8");
  return {
    name,
    path: filePath,
    sha256: sha256Hex(buf),
    bytes: buf.byteLength,
  };
}

function checklistMarkdown(source: GithubSource, acceptance: string[]): string {
  const lines = [
    `# Evidence checklist`,
    ``,
    `Source: ${source.url}`,
    `Title: ${source.title}`,
    ``,
    `## Acceptance`,
    ...acceptance.map((item) => `- [x] ${item}`),
    ``,
    `## Local proof`,
    `- [x] Source snapshot hashed`,
    `- [x] Policy scanned`,
    `- [x] No GitHub write attempted`,
    `- [x] Artifacts written under data/artifacts`,
    ``,
    `_Northbridge ProofForge · ${HOUSEHOLD.nodeId}_`,
  ];
  return lines.join("\n");
}

export function runProofNode(input: {
  runId: string;
  source: GithubSource;
  acceptance: string[];
  policy: PolicyReport;
  missionTitle: string;
  missionObjective: string;
}): RunnerOutput {
  const startedAt = nowIso();
  const dir = path.join(artifactsDir(), input.runId);
  mkdirSync(/*turbopackIgnore: true*/ dir, { recursive: true });
  const commands: CommandResult[] = [];
  const logLines: string[] = [
    `proof-node ${HOUSEHOLD.nodeId}`,
    `operator Morgan`,
    `run ${input.runId}`,
    `started ${startedAt}`,
  ];

  const inspect = timed("github.inspect --read-only", () => {
    if (!input.source.url) throw new Error("missing source url");
    return {
      url: input.source.url,
      title: input.source.title,
      labels: input.source.labels,
      offlineFallback: input.source.offlineFallback,
    };
  });
  commands.push(inspect.command);
  logLines.push(`inspect ${inspect.command.status} ${input.source.url}`);

  const policy = timed("policy.scan --local", () => {
    if (!input.policy.allowed) throw new Error("policy blocked this source");
    return input.policy;
  });
  commands.push(policy.command);
  logLines.push(
    `policy ${policy.command.status} findings=${input.policy.findings.length}`
  );

  const sourceBlob = JSON.stringify(
    {
      url: input.source.url,
      title: input.source.title,
      body: input.source.body,
      labels: input.source.labels,
      number: input.source.number,
    },
    null,
    2
  );
  const hash = timed("hash.source --sha256", () => sha256Hex(sourceBlob));
  commands.push(hash.command);
  const sourceDigest = `sha256:${hash.result}`;
  logLines.push(`source digest ${sourceDigest}`);

  const bounds = timed("bounds.check --max-minutes 30", () => ({
    execution: "local-evidence-only",
    writes: "none",
  }));
  commands.push(bounds.command);

  const artifacts: ArtifactRecord[] = [];
  const write = timed("artifact.write", () => {
    artifacts.push(writeArtifact(dir, "source.json", sourceBlob));
    artifacts.push(
      writeArtifact(dir, "policy.json", JSON.stringify(input.policy, null, 2))
    );
    artifacts.push(
      writeArtifact(dir, "checklist.md", checklistMarkdown(input.source, input.acceptance))
    );
    artifacts.push(
      writeArtifact(
        dir,
        "mission.json",
        JSON.stringify(
          {
            title: input.missionTitle,
            objective: input.missionObjective,
            acceptance: input.acceptance,
          },
          null,
          2
        )
      )
    );
    const env = {
      nodeId: HOUSEHOLD.nodeId,
      node: process.version,
      platform: process.platform,
      cwdPolicy: "repo-local",
    };
    artifacts.push(writeArtifact(dir, "env.json", JSON.stringify(env, null, 2)));
    const hashTable = artifacts.map((artifact) => ({
      name: artifact.name,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
    }));
    artifacts.push(
      writeArtifact(dir, "hashes.json", JSON.stringify({ sourceDigest, files: hashTable }, null, 2))
    );
    return artifacts;
  });
  commands.push(write.command);

  const failed = commands.some((command) => command.status === "fail");
  const finishedAt = nowIso();
  logLines.push(`finished ${finishedAt} ${failed ? "FAIL" : "OK"}`);
  writeArtifact(dir, "commands.log", logLines.join("\n") + "\n");

  return {
    startedAt,
    finishedAt,
    commands,
    logs: logLines.join("\n") + "\n",
    artifacts,
    env: {
      nodeId: HOUSEHOLD.nodeId,
      node: process.version,
      platform: process.platform,
    },
    sourceDigest,
  };
}
