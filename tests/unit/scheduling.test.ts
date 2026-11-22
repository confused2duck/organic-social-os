import { describe, it, expect } from "vitest";
import { computeWeeklySlots, generateWeekSlots, startOfWeek, type PublishingConfig } from "@/lib/scheduling";

const northwind: PublishingConfig = {
  platforms: ["LINKEDIN", "INSTAGRAM"],
  postsPerDay: { LINKEDIN: 3, INSTAGRAM: 3 },
  publishingDays: [1, 2, 3, 4, 5],
  preferredTimes: { LINKEDIN: ["08:30", "12:30", "17:00"], INSTAGRAM: ["09:00", "13:00", "18:00"] },
  timezone: "Europe/London",
};

const verde: PublishingConfig = {
  platforms: ["INSTAGRAM", "FACEBOOK", "TIKTOK"],
  postsPerDay: { INSTAGRAM: 2, FACEBOOK: 1, TIKTOK: 1 },
  publishingDays: [1, 3, 5],
  preferredTimes: {},
  timezone: "America/New_York",
};

describe("computeWeeklySlots", () => {
  it("matches the brief's example: 3/day × 2 platforms × 5 days = 30", () => {
    const plan = computeWeeklySlots(northwind);
    expect(plan.total).toBe(30);
    expect(plan.perPlatform.find((p) => p.platform === "LINKEDIN")?.perWeek).toBe(15);
  });

  it("recomputes when configuration changes (Verde: (2+1+1)×3 = 12)", () => {
    expect(computeWeeklySlots(verde).total).toBe(12);
  });

  it("zero publishing days yields zero slots", () => {
    expect(computeWeeklySlots({ ...northwind, publishingDays: [] }).total).toBe(0);
  });

  it("changing posts/day updates the total", () => {
    expect(computeWeeklySlots({ ...northwind, postsPerDay: { LINKEDIN: 1, INSTAGRAM: 1 } }).total).toBe(10);
  });
});

describe("generateWeekSlots", () => {
  it("generates exactly the computed number of concrete slots", () => {
    const start = startOfWeek(new Date("2026-11-23T00:00:00Z"));
    expect(generateWeekSlots(northwind, start)).toHaveLength(30);
    expect(generateWeekSlots(verde, start)).toHaveLength(12);
  });

  it("only schedules on configured publishing days", () => {
    const start = startOfWeek(new Date("2026-11-23T00:00:00Z"));
    const slots = generateWeekSlots(northwind, start);
    for (const s of slots) {
      // getDay(): 1..5 (Mon–Fri) only
      expect(northwind.publishingDays).toContain(s.date.getDay());
    }
  });

  it("slots are chronologically ordered", () => {
    const start = startOfWeek(new Date("2026-11-23T00:00:00Z"));
    const slots = generateWeekSlots(verde, start);
    for (let i = 1; i < slots.length; i++) {
      expect(slots[i].date.getTime()).toBeGreaterThanOrEqual(slots[i - 1].date.getTime());
    }
  });
});
