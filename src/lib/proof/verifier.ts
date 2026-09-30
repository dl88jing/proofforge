import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { artifactsDir } from "@/lib/config";
import { sha256Hex } from "@/lib/hash";
import type { ArtifactRecord, CommandResult, PolicyReport, VerifierCheck, VerifierReport } from "@/lib/types";

function check(
  id: string,
  passed: boolean,
  detail: string
): VerifierCheck {
  return { id, passed, detail };
}

export function verifyRun(input: {
  runId: string;
  artifacts: ArtifactRecord[];
  commands: CommandResult[];
  logs: string;
  policy: PolicyReport;
  sourceDigest: string;
}): VerifierReport {
  const dir = path.join(artifactsDir(), input.runId);
  const checks: VerifierCheck[] = [];

  checks.push(
    check(
      "runner_finished",
      input.commands.length > 0 && input.commands.every((command) => command.status === "ok"),
      input.commands.every((command) => command.status === "ok")
        ? `${input.commands.length} commands ok`
        : "runner reported a failed command"
    )
  );

  checks.push(
    check(
      "self_grade_forbidden",
      !/accepted by runner|self-approved/i.test(input.logs),
      "Runner did not grade its own work as accepted."
    )
  );

  checks.push(
    check(
      "policy_allowed",
      input.policy.allowed && input.policy.evidenceOnly,
      input.policy.allowed ? "Evidence-only policy holds." : "Policy blocked."
    )
  );

  const required = ["source.json", "policy.json", "checklist.md", "hashes.json", "env.json"];
  for (const name of required) {
    const recorded = input.artifacts.find((artifact) => artifact.name === name);
    const filePath = recorded?.path ?? path.join(dir, name);
    const exists = existsSync(filePath);
    let hashOk = false;
    if (exists && recorded) {
      const buf = readFileSync(filePath);
      hashOk = sha256Hex(buf) === recorded.sha256;
    }
    checks.push(
      check(
        `artifact:${name}`,
        Boolean(exists && hashOk),
        exists && hashOk ? `hash ${recorded?.sha256.slice(0, 12)}…` : "missing or hash mismatch"
      )
    );
  }

  const hashesPath = path.join(dir, "hashes.json");
  if (existsSync(hashesPath)) {
    const hashes = JSON.parse(readFileSync(hashesPath, "utf8")) as {
      sourceDigest?: string;
    };
    checks.push(
      check(
        "source_digest",
        hashes.sourceDigest === input.sourceDigest,
        hashes.sourceDigest === input.sourceDigest
          ? input.sourceDigest
          : "source digest mismatch between runner and hashes.json"
      )
    );
  } else {
    checks.push(check("source_digest", false, "hashes.json missing"));
  }

  checks.push(
    check(
      "no_network_write",
      !/POST https:\/\/api\.github\.com|git push|gh pr create/i.test(input.logs),
      "Logs show no GitHub write or git push."
    )
  );

  const passed = checks.every((item) => item.passed);
  return {
    passed,
    checks,
    summary: passed
      ? "Independent verifier: the work holds."
      : "Independent verifier: the work does not hold.",
  };
}
