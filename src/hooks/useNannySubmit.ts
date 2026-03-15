import { NavigateFunction } from 'react-router-dom';
import { Language, NannyProfile, SubmissionResult } from '../../types';
import { saveNannyProfile } from '../../services/storage';
import { sendToWebhook } from '../../services/api';

function generateNannyRegistrationResult(language: Language): SubmissionResult {
  return {
    matchScore: 0,
    recommendations: language === 'ru'
      ? ['Заполните "О себе" подробнее', 'Добавьте видеовизитку', 'Пройдите верификацию']
      : ['Fill "About" in detail', 'Add video intro', 'Get verified'],
  };
}

type NannySubmitDeps = {
  navigate: NavigateFunction;
  lang: Language;
};

export function useNannySubmit({ navigate, lang }: NannySubmitDeps) {
  return async function handleNannySubmit(data: Partial<NannyProfile>) {
    const isEdit = Boolean(data.id);
    const saved = await saveNannyProfile(data);
    await sendToWebhook(saved);

    if (isEdit) {
      navigate('/');
      return;
    }

    navigate('/success', { state: { result: generateNannyRegistrationResult(lang) } });
  };
}
