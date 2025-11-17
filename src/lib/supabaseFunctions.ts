
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Define types for our tables to ensure type safety
export interface UserSession {
  id: string;
  user_id: string;
  device?: string;
  ip_address?: string;
  user_agent?: string;
  refresh_token: string;
  created_at: string;
  last_seen: string;
  is_active: boolean;
}

export interface UserLog {
  id: string;
  user_id: string;
  action: 'login' | 'logout' | 'password_change' | 'logout_all';
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Creates a new session for a user upon login and logs the action.
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user logging in.
 * @param refreshToken - The refresh token from the auth session.
 * @param device - Optional: A descriptor for the device.
 * @param ipAddress - Optional: The user's IP address.
 * @param userAgent - Optional: The user's browser/client user agent.
 * @returns The newly created session ID.
 */
export async function createSession(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string,
  device?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<string | null> {
  try {
    // Insert into user_sessions
    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: userId,
        refresh_token: refreshToken,
        device,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single();

    if (sessionError) throw sessionError;

    // Insert into user_logs
    const { error: logError } = await supabase.from('user_logs').insert({
      user_id: userId,
      action: 'login',
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (logError) throw logError;

    console.log('New session and login log created successfully.');
    return sessionData.id;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Updates the last_seen timestamp for a given session (heartbeat).
 * @param supabase - The Supabase client instance.
 * @param sessionId - The ID of the session to update.
 */
export async function updateLastSeen(supabase: SupabaseClient, sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_sessions')
      .update({ last_seen: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) throw error;

    console.log(`Session ${sessionId} heartbeat updated.`);
  } catch (error) {
    console.error('Error updating last_seen:', error);
  }
}

/**
 * Logs out a user from a single device by marking the session as inactive.
 * @param supabase - The Supabase client instance.
 * @param sessionId - The ID of the session to deactivate.
 * @param userId - The ID of the user logging out.
 */
export async function logoutSingleDevice(
  supabase: SupabaseClient,
  sessionId: string,
  userId: string
): Promise<void> {
  try {
    // Deactivate the session
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (sessionError) throw sessionError;

    // Log the logout action
    const { error: logError } = await supabase.from('user_logs').insert({
      user_id: userId,
      action: 'logout',
    });

    if (logError) throw logError;

    console.log(`Session ${sessionId} has been logged out.`);
  } catch (error) {
    console.error('Error during single device logout:', error);
  }
}

/**
 * Logs out the user from all devices except the current one.
 * @param supabase - The Supabase client instance.
 * @param currentSessionId - The ID of the current session to keep active.
 * @param userId - The ID of the current user.
 */
export async function logoutAllOtherDevices(
  supabase: SupabaseClient,
  currentSessionId: string,
  userId: string
): Promise<void> {
  try {
    // Deactivate all other active sessions for the user
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)
      .neq('id', currentSessionId);

    if (sessionError) throw sessionError;

    // Log the "logout all" action
    const { error: logError } = await supabase.from('user_logs').insert({
      user_id: userId,
      action: 'logout_all',
    });

    if (logError) throw logError;

    console.log('Logged out from all other devices successfully.');
  } catch (error) {
    console.error('Error logging out from all other devices:', error);
  }
}

/**
 * Queries all active sessions for the current user.
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user whose sessions to fetch.
 * @returns An array of active user sessions.
 */
export async function getActiveSessions(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSession[]> {
  try {
    const { data, error } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_seen', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    return [];
  }
}

/**
 * Queries the activity history for the current user.
 * @param supabase - The Supabase client instance.
 * @param userId - The ID of the user whose logs to fetch.
 * @param limit - The number of log entries to return.
 * @returns An array of user logs.
 */
export async function getUserActivity(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 50
): Promise<UserLog[]> {
  try {
    const { data, error } = await supabase
      .from('user_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching user activity:', error);
    return [];
  }
}

/**
 * --- How to Trigger Notifications on New Log Entries ---
 *
 * To trigger real-time notifications (e.g., "A new device has logged into your account"),
 * you have two primary options with Supabase:
 *
 * 1. Supabase Realtime: Listen for database changes directly from the client.
 *    You can subscribe to inserts on the `user_logs` table. This is great for
 *    updating the UI in real-time.
 *
 *    Example (in a React component):
 *    useEffect(() => {
 *      const channel = supabase.channel('user-logs-channel')
 *        .on(
 *          'postgres_changes',
 *          { event: 'INSERT', schema: 'public', table: 'user_logs', filter: `user_id=eq.${userId}` },
 *          (payload) => {
 *            console.log('New log entry:', payload.new);
 *            // Here you would trigger a toast notification or update state
 *            // e.g., toast.info(`New login detected on ${payload.new.device}`);
 *          }
 *        )
 *        .subscribe();
 *
 *      return () => {
 *        supabase.removeChannel(channel);
 *      };
 *    }, [userId]);
 *
 * 2. Supabase Functions (via Database Webhooks):
 *    This is a more robust and secure approach for sending notifications like emails or push notifications.
 *    - Create a new Edge Function in your `supabase/functions` directory.
 *    - This function will receive a payload whenever a new row is inserted into `user_logs`.
 *    - Inside the function, you can use services like Twilio (for SMS), Resend (for email),
 *      or a push notification provider to send an alert.
 *    - Set up a database webhook (under Database > Webhooks in your Supabase dashboard)
 *      to trigger this function on `user_logs` table inserts.
 *
 *    This decouples your notification logic from your client-side code and prevents
 *    exposing sensitive API keys on the client.
 */
