import { Badge } from "@/components/ui/badge";
import { POST_STATUS_META, type PostStatus } from "@/lib/enums";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "muted";

const GENERIC: Record<string, { label: string; tone: Tone }> = {
  // connections
  not_connected: { label: "Not connected", tone: "muted" },
  connected: { label: "Connected", tone: "success" },
  blocked: { label: "Blocked", tone: "warning" },
  unavailable: { label: "Unavailable", tone: "muted" },
  // tasks
  pending: { label: "Pending", tone: "neutral" },
  processing: { label: "Processing", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  awaiting_approval: { label: "Awaiting approval", tone: "warning" },
  requires_runtime: { label: "Requires runtime", tone: "muted" },
  // creative capability
  draft: { label: "Draft", tone: "neutral" },
  rendered: { label: "Rendered", tone: "success" },
  awaiting_render_runtime: { label: "Awaiting render runtime", tone: "muted" },
  // data source
  test_fixture: { label: "Test fixture", tone: "muted" },
  imported: { label: "Imported", tone: "info" },
  // email
  not_configured: { label: "Not configured", tone: "muted" },
  sent: { label: "Sent", tone: "success" },
  // approvals
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export function StatusBadge({ status }: { status: string }) {
  const post = POST_STATUS_META[status as PostStatus];
  const meta = post ?? GENERIC[status] ?? { label: status, tone: "neutral" as Tone };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
