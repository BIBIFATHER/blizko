import React, { useState, useEffect } from 'react';
import { Badge } from '../UI';
import { ParentRequest } from '@/core/types';
import { X, ChevronDown, Copy, ExternalLink, PhoneCall } from 'lucide-react';
import {
  AdminDocumentPreviewModal,
  AdminPillButton,
  adminModalHeader,
  adminModalSurface,
  adminSubsectionPanel,
} from './adminPrimitives';
import { AdminPreviewDoc } from './adminModerationUtils';
import { RiskFlagRow, getParentRiskFlags } from './adminTrustSignals';
import {
  useAdminParentModeration,
  RejectReasonCode,
  rejectReasonLabelMap,
} from '@/hooks/useAdminParentModeration';
import { useAdminWorkflowUI } from './adminWorkflowUI';
import {
  adminUpdateParentRequest,
  adminSendNotification,
  getNannyDocSignedUrl,
  createAdminAction,
} from '@/services/adminApi';
import { notifyUserStatusChanged } from '@/services/notifications';
import { trackShortlistDelivered } from '@/services/analytics';

type ParentStatusFilter = 'all' | 'new' | 'in_review' | 'approved' | 'rejected' | 'resubmitted';

interface AdminParentsTabProps {
  parents: ParentRequest[];
  query: string;
  focusParentId?: string;
  onParentOpened?: (parent: ParentRequest) => void;
  onDataChanged: () => void;
}

const REJECT_REASONS: RejectReasonCode[] = [
  'profile_incomplete',
  'docs_missing',
  'budget_invalid',
  'contact_invalid',
  'other',
];

function parentStatusLabel(status?: ParentRequest['status']) {
  if (status === 'payment_pending') return 'Ожидает оплаты';
  if (status === 'in_review') return 'На проверке';
  if (status === 'approved') return 'Одобрена';
  if (status === 'rejected') return 'Отклонена';
  return 'Новая';
}

function formatAdminDate(value?: number) {
  if (!value) return '—';
  return new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getParentShortId(parent: ParentRequest) {
  return parent.id.slice(0, 8);
}

function getLocationLine(parent: ParentRequest) {
  return [parent.city, parent.district, parent.metro ? `м. ${parent.metro}` : '']
    .filter(Boolean)
    .join(', ');
}

function getLastChange(parent: ParentRequest) {
  return [...(parent.changeLog || [])].sort((a, b) => b.at - a.at)[0];
}

function getNextAction(parent: ParentRequest) {
  const status = parent.status || 'new';
  if (status === 'new') return 'Связаться и уточнить контекст';
  if (status === 'in_review') return 'Собрать подборку 2–3 няни';
  if (status === 'approved') return 'Выдать подборку и зафиксировать результат';
  if (status === 'rejected') return 'Ждём правки от семьи';
  if (status === 'payment_pending') return 'Проверить оплату';
  return 'Проверить заявку';
}

function buildParentBrief(parent: ParentRequest) {
  const requirements = parent.requirements?.length ? parent.requirements.join(', ') : 'не указаны';
  const comment = parent.comment || 'без комментария';
  return `Заявка #${getParentShortId(parent)}
Локация: ${getLocationLine(parent) || 'не указана'}
Ребёнок: ${parent.childAge || 'не указан'}
График: ${parent.schedule || 'не указан'}
Бюджет: ${parent.budget || 'не указан'}
Важно: ${requirements}
Комментарий: ${comment}
Следующее действие: ${getNextAction(parent)}`;
}

interface RejectInlineFormProps {
  onConfirm: (code: RejectReasonCode, text: string) => void;
  onCancel: () => void;
}

const RejectInlineForm: React.FC<RejectInlineFormProps> = ({ onConfirm, onCancel }) => {
  const [code, setCode] = useState<RejectReasonCode>('profile_incomplete');
  const [text, setText] = useState('');
  const canSubmit = text.trim().length >= 8;

  return (
    <div className="mt-3 rounded-[1.25rem] border border-red-100/80 bg-red-50/60 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-red-700">Причина отклонения</span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1 hover:bg-red-100/60 text-red-400"
          aria-label="Отмена"
        >
          <X size={13} />
        </button>
      </div>

      <div className="relative">
        <select
          value={code}
          onChange={(e) => setCode(e.target.value as RejectReasonCode)}
          className="w-full appearance-none input-glass rounded-xl border-red-200/80 px-3 py-2 pr-8 text-xs"
        >
          {REJECT_REASONS.map((r) => (
            <option key={r} value={r}>
              {rejectReasonLabelMap[r]}
            </option>
          ))}
        </select>
        <ChevronDown
          size={13}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
        />
      </div>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Комментарий для семьи (минимум 8 символов)"
        className="w-full input-glass rounded-xl border-red-200/80 px-3 py-2 text-xs"
        autoFocus
      />

      <div className="flex items-center gap-2">
        <AdminPillButton
          onClick={() => onConfirm(code, text)}
          disabled={!canSubmit}
          tone="danger"
          className={!canSubmit ? 'opacity-40 cursor-not-allowed' : ''}
        >
          Подтвердить отклонение
        </AdminPillButton>
        <AdminPillButton onClick={onCancel} tone="neutral">
          Отмена
        </AdminPillButton>
      </div>
    </div>
  );
};

export const AdminParentsTab: React.FC<AdminParentsTabProps> = ({
  parents,
  query,
  focusParentId,
  onParentOpened,
  onDataChanged,
}) => {
  const [parentStatusFilter, setParentStatusFilter] = useState<ParentStatusFilter>('all');
  const [onlyNeedsAction, setOnlyNeedsAction] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedParent, setSelectedParent] = useState<ParentRequest | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [draggingParentId, setDraggingParentId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<NonNullable<ParentRequest['status']> | null>(
    null,
  );
  const [previewDoc, setPreviewDoc] = useState<AdminPreviewDoc | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesState, setNotesState] = useState('');
  const [notifySubject, setNotifySubject] = useState('');
  const [notifyText, setNotifyText] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);

  const openParent = React.useCallback(
    (parent: ParentRequest) => {
      setSelectedParent(parent);
      onParentOpened?.(parent);
    },
    [onParentOpened],
  );

  useEffect(() => {
    setNotesState(selectedParent?.analysisNotes ?? '');
    setEditingNotes(false);
    const statusLabel = parentStatusLabel(selectedParent?.status);
    setNotifySubject(`Статус вашей заявки: ${statusLabel}`);
    setNotifyText('');
    setNotifyBusy(false);
  }, [selectedParent?.id, selectedParent?.status, selectedParent?.analysisNotes]);

  useEffect(() => {
    const needle = focusParentId?.trim().toLowerCase();
    if (!needle) return;
    if (selectedParent?.id.toLowerCase().startsWith(needle)) return;

    const parent = parents.find((p) => {
      const id = p.id.toLowerCase();
      return id === needle || id.startsWith(needle);
    });
    if (parent) openParent(parent);
  }, [focusParentId, openParent, parents, selectedParent?.id]);

  const { updateParentStatus, rejectParent } = useAdminParentModeration({
    onDataChanged,
    selectedParent,
    setSelectedParent,
  });
  const { confirmAction, reportSuccess, reportError } = useAdminWorkflowUI();

  const crmStats = React.useMemo(() => {
    const counts = parents.reduce(
      (acc, parent) => {
        const status = parent.status || 'new';
        acc.total += 1;
        if (status === 'new') acc.new += 1;
        if (status === 'in_review') acc.inReview += 1;
        if (status === 'approved') acc.approved += 1;
        if (status === 'rejected') acc.rejected += 1;
        if (status === 'payment_pending') acc.paymentPending += 1;
        if (status === 'new' || status === 'in_review' || status === 'rejected')
          acc.needsAction += 1;
        return acc;
      },
      {
        total: 0,
        needsAction: 0,
        new: 0,
        inReview: 0,
        approved: 0,
        rejected: 0,
        paymentPending: 0,
      },
    );
    return counts;
  }, [parents]);

  const filteredParents = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return parents.filter((p) => {
      const status = p.status || 'new';
      const isResubmitted = (p.changeLog || []).some((e) => e.type === 'resubmitted');
      const byStatus =
        parentStatusFilter === 'all' ||
        status === parentStatusFilter ||
        (parentStatusFilter === 'resubmitted' && isResubmitted && status === 'in_review');
      const byNeedsAction =
        !onlyNeedsAction || status === 'new' || status === 'in_review' || status === 'rejected';
      const byQuery =
        !q ||
        p.id.toLowerCase().includes(q) ||
        p.requesterId?.toLowerCase().includes(q) ||
        p.requesterEmail?.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.district?.toLowerCase().includes(q) ||
        p.metro?.toLowerCase().includes(q) ||
        p.childAge.toLowerCase().includes(q) ||
        p.schedule.toLowerCase().includes(q) ||
        p.budget.toLowerCase().includes(q) ||
        p.comment.toLowerCase().includes(q) ||
        p.requirements.join(' ').toLowerCase().includes(q);
      return byStatus && byNeedsAction && byQuery;
    });
  }, [parents, query, parentStatusFilter, onlyNeedsAction]);

  // Плитки-счётчики работают как единый фильтр (заменяют отдельный ряд чипов + чекбокс).
  const parentFilterKey =
    onlyNeedsAction && parentStatusFilter === 'all' ? 'needs_action' : parentStatusFilter;
  const applyParentFilter = (key: string) => {
    if (key === 'needs_action') {
      setOnlyNeedsAction(true);
      setParentStatusFilter('all');
    } else {
      setOnlyNeedsAction(false);
      setParentStatusFilter(key as ParentStatusFilter);
    }
  };

  const matchesQuery = (p: ParentRequest) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [p.id, p.requesterEmail, p.city, p.district, p.childAge, p.comment]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  };

  const KANBAN_COLUMNS: {
    status: NonNullable<ParentRequest['status']>;
    label: string;
    dot: string;
    text: string;
    accent: string;
  }[] = [
    {
      status: 'new',
      label: 'Новые',
      dot: 'bg-stone-400',
      text: 'text-stone-600',
      accent: 'bg-stone-300',
    },
    {
      status: 'in_review',
      label: 'На проверке',
      dot: 'bg-amber-500',
      text: 'text-amber-700',
      accent: 'bg-amber-400',
    },
    {
      status: 'approved',
      label: 'Одобрены',
      dot: 'bg-emerald-500',
      text: 'text-emerald-700',
      accent: 'bg-emerald-400',
    },
    {
      status: 'rejected',
      label: 'Отклонены',
      dot: 'bg-rose-500',
      text: 'text-rose-700',
      accent: 'bg-rose-400',
    },
  ];

  const requestParentStatusChange = async (
    parent: ParentRequest,
    newStatus: NonNullable<ParentRequest['status']>,
  ) => {
    const current = parent.status || 'new';
    if (current === newStatus) return;
    if (newStatus === 'rejected') {
      setSelectedParent(parent);
      setRejectingId(parent.id);
      return;
    }

    const ok = await confirmAction({
      message: `Перевести заявку #${getParentShortId(parent)} в статус «${parentStatusLabel(newStatus)}»?`,
      detail: `${getLocationLine(parent) || 'Локация не указана'}\n${parent.childAge || 'Возраст не указан'} · ${parent.schedule || 'График не указан'}`,
      confirmLabel: 'Перевести',
    });
    if (!ok) return;
    await updateParentStatus(parent, newStatus);
  };

  const handleParentDrop =
    (newStatus: NonNullable<ParentRequest['status']>) => async (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData('text/plain');
      setDragOverColumn(null);
      setDraggingParentId(null);
      const p = parents.find((x) => x.id === id);
      if (!p) return;
      await requestParentStatusChange(p, newStatus);
    };

  const renderParentCard = (
    p: ParentRequest,
    opts?: { compact?: boolean; showStatus?: boolean },
  ) => {
    const compact = opts?.compact;
    const showStatus = opts?.showStatus ?? true;
    return (
      <div className="rounded-[1.25rem] border border-[color:var(--cloud-border)] bg-white/80 p-3">
        <div className="mb-1 flex justify-between text-xs text-stone-400">
          <span>{formatAdminDate(p.createdAt)}</span>
          <div className="flex items-center gap-2">
            {showStatus && (
              <Badge
                variant={
                  p.status === 'approved' ? 'trust' : p.status === 'rejected' ? 'status' : 'info'
                }
              >
                {parentStatusLabel(p.status)}
              </Badge>
            )}
            <span className="font-mono">#{getParentShortId(p)}</span>
          </div>
        </div>
        <div className="mb-2 rounded-[1rem] bg-stone-50/80 px-3 py-2 text-xs text-stone-600">
          <span className="font-semibold text-stone-800">Следующее действие:</span>{' '}
          {getNextAction(p)}
        </div>
        <div className="text-sm font-semibold text-stone-800">{getLocationLine(p)}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-stone-500">
          <span>{p.childAge || 'Возраст не указан'}</span>
          {!compact && p.requesterEmail && <span className="font-mono">{p.requesterEmail}</span>}
        </div>
        <div className="mt-1 text-sm text-stone-600">График: {p.schedule}</div>
        <div className="text-sm text-stone-600">Бюджет: {p.budget}</div>
        {(() => {
          const flags = getParentRiskFlags(p);
          return flags.length > 0 ? (
            <div className="mt-2">
              <RiskFlagRow flags={flags} />
            </div>
          ) : null;
        })()}
        {!compact && !!p.requirements?.length && (
          <div className="mt-1 text-xs text-stone-600">Требования: {p.requirements.join(', ')}</div>
        )}
        {!compact && p.comment && (
          <div className="mt-2 text-xs text-stone-500 italic">"{p.comment}"</div>
        )}
        {!compact && p.analysisNotes && (
          <div className="mt-2 rounded-[1rem] border border-amber-100/80 bg-amber-50/50 px-3 py-2 text-xs text-amber-800">
            <span className="mr-1 font-semibold">Заметка:</span>
            {p.analysisNotes}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <AdminPillButton onClick={() => openParent(p)} tone="primary">
            Открыть карточку
          </AdminPillButton>
          {compact && (
            <select
              value={p.status || 'new'}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => {
                void requestParentStatusChange(
                  p,
                  event.target.value as NonNullable<ParentRequest['status']>,
                );
              }}
              className="rounded-full border border-stone-200/80 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-700 outline-none transition-all hover:bg-white"
              aria-label="Изменить статус заявки"
            >
              {KANBAN_COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </select>
          )}
          {!compact && (
            <AdminPillButton onClick={() => handleCopyParentBrief(p)} tone="neutral">
              <Copy size={13} /> Сводка
            </AdminPillButton>
          )}
        </div>
      </div>
    );
  };

  const handleRejectConfirm = async (
    parent: ParentRequest,
    code: RejectReasonCode,
    text: string,
  ) => {
    setRejectingId(null);
    await rejectParent(parent, code, text);
  };

  const handleResendStatus = async () => {
    if (!selectedParent?.requesterEmail) return;
    setNotifyBusy(true);
    try {
      await notifyUserStatusChanged(selectedParent);
      reportSuccess('Уведомление о статусе отправлено.');
    } catch {
      reportError('Не удалось отправить уведомление.');
    } finally {
      setNotifyBusy(false);
    }
  };

  const handleSendCustom = async () => {
    if (!selectedParent?.requesterEmail) return;
    const subject = notifySubject.trim();
    const text = notifyText.trim();
    if (!subject || !text) return;
    setNotifyBusy(true);
    try {
      const result = await adminSendNotification({
        to: selectedParent.requesterEmail,
        subject,
        text,
      });
      if (result.ok) {
        reportSuccess('Сообщение отправлено.');
        setNotifyText('');
      } else {
        reportError(result.error ?? 'Ошибка отправки.');
      }
    } finally {
      setNotifyBusy(false);
    }
  };

  const handleDeliverShortlist = async () => {
    if (!selectedParent) return;
    trackShortlistDelivered(selectedParent.id);
    await createAdminAction('shortlist_delivered', { parentId: selectedParent.id });
    reportSuccess('Подборка отмечена как выданная семье.');
  };

  const handleSaveNotes = async () => {
    if (!selectedParent) return;
    const updated = await adminUpdateParentRequest({
      id: selectedParent.id,
      changes: { analysisNotes: notesState.trim() || undefined },
      note: 'Заметки куратора обновлены',
    });
    if (updated) {
      setSelectedParent(updated);
      onDataChanged();
    }
    setEditingNotes(false);
  };

  const handleCopyParentBrief = async (parent: ParentRequest) => {
    try {
      await navigator.clipboard.writeText(buildParentBrief(parent));
      reportSuccess('Сводка заявки скопирована.');
    } catch {
      reportError('Не удалось скопировать сводку.');
    }
  };

  return (
    <>
      <section>
        {viewMode === 'list' && (
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ['needs_action', 'В работе', crmStats.needsAction],
                ['all', 'Все', crmStats.total],
                ['new', 'Новые', crmStats.new],
                ['in_review', 'На проверке', crmStats.inReview],
                ['approved', 'Одобрены', crmStats.approved],
                ['rejected', 'Отклонены', crmStats.rejected],
              ] as const
            ).map(([key, label, value]) => {
              const active = parentFilterKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyParentFilter(key)}
                  aria-pressed={active}
                  className={`rounded-[1.25rem] p-3 text-left transition-all ${
                    active
                      ? 'bg-[color:var(--color-primary)] shadow-sm'
                      : 'section-shell bg-white/70 hover:bg-white'
                  }`}
                >
                  <div
                    className={`text-2xl font-semibold ${active ? 'text-white' : 'text-stone-900'}`}
                  >
                    {value}
                  </div>
                  <div
                    className={`mt-0.5 text-[11px] font-medium ${active ? 'text-white/85' : 'text-stone-500'}`}
                  >
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-stone-500">
              Заявки родителей
            </h3>
            <span className="text-sm text-stone-400">
              · {viewMode === 'list' ? filteredParents.length : parents.filter(matchesQuery).length}
            </span>
          </div>
          <div className="flex gap-1 rounded-full border border-stone-200 bg-white/70 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded-full px-3 py-1 ${viewMode === 'list' ? 'bg-[color:var(--color-primary)] font-semibold text-white' : 'font-medium text-stone-500'}`}
            >
              Список
            </button>
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`rounded-full px-3 py-1 ${viewMode === 'kanban' ? 'bg-[color:var(--color-primary)] font-semibold text-white' : 'font-medium text-stone-500'}`}
            >
              Канбан
            </button>
          </div>
        </div>

        {viewMode === 'list' ? (
          filteredParents.length === 0 ? (
            <div className="rounded-[1.25rem] border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
              Здесь пока пусто. Новые заявки от семей появятся, как только они отправят форму.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredParents.map((p) => (
                <div key={p.id}>{renderParentCard(p)}</div>
              ))}
            </div>
          )
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map(({ status, label, dot, text, accent }) => {
              const items = parents.filter(
                (p) => (p.status || 'new') === status && matchesQuery(p),
              );
              const isDropTarget = dragOverColumn === status;
              return (
                <div
                  key={status}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOverColumn !== status) setDragOverColumn(status);
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget === e.target) setDragOverColumn(null);
                  }}
                  onDrop={handleParentDrop(status)}
                  className={`w-72 shrink-0 overflow-hidden rounded-[1.25rem] p-2 transition-colors ${
                    isDropTarget
                      ? 'border-2 border-dashed border-[color:var(--color-primary)] bg-[color:var(--color-primary)]/5'
                      : 'border-2 border-transparent'
                  }`}
                >
                  <div className={`-mx-2 -mt-2 mb-2 h-1 ${accent}`} />
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.08em] ${text}`}
                    >
                      <span className={`size-1.5 rounded-full ${dot}`} />
                      {label}
                    </span>
                    <span className={`text-xs font-semibold ${text}`}>{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="px-1 text-xs text-stone-300">—</p>
                    ) : (
                      items.map((p) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', p.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggingParentId(p.id);
                          }}
                          onDragEnd={() => {
                            setDraggingParentId(null);
                            setDragOverColumn(null);
                          }}
                          className={`cursor-grab active:cursor-grabbing transition-opacity ${
                            draggingParentId === p.id ? 'opacity-40' : 'opacity-100'
                          }`}
                        >
                          {renderParentCard(p, { compact: true, showStatus: false })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected parent detail modal */}
      {selectedParent && (
        <div className="fixed inset-0 z-60 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${adminModalSurface} w-full max-w-3xl max-h-[92vh] overflow-y-auto`}>
            <div className={adminModalHeader}>
              <div>
                <div className="eyebrow">Карточка заявки</div>
                <h3 className="font-bold text-stone-800">
                  Заявка #{getParentShortId(selectedParent)}
                </h3>
                <div className="section-body mt-1">
                  Контекст семьи, следующий шаг, заметки и коммуникация.
                </div>
              </div>
              <button
                onClick={() => setSelectedParent(null)}
                aria-label="Закрыть карточку заявки"
                className="p-2 rounded-full hover:bg-white/70"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_0.85fr]">
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500 mb-2">Сводка по заявке</div>
                  <div className="space-y-2">
                    <div className="text-base font-semibold text-stone-900">
                      {getLocationLine(selectedParent) || 'Локация не указана'}
                    </div>
                    <div className="rounded-[1rem] bg-amber-50/70 px-3 py-2 text-xs text-amber-800">
                      <span className="font-semibold">Следующее действие:</span>{' '}
                      {getNextAction(selectedParent)}
                    </div>
                    {rejectingId === selectedParent.id ? (
                      <RejectInlineForm
                        onConfirm={(code, text) => handleRejectConfirm(selectedParent, code, text)}
                        onCancel={() => setRejectingId(null)}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <AdminPillButton
                          onClick={() =>
                            void requestParentStatusChange(selectedParent, 'in_review')
                          }
                          tone="neutral"
                        >
                          На проверку
                        </AdminPillButton>
                        <AdminPillButton
                          onClick={() => void requestParentStatusChange(selectedParent, 'approved')}
                          tone="success"
                        >
                          Одобрить
                        </AdminPillButton>
                        <AdminPillButton
                          onClick={() => setRejectingId(selectedParent.id)}
                          tone="danger"
                        >
                          Отклонить
                        </AdminPillButton>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <AdminPillButton
                        tone="neutral"
                        onClick={() => handleCopyParentBrief(selectedParent)}
                      >
                        <Copy size={13} /> Скопировать сводку
                      </AdminPillButton>
                      <a
                        href={`/admin/parents?q=${getParentShortId(selectedParent)}`}
                        className="rounded-full border border-stone-200/80 bg-white/70 px-3.5 py-2 text-xs font-semibold text-stone-700 transition-all hover:bg-white hover:border-amber-200/60 inline-flex items-center gap-1.5"
                      >
                        <ExternalLink size={13} /> Ссылка
                      </a>
                    </div>
                  </div>
                </div>

                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500 mb-2">Контакт</div>
                  {selectedParent.requesterEmail || selectedParent.requesterId ? (
                    <div className="space-y-2">
                      {selectedParent.requesterEmail && (
                        <a
                          href={`mailto:${selectedParent.requesterEmail}`}
                          className="flex items-center gap-2 text-sm font-mono text-stone-800 underline decoration-stone-300 underline-offset-4"
                        >
                          <PhoneCall size={14} /> {selectedParent.requesterEmail}
                        </a>
                      )}
                      {selectedParent.requesterId && (
                        <div className="text-[11px] text-stone-500 break-all">
                          user: {selectedParent.requesterId}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-stone-400">Контакт не указан</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500">Город</div>
                  <div className="font-semibold text-stone-800">{selectedParent.city}</div>
                </div>
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500">Район / метро</div>
                  <div className="font-semibold text-stone-800">
                    {[
                      selectedParent.district,
                      selectedParent.metro ? `м. ${selectedParent.metro}` : '',
                    ]
                      .filter(Boolean)
                      .join(', ') || 'Не указано'}
                  </div>
                </div>
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500">Возраст ребёнка</div>
                  <div className="font-semibold text-stone-800">{selectedParent.childAge}</div>
                </div>
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500">График</div>
                  <div className="font-semibold text-stone-800">{selectedParent.schedule}</div>
                </div>
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500">Бюджет</div>
                  <div className="font-semibold text-stone-800">{selectedParent.budget}</div>
                </div>
              </div>

              <div className={adminSubsectionPanel}>
                <div className="text-xs text-stone-500 mb-1">Требования</div>
                <div className="text-stone-700">
                  {selectedParent.requirements?.length
                    ? selectedParent.requirements.join(', ')
                    : 'Не указаны'}
                </div>
              </div>

              <div className={adminSubsectionPanel}>
                <div className="text-xs text-stone-500 mb-1">Комментарий</div>
                <div className="text-stone-700">{selectedParent.comment || 'Нет комментария'}</div>
              </div>

              <div className={adminSubsectionPanel}>
                <div className="text-xs text-stone-500 mb-1">Документы</div>
                {!selectedParent.documents?.length ? (
                  <div className="text-stone-500">Нет документов</div>
                ) : (
                  <div className="space-y-2">
                    {selectedParent.documents.map((doc, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-[1rem] border border-stone-200/70 bg-white/80 p-2"
                      >
                        <div className="text-xs text-stone-700">
                          {doc.fileName && !String(doc.fileName).startsWith('data:')
                            ? doc.fileName
                            : `${doc.type}.pdf`}
                        </div>
                        {doc.fileStoragePath || doc.fileDataUrl ? (
                          <AdminPillButton
                            onClick={async () => {
                              const url = doc.fileStoragePath
                                ? await getNannyDocSignedUrl(doc.fileStoragePath)
                                : doc.fileDataUrl;
                              if (!url) {
                                reportError('Не удалось открыть документ.');
                                return;
                              }
                              setPreviewDoc({ url, name: doc.fileName || 'document' });
                            }}
                            tone="neutral"
                            className="px-2.5 py-1 text-[10px]"
                          >
                            Просмотр
                          </AdminPillButton>
                        ) : (
                          <span className="text-[10px] text-stone-400">Файл недоступен</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-xs text-stone-400 flex items-center justify-between pt-1">
                <span>ID: {selectedParent.id}</span>
                <span>Создано: {formatAdminDate(selectedParent.createdAt)}</span>
              </div>
              <div className="pt-2 flex items-center gap-2">
                <Badge
                  variant={
                    selectedParent.status === 'approved'
                      ? 'trust'
                      : selectedParent.status === 'rejected'
                        ? 'status'
                        : 'info'
                  }
                >
                  Статус: {parentStatusLabel(selectedParent.status)}
                </Badge>
                <span className="text-[10px] px-2 py-1 rounded-full bg-stone-100 text-stone-600">
                  Обновлено: {formatAdminDate(selectedParent.updatedAt || selectedParent.createdAt)}
                </span>
                {getLastChange(selectedParent) && (
                  <span className="text-[10px] px-2 py-1 rounded-full bg-white text-stone-500">
                    Последнее:{' '}
                    {getLastChange(selectedParent)?.note || getLastChange(selectedParent)?.type}
                  </span>
                )}
              </div>

              <div className="pt-1">
                <AdminPillButton tone="warm" onClick={handleDeliverShortlist}>
                  Выдать подборку семье
                </AdminPillButton>
                <p className="mt-1 text-[10px] text-stone-400">
                  Отмечает факт выдачи подборки (для метрик подбора).
                </p>
              </div>

              {!!selectedParent.changeLog?.length && (
                <div className={adminSubsectionPanel}>
                  <div className="text-xs text-stone-500 mb-2">История изменений</div>
                  <div className="space-y-1">
                    {[...selectedParent.changeLog]
                      .slice(-6)
                      .reverse()
                      .map((item, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-stone-600 flex items-center justify-between gap-2"
                        >
                          <span>{item.note || item.type}</span>
                          <span className="text-stone-400">
                            {new Date(item.at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className={adminSubsectionPanel}>
                <div className="text-xs text-stone-500 mb-2">Уведомления</div>
                {selectedParent.requesterEmail ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-stone-600 font-mono truncate max-w-[14rem]">
                        {selectedParent.requesterEmail}
                      </span>
                      <AdminPillButton
                        tone="neutral"
                        className="px-2.5 py-1 text-[10px] shrink-0"
                        disabled={notifyBusy}
                        onClick={handleResendStatus}
                      >
                        Повторить уведомление о статусе
                      </AdminPillButton>
                    </div>
                    <input
                      value={notifySubject}
                      onChange={(e) => setNotifySubject(e.target.value)}
                      placeholder="Тема письма"
                      className="w-full input-glass rounded-xl px-3 py-2 text-xs"
                    />
                    <textarea
                      value={notifyText}
                      onChange={(e) => setNotifyText(e.target.value)}
                      placeholder="Текст сообщения..."
                      className="w-full input-glass rounded-xl px-3 py-2 text-xs min-h-[60px] resize-none"
                    />
                    <AdminPillButton
                      tone="dark"
                      disabled={notifyBusy || !notifySubject.trim() || !notifyText.trim()}
                      onClick={handleSendCustom}
                    >
                      {notifyBusy ? 'Отправка...' : 'Отправить сообщение'}
                    </AdminPillButton>
                  </div>
                ) : (
                  <div className="text-xs text-stone-400 italic">Почта родителя не задана</div>
                )}
              </div>

              <div className={adminSubsectionPanel}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="text-xs text-stone-500">Заметки куратора</div>
                  {!editingNotes && (
                    <AdminPillButton
                      tone="neutral"
                      className="px-2.5 py-1 text-[10px]"
                      onClick={() => setEditingNotes(true)}
                    >
                      {selectedParent.analysisNotes ? 'Изменить' : 'Добавить'}
                    </AdminPillButton>
                  )}
                </div>
                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      value={notesState}
                      onChange={(e) => setNotesState(e.target.value)}
                      className="w-full input-glass rounded-xl px-3 py-2 text-xs min-h-[80px] resize-none"
                      placeholder="Заметки после анализа анкеты..."
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <AdminPillButton tone="success" onClick={handleSaveNotes}>
                        Сохранить
                      </AdminPillButton>
                      <AdminPillButton
                        tone="neutral"
                        onClick={() => {
                          setEditingNotes(false);
                          setNotesState(selectedParent.analysisNotes ?? '');
                        }}
                      >
                        Отмена
                      </AdminPillButton>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-stone-700">
                    {selectedParent.analysisNotes ? (
                      selectedParent.analysisNotes
                    ) : (
                      <span className="text-stone-400 italic">Нет заметок</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <AdminDocumentPreviewModal previewDoc={previewDoc} onClose={() => setPreviewDoc(null)} />
    </>
  );
};
