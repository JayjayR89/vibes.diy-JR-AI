export interface HistoryMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * User settings for the application
 */
export interface UserSettings {
  /** Document ID for the settings document */
  _id: string;

  /** Custom style prompt for UI generation */
  stylePrompt?: string;

  /** Custom user instructions to append to the system prompt */
  userPrompt?: string;

  /** AI model to use for code generation */
  model?: string;

  /** Whether to show the per‑chat model picker in the chat UI */
  showModelPickerInChat?: boolean; // default false

  history?: HistoryMessage[];

  dependenciesUserOverride?: boolean;

  dependencies?: string[];

  demoDataOverride?: boolean;

  // Puter.js settings
  puterAuthToken?: string;
  puterAIModel?: string;
  enablePuterHosting?: boolean;
  puterHostingEnabled?: boolean;

  // Pollinations.ai settings
  pollinationsAIModel?: string;
  enablePollinationsHosting?: boolean;
  pollinationsHostingEnabled?: boolean;
}
