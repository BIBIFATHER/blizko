// DEV-ONLY visual harness for the admin redesign. Renders each tab on mock data
// inside a layout that mirrors the real /admin (left sidebar + top bar).
// Not shipped — removed before commit/deploy. Open /admin-preview?view=nannies
import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Baby,
  CalendarDays,
  Blend,
  MessageCircle,
  ScrollText,
} from 'lucide-react';
import { AdminWorkflowUIProvider } from '@/components/admin/adminWorkflowUI';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminParentsTab } from '@/components/admin/AdminParentsTab';
import { AdminNanniesTab } from '@/components/admin/AdminNanniesTab';
import { AdminBookingsTab } from '@/components/admin/AdminBookingsTab';
import { AdminCuratorTab } from '@/components/admin/AdminCuratorTab';
import { AdminSupportTab } from '@/components/admin/AdminSupportTab';
import { AdminJournalTab, AdminActionEntry } from '@/components/admin/AdminJournalTab';
import { mockNannies, mockParents, mockBookings, mockActionFeed } from './fixtures';

const noop = () => {};

type View = 'overview' | 'parents' | 'nannies' | 'bookings' | 'curator' | 'support' | 'journal';

const NAV_ITEMS: {
  view: View;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { view: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { view: 'parents', label: 'Родители', icon: Users },
  { view: 'nannies', label: 'Няни', icon: Baby },
  { view: 'bookings', label: 'Бронирования', icon: CalendarDays },
  { view: 'curator', label: 'Куратор', icon: Blend },
  { view: 'support', label: 'Чаты', icon: MessageCircle },
  { view: 'journal', label: 'Журнал', icon: ScrollText },
];

export const AdminPreviewHarness: React.FC = () => {
  const params = new URLSearchParams(window.location.search);
  const view = (params.get('view') as View) || 'nannies';

  const [feed, setFeed] = useState<AdminActionEntry[]>(mockActionFeed);
  const [range, setRange] = useState<'1' | '7' | '30' | 'all'>('7');

  return (
    <AdminWorkflowUIProvider onWorkflowEvent={noop}>
      <div className="min-h-screen bg-[color:var(--color-bg)] flex flex-col">
        {/* Top bar */}
        <header className="shrink-0 border-b border-[color:var(--cloud-border)] bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
          <span className="text-sm text-stone-500">← На сайт</span>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs font-medium text-stone-500"
            >
              Тестовые
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200/70 bg-white/70 px-3 py-1.5 text-xs font-medium text-red-600/90"
            >
              Очистить всё
            </button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 flex-col md:flex-row">
          {/* Desktop sidebar */}
          <nav className="hidden md:flex flex-col w-52 shrink-0 border-r border-[color:var(--cloud-border)] bg-white/60 pt-6 pb-10 gap-1 px-3">
            <div className="px-2 mb-4">
              <h1 className="text-lg font-semibold text-stone-900">Админ-панель</h1>
              <p className="text-xs text-stone-400 mt-0.5">Операционная панель</p>
            </div>
            {NAV_ITEMS.map(({ view: v, label, icon: Icon }) => {
              const active = v === view;
              return (
                <a
                  key={v}
                  href={`/admin-preview?view=${v}`}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-[color:var(--color-primary)] text-white'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </a>
              );
            })}
          </nav>

          {/* Mobile tabs */}
          <div className="md:hidden shrink-0 border-b border-[color:var(--cloud-border)] bg-white/70 flex overflow-x-auto gap-1 px-3 py-2">
            {NAV_ITEMS.map(({ view: v, label }) => {
              const active = v === view;
              return (
                <a
                  key={v}
                  href={`/admin-preview?view=${v}`}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[color:var(--color-primary)] text-white border-[color:var(--color-primary)]'
                      : 'bg-white/70 text-stone-700 border-stone-200/80 hover:bg-white'
                  }`}
                >
                  {label}
                </a>
              );
            })}
          </div>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {view === 'overview' && (
              <AdminOverviewTab
                parents={mockParents}
                nannies={mockNannies}
                bookings={mockBookings}
                events={[]}
                unseenParentsCount={2}
              />
            )}
            {view === 'parents' && (
              <AdminParentsTab parents={mockParents} query="" onDataChanged={noop} />
            )}
            {view === 'nannies' && (
              <AdminNanniesTab
                nannies={mockNannies}
                query=""
                onlyProblematic={false}
                onDataChanged={noop}
                logAdminAction={noop}
              />
            )}
            {view === 'bookings' && (
              <AdminBookingsTab
                bookings={mockBookings}
                parents={mockParents}
                nannies={mockNannies}
                onStatusChange={noop}
              />
            )}
            {view === 'curator' && (
              <AdminCuratorTab
                parents={mockParents}
                nannies={mockNannies}
                onDataChanged={noop}
                logAdminAction={noop}
              />
            )}
            {view === 'support' && <AdminSupportTab />}
            {view === 'journal' && (
              <AdminJournalTab
                actionFeed={feed}
                actionFeedHasMore={false}
                actionFeedLoading={false}
                journalRange={range}
                setJournalRange={setRange}
                setActionFeed={setFeed}
                loadMoreActionFeed={async () => {}}
              />
            )}
          </main>
        </div>
      </div>
    </AdminWorkflowUIProvider>
  );
};
