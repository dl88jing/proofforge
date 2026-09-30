import { digestOf } from "@/lib/hash";
import { insertEvent, latestEvent } from "@/lib/db/queries";
import type { EventKind } from "@/lib/types";

const GENESIS = "sha256:northbridge-proof-genesis";

export function appendEvent(kind: EventKind, missionId: string | null, payload: unknown) {
  const prev = latestEvent();
  const seq = (prev?.seq ?? 0) + 1;
  const prevHash = prev?.hash ?? GENESIS;
  const envelope = {
    seq,
    kind,
    missionId,
    payload,
    prevHash,
  };
  const hash = digestOf(envelope);
  return insertEvent({
    seq,
    kind,
    missionId,
    payloadJson: JSON.stringify(payload),
    prevHash,
    hash,
  });
}
