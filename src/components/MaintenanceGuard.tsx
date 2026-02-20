import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, Wrench } from 'lucide-react';
import { Navigation } from '@/components/layout/Navigation';

interface MaintenanceEntry {
  id: string;
  page_path: string;
  is_active: boolean;
  title: string;
  message: string;
  type: string;
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceEntry | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || 'user');
    };
    fetchRole();
  }, [user]);

  // Check maintenance status for current path
  useEffect(() => {
    const checkMaintenance = async () => {
      setLoading(true);
      const currentPath = location.pathname;

      // Fetch active maintenance for this specific path OR site-wide "/"
      const { data, error } = await supabase
        .from('maintenance_mode')
        .select('*')
        .eq('is_active', true)
        .in('page_path', [currentPath, '/']);

      if (error || !data || data.length === 0) {
        setBlocked(false);
        setMaintenance(null);
        setLoading(false);
        return;
      }

      // Prefer specific path match over site-wide
      const specificMatch = data.find(d => d.page_path === currentPath);
      const siteWide = data.find(d => d.page_path === '/');
      
      // Don't apply site-wide maintenance to the home page itself handled separately
      const active = specificMatch || (currentPath !== '/' ? siteWide : data.find(d => d.page_path === '/'));

      if (!active) {
        setBlocked(false);
        setMaintenance(null);
        setLoading(false);
        return;
      }

      setMaintenance(active as MaintenanceEntry);

      // Admin and moderator can bypass
      const isPrivileged = userRole === 'admin' || userRole === 'moderator';
      setBlocked(!isPrivileged);
      setLoading(false);
    };

    checkMaintenance();
  }, [location.pathname, userRole]);

  if (loading) return <>{children}</>;

  if (blocked && maintenance) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="md:ml-64 min-h-screen flex items-center justify-center pb-20 md:pb-8">
          <div className="max-w-md mx-auto p-8 text-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              {maintenance.type === 'blocked' ? (
                <Lock className="h-10 w-10 text-destructive" />
              ) : (
                <Wrench className="h-10 w-10 text-muted-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-bold">{maintenance.title}</h1>
            <p className="text-muted-foreground">{maintenance.message}</p>
            <div className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Halaman ini sedang dalam maintenance. Silakan coba lagi nanti.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
