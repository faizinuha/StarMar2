import { AlertCircle, Info, Shield, Wrench, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export function MaintenanceBanner() {
  const location = useLocation();
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname]);

  // Check user role (admin or moderator)
  useEffect(() => {
    const checkRole = async () => {
      if (!user) {
        setUserRole(null);
        return;
      }
      
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

  const { data: maintenance, isLoading } = useMaintenanceMode(currentPath);
  const { data: siteWideMaintenance } = useMaintenanceMode('/');

  const activeMaintenance = maintenance || (currentPath !== '/' ? siteWideMaintenance : null);

  if (isLoading || !activeMaintenance || !activeMaintenance.is_active) return null;

  const icons = {
    info: Info,
    warning: AlertCircle,
    maintenance: Wrench,
    blocked: Shield,
  };

  const Icon = icons[activeMaintenance.type as keyof typeof icons] || AlertCircle;

  // If maintenance is active and user is NOT admin/moderator, show full page block
  if (!isPrivileged && (activeMaintenance.type === 'maintenance' || activeMaintenance.type === 'blocked')) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="max-w-md mx-auto p-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">{activeMaintenance.title}</h1>
          <p className="text-muted-foreground">{activeMaintenance.message}</p>
          <p className="text-sm text-muted-foreground">
            Halaman ini sedang dalam maintenance. Silakan coba lagi nanti.
          </p>
        </div>
      </div>
    );
  }

  // For admins/moderators or info/warning type, show banner only
  const variants = {
    info: 'default' as const,
    warning: 'default' as const,
    maintenance: 'default' as const,
    blocked: 'destructive' as const,
  };

  return (
    <Alert 
      variant={variants[activeMaintenance.type as keyof typeof variants] || 'default'}
      className="mb-4"
    >
      <Icon className="h-4 w-4" />
      <AlertTitle>{activeMaintenance.title}</AlertTitle>
      <AlertDescription>
        {activeMaintenance.message}
        {isPrivileged && <span className="ml-2 text-xs">({userRole} view)</span>}
      </AlertDescription>
    </Alert>
  );
}