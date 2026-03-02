import React, { useState } from 'react';
import { Button } from './UI';
import { X, BrainCircuit } from 'lucide-react';
import { Language, SoftSkillsProfile } from '../types';
import { t } from '../src/core/i18n/translations';
import { assessmentItems, analyzeAssessment } from '../services/assessment';

interface BehavioralTestModalProps {
  onClose: () => void;
  onComplete: (profile: SoftSkillsProfile) => void;
  lang: Language;
}

export const BehavioralTestModal: React.FC<BehavioralTestModalProps> = ({ onClose, onComplete, lang }) => {
  const text = t[lang];
  const [step, setStep] = useState(0); 
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [analyzing, setAnalyzing] = useState(false);

  const currentItem = assessmentItems[step - 1];
  const totalItems = assessmentItems.length;

  const handleAnswer = (val: string) => {
    if (!currentItem) return;
    setAnswers(prev => ({ ...prev, [currentItem.id]: val }));
  };

  const handleNext = async () => {
    if (step < totalItems) {
      setStep(prev => prev + 1);
    } else {
      setAnalyzing(true);
      const result = await analyzeAssessment(answers, lang);
      onComplete(result);
    }
  };

  const getSectionTitle = () => {
    if (!currentItem) return '';
    if (currentItem.type === 'likert') return text.sectionLikert;
    if (currentItem.type === 'scenario') return text.sectionScenario;
    if (currentItem.type === 'text') return text.sectionReflect;
    return '';
  };

  // --- Intro Screen ---
  if (step === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
          <div className="p-4 flex justify-end">
            <button onClick={onClose}><X className="text-stone-400 hover:text-stone-800" /></button>
          </div>
          <div className="px-6 pb-8 text-center flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
              <BrainCircuit size={32} />
            </div>
            <h3 className="text-xl font-bold text-stone-800 mb-2">{text.assessModalTitle}</h3>
            <p className="text-stone-500 font-medium mb-4">{text.assessModalSubtitle}</p>
            
            <p className="text-stone-600 text-sm mb-6 leading-relaxed">
              {text.assessIntroText}
            </p>

            <div className="bg-stone-50 p-4 rounded-xl text-[10px] text-stone-400 text-center mb-6 leading-relaxed border border-stone-100">
              {text.assessDisclaimer}
            </div>

            <Button onClick={() => setStep(1)}>{text.startTest}</Button>
          </div>
        </div>
      </div>
    );
  }

  // --- Analysis Loading Screen ---
  if (analyzing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
        <div className="bg-white w-full max-w-sm rounded-2xl p-8 text-center animate-slide-up">
           <div className="w-12 h-12 border-4 border-amber-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
           <p className="text-stone-600 font-medium animate-pulse">{text.assessAnalyzing}</p>
        </div>
      </div>
    );
  }

  // --- Question Screens ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
        {/* Progress Bar */}
        <div className="w-full bg-stone-100 h-1.5">
          <div 
            className="bg-amber-400 h-1.5 transition-all duration-300" 
            style={{ width: `${(step / totalItems) * 100}%` }}
          />
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">
              {getSectionTitle()}
            </span>
            <span className="text-xs text-stone-300 font-mono">
              {step}/{totalItems}
            </span>
          </div>
          
          <h3 className="text-lg font-medium text-stone-800 mb-8 leading-snug">
            {currentItem.text[lang]}
          </h3>

          <div className="space-y-4">
            
            {/* RENDER: Likert Scale 1-5 */}
            {currentItem.type === 'likert' && (
              <div className="space-y-4">
                <div className="flex justify-between text-xs text-stone-400 px-1">
                  <span>{text.scaleDisagree}</span>
                  <span>{text.scaleAgree}</span>
                </div>
                <div className="flex justify-between gap-2">
                  {[1, 2, 3, 4, 5].map((val) => {
                    const isSelected = answers[currentItem.id] === String(val);
                    return (
                      <button
                        key={val}
                        onClick={() => handleAnswer(String(val))}
                        className={`w-full aspect-square rounded-lg font-medium transition-all ${
                          isSelected 
                            ? 'bg-amber-400 text-white shadow-md transform scale-105' 
                            : 'bg-stone-50 text-stone-600 hover:bg-stone-100 border border-stone-200'
                        }`}
                      >
                        {val}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* RENDER: Scenario Options */}
            {currentItem.type === 'scenario' && currentItem.options && (
              <div className="space-y-3">
                {currentItem.options.map(option => {
                  const isSelected = answers[currentItem.id] === option.id;
                  return (
                    <div 
                      key={option.id}
                      onClick={() => handleAnswer(option.id)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all text-sm leading-relaxed ${
                        isSelected 
                          ? 'border-amber-400 bg-amber-50' 
                          : 'border-stone-100 hover:border-stone-200'
                      }`}
                    >
                      {option.text[lang]}
                    </div>
                  );
                })}
              </div>
            )}

            {/* RENDER: Text Area */}
            {currentItem.type === 'text' && (
              <textarea
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-200/50 focus:border-amber-300 min-h-[120px]"
                placeholder="..."
                value={answers[currentItem.id] || ''}
                onChange={(e) => handleAnswer(e.target.value)}
              />
            )}

          </div>
        </div>

        <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-between items-center">
           <div className="text-[10px] text-stone-300 max-w-[50%] leading-tight hidden sm:block">
             {text.assessDisclaimer}
           </div>
          <Button 
            onClick={handleNext} 
            disabled={!answers[currentItem.id]}
            className="w-auto px-8"
          >
            {step === totalItems ? text.assessFinish : text.assessNext}
          </Button>
        </div>
      </div>
    </div>
  );
};