import { NannyProfile, User } from '../types';

const normalizeText = (value?: string) => String(value || '').trim().toLowerCase();
const normalizeDigits = (value?: string) => String(value || '').replace(/\D+/g, '');

function normalizeContact(value?: string): string {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('@')) return raw;

  const digits = normalizeDigits(raw);
  return digits.length >= 10 ? digits : raw;
}

export function findCurrentNannyProfile(
  profiles: NannyProfile[],
  user: Pick<User, 'name' | 'email' | 'phone'>,
): NannyProfile | undefined {
  const normalizedName = normalizeText(user.name);
  const contactCandidates = [normalizeContact(user.email), normalizeContact(user.phone)].filter(Boolean);

  if (contactCandidates.length > 0) {
    const contactMatches = profiles.filter((profile) =>
      contactCandidates.includes(normalizeContact(profile.contact)),
    );

    if (contactMatches.length === 1) return contactMatches[0];
    if (contactMatches.length > 1 && normalizedName) {
      return contactMatches.find((profile) => normalizeText(profile.name) === normalizedName);
    }
    if (contactMatches.length > 0) return undefined;
  }

  if (!normalizedName) return undefined;

  const nameMatches = profiles.filter((profile) => normalizeText(profile.name) === normalizedName);
  return nameMatches.length === 1 ? nameMatches[0] : undefined;
}

