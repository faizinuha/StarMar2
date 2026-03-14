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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { BadgeCheck, Check, Eye, MessageCircle, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface VerificationRequest {
  id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_response: string | null;
  responded_by: string | null;
  responded_at: string | null;
  created_at: string;
  profile?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export const VerificationRequestsTab = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null);
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['verification-requests-admin'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const withProfiles = await Promise.all(
        data.map(async (req: any) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, display_name, avatar_url')
            .eq('user_id', req.user_id)
            .single();
          return { ...req, profile };
        })
      );
      return withProfiles as VerificationRequest[];
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ requestId, approved, response }: { requestId: string; approved: boolean; response: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const request = requests.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Update request
      const { error: updateError } = await supabase
        .from('verification_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          admin_response: response,
          responded_by: user.id,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // If approved, verify the user
      if (approved) {
        const { error: profileError } = await supabase.rpc('admin_update_profile', {
          target_user_id: request.user_id,
          update_data: { is_verified: 'verified' },
        });
        if (profileError) throw profileError;
      }

      // Notify user
      await supabase.from('user_notifications').insert({
        user_id: request.user_id,
        title: approved ? 'Verification Approved ✅' : 'Verification Rejected',
        message: `Your verification request has been ${approved ? 'approved' : 'rejected'}. ${response}`,
        type: approved ? 'info' : 'warning',
      });

      // Admin log
      await supabase.from('admin_logs').insert({
        admin_id: user.id,
        action: approved ? 'verification_approved' : 'verification_rejected',
        target_user_id: request.user_id,
        details: { request_id: requestId, response },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['verification-requests-admin'] });
      toast.success(variables.approved ? 'Verification approved' : 'Verification rejected');
      setSelectedRequest(null);
      setResponseText('');
    },
    onError: (error: Error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleChatUser = async (userId: string) => {
    try {
      const { data: conversationId } = await supabase.rpc('get_or_create_direct_conversation', {
        other_user_id: userId,
      });
      if (conversationId) {
        navigate(`/chat/${conversationId}`);
      }
    } catch (err) {
      toast.error('Failed to open chat');
    }
  };

  const filteredRequests = requests.filter(r =>
    filterStatus === 'all' ? true : r.status === filterStatus
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="h-5 w-5 text-primary" />
                Verification Requests
              </CardTitle>
              <CardDescription>Review and manage user verification requests</CardDescription>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : filteredRequests.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No verification requests found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={req.profile?.avatar_url || ''} />
                          <AvatarFallback>{req.profile?.username?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <Link to={`/profile/${req.user_id}`} className="font-medium hover:underline text-sm">
                            @{req.profile?.username || 'Unknown'}
                          </Link>
                          <p className="text-xs text-muted-foreground">{req.profile?.display_name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-sm">{req.reason}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell className="text-sm">{format(new Date(req.created_at), 'PP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleChatUser(req.user_id)} title="Chat user">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setSelectedRequest(req)}>
                          <Eye className="h-4 w-4 mr-1" /> View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verification Request</DialogTitle>
            <DialogDescription>
              Review from @{selectedRequest?.profile?.username}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedRequest.profile?.avatar_url || ''} />
                  <AvatarFallback>{selectedRequest.profile?.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">@{selectedRequest.profile?.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.profile?.display_name}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Reason</p>
                <p className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.status === 'pending' ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Your Response</p>
                    <Textarea
                      placeholder="Response to the user..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <DialogFooter className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => respondMutation.mutate({ requestId: selectedRequest.id, approved: false, response: responseText })}
                      disabled={respondMutation.isPending || !responseText.trim()}
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => respondMutation.mutate({ requestId: selectedRequest.id, approved: true, response: responseText })}
                      disabled={respondMutation.isPending || !responseText.trim()}
                    >
                      <Check className="h-4 w-4 mr-1" /> Approve & Verify
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Admin Response</p>
                  <p className="mt-1 p-3 bg-muted rounded-lg text-sm">{selectedRequest.admin_response || 'No response'}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
