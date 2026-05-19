import React, { useState } from 'react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Card } from '../../UI';
import { ShieldCheck, Check, FileText, Upload } from 'lucide-react';
import { DocumentUploadModal } from '../../DocumentUploadModal';
import { t } from '@/core/i18n/translations';
import { Language, DocumentVerification } from '@/core/types';
import {
    trackDocumentUploaded,
    trackResumeAutofillApplied,
    trackResumeParsed,
} from '@/services/analytics';
import { getNannyReadinessLabel } from '@/services/nannyReadiness';

interface Props {
    lang: Language;
}

export const Step3_Verification: React.FC<Props> = ({ lang }) => {
    const text = t[lang];
    const {
        isVerified,
        documents, setDocuments,
        resumeNormalized, setResumeNormalized,
        applyResumeNormalized,
        readinessSnapshot,
        prevStep, nextStep
    } = useNannyForm();

    const [showDocUpload, setShowDocUpload] = useState(false);

    const handleDocumentVerified = (doc: DocumentVerification) => {
        setDocuments(prev => [...prev, doc]);
        trackDocumentUploaded('nanny', doc.type);

        if (doc.type === 'resume' && doc.normalizedResume) {
            const r = doc.normalizedResume;
            setResumeNormalized(r);
            const appliedFields = applyResumeNormalized(r);
            trackResumeParsed(doc.aiConfidence || 0, appliedFields);
            if (appliedFields > 0) {
                trackResumeAutofillApplied(appliedFields);
            }
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="section-label">
                Проверка и доверие
            </div>

            <Card className={`transition-all duration-300 ${isVerified ? 'bg-[#EFF3F2] border-[#7FA99B]/40 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${isVerified ? 'bg-[#2A6B6E]/15 text-[#2A6B6E]' : 'bg-stone-100 text-stone-400'}`}>
                        <ShieldCheck size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-stone-800 mb-1">
                            {isVerified ? text.verifiedTitle : text.verificationTitle}
                        </h3>
                        <p className="text-sm text-stone-500 mb-3">
                            {isVerified ? text.verifiedDesc : text.verificationDesc}
                        </p>

                        {!isVerified && (
                            <div className="text-xs text-stone-400 bg-stone-50 px-3 py-2 rounded-lg border border-stone-100">
                                Верификация через Госуслуги временно недоступна.
                            </div>
                        )}

                        {isVerified && (
                            <div className="flex items-center gap-2 text-sm text-[#2A6B6E] font-medium">
                                <Check size={16} /> {text.verifiedBadge}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card className={`transition-all duration-300 ${documents.length > 0 ? 'bg-[#EFF3F2] border-[#7FA99B]/40 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${documents.length > 0 ? 'bg-[#2A6B6E]/15 text-[#2A6B6E]' : 'bg-stone-100 text-stone-400'}`}>
                        <FileText size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-stone-800 mb-1">
                            {text.docsTitle} *
                        </h3>

                        {documents.length === 0 && (
                            <>
                                <p className="text-sm text-stone-500 mb-3">{text.docsDesc}</p>
                                <button
                                    type="button"
                                    onClick={() => setShowDocUpload(true)}
                                    className="text-sm font-medium text-[#2A6B6E] bg-[#EFF3F2] px-4 py-2 rounded-lg hover:bg-[#7FA99B]/20 transition-colors flex items-center gap-2"
                                >
                                    <Upload size={16} /> {text.uploadDoc}
                                </button>
                            </>
                        )}

                        {documents.length > 0 && (
                            <div className="animate-fade-in space-y-2">
                                <div className="flex items-center gap-2 text-sm text-[#2A6B6E] font-medium mb-2">
                                    <Check size={16} /> {documents.length} {lang === 'ru' ? 'документов загружено' : 'documents uploaded'}
                                </div>
                                {documents.map((doc, i) => (
                                    <div key={i} className="bg-white/60 p-2 rounded-lg flex justify-between items-center border border-[#7FA99B]/30">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-stone-700 uppercase">
                                                {doc.type === 'passport' ? 'Паспорт' :
                                                    doc.type === 'medical_book' ? 'Медкнижка' :
                                                        doc.type === 'recommendation_letter' ? 'Рекомендация' :
                                                            doc.type === 'education_document' ? 'Образование' :
                                                                doc.type === 'resume' ? 'Резюме' : 'Документ'}
                                            </span>
                                            {doc.documentNumber && <span className="text-xs font-mono text-stone-500">{doc.documentNumber}</span>}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {doc.fileDataUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const a = document.createElement('a');
                                                        a.href = doc.fileDataUrl!;
                                                        a.target = '_blank';
                                                        a.rel = 'noopener noreferrer';
                                                        a.download = doc.fileName || 'document';
                                                        document.body.appendChild(a);
                                                        a.click();
                                                        a.remove();
                                                    }}
                                                    className="text-[10px] px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 hover:bg-stone-200"
                                                >
                                                    Открыть
                                                </button>
                                            )}
                                            <span className="text-[10px] bg-stone-100 text-stone-700 px-1.5 py-0.5 rounded font-bold">
                                                {doc.status === 'verified' ? 'Проверено' : doc.status === 'rejected' ? 'Отклонено' : 'Загружено'}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {resumeNormalized && (
                                    <div className="bg-white border border-[#7FA99B]/30 rounded-lg p-2 text-xs text-stone-600">
                                        <div className="font-semibold text-stone-700 mb-1">Резюме распознано в едином формате</div>
                                        <div>Имя: {resumeNormalized.fullName || '—'}</div>
                                        <div>Город: {resumeNormalized.city || '—'}</div>
                                        <div>Опыт: {typeof resumeNormalized.experienceYears === 'number' ? `${resumeNormalized.experienceYears} лет` : '—'}</div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowDocUpload(true)}
                                    className="text-xs text-[#2A6B6E] underline mt-2"
                                >
                                    + {lang === 'ru' ? 'Добавить еще' : 'Add more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card className={`transition-all duration-300 ${readinessSnapshot.qualityApproved ? 'bg-[#EFF3F2] border-[#7FA99B]/40 shadow-sm' : 'bg-[#F9F6F2] border-[#7FA99B]/30 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full shrink-0 ${readinessSnapshot.qualityApproved ? 'bg-[#2A6B6E]/15 text-[#2A6B6E]' : 'bg-[#C4744A]/15 text-[#C4744A]'}`}>
                        <Check size={24} />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-stone-800 mb-1">
                            {lang === 'ru' ? 'Готовность профиля' : 'Profile readiness'}
                        </h3>
                        <p className="text-sm text-stone-500 mb-3">
                            {getNannyReadinessLabel(readinessSnapshot, lang)}
                        </p>

                        {readinessSnapshot.qualityApproved ? (
                            <div className="text-xs text-[#2A6B6E] bg-white/70 border border-[#7FA99B]/30 rounded-lg px-3 py-2">
                                {lang === 'ru'
                                    ? 'Профиль уже выглядит готовым к показу семье. Осталось дождаться или пройти финальную ручную проверку.'
                                    : 'Profile already looks ready to be shown to families. Final manual review is the last step.'}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <div className="text-xs font-semibold text-stone-600">
                                    {lang === 'ru' ? 'Что ещё нужно закрыть:' : 'What is still missing:'}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {readinessSnapshot.missingFields.map((item) => (
                                        <span
                                            key={item}
                                            className="inline-flex items-center rounded-full bg-white/70 border border-amber-100 px-2.5 py-1 text-[11px] font-medium text-stone-600"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="sticky-action-rail sticky-footer-fade flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep} pulse={true}>
                    {lang === 'ru' ? 'Продолжить' : 'Continue'}
                </Button>
            </div>

            {showDocUpload && (
                <DocumentUploadModal
                    onClose={() => setShowDocUpload(false)}
                    onVerify={handleDocumentVerified}
                    lang={lang}
                />
            )}
        </div>
    );
};
