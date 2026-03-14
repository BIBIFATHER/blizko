/**
 * Generates a URL-safe slug from a nanny's name and id.
 * Example: "Анна Иванова", "abc123ef" → "anna-ivanova-abc123ef"
 *
 * Used for persistent, shareable nanny profile URLs: /nanny/:slug
 */

const CYRILLIC_MAP: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh',
  з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o',
  п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
  ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu',
  я: 'ya',
};

function transliterate(str: string): string {
  return str
    .toLowerCase()
    .split('')
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join('');
}

export function slugify(name: string, id: string): string {
  const transliterated = transliterate(name);
  const cleaned = transliterated
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const shortId = id.slice(0, 8);
  return `${cleaned}-${shortId}`;
}

/** Extract the ID fragment (last 8 chars after final dash) from a slug */
export function idFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1] ?? '';
}
