import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { User } from '@/core/types';
import { isIdentityAdmitted, isSyntheticOnly } from '@/core/config/synthetic';

// Synthetic-only: a restored session / existing JWT must not grant access to a
// non-allow-listed identity. Defense-in-depth; hard enforcement is Supabase-side
// session revocation + Auth config (owner-gated).
function admittedRestoredSession(source: {
  email?: string | null;
  phone?: string | null;
}): boolean {
  return !isSyntheticOnly() || isIdentityAdmitted(source);
}

function toAppUser(
  source: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  previous: User | null,
): User {
  return {
    role: previous?.role,
    name: previous?.name || String(source.user_metadata?.name || 'User'),
    id: source.id,
    phone: source.phone || undefined,
    email: source.email || undefined,
  };
}

export function useAuthSession() {
  const [user, setUser] = useState<User | null>(null);
  // true пока не отработал первый getUser — иначе guard'ы (RequireRole) редиректят
  // на /login при deep-link, ещё до гидратации сессии.
  const [authLoading, setAuthLoading] = useState<boolean>(!!supabase);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    // authLoading инициализируется как !!supabase, поэтому при отсутствии supabase
    // он уже false — отдельный setState не нужен (и не триггерит cascading render).
    if (!supabase) return;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) return;
        if (!admittedRestoredSession(data.user)) {
          void supabase.auth.signOut();
          setUser(null);
          return;
        }
        setUser((prev) => toAppUser(data.user, prev));
      })
      .finally(() => setAuthLoading(false));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser) {
        setUser(null);
        return;
      }

      if (!admittedRestoredSession(sessionUser)) {
        void supabase.auth.signOut();
        setUser(null);
        return;
      }

      setUser((prev) => toAppUser(sessionUser, prev));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogin = (nextUser: User) => {
    setUser(nextUser);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfileOpen(false);
  };

  return {
    user,
    setUser,
    authLoading,
    isAuthOpen,
    setAuthOpen,
    isProfileOpen,
    setProfileOpen,
    handleLogin,
    handleLogout,
  };
}
