import React, { useState, useEffect } from 'react';
import { Button, Input } from './UI';
import { X, Baby, Briefcase, Phone, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { Language, User } from '../types';
import { t } from '../src/core/i18n/translations';
import { supabase } from '../services/supabase';

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

    return raw || 'Не удалось выполнить вход. Попробуйте ещё раз.';
  };

  // Steps: 'method' -> 'otp' -> 'email_wait' -> 'success'
  const [step, setStep] = useState<'method' | 'otp' | 'email_wait' | 'success'>('method');
  const phoneAuthEnabled = true;
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
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
      const r = await fetch('/api/auth/send-otp-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactValue }),
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

  const verifyOtp = async () => {
    if (method === 'phone') {
      if (!contactValue.trim() || !otp.trim()) {
        throw new Error(lang === 'ru' ? 'Введите номер и код' : 'Enter phone and code');
      }
      const r = await fetch('/api/auth/verify-otp-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactValue, code: otp }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.ok) throw new Error(data?.error || 'Неверный код');

      onLogin({
        id: `phone:${data.phone || normalizePhone(contactValue)}`,
        role,
        name: name || (lang === 'ru' ? 'Пользователь' : 'User'),
        phone: data.phone || normalizePhone(contactValue),
        email: undefined,
      });
      setStep('success');
      setTimeout(() => onClose(), 600);
      return;
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
      await verifyOtp();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 transition-colors z-10"
        >
          <X size={20} />
        </button>

        <div className="p-8">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-semibold text-stone-800 tracking-tight">
              {step === 'success' ? (lang === 'ru' ? 'Успешно!' : 'Success!') : text.authTitle}
            </h3>
            <p className="text-stone-500 text-sm mt-1">
              {step === 'method' && (lang === 'ru' ? 'Войдите или зарегистрируйтесь' : 'Login or Register')}
              {step === 'otp' &&
                (lang === 'ru' ? `Код отправлен на ${contactValue}` : `Code sent to ${contactValue}`)}
              {step === 'email_wait' &&
                (lang === 'ru' ? `Отправили ссылку на ${contactValue}. Подтвердите вход в письме.` : `Login link sent to ${contactValue}. Confirm sign-in from the email.`)}
              {step === 'success' && (lang === 'ru' ? 'Переходим в профиль...' : 'Redirecting to profile...')}
            </p>
          </div>

          {step === 'method' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => setRole('parent')}
                  className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    role === 'parent'
                      ? 'border-sky-200 bg-sky-50 text-sky-800'
                      : 'border-stone-100 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Baby size={20} />
                  <span className="text-xs font-semibold">{text.roleParent}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('nanny')}
                  className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${
                    role === 'nanny'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-stone-100 text-stone-400 hover:border-stone-200'
                  }`}
                >
                  <Briefcase size={20} />
                  <span className="text-xs font-semibold">{text.roleNanny}</span>
                </button>
              </div>

              <div className="flex bg-stone-100 p-1 rounded-xl mb-4">
                <div className="flex-1 py-2 text-xs font-bold uppercase rounded-lg bg-white text-stone-900 shadow-sm flex items-center justify-center gap-2">
                  <Phone size={14} /> Phone
                </div>
              </div>

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
              />

              {error && <p className="text-xs text-red-500">{error}</p>}

              <Button type="submit" isLoading={loading} className="mt-4">
                {lang === 'ru' ? 'Получить код' : 'Get Code'}
                <ArrowRight size={18} />
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-500 mb-2">
                  <Lock size={32} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-center text-sm font-medium text-stone-500">
                  {lang === 'ru' ? 'Введите код из сообщения' : 'Enter code from message'}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-amber-300 focus:bg-white focus:outline-none transition-all"
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

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
              <div className="bg-sky-50 border border-sky-100 text-sky-700 text-sm rounded-xl p-4">
                {lang === 'ru'
                  ? 'Откройте письмо и нажмите ссылку подтверждения. После подтверждения вход выполнится автоматически.'
                  : 'Open your email and tap the confirmation link. You will be signed in automatically.'}
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

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
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
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
