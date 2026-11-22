"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCompany, NotFoundError } from "@/lib/tenant";

/**
 * Mark a community message as replied. NOTE: this records the manual action —
 * actually sending a reply to the platform requires an authorised connection,
 * which is not available in this build, so nothing is sent externally.
 */
export async function markRepliedAction(messageId: string) {
  const company = await requireCompany();
  const msg = await prisma.communityMessage.findFirst({ where: { id: messageId, companyId: company.id } });
  if (!msg) throw new NotFoundError("Message not found");
  await prisma.communityMessage.update({ where: { id: msg.id }, data: { status: "replied" } });
  revalidatePath("/inbox");
  return { ok: true as const };
}

export async function ignoreMessageAction(messageId: string) {
  const company = await requireCompany();
  const msg = await prisma.communityMessage.findFirst({ where: { id: messageId, companyId: company.id } });
  if (!msg) throw new NotFoundError("Message not found");
  await prisma.communityMessage.update({ where: { id: msg.id }, data: { status: "ignored" } });
  revalidatePath("/inbox");
  return { ok: true as const };
}
