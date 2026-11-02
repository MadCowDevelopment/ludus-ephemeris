import { describe, expect, it } from "vitest";
import { bggImagePageUrl, parseCoverImageUrl } from "./image-url";

describe("cover image URLs", () => {
  it("builds a BGG image page link from a numeric image ID", () => {
    expect(bggImagePageUrl("3490053")).toBe("https://boardgamegeek.com/image/3490053");
    expect(bggImagePageUrl("not-an-id")).toBeUndefined();
  });

  it("accepts HTTPS image URLs", () => {
    expect(parseCoverImageUrl("https://cf.geekdo-images.com/example/pic123.jpg"))
      .toBe("https://cf.geekdo-images.com/example/pic123.jpg");
  });

  it("rejects insecure, invalid, and BGG image-page URLs", () => {
    expect(parseCoverImageUrl("http://example.com/image.jpg")).toBeUndefined();
    expect(parseCoverImageUrl("not a URL")).toBeUndefined();
    expect(parseCoverImageUrl("https://boardgamegeek.com/image/3490053")).toBeUndefined();
  });
});
