import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Check, X, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BanAppeal {
  id: string;
  user_id: string;
  explanation: string;
  evidence: string | null;
  contact_email: string | null;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    ban_reason: string | null;
  };
}

export const BanAppealsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAppeal, setSelectedAppeal] = useState<BanAppeal | null>(null);
  const [responseText, setResponseText] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const { data: appeals = [], isLoading } = useQuery({
    queryKey: ['ban-appeals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ban_appeals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profiles for each appeal
      const appealsWithProfiles = await Promise.all(
        data.map(async (appeal) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url, ban_reason')
            .eq('user_id', appeal.user_id)
            .single();
          return { ...appeal, profile };
        })
      );

      return appealsWithProfiles as BanAppeal[];
    },
  });

  const respondToAppeal = useMutation({
    mutationFn: async ({ appealId, approved, response }: { appealId: string; approved: boolean; response: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const appeal = appeals.find(a => a.id === appealId);
      if (!appeal) throw new Error('Appeal not found');

      // Update appeal status
      const { error: appealError } = await supabase
        .from('ban_appeals')
        .update({
          status: approved ? 'approved' : 'rejected',
          admin_response: response,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq('id', appealId);

      if (appealError) throw appealError;

      // If approved, unban the user using security definer function
      if (approved) {
        const { error: unbanError } = await supabase.rpc('admin_update_profile', {
          target_user_id: appeal.user_id,
          update_data: {
            is_banned: false,
            ban_reason: null,
            banned_at: null,
            banned_by: null
          }
        });

        if (unbanError) throw unbanError;

        // Send notification to user
        await supabase.from('user_notifications').insert({
          user_id: appeal.user_id,
          title: 'Ban Appeal Approved',
          message: `Your ban appeal has been approved. ${response}`,
          type: 'info',
        });
      } else {
        // Send rejection notification
        await supabase.from('user_notifications').insert({
          user_id: appeal.user_id,
          title: 'Ban Appeal Rejected',
          message: `Your ban appeal has been rejected. ${response}`,
          type: 'warning',
        });
      }

      // Log admin action
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: approved ? 'appeal_approved' : 'appeal_rejected',
        target_user_id: appeal.user_id,
        details: { appeal_id: appealId, response },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ban-appeals'] });
      toast.success(variables.approved ? 'Appeal approved, user unbanned' : 'Appeal rejected');
      setSelectedAppeal(null);
      setResponseText('');
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleRespond = (approved: boolean) => {
    if (!selectedAppeal || !responseText.trim()) {
      toast.error('Please provide a response');
      return;
    }
    setIsApproving(approved);
    respondToAppeal.mutate({
      appealId: selectedAppeal.id,
      approved,
      response: responseText,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Ban Appeals</CardTitle>
          <CardDescription>Review and respond to user ban appeals</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : appeals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No ban appeals found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Ban Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appeals.map((appeal) => (
                  <TableRow key={appeal.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={appeal.profile?.avatar_url || ''} />
                          <AvatarFallback>{appeal.profile?.username?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link to={`/profile/${appeal.user_id}`} className="font-medium hover:underline">
                            @{appeal.profile?.username || 'Unknown'}
                          </Link>
                          <p className="text-xs text-muted-foreground">{appeal.profile?.display_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {appeal.profile?.ban_reason || 'No reason provided'}
                    </TableCell>
                    <TableCell>{getStatusBadge(appeal.status)}</TableCell>
                    <TableCell>{format(new Date(appeal.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setSelectedAppeal(appeal)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedAppeal} onOpenChange={() => setSelectedAppeal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ban Appeal Details</DialogTitle>
            <DialogDescription>
              Review the appeal from @{selectedAppeal?.profile?.username}
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppeal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">User</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={selectedAppeal.profile?.avatar_url || ''} />
                      <AvatarFallback>{selectedAppeal.profile?.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span>@{selectedAppeal.profile?.username}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contact Email</p>
                  <p className="mt-1">{selectedAppeal.contact_email || 'Not provided'}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">Ban Reason</p>
                <p className="mt-1 p-3 bg-destructive/10 rounded-lg text-destructive">
                  {selectedAppeal.profile?.ban_reason || 'No reason provided'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">User's Explanation</p>
                <p className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedAppeal.explanation}
                </p>
              </div>

              {selectedAppeal.evidence && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Evidence/Supporting Info</p>
                  <p className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedAppeal.evidence}
                  </p>
                </div>
              )}

              {selectedAppeal.status === 'pending' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Your Response</p>
                    <Textarea
                      placeholder="Provide your response to the user..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleRespond(false)}
                      disabled={respondToAppeal.isPending}
                    >
                      <X className="h-4 w-4 mr-1" />
                      {respondToAppeal.isPending && !isApproving ? 'Rejecting...' : 'Reject Appeal'}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleRespond(true)}
                      disabled={respondToAppeal.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      {respondToAppeal.isPending && isApproving ? 'Approving...' : 'Approve & Unban'}
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Response</p>
                  <p className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap">
                    {selectedAppeal.admin_response}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Responded at: {selectedAppeal.responded_at ? format(new Date(selectedAppeal.responded_at), 'PPpp') : 'N/A'}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
