import React, { useState, useEffect } from 'react';
import { Button, Card, ProgressBar, Badge } from '../UI';
import { AvailabilityCalendar, SlotStatus } from '../AvailabilityCalendar';
import {
    User as UserIcon, LogOut, Calendar, CheckCircle, Wallet, Star,
    ShieldCheck, Briefcase, Edit, Lock, Phone, Mail, BadgeCheck, LifeBuoy, X, Clock,
} from 'lucide-react';
import { Language, User, NannyProfile, ParentRequest, Review } from '../../types';
import { t } from '../../src/core/i18n/translations';
import { getMyNannyProfile, getMyParentRequests, resubmitParentRequest } from '../../services/storage';
import { notifyAdminResubmitted } from '../../services/notifications';
import { supabase } from '../../services/supabase';
import { SERVICE_COMMISSION_RATE } from '../../src/core/config/pricing';
import { getNannyReadinessSnapshot } from '../../services/nannyReadiness';
import { ReferralWidget } from '../referral/ReferralWidget';

interface ProfileTabProps {
    user: User;
    lang: Language;
    onLogout: () => void;
    onEditProfile?: (profile?: NannyProfile) => void;
    onEditParentRequest?: (request?: ParentRequest) => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
    user, lang, onLogout, onEditProfile, onEditParentRequest,
}) => {
    const text = t[lang];
    const isNanny = user.role === 'nanny';

    const [myNannyProfile, setMyNannyProfile] = useState<NannyProfile | undefined>(undefined);
    const [myParentRequests, setMyParentRequests] = useState<ParentRequest[]>([]);
    const [moderationSeenMap, setModerationSeenMap] = useState<Record<string, number>>({});

    // Phone verification
    const [phoneInput, setPhoneInput] = useState(user.phone || '');
    const [phoneCode, setPhoneCode] = useState('');
    const [phoneStep, setPhoneStep] = useState<'idle' | 'code' | 'verified'>('idle');
    const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);
    const [phoneVerifyError, setPhoneVerifyError] = useState('');

    // Nanny-specific
    const [showCalendar, setShowCalendar] = useState(false);
    const [calendarSlots, setCalendarSlots] = useState<Record<string, SlotStatus>>({});
    const [isRegistrationPaid, setIsRegistrationPaid] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [paymentType, setPaymentType] = useState<'registration' | 'commission'>('registration');

    const earnedTotal = Number((myNannyProfile as NannyProfile & { bookingStats?: { earnedTotal?: number } } | undefined)?.bookingStats?.earnedTotal || 0);
    const commissionRate = SERVICE_COMMISSION_RATE;
    const commissionDue = earnedTotal * commissionRate;
    const nannyReadiness = myNannyProfile ? getNannyReadinessSnapshot(myNannyProfile) : null;
    const nannyReviewCount = myNannyProfile?.reviews?.length || 0;
    const nannyAverageRating = nannyReviewCount > 0
        ? (myNannyProfile!.reviews!.reduce((sum, review) => sum + review.rating, 0) / nannyReviewCount).toFixed(1)
        : null;
    const nannyCompletedHours = Number((myNannyProfile as NannyProfile & { bookingStats?: { completedHours?: number } } | undefined)?.bookingStats?.completedHours || 0) || null;
    const latestParentRequest = myParentRequests[0];
    const parentProfileProgress = latestParentRequest
        ? Math.round((
            [
                latestParentRequest.city,
                latestParentRequest.childAge,
                latestParentRequest.schedule,
                latestParentRequest.budget,
                latestParentRequest.comment,
            ].filter(Boolean).length + (latestParentRequest.requirements?.length ? 1 : 0) + (latestParentRequest.documents?.length ? 1 : 0)
        ) / 7 * 100)
        : 0;

    useEffect(() => {
        const load = async () => {
            if (isNanny) {
                const myProfile = await getMyNannyProfile(user);
                setMyNannyProfile(myProfile);
            } else {
                const requests = await getMyParentRequests(user);
                setMyParentRequests(requests);
            }
        };
        load();
        try {
            const raw = localStorage.getItem('blizko_parent_moderation_seen');
            if (raw) setModerationSeenMap(JSON.parse(raw));
        } catch { /* ignore */ }
    }, [isNanny, user.name]);

    useEffect(() => {
        const loadPhoneMeta = async () => {
            if (!supabase) return;
            const { data } = await supabase.auth.getUser();
            const phoneVerified = Boolean(data.user?.user_metadata?.phone_verified);
            const phoneE164 = String(data.user?.user_metadata?.phone_e164 || data.user?.phone || user.phone || '');
            if (phoneE164) setPhoneInput(phoneE164);
            if (phoneVerified) setPhoneStep('verified');
        };
        loadPhoneMeta();
    }, [user.phone]);

    const sendPhoneCode = async () => {
        setPhoneVerifyLoading(true);
        setPhoneVerifyError('');
        try {
            const r = await fetch('/api/auth/phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'send', phone: phoneInput }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok || !data?.ok) throw new Error(data?.error || 'Не удалось отправить код');
            setPhoneStep('code');
            if (data?.demoCode) setPhoneVerifyError(`Тестовый код: ${data.demoCode}`);
        } catch (e: any) {
            setPhoneVerifyError(String(e?.message || e));
        } finally {
            setPhoneVerifyLoading(false);
        }
    };

    const verifyPhoneCode = async () => {
        setPhoneVerifyLoading(true);
        setPhoneVerifyError('');
        try {
            const r = await fetch('/api/auth/phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify', phone: phoneInput, code: phoneCode }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok || !data?.ok) throw new Error(data?.error || 'Неверный код');
            if (supabase) {
                await supabase.auth.updateUser({
                    data: { phone_verified: true, phone_e164: data.phone || phoneInput },
                });
            }
            setPhoneStep('verified');
            setPhoneCode('');
        } catch (e: any) {
            setPhoneVerifyError(String(e?.message || e));
        } finally {
            setPhoneVerifyLoading(false);
        }
    };

    const handlePaymentClick = (type: 'registration' | 'commission') => {
        setPaymentType(type);
        setShowPayment(true);
    };

    const toggleCalendarSlot = (dayIndex: number, slotIndex: number) => {
        const key = `${dayIndex}-${slotIndex}`;
        setCalendarSlots((prev) => {
            const current = prev[key] || 'available';
            const next: SlotStatus = current === 'busy' ? 'available' : current === 'reserved' ? 'busy' : 'reserved';
            return { ...prev, [key]: next };
        });
    };

    const openSupportChat = () => {
        window.dispatchEvent(new CustomEvent('blizko:open-support-chat'));
    };

    // Parent helpers
    const parentStatusLabel = (status?: ParentRequest['status']) => {
        if (status === 'in_review') return 'На проверке';
        if (status === 'approved') return 'Одобрена';
        if (status === 'rejected') return 'Отклонена';
        return 'Новая';
    };
    const parentStatusClass = (status?: ParentRequest['status']) => {
        if (status === 'in_review') return 'bg-sky-100 text-sky-700';
        if (status === 'approved') return 'bg-green-100 text-green-700';
        if (status === 'rejected') return 'bg-red-100 text-red-700';
        return 'bg-amber-100 text-amber-700';
    };
    const parentRejectReasonLabel = (code?: string) => {
        if (code === 'profile_incomplete') return 'Анкета заполнена не полностью';
        if (code === 'docs_missing') return 'Не хватает документов';
        if (code === 'budget_invalid') return 'Некорректный бюджет';
        if (code === 'contact_invalid') return 'Некорректные контактные данные';
        return 'Требуется доработка';
    };
    const formatRuDate = (ts?: number) => {
        if (!ts) return '—';
        return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const getLastAdminStatusTs = (req: ParentRequest) => {
        const e = [...(req.changeLog || [])].reverse().find((x) => x.type === 'status_changed' && x.by === 'admin');
        return e?.at || 0;
    };
    const hasNewModerationUpdate = (req: ParentRequest) => {
        const lastTs = getLastAdminStatusTs(req);
        const seenTs = Number(moderationSeenMap[req.id] || 0);
        return lastTs > 0 && lastTs > seenTs;
    };
    const markModerationAsSeen = () => {
        const next = { ...moderationSeenMap };
        myParentRequests.forEach((req) => {
            const ts = getLastAdminStatusTs(req);
            if (ts > 0) next[req.id] = ts;
        });
        setModerationSeenMap(next);
        try { localStorage.setItem('blizko_parent_moderation_seen', JSON.stringify(next)); } catch { /* ignore */ }
    };
    const handleResubmit = async (id: string) => {
        const updated = await resubmitParentRequest(id);
        if (updated) await notifyAdminResubmitted(updated);
        const requests = await getMyParentRequests(user);
        setMyParentRequests(requests);
    };

    const hasAnyNewModeration = myParentRequests.some((req) => hasNewModerationUpdate(req));

    return (
        <>
            <div className="animate-fade-in space-y-6 text-center">
                {/* Profile Header */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 relative">
                    <div className={`w-24 h-24 rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-white shadow-lg relative ${isNanny ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'} overflow-hidden`}>
                        {myNannyProfile?.photo ? (
                            <img src={myNannyProfile.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <UserIcon size={40} />
                        )}
                        {isNanny && myNannyProfile?.isVerified && (
                            <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white w-6 h-6 rounded-full flex items-center justify-center text-white" title="Verified">
                                <ShieldCheck size={12} />
                            </div>
                        )}
                    </div>

                    <h3 className="text-xl font-bold text-stone-800">{user.name || 'User'}</h3>
                    {user.id && (
                        <div className="mt-1 inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-2 py-1 rounded-md text-[11px] font-mono" title="User ID">
                            ID: {user.id}
                        </div>
                    )}

                    <div className="flex flex-col items-center gap-1.5 mt-2">
                        {user.phone && (
                            <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
                                <Phone size={12} /> {user.phone} <BadgeCheck size={12} fill="currentColor" className="text-green-500" />
                            </div>
                        )}
                        {user.email && (
                            <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 px-2 py-1 rounded-md text-xs font-medium">
                                <Mail size={12} /> {user.email} <BadgeCheck size={12} fill="currentColor" className="text-sky-500" />
                            </div>
                        )}
                    </div>

                    {/* Phone verification */}
                    <div className="mt-4 border-t border-stone-100 pt-4 text-left">
                        <div className="text-xs font-semibold text-stone-600 mb-2">Подтверждение телефона</div>
                        {phoneStep === 'verified' ? (
                            <Badge variant="trust">Телефон подтвержден</Badge>
                        ) : (
                            <div className="space-y-2">
                                <input type="tel" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} placeholder="+7 999 000-00-00" className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2" />
                                {phoneStep === 'code' && (
                                    <input type="text" value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Код из SMS" className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2" />
                                )}
                                {phoneVerifyError && <div className="text-[11px] text-red-500">{phoneVerifyError}</div>}
                                {phoneStep !== 'code' ? (
                                    <button onClick={sendPhoneCode} disabled={phoneVerifyLoading || !phoneInput.trim()} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50">
                                        {phoneVerifyLoading ? 'Отправка...' : 'Отправить код'}
                                    </button>
                                ) : (
                                    <button onClick={verifyPhoneCode} disabled={phoneVerifyLoading || phoneCode.length < 4} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50">
                                        {phoneVerifyLoading ? 'Проверка...' : 'Подтвердить код'}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {isNanny && (
                        <div className="flex justify-center gap-4 border-t border-stone-100 pt-4 mt-4">
                            <div className="text-center">
                                <div className="text-lg font-bold text-stone-800 flex items-center justify-center gap-1">
                                    {nannyAverageRating || '—'} {nannyAverageRating && <Star size={12} className="fill-amber-400 text-amber-400" />}
                                </div>
                                <div className="text-[10px] text-stone-400 uppercase">{text.statRating}</div>
                            </div>
                            <div className="w-px bg-stone-100" />
                            <div className="text-center">
                                <div className="text-lg font-bold text-stone-800">{nannyCompletedHours ?? '—'}</div>
                                <div className="text-[10px] text-stone-400 uppercase">{text.statHours}</div>
                            </div>
                            <div className="w-px bg-stone-100" />
                            <div className="text-center">
                                <div className="text-lg font-bold text-stone-800">{nannyReviewCount}</div>
                                <div className="text-[10px] text-stone-400 uppercase">{text.statReviews}</div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Nanny key data */}
                {isNanny && myNannyProfile && (
                    <Card className="!p-4 bg-white border border-stone-100 text-left">
                        <div className="text-xs font-semibold text-stone-500 uppercase mb-2">Ключевые данные</div>
                        <div className="space-y-1 text-sm text-stone-700">
                            <div>Город: {myNannyProfile.city || '—'}</div>
                            <div>Опыт: {myNannyProfile.experience || '—'} {myNannyProfile.experience ? 'лет' : ''}</div>
                            <div>График: {myNannyProfile.schedule || '—'}</div>
                            <div>Ставка: {myNannyProfile.expectedRate || '—'}</div>
                        </div>
                    </Card>
                )}

                {/* Progress — Goal-Gradient */}
                <div className="bg-white p-4 rounded-2xl border border-stone-100 text-left">
                    <ProgressBar
                        value={isNanny ? (nannyReadiness?.completionRatio || 0) : parentProfileProgress}
                        showPercent
                        label={lang === 'ru' ? 'Прогресс профиля' : 'Profile progress'}
                    />
                    <div className="mt-2 text-[11px] text-stone-500">
                        {isNanny
                            ? (nannyReadiness?.missingFields.length
                                ? `Не хватает: ${nannyReadiness.missingFields.join(', ')}.`
                                : 'Профиль заполнен и готов к следующему шагу проверки.')
                            : 'Добавьте документы и заполните ключевые поля, чтобы ускорить подбор.'}
                    </div>
                </div>

                {/* Nanny actions */}
                {isNanny && (
                    <>
                        <Button onClick={() => onEditProfile && onEditProfile(myNannyProfile)} className="bg-amber-100 text-amber-900 hover:bg-amber-200">
                            <Edit size={16} /> {myNannyProfile ? (lang === 'ru' ? 'Редактировать анкету' : 'Edit Profile') : (lang === 'ru' ? 'Заполнить анкету' : 'Fill Profile')}
                        </Button>
                        <Button onClick={() => setShowCalendar(true)} className="bg-sky-100 text-sky-800 hover:bg-sky-200">
                            <Calendar size={16} /> {lang === 'ru' ? 'Календарь занятости' : 'Availability Calendar'}
                        </Button>
                        <Card className={`!p-5 text-white flex justify-between items-center shadow-lg transition-colors ${!isRegistrationPaid ? 'bg-stone-800 shadow-stone-200' : 'bg-[#6C2586] shadow-purple-200'}`}>
                            <div className="text-left">
                                <p className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">
                                    {!isRegistrationPaid ? text.regFeeLabel : text.nannyWallet}
                                </p>
                                <p className="text-2xl font-bold">
                                    {!isRegistrationPaid ? '5 000 ₽' : `${earnedTotal.toLocaleString('ru-RU')} ₽`}
                                </p>
                            </div>
                            {!isRegistrationPaid ? (
                                <button onClick={() => handlePaymentClick('registration')} className="bg-white hover:bg-stone-200 text-stone-900 px-4 py-2 rounded-xl transition-all text-xs font-bold flex flex-col items-center gap-1">
                                    <Lock size={16} /> {text.payRegistration}
                                </button>
                            ) : (
                                <button onClick={() => handlePaymentClick('commission')} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all text-xs font-bold flex flex-col items-center gap-1 border border-white/30">
                                    <Wallet size={16} /> {text.payCommission}
                                </button>
                            )}
                        </Card>
                        {!isRegistrationPaid && (
                            <p className="text-xs text-stone-400 mt-[-1rem]">
                                {lang === 'ru' ? 'Для начала работы необходимо оплатить единоразовый взнос.' : 'To start working, you must pay a one-time fee.'}
                            </p>
                        )}
                    </>
                )}

                {/* Parent requests */}
                {!isNanny && (
                    <div className="text-left space-y-4">
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{text.myApplications}</h4>
                        {myParentRequests.length === 0 ? (
                            <Card className="!p-4 bg-white border border-stone-100">
                                <div className="text-sm text-stone-500">У вас пока нет заявок</div>
                                <div className="text-[11px] text-stone-400 mt-1">Создайте заявку, чтобы получить подбор и статус в кабинете.</div>
                            </Card>
                        ) : (
                            <div className="space-y-2">
                                {hasAnyNewModeration && (
                                    <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center justify-between gap-2">
                                        <div className="text-xs text-amber-700 font-medium">Есть новое решение модерации</div>
                                        <button onClick={markModerationAsSeen} className="text-[11px] px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200">Прочитано</button>
                                    </div>
                                )}
                                {myParentRequests.map((req) => {
                                    const lastAdminStatusEvent = [...(req.changeLog || [])].reverse().find((e) => e.type === 'status_changed' && e.by === 'admin');
                                    return (
                                        <Card key={req.id} className="!p-4 bg-white border border-stone-100 space-y-3">
                                            <div className="flex items-start gap-3">
                                                <div className="bg-stone-50 p-2.5 rounded-xl text-stone-400 shadow-sm flex-shrink-0"><Clock size={20} /></div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-semibold text-stone-700 flex items-center gap-2 flex-wrap">
                                                        <Badge variant={req.status === 'approved' ? 'trust' : req.status === 'rejected' ? 'status' : 'info'}>
                                                            {parentStatusLabel(req.status)}
                                                        </Badge>
                                                        {hasNewModerationUpdate(req) && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Новое</span>}
                                                    </div>
                                                    <div className="text-xs text-stone-400 mt-1">Создана: {formatRuDate(req.createdAt)} • заявка {req.id.slice(0, 4).toUpperCase()}</div>
                                                    <div className="text-[11px] text-stone-500">Статус: {parentStatusLabel(req.status)}</div>
                                                    {req.status === 'in_review' && <div className="mt-1 text-[11px] text-stone-500">{lang === 'ru' ? 'Обычно 24–48ч' : 'Typically 24–48h'}</div>}
                                                    {req.status === 'rejected' && (
                                                        <div className="mt-1 text-[11px] text-red-600">
                                                            Причина: {parentRejectReasonLabel(req.rejectionInfo?.reasonCode)}
                                                            {req.rejectionInfo?.reasonText ? ` — ${req.rejectionInfo.reasonText}` : ''}
                                                        </div>
                                                    )}
                                                    {lastAdminStatusEvent && <div className="mt-1 text-[11px] text-stone-500">Обновлено модерацией: {new Date(lastAdminStatusEvent.at).toLocaleString()}</div>}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => onEditParentRequest && onEditParentRequest(req)}
                                                    disabled={req.status === 'approved'}
                                                    title={req.status === 'approved' ? 'Одобренную заявку редактировать нельзя' : 'Редактировать заявку'}
                                                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${req.status === 'approved' ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                                                >
                                                    Редактировать
                                                </button>
                                                {req.status === 'rejected' && (
                                                    <button onClick={() => handleResubmit(req.id)} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200">
                                                        Отправить повторно
                                                    </button>
                                                )}
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Referral Widget */}
                <ReferralWidget userId={user.id || 'guest'} userName={user.name || 'Пользователь'} />

                <Button variant="outline" onClick={openSupportChat} className="w-full border-sky-100 text-sky-700 hover:bg-sky-50 hover:border-sky-200">
                    <LifeBuoy size={18} /> Связаться с поддержкой
                </Button>
                <Button variant="outline" onClick={onLogout} className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200">
                    <LogOut size={18} /> {text.logout}
                </Button>
            </div>

            {/* Calendar modal */}
            {showCalendar && (
                <div className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-stone-800">Календарь занятости няни</div>
                                <div className="text-xs text-stone-500">Отмечайте приоритетные окна и занятые слоты</div>
                            </div>
                            <button onClick={() => setShowCalendar(false)} className="p-2 rounded-full hover:bg-stone-100"><X size={16} /></button>
                        </div>
                        <div className="p-4 space-y-3">
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                                <div className="bg-stone-50 border border-stone-200 rounded-lg p-2">Подтверждение T‑24ч: ✅</div>
                                <div className="bg-stone-50 border border-stone-200 rounded-lg p-2">Подтверждение T‑3–4ч: ⏳</div>
                            </div>
                            <AvailabilityCalendar title="Сетка недели" subtitle="Клик — сменить статус (резерв → занято → свободно)" statusMap={calendarSlots} onToggle={toggleCalendarSlot} legend />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
