"use server";

import { revalidatePath } from "next/cache";
import { requireCompany } from "@/lib/tenant";
import { renderCreative, renderAllForCompany } from "@/lib/render";
import { runCreativeSpecs } from "@/lib/agents";

export async function renderCreativeAction(creativeId: string) {
  const company = await requireCompany();
  const result = await renderCreative(creativeId, company.id);
  revalidatePath("/creative");
  revalidatePath("/content");
  return { ok: result.capabilityState !== "blocked", result };
}

export async function renderAllAction() {
  const company = await requireCompany();
  const result = await renderAllForCompany(company.id);
  revalidatePath("/creative");
  return { ok: true as const, result };
}

/** Regenerate creative specs for any posts missing them, then render. */
export async function generateAndRenderAction() {
  const company = await requireCompany();
  const spec = await runCreativeSpecs(company.id);
  const render = await renderAllForCompany(company.id);
  revalidatePath("/creative");
  return { ok: true as const, spec, render };
}
