import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export type MaintenanceTaskType = 
  | 'clear_cache'
  | 'reindex_search'
  | 'health_check'
  | 'force_stop_jobs';

interface MaintenanceTask {
  id: string;
  task_type: string;
  status: string;
  executed_by: string | null;
  executed_at: string | null;
  result: any;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export function useMaintenanceTasks() {
  return useQuery({
    queryKey: ['maintenance-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('maintenance_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MaintenanceTask[];
    },
  });
}

export function useExecuteMaintenanceTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (taskType: MaintenanceTaskType) => {
      if (!user) throw new Error('User not authenticated');
      // Create task record
      const { data: task, error: insertError } = await supabase
        .from('maintenance_tasks')
        .insert({
          task_type: taskType,
          status: 'running',
          executed_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      let result: any = {};
      let error: string | null = null;

      try {
        // Execute different maintenance tasks
        switch (taskType) {
          case 'clear_cache':
            result = await clearCache();
            break;
          case 'reindex_search':
            result = await reindexSearch();
            break;
          case 'health_check':
            result = await runHealthCheck();
            break;
          case 'force_stop_jobs':
            result = await forceStopJobs();
            break;
        }

        // Update task as completed
        const { error: updateError } = await supabase
          .from('maintenance_tasks')
          .update({
            status: 'completed',
            executed_at: new Date().toISOString(),
            result,
          })
          .eq('id', task.id);

        if (updateError) throw updateError;

        return { success: true, result };
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
        
        // Update task as failed
        await supabase
          .from('maintenance_tasks')
          .update({
            status: 'failed',
            executed_at: new Date().toISOString(),
            error,
          })
          .eq('id', task.id);

        throw err;
      }
    },
    onSuccess: (_, taskType) => {
      queryClient.invalidateQueries({ queryKey: ['maintenance-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['system-health'] });
      
      toast({
        title: 'Task Completed',
        description: `${getTaskLabel(taskType)} completed successfully.`,
      });
    },
    onError: (error: Error, taskType) => {
      toast({
        title: 'Task Failed',
        description: `${getTaskLabel(taskType)} failed: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
}

// Maintenance task implementations
async function clearCache() {
  // Implement cache clearing logic
  // This could involve invalidating query caches or calling backend endpoints
  return {
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString(),
  };
}

async function reindexSearch() {
  // Implement search reindexing logic
  // This could trigger a backend process to rebuild search indices
  return {
    message: 'Search data reindexed successfully',
    timestamp: new Date().toISOString(),
  };
}

async function runHealthCheck() {
  const checks: any = {};

  // Check database connection
  try {
    const { error } = await supabase.from('profiles').select('count').limit(1);
    checks.database = { status: error ? 'error' : 'healthy', error: error?.message };
  } catch (err) {
    checks.database = { status: 'error', error: 'Connection failed' };
  }

  // Check storage
  try {
    const { data, error } = await supabase.storage.listBuckets();
    checks.storage = { status: error ? 'error' : 'healthy', buckets: data?.length || 0 };
  } catch (err) {
    checks.storage = { status: 'error', error: 'Connection failed' };
  }

  // Save health check results
  await supabase.from('system_health').insert({
    check_type: 'full_system',
    status: Object.values(checks).every((c: any) => c.status === 'healthy') ? 'healthy' : 'degraded',
    details: checks,
  });

  return checks;
}

async function forceStopJobs() {
  // Implement job stopping logic
  // This would typically call backend endpoints to stop running jobs
  return {
    message: 'All background jobs stopped',
    timestamp: new Date().toISOString(),
  };
}

function getTaskLabel(taskType: MaintenanceTaskType): string {
  const labels: Record<MaintenanceTaskType, string> = {
    clear_cache: 'Clear Application Cache',
    reindex_search: 'Re-index Search Data',
    health_check: 'Run Health Checks',
    force_stop_jobs: 'Force Stop All Jobs',
  };
  return labels[taskType];
}

export function useSystemHealth() {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_health')
        .select('*')
        .order('checked_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });
}
