import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceEntry | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userVerified, setUserVerified] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user role and verification status
  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setUserRole(null);
        setUserVerified(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('role, is_verified')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || 'user');
      setUserVerified(data?.is_verified || null);
    };
    fetchRole();
  }, [user]);

  // Check maintenance status for current path
  useEffect(() => {
    const checkMaintenance = async () => {
      setLoading(true);
      const currentPath = location.pathname;

      // Skip maintenance check for auth pages
      if (currentPath === '/auth' || currentPath === '/auth/callback' || currentPath === '/auth/forgot-password') {
        setBlocked(false);
        setMaintenance(null);
        setLoading(false);
        return;
      }

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
      
      const active = specificMatch || (currentPath !== '/' ? siteWide : data.find(d => d.page_path === '/'));

      if (!active) {
        setBlocked(false);
        setMaintenance(null);
        setLoading(false);
        return;
      }

      setMaintenance(active as MaintenanceEntry);

      // Determine access based on role & verification
      // Admin: always bypass
      // Moderator: always bypass
      // Verified user (any role): bypass
      // Regular unverified user: blocked
      const isAdmin = userRole === 'admin';
      const isModerator = userRole === 'moderator';
      const isVerified = userVerified === 'verified';

      // For site-wide maintenance (type === 'maintenance' on path '/'):
      // Only admin, moderator, or verified users can access
      if (active.page_path === '/' && (active.type === 'maintenance' || active.type === 'blocked')) {
        setBlocked(!isAdmin && !isModerator && !isVerified);
      } else {
        // Per-page maintenance: admin and moderator can bypass
        setBlocked(!isAdmin && !isModerator);
      }
      
      setLoading(false);
    };

    checkMaintenance();
  }, [location.pathname, userRole, userVerified]);

  if (loading) return <>{children}</>;

  if (blocked && maintenance) {
    const isSiteWide = maintenance.page_path === '/';
    
    return (
      <div className="min-h-screen bg-background">
        {!isSiteWide && <Navigation />}
        <main className={`${!isSiteWide ? 'md:ml-64' : ''} min-h-screen flex items-center justify-center pb-20 md:pb-8`}>
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
                {isSiteWide 
                  ? 'Website sedang dalam maintenance. Hanya admin, moderator, dan akun terverifikasi yang dapat mengakses.'
                  : 'Halaman ini sedang dalam maintenance. Silakan coba lagi nanti.'
                }
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
