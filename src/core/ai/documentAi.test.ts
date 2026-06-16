import { describe, expect, it, vi } from 'vitest';

const { aiImage } = vi.hoisted(() => ({ aiImage: vi.fn() }));
vi.mock('./aiGateway', () => ({ aiImage }));

import { analyzeDocument } from './documentAi';

const file = { name: 'doc.jpg', type: 'image/jpeg' } as unknown as File;

describe('analyzeDocument — no false verified (keeper)', () => {
  it('returns pending (never verified) when AI throws', async () => {
    aiImage.mockRejectedValueOnce(new Error('boom'));
    const r = await analyzeDocument(file, 'passport', 'ru');
    expect(r.status).toBe('pending');
    expect(r.status).not.toBe('verified');
  });

  it('returns pending (never verified) on empty AI response', async () => {
    aiImage.mockResolvedValueOnce('');
    const r = await analyzeDocument(file, 'passport', 'ru');
    expect(r.status).not.toBe('verified');
  });

  it('honors an explicit AI verdict for synthetic documents', async () => {
    aiImage.mockResolvedValueOnce(
      JSON.stringify({ status: 'verified', confidence: 90, notes: 'ok' }),
    );
    const r = await analyzeDocument(file, 'passport', 'ru');
    expect(r.status).toBe('verified');
  });
});
