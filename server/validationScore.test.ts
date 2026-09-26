import { describe, expect, it } from "vitest";
import { calculateValidationScore, validationLabel } from "../shared/validationScore";

describe("validation score", () => {
  it("calculates a weighted readiness score and rounds it", () => {
    expect(
      calculateValidationScore({
        problemEvidence: 82,
        customerClarity: 74,
        marketEvidence: 58,
        valueClarity: 65,
        revenueEvidence: 49,
      }),
    ).toBe(66);
  });

  it("clamps out-of-range signals so invalid input cannot inflate the score", () => {
    expect(
      calculateValidationScore({
        problemEvidence: 200,
        customerClarity: -50,
        marketEvidence: 100,
        valueClarity: 100,
        revenueEvidence: 100,
      }),
    ).toBe(82);
  });

  it("labels a score as readiness, not success probability", () => {
    expect(validationLabel(39)).toBe("نیازمند شواهد بیشتر");
    expect(validationLabel(68)).toBe("آماده طراحی آزمایش");
    expect(validationLabel(70)).toBe("قابل آزمایش در بازار");
  });
});
