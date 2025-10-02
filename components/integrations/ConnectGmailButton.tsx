"use client";
import React, { useEffect, useState } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { supabase } from '../../lib/supabase';

const ConnectGmailButton: React.FC = () => {
  const { user } = useLiveAPIContext();
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      if (!user) { setConnected(false); setLoading(false); return; }
      const { data, error } = await supabase.from('user_google_accounts').select('id').eq('user_id', user.id).maybeSingle();
      if (!mounted) return;
      setConnected(Boolean(data && !error));
      setLoading(false);
    };
    
    fetchStatus();

    const handleRefresh = () => fetchStatus();
    window.addEventListener('integrations:refresh', handleRefresh);
    
    return () => { 
        mounted = false; 
        window.removeEventListener('integrations:refresh', handleRefresh);
    };
  }, [user]);

  const connect = async () => {
    setLoading(true);
    try {
      const state = crypto.randomUUID();
      localStorage.setItem('oauth_state_google', state);
      
      const supabaseUrl = process.env.SUPABASE_URL;
      const startUrl = `${supabaseUrl}/functions/v1/google-oauth-start?state=${state}`;
      
      window.location.href = startUrl;
    } catch (e) {
      console.error("Failed to start Google OAuth flow", e);
      setLoading(false);
    }
  };

  if (loading) return <button className="action-button" disabled>Checking...</button>;

  return connected ? (
    <button className="action-button" disabled title="Gmail is connected">
        <span className="icon">check_circle</span>
        Connected
    </button>
  ) : (
    <button className="action-button" onClick={connect} title="Connect Gmail">
        <span className="icon">link</span>
        Connect Gmail
    </button>
  );
};

export default ConnectGmailButton;
