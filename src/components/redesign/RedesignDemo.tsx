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

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Screen selector - fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-stone-200 safe-top">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Demo</span>
            <div className="flex gap-1 p-1 bg-stone-100 rounded-lg">
              {screens.map((screen) => (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreen(screen.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    activeScreen === screen.id
                      ? 'bg-white text-stone-900 shadow-sm'
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {screen.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Screen content */}
      <div className="pt-14">
        {activeScreen === 'profile' && (
          <NannyProfileMobile 
            onBack={() => setActiveScreen('shortlist')} 
            onContact={() => alert('Contact flow would open')}
          />
        )}
        {activeScreen === 'shortlist' && (
          <ShortlistCompareMobile 
            onViewProfile={() => setActiveScreen('profile')}
            onBack={() => setActiveScreen('dashboard')}
          />
        )}
        {activeScreen === 'dashboard' && (
          <ParentDashboardMobile 
            onViewShortlist={() => setActiveScreen('shortlist')}
          />
        )}
      </div>
    </div>
  );
}
