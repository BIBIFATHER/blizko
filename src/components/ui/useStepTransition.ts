import { useEffect, useReducer } from "react";

type TransitionState = {
  currentStep: number;
  direction: "forward" | "back";
  stepKey: number;
};

type TransitionAction = {
  nextStep: number;
};

const reducer = (
  state: TransitionState,
  action: TransitionAction
): TransitionState => {
  if (state.currentStep === action.nextStep) {
    return state;
  }

  return {
    currentStep: action.nextStep,
    direction: action.nextStep < state.currentStep ? "back" : "forward",
    stepKey: state.stepKey + 1,
  };
};

export const useStepTransition = (currentStep: number) => {
  const [transition, dispatch] = useReducer(reducer, {
    currentStep,
    direction: "forward" as const,
    stepKey: 0,
  });

  useEffect(() => {
    dispatch({ nextStep: currentStep });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  return {
    direction: transition.direction,
    stepKey: transition.stepKey,
  };
};
