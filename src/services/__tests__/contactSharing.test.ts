import { describe, expect, it } from 'vitest';
import { detectContactSharing } from '@/services/contactSharing';

describe('detectContactSharing', () => {
  it('detects russian phone numbers', () => {
    expect(detectContactSharing('Позвоните мне на +7 999 123-45-67')).toMatchObject({
      hasContact: true,
      type: 'phone',
    });
  });

  it('detects messenger handles and emails', () => {
    expect(detectContactSharing('Мой телеграм @blizko_nanny')).toMatchObject({
      hasContact: true,
      type: 'messenger',
    });
    expect(detectContactSharing('Пишите на nanny@example.com')).toMatchObject({
      hasContact: true,
      type: 'email',
    });
  });

  it('detects suspicious bypass phrases', () => {
    expect(detectContactSharing('Давайте не через сервис, а напрямую')).toMatchObject({
      hasContact: true,
      type: 'phrase',
    });
  });

  it('ignores normal conversation', () => {
    expect(detectContactSharing('Добрый день! Подойдёт ли вам четверг?')).toEqual({
      hasContact: false,
      type: null,
      match: null,
    });
  });
});
