import nekoPawLogo from '@/assets/Logo/NekoPaw.png';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Check, ChevronRight, Loader2, MapPin, User, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

type Step = 'username' | 'avatar' | 'location' | 'suggested';

interface OAuthUserData {
  displayName?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
  provider?: string;
}

interface SuggestedUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

function getOAuthDataFromUser(user: { user_metadata?: Record<string, unknown>; app_metadata?: { provider?: string }; email?: string } | null): OAuthUserData {
  const metadata = (user?.user_metadata || {}) as Record<string, string | undefined>;
  const provider = user?.app_metadata?.provider || '';

  let displayName = '';
  let username = '';
  let avatarUrl = '';
  const email = user?.email || metadata.email || '';

  switch (provider) {
    case 'google':
      displayName = metadata.full_name || metadata.name || '';
      username = metadata.email?.split('@')[0] || '';
      avatarUrl = metadata.avatar_url || metadata.picture || '';
      break;
    case 'github':
      displayName = metadata.name || metadata.full_name || '';
      username = metadata.user_name || metadata.preferred_username || '';
      avatarUrl = metadata.avatar_url || '';
      break;
    case 'discord':
      displayName = metadata.full_name || metadata.global_name || metadata.name || '';
      username = metadata.name || metadata.custom_username || '';
      avatarUrl = metadata.avatar_url || '';
      break;
    default:
      displayName = metadata.full_name || metadata.name || '';
      username = metadata.user_name || metadata.preferred_username || email?.split('@')[0] || '';
      avatarUrl = metadata.avatar_url || '';
  }

  return {
    displayName,
    username: username.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ''),
    avatarUrl,
    email,
    provider,
  };
}

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const [isCheckingProfile, setIsCheckingProfile] = useState(true);

  const oauthDataFromState = (location.state as { oauthData?: OAuthUserData })?.oauthData;
  const oauthData = oauthDataFromState || getOAuthDataFromUser(user);

  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState(oauthData?.username || '');
  const [displayName, setDisplayName] = useState(oauthData?.displayName || '');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(oauthData?.avatarUrl || null);
  const [oauthAvatarUrl] = useState<string | null>(oauthData?.avatarUrl || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [locationValue, setLocationValue] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);

  useEffect(() => {
    const initialUsername = oauthData?.username || '';
    if (initialUsername && initialUsername.length >= 3) {
      checkUsernameAvailability(initialUsername);
    }
  }, []);

  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) {
        setIsCheckingProfile(false);
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error("Error checking profile:", error);
        setIsCheckingProfile(false);
        return;
      }

      if (profile?.username) {
        navigate('/');
      } else {
        setIsCheckingProfile(false);
      }
    };

    checkExistingProfile();
  }, [user, navigate]);

  useEffect(() => {
    if (step === 'suggested') {
      loadSuggestedUsers();
    }
  }, [step]);

  const loadSuggestedUsers = async () => {
    if (!user) return;
    setIsLoadingSuggested(true);

    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, username, display_name, avatar_url')
        .neq('user_id', user.id)
        .limit(6);

      if (data) {
        setSuggestedUsers(data);
      }
    } catch (error) {
      console.error('Error loading suggested users:', error);
    } finally {
      setIsLoadingSuggested(false);
    }
  };

  const validateUsername = (value: string) => {
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be less than 20 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores';
    return '';
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || validateUsername(username)) return;

    setIsCheckingUsername(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (data) {
        setUsernameError('Username is already taken');
      } else {
        setUsernameError('');
      }
    } catch (error: any) {
      if (error.code === 'PGRST116' || error.status === 406) {
        setUsernameError('');
      } else {
        console.error('Error checking username:', error);
      }
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(cleanValue);
    const error = validateUsername(cleanValue);
    setUsernameError(error);

    if (!error && cleanValue.length >= 3) {
      const timer = setTimeout(() => checkUsernameAvailability(cleanValue), 500);
      return () => clearTimeout(timer);
    }
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return null;

    setIsUploading(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true });

      if (uploadError) throw uploadError;

      return filePath;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({ title: 'Error', description: 'Failed to upload avatar', variant: 'destructive' });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleFollowUser = async (userId: string) => {
    if (!user) return;

    const isFollowing = followedUsers.has(userId);

    if (isFollowing) {
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);

      setFollowedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    } else {
      await supabase
        .from('followers')
        .insert({ follower_id: user.id, following_id: userId });

      setFollowedUsers(prev => new Set(prev).add(userId));
    }
  };

  const saveAndContinue = async () => {
    if (!user) return;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('username, display_name, avatar_url, bio')
        .eq('user_id', user.id)
        .single();

      let finalAvatarUrl: string | null = null;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar();
      } else if (oauthAvatarUrl && !currentProfile?.avatar_url) {
        finalAvatarUrl = oauthAvatarUrl;
      }

      const updateData: Record<string, any> = {};

      if (username && username !== currentProfile?.username) {
        updateData.username = username;
      }

      if (displayName && displayName !== currentProfile?.display_name) {
        updateData.display_name = displayName;
      }

      if (finalAvatarUrl && finalAvatarUrl !== currentProfile?.avatar_url) {
        updateData.avatar_url = finalAvatarUrl;
      }

      if (locationValue) {
        const newBio = `📍 ${locationValue}`;
        if (newBio !== currentProfile?.bio) {
          updateData.bio = newBio;
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('user_id', user.id);

        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });

      toast({ title: 'Welcome!', description: 'Your profile has been set up' });
      navigate('/');
    } catch (error: unknown) {
      console.error('Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleNextStep = () => {
    switch (step) {
      case 'username':
        if (!usernameError && username.length >= 3) setStep('avatar');
        break;
      case 'avatar':
        setStep('location');
        break;
      case 'location':
        setStep('suggested');
        break;
      case 'suggested':
        saveAndContinue();
        break;
    }
  };

  const handleSkip = () => {
    if (step === 'avatar' || step === 'location') {
      setStep(step === 'avatar' ? 'location' : 'suggested');
    } else if (step === 'suggested') {
      saveAndContinue();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'username':
        return (
          <div className="space-y-6">
            <div className="text-center"><User className="h-16 w-16 mx-auto text-primary mb-4" /><h2 className="text-2xl font-bold">Choose your username</h2><p className="text-muted-foreground mt-2">This is how others will find you</p></div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span><Input id="username" value={username} onChange={(e) => handleUsernameChange(e.target.value)} placeholder="friska123" className="pl-8" /></div>
              {usernameError && (<p className="text-sm text-destructive">{usernameError}</p>)}
              {isCheckingUsername && (<p className="text-sm text-muted-foreground">Checking availability...</p>)}
              {username.length >= 3 && !usernameError && !isCheckingUsername && (<p className="text-sm text-green-500 flex items-center gap-1"><Check className="h-4 w-4" /> Username is available</p>)}
            </div>
            <Button onClick={handleNextStep} disabled={usernameError !== '' || username.length < 3 || isCheckingUsername} className="w-full">Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
          </div>
        );

      case 'avatar':
        return (
          <div className="space-y-6">
            <div className="text-center"><Camera className="h-16 w-16 mx-auto text-primary mb-4" /><h2 className="text-2xl font-bold">Add a profile photo</h2><p className="text-muted-foreground mt-2">Help others recognize you</p></div>
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 cursor-pointer ring-4 ring-primary/20" onClick={() => fileInputRef.current?.click()}><AvatarImage src={avatarUrl || ''} /><AvatarFallback className="text-3xl bg-muted">{username.substring(0, 2).toUpperCase()}</AvatarFallback></Avatar>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}><Camera className="mr-2 h-4 w-4" />{avatarUrl ? 'Change Photo' : 'Upload Photo'}</Button>
            </div>
            <div className="flex gap-3"><Button variant="ghost" onClick={handleSkip} className="flex-1">Skip</Button><Button onClick={handleNextStep} className="flex-1" disabled={isUploading}>Continue <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <div className="text-center"><MapPin className="h-16 w-16 mx-auto text-primary mb-4" /><h2 className="text-2xl font-bold">Where are you from?</h2><p className="text-muted-foreground mt-2">This helps us connect you with nearby users</p></div>
            <div className="space-y-2"><Label htmlFor="location">Location (optional)</Label><Input id="location" value={locationValue} onChange={(e) => setLocationValue(e.target.value)} placeholder="e.g., Jakarta, Indonesia" /></div>
            <div className="flex gap-3"><Button variant="ghost" onClick={handleSkip} className="flex-1">Skip</Button><Button onClick={handleNextStep} className="flex-1">Continue <ChevronRight className="ml-2 h-4 w-4" /></Button></div>
          </div>
        );

      case 'suggested':
        return (
          <div className="space-y-6">
            <div className="text-center"><Users className="h-16 w-16 mx-auto text-primary mb-4" /><h2 className="text-2xl font-bold">People you might know</h2><p className="text-muted-foreground mt-2">Follow some accounts to get started</p></div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {isLoadingSuggested ? (<div className="text-center py-4 text-muted-foreground">Loading...</div>) : suggestedUsers.length === 0 ? (<div className="text-center py-4 text-muted-foreground">No suggestions available</div>) : (
                suggestedUsers.map((suggestedUser) => (
                  <div key={suggestedUser.user_id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10"><AvatarImage src={suggestedUser.avatar_url || ''} /><AvatarFallback>{suggestedUser.username?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback></Avatar>
                      <div><p className="font-medium">{suggestedUser.display_name || suggestedUser.username}</p><p className="text-sm text-muted-foreground">@{suggestedUser.username}</p></div>
                    </div>
                    <Button variant={followedUsers.has(suggestedUser.user_id) ? 'secondary' : 'default'} size="sm" onClick={() => handleFollowUser(suggestedUser.user_id)}>{followedUsers.has(suggestedUser.user_id) ? (<><Check className="mr-1 h-3 w-3" /> Following</>) : ('Follow')}</Button>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-3"><Button variant="ghost" onClick={handleSkip} className="flex-1">Skip</Button><Button onClick={handleNextStep} className="flex-1">Finish <Check className="ml-2 h-4 w-4" /></Button></div>
          </div>
        );
    }
  };

  if (isCheckingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const steps: Step[] = ['username', 'avatar', 'location', 'suggested'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={nekoPawLogo} alt="NekoPaw" className="w-16 h-16 mx-auto mb-2 rounded-xl" />
          <CardTitle className="text-xl">Complete Your Profile</CardTitle>
          <CardDescription>Step {currentStepIndex + 1} of {steps.length}</CardDescription>
          <div className="flex gap-1 mt-4">{steps.map((s, i) => (<div key={s} className={`h-1 flex-1 rounded-full transition-colors ${i <= currentStepIndex ? 'bg-primary' : 'bg-muted'}`} />))}</div>
        </CardHeader>
        <CardContent>{renderStep()}</CardContent>
      </Card>
    </div>
  );
}
