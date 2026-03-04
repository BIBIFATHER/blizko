import React from 'react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Input, Textarea, ChipGroup } from '../../UI';
import { t } from '../../../src/core/i18n/translations';
import { Language } from '../../../types';

interface Props {
    lang: Language;
}

export const Step2_Experience: React.FC<Props> = ({ lang }) => {
    const text = t[lang];
    const {
        formData, setFormData,
        childAges, setChildAges,
        skills, setSkills,
        advanced, setAdvanced,
        prevStep, nextStep
    } = useNannyForm();

    const isFormValid = formData.experience.trim() !== '' && formData.schedule.trim() !== '' && formData.expectedRate.trim() !== '' && formData.about.trim() !== '';

    const sectionLabel = "flex items-center gap-3 text-xs uppercase tracking-wider text-stone-400 font-semibold";

    return (
        <div className="animate-fade-in space-y-6">
            <div className={sectionLabel}>
                <span className="h-px flex-1 bg-stone-200/70" />
                Опыт и Навыки
                <span className="h-px flex-1 bg-stone-200/70" />
            </div>

            <Input
                label={`${text.expLabel} *`}
                type="number"
                placeholder="5"
                value={formData.experience}
                onChange={e => setFormData({ ...formData, experience: e.target.value })}
                required
            />

            <Input
                label={lang === 'ru' ? 'График работы *' : 'Work schedule *'}
                placeholder={lang === 'ru' ? '5/2, 09:00–18:00' : 'Mon-Fri, 09:00-18:00'}
                value={formData.schedule}
                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                required
            />

            <Input
                label={lang === 'ru' ? 'Желаемая ставка *' : 'Expected rate *'}
                placeholder={lang === 'ru' ? '700 ₽/час или 120 000 ₽/мес' : '€15/hour or $2500/month'}
                value={formData.expectedRate}
                onChange={e => setFormData({ ...formData, expectedRate: e.target.value })}
                required
            />

            <ChipGroup
                label={text.agesLabel}
                options={text.ageOptions}
                selected={childAges}
                onChange={setChildAges}
            />

            <ChipGroup
                label={text.skillsLabel}
                options={text.skillOptions}
                selected={skills}
                onChange={setSkills}
            />

            <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-violet-700 mb-2">Дополнительные параметры</div>
                <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select className="text-xs border rounded px-2 py-2 bg-white" value={advanced.cameras} onChange={(e) => setAdvanced((p) => ({ ...p, cameras: e.target.value }))}>
                        <option value="ok">Камеры: готова</option>
                        <option value="not_ok">Камеры: нежелательно</option>
                    </select>
                    <select className="text-xs border rounded px-2 py-2 bg-white" value={advanced.travel} onChange={(e) => setAdvanced((p) => ({ ...p, travel: e.target.value }))}>
                        <option value="yes">Поездки: готова</option>
                        <option value="no">Поездки: не готова</option>
                    </select>
                    <select className="text-xs border rounded px-2 py-2 bg-white" value={advanced.household} onChange={(e) => setAdvanced((p) => ({ ...p, household: e.target.value }))}>
                        <option value="light">Дом: лёгкая помощь</option>
                        <option value="none">Дом: без помощи</option>
                        <option value="extended">Дом: расширенная помощь</option>
                    </select>
                    <select className="text-xs border rounded px-2 py-2 bg-white" value={advanced.pets} onChange={(e) => setAdvanced((p) => ({ ...p, pets: e.target.value }))}>
                        <option value="ok">Животные: ок</option>
                        <option value="allergy">Животные: аллергия/нежелательно</option>
                    </select>
                    <select className="text-xs border rounded px-2 py-2 bg-white" value={advanced.night} onChange={(e) => setAdvanced((p) => ({ ...p, night: e.target.value }))}>
                        <option value="sometimes">Ночные смены: иногда</option>
                        <option value="yes">Ночные смены: да</option>
                        <option value="no">Ночные смены: нет</option>
                    </select>
                </div>
            </div>

            <Textarea
                label={`${text.aboutLabel} *`}
                placeholder={lang === 'ru' ? "Люблю детей, добрая..." : "I love children, kind..."}
                value={formData.about}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
                required
            />

            <div className="flex gap-4 mt-8">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep} disabled={!isFormValid}>
                    {lang === 'ru' ? 'Далее' : 'Next'}
                </Button>
            </div>
        </div>
    );
};
