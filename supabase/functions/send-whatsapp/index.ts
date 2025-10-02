import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { sendWhatsAppMessage } from '../_shared/meta.ts'

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

    const { to, text, template } = await req.json();
    if (!to || (!text && !template)) throw new Error('Missing "to" and message content');

    const { data: account, error } = await supabaseClient.from('user_whatsapp_accounts').select('*').eq('user_id', user.id).single();
    if (error || !account) throw new Error('WhatsApp account not connected.');
    
    const res = await sendWhatsAppMessage({
      phoneNumberId: account.phone_number_id,
      token: account.access_token,
      to,
      type: template ? 'template' : 'text',
      text,
      template,
    });
    
    return new Response(JSON.stringify({ ok: true, response: res }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
