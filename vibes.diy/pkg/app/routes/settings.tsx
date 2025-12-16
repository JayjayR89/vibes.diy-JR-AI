import type { ChangeEvent } from "react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFireproof } from "use-fireproof";
import { useAuth as useClerkAuth, useClerk } from "@clerk/clerk-react";
import { BrutalistCard } from "../components/vibes/BrutalistCard.js";
import { VibesButton } from "../components/vibes/VibesButton/index.js";
import modelsList from "../data/models.json" with { type: "json" };
import puterModelsList from "../data/puter-models.json" with { type: "json" };
import pollinationsModelsList from "../data/pollinations-models.json" with { type: "json" };
import { VibesDiyEnv } from "../config/env.js";
import { UserSettings, stylePrompts } from "@vibes.diy/prompts";
import LoggedOutView from "../components/LoggedOutView.js";
import BrutalistLayout from "../components/BrutalistLayout.js";

export function meta() {
  return [
    { title: "Settings - Vibes DIY" },
    { name: "description", content: "Settings for AI App Builder" },
  ];
}

function SettingsContent() {
  const navigate = useNavigate();
  // Use the main database directly instead of through useSession
  const { useDocument } = useFireproof(VibesDiyEnv.SETTINGS_DBNAME());
  const { isSignedIn: isAuthenticated } = useClerkAuth();
  const { signOut } = useClerk();

  const {
    doc: settings,
    merge: mergeSettings,
    save: saveSettings,
  } = useDocument<UserSettings>({
    _id: "user_settings",
    stylePrompt: "",
    userPrompt: "",
    model: "",
  });

  // State to track unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const stylePromptInputRef = useRef<HTMLInputElement>(null);
  const modelInputRef = useRef<HTMLInputElement>(null);
  const puterModelInputRef = useRef<HTMLInputElement>(null);
  const pollinationsModelInputRef = useRef<HTMLInputElement>(null);

  // Check Puter authentication status
  const [puterAuthenticated, setPuterAuthenticated] = useState(false);
  useEffect(() => {
    // Check if Puter is available and authenticated
    if (typeof window !== "undefined" && (window as any).puter) {
      const puter = (window as any).puter;
      if (puter.auth && puter.auth.getToken) {
        puter.auth.getToken().then((token: string | null) => {
          setPuterAuthenticated(!!token);
          if (token && settings.puterAuthToken !== token) {
            mergeSettings({ puterAuthToken: token });
            setHasUnsavedChanges(true);
          }
        }).catch(() => {
          setPuterAuthenticated(false);
        });
      }
    }
  }, [settings.puterAuthToken, mergeSettings]);

  const handleStylePromptChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ stylePrompt: e.target.value });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings],
  );

  const handleStylePromptSelection = useCallback(
    (suggestion: { name: string; prompt: string }) => {
      const fullPrompt = `${suggestion.name} (${suggestion.prompt})`;
      mergeSettings({ stylePrompt: fullPrompt });
      setHasUnsavedChanges(true); // Track change

      setTimeout(() => {
        if (stylePromptInputRef.current) {
          stylePromptInputRef.current.focus();
          const length = stylePromptInputRef.current.value.length;
          stylePromptInputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    [mergeSettings],
  );

  const handleModelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ model: e.target.value });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings],
  );

  const handleModelSelection = useCallback(
    (model: { id: string; name: string; description: string }) => {
      mergeSettings({ model: model.id });
      setHasUnsavedChanges(true); // Track change

      setTimeout(() => {
        if (modelInputRef.current) {
          modelInputRef.current.focus();
          const length = modelInputRef.current.value.length;
          modelInputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    [mergeSettings],
  );

  const handleUserPromptChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      mergeSettings({ userPrompt: e.target.value });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings],
  );

  const handleSubmit = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await saveSettings({ ...settings });
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      navigate("/");
    } catch (err) {
      setSaveError((err as Error).message || "Failed to save settings");
    }
  }, [saveSettings, settings, navigate]);

  const handleLogout = useCallback(async () => {
    // Sign out with Clerk
    await signOut();
    // Navigate to home page after sign out
    navigate("/");
  }, [signOut, navigate]);

  const handleShowModelPickerInChatChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ showModelPickerInChat: e.target.checked });
      setHasUnsavedChanges(true); // Track change
    },
    [mergeSettings],
  );

  const handlePuterModelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ puterAIModel: e.target.value });
      setHasUnsavedChanges(true);
    },
    [mergeSettings],
  );

  const handlePuterModelSelection = useCallback(
    (model: { id: string; name: string; description: string }) => {
      mergeSettings({ puterAIModel: model.id });
      setHasUnsavedChanges(true);
      setTimeout(() => {
        if (puterModelInputRef.current) {
          puterModelInputRef.current.focus();
          const length = puterModelInputRef.current.value.length;
          puterModelInputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    [mergeSettings],
  );

  const handlePollinationsModelChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ pollinationsAIModel: e.target.value });
      setHasUnsavedChanges(true);
    },
    [mergeSettings],
  );

  const handlePollinationsModelSelection = useCallback(
    (model: { id: string; name: string; description: string }) => {
      mergeSettings({ pollinationsAIModel: model.id });
      setHasUnsavedChanges(true);
      setTimeout(() => {
        if (pollinationsModelInputRef.current) {
          pollinationsModelInputRef.current.focus();
          const length = pollinationsModelInputRef.current.value.length;
          pollinationsModelInputRef.current.setSelectionRange(length, length);
        }
      }, 50);
    },
    [mergeSettings],
  );

  const handlePuterHostingChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ enablePuterHosting: e.target.checked });
      setHasUnsavedChanges(true);
    },
    [mergeSettings],
  );

  const handlePollinationsHostingChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      mergeSettings({ enablePollinationsHosting: e.target.checked });
      setHasUnsavedChanges(true);
    },
    [mergeSettings],
  );

  const handlePuterLogout = useCallback(async () => {
    try {
      if (typeof window !== "undefined" && (window as any).puter) {
        const puter = (window as any).puter;
        if (puter.auth && puter.auth.logout) {
          await puter.auth.logout();
        }
      }
      mergeSettings({ puterAuthToken: undefined, puterAIModel: undefined });
      setPuterAuthenticated(false);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error("Puter logout failed:", error);
    }
  }, [mergeSettings]);

  return (
    <BrutalistLayout
      title="Settings"
      subtitle="Configure your AI preferences"
      headerActions={
        <VibesButton
          variant="blue"
          onClick={handleSubmit}
          disabled={!hasUnsavedChanges}
        >
          {saveSuccess ? "Saved!" : "Save"}
        </VibesButton>
      }
    >
      {/* Save Messages */}
      {saveError && (
        <BrutalistCard size="md">
          <p className="text-red-600 font-medium">{saveError}</p>
        </BrutalistCard>
      )}

      {/* AI Model Section */}
      <BrutalistCard size="md">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-bold">AI Model</h3>
          <a
            href="https://openrouter.ai/models"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Browse all models ↗
          </a>
        </div>
        <p className="mb-4" style={{ color: "var(--vibes-text-secondary)" }}>
          Enter or select an AI model to use for code generation
        </p>

        <div className="mb-4">
          <input
            ref={modelInputRef}
            type="text"
            value={settings.model || ""}
            onChange={handleModelChange}
            placeholder="Enter or select model ID..."
            className="w-full rounded border-2 p-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            style={{
              borderColor: "var(--vibes-border-input)",
              background: "var(--vibes-bg-input)",
              color: "var(--vibes-text-primary)",
            }}
          />
        </div>

        <div className="mb-4">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--vibes-text-primary)" }}
          >
            Recommended models:
          </label>
          <div className="flex flex-wrap gap-2">
            {modelsList.map((model, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleModelSelection(model)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  settings.model === model.id
                    ? "bg-blue-600 text-white dark:bg-purple-500"
                    : ""
                }`}
                style={
                  settings.model !== model.id
                    ? {
                        background: "var(--vibes-bg-secondary)",
                        color: "var(--vibes-text-primary)",
                      }
                    : {}
                }
                title={model.description}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>

        {/* Model picker visibility */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.showModelPickerInChat || false}
              onChange={handleShowModelPickerInChatChange}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">Show model picker in chat</span>
          </label>
        </div>
      </BrutalistCard>

      {/* Style Prompt Section */}
      <BrutalistCard size="md">
        <h3 className="text-2xl font-bold mb-4">Style Prompt</h3>
        <p className="mb-4" style={{ color: "var(--vibes-text-secondary)" }}>
          Choose a style for your AI-generated content
        </p>

        <div className="mb-4">
          <input
            ref={stylePromptInputRef}
            type="text"
            value={settings.stylePrompt || ""}
            onChange={handleStylePromptChange}
            placeholder="Enter or select style prompt..."
            className="w-full rounded border-2 p-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            style={{
              borderColor: "var(--vibes-border-input)",
              background: "var(--vibes-bg-input)",
              color: "var(--vibes-text-primary)",
            }}
          />
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--vibes-text-primary)" }}
          >
            Suggestions:
          </label>
          <div className="flex flex-wrap gap-2">
            {stylePrompts.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleStylePromptSelection(suggestion)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  settings.stylePrompt &&
                  settings.stylePrompt.startsWith(suggestion.name)
                    ? "bg-blue-600 text-white dark:bg-purple-500"
                    : ""
                }`}
                style={
                  settings.stylePrompt &&
                  !settings.stylePrompt.startsWith(suggestion.name)
                    ? {
                        background: "var(--vibes-bg-secondary)",
                        color: "var(--vibes-text-primary)",
                      }
                    : {}
                }
                title={suggestion.prompt}
              >
                {suggestion.name}
              </button>
            ))}
          </div>
        </div>
      </BrutalistCard>

      {/* User Prompt Section */}
      <BrutalistCard size="md">
        <h3 className="text-2xl font-bold mb-4">User Prompt</h3>
        <p className="mb-4" style={{ color: "var(--vibes-text-secondary)" }}>
          Custom instructions to append to the system prompt
        </p>

        <textarea
          value={settings.userPrompt}
          onChange={handleUserPromptChange}
          placeholder="Enter custom instructions for the AI..."
          className="w-full min-h-[120px] rounded border-2 p-3 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          style={{
            borderColor: "var(--vibes-border-input)",
            background: "var(--vibes-bg-input)",
            color: "var(--vibes-text-primary)",
          }}
        />
      </BrutalistCard>

      {/* Puter AI Models Section */}
      <BrutalistCard size="md">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-bold">Puter AI Models</h3>
          <a
            href="https://js.puter.com/v2/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            Puter.js Docs ↗
          </a>
        </div>
        <p className="mb-4" style={{ color: "var(--vibes-text-secondary)" }}>
          Select a Puter AI model for code generation (requires Puter authentication)
        </p>

        <div className="mb-4">
          <input
            ref={puterModelInputRef}
            type="text"
            value={settings.puterAIModel || ""}
            onChange={handlePuterModelChange}
            placeholder="Enter or select Puter model ID..."
            className="w-full rounded border-2 p-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            style={{
              borderColor: "var(--vibes-border-input)",
              background: "var(--vibes-bg-input)",
              color: "var(--vibes-text-primary)",
            }}
          />
        </div>

        <div className="mb-4">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--vibes-text-primary)" }}
          >
            Available Puter models:
          </label>
          <div className="flex flex-wrap gap-2">
            {puterModelsList.map((model, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePuterModelSelection(model)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  settings.puterAIModel === model.id
                    ? "bg-blue-600 text-white dark:bg-purple-500"
                    : ""
                }`}
                style={
                  settings.puterAIModel !== model.id
                    ? {
                        background: "var(--vibes-bg-secondary)",
                        color: "var(--vibes-text-primary)",
                      }
                    : {}
                }
                title={model.description}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      </BrutalistCard>

      {/* Pollinations.ai Models Section */}
      <BrutalistCard size="md">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-2xl font-bold">Pollinations.ai Models</h3>
          <a
            href="https://enter.pollinations.ai/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            API Docs ↗
          </a>
        </div>
        <p className="mb-4" style={{ color: "var(--vibes-text-secondary)" }}>
          Select a Pollinations.ai model for code generation (no authentication required)
        </p>

        <div className="mb-4">
          <input
            ref={pollinationsModelInputRef}
            type="text"
            value={settings.pollinationsAIModel || ""}
            onChange={handlePollinationsModelChange}
            placeholder="Enter or select Pollinations.ai model ID..."
            className="w-full rounded border-2 p-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            style={{
              borderColor: "var(--vibes-border-input)",
              background: "var(--vibes-bg-input)",
              color: "var(--vibes-text-primary)",
            }}
          />
        </div>

        <div className="mb-4">
          <label
            className="mb-2 block text-sm font-medium"
            style={{ color: "var(--vibes-text-primary)" }}
          >
            Available Pollinations.ai models:
          </label>
          <div className="flex flex-wrap gap-2">
            {pollinationsModelsList.map((model, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handlePollinationsModelSelection(model)}
                className={`cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  settings.pollinationsAIModel === model.id
                    ? "bg-blue-600 text-white dark:bg-purple-500"
                    : ""
                }`}
                style={
                  settings.pollinationsAIModel !== model.id
                    ? {
                        background: "var(--vibes-bg-secondary)",
                        color: "var(--vibes-text-primary)",
                      }
                    : {}
                }
                title={model.description}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      </BrutalistCard>

      {/* Hosting Options Section */}
      <BrutalistCard size="md">
        <h3 className="text-2xl font-bold mb-4">Hosting Options</h3>
        <p className="mb-4" style={{ color: "var(--vibes-text-secondary)" }}>
          Choose hosting providers for your apps
        </p>

        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enablePuterHosting || false}
              onChange={handlePuterHostingChange}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">
              Enable Puter Hosting (requires Puter authentication)
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.enablePollinationsHosting || false}
              onChange={handlePollinationsHostingChange}
              className="mr-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm">
              Enable Pollinations.ai Hosting
            </span>
          </label>
        </div>
      </BrutalistCard>

      {/* Account Section */}
      {isAuthenticated && (
        <BrutalistCard size="md">
          <h2 className="text-2xl font-bold mb-4">Account</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p style={{ color: "var(--vibes-text-secondary)" }}>
                Sign out from your Clerk account. Your vibes will still be in browser
                storage.
              </p>
              <VibesButton variant="red" onClick={handleLogout}>
                Logout from Clerk
              </VibesButton>
            </div>
            {puterAuthenticated && (
              <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--vibes-border-primary)" }}>
                <p style={{ color: "var(--vibes-text-secondary)" }}>
                  Signed in with Puter. Sign out to disconnect.
                </p>
                <VibesButton variant="red" onClick={handlePuterLogout}>
                  Logout from Puter
                </VibesButton>
              </div>
            )}
          </div>
        </BrutalistCard>
      )}
    </BrutalistLayout>
  );
}

// Auth wrapper component
export default function Settings() {
  const { isSignedIn, isLoaded } = useClerkAuth();

  if (!isSignedIn) {
    return <LoggedOutView isLoaded={isLoaded} />;
  }

  return <SettingsContent />;
}
