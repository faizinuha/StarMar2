import { Navigation } from '@/components/layout/Navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Factor } from '@supabase/supabase-js';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Github,
  Laptop,
  Loader2,
  Mail,
  Moon,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMfa } from './useMfa';
import { SocialLinksEditor, SocialLink } from '@/components/settings/SocialLinksEditor';

interface UserSettings {
  notifications_enabled: boolean;
  like_notifications: boolean;
  comment_notifications: boolean;
  follow_notifications: boolean;
}

interface MfaFactor extends Factor {
  friendly_name: string;
}

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();

  const {
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
  } = useMfa();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [showLinkEmailDialog, setShowLinkEmailDialog] = useState(false);
  const [linkEmailValue, setLinkEmailValue] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return data as UserSettings;
    },
    enabled: !!user,
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      // Parse social_links from profile (it's stored as JSONB)
      try {
        const links = (profile as any).social_links;
        if (Array.isArray(links)) {
          setSocialLinks(links);
        } else if (typeof links === 'string') {
          setSocialLinks(JSON.parse(links));
        } else {
          setSocialLinks([]);
        }
      } catch {
        setSocialLinks([]);
      }
    }
  }, [profile]);

  // Fetch linked providers (email/oauth identities)
  useEffect(() => {
    let mounted = true;
    const fetchProviders = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        const providers: string[] = [];
        if (!user) return;
        // email
        if (user.email) providers.push('email');
        // identities (oauth providers)
        // Some Supabase setups expose user.identities
        // Fallback: check user.app_metadata?.provider if available
        // Prefer identities if present
        // @ts-ignore
        const identities = user.identities || [];
        if (Array.isArray(identities) && identities.length > 0) {
          // identities items have provider field
          identities.forEach((id: any) => {
            if (id.provider && !providers.includes(id.provider))
              providers.push(id.provider);
          });
        } else if ((user as any)?.app_metadata?.provider) {
          const p = (user as any).app_metadata.provider;
          if (p && !providers.includes(p)) providers.push(p);
        }

        if (mounted) setLinkedProviders(providers);
      } catch (err) {
        // ignore
      }
    };

    fetchProviders();
    return () => {
      mounted = false;
    };
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;

    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);

      await updateProfile.mutateAsync({
        avatar_url: data.publicUrl,
      });

      toast({
        title: 'Profile photo updated!',
      });
    } catch (error: any) {
      toast({
        title: 'Error uploading photo',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await updateProfile.mutateAsync({
        display_name: displayName,
        bio: bio,
        social_links: socialLinks,
      } as any);

      toast({
        title: 'Profile updated successfully!',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating profile',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const updateNotificationSetting = async (
    key: keyof UserSettings,
    value: boolean
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: 'Settings updated',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating settings',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });

      if (error) throw error;

      toast({
        title: 'Password reset email sent',
        description: 'Check your email for reset instructions',
      });
    } catch (error: any) {
      toast({
        title: 'Error sending reset email',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSwitchAccount = async () => {
    if (!user?.email) return;
    setSendingCode(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: user.email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      toast({
        title: 'Verification code sent',
        description: 'Check your email for the login link to switch accounts.',
      });
      setCountdown(30);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSendingCode(false);
    }
  };

  // --- Linked accounts helpers ---
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

  const handleLinkOAuth = async (provider: 'google' | 'github') => {
    // Initiates OAuth flow. Note: true server-side identity linking requires
    // a service-role function. This initiates OAuth sign-in which the user can
    // complete; afterwards they may need to contact support to merge accounts if a new account is created.
    try {
      await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${siteUrl}/settings?linked_oauth=1` },
      });
    } catch (error: any) {
      toast({
        title: 'Error starting OAuth',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleOpenLinkEmail = () => {
    setLinkEmailValue(user?.email || '');
    setShowLinkEmailDialog(true);
  };

  const handleLinkEmail = async () => {
    if (!linkEmailValue || !user) return;
    try {
      // Update current user's email (this keeps the same account) and then send a password reset so user can set a password for email login
      const { error: updateError } = await supabase.auth.updateUser({
        email: linkEmailValue,
      });
      if (updateError) throw updateError;

      // Send password reset to allow setting password
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        linkEmailValue,
        { redirectTo: `${siteUrl}/auth?mode=reset` }
      );
      if (resetError) throw resetError;

      toast({
        title: 'Email linked',
        description:
          'Password reset sent to the email. Use it to set a password.',
      });
      setShowLinkEmailDialog(false);
      // Refresh providers list
      const { data } = await supabase.auth.getUser();
      // @ts-ignore
      const ids = data.user?.identities || [];
      const provs = [] as string[];
      if (data.user?.email) provs.push('email');
      if (Array.isArray(ids)) ids.forEach((i: any) => provs.push(i.provider));
      setLinkedProviders(provs);
    } catch (err: any) {
      toast({
        title: 'Error linking email',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user');
      if (error) throw error;

      toast({
        title: 'Account Deletion Initiated',
        description: 'Your account is being deleted. You will be logged out.',
      });
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error: any) {
      toast({
        title: 'Error deleting account',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="md:ml-72 min-h-screen pb-20 md:pb-8">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Settings
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your account settings and preferences.
            </p>
          </div>

          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your public profile information.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback>
                      {profile.display_name?.[0] ||
                        profile.username?.[0] ||
                        'U'}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="avatar-upload"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                    onClick={() =>
                      document.getElementById('avatar-upload')?.click()
                    }
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div>
                  <p className="font-semibold">@{profile.username}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                  />
                </div>

                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell us about yourself"
                    rows={3}
                  />
                </div>
                
                <Separator />
                
                {/* Social Media Links */}
                <SocialLinksEditor
                  links={socialLinks}
                  onChange={setSocialLinks}
                  maxLinks={6}
                />
                
                <div>
                  <Label htmlFor="bio">Role: {profile.role}</Label>
                </div>

                <Button
                  onClick={handleProfileUpdate}
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Choose your preferred theme.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div
                  className={`cursor-pointer rounded-md border-2 p-4 text-center ${
                    theme === 'light' ? 'border-primary' : 'border-muted'
                  }`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className="mx-auto mb-2 h-6 w-6" />
                  <span>Light</span>
                </div>
                <div
                  className={`cursor-pointer rounded-md border-2 p-4 text-center ${
                    theme === 'dark' ? 'border-primary' : 'border-muted'
                  }`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className="mx-auto mb-2 h-6 w-6" />
                  <span>Dark</span>
                </div>
                <div
                  className={`cursor-pointer rounded-md border-2 p-4 text-center ${
                    theme === 'system' ? 'border-primary' : 'border-muted'
                  }`}
                  onClick={() => setTheme('system')}
                >
                  <Laptop className="mx-auto mb-2 h-6 w-6" />
                  <span>System</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <CardDescription>
                Manage your account privacy and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Private Account</Label>
                  <p className="text-sm text-muted-foreground">
                    Only approved followers can see your posts
                  </p>
                </div>
                <Switch
                  checked={profile.is_private}
                  onCheckedChange={(checked) => {
                    updateProfile.mutate({ is_private: checked });
                  }}
                />
              </div>

              <Separator />

              <Button variant="outline" onClick={handlePasswordReset}>
                Reset Password
              </Button>
            </CardContent>
          </Card>

          {/* 2FA Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
              <CardDescription>
                Add an extra layer of security to your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mfaFactors?.all && mfaFactors.all.length > 0 ? (
                <div>
                  <p className="text-sm font-medium text-green-600 mb-2">
                    2FA is enabled.
                  </p>
                  <ul className="space-y-2">
                    {mfaFactors.all.map((factor: any) => (
                      <li
                        key={factor.id}
                        className="flex items-center justify-between text-sm p-2 border rounded-md"
                      >
                        <span>
                          {factor.friendly_name ||
                            `Factor ID: ${factor.id.slice(0, 8)}...`}
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleMfaUnenroll(factor.id)}
                        >
                          Disable
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <Button onClick={handleMfaEnroll} disabled={isEnrolling}>
                  {isEnrolling ? 'Loading...' : 'Enable 2FA'}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Notification Settings */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>All Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable or disable all notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications_enabled}
                    onCheckedChange={(checked) => {
                      updateNotificationSetting(
                        'notifications_enabled',
                        checked
                      );
                    }}
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Likes</Label>
                    <Switch
                      checked={settings.like_notifications}
                      onCheckedChange={(checked) => {
                        updateNotificationSetting(
                          'like_notifications',
                          checked
                        );
                      }}
                      disabled={!settings.notifications_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>Comments</Label>
                    <Switch
                      checked={settings.comment_notifications}
                      onCheckedChange={(checked) => {
                        updateNotificationSetting(
                          'comment_notifications',
                          checked
                        );
                      }}
                      disabled={!settings.notifications_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>New Followers</Label>
                    <Switch
                      checked={settings.follow_notifications}
                      onCheckedChange={(checked) => {
                        updateNotificationSetting(
                          'follow_notifications',
                          checked
                        );
                      }}
                      disabled={!settings.notifications_enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Account Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Account Actions</CardTitle>
              <CardDescription>Manage your account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  variant="outline"
                  onClick={handleSwitchAccount}
                  disabled={sendingCode || countdown > 0}
                >
                  {sendingCode ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Switch Account'}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                "Switch Account" will send a magic link to your email to log in
                to a different account.
              </p>
            </CardContent>
          </Card>

          {/* Linked Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Linked Accounts</CardTitle>
              <CardDescription>
                Manage your linked accounts for signing in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You are currently signed in with{' '}
                <span className="font-semibold capitalize text-primary">
                  {user?.app_metadata.provider || 'email'}
                </span>
                .
              </p>
              <div className="space-y-2">
                {[
                  {
                    provider: 'google',
                    icon: (
                      <img
                        src="/assets/icons/google.svg"
                        alt="Google"
                        className="w-5 h-5"
                      />
                    ),
                  },
                  { provider: 'github', icon: <Github className="w-5 h-5" /> },
                  { provider: 'email', icon: <Mail className="w-5 h-5" /> },
                ].map(({ provider, icon }) => {
                  const isLinked = linkedProviders.includes(provider);

                  return (
                    <div
                      key={provider}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <span className="font-medium capitalize">
                          {provider}
                        </span>
                      </div>
                      {isLinked ? (
                        <Button variant="outline" size="sm" disabled>
                          Linked
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (provider === 'email') {
                              handleOpenLinkEmail();
                            } else if (
                              provider === 'google' ||
                              provider === 'github'
                            ) {
                              handleLinkOAuth(provider as 'google' | 'github');
                            }
                          }}
                        >
                          Link Account
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 2FA Enrollment Dialog */}
      <Dialog open={showMfaDialog} onOpenChange={setShowMfaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>
              Scan the QR code with your authenticator app (e.g., Google
              Authenticator, Authy).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {mfaEnrollData && 'qr_code' in mfaEnrollData && (
              <img
                src={(mfaEnrollData as any).qr_code}
                alt="2FA QR Code"
                className="p-2 bg-white rounded-lg"
              />
            )}
            <p className="text-sm text-muted-foreground">
              Then, enter the 6-digit code from your app below.
            </p>
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            <Button
              onClick={handleMfaVerify}
              disabled={isVerifying || verificationCode.length < 6}
              className="w-full"
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Verify and Enable'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'I understand, delete my account'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
