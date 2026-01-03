import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Interface untuk data OAuth dari berbagai provider
interface OAuthUserData {
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
  provider?: string;
}

// Fungsi untuk mengekstrak data dari user_metadata berdasarkan provider
function extractOAuthData(user: { user_metadata?: Record<string, unknown>; app_metadata?: { provider?: string }; email?: string }): OAuthUserData {
  const metadata = (user.user_metadata || {}) as Record<string, string | undefined>;
  const provider = user.app_metadata?.provider || '';

  let displayName = '';
  let username = '';
  let avatarUrl = '';
  const email = user.email || metadata.email || '';

  switch (provider) {
    case 'google':
      displayName = metadata.full_name || metadata.name || '';
      username = metadata.email?.split('@')[0] || '';
      avatarUrl = metadata.avatar_url || metadata.picture || '';
      break;
    case 'github':
      displayName = metadata.name || metadata.full_name || '';
      username = metadata.user_name || metadata.preferred_username || '';
      avatarUrl = metadata.avatar_url || '';
      break;
    case 'discord':
      displayName = metadata.full_name || metadata.global_name || metadata.name || '';
      username = metadata.name || metadata.custom_username || '';
      avatarUrl = metadata.avatar_url || '';
      break;
    default:
      displayName = metadata.full_name || metadata.name || '';
      username = metadata.user_name || metadata.preferred_username || email?.split('@')[0] || '';
      avatarUrl = metadata.avatar_url || '';
  }

  return {
    displayName,
    username: username.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
    avatarUrl,
    email,
    provider,
  };
}

export function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          navigate('/auth');
          return;
        }

        if (session) {
          // Ekstrak data dari OAuth provider
          const oauthData = extractOAuthData(session.user);

          // Check if user has completed onboarding (has username)
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', session.user.id)
            .single();

          if (!profile?.username) {
            // Jika profil sudah ada tapi belum punya username, update dengan data OAuth
            if (profile) {
              const updates: Record<string, string> = {};
              if (!profile.display_name && oauthData.displayName) {
                updates.display_name = oauthData.displayName;
              }
              if (!profile.avatar_url && oauthData.avatarUrl) {
                updates.avatar_url = oauthData.avatarUrl;
              }

              if (Object.keys(updates).length > 0) {
                await supabase
                  .from('profiles')
                  .update(updates)
                  .eq('user_id', session.user.id);
              }
            }

            // User needs to complete onboarding - pass OAuth data via state
            navigate('/onboarding', {
              replace: true,
              state: { oauthData }
            });
          } else {
            // User sudah onboarded, tapi update data OAuth jika ada yang kosong
            const updates: Record<string, string> = {};
            if (!profile.display_name && oauthData.displayName) {
              updates.display_name = oauthData.displayName;
            }
            if (!profile.avatar_url && oauthData.avatarUrl) {
              updates.avatar_url = oauthData.avatarUrl;
            }

            if (Object.keys(updates).length > 0) {
              await supabase
                .from('profiles')
                .update(updates)
                .eq('user_id', session.user.id);
            }

            // User already onboarded, go to home
            navigate('/', { replace: true });
          }
        } else {
          // No session found, redirect to auth page
          navigate('/auth');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        navigate('/auth');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2 w-full">
            <Skeleton className="h-4 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground animate-pulse">
        Completing sign in...
      </p>
    </div>
  );
}
