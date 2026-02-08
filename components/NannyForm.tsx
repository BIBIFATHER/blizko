import React, { useState, useEffect } from 'react';
import { Button, Input, Textarea, ChipGroup, Card } from './UI';
import { NannyProfile, Language, SoftSkillsProfile, DocumentVerification, NormalizedResume } from '../types';
import { ArrowLeft, ShieldCheck, Check, BrainCircuit, Video, PlayCircle, FileText, Upload, Camera, MapPin } from 'lucide-react';
import { GosUslugiModal } from './GosUslugiModal';
import { BehavioralTestModal } from './BehavioralTestModal';
import { VideoRecorderModal } from './VideoRecorderModal';
import { DocumentUploadModal } from './DocumentUploadModal';
import { NannyOfferModal } from './NannyOfferModal';
import { t } from '../src/core/i18n/translations';

interface NannyFormProps {
  onSubmit: (data: Partial<NannyProfile>) => void;
  onBack: () => void;
  lang: Language;
  initialData?: NannyProfile;
}

export const NannyForm: React.FC<NannyFormProps> = ({ onSubmit, onBack, lang, initialData }) => {
  const text = t[lang];
  const [loading, setLoading] = useState(false);
  
  // Modals
  const [showGosUslugi, setShowGosUslugi] = useState(false);
  const [showAssessment, setShowAssessment] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showOffer, setShowOffer] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  
  // Data States
  const [isVerified, setIsVerified] = useState(false);
  const [softSkills, setSoftSkills] = useState<SoftSkillsProfile | undefined>(undefined);
  const [documents, setDocuments] = useState<DocumentVerification[]>([]);
  const [resumeNormalized, setResumeNormalized] = useState<NormalizedResume | undefined>(undefined);
  
  // Media States
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [videoUrl, setVideoUrl] = useState<string | undefined>(undefined);

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    experience: '',
    about: '',
    contact: ''
  });
  
  const [childAges, setChildAges] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Initialize data if editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        city: initialData.city || '',
        experience: initialData.experience || '',
        about: initialData.about || '',
        contact: initialData.contact || ''
      });
      setChildAges(initialData.childAges || []);
      setSkills(initialData.skills || []);
      setPhoto(initialData.photo);
      setVideoUrl(initialData.video);
      setIsVerified(initialData.isVerified);
      setSoftSkills(initialData.softSkills);
      setDocuments(initialData.documents || []);
      setResumeNormalized(initialData.resumeNormalized);
    }
  }, [initialData]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialData) {
      // Show offer only for new registrations
      setShowOffer(true);
    } else {
      // Direct submit for edits
      submitData();
    }
  };

  const submitData = () => {
    setLoading(true);
    setTimeout(() => {
      onSubmit({
        ...initialData, // preserve ID if editing
        ...formData,
        photo,
        childAges,
        skills,
        isVerified,
        softSkills,
        video: videoUrl,
        videoIntro: !!videoUrl,
        documents,
        resumeNormalized,
      });
      setLoading(false);
    }, 600);
  };

  const handleOfferAccept = () => {
    setShowOffer(false);
    submitData();
  };

  const handleVerificationSuccess = () => {
    setShowGosUslugi(false);
    setIsVerified(true);
    if (!formData.name) {
      setFormData(prev => ({ ...prev, name: lang === 'ru' ? 'Елена Смирнова (Подтверждено)' : 'Elena Smirnova (Verified)' }));
    }
  };

  const handleAssessmentComplete = (result: SoftSkillsProfile) => {
    setSoftSkills(result);
    setShowAssessment(false);
  };

  const handleVideoSaved = (url: string) => {
    setVideoUrl(url);
    setShowVideoRecorder(false);
  };

  const handleDocumentVerified = (doc: DocumentVerification) => {
    setDocuments(prev => [...prev, doc]);

    if (doc.type === 'resume' && doc.normalizedResume) {
      const r = doc.normalizedResume;
      setResumeNormalized(r);

      // Автозаполняем только при достаточно уверенном распознавании
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

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhoto(ev.target.result as string);
        }
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const detectLocation = async () => {
    if (!navigator.geolocation) {
      alert(lang === 'ru' ? 'Геолокация не поддерживается браузером' : 'Geolocation is not supported');
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=${lang}`;
          const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
          const data = await r.json().catch(() => null);

          const city = data?.address?.city || data?.address?.town || data?.address?.village || '';
          const district = data?.address?.suburb || data?.address?.city_district || data?.address?.neighbourhood || '';
          const value = [city, district].filter(Boolean).join(', ');

          setFormData((prev) => ({ ...prev, city: value || prev.city }));
          if (!value) {
            alert(lang === 'ru' ? 'Не удалось определить город/район автоматически' : 'Could not detect city/district automatically');
          }
        } catch {
          alert(lang === 'ru' ? 'Ошибка при определении местоположения' : 'Location detection failed');
        } finally {
          setDetectingLocation(false);
        }
      },
      () => {
        setDetectingLocation(false);
        alert(lang === 'ru' ? 'Нет доступа к геолокации' : 'Location permission denied');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    const q = formData.city.trim();
    if (q.length < 3) {
      setCitySuggestions([]);
      return;
    }

    const tmr = setTimeout(async () => {
      try {
        const nr = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=5`);
        const nj = await nr.json().catch(() => []);
        const list = (Array.isArray(nj) ? nj : [])
          .map((x: any) => x?.display_name)
          .filter(Boolean)
          .slice(0, 5);

        setCitySuggestions(list);
      } catch {
        setCitySuggestions([]);
      }
    }, 350);

    return () => clearTimeout(tmr);
  }, [formData.city]);

  return (
    <div className="animate-slide-up relative">
      <button onClick={onBack} className="text-stone-400 hover:text-stone-800 mb-6 flex items-center gap-2">
        <ArrowLeft size={20} /> {text.back}
      </button>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">
          {initialData ? (lang === 'ru' ? 'Редактирование профиля' : 'Edit Profile') : text.nFormTitle}
        </h2>
        <p className="text-stone-500">{text.nFormSubtitle}</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        
        {/* 0. Photo Upload Block */}
        <div className="flex justify-center mb-6">
           <label className="relative cursor-pointer group">
             <div className={`w-32 h-32 rounded-full overflow-hidden border-4 flex items-center justify-center transition-all ${photo ? 'border-amber-300' : 'border-stone-200 bg-stone-100'}`}>
               {photo ? (
                 <img src={photo} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <Camera size={40} className="text-stone-400" />
               )}
               {/* Overlay on hover */}
               <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                 <Camera size={24} className="text-white" />
               </div>
             </div>
             <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
             <div className="text-center mt-2 text-sm text-stone-500 font-medium">
               {photo ? text.changePhoto : text.uploadPhoto}
             </div>
           </label>
        </div>

        {/* 1. Verification Block */}
        <Card className={`transition-all duration-300 ${isVerified ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${isVerified ? 'bg-green-200 text-green-700' : 'bg-stone-100 text-stone-400'}`}>
              <ShieldCheck size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-800 mb-1">
                {isVerified ? text.verifiedTitle : text.verificationTitle}
              </h3>
              <p className="text-sm text-stone-500 mb-3">
                {isVerified 
                  ? text.verifiedDesc
                  : text.verificationDesc}
              </p>
              
              {!isVerified && (
                <button
                  type="button"
                  onClick={() => setShowGosUslugi(true)}
                  className="text-sm font-medium text-[#0D4CD3] bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
                >
                  {text.loginGos}
                </button>
              )}
              
              {isVerified && (
                <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                  <Check size={16} /> {text.verifiedBadge}
                </div>
              )}
            </div>
          </div>
        </Card>
        
        {/* 2. Documents Upload Block */}
        <Card className={`transition-all duration-300 ${documents.length > 0 ? 'bg-sky-50 border-sky-200' : 'bg-white'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${documents.length > 0 ? 'bg-sky-200 text-sky-700' : 'bg-stone-100 text-stone-400'}`}>
              <FileText size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-800 mb-1">
                {text.docsTitle}
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
                           {doc.type === 'passport'
                             ? 'Паспорт'
                             : doc.type === 'medical_book'
                             ? 'Медкнижка'
                             : doc.type === 'recommendation_letter'
                             ? 'Рекомендация'
                             : doc.type === 'education_document'
                             ? 'Образование'
                             : doc.type === 'resume'
                             ? 'Резюме'
                             : 'Документ'}
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

        {/* 3. Soft Skills Assessment Block */}
        <Card className={`transition-all duration-300 ${softSkills ? 'bg-amber-50 border-amber-200' : 'bg-white'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${softSkills ? 'bg-amber-200 text-amber-700' : 'bg-stone-100 text-stone-400'}`}>
              <BrainCircuit size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-800 mb-1">
                {softSkills ? text.testResultTitle : text.softSkillsTitle}
              </h3>
              
              {!softSkills && (
                <>
                  <p className="text-sm text-stone-500 mb-3">{text.softSkillsDesc}</p>
                  <button
                    type="button"
                    onClick={() => setShowAssessment(true)}
                    className="text-sm font-medium text-amber-700 bg-amber-100 px-4 py-2 rounded-lg hover:bg-amber-200 transition-colors"
                  >
                    {text.startTest}
                  </button>
                </>
              )}

              {softSkills && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 text-sm text-amber-700 font-medium mb-2">
                    <Check size={16} /> {text.testCompletedBadge}
                  </div>
                  <div className="bg-white/60 p-3 rounded-lg text-xs text-stone-600 italic leading-relaxed border border-amber-100">
                    "{softSkills.summary}"
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 4. Video Interview Block */}
        <Card className={`transition-all duration-300 ${videoUrl ? 'bg-purple-50 border-purple-200' : 'bg-white'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${videoUrl ? 'bg-purple-200 text-purple-700' : 'bg-stone-100 text-stone-400'}`}>
              <Video size={24} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-stone-800 mb-1">
                {text.videoTitle}
              </h3>
              
              {!videoUrl && (
                <>
                  <p className="text-sm text-stone-500 mb-3">{text.videoDesc}</p>
                  <button
                    type="button"
                    onClick={() => setShowVideoRecorder(true)}
                    className="text-sm font-medium text-purple-700 bg-purple-100 px-4 py-2 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2"
                  >
                    <PlayCircle size={16} /> {text.recordVideo}
                  </button>
                </>
              )}

              {videoUrl && (
                <div className="animate-fade-in">
                  <div className="flex items-center gap-2 text-sm text-purple-700 font-medium mb-2">
                    <Check size={16} /> {text.videoRecorded}
                  </div>
                  <div className="bg-white/60 p-2 rounded-lg flex items-center gap-3 border border-purple-100">
                     <div className="w-10 h-10 bg-stone-900 rounded flex items-center justify-center">
                       <PlayCircle size={16} className="text-white" />
                     </div>
                     <span className="text-xs text-stone-500">video_intro.mp4 (00:30)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Input 
          label={text.nameLabel}
          placeholder={lang === 'ru' ? "Мария Иванова" : "Maria Ivanova"}
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          required
        />

        <div className="relative">
          <Input 
            label={text.cityLabel}
            placeholder={lang === 'ru' ? "Москва, ЮАО" : "London, Soho"}
            value={formData.city}
            onChange={e => {
              setFormData({...formData, city: e.target.value});
              setShowCitySuggestions(true);
            }}
            required
          />

          {showCitySuggestions && citySuggestions.length > 0 && (
            <div className="mt-1 border border-stone-200 rounded-lg bg-white shadow-sm max-h-40 overflow-auto">
              {citySuggestions.map((s, i) => (
                <button
                  key={`${s}-${i}`}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, city: s }));
                    setShowCitySuggestions(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-stone-50"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLocation}
            className={`mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${detectingLocation ? 'bg-stone-100 text-stone-400' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'}`}
          >
            <MapPin size={14} />
            {detectingLocation
              ? (lang === 'ru' ? 'Определяем...' : 'Detecting...')
              : (lang === 'ru' ? 'Определить местоположение' : 'Detect location')}
          </button>
        </div>

        <Input 
          label={text.expLabel}
          type="number"
          placeholder="5" 
          value={formData.experience}
          onChange={e => setFormData({...formData, experience: e.target.value})}
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

        <Textarea 
          label={text.aboutLabel}
          placeholder={lang === 'ru' ? "Люблю детей, добрая..." : "I love children, kind..."}
          value={formData.about}
          onChange={e => setFormData({...formData, about: e.target.value})}
          required
        />

        <Input 
          label={text.contactLabel}
          placeholder="+7 900 000 00 00" 
          value={formData.contact}
          onChange={e => setFormData({...formData, contact: e.target.value})}
          required
        />

        <Button type="submit" isLoading={loading} className="mt-8">
          {initialData ? (lang === 'ru' ? 'Сохранить изменения' : 'Save Changes') : text.submitNanny}
        </Button>
      </form>

      {showGosUslugi && (
        <GosUslugiModal 
          onClose={() => setShowGosUslugi(false)} 
          onSuccess={handleVerificationSuccess} 
          lang={lang}
        />
      )}

      {showAssessment && (
        <BehavioralTestModal 
          onClose={() => setShowAssessment(false)}
          onComplete={handleAssessmentComplete}
          lang={lang}
          candidateInfo={{
            experience: formData.experience,
            about: formData.about
          }}
        />
      )}

      {showVideoRecorder && (
        <VideoRecorderModal
          onClose={() => setShowVideoRecorder(false)}
          onSave={handleVideoSaved}
          lang={lang}
        />
      )}

      {showDocUpload && (
        <DocumentUploadModal
          onClose={() => setShowDocUpload(false)}
          onVerify={handleDocumentVerified}
          lang={lang}
        />
      )}

      {showOffer && (
        <NannyOfferModal
          onClose={() => setShowOffer(false)}
          onAccept={handleOfferAccept}
          lang={lang}
        />
      )}
    </div>
  );
};