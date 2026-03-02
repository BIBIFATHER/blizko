import React, { useState } from 'react';
import { Button, Input } from './UI';
import { X, CreditCard, QrCode, CheckCircle, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { Language } from '../types';
import { t } from '../src/core/i18n/translations';

interface PaymentModalProps {
  amount: string;
  title: string;
  onClose: () => void;
  onSuccess: () => void;
  lang: Language;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({ amount, title, onClose, onSuccess, lang }) => {
  const text = t[lang];
  const [method, setMethod] = useState<'card' | 'sbp'>('sbp');
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate Payment Processing
    setTimeout(() => {
      setLoading(false);
      setCompleted(true);
      setTimeout(() => {
        onSuccess();
      }, 1500);
    }, 2000);
  };

  if (completed) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center animate-slide-up shadow-2xl">
           <div className="w-16 h-16 bg-[#6C2586] rounded-full flex items-center justify-center text-white mx-auto mb-4 animate-pop-in">
             <CheckCircle size={32} />
           </div>
           <h3 className="text-xl font-bold text-stone-800 mb-2">{text.paySuccess}</h3>
           <p className="text-stone-500 font-medium">{amount}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up relative flex flex-col">
        {/* Tochka Branding Header */}
        <div className="bg-[#6C2586] p-5 flex justify-between items-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          
          <div className="flex items-center gap-2 z-10">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#6C2586] font-black text-sm shadow-md">
              Т
            </div>
            <div>
              <div className="font-bold text-lg tracking-tight leading-none">{text.tochkaBank}</div>
              <div className="text-[10px] text-white/70 uppercase tracking-widest font-medium">Business Module</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full text-white/80 hover:text-white transition-colors z-10">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 bg-stone-50 p-4 rounded-xl border border-stone-100 flex justify-between items-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-16 h-full bg-gradient-to-l from-stone-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div>
              <p className="text-stone-400 text-[10px] uppercase tracking-wider font-bold">{title || text.payTitle}</p>
              <p className="text-2xl font-bold text-stone-800 mt-0.5 tracking-tight">{amount}</p>
            </div>
            <div className="w-10 h-10 bg-[#6C2586]/10 rounded-full flex items-center justify-center text-[#6C2586]">
               <ShieldCheck size={20} />
            </div>
          </div>

          {/* Payment Method Tabs */}
          <div className="flex bg-stone-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setMethod('sbp')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all flex items-center justify-center gap-2 ${
                method === 'sbp' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <QrCode size={16} /> {text.methodSBP}
            </button>
            <button 
              onClick={() => setMethod('card')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-all flex items-center justify-center gap-2 ${
                method === 'card' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-200' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <CreditCard size={16} /> {text.methodCard}
            </button>
          </div>

          {method === 'card' ? (
            <form onSubmit={handlePay} className="space-y-4 animate-fade-in">
              <Input 
                label={text.cardNumber}
                placeholder="0000 0000 0000 0000"
                value={cardNumber}
                onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                maxLength={19}
                required
                className="font-mono bg-stone-50 focus:bg-white transition-colors"
              />
              <div className="flex gap-4">
                <Input 
                  label={text.cardExpiry}
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  maxLength={5}
                  required
                  className="font-mono text-center bg-stone-50 focus:bg-white"
                />
                <Input 
                  label={text.cardCVC}
                  placeholder="123"
                  type="password"
                  value={cvc}
                  onChange={e => setCvc(e.target.value)}
                  maxLength={3}
                  required
                  className="font-mono text-center bg-stone-50 focus:bg-white"
                />
              </div>

              <Button type="submit" isLoading={loading} className="mt-4 bg-[#6C2586] text-white hover:bg-[#581c6e] shadow-lg shadow-purple-900/20 w-full py-3.5">
                {text.payAction} <ArrowRight size={18} />
              </Button>
              
              <div className="flex justify-center mt-3">
                 <span className="text-[10px] text-stone-400 flex items-center gap-1">
                   <ShieldCheck size={10} /> Secured by Tochka
                 </span>
              </div>
            </form>
          ) : (
            <div className="text-center animate-fade-in py-1">
              <div className="w-52 h-52 mx-auto bg-white border-2 border-[#6C2586] rounded-2xl flex items-center justify-center mb-4 relative overflow-hidden group p-2 shadow-lg shadow-purple-900/5">
                 <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=6C2586&data=TochkaBankCommissionPayment_${amount.replace(/\D/g,'')}`} alt="QR" className="w-full h-full opacity-90 group-hover:scale-105 transition-transform duration-500" />
                 
                 {/* Center Logo */}
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                      <span className="text-[#6C2586] font-black text-sm">Т</span>
                    </div>
                 </div>
              </div>
              
              <button className="text-[#6C2586] text-xs font-bold mb-4 flex items-center justify-center gap-1 hover:underline">
                <ExternalLink size={12} /> {text.openTochkaApp || 'Open Tochka App'}
              </button>

              <p className="text-stone-500 text-xs mb-6 px-4 leading-relaxed">
                {text.sbpHint}
              </p>
              
              <Button onClick={handlePay} isLoading={loading} className="bg-[#6C2586] hover:bg-[#581c6e] text-white shadow-lg shadow-purple-900/20 w-full">
                {text.payAction}
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};