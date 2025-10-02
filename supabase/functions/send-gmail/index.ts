import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getOAuthClient } from '../_shared/google.ts'
import { google } from 'googleapis'

function createRFC822Message({ from, to, subject, text, html }: {
  from: string; to: string; subject: string; text?: string; html?: string;
}) {
  const boundary = "__app_boundary__";
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    text || "",
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    html || (text ? `<p>${text}</p>` : ""),
    "",
    `--${boundary}--`
  ];
  const message = lines.join("\r\n");
  const base64Message = btoa(message);
  return base64Message.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not found");

    const body = await req.json();
    const { to, subject, text, html, fromFallback } = body as {
      to: string; subject: string; text?: string; html?: string; fromFallback?: string;
    };
    if (!to || !subject) throw new Error('Missing "to" or "subject"');

    const { data: account, error } = await supabaseClient.from('user_google_accounts').select('*').eq('user_id', user.id).single();
    if (error || !account) throw new Error('Gmail account not connected.');

    const { access_token, refresh_token, expiry_date, email } = account;
    
    const oauth2Client = getOAuthClient();
    oauth2Client.setCredentials({
      access_token: access_token || undefined,
      refresh_token: refresh_token || undefined,
      expiry_date: expiry_date ? Number(expiry_date) : undefined,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const raw = createRFC822Message({
      from: email || fromFallback || 'me',
      to, subject, text, html,
    });

    const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });

    const newCreds = oauth2Client.credentials;
    if (newCreds && newCreds.access_token !== access_token) {
      await supabaseClient.from('user_google_accounts').update({
        access_token: newCreds.access_token || access_token,
        expiry_date: newCreds.expiry_date ? Number(newCreds.expiry_date) : expiry_date,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
    }
    
    return new Response(JSON.stringify({ id: res.data.id, threadId: res.data.threadId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
