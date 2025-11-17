import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.10.0';
console.log("log-session function booting up");
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
async function logUserSession(supabaseClient: { from: (arg0: string) => { (): any; new(): any; insert: { (arg0: any): PromiseLike<{ error: any; }> | { error: any; }; new(): any; }; }; }, session: { user_id: any; refresh_token?: any; device?: any; ip_address?: any; user_agent?: any; }, log: { user_id?: any; action: any; ip_address?: any; user_agent?: any; }) {
  console.log("Attempting to log session for user:", session.user_id);
  const { error: sessionError } = await supabaseClient.from('user_sessions').insert(session);
  if (sessionError) {
    console.error("Error logging session:", sessionError);
    throw new Error(`Failed to log session: ${sessionError.message}`);
  }
  console.log("Session logged successfully.");
  console.log("Attempting to log action:", log.action);
  const { error: logError } = await supabaseClient.from('user_logs').insert(log);
  if (logError) {
    console.error("Error logging action:", logError);
    throw new Error(`Failed to log action: ${logError.message}`);
  }
  console.log("Action logged successfully.");
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log("Missing auth header - skipping session log");
      return new Response(JSON.stringify({
        message: "Session log skipped - no auth header"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("SUPABASE_URL or SUPABASE_ANON_KEY are not set in environment variables");
    }
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.log("Could not get user - skipping session log");
      return new Response(JSON.stringify({
        message: "Session log skipped - invalid user"
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    
    const body = await req.json().catch(() => ({}));
    const { refreshToken, device } = body;
    
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    // Try to log session, but don't fail if it doesn't work
    if (refreshToken) {
      const sessionData = {
        user_id: user.id,
        refresh_token: refreshToken,
        device: device || 'Browser',
        ip_address: ipAddress,
        user_agent: userAgent
      };
      await supabaseClient.from('user_sessions').insert(sessionData).then(
        () => console.log("Session logged successfully"),
        (err) => console.error("Non-critical error logging session:", err)
      );
    }
    
    // Log the login action
    const logData = {
      user_id: user.id,
      action: 'login',
      ip_address: ipAddress,
      user_agent: userAgent
    };
    await supabaseClient.from('user_logs').insert(logData).then(
      () => console.log("Login action logged successfully"),
      (err) => console.error("Non-critical error logging action:", err)
    );
    
    return new Response(JSON.stringify({
      message: "Session logged successfully"
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error("An error occurred:", error instanceof Error ? error.message : error);
    // Return success anyway to not block login
    return new Response(JSON.stringify({
      message: "Session log completed with warnings"
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  }
});
