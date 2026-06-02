import React from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  Clock3,
  MessageCircle,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react';
import {
  adminSendSupportReply,
  fetchAdminSupportInbox,
  type AdminSupportInboxResult,
  type AdminSupportMessage,
  type AdminSupportTicket,
} from '@/services/adminApi';
import { AdminPillButton, adminSectionPanel, adminSubsectionPanel } from './adminPrimitives';

interface AdminSupportTabProps {
  focusTicketId?: string;
}

function formatTime(value: number) {
  if (!value) return '';
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function getToneLabel(score: number) {
  if (score < -0.5) return 'тревожный';
  if (score < -0.15) return 'напряжённый';
  if (score > 0.4) return 'спокойный';
  return 'нейтральный';
}

function getToneStyle(score: number): { chip: string; dot: string } {
  if (score < -0.5) return { chip: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' };
  if (score < -0.15)
    return { chip: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' };
  if (score > 0.4)
    return { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' };
  return { chip: 'bg-stone-50 text-stone-600 border-stone-200', dot: 'bg-stone-400' };
}

function getStatusLabel(status: string) {
  if (status === 'human_escalated') return 'нужен человек';
  if (status === 'resolved') return 'закрыт';
  return 'открыт';
}

function getStatusStyle(status: string): { chip: string; dot: string } {
  if (status === 'human_escalated')
    return { chip: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' };
  if (status === 'resolved')
    return { chip: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' };
  return { chip: 'bg-stone-50 text-stone-600 border-stone-200', dot: 'bg-stone-400' };
}

function getPriorityReason(ticket: AdminSupportTicket | null) {
  if (!ticket) return null;
  if (ticket.status === 'human_escalated') return 'Срочно: семья просит человека';
  const score = ticket.sentimentScore ?? 0;
  if (score < -0.5) return 'Тон тревожный: нужен быстрый ответ';
  if (score < -0.15) return 'Тон напряжённый: лучше не откладывать';
  return null;
}

function getMessageLabel(senderType: string) {
  if (senderType === 'user') return 'Родитель';
  if (senderType === 'human_agent') return 'Антон';
  return 'Команда Blizko';
}

function getTicketShortId(ticket: AdminSupportTicket | null) {
  return ticket?.id ? ticket.id.slice(0, 8) : '';
}

const MessageBubble: React.FC<{ message: AdminSupportMessage }> = ({ message }) => {
  const isParent = message.senderType === 'user';
  const isHuman = message.senderType === 'human_agent';

  return (
    <div className={`flex ${isParent ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isParent
            ? 'bg-white text-stone-800'
            : isHuman
              ? 'bg-emerald-50 text-stone-800'
              : 'bg-amber-50 text-stone-700'
        }`}
      >
        <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-stone-400">
          <span>{getMessageLabel(message.senderType)}</span>
          <span>{formatTime(message.createdAt)}</span>
        </div>
        <div className="whitespace-pre-wrap">{message.text}</div>
      </div>
    </div>
  );
};

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({ focusTicketId }) => {
  const [inbox, setInbox] = React.useState<AdminSupportInboxResult>({
    items: [],
    selected: null,
    messages: [],
    parentContext: null,
  });
  const [selectedTicketId, setSelectedTicketId] = React.useState(focusTicketId || '');
  const [reply, setReply] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  const loadInbox = React.useCallback(
    async (ticketId?: string) => {
      setLoading(true);
      try {
        const result = await fetchAdminSupportInbox(ticketId);
        if (result) {
          setInbox(result);
          if (result.selected?.id) setSelectedTicketId(result.selected.id);
          if (!ticketId && result.items[0]?.id) {
            setSelectedTicketId(result.items[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    void loadInbox(focusTicketId || undefined);
  }, [focusTicketId, loadInbox]);

  const selectTicket = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    void loadInbox(ticketId);
  };

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = reply.trim();
    if (!selectedTicketId || !text || sending) return;
    setSending(true);
    try {
      const saved = await adminSendSupportReply(selectedTicketId, text);
      if (saved) {
        setReply('');
        setInbox((current) => ({
          ...current,
          messages: [...current.messages, saved],
        }));
      }
    } finally {
      setSending(false);
    }
  };

  const selected = inbox.selected;
  const context = inbox.parentContext;
  const selectedPriorityReason = getPriorityReason(selected);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <section className={`${adminSectionPanel} space-y-3`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Чаты с семьями</h2>
            <p className="mt-1 text-xs text-stone-500">
              Здесь видно обращение, историю и контекст заявки.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadInbox(selectedTicketId || undefined)}
            className="rounded-full bg-white/80 p-2 text-stone-500 transition-colors hover:text-stone-900"
            aria-label="Обновить чаты"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        {loading && inbox.items.length === 0 ? (
          <div className="rounded-2xl bg-white/70 p-4 text-sm text-stone-500">Загружаю чаты...</div>
        ) : inbox.items.length === 0 ? (
          <div className="rounded-2xl bg-white/70 p-4 text-sm text-stone-500">
            Пока нет обращений в поддержку.
          </div>
        ) : (
          <div className="space-y-2">
            {[...inbox.items]
              .sort((a, b) => {
                const aUrgent = a.status === 'human_escalated' ? 0 : 1;
                const bUrgent = b.status === 'human_escalated' ? 0 : 1;
                if (aUrgent !== bUrgent) return aUrgent - bUrgent;
                return (b.updatedAt || 0) - (a.updatedAt || 0);
              })
              .map((ticket) => {
                const active = ticket.id === selectedTicketId;
                const status = getStatusStyle(ticket.status);
                const tone = getToneStyle(ticket.sentimentScore ?? 0);
                const priorityReason = getPriorityReason(ticket);
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => selectTicket(ticket.id)}
                    className={`w-full rounded-2xl px-3 py-3 text-left transition-colors ${
                      active
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'bg-white/50 text-stone-700 hover:bg-white/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">#{ticket.id.slice(0, 8)}</span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${status.chip}`}
                      >
                        <span className={`size-1.5 rounded-full ${status.dot}`} />
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-stone-500">
                      {ticket.lastMessage?.text || ticket.summary || 'Без сообщений'}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-stone-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 size={12} />
                        {formatTime(ticket.updatedAt)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${tone.chip}`}
                      >
                        <span className={`size-1.5 rounded-full ${tone.dot}`} />
                        {getToneLabel(ticket.sentimentScore ?? 0)}
                      </span>
                    </div>
                    {priorityReason && (
                      <div className="mt-2 rounded-xl bg-rose-50/70 px-2 py-1.5 text-[11px] font-medium text-rose-700">
                        {priorityReason}
                      </div>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </section>

      <section className={`${adminSectionPanel} min-h-[680px]`}>
        {!selected ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[1.25rem] bg-white/60 text-center">
            <MessageCircle className="mb-3 text-stone-300" size={36} />
            <div className="text-sm font-semibold text-stone-700">Выберите чат</div>
            <p className="mt-1 max-w-sm text-xs text-stone-500">
              Из Telegram кнопка будет открывать этот экран сразу с нужным обращением.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-h-[640px] flex-col overflow-hidden rounded-[1.25rem] bg-stone-50/70">
              <div className="flex items-start justify-between gap-4 bg-white/80 px-4 py-4">
                <div>
                  <div className="eyebrow">Обращение #{getTicketShortId(selected)}</div>
                  <h2 className="mt-1 text-xl font-semibold text-stone-900">История чата</h2>
                </div>
                {(() => {
                  const tone = getToneStyle(selected.sentimentScore ?? 0);
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${tone.chip}`}
                    >
                      <span className={`size-2 rounded-full ${tone.dot}`} />
                      {getToneLabel(selected.sentimentScore ?? 0)}
                    </span>
                  );
                })()}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {inbox.messages.length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-sm text-stone-500">
                    История пока пустая.
                  </div>
                ) : (
                  inbox.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))
                )}
              </div>

              <form onSubmit={sendReply} className="bg-white/90 p-3">
                <div className="flex gap-2">
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Написать семье..."
                    rows={2}
                    className="min-h-[56px] flex-1 resize-none rounded-2xl bg-stone-100 px-4 py-3 text-sm outline-none transition-colors focus:bg-white"
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim() || sending}
                    className="rounded-2xl bg-stone-900 px-4 text-white transition-colors hover:bg-stone-800 disabled:opacity-50"
                    aria-label="Отправить ответ"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            </div>

            <aside className="space-y-3">
              <div className={`${adminSubsectionPanel} bg-white/70`}>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <AlertCircle size={16} className="text-amber-600" />
                  Что важно
                </div>
                <ul className="space-y-2 text-sm leading-relaxed text-stone-600">
                  <li>Статус: {getStatusLabel(selected.status)}</li>
                  <li>Тон сообщения: {getToneLabel(selected.sentimentScore)}</li>
                  <li>Последнее обновление: {formatTime(selected.updatedAt)}</li>
                </ul>
                {selectedPriorityReason && (
                  <div className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                    {selectedPriorityReason}
                  </div>
                )}
              </div>

              <div className={`${adminSubsectionPanel} bg-white/70`}>
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-stone-900">
                  <UserRound size={16} className="text-stone-500" />
                  Контекст семьи
                </div>
                {context ? (
                  <div className="space-y-2 text-sm text-stone-600">
                    <div>
                      {[context.city, context.district, context.metro].filter(Boolean).join(', ')}
                    </div>
                    <div>Ребёнок: {context.childAge || 'не указано'}</div>
                    <div>График: {context.schedule || 'не указан'}</div>
                    <div>Бюджет: {context.budget || 'не указан'}</div>
                    {context.contact && <div>Контакт: {context.contact}</div>}
                    {context.comment && (
                      <div className="rounded-2xl bg-stone-50 p-3 text-xs leading-relaxed">
                        {context.comment}
                      </div>
                    )}
                    {context.id && (
                      <a
                        href={`/admin/parents?q=${encodeURIComponent(context.id.slice(0, 8))}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-800 underline decoration-stone-300 underline-offset-4"
                      >
                        Открыть заявку <ArrowUpRight size={13} />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    Заявка семьи не найдена. История чата всё равно доступна.
                  </p>
                )}
              </div>

              <AdminPillButton
                type="button"
                onClick={() => void loadInbox(selected.id)}
                className="w-full"
              >
                Обновить историю
              </AdminPillButton>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
};
