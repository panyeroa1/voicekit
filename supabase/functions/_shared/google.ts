/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { google } from "googleapis";

export function getOAuthClient() {
  const clientId = (globalThis as any).Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = (globalThis as any).Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = `${(globalThis as any).Deno.env.get('SUPABASE_URL')}/functions/v1/google-oauth-callback`;
  
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth environment variables missing.');
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  // 'https://www.googleapis.com/auth/gmail.modify',
];
