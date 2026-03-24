export function normalizeKeyword(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
