export { LEARNING_PROMPTS } from "./catalog";
export { resolveWelcomePrompt } from "./resolve";
export { getPromptLanguageName } from "./language-name";
export {
  findPromptById,
  getEligiblePrompts,
  isPromptEligible,
  selectRandomPrompt,
} from "./select";
export {
  markWelcomeModalHidden,
  markWelcomeModalShown,
  persistPromptId,
  readLastPromptId,
  readRecentPromptIds,
  requestWelcomeModalOnLogin,
  shouldShowWelcomeModal,
  WELCOME_MODAL_COOLDOWN_MS,
} from "./storage";
export { getTimeOfDay } from "./time-of-day";
export type {
  PromptCategory,
  PromptContext,
  PromptDefinition,
  PromptType,
  TimeOfDay,
} from "./types";
