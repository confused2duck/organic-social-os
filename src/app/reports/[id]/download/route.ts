import { NextResponse } from "next/server";
import { resolveActiveCompany } from "@/lib/tenant";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const company = await resolveActiveCompany();
  if (!company) return new NextResponse("No active company", { status: 403 });

  // Tenant-scoped: a report id from another company resolves to null → 404.
  const report = await prisma.report.findFirst({ where: { id: params.id, companyId: company.id } });
  if (!report || !report.html) return new NextResponse("Report not found", { status: 404 });

  return new NextResponse(report.html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="report-${report.period}.html"`,
    },
  });
}
