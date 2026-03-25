export function normalizeKeyword(value: unknown): string {
  const safe = typeof value === 'string' ? value : String(value ?? '');

  return safe
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^0-9a-zA-Z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
