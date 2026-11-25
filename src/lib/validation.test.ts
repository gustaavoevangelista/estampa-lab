import { describe, expect, it } from "vitest";

import { isValidPortugueseNif, moneyOptional, moneyRequired, optionalUrl, percentRequired } from "./validation";

describe("isValidPortugueseNif", () => {
  it("accepts valid NIFs/NIPCs", () => {
    expect(isValidPortugueseNif("123456789")).toBe(true);
    expect(isValidPortugueseNif("501964843")).toBe(true);
  });
  it("rejects wrong check digit, length or prefix", () => {
    expect(isValidPortugueseNif("123456780")).toBe(false);
    expect(isValidPortugueseNif("12345678")).toBe(false);
    expect(isValidPortugueseNif("412345678")).toBe(false);
  });
});

describe("form value schemas", () => {
  it("parses money", () => {
    expect(moneyRequired.parse("1 234,56")).toBe(123456);
    expect(moneyRequired.safeParse("").success).toBe(false);
    expect(moneyRequired.safeParse("abc").success).toBe(false);
    expect(moneyOptional.parse("")).toBeNull();
  });
  it("parses percentages", () => {
    expect(percentRequired.parse("23")).toBe(2300);
    expect(percentRequired.safeParse("150").success).toBe(false);
  });
  it("normalises URLs", () => {
    expect(optionalUrl.parse("estampalab.pt")).toBe("https://estampalab.pt");
    expect(optionalUrl.parse("")).toBeNull();
  });
});
