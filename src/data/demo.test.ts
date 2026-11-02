import { describe, expect, it } from "vitest";
import { demoWorkspace } from "./demo";

describe("sample archive", () => {
  it("does not generate plays dated in the future", () => {
    const today = new Date();
    const currentDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
      .toISOString()
      .slice(0, 10);

    expect(demoWorkspace.plays.every((play) => play.date <= currentDay)).toBe(true);
  });
});
