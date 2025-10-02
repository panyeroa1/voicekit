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

import cn from 'classnames';

import React, { memo, ReactNode, useEffect, useRef, useState } from 'react';
import { AudioRecorder } from '../../../lib/audio-recorder';
import { useLogStore, Attachment, useSnackbarStore, useUI, ConversationTurn } from '../../../lib/state';

import { useLiveAPIContext } from '../../../contexts/LiveAPIContext';
import { Part } from '@google/genai';

export type ControlTrayProps = {
  children?: ReactNode;
};

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
}

function ControlTray({ children }: ControlTrayProps) {
  const [audioRecorder] = useState(() => new AudioRecorder());
  const connectButtonRef = useRef<HTMLButtonElement>(null);
  const { client, connected, connect, disconnect } = useLiveAPIContext();
  const { 
    isChatVisible, isMuted, toggleMute, 
    inputVolume, outputVolume, setInputVolume,
    isCameraOn, toggleCamera, isScreenSharing, toggleScreenSharing,
    toggleMemorySettings,
  } = useUI();

  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [otherAttachmentName, setOtherAttachmentName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { showSnackbar } = useSnackbarStore();

  useEffect(() => {
    if (!connected && connectButtonRef.current) {
      connectButtonRef.current.focus();
    }
  }, [connected]);

  useEffect(() => {
    const onData = (base64: string) => {
      client.sendRealtimeInput([
        {
          mimeType: 'audio/pcm;rate=16000',
          data: base64,
        },
      ]);
    };
    if (connected && audioRecorder) {
      audioRecorder.on('data', onData);
      audioRecorder.start();
    } else {
      audioRecorder.stop();
    }
    return () => {
      audioRecorder.off('data', onData);
    };
  }, [connected, client, audioRecorder]);

  useEffect(() => {
    const handleVolume = (volume: number) => {
      setInputVolume(connected ? volume : 0);
    };
    audioRecorder.on('volume', handleVolume);
    return () => {
      audioRecorder.off('volume', handleVolume);
    };
  }, [audioRecorder, setInputVolume, connected]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [message]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit for docs
      showSnackbar('File size should be less than 10MB.', 'error');
      return;
    }

    if (file.type.startsWith('image/')) {
      setAttachment(file);
      setOtherAttachmentName(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment(file);
      setAttachmentPreview(null);
      setOtherAttachmentName(file.name);
    }
  };

  const handleRemoveAttachment = () => {
    setAttachment(null);
    setAttachmentPreview(null);
    setOtherAttachmentName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async () => {
    const messageToSend = message.trim();
    const hasMessage = !!messageToSend;
    const hasAttachment = !!attachment;

    if (!hasMessage && !hasAttachment) return;
    if (!connected) {
      showSnackbar('Please connect to start chatting.', 'info');
      return;
    }

    const partsForClient: Part[] = [];
    const attachmentsForLog: Attachment[] = [];

    if (hasAttachment) {
      const mimeType = attachment!.type;
      const base64Data = await blobToBase64(attachment!);
      const dataUrl = `data:${mimeType};base64,${base64Data}`;
      partsForClient.push({ inlineData: { mimeType, data: base64Data } });
      attachmentsForLog.push({ name: attachment!.name, type: mimeType, dataUrl });
    }

    if (hasMessage) {
      const instruction = " \n\n[SYSTEM INSTRUCTION: when responding, do not include any audio tags as text to read or convert into TTS, these tags inside [] are meant to show how the TTS audio must sound like]";
      partsForClient.push({ text: messageToSend + instruction });
    }

    const newTurn: Omit<ConversationTurn, 'timestamp'> = {
      role: 'user',
      text: messageToSend,
      isFinal: true,
      attachments: attachmentsForLog,
    };
    useLogStore.getState().addTurn(newTurn);

    client.send(partsForClient);

    setMessage('');
    handleRemoveAttachment();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const connectButtonTitle = connected ? 'Stop streaming' : 'Start streaming';

  return (
    <section className="control-tray">
      {isChatVisible && (
        <div className="chat-input-area">
          {(attachmentPreview || otherAttachmentName) && (
            <div className={cn("attachment-preview", { 'file': otherAttachmentName })}>
              {attachmentPreview && <img src={attachmentPreview} alt={attachment?.name || 'Preview'} />}
              {otherAttachmentName && <><span className="icon">description</span><span className="file-name">{otherAttachmentName}</span></>}
              <button onClick={handleRemoveAttachment} className="remove-attachment-btn" aria-label="Remove attachment" title="Remove attachment">
                <span className="icon">close</span>
              </button>
            </div>
          )}
          <div className="chat-input-bar">
            <button
              className="action-button attach-button"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
              disabled={!connected}
              aria-label="Attach file"
            >
              <span className="icon">attach_file</span>
            </button>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={connected ? "Type a message..." : "Connect to start chatting..."}
              rows={1}
              disabled={!connected}
              aria-label="Chat message input"
            />
            <button
              className="action-button send-button"
              onClick={handleSendMessage}
              title="Send message"
              aria-label="Send message"
              disabled={(!message.trim() && !attachment) || !connected}
            >
              <span className="icon">chat</span>
            </button>
          </div>
        </div>
      )}

      <div className="main-controls-bar">
        <nav className={cn('actions-nav')}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,text/plain"
          />
          {!isChatVisible && (
            <>
              <button
                className={cn('action-button')}
                onClick={toggleMemorySettings}
                aria-label="Memory & Personalization"
                title="Memory & Personalization"
              >
                <span className="icon">psychology</span>
              </button>
              <button
                className={cn('action-button', 'video-button', { active: isCameraOn })}
                onClick={toggleCamera}
                title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                aria-label={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
                disabled={!connected}
              >
                <span className="icon">{isCameraOn ? 'videocam_off' : 'videocam'}</span>
              </button>
            </>
          )}

          <div className="connect-button-wrapper">
            <div
              className="visualizer-ring output"
              style={{
                transform: `translate(-50%, -50%) scale(${1 + outputVolume * 1.5})`,
                opacity: connected && outputVolume > 0.01 ? 1 : 0
              }}
            />
            <button
              ref={connectButtonRef}
              className={cn('action-button connect-toggle', { connected })}
              onClick={connected ? disconnect : connect}
              title={connectButtonTitle}
              aria-label={connectButtonTitle}
            >
              <div
                className="visualizer-ring input"
                style={{
                  transform: `translate(-50%, -50%) scale(${inputVolume * 5})`,
                  opacity: connected && inputVolume > 0.01 ? 0.7 : 0
                }}
              />
              <span className="icon">
                {connected ? 'stop' : 'graphic_eq'}
              </span>
            </button>
          </div>

          {!isChatVisible && (
            <>
              <button
                className={cn('action-button', { active: isScreenSharing })}
                onClick={toggleScreenSharing}
                title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                aria-label={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
                disabled={!connected}
              >
                <span className="icon">{isScreenSharing ? 'stop_screen_share' : 'screen_share'}</span>
              </button>
              <button
                  className="action-button"
                  onClick={toggleMute}
                  disabled={!connected}
                  title={isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                  aria-label={isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
                >
                <span className="icon">{isMuted ? 'volume_off' : 'volume_up'}</span>
              </button>
            </>
          )}
          
          {isChatVisible && (
             <button
              className="action-button"
              onClick={toggleMute}
              disabled={!connected}
              title={isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
              aria-label={isMuted ? 'Unmute Speaker' : 'Mute Speaker'}
            >
            <span className="icon">{isMuted ? 'volume_off' : 'volume_up'}</span>
          </button>
          )}


          {children}
        </nav>
      </div>
    </section>
  );
}

export default memo(ControlTray);