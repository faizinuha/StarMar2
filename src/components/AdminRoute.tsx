import { ReactNode, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';

export type DashboardRole = 'admin' | 'moderator' | null;

const AdminRoute = ({ children }: { children: JSX.Element }) => {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<DashboardRole>(null);

  useEffect(() => {
    const checkRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (!error && data) {
          if (data.role === 'admin') setRole('admin');
          else if (data.role === 'moderator') setRole('moderator');
        }
      }
      setLoading(false);
    };

    checkRole();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!role) return <Navigate to="/" />;

  return children;
};

export default AdminRoute;
export { AdminRoute };
