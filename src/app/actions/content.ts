"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCompany, NotFoundError } from "@/lib/tenant";

/** Resolve a post owned by the active company, or throw (tenant isolation). */
async function ownedPost(postId: string) {
  const company = await requireCompany();
  const post = await prisma.contentPost.findFirst({ where: { id: postId, companyId: company.id } });
  if (!post) throw new NotFoundError("Post not found");
  return { company, post };
}

export async function approvePostAction(postId: string) {
  const { company, post } = await ownedPost(postId);
  const config = await prisma.companyConfig.findUnique({ where: { companyId: company.id } });
  const nextStatus = config?.autopublish ? "scheduled" : "approved";

  await prisma.$transaction([
    prisma.approval.updateMany({
      where: { companyId: company.id, postId: post.id, status: "pending" },
      data: { status: "approved", decidedAt: new Date(), decidedBy: "operator" },
    }),
    prisma.contentPost.update({ where: { id: post.id }, data: { status: nextStatus } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true as const, status: nextStatus };
}

export async function rejectPostAction(postId: string, reason?: string) {
  const { company, post } = await ownedPost(postId);
  await prisma.$transaction([
    prisma.approval.updateMany({
      where: { companyId: company.id, postId: post.id, status: "pending" },
      data: { status: "rejected", decidedAt: new Date(), decidedBy: "operator", notes: reason ?? null },
    }),
    prisma.contentPost.update({ where: { id: post.id }, data: { status: "rejected" } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function submitForApprovalAction(postId: string) {
  const { company, post } = await ownedPost(postId);
  await prisma.$transaction([
    prisma.contentPost.update({ where: { id: post.id }, data: { status: "awaiting_approval" } }),
    prisma.approval.create({ data: { companyId: company.id, entityType: "post", postId: post.id, entityId: post.id, status: "pending" } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true as const };
}

const updateSchema = z.object({
  topic: z.string().min(1).max(200).optional(),
  caption: z.string().max(3000).optional(),
  mainMessage: z.string().max(1000).optional(),
  hashtags: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export async function updatePostAction(postId: string, input: z.infer<typeof updateSchema>) {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { post } = await ownedPost(postId);
  const data: Record<string, unknown> = {};
  if (parsed.data.topic !== undefined) data.topic = parsed.data.topic;
  if (parsed.data.caption !== undefined) data.caption = parsed.data.caption;
  if (parsed.data.mainMessage !== undefined) data.mainMessage = parsed.data.mainMessage;
  if (parsed.data.hashtags !== undefined) data.hashtags = JSON.stringify(parsed.data.hashtags);
  if (parsed.data.scheduledFor !== undefined) data.scheduledFor = new Date(parsed.data.scheduledFor);
  await prisma.contentPost.update({ where: { id: post.id }, data });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/**
 * Queue a post for publishing. With no authorised platform connection this
 * resolves to the honest `blocked` state — no external post ID/URL is invented.
 */
export async function queuePublishAction(postId: string) {
  const { company, post } = await ownedPost(postId);
  const connection = await prisma.platformConnection.findFirst({
    where: { companyId: company.id, platform: post.platform },
  });

  const connected = connection?.status === "connected";
  if (!connected) {
    await prisma.publishAttempt.create({
      data: {
        companyId: company.id,
        postId: post.id,
        connectionId: connection?.id ?? null,
        platform: post.platform,
        status: "blocked",
        verified: false,
        idempotencyKey: `pub-${post.id}-${Date.now()}`,
        error: "Publishing blocked: no authorised platform connection. Connect the account to enable publishing.",
      },
    });
    await prisma.contentPost.update({ where: { id: post.id }, data: { status: "blocked" } });
    revalidatePath("/", "layout");
    return { ok: false as const, status: "blocked" as const, reason: "No authorised platform connection." };
  }

  // A real connection would perform an authorised publish + verification here.
  await prisma.contentPost.update({ where: { id: post.id }, data: { status: "publishing" } });
  revalidatePath("/", "layout");
  return { ok: true as const, status: "publishing" as const };
}
