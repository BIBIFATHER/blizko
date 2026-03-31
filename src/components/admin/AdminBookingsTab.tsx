import React, { useState, useMemo } from 'react';
import { Card, Badge } from '../UI';
import { Booking } from '@/services/booking';
import { Calendar, Clock, User, CheckCircle, XCircle } from 'lucide-react';
import { AdminPillButton } from './adminPrimitives';

type BookingFilter = 'all' | 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled';

interface AdminBookingsTabProps {
    bookings: Booking[];
    onStatusChange: (bookingId: string, status: Booking['status']) => void;
}

const statusConfig: Record<Booking['status'], { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'trust' }> = {
    pending: { label: 'Ожидает', variant: 'warning' },
    confirmed: { label: 'Подтверждено', variant: 'info' },
    active: { label: 'Активно', variant: 'success' },
    completed: { label: 'Завершено', variant: 'trust' },
    cancelled: { label: 'Отменено', variant: 'danger' },
};

export const AdminBookingsTab: React.FC<AdminBookingsTabProps> = ({
    bookings,
    onStatusChange,
}) => {
    const [filter, setFilter] = useState<BookingFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = useMemo(() => {
        let result = bookings;
        if (filter !== 'all') {
            result = result.filter(b => b.status === filter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(b =>
                b.id.toLowerCase().includes(q) ||
                b.parent_id.toLowerCase().includes(q) ||
                b.nanny_id.toLowerCase().includes(q)
            );
        }
        return result;
    }, [bookings, filter, searchQuery]);

    const counts = useMemo(() => ({
        all: bookings.length,
        pending: bookings.filter(b => b.status === 'pending').length,
        confirmed: bookings.filter(b => b.status === 'confirmed').length,
        active: bookings.filter(b => b.status === 'active').length,
        completed: bookings.filter(b => b.status === 'completed').length,
        cancelled: bookings.filter(b => b.status === 'cancelled').length,
    }), [bookings]);

    const filters: { key: BookingFilter; label: string }[] = [
        { key: 'all', label: `Все (${counts.all})` },
        { key: 'pending', label: `Ожидают (${counts.pending})` },
        { key: 'confirmed', label: `Подтв. (${counts.confirmed})` },
        { key: 'active', label: `Актив. (${counts.active})` },
        { key: 'completed', label: `Готово (${counts.completed})` },
        { key: 'cancelled', label: `Отмен. (${counts.cancelled})` },
    ];

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <Card className="p-4 text-center">
                    <div className="flex justify-center">
                        <Badge variant="warning">В работе</Badge>
                    </div>
                    <div className="text-2xl font-bold text-stone-800 mt-2">{counts.pending + counts.confirmed}</div>
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

            <div className="flex gap-2 overflow-x-auto pb-1">
                {filters.map(f => (
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

            <input
                type="text"
                placeholder="Поиск по ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="input-glass w-full px-4 py-3 text-sm"
            />

            {filtered.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                    <Calendar size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Нет бронирований</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(booking => {
                        const cfg = statusConfig[booking.status];
                        const date = booking.date ? new Date(booking.date).toLocaleDateString('ru-RU', {
                            day: 'numeric', month: 'short', year: 'numeric'
                        }) : 'Не указана';

                        return (
                            <Card key={booking.id} className="p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="text-xs text-stone-400 font-mono">#{booking.id.slice(0, 8)}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Calendar size={14} className="text-stone-400" />
                                            <span className="text-sm text-stone-600">{date}</span>
                                        </div>
                                    </div>
                                    <Badge variant={cfg.variant}>{cfg.label}</Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 mb-3">
                                    <div className="flex items-center gap-1">
                                        <User size={12} />
                                        <span>Родитель: {booking.parent_id.slice(0, 8)}...</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <User size={12} />
                                        <span>Няня: {booking.nanny_id.slice(0, 8)}...</span>
                                    </div>
                                </div>

                                {booking.amount && (
                                    <div className="text-sm text-stone-600 mb-3">
                                        Сумма: <strong>{booking.amount}</strong>
                                    </div>
                                )}

                                {/* Actions */}
                                {booking.status === 'pending' && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => onStatusChange(booking.id, 'confirmed')}
                                            className="flex-1 flex items-center justify-center gap-1 rounded-full border border-green-200/80 bg-green-50 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                        >
                                            <CheckCircle size={14} /> Подтвердить
                                        </button>
                                        <button
                                            onClick={() => onStatusChange(booking.id, 'cancelled')}
                                            className="flex-1 flex items-center justify-center gap-1 rounded-full border border-red-200/80 bg-red-50 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                                        >
                                            <XCircle size={14} /> Отменить
                                        </button>
                                    </div>
                                )}

                                {booking.status === 'confirmed' && (
                                    <button
                                        onClick={() => onStatusChange(booking.id, 'active')}
                                        className="w-full flex items-center justify-center gap-1 rounded-full border border-amber-200/80 bg-amber-50 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
                                    >
                                        <Clock size={14} /> Отметить как активное
                                    </button>
                                )}

                                {booking.status === 'active' && (
                                    <button
                                        onClick={() => onStatusChange(booking.id, 'completed')}
                                        className="w-full flex items-center justify-center gap-1 rounded-full border border-green-200/80 bg-green-50 py-2 text-xs font-medium text-green-700 transition-colors hover:bg-green-100"
                                    >
                                        <CheckCircle size={14} /> Завершить
                                    </button>
                                )}
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
