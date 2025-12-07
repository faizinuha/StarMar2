import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Mail, KeyRound, Smartphone, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import starMarLogo from '../../assets/Logo/StarMar-.png';

type Step = 'email' | 'method' | 'otp' | 'authenticator' | 'newPassword';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 'otp') {
      setCanResend(true);
    }
  }, [countdown, step]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(password)) return 'Password must contain uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain lowercase letter';
    if (!/[0-9]/.test(password)) return 'Password must contain a number';
    return '';
  };

  const handleSendOTP = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: 'OTP Sent!',
        description: 'Check your email for the verification code.',
      });
      
      setStep('method');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMethod = (method: 'otp' | 'authenticator') => {
    if (method === 'otp') {
      setCountdown(60);
      setCanResend(false);
    }
    setStep(method);
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: 'OTP Resent!',
        description: 'Check your email for the new verification code.',
      });
      
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });

      if (error) throw error;

      setStep('newPassword');
    } catch (err: any) {
      setError(err.message || 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAuthenticator = async () => {
    if (authenticatorCode.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Get user's MFA factors
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) throw factorsError;

      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        setError('No authenticator app configured. Please use email OTP.');
        return;
      }

      // Challenge and verify
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });

      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: authenticatorCode,
      });

      if (verifyError) throw verifyError;

      setStep('newPassword');
    } catch (err: any) {
      setError(err.message || 'Invalid authenticator code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: 'Password Reset Successful!',
        description: 'You can now login with your new password.',
      });

      navigate('/auth');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Forgot Password</CardTitle>
              <CardDescription>
                Enter your email address to receive a verification code.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSendOTP}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send Verification Code
              </Button>
            </CardContent>
          </>
        );

      case 'method':
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Choose Verification Method</CardTitle>
              <CardDescription>
                Select how you want to verify your identity.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4"
                onClick={() => handleSelectMethod('otp')}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Email OTP</p>
                  <p className="text-sm text-muted-foreground">
                    Enter code sent to {email}
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-16 justify-start gap-4"
                onClick={() => handleSelectMethod('authenticator')}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium">Google Authenticator</p>
                  <p className="text-sm text-muted-foreground">
                    Use your authenticator app
                  </p>
                </div>
              </Button>
            </CardContent>
          </>
        );

      case 'otp':
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Enter OTP Code</CardTitle>
              <CardDescription>
                We sent a 6-digit code to {email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={(value) => setOtp(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend code in <span className="font-medium text-primary">{countdown}s</span>
                  </p>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleResendOTP}
                    disabled={isLoading || !canResend}
                    className="text-sm"
                  >
                    Resend Code
                  </Button>
                )}
              </div>

              <Button
                className="w-full"
                onClick={handleVerifyOTP}
                disabled={isLoading || otp.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify Code
              </Button>
            </CardContent>
          </>
        );

      case 'authenticator':
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Authenticator Code</CardTitle>
              <CardDescription>
                Enter the 6-digit code from your authenticator app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={authenticatorCode}
                  onChange={(value) => setAuthenticatorCode(value)}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                className="w-full"
                onClick={handleVerifyAuthenticator}
                disabled={isLoading || authenticatorCode.length !== 6}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verify Code
              </Button>

              <Button
                variant="link"
                className="w-full"
                onClick={() => handleSelectMethod('otp')}
              >
                Use email OTP instead
              </Button>
            </CardContent>
          </>
        );

      case 'newPassword':
        return (
          <>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">Create New Password</CardTitle>
              <CardDescription>
                Enter your new password below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Password must be at least 8 characters with uppercase, lowercase, and number.
              </p>

              <Button
                className="w-full"
                onClick={handleResetPassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Reset Password
              </Button>
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img
            src={starMarLogo}
            alt="StarMar Logo"
            className="w-24 mx-auto mb-4"
          />
        </div>

        <Card className="border-none shadow-none sm:border sm:shadow-sm">
          {step !== 'email' && (
            <Button
              variant="ghost"
              size="sm"
              className="m-4 mb-0"
              onClick={() => {
                if (step === 'method') setStep('email');
                else if (step === 'otp' || step === 'authenticator') setStep('method');
                else if (step === 'newPassword') navigate('/auth');
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          )}
          
          {renderStep()}
        </Card>

        {step === 'email' && (
          <div className="text-center mt-4">
            <Button
              variant="link"
              onClick={() => navigate('/auth')}
            >
              Back to Login
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
