import React, { useEffect, useState } from "react";
import { useClerk } from "@clerk/clerk-react";
import { trackAuthClick } from "../utils/analytics.js";
import { useMobile } from "@vibes.diy/use-vibes-base";
import { VibesSwitch } from "./vibes/VibesSwitch/VibesSwitch.js";
import { LabelContainer } from "./vibes/LabelContainer/index.js";
import { VibesButton } from "./vibes/VibesButton/index.js";

// Dynamic import for Puter.js to handle cases where it's not loaded
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let puter: any | null = null;
try {
  // Try to import Puter.js - it may be loaded via CDN or NPM
  if (typeof window !== "undefined" && (window as any).puter) {
    puter = (window as any).puter;
  }
} catch {
  // Puter.js not available
}

export interface LoggedOutViewProps {
  /** Whether Clerk has finished loading */
  isLoaded?: boolean;
  /** Optional event name for analytics tracking */
  trackingEventName?: string;
}

export default function LoggedOutView({
  isLoaded = true,
  trackingEventName,
}: LoggedOutViewProps) {
  const clerk = useClerk();
  // Typewriter effect state
  const [displayedText, setDisplayedText] = useState("");
  const fullText = "Welcome to Vibes DIY";
  const isMobile = useMobile();

  const handleLogin = async () => {
    if (trackingEventName) {
      trackAuthClick({
        label: trackingEventName,
        isUserAuthenticated: false,
      });
    }
    await clerk.redirectToSignIn({
      redirectUrl: window.location.href,
    });
  };

  const handlePuterLogin = async () => {
    try {
      // Try to load Puter.js if not already loaded
      if (!puter && typeof window !== "undefined") {
        if ((window as any).puter) {
          puter = (window as any).puter;
        } else {
          // Try to import dynamically
          const puterModule = await import(/* @vite-ignore */ "@heyputer/puter.js");
          puter = puterModule.default || puterModule;
        }
      }

      if (!puter || !puter.auth || !puter.auth.login) {
        console.error("Puter.js not available. Please ensure @heyputer/puter.js is installed.");
        return;
      }

      if (trackingEventName) {
        trackAuthClick({
          label: `${trackingEventName} - Puter`,
          isUserAuthenticated: false,
        });
      }

      await puter.auth.login();
      // After successful login, Puter will handle token storage
      // We'll check for the token in the settings page
    } catch (error) {
      console.error("Puter login failed:", error);
    }
  };

  // Typewriter animation effect
  useEffect(() => {
    if (isLoaded) {
      let currentIndex = 0;
      const typingSpeed = 100; // milliseconds per character

      const typingInterval = setInterval(() => {
        if (currentIndex <= fullText.length) {
          setDisplayedText(fullText.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(typingInterval);
        }
      }, typingSpeed);

      return () => clearInterval(typingInterval);
    }
  }, [isLoaded]);

  // Show loading state with grid background
  if (!isLoaded) {
    return (
      <div className="grid-background flex h-screen w-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg" style={{ color: "var(--vibes-text-primary)" }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid-background flex h-screen w-screen items-center justify-center relative">
      {/* Center content */}
      <div className="text-center px-8 w-full">
        <LabelContainer label="Login">
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column-reverse" : "row",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                alignItems: "center",
              }}
            >
              <VibesButton icon="login" variant={"blue"} onClick={handleLogin}>
                Login with Clerk
              </VibesButton>
              <VibesButton
                icon="login"
                variant={"blue"}
                onClick={handlePuterLogin}
              >
                Login with Puter
              </VibesButton>
            </div>
            <div style={{ width: "300px" }}>
              <h1
                className="mb-4 text-3xl font-bold"
                style={{ color: "var(--vibes-text-primary)" }}
              >
                {displayedText}
                <span
                  style={{
                    display: "inline-block",
                    width: "3px",
                    height: "1em",
                    backgroundColor: "var(--vibes-text-primary)",
                    marginLeft: "2px",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              </h1>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    @keyframes blink {
                      0%, 50% { opacity: 1; }
                      51%, 100% { opacity: 0; }
                    }
                  `,
                }}
              />
              <p
                className="mb-6 text-lg"
                style={{ color: "var(--vibes-text-primary)" }}
              >
                You can just code things.
              </p>
            </div>
          </div>
        </LabelContainer>
      </div>

      {/* Vibe switch in lower right corner */}
      <button
        type="button"
        onClick={handleLogin}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleLogin();
          }
        }}
        className="cursor-pointer fixed"
        style={{
          bottom: "1.5rem",
          right: "6rem",
          width: "80px",
          zIndex: 50,
          background: "none",
          border: "none",
          padding: 0,
        }}
        aria-label="Login to Vibes DIY"
      >
        <VibesSwitch size={80} />
      </button>
    </div>
  );
}
