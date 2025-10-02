"use client";
import React, { useState } from 'react';
import WhatsAppConsentGate from '../integrations/WhatsAppConsentGate';
import { useSnackbarStore } from '../../lib/state';
import { supabase } from '../../lib/supabase';

const WhatsAppSender: React.FC = () => {
  const [to, setTo] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { showSnackbar } = useSnackbarStore();

  const send = async () => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-whatsapp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ to, text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'SEND_FAILED');
      
      showSnackbar(`WhatsApp message sent to ${to}`, 'success');
      setTo(''); setText('');
    } catch (e: any) {
      showSnackbar(`Error: ${e.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <WhatsAppConsentGate>
       <div className="settings-section" style={{padding: 0}}>
        <div className="form-field">
          <label htmlFor="wa-to">Recipient (E.164)</label>
          <input id="wa-to" value={to} onChange={e => setTo(e.target.value)} placeholder="+14155552671" />
        </div>
        <div className="form-field">
          <label htmlFor="wa-message">Message</label>
          <textarea id="wa-message" rows={3} value={text} onChange={e => setText(e.target.value)} />
        </div>
        <div className="modal-actions" style={{marginTop: '16px'}}>
          <button className="save-changes-button" onClick={send} disabled={sending || !to || !text}>
            {sending ? 'Sending...' : 'Send via WhatsApp'}
          </button>
        </div>
       </div>
    </WhatsAppConsentGate>
  );
};

export default WhatsAppSender;
