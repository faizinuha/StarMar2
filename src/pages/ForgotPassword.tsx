import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { ArrowLeft, Mail, KeyRound, Smartphone, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import starMarLogo from '../../assets/Logo/StarMar-.png';

type Step = 'email' | 'method' | 'emailSent' | 'authenticator' | 'newPassword';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Check if user came from recovery link
  useEffect(() => {
    const checkRecoverySession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Check if this is a recovery session
      if (session?.user) {
        const recoveryParam = searchParams.get('type');
        if (recoveryParam === 'recovery' || window.location.hash.includes('type=recovery')) {
          setIsRecoveryMode(true);
          setStep('newPassword');
        }
      }
    };

    checkRecoverySession();

    // Listen for auth state changes (when user clicks magic link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setStep('newPassword');
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && step === 'emailSent') {
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

  const handleSendMagicLink = async () => {
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/forgot-password?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: 'Recovery Email Sent!',
        description: 'Check your email for the password reset link.',
      });
      
      setStep('method');
    } catch (err: any) {
      setError(err.message || 'Failed to send recovery email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMethod = (method: 'emailSent' | 'authenticator') => {
    if (method === 'emailSent') {
      setCountdown(60);
      setCanResend(false);
    }
    setStep(method);
  };

  const handleResendEmail = async () => {
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/forgot-password?type=recovery`,
      });

      if (error) throw error;

      toast({
        title: 'Email Resent!',
        description: 'Check your email for the new password reset link.',
      });
      
      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      setError(err.message);
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
      // First, we need to sign in with email to access MFA
      // This is a limitation - user needs to have MFA set up and be able to sign in
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      
      if (factorsError) {
        // User is not signed in, need to use magic link instead
        setError('Please use the email link method first to verify your identity, then you can use authenticator for additional security.');
        return;
      }

      const totpFactor = factors?.totp?.[0];
      if (!totpFactor) {
        setError('No authenticator app configured for this account. Please use the email link method.');
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

      // Sign out and redirect to auth
      await supabase.auth.signOut();
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
                Enter your email address to receive a password reset link.
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
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMagicLink()}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSendMagicLink}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Send Reset Link
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
                className="w-full h-20 justify-start gap-4"
                onClick={() => handleSelectMethod('emailSent')}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">Email Link</p>
                  <p className="text-sm text-muted-foreground">
                    Click the link we sent to {email}
                  </p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </Button>

              <Button
                variant="outline"
                className="w-full h-20 justify-start gap-4"
                onClick={() => handleSelectMethod('authenticator')}
              >
                <div className="p-2 rounded-full bg-primary/10">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">Google Authenticator</p>
                  <p className="text-sm text-muted-foreground">
                    Use your authenticator app (requires prior setup)
                  </p>
                </div>
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                Note: Google Authenticator only works if you've already set up 2FA in your account settings.
              </p>
            </CardContent>
          </>
        );

      case 'emailSent':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/10">
                <Mail className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Check Your Email</CardTitle>
              <CardDescription>
                We've sent a password reset link to <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-primary/10 mt-0.5">
                    <span className="text-xs font-bold text-primary">1</span>
                  </div>
                  <p className="text-sm">Open your email inbox</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-primary/10 mt-0.5">
                    <span className="text-xs font-bold text-primary">2</span>
                  </div>
                  <p className="text-sm">Click the password reset link in the email</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-primary/10 mt-0.5">
                    <span className="text-xs font-bold text-primary">3</span>
                  </div>
                  <p className="text-sm">You'll be redirected back here to set your new password</p>
                </div>
              </div>

              <div className="text-center">
                {countdown > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Resend link in <span className="font-medium text-primary">{countdown}s</span>
                  </p>
                ) : (
                  <Button
                    variant="link"
                    onClick={handleResendEmail}
                    disabled={isLoading || !canResend}
                    className="text-sm"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Didn't receive it? Resend link
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open('https://mail.google.com', '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Gmail
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
                Enter the 6-digit code from your Google Authenticator app.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground text-center">
                  Open the Google Authenticator app on your phone and enter the 6-digit code shown for StarMar.
                </p>
              </div>

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
                onClick={() => handleSelectMethod('emailSent')}
              >
                Use email link instead
              </Button>
            </CardContent>
          </>
        );

      case 'newPassword':
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <CardTitle className="text-2xl">Create New Password</CardTitle>
              <CardDescription>
                Your identity has been verified. Enter your new password below.
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
                    onKeyDown={(e) => e.key === 'Enter' && handleResetPassword()}
                  />
                </div>
              </div>

              <div className="bg-muted/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Password requirements:
                </p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li className={newPassword.length >= 8 ? 'text-green-500' : ''}>
                    • At least 8 characters
                  </li>
                  <li className={/[A-Z]/.test(newPassword) ? 'text-green-500' : ''}>
                    • One uppercase letter
                  </li>
                  <li className={/[a-z]/.test(newPassword) ? 'text-green-500' : ''}>
                    • One lowercase letter
                  </li>
                  <li className={/[0-9]/.test(newPassword) ? 'text-green-500' : ''}>
                    • One number
                  </li>
                </ul>
              </div>

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={starMarLogo} alt="StarMar" className="h-16 w-auto" />
        </div>

        <Card className="border-border/50 shadow-xl">
          {renderStep()}
          
          {/* Back buttons */}
          <div className="px-6 pb-6">
            {step !== 'email' && step !== 'newPassword' && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  if (step === 'method') setStep('email');
                  else setStep('method');
                }}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            
            {step === 'email' && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/auth')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            )}
          </div>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Remember your password?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>
            Sign in
          </Button>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
