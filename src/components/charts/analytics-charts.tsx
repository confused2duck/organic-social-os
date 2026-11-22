"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Coral Horizon chart palette.
const COLORS = ["#9F5056", "#C67F82", "#5A3035", "#E4B6B1", "#D98C7A"];

export function FollowersTrend({ data, platforms }: { data: Record<string, number | string>[]; platforms: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" minTickGap={24} />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {platforms.map((p, i) => (
          <Line key={p} type="monotone" dataKey={p} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EngagementBars({ data }: { data: { platform: string; engagementRate: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data.map((d) => ({ ...d, pct: +(d.engagementRate * 100).toFixed(2) }))} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="platform" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" unit="%" />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v: number) => `${v}%`} />
        <Bar dataKey="pct" fill="#9F5056" radius={[6, 6, 0, 0]} name="Engagement rate" />
      </BarChart>
    </ResponsiveContainer>
  );
}
