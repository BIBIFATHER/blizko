import { afterEach, describe, expect, it, vi } from 'vitest';
import { NannyProfile, ParentRequest } from '@/core/types';
import { getNannyRiskFlags, getNannyTrustBadges, getParentRiskFlags } from './adminTrustSignals';

const baseNanny = {
  id: 'nanny-1',
  name: 'Анна',
  city: 'Москва',
  experience: '3',
  documents: [],
} as unknown as NannyProfile;

const baseParent = {
  id: 'parent-1',
  city: 'Москва',
  childAge: '3 года',
  schedule: 'полный день',
  budget: '100000',
  requirements: [],
  comment: '',
  createdAt: Date.UTC(2026, 5, 1),
  updatedAt: Date.UTC(2026, 5, 1),
} as unknown as ParentRequest;

describe('adminTrustSignals', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('builds evidence-based nanny trust badges', () => {
    const badges = getNannyTrustBadges({
      ...baseNanny,
      isVerified: true,
      video: 'https://example.com/video.mp4',
      documents: [
        { type: 'passport', status: 'verified' },
        { type: 'medical_book', status: 'verified' },
      ],
    } as unknown as NannyProfile);

    expect(badges).toEqual([
      { label: 'Личность подтверждена', status: 'ok' },
      { label: 'Документы проверены', status: 'ok' },
      { label: 'Опыт указан', status: 'ok' },
      { label: 'Видео есть', status: 'ok' },
    ]);
  });

  it('marks pending and missing nanny trust evidence', () => {
    const badges = getNannyTrustBadges({
      ...baseNanny,
      experience: '',
      videoIntro: true,
      documents: [{ type: 'passport', status: 'pending' }],
    } as unknown as NannyProfile);

    expect(badges).toEqual([
      { label: 'Личность не подтверждена', status: 'missing' },
      { label: 'Документы на проверке', status: 'pending' },
      { label: 'Опыт нужно уточнить', status: 'missing' },
      { label: 'Видео ожидает просмотра', status: 'pending' },
    ]);
  });

  it('returns nanny risk flags for missing, rejected, low-confidence, and unverified evidence', () => {
    expect(getNannyRiskFlags(baseNanny)).toContain('Нет документов');

    const flags = getNannyRiskFlags({
      ...baseNanny,
      documents: [
        { type: 'passport', status: 'rejected', aiConfidence: 55 },
        { type: 'resume', status: 'verified', aiConfidence: 95 },
      ],
    } as unknown as NannyProfile);

    expect(flags).toEqual([
      'Есть отклонённые документы',
      'Низкая уверенность по скану',
      'Личность не подтверждена',
    ]);
  });

  it('returns parent risk flags for stale new requests, payment, and missing contact', () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 5, 4));

    expect(
      getParentRiskFlags({
        ...baseParent,
        status: 'new',
        requesterEmail: '',
      } as ParentRequest),
    ).toEqual(['Без действий > 48 часов', 'Контакт не задан']);

    expect(
      getParentRiskFlags({
        ...baseParent,
        status: 'payment_pending',
        requesterEmail: 'parent@example.com',
      } as ParentRequest),
    ).toEqual(['Ожидает оплату']);
  });
});
