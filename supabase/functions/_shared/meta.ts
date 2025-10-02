/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
export const GRAPH = (globalThis as any).Deno.env.get('META_GRAPH_VERSION') || 'v19.0';
export const APP_ID = (globalThis as any).Deno.env.get('META_APP_ID');
export const APP_SECRET = (globalThis as any).Deno.env.get('META_APP_SECRET');
export const REDIRECT_URI = `${(globalThis as any).Deno.env.get('SUPABASE_URL')}/functions/v1/whatsapp-oauth-callback`;

export function getOAuthUrl(state: string, phone: string) {
  const scopes = [
    'whatsapp_business_management',
    'whatsapp_business_messaging',
  ].join(',');
  const p = new URLSearchParams({
    client_id: APP_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: scopes,
    state,
  });
  // Add pre-filled phone number to setup config
  const setup = JSON.stringify({
    prefilled_phone_number: phone.replace('+', '')
  });
  p.set('config_id', (globalThis as any).Deno.env.get('META_CONFIG_ID')); // You need to create a config in the Meta App dashboard
  p.set('override_default_response_type', 'true');
  p.set('setup', setup);


  return `https://www.facebook.com/${GRAPH}/dialog/oauth?${p.toString()}`;
}

export async function exchangeCodeForToken(code: string) {
  const q = new URLSearchParams({
    client_id: APP_ID,
    client_secret: APP_SECRET,
    redirect_uri: REDIRECT_URI,
    code,
  });
  const res = await fetch(`https://graph.facebook.com/${GRAPH}/oauth/access_token?${q.toString()}`);
  if (!res.ok) throw new Error('Token exchange failed');
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in: number; }>;
}

export async function getWABAs(userAccessToken: string) {
  const url = `https://graph.facebook.com/${GRAPH}/me/whatsapp_business_accounts?fields=id,name&access_token=${userAccessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Cannot list WABAs');
  const json = await res.json();
  return (json.data || []) as Array<{ id: string; name?: string }>;
}

export async function getPhoneNumbers(wabaId: string, userAccessToken: string) {
  const url = `https://graph.facebook.com/${GRAPH}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name&access_token=${userAccessToken}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Cannot list numbers');
  const json = await res.json();
  return (json.data || []) as Array<{ id: string; display_phone_number: string; verified_name?: string }>;
}

export async function sendWhatsAppMessage({
  phoneNumberId,
  token,
  to,
  type = 'text',
  text,
  template,
}: {
  phoneNumberId: string;
  token: string;
  to: string;
  type?: 'text' | 'template';
  text?: string;
  template?: { name: string; language: string; components?: any[] };
}) {
  const url = `https://graph.facebook.com/${GRAPH}/${phoneNumberId}/messages`;
  const body =
    type === 'template'
      ? { messaging_product: 'whatsapp', to, type: 'template', template }
      : { messaging_product: 'whatsapp', to, type: 'text', text: { body: text || '' } };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'WhatsApp send failed');
  return data;
}
