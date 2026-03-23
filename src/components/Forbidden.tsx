import React from 'react';

export const Forbidden: React.FC = () => {
  return (
    <div className="min-h-screen bg-milk text-stone-700 font-sans flex items-center justify-center p-6">
      <div className="bg-white/80 border border-stone-200 rounded-2xl p-6 shadow-sm max-w-md text-center">
        <div className="text-2xl font-semibold mb-2">403</div>
        <div className="text-sm text-stone-500">Доступ запрещён</div>
      </div>
    </div>
  );
};
