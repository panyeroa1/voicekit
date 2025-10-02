"use client";
import React, { useEffect } from 'react';
import { useUI } from '../../lib/state';
import './Apps.css';

const AppViewer: React.FC = () => {
  const { viewingApp, setViewingApp } = useUI();

  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  if (!viewingApp) return null;

  return (
    <div className="app-viewer-overlay">
      <header className="app-viewer-header">
        <div className="app-viewer-title">
          <img src={viewingApp.logo_url} alt={`${viewingApp.name} Logo`} className="app-logo" />
          <h3>{viewingApp.name}</h3>
        </div>
        <button onClick={() => setViewingApp(null)} className="close-button action-button" title="Close App View">
          <span className="icon">close</span>
        </button>
      </header>
      <iframe
        src={viewingApp.app_url}
        title={viewingApp.name}
        className="app-viewer-content"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
};

export default AppViewer;