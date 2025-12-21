import React, { useState, useEffect } from 'react';
import { Button, Input } from './UI';
import { X, Baby, Briefcase, Phone, Mail, ArrowRight, CheckCircle, Lock } from 'lucide-react';
import { Language, User } from '../types';
import { t } from '../src/core/i18n/translations';

interface AuthModalProps {
  onClose: () => void;
  onLogin: (user: User) => void;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLogin, lang }) => {
  const text = t[lang];
  
  // Steps: 'method' -> 'otp' -> 'success'
  const [step, setStep] = useState<'method' | 'otp' | 'success'>('method');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [role, setRole] = useState<'parent' | 'nanny'>('parent');
  
  // Inputs
  const [contactValue, setContactValue] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState(''); // Only asked if we simulate a "new" user, but for simplicity we ask always or assume
  
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);

  // Timer for resend code
  useEffect(() => {
    let interval: number;
    if (timer > 0) {
      interval = window.setInterval(() => setTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const triggerFakeSms = () => {
    const code = '0000';
    const message = lang === 'ru' 
      ? `Blizko SMS: Ваш код подтверждения ${code}` 
      : `Blizko SMS: Your verification code is ${code}`;
    
    // Simulate network delay for SMS delivery
    setTimeout(() => {
        alert(message);
    }, 500);
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactValue) return;
    
    setLoading(true);

    // Simulate sending code
    setTimeout(() => {
      setLoading(false);
      setStep('otp');
      setTimer(30); // 30 seconds cooldown
      triggerFakeSms();
    }, 1200);
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate code verification
    setTimeout(() => {
      setLoading(false);
      
      // Strict check for '0000'
      if (otp === '0000') {
        setStep('success');
        
        // Auto close after success animation
        setTimeout(() => {
          const user: User = {
            role,
            name: name || (lang === 'ru' ? 'Новый Пользователь' : 'New User'),
            phone: method === 'phone' ? contactValue : undefined,
            email: method === 'email' ? contactValue : undefined
          };
          onLogin(user);
          onClose();
        }, 1500);
      } else {
        alert(lang === 'ru' ? 'Неверный код. Попробуйте 0000' : 'Invalid code. Try 0000');
        setOtp(''); 
      }
    }, 1000);
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
          
          {/* Header */}
          <div className="text-center mb-6">
            <h3 className="text-2xl font-semibold text-stone-800 tracking-tight">
              {step === 'success' ? (lang === 'ru' ? 'Успешно!' : 'Success!') : text.authTitle}
            </h3>
            <p className="text-stone-500 text-sm mt-1">
              {step === 'method' && (lang === 'ru' ? 'Войдите или зарегистрируйтесь' : 'Login or Register')}
              {step === 'otp' && (lang === 'ru' ? `Код отправлен на ${contactValue}` : `Code sent to ${contactValue}`)}
              {step === 'success' && (lang === 'ru' ? 'Переходим в профиль...' : 'Redirecting to profile...')}
            </p>
          </div>

          {step === 'method' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              
              {/* Role Selection */}
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

              {/* Method Tabs */}
              <div className="flex bg-stone-100 p-1 rounded-xl mb-4">
                <button
                  type="button"
                  onClick={() => { setMethod('phone'); setContactValue(''); }}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${
                    method === 'phone' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
                  }`}
                >
                  <Phone size={14} /> Phone
                </button>
                <button
                  type="button"
                  onClick={() => { setMethod('email'); setContactValue(''); }}
                  className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center justify-center gap-2 ${
                    method === 'email' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
                  }`}
                >
                  <Mail size={14} /> Email
                </button>
              </div>

              <Input
                label={method === 'phone' ? (lang === 'ru' ? 'Номер телефона' : 'Phone Number') : 'Email'}
                type={method === 'phone' ? 'tel' : 'email'}
                placeholder={method === 'phone' ? '+7 999 000-00-00' : 'hello@example.com'}
                value={contactValue}
                onChange={e => setContactValue(e.target.value)}
                required
                autoFocus
              />

              {/* Optional Name for first-time simulation */}
              <Input 
                 label={text.nameLabelSimple}
                 placeholder={lang === 'ru' ? "Как к вам обращаться?" : "Your Name"}
                 value={name}
                 onChange={e => setName(e.target.value)}
              />

              <Button type="submit" isLoading={loading} className="mt-4">
                {lang === 'ru' ? 'Получить код' : 'Get Code'} <ArrowRight size={18} />
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
                  maxLength={4}
                  className="w-full text-center text-3xl font-mono tracking-[0.5em] py-4 bg-stone-50 border-2 border-stone-200 rounded-xl focus:border-amber-300 focus:bg-white focus:outline-none transition-all"
                  placeholder="0000"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>

              <Button type="submit" isLoading={loading} disabled={otp.length !== 4}>
                {lang === 'ru' ? 'Подтвердить' : 'Verify'}
              </Button>

              <div className="text-center">
                {timer > 0 ? (
                  <span className="text-xs text-stone-400 font-mono">
                     {lang === 'ru' ? `Отправить повторно через 00:${timer.toString().padStart(2, '0')}` : `Resend in 00:${timer.toString().padStart(2, '0')}`}
                  </span>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                        setTimer(30);
                        triggerFakeSms();
                    }}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    {lang === 'ru' ? 'Отправить код повторно' : 'Resend Code'}
                  </button>
                )}
                <div className="mt-4">
                  <button 
                    type="button" 
                    onClick={() => { setStep('method'); setOtp(''); }}
                    className="text-xs text-stone-400 hover:text-stone-600"
                  >
                    {lang === 'ru' ? 'Изменить номер/почту' : 'Change number/email'}
                  </button>
                </div>
              </div>
            </form>
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