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
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Camera,
  Github,
  Laptop,
  Loader2,
  Mail,
  Moon,
  ShieldAlert,
  Sun,
  Palette,
  Bell,
  KeyRound,
  User as UserIcon,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMfa } from './useMfa';
import { SocialLinksEditor, SocialLink } from '@/components/settings/SocialLinksEditor';
import { cn } from '@/lib/utils';

interface UserSettings {
  user_id: string;
  notifications_enabled: boolean;
  like_notifications: boolean;
  comment_notifications: boolean;
  follow_notifications: boolean;
}

const TABS = {
  PROFILE: 'profile',
  APPEARANCE: 'appearance',
  SECURITY: 'security',
  NOTIFICATIONS: 'notifications',
  ACCOUNT: 'account',
  DANGER: 'danger',
};

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState(TABS.PROFILE);

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
  const [linkedProviders, setLinkedProviders] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: settings, refetch: refetchSettings } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as UserSettings;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBio(profile.bio || '');
      try {
        const links = (profile as any).social_links;
        setSocialLinks(Array.isArray(links) ? links : []);
      } catch { setSocialLinks([]); }
    }
  }, [profile]);

  useEffect(() => {
    if (user?.identities) {
      const providers = user.identities.map(id => id.provider).filter(p => p) as string[];
      if (user.email && !providers.includes('email')) {
        providers.push('email');
      }
      setLinkedProviders(providers);
    }
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !user) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      await queryClient.refetchQueries({ queryKey: ['profile', user.id] });
      
      toast({ title: 'Profile photo updated!' });
    } catch (error: any) {
      toast({ title: 'Error uploading photo', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      await updateProfile.mutateAsync({ display_name: displayName, bio, social_links: socialLinks } as any);
      toast({ title: 'Profile updated successfully!' });
    } catch (error: any) {
      toast({ title: 'Error updating profile', description: error.message, variant: 'destructive' });
    }
  };

  const updateNotificationSetting = async (key: keyof Omit<UserSettings, 'user_id'>, value: boolean) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, [key]: value }, { onConflict: 'user_id' });

      if (error) throw error;
      
      await refetchSettings();
      toast({ title: 'Notification settings updated' });
    } catch (error: any) {
      toast({ title: 'Error updating settings', description: error.message, variant: 'destructive' });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/auth?mode=reset` });
      if (error) throw error;
      toast({ title: 'Password reset email sent', description: 'Check your email for instructions.' });
    } catch (error: any) {
      toast({ title: 'Error sending reset email', description: error.message, variant: 'destructive' });
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-user');
      if (error) throw error;
      toast({ title: 'Account Deletion Initiated', description: 'Your account is being deleted.' });
      await signOut();
      navigate('/auth', { replace: true });
    } catch (error: any) {
      toast({ title: 'Error deleting account', description: error.message, variant: 'destructive' });
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

  const sidebarNav = [
    { id: TABS.PROFILE, label: 'Edit Profile', icon: UserIcon },
    { id: TABS.APPEARANCE, label: 'Appearance', icon: Palette },
    { id: TABS.SECURITY, label: 'Security', icon: KeyRound },
    { id: TABS.NOTIFICATIONS, label: 'Notifications', icon: Bell },
    { id: TABS.ACCOUNT, label: 'Account', icon: Users },
    { id: TABS.DANGER, label: 'Danger Zone', icon: ShieldAlert, className: 'text-destructive hover:text-destructive hover:bg-destructive/10' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case TABS.PROFILE:
        return (
          <Card>
            <CardHeader><CardTitle>Profile Information</CardTitle><CardDescription>Update your public profile information.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24 border-2 border-primary/20"><AvatarImage src={profile.avatar_url} /><AvatarFallback className="text-3xl">{profile.display_name?.[0] || 'U'}</AvatarFallback></Avatar>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatar-upload" />
                  <Button variant="outline" size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-background" onClick={() => document.getElementById('avatar-upload')?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  </Button>
                </div>
                <div>
                  <p className="text-xl font-bold">@{profile.username}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-primary-foreground bg-primary rounded-full">{profile.role}</span>
                </div>
              </div>
              <div className="space-y-4 pt-4">
                <div><Label htmlFor="display-name">Display Name</Label><Input id="display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your display name" /></div>
                <div><Label htmlFor="bio">Bio</Label><Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" rows={3} /></div>
                <Separator />
                <SocialLinksEditor links={socialLinks} onChange={setSocialLinks} maxLinks={6} />
                <Button onClick={handleProfileUpdate} disabled={updateProfile.isPending}>{updateProfile.isPending ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </CardContent>
          </Card>
        );
      case TABS.APPEARANCE:
        return (
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle><CardDescription>Choose your preferred theme.</CardDescription></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['light', 'dark', 'system'].map((t) => (
                  <div key={t} className={cn('cursor-pointer rounded-lg border-2 p-4 text-center transition-all', theme === t ? 'border-primary scale-105' : 'border-muted hover:border-muted-foreground')} onClick={() => setTheme(t)}>
                    {t === 'light' && <Sun className="mx-auto mb-2 h-6 w-6" />}
                    {t === 'dark' && <Moon className="mx-auto mb-2 h-6 w-6" />}
                    {t === 'system' && <Laptop className="mx-auto mb-2 h-6 w-6" />}
                    <span className="font-medium capitalize">{t}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      case TABS.SECURITY:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Password & Privacy</CardTitle><CardDescription>Manage your account privacy and security settings.</CardDescription></CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div><Label>Private Account</Label><p className="text-sm text-muted-foreground">Only approved followers can see your posts.</p></div>
                  <Switch checked={profile.is_private} onCheckedChange={(checked) => updateProfile.mutate({ is_private: checked })} />
                </div>
                <Separator />
                <div>
                  <Label>Change Password</Label>
                  <p className="text-sm text-muted-foreground mb-2">If you use social login, you may need to link an email first.</p>
                  <Button variant="outline" onClick={handlePasswordReset} disabled={!linkedProviders.includes('email')}>Reset Password via Email</Button>
                </div>
              </CardContent>
            </Card>
             <Card>
              <CardHeader><CardTitle>Two-Factor Authentication (2FA)</CardTitle><CardDescription>Add an extra layer of security to your account.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {mfaFactors?.all && mfaFactors.all.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-2">2FA is enabled.</p>
                    <ul className="space-y-2">
                      {mfaFactors.all.map((factor: any) => (
                        <li key={factor.id} className="flex items-center justify-between text-sm p-2 border rounded-md">
                          <span>{factor.friendly_name || `Authenticator App`}</span>
                          <Button variant="destructive" size="sm" onClick={() => handleMfaUnenroll(factor.id)}>Disable</Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : ( <Button onClick={handleMfaEnroll} disabled={isEnrolling}>{isEnrolling ? 'Loading...' : 'Enable 2FA'}</Button> )}
              </CardContent>
            </Card>
          </div>
        );
      case TABS.NOTIFICATIONS:
        return (
          <Card>
            <CardHeader><CardTitle>Notifications</CardTitle><CardDescription>Choose what notifications you want to receive.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              {settings ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div><Label className="text-base">Enable Notifications</Label><p className="text-sm text-muted-foreground">Master control for all app notifications.</p></div>
                    <Switch checked={settings.notifications_enabled} onCheckedChange={(c) => updateNotificationSetting('notifications_enabled', c)} />
                  </div>
                  <Separator />
                  <div className={cn('space-y-4 pt-4', !settings.notifications_enabled && 'opacity-50 pointer-events-none')}>
                    <p className="text-sm text-muted-foreground">Fine-tune the notifications you want to see when notifications are enabled.</p>
                    <div className="flex items-center justify-between"><Label>Likes</Label><Switch checked={settings.like_notifications} onCheckedChange={(c) => updateNotificationSetting('like_notifications', c)} disabled={!settings.notifications_enabled} /></div>
                    <div className="flex items-center justify-between"><Label>Comments</Label><Switch checked={settings.comment_notifications} onCheckedChange={(c) => updateNotificationSetting('comment_notifications', c)} disabled={!settings.notifications_enabled} /></div>
                    <div className="flex items-center justify-between"><Label>New Followers</Label><Switch checked={settings.follow_notifications} onCheckedChange={(c) => updateNotificationSetting('follow_notifications', c)} disabled={!settings.notifications_enabled} /></div>
                  </div>
                </>
              ) : (<div>Loading settings...</div>)}
            </CardContent>
          </Card>
        );
      case TABS.ACCOUNT:
        return (
          <Card>
            <CardHeader><CardTitle>Account Management</CardTitle><CardDescription>Manage how you sign in.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-muted-foreground">You are currently signed in with <span className="font-semibold capitalize text-primary">{user?.app_metadata.provider || 'email'}</span>.</p>
              <div className="space-y-2">
                {[
                  { provider: 'google', icon: <img src="/assets/icons/google.svg" alt="Google" className="w-5 h-5" /> },
                  { provider: 'github', icon: <Github className="w-5 h-5" /> },
                  { provider: 'email', icon: <Mail className="w-5 h-5" /> },
                ].map(({ provider, icon }) => {
                  const isLinked = linkedProviders.includes(provider);
                  return (
                    <div key={provider} className="flex items-center justify-between rounded-md border p-3">
                      <div className="flex items-center gap-3">{icon}<span className="font-medium capitalize">{provider}</span></div>
                      <Button variant="outline" size="sm" disabled>{isLinked ? 'Linked' : 'Coming Soon'}</Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      case TABS.DANGER:
        return (
          <Card className="border-destructive">
            <CardHeader><CardTitle className="text-destructive">Danger Zone</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">Be careful, these actions are irreversible.</p>
              <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setShowDeleteDialog(true)}><ShieldAlert className="mr-2 h-4 w-4" />Delete My Account</Button>
            </CardContent>
          </Card>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
           <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => navigate('/')}>
              <ArrowLeft className="h-6 w-6" />
           </Button>
          <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account and preferences.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <aside className="md:col-span-1">
            <nav className="flex flex-col space-y-1 sticky top-24">
              {sidebarNav.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  className={cn('justify-start', tab.className)}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="mr-2 h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </nav>
          </aside>
          <div className="md:col-span-3 space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <Dialog open={showMfaDialog} onOpenChange={setShowMfaDialog}>
        <DialogContent><DialogHeader><DialogTitle>Enable Two-Factor Authentication</DialogTitle><DialogDescription>Scan the QR code with your authenticator app.</DialogDescription></DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {mfaEnrollData && 'qr_code' in mfaEnrollData && <img src={(mfaEnrollData as any).qr_code} alt="2FA QR Code" className="p-2 bg-white rounded-lg" />}
            <p className="text-sm text-muted-foreground">Then, enter the 6-digit code from your app below.</p>
            <InputOTP maxLength={6} value={verificationCode} onChange={setVerificationCode}><InputOTPGroup><InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} /><InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} /></InputOTPGroup></InputOTP>
            <Button onClick={handleMfaVerify} disabled={isVerifying || verificationCode.length < 6} className="w-full">{isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify and Enable'}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete your account and remove your data from our servers. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'I understand, delete my account'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
