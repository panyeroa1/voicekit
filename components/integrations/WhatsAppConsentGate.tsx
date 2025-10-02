"use client";
import React, { useEffect, useState } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { supabase } from '../../lib/supabase';
import ConnectWhatsAppButton from './ConnectWhatsAppButton';

const WhatsAppConsentGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useLiveAPIContext();
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      if (!user) { setConnected(false); return; }
      const { data } = await supabase.from('user_whatsapp_accounts').select('id').eq('user_id', user.id).maybeSingle();
      if (!mounted) return;
      setConnected(!!data);
    };
    
    fetchStatus();
    
    const handleRefresh = () => fetchStatus();
    window.addEventListener('integrations:refresh', handleRefresh);

    return () => { 
      mounted = false; 
      window.removeEventListener('integrations:refresh', handleRefresh);
    };
  }, [user]);

  if (connected === null) return null;

  if (!connected) {
    return (
      <div className="apps-tab-container empty-apps">
        <span className="icon">sms</span>
        <p>Enter your WhatsApp Business number to let the agent send messages for you.</p>
        <ConnectWhatsAppButton />
      </div>
    );
  }

  return <>{children}</>;
};

export default WhatsAppConsentGate;
