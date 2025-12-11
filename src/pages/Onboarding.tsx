import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, MapPin, User, Users, ChevronRight, Check, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import starMarLogo from '../../assets/Logo/StarMar-.png';

type Step = 'username' | 'avatar' | 'location' | 'suggested';

interface SuggestedUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('username');
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [location, setLocation] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
  const [isLoadingSuggested, setIsLoadingSuggested] = useState(false);

  // Check if user already has username
  useEffect(() => {
    const checkExistingProfile = async () => {
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('user_id', user.id)
        .single();
      
      // If user already has a username, skip onboarding
      if (profile?.username) {
        navigate('/');
      }
    };
    
    checkExistingProfile();
  }, [user, navigate]);

  // Load suggested users when reaching that step
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
        .limit(7);
      
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
    } catch {
      // No user found with this username - it's available
      setUsernameError('');
    } finally {
      setIsCheckingUsername(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    const cleanValue = value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
    setUsername(cleanValue);
    const error = validateUsername(cleanValue);
    setUsernameError(error);
    
    // Debounce username check
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
      // Unfollow
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
      // Follow
      await supabase
        .from('followers')
        .insert({ follower_id: user.id, following_id: userId });
      
      setFollowedUsers(prev => new Set(prev).add(userId));
    }
  };

  const saveAndContinue = async () => {
    if (!user) return;
    
    try {
      // Upload avatar if selected
      let avatarPath = null;
      if (avatarFile) {
        avatarPath = await uploadAvatar();
      }
      
      // Update profile
      const updateData: Record<string, any> = { username };
      if (avatarPath) updateData.avatar_url = avatarPath;
      if (location) updateData.bio = `📍 ${location}`;
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast({ title: 'Welcome!', description: 'Your profile has been set up' });
      navigate('/');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleNextStep = () => {
    switch (step) {
      case 'username':
        if (!usernameError && username.length >= 3) {
          setStep('avatar');
        }
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
    if (step === 'avatar') {
      setStep('location');
    } else if (step === 'location') {
      setStep('suggested');
    } else if (step === 'suggested') {
      saveAndContinue();
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'username':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <User className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold">Choose your username</h2>
              <p className="text-muted-foreground mt-2">This is how others will find you</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="friska123"
                  className="pl-8"
                />
              </div>
              {usernameError && (
                <p className="text-sm text-destructive">{usernameError}</p>
              )}
              {isCheckingUsername && (
                <p className="text-sm text-muted-foreground">Checking availability...</p>
              )}
              {username.length >= 3 && !usernameError && !isCheckingUsername && (
                <p className="text-sm text-green-500 flex items-center gap-1">
                  <Check className="h-4 w-4" /> Username is available
                </p>
              )}
            </div>
            
            <Button
              onClick={handleNextStep}
              disabled={usernameError !== '' || username.length < 3 || isCheckingUsername}
              className="w-full"
            >
              Continue <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        );

      case 'avatar':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Camera className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold">Add a profile photo</h2>
              <p className="text-muted-foreground mt-2">Help others recognize you</p>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 cursor-pointer ring-4 ring-primary/20" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={avatarUrl || ''} />
                <AvatarFallback className="text-3xl bg-muted">
                  {username.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarSelect}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" />
                {avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </Button>
            </div>
            
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleNextStep} className="flex-1" disabled={isUploading}>
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MapPin className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold">Where are you from?</h2>
              <p className="text-muted-foreground mt-2">This helps us connect you with nearby users</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="location">Location (optional)</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Jakarta, Indonesia"
              />
            </div>
            
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleNextStep} className="flex-1">
                Continue <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      case 'suggested':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto text-primary mb-4" />
              <h2 className="text-2xl font-bold">People you might know</h2>
              <p className="text-muted-foreground mt-2">Follow some accounts to get started</p>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {isLoadingSuggested ? (
                <div className="text-center py-4 text-muted-foreground">Loading...</div>
              ) : suggestedUsers.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No suggestions available</div>
              ) : (
                suggestedUsers.map((suggestedUser) => (
                  <div
                    key={suggestedUser.user_id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={suggestedUser.avatar_url || ''} />
                        <AvatarFallback>
                          {suggestedUser.username?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{suggestedUser.display_name || suggestedUser.username}</p>
                        <p className="text-sm text-muted-foreground">@{suggestedUser.username}</p>
                      </div>
                    </div>
                    <Button
                      variant={followedUsers.has(suggestedUser.user_id) ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => handleFollowUser(suggestedUser.user_id)}
                    >
                      {followedUsers.has(suggestedUser.user_id) ? (
                        <>
                          <Check className="mr-1 h-3 w-3" /> Following
                        </>
                      ) : (
                        'Follow'
                      )}
                    </Button>
                  </div>
                ))
              )}
            </div>
            
            <div className="flex gap-3">
              <Button variant="ghost" onClick={handleSkip} className="flex-1">
                Skip
              </Button>
              <Button onClick={handleNextStep} className="flex-1">
                Finish <Check className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        );
    }
  };

  // Progress indicator
  const steps: Step[] = ['username', 'avatar', 'location', 'suggested'];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <img src={starMarLogo} alt="StarMar" className="w-16 h-16 mx-auto mb-2" />
          <CardTitle className="text-xl">Complete Your Profile</CardTitle>
          <CardDescription>Step {currentStepIndex + 1} of {steps.length}</CardDescription>
          
          {/* Progress bar */}
          <div className="flex gap-1 mt-4">
            {steps.map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}
