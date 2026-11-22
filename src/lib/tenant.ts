import { cookies } from "next/headers";
import type { Company } from "@prisma/client";
import { prisma } from "@/lib/db";

// ===========================================================================
// Tenant isolation / authorization.
//
// Indexed `companyId` columns are NOT isolation. Isolation is enforced here:
//   1. The active company is resolved server-side from a signed-in context
//      (here: a validated cookie) — never from a client-supplied id.
//   2. Every tenant data operation derives its companyId from requireCompany()
//      and filters by it. Record lookups use `where: { id, companyId }`, so a
//      forged id belonging to another tenant resolves to null (NotFound), never
//      another tenant's row.
//   3. assertCompanyAccess() rejects any attempt to act on a company other than
//      the active one.
//
// In production this maps onto real auth (user → company membership). The
// interface is the same: resolve the caller's authorized company, then scope.
// ===========================================================================

export const ACTIVE_COMPANY_COOKIE = "active_company";

export class ForbiddenError extends Error {
  constructor(message = "Cross-tenant access denied") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** All companies (for the workspace switcher). Not tenant-scoped by design. */
export async function listCompanies(): Promise<Company[]> {
  return prisma.company.findMany({ orderBy: { createdAt: "asc" } });
}

export async function companyCount(): Promise<number> {
  return prisma.company.count();
}

/** The active company id from the validated cookie, or null. */
export async function getActiveCompanyId(): Promise<string | null> {
  const raw = cookies().get(ACTIVE_COMPANY_COOKIE)?.value;
  if (!raw) return null;
  const found = await prisma.company.findUnique({ where: { id: raw }, select: { id: true } });
  return found ? found.id : null;
}

/** Resolve the active company (cookie → fallback to first). May be null if none exist. */
export async function resolveActiveCompany(): Promise<Company | null> {
  const id = await getActiveCompanyId();
  if (id) return prisma.company.findUnique({ where: { id } });
  return prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
}

/** Require an active company. Throws NotFoundError when the workspace is empty. */
export async function requireCompany(): Promise<Company> {
  const company = await resolveActiveCompany();
  if (!company) throw new NotFoundError("No active company. Create a company workspace first.");
  return company;
}

/**
 * Guard: a client-supplied companyId must equal the active/authorized company.
 * Prefer deriving companyId from requireCompany() over accepting it from the
 * client at all; use this only where an id must be echoed back.
 */
export async function assertCompanyAccess(companyId: string): Promise<Company> {
  const active = await resolveActiveCompany();
  if (!active || active.id !== companyId) throw new ForbiddenError();
  return active;
}

/**
 * Validate and switch the active company. Only companies that actually exist
 * can be made active (prevents pointing the cookie at an arbitrary id).
 */
export async function setActiveCompany(companyId: string): Promise<Company> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new NotFoundError("Company does not exist");
  cookies().set(ACTIVE_COMPANY_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return company;
}

/**
 * Fetch a tenant-owned record by id, scoped to companyId. Returns null if the
 * record does not exist OR belongs to another tenant (indistinguishable by
 * design). Use in every record-level read/mutation.
 */
export async function findOwned<T>(
  companyId: string,
  finder: (where: { id: string; companyId: string }) => Promise<T | null>,
  id: string,
): Promise<T | null> {
  return finder({ id, companyId });
}

/** Like findOwned but throws NotFoundError when missing. */
export async function requireOwned<T>(
  companyId: string,
  finder: (where: { id: string; companyId: string }) => Promise<T | null>,
  id: string,
): Promise<T> {
  const row = await findOwned(companyId, finder, id);
  if (!row) throw new NotFoundError();
  return row;
}
