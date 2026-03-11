import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, ArrowLeft, BadgeCheck, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

const RequestVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: existingRequest, isLoading } = useQuery({
    queryKey: ['verification-request', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user || !reason.trim()) {
      toast({ title: 'Mohon isi alasan verifikasi', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('verification_requests')
        .insert({ user_id: user.id, reason: reason.trim() } as any);
      if (error) throw error;
      toast({ title: 'Pengajuan verifikasi berhasil dikirim!' });
      setReason('');
    } catch (error: any) {
      toast({ title: 'Gagal mengirim pengajuan', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BadgeCheck className="h-6 w-6 text-primary" />
              Request Verification
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Ajukan permohonan verifikasi akun Anda</p>
          </div>
        </div>

        {/* Notice */}
        <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Fitur Dalam Pengembangan</p>
                <p className="text-muted-foreground">
                  Fitur verifikasi masih dalam tahap pengembangan. Belum ada fitur khusus yang tersedia setelah akun diverifikasi. 
                  Halaman ini hanya untuk pengajuan awal agar tim kami dapat meninjau akun Anda.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Request Status */}
        {existingRequest && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold">Status Pengajuan Terakhir:</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  existingRequest.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  existingRequest.status === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {existingRequest.status === 'pending' ? '⏳ Menunggu' :
                   existingRequest.status === 'approved' ? '✅ Disetujui' : '❌ Ditolak'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{existingRequest.reason}</p>
              {existingRequest.admin_response && (
                <div className="mt-2 p-2 bg-muted/50 rounded text-sm">
                  <span className="font-medium">Respons Admin:</span> {existingRequest.admin_response}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Form Pengajuan Verifikasi</CardTitle>
            <CardDescription>
              Jelaskan alasan mengapa akun Anda layak diverifikasi. Tim kami akan meninjau pengajuan Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="reason">Alasan Verifikasi</Label>
              <Textarea
                id="reason"
                placeholder="Jelaskan mengapa Anda ingin akun diverifikasi. Misalnya: figur publik, kreator konten, brand resmi, dll."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[120px] mt-2"
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !reason.trim()} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {submitting ? 'Mengirim...' : 'Kirim Pengajuan'}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default RequestVerification;
