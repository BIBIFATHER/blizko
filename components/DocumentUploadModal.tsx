import React, { useState } from 'react';
import { Button } from './UI';
import { X, UploadCloud, CheckCircle, FileText } from 'lucide-react';
import { Language, DocumentVerification } from '../types';
import { t } from '../src/core/i18n/translations';

interface DocumentUploadModalProps {
  onClose: () => void;
  onVerify: (doc: DocumentVerification) => void;
  lang: Language;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onVerify, lang }) => {
  const text = t[lang];
  const [step, setStep] = useState<'select' | 'result'>('select');
  const [docType, setDocType] = useState<DocumentVerification['type']>('other');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // Use an object URL for immediate preview/attachment (faster, reliable for MVP).
    const objectUrl = URL.createObjectURL(file);

    const doc: DocumentVerification = {
      type: docType,
      status: 'pending',
      aiConfidence: 0,
      aiNotes: lang === 'ru' ? 'Документ загружен и ожидает проверки.' : 'Document uploaded and awaiting review.',
      verifiedAt: Date.now(),
      fileName: file.name,
      fileDataUrl: objectUrl,
    };

    onVerify(doc);
    setStep('result');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl overflow-hidden animate-slide-up relative min-h-[380px] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-stone-400 hover:text-stone-800 z-10">
          <X size={24} />
        </button>

        {step === 'select' && (
          <div className="p-6 flex-1 flex flex-col">
            <h3 className="text-xl font-bold text-stone-800 mb-2">{text.docsTitle}</h3>
            <p className="text-sm text-stone-500 mb-6">{lang === 'ru' ? 'Загрузите документ в анкету.' : 'Upload document to profile.'}</p>

            <div className="mb-6 bg-stone-50 border border-stone-200 rounded-xl p-3 space-y-3">
              <div className="text-xs font-semibold text-stone-600">{lang === 'ru' ? 'Тип документа:' : 'Document type:'}</div>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentVerification['type'])}
                className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white"
              >
                <option value="passport">{text.docPas}</option>
                <option value="medical_book">{text.docMed}</option>
                <option value="recommendation_letter">{text.docRec}</option>
                <option value="education_document">{text.docEdu}</option>
                <option value="resume">{lang === 'ru' ? 'Резюме' : 'Resume'}</option>
                <option value="other">{lang === 'ru' ? 'Другой документ' : 'Other document'}</option>
              </select>
            </div>

            <label className="flex-1 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group">
              <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={32} />
              </div>
              <span className="font-semibold text-stone-600">{text.uploadDoc}</span>
              <span className="text-xs text-stone-400 mt-1">JPG, PNG, PDF</span>
              <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
            </label>
          </div>
        )}

        {step === 'result' && (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4 animate-pop-in">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-1">{lang === 'ru' ? 'Документ загружен' : 'Document uploaded'}</h3>
            <p className="text-stone-500 text-sm mb-6 max-w-[240px]">
              {lang === 'ru' ? 'Документ добавлен в анкету. Проверка будет выполнена позже.' : 'Document was added to profile. Verification will be done later.'}
            </p>

            <div className="w-full bg-stone-50 border border-stone-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 text-sm text-stone-700">
                <FileText size={16} />
                {lang === 'ru' ? 'Статус: загружено' : 'Status: uploaded'}
              </div>
            </div>

            <Button onClick={onClose}>OK</Button>
          </div>
        )}
      </div>
    </div>
  );
};
