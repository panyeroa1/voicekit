

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useUI, useMemoryStore, MemoryData, useSnackbarStore } from '../lib/state';
import c from 'classnames';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const PERSONALITY_OPTIONS = [
  'Professional', 'Humorous', 'Sweet', 'Joker',
  'Bad Mouther', 'Jargonic', 'Asshole', 'Whatever'
];

export default function MemorySettings() {
  const { isMemorySettingsOpen, toggleMemorySettings } = useUI();
  const { connected, user } = useLiveAPIContext();
  const { showSnackbar } = useSnackbarStore();
  const memoryState = useMemoryStore();

  const [isSaving, setIsSaving] = useState(false);
  const [localMemory, setLocalMemory] = useState<MemoryData>(memoryState);

  useEffect(() => {
    // Sync local state when the global state changes (e.g., after loading from Supabase)
    setLocalMemory(memoryState);
  }, [memoryState]);

  const handleInputChange = (field: keyof MemoryData, value: string) => {
    setLocalMemory(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveChanges = async () => {
    if (!user) {
      showSnackbar('You must be logged in to save settings.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_memory')
        .upsert({ id: user.id, ...localMemory });
      
      if (error) throw error;

      // Update the global state after saving
      useMemoryStore.getState().setMemory(localMemory);

      showSnackbar('Memory updated successfully!', 'success');
    } catch (error: any) {
      console.error('Error saving memory:', error);
      showSnackbar(`Failed to save memory: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className={c('settings-view', { open: isMemorySettingsOpen })}>
      <div className="settings-header">
        <h3>Memory &amp; Personalization</h3>
        <button onClick={toggleMemorySettings} className="close-button action-button" title="Close memory settings">
          <span className="icon">close</span>
        </button>
      </div>
      <div className="settings-content">
        <div className="settings-section">
          <fieldset disabled={connected}>
              <div className="memory-card">
                <div className="memory-card-header">
                  <div className="icon-container"><span className="icon">psychology</span></div>
                  <h4>Agent Personality</h4>
                </div>
                <div className="memory-card-content">
                  <p className="setting-description">Choose how you want your assistant to interact with you. The model is uncensored and will adopt the selected persona.</p>
                  <select
                    value={localMemory.personality}
                    onChange={e => handleInputChange('personality', e.target.value)}
                    aria-label="Select agent personality"
                  >
                    {PERSONALITY_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="memory-card">
                <div className="memory-card-header">
                  <div className="icon-container"><span className="icon">block</span></div>
                  <h4>Exclusion Rules (AI Managed)</h4>
                </div>
                <div className="memory-card-content">
                  <p className="setting-description">Your assistant learns what you don't like and stores it here. You can also add rules manually.</p>
                  <textarea
                    value={localMemory.negativePrompt}
                    onChange={e => handleInputChange('negativePrompt', e.target.value)}
                    rows={5}
                    placeholder="e.g., Never use emojis. Do not mention the weather unless I ask..."
                  />
                </div>
              </div>

              <div className="memory-card">
                <div className="memory-card-header">
                  <div className="icon-container"><span className="icon">groups</span></div>
                  <h4>Key People & Contacts</h4>
                </div>
                <div className="memory-card-content">
                  <p className="setting-description">Help your assistant remember important people. Include names, roles, relationships, and contact info.</p>
                  <textarea
                    value={localMemory.keyPeople}
                    onChange={e => handleInputChange('keyPeople', e.target.value)}
                    rows={5}
                    placeholder="e.g., John Doe (CFO, john@example.com), My wife Jane (anniversary is June 5th)..."
                  />
                </div>
              </div>

              <div className="memory-card">
                <div className="memory-card-header">
                   <div className="icon-container"><span className="icon">business_center</span></div>
                  <h4>My Business & Goals</h4>
                </div>
                <div className="memory-card-content">
                   <p className="setting-description">Provide context about your work, industry, and objectives.</p>
                  <textarea
                    value={localMemory.myBusiness}
                    onChange={e => handleInputChange('myBusiness', e.target.value)}
                    rows={5}
                    placeholder="e.g., I run a SaaS company selling project management tools. Main goal for Q3 is to increase user retention by 15%..."
                  />
                </div>
              </div>

              <div className="memory-card">
                <div className="memory-card-header">
                   <div className="icon-container"><span className="icon">forum</span></div>
                  <h4>My Communication Style</h4>
                </div>
                <div className="memory-card-content">
                  <p className="setting-description">Define rules for how your assistant should communicate on your behalf or with you.</p>
                  <textarea
                    value={localMemory.commsStyle}
                    onChange={e => handleInputChange('commsStyle', e.target.value)}
                    rows={5}
                    placeholder="e.g., Be direct and concise in emails. Use emojis in informal chats. Never contact me after 8 PM unless it's an emergency..."
                  />
                </div>
              </div>

              <div className="memory-card">
                <div className="memory-card-header">
                   <div className="icon-container"><span className="icon">person</span></div>
                  <h4>Personal Notes & Preferences</h4>
                </div>
                <div className="memory-card-content">
                  <p className="setting-description">Add any personal details, facts, or preferences you want your assistant to remember.</p>
                  <textarea
                    value={localMemory.personalPrefs}
                    onChange={e => handleInputChange('personalPrefs', e.target.value)}
                    rows={5}
                    placeholder="e.g., My coffee order is a black Americano. I'm a fan of the Lakers. My kids' names are Leo and Mia..."
                  />
                </div>
              </div>
          </fieldset>
        </div>
      </div>
      <div className="settings-footer">
        <button
          className={c('save-changes-button', { saving: isSaving })}
          onClick={handleSaveChanges}
          disabled={isSaving}
          title="Save your memory and personalization settings"
        >
          {isSaving ? (
            <><span className="icon sync">sync</span> Saving...</>
          ) : (
            'Save Memory'
          )}
        </button>
      </div>
    </div>
  );
}
