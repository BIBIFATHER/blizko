import React from 'react';
import { Button, ModalShell } from './UI';
import { CheckCircle, MapPin, MessageSquare, Settings2, X } from 'lucide-react';
import { Language } from '@/core/types';
import { ParentFormData, ParentAdvancedSettings } from './forms/parent/ParentFormProvider';

interface Props {
    lang: Language;
    formData: ParentFormData;
    advanced: ParentAdvancedSettings;
    onConfirm: () => void;
    onClose: () => void;
}

export const ParentSummaryModal: React.FC<Props> = ({ lang, formData, advanced, onConfirm, onClose }) => {
    const ru = lang === 'ru';

    const advancedLines = [
        advanced.cameras && (ru ? `Камеры: ${advanced.cameras}` : `Cameras: ${advanced.cameras}`),
        advanced.household && (ru ? `Помощь по дому: ${advanced.household}` : `Household: ${advanced.household}`),
        advanced.pets && (ru ? `Животные: ${advanced.pets}` : `Pets: ${advanced.pets}`),
    ].filter(Boolean) as string[];

    return (
        <ModalShell variant="card" className="z-80" panelClassName="bg-[#F9F6F2]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[#1C2B2D]/8 p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EFF3F2] text-[#2A6B6E]">
                        <CheckCircle size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[#1C2B2D]">
                            {ru ? 'Всё верно?' : 'Does this look right?'}
                        </h3>
                        <p className="text-xs text-[#1C2B2D]/50">
                            {ru ? 'Это увидит менеджер Blizko' : 'This is what the Blizko manager will see'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[#1C2B2D]/40 transition-colors hover:bg-[#1C2B2D]/5 hover:text-[#1C2B2D]"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Story */}
                {formData.comment.trim() && (
                    <div className="rounded-2xl bg-white/70 p-4 border border-[#1C2B2D]/6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#1C2B2D]/50">
                            <MessageSquare size={13} />
                            {ru ? 'Ваш запрос' : 'Your request'}
                        </div>
                        <p className="text-sm leading-relaxed text-[#1C2B2D]/85">
                            {formData.comment.trim()}
                        </p>
                    </div>
                )}

                {/* City */}
                {formData.city.trim() && (
                    <div className="rounded-2xl bg-white/70 p-4 border border-[#1C2B2D]/6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#1C2B2D]/50">
                            <MapPin size={13} />
                            {ru ? 'Район' : 'Location'}
                        </div>
                        <p className="text-sm text-[#1C2B2D]/85">{formData.city.trim()}</p>
                    </div>
                )}

                {/* Working conditions */}
                {advancedLines.length > 0 && (
                    <div className="rounded-2xl bg-white/70 p-4 border border-[#1C2B2D]/6">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#1C2B2D]/50">
                            <Settings2 size={13} />
                            {ru ? 'Условия работы' : 'Working conditions'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {advancedLines.map((line, i) => (
                                <span
                                    key={i}
                                    className="rounded-full bg-[#EFF3F2] px-3 py-1 text-xs font-medium text-[#1C2B2D]/70"
                                >
                                    {line}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <p className="text-xs leading-relaxed text-[#1C2B2D]/40 text-center px-2">
                    {ru
                        ? 'Персональные данные защищены. Менеджер свяжется в течение 24 часов.'
                        : 'Your personal data is protected. A manager will contact you within 24 hours.'}
                </p>
            </div>

            <div className="p-5 border-t border-[#1C2B2D]/8 space-y-3">
                <Button onClick={onConfirm} pulse>
                    {ru ? 'Всё верно — продолжить' : 'Looks good — continue'}
                </Button>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-sm text-[#1C2B2D]/50 hover:text-[#1C2B2D] transition-colors"
                >
                    {ru ? 'Вернуться и исправить' : 'Go back and edit'}
                </button>
            </div>
        </ModalShell>
    );
};
