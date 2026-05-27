import React, { useState } from 'react';
import { useNannyForm } from './NannyFormProvider';
import { Button, Input, Textarea, ChipGroup } from '../../UI';
import { VideoRecorderModal } from '../../VideoRecorderModal';
import { Video, CheckCircle2 } from 'lucide-react';
import { t } from '@/core/i18n/translations';
import { Language } from '@/core/types';

interface Props {
  lang: Language;
}

export const Step2_Experience: React.FC<Props> = ({ lang }) => {
  const text = t[lang];
  const [showVideoModal, setShowVideoModal] = useState(false);
  const {
    formData,
    setFormData,
    childAges,
    setChildAges,
    skills,
    setSkills,
    advanced,
    setAdvanced,
    prevStep,
    nextStep,
  } = useNannyForm();

  const isFormValid =
    formData.experience.trim() !== '' &&
    formData.schedule.trim() !== '' &&
    formData.expectedRate.trim() !== '' &&
    formData.about.trim() !== '';

  return (
    <div className="animate-fade-in space-y-6 pb-32">
      <div className="section-label">
        {lang === 'ru'
          ? 'Ваш опыт и то, что вас отличает'
          : 'Your experience and what makes you stand out'}
      </div>
      <p className="text-sm text-stone-500 mb-2">
        {lang === 'ru'
          ? 'Вы уже познакомились с нами — теперь расскажите семьям, что вы умеете.'
          : "You've introduced yourself — now tell families what you can do."}
      </p>

      <Input
        label={`${lang === 'ru' ? 'Сколько лет вы работаете с детьми?' : 'How many years of experience do you have?'} *`}
        type="number"
        placeholder="5"
        value={formData.experience}
        onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
        required
      />

      <Input
        label={`${lang === 'ru' ? 'Какой график работы вам подходит?' : 'What schedule suits you best?'} *`}
        placeholder={lang === 'ru' ? '5/2, 09:00–18:00' : 'Mon-Fri, 09:00-18:00'}
        value={formData.schedule}
        onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
        required
      />

      <Input
        label={`${lang === 'ru' ? 'На какую ставку вы рассчитываете?' : 'What is your expected rate?'} *`}
        placeholder={lang === 'ru' ? '700 ₽/час или 120 000 ₽/мес' : '€15/hour or $2500/month'}
        value={formData.expectedRate}
        onChange={(e) => setFormData({ ...formData, expectedRate: e.target.value })}
        required
      />

      <ChipGroup
        label={
          lang === 'ru'
            ? 'С детьми какого возраста вы готовы работать?'
            : 'Which ages are you ready to work with?'
        }
        options={text.ageOptions}
        selected={childAges}
        onChange={setChildAges}
      />

      <ChipGroup
        label={lang === 'ru' ? 'Ваши сильные стороны' : 'Your strengths'}
        options={text.skillOptions}
        selected={skills}
        onChange={setSkills}
      />

      <div className="border-t border-stone-100 my-2" />
      <div className="section-label">
        {lang === 'ru'
          ? 'С какой семьей вам будет комфортно?'
          : 'What kind of family are you comfortable with?'}
      </div>
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
        options={
          lang === 'ru' ? ['Легкая', 'Расширенная', 'Без помощи'] : ['Light', 'Extended', 'None']
        }
        selected={advanced.household ? [advanced.household] : []}
        onChange={(s) => setAdvanced((p) => ({ ...p, household: s[0] || '' }))}
        single
      />
      <ChipGroup
        label={lang === 'ru' ? 'Животные в доме' : 'Pets'}
        options={lang === 'ru' ? ['Готова', 'Аллергия / нет'] : ['Ready', 'Allergy / No']}
        selected={advanced.pets ? [advanced.pets] : []}
        onChange={(s) => setAdvanced((p) => ({ ...p, pets: s[0] || '' }))}
        single
      />
      <ChipGroup
        label={lang === 'ru' ? 'Ночные смены' : 'Night shifts'}
        options={
          lang === 'ru' ? ['Да', 'Иногда', 'Только в день'] : ['Yes', 'Sometimes', 'Only days']
        }
        selected={advanced.night ? [advanced.night] : []}
        onChange={(s) => setAdvanced((p) => ({ ...p, night: s[0] || '' }))}
        single
      />

      <Textarea
        label={`${lang === 'ru' ? 'Расскажите о себе — что важно вам в работе с детьми?' : 'Tell us about yourself — what matters to you when working with children?'} *`}
        placeholder={
          lang === 'ru'
            ? 'Расскажите, что для вас важно в работе с детьми, как вы строите контакт, что даёт вам энергию...'
            : 'Tell us what matters to you, how you connect with children, what gives you energy in this work...'
        }
        value={formData.about}
        onChange={(e) => setFormData({ ...formData, about: e.target.value })}
        required
      />

      <div className="border-t border-stone-100 my-2" />
      <div className="section-label">
        {lang === 'ru' ? 'Видеовизитка' : 'Video intro'}
      </div>
      <p className="text-sm text-stone-500 mb-2">
        {lang === 'ru'
          ? 'Короткое видео помогает семьям почувствовать вашу манеру общения. Необязательно, но повышает доверие.'
          : 'A short video helps families sense your manner. Optional, but it builds trust.'}
      </p>

      {formData.video ? (
        <div className="flex items-center justify-between gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{lang === 'ru' ? 'Визитка записана' : 'Video intro recorded'}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            className="shrink-0"
            onClick={() => setShowVideoModal(true)}
          >
            {lang === 'ru' ? 'Перезаписать' : 'Re-record'}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
          onClick={() => setShowVideoModal(true)}
        >
          <Video size={18} />
          {lang === 'ru' ? 'Записать видео' : 'Record video'}
        </Button>
      )}

      <div className="bg-[#EFF3F2] border border-[#7FA99B]/30 rounded-xl p-3 text-sm text-[#1C2B2D] mt-6 animate-fade-in">
        <div>
          {lang === 'ru'
            ? 'Этот рассказ помогает семьям понять, подходите ли вы друг другу — ещё до первого звонка.'
            : "This helps families understand if you're a good fit — even before the first call."}
        </div>
      </div>

      {showVideoModal && (
        <VideoRecorderModal
          lang={lang}
          onClose={() => setShowVideoModal(false)}
          onSave={(url) => {
            setFormData((prev) => ({ ...prev, video: url }));
            setShowVideoModal(false);
          }}
        />
      )}

      <div className="sticky-action-rail sticky-footer-fade flex gap-4">
        <Button type="button" variant="outline" className="flex-1" onClick={prevStep}>
          {lang === 'ru' ? 'Назад' : 'Back'}
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={nextStep}
          disabled={!isFormValid}
          pulse={isFormValid}
        >
          {lang === 'ru' ? 'Продолжить' : 'Continue'}
        </Button>
      </div>
    </div>
  );
};
