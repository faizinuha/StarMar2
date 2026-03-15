import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, XCircle, Trash2, MessageCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ModApplication {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const ModeratorApplicationsTab = () => {
  const [applications, setApplications] = useState<ModApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchApplications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moderator_applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    // Fetch profiles for each application
    const enriched = await Promise.all(
      (data || []).map(async (app) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, display_name, avatar_url')
          .eq('user_id', app.user_id)
          .single();
        return { ...app, profile } as ModApplication;
      })
    );

    setApplications(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchApplications(); }, []);

  const handleAction = async (app: ModApplication, action: 'approved' | 'rejected') => {
    setProcessing(app.id);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Update application status
      const { error } = await supabase
        .from('moderator_applications')
        .update({
          status: action,
          admin_response: responses[app.id] || null,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq('id', app.id);

      if (error) throw error;

      // If approved, set user role to moderator
      if (action === 'approved') {
        await supabase.rpc('admin_update_profile', {
          target_user_id: app.user_id,
          update_data: { role: 'moderator' },
        });

        // Add to user_roles table
        await supabase.from('user_roles').upsert({
          user_id: app.user_id,
          role: 'moderator' as const,
        }, { onConflict: 'user_id,role' });
      }

      // Send notification
      await supabase.from('user_notifications').insert({
        user_id: app.user_id,
        title: action === 'approved' ? '🎉 Moderator Application Approved!' : 'Moderator Application Update',
        message: action === 'approved'
          ? 'Selamat! Kamu sekarang menjadi Moderator. Kamu bisa mengakses Dashboard untuk mengelola konten.'
          : `Permohonan moderator kamu ditolak. ${responses[app.id] || ''}`,
        type: 'info',
      });

      toast({ title: 'Success', description: `Application ${action}.` });
      fetchApplications();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('moderator_applications').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Application removed.' });
      setApplications((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleChat = async (userId: string) => {
    const { data, error } = await supabase.rpc('get_or_create_direct_conversation', { other_user_id: userId });
    if (!error && data) {
      window.location.href = `/chat/${data}`;
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Moderator Applications</CardTitle>
        <CardDescription>Review users who applied to become moderators.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {applications.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No applications yet.</p>
        ) : (
          applications.map((app) => (
            <Card key={app.id} className="p-4">
              <div className="flex items-start gap-4">
                <Link to={`/profile/${app.user_id}`}>
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={app.profile?.avatar_url || ''} />
                    <AvatarFallback>{app.profile?.username?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link to={`/profile/${app.user_id}`} className="font-semibold hover:underline">
                        {app.profile?.display_name || app.profile?.username || 'User'}
                      </Link>
                      <span className="text-sm text-muted-foreground ml-2">@{app.profile?.username}</span>
                    </div>
                    <Badge variant={app.status === 'pending' ? 'outline' : app.status === 'approved' ? 'default' : 'destructive'}>
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-sm">{app.reason}</p>
                  <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleString()}</p>

                  {app.status === 'pending' && (
                    <div className="space-y-2 pt-2">
                      <Textarea
                        placeholder="Response (optional)..."
                        value={responses[app.id] || ''}
                        onChange={(e) => setResponses((prev) => ({ ...prev, [app.id]: e.target.value }))}
                        className="text-sm"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleAction(app, 'approved')} disabled={!!processing}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleAction(app, 'rejected')} disabled={!!processing}>
                          <XCircle className="h-4 w-4 mr-1" /> Reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleChat(app.user_id)}>
                          <MessageCircle className="h-4 w-4 mr-1" /> Chat
                        </Button>
                      </div>
                    </div>
                  )}

                  {app.admin_response && (
                    <p className="text-sm text-muted-foreground italic border-l-2 border-primary pl-2 mt-2">
                      Admin: {app.admin_response}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(app.id)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
};
