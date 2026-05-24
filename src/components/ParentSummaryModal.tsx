import React from 'react';
import { Button, ModalShell } from './UI';
import { CalendarDays, Clock3, Heart, MapPin, ShieldCheck, Sparkles, X } from 'lucide-react';
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

    const ageLine = formData.childAge
        ? (ru ? `Ребёнок: ${formData.childAge}` : `Child: ${formData.childAge}`)
        : null;
    const scheduleLine = formData.schedule
        ? (ru ? `График: ${formData.schedule}` : `Schedule: ${formData.schedule}`)
        : null;
    const storySnippet = formData.comment?.trim().slice(0, 120);
    const budgetLine = formData.budgetHourly
        ? `${formData.budgetHourly}${formData.budgetMonthly ? ` · ${formData.budgetMonthly}` : ''}`
        : null;

    const conditionTags: string[] = [];
    if (advanced.cameras && advanced.cameras !== 'ok') conditionTags.push(ru ? 'Без камер' : 'No cameras');
    if (advanced.household) conditionTags.push(ru ? `Помощь по дому: ${advanced.household}` : `Household: ${advanced.household}`);
    if (advanced.pets) conditionTags.push(ru ? `Животные: ${advanced.pets}` : `Pets: ${advanced.pets}`);
    if (formData.isNannySharing) conditionTags.push(ru ? 'Nanny Sharing' : 'Nanny Sharing');

    return (
        <ModalShell variant="card" className="z-80" panelClassName="bg-[#F9F6F2]/95 backdrop-blur-xl">
            <div className="flex items-center justify-between border-b border-[#1C2B2D]/8 p-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <Heart size={18} />
                    </div>
                    <div>
                        <h3 className="text-base font-semibold text-[#1C2B2D]">
                            {ru ? 'Мы вас поняли' : "We’ve got it"}
                        </h3>
                        <p className="text-xs text-[#1C2B2D]/50">
                            {ru ? 'Куратор прочитает лично' : 'A curator reads this personally'}
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

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {/* Card 1: Мы поняли */}
                <div className="rounded-2xl bg-white/70 p-4 border border-[#1C2B2D]/6">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-600">
                        <Sparkles size={13} />
                        {ru ? 'Мы поняли' : 'What we heard'}
                    </div>
                    <div className="space-y-1.5">
                        {ageLine && (
                            <p className="text-sm text-[#1C2B2D]/80">{ageLine}</p>
                        )}
                        {scheduleLine && (
                            <p className="text-sm text-[#1C2B2D]/80">{scheduleLine}</p>
                        )}
                        {storySnippet && (
                            <p className="text-sm leading-relaxed text-[#1C2B2D]/65 italic">
                                «{storySnippet}{formData.comment.trim().length > 120 ? '…' : ''}»
                            </p>
                        )}
                        {!ageLine && !scheduleLine && !storySnippet && (
                            <p className="text-sm text-[#1C2B2D]/50">
                                {ru ? 'Ваш запрос принят' : 'Your request received'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Card 2: Что учтём */}
                <div className="rounded-2xl bg-white/70 p-4 border border-[#1C2B2D]/6">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#2A6B6E]">
                        <ShieldCheck size={13} />
                        {ru ? 'Что учтём' : "What we'll match on"}
                    </div>
                    <div className="space-y-2">
                        {formData.city && (
                            <div className="flex items-center gap-2 text-sm text-[#1C2B2D]/70">
                                <MapPin size={13} className="shrink-0 text-[#1C2B2D]/30" />
                                {formData.city}
                            </div>
                        )}
                        {budgetLine && (
                            <div className="flex items-center gap-2 text-sm text-[#1C2B2D]/70">
                                <span className="shrink-0 text-[#1C2B2D]/30 text-xs">₽</span>
                                {budgetLine}
                            </div>
                        )}
                        {(formData.dateFrom || formData.dateTo) && (
                            <div className="flex items-center gap-2 text-sm text-[#1C2B2D]/70">
                                <CalendarDays size={13} className="shrink-0 text-[#1C2B2D]/30" />
                                {formData.dateFrom || '—'} → {formData.dateTo || '—'}
                            </div>
                        )}
                        {conditionTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                {conditionTags.map((tag, i) => (
                                    <span key={i} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-[#1C2B2D]/60">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                        {!formData.city && !budgetLine && !formData.dateFrom && conditionTags.length === 0 && (
                            <p className="text-sm text-[#1C2B2D]/40">
                                {ru ? 'Детали уточним при звонке' : 'Details to confirm by call'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Card 3: Что дальше */}
                <div className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/40">
                    <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-700">
                        <Clock3 size={13} />
                        {ru ? 'Что дальше' : 'What happens next'}
                    </div>
                    <p className="text-sm leading-relaxed text-[#1C2B2D]/70">
                        {ru
                            ? 'Куратор Blizko прочитает ваш запрос и позвонит — обычно в течение нескольких часов. Мы не передаём данные нянямбез вашего согласия.'
                            : "A Blizko curator will read your request and call you — usually within a few hours. We don't share your data with nannies without your consent."}
                    </p>
                </div>
            </div>

            <div className="p-5 border-t border-[#1C2B2D]/8 space-y-3">
                <Button onClick={onConfirm} pulse>
                    {ru ? 'Передать куратору' : 'Send to curator'}
                </Button>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 text-sm text-[#1C2B2D]/50 hover:text-[#1C2B2D] transition-colors"
                >
                    {ru ? 'Вернуться и уточнить' : 'Go back and edit'}
                </button>
            </div>
        </ModalShell>
    );
};
