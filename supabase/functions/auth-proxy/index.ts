import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { action, email, password, fullName, refreshToken, accessToken, redirectUrl } =
      await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    console.log(`[auth-proxy] action=${action}, email=${email ?? "(none)"}`);

    // Use anon key so normal auth rules apply (not service role)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    switch (action) {
      // ── SIGN IN ──────────────────────────────────────────────
      case "sign-in": {
        if (!email || !password) {
          return jsonResponse({ error: "Email and password are required" }, 400);
        }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          console.error("[auth-proxy] sign-in error:", error.message);
          return jsonResponse({ error: error.message }, 401);
        }
        console.log("[auth-proxy] sign-in success for", email);
        return jsonResponse({
          session: {
            access_token: data.session!.access_token,
            refresh_token: data.session!.refresh_token,
            expires_in: data.session!.expires_in,
            token_type: data.session!.token_type,
            user: data.user,
          },
        });
      }

      // ── SIGN UP ──────────────────────────────────────────────
      case "sign-up": {
        if (!email || !password) {
          return jsonResponse({ error: "Email and password are required" }, 400);
        }
        const options: Record<string, unknown> = {};
        if (redirectUrl) options.emailRedirectTo = redirectUrl;
        if (fullName) options.data = { full_name: fullName };

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options,
        });
        if (error) {
          console.error("[auth-proxy] sign-up error:", error.message);
          return jsonResponse({ error: error.message }, 400);
        }
        console.log("[auth-proxy] sign-up success for", email);
        return jsonResponse({
          session: data.session
            ? {
                access_token: data.session.access_token,
                refresh_token: data.session.refresh_token,
                expires_in: data.session.expires_in,
                token_type: data.session.token_type,
                user: data.user,
              }
            : null,
          user: data.user,
        });
      }

      // ── SIGN OUT ─────────────────────────────────────────────
      case "sign-out": {
        // If we have an access token, create an admin client to revoke it
        if (accessToken) {
          const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
          });
          await adminClient.auth.admin.signOut(accessToken);
        }
        console.log("[auth-proxy] sign-out processed");
        return jsonResponse({ success: true });
      }

      // ── RESET PASSWORD ──────────────────────────────────────
      case "reset-password": {
        if (!email) {
          return jsonResponse({ error: "Email is required" }, 400);
        }
        const resetOptions: Record<string, string> = {};
        if (redirectUrl) resetOptions.redirectTo = redirectUrl;

        const { error } = await supabase.auth.resetPasswordForEmail(email, resetOptions);
        if (error) {
          console.error("[auth-proxy] reset-password error:", error.message);
          return jsonResponse({ error: error.message }, 400);
        }
        console.log("[auth-proxy] reset-password email sent to", email);
        return jsonResponse({ success: true });
      }

      // ── GET SESSION (refresh) ───────────────────────────────
      case "get-session": {
        if (!refreshToken) {
          return jsonResponse({ error: "Refresh token is required" }, 400);
        }
        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
        if (error) {
          console.error("[auth-proxy] get-session error:", error.message);
          return jsonResponse({ error: error.message }, 401);
        }
        if (!data.session) {
          return jsonResponse({ error: "No session returned" }, 401);
        }
        console.log("[auth-proxy] session refreshed");
        return jsonResponse({
          session: {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_in: data.session.expires_in,
            token_type: data.session.token_type,
            user: data.user,
          },
        });
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err) {
    console.error("[auth-proxy] unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
