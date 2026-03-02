import React, { useState, useEffect } from 'react';
import { Home } from './components/Home';
import { ParentForm } from './components/ParentForm';
import { NannyForm } from './components/NannyForm';
import { SuccessScreen } from './components/SuccessScreen';
import { AdminPanel } from './components/AdminPanel';
import { SupportChat } from './components/SupportChat';
import { AuthModal } from './components/AuthModal';
import { UserProfileModal } from './components/UserProfileModal';
import { InstallPwaModal } from './src/web/pwa/InstallPwaPrompt';
import { ShareModal } from './components/ShareModal';
import { ViewState, ParentRequest, NannyProfile, SubmissionResult, Language, User } from './types';
import { saveParentRequest, saveNannyProfile, getNannyProfiles } from './services/storage';
import { sendToWebhook } from './services/api';
import { findBestMatch } from './src/core/ai/matchingAi';
import { User as UserIcon, Share2 } from 'lucide-react';
import { t } from './src/core/i18n/translations';

export default function App() {
  const [view, setView] = useState<ViewState>('home');
  const [lang, setLang] = useState<Language>('ru');
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setAuthOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [isShareModalOpen, setShareModalOpen] = useState(false);
  const [nannyEditData, setNannyEditData] = useState<NannyProfile | undefined>(undefined);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('android');
  const [isStandalone, setIsStandalone] = useState(false);

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

  const handleLogout = () => {
    setUser(null);
    setProfileOpen(false);
    setNannyEditData(undefined);
  };

  const handleEditProfile = (profile?: NannyProfile) => {
    setNannyEditData(profile);
    setProfileOpen(false);
    setView('nanny-form');
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

  const handleParentSubmit = async (data: Omit<ParentRequest, 'id' | 'createdAt' | 'type'>) => {
    const saved = saveParentRequest(data);
    await sendToWebhook(saved);
    const allNannies = getNannyProfiles();
    const aiMatchResult = await findBestMatch(data, allNannies, lang);
    setResult(aiMatchResult);
    setView('success');
  };

  const handleNannySubmit = async (data: Partial<NannyProfile>) => {
    const saved = saveNannyProfile(data);
    await sendToWebhook(saved);
    if (nannyEditData) {
      setView('home');
      setNannyEditData(undefined);
    } else {
      setResult(generateNannyRegistrationResult(lang));
      setView('success');
    }
  };

  return (
    <div className="min-h-screen bg-milk text-stone-700 font-sans selection:bg-amber-100 flex flex-col pb-safe">
      {/* Top Header: Language & Auth - Adjusted for Safe Area */}
      <div className="absolute top-4 right-4 top-safe z-20 flex items-center gap-2 pr-safe">
        
        <button 
          onClick={handleShare}
          className="bg-white/80 backdrop-blur-md border border-stone-200 text-stone-600 p-2 rounded-full hover:bg-white transition-all shadow-sm active:scale-95"
          title={t[lang].share}
        >
          <Share2 size={16} />
        </button>

        <button 
          onClick={toggleLanguage}
          className="bg-white/80 backdrop-blur-md border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full text-sm font-semibold hover:bg-white transition-all shadow-sm active:scale-95"
        >
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>

        {!user ? (
          <button 
            onClick={() => setAuthOpen(true)}
            className="bg-stone-800 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-stone-700 transition-all shadow-sm active:scale-95"
          >
            {t[lang].login}
          </button>
        ) : (
          <button 
            onClick={() => setProfileOpen(true)}
            className="bg-white/80 backdrop-blur-md border border-stone-200 p-1.5 rounded-full text-stone-600 hover:bg-white hover:text-amber-600 transition-all shadow-sm"
          >
            <UserIcon size={20} />
          </button>
        )}
      </div>

      <main className="flex-1 w-full max-w-md mx-auto p-6 pb-24 relative pt-safe pl-safe pr-safe">
        {view === 'home' && (
          <Home 
            onFindNanny={() => setView('parent-form')}
            onBecomeNanny={() => {
              setNannyEditData(undefined);
              setView('nanny-form');
            }}
            lang={lang}
          />
        )}

        {view === 'parent-form' && (
          <ParentForm 
            onSubmit={handleParentSubmit} 
            onBack={() => setView('home')} 
            lang={lang}
          />
        )}

        {view === 'nanny-form' && (
          <NannyForm 
            onSubmit={handleNannySubmit} 
            onBack={() => setView('home')} 
            lang={lang}
            initialData={nannyEditData}
          />
        )}

        {view === 'success' && result && (
          <SuccessScreen 
            result={result} 
            onHome={() => setView('home')} 
            lang={lang}
          />
        )}
      </main>

      {/* Footer Area */}
      <footer className="py-6 text-center text-stone-400 text-xs fixed bottom-0 bottom-safe left-0 right-0 pointer-events-none">
        <div className="max-w-md mx-auto relative pointer-events-auto">
          <p>© 2024 Blizko</p>
          <button 
            onClick={() => setAdminOpen(true)} 
            className="mt-2 opacity-30 hover:opacity-100 transition-opacity"
          >
            Admin
          </button>
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
      {isAdminOpen && <AdminPanel onClose={() => setAdminOpen(false)} />}
      
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
        />
      )}

      {isShareModalOpen && (
        <ShareModal 
          onClose={() => setShareModalOpen(false)}
          lang={lang}
        />
      )}

      {/* Global Support Chat */}
      <SupportChat lang={lang} user={user} />
    </div>
  );
}