import { describe, expect, it } from "vitest";

import { chartMonths, parseRange, rangeDates } from "./range";

const today = new Date(Date.UTC(2026, 10, 25));
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("dashboard ranges", () => {
  it("computes period starts", () => {
    expect(iso(rangeDates("month", today).from)).toBe("2026-11-01");
    expect(iso(rangeDates("3m", today).from)).toBe("2026-09-01");
    expect(iso(rangeDates("ytd", today).from)).toBe("2026-01-01");
    expect(iso(rangeDates("12m", today).from)).toBe("2025-12-01");
  });
  it("shows at least 6 months in the chart", () => {
    expect(chartMonths("month", today).map(iso)).toEqual(["2026-06-01", "2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(chartMonths("12m", today)).toHaveLength(12);
  });
  it("defaults unknown values to the month", () => {
    expect(parseRange("x")).toBe("month");
    expect(parseRange("ytd")).toBe("ytd");
  });
});
