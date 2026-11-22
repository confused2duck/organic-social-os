import { WEEKDAYS, type Platform } from "@/lib/enums";

export interface PublishingConfig {
  platforms: string[];
  postsPerDay: Record<string, number>;
  publishingDays: number[]; // 0=Sun..6=Sat
  preferredTimes: Record<string, string[]>;
  timezone: string;
}

export interface SlotPlan {
  total: number;
  perPlatform: { platform: string; perDay: number; perWeek: number }[];
  publishingDays: number[];
  publishingDayLabels: string[];
}

/**
 * Deterministic weekly publishing-slot calculation driven by company config.
 * Example from the brief: 3 posts/day on 2 platforms for 5 publishing days = 30.
 */
export function computeWeeklySlots(config: PublishingConfig): SlotPlan {
  const days = Array.isArray(config.publishingDays) ? config.publishingDays : [];
  const perPlatform = (config.platforms ?? []).map((platform) => {
    const perDay = Math.max(0, Math.floor(config.postsPerDay?.[platform] ?? 0));
    return { platform, perDay, perWeek: perDay * days.length };
  });
  return {
    total: perPlatform.reduce((sum, p) => sum + p.perWeek, 0),
    perPlatform,
    publishingDays: days,
    publishingDayLabels: days.map((d) => WEEKDAYS[d] ?? String(d)),
  };
}

/**
 * Generate concrete scheduled slot datetimes for one week starting from
 * `weekStart`, honouring publishing days, per-platform counts and preferred
 * times. Times beyond the configured preferred list are spread across the day.
 */
export interface GeneratedSlot {
  platform: Platform;
  date: Date;
  slotIndex: number;
}

export function generateWeekSlots(config: PublishingConfig, weekStart: Date): GeneratedSlot[] {
  const slots: GeneratedSlot[] = [];
  const days = config.publishingDays ?? [];
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0);

  for (const platform of config.platforms ?? []) {
    const perDay = Math.max(0, Math.floor(config.postsPerDay?.[platform] ?? 0));
    if (perDay === 0) continue;
    const times = config.preferredTimes?.[platform]?.length
      ? config.preferredTimes[platform]
      : defaultTimes(perDay);

    for (let offset = 0; offset < 7; offset++) {
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      if (!days.includes(date.getDay())) continue;

      for (let i = 0; i < perDay; i++) {
        const time = times[i % times.length] ?? defaultTimes(perDay)[i] ?? "09:00";
        const [h, m] = time.split(":").map((n) => parseInt(n, 10));
        const slotDate = new Date(date);
        slotDate.setHours(h || 9, m || 0, 0, 0);
        slots.push({ platform: platform as Platform, date: slotDate, slotIndex: i });
      }
    }
  }
  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function defaultTimes(count: number): string[] {
  const spread = ["09:00", "12:00", "15:00", "18:00", "20:00", "08:00", "11:00", "14:00"];
  return spread.slice(0, Math.max(1, count));
}

export function startOfWeek(d: Date, weekStartsOn = 1): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day - weekStartsOn + 7) % 7;
  date.setDate(date.getDate() - diff);
  date.setHours(0, 0, 0, 0);
  return date;
}
