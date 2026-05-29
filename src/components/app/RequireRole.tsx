import React from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Forbidden } from '../Forbidden';
import { User } from '@/core/types';

type RequireRoleProps = {
  role: 'parent' | 'nanny' | 'admin';
  user: User | null;
  isAdmin: boolean;
  authLoading?: boolean;
  children: React.ReactNode;
};

export function RequireRole({ role, user, isAdmin, authLoading, children }: RequireRoleProps) {
  // Ждём гидратацию сессии перед решением — иначе deep-link на защищённый роут
  // редиректит на /login до того, как загрузился авторизованный пользователь.
  if (authLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && !isAdmin) return <Forbidden />;
  if (role === 'parent' && user.role !== 'parent') return <Forbidden />;
  if (role === 'nanny' && user.role !== 'nanny') return <Forbidden />;
  return <>{children}</>;
}
