import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReports } from '@/hooks/useReports';
import { format } from 'date-fns';
import { Loader2, AlertTriangle, ExternalLink, Trash2 } from 'lucide-react';
import { DeletePostDialog } from './DeletePostDialog';
import { useNavigate } from 'react-router-dom';

export const ReportsTab = () => {
  const { reports, isLoading, updateReportStatus } = useReports();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [deleteDialog, setDeleteDialog] = useState<{ postId: string; reportId: string; reportedUserId: string } | null>(null);
  const navigate = useNavigate();

  const filteredReports = reports.filter((report) =>
    filterStatus === 'all' ? true : report.status === filterStatus
  );

  const handleStatusChange = (reportId: string, newStatus: string) => {
    updateReportStatus.mutate({ id: reportId, status: newStatus });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'resolved':
        return 'bg-green-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Content Reports</CardTitle>
            <CardDescription>
              Review and manage user-submitted reports
            </CardDescription>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reports</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredReports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No reports found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>View</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="text-sm">
                    {format(new Date(report.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {report.post_id
                        ? 'Post'
                        : report.comment_id
                        ? 'Comment'
                        : report.meme_id
                        ? 'Meme'
                        : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {report.reason}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(report.status)}>
                      {report.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {report.post_id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/?post=${report.post_id}`)}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Select
                        value={report.status}
                        onValueChange={(value) =>
                          handleStatusChange(report.id, value)
                        }
                        disabled={updateReportStatus.isPending}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      {report.post_id && report.status === 'pending' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteDialog({
                            postId: report.post_id!,
                            reportId: report.id,
                            reportedUserId: report.reported_user_id!
                          })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      {deleteDialog && (
        <DeletePostDialog
          isOpen={!!deleteDialog}
          onClose={() => setDeleteDialog(null)}
          postId={deleteDialog.postId}
          reportId={deleteDialog.reportId}
          reportedUserId={deleteDialog.reportedUserId}
        />
      )}
    </Card>
  );
};
