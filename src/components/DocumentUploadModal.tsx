import React, { useState, useRef } from 'react';
import { Button, ModalShell } from './UI';
import { X, UploadCloud, CheckCircle, FileText, ShieldCheck } from 'lucide-react';
import { Language, DocumentVerification } from '@/core/types';
import { t } from '@/core/i18n/translations';
import { analyzeDocument } from '@/core/ai/documentAi';

interface DocumentUploadModalProps {
  onClose: () => void;
  onVerify: (doc: DocumentVerification) => void;
  lang: Language;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ onClose, onVerify, lang }) => {
  const text = t[lang];
  const [step, setStep] = useState<'select' | 'processing' | 'result'>('select');
  const [docType, setDocType] = useState<DocumentVerification['type']>('other');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<DocumentVerification | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setFileName(file.name);
    setStep('processing');

    // Use an object URL for immediate preview/attachment (fast + reliable for MVP).
    const objectUrl = URL.createObjectURL(file);

    const analyzed = await analyzeDocument(file, docType, lang);
    const doc: DocumentVerification = {
      ...analyzed,
      type: docType,
      verifiedAt: Date.now(),
      fileName: file.name,
      fileDataUrl: objectUrl,
    };

    onVerify(doc);
    setUploadedDoc(doc);
    setStep('result');
    // Close automatically after a short delay so the counter is visible in the form.
    setTimeout(() => onClose(), 1000);
  };

  return (
    <ModalShell variant="card" className="z-60" panelClassName="bg-white min-h-[380px]">
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

            <label className="relative flex-1 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-stone-50 transition-colors group">
              <div className="w-16 h-16 bg-sky-50 rounded-full flex items-center justify-center text-sky-500 mb-4 group-hover:scale-110 transition-transform">
                <UploadCloud size={32} />
              </div>
              <span className="font-semibold text-stone-600">{text.uploadDoc}</span>
              <span className="text-xs text-stone-400 mt-1">JPG, PNG, PDF</span>
              {fileName && <span className="text-[11px] text-stone-500 mt-2">{fileName}</span>}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100/50">
              <ShieldCheck size={14} />
              {lang === 'ru' ? 'Все документы защищены банковским шифрованием' : 'All documents are secured with bank-level encryption'}
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-6 flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 mb-4 animate-pulse">
              <UploadCloud size={34} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">
              {lang === 'ru' ? 'Сканируем документ' : 'Scanning document'}
            </h3>
            <p className="text-sm text-stone-500 max-w-[260px]">
              {lang === 'ru'
                ? 'AI извлекает основные поля, чтобы сократить ручной ввод.'
                : 'AI is extracting key fields to reduce manual form filling.'}
            </p>
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
              {uploadedDoc && (
                <div className="mt-2 text-xs text-stone-500 space-y-1">
                  <div>
                    {lang === 'ru' ? 'AI confidence' : 'AI confidence'}: {uploadedDoc.aiConfidence}%
                  </div>
                  <div>{uploadedDoc.aiNotes}</div>
                  {uploadedDoc.type === 'resume' && uploadedDoc.normalizedResume && (
                    <div className="pt-1 text-stone-600">
                      {lang === 'ru' ? 'Резюме распознано и готово для автозаполнения.' : 'Resume parsed and ready for autofill.'}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button onClick={onClose}>OK</Button>
          </div>
        )}
    </ModalShell>
  );
};
