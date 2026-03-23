import React from 'react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Input, Textarea, ChipGroup } from '../../UI';
import { t } from '@/core/i18n/translations';
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

    return (
        <div className="animate-fade-in space-y-6">
            <div className="section-label">
                {lang === 'ru' ? 'Ваш опыт и суперсилы' : 'Your experience and superpowers'}
            </div>

            <Input
                label={`${lang === 'ru' ? 'Сколько лет вы работаете с детьми?' : 'How many years of experience do you have?'} *`}
                type="number"
                placeholder="5"
                value={formData.experience}
                onChange={e => setFormData({ ...formData, experience: e.target.value })}
                required
            />

            <Input
                label={`${lang === 'ru' ? 'Какой график работы вам подходит?' : 'What schedule suits you best?'} *`}
                placeholder={lang === 'ru' ? '5/2, 09:00–18:00' : 'Mon-Fri, 09:00-18:00'}
                value={formData.schedule}
                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                required
            />

            <Input
                label={`${lang === 'ru' ? 'На какую ставку вы рассчитываете?' : 'What is your expected rate?'} *`}
                placeholder={lang === 'ru' ? '700 ₽/час или 120 000 ₽/мес' : '€15/hour or $2500/month'}
                value={formData.expectedRate}
                onChange={e => setFormData({ ...formData, expectedRate: e.target.value })}
                required
            />

            <ChipGroup
                label={lang === 'ru' ? 'С детьми какого возраста вы готовы работать?' : 'Which ages are you ready to work with?'}
                options={text.ageOptions}
                selected={childAges}
                onChange={setChildAges}
            />

            <ChipGroup
                label={lang === 'ru' ? 'В чем ваша суперсила? (навыки)' : 'What are your superpowers? (skills)'}
                options={text.skillOptions}
                selected={skills}
                onChange={setSkills}
            />

            <div className="section-label">{lang === 'ru' ? 'С какой семьей вам будет комфортно?' : 'What kind of family are you comfortable with?'}</div>
            <ChipGroup
                label={lang === 'ru' ? 'Видеонаблюдение' : 'Cameras'}
                options={lang === 'ru' ? ['Готова', 'Нежелательно'] : ['Ready', 'Not desired']}
                selected={advanced.cameras ? [advanced.cameras] : []}
                onChange={(s) => setAdvanced((p) => ({ ...p, cameras: s[0] || '' }))}
                single
            />
            <ChipGroup
                label={lang === 'ru' ? 'Поездки с семьей' : 'Travel with family'}
                options={lang === 'ru' ? ['Готова', 'Не готова'] : ['Ready', 'Not ready']}
                selected={advanced.travel ? [advanced.travel] : []}
                onChange={(s) => setAdvanced((p) => ({ ...p, travel: s[0] || '' }))}
                single
            />
            <ChipGroup
                label={lang === 'ru' ? 'Помощь по дому' : 'Household help'}
                options={lang === 'ru' ? ['Легкая', 'Расширенная', 'Без помощи'] : ['Light', 'Extended', 'None']}
                selected={advanced.household ? [advanced.household] : []}
                onChange={(s) => setAdvanced((p) => ({ ...p, household: s[0] || '' }))}
                single
            />
            <ChipGroup
                label={lang === 'ru' ? 'Животные в доме' : 'Pets'}
                options={lang === 'ru' ? ['Ок', 'Аллергия / Нет'] : ['Ok', 'Allergy / No']}
                selected={advanced.pets ? [advanced.pets] : []}
                onChange={(s) => setAdvanced((p) => ({ ...p, pets: s[0] || '' }))}
                single
            />
            <ChipGroup
                label={lang === 'ru' ? 'Ночные смены' : 'Night shifts'}
                options={lang === 'ru' ? ['Да', 'Иногда', 'Только в день'] : ['Yes', 'Sometimes', 'Only days']}
                selected={advanced.night ? [advanced.night] : []}
                onChange={(s) => setAdvanced((p) => ({ ...p, night: s[0] || '' }))}
                single
            />

            <Textarea
                label={`${lang === 'ru' ? 'Расскажите немного о себе. Какая вы?' : 'Tell us a bit about yourself'} *`}
                placeholder={lang === 'ru' ? "Люблю детей, добрая..." : "I love children, kind..."}
                value={formData.about}
                onChange={e => setFormData({ ...formData, about: e.target.value })}
                required
            />

            <div className="bg-white/60 backdrop-blur-sm border border-white/60 shadow-sm rounded-xl p-3 text-sm text-stone-600 mt-6 animate-fade-in">
                <div>{lang === 'ru' ? 'Это поле поможет нашему AI найти лучшие совпадения именно для вас.' : 'This field helps our AI find best matches specifically for you.'}</div>
            </div>

            <div className="sticky bottom-0 z-10 flex gap-4 mt-8 pt-6 pb-6 -mx-2 px-2 sticky-footer-fade">
                <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
                    {lang === 'ru' ? 'Назад' : 'Back'}
                </Button>
                <Button type="button" className="flex-1" onClick={nextStep} disabled={!isFormValid} pulse={isFormValid}>
                    {lang === 'ru' ? 'Осталось 2 шага' : '2 steps left'}
                </Button>
            </div>
        </div>
    );
};
