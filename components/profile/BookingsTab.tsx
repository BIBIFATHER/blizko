import React, { useState } from 'react';
import { Button, Card, Badge } from '../UI';
import {
    Calendar, MessageSquare, CheckCircle, Star,
    MapPin, Briefcase,
} from 'lucide-react';
import { Language, User, Booking, Review } from '../../types';
import { t } from '../../src/core/i18n/translations';
import { NannyChatModal } from '../NannyChatModal';
import { LeaveReviewModal } from '../LeaveReviewModal';
import { addReview } from '../../services/storage';

interface BookingsTabProps {
    user: User;
    lang: Language;
    onReviewSubmit: (review: Review) => void;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({ user, lang, onReviewSubmit }) => {
    const text = t[lang];
    const isNanny = user.role === 'nanny';
    const [chatBooking, setChatBooking] = useState<Booking | null>(null);
    const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);

    // Mock data
    const nannyRequests = [
        {
            id: 'order-1',
            parentName: lang === 'ru' ? 'Семья Смирновых' : 'The Smith Family',
            location: lang === 'ru' ? 'Хамовники' : 'Soho',
            details: lang === 'ru' ? '2 детей (3г, 5л)' : '2 kids (3y, 5y)',
            schedule: lang === 'ru' ? 'Пн, Ср, Пт 10:00 - 14:00' : 'Mon, Wed, Fri 10am - 2pm',
            rate: lang === 'ru' ? '800 ₽/час' : '$25/hr',
        },
        {
            id: 'r2',
            parentName: lang === 'ru' ? 'Ольга В.' : 'Olga V.',
            location: lang === 'ru' ? 'Арбат' : 'Chelsea',
            details: lang === 'ru' ? 'Грудничок (6 мес)' : 'Infant (6mo)',
            schedule: lang === 'ru' ? 'Разово, 12 Окт' : 'One-time, Oct 12',
            rate: lang === 'ru' ? '1000 ₽/час' : '$30/hr',
        },
    ];

    const [activeBooking] = useState<Booking | null>({
        id: 'order-1',
        nannyName: lang === 'ru' ? 'Мария И.' : 'Maria I.',
        date: lang === 'ru' ? 'Сегодня, 14:00 - 18:00' : 'Today, 2:00 PM - 6:00 PM',
        status: 'active',
        amount: '2 400 ₽',
        avatarColor: 'bg-emerald-100 text-emerald-700',
        isPaid: false,
    });

    const [historyBookings, setHistoryBookings] = useState<Booking[]>([
        { id: 'b2', nannyName: lang === 'ru' ? 'Елена С.' : 'Elena S.', date: '10 Oct, 10:00 - 14:00', status: 'completed', amount: '1 500 ₽', avatarColor: 'bg-purple-100 text-purple-700', isPaid: true, hasReview: false },
        { id: 'b3', nannyName: lang === 'ru' ? 'Анна К.' : 'Anna K.', date: '01 Oct, 18:00 - 22:00', status: 'completed', amount: '2 000 ₽', avatarColor: 'bg-amber-100 text-amber-700', isPaid: true, hasReview: true },
    ]);

    const handleReviewSubmit = async (review: Review) => {
        setHistoryBookings((prev) => prev.map((b) => (b.id === review.bookingId ? { ...b, hasReview: true } : b)));
        await addReview(review);
        setReviewBookingId(null);
        onReviewSubmit(review);
    };

    return (
        <>
            <div className="animate-fade-in space-y-6">
                {isNanny ? (
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            {text.nannyRequests}
                        </h4>
                        {nannyRequests.map((req) => (
                            <Card key={req.id} className="!p-5 border-stone-200">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-stone-800">{req.parentName}</h4>
                                        <div className="flex items-center gap-1 text-xs text-stone-500 mt-1"><MapPin size={10} /> {req.location}</div>
                                    </div>
                                    <Badge variant="trust">{req.rate}</Badge>
                                </div>
                                <div className="space-y-2 mb-4 mt-3">
                                    <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center"><span className="text-stone-400"><Briefcase size={14} /></span> {req.details}</div>
                                    <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center"><span className="text-stone-400"><Calendar size={14} /></span> {req.schedule}</div>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    <Button onClick={() => setChatBooking({ id: req.id, nannyName: req.parentName, date: req.schedule, status: 'active', amount: req.rate })} className="py-2 text-sm w-full bg-stone-800 text-white hover:bg-stone-700">
                                        <MessageSquare size={14} /> Чат по заказу
                                    </Button>
                                    <div className="flex gap-2">
                                        <Button className="py-2 text-sm flex-1 bg-stone-800 text-white hover:bg-stone-700">{text.accept}</Button>
                                        <Button variant="outline" className="py-2 text-sm flex-1">{text.decline}</Button>
                                    </div>
                                    <div className="text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded-lg p-2 space-y-1">
                                        <div>После принятия: чат с семьёй и подтверждения T‑24ч / T‑3ч.</div>
                                        <div>Срок ответа: до 2 часов. Иначе заявка может уйти другой няне.</div>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <>
                        {activeBooking && (
                            <div>
                                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                                    {text.activeBookingTitle}
                                </h4>
                                <Card className="!p-0 overflow-hidden border-amber-200 bg-amber-50/30">
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${activeBooking.avatarColor}`}>
                                                    {activeBooking.nannyName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-stone-800">{activeBooking.nannyName}</div>
                                                    <Badge variant="status">{text.statusActive}</Badge>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-semibold text-stone-700">{activeBooking.amount}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-stone-600 bg-white/60 p-2 rounded-lg mb-2">
                                            <Calendar size={16} className="text-stone-400" /> {activeBooking.date}
                                        </div>
                                        <div className="text-[11px] text-stone-500 mb-3">Статус: активен • Следующее подтверждение: T‑3ч • Гарантия активна</div>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="bg-white/70 border border-amber-200 rounded-lg p-2 text-[11px] text-amber-700">
                                                <div className="font-semibold">Гарантия активна</div>
                                                <div>Резерв: Ольга П. (на подмене)</div>
                                                <div>Подтверждения: T‑24ч ✅ · T‑3ч ⏳</div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <Button className="py-2 text-xs bg-stone-800 text-white hover:bg-stone-700">Подтвердить</Button>
                                                <Button variant="outline" className="py-2 text-xs">Перенести</Button>
                                                <Button variant="outline" className="py-2 text-xs">Замена</Button>
                                            </div>
                                            <div className="text-[11px] text-stone-500">Если есть изменения — сообщите минимум за 3 часа.</div>
                                            <Button onClick={() => setChatBooking(activeBooking)} className="py-3 text-sm bg-stone-800 text-white hover:bg-stone-700">
                                                <MessageSquare size={16} /> <span className="hidden xs:inline">{text.chatWithNanny}</span>
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
                                    <Card key={booking.id} className="!p-4 flex flex-col gap-2 border-stone-100 bg-white">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${booking.avatarColor}`}>
                                                    {booking.nannyName.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-stone-700 text-sm">{booking.nannyName}</div>
                                                    <div className="text-[10px] text-stone-400">{booking.date}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-full mb-1">{text.statusCompleted}</div>
                                                <div className="text-[10px] text-stone-400">{booking.amount}</div>
                                            </div>
                                        </div>
                                        {!booking.hasReview && (
                                            <button onClick={() => setReviewBookingId(booking.id)} className="mt-2 w-full py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-2">
                                                <Star size={14} /> {text.leaveReview}
                                            </button>
                                        )}
                                        {booking.hasReview && (
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
                    nannyName={chatBooking.nannyName}
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
