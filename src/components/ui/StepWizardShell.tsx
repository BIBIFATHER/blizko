import React from "react";
import { ArrowLeft } from "lucide-react";

import { useStepTransition } from "./useStepTransition";

interface StepWizardShellProps {
  backLabel: string;
  children: React.ReactNode;
  currentStep: number;
  formClassName?: string;
  lockedNotice?: React.ReactNode;
  onBack: () => void;
  progress: React.ReactNode;
  stepHint: React.ReactNode;
  stepTitle: React.ReactNode;
  totalSteps: number;
}

export const StepWizardShell: React.FC<StepWizardShellProps> = ({
  backLabel,
  children,
  currentStep,
  formClassName = "",
  lockedNotice,
  onBack,
  progress,
  stepHint,
  stepTitle,
  totalSteps,
}) => {
  const { direction, stepKey } = useStepTransition(currentStep);

  return (
    <div className="animate-slide-up relative w-full">
      <div className="w-full px-4 sm:px-6 py-5">
        <div className="mb-5 flex items-center justify-between">
          <button
            className="text-stone-400 hover:text-stone-700 -ml-2 flex items-center gap-1.5 rounded-xl p-2 transition-colors hover:bg-stone-50 active:bg-stone-100"
            onClick={onBack}
            type="button"
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{backLabel}</span>
          </button>
        </div>

        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="wizard-step-chip">
              <span className="wizard-step-dot" />
              <span>{stepHint}</span>
            </div>
            <span className="step-badge">
              {currentStep} / {totalSteps}
            </span>
          </div>
          <h2 className="wizard-step-title">{stepTitle}</h2>
        </div>

        {progress}

        {lockedNotice}

        <form className={formClassName} onSubmit={(e) => e.preventDefault()}>
          <div key={stepKey} className={direction === "back" ? "step-enter-back" : "step-enter"}>
            {children}
          </div>
        </form>
      </div>
    </div>
  );
};
