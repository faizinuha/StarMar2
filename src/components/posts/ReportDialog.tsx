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

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  postId?: string;
  commentId?: string;
  memeId?: string;
  userId?: string;
}

export const ReportDialog = ({
  isOpen,
  onClose,
  postId,
  commentId,
  memeId,
  userId,
}: ReportDialogProps) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const { createReport } = useReports();

  const reasons = [
    'Spam',
    'Harassment or bullying',
    'Hate speech',
    'Violence or dangerous content',
    'False information',
    'Intellectual property violation',
    'Other',
  ];

  const handleSubmit = () => {
    if (!reason) return;

    createReport.mutate(
      {
        post_id: postId,
        comment_id: commentId,
        meme_id: memeId,
        reported_user_id: userId,
        reason,
        description,
      },
      {
        onSuccess: () => {
          onClose();
          setReason('');
          setDescription('');
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Content</DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this content.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Reason</Label>
            <RadioGroup value={reason} onValueChange={setReason}>
              {reasons.map((r) => (
                <div key={r} className="flex items-center space-x-2">
                  <RadioGroupItem value={r} id={r} />
                  <Label htmlFor={r} className="font-normal cursor-pointer">
                    {r}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide more information..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || createReport.isPending}
          >
            {createReport.isPending ? 'Submitting...' : 'Submit Report'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
