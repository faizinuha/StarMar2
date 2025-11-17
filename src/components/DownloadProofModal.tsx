import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DownloadProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDownload: () => void;
}

export const DownloadProofModal: React.FC<DownloadProofModalProps> = ({ isOpen, onClose, onConfirmDownload }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Important: Download Your Account Proof File</AlertDialogTitle>
          <AlertDialogDescription>
            To verify your account ownership, please download this encrypted file. Keep it safe, as it will be required for certain account recovery or verification processes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmDownload}>
            Download File
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
