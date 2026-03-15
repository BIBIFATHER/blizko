import { useState } from 'react';
import { Language } from '../../types';
import { t } from '../core/i18n/translations';
import { trackShare } from '../../services/analytics';

type ShareActionDeps = {
  lang: Language;
};

export function useShareActions({ lang }: ShareActionDeps) {
  const [isShareModalOpen, setShareModalOpen] = useState(false);

  const handleShare = async () => {
    trackShare('app_header');

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blizko',
          text: t[lang].heroSubtitle,
          url: window.location.href,
        });
        return;
      } catch {
        return;
      }
    }

    setShareModalOpen(true);
  };

  return {
    isShareModalOpen,
    setShareModalOpen,
    handleShare,
  };
}
