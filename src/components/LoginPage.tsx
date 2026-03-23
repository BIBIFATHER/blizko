import React, { useEffect } from 'react';

interface LoginPageProps {
  onOpenAuth: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenAuth }) => {
  useEffect(() => {
    onOpenAuth();
  }, [onOpenAuth]);

  return (
    <div className="min-h-screen bg-milk text-stone-700 font-sans flex items-center justify-center p-6">
      <div className="bg-white/80 border border-stone-200 rounded-2xl p-6 shadow-sm max-w-md text-center">
        <div className="text-xl font-semibold mb-2">Вход</div>
        <div className="text-sm text-stone-500">Выберите роль и войдите</div>
      </div>
    </div>
  );
};
