/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { FunctionCall, useSettings, useUI, useTools, useSnackbarStore } from '../lib/state';
import c from 'classnames';
import { AVAILABLE_VOICES, VOICE_NAME_MAP } from '../lib/constants';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { useState } from 'react';
import ToolEditorModal from './ToolEditorModal';
import { supabase } from '../lib/supabase';
import ToolIcon from './ToolIcon';
import AppsTab from './apps/AppsTab';
import ConnectGmailButton from './integrations/ConnectGmailButton';
import EmailComposer from './tools/EmailComposer';
import ConnectWhatsAppButton from './integrations/ConnectWhatsAppButton';
import WhatsAppSender from './tools/WhatsAppSender';


type SettingsTab = 'persona' | 'tools' | 'integrations' | 'apps';

export default function SettingsPage() {
  const { isSettingsOpen, toggleSettings, setIsAddingApp, requestConfirmation } = useUI();
  const { systemPrompt, voice, personaName, setSystemPrompt, setVoice, setPersonaName } = useSettings();
  const { tools, toggleTool, addTool, removeTool, updateTool } = useTools();
  const { connected, user } = useLiveAPIContext();
  const { showSnackbar } = useSnackbarStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>('persona');
  const [editingTool, setEditingTool] = useState<FunctionCall | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveTool = (updatedTool: FunctionCall) => {
    if (editingTool) {
      updateTool(editingTool.name, updatedTool);
    }
    setEditingTool(null);
  };

  const handleDeleteTool = (tool: FunctionCall) => {
    requestConfirmation({
      icon: 'delete',
      title: 'Delete Tool',
      prompt: <>Are you sure you want to delete the <strong>{tool.name}</strong> tool? This action cannot be undone.</>,
      danger: true,
      confirmText: 'Delete',
      onConfirm: () => {
        removeTool(tool.name);
        showSnackbar(`Tool '${tool.name}' deleted. Remember to save your changes.`, 'info');
      },
    });
  };

  const handleSaveChanges = async () => {
    if (!user) {
      showSnackbar('You must be logged in to save settings.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const settingsToSave = {
        personaName: useSettings.getState().personaName,
        systemPrompt: useSettings.getState().systemPrompt,
        voice: useSettings.getState().voice,
        template: useTools.getState().template,
        tools: useTools.getState().tools,
      };

      const { error } = await supabase
        .from('user_settings')
        .upsert({ id: user.id, ...settingsToSave });

      if (error) throw error;

      showSnackbar('Settings saved successfully!', 'success');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showSnackbar(`Failed to save settings: ${error.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const ADMIN_ONLY_TOOLS = ['write_code_snippet', 'generate_video'];
  const displayedTools = user?.email === 'masterdee@aiteksoftware.site'
    ? tools
    : tools.filter(tool => !ADMIN_ONLY_TOOLS.includes(tool.name));
  
  const authorizedSystemPromptEditors = ['masterdee@aiteksoftware.site', 'emil@aiteksoftware.site'];

  return (
    <>
      <div className={c('settings-view', { open: isSettingsOpen })}>
        <div className="settings-header">
          <h3>Settings</h3>
          <div className="settings-header-actions">
            {activeTab === 'tools' && (
                <button onClick={addTool} className="action-button" title="Add New Tool">
                    <span className="icon">add</span>
                </button>
            )}
            {activeTab === 'apps' && (
              <button onClick={() => setIsAddingApp(true)} className="action-button" title="Add New App">
                  <span className="icon">add</span>
              </button>
            )}
            <button onClick={toggleSettings} className="close-button action-button" title="Close settings">
              <span className="icon">close</span>
            </button>
          </div>
        </div>

        <div className="settings-tabs">
          <button className={c('tab-button', { active: activeTab === 'persona' })} onClick={() => setActiveTab('persona')}>Persona</button>
          <button className={c('tab-button', { active: activeTab === 'tools' })} onClick={() => setActiveTab('tools')}>Tools</button>
          <button className={c('tab-button', { active: activeTab === 'integrations' })} onClick={() => setActiveTab('integrations')}>Integrations</button>
          <button className={c('tab-button', { active: activeTab === 'apps' })} onClick={() => setActiveTab('apps')}>Apps</button>
        </div>

        
          {activeTab === 'persona' && (
            <>
            <div className="settings-content">
              <div className="settings-section">
                <fieldset disabled={connected}>
                  <div className="persona-name-field">
                    <label htmlFor="persona-name-input">Persona Name</label>
                    <input
                      id="persona-name-input"
                      type="text"
                      value={personaName}
                      onChange={(e) => setPersonaName(e.target.value)}
                      placeholder="Give your assistant a name..."
                    />
                  </div>
                  {authorizedSystemPromptEditors.includes(user?.email || '') && (
                    <details className="collapsible-setting" open>
                      <summary>Roles &amp; Description</summary>
                      <textarea
                        value={systemPrompt}
                        onChange={e => setSystemPrompt(e.target.value)}
                        rows={15}
                        placeholder="Describe the role and personality of the AI..."
                        aria-label="Roles & Description"
                      />
                    </details>
                  )}
                  <label>
                    Voice
                    <select value={voice} onChange={e => setVoice(e.target.value)} disabled={connected} aria-label="Select voice">
                      {AVAILABLE_VOICES.map(v => (
                        <option key={v} value={v}>
                          {VOICE_NAME_MAP[v] || v}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              </div>
            </div>
            <div className="settings-footer">
                <button
                  className={c('save-changes-button', { saving: isSaving })}
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  title="Save your persona and tool settings"
                >
                  {isSaving ? (
                    <><span className="icon sync">sync</span> Saving...</>
                  ) : (
                    'Save Persona'
                  )}
                </button>
              </div>
            </>
          )}

          {activeTab === 'tools' && (
            <>
            <div className="settings-content">
              <div className="settings-section">
                <fieldset disabled={connected}>
                  <div className="tools-list">
                    {displayedTools.map(tool => (
                      <div key={tool.name} className="tool-card">
                        <div className="tool-card-icon">
                          <ToolIcon icon={tool.icon} />
                        </div>
                        <div className="tool-card-info">
                          <h4 className="tool-card-title">{tool.name}</h4>
                          <p className="tool-card-description">{tool.description}</p>
                        </div>
                        <div className="tool-card-actions">
                          <button onClick={() => setEditingTool(tool)} className="action-button tool-edit-btn" aria-label={`Edit ${tool.name}`} title={`Edit ${tool.name}`}>
                            <span className="icon">edit</span>
                          </button>
                           <button onClick={() => handleDeleteTool(tool)} className="action-button tool-delete-btn" aria-label={`Delete ${tool.name}`} title={`Delete ${tool.name}`}>
                            <span className="icon">delete</span>
                          </button>
                          <label className="toggle-switch" title={`Enable/disable ${tool.name}`}>
                            <input
                              type="checkbox"
                              checked={tool.isEnabled}
                              onChange={() => toggleTool(tool.name)}
                            />
                            <span className="slider"></span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </fieldset>
              </div>
            </div>
             <div className="settings-footer">
              <button
                className={c('save-changes-button', { saving: isSaving })}
                onClick={handleSaveChanges}
                disabled={isSaving}
                title="Save your persona and tool settings"
              >
                {isSaving ? (
                  <><span className="icon sync">sync</span> Saving...</>
                ) : (
                  'Save Tools'
                )}
              </button>
            </div>
            </>
          )}

          {activeTab === 'integrations' && (
             <div className="settings-content">
              <div className="settings-section" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                <section>
                  <h3>Gmail</h3>
                  <p className="setting-description">Connect your Gmail so the agent can send emails for you.</p>
                  <EmailComposer />
                </section>

                <hr style={{opacity: 0.2}} />

                <section>
                  <h3>WhatsApp</h3>
                  <p className="setting-description">Connect your WhatsApp Business number to let the agent send messages for you.</p>
                  <WhatsAppSender />
                </section>
              </div>
            </div>
          )}

          {activeTab === 'apps' && (
            <div className="settings-content">
              <AppsTab />
            </div>
          )}
        

      </div>
      {editingTool && (
        <ToolEditorModal
          tool={editingTool}
          user={user}
          onClose={() => setEditingTool(null)}
          onSave={handleSaveTool}
        />
      )}
    </>
  );
}