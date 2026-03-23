import { NavigateFunction } from 'react-router-dom';
import { Language, ParentRequest, User } from '../../types';
import { getNannyProfiles, saveParentRequest, updateParentRequest } from '@/services/storage';
import { sendToWebhook } from '@/services/api';
import { notifyAdminNewRequest } from '@/services/notifications';
import { trackFormSubmit } from '@/services/analytics';

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

      await sendToWebhook(updated);
      navigate('/');
      return;
    }

    const saved = await saveParentRequest({
      ...data,
      requesterId: user?.id,
      requesterEmail: user?.email,
    });
    await sendToWebhook(saved);
    await notifyAdminNewRequest(saved);
    trackFormSubmit('parent');

    const allNannies = await getNannyProfiles();
    const { findBestMatch } = await import('@/core/ai/matchingAi');
    const aiMatchResult = await findBestMatch(data, allNannies, lang, user?.id);

    if (aiMatchResult.matchResult && aiMatchResult.matchResult.candidates.length > 0) {
      navigate('/match-results', { state: { matchResult: aiMatchResult.matchResult } });
    } else {
      navigate('/success', { state: { result: aiMatchResult } });
    }

    return { savedId: saved.id };
  };
}
