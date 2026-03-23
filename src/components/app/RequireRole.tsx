import React from 'react';
import { Navigate } from 'react-router-dom';
import { Forbidden } from '../Forbidden';
import { User } from '../../types';

type RequireRoleProps = {
  role: 'parent' | 'nanny' | 'admin';
  user: User | null;
  isAdmin: boolean;
  children: React.ReactNode;
};

export function RequireRole({ role, user, isAdmin, children }: RequireRoleProps) {
  if (!user) return <Navigate to="/login" replace />;
  if (role === 'admin' && !isAdmin) return <Forbidden />;
  if (role === 'parent' && user.role !== 'parent') return <Forbidden />;
  if (role === 'nanny' && user.role !== 'nanny') return <Forbidden />;
  return <>{children}</>;
}
