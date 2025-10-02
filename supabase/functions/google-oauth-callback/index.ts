import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  const siteUrl = (globalThis as any).Deno.env.get('SITE_URL') || 'http://localhost:5173';

  const redirectUrl = new URL(siteUrl);

  if (error) {
    redirectUrl.searchParams.set('error', error);
    if (errorDescription) {
      redirectUrl.searchParams.set('error_description', errorDescription);
    }
  } else {
    redirectUrl.searchParams.set('oauth_code', code!);
    redirectUrl.searchParams.set('oauth_state', state!);
    redirectUrl.searchParams.set('provider', 'google');
  }

  return Response.redirect(redirectUrl);
});
