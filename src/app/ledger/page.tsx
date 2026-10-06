import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ledgerSnapshot } from "@/lib/pipeline";
import { hydrateStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  await hydrateStore();
  const ledger = ledgerSnapshot();
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Household state</p>
        <h1 className="font-heading text-4xl">Credit & reputation</h1>
        <p className="mt-2 text-muted-foreground">
          Credit is created only after Avery accepts a Proof Pack. Settlement is a separate Solana
          transaction, not a spreadsheet cell.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reputation</CardTitle>
            <CardDescription>Avery, Morgan, and the proof node.</CardDescription>
          </CardHeader>
          <CardContent>
            {ledger.reputation.length === 0 ? (
              <p className="text-sm text-muted-foreground">The reputation table is currently empty.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-2">Actor</th>
                    <th>Score</th>
                    <th>Accepted</th>
                    <th>Settled</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.reputation.map((row) => (
                    <tr key={row.actor} className="border-t border-border/60">
                      <td className="py-2">{row.actor}</td>
                      <td>{row.score}</td>
                      <td>{row.accepted_count}</td>
                      <td>{row.settled_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Credits</CardTitle>
            <CardDescription>Accepted-proof units.</CardDescription>
          </CardHeader>
          <CardContent>
            {ledger.credits.length === 0 ? (
              <p className="text-sm text-muted-foreground">The credits table is currently empty.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {ledger.credits.map((credit) => (
                  <li key={credit.id} className="flex justify-between gap-3">
                    <span>
                      {credit.contributor} · {credit.kind}
                    </span>
                    <span className="font-mono">+{credit.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
          <CardDescription>Signed Solana transfer + memo after accept.</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.settlements.length === 0 ? (
            <p className="text-sm text-muted-foreground">The settlements table is currently empty.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {ledger.settlements.map((item) => (
                <li key={item.id} className="rounded-md border border-border/70 p-3">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium">{item.status}</span>
                    <span>
                      {item.lamports} lamports · {item.cluster}
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-xs">{item.signature ?? "no signature"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.memo}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event chain</CardTitle>
          <CardDescription>Hash-linked household record.</CardDescription>
        </CardHeader>
        <CardContent>
          {ledger.events.length === 0 ? (
            <p className="text-sm text-muted-foreground">The event chain is currently empty.</p>
          ) : (
            <ol className="space-y-2 text-xs">
              {ledger.events.map((event) => (
                <li key={event.seq} className="break-all font-mono">
                  {event.seq} {event.kind} {event.hash}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
