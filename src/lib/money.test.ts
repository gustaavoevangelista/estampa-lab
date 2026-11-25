import { describe, expect, it } from "vitest";

import {
  breakEvenQuantity,
  divCeil,
  divRound,
  formatAmount,
  formatEUR,
  formatPercent,
  fromGross,
  fromNet,
  grossToNet,
  labourCost,
  margin,
  MoneyError,
  netToGross,
  parseEUR,
  parsePercentToBp,
  priceForTargetMargin,
  sumCents,
  vatFromNet,
} from "./money";

/** Intl uses NBSP / narrow NBSP; normalise to plain spaces for readable assertions. */
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("divRound / divCeil", () => {
  it("rounds half away from zero", () => {
    expect(divRound(5, 10)).toBe(1);
    expect(divRound(4, 10)).toBe(0);
    expect(divRound(-5, 10)).toBe(-1);
    expect(divRound(15, 10)).toBe(2);
  });
  it("ceils correctly for positives and negatives", () => {
    expect(divCeil(10, 3)).toBe(4);
    expect(divCeil(9, 3)).toBe(3);
    expect(divCeil(-10, 3)).toBe(-3);
  });
  it("rejects floats and zero divisors", () => {
    expect(() => divRound(1.5, 2)).toThrow(MoneyError);
    expect(() => divRound(1, 0)).toThrow(MoneyError);
  });
});

describe("VAT", () => {
  it("computes 23% on net", () => {
    expect(vatFromNet(1000, 2300)).toBe(230);
    expect(fromNet(1000, 2300)).toEqual({ netCents: 1000, vatCents: 230, grossCents: 1230 });
  });
  it("rounds half-cent VAT up", () => {
    // 0,50 € × 23% = 0,115 € → 0,12 €
    expect(vatFromNet(50, 2300)).toBe(12);
    // 0,02 € × 23% = 0,0046 → 0,00
    expect(vatFromNet(2, 2300)).toBe(0);
  });
  it("handles zero price and zero rate", () => {
    expect(fromNet(0, 2300)).toEqual({ netCents: 0, vatCents: 0, grossCents: 0 });
    expect(fromNet(999, 0)).toEqual({ netCents: 999, vatCents: 0, grossCents: 999 });
  });
  it("splits gross so net + vat = gross exactly", () => {
    for (let gross = 0; gross < 5000; gross += 7) {
      for (const bp of [0, 600, 1300, 2300]) {
        const r = fromGross(gross, bp);
        expect(r.netCents + r.vatCents).toBe(gross);
      }
    }
  });
  it("converts 12,30 € gross back to 10,00 € net", () => {
    expect(grossToNet(1230, 2300)).toBe(1000);
    expect(netToGross(1000, 2300)).toBe(1230);
  });
  it("round-trips net → gross → net for typical prices", () => {
    for (let net = 1; net < 20000; net += 13) {
      expect(grossToNet(netToGross(net, 2300), 2300)).toBe(net);
    }
  });
  it("supports negative amounts (refunds / credit notes)", () => {
    expect(fromNet(-1000, 2300)).toEqual({ netCents: -1000, vatCents: -230, grossCents: -1230 });
  });
  it("rejects invalid rates", () => {
    expect(() => vatFromNet(100, -1)).toThrow(MoneyError);
    expect(() => vatFromNet(100, 10001)).toThrow(MoneyError);
    expect(() => vatFromNet(100, 23.5)).toThrow(MoneyError);
  });
});

describe("margin", () => {
  it("computes margin and markup", () => {
    // price 10,00 €, cost 6,00 € → margin 4,00 €, 40 %, markup 66,67 %
    expect(margin(1000, 600)).toEqual({ grossMarginCents: 400, marginBp: 4000, markupBp: 6667 });
  });
  it("returns null percentages when dividing by zero", () => {
    expect(margin(0, 500)).toEqual({ grossMarginCents: -500, marginBp: null, markupBp: -10000 });
    expect(margin(500, 0)).toEqual({ grossMarginCents: 500, marginBp: 10000, markupBp: null });
    expect(margin(0, 0)).toEqual({ grossMarginCents: 0, marginBp: null, markupBp: null });
  });
  it("handles negative margins", () => {
    expect(margin(800, 1000).marginBp).toBe(-2500);
  });
});

describe("priceForTargetMargin", () => {
  it("returns the smallest price reaching the target", () => {
    // cost 6,00 €, target 40 % → 10,00 €
    expect(priceForTargetMargin(600, 4000)).toBe(1000);
    // cost 3,33 €, target 35 % → 5,123… → 5,13 €
    const price = priceForTargetMargin(333, 3500)!;
    expect(price).toBe(513);
    expect(margin(price, 333).marginBp!).toBeGreaterThanOrEqual(3500);
  });
  it("handles 0 % and impossible targets", () => {
    expect(priceForTargetMargin(600, 0)).toBe(600);
    expect(priceForTargetMargin(600, 10000)).toBeNull();
    expect(priceForTargetMargin(0, 5000)).toBe(0);
  });
});

describe("breakEvenQuantity", () => {
  it("rounds up to whole units", () => {
    // 50 € setup, 4 € contribution → 12,5 → 13
    expect(breakEvenQuantity(5000, 1000, 600)).toBe(13);
  });
  it("is 0 without fixed costs and null when losing money", () => {
    expect(breakEvenQuantity(0, 1000, 600)).toBe(0);
    expect(breakEvenQuantity(5000, 600, 600)).toBeNull();
    expect(breakEvenQuantity(5000, 0, 600)).toBeNull();
  });
});

describe("labourCost / sumCents", () => {
  it("converts minutes at hourly rate", () => {
    expect(labourCost(6, 1500)).toBe(150); // 6 min at 15 €/h
    expect(labourCost(1, 1000)).toBe(17); // 16,67 → 17
    expect(labourCost(0, 1500)).toBe(0);
  });
  it("sums integer cents", () => {
    expect(sumCents([])).toBe(0);
    expect(sumCents([10, 20, -5])).toBe(25);
    expect(() => sumCents([0.1, 0.2])).toThrow(MoneyError);
  });
});

describe("formatting (pt-PT)", () => {
  it("formats EUR with grouping and comma decimals", () => {
    expect(plain(formatEUR(123456))).toBe("1 234,56 €");
    expect(plain(formatEUR(0))).toBe("0,00 €");
    expect(plain(formatEUR(5))).toBe("0,05 €");
    expect(plain(formatEUR(-1999))).toBe("-19,99 €");
    expect(plain(formatEUR(123456789))).toBe("1 234 567,89 €");
  });
  it("formats plain amounts and percentages", () => {
    expect(plain(formatAmount(123456))).toBe("1 234,56");
    expect(plain(formatPercent(2300))).toBe("23 %");
    expect(plain(formatPercent(2350))).toBe("23,5 %");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("parseEUR", () => {
  it.each([
    ["1 234,56", 123456],
    ["1234,56", 123456],
    ["1.234,56", 123456],
    ["1,234.56", 123456],
    ["1234.56", 123456],
    ["12,5", 1250],
    ["12", 1200],
    ["0,05", 5],
    [",5", 50],
    ["1.234", 123400],
    ["1.234.567", 123456700],
    ["-3,20", -320],
    ["12 €", 1200],
    ["1 234,56 €", 123456],
  ])("parses %s", (input, expected) => {
    expect(parseEUR(input)).toBe(expected);
  });
  it.each(["", "abc", "1,234,5", "12,345", "1.2.3,4.5", "--1"])("rejects %s", (input) => {
    expect(parseEUR(input)).toBeNull();
  });
  it("round-trips formatted values", () => {
    for (const c of [0, 1, 99, 100, 123456, 987654321]) {
      expect(parseEUR(formatEUR(c))).toBe(c);
    }
  });
});

describe("parsePercentToBp", () => {
  it("parses pt-PT and plain percentages", () => {
    expect(parsePercentToBp("23")).toBe(2300);
    expect(parsePercentToBp("6,5")).toBe(650);
    expect(parsePercentToBp("13 %")).toBe(1300);
    expect(parsePercentToBp("0")).toBe(0);
  });
  it("rejects invalid values", () => {
    expect(parsePercentToBp("101")).toBeNull();
    expect(parsePercentToBp("abc")).toBeNull();
    expect(parsePercentToBp("1,234")).toBeNull();
  });
});
