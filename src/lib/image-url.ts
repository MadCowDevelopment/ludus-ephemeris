export function bggImagePageUrl(imageId: string): string | undefined {
  const id = imageId.trim();
  return /^\d+$/.test(id) ? `https://boardgamegeek.com/image/${id}` : undefined;
}

export function parseCoverImageUrl(value: string): string | undefined {
  const input = value.trim();
  if (!input) return undefined;

  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return undefined;
    if (
      ["boardgamegeek.com", "www.boardgamegeek.com"].includes(url.hostname) &&
      /^\/image\/\d+\/?$/.test(url.pathname)
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}
