import { describe, it, expect } from "vitest";
import { parseJson, parseStringArray, parseRecord, stringifyJson } from "@/lib/json";
import { AGENT_SYSTEM_LIST, AGENT_SYSTEMS, WORKFLOW_STAGES } from "@/lib/agent-systems";

describe("json helpers", () => {
  it("parses valid JSON and falls back safely", () => {
    expect(parseJson('{"a":1}', {})).toEqual({ a: 1 });
    expect(parseJson("not json", { fallback: true })).toEqual({ fallback: true });
    expect(parseJson(null, [])).toEqual([]);
    expect(parseJson("", 42)).toBe(42);
  });

  it("parseStringArray coerces and guards", () => {
    expect(parseStringArray('["a","b"]')).toEqual(["a", "b"]);
    expect(parseStringArray("{}")).toEqual([]);
    expect(parseStringArray(null)).toEqual([]);
    expect(parseStringArray('[1,2]')).toEqual(["1", "2"]);
  });

  it("parseRecord returns object or empty", () => {
    expect(parseRecord('{"LINKEDIN":3}')).toEqual({ LINKEDIN: 3 });
    expect(parseRecord("[1,2]")).toEqual({});
    expect(parseRecord(undefined)).toEqual({});
  });

  it("round-trips", () => {
    const v = { x: [1, 2], y: "z" };
    expect(parseJson(stringifyJson(v), null)).toEqual(v);
  });
});

describe("agent systems", () => {
  it("defines exactly 7 systems A–G in workflow order", () => {
    expect(AGENT_SYSTEM_LIST).toHaveLength(7);
    expect(AGENT_SYSTEM_LIST.map((s) => s.id)).toEqual(["A", "B", "C", "D", "E", "F", "G"]);
    expect(AGENT_SYSTEMS.F.name).toBe("Publishing & Community");
  });

  it("has the 13-stage continuous workflow", () => {
    expect(WORKFLOW_STAGES).toContain("Publishing");
    expect(WORKFLOW_STAGES).toContain("Reporting");
    expect(WORKFLOW_STAGES.length).toBeGreaterThanOrEqual(13);
  });
});
