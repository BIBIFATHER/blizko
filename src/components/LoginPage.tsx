import React, { useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button } from './UI';

interface LoginPageProps {
  onOpenAuth: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenAuth }) => {
  useEffect(() => {
    onOpenAuth();
  }, [onOpenAuth]);

  return (
    <div className="form-shell animate-fade-in py-10">
      <div className="hero-shell">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-4 text-center">
          <div className="eyebrow">
            <ShieldCheck size={14} />
            Безопасный вход
          </div>
          <h1 className="hero-title max-w-none">Продолжим с вашего профиля</h1>
          <p className="hero-body max-w-lg">
            Откроем вход через роль и вернём вас в нужный сценарий без лишних шагов.
          </p>
          <div className="w-full max-w-sm">
            <Button onClick={onOpenAuth}>Открыть вход</Button>
          </div>
        </div>
      </div>
    </div>
  );
};
