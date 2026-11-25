import { describe, expect, it } from "vitest";

import { formatDate, formatDateOnly, parseDateOnly, todayInLisbon, toISODateOnly } from "./dates";

describe("dates", () => {
  it("formats DD/MM/YYYY", () => {
    expect(formatDateOnly(new Date(Date.UTC(2026, 0, 5)))).toBe("05/01/2026");
  });
  it("formats timestamps in Lisbon time", () => {
    // 23:30 UTC on 30 June = 00:30 on 1 July in Lisbon (WEST, UTC+1)
    expect(formatDate(new Date(Date.UTC(2026, 5, 30, 23, 30)))).toBe("01/07/2026");
  });
  it("parses pt and ISO dates and rejects invalid ones", () => {
    expect(toISODateOnly(parseDateOnly("25/11/2026")!)).toBe("2026-11-25");
    expect(toISODateOnly(parseDateOnly("2026-02-28")!)).toBe("2026-02-28");
    expect(parseDateOnly("31/02/2026")).toBeNull();
    expect(parseDateOnly("hoje")).toBeNull();
  });
  it("knows today in Lisbon", () => {
    expect(toISODateOnly(todayInLisbon(new Date(Date.UTC(2026, 6, 31, 23, 30))))).toBe("2026-08-01");
  });
});
