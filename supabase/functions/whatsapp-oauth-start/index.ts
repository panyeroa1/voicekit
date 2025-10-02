import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getOAuthUrl } from "../_shared/meta.ts";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const state = url.searchParams.get("state");
    const phone = url.searchParams.get("phone") || '';
    
    if (!state) throw new Error("State parameter is required");
    
    const authUrl = getOAuthUrl(state, phone);
    
    return Response.redirect(authUrl);

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});
