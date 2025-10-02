"use client";
import React, { useEffect, useState } from 'react';
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import { supabase } from '../../lib/supabase';

const ConnectWhatsAppButton: React.FC = () => {
  const { user } = useLiveAPIContext();
  const [connected, setConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      if (!user) { setConnected(false); setLoading(false); return; }
      const { data, error } = await supabase.from('user_whatsapp_accounts').select('id, phone_number').eq('user_id', user.id).maybeSingle();
      if (!mounted) return;
      setConnected(Boolean(data && !error));
      if (data?.phone_number) {
        setPhone(data.phone_number);
      }
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
  
  const validatePhone = (num: string) => {
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(num);
  }

  const connect = () => {
    if (!validatePhone(phone)) {
        setPhoneError('Please enter a valid E.164 phone number (e.g., +14155552671).');
        return;
    }
    setPhoneError('');
    setLoading(true);

    try {
        const state = crypto.randomUUID();
        localStorage.setItem('oauth_state_whatsapp', state);
        
        const params = new URLSearchParams({ state });
        if (phone) params.set('phone', phone);
        
        const supabaseUrl = process.env.SUPABASE_URL;
        window.location.href = `${supabaseUrl}/functions/v1/whatsapp-oauth-start?${params.toString()}`;
    } catch (e) {
        console.error("Failed to start WhatsApp OAuth flow", e);
        setLoading(false);
    }
  };

  if (loading) return <button className="action-button" disabled>Checking...</button>;

  if (connected) {
    return (
        <button className="action-button" disabled title={`WhatsApp connected to ${phone}`}>
            <span className="icon">check_circle</span>
            Connected
        </button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="tel"
          className="auth-input"
          placeholder="+14155552671"
          value={phone}
          onChange={e => setPhone(e.target.value)}
        />
        <button className="action-button" onClick={connect} title="Connect WhatsApp">
            <span className="icon">link</span>
            Connect
        </button>
      </div>
      {phoneError && <p className="error-message" style={{margin: 0}}>{phoneError}</p>}
    </div>
  );
};

export default ConnectWhatsAppButton;
