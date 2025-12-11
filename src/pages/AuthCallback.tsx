import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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
          // Check if user has completed onboarding (has username)
          const { data: profile } = await supabase
            .from('profiles')
            .select('username')
            .eq('user_id', session.user.id)
            .single();
          
          if (!profile?.username) {
            // User needs to complete onboarding
            navigate('/onboarding', { replace: true });
          } else {
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
