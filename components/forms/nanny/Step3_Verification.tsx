import React, { useState } from 'react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Card } from '../../UI';
import { ShieldCheck, Check, FileText, Upload } from 'lucide-react';
import { DocumentUploadModal } from '../../DocumentUploadModal';
import { t } from '../../../src/core/i18n/translations';
import { Language, DocumentVerification } from '../../../types';

interface Props {
    lang: Language;
}

export const Step3_Verification: React.FC<Props> = ({ lang }) => {
    const text = t[lang];
    const {
        isVerified,
        documents, setDocuments,
        resumeNormalized, setResumeNormalized,
        setFormData, setSkills,
        prevStep, nextStep
    } = useNannyForm();

    const [showDocUpload, setShowDocUpload] = useState(false);

    const handleDocumentVerified = (doc: DocumentVerification) => {
        setDocuments(prev => [...prev, doc]);

        if (doc.type === 'resume' && doc.normalizedResume) {
            const r = doc.normalizedResume;
            setResumeNormalized(r);

            // Auto-fill form data if AI confidence is high enough
            if ((doc.aiConfidence || 0) >= 80) {
                setFormData((prev) => ({
                    ...prev,
                    name: prev.name || r.fullName || '',
                    city: prev.city || r.city || '',
                    contact: prev.contact || r.phone || r.email || '',
                    about: prev.about || r.summary || '',
                    experience: prev.experience || (typeof r.experienceYears === 'number' ? String(r.experienceYears) : ''),
                }));

                if (Array.isArray(r.skills) && r.skills.length > 0) {
                    setSkills((prev) => Array.from(new Set([...(prev || []), ...r.skills!])));
                }
            }
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="section-label">
                Проверка и доверие
            </div>

            <Card className={`transition-all duration-300 ${isVerified ? 'bg-green-50/50 border-green-200/50 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${isVerified ? 'bg-green-200 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
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
                            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                                <Check size={16} /> {text.verifiedBadge}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <Card className={`transition-all duration-300 ${documents.length > 0 ? 'bg-sky-50/50 border-sky-200/50 shadow-sm' : 'bg-white/60 backdrop-blur-md border border-white/60 shadow-sm'}`}>
                <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full flex-shrink-0 ${documents.length > 0 ? 'bg-sky-200 text-sky-700' : 'bg-stone-100 text-stone-400'}`}>
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
                                    className="text-sm font-medium text-sky-700 bg-sky-100 px-4 py-2 rounded-lg hover:bg-sky-200 transition-colors flex items-center gap-2"
                                >
                                    <Upload size={16} /> {text.uploadDoc}
                                </button>
                            </>
                        )}

                        {documents.length > 0 && (
                            <div className="animate-fade-in space-y-2">
                                <div className="flex items-center gap-2 text-sm text-sky-700 font-medium mb-2">
                                    <Check size={16} /> {documents.length} {lang === 'ru' ? 'документов загружено' : 'documents uploaded'}
                                </div>
                                {documents.map((doc, i) => (
                                    <div key={i} className="bg-white/60 p-2 rounded-lg flex justify-between items-center border border-sky-100">
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
                                    <div className="bg-white border border-sky-100 rounded-lg p-2 text-xs text-stone-600">
                                        <div className="font-semibold text-stone-700 mb-1">Резюме распознано в едином формате</div>
                                        <div>Имя: {resumeNormalized.fullName || '—'}</div>
                                        <div>Город: {resumeNormalized.city || '—'}</div>
                                        <div>Опыт: {typeof resumeNormalized.experienceYears === 'number' ? `${resumeNormalized.experienceYears} лет` : '—'}</div>
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={() => setShowDocUpload(true)}
                                    className="text-xs text-sky-600 underline mt-2"
                                >
                                    + {lang === 'ru' ? 'Добавить еще' : 'Add more'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            <div className="sticky bottom-0 z-10 flex gap-4 mt-8 pt-6 pb-6 -mx-2 px-2 sticky-footer-fade">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep} pulse={true}>
                    {lang === 'ru' ? 'Остался 1 шаг' : '1 step left'}
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
