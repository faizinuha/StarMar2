import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const BannedUserRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user) {
        setChecked(true);
        return;
      }

      // Don't redirect if already on checkpoint page
      if (location.pathname === '/checkpoint') {
        setChecked(true);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('is_banned')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error checking ban status:', error);
          setChecked(true);
          return;
        }

        if (profile?.is_banned) {
          navigate('/checkpoint', { replace: true });
        }
      } catch (err) {
        console.error('Ban check error:', err);
      } finally {
        setChecked(true);
      }
    };

    checkBanStatus();
  }, [user, location.pathname, navigate]);

  return null;
};
