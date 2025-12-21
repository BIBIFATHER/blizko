import React, { useState } from 'react';
import { Button } from './UI';
import { X, UploadCloud, ScanLine, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { Language, DocumentVerification } from '../types';
import { t } from '../src/core/i18n/translations';
import { analyzeDocument } from '../src/core/ai/documentAi';

interface DocumentUploadModalProps {
  onClose: () => void;
  onVerify: (doc: DocumentVerification) => void;
  lang: Language;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onVerify, lang }) => {
  const text = t[lang];
  const [step, setStep] = useState<'select' | 'scanning' | 'result'>('select');
  const [docType, setDocType] = useState<DocumentVerification['type']>('passport');
  const [result, setResult] = useState<DocumentVerification | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setStep('scanning');
      // Pass the current language to the AI analyzer
      analyzeDocument(e.target.files[0], docType, lang).then(res => {
        setResult(res);
        setStep('result');
      });
    }
  };

  const handleFinish = () => {
    if (result && result.status === 'verified') {
      onVerify(result);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up relative min-h-[400px] flex flex-col">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 z-10">
          <X size={24} />
        </button>

        {/* --- SELECT STEP --- */}
        {step === 'select' && (
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-stone-800 mb-2">{text.docsTitle}</h3>
            <p className="text-sm text-stone-500 mb-6">{text.docsDesc}</p>

            <div className="flex gap-2 mb-6">
               <button 
                 onClick={() => setDocType('passport')}
                 className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${docType === 'passport' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-500'}`}
               >
                 {text.docPas}
               </button>
               <button 
                 onClick={() => setDocType('medical_book')}
                 className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${docType === 'medical_book' ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-500'}`}
               >
                 {text.docMed}
               </button>
            </div>

            <label className="flex-1 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group relative overflow-hidden">
               <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                 <UploadCloud size={32} />
               </div>
               <span className="font-semibold text-stone-600">{text.uploadDoc}</span>
               <span className="text-xs text-stone-400 mt-1">JPG, PNG, PDF</span>
               <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {/* --- SCANNING STEP --- */}
        {step === 'scanning' && (
          <div className="p-6 flex-1 flex flex-col items-center justify-center bg-stone-900 text-white relative overflow-hidden">
             {/* Scanning Animation Line */}
             <div className="absolute top-0 left-0 w-full h-1 bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.8)] animate-[scan_2s_ease-in-out_infinite]" style={{ animationName: 'scanDown' }}></div>
             <style>{`
               @keyframes scanDown {
                 0% { top: 0%; opacity: 0; }
                 10% { opacity: 1; }
                 90% { opacity: 1; }
                 100% { top: 100%; opacity: 0; }
               }
             `}</style>
             
             <div className="relative z-10 text-center">
                <ScanLine size={64} className="mx-auto mb-6 text-green-400 animate-pulse" />
                <h3 className="text-xl font-mono font-bold mb-2 tracking-widest uppercase">{text.scanTitle}</h3>
                <p className="text-stone-400 text-sm">{text.scanHint}</p>
             </div>

             {/* Background decorative code */}
             <div className="absolute inset-0 opacity-10 font-mono text-[10px] p-2 break-all overflow-hidden pointer-events-none">
               {Array(50).fill('0101011100101 SCANNING AI OCR 0xFF021 ').join('')}
             </div>
          </div>
        )}

        {/* --- RESULT STEP --- */}
        {step === 'result' && result && (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
             {result.status === 'verified' ? (
               <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 animate-pop-in">
                 <CheckCircle size={40} />
               </div>
             ) : (
               <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4 animate-pop-in">
                 <AlertCircle size={40} />
               </div>
             )}
             
             <h3 className="text-xl font-bold text-stone-800 mb-1">
               {result.status === 'verified' ? text.scanSuccess : 'Verification Failed'}
             </h3>
             <p className="text-stone-500 text-sm mb-6 max-w-[220px] leading-relaxed">{result.aiNotes}</p>

             {result.status === 'verified' && (
               <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6 text-left">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{text.scanConfidence}</span>
                     <span className="text-green-600 font-bold">{result.aiConfidence}%</span>
                  </div>
                  <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full transition-all duration-1000" style={{ width: `${result.aiConfidence}%` }}></div>
                  </div>
                  
                  {result.documentNumber && (
                    <div className="mt-4 flex items-center gap-2 text-stone-600 font-mono text-sm bg-white p-2 rounded border border-stone-100">
                      <FileText size={14} /> {result.documentNumber}
                    </div>
                  )}
                  {result.expiryDate && (
                    <div className="mt-2 flex items-center gap-2 text-stone-500 text-xs pl-1">
                      EXP: {result.expiryDate}
                    </div>
                  )}
               </div>
             )}

             <Button onClick={handleFinish} className={result.status === 'verified' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}>
               {result.status === 'verified' ? 'OK' : 'Try Again'}
             </Button>
          </div>
        )}
      </div>
    </div>
  );
};