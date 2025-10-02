/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { useUI } from '../lib/state';
import KithaiLogo from './AionLogo';

type HeaderProps = {
  onSignOut: () => void;
  onClearSession: () => void;
};

export default function Header({ onSignOut, onClearSession }: HeaderProps) {
  const { toggleSettings, theme, toggleTheme, toggleChatVisibility } = useUI();

  return (
    <header>
      <div className="header-left">
        <KithaiLogo className="header-logo" />
        <h1>Kithai</h1>
      </div>
      <div className="header-right">
        <button
          className="action-button"
          onClick={toggleChatVisibility}
          aria-label="Toggle Chat"
          title="Toggle Chat"
        >
          <span className="icon">chat</span>
        </button>
        <button
          className="action-button"
          onClick={onClearSession}
          aria-label="Clear Chat Session"
          title="Clear Chat Session"
        >
          <span className="icon">refresh</span>
        </button>
        <button
          className="action-button"
          onClick={toggleSettings}
          aria-label="Settings"
          title="Settings"
        >
          <span className="icon">settings</span>
        </button>
        <button
          className="action-button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="icon">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
        </button>
        <button
          className="action-button"
          onClick={onSignOut}
          aria-label="Sign Out"
          title="Sign Out"
        >
          <span className="icon">logout</span>
        </button>
      </div>
    </header>
  );
}