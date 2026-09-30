import type { GithubSource, MissionBounds } from "@/lib/types";

const CHECKBOX_RE = /^\s*[-*]\s*\[[ xX]\]\s+(.+)$/gm;
const ACCEPT_HEADER_RE = /(?:acceptance criteria|definition of done|success criteria)\s*[:\n]/i;

export const DEFAULT_BOUNDS: MissionBounds = {
  maxMinutes: 30,
  execution: "local-evidence-only",
  writes: "none",
  network: ["github-read", "solana-rpc-after-accept"],
  humanGates: ["submit", "accept", "settle"],
};

export function firstParagraph(body: string): string {
  const cleaned = body.replace(/\r/g, "").trim();
  if (!cleaned) return "";
  const block = cleaned.split(/\n\s*\n/)[0] ?? "";
  return block.replace(/\s+/g, " ").trim().slice(0, 480);
}

export function extractAcceptance(source: GithubSource): string[] {
  const body = source.body || "";
  const boxes = [...body.matchAll(CHECKBOX_RE)].map((match) => match[1].trim());
  if (boxes.length > 0) return boxes.slice(0, 8);

  const header = body.search(ACCEPT_HEADER_RE);
  if (header >= 0) {
    const after = body.slice(header).split("\n").slice(1, 12);
    const bullets = after
      .map((line) => line.replace(/^\s*[-*]\s+/, "").trim())
      .filter((line) => line.length > 4 && !line.startsWith("#"));
    if (bullets.length > 0) return bullets.slice(0, 8);
  }

  const fromLabels = source.labels
    .filter((label) => /docs|bug|bounty|good first issue|help wanted/i.test(label))
    .map((label) => `Satisfy the ${label} intent described in the source.`);

  const generated = [
    `Restate the work from ${source.owner ?? "the source"}/${source.repo ?? "url"}#${source.number ?? "n"} as a bounded evidence mission.`,
    "Collect local artifacts and hashes without writing back to GitHub.",
    "Produce a Proof Pack a maintainer can accept or reject.",
    ...fromLabels,
  ];
  return generated.slice(0, 6);
}

export function rewardFromSource(source: GithubSource): string {
  const haystack = `${source.title} ${source.body} ${source.labels.join(" ")}`;
  const money = haystack.match(/\$\s?(\d+(?:,\d{3})*(?:\.\d+)?)/);
  if (money) return `$${money[1]} bounty (off-platform until settle)`;
  const sol = haystack.match(/(\d+(?:\.\d+)?)\s*SOL/i);
  if (sol) return `${sol[1]} SOL bounty (settle after accept)`;
  if (source.labels.some((label) => /bounty/i.test(label))) {
    return "Labeled bounty — amount unspecified";
  }
  return "Household credit + optional Solana settle";
}

export function boundMission(source: GithubSource): {
  title: string;
  objective: string;
  bounds: MissionBounds;
  acceptance: string[];
  rewardLabel: string;
} {
  const objective =
    firstParagraph(source.body) ||
    `Produce maintainer-safe evidence for: ${source.title}`;
  return {
    title: source.title.replace(/\s+/g, " ").trim(),
    objective,
    bounds: DEFAULT_BOUNDS,
    acceptance: extractAcceptance(source),
    rewardLabel: rewardFromSource(source),
  };
}
