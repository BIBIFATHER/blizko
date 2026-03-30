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
    <div className="min-h-screen bg-[#FAF9F7]">
      {/* Mobile frame container */}
      <div className="max-w-[430px] mx-auto min-h-screen bg-[#FAF9F7] shadow-2xl relative">
        {/* Screen selector - fixed at top for demo navigation */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-[430px]">
          <div className="bg-black/90 backdrop-blur-xl px-4 py-2 flex items-center justify-center gap-2">
            <span className="text-[10px] font-medium text-white/60 uppercase tracking-wider mr-2">Screen:</span>
            {screens.map((screen) => (
              <button
                key={screen.id}
                onClick={() => setActiveScreen(screen.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
                  activeScreen === screen.id
                    ? 'bg-white text-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                {screen.label}
              </button>
            ))}
          </div>
        </div>

        {/* Screen content with top padding for demo nav */}
        <div className="pt-10">
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
  );
}

export default RedesignDemo;
