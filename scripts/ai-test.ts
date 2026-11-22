import { getAiStatus, aiJson } from "@/lib/ai";

async function main() {
  const status = await getAiStatus(true);
  console.log("AI status:", JSON.stringify(status));
  if (!status.available) { console.log("No runtime — deterministic fallback would be used."); return; }

  const t = Date.now();
  const res = await aiJson<{ caption: string; hashtags: string[] }>(
    "You are an organic social copywriter. Return only JSON with keys caption and hashtags (array). Never invent facts.",
    'Write a LinkedIn caption (<=40 words) for "Northwind Dashboards" — same-day analytics dashboards for SMEs. 3 hashtags.',
    { maxTokens: 180, temperature: 0.4 },
  );
  console.log(`elapsed ${((Date.now() - t) / 1000).toFixed(1)}s`);
  if (res.ok) {
    console.log("model:", res.model, "tokens:", res.tokens);
    console.log("caption:", res.data.caption);
    console.log("hashtags:", res.data.hashtags);
    console.log("REAL INFERENCE: PASS");
  } else {
    console.log("inference failed:", res.reason);
    process.exit(1);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
