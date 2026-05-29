import React, { useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Baby,
  CalendarDays,
  ScrollText,
  Trash2,
  Search,
  ArrowLeft,
  Blend,
  MessageCircle,
} from 'lucide-react';
import { ParentRequest, NannyProfile } from '@/core/types';
import { Button } from '@/components/UI';
import { supabase } from '@/services/supabase';
import { getItem, setItem } from '@/core/platform/storage';
import { createAdminAction, fetchAdminActions } from '@/services/adminApi';
import { AdminOverviewTab } from '@/components/admin/AdminOverviewTab';
import { AdminParentsTab } from '@/components/admin/AdminParentsTab';
import { AdminNanniesTab } from '@/components/admin/AdminNanniesTab';
import { AdminBookingsTab } from '@/components/admin/AdminBookingsTab';
import { AdminJournalTab, AdminActionEntry } from '@/components/admin/AdminJournalTab';
import { AdminCuratorTab } from '@/components/admin/AdminCuratorTab';
import { AdminSupportTab } from '@/components/admin/AdminSupportTab';
import {
  AdminWorkflowEvent,
  AdminWorkflowUIProvider,
  useAdminWorkflowUI,
} from '@/components/admin/adminWorkflowUI';
import { getAllBookings, updateBookingStatus, Booking } from '@/services/booking';
import {
  AnalyticsEventRecord,
  fetchRemoteAnalyticsEvents,
  getAnalyticsEvents,
} from '@/services/analytics';

type AdminTab = 'overview' | 'parents' | 'nannies' | 'bookings' | 'curator' | 'support' | 'journal';
type AdminJournalRange = '1' | '7' | '30' | 'all';

const ADMIN_PARENTS_SEEN_BY_ID_KEY = 'blizko_admin_parents_seen_by_id';
const ADMIN_ACTIONS_KEY = 'blizko_admin_actions';

function getParentUpdatedAt(parent: ParentRequest) {
  return Number(parent.updatedAt || parent.createdAt || 0);
}

function readSeenParentMap() {
  try {
    return JSON.parse(getItem(ADMIN_PARENTS_SEEN_BY_ID_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function countUnseenParents(parents: ParentRequest[]) {
  const seenById = readSeenParentMap();
  return parents.filter((parent) => {
    const updatedAt = getParentUpdatedAt(parent);
    const seenAt = seenById[parent.id] || 0;
    return updatedAt > seenAt;
  }).length;
}

const NAV_ITEMS: {
  tab: AdminTab;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  { tab: 'overview', label: 'Обзор', icon: LayoutDashboard },
  { tab: 'parents', label: 'Родители', icon: Users },
  { tab: 'nannies', label: 'Няни', icon: Baby },
  { tab: 'bookings', label: 'Бронирования', icon: CalendarDays },
  { tab: 'curator', label: 'Куратор', icon: Blend },
  { tab: 'support', label: 'Чаты', icon: MessageCircle },
  { tab: 'journal', label: 'Журнал', icon: ScrollText },
];

const AdminPageContent: React.FC<{
  actionFeed: AdminActionEntry[];
  actionFeedHasMore: boolean;
  actionFeedLoading: boolean;
  journalRange: AdminJournalRange;
  setJournalRange: React.Dispatch<React.SetStateAction<AdminJournalRange>>;
  setActionFeed: React.Dispatch<React.SetStateAction<AdminActionEntry[]>>;
  loadMoreActionFeed: () => Promise<void>;
  logAdminAction: (action: string, meta?: Record<string, unknown>) => void;
}> = ({
  actionFeed,
  actionFeedHasMore,
  actionFeedLoading,
  journalRange,
  setJournalRange,
  setActionFeed,
  loadMoreActionFeed,
  logAdminAction,
}) => {
  const { confirmAction, reportSuccess } = useAdminWorkflowUI();
  const navigate = useNavigate();
  const location = useLocation();
  const { tab = 'overview' } = useParams<{ tab?: string }>();
  const activeTab = (NAV_ITEMS.some((n) => n.tab === tab) ? tab : 'overview') as AdminTab;
  const focusedParentId = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('q') || params.get('request') || '').trim();
  }, [location.search]);
  const focusedSupportTicketId = React.useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get('ticket') || '').trim();
  }, [location.search]);

  const [parents, setParents] = useState<ParentRequest[]>([]);
  const [nannies, setNannies] = useState<NannyProfile[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRecord[]>([]);
  const [unseenParentsCount, setUnseenParentsCount] = useState(0);
  const [query, setQuery] = useState(focusedParentId);
  const [onlyProblematic, setOnlyProblematic] = useState(false);

  const loadData = async () => {
    const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const [pr, nr, remoteAnalytics] = await Promise.all([
      fetch('/api/data?resource=parents', { headers })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .catch(() => ({ items: [] })),
      fetch('/api/data?resource=nannies', { headers })
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .catch(() => ({ items: [] })),
      fetchRemoteAnalyticsEvents(30, token),
    ]);

    const p = Array.isArray(pr?.items) ? pr.items : [];
    const n = Array.isArray(nr?.items) ? nr.items : [];
    setParents(p);
    setNannies(n);
    setAnalyticsEvents(remoteAnalytics.length ? remoteAnalytics : getAnalyticsEvents());

    setUnseenParentsCount(countUnseenParents(p));

    setBookings(await getAllBookings());
  };

  useEffect(() => {
    queueMicrotask(() => {
      void loadData();
    });
  }, []);

  useEffect(() => {
    if (activeTab === 'parents' && focusedParentId) {
      setQuery(focusedParentId);
    }
  }, [activeTab, focusedParentId]);

  const handleClear = async () => {
    const { clearAllData } = await import('@/services/storage');
    const ok = await confirmAction({ message: 'Удалить все данные?', confirmLabel: 'Удалить всё' });
    if (!ok) return;
    logAdminAction('clear_all');
    await clearAllData();
    setParents([]);
    setNannies([]);
    reportSuccess('Все локальные данные очищены.');
  };

  const handleClearTest = async () => {
    const { clearTestData } = await import('@/services/storage');
    const ok = await confirmAction({
      message: 'Удалить только тестовые записи?',
      confirmLabel: 'Удалить тестовые',
    });
    if (!ok) return;
    logAdminAction('clear_test');
    await clearTestData();
    await loadData();
    reportSuccess('Тестовые записи удалены.');
  };

  const markParentAsSeen = (parent: ParentRequest) => {
    const seenById = readSeenParentMap();
    seenById[parent.id] = Math.max(Date.now(), getParentUpdatedAt(parent));
    setItem(ADMIN_PARENTS_SEEN_BY_ID_KEY, JSON.stringify(seenById));
    setUnseenParentsCount(countUnseenParents(parents));
  };

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] flex flex-col">
      {/* Top bar */}
      <header className="shrink-0 border-b border-[color:var(--cloud-border)] bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors shrink-0"
        >
          <ArrowLeft size={16} /> <span className="hidden sm:inline">На сайт</span>
        </button>
        <div className="flex-1" />
        <div className="hidden md:block">
          <div className="eyebrow">Operations console</div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleClearTest}
            variant="secondary"
            className="text-xs px-2.5 py-1.5 h-auto"
          >
            <Trash2 size={13} /> <span className="hidden sm:inline">Тестовые</span>
          </Button>
          <Button
            onClick={handleClear}
            variant="secondary"
            className="text-xs px-2.5 py-1.5 h-auto"
          >
            <Trash2 size={13} /> <span className="hidden sm:inline">Очистить всё</span>
          </Button>
        </div>
      </header>

      {/* Body: sidebar (desktop) + tabs row (mobile) + shared content */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* Mobile tabs row */}
        <div className="md:hidden shrink-0 border-b border-[color:var(--cloud-border)] bg-white/70 flex overflow-x-auto gap-1 px-3 py-2">
          {NAV_ITEMS.map(({ tab: t, label }) => (
            <NavLink
              key={t}
              to={t === 'overview' ? '/admin' : `/admin/${t}`}
              end={t === 'overview'}
              className={({ isActive }) =>
                `shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${isActive ? 'bg-stone-900 text-white border-stone-900' : 'bg-white/70 text-stone-700 border-stone-200/80 hover:bg-white'}`
              }
            >
              {label}
              {t === 'parents' && unseenParentsCount > 0 && ` (${unseenParentsCount})`}
            </NavLink>
          ))}
        </div>

        {/* Desktop sidebar */}
        <nav className="hidden md:flex flex-col w-52 shrink-0 border-r border-[color:var(--cloud-border)] bg-white/60 pt-6 pb-10 gap-1 px-3">
          <div className="px-2 mb-4">
            <h1 className="text-lg font-semibold text-stone-900">Админ-панель</h1>
            <p className="text-xs text-stone-400 mt-0.5">Blizko Operations</p>
          </div>
          {NAV_ITEMS.map(({ tab: t, label, icon: Icon }) => (
            <NavLink
              key={t}
              to={t === 'overview' ? '/admin' : `/admin/${t}`}
              end={t === 'overview'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'}`
              }
            >
              <Icon size={16} />
              {label}
              {t === 'parents' && unseenParentsCount > 0 && (
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">
                  {unseenParentsCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {(activeTab === 'parents' || activeTab === 'nannies' || activeTab === 'curator') && (
            <div className="flex items-center gap-2 input-glass rounded-2xl px-3 py-2 mb-4 max-w-md">
              <Search size={16} className="text-stone-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск..."
                className="bg-transparent outline-none text-sm w-full"
              />
            </div>
          )}

          {activeTab === 'nannies' && (
            <label className="flex items-center gap-2 text-xs text-stone-600 bg-white/80 border border-[color:var(--cloud-border)] rounded-2xl px-3 py-2 mb-4 w-fit">
              <input
                type="checkbox"
                checked={onlyProblematic}
                onChange={(e) => setOnlyProblematic(e.target.checked)}
              />
              Только проблемные анкеты
            </label>
          )}

          <div className="space-y-4">
            {activeTab === 'overview' && (
              <AdminOverviewTab
                parents={parents}
                nannies={nannies}
                bookings={bookings}
                events={analyticsEvents}
                unseenParentsCount={unseenParentsCount}
              />
            )}
            {activeTab === 'parents' && (
              <AdminParentsTab
                parents={parents}
                query={query}
                focusParentId={focusedParentId}
                onParentOpened={markParentAsSeen}
                onDataChanged={loadData}
              />
            )}
            {activeTab === 'nannies' && (
              <AdminNanniesTab
                nannies={nannies}
                query={query}
                onlyProblematic={onlyProblematic}
                onDataChanged={loadData}
                logAdminAction={logAdminAction}
              />
            )}
            {activeTab === 'curator' && (
              <AdminCuratorTab
                parents={parents}
                nannies={nannies}
                onDataChanged={loadData}
                logAdminAction={logAdminAction}
              />
            )}
            {activeTab === 'support' && <AdminSupportTab focusTicketId={focusedSupportTicketId} />}
            {activeTab === 'bookings' && (
              <AdminBookingsTab
                bookings={bookings}
                parents={parents}
                nannies={nannies}
                onStatusChange={async (id, status) => {
                  await updateBookingStatus(id, status);
                  logAdminAction('booking_status_change', { id, status });
                  await loadData();
                }}
              />
            )}
            {activeTab === 'journal' && (
              <AdminJournalTab
                actionFeed={actionFeed}
                actionFeedHasMore={actionFeedHasMore}
                actionFeedLoading={actionFeedLoading}
                journalRange={journalRange}
                setJournalRange={setJournalRange}
                setActionFeed={setActionFeed}
                loadMoreActionFeed={loadMoreActionFeed}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export const AdminPage: React.FC = () => {
  const [actionFeed, setActionFeed] = useState<AdminActionEntry[]>([]);
  const [actionFeedHasMore, setActionFeedHasMore] = useState(false);
  const [actionFeedLoading, setActionFeedLoading] = useState(false);
  const [journalRange, setJournalRange] = useState<AdminJournalRange>('7');
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      setCurrentAdminId(data.session?.user?.id ?? null);
    });
  }, []);

  const loadFeed = React.useCallback(
    async (mode: 'replace' | 'append' = 'replace', beforeAt?: number | null) => {
      setActionFeedLoading(true);
      try {
        const remote = await fetchAdminActions({
          limit: 12,
          beforeAt: mode === 'append' ? (beforeAt ?? null) : null,
          days: journalRange,
        });
        if (remote) {
          setActionFeed((cur) => (mode === 'append' ? [...cur, ...remote.items] : remote.items));
          setActionFeedHasMore(remote.hasMore);
          if (mode === 'replace') setItem(ADMIN_ACTIONS_KEY, JSON.stringify(remote.items));
          return;
        }
      } catch {
        /* fallback */
      } finally {
        setActionFeedLoading(false);
      }
      if (mode === 'replace') {
        try {
          const items = JSON.parse(getItem(ADMIN_ACTIONS_KEY) || '[]');
          setActionFeed(Array.isArray(items) ? items.slice(0, 12) : []);
          setActionFeedHasMore(false);
        } catch {
          setActionFeed([]);
          setActionFeedHasMore(false);
        }
      }
    },
    [journalRange],
  );

  useEffect(() => {
    void loadFeed('replace');
  }, [loadFeed, journalRange]);

  const logAdminAction = React.useCallback(
    (action: string, meta?: Record<string, unknown>) => {
      try {
        const items = JSON.parse(getItem(ADMIN_ACTIONS_KEY) || '[]');
        const next = [{ action, meta, at: Date.now(), adminId: currentAdminId }, ...items];
        setItem(ADMIN_ACTIONS_KEY, JSON.stringify(next.slice(0, 200)));
        setActionFeed(next.slice(0, 12));
        void createAdminAction(action, meta);
      } catch {
        /* ignore */
      }
    },
    [currentAdminId],
  );

  const logWorkflowEvent = React.useCallback(
    (event: AdminWorkflowEvent) => {
      try {
        const items = JSON.parse(getItem(ADMIN_ACTIONS_KEY) || '[]');
        const entry: AdminActionEntry = {
          action: `workflow_${event.kind}`,
          at: event.at,
          kind: event.kind,
          message: event.message,
          meta: { kind: event.kind, message: event.message },
          adminId: currentAdminId,
        };
        const next = [entry, ...items];
        setItem(ADMIN_ACTIONS_KEY, JSON.stringify(next.slice(0, 200)));
        setActionFeed(next.slice(0, 12));
        void createAdminAction(`workflow_${event.kind}`, {
          kind: event.kind,
          message: event.message,
        });
      } catch {
        /* ignore */
      }
    },
    [currentAdminId],
  );

  return (
    <AdminWorkflowUIProvider onWorkflowEvent={logWorkflowEvent}>
      <AdminPageContent
        actionFeed={actionFeed}
        actionFeedHasMore={actionFeedHasMore}
        actionFeedLoading={actionFeedLoading}
        journalRange={journalRange}
        setJournalRange={setJournalRange}
        setActionFeed={setActionFeed}
        logAdminAction={logAdminAction}
        loadMoreActionFeed={async () => {
          await loadFeed('append', actionFeed[actionFeed.length - 1]?.at ?? null);
        }}
      />
    </AdminWorkflowUIProvider>
  );
};
