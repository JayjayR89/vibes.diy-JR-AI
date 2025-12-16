import type { LlmConfig } from "./types.js";

export const pollinationsConfig: LlmConfig = {
  name: "pollinations",
  label: "Pollinations.ai",
  llmsTxtUrl: "https://enter.pollinations.ai/api/docs",
  module: "pollinations",
  description: "Free AI models for image, text, and audio generation",
  importModule: "pollinations",
  importName: "default",
  importType: "default",
};

