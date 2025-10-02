"use client";
import React, { useState } from 'react';
import GmailConsentGate from '../integrations/GmailConsentGate';
import { useSnackbarStore } from '../../lib/state';
import { supabase } from '../../lib/supabase';

const EmailComposer: React.FC = () => {
  const [to, setTo] = useState('');
  const [subj, setSubj] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const { showSnackbar } = useSnackbarStore();

  const send = async () => {
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${process.env.SUPABASE_URL}/functions/v1/send-gmail`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          to,
          subject: subj,
          text: body,
          html: `<p>${body.replace(/\n/g, '<br/>')}</p>`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'SEND_FAILED');
      
      showSnackbar(`Email sent successfully to ${to}`, 'success');
      setTo(''); setSubj(''); setBody('');
    } catch (e: any) {
      showSnackbar(`Error: ${e.message}`, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <GmailConsentGate>
      <div className="settings-section" style={{padding: 0}}>
        <div className="form-field">
          <label htmlFor="email-to">To</label>
          <input id="email-to" value={to} onChange={e => setTo(e.target.value)} placeholder="someone@example.com" />
        </div>
        <div className="form-field">
          <label htmlFor="email-subject">Subject</label>
          <input id="email-subject" value={subj} onChange={e => setSubj(e.target.value)} placeholder="Subject" />
        </div>
        <div className="form-field">
          <label htmlFor="email-body">Body</label>
          <textarea id="email-body" value={body} onChange={e => setBody(e.target.value)} rows={4} />
        </div>
        <div className="modal-actions" style={{marginTop: '16px'}}>
          <button className="save-changes-button" onClick={send} disabled={sending || !to || !subj}>
            {sending ? 'Sending...' : 'Send via Gmail'}
          </button>
        </div>
      </div>
    </GmailConsentGate>
  );
};

export default EmailComposer;
