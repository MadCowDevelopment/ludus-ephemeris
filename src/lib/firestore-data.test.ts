import { describe, expect, it } from "vitest";
import { removeUndefinedFields } from "./firestore-data";

describe("Firestore data cleanup", () => {
  it("removes undefined fields recursively while preserving other values", () => {
    expect(removeUndefinedFields({
      name: "Catan",
      defaultDurationHours: undefined,
      legacy: { note: undefined, score: 8 },
      values: [undefined, null, "kept"],
    })).toEqual({
      name: "Catan",
      legacy: { score: 8 },
      values: [null, "kept"],
    });
  });
});
