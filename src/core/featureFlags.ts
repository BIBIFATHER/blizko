export const FEATURE_FLAGS = {
  nannyMatching: String(import.meta.env.VITE_FLAG_NANNY_MATCHING ?? 'false') === 'true',
  nannyMessaging: String(import.meta.env.VITE_FLAG_NANNY_MESSAGING ?? 'false') === 'true',
};

export const isFlagEnabled = (key: keyof typeof FEATURE_FLAGS) => {
  return FEATURE_FLAGS[key] === true;
};
