import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface MaintenanceMode {
  id: string;
  page_path: string;
  is_active: boolean;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'blocked';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Overload signatures
export function useMaintenanceMode(pagePath: string): ReturnType<typeof useQuery<MaintenanceMode | null, Error>>;
export function useMaintenanceMode(): ReturnType<typeof useQuery<MaintenanceMode[], Error>>;

export function useMaintenanceMode(pagePath?: string): ReturnType<typeof useQuery<MaintenanceMode | MaintenanceMode[] | null, Error>> {
  return useQuery({
    queryKey: ['maintenance-mode', pagePath],
    queryFn: async () => {
      const query = supabase.from('maintenance_mode').select('*');
      
      if (pagePath) {
        const { data, error } = await query.eq('page_path', pagePath).eq('is_active', true).maybeSingle();
        if (error) throw error;
        return data as MaintenanceMode | null;
      } else {
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data as MaintenanceMode[];
      }
    },
  });
}

export function useSetMaintenanceMode() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      page_path: string;
      is_active: boolean;
      title: string;
      message: string;
      type: 'info' | 'warning' | 'maintenance' | 'blocked';
    }) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('maintenance_mode')
        .upsert({ ...params, created_by: user.id }, { onConflict: 'page_path' })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
      toast({
        title: 'Maintenance Mode Updated',
        description: 'The maintenance status has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update maintenance mode: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}
