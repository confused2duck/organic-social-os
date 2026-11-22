#!/usr/bin/env python
"""
Extract the organic-social activity register from the Martech Meerkat workbook.

Source of truth:
    Martech_Meerkat_SME_Operating_System_Automation_Register.xlsx  (sheet: Automation Register)

Outputs (deterministic JSON, committed so `npm run db:seed` needs no Python):
    prisma/data/activity-register.json   - all 605 social-domain activities, each with:
        the preserved Excel ID + 16 source fields, a scope tag
        (organic | paid | leadgen), and a mapping to one of the 7 agent systems (A..G).
    prisma/data/agent-catalog.json       - the organic specialist agents, grouped by
        agent system, with activity counts and domains.

Run:  python scripts/extract_register.py
"""
import sys, os, json, collections
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "Martech_Meerkat_SME_Operating_System_Automation_Register.xlsx")
OUT_DIR = os.path.join(ROOT, "prisma", "data")

SOCIAL_DOMAINS = {
    "Instagram Marketing",
    "LinkedIn Marketing",
    "TikTok Organic & Paid Marketing",
    "YouTube Marketing & Video SEO",
    "Facebook & Messenger Marketing",
    "Influencer, Creator & UGC Operations",
}

# Platform inference from domain
DOMAIN_PLATFORM = {
    "Instagram Marketing": "INSTAGRAM",
    "LinkedIn Marketing": "LINKEDIN",
    "TikTok Organic & Paid Marketing": "TIKTOK",
    "YouTube Marketing & Video SEO": "YOUTUBE",
    "Facebook & Messenger Marketing": "FACEBOOK",
    "Influencer, Creator & UGC Operations": "CROSS_PLATFORM",
}


def classify_scope(agent, workstream, activity, track):
    agent_l = agent.lower()
    blob = " ".join([agent_l, workstream.lower(), activity.lower(), track.lower()])
    paid = ["ads agent", " ad ", "paid ", "advertis", "campaign budget",
            "bid ", "bidding", "ad spend", "ppc", "boosted"]
    lead = ["prospect", "outbound", "cold ", "lead scoring", "lead qualif",
            "sales navigator", "social selling", "connection request", "inmail", "prospecting"]
    if "ads agent" in agent_l or any(m in blob for m in paid):
        return "paid"
    if "prospecting agent" in agent_l or any(m in blob for m in lead):
        return "leadgen"
    return "organic"


def agent_system(workstream, activity, agent):
    """Map an activity to one of the 7 agent systems (A..G). Order matters."""
    w = workstream.lower()
    a = agent.lower()
    act = activity.lower()
    # C/G — analytics & reporting
    if "analytics" in w or "performance reporting" in w or "reporting" in w:
        if any(k in act for k in ["report", "weekly", "summary", "recommend", "present", "dashboard", "insight brief"]):
            return "G"  # Reporting & Optimisation
        return "C"      # Performance Intelligence
    # D — strategy & calendar
    if any(k in w for k in ["strategy", "content calendar", "planning", "content strategy"]):
        return "D"
    # B — research & trends / competitor / discoverability
    if any(k in w for k in ["competitor", "discoverability", "seo", "research"]) or "intelligence" in a:
        return "B"
    # E — creative production
    if any(k in w for k in ["content creation", "feed post", "reel", "carousel", "stories", "video", "thought leadership"]) \
       or any(k in a for k in ["creative", "design", "video", "content studio", "short-form"]):
        return "E"
    # A — brand intelligence (profile setup/optimisation of brand presence)
    if "setup" in w or ("optimisation" in w and "account" in w):
        return "A"
    # F — publishing & community (default for engagement/ops/growth/distribution)
    return "F"


SYSTEM_NAMES = {
    "A": "Brand Intelligence",
    "B": "Research & Trends",
    "C": "Performance Intelligence",
    "D": "Strategy & Calendar",
    "E": "Creative Production",
    "F": "Publishing & Community",
    "G": "Reporting & Optimisation",
}


def main():
    wb = openpyxl.load_workbook(XLSX, read_only=True, data_only=True)
    ws = wb["Automation Register"]
    rows = ws.iter_rows(min_row=1, values_only=True)
    header = [str(h).strip() if h is not None else "" for h in next(rows)]
    idx = {h: i for i, h in enumerate(header)}

    def g(row, name):
        i = idx.get(name)
        if i is None or i >= len(row):
            return ""
        v = row[i]
        return str(v).strip() if v is not None else ""

    records = []
    for row in rows:
        if row is None or not g(row, "ID"):
            continue
        if g(row, "Domain") not in SOCIAL_DOMAINS:
            continue
        domain = g(row, "Domain")
        agent = g(row, "Assigned agent")
        workstream = g(row, "Workstream")
        activity = g(row, "Activity (verbatim)")
        track = g(row, "Track")
        scope = classify_scope(agent, workstream, activity, track)
        system = agent_system(workstream, activity, agent) if scope == "organic" else None
        records.append({
            "excelId": g(row, "ID"),
            "sourceParagraph": g(row, "Source paragraph"),
            "itemType": g(row, "Item type"),
            "domain": domain,
            "platform": DOMAIN_PLATFORM.get(domain, "CROSS_PLATFORM"),
            "workstream": workstream,
            "track": track,
            "activity": activity,
            "assignedAgent": agent,
            "executionMode": g(row, "Execution mode"),
            "trigger": g(row, "Trigger"),
            "integrations": g(row, "Suggested integrations"),
            "output": g(row, "Output / evidence"),
            "kpi": g(row, "Quality metric / KPI"),
            "guardrail": g(row, "Control / guardrail"),
            "releaseWave": g(row, "Release wave"),
            "scope": scope,
            "agentSystem": system,
        })

    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "activity-register.json"), "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=1)

    # Build agent catalog from ORGANIC activities.
    organic = [r for r in records if r["scope"] == "organic"]
    agent_rows = collections.defaultdict(lambda: {"count": 0, "domains": set(), "systems": collections.Counter(), "workstreams": set()})
    for r in organic:
        a = agent_rows[r["assignedAgent"]]
        a["count"] += 1
        a["domains"].add(r["domain"])
        a["systems"][r["agentSystem"]] += 1
        a["workstreams"].add(r["workstream"])

    catalog = []
    for name, info in sorted(agent_rows.items(), key=lambda kv: -kv[1]["count"]):
        primary = info["systems"].most_common(1)[0][0]
        key = (name.lower().replace("&", "and").replace("/", " ")
               .replace("  ", " ").strip().replace(" ", "_").replace("-", "_"))
        key = key.replace("__", "_")
        catalog.append({
            "key": key,
            "name": name,
            "agentSystem": primary,
            "agentSystemName": SYSTEM_NAMES[primary],
            "activityCount": info["count"],
            "domains": sorted(info["domains"]),
            "workstreams": sorted(info["workstreams"]),
        })

    with open(os.path.join(OUT_DIR, "agent-catalog.json"), "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=1)

    # Summary to stdout
    scope_counts = collections.Counter(r["scope"] for r in records)
    sys_counts = collections.Counter(r["agentSystem"] for r in organic)
    print(f"social records: {len(records)}  ({dict(scope_counts)})")
    print(f"organic agents: {len(catalog)}")
    print("organic by agent system:")
    for s in "ABCDEFG":
        print(f"  {s} {SYSTEM_NAMES[s]:<26} {sys_counts.get(s, 0)}")


if __name__ == "__main__":
    main()
