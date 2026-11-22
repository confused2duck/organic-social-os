import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AGENT_SYSTEMS, type AgentSystemId } from "@/lib/agent-systems";

export const dynamic = "force-dynamic";

const SCOPE_TONE = { organic: "success", paid: "muted", leadgen: "muted" } as const;

// Genuinely implemented & tested CAPABILITIES (capability-level, not per-activity).
// These are honest: each cites the test/verification that covers it.
const IMPLEMENTED_CAPABILITIES: { name: string; system: string; status: string; tone: "success" | "warning"; evidence: string }[] = [
  { name: "Brand intelligence capture & editing", system: "A", status: "Implemented", tone: "success", evidence: "Full CRUD UI; Playwright brand-flow test" },
  { name: "Deterministic research from brand data", system: "B", status: "Implemented", tone: "success", evidence: "Consumes products/ICP/personas; flags missing info" },
  { name: "Analytics calculations", system: "C", status: "Implemented", tone: "success", evidence: "audit-probe: totals = raw sums exactly" },
  { name: "Config-driven calendar generation", system: "D", status: "Implemented", tone: "success", evidence: "Vitest scheduling (30-slot) + Playwright" },
  { name: "Creative rendering (PNG/carousel/MP4)", system: "E", status: "Implemented", tone: "success", evidence: "audit-probe: valid PNG + h264 MP4" },
  { name: "Scheduling, approvals, publish-queue", system: "F", status: "Partial", tone: "warning", evidence: "Real queue; external publishing needs credentials" },
  { name: "Weekly report generation", system: "G", status: "Implemented", tone: "success", evidence: "Real HTML report; email needs SMTP" },
];

export default async function TraceabilityPage({ searchParams }: { searchParams: { scope?: string; system?: string } }) {
  const scope = searchParams.scope ?? "organic";
  const system = searchParams.system;

  const where: { scope?: string; agentSystem?: string } = {};
  if (scope !== "all") where.scope = scope;
  if (system) where.agentSystem = system;

  const [total, organic, paid, leadgen, bySystem, rows] = await Promise.all([
    prisma.activityCatalog.count(),
    prisma.activityCatalog.count({ where: { scope: "organic" } }),
    prisma.activityCatalog.count({ where: { scope: "paid" } }),
    prisma.activityCatalog.count({ where: { scope: "leadgen" } }),
    prisma.activityCatalog.groupBy({ by: ["agentSystem"], where: { scope: "organic" }, _count: true }),
    prisma.activityCatalog.findMany({ where, orderBy: { excelId: "asc" }, take: 150 }),
  ]);
  const matched = await prisma.activityCatalog.count({ where });
  const sysCount = Object.fromEntries(bySystem.map((s) => [s.agentSystem, s._count]));

  return (
    <div>
      <PageHeader title="Traceability" description="Every social-media activity from the Martech Meerkat automation register, with its original Excel ID mapped to a responsible agent system. Paid and lead-gen activities are retained but marked out of scope." />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground">Social activities</p><p className="text-2xl font-semibold">{total}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Organic (in scope)</p><p className="text-2xl font-semibold text-success">{organic}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Paid (deferred)</p><p className="text-2xl font-semibold text-muted-foreground">{paid}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground">Lead-gen (deferred)</p><p className="text-2xl font-semibold text-muted-foreground">{leadgen}</p></Card>
      </div>

      <Card className="mb-5 border-primary/20 bg-primary/5">
        <CardContent className="p-4 text-sm">
          <p className="font-medium">Mapping is traceability, not implementation.</p>
          <p className="mt-1 text-muted-foreground">
            All {total} activities are <b>mapped</b> to an agent system ({matched > 0 ? "" : ""}implementation status
            below is <b>mapped</b> for every row — none is auto-marked implemented just because its agent category exists).
            What is genuinely <b>implemented &amp; tested</b> is the set of capabilities that subsume many of these
            activities, listed here:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {IMPLEMENTED_CAPABILITIES.map((c) => (
              <div key={c.name} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                <Badge tone={c.tone}>{c.status}</Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.name} <span className="text-xs text-muted-foreground">({c.system})</span></p>
                  <p className="text-xs text-muted-foreground">{c.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-5">
        <CardContent className="flex flex-wrap gap-2 p-4">
          {(Object.keys(AGENT_SYSTEMS) as AgentSystemId[]).map((id) => (
            <Link key={id} href={`/traceability?scope=organic&system=${id}`}
              className={`rounded-md border px-3 py-1.5 text-sm ${system === id ? "border-primary bg-primary/10" : "hover:bg-secondary"}`}>
              <span className="font-semibold">{id}</span> {AGENT_SYSTEMS[id].name} <Badge tone="muted" className="ml-1">{sysCount[id] ?? 0}</Badge>
            </Link>
          ))}
          <Link href="/traceability?scope=organic" className="rounded-md border px-3 py-1.5 text-sm hover:bg-secondary">All organic</Link>
        </CardContent>
      </Card>

      <div className="mb-3 flex flex-wrap gap-2 text-sm">
        {["organic", "paid", "leadgen", "all"].map((s) => (
          <Link key={s} href={`/traceability?scope=${s}`} className={`rounded-full border px-3 py-1 capitalize ${scope === s ? "border-primary bg-primary/10" : "hover:bg-secondary"}`}>{s}</Link>
        ))}
        <span className="ml-auto self-center text-muted-foreground">{matched} activities{matched > rows.length ? ` (showing ${rows.length})` : ""}</span>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2">Excel ID</th><th className="px-2">Activity</th><th className="px-2">Agent</th><th className="px-2">System</th><th className="px-2">Scope</th><th className="px-2">Status</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 align-top">
                  <td className="px-3 py-2 font-mono text-xs">{r.excelId}</td>
                  <td className="px-2 py-2"><span className="line-clamp-2">{r.activity}</span><span className="text-xs text-muted-foreground">{r.domain} · {r.workstream}</span></td>
                  <td className="px-2 py-2 text-xs">{r.assignedAgent}</td>
                  <td className="px-2 py-2">{r.agentSystem ? <Badge tone="info">{r.agentSystem}</Badge> : "—"}</td>
                  <td className="px-2 py-2"><Badge tone={SCOPE_TONE[r.scope as keyof typeof SCOPE_TONE] ?? "muted"}>{r.scope}</Badge></td>
                  <td className="px-2 py-2"><Badge tone="muted">{r.implementationStatus === "planned" ? "mapped" : r.implementationStatus}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
