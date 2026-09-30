import { IntakeForm } from "@/components/intake-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function IntakePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Step 1</p>
        <h1 className="font-heading text-4xl">Mission intake</h1>
        <p className="mt-2 text-muted-foreground">
          Import a public GitHub issue or bounty URL. ProofForge fetches metadata, scans policy, and
          bounds a local evidence mission. Nothing is posted back to GitHub.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Source URL</CardTitle>
          <CardDescription>
            GitHub issue, pull, or any https bounty link. Vague bounties still bound, with thinner
            acceptance criteria.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IntakeForm />
        </CardContent>
      </Card>
    </div>
  );
}
