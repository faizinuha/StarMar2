import { AlertCircle, Info, Wrench, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function MaintenanceBanner() {
  const location = useLocation();
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) { setUserRole(null); return; }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      setUserRole(data?.role || null);
    };
    checkRole();
  }, [user]);

  const isPrivileged = userRole === 'admin' || userRole === 'moderator';

  const { data: maintenance } = useMaintenanceMode(location.pathname);
  const { data: siteWide } = useMaintenanceMode('/');

  const active = maintenance || (location.pathname !== '/' ? siteWide : null);

  // Only show inline banner for privileged users (non-privileged are blocked by MaintenanceGuard)
  if (!active || !active.is_active || !isPrivileged) return null;

  const icons = { info: Info, warning: AlertCircle, maintenance: Wrench, blocked: Shield };
  const Icon = icons[active.type as keyof typeof icons] || AlertCircle;

  return (
    <Alert variant={active.type === 'blocked' ? 'destructive' : 'default'} className="mb-4">
      <Icon className="h-4 w-4" />
      <AlertTitle>{active.title}</AlertTitle>
      <AlertDescription>
        {active.message}
        <span className="ml-2 text-xs opacity-70">({userRole} bypass)</span>
      </AlertDescription>
    </Alert>
  );
}
