/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useEffect, useRef, useState } from 'react';
import KithaiLogo from '../AionLogo';
import './SplashScreen.css';

interface SplashScreenProps {
  onAnimationEnd: () => void;
}

const AUDIO_SRC = "https://csewoobligshhknqmvgc.supabase.co/storage/v1/object/public/storagekhitai/intro.mp3";
const SPLASH_TOTAL_MS = 5000;

const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationEnd }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [shockPhase, setShockPhase] = useState(false);
  const shockTimerRef = useRef<number | null>(null);
  const endTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // Create audio once on mount
    const el = new Audio(AUDIO_SRC);
    el.preload = "auto";
    el.autoplay = true;
    el.controls = false;
    el.muted = false;
    // Fix: The `playsInline` property is valid on HTMLAudioElement but may not be in older TypeScript DOM library versions.
    // Casting to `any` allows setting this property to ensure correct audio playback behavior on mobile devices.
    (el as any).playsInline = true;
    el.currentTime = 0;
    audioRef.current = el;

    // Try autoplay
    el.play().catch((error) => {
      // Autoplay was blocked by the browser. This is expected in most modern browsers.
      // The user's APK/webview environment may allow autoplay.
      console.warn('Audio autoplay was blocked by the browser:', error);
    });

    // Trigger shock phase at 4s (final 1s snap)
    shockTimerRef.current = window.setTimeout(() => setShockPhase(true), 4000);

    // Trigger end of splash
    endTimerRef.current = window.setTimeout(onAnimationEnd, SPLASH_TOTAL_MS);

    // Pause when tab hidden; resume when visible
    const onVisibility = () => {
      const a = audioRef.current;
      if (!a) return;
      if (document.hidden) {
        try { a.pause(); } catch {}
      } else {
        a.play().catch((error) => {
            console.warn('Audio autoplay on visibility change was blocked:', error);
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (shockTimerRef.current) clearTimeout(shockTimerRef.current);
      if (endTimerRef.current) clearTimeout(endTimerRef.current);
      
      document.removeEventListener("visibilitychange", onVisibility);
      
      // Cleanup audio safely
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.src = "";
        } catch {}
      }
    };
  }, [onAnimationEnd]);

  return (
    <div className="splash-screen" aria-label="Splash screen">
      <div className={`splash-logo-wrap ${shockPhase ? "shock" : ""}`}>
        <KithaiLogo className="splash-logo" />
      </div>
    </div>
  );
};

export default SplashScreen;