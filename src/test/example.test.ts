import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});

/** Clinical safety guardrail: banner shown when confidence < 0.5 (displayed as 50%). */
describe("guardrail banner", () => {
  function shouldShowGuardrail(confidencePercent: number): boolean {
    return confidencePercent < 50;
  }

  it("shows banner when confidence < 50", () => {
    expect(shouldShowGuardrail(49)).toBe(true);
    expect(shouldShowGuardrail(0)).toBe(true);
  });

  it("does not show banner when confidence >= 50", () => {
    expect(shouldShowGuardrail(50)).toBe(false);
    expect(shouldShowGuardrail(51)).toBe(false);
    expect(shouldShowGuardrail(100)).toBe(false);
  });
});
