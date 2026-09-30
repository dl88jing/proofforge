import { HOUSEHOLD } from "@/lib/household";
import { insertCredit, upsertReputation } from "@/lib/db/queries";
import { newId, nowIso } from "@/lib/ids";
import { appendEvent } from "@/lib/events/chain";

export const ACCEPTED_CREDIT = 25;

export function grantAcceptedCredit(missionId: string, packId: string) {
  const credit = {
    id: newId("crd"),
    mission_id: missionId,
    pack_id: packId,
    contributor: HOUSEHOLD.operators.morgan.name,
    amount: ACCEPTED_CREDIT,
    kind: "accepted_proof",
    created_at: nowIso(),
  };
  insertCredit(credit);
  upsertReputation(HOUSEHOLD.operators.morgan.name, {
    score: ACCEPTED_CREDIT,
    accepted_count: 1,
  });
  upsertReputation(HOUSEHOLD.operators.avery.name, {
    score: 5,
    accepted_count: 1,
  });
  upsertReputation(HOUSEHOLD.nodeId, {
    score: 10,
    accepted_count: 1,
  });
  appendEvent("credit.granted", missionId, {
    contributor: credit.contributor,
    amount: credit.amount,
    packId,
  });
  return credit;
}

export function recordRejection(): void {
  upsertReputation(HOUSEHOLD.operators.morgan.name, {
    score: -2,
    rejected_count: 1,
  });
  upsertReputation(HOUSEHOLD.operators.avery.name, { rejected_count: 1 });
}

export function recordSettlement(): void {
  upsertReputation(HOUSEHOLD.operators.morgan.name, {
    score: 5,
    settled_count: 1,
  });
  upsertReputation(HOUSEHOLD.operators.avery.name, { settled_count: 1 });
  upsertReputation(HOUSEHOLD.nodeId, { settled_count: 1 });
}
