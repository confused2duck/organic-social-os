/**
 * Read-only Instagram connection check from the CLI, using the real integration
 * module. Validates a token against the live Graph API and prints the resolved
 * account / media / insights. Never publishes. Credentials come from env:
 *
 *   INSTAGRAM_TEST_ACCESS_TOKEN=... INSTAGRAM_TEST_ACCOUNT_ID=... \
 *     npx tsx scripts/ig-verify.ts
 */
import { verifyConnection, flavorForToken } from "../src/lib/integrations/instagram";

async function main() {
  const token = process.env.INSTAGRAM_TEST_ACCESS_TOKEN?.trim();
  const igId = process.env.INSTAGRAM_TEST_ACCOUNT_ID?.trim();
  if (!token) {
    console.error("Set INSTAGRAM_TEST_ACCESS_TOKEN (and INSTAGRAM_TEST_ACCOUNT_ID for the Facebook-login flow).");
    process.exit(1);
  }
  const flavor = flavorForToken(token);
  const v = await verifyConnection(token, {
    flavor,
    igId: flavor === "facebook_login" ? igId : undefined,
    withMedia: true,
    withInsights: true,
  });
  console.log(
    JSON.stringify(
      {
        flavor,
        ok: v.ok,
        error: v.error ?? null,
        account: v.account
          ? {
              id: v.account.id,
              username: v.account.username,
              name: v.account.name,
              followers: v.account.followersCount,
              follows: v.account.followsCount,
              media: v.account.mediaCount,
            }
          : null,
        capabilities: v.capabilities,
        insights: v.insights,
        recentMediaCount: v.recentMedia?.length ?? 0,
      },
      null,
      1,
    ),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
