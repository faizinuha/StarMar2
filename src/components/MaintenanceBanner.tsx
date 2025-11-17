import { AlertCircle, Info, Shield, Wrench } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { useLocation } from 'react-router-dom';

export function MaintenanceBanner() {
  const location = useLocation();
  const { data: maintenance } = useMaintenanceMode(location.pathname);

  if (!maintenance || !maintenance.is_active) return null;

  const icons = {
    info: Info,
    warning: AlertCircle,
    maintenance: Wrench,
    blocked: Shield,
  };

  const Icon = icons[maintenance.type];

  return (
    <Alert variant={maintenance.type === 'blocked' ? 'destructive' : 'default'}>
      <Icon className="h-4 w-4" />
      <AlertTitle>{maintenance.title}</AlertTitle>
      <AlertDescription>{maintenance.message}</AlertDescription>
    </Alert>
  );
}
