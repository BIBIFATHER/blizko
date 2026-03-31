import React, { useEffect, useState } from 'react';
import {
  clearAllData,
  clearTestData,
} from '@/services/storage';
import { ParentRequest, NannyProfile } from '@/core/types';
import { Button } from './UI';
import { supabase } from '@/services/supabase';
import { Trash2, X, Search } from 'lucide-react';
import { getItem, setItem } from '@/core/platform/storage';
import { AdminActionRecord, createAdminAction, fetchAdminActions } from '@/services/adminApi';
import { AdminOverviewTab } from './admin/AdminOverviewTab';
import { AdminParentsTab } from './admin/AdminParentsTab';
import { AdminNanniesTab } from './admin/AdminNanniesTab';
import { AdminBookingsTab } from './admin/AdminBookingsTab';
import { AdminPillButton, adminModalSurface } from './admin/adminPrimitives';
import { AdminWorkflowEvent, AdminWorkflowUIProvider, useAdminWorkflowUI } from './admin/adminWorkflowUI';
import { getAllBookings, updateBookingStatus, Booking } from '@/services/booking';
import {
  AnalyticsEventRecord,
  fetchRemoteAnalyticsEvents,
  getAnalyticsEvents,
} from '@/services/analytics';

type AdminTab = 'overview' | 'parents' | 'nannies' | 'bookings' | 'journal';
type AdminJournalFilter = 'all' | 'workflow' | 'moderation' | 'bookings' | 'errors';
type AdminJournalRange = '1' | '7' | '30' | 'all';
type AdminActionEntry = AdminActionRecord & {
  kind?: 'info' | 'success' | 'error';
  message?: string;
};
const ADMIN_PARENTS_SEEN_TS_KEY = 'blizko_admin_parents_seen_ts';
const ADMIN_ACTIONS_KEY = 'blizko_admin_actions';
const getNowTs = () => Date.now();

const AdminPanelContent: React.FC<{
  onClose: () => void;
  actionFeed: AdminActionEntry[];
  actionFeedHasMore: boolean;
  actionFeedLoading: boolean;
  journalRange: AdminJournalRange;
  setJournalRange: React.Dispatch<React.SetStateAction<AdminJournalRange>>;
  setActionFeed: React.Dispatch<React.SetStateAction<AdminActionEntry[]>>;
  loadMoreActionFeed: () => Promise<void>;
  logAdminAction: (action: string, meta?: Record<string, any>) => void;
}> = ({
  onClose,
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
  const [parents, setParents] = useState<ParentRequest[]>([]);
  const [nannies, setNannies] = useState<NannyProfile[]>([]);
  const [tab, setTab] = useState<AdminTab>('overview');
  const [journalFilter, setJournalFilter] = useState<AdminJournalFilter>('all');
  const [journalQuery, setJournalQuery] = useState('');
  const [query, setQuery] = useState('');
  const [onlyProblematic, setOnlyProblematic] = useState(false);
  const [unseenParentsCount, setUnseenParentsCount] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEventRecord[]>([]);

  const loadData = async () => {
    const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

    const [pr, nr, remoteAnalytics] = await Promise.all([
      fetch('/api/data?resource=parents', { headers }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
      fetch('/api/data?resource=nannies', { headers }).then((r) => (r.ok ? r.json() : { items: [] })).catch(() => ({ items: [] })),
      fetchRemoteAnalyticsEvents(30, token),
    ]);

    const p = Array.isArray(pr?.items) ? pr.items : [];
    const n = Array.isArray(nr?.items) ? nr.items : [];

    setParents(p);
    setNannies(n);
    setAnalyticsEvents(remoteAnalytics.length ? remoteAnalytics : getAnalyticsEvents());

    const seenTs = Number(getItem(ADMIN_PARENTS_SEEN_TS_KEY) || '0');
    const unseen = p.filter((item: ParentRequest) => Number(item.updatedAt || item.createdAt || 0) > seenTs).length;
    setUnseenParentsCount(unseen);

    // Load bookings
    const bk = await getAllBookings();
    setBookings(bk);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatActionLabel = (entry: AdminActionEntry) => {
    const metaMessage = typeof entry.meta?.message === 'string' ? entry.meta.message : '';
    if (entry.message) return entry.message;
    if (metaMessage) return metaMessage;
    if (entry.action === 'clear_all') return 'Очищены все локальные данные';
    if (entry.action === 'clear_test') return 'Удалены тестовые записи';
    if (entry.action === 'bulk_verify_profiles') {
      return `Запущено массовое подтверждение профилей${entry.meta?.count ? `: ${entry.meta.count}` : ''}`;
    }
    if (entry.action === 'bulk_docs_status') {
      return `Массовое обновление документов${entry.meta?.status ? `: ${entry.meta.status}` : ''}${entry.meta?.count ? ` • ${entry.meta.count} анкет` : ''}`;
    }
    if (entry.action === 'booking_status_change') {
      const bookingId = entry.meta?.id ? `#${String(entry.meta.id).slice(0, 8)}` : 'бронирования';
      const status = entry.meta?.status ? String(entry.meta.status) : 'updated';
      return `Статус ${bookingId} изменён на ${status}`;
    }
    if (entry.action.startsWith('workflow_')) {
      const kindLabel =
        entry.action === 'workflow_error'
          ? 'Ошибка'
          : entry.action === 'workflow_success'
            ? 'Успешное действие'
            : 'Системное сообщение';
      return `${kindLabel}: ${metaMessage || entry.action}`;
    }
    return entry.action;
  };

  const formatActionMeta = (entry: AdminActionEntry) => {
    if (!entry.meta || Object.keys(entry.meta).length === 0) return '';
    const hiddenKeys = new Set(['message', 'kind']);
    return Object.entries(entry.meta)
      .filter(([key]) => !hiddenKeys.has(key))
      .map(([key, value]) => `${key}: ${String(value)}`)
      .join(' • ');
  };

  const filteredActionFeed = React.useMemo(() => {
    const normalizedQuery = journalQuery.trim().toLowerCase();
    return actionFeed.filter((entry) => {
      if (journalFilter === 'all') return true;
      if (journalFilter === 'errors') return entry.kind === 'error' || entry.action === 'workflow_error';
      if (journalFilter === 'workflow') return entry.action.startsWith('workflow_');
      if (journalFilter === 'bookings') return entry.action.includes('booking');
      if (journalFilter === 'moderation') {
        return (
          entry.action.includes('bulk_') ||
          entry.action.includes('verify') ||
          entry.action.includes('clear_') ||
          entry.action.includes('status')
        );
      }
      return true;
    }).filter((entry) => {
      if (!normalizedQuery) return true;
      const haystack = [
        entry.action,
        entry.message,
        formatActionLabel(entry),
        JSON.stringify(entry.meta || {}),
        entry.id,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [actionFeed, journalFilter, journalQuery]);

  const handleClear = async () => {
    const shouldProceed = await confirmAction({
      message: 'Удалить все данные?',
      confirmLabel: 'Удалить всё',
    });
    if (!shouldProceed) return;
    logAdminAction('clear_all');
    await clearAllData();
    setParents([]);
    setNannies([]);
    reportSuccess('Все локальные данные очищены.');
  };

  const handleClearTest = async () => {
    const shouldProceed = await confirmAction({
      message: 'Удалить только тестовые записи (id начинается с test-)?',
      confirmLabel: 'Удалить тестовые',
    });
    if (!shouldProceed) return;
    logAdminAction('clear_test');
    await clearTestData();
    await loadData();
    reportSuccess('Тестовые записи удалены.');
  };

  const markParentsAsSeen = () => {
    setItem(ADMIN_PARENTS_SEEN_TS_KEY, String(getNowTs()));
    setUnseenParentsCount(0);
  };

    return (
    <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className={`${adminModalSurface} w-full max-w-5xl max-h-[90vh] flex flex-col animate-slide-up`}>
        <div className="hero-shell rounded-none border-x-0 border-t-0 border-b border-[color:var(--cloud-border)] shadow-none flex items-start justify-between gap-4">
          <div>
            <div className="eyebrow mb-3">Operations console</div>
            <h2 className="text-3xl font-display text-stone-900">Админ-панель</h2>
            <p className="mt-2 text-sm text-stone-500">Локальные данные, модерация, аналитика и управление вручную.</p>
            <div className="mt-3 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-3 py-1 inline-flex">
              Blizko+ — подбор, который объясним • гарантия прихода
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/80 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[color:var(--cloud-border)] px-4 py-4 flex flex-col gap-3 bg-white/70">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="flex items-center gap-2 flex-1 input-glass rounded-2xl px-3 py-2">
            <Search size={16} className="text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по родителям/няням..."
              className="bg-transparent outline-none text-sm w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <AdminPillButton
              onClick={() => setTab('overview')}
              active={tab === 'overview'}
              className="min-h-[42px] px-4 text-sm"
            >
              Обзор
            </AdminPillButton>
            <AdminPillButton
              onClick={() => { setTab('parents'); markParentsAsSeen(); }}
              active={tab === 'parents'}
              className="min-h-[42px] px-4 text-sm flex items-center gap-1"
            >
              Родители
              {unseenParentsCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500 text-white">{unseenParentsCount}</span>
              )}
            </AdminPillButton>
            <AdminPillButton
              onClick={() => setTab('nannies')}
              active={tab === 'nannies'}
              className="min-h-[42px] px-4 text-sm"
            >
              Няни
            </AdminPillButton>
            <AdminPillButton
              onClick={() => setTab('bookings')}
              active={tab === 'bookings'}
              className="min-h-[42px] px-4 text-sm"
            >
              Бронирования
            </AdminPillButton>
            <AdminPillButton
              onClick={() => setTab('journal')}
              active={tab === 'journal'}
              className="min-h-[42px] px-4 text-sm"
            >
              Журнал
            </AdminPillButton>
          </div>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex items-center gap-2 text-xs text-stone-600 bg-white/80 border border-[color:var(--cloud-border)] rounded-2xl px-3 py-2">
            <input type="checkbox" checked={onlyProblematic} onChange={(e) => setOnlyProblematic(e.target.checked)} />
            Только проблемные анкеты
          </label>
          <div className="sm:w-72 flex gap-2">
            <Button onClick={handleClearTest} variant="secondary">
              <Trash2 size={16} /> Удалить тестовые
            </Button>
            <Button onClick={handleClear} variant="secondary">
              <Trash2 size={16} /> Очистить всё
            </Button>
          </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white/40">
          {tab === 'overview' && (
            <AdminOverviewTab
              parents={parents}
              nannies={nannies}
              bookings={bookings}
              events={analyticsEvents}
              unseenParentsCount={unseenParentsCount}
            />
          )}
          {tab === 'parents' && (
            <AdminParentsTab
              parents={parents}
              query={query}
              onDataChanged={loadData}
            />
          )}
          {tab === 'nannies' && (
            <AdminNanniesTab
              nannies={nannies}
              query={query}
              onlyProblematic={onlyProblematic}
              onDataChanged={loadData}
              logAdminAction={logAdminAction}
            />
          )}
          {tab === 'bookings' && (
            <AdminBookingsTab
              bookings={bookings}
              onStatusChange={async (id, status) => {
                await updateBookingStatus(id, status);
                logAdminAction('booking_status_change', { id, status });
                await loadData();
              }}
            />
          )}
          {tab === 'journal' && (
            <div className="section-shell rounded-[1.5rem] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow">Action feed</div>
                  <div className="mt-1 text-sm text-stone-600">Серверный журнал действий и системных сообщений админки.</div>
                </div>
                <AdminPillButton
                  onClick={() => {
                    setItem(ADMIN_ACTIONS_KEY, JSON.stringify([]));
                    setActionFeed([]);
                  }}
                  tone="neutral"
                >
                  Очистить локальный кэш
                </AdminPillButton>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {([
                  ['all', 'Все'],
                  ['workflow', 'Workflow'],
                  ['moderation', 'Модерация'],
                  ['bookings', 'Бронирования'],
                  ['errors', 'Ошибки'],
                ] as const).map(([key, label]) => (
                  <AdminPillButton
                    key={key}
                    onClick={() => setJournalFilter(key)}
                    active={journalFilter === key}
                    tone="neutral"
                  >
                    {label}
                  </AdminPillButton>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {([
                  ['1', '24 часа'],
                  ['7', '7 дней'],
                  ['30', '30 дней'],
                  ['all', 'Всё время'],
                ] as const).map(([key, label]) => (
                  <AdminPillButton
                    key={key}
                    onClick={() => setJournalRange(key)}
                    active={journalRange === key}
                    tone="neutral"
                  >
                    {label}
                  </AdminPillButton>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 input-glass rounded-2xl px-3 py-2">
                <Search size={16} className="text-stone-400" />
                <input
                  value={journalQuery}
                  onChange={(e) => setJournalQuery(e.target.value)}
                  placeholder="Поиск по действию, ID, статусу, сообщению..."
                  className="bg-transparent outline-none text-sm w-full"
                />
              </div>
              {filteredActionFeed.length === 0 ? (
                <div className="mt-4 text-sm text-stone-400">По текущему фильтру событий нет.</div>
              ) : (
                <div className="mt-4 space-y-2">
                  {filteredActionFeed.map((entry, index) => (
                    <div key={`${entry.action}-${entry.at}-${index}`} className="flex items-start justify-between gap-3 rounded-[1rem] border border-stone-200/70 bg-white/75 px-3 py-2">
                      <div>
                        <div className={`text-sm font-medium ${
                          entry.kind === 'error'
                            ? 'text-red-700'
                            : entry.kind === 'success'
                              ? 'text-green-700'
                              : 'text-stone-700'
                        }`}>
                          {formatActionLabel(entry)}
                        </div>
                        {formatActionMeta(entry) && (
                          <div className="mt-1 text-[11px] text-stone-500">
                            {formatActionMeta(entry)}
                          </div>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 whitespace-nowrap">
                        {new Date(entry.at).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {actionFeedHasMore && (
                <div className="mt-4 flex justify-center">
                  <Button
                    className="w-auto px-6"
                    isLoading={actionFeedLoading}
                    onClick={() => void loadMoreActionFeed()}
                    variant="outline"
                  >
                    Показать ещё
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [actionFeed, setActionFeed] = useState<AdminActionEntry[]>([]);
  const [actionFeedHasMore, setActionFeedHasMore] = useState(false);
  const [actionFeedLoading, setActionFeedLoading] = useState(false);
  const [journalRange, setJournalRange] = useState<AdminJournalRange>('7');

  const loadFeed = React.useCallback(async (
    mode: 'replace' | 'append' = 'replace',
    beforeAt?: number | null,
  ) => {
    setActionFeedLoading(true);
    try {
      const remote = await fetchAdminActions({
        limit: 12,
        beforeAt: mode === 'append' ? beforeAt ?? null : null,
        days: journalRange,
      });
      if (remote) {
        setActionFeed((current) =>
          mode === 'append' ? [...current, ...remote.items] : remote.items
        );
        setActionFeedHasMore(remote.hasMore);
        if (mode === 'replace') {
          setItem(ADMIN_ACTIONS_KEY, JSON.stringify(remote.items));
        }
        return;
      }
    } catch {
      // fall back to local cache
    } finally {
      setActionFeedLoading(false);
    }

    if (mode === 'replace') {
      try {
        const raw = getItem(ADMIN_ACTIONS_KEY) || '[]';
        const items = JSON.parse(raw);
        setActionFeed(Array.isArray(items) ? items.slice(0, 12) : []);
        setActionFeedHasMore(false);
      } catch {
        setActionFeed([]);
        setActionFeedHasMore(false);
      }
    }
  }, [journalRange]);

  useEffect(() => {
    void loadFeed('replace');
  }, [loadFeed, journalRange]);

  const writeActionFeed = (nextItems: AdminActionEntry[]) => {
    setItem(ADMIN_ACTIONS_KEY, JSON.stringify(nextItems.slice(0, 200)));
    setActionFeed(nextItems.slice(0, 12));
  };

  const logAdminAction = (action: string, meta?: Record<string, any>) => {
    try {
      const raw = getItem(ADMIN_ACTIONS_KEY) || '[]';
      const items = JSON.parse(raw);
      writeActionFeed([{ action, meta, at: getNowTs() }, ...items]);
      void createAdminAction(action, meta);
    } catch {
      // ignore
    }
  };

  const logWorkflowEvent = (event: AdminWorkflowEvent) => {
    try {
      const raw = getItem(ADMIN_ACTIONS_KEY) || '[]';
      const items = JSON.parse(raw);
      writeActionFeed([
        {
          action: `workflow_${event.kind}`,
          at: event.at,
          kind: event.kind,
          message: event.message,
          meta: { kind: event.kind, message: event.message },
        },
        ...items,
      ]);
      void createAdminAction(`workflow_${event.kind}`, {
        kind: event.kind,
        message: event.message,
      });
    } catch {
      // ignore
    }
  };

  return (
    <AdminWorkflowUIProvider onWorkflowEvent={logWorkflowEvent}>
      <AdminPanelContent
        actionFeed={actionFeed}
        actionFeedHasMore={actionFeedHasMore}
        actionFeedLoading={actionFeedLoading}
        journalRange={journalRange}
        logAdminAction={logAdminAction}
        onClose={onClose}
        loadMoreActionFeed={async () => {
          await loadFeed('append', actionFeed[actionFeed.length - 1]?.at ?? null);
        }}
        setJournalRange={setJournalRange}
        setActionFeed={setActionFeed}
      />
    </AdminWorkflowUIProvider>
  );
};
