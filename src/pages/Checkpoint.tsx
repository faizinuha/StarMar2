import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Send, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BanInfo {
  is_banned: boolean;
  ban_reason: string | null;
  banned_at: string | null;
}

interface ExistingAppeal {
  id: string;
  status: string;
  created_at: string;
  admin_response: string | null;
}

export default function Checkpoint() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [banInfo, setBanInfo] = useState<BanInfo | null>(null);
  const [existingAppeal, setExistingAppeal] = useState<ExistingAppeal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    explanation: '',
    evidence: '',
    contactEmail: '',
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    checkBanStatus();
  }, [user, navigate]);

  const checkBanStatus = async () => {
    if (!user) return;

    try {
      // Check if user is banned
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason, banned_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile?.is_banned) {
        // User is not banned, redirect to home
        navigate('/');
        return;
      }

      setBanInfo(profile);

      // Check for existing appeal
      const { data: appeals, error: appealError } = await supabase
        .from('ban_appeals')
        .select('id, status, created_at, admin_response')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!appealError && appeals && appeals.length > 0) {
        setExistingAppeal(appeals[0]);
      }

    } catch (error) {
      console.error('Error checking ban status:', error);
      toast.error('Gagal memeriksa status akun');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    if (!formData.explanation.trim()) {
      toast.error('Mohon berikan penjelasan');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('ban_appeals')
        .insert({
          user_id: user.id,
          explanation: formData.explanation.trim(),
          evidence: formData.evidence.trim() || null,
          contact_email: formData.contactEmail.trim() || user.email,
        });

      if (error) throw error;

      toast.success('Banding berhasil dikirim! Admin akan meninjau dalam 1-3 hari kerja.');
      
      // Refresh to show existing appeal
      checkBanStatus();
      setFormData({ explanation: '', evidence: '', contactEmail: '' });

    } catch (error) {
      console.error('Error submitting appeal:', error);
      toast.error('Gagal mengirim banding. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Ban Notice Card */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl text-destructive">Akun Anda Telah di-Ban</CardTitle>
            <CardDescription className="text-base">
              Akses ke akun Anda telah dibatasi oleh administrator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {banInfo?.ban_reason && (
              <div className="bg-destructive/10 rounded-lg p-4">
                <p className="text-sm font-medium text-destructive mb-1">Alasan:</p>
                <p className="text-sm text-foreground">{banInfo.ban_reason}</p>
              </div>
            )}
            {banInfo?.banned_at && (
              <p className="text-xs text-muted-foreground text-center">
                Dibanned pada: {new Date(banInfo.banned_at).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Existing Appeal Status */}
        {existingAppeal && (
          <Card className={
            existingAppeal.status === 'approved' 
              ? 'border-green-500/50 bg-green-500/5' 
              : existingAppeal.status === 'rejected'
              ? 'border-destructive/50 bg-destructive/5'
              : 'border-yellow-500/50 bg-yellow-500/5'
          }>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                {existingAppeal.status === 'pending' && (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                    <span>Banding Sedang Ditinjau</span>
                  </>
                )}
                {existingAppeal.status === 'approved' && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span>Banding Disetujui</span>
                  </>
                )}
                {existingAppeal.status === 'rejected' && (
                  <>
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span>Banding Ditolak</span>
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Dikirim pada: {new Date(existingAppeal.created_at).toLocaleDateString('id-ID')}
              </CardDescription>
            </CardHeader>
            {existingAppeal.admin_response && (
              <CardContent>
                <div className="bg-background rounded-lg p-3">
                  <p className="text-sm font-medium mb-1">Respons Admin:</p>
                  <p className="text-sm text-muted-foreground">{existingAppeal.admin_response}</p>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Appeal Form */}
        {(!existingAppeal || existingAppeal.status === 'rejected') && (
          <Card>
            <CardHeader>
              <CardTitle>Ajukan Banding</CardTitle>
              <CardDescription>
                Jelaskan mengapa akun Anda harus dibuka kembali. Admin akan meninjau permohonan Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitAppeal} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="explanation">Penjelasan *</Label>
                  <Textarea
                    id="explanation"
                    placeholder="Jelaskan mengapa akun Anda harus dibuka kembali..."
                    value={formData.explanation}
                    onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
                    rows={4}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence">Bukti Pendukung (opsional)</Label>
                  <Textarea
                    id="evidence"
                    placeholder="Berikan bukti atau informasi tambahan yang mendukung banding Anda..."
                    value={formData.evidence}
                    onChange={(e) => setFormData(prev => ({ ...prev, evidence: e.target.value }))}
                    rows={3}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email Kontak (opsional)</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    placeholder={user?.email || 'email@example.com'}
                    value={formData.contactEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kami akan menghubungi Anda melalui email ini
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Kirim Banding
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Logout Button */}
        <div className="text-center">
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground">
            Keluar dari Akun
          </Button>
        </div>
      </div>
    </div>
  );
}
