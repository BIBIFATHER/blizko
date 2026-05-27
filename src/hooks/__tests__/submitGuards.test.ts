import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression guard for C1/C2/H7: when the persist layer reports sync='error',
 * the submit handlers must NOT navigate to a success screen and must NOT push
 * the request to the webhook. Locks in the "no false success" behavior so a
 * future refactor of the submit flow cannot silently reintroduce it.
 */

vi.mock('@/services/storage', () => ({
  saveParentRequest: vi.fn(),
  updateParentRequest: vi.fn(),
  getNannyProfiles: vi.fn(async () => []),
  saveNannyProfile: vi.fn(),
}));
vi.mock('@/services/api', () => ({ sendToWebhook: vi.fn(async () => {}) }));
vi.mock('@/services/notifications', () => ({ notifyAdminNewRequest: vi.fn(async () => {}) }));
vi.mock('@/services/analytics', () => ({
  trackFormSubmit: vi.fn(),
  trackNannyReadyForMatch: vi.fn(),
}));
vi.mock('@/services/nannyReadiness', () => ({
  getNannyReadinessSnapshot: () => ({ qualityScore: 0, qualityApproved: false }),
  getNannySuccessRecommendations: () => [],
}));
vi.mock('@/core/ai/matchingAi', () => ({
  findBestMatch: vi.fn(async () => ({ matchResult: { candidates: [] } })),
}));

import { useParentSubmit } from '@/hooks/useParentSubmit';
import { useNannySubmit } from '@/hooks/useNannySubmit';
import { saveParentRequest, saveNannyProfile } from '@/services/storage';
import { sendToWebhook } from '@/services/api';

const navigate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as { alert?: unknown }).alert = vi.fn();
});

describe('submit guards — no false success on persist error', () => {
  it('parent: sync=error → does not navigate and does not webhook', async () => {
    vi.mocked(saveParentRequest).mockResolvedValue({ item: { id: 'x' } as never, sync: 'error' });

    const handleParentSubmit = useParentSubmit({
      navigate: navigate as never,
      user: null,
      lang: 'ru',
    });
    await handleParentSubmit({ city: 'Москва' } as never);

    expect(saveParentRequest).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(sendToWebhook).not.toHaveBeenCalled();
  });

  it('nanny: sync=error → does not navigate', async () => {
    vi.mocked(saveNannyProfile).mockResolvedValue({ item: { id: 'y' } as never, sync: 'error' });

    const handleNannySubmit = useNannySubmit({ navigate: navigate as never, lang: 'ru' });
    await handleNannySubmit({} as never);

    expect(saveNannyProfile).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('parent: sync=synced → navigates (sanity: success still works)', async () => {
    vi.mocked(saveParentRequest).mockResolvedValue({ item: { id: 'x' } as never, sync: 'synced' });

    const handleParentSubmit = useParentSubmit({
      navigate: navigate as never,
      user: null,
      lang: 'ru',
    });
    await handleParentSubmit({ city: 'Москва' } as never);

    expect(navigate).toHaveBeenCalled();
  });

  // Video intro (videoвизитка): the recorded public URL travels in formData.video,
  // so the submit path must forward it to persistence untouched — admin reads n.video.
  it('nanny: video URL is forwarded to persistence (not dropped by submit path)', async () => {
    vi.mocked(saveNannyProfile).mockResolvedValue({ item: { id: 'z' } as never, sync: 'synced' });

    const handleNannySubmit = useNannySubmit({ navigate: navigate as never, lang: 'ru' });
    await handleNannySubmit({ video: 'https://cdn/nanny-videos/u1/video-intro.webm' } as never);

    expect(saveNannyProfile).toHaveBeenCalledWith(
      expect.objectContaining({ video: 'https://cdn/nanny-videos/u1/video-intro.webm' }),
    );
  });
});
