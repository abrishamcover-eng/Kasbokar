import { describe, expect, it } from "vitest";
import { toggleMultiSelection } from "./questionnaire";

describe("toggleMultiSelection", () => {
  it("adds several options and removes a selected option", () => {
    let value = "";
    value = toggleMultiSelection(value, "سریع‌تر انجام دادن کار");
    value = toggleMultiSelection(value, "کیفیت یا اعتماد بیشتر");
    value = toggleMultiSelection(value, "راحتی و دسترسی بهتر");
    expect(value.split("||")).toHaveLength(3);
    expect(toggleMultiSelection(value, "کیفیت یا اعتماد بیشتر").split("||")).toEqual(["سریع‌تر انجام دادن کار", "راحتی و دسترسی بهتر"]);
  });

  it("does not allow more than three selections", () => {
    const value = "یک||دو||سه";
    expect(toggleMultiSelection(value, "چهار")).toBe(value);
  });
});
