import { NavigateFunction } from 'react-router-dom';
import { Language, NannyProfile, SubmissionResult } from '../../types';
import { saveNannyProfile } from '@/services/storage';
import { sendToWebhook } from '@/services/api';
import { trackFormSubmit, trackNannyReadyForMatch } from '@/services/analytics';
import { getNannyReadinessSnapshot, getNannySuccessRecommendations } from '@/services/nannyReadiness';

function generateNannyRegistrationResult(language: Language, data: Partial<NannyProfile>): SubmissionResult {
  const readiness = getNannyReadinessSnapshot(data);

  return {
    matchScore: readiness.qualityScore,
    recommendations: getNannySuccessRecommendations(readiness, language),
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
    trackFormSubmit('nanny');

    const readiness = getNannyReadinessSnapshot(saved);
    if (readiness.qualityApproved) {
      trackNannyReadyForMatch(readiness.qualityScore);
    }

    if (isEdit) {
      navigate('/');
      return;
    }

    navigate('/success', { state: { result: generateNannyRegistrationResult(lang, saved) } });
  };
}
