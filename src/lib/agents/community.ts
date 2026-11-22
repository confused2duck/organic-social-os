import { prisma } from "@/lib/db";
import { parseStringArray } from "@/lib/json";
import { loadBrandContext } from "./context";
import type { AgentResult } from "./types";

/**
 * Agent F — Community (inbox). Seeds clearly-labelled test_fixture inbound
 * messages and generates on-brand reply DRAFTS (not sent). When a real platform
 * connection exists, genuine messages would replace these fixtures.
 */
export async function runCommunity(companyId: string): Promise<AgentResult> {
  const ctx = await loadBrandContext(companyId);
  const config = await prisma.companyConfig.findUnique({ where: { companyId } });
  const platforms = parseStringArray(config?.platforms);
  if (platforms.length === 0) return { agentSystem: "F", created: 0, notes: "No platforms configured." };

  await prisma.communityMessage.deleteMany({ where: { companyId, source: "test_fixture" } });

  const samples: { kind: string; author: string; text: string; sentiment: string }[] = [
    { kind: "comment", author: "@curious_reader", text: `How is this different from the usual ${ctx.industry ?? "tools"} out there?`, sentiment: "neutral" },
    { kind: "dm", author: "@prospect_pat", text: "Loved this post — do you have a version for smaller teams?", sentiment: "positive" },
    { kind: "comment", author: "@skeptic_sam", text: "Sounds good but where's the proof?", sentiment: "negative" },
    { kind: "mention", author: "@happy_customer", text: `Been using ${ctx.name} for a month — genuinely helpful!`, sentiment: "positive" },
    { kind: "comment", author: "@question_quinn", text: "Is there a free way to try this first?", sentiment: "neutral" },
  ];

  let created = 0;
  for (const s of samples) {
    await prisma.communityMessage.create({
      data: {
        companyId,
        platform: platforms[created % platforms.length],
        kind: s.kind,
        author: s.author,
        text: s.text,
        sentiment: s.sentiment,
        status: "drafted",
        replyDraft: draftReply(s, ctx.name),
        source: "test_fixture",
      },
    });
    created++;
  }

  return { agentSystem: "F", created, notes: `${created} test_fixture inbox items with on-brand reply drafts (not sent).` };
}

function draftReply(s: { sentiment: string; author: string }, brand: string): string {
  if (s.sentiment === "negative") return `Fair question! Here's the proof: [link]. Happy to walk you through a real example — want me to DM one?`;
  if (s.sentiment === "positive") return `Thank you so much — that means a lot to the ${brand} team! 🙌 Anything you'd love to see next?`;
  return `Great question! Short answer: yes. Here's how it works for teams like yours: [link]. Let me know if you'd like a quick demo.`;
}
