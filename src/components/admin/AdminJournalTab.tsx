import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '../UI';
import { AdminPillButton } from './adminPrimitives';
import { setItem } from '@/core/platform/storage';
import { AdminActionRecord } from '@/services/adminApi';

type AdminJournalFilter = 'all' | 'workflow' | 'moderation' | 'bookings' | 'errors';
type AdminJournalRange = '1' | '7' | '30' | 'all';

export type AdminActionEntry = AdminActionRecord & {
    kind?: 'info' | 'success' | 'error';
    message?: string;
};

const ADMIN_ACTIONS_KEY = 'blizko_admin_actions';

interface Props {
    actionFeed: AdminActionEntry[];
    actionFeedHasMore: boolean;
    actionFeedLoading: boolean;
    journalRange: AdminJournalRange;
    setJournalRange: React.Dispatch<React.SetStateAction<AdminJournalRange>>;
    setActionFeed: React.Dispatch<React.SetStateAction<AdminActionEntry[]>>;
    loadMoreActionFeed: () => Promise<void>;
}

function formatActionLabel(entry: AdminActionEntry): string {
    const metaMessage = typeof entry.meta?.message === 'string' ? entry.meta.message : '';
    if (entry.message) return entry.message;
    if (metaMessage) return metaMessage;
    if (entry.action === 'clear_all') return 'Очищены все локальные данные';
    if (entry.action === 'clear_test') return 'Удалены тестовые записи';
    if (entry.action === 'bulk_verify_profiles') return `Массовое подтверждение профилей${entry.meta?.count ? `: ${entry.meta.count}` : ''}`;
    if (entry.action === 'bulk_docs_status') return `Массовое обновление документов${entry.meta?.status ? `: ${entry.meta.status}` : ''}${entry.meta?.count ? ` • ${entry.meta.count}` : ''}`;
    if (entry.action === 'booking_status_change') {
        const bookingId = entry.meta?.id ? `#${String(entry.meta.id).slice(0, 8)}` : 'бронирования';
        const status = entry.meta?.status ? String(entry.meta.status) : 'updated';
        return `Статус ${bookingId} → ${status}`;
    }
    if (entry.action.startsWith('workflow_')) {
        const kindLabel = entry.action === 'workflow_error' ? 'Ошибка' : entry.action === 'workflow_success' ? 'Успех' : 'Событие';
        return `${kindLabel}: ${metaMessage || entry.action}`;
    }
    return entry.action;
}

function formatActionMeta(entry: AdminActionEntry): string {
    if (!entry.meta || Object.keys(entry.meta).length === 0) return '';
    const hiddenKeys = new Set(['message', 'kind']);
    return Object.entries(entry.meta)
        .filter(([key]) => !hiddenKeys.has(key))
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(' • ');
}

export const AdminJournalTab: React.FC<Props> = ({
    actionFeed,
    actionFeedHasMore,
    actionFeedLoading,
    journalRange,
    setJournalRange,
    setActionFeed,
    loadMoreActionFeed,
}) => {
    const [journalFilter, setJournalFilter] = React.useState<AdminJournalFilter>('all');
    const [journalQuery, setJournalQuery] = React.useState('');

    const filtered = React.useMemo(() => {
        const q = journalQuery.trim().toLowerCase();
        return actionFeed.filter((entry) => {
            if (journalFilter === 'errors') return entry.kind === 'error' || entry.action === 'workflow_error';
            if (journalFilter === 'workflow') return entry.action.startsWith('workflow_');
            if (journalFilter === 'bookings') return entry.action.includes('booking');
            if (journalFilter === 'moderation') return entry.action.includes('bulk_') || entry.action.includes('verify') || entry.action.includes('clear_') || entry.action.includes('status');
            return true;
        }).filter((entry) => {
            if (!q) return true;
            return [entry.action, entry.message, formatActionLabel(entry), JSON.stringify(entry.meta || {}), entry.id]
                .filter(Boolean).join(' ').toLowerCase().includes(q);
        });
    }, [actionFeed, journalFilter, journalQuery]);

    return (
        <div className="section-shell rounded-[1.5rem] p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <div className="eyebrow">Action feed</div>
                    <div className="mt-1 text-sm text-stone-600">Серверный журнал действий и системных сообщений.</div>
                </div>
                <AdminPillButton
                    onClick={() => {
                        setItem(ADMIN_ACTIONS_KEY, JSON.stringify([]));
                        setActionFeed([]);
                    }}
                    tone="neutral"
                >
                    Очистить кэш
                </AdminPillButton>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {(['all', 'workflow', 'moderation', 'bookings', 'errors'] as const).map((key) => (
                    <AdminPillButton key={key} onClick={() => setJournalFilter(key)} active={journalFilter === key} tone="neutral">
                        {{ all: 'Все', workflow: 'Workflow', moderation: 'Модерация', bookings: 'Бронирования', errors: 'Ошибки' }[key]}
                    </AdminPillButton>
                ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {(['1', '7', '30', 'all'] as const).map((key) => (
                    <AdminPillButton key={key} onClick={() => setJournalRange(key)} active={journalRange === key} tone="neutral">
                        {{ '1': '24 часа', '7': '7 дней', '30': '30 дней', all: 'Всё время' }[key]}
                    </AdminPillButton>
                ))}
            </div>

            <div className="flex items-center gap-2 input-glass rounded-2xl px-3 py-2 mb-4">
                <Search size={16} className="text-stone-400" />
                <input
                    value={journalQuery}
                    onChange={(e) => setJournalQuery(e.target.value)}
                    placeholder="Поиск по действию, ID, сообщению..."
                    className="bg-transparent outline-none text-sm w-full"
                />
            </div>

            {filtered.length === 0 ? (
                <div className="text-sm text-stone-400">По текущему фильтру событий нет.</div>
            ) : (
                <div className="space-y-2">
                    {filtered.map((entry, i) => (
                        <div key={`${entry.action}-${entry.at}-${i}`} className="flex items-start justify-between gap-3 rounded-[1rem] border border-stone-200/70 bg-white/75 px-3 py-2">
                            <div>
                                <div className={`text-sm font-medium ${entry.kind === 'error' ? 'text-red-700' : entry.kind === 'success' ? 'text-green-700' : 'text-stone-700'}`}>
                                    {formatActionLabel(entry)}
                                </div>
                                {formatActionMeta(entry) && (
                                    <div className="mt-1 text-[11px] text-stone-500">{formatActionMeta(entry)}</div>
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
                    <Button className="w-auto px-6" isLoading={actionFeedLoading} onClick={() => void loadMoreActionFeed()} variant="outline">
                        Показать ещё
                    </Button>
                </div>
            )}
        </div>
    );
};
