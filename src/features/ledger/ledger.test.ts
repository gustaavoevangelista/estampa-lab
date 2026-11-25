import { describe, expect, it } from "vitest";

import { csvMoney, toCsv } from "./csv";
import { filtersToQuery, parseLedgerFilters, shiftPeriod } from "./filters";

const today = new Date(Date.UTC(2026, 10, 25));
const iso = (d: Date) => d.toISOString().slice(0, 10);

describe("parseLedgerFilters", () => {
  it("defaults to the current month", () => {
    const f = parseLedgerFilters({}, today);
    expect(f.view).toBe("month");
    expect(f.period).toBe("2026-11");
    expect([iso(f.from), iso(f.to)]).toEqual(["2026-11-01", "2026-11-30"]);
  });
  it("parses year and custom views", () => {
    const y = parseLedgerFilters({ view: "year", period: "2025" }, today);
    expect([iso(y.from), iso(y.to)]).toEqual(["2025-01-01", "2025-12-31"]);
    const c = parseLedgerFilters({ view: "custom", from: "2026-10-10", to: "2026-09-01" }, today);
    expect([iso(c.from), iso(c.to)]).toEqual(["2026-09-01", "2026-10-10"]);
  });
  it("ignores invalid values", () => {
    const f = parseLedgerFilters({ period: "2026-13", type: "FOO", status: "x" }, today);
    expect(f.period).toBe("2026-11");
    expect(f.type).toBeNull();
    expect(f.status).toBeNull();
  });
  it("round-trips to a query string and shifts periods", () => {
    const f = parseLedgerFilters({ period: "2026-01", type: "EXPENSE", q: "renda" }, today);
    expect(filtersToQuery(f)).toBe("view=month&period=2026-01&type=EXPENSE&q=renda");
    expect(shiftPeriod(f, -1)).toBe("2025-12");
    expect(shiftPeriod(parseLedgerFilters({ view: "year", period: "2026" }, today), 1)).toBe("2027");
  });
});

describe("csv", () => {
  it("formats money for pt-PT spreadsheets", () => {
    expect(csvMoney(123456)).toBe("1234,56");
    expect(csvMoney(5)).toBe("0,05");
    expect(csvMoney(-1999)).toBe("-19,99");
  });
  it("escapes separators and quotes, adds BOM", () => {
    const csv = toCsv(["a", "b"], [['x;y', 'diz "olá"']]);
    expect(csv).toBe('﻿a;b\r\n"x;y";"diz ""olá"""\r\n');
  });
});
