import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { User } from '@/core/types';

function toAppUser(
  source: {
    id: string;
    email?: string | null;
    phone?: string | null;
    user_metadata?: Record<string, unknown>;
  },
  previous: User | null
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
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser((prev) => toAppUser(data.user, prev));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      if (!sessionUser) {
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
    isAuthOpen,
    setAuthOpen,
    isProfileOpen,
    setProfileOpen,
    handleLogin,
    handleLogout,
  };
}
