"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { useUI, App } from '../../lib/state';
import ToolIcon from '../ToolIcon';
import { supabase } from '../../lib/supabase';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import './Apps.css';

type DbAppRow = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  logo_url: string | null;
  app_url: string | null;
  created_at?: string | null;
};

const AppsTab: React.FC = () => {
  const setViewingApp = useUI(state => state.setViewingApp);
  const { user } = useLiveAPIContext();
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApps = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('user_apps')
      .select('id, user_id, name, description, logo_url, app_url, created_at')
      .order('created_at', { ascending: false });

    // If a user exists, show only their apps; otherwise show all
    if (user?.id) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching apps:', error.message);
      setApps([]);
      setLoading(false);
      return;
    }

    const mapped: App[] = (data as DbAppRow[]).map(row => ({
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      logo_url: row.logo_url ?? '',
      app_url: row.app_url ?? '',
    }));

    setApps(mapped);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchApps();
  }, [fetchApps]);

  // allow other components (AddAppModal) to trigger refresh
  useEffect(() => {
    const handler = () => fetchApps();
    window.addEventListener('apps:refresh', handler);
    return () => window.removeEventListener('apps:refresh', handler);
  }, [fetchApps]);

  if (loading) {
    return <div className="apps-tab-container">Loading apps...</div>;
  }

  if (!apps || apps.length === 0) {
    return (
      <div className="apps-tab-container empty-apps">
        <span className="icon">apps</span>
        <h3>No Apps Installed</h3>
        <p>Click the '+' icon in the header to add a new app.</p>
      </div>
    );
  }

  return (
    <div className="apps-tab-container">
      <div className="apps-list">
        {apps.map(app => (
          <div
            key={app.id || app.name}
            className="app-card"
            onClick={() => setViewingApp(app)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setViewingApp(app)}
            role="button"
            tabIndex={0}
            aria-label={`Open app: ${app.name}`}
          >
            <div className="app-card-logo">
              {app.logo_url?.startsWith('icon:') ? (
                <ToolIcon icon={app.logo_url.substring(5)} />
              ) : (
                <img src={app.logo_url} alt={`${app.name} logo`} />
              )}
            </div>
            <div className="app-card-info">
              <h4 className="app-card-title">{app.name}</h4>
              <p className="app-card-description">{app.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AppsTab;