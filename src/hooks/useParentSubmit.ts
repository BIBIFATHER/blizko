import { NavigateFunction } from 'react-router-dom';
import { Language, ParentRequest, SubmissionResult, User } from '@/core/types';
import { getNannyProfiles, saveParentRequest, updateParentRequest } from '@/services/storage';
import { notifyAdminNewRequest } from '@/services/notifications';
import { trackFormSubmit } from '@/services/analytics';

// После сохранения заявки matching/AI — best-effort: не держим пользователя на спиннере,
// если AI-цепочка зависла или упала. Возвращает null по таймауту/ошибке.
const MATCH_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise.catch(() => null), timeout]).finally(() => clearTimeout(timer));
}

type ParentSubmitInput = Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & {
  id?: string;
  status?: ParentRequest['status'];
};

type ParentSubmitDeps = {
  navigate: NavigateFunction;
  user: User | null;
  lang: Language;
};

export function useParentSubmit({ navigate, user, lang }: ParentSubmitDeps) {
  return async function handleParentSubmit(data: ParentSubmitInput) {
    if (data.id) {
      const updated = await updateParentRequest(data as Partial<ParentRequest> & { id: string }, {
        actor: 'user',
        note: 'Пользователь обновил заявку',
      });

      if (!updated) {
        alert('Эту заявку нельзя редактировать после одобрения');
        navigate('/');
        return;
      }

      if (updated.sync === 'error') {
        alert('Не удалось сохранить изменения. Проверьте соединение и попробуйте ещё раз.');
        return;
      }

      navigate('/');
      return;
    }

    const saved = await saveParentRequest({
      ...data,
      requesterId: user?.id,
      requesterEmail: user?.email,
    });

    if (saved.sync === 'error') {
      alert('Не удалось отправить заявку. Проверьте соединение и попробуйте ещё раз.');
      return;
    }

    trackFormSubmit('parent');

    // Заявка уже в БД. Дальше — best-effort: уведомление админу fire-and-forget
    // (его сбой не должен запирать пользователя на спиннере), AI-matching — с
    // таймаутом. Навигация после сохранения гарантирована.
    void notifyAdminNewRequest(saved.item).catch(() => {});

    let aiMatchResult: SubmissionResult | null = null;
    try {
      const allNannies = await withTimeout(getNannyProfiles(), MATCH_TIMEOUT_MS);
      if (allNannies) {
        const { findBestMatch } = await import('@/core/ai/matchingAi');
        aiMatchResult = await withTimeout(
          findBestMatch(data, allNannies, lang, user?.id),
          MATCH_TIMEOUT_MS,
        );
      }
    } catch {
      aiMatchResult = null;
    }

    if (aiMatchResult?.matchResult && aiMatchResult.matchResult.candidates.length > 0) {
      navigate('/match-results', { state: { matchResult: aiMatchResult.matchResult } });
    } else {
      navigate('/success', { state: { result: aiMatchResult ?? undefined } });
    }

    return { savedId: saved.item.id };
  };
}
