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

import React, { useCallback, useEffect, useMemo, useRef, useState, RefObject } from 'react';
import { GenAILiveClient } from '../../lib/genai-live-client';
import { GoogleGenAI, LiveConnectConfig, LiveServerToolCall, Modality, Type, LiveServerContent, Session } from '@google/genai';
import { AudioStreamer } from '../../lib/audio-streamer';
import { audioContext, base64ToArrayBuffer } from '../../lib/utils';
import VolMeterWorket from '../../lib/worklets/vol-meter';
import { Attachment, MemoryData, useLogStore, useMemoryStore, useSettings, useSnackbarStore, useTools, useUI, useUserStore, GroundingChunk, ConversationTurn, useTaskStore, useCalendarStore } from '../lib/state';
import type { User } from '@supabase/supabase-js';
import { supabase, supabaseUrl as SUPABASE_URL_FROM_CONFIG } from '../lib/supabase';

declare const html2pdf: any;

export type UseLiveApiResults = {
  client: GenAILiveClient;
  setConfig: (config: LiveConnectConfig) => void;
  config: LiveConnectConfig;

  connect: () => Promise<void>;
  disconnect: () => void;
  connected: boolean;

  user: User | null;
};

const SENSITIVE_TOOLS = [
  'place_call',
  'send_gmail_message',
  'send_whatsapp_message',
  'send_telegram_message',
  'send_messenger_message',
  'post_to_facebook_page',
  'post_on_linkedin',
];

const NATIVE_GEMINI_TOOLS = [
  'create_presentation_outline',
  'summarize_text',
  'translate_text',
  'draft_social_media_post',
  'analyze_sentiment',
  'extract_keywords',
  'generate_quiz',
  'write_code_snippet',
  'explain_code_snippet',
];

const ADMIN_ONLY_TOOLS = ['write_code_snippet', 'generate_video'];
const IMAGE_TOOLS = ['generate_image', 'edit_image'];
const IMAGE_TOOL_COST = 25;
const DOCUMENT_TOOL_COST = 10;
const PRESENTATION_TOOL_COST = 50;

const inlineMarkdown = (text: string): string => {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
};

const markdownToHtml = (markdown: string): string => {
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;

    for (const line of lines) {
        // Headings
        if (line.startsWith('# ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h1>${inlineMarkdown(line.substring(2))}</h1>`;
            continue;
        }
        if (line.startsWith('## ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h2>${inlineMarkdown(line.substring(3))}</h2>`;
            continue;
        }
        if (line.startsWith('### ')) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h3>${inlineMarkdown(line.substring(4))}</h3>`;
            continue;
        }

        // Unordered List
        if (line.startsWith('- ')) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${inlineMarkdown(line.substring(2))}</li>`;
            continue;
        }

        // End of list
        if (inList && !line.startsWith('- ')) {
            html += '</ul>';
            inList = false;
        }

        // Paragraphs
        if (line.trim() === '') {
            if (!inList) html += '<br/>';
        } else {
            html += `<p>${inlineMarkdown(line)}</p>`;
        }
    }
    if (inList) { html += '</ul>'; } // Close list if file ends with it
    return html;
};


async function pollForResult(getStatusUrl: string, toolName: string, client: GenAILiveClient) {
  const { showSnackbar } = useSnackbarStore.getState();
  const maxAttempts = 15; // Poll for 30 seconds max (15 attempts * 2s interval)
  const interval = 2000; // 2 seconds
  let attempts = 0;

  const intervalId = setInterval(async () => {
    if (attempts >= maxAttempts) {
      clearInterval(intervalId);
      showSnackbar(`Tool '${toolName}' timed out.`, 'error');
      const systemMessage = `SYSTEM NOTIFICATION: The tool '${toolName}' timed out after ${maxAttempts * interval / 1000} seconds. Please inform the user that the action could not be completed.`;
      client.send([{ text: systemMessage }]);
      return;
    }

    try {
      const response = await fetch(getStatusUrl);
      if (response.ok) {
        const result = await response.json();
        // Zapier GET webhooks often return a list, check for the latest one.
        const statusData = Array.isArray(result) ? result[0] : result;

        if (statusData && statusData.status && statusData.status !== 'pending') {
          clearInterval(intervalId);
          showSnackbar(`Tool '${toolName}' completed: ${statusData.status}`, statusData.status === 'success' ? 'success' : 'error');

          const systemMessage = `SYSTEM NOTIFICATION: The tool '${toolName}' has completed with status: ${statusData.status}. The message is: ${statusData.message}. Please inform the user of this result in a natural, conversational way.`;
          client.send([{ text: systemMessage }]);
        }
      }
    } catch (error) {
      // Don't stop polling on network errors, just log them
      console.error(`Polling error for ${toolName}:`, error);
    }

    attempts++;
  }, interval);
}

export function useLiveApi({
  apiKey,
  user,
  videoRef,
  canvasRef,
}: {
  apiKey: string;
  user: User | null;
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
}): UseLiveApiResults {
  const { model } = useSettings();
  const client = useMemo(() => new GenAILiveClient(apiKey, model), [apiKey, model]);
  const ai = useMemo(() => new GoogleGenAI({ apiKey }), [apiKey]);
  const { playConnectChime, playDisconnectChime, setOutputVolume, isMuted, isCameraOn } = useUI();

  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const [connected, setConnected] = useState(false);
  const [config, setConfig] = useState<LiveConnectConfig>({});

  // Refs for background mode tasks
  const silentAudioLoopRef = useRef<AudioBufferSourceNode | null>(null);
  const faviconIntervalRef = useRef<number | null>(null);
  const originalFaviconRef = useRef<string | null>(null);
  const keepAliveIntervalRef = useRef<number | null>(null);
  const promoTimerRef = useRef<number | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Effect for video snapshot streaming
  useEffect(() => {
    const blobToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    };
    
    if (connected && isCameraOn && videoRef.current && canvasRef.current) {
      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      const ctx = canvasEl.getContext('2d');
      const FRAME_RATE = 1; // 1 frame per second
      const JPEG_QUALITY = 0.7;

      if (!ctx) return;

      const startStreaming = () => {
        if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = window.setInterval(() => {
          // Check if video has data and is not paused
          if (videoEl.paused || videoEl.ended || !videoEl.videoWidth) {
            return;
          }
          canvasEl.width = videoEl.videoWidth;
          canvasEl.height = videoEl.videoHeight;
          ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
          canvasEl.toBlob(
              async (blob) => {
                  if (blob) {
                      const base64Data = await blobToBase64(blob);
                      client.sendRealtimeInput([
                        { 
                          data: base64Data, 
                          mimeType: 'image/jpeg' 
                        }
                      ]);
                  }
              },
              'image/jpeg',
              JPEG_QUALITY
          );
        }, 1000 / FRAME_RATE);
      };

      if (videoEl.readyState >= 2) { // HAVE_CURRENT_DATA
        startStreaming();
      } else {
        videoEl.oncanplay = startStreaming;
      }
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.oncanplay = null;
      }
    };
  }, [connected, isCameraOn, videoRef, canvasRef, client]);


  // register audio for streaming server -> speakers
  useEffect(() => {
    if (!audioStreamerRef.current) {
      audioContext({ id: 'audio-out' }).then((audioCtx: AudioContext) => {
        audioStreamerRef.current = new AudioStreamer(audioCtx);
        audioStreamerRef.current
          .addWorklet<any>('vumeter-out', VolMeterWorket, (ev: any) => {
            setOutputVolume(ev.data.volume);
          })
          .then(() => {
            // Successfully added worklet
          })
          .catch(err => {
            console.error('Error adding worklet:', err);
          });
      });
    }
  }, [audioStreamerRef, setOutputVolume]);
  
  // Effect to handle muting by controlling the gain node
  useEffect(() => {
    if (audioStreamerRef.current) {
      audioStreamerRef.current.gainNode.gain.setValueAtTime(
        isMuted ? 0 : 1, 
        audioStreamerRef.current.context.currentTime
      );
    }
  }, [isMuted]);

  // Effect to manage all background tasks based on connection state
  useEffect(() => {
    const setFavicon = (href: string) => {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = href;
    };

    const createDotFavicon = (color: string, size: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d')!;
        ctx.beginPath();
        ctx.arc(16, 16, size, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        return canvas.toDataURL('image/png');
    };

    const startBackgroundTasks = () => {
        // Keep-alive to prevent idle timeout
        if (keepAliveIntervalRef.current) clearInterval(keepAliveIntervalRef.current);
        keepAliveIntervalRef.current = window.setInterval(() => {
            if (client.status === 'connected') {
                const silentChunk = new Uint8Array(320);
                let binary = '';
                for (let i = 0; i < silentChunk.byteLength; i++) binary += String.fromCharCode(silentChunk[i]);
                const base64SilentChunk = window.btoa(binary);
                client.sendRealtimeInput([{ mimeType: 'audio/pcm;rate=16000', data: base64SilentChunk }]);
            }
        }, 30000);

        // Silent audio loop to prevent tab suspension
        audioContext({ id: 'background-audio' }).then(ctx => {
            if (ctx.state === 'suspended') ctx.resume();
            if (silentAudioLoopRef.current) silentAudioLoopRef.current.stop();
            const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;
            source.connect(ctx.destination);
            source.start();
            silentAudioLoopRef.current = source;
        });

        // Dynamic favicon and title to indicate active state
        if (!originalFaviconRef.current) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            originalFaviconRef.current = link ? link.href : '/favicon.ico';
        }
        const activeFavicon1 = createDotFavicon('#32ff7e', 14);
        const activeFavicon2 = createDotFavicon('#32ff7e', 10);
        let state = 0;
        document.title = "Kithai - Active";
        faviconIntervalRef.current = window.setInterval(() => {
            setFavicon(state === 0 ? activeFavicon1 : activeFavicon2);
            state = 1 - state;
        }, 800);
    };

    const stopBackgroundTasks = () => {
        if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
        }
        if (silentAudioLoopRef.current) {
            silentAudioLoopRef.current.stop();
            silentAudioLoopRef.current = null;
        }
        if (faviconIntervalRef.current) {
            clearInterval(faviconIntervalRef.current);
            faviconIntervalRef.current = null;
        }
        if (originalFaviconRef.current) {
            setFavicon(originalFaviconRef.current);
        }
        document.title = "Kithai";
    };

    if (connected) {
        startBackgroundTasks();
    } else {
        stopBackgroundTasks();
    }

    return stopBackgroundTasks; // Cleanup on component unmount
}, [connected, client]);


  useEffect(() => {
    const onOpen = () => {
      setConnected(true);
      playConnectChime();
    };

    const onClose = () => {
      setConnected(false);
      playDisconnectChime();
    };

    const stopAudioStreamer = () => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.stop();
      }
    };

    const onAudio = (data: ArrayBuffer) => {
      if (audioStreamerRef.current) {
        audioStreamerRef.current.addPCM16(new Uint8Array(data));
      }
    };
    
    const runBackgroundAnalysis = async () => {
      if (!user) return;
    
      const { turns, addTurn } = useLogStore.getState();
      const existingMemory = useMemoryStore.getState();
      const { showSnackbar } = useSnackbarStore.getState();
    
      // Get the last 6 turns for context
      const recentTurns = turns.slice(-6);
      if (recentTurns.length === 0) return;
    
      const transcript = recentTurns.map(t => `${t.role === 'user' ? 'User' : 'Agent'}: ${t.text}`).join('\n');
    
      const schema = {
        type: Type.OBJECT,
        properties: {
          negativePrompt: { type: Type.STRING, description: 'A consolidated list of rules and constraints the user has specified about what the agent should NOT do. Append to the existing list.' },
          keyPeople: { type: Type.STRING, description: 'Updated notes about key people and contacts, appending any new information.' },
          myBusiness: { type: Type.STRING, description: 'Updated notes about the user\'s business and goals, appending new info.' },
          commsStyle: { type: Type.STRING, description: 'Updated notes about the user\'s communication style, appending new info.' },
          personalPrefs: { type: Type.STRING, description: 'Updated notes about the user\'s personal preferences, appending new info.' },
        },
        required: ['negativePrompt', 'keyPeople', 'myBusiness', 'commsStyle', 'personalPrefs'],
      };
    
      const prompt = `
        You are a silent background AI assistant. Your ONLY job is to analyze a conversation and extract two types of information:
        1.  **Negative Constraints**: Identify things the user explicitly states they do NOT want the main AI agent to do. Consolidate these into a clear list of rules. For example, if the user says "don't read the brackets", a constraint would be "Never read text inside square brackets aloud."
        2.  **Memory Updates**: Extract key facts and information that should be saved to the user's long-term memory. Look for details about people, business, communication style, and personal preferences.
    
        Analyze the following conversation transcript:
        ---
        ${transcript}
        ---
    
        Based on the transcript, provide updates for the user's memory profile in the following JSON format.
        You MUST refer to the "Existing Memory" provided below. Your task is to APPEND new information to the existing fields, not replace them. If no new information is found for a field, return the existing value for that field. ONLY return the JSON object.
    
        **Existing Memory:**
        ${JSON.stringify(existingMemory, null, 2)}
      `;
    
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: schema,
          },
        });
    
        const result = JSON.parse(response.text);
        const updates: Partial<MemoryData> = {};
    
        const hasMeaningfulUpdate = (oldVal: string, newVal: string) => {
          return newVal && newVal.trim() && oldVal.trim() !== newVal.trim();
        };
    
        if (hasMeaningfulUpdate(existingMemory.negativePrompt, result.negativePrompt)) updates.negativePrompt = result.negativePrompt;
        if (hasMeaningfulUpdate(existingMemory.keyPeople, result.keyPeople)) updates.keyPeople = result.keyPeople;
        if (hasMeaningfulUpdate(existingMemory.myBusiness, result.myBusiness)) updates.myBusiness = result.myBusiness;
        if (hasMeaningfulUpdate(existingMemory.commsStyle, result.commsStyle)) updates.commsStyle = result.commsStyle;
        if (hasMeaningfulUpdate(existingMemory.personalPrefs, result.personalPrefs)) updates.personalPrefs = result.personalPrefs;
    
        if (Object.keys(updates).length > 0) {
          useMemoryStore.getState().setMemory(updates);
          const { error } = await supabase
            .from('user_memory')
            .upsert({ id: user.id, ...useMemoryStore.getState() });
          
          if (error) throw error;
          
          showSnackbar('Your assistant updated its memory based on the conversation.', 'info', 3000);
          addTurn({ role: 'system', text: 'SYSTEM: My long-term memory has been updated based on our recent conversation.', isFinal: true });
        }
      } catch (error) {
        console.error("Background analysis agent failed:", error);
        // Fail silently, no need to show error to user for a background task.
      }
    };

    const triggerPromotionalMessage = async () => {
      const { turns, addTurn } = useLogStore.getState();
      const recentTurns = turns.slice(-4).filter(t => t.role !== 'system');
      if (recentTurns.length < 2) return; // Don't trigger on empty/short convos
  
      const transcript = recentTurns.map(t => `${t.role}: ${t.text}`).join('\n');
  
      const promoPrompt = `
        You are a witty marketing bot for an AI assistant app called "Kithai".
        Your task is to create a short, humorous, and context-aware promotional message based on the recent conversation transcript.
  
        **Rules:**
        1.  **Be Brief:** 1-2 sentences maximum.
        2.  **Be Relevant:** Connect your message to the topic of the conversation.
        3.  **Be Humorous:** Use a light, witty, or clever tone.
        4.  **Promote Kithai:** Mention a Kithai feature that relates to the topic.
        5.  **Call to Action:** End with a friendly prompt for the user to invite their friends to try Kithai.
  
        **Recent Conversation:**
        ---
        ${transcript}
        ---
  
        Now, generate the promotional message.
      `;
  
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promoPrompt,
        });
        const promoText = response.text;
  
        addTurn({
          role: 'system',
          text: promoText,
          isFinal: true,
          isPromo: true, // Custom flag
        });
      } catch (error) {
        console.error("Failed to generate promotional message:", error);
      }
    };
    
    // == TRANSCRIPTION AND CONTENT HANDLING ==
    const { addTurn, updateLastTurn } = useLogStore.getState();

    const handleInputTranscription = (text: string, isFinal: boolean) => {
      if (promoTimerRef.current) {
        clearTimeout(promoTimerRef.current);
        promoTimerRef.current = null;
      }
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'user' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        addTurn({ role: 'user', text, isFinal });
      }
    };

    const handleOutputTranscription = (text: string, isFinal: boolean) => {
      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];
      if (last && last.role === 'agent' && !last.isFinal) {
        updateLastTurn({
          text: last.text + text,
          isFinal,
        });
      } else {
        addTurn({ role: 'agent', text, isFinal });
      }
    };

    const handleContent = (serverContent: LiveServerContent) => {
      const text =
        serverContent.modelTurn?.parts
          ?.map((p: any) => p.text)
          .filter(Boolean)
          .join(' ') ?? '';
      const rawGroundingChunks = serverContent.groundingMetadata?.groundingChunks;
      let groundingChunks: GroundingChunk[] | undefined;
      if (rawGroundingChunks) {
        groundingChunks = rawGroundingChunks
          .filter(chunk => chunk.web?.uri)
          .map(chunk => ({
            web: {
              uri: chunk.web!.uri!,
              title: chunk.web!.title || chunk.web!.uri!,
            },
          }));
      }

      if (!text && (!groundingChunks || groundingChunks.length === 0)) return;

      const turns = useLogStore.getState().turns;
      const last = turns[turns.length - 1];

      if (last?.role === 'agent' && !last.isFinal) {
        const updatedTurn: Partial<ConversationTurn> = {
          text: last.text + text,
        };
        if (groundingChunks && groundingChunks.length > 0) {
          updatedTurn.groundingChunks = [
            ...(last.groundingChunks || []),
            ...groundingChunks,
          ];
        }
        updateLastTurn(updatedTurn);
      } else {
        addTurn({ role: 'agent', text, isFinal: false, groundingChunks });
      }
    };

    const handleTurnComplete = async () => {
        const { turns, updateLastTurn } = useLogStore.getState();
        const last = turns[turns.length - 1];

        if (last && !last.isFinal) {
            updateLastTurn({ isFinal: true });
        }
        
        // Save conversation
        if (user) {
          try {
            const updatedTurns = useLogStore.getState().turns;
            const { error } = await supabase
              .from('user_conversations')
              .upsert({ id: user.id, turns: updatedTurns });
            if (error) throw error;
          } catch (error: any) {
            console.error('Failed to save conversation:', error);
          }
        }
    
        // Trigger background analysis after a user's turn is complete
        if (user && last && last.role === 'user') {
            runBackgroundAnalysis();
        }

        // Set promo timer after agent's turn is complete
        if (last && last.role === 'agent') {
            if (promoTimerRef.current) clearTimeout(promoTimerRef.current);
            promoTimerRef.current = window.setTimeout(triggerPromotionalMessage, 15000); // 15 seconds
        }
    };

    // == TOOL EXECUTION HELPERS ==
    const executeWebhookTool = async (fc: any) => {
      const { showSnackbar } = useSnackbarStore.getState();
      const allTools = useTools.getState().tools;
      const tool = allTools.find(t => t.name === fc.name);

      if (!tool || !tool.isEnabled || !tool.postWebhookUrl) {
        const errorMessage = `Tool '${fc.name}' is not configured or enabled. Please configure its webhooks in the settings.`;
        showSnackbar(errorMessage, 'error');
        return {
          id: fc.id,
          name: fc.name,
          response: { result: `Error: ${errorMessage}` },
        };
      }
       
      let body: any;
      let webhookUrl = tool.postWebhookUrl;

      // Special handling for memory search tools
      if (tool.name === 'recall_from_conversation' || tool.name === 'search_long_term_memory') {
        const supabaseUrl = SUPABASE_URL_FROM_CONFIG;
        if (!supabaseUrl || !supabaseUrl.includes('.co')) {
           const errorMessage = `Supabase URL is not configured correctly. Cannot call memory functions.`;
           showSnackbar(errorMessage, 'error');
           return { id: fc.id, name: fc.name, response: { result: `Error: ${errorMessage}` } };
        }
        const projectRef = supabaseUrl.split('//')[1].split('.')[0];
        webhookUrl = `https://${projectRef}.supabase.co/functions/v1/semantic-search`;

        body = {
            user_id: user!.id,
            search_query: fc.args.search_query,
            scope: tool.name === 'recall_from_conversation' ? 'session' : 'long-term'
        };

        if (body.scope === 'session') {
            const turns = useLogStore.getState().turns;
            // Send last 20 turns for session context
            body.session_context = turns.slice(-20).map(t => ({ role: t.role, text: t.text }));
        }
      } else {
        body = fc.args;
      }

      showSnackbar(`Executing: ${fc.name}...`, 'info');

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(webhookUrl, {
          method: 'POST',
          body: JSON.stringify(body),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Webhook failed with status ${response.status}: ${errorBody}`);
        }

        if (tool.getStatusWebhookUrl) {
          pollForResult(tool.getStatusWebhookUrl, tool.name, client);
          return {
            id: fc.id,
            name: fc.name,
            response: { result: `OK. I have initiated the '${tool.name}' action. I will provide an update once it is complete.` },
          };
        } else {
          const result = await response.json();
          setTimeout(() => {
            showSnackbar(`'${tool.name}' was triggered successfully.`, 'success')
          }, 800);
          return {
            id: fc.id,
            name: fc.name,
            // The result from the webhook is passed back to the model
            response: { result: JSON.stringify(result) }, 
          };
        }

      } catch (e: any) {
        console.error(`Webhook error for ${tool.name}:`, e);
        const errorMessage = `Failed to trigger webhook for '${tool.name}'. ${e.message}`;
        showSnackbar(errorMessage, 'error');
        return {
          id: fc.id,
          name: fc.name,
          response: { result: `Error: ${errorMessage}` },
        };
      }
    };

    const executeSendGmailTool = async (fc: any) => {
      const { showSnackbar } = useSnackbarStore.getState();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-gmail`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            to: fc.args.recipient,
            subject: fc.args.subject,
            text: fc.args.message,
            html: `<p>${fc.args.message.replace(/\n/g, '<br/>')}</p>`
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send email.');

        showSnackbar('Email sent successfully!', 'success');
        return { id: fc.id, name: fc.name, response: { result: 'OK. I have sent the email.' } };

      } catch (e: any) {
        showSnackbar(`Email Error: ${e.message}`, 'error');
        return { id: fc.id, name: fc.name, response: { result: `Error: ${e.message}` } };
      }
    };
    
    const executeSendWhatsAppTool = async (fc: any) => {
      const { showSnackbar } = useSnackbarStore.getState();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            to: fc.args.recipient,
            text: fc.args.message,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to send WhatsApp message.');
        
        showSnackbar('WhatsApp message sent!', 'success');
        return { id: fc.id, name: fc.name, response: { result: 'OK. I have sent the WhatsApp message.' } };
      } catch (e: any) {
        showSnackbar(`WhatsApp Error: ${e.message}`, 'error');
        return { id: fc.id, name: fc.name, response: { result: `Error: ${e.message}` } };
      }
    };

    const executeCalendarEventTool = async (fc: any, user: User) => {
        const { addEvent } = useCalendarStore.getState();
        const { showSnackbar } = useSnackbarStore.getState();
        try {
            const eventData = {
                summary: fc.args.summary,
                startTime: fc.args.startTime,
                endTime: fc.args.endTime,
                location: fc.args.location,
            };
            await addEvent(eventData, user.id);
            showSnackbar('Calendar event created successfully!', 'success');
            return {
                id: fc.id,
                name: fc.name,
                response: { result: 'OK. I have successfully created the calendar event. The user can view it in the calendar tab.' },
            };
        } catch (e: any) {
            console.error('Failed to create calendar event:', e);
            showSnackbar('Failed to create calendar event.', 'error');
            return {
                id: fc.id,
                name: fc.name,
                response: { result: `Error: Failed to create calendar event. ${e.message}` },
            };
        }
    };

    const executeImageGenerationTool = async (fc: any) => {
      const { showSnackbar } = useSnackbarStore.getState();
      showSnackbar('Generating image...', 'info');
      try {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: fc.args.prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: fc.args.aspectRatio || '1:1',
          },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
          const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
          const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
          const newAttachment: Attachment = {
            name: `${fc.args.prompt.slice(0, 20)}.jpg`,
            type: 'image/jpeg',
            dataUrl: imageUrl,
          };

          useLogStore.getState().addTurn({
            role: 'agent',
            text: `Here is the image you requested: "${fc.args.prompt}"`,
            attachments: [newAttachment],
            isFinal: true,
          });
          
          // Deduct tokens
          useUserStore.getState().decrementTokens(IMAGE_TOOL_COST);
          const newTokens = useUserStore.getState().tokens;
          if (user) {
            await supabase
              .from('user_settings')
              .update({ tokens: newTokens })
              .eq('id', user.id);
          }
          showSnackbar(`Image generated! ${IMAGE_TOOL_COST} tokens deducted.`, 'success');

        } else {
          throw new Error('No images were generated.');
        }

        return {
          id: fc.id,
          name: fc.name,
          response: { result: 'OK. The image has been generated and displayed.' },
        };
      } catch (e: any) {
        console.error('Image generation error:', e);
        showSnackbar('Failed to generate image.', 'error');
        return {
          id: fc.id,
          name: fc.name,
          response: { result: `Error: Failed to generate image. ${e.message}` },
        };
      }
    };

    const executeImageEditingTool = async (fc: any) => {
      const { showSnackbar } = useSnackbarStore.getState();
      const { turns } = useLogStore.getState();
    
      let lastUserImage: Attachment | null = null;
      for (let i = turns.length - 1; i >= 0; i--) {
        const turn = turns[i];
        if (turn.role === 'user' && turn.attachments && turn.attachments.length > 0) {
          const imageAttachment = turn.attachments.find(att => att.type.startsWith('image/'));
          if (imageAttachment) {
            lastUserImage = imageAttachment;
            break;
          }
        }
      }
    
      if (!lastUserImage) {
        showSnackbar('Please provide an image before asking to edit it.', 'error');
        return {
          id: fc.id,
          name: fc.name,
          response: { result: 'Error: No image found in the conversation to edit. The user needs to upload an image first.' },
        };
      }
      
      showSnackbar('Editing image...', 'info');
      
      try {
        const base64Data = lastUserImage.dataUrl.split(',')[1];
        
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image-preview',
          contents: {
            parts: [
              {
                inlineData: { data: base64Data, mimeType: lastUserImage.type },
              },
              { text: fc.args.prompt },
            ],
          },
          config: {
              responseModalities: [Modality.IMAGE, Modality.TEXT],
          },
        });
    
        let newAttachment: Attachment | null = null;
        let responseText = `Here is the edited image based on your request: "${fc.args.prompt}"`;
    
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText = part.text;
          } else if (part.inlineData) {
            const base64ImageBytes: string = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
            newAttachment = {
              name: `edited_${lastUserImage.name}`,
              type: mimeType,
              dataUrl: imageUrl,
            };
          }
        }
        
        if (newAttachment) {
          useLogStore.getState().addTurn({
            role: 'agent',
            text: responseText,
            attachments: [newAttachment],
            isFinal: true,
          });
    
          useUserStore.getState().decrementTokens(IMAGE_TOOL_COST);
          const newTokens = useUserStore.getState().tokens;
          if (user) {
            await supabase
              .from('user_settings')
              .update({ tokens: newTokens })
              .eq('id', user.id);
          }
          showSnackbar(`Image edited! ${IMAGE_TOOL_COST} tokens deducted.`, 'success');
          
          return {
            id: fc.id,
            name: fc.name,
            response: { result: 'OK. The image has been edited and displayed.' },
          };
        } else {
          throw new Error('No edited image was returned by the model.');
        }
    
      } catch (e: any) {
        console.error('Image editing error:', e);
        showSnackbar('Failed to edit image.', 'error');
        return {
          id: fc.id,
          name: fc.name,
          response: { result: `Error: Failed to edit image. ${e.message}` },
        };
      }
    };

    const executeVideoGenerationTool = async (fc: any) => {
        const taskId = useTaskStore.getState().addTask({
            name: 'generate_video',
            status: 'running',
            progress: 5,
            message: 'Starting video generation...',
        });

        // Fire-and-forget the polling process
        (async () => {
            try {
                let operation = await ai.models.generateVideos({
                    model: 'veo-2.0-generate-001',
                    prompt: fc.args.prompt,
                    config: { numberOfVideos: 1 }
                });
                
                let progress = 10;
                while (!operation.done) {
                    await new Promise(resolve => setTimeout(resolve, 10000));
                    operation = await ai.operations.getVideosOperation({ operation: operation });
                    progress = Math.min(progress + 15, 90);
                    useTaskStore.getState().updateTask(taskId, {
                        progress,
                        message: 'Processing video...',
                    });
                }

                const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
                if (downloadLink) {
                    const videoUrl = `${downloadLink}&key=${apiKey}`;
                    useTaskStore.getState().updateTask(taskId, {
                        status: 'completed',
                        progress: 100,
                        message: 'Video is ready!',
                        result: { type: 'download', payload: videoUrl },
                    });
                } else {
                    throw new Error('Video generation finished but no video URL was returned.');
                }
            } catch (e: any) {
                console.error('Video generation polling error:', e);
                useTaskStore.getState().updateTask(taskId, {
                    status: 'failed',
                    message: `Failed to generate video: ${e.message}`,
                });
            }
        })();
        
        return {
            id: fc.id,
            name: fc.name,
            response: { result: 'OK. I have started generating the video. This process can take a few minutes. You can monitor the progress in the background tasks panel.' },
        };
    };

    const executePresentationGenerationTool = async (fc: any) => {
      const { decrementTokens, tokens } = useUserStore.getState();
    
      if (tokens < PRESENTATION_TOOL_COST) {
        const errorMessage = `You need ${PRESENTATION_TOOL_COST} tokens for a presentation, but you only have ${tokens}.`;
        return { id: fc.id, name: fc.name, response: { result: `Error: ${errorMessage}` } };
      }
    
      const taskId = useTaskStore.getState().addTask({
        name: 'create_business_presentation',
        status: 'running',
        progress: 0,
        message: 'Generating presentation outline...',
      });
    
      // Fire-and-forget the full generation process
      (async () => {
        try {
          const schema = {
            type: Type.OBJECT,
            properties: {
              topic: { type: Type.STRING },
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    content: { type: Type.STRING },
                    narration: { type: Type.STRING },
                    visual_prompt: { type: 'STRING' },
                  },
                  required: ['title', 'content', 'narration', 'visual_prompt'],
                },
              },
            },
            required: ['topic', 'slides'],
          };
          
          const numSlides = fc.args.num_slides || 5;
          const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Create a structured presentation outline on the topic "${fc.args.topic}". It should have exactly ${numSlides} slides. For each slide, provide a title, content (markdown), narration script, and a detailed visual prompt.`,
            config: { responseMimeType: 'application/json', responseSchema: schema },
          });
          const presentationJson = JSON.parse(response.text);
          
          useTaskStore.getState().updateTask(taskId, { progress: 10, message: 'Generating assets...' });
    
          const { slides } = presentationJson;
          const totalAssetSteps = slides.length * 2;
          let currentAssetStep = 0;
    
          const assets: any[] = [];
          const audioCtx = await audioContext({id: 'presentation-audio'});
    
          const generateNarration = (text: string): Promise<ArrayBuffer> => {
             return new Promise(async (resolve, reject) => {
                let audioChunks: ArrayBuffer[] = [];
                let session: Session | null = null;
                try {
                  const sessionPromise = ai.live.connect({
                      model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                      config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } } },
                      callbacks: {
                          onopen: () => sessionPromise.then(s => { session = s; session.sendClientContent({ turns: [{ text }], turnComplete: true }); }),
                          onmessage: (message) => {
                              const b64 = message.serverContent?.modelTurn?.parts[0]?.inlineData.data;
                              if (b64) audioChunks.push(base64ToArrayBuffer(b64));
                              if (message.serverContent?.turnComplete) session?.close();
                          },
                          onclose: async () => {
                              if (audioChunks.length > 0) {
                                  const combined = new Uint8Array(audioChunks.reduce((acc, c) => acc + c.byteLength, 0));
                                  let offset = 0;
                                  for (const chunk of audioChunks) { combined.set(new Uint8Array(chunk), offset); offset += chunk.byteLength; }
                                  resolve(combined.buffer);
                              } else reject(new Error("No audio data"));
                          },
                          onerror: (e) => reject(new Error(`Narration API error: ${e.message}`))
                      }
                  });
                } catch(e) {
                  reject(e);
                }
            });
          };
    
          for (const slide of slides) {
            const imageResponse = await ai.models.generateImages({
              model: 'imagen-4.0-generate-001',
              prompt: slide.visual_prompt,
              config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
            });
            const imageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
            const image = await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = imageUrl;
            });
            currentAssetStep++;
            useTaskStore.getState().updateTask(taskId, { progress: 10 + (currentAssetStep / totalAssetSteps) * 80, message: `Generated image for: ${slide.title}` });
    
            const audioData = await generateNarration(slide.narration);
            const audio = await audioCtx.decodeAudioData(audioData);
            
            currentAssetStep++;
            useTaskStore.getState().updateTask(taskId, { progress: 10 + (currentAssetStep / totalAssetSteps) * 80, message: `Generated narration for: ${slide.title}` });
            assets.push({ ...slide, image, audio });
          }

          useTaskStore.getState().updateTask(taskId, { progress: 95, message: 'Assembling presentation...' });

          const createPresentationVideo = async (
            slidesWithAssets: {
              title: string;
              image: HTMLImageElement;
              audio: AudioBuffer;
            }[],
            audioCtx: AudioContext
          ): Promise<string> => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = 1280;
            canvas.height = 720;

            const videoStream = canvas.captureStream(25);
            const audioDestination = audioCtx.createMediaStreamDestination();
            const audioTrack = audioDestination.stream.getAudioTracks()[0];
            videoStream.addTrack(audioTrack);

            const recorder = new MediaRecorder(videoStream, { mimeType: 'video/webm' });
            const chunks: Blob[] = [];

            recorder.ondataavailable = (event) => {
              if (event.data.size > 0) {
                chunks.push(event.data);
              }
            };

            return new Promise((resolve, reject) => {
                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    const videoUrl = URL.createObjectURL(blob);
                    resolve(videoUrl);
                };

                recorder.onerror = reject;

                (async () => {
                    recorder.start();
                    for (const slide of slidesWithAssets) {
                        ctx.fillStyle = 'black';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(slide.image, 0, 0, canvas.width, canvas.height);
                        
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                        ctx.fillRect(0, canvas.height - 100, canvas.width, 100);
                        ctx.font = 'bold 32px Arial';
                        ctx.fillStyle = 'white';
                        ctx.textAlign = 'center';
                        ctx.fillText(slide.title, canvas.width / 2, canvas.height - 50);
                        
                        const audioSource = audioCtx.createBufferSource();
                        audioSource.buffer = slide.audio;
                        audioSource.connect(audioDestination);
                        audioSource.start();
                        
                        await new Promise(res => setTimeout(res, 200));
                        const duration = slide.audio.duration * 1000;
                        const frameInterval = 1000 / 25;
                        for (let i = 0; i < duration; i += frameInterval) {
                          await new Promise(res => setTimeout(res, frameInterval));
                        }
                        audioSource.stop();
                        audioSource.disconnect();
                    }
                    recorder.stop();
                })();
            });
          };

          const videoUrl = await createPresentationVideo(assets, audioCtx);

          useTaskStore.getState().updateTask(taskId, {
            status: 'completed',
            progress: 100,
            message: 'Presentation is ready!',
            result: {
              type: 'view',
              payload: { topic: presentationJson.topic, videoUrl },
            },
          });
          
          decrementTokens(PRESENTATION_TOOL_COST);
          const newTokens = useUserStore.getState().tokens;
          if (user) {
            await supabase
              .from('user_settings')
              .update({ tokens: newTokens })
              .eq('id', user.id);
          }
          
        } catch (e: any) {
          console.error('Presentation generation error:', e);
          useTaskStore.getState().updateTask(taskId, {
            status: 'failed',
            message: `Failed to create presentation: ${e.message}`,
          });
        }
      })();
      
      return {
        id: fc.id,
        name: fc.name,
        response: { result: 'OK. I have started generating the presentation. You can monitor the progress in the background tasks panel.' },
      };
    };

    const executeDocumentGenerationTool = async (fc: any) => {
      const { decrementTokens, tokens } = useUserStore.getState();
      const { showSnackbar } = useSnackbarStore.getState();

      if (tokens < DOCUMENT_TOOL_COST) {
        const errorMessage = `You need ${DOCUMENT_TOOL_COST} tokens for this, but you only have ${tokens}.`;
        return { id: fc.id, name: fc.name, response: { result: `Error: ${errorMessage}` } };
      }

      showSnackbar(`Creating document: ${fc.args.document_type}...`, 'info');

      try {
        const prompt = `
          Generate the full HTML content for a professional business document.
          Document Type: ${fc.args.document_type}
          Specific Details: ${fc.args.details}

          Please format the output as clean, single-file HTML, including inline CSS for styling. The design should be professional and suitable for a business context. Do not include any explanations, just the raw HTML code.
        `;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        let htmlContent = response.text.replace(/^```html\n|```$/g, '');
        const element = document.createElement('div');
        element.innerHTML = htmlContent;

        const pdfBlob = await html2pdf().from(element).set({
          margin: 1,
          filename: `${fc.args.document_type.replace(/\s/g, '_')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).output('blob');

        const dataUrl = URL.createObjectURL(pdfBlob);

        const newAttachment: Attachment = {
            name: `${fc.args.document_type.replace(/\s/g, '_')}.pdf`,
            type: 'application/pdf',
            dataUrl: dataUrl,
        };

        useLogStore.getState().addTurn({
            role: 'agent',
            text: `Here is the ${fc.args.document_type} you requested.`,
            attachments: [newAttachment],
            isFinal: true,
        });

        decrementTokens(DOCUMENT_TOOL_COST);
        const newTokens = useUserStore.getState().tokens;
        if (user) {
          await supabase
            .from('user_settings')
            .update({ tokens: newTokens })
            .eq('id', user.id);
        }
        showSnackbar(`Document created! ${DOCUMENT_TOOL_COST} tokens deducted.`, 'success');

        return { id: fc.id, name: fc.name, response: { result: 'OK. The document has been generated and displayed.' } };
      } catch (e: any) {
        console.error('Document generation error:', e);
        showSnackbar(`Failed to create document: ${e.message}`, 'error');
        return { id: fc.id, name: fc.name, response: { result: `Error: Failed to create document. ${e.message}` } };
      }
    };
    
    // == MAIN TOOL CALL HANDLER ==
    const onToolCall = async (toolCall: LiveServerToolCall) => {
      const functionResponses: any[] = [];
      const { requestConfirmation } = useUI.getState();
      const { showSnackbar } = useSnackbarStore.getState();
      const allTools = useTools.getState().tools;

      for (const fc of toolCall.functionCalls) {
        if (user?.email && ADMIN_ONLY_TOOLS.includes(fc.name) && user.email !== 'masterdee@aiteksoftware.site') {
           const systemMessage = `I'm sorry, the tool '${fc.name}' is currently restricted to administrators.`;
           functionResponses.push({ id: fc.id, name: fc.name, response: { result: systemMessage } });
           continue;
        }

        const triggerMessage = `Triggering function call: **${
          fc.name
        }**\n\`\`\`json\n${JSON.stringify(fc.args, null, 2)}\n\`\`\``;
        addTurn({
          role: 'system',
          text: triggerMessage,
          isFinal: true,
          toolUseRequest: { functionCalls: [fc] }
        });

        const executeTool = async () => {
          let response;
          if (fc.name === 'send_gmail_message') {
            response = await executeSendGmailTool(fc);
          } else if (fc.name === 'send_whatsapp_message') {
            response = await executeSendWhatsAppTool(fc);
          } else if (fc.name === 'create_calendar_event') {
              response = await executeCalendarEventTool(fc, user!);
          } else if (IMAGE_TOOLS.includes(fc.name)) {
            response = await (fc.name === 'generate_image' ? executeImageGenerationTool(fc) : executeImageEditingTool(fc));
          } else if (fc.name === 'generate_video') {
            response = await executeVideoGenerationTool(fc);
          } else if (fc.name === 'create_business_presentation') {
            response = await executePresentationGenerationTool(fc);
          } else if (fc.name === 'create_document') {
            response = await executeDocumentGenerationTool(fc);
          } else if (NATIVE_GEMINI_TOOLS.includes(fc.name)) {
            // These tools are handled by the model's own knowledge and should not be dispatched here.
            // This is a safeguard; the model should ideally respond directly.
            response = { id: fc.id, name: fc.name, response: { result: `The request for '${fc.name}' will be handled directly in my response.` } };
          } else {
            response = await executeWebhookTool(fc);
          }
          functionResponses.push(response);

          if (functionResponses.length === toolCall.functionCalls.length) {
            client.sendToolResponse({ functionResponses: functionResponses });
          }
        };

        if (SENSITIVE_TOOLS.includes(fc.name)) {
          const toolDefinition = allTools.find(t => t.name === fc.name);
          requestConfirmation({
            icon: toolDefinition?.icon,
            title: 'Confirm Action',
            prompt: React.createElement(
              React.Fragment,
              null,
              "Please confirm you want to execute the action: ",
              React.createElement("strong", null, fc.name)
            ),
            details: fc.args,
            confirmText: 'Confirm',
            onConfirm: executeTool,
            onCancel: () => {
              showSnackbar(`Action '${fc.name}' was cancelled.`, 'info');
              functionResponses.push({
                id: fc.id,
                name: fc.name,
                response: { result: 'The user cancelled the action.' },
              });
              if (functionResponses.length === toolCall.functionCalls.length) {
                client.sendToolResponse({ functionResponses });
              }
            },
          });
        } else {
          executeTool();
        }
      }
    };
    
    // Bind event listeners
    client.on('open', onOpen);
    client.on('close', onClose);
    client.on('interrupted', stopAudioStreamer);
    client.on('audio', onAudio);
    client.on('inputTranscription', handleInputTranscription);
    client.on('outputTranscription', handleOutputTranscription);
    client.on('content', handleContent);
    client.on('turncomplete', handleTurnComplete);
    client.on('toolcall', onToolCall);

    return () => {
      // Clean up event listeners
      client.off('open', onOpen);
      client.off('close', onClose);
      client.off('interrupted', stopAudioStreamer);
      client.off('audio', onAudio);
      client.off('inputTranscription', handleInputTranscription);
      client.off('outputTranscription', handleOutputTranscription);
      client.off('content', handleContent);
      client.off('turncomplete', handleTurnComplete);
      client.off('toolcall', onToolCall);
    };
  }, [client, ai, apiKey, user, playConnectChime, playDisconnectChime]);

  const connect = useCallback(async () => {
    if (!config) {
      throw new Error('config has not been set');
    }
    client.disconnect();
    await client.connect(config);
  }, [client, config]);

  const disconnect = useCallback(async () => {
    client.disconnect();
    setConnected(false);
  }, [setConnected, client]);

  return {
    client,
    config,
    setConfig,
    connect,
    connected,
    disconnect,
    user,
  };
}