import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'supabase-js'
import { corsHeaders } from '../_shared/cors.ts'
import { getOAuthClient } from '../_shared/google.ts'
import { exchangeCodeForToken, getWABAs, getPhoneNumbers } from '../_shared/meta.ts'

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { code, provider } = await req.json();
    if (!code || !provider) {
      throw new Error("Missing code or provider");
    }

    const supabaseClient = createClient(
      (globalThis as any).Deno.env.get('SUPABASE_URL') ?? '',
      (globalThis as any).Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error("User not found");

    if (provider === 'google') {
      const oauth2Client = getOAuthClient();
      const { tokens } = await oauth2Client.getToken(code);
      const idTokenInfo = tokens.id_token ? JSON.parse(atob(tokens.id_token.split('.')[1])) : null;

      const { error } = await supabaseClient.from('user_google_accounts').upsert({
        user_id: user.id,
        provider: 'google',
        email: idTokenInfo?.email || null,
        access_token: tokens.access_token || null,
        refresh_token: tokens.refresh_token || null,
        scope: tokens.scope || null,
        token_type: tokens.token_type || null,
        expiry_date: tokens.expiry_date ? Number(tokens.expiry_date) : null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;
      
    } else if (provider === 'whatsapp') {
      const token = await exchangeCodeForToken(code);
      const access_token = token.access_token;
      const expires_at = Math.floor(Date.now() / 1000) + (token.expires_in || 0);
      const wabAs = await getWABAs(access_token);
      if (!wabAs.length) throw new Error("No WhatsApp Business Accounts found.");
      
      // Assume first WABA and first phone number for simplicity
      const wabaId = wabAs[0].id;
      const phoneNumbers = await getPhoneNumbers(wabaId, access_token);
      if (!phoneNumbers.length) throw new Error("No phone numbers found for WABA.");
      const phone = phoneNumbers[0];

      const { error } = await supabaseClient.from('user_whatsapp_accounts').upsert({
        user_id: user.id,
        waba_id: wabaId,
        phone_number_id: phone.id,
        phone_number: phone.display_phone_number,
        access_token,
        token_type: token.token_type || 'Bearer',
        expires_at,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      if (error) throw error;

    } else {
      throw new Error("Unsupported provider");
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: (error as any).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
