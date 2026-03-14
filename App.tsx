import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Home } from './components/Home';
import { ParentForm } from './components/ParentForm';
import { NannyForm } from './components/NannyForm';
import { SuccessScreen } from './components/SuccessScreen';
import { MatchResultsScreen } from './components/MatchResultsScreen';
import { AdminPanel } from './components/AdminPanel';
import { SupportChat } from './components/SupportChat';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { InstallPwaModal } from './src/web/pwa/InstallPwaPrompt';
import { ShareModal } from './components/ShareModal';
import { Forbidden } from './components/Forbidden';
import { LoginPage } from './components/LoginPage';
import { HowWeVerifyPage, HumanityPlusPage } from './components/seo/SeoPages';
import { SeoHead } from './components/seo/SeoHead';
import { NannyLandingPage } from './components/NannyLandingPage';
import { NannyPublicProfile } from './components/nanny/NannyPublicProfile';
import { ViewState, ParentRequest, NannyProfile, SubmissionResult, Language, User } from './types';
import { saveParentRequest, saveNannyProfile, getNannyProfiles, updateParentRequest } from './services/storage';
import { sendToWebhook } from './services/api';
import { findBestMatch } from './src/core/ai/matchingAi';
import { User as UserIcon, Share2 } from 'lucide-react';
import { t } from './src/core/i18n/translations';
import { supabase } from './services/supabase';
import { notifyAdminNewRequest } from './services/notifications';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const [lang, setLang] = useState<Language>('ru');
  const [isAdminOpen, setAdminOpen] = useState(false);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [isStandalone, setIsStandalone] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // 1. Check if standalone
    const isStand = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!isStand);

    // 2. Platform check
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    setPlatform(isIOS ? 'ios' : 'android'); // Default to android for desktop as well for simplicity in prompt handling

    // 3. Android deferred prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // We no longer auto-show the modal to respect "no download button" preference, 
      // but keep the logic if we need the modal for other triggers.
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser((prev) => ({
        role: prev?.role,
        name: prev?.name || data.user.user_metadata?.name || 'User',
        id: data.user.id,
        phone: data.user.phone || undefined,
        email: data.user.email || undefined,
      }));
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (!u) {
        setUser(null);
        return;
      }
      setUser((prev) => ({
        role: prev?.role,
        name: prev?.name || u.user_metadata?.name || 'User',
        id: u.id,
        phone: u.phone || undefined,
        email: u.email || undefined,
      }));
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const toggleLanguage = () => {
    setLang(prev => prev === 'ru' ? 'en' : 'ru');
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfileOpen(false);
  };

  const handleEditProfile = (profile?: NannyProfile) => {
    setProfileOpen(false);
    navigate('/become-nanny', { state: { editData: profile } });
  };

  const handleEditParentRequest = (request?: ParentRequest) => {
    setProfileOpen(false);
    navigate('/find-nanny', { state: { editData: request } });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Blizko',
          text: t[lang].heroSubtitle,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    } else {
      setShareModalOpen(true);
    }
  };

  const generateNannyRegistrationResult = (language: Language): SubmissionResult => {
    return {
      matchScore: 0,
      recommendations: language === 'ru'
        ? ['Заполните "О себе" подробнее', 'Добавьте видеовизитку', 'Пройдите верификацию']
        : ['Fill "About" in detail', 'Add video intro', 'Get verified']
    };
  };

  const handleParentSubmit = async (
    data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'> & { id?: string; status?: ParentRequest['status'] }
  ) => {
    if (data.id) {
      const updated = await updateParentRequest(data as Partial<ParentRequest> & { id: string }, {
        actor: 'user',
        note: 'Пользователь обновил заявку',
      });
      if (!updated) {
        alert('Эту заявку нельзя редактировать после одобрения');
        navigate('/');
        return;
      }
      await sendToWebhook(updated);
      navigate('/');
      return;
    }

    const saved = await saveParentRequest({
      ...data,
      requesterEmail: user?.email,
    });
    await sendToWebhook(saved);
    await notifyAdminNewRequest(saved);
    // Track form submission
    try { (await import('./services/analytics')).trackFormSubmit('parent'); } catch { }
    const allNannies = await getNannyProfiles();
    const aiMatchResult = await findBestMatch(data, allNannies, lang);
    // Navigate to match results if we have candidates, otherwise success
    if (aiMatchResult.matchResult && aiMatchResult.matchResult.candidates.length > 0) {
      navigate('/match-results', { state: { matchResult: aiMatchResult.matchResult } });
    } else {
      navigate('/success', { state: { result: aiMatchResult } });
    }
    return { savedId: saved.id };
  };

  const handleNannySubmit = async (data: Partial<NannyProfile>) => {
    const isEdit = !!data.id;
    const saved = await saveNannyProfile(data);
    await sendToWebhook(saved);
    if (isEdit) {
      navigate('/');
    } else {
      navigate('/success', { state: { result: generateNannyRegistrationResult(lang) } });
    }
  };

  const isAdmin = !!(user?.email && adminEmails.includes(String(user.email).toLowerCase()));

  const RequireRole: React.FC<{ role: 'parent' | 'nanny' | 'admin'; children: React.ReactNode }> = ({ role, children }) => {
    if (!user) return <Navigate to="/login" replace />;
    if (role === 'admin' && !isAdmin) return <Forbidden />;
    if (role === 'parent' && user.role !== 'parent') return <Forbidden />;
    if (role === 'nanny' && user.role !== 'nanny') return <Forbidden />;
    return <>{children}</>;
  };

  return (
    <div className="min-h-screen text-stone-700 font-sans selection:bg-amber-100 flex flex-col pb-safe">
      <SeoHead 
        title={lang === 'ru' ? 'Blizko — Сервис по подбору нянь по совместимости' : 'Blizko — AI Nanny Matching Service'}
        description={lang === 'ru' ? 'Blizko использует технологию Humanity+ для подбора няни, идеально совместимой с вашим стилем воспитания. Быстро, безопасно и 100% верифицировано.' : 'Blizko uses Humanity+ AI to match you with a nanny perfectly compatible with your parenting style. Fast, safe, and 100% verified.'}
        canonical="https://blizko.app"
      />
      
      {/* Cloud background blobs */}
      <div className="cloud-bg">
        <div className="cloud-blob cloud-blob-peach" />
        <div className="cloud-blob cloud-blob-mint" />
        <div className="cloud-blob cloud-blob-lavender" />
      </div>

      {/* Top Header: Sticky on scroll */}
      <div className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 top-safe ${isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-4'}`}>
        <div className="max-w-screen-lg mx-auto px-4 md:px-8 flex items-center justify-between">
          <div
            className={`font-semibold text-stone-900 logo-serif text-xl transition-opacity duration-300 cursor-pointer ${isScrolled && location.pathname === '/' ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => { if (location.pathname !== '/') navigate('/'); }}
          >
            Blizko
          </div>

          {/* Core App Controls */}
          <div className="flex items-center gap-2 pr-safe">

            <button
              type="button"
              onClick={handleShare}
              className="bg-white/80 backdrop-blur-md border border-stone-200 text-stone-600 p-2.5 rounded-full hover:bg-white transition-all shadow-sm active:scale-95 min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={t[lang].share}
              aria-label={t[lang].share}
            >
              <Share2 size={16} />
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="bg-white/80 backdrop-blur-md border border-stone-200 text-stone-600 px-3.5 py-2 rounded-full text-sm font-semibold hover:bg-white transition-all shadow-sm active:scale-95 min-h-[44px] flex items-center"
              aria-label={lang === 'ru' ? 'Переключить язык на английский' : 'Switch language to Russian'}
            >
              {lang === 'ru' ? 'EN' : 'RU'}
            </button>

            {!user ? (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="bg-stone-800 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-stone-700 transition-all shadow-sm active:scale-95 min-h-[44px] flex items-center"
              >
                {t[lang].login}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-[11px] text-stone-500 bg-white/80 backdrop-blur-md border border-stone-200 rounded-full px-2.5 py-1" title={user.email || user.name}>
                  {lang === 'ru' ? 'Вы вошли как' : 'Signed in as'} {user.email || user.name}
                </span>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  className="bg-white/80 backdrop-blur-md border border-stone-200 px-3 py-2 rounded-full text-stone-600 hover:bg-white hover:text-amber-600 transition-all shadow-sm flex items-center gap-1.5 min-h-[44px]"
                  title={user.email || user.name}
                >
                  <UserIcon size={16} />
                  <span className="text-xs font-medium max-w-[110px] truncate">{user.name || 'Профиль'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-screen-lg mx-auto px-4 md:px-8 pb-24 relative pt-safe">
        <Routes>
          <Route path="/" element={<Home lang={lang} />} />
          <Route path="/nanny/:slug" element={<NannyPublicProfile lang={lang} />} />
          <Route path="/find-nanny" element={<ParentForm onSubmit={handleParentSubmit} lang={lang} />} />
          <Route path="/become-nanny" element={<NannyForm onSubmit={handleNannySubmit} lang={lang} />} />
          <Route path="/success" element={<SuccessScreen lang={lang} />} />
          <Route path="/match-results" element={<MatchResultsScreen lang={lang} />} />
          <Route path="/how-we-verify" element={<HowWeVerifyPage />} />
          <Route path="/humanity-plus" element={<HumanityPlusPage />} />
          <Route path="/for-nannies" element={<NannyLandingPage />} />
          <Route
            path="/nanny-dashboard"
            element={
              <RequireRole role="nanny">
                <div className="text-sm text-stone-500">Nanny dashboard</div>
              </RequireRole>
            }
          />
          <Route
            path="/family-dashboard"
            element={
              <RequireRole role="parent">
                <div className="text-sm text-stone-500">Family dashboard</div>
              </RequireRole>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireRole role="admin">
                <AdminPanel onClose={() => navigate('/')} />
              </RequireRole>
            }
          />
          <Route path="/login" element={<LoginPage onOpenAuth={() => setAuthOpen(true)} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer Area */}
      <footer className="py-6 text-center text-stone-400 text-xs">
        <div className="max-w-md mx-auto relative">
          <div className="text-[10px] leading-snug text-stone-400">
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => navigate('/become-nanny')} className="underline hover:text-stone-500">
                {lang === 'ru' ? 'Стать няней' : 'Become a nanny'}
              </button>
              <span className="text-stone-300">·</span>
              <a href="/privacy" className="underline hover:text-stone-500">Политика конфиденциальности</a>
              <span className="text-stone-300">·</span>
              <a href="/offer.html" className="underline hover:text-stone-500">Оферта</a>
            </div>
          </div>
          {user?.email && adminEmails.includes(user.email.toLowerCase()) && (
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="mt-2 opacity-30 hover:opacity-100 transition-opacity"
            >
              Admin
            </button>
          )}
        </div>
      </footer>

      {/* PWA Install Modal - Controlled by App state */}
      <InstallPwaModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        onInstall={handleInstallClick}
        platform={platform}
        canInstall={!!deferredPrompt}
        lang={lang}
      />

      {/* Overlays / Modals */}
      {isAdminOpen && user?.email && adminEmails.includes(user.email.toLowerCase()) && <AdminPanel onClose={() => setAdminOpen(false)} />}

      {isAuthOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onLogin={handleLogin}
          lang={lang}
        />
      )}

      {isProfileOpen && user && (
        <UserProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onLogout={handleLogout}
          lang={lang}
          onEditProfile={handleEditProfile}
          onEditParentRequest={handleEditParentRequest}
        />
      )}

      {isShareModalOpen && (
        <ShareModal
          onClose={() => setShareModalOpen(false)}
          lang={lang}
        />
      )}

      {/* Global Support Chat */}
      <SupportChat lang={lang} user={user} hideLauncher={location.pathname === '/'} />
    </div>
  );
}