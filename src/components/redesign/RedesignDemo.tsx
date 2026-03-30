import React, { useState } from 'react';
import { NannyProfileMobile } from './NannyProfileMobile';
import { ShortlistCompareMobile } from './ShortlistCompareMobile';
import { ParentDashboardMobile } from './ParentDashboardMobile';

type Screen = 'profile' | 'shortlist' | 'dashboard';

export function RedesignDemo() {
  const [activeScreen, setActiveScreen] = useState<Screen>('dashboard');

  const screens: { id: Screen; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'shortlist', label: 'Shortlist' },
    { id: 'profile', label: 'Profile' },
  ];

  const handleNavigate = (path: string) => {
    if (path.includes('shortlist')) {
      setActiveScreen('shortlist');
    } else if (path.includes('nanny')) {
      setActiveScreen('profile');
    } else if (path.includes('find-nanny')) {
      setActiveScreen('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex items-start justify-center p-4 pt-8">
      {/* Phone frame */}
      <div className="relative">
        {/* Screen selector above phone - small centered serif container */}
        <div className="flex items-center justify-center mb-5">
          <div className="inline-flex items-center gap-4 px-5 py-2 bg-[#F7F5F2] rounded-full border-[0.5px] border-stone-200/50 shadow-[0_4px_20px_-4px_rgba(200,190,170,0.15)]">
            {screens.map((screen) => (
              <button
                key={screen.id}
                onClick={() => setActiveScreen(screen.id)}
                className={`text-xs font-serif transition-all ${
                  activeScreen === screen.id
                    ? 'text-stone-700'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>

        {/* Phone shell - warm stone color */}
        <div className="relative mx-auto">
          <div className="absolute -inset-2 bg-stone-200 rounded-[3rem] shadow-[0_8px_40px_-8px_rgba(200,190,170,0.3)]" />
          
          {/* Dynamic island */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-24 h-6 bg-stone-800 rounded-full" style={{ top: '6px' }} />
          
          {/* Screen */}
          <div className="relative w-[375px] h-[812px] bg-[#FDFCFB] rounded-[2.5rem] overflow-hidden">
            <div className="h-full overflow-y-auto overflow-x-hidden">
              {activeScreen === 'profile' && (
                <NannyProfileMobile 
                  onBack={() => setActiveScreen('shortlist')}
                />
              )}
              {activeScreen === 'shortlist' && (
                <ShortlistCompareMobile 
                  onSelectNanny={() => setActiveScreen('profile')}
                  onBack={() => setActiveScreen('dashboard')}
                />
              )}
              {activeScreen === 'dashboard' && (
                <ParentDashboardMobile 
                  onNavigate={handleNavigate}
                />
              )}
            </div>
          </div>
        </div>

        {/* Description below - editorial style */}
        <div className="text-center mt-5 max-w-xs mx-auto">
          <p className="text-stone-500 text-xs font-light leading-relaxed">
            {activeScreen === 'dashboard' && 'Главный экран с прогрессом поиска и шортлистом'}
            {activeScreen === 'shortlist' && 'Сравнение кандидатов и управление избранным'}
            {activeScreen === 'profile' && 'Детальный профиль няни с проверками и отзывами'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default RedesignDemo;
