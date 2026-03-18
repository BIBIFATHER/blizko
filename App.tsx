import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Home } from './components/Home';
import { InstallPwaModal } from './src/web/pwa/InstallPwaPrompt';
import { SeoHead } from './components/seo/SeoHead';
import { ViewState, ParentRequest, NannyProfile, Language } from './types';
import { useAuthSession } from './src/hooks/useAuthSession';
import { usePwaInstall } from './src/hooks/usePwaInstall';
import { useParentSubmit } from './src/hooks/useParentSubmit';
import { useNannySubmit } from './src/hooks/useNannySubmit';
import { useShareActions } from './src/hooks/useShareActions';
import { AppHeader } from './components/app/AppHeader';
import { AppFooter } from './components/app/AppFooter';
import { RequireRole } from './components/app/RequireRole';
import { trackAuthModalOpen, trackLanguageSwitch } from './services/analytics';

const ParentForm = lazy(() => import('./components/ParentForm').then((module) => ({ default: module.ParentForm })));
const NannyForm = lazy(() => import('./components/NannyForm').then((module) => ({ default: module.NannyForm })));
const SuccessScreen = lazy(() => import('./components/SuccessScreen').then((module) => ({ default: module.SuccessScreen })));
const MatchResultsScreen = lazy(() => import('./components/MatchResultsScreen').then((module) => ({ default: module.MatchResultsScreen })));
const AdminPanel = lazy(() => import('./components/AdminPanel').then((module) => ({ default: module.AdminPanel })));
const LoginPage = lazy(() => import('./components/LoginPage').then((module) => ({ default: module.LoginPage })));
const NannyLandingPage = lazy(() => import('./components/NannyLandingPage').then((module) => ({ default: module.NannyLandingPage })));
const NannyPublicProfile = lazy(() => import('./components/nanny/NannyPublicProfile').then((module) => ({ default: module.NannyPublicProfile })));
const HowWeVerifyPage = lazy(() => import('./components/seo/SeoPages').then((module) => ({ default: module.HowWeVerifyPage })));
const HumanityPlusPage = lazy(() => import('./components/seo/SeoPages').then((module) => ({ default: module.HumanityPlusPage })));
const OfertaPage = lazy(() => import('./components/legal/LegalPages').then((module) => ({ default: module.OfertaPage })));
const AboutPage = lazy(() => import('./components/legal/LegalPages').then((module) => ({ default: module.AboutPage })));
const SafeDealPage = lazy(() => import('./components/legal/LegalPages').then((module) => ({ default: module.SafeDealPage })));
const PrivacyPage = lazy(() => import('./components/legal/LegalPages').then((module) => ({ default: module.PrivacyPage })));
const SupportChat = lazy(() => import('./components/SupportChat').then((module) => ({ default: module.SupportChat })));
const AuthModal = lazy(() => import('./components/AuthModal').then((module) => ({ default: module.AuthModal })));
const UserProfileModal = lazy(() => import('./components/UserProfileModal').then((module) => ({ default: module.UserProfileModal })));
const ShareModal = lazy(() => import('./components/ShareModal').then((module) => ({ default: module.ShareModal })));
const RoleDashboard = lazy(() => import('./components/dashboard/RoleDashboard').then((module) => ({ default: module.RoleDashboard })));

function RouteFallback() {
  return <div className="flex items-center justify-center py-16 text-sm text-stone-500">Загружаем...</div>;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const adminEmails = String(import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const [lang, setLang] = useState<Language>('ru');
  const [isAdminOpen, setAdminOpen] = useState(false);
  const {
    user,
    isAuthOpen,
    setAuthOpen,
    isProfileOpen,
    setProfileOpen,
    handleLogin,
    handleLogout,
  } = useAuthSession();
  const {
    isShareModalOpen,
    setShareModalOpen,
    handleShare,
  } = useShareActions({ lang });
  const {
    deferredPrompt,
    showInstallModal,
    setShowInstallModal,
    platform,
    handleInstallClick,
  } = usePwaInstall();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const openAuthFromEvent = (event: Event) => {
      const source = event instanceof CustomEvent ? event.detail?.source || 'custom_event' : 'custom_event';
      trackAuthModalOpen(String(source));
      setAuthOpen(true);
    };

    window.addEventListener('blizko:open-auth-modal', openAuthFromEvent);
    return () => window.removeEventListener('blizko:open-auth-modal', openAuthFromEvent);
  }, [setAuthOpen]);

  const toggleLanguage = () => {
    setLang(prev => {
      const next = prev === 'ru' ? 'en' : 'ru';
      trackLanguageSwitch(next);
      return next;
    });
  };

  const handleEditProfile = (profile?: NannyProfile) => {
    setProfileOpen(false);
    navigate('/become-nanny', { state: { editData: profile } });
  };

  const handleEditParentRequest = (request?: ParentRequest) => {
    setProfileOpen(false);
    navigate('/find-nanny', { state: { editData: request } });
  };

  const handleParentSubmit = useParentSubmit({ navigate, user, lang });
  const handleNannySubmit = useNannySubmit({ navigate, lang });

  const isAdmin = !!(user?.email && adminEmails.includes(String(user.email).toLowerCase()));
  const currentPath = location.pathname;
  const pageSeo = (() => {
    if (currentPath === '/find-nanny') {
      return {
        title: lang === 'ru' ? 'Найти няню в Москве | Заявка в Blizko' : 'Find a nanny in Moscow | Blizko request',
        description: lang === 'ru' ? 'Оставьте заявку и получите небольшой shortlist с модерацией профилей и понятными причинами выбора.' : 'Submit your request and receive a small shortlist with moderated profiles and clear reasons for each choice.',
        canonical: 'https://blizko.app/find-nanny',
        robots: 'noindex, nofollow',
      };
    }
    if (currentPath === '/become-nanny') {
      return {
        title: lang === 'ru' ? 'Стать няней в Blizko' : 'Become a nanny on Blizko',
        description: lang === 'ru' ? 'Заполните анкету, пройдите проверку и решите, когда активировать профиль для получения заказов.' : 'Complete your profile, pass review, and decide when to activate it to receive requests.',
        canonical: 'https://blizko.app/become-nanny',
        robots: 'index, follow',
      };
    }
    if (currentPath === '/for-nannies') {
      return {
        title: lang === 'ru' ? 'Работа няней в Москве | Blizko' : 'Nanny jobs in Moscow | Blizko',
        description: lang === 'ru' ? 'Blizko помогает няням пройти путь от анкеты и проверки до более понятных запросов от семей.' : 'Blizko helps nannies move from profile review to clearer family requests.',
        canonical: 'https://blizko.app/for-nannies',
        robots: 'index, follow',
      };
    }
    if (currentPath === '/login' || currentPath.startsWith('/admin') || currentPath.endsWith('-dashboard')) {
      return {
        title: lang === 'ru' ? 'Вход | Blizko' : 'Login | Blizko',
        description: lang === 'ru' ? 'Вход в аккаунт Blizko.' : 'Sign in to Blizko.',
        canonical: `https://blizko.app${currentPath}`,
        robots: 'noindex, nofollow',
      };
    }
    return {
      title: lang === 'ru' ? 'Blizko — спокойный подбор няни для семьи' : 'Blizko — calmer nanny search for families',
      description: lang === 'ru' ? 'Blizko помогает пройти путь от тревожного поиска к shortlist из 2-3 кандидатов с модерацией профилей и понятными причинами выбора.' : 'Blizko helps families move from anxious searching to a shortlist of 2-3 candidates with profile moderation and clear reasons for each choice.',
      canonical: 'https://blizko.app',
      robots: 'index, follow',
    };
  })();

  return (
    <div className="min-h-screen text-stone-700 font-sans selection:bg-amber-100 flex flex-col pb-safe">
      <SeoHead 
        title={pageSeo.title}
        description={pageSeo.description}
        canonical={pageSeo.canonical}
        robots={pageSeo.robots}
      />
      
      {/* Cloud background blobs */}
      <div className="cloud-bg">
        <div className="cloud-blob cloud-blob-peach" />
        <div className="cloud-blob cloud-blob-mint" />
        <div className="cloud-blob cloud-blob-lavender" />
      </div>

      <AppHeader
        lang={lang}
        user={user}
        isScrolled={isScrolled}
        onToggleLanguage={toggleLanguage}
        onShare={handleShare}
        onOpenAuth={() => {
          trackAuthModalOpen('app_header');
          setAuthOpen(true);
        }}
        onOpenProfile={() => setProfileOpen(true)}
      />

      <main className="flex-1 w-full max-w-screen-lg mx-auto px-4 md:px-8 pb-24 relative pt-safe">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home lang={lang} />} />
            <Route path="/nanny/:slug" element={<NannyPublicProfile lang={lang} />} />
            <Route path="/find-nanny" element={<ParentForm onSubmit={handleParentSubmit} lang={lang} />} />
            <Route path="/become-nanny" element={<NannyForm onSubmit={handleNannySubmit} lang={lang} />} />
            <Route path="/success" element={<SuccessScreen lang={lang} />} />
            <Route path="/match-results" element={<MatchResultsScreen lang={lang} />} />
            <Route path="/how-we-verify" element={<HowWeVerifyPage />} />
            <Route path="/humanity-plus" element={<HumanityPlusPage />} />
            <Route path="/oferta" element={<OfertaPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/safe-deal" element={<SafeDealPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/for-nannies" element={<NannyLandingPage />} />
            <Route
              path="/nanny-dashboard"
              element={
                <RequireRole role="nanny" user={user} isAdmin={isAdmin}>
                  <RoleDashboard user={user!} lang={lang} />
                </RequireRole>
              }
            />
            <Route
              path="/family-dashboard"
              element={
                <RequireRole role="parent" user={user} isAdmin={isAdmin}>
                  <RoleDashboard user={user!} lang={lang} />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireRole role="admin" user={user} isAdmin={isAdmin}>
                  <AdminPanel onClose={() => navigate('/')} />
                </RequireRole>
              }
            />
            <Route path="/login" element={<LoginPage onOpenAuth={() => setAuthOpen(true)} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      <AppFooter
        lang={lang}
        user={user}
        isAdmin={isAdmin}
        onBecomeNanny={() => navigate('/become-nanny')}
        onOpenAdmin={() => setAdminOpen(true)}
      />

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
      {isAdminOpen && user?.email && adminEmails.includes(user.email.toLowerCase()) && (
        <Suspense fallback={<RouteFallback />}>
          <AdminPanel onClose={() => setAdminOpen(false)} />
        </Suspense>
      )}

      {isAuthOpen && (
        <Suspense fallback={<RouteFallback />}>
          <AuthModal
            onClose={() => setAuthOpen(false)}
            onLogin={handleLogin}
            lang={lang}
          />
        </Suspense>
      )}

      {isProfileOpen && user && (
        <Suspense fallback={<RouteFallback />}>
          <UserProfileModal
            user={user}
            onClose={() => setProfileOpen(false)}
            onLogout={handleLogout}
            lang={lang}
            onEditProfile={handleEditProfile}
            onEditParentRequest={handleEditParentRequest}
          />
        </Suspense>
      )}

      {isShareModalOpen && (
        <Suspense fallback={<RouteFallback />}>
          <ShareModal
            onClose={() => setShareModalOpen(false)}
            lang={lang}
          />
        </Suspense>
      )}

      {/* Global Support Chat */}
      <Suspense fallback={null}>
        <SupportChat lang={lang} user={user} hideLauncher={location.pathname === '/'} />
      </Suspense>
    </div>
  );
}
