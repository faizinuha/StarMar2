import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  AuthMFAEnrollResponse,
  AuthMFAListFactorsResponse,
} from '@supabase/supabase-js';

export const useMfa = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showMfaDialog, setShowMfaDialog] = useState(false);
  const [mfaEnrollData, setMfaEnrollData] =
    useState<AuthMFAEnrollResponse['data']>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: mfaFactors, refetch: refetchMfaFactors } = useQuery({
    queryKey: ['mfa-factors', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleMfaEnroll = async () => {
    if (!user) return;
    setIsEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'StarMar',
        friendlyName: `${user.email}`,
      });

      if (error) throw error;

      setMfaEnrollData(data);
      setShowMfaDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error starting 2FA setup',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleMfaVerify = async () => {
    if (!mfaEnrollData) return;
    setIsVerifying(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({
        factorId: mfaEnrollData.id,
      });
      if (challenge.error) throw challenge.error;

      const { error } = await supabase.auth.mfa.verify({
        factorId: mfaEnrollData.id,
        challengeId: challenge.data.id,
        code: verificationCode,
      });

      if (error) throw error;

      toast({
        title: '2FA Enabled Successfully!',
        description: 'Two-factor authentication is now active on your account.',
      });
      setShowMfaDialog(false);
      setMfaEnrollData(null);
      setVerificationCode('');
      refetchMfaFactors();
      queryClient.invalidateQueries({ queryKey: ['user'] }); // To refresh user's aal level
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleMfaUnenroll = async (factorId: string) => {
    try {
      await supabase.auth.mfa.unenroll({ factorId });
      toast({ title: '2FA Disabled Successfully' });
      refetchMfaFactors();
      queryClient.invalidateQueries({ queryKey: ['user'] });
    } catch (error: any) {
      toast({
        title: 'Error disabling 2FA',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return {
    mfaFactors,
    showMfaDialog,
    setShowMfaDialog,
    mfaEnrollData,
    verificationCode,
    setVerificationCode,
    isEnrolling,
    isVerifying,
    handleMfaEnroll,
    handleMfaVerify,
    handleMfaUnenroll,
  };
};