import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useReports } from '@/hooks/useReports';
import { Loader2 } from 'lucide-react';

interface ReportUserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  username: string | null;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'scam', label: 'Scam or fraud' },
  { value: 'other', label: 'Other' },
];

export const ReportUserDialog = ({ isOpen, onClose, userId, username }: ReportUserDialogProps) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { createReport } = useReports();

  const handleSubmit = async () => {
    if (!reason) return;

    await createReport.mutateAsync({
      reported_user_id: userId,
      reason,
      description: description || undefined,
    });

    setReason('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Report User</DialogTitle>
          <DialogDescription>
            Report @{username} for violating community guidelines. Please provide details to help us investigate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Reason for Report</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {REPORT_REASONS.map((item) => (
                <div key={item.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={item.value} id={item.value} />
                  <Label htmlFor={item.value} className="font-normal cursor-pointer">
                    {item.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide any additional context or evidence that might help us investigate..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Include links, screenshots description, or specific examples of the violation.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={createReport.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || createReport.isPending}
            variant="destructive"
          >
            {createReport.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};