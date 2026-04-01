import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Language } from '@/core/types';

const ACCENT = '#6C5CE7';

interface ErrorStateProps {
  lang: Language;
  onRetry: () => void;
}

/**
 * Error fallback for failed data fetches.
 * Glass-style card with violet accent retry button.
 */
export const ErrorState: React.FC<ErrorStateProps> = ({ lang, onRetry }) => (
  <div className="flex flex-col items-center gap-5 rounded-[2rem] bg-white px-8 py-14 text-center shadow-[0_2px_16px_-4px_rgba(0,0,0,0.06)]">
    <div className="rounded-2xl bg-red-50 p-4">
      <AlertTriangle size={28} className="text-red-400" />
    </div>
    <div className="space-y-2">
      <p className="text-lg font-semibold text-[#1A1A2E]">
        {lang === 'ru' ? 'Не удалось загрузить результаты' : 'Failed to load results'}
      </p>
      <p className="text-sm text-[#6B7280]">
        {lang === 'ru' ? 'Проверьте соединение и попробуйте снова.' : 'Check your connection and try again.'}
      </p>
    </div>
    <button
      onClick={onRetry}
      className="rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all active:scale-[0.97]"
      style={{ backgroundColor: ACCENT, boxShadow: `0 4px 16px -4px ${ACCENT}50` }}
    >
      {lang === 'ru' ? 'Попробовать снова' : 'Try again'}
    </button>
  </div>
);
