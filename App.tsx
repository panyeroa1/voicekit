/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useEffect, useRef, useState } from 'react';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import { supabase } from './lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

import Header from './components/Header';
import SettingsPage from './components/Sidebar';
import MemorySettings from './components/SettingsModal';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { DEFAULT_SYSTEM_PROMPT, useSettings, useTools, useLogStore, useUI, useUserStore, useMemoryStore, useSnackbarStore, useAppStore } from './lib/state';
import { DEFAULT_VOICE } from './lib/constants';
import { businessAssistantTools } from './lib/tools/business-assistant';

import Auth from './components/auth/Auth';
import ConfirmationModal from './components/ConfirmationModal';
import PresentationGenerator from './components/demo/PresentationGenerator';
import LoadingScreen from './components/LoadingScreen';
import SplashScreen from './components/splash/SplashScreen';
import BackgroundTaskManager from './components/BackgroundTaskManager';
import AddAppModal from './components/apps/AddAppModal';
import AppViewer from './components/apps/AppViewer';
import ScreenShareViewer from './components/ScreenShareViewer';

const API_KEY = process.env.API_KEY as string;
if (typeof API_KEY !== 'string') {
  throw new Error(
    'Missing required environment variable: API_KEY'
  );
}

// Base64 encoded audio for chimes to prevent external dependency failures
const CONNECT_CHIME_DATA_URL = 'data:audio/mpeg;base64,SUQzBAAAAAAAIVRYWFgAAAASAAAADAAAAVYASAAAAAEACAAAMPm+uLcbv/y+aCoaAABDEgAABPgkykS/o5pynjtG0aDbe3fSg2/7f4cIaG0bRsG3d2994e6P+HgcDYdG0bRtG3fSg2/7f4eIaG0bRsG3d2994e6P/HgcDcBG0bRtG3fSg2/7f4eIaG0bRsG3d2994e6P/HgcDcBG0bRtG3fSg2/7f4cIaG0bRsG3d2994e6P+HgcDYdG0bRtG3fSg2/7f4eIaG0bRsG3d2994e6P/HgcDcBG0bRtG3fSg2/7f4eIaG0bRsG3d2994e6P/HgcDcBG0bRtG3fSg2/7f4eIaG0bRsG3d2994e6P/HgcDcBG0bRtG3f//3DEAAAAAAABsLAMEAIAAANIAAAAQAAAaQrqhUhgBgGDEWpAAYggDEbQAAgBg2Zc4lgZgAGIsGzLmxYFgGCIABgxZaZc0rAZgAGIAGDLmxYFgGCIABgxZpthYFgGCIABgxZtbYFgGCIABgxZtiYFgGCIABgxZticw/SYABiLBsy5sWAyDCIAYMWWmf/7/3DECYAAAAAAABsLAMEAIAAANIAAAAQAAAaQrqhUhgBgGDEWpAAYggDEbQAAgBg2Zc4lgZgAGIsGzLmxYFgGCIABgxZaZc0rAZgAGIAGDLmxYFgGCIABgxZpthYFgGCIABgxZtbYFgGCIABgxZtiYFgGCIABgxZticw/SYABiLBsy5sWAyDCIAYMWWmf/yyDcMSQAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/8xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/8xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/8xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/8xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/9/MMQJwAAAAAANgCAAAMAAANIAAAAQAAAaAMpIMAGAoMRaUABiCAMRtAACAADZlzIsAYAAxFGzLmywIwAhEAYMWWmfNKwAYABiDBsy5sWAYAhEAYMWmmwFgAhEAYMWbYmAIARCGDFm2JgCAEQhAAYs2zL/xBDCSAAAAAADYAgBACAAADSAAAAEAAAGgBhIMAGAoMRaU';

const CLICK_SOUND_DATA_URL = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RYWFgAAAASAAAADAAAD1AASAAAAAEACAEAAAFDc1LrGoaAABDEgAC4AMCQkC4kKCgAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';
const SEND_SOUND_DATA_URL = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RYWFgAAAASAAAADAAAD1AASAAAAAEACAEAAAFDc1LrGoaAABDEgAC4AMCQkC4kKCgAAAAAqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isSplashFinished, setIsSplashFinished] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const { theme, setAudioChimes, setSoundEffects, presentationData, isCameraOn, viewingApp, isAddingApp, setIsAddingApp, toggleSettings } = useUI();
  const showSnackbar = useSnackbarStore(state => state.showSnackbar);

  const connectChimeRef = useRef<HTMLAudioElement>(null);
  const disconnectChimeRef = useRef<HTMLAudioElement>(null);
  const clickSoundRef = useRef<HTMLAudioElement>(null);
  const sendSoundRef = useRef<HTMLAudioElement>(null);
  const toggleOnSoundRef = useRef<HTMLAudioElement>(null);
  const toggleOffSoundRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const resetUserStores = () => {
    useLogStore.getState().clearTurns();
    useSettings.getState().setPersonaName('Beatrice');
    useSettings.getState().setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    useSettings.getState().setVoice(DEFAULT_VOICE);
    useTools.getState().setTools(businessAssistantTools);
    useUserStore.getState().setTokens(0);
    useMemoryStore.getState().setMemory({
      personality: 'Professional',
      keyPeople: '',
      myBusiness: '',
      commsStyle: '',
      personalPrefs: '',
      negativePrompt: '',
    });
    useAppStore.getState().setApps([]);
  };

  // Auth state listener
  useEffect(() => {
    // Check for initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Data loading for authenticated user
  useEffect(() => {
    if (user) {
      const loadUserData = async () => {
        setIsDataLoading(true);
        try {
          const [settingsRes, memoryRes, conversationRes] = await Promise.all([
            supabase.from('user_settings').select('*').eq('id', user.id).single(),
            supabase.from('user_memory').select('*').eq('id', user.id).single(),
            supabase.from('user_conversations').select('turns').eq('id', user.id).single(),
          ]);

          useAppStore.getState().fetchApps(user.id);

          const { data: settingsData, error: settingsError } = settingsRes;
          if (settingsData) {
            useSettings.getState().setPersonaName(settingsData.personaName);
            useSettings.getState().setSystemPrompt(settingsData.systemPrompt);
            useSettings.getState().setVoice(settingsData.voice);
            useTools.getState().setTemplateOnly(settingsData.template);
            useTools.getState().setTools(settingsData.tools);
            useUserStore.getState().setTokens(settingsData.tokens || 0);
          } else if (settingsError && settingsError.code !== 'PGRST116') { // Ignore 'exact one row' error if no settings exist yet for new user
             throw settingsError;
          }

          const { data: memoryData, error: memoryError } = memoryRes;
          if (memoryData) {
            useMemoryStore.getState().setMemory(memoryData);
          } else if (memoryError && memoryError.code !== 'PGRST116') {
             throw memoryError;
          }

          const { data: conversationData, error: conversationError } = conversationRes;
          if (conversationData?.turns) {
            const turnsWithDateObjects = conversationData.turns.map((turn: any) => ({
              ...turn,
              timestamp: new Date(turn.timestamp),
            }));
            useLogStore.getState().setTurns(turnsWithDateObjects);
          } else if (conversationError && conversationError.code !== 'PGRST116') {
             throw conversationError;
          }

        } catch (error: any) {
          console.error("Error loading user data:", error);
          showSnackbar('Failed to load your profile. Using default settings.', 'error');
          resetUserStores();
        } finally {
          setIsDataLoading(false);
        }
      };

      loadUserData();
    } else {
      // No user, not loading data.
      setIsDataLoading(false);
    }
  }, [user, showSnackbar]);

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('oauth_code');
      const state = params.get('oauth_state');
      const provider = params.get('provider');
      const error = params.get('error');

      if (error) {
        showSnackbar(`OAuth Error: ${params.get('error_description') || error}`, 'error');
        toggleSettings();
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (!code || !state || !provider) {
        return;
      }

      const savedState = localStorage.getItem(`oauth_state_${provider}`);
      if (state !== savedState) {
        showSnackbar('OAuth state mismatch. Please try again.', 'error');
        localStorage.removeItem(`oauth_state_${provider}`);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      localStorage.removeItem(`oauth_state_${provider}`);
      const snackbarId = showSnackbar(`Connecting to ${provider}...`, 'info', 0);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('You must be logged in.');

        const response = await fetch(`${process.env.SUPABASE_URL}/functions/v1/exchange-oauth-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ code, provider }),
        });

        const result = await response.json();
        useSnackbarStore.getState().hideSnackbar(snackbarId);

        if (!response.ok) {
          throw new Error(result.error || `Failed to connect to ${provider}.`);
        }
        
        showSnackbar(`Successfully connected to ${provider}!`, 'success');
        // Notify components to refresh connection status
        window.dispatchEvent(new CustomEvent('integrations:refresh'));
        toggleSettings();

      } catch (e: any) {
        useSnackbarStore.getState().hideSnackbar(snackbarId);
        showSnackbar(e.message, 'error');
      } finally {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    handleOAuthCallback();
  }, [showSnackbar, toggleSettings]);

  // Sound Effects Setup
  useEffect(() => {
    setAudioChimes({
      playConnect: () => connectChimeRef.current?.play(),
      playDisconnect: () => disconnectChimeRef.current?.play(),
    });
    setSoundEffects({
        playClick: () => clickSoundRef.current?.play(),
        playSend: () => sendSoundRef.current?.play(),
        playToggleOn: () => toggleOnSoundRef.current?.play(),
        playToggleOff: () => toggleOffSoundRef.current?.play(),
    });
  }, [setAudioChimes, setSoundEffects]);

  // Theme setup
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Camera stream handler
  useEffect(() => {
    if (isCameraOn) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch(err => {
          console.error("Error accessing camera:", err);
          showSnackbar('Could not access camera.', 'error');
          useUI.getState().toggleCamera(); // Toggle it back off if permission fails
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
  }, [isCameraOn, showSnackbar]);

  const handleClearSession = () => {
    useLogStore.getState().clearTurns();
    showSnackbar('Chat session has been cleared.', 'info');
  };

  const handleSignOut = async () => {
    resetUserStores();
  
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      showSnackbar('Error signing out.', 'error');
    } else {
      // The onAuthStateChange listener will handle setting session/user to null.
      // The stores are already reset above, ensuring a clean state.
      setSession(null);
      setUser(null);
    }
  };

  if (!isSplashFinished) {
    return <SplashScreen onAnimationEnd={() => setIsSplashFinished(true)} />;
  }

  if (!session) {
    return <Auth />;
  }

  if (isDataLoading) {
    return <LoadingScreen />;
  }

  return (
    <LiveAPIProvider apiKey={API_KEY} user={user} videoRef={videoRef} canvasRef={canvasRef}>
      {isAddingApp && <AddAppModal onClose={() => setIsAddingApp(false)} />}
      {viewingApp && <AppViewer />}
      <main>
        <Header onSignOut={handleSignOut} onClearSession={handleClearSession} />
        <div className="video-container" style={{ display: isCameraOn ? 'block' : 'none' }}>
            <video ref={videoRef} autoPlay playsInline muted />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        <ScreenShareViewer />
        <SettingsPage />
        <MemorySettings />
        <ErrorScreen />
        <StreamingConsole />
        <ControlTray />
        <BackgroundTaskManager />
        <ConfirmationModal />
        {presentationData && <PresentationGenerator />}
        <div className="snackbar-container">
          {useSnackbarStore.getState().snackbars.map(snackbar => (
            <div key={snackbar.id} className={`snackbar ${snackbar.type}`}>
                <span className="icon">{snackbar.type === 'success' ? 'check_circle' : snackbar.type === 'error' ? 'error' : 'info'}</span>
                <span className="snackbar-message">{snackbar.message}</span>
                <button onClick={() => useSnackbarStore.getState().hideSnackbar(snackbar.id)} className="snackbar-close">
                    <span className="icon">close</span>
                </button>
            </div>
          ))}
        </div>
      </main>
      <audio ref={connectChimeRef} src={CONNECT_CHIME_DATA_URL} preload="auto" />
      <audio ref={disconnectChimeRef} src={CONNECT_CHIME_DATA_URL} preload="auto" />
      <audio ref={clickSoundRef} src={CLICK_SOUND_DATA_URL} preload="auto" />
      <audio ref={sendSoundRef} src={SEND_SOUND_DATA_URL} preload="auto" />
      <audio ref={toggleOnSoundRef} src={CLICK_SOUND_DATA_URL} preload="auto" />
      <audio ref={toggleOffSoundRef} src={CLICK_SOUND_DATA_URL} preload="auto" />
    </LiveAPIProvider>
  );
}

export default App;