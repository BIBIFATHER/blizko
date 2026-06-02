import React, { useState, useMemo } from 'react';
import { Card, Badge } from '../UI';
import { Booking } from '@/services/booking';
import { ParentRequest, NannyProfile } from '@/core/types';
import { Calendar, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { AdminPillButton } from './adminPrimitives';
import { useAdminWorkflowUI } from './adminWorkflowUI';

type BookingFilter = 'all' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

interface AdminBookingsTabProps {
  bookings: Booking[];
  parents: ParentRequest[];
  nannies: NannyProfile[];
  onStatusChange: (bookingId: string, status: Booking['status']) => void;
}

const statusConfig: Record<
  Booking['status'],
  { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'trust' }
> = {
  pending: { label: 'Ожидает', variant: 'warning' },
  confirmed: { label: 'Подтверждено', variant: 'info' },
  active: { label: 'Активно', variant: 'success' },
  completed: { label: 'Завершено', variant: 'trust' },
  cancelled: { label: 'Отменено', variant: 'danger' },
};

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({
  bookings,
  parents,
  nannies,
  onStatusChange,
}) => {
  const { confirmAction } = useAdminWorkflowUI();
  const [filter, setFilter] = useState<BookingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggingBookingId, setDraggingBookingId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Booking['status'] | null>(null);

  const parentLabel = (parentId: string) => {
    const p = parents.find((pr) => pr.id === parentId || pr.requesterId === parentId);
    return p ? `${p.city}, ${p.childAge}` : `#${parentId.slice(0, 8)}`;
  };

  const nannyLabel = (nannyId: string) => {
    const n = nannies.find((np) => np.id === nannyId || np.userId === nannyId);
    return n ? n.name : `#${nannyId.slice(0, 8)}`;
  };

  const requestBookingStatusChange = async (booking: Booking, newStatus: Booking['status']) => {
    if (booking.status === newStatus) return;
    const ok = await confirmAction({
      message: `Перевести бронь #${booking.id.slice(0, 8)} в статус «${statusConfig[newStatus].label}»?`,
      detail: `${parentLabel(booking.parent_id)} → ${nannyLabel(booking.nanny_id)}`,
      confirmLabel: 'Перевести',
    });
    if (!ok) return;
    onStatusChange(booking.id, newStatus);
  };

  const handleBookingDrop = (newStatus: Booking['status']) => async (e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDragOverColumn(null);
    setDraggingBookingId(null);
    const b = bookings.find((x) => x.id === id);
    if (!b) return;
    await requestBookingStatusChange(b, newStatus);
  };

  const filtered = useMemo(() => {
    let result = bookings;
    if (filter !== 'all') {
      result = result.filter((b) => b.status === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((b) => {
        const pLabel = parentLabel(b.parent_id).toLowerCase();
        const nLabel = nannyLabel(b.nanny_id).toLowerCase();
        return (
          b.id.toLowerCase().includes(q) ||
          b.parent_id.toLowerCase().includes(q) ||
          b.nanny_id.toLowerCase().includes(q) ||
          pLabel.includes(q) ||
          nLabel.includes(q)
        );
      });
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, filter, searchQuery, parents, nannies]);

  const counts = useMemo(
    () => ({
      all: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      active: bookings.filter((b) => b.status === 'active').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    }),
    [bookings],
  );

  const filters: { key: BookingFilter; label: string }[] = [
    { key: 'all', label: `Все (${counts.all})` },
    { key: 'pending', label: `Ожидают (${counts.pending})` },
    { key: 'confirmed', label: `Подтв. (${counts.confirmed})` },
    { key: 'active', label: `Актив. (${counts.active})` },
    { key: 'completed', label: `Готово (${counts.completed})` },
    { key: 'cancelled', label: `Отмен. (${counts.cancelled})` },
  ];

  const searchMatch = (b: Booking) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return [b.id, b.parent_id, b.nanny_id, parentLabel(b.parent_id), nannyLabel(b.nanny_id)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(q);
  };

  const BOOKING_COLUMNS: {
    status: Booking['status'];
    dot: string;
    text: string;
    accent: string;
  }[] = [
    { status: 'pending', dot: 'bg-amber-500', text: 'text-amber-700', accent: 'bg-amber-400' },
    { status: 'confirmed', dot: 'bg-sky-500', text: 'text-sky-700', accent: 'bg-sky-400' },
    { status: 'active', dot: 'bg-emerald-500', text: 'text-emerald-700', accent: 'bg-emerald-400' },
    { status: 'completed', dot: 'bg-stone-500', text: 'text-stone-600', accent: 'bg-stone-400' },
    { status: 'cancelled', dot: 'bg-rose-500', text: 'text-rose-700', accent: 'bg-rose-400' },
  ];

  const renderBookingCard = (booking: Booking, opts?: { showStatus?: boolean }) => {
    const showStatus = opts?.showStatus ?? true;
    const cfg = statusConfig[booking.status];
    const date = booking.date
      ? new Date(booking.date).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'Не указана';
    return (
      <div className="rounded-[1.25rem] border border-[color:var(--cloud-border)] bg-white/80 p-4">
        <div className="mb-3 flex items-start justify-between">
          <div>
            <div className="font-mono text-xs text-stone-400">#{booking.id.slice(0, 8)}</div>
            <div className="mt-1 flex items-center gap-2">
              <Calendar size={14} className="text-stone-400" />
              <span className="text-sm text-stone-600">{date}</span>
            </div>
          </div>
          {showStatus && <Badge variant={cfg.variant}>{cfg.label}</Badge>}
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-stone-500">
          <div className="flex items-start gap-1">
            <User size={12} className="mt-0.5 shrink-0" />
            <span className="truncate" title={booking.parent_id}>
              {parentLabel(booking.parent_id)}
            </span>
          </div>
          <div className="flex items-start gap-1">
            <User size={12} className="mt-0.5 shrink-0" />
            <span className="truncate" title={booking.nanny_id}>
              {nannyLabel(booking.nanny_id)}
            </span>
          </div>
        </div>
        {booking.amount && (
          <div className="mb-3 text-sm text-stone-600">
            Сумма: <strong>{booking.amount}</strong>
          </div>
        )}
        {booking.status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => void requestBookingStatusChange(booking, 'confirmed')}
              className="flex flex-1 items-center justify-center gap-1 rounded-full border border-green-200/80 bg-green-50 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
            >
              <CheckCircle size={14} /> Подтвердить
            </button>
            <button
              onClick={() => void requestBookingStatusChange(booking, 'cancelled')}
              className="flex flex-1 items-center justify-center gap-1 rounded-full border border-red-200/80 bg-red-50 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <XCircle size={14} /> Отменить
            </button>
          </div>
        )}
        {booking.status === 'confirmed' && (
          <button
            onClick={() => void requestBookingStatusChange(booking, 'active')}
            className="flex w-full items-center justify-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
          >
            <Clock size={14} /> Отметить как активное
          </button>
        )}
        {booking.status === 'active' && (
          <button
            onClick={() => void requestBookingStatusChange(booking, 'completed')}
            className="flex w-full items-center justify-center gap-1 rounded-full border border-green-200/80 bg-green-50 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
          >
            <CheckCircle size={14} /> Завершить
          </button>
        )}
        {!showStatus && (
          <select
            value={booking.status}
            onChange={(event) => {
              void requestBookingStatusChange(booking, event.target.value as Booking['status']);
            }}
            className="mt-3 w-full rounded-full border border-stone-200/80 bg-white/70 px-3 py-2 text-xs font-semibold text-stone-700 outline-none transition-all hover:bg-white"
            aria-label="Изменить статус бронирования"
          >
            {(Object.keys(statusConfig) as Booking['status'][]).map((status) => (
              <option key={status} value={status}>
                {statusConfig[status].label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <div className="flex justify-center">
            <Badge variant="warning">В работе</Badge>
          </div>
          <div className="text-2xl font-bold text-stone-800 mt-2">
            {counts.pending + counts.confirmed}
          </div>
          <div className="text-xs text-stone-400 mt-1">Ожидают старта или подтверждения</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex justify-center">
            <Badge variant="success">Завершено</Badge>
          </div>
          <div className="text-2xl font-bold text-stone-800 mt-2">{counts.completed}</div>
          <div className="text-xs text-stone-400 mt-1">Успешно закрытые брони</div>
        </Card>
        <Card className="p-4 text-center">
          <div className="flex justify-center">
            <Badge variant="danger">Отменено</Badge>
          </div>
          <div className="text-2xl font-bold text-stone-800 mt-2">{counts.cancelled}</div>
          <div className="text-xs text-stone-400 mt-1">Требуют разбора причин</div>
        </Card>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Поиск по имени, городу, ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-glass flex-1 px-4 py-3 text-sm"
        />
        <div className="flex shrink-0 gap-1 rounded-full border border-stone-200 bg-white/70 p-0.5 text-xs">
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

      {viewMode === 'list' && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <AdminPillButton
              key={f.key}
              onClick={() => setFilter(f.key)}
              active={filter === f.key}
              tone="neutral"
              className="whitespace-nowrap"
            >
              {f.label}
            </AdminPillButton>
          ))}
        </div>
      )}

      {viewMode === 'list' ? (
        filtered.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Calendar size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Нет бронирований</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((booking) => (
              <div key={booking.id}>{renderBookingCard(booking)}</div>
            ))}
          </div>
        )
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {BOOKING_COLUMNS.map(({ status, dot, text, accent }) => {
            const items = bookings.filter((b) => b.status === status && searchMatch(b));
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
                onDrop={handleBookingDrop(status)}
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
                    {statusConfig[status].label}
                  </span>
                  <span className={`text-xs font-semibold ${text}`}>{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 ? (
                    <p className="px-1 text-xs text-stone-300">—</p>
                  ) : (
                    items.map((b) => (
                      <div
                        key={b.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', b.id);
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingBookingId(b.id);
                        }}
                        onDragEnd={() => {
                          setDraggingBookingId(null);
                          setDragOverColumn(null);
                        }}
                        className={`cursor-grab active:cursor-grabbing transition-opacity ${
                          draggingBookingId === b.id ? 'opacity-40' : 'opacity-100'
                        }`}
                      >
                        {renderBookingCard(b, { showStatus: false })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
