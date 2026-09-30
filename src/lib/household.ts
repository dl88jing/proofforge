export const HOUSEHOLD = {
  name: "Northbridge",
  product: "ProofForge",
  tagline: "Proof before payout.",
  nodeId: "northbridge-forge-1",
  operators: {
    avery: {
      id: "avery",
      name: "Avery",
      role: "maintainer",
      blurb: "Accepts proof, signs the household gate, authorizes settle.",
    },
    morgan: {
      id: "morgan",
      name: "Morgan",
      role: "runner",
      blurb: "Imports work, runs the proof node, submits the pack.",
    },
  },
} as const;

export type OperatorId = keyof typeof HOUSEHOLD.operators;
