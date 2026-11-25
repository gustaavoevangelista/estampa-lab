import { describe, expect, it } from "vitest";

import { dueOccurrences, nextOccurrence } from "./recurrence";

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);

describe("nextOccurrence", () => {
  it("adds weeks, months, quarters and years", () => {
    expect(iso(nextOccurrence(d("2026-01-05"), "WEEKLY", 2))).toBe("2026-01-19");
    expect(iso(nextOccurrence(d("2026-01-15"), "MONTHLY", 1))).toBe("2026-02-15");
    expect(iso(nextOccurrence(d("2026-11-15"), "QUARTERLY", 1))).toBe("2027-02-15");
    expect(iso(nextOccurrence(d("2026-03-01"), "YEARLY", 1))).toBe("2027-03-01");
  });
  it("clamps to month end without drifting", () => {
    const feb = nextOccurrence(d("2026-01-31"), "MONTHLY", 1, 31);
    expect(iso(feb)).toBe("2026-02-28");
    expect(iso(nextOccurrence(feb, "MONTHLY", 1, 31))).toBe("2026-03-31");
    expect(iso(nextOccurrence(d("2028-01-31"), "MONTHLY", 1, 31))).toBe("2028-02-29");
  });
});

describe("dueOccurrences", () => {
  it("lists every missed date up to today", () => {
    const r = dueOccurrences(d("2026-08-01"), d("2026-11-25"), "MONTHLY", 1, 1);
    expect(r.dates.map(iso)).toEqual(["2026-08-01", "2026-09-01", "2026-10-01", "2026-11-01"]);
    expect(iso(r.nextAfter)).toBe("2026-12-01");
  });
  it("respects the end date and returns nothing when not yet due", () => {
    expect(dueOccurrences(d("2026-08-01"), d("2026-11-25"), "MONTHLY", 1, 1, d("2026-09-15")).dates).toHaveLength(2);
    expect(dueOccurrences(d("2026-12-01"), d("2026-11-25"), "MONTHLY", 1, 1).dates).toHaveLength(0);
  });
});
