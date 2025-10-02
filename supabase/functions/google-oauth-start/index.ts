import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getOAuthClient, GMAIL_SCOPES } from '../_shared/google.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    if (!state) throw new Error("State parameter is required");
    
    const oauth2Client = getOAuthClient();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GMAIL_SCOPES,
      state: state,
    });
    
    return Response.redirect(authUrl);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
