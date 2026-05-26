import React, { useState, useEffect } from 'react';
import { Button, ProgressBar, Badge } from '../UI';
import { AvailabilityCalendar, SlotStatus } from '../AvailabilityCalendar';
import {
  User as UserIcon,
  LogOut,
  Calendar,
  Star,
  ShieldCheck,
  Edit,
  Phone,
  Mail,
  BadgeCheck,
  LifeBuoy,
  X,
  Clock,
} from 'lucide-react';
import { Language, User, NannyProfile, ParentRequest } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { getMyNannyProfile, getMyParentRequests, resubmitParentRequest } from '@/services/storage';
import { notifyAdminResubmitted } from '@/services/notifications';
import { supabase } from '@/services/supabase';
import { getNannyReadinessSnapshot } from '@/services/nannyReadiness';
import { getItem, setItem } from '@/core/platform/storage';

interface ProfileTabProps {
  user: User;
  lang: Language;
  onLogout: () => void;
  onEditProfile?: (profile?: NannyProfile) => void;
  onEditParentRequest?: (request?: ParentRequest) => void;
}

const PARENT_MODERATION_SEEN_KEY = 'blizko_parent_moderation_seen';

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  lang,
  onLogout,
  onEditProfile,
  onEditParentRequest,
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

  // Nanny calendar
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarSlots, setCalendarSlots] = useState<Record<string, SlotStatus>>({});

  const nannyReadiness = myNannyProfile ? getNannyReadinessSnapshot(myNannyProfile) : null;
  const nannyReviewCount = myNannyProfile?.reviews?.length || 0;
  const nannyAverageRating =
    nannyReviewCount > 0
      ? (myNannyProfile!.reviews!.reduce((sum, r) => sum + r.rating, 0) / nannyReviewCount).toFixed(
          1,
        )
      : null;
  const nannyCompletedHours =
    Number(
      (
        myNannyProfile as
          | (NannyProfile & { bookingStats?: { completedHours?: number } })
          | undefined
      )?.bookingStats?.completedHours || 0,
    ) || null;
  const hasNannyStats =
    nannyAverageRating !== null || nannyCompletedHours !== null || nannyReviewCount > 0;

  const latestParentRequest = myParentRequests[0];
  const parentProfileProgress = latestParentRequest
    ? Math.round(
        (([
          latestParentRequest.city,
          latestParentRequest.childAge,
          latestParentRequest.schedule,
          latestParentRequest.budget,
          latestParentRequest.comment,
        ].filter(Boolean).length +
          (latestParentRequest.requirements?.length ? 1 : 0) +
          (latestParentRequest.documents?.length ? 1 : 0)) /
          7) *
          100,
      )
    : 0;

  useEffect(() => {
    const load = async () => {
      if (isNanny) {
        setMyNannyProfile(await getMyNannyProfile(user));
      } else {
        setMyParentRequests(await getMyParentRequests(user));
      }
    };
    void load();
    try {
      const raw = getItem(PARENT_MODERATION_SEEN_KEY);
      if (raw) setModerationSeenMap(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, [isNanny, user]);

  useEffect(() => {
    const loadPhoneMeta = async () => {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      const phoneVerified = Boolean(data.user?.user_metadata?.phone_verified);
      const phoneE164 = String(
        data.user?.user_metadata?.phone_e164 || data.user?.phone || user.phone || '',
      );
      if (phoneE164) setPhoneInput(phoneE164);
      if (phoneVerified) setPhoneStep('verified');
    };
    void loadPhoneMeta();
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
    } catch (e: unknown) {
      setPhoneVerifyError(e instanceof Error ? e.message : String(e));
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
    } catch (e: unknown) {
      setPhoneVerifyError(e instanceof Error ? e.message : String(e));
    } finally {
      setPhoneVerifyLoading(false);
    }
  };

  const toggleCalendarSlot = (dayIndex: number, slotIndex: number) => {
    const key = `${dayIndex}-${slotIndex}`;
    setCalendarSlots((prev) => {
      const current = prev[key] || 'available';
      const next: SlotStatus =
        current === 'busy' ? 'available' : current === 'reserved' ? 'busy' : 'reserved';
      return { ...prev, [key]: next };
    });
  };

  const openSupportChat = () => {
    window.dispatchEvent(new CustomEvent('blizko:open-support-chat'));
  };

  const parentStatusLabel = (status?: ParentRequest['status']) => {
    if (status === 'payment_pending') return 'Ожидает оплаты';
    if (status === 'in_review') return 'На проверке';
    if (status === 'approved') return 'Одобрена';
    if (status === 'rejected') return 'Отклонена';
    return 'Новая';
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
    return new Date(ts).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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
      setItem(PARENT_MODERATION_SEEN_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const handleResubmit = async (id: string) => {
    const updated = await resubmitParentRequest(id);
    if (updated && updated.sync !== 'error') await notifyAdminResubmitted(updated.item);
    setMyParentRequests(await getMyParentRequests(user));
  };

  const hasAnyNewModeration = myParentRequests.some((req) => hasNewModerationUpdate(req));

  return (
    <>
      <div className="animate-fade-in space-y-4 text-center">
        {/* Profile header */}
        <div className="section-shell rounded-[1.5rem] p-5">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-3 border-4 border-white shadow-md relative ${isNanny ? 'bg-amber-100 text-amber-600' : 'bg-sky-100 text-sky-600'} overflow-hidden`}
          >
            {myNannyProfile?.photo ? (
              <img
                src={myNannyProfile.photo}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon size={36} />
            )}
            {isNanny && myNannyProfile?.isVerified && (
              <div className="absolute bottom-0 right-0 bg-green-500 border-2 border-white w-5 h-5 rounded-full flex items-center justify-center text-white">
                <ShieldCheck size={10} />
              </div>
            )}
          </div>

          <h3 className="text-lg font-bold text-stone-800">{user.name || 'Профиль'}</h3>

          <div className="flex flex-col items-center gap-1.5 mt-2">
            {user.phone && (
              <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-medium">
                <Phone size={11} /> {user.phone}{' '}
                <BadgeCheck size={11} fill="currentColor" className="text-green-500" />
              </div>
            )}
            {user.email && (
              <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-700 px-2 py-1 rounded-lg text-xs font-medium">
                <Mail size={11} /> {user.email}
              </div>
            )}
          </div>

          {/* Nanny stats — only when there's real data */}
          {isNanny && hasNannyStats && (
            <div className="flex justify-center gap-5 border-t border-stone-100 pt-4 mt-4">
              {nannyAverageRating && (
                <div className="text-center">
                  <div className="text-base font-bold text-stone-800 flex items-center justify-center gap-1">
                    {nannyAverageRating}{' '}
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-stone-400 uppercase">{text.statRating}</div>
                </div>
              )}
              {nannyCompletedHours !== null && (
                <>
                  {nannyAverageRating && <div className="w-px bg-stone-100" />}
                  <div className="text-center">
                    <div className="text-base font-bold text-stone-800">{nannyCompletedHours}</div>
                    <div className="text-[10px] text-stone-400 uppercase">{text.statHours}</div>
                  </div>
                </>
              )}
              {nannyReviewCount > 0 && (
                <>
                  <div className="w-px bg-stone-100" />
                  <div className="text-center">
                    <div className="text-base font-bold text-stone-800">{nannyReviewCount}</div>
                    <div className="text-[10px] text-stone-400 uppercase">{text.statReviews}</div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Nanny key data */}
        {isNanny && myNannyProfile && (
          <div className="section-shell rounded-[1.5rem] p-4 text-left">
            <div className="eyebrow mb-2">Ключевые данные</div>
            <div className="space-y-1 text-sm text-stone-700">
              <div>Город: {myNannyProfile.city || '—'}</div>
              <div>
                Опыт: {myNannyProfile.experience ? `${myNannyProfile.experience} лет` : '—'}
              </div>
              <div>График: {myNannyProfile.schedule || '—'}</div>
              <div>Ставка: {myNannyProfile.expectedRate || '—'}</div>
            </div>
          </div>
        )}

        {/* Profile progress */}
        <div className="section-shell rounded-[1.5rem] p-4 text-left">
          <ProgressBar
            value={isNanny ? nannyReadiness?.completionRatio || 0 : parentProfileProgress}
            showPercent
            label={lang === 'ru' ? 'Готовность профиля' : 'Profile progress'}
          />
          <div className="mt-2 text-[11px] text-stone-500">
            {isNanny
              ? nannyReadiness?.missingFields.length
                ? `Не хватает: ${nannyReadiness.missingFields.join(', ')}.`
                : 'Профиль заполнен и готов к следующему шагу проверки.'
              : 'Заполните ключевые поля — это ускорит подбор.'}
          </div>
        </div>

        {/* Phone verification */}
        {phoneStep !== 'verified' && (
          <div className="section-shell rounded-[1.5rem] p-4 text-left">
            <div className="eyebrow mb-3">Подтверждение телефона</div>
            <div className="space-y-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+7 999 000-00-00"
                className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-stone-400"
              />
              {phoneStep === 'code' && (
                <input
                  type="text"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Код из SMS"
                  className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 outline-none focus:border-stone-400"
                />
              )}
              {phoneVerifyError && (
                <div className="text-[11px] text-red-500">{phoneVerifyError}</div>
              )}
              {phoneStep !== 'code' ? (
                <button
                  onClick={() => void sendPhoneCode()}
                  disabled={phoneVerifyLoading || !phoneInput.trim()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-50"
                >
                  {phoneVerifyLoading ? 'Отправка...' : 'Отправить код'}
                </button>
              ) : (
                <button
                  onClick={() => void verifyPhoneCode()}
                  disabled={phoneVerifyLoading || phoneCode.length < 4}
                  className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {phoneVerifyLoading ? 'Проверка...' : 'Подтвердить код'}
                </button>
              )}
            </div>
          </div>
        )}
        {phoneStep === 'verified' && (
          <div className="flex items-center justify-center">
            <Badge variant="trust">Телефон подтверждён</Badge>
          </div>
        )}

        {/* Nanny actions */}
        {isNanny && (
          <div className="flex flex-col gap-3">
            <Button onClick={() => onEditProfile && onEditProfile(myNannyProfile)}>
              <Edit size={16} />{' '}
              {myNannyProfile
                ? lang === 'ru'
                  ? 'Редактировать анкету'
                  : 'Edit Profile'
                : lang === 'ru'
                  ? 'Заполнить анкету'
                  : 'Fill Profile'}
            </Button>
            <Button variant="secondary" onClick={() => setShowCalendar(true)}>
              <Calendar size={16} />{' '}
              {lang === 'ru' ? 'Календарь занятости' : 'Availability Calendar'}
            </Button>
          </div>
        )}

        {/* Parent requests */}
        {!isNanny && (
          <div className="text-left space-y-3">
            <div className="eyebrow">{text.myApplications}</div>
            {myParentRequests.length === 0 ? (
              <div className="section-shell rounded-[1.5rem] p-4">
                <div className="text-sm text-stone-500">У вас пока нет заявок</div>
                <div className="text-[11px] text-stone-400 mt-1">
                  Создайте заявку, чтобы начать подбор.
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {hasAnyNewModeration && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center justify-between gap-2">
                    <div className="text-xs text-amber-700 font-medium">
                      Есть новое решение модерации
                    </div>
                    <button
                      onClick={markModerationAsSeen}
                      className="text-[11px] px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                    >
                      Прочитано
                    </button>
                  </div>
                )}
                {myParentRequests.map((req) => {
                  const lastAdminEvent = [...(req.changeLog || [])]
                    .reverse()
                    .find((e) => e.type === 'status_changed' && e.by === 'admin');
                  return (
                    <div key={req.id} className="section-shell rounded-[1.5rem] p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-stone-100 p-2 rounded-xl text-stone-400 shrink-0">
                          <Clock size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant={
                                req.status === 'approved'
                                  ? 'trust'
                                  : req.status === 'rejected'
                                    ? 'status'
                                    : 'info'
                              }
                            >
                              {parentStatusLabel(req.status)}
                            </Badge>
                            {hasNewModerationUpdate(req) && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                                Новое
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-stone-400 mt-1">
                            {formatRuDate(req.createdAt)} · #{req.id.slice(0, 4).toUpperCase()}
                          </div>
                          {req.status === 'in_review' && (
                            <div className="mt-1 text-[11px] text-stone-500">Обычно 24–48 ч</div>
                          )}
                          {req.status === 'rejected' && (
                            <div className="mt-1 text-[11px] text-red-600">
                              Причина: {parentRejectReasonLabel(req.rejectionInfo?.reasonCode)}
                              {req.rejectionInfo?.reasonText
                                ? ` — ${req.rejectionInfo.reasonText}`
                                : ''}
                            </div>
                          )}
                          {lastAdminEvent && (
                            <div className="mt-1 text-[11px] text-stone-400">
                              Обновлено: {new Date(lastAdminEvent.at).toLocaleString('ru-RU')}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => onEditParentRequest && onEditParentRequest(req)}
                          disabled={req.status === 'approved'}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${req.status === 'approved' ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
                        >
                          Редактировать
                        </button>
                        {req.status === 'rejected' && (
                          <button
                            onClick={() => void handleResubmit(req.id)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200"
                          >
                            Отправить повторно
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Support + logout */}
        <div className="flex flex-col gap-3 pt-1">
          <Button variant="outline" onClick={openSupportChat} className="w-full">
            <LifeBuoy size={16} /> Связаться с поддержкой
          </Button>
          <Button
            variant="outline"
            onClick={onLogout}
            className="w-full text-red-500 border-red-100 hover:bg-red-50 hover:border-red-200"
          >
            <LogOut size={16} /> {text.logout}
          </Button>
        </div>
      </div>

      {/* Calendar modal */}
      {showCalendar && (
        <div className="fixed inset-0 z-60 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-stone-800">Календарь занятости</div>
                <div className="text-xs text-stone-500">
                  Отмечайте приоритетные окна и занятые слоты
                </div>
              </div>
              <button
                onClick={() => setShowCalendar(false)}
                className="p-2 rounded-full hover:bg-stone-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4">
              <AvailabilityCalendar
                title="Сетка недели"
                subtitle="Клик — сменить статус"
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
