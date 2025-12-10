import { AlertCircle, Info, Shield, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

export function MaintenanceBanner() {
  const location = useLocation();
  const [currentPath, setCurrentPath] = useState(location.pathname);
  
  // Update path when location changes
  useEffect(() => {
    setCurrentPath(location.pathname);
  }, [location.pathname]);

  const { data: maintenance, isLoading } = useMaintenanceMode(currentPath);
  
  // Also check for site-wide maintenance (path = "/")
  const { data: siteWideMaintenance } = useMaintenanceMode('/');

  // Use site-wide maintenance if no page-specific one exists
  const activeMaintenance = maintenance || (currentPath !== '/' ? siteWideMaintenance : null);

  if (isLoading || !activeMaintenance || !activeMaintenance.is_active) return null;

  const icons = {
    info: Info,
    warning: AlertCircle,
    maintenance: Wrench,
    blocked: Shield,
  };

  const Icon = icons[activeMaintenance.type as keyof typeof icons] || AlertCircle;

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
      <AlertDescription>{activeMaintenance.message}</AlertDescription>
    </Alert>
  );
}
