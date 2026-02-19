import React, { useState, useEffect } from 'react';
import { Button, Card } from './UI';
import { AvailabilityCalendar, SlotStatus } from './AvailabilityCalendar';
import { X, User as UserIcon, LogOut, Clock, Calendar, MessageSquare, CheckCircle, Wallet, Star, ShieldCheck, MapPin, Briefcase, MessageCircle, Edit, Lock, Phone, Mail, BadgeCheck, LifeBuoy } from 'lucide-react';
import { Language, User, Booking, Review, NannyProfile, ParentRequest } from '../types';
import { t } from '../src/core/i18n/translations';
import { NannyChatModal } from './NannyChatModal';
import { PaymentModal } from './PaymentModal';
import { LeaveReviewModal } from './LeaveReviewModal';
import { getNannyProfiles, getParentRequests, addReview, resubmitParentRequest } from '../services/storage';
import { notifyAdminResubmitted } from '../services/notifications';
import { supabase } from '../services/supabase';

interface UserProfileModalProps {
  user: User;
  onClose: () => void;
  onLogout: () => void;
  lang: Language;
  onEditProfile?: (profile?: NannyProfile) => void;
  onEditParentRequest?: (request?: ParentRequest) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose, onLogout, lang, onEditProfile, onEditParentRequest }) => {
  const text = t[lang];
  const isNanny = user.role === 'nanny';
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'reviews'>('profile');
  const [chatBooking, setChatBooking] = useState<Booking | null>(null);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  
  // Payment State
  const [showPayment, setShowPayment] = useState(false);
  const [isRegistrationPaid, setIsRegistrationPaid] = useState(false);
  const [paymentType, setPaymentType] = useState<'registration' | 'commission'>('registration');
  const [paymentAmount, setPaymentAmount] = useState(''); 
  
  // Data States
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myNannyProfile, setMyNannyProfile] = useState<NannyProfile | undefined>(undefined);
  const [myParentRequests, setMyParentRequests] = useState<ParentRequest[]>([]);
  const [moderationSeenMap, setModerationSeenMap] = useState<Record<string, number>>({});
  const [phoneInput, setPhoneInput] = useState(user.phone || '');
  const [phoneCode, setPhoneCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<'idle' | 'code' | 'verified'>('idle');
  const [phoneVerifyLoading, setPhoneVerifyLoading] = useState(false);
  const [phoneVerifyError, setPhoneVerifyError] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarSlots, setCalendarSlots] = useState<Record<string, SlotStatus>>({
    '0-1': 'reserved',
    '1-2': 'available',
    '2-3': 'busy',
    '3-4': 'available',
    '4-2': 'reserved',
  });
  
  // Mock Earnings
  const earnedTotal = 12500;
  const commissionRate = 0.2; 
  const commissionDue = earnedTotal * commissionRate; 

  useEffect(() => {
    const load = async () => {
      if (isNanny) {
        const storedNannies = await getNannyProfiles();
        const myProfile = storedNannies.find(n => n.name === user.name) || storedNannies[0];
        setMyNannyProfile(myProfile);

        if (myProfile && myProfile.reviews) {
          setReviews(myProfile.reviews);
        } else {
          setReviews([]);
        }
      } else {
        const requests = await getParentRequests();
        setMyParentRequests(requests);
      }
    };
    load();

    try {
      const raw = localStorage.getItem('blizko_parent_moderation_seen');
      if (raw) setModerationSeenMap(JSON.parse(raw));
    } catch {
      // ignore
    }
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
      const r = await fetch('/api/auth/send-otp-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Не удалось отправить код');
      setPhoneStep('code');
      if (data?.demoCode) {
        setPhoneVerifyError(`Тестовый код: ${data.demoCode}`);
      }
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
      const r = await fetch('/api/auth/verify-otp-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput, code: phoneCode }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Неверный код');

      if (supabase) {
        await supabase.auth.updateUser({
          data: {
            phone_verified: true,
            phone_e164: data.phone || phoneInput,
          },
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

  // --- MOCK DATA for Demo ---
  const nannyRequests = [
    {
      id: 'order-1',
      parentName: lang === 'ru' ? 'Семья Смирновых' : 'The Smith Family',
      location: lang === 'ru' ? 'Хамовники' : 'Soho',
      details: lang === 'ru' ? '2 детей (3г, 5л)' : '2 kids (3y, 5y)',
      schedule: lang === 'ru' ? 'Пн, Ср, Пт 10:00 - 14:00' : 'Mon, Wed, Fri 10am - 2pm',
      rate: lang === 'ru' ? '800 ₽/час' : '$25/hr'
    },
    {
      id: 'r2',
      parentName: lang === 'ru' ? 'Ольга В.' : 'Olga V.',
      location: lang === 'ru' ? 'Арбат' : 'Chelsea',
      details: lang === 'ru' ? 'Грудничок (6 мес)' : 'Infant (6mo)',
      schedule: lang === 'ru' ? 'Разово, 12 Окт' : 'One-time, Oct 12',
      rate: lang === 'ru' ? '1000 ₽/час' : '$30/hr'
    }
  ];

  const [activeBooking, setActiveBooking] = useState<Booking | null>({
    id: 'order-1',
    nannyName: lang === 'ru' ? 'Мария И.' : 'Maria I.',
    date: lang === 'ru' ? 'Сегодня, 14:00 - 18:00' : 'Today, 2:00 PM - 6:00 PM',
    status: 'active',
    amount: '2 400 ₽',
    avatarColor: 'bg-emerald-100 text-emerald-700',
    isPaid: false 
  });

  const [historyBookings, setHistoryBookings] = useState<Booking[]>([
    {
      id: 'b2',
      nannyName: lang === 'ru' ? 'Елена С.' : 'Elena S.',
      date: '10 Oct, 10:00 - 14:00',
      status: 'completed',
      amount: '1 500 ₽',
      avatarColor: 'bg-purple-100 text-purple-700',
      isPaid: true,
      hasReview: false
    },
    {
      id: 'b3',
      nannyName: lang === 'ru' ? 'Анна К.' : 'Anna K.',
      date: '01 Oct, 18:00 - 22:00',
      status: 'completed',
      amount: '2 000 ₽',
      avatarColor: 'bg-amber-100 text-amber-700',
      isPaid: true,
      hasReview: true
    }
  ]);

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

  const handlePaymentClick = (type: 'registration' | 'commission') => {
    setPaymentType(type);
    setPaymentAmount(type === 'registration' ? '5 000 ₽' : `${commissionDue.toLocaleString('ru-RU')} ₽`);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    if (paymentType === 'registration') {
      setIsRegistrationPaid(true);
    }
    setShowPayment(false);
  };

  const handleReviewSubmit = async (review: Review) => {
    setHistoryBookings(prev => prev.map(b => b.id === review.bookingId ? { ...b, hasReview: true } : b));
    await addReview(review);
    setReviewBookingId(null);
  };

  const handleResubmit = async (id: string) => {
    const updated = await resubmitParentRequest(id);
    if (updated) await notifyAdminResubmitted(updated);
    const requests = await getParentRequests();
    setMyParentRequests(requests);
  };

  const getLastAdminStatusTs = (req: ParentRequest) => {
    const e = [...(req.changeLog || [])]
      .reverse()
      .find((x) => x.type === 'status_changed' && x.by === 'admin');
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
    try {
      localStorage.setItem('blizko_parent_moderation_seen', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const hasAnyNewModeration = myParentRequests.some((req) => hasNewModerationUpdate(req));

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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative flex flex-col max-h-[90vh]">
          
          {/* Header with Tabs */}
          <div className="pt-6 pb-2 px-6 bg-white/95 border-b border-stone-100 sticky top-0 z-10 backdrop-blur">
             <div className="flex justify-between items-start mb-4">
                <div>
                   <h3 className="text-xl font-bold text-stone-800">
                     {isNanny ? text.nannyDashTitle : text.profileTitle}
                   </h3>
                   {isNanny && (
                     <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider mt-1">
                       <Briefcase size={10} /> Nanny
                     </span>
                   )}
                </div>
                <button 
                  onClick={onClose} 
                  className="text-stone-400 hover:text-stone-800 transition-colors bg-stone-100 p-1 rounded-full"
                >
                  <X size={18} />
                </button>
             </div>
             
             <div className="flex bg-stone-100 p-1 rounded-xl">
               <button 
                 onClick={() => setActiveTab('profile')}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                   activeTab === 'profile' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                 }`}
               >
                 {text.tabProfile}
               </button>
               <button 
                 onClick={() => setActiveTab('bookings')}
                 className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                   activeTab === 'bookings' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                 }`}
               >
                 {isNanny ? text.tabRequests : text.tabBookings}
               </button>
               {isNanny && (
                 <button 
                   onClick={() => setActiveTab('reviews')}
                   className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                     activeTab === 'reviews' ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                   }`}
                 >
                   {text.tabReviews}
                 </button>
               )}
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-[#FAFAFA]">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
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
                  
                  {/* Verified Contact Info */}
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
                      <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1.5 rounded-md text-xs font-medium">
                        <BadgeCheck size={12} fill="currentColor" className="text-green-500" /> Телефон подтвержден
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+7 999 000-00-00"
                          className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2"
                        />

                        {phoneStep === 'code' && (
                          <input
                            type="text"
                            value={phoneCode}
                            onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Код из SMS"
                            className="w-full text-sm bg-stone-50 border border-stone-200 rounded-lg px-3 py-2"
                          />
                        )}

                        {phoneVerifyError && <div className="text-[11px] text-red-500">{phoneVerifyError}</div>}

                        {phoneStep !== 'code' ? (
                          <button
                            onClick={sendPhoneCode}
                            disabled={phoneVerifyLoading || !phoneInput.trim()}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50"
                          >
                            {phoneVerifyLoading ? 'Отправка...' : 'Отправить код'}
                          </button>
                        ) : (
                          <button
                            onClick={verifyPhoneCode}
                            disabled={phoneVerifyLoading || phoneCode.length < 4}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
                          >
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
                          4.9 <Star size={12} className="fill-amber-400 text-amber-400" />
                        </div>
                        <div className="text-[10px] text-stone-400 uppercase">{text.statRating}</div>
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-stone-800">124</div>
                        <div className="text-[10px] text-stone-400 uppercase">{text.statHours}</div>
                      </div>
                      <div className="w-px bg-stone-100" />
                      <div className="text-center">
                        <div className="text-lg font-bold text-stone-800">15</div>
                        <div className="text-[10px] text-stone-400 uppercase">{text.statReviews}</div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress */}
                <div className="bg-white p-4 rounded-2xl border border-stone-100 text-left">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-stone-600">Прогресс профиля</div>
                    <div className="text-xs font-bold text-stone-700">{isNanny ? '65%' : '55%'}</div>
                  </div>
                  <div className="h-2 rounded-full bg-stone-100 overflow-hidden">
                    <div className={`h-full rounded-full ${isNanny ? 'bg-amber-400' : 'bg-sky-400'}`} style={{ width: isNanny ? '65%' : '55%' }} />
                  </div>
                  <div className="mt-2 text-[11px] text-stone-500">
                    {isNanny ? 'Добавьте документы и подтвердите телефон, чтобы поднять доверие.' : 'Добавьте документы и подтвердите телефон для быстрого подбора.'}
                  </div>
                </div>

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
                        <button 
                           onClick={() => handlePaymentClick('registration')}
                           className="bg-white hover:bg-stone-200 text-stone-900 px-4 py-2 rounded-xl transition-all text-xs font-bold flex flex-col items-center gap-1"
                        >
                          <Lock size={16} />
                          {text.payRegistration}
                        </button>
                      ) : (
                        <button 
                           onClick={() => handlePaymentClick('commission')}
                           className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all text-xs font-bold flex flex-col items-center gap-1 border border-white/30"
                        >
                          <Wallet size={16} />
                          {text.payCommission}
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

                {/* Parent Profile Content */}
                {!isNanny && (
                  <div className="text-left space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest">{text.myApplications}</h4>

                    {myParentRequests.length === 0 ? (
                      <Card className="!p-4 bg-white border border-stone-100">
                        <div className="text-sm text-stone-500">
                          У вас пока нет заявок
                        </div>
                        <div className="text-[11px] text-stone-400 mt-1">
                          Создайте заявку, чтобы получить подбор и статус в кабинете.
                        </div>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {hasAnyNewModeration && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-center justify-between gap-2">
                            <div className="text-xs text-amber-700 font-medium">Есть новое решение модерации</div>
                            <button
                              onClick={markModerationAsSeen}
                              className="text-[11px] px-2 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200"
                            >
                              Прочитано
                            </button>
                          </div>
                        )}
                        {myParentRequests.map((req) => {
                          const lastAdminStatusEvent = [...(req.changeLog || [])]
                            .reverse()
                            .find((e) => e.type === 'status_changed' && e.by === 'admin');

                          return (
                          <Card key={req.id} className="!p-4 bg-white border border-stone-100 flex items-center gap-3 justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-stone-50 p-2.5 rounded-xl text-stone-400 shadow-sm">
                                <Clock size={20} />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-stone-700 flex items-center gap-2">
                                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${parentStatusClass(req.status)}`}>
                                    {parentStatusLabel(req.status)}
                                  </span>
                                  {hasNewModerationUpdate(req) && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Новое</span>
                                  )}
                                </div>
                                <div className="text-xs text-stone-400">
                                  Создана: {formatRuDate(req.createdAt)} • заявка {req.id.slice(0, 4).toUpperCase()}
                                </div>
                                <div className="text-[11px] text-stone-500">Статус: {parentStatusLabel(req.status)}</div>
                                {req.status === 'in_review' && (
                                  <div className="mt-1 text-[11px] text-stone-500 max-w-[220px]">
                                    {lang === 'ru' ? 'Обычно 24–48ч' : 'Typically 24–48h'}
                                  </div>
                                )}

                                {req.status === 'rejected' && (
                                  <div className="mt-1 text-[11px] text-red-600 max-w-[220px]">
                                    Причина: {parentRejectReasonLabel(req.rejectionInfo?.reasonCode)}
                                    {req.rejectionInfo?.reasonText ? ` — ${req.rejectionInfo.reasonText}` : ''}
                                  </div>
                                )}

                                {lastAdminStatusEvent && (
                                  <div className="mt-1 text-[11px] text-stone-500 max-w-[220px]">
                                    Обновлено модерацией: {new Date(lastAdminStatusEvent.at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <button
                                onClick={() => onEditParentRequest && onEditParentRequest(req)}
                                disabled={req.status === 'approved'}
                                title={req.status === 'approved' ? 'Одобренную заявку редактировать нельзя' : 'Редактировать заявку'}
                                className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${
                                  req.status === 'approved'
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                                    : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                                }`}
                              >
                                Редактировать
                              </button>

                              {req.status === 'rejected' && (
                                <button
                                  onClick={() => handleResubmit(req.id)}
                                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                                >
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

                <Button variant="outline" onClick={openSupportChat} className="w-full border-sky-100 text-sky-700 hover:bg-sky-50 hover:border-sky-200">
                  <LifeBuoy size={18} /> Связаться с поддержкой
                </Button>

                <Button variant="outline" onClick={onLogout} className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200">
                  <LogOut size={18} /> {text.logout}
                </Button>
              </div>
            )}

            {/* BOOKINGS / REQUESTS TAB */}
            {activeTab === 'bookings' && (
              <div className="animate-fade-in space-y-6">
                
                {/* NANNY: REQUESTS */}
                {isNanny ? (
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"/>
                       {text.nannyRequests}
                    </h4>
                    {nannyRequests.map(req => (
                      <Card key={req.id} className="!p-5 border-stone-200">
                         <div className="flex justify-between items-start mb-2">
                           <div>
                             <h4 className="font-bold text-stone-800">{req.parentName}</h4>
                             <div className="flex items-center gap-1 text-xs text-stone-500 mt-1">
                               <MapPin size={10} /> {req.location}
                             </div>
                           </div>
                           <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-lg">
                             {req.rate}
                           </span>
                         </div>
                         
                         <div className="space-y-2 mb-4 mt-3">
                           <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center">
                             <span className="text-stone-400"><Briefcase size={14}/></span> {req.details}
                           </div>
                           <div className="text-sm text-stone-600 bg-stone-50 p-2 rounded-lg flex gap-2 items-center">
                             <span className="text-stone-400"><Calendar size={14}/></span> {req.schedule}
                           </div>
                         </div>

                         <div className="grid grid-cols-1 gap-2">
                           <Button 
                             onClick={() => setChatBooking({ id: req.id, nannyName: req.parentName, date: req.schedule, status: 'active', amount: req.rate })}
                             className="py-2 text-sm w-full bg-stone-800 text-white hover:bg-stone-700"
                           >
                             <MessageSquare size={14} /> Чат по заказу
                           </Button>
                           <div className="flex gap-2">
                             <Button className="py-2 text-sm flex-1 bg-stone-800 text-white hover:bg-stone-700">
                               {text.accept}
                             </Button>
                             <Button variant="outline" className="py-2 text-sm flex-1">
                               {text.decline}
                             </Button>
                           </div>
                           <div className="text-[11px] text-stone-500 bg-stone-50 border border-stone-100 rounded-lg p-2">
                             После принятия: чат с семьёй и подтверждения T‑24ч / T‑3ч.
                           </div>
                         </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  // PARENT: BOOKINGS
                  <>
                    {/* Active Booking Section */}
                    {activeBooking && (
                      <div>
                        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"/>
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
                                   <div className="text-xs text-amber-600 font-medium bg-amber-100 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                     {text.statusActive}
                                   </div>
                                 </div>
                               </div>
                               <div className="text-right">
                                 <div className="text-sm font-semibold text-stone-700">{activeBooking.amount}</div>
                               </div>
                             </div>
                             
                             <div className="flex items-center gap-2 text-sm text-stone-600 bg-white/60 p-2 rounded-lg mb-2">
                                <Calendar size={16} className="text-stone-400" />
                                {activeBooking.date}
                             </div>
                             <div className="text-[11px] text-stone-500 mb-3">Статус: активен • Следующее подтверждение: T‑3ч</div>

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
                               <Button 
                                 onClick={() => setChatBooking(activeBooking)} 
                                 className="py-3 text-sm bg-stone-800 text-white hover:bg-stone-700"
                               >
                                 <MessageSquare size={16} /> <span className="hidden xs:inline">{text.chatWithNanny}</span>
                               </Button>
                             </div>
                          </div>
                        </Card>
                      </div>
                    )}

                    {/* History Section */}
                    <div>
                      <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                        {text.historyTitle}
                      </h4>
                      <div className="space-y-3">
                        {historyBookings.map(booking => (
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
                                 <div className="text-xs font-bold text-stone-600 bg-stone-100 px-2 py-1 rounded-full mb-1">
                                   {text.statusCompleted}
                                 </div>
                                 <div className="text-[10px] text-stone-400">{booking.amount}</div>
                               </div>
                            </div>
                            
                            {!booking.hasReview && (
                              <button 
                                onClick={() => setReviewBookingId(booking.id)}
                                className="mt-2 w-full py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                              >
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
            )}
            
            {/* REVIEWS TAB (NANNY ONLY) */}
            {activeTab === 'reviews' && isNanny && (
              <div className="animate-fade-in space-y-4">
                 {reviews.length === 0 ? (
                   <div className="text-center py-12 text-stone-400">
                     <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                     <p>{text.noReviews}</p>
                     <p className="text-[11px] text-stone-400 mt-2">Первые отзывы увеличивают доверие и конверсию.</p>
                   </div>
                 ) : (
                   reviews.map(review => (
                     <Card key={review.id} className="!p-4 border-stone-100 bg-white">
                       <div className="flex justify-between items-start mb-2">
                         <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-sky-100 text-sky-700 rounded-full flex items-center justify-center font-bold text-xs">
                             {review.authorName.charAt(0)}
                           </div>
                           <div>
                             <div className="text-sm font-bold text-stone-800">{review.authorName}</div>
                             <div className="text-[10px] text-stone-400">{new Date(review.date).toLocaleDateString()}</div>
                           </div>
                         </div>
                         <div className="flex gap-0.5">
                           {[1,2,3,4,5].map(star => (
                             <Star 
                               key={star} 
                               size={12} 
                               className={`${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-200'} transition-colors`} 
                             />
                           ))}
                         </div>
                       </div>
                       <p className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-3 rounded-lg">
                         "{review.text}"
                       </p>
                     </Card>
                   ))
                 )}
              </div>
            )}

          </div>
        </div>
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

      {showPayment && (
        <PaymentModal 
          amount={paymentAmount}
          title={paymentType === 'registration' ? text.payRegistration : text.payCommission}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
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


      {showCalendar && (
        <div className="fixed inset-0 z-[60] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-stone-800">Календарь занятости няни</div>
                <div className="text-xs text-stone-500">Отмечайте приоритетные окна и занятые слоты</div>
              </div>
              <button onClick={() => setShowCalendar(false)} className="p-2 rounded-full hover:bg-stone-100">
                <X size={16} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-2">Подтверждение T‑24ч: ✅</div>
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-2">Подтверждение T‑3–4ч: ⏳</div>
              </div>
              <AvailabilityCalendar
                title="Сетка недели"
                subtitle="Клик — сменить статус (резерв → занято → свободно)"
                statusMap={calendarSlots}
                onToggle={toggleCalendarSlot}
                legend
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};