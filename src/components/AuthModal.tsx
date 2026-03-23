import React, { useState, useEffect } from 'react';
import { Button, Input } from './UI';
import { X, Baby, Briefcase, Phone, Mail, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { Language, User } from '../types';
import { t } from '@/core/i18n/translations';
import { supabase } from '@/services/supabase';
import { getTmaHeaders } from '@/core/auth/tma-validate';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: User) => void;
  lang: Language;
}

const normalizePhone = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('+')) return `+${trimmed.replace(/[^\d]/g, '')}`;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
};

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, lang }) => {
  const text = t[lang];

  const mapAuthError = (err: any) => {
    const raw = String(err?.message || err || '');
    const lower = raw.toLowerCase();

    if (lang !== 'ru') return raw;

    if (lower.includes('email rate limit exceeded')) {
      return 'Слишком много запросов на отправку письма. Подождите 5–15 минут и попробуйте снова.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'Неверные данные для входа.';
    }
    if (lower.includes('supabase client is not configured') || lower.includes('supabase не настроен')) {
      return 'Сервис авторизации временно не настроен. Попробуйте позже.';
    }
    if (lower.includes('invalid') && lower.includes('otp')) {
      return 'Неверный код подтверждения.';
    }
    if (lower.includes('expired')) {
      return 'Срок действия ссылки или кода истёк. Запросите новый.';
    }
    if (lower.includes('empty prompt') || lower.includes('missing')) {
      return 'Упс, кажется, вы ввели не все цифры.';
    }

    return 'Не удалось выполнить вход. Давайте попробуем ещё раз.';
  };

  // Steps: 'method' -> 'otp' -> 'email_wait' -> 'success'
  const [step, setStep] = useState<'method' | 'otp' | 'email_wait' | 'success'>('method');
  const phoneAuthEnabled = String(import.meta.env.VITE_ENABLE_PHONE_AUTH || 'true') === 'true';
  const [method, setMethod] = useState<'phone' | 'email'>(phoneAuthEnabled ? 'phone' : 'email');
  const [role, setRole] = useState<'parent' | 'nanny'>('parent');

  // Inputs
  const [contactValue, setContactValue] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');

  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState('');

  // Timer for resend code
  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      interval = window.setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user;
      if (!u) return;
      const nextUser: User = {
        id: u.id,
        role,
        name: name || u.user_metadata?.name || (lang === 'ru' ? 'Пользователь' : 'User'),
        phone: u.phone || undefined,
        email: u.email || undefined,
      };
      onLogin(nextUser);
      setStep('success');
      setTimeout(() => onClose(), 600);
    });
    return () => sub.subscription.unsubscribe();
  }, [role, name, lang, onLogin, onClose]);

  const sendOtp = async () => {
    if (method === 'phone') {
      if (!contactValue.trim()) {
        throw new Error(lang === 'ru' ? 'Введите номер телефона' : 'Enter phone number');
      }
      const r = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getTmaHeaders() },
        body: JSON.stringify({ action: 'send', phone: contactValue }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Не удалось отправить код');
      if (data?.demoCode) {
        setError(`Тестовый код: ${data.demoCode}`);
      }
      return;
    }

    if (!supabase) {
      throw new Error(lang === 'ru' ? 'Supabase не настроен в клиенте' : 'Supabase client is not configured');
    }

    const email = contactValue.trim();
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) throw new Error(error.message);
  };

  const verifyOtp = async (): Promise<boolean> => {
    if (method === 'phone') {
      if (!contactValue.trim() || !otp.trim()) {
        throw new Error(lang === 'ru' ? 'Введите номер и код' : 'Enter phone and code');
      }
      const r = await fetch('/api/auth/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getTmaHeaders() },
        body: JSON.stringify({ action: 'verify', phone: contactValue, code: otp }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Неверный код');

      // SHIELD 2: If server returned a Supabase token, create real session
      if (data.supabaseToken && supabase) {
        try {
          const { error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: data.supabaseToken,
            type: 'email', // magic link token type
          });
          if (!verifyErr) {
            // Real Supabase session created! The onAuthStateChange listener
            // will handle login automatically.
            return;
          }
          console.warn('Supabase session fallback:', verifyErr.message);
        } catch (e) {
          console.warn('Supabase session fallback:', e);
        }
      }

      // Fallback: old-style string ID (backward compatible)
      onLogin({
        id: data.userId || `phone:${data.phone || normalizePhone(contactValue)}`,
        role,
        name: name || (lang === 'ru' ? 'Пользователь' : 'User'),
        phone: data.phone || normalizePhone(contactValue),
        email: undefined,
      });
      setStep('success');
      setTimeout(() => onClose(), 600);
      return true; // Login already handled by phone fallback
    }

    if (!supabase) {
      throw new Error(lang === 'ru' ? 'Supabase не настроен в клиенте' : 'Supabase client is not configured');
    }

    const email = contactValue.trim();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email',
    });
    if (error) throw new Error(error.message);
    return false; // Login NOT yet handled — caller should proceed with getUser
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue) return;

    setLoading(true);
    setError('');

    try {
      await sendOtp();
      if (method === 'phone') {
        setStep('otp');
      } else {
        setStep('email_wait');
      }
      setTimer(30);
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const alreadyHandled = await verifyOtp();
      if (alreadyHandled) return; // Phone fallback already called onLogin

      const { data } = await supabase!.auth.getUser();
      const authUser = data.user;

      setStep('success');

      setTimeout(() => {
        const user: User = {
          id: authUser?.id,
          role,
          name: name || (lang === 'ru' ? 'Новый Пользователь' : 'New User'),
          phone: authUser?.phone || (method === 'phone' ? normalizePhone(contactValue) : undefined),
          email: authUser?.email || (method === 'email' ? contactValue.trim() : undefined),
        };
        onLogin(user);
        onClose();
      }, 1200);
    } catch (err: any) {
      setOtp('');
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;

    setLoading(true);
    setError('');

    try {
      await sendOtp();
      setTimer(30);
    } catch (err: any) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/45 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md sheet-modal card-cloud overflow-hidden animate-slide-up relative border-b-0 sm:border-b">
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-br from-amber-100/45 via-white/5 to-emerald-100/30 pointer-events-none" />
        <div className="sm:hidden flex justify-center pt-3">
          <div className="w-10 h-1.5 rounded-full bg-stone-300/80" />
        </div>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-800 transition-colors z-10 bg-white/80 rounded-full p-2 border border-white/70 shadow-sm"
        >
          <X size={20} />
        </button>

        <div className="p-5 sm:p-8 pt-4 sm:pt-8 relative">
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="text-[11px] uppercase tracking-[0.18em] font-bold text-stone-400">
                {lang === 'ru' ? 'Вход в Blizko' : 'Access Blizko'}
              </div>
              <div className="topbar-chip">
                <Lock size={12} />
                {lang === 'ru' ? 'Безопасно' : 'Secure'}
              </div>
            </div>
            <h3 className="text-[1.8rem] sm:text-[2.25rem] leading-[0.98] font-display font-semibold text-stone-900 pr-12">
              {step === 'success' ? (lang === 'ru' ? 'Успешно!' : 'Success!') : text.authTitle}
            </h3>
            <p className="text-stone-500 text-sm mt-2 leading-relaxed max-w-sm">
              {step === 'method' && (lang === 'ru' ? 'Выберите роль и удобный способ входа.' : 'Choose your role and preferred sign-in method.')}
              {step === 'otp' &&
                (lang === 'ru' ? `Код отправлен на ${contactValue}` : `Code sent to ${contactValue}`)}
              {step === 'email_wait' &&
                (lang === 'ru' ? `Мы отправили ссылку на ${contactValue}. Подтвердите вход в письме.` : `We sent a sign-in link to ${contactValue}. Confirm it from your email.`)}
              {step === 'success' && (lang === 'ru' ? 'Переходим в профиль...' : 'Redirecting to profile...')}
            </p>
          </div>

          {step === 'method' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="surface-panel rounded-[24px] p-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('parent')}
                  className={`rounded-[18px] px-4 py-3.5 flex flex-col items-center justify-center gap-1.5 transition-all ${role === 'parent'
                    ? 'bg-sky-50/90 border border-sky-200 text-sky-900 shadow-sm'
                    : 'bg-transparent text-stone-500'
                    }`}
                >
                  <Baby size={20} />
                  <span className="text-xs font-semibold">{text.roleParent}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('nanny')}
                  className={`rounded-[18px] px-4 py-3.5 flex flex-col items-center justify-center gap-1.5 transition-all ${role === 'nanny'
                    ? 'bg-amber-50/90 border border-amber-200 text-amber-900 shadow-sm'
                    : 'bg-transparent text-stone-500'
                    }`}
                >
                  <Briefcase size={20} />
                  <span className="text-xs font-semibold">{text.roleNanny}</span>
                </button>
              </div>

              <div className="surface-panel rounded-[22px] p-1 flex border-white/70 shadow-none">
                {phoneAuthEnabled && (
                  <button
                    type="button"
                    onClick={() => {
                      setMethod('phone');
                      setContactValue('');
                      setError('');
                    }}
                    className={`flex-1 py-2.5 text-[11px] font-bold uppercase rounded-[18px] transition-all flex items-center justify-center gap-2 ${method === 'phone' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
                      }`}
                  >
                    <Phone size={14} /> Phone
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMethod('email');
                    setContactValue('');
                    setError('');
                  }}
                  className={`flex-1 py-2.5 text-[11px] font-bold uppercase rounded-[18px] transition-all flex items-center justify-center gap-2 ${method === 'email' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
                    }`}
                >
                  <Mail size={14} /> Email
                </button>
              </div>

              {!phoneAuthEnabled && (
                <p className="text-[11px] text-stone-500 -mt-2">{lang === 'ru' ? 'Вход по телефону скоро будет доступен.' : 'Phone auth will be available soon.'}</p>
              )}

              <div className="surface-panel rounded-[28px] p-4 sm:p-5">
                <Input
                  label={method === 'phone' ? (lang === 'ru' ? 'Номер телефона' : 'Phone Number') : 'Email'}
                  type={method === 'phone' ? 'tel' : 'email'}
                  placeholder={method === 'phone' ? '+7 999 000-00-00' : 'hello@example.com'}
                  value={contactValue}
                  onChange={(e) => setContactValue(e.target.value)}
                  required
                  autoFocus
                />

                <Input
                  label={text.nameLabelSimple}
                  placeholder={lang === 'ru' ? 'Как к вам обращаться?' : 'Your Name'}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mb-0"
                />
              </div>

              {error && <p className="text-xs text-amber-700 bg-amber-50/90 p-3 rounded-2xl text-center font-medium border border-amber-100">{error}</p>}

              <Button type="submit" isLoading={loading} className="mt-1">
                {method === 'email'
                  ? (lang === 'ru' ? 'Получить ссылку' : 'Get login link')
                  : (lang === 'ru' ? 'Получить код' : 'Get Code')}
                <ArrowRight size={18} />
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 surface-panel rounded-[20px] flex items-center justify-center text-stone-500 mb-2 p-3">
                  <Lock size={32} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-center text-[13px] uppercase tracking-[0.15em] font-bold text-stone-500">
                  {lang === 'ru' ? 'Введите код из сообщения' : 'Enter code from message'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className={`w-full text-center text-3xl font-mono tracking-[0.35em] py-4 input-glass ${error ? 'border-amber-300 ring-2 ring-amber-100' : ''} rounded-[20px]`}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    if (error) setError(''); // Clear error on new input
                  }}
                  autoFocus
                />
              </div>

              {error && <p className="text-xs text-amber-700 text-center font-medium bg-amber-50 mx-auto w-fit px-4 py-2 rounded-full border border-amber-100">{error}</p>}

              <Button type="submit" isLoading={loading} disabled={otp.length < 4}>
                {lang === 'ru' ? 'Подтвердить' : 'Verify'}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <span className="text-xs text-stone-400 font-mono">
                    {lang === 'ru'
                      ? `Отправить повторно через 00:${timer.toString().padStart(2, '0')}`
                      : `Resend in 00:${timer.toString().padStart(2, '0')}`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    {lang === 'ru' ? 'Отправить код повторно' : 'Resend Code'}
                  </button>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('method');
                      setOtp('');
                      setError('');
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    {lang === 'ru' ? 'Изменить номер/почту' : 'Change number/email'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {step === 'email_wait' && (
            <div className="space-y-4">
              <div className="surface-panel text-sky-800 text-sm rounded-[24px] p-5 border-sky-100/70">
                {lang === 'ru'
                  ? 'Откройте письмо и нажмите ссылку подтверждения. После подтверждения вход выполнится автоматически.'
                  : 'Open your email and tap the confirmation link. You will be signed in automatically.'}
              </div>

              {error && <p className="text-xs text-amber-700 text-center font-medium bg-amber-50 mx-auto w-fit px-4 py-2 rounded-full border border-amber-100">{error}</p>}

              <div className="text-center">
                {timer > 0 ? (
                  <span className="text-xs text-stone-400 font-mono">
                    {lang === 'ru'
                      ? `Отправить повторно через 00:${timer.toString().padStart(2, '0')}`
                      : `Resend in 00:${timer.toString().padStart(2, '0')}`}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    {lang === 'ru' ? 'Отправить ссылку повторно' : 'Resend link'}
                  </button>
                )}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('method');
                      setError('');
                    }}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    {lang === 'ru' ? 'Изменить email' : 'Change email'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-8 animate-pop-in">
              <div className="w-20 h-20 bg-green-100/90 rounded-[28px] flex items-center justify-center text-green-600 mb-4 shadow-sm border border-green-200/60">
                <CheckCircle size={48} />
              </div>
              <p className="font-bold text-stone-800 text-lg">
                {lang === 'ru' ? 'Вы успешно вошли' : 'Logged in successfully'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
