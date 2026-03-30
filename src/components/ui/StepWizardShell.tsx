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
    <div className="animate-slide-up relative">
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

      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-stone-800">{stepTitle}</h2>
        <div className="mt-3 flex items-center justify-between text-sm font-medium">
          <span className="text-amber-700">{stepHint}</span>
          <span className="text-stone-400">
            {currentStep} / {totalSteps}
          </span>
        </div>
      </div>

      {progress}

      {lockedNotice}

      <form className={formClassName} onSubmit={(e) => e.preventDefault()}>
        <div key={stepKey} className={direction === "back" ? "step-enter-back" : "step-enter"}>
          {children}
        </div>
      </form>
    </div>
  );
};
