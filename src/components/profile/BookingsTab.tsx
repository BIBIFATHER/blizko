import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Badge } from '../UI';
import {
    Calendar, MessageSquare, CheckCircle, Star,
    MapPin, Briefcase,
} from 'lucide-react';
import { Language, User, Review } from '../../types';
import { t } from '@/core/i18n/translations';
import { NannyChatModal } from '../NannyChatModal';
import { LeaveReviewModal } from '../LeaveReviewModal';
import { addReview, getNannyProfiles } from '@/services/storage';
import { getBookingsForUser, updateBookingStatus, type Booking as ServiceBooking } from '@/services/booking';

interface BookingsTabProps {
    user: User;
    lang: Language;
    onReviewSubmit: (review: Review) => void;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({ user, lang, onReviewSubmit }) => {
    const text = t[lang];
    const isNanny = user.role === 'nanny';
    const [chatBooking, setChatBooking] = useState<ServiceBooking | null>(null);
    const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
    const [bookingNannyMap, setBookingNannyMap] = useState<Record<string, string>>({});
    const [bookings, setBookings] = useState<ServiceBooking[]>([]);
    const [nannyNames, setNannyNames] = useState<Record<string, string>>({});
    const [reviewedBookingIds, setReviewedBookingIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.id) return;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [items, nannies] = await Promise.all([
                    getBookingsForUser(user.id),
                    getNannyProfiles(),
                ]);

                if (cancelled) return;

                const nextBookingNannyMap = items.reduce<Record<string, string>>((acc, item) => {
                    if (item.id && item.nanny_id) acc[item.id] = item.nanny_id;
                    return acc;
                }, {});
                const nextNannyNames = nannies.reduce<Record<string, string>>((acc, nanny) => {
                    if (nanny.id) acc[nanny.id] = nanny.name || nanny.id;
                    return acc;
                }, {});
                const reviewedIds = nannies.flatMap((nanny) =>
                    (nanny.reviews || [])
                        .map((review) => review.bookingId)
                        .filter((bookingId): bookingId is string => Boolean(bookingId))
                );

                setBookings(items);
                setBookingNannyMap(nextBookingNannyMap);
                setNannyNames(nextNannyNames);
                setReviewedBookingIds(Array.from(new Set(reviewedIds)));
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        void load();
        return () => {
            cancelled = true;
        };
    }, [user.id]);

    const formatBookingDate = (booking: ServiceBooking) => {
        const parsed = new Date(booking.date);
        if (Number.isNaN(parsed.getTime())) return booking.date;
        return parsed.toLocaleString(lang === 'ru' ? 'ru-RU' : 'en-US', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getCounterpartyName = (booking: ServiceBooking) => {
        if (isNanny) {
            const shortId = booking.parent_id.slice(0, 6);
            return lang === 'ru' ? `Семья #${shortId}` : `Family #${shortId}`;
        }

        return nannyNames[booking.nanny_id]
            || (lang === 'ru' ? `Няня #${booking.nanny_id.slice(0, 6)}` : `Nanny #${booking.nanny_id.slice(0, 6)}`);
    };

    const getAvatarColor = (seed: string) => {
        const palette = [
            'bg-emerald-100 text-emerald-700',
            'bg-purple-100 text-purple-700',
            'bg-amber-100 text-amber-700',
            'bg-sky-100 text-sky-700',
        ];
        const index = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
        return palette[index];
    };

    const getStatusLabel = (status: ServiceBooking['status']) => {
        if (status === 'active') return text.statusActive;
        if (status === 'completed') return text.statusCompleted;
        if (status === 'pending') return lang === 'ru' ? 'Ожидает' : 'Pending';
        if (status === 'confirmed') return lang === 'ru' ? 'Подтверждено' : 'Confirmed';
        return lang === 'ru' ? 'Отменено' : 'Cancelled';
    };

    const upcomingBookings = useMemo(
        () => bookings.filter((booking) => booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'active'),
        [bookings]
    );
    const activeBooking = useMemo(
        () => upcomingBookings.find((booking) => booking.status === 'active') || upcomingBookings[0] || null,
        [upcomingBookings]
    );
    const historyBookings = useMemo(
        () => bookings.filter((booking) => booking.status === 'completed' || booking.status === 'cancelled'),
        [bookings]
    );

    const patchBooking = (nextBooking: ServiceBooking) => {
        setBookings((prev) => prev.map((booking) => booking.id === nextBooking.id ? nextBooking : booking));
    };

    const handleBookingStatusChange = async (bookingId: string, status: ServiceBooking['status']) => {
        const updated = await updateBookingStatus(bookingId, status);
        if (updated) patchBooking(updated);
    };

    const handleReviewSubmit = async (review: Review) => {
        await addReview(review, review.bookingId ? bookingNannyMap[review.bookingId] : undefined);
        if (review.bookingId) {
            setReviewedBookingIds((prev) => Array.from(new Set([...prev, review.bookingId!])));
        }
        setReviewBookingId(null);
        onReviewSubmit(review);
    };

    return (
        <>
            <div className="animate-fade-in space-y-6">
                {loading && (
                    <Card className="p-4! bg-white border border-stone-100 text-sm text-stone-500">
                        {lang === 'ru' ? 'Загружаем реальные бронирования…' : 'Loading real bookings…'}
                    </Card>
                )}
                {isNanny ? (
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            {text.nannyRequests}
                        </h4>
                        {!loading && upcomingBookings.length === 0 && (
                            <Card className="p-5! border-stone-100 bg-white text-sm text-stone-500">
                                {lang === 'ru'
                                    ? 'Пока нет живых запросов. Когда бронирование появится, оно отобразится здесь.'
                                    : 'No live requests yet. New bookings will appear here.'}
                            </Card>
                        )}
                        {upcomingBookings.map((booking) => (
                            <Card key={booking.id} className="p-5! border-stone-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-stone-800">{getCounterpartyName(booking)}</h4>
                                        <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                                            <MapPin size={10} /> #{booking.request_id.slice(0, 8)}
                                        </div>
                                    </div>
                                    <Badge variant={booking.status === 'active' ? 'success' : booking.status === 'confirmed' ? 'info' : 'warning'}>
                                        {booking.amount || '—'}
                                    </Badge>
                                </div>
                                <div className="space-y-2 mb-4 mt-3">
                                    <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center">
                                        <span className="text-stone-400"><Briefcase size={14} /></span>
                                        {lang === 'ru' ? `Статус: ${booking.status}` : `Status: ${booking.status}`}
                                    </div>
                                    <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center">
                                        <span className="text-stone-400"><Calendar size={14} /></span> {formatBookingDate(booking)}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button onClick={() => setChatBooking(booking)} className="py-2 text-sm w-full bg-stone-800 text-white hover:bg-stone-700">
                                        <MessageSquare size={14} /> Чат по заказу
                                    </Button>
                                    {booking.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <Button onClick={() => void handleBookingStatusChange(booking.id, 'confirmed')} className="py-2 text-sm flex-1 bg-stone-800 text-white hover:bg-stone-700">{text.accept}</Button>
                                            <Button onClick={() => void handleBookingStatusChange(booking.id, 'cancelled')} variant="outline" className="py-2 text-sm flex-1">{text.decline}</Button>
                                        </div>
                                    )}
                                    {booking.status === 'confirmed' && (
                                        <Button onClick={() => void handleBookingStatusChange(booking.id, 'active')} className="py-2 text-sm w-full bg-emerald-600 text-white hover:bg-emerald-500">
                                            {lang === 'ru' ? 'Начать заказ' : 'Start booking'}
                                        </Button>
                                    )}
                                    {booking.status === 'active' && (
                                        <Button onClick={() => void handleBookingStatusChange(booking.id, 'completed')} className="py-2 text-sm w-full bg-emerald-600 text-white hover:bg-emerald-500">
                                            {lang === 'ru' ? 'Завершить заказ' : 'Complete booking'}
                                        </Button>
                                    )}
                                    <div className="text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded-lg p-2 space-y-1">
                                        <div>{lang === 'ru' ? 'Показываем только реальные бронирования из системы.' : 'Only real bookings from the system are shown here.'}</div>
                                        <div>{lang === 'ru' ? 'Если статус изменился на другом устройстве, он подтянется при следующей синхронизации.' : 'If the status changes on another device, it will sync on the next refresh.'}</div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                        {!loading && !activeBooking && historyBookings.length === 0 && (
                            <Card className="p-5! border-stone-100 bg-white text-sm text-stone-500">
                                {lang === 'ru'
                                    ? 'Пока нет бронирований. Когда подтвердите мэтч, он появится здесь.'
                                    : 'No bookings yet. Once a match is confirmed, it will appear here.'}
                            </Card>
                        )}
                        {activeBooking && (
                            <div>
                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    {text.activeBookingTitle}
                                </h4>
                                <Card className="p-0! overflow-hidden border-amber-200 bg-amber-50/30">
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarColor(activeBooking.id)}`}>
                                                    {getCounterpartyName(activeBooking).charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-stone-800">{getCounterpartyName(activeBooking)}</div>
                                                    <Badge variant={activeBooking.status === 'active' ? 'success' : activeBooking.status === 'confirmed' ? 'info' : 'warning'}>
                                                        {getStatusLabel(activeBooking.status)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-stone-700">{activeBooking.amount || '—'}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-stone-600 bg-white/60 p-2 rounded-lg mb-2">
                                            <Calendar size={16} className="text-stone-400" /> {formatBookingDate(activeBooking)}
                                        </div>
                                        <div className="text-[11px] text-stone-500 mb-3">
                                            {lang === 'ru'
                                                ? `Статус: ${activeBooking.status}. Данные берутся из live booking layer.`
                                                : `Status: ${activeBooking.status}. Data comes from the live booking layer.`}
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="bg-white/70 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-700">
                                                <div className="font-semibold">{lang === 'ru' ? 'Реальное бронирование' : 'Live booking'}</div>
                                                <div>{lang === 'ru' ? `ID заявки: ${activeBooking.request_id}` : `Request ID: ${activeBooking.request_id}`}</div>
                                                <div>{lang === 'ru' ? 'Статус можно уточнить через чат или поддержку.' : 'You can clarify status through chat or support.'}</div>
                                            </div>
                                            <Button onClick={() => setChatBooking(activeBooking)} className="py-3 text-sm bg-stone-800 text-white hover:bg-stone-700 w-full">
                                                <MessageSquare size={16} /> Чат с няней
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        <div>
                            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{text.historyTitle}</h4>
                            <div className="space-y-3">
                                {historyBookings.map((booking) => (
                                    <Card key={booking.id} className="p-4! flex flex-col gap-2 border-stone-100 bg-white">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(booking.id)}`}>
                                                    {getCounterpartyName(booking).charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-stone-700 text-sm">{getCounterpartyName(booking)}</div>
                                                    <div className="text-[10px] text-stone-400">{formatBookingDate(booking)}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-full mb-1">
                                                    {getStatusLabel(booking.status)}
                                                </div>
                                                <div className="text-[10px] text-stone-400">{booking.amount || '—'}</div>
                                            </div>
                                        </div>
                                        {booking.status === 'completed' && !reviewedBookingIds.includes(booking.id) && (
                                            <button onClick={() => setReviewBookingId(booking.id)} className="mt-2 w-full py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
                                                <Star size={14} /> {text.leaveReview}
                                            </button>
                                        )}
                                        {reviewedBookingIds.includes(booking.id) && (
                                            <div className="mt-2 text-xs text-green-600 flex items-center justify-center gap-1 bg-green-50 py-1 rounded-lg">
                                                <CheckCircle size={12} /> {text.reviewThanks}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {chatBooking && (
                <NannyChatModal
                    bookingId={chatBooking.id}
                    nannyName={getCounterpartyName(chatBooking)}
                    currentUserId={user.id}
                    currentUserName={user.name || user.email}
                    currentUserRole={user.role}
                    onClose={() => setChatBooking(null)}
                    lang={lang}
                />
            )}

            {reviewBookingId && (
                <LeaveReviewModal
                    bookingId={reviewBookingId}
                    onClose={() => setReviewBookingId(null)}
                    onSubmit={handleReviewSubmit}
                    lang={lang}
                />
            )}
        </>
    );
};
