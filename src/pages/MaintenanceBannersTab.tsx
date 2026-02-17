import { useState, useEffect } from 'react';
import { useMaintenanceMode, useSetMaintenanceMode, MaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, Plus, Pencil } from 'lucide-react';

const AVAILABLE_PAGES = [
  { path: '/', label: 'Home (Site-wide)' },
  { path: '/explore', label: 'Explore' },
  { path: '/memes', label: 'Memes' },
  { path: '/chat', label: 'Chat' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/settings', label: 'Settings' },
  { path: '/profile', label: 'Profile' },
  { path: '/reelms', label: 'Reelms' },
];

export const MaintenanceBannersTab = () => {
  const { data: banners, isLoading } = useMaintenanceMode();
  const { mutate: setMaintenanceMode, isPending } = useSetMaintenanceMode();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<MaintenanceMode | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [pagePath, setPagePath] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'maintenance' | 'blocked'>('maintenance');
  const [isActive, setIsActive] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const resetForm = () => {
    setEditing(null);
    setIsCreating(false);
    setPagePath('');
    setTitle('');
    setMessage('');
    setType('maintenance');
    setIsActive(true);
  };

  const startEdit = (banner: MaintenanceMode) => {
    setEditing(banner);
    setIsCreating(false);
    setPagePath(banner.page_path);
    setTitle(banner.title);
    setMessage(banner.message);
    setType(banner.type);
    setIsActive(banner.is_active);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const handleSave = () => {
    if (!pagePath || !title || !message) {
      toast.error('Semua field wajib diisi.');
      return;
    }
    setMaintenanceMode({ page_path: pagePath, title, message, type, is_active: isActive }, {
      onSuccess: () => {
        toast.success(editing ? 'Banner diperbarui!' : 'Banner dibuat!');
        resetForm();
      },
    });
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('maintenance_mode').delete().eq('id', id);
    if (error) toast.error(`Gagal menghapus: ${error.message}`);
    else {
      toast.success('Banner dihapus!');
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
      if (editing?.id === id) resetForm();
    }
    setDeleting(null);
  };

  const handleToggle = async (banner: MaintenanceMode) => {
    const { error } = await supabase
      .from('maintenance_mode')
      .update({ is_active: !banner.is_active, updated_at: new Date().toISOString() })
      .eq('id', banner.id);
    if (error) toast.error('Gagal update status');
    else queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
  };

  const showForm = isCreating || editing;

  return (
    <div className="space-y-4">
      {/* Banner List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Maintenance Banners</CardTitle>
            <CardDescription>Kelola banner maintenance per halaman. Halaman yang aktif akan diblokir untuk semua pengguna kecuali admin & moderator.</CardDescription>
          </div>
          <Button onClick={startCreate} size="sm" disabled={isCreating}>
            <Plus className="h-4 w-4 mr-1" /> Buat
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : !banners || banners.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Belum ada banner maintenance.</p>
          ) : (
            <div className="space-y-2">
              {banners.map(banner => (
                <div key={banner.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Switch
                      checked={banner.is_active}
                      onCheckedChange={() => handleToggle(banner)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{banner.title}</span>
                        <Badge variant="outline" className="text-xs">{banner.page_path}</Badge>
                        <Badge variant={banner.type === 'blocked' ? 'destructive' : 'secondary'} className="text-xs">
                          {banner.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{banner.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEdit(banner)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(banner.id)}
                      disabled={deleting === banner.id}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{editing ? 'Edit Banner' : 'Buat Banner Baru'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Halaman</Label>
                <Select value={pagePath} onValueChange={setPagePath} disabled={!!editing}>
                  <SelectTrigger><SelectValue placeholder="Pilih halaman..." /></SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_PAGES.map(p => (
                      <SelectItem key={p.path} value={p.path}>{p.label} ({p.path})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipe</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maintenance">🔧 Maintenance (blokir halaman)</SelectItem>
                    <SelectItem value="blocked">🔒 Blocked (blokir halaman)</SelectItem>
                    <SelectItem value="warning">⚠️ Warning (banner saja)</SelectItem>
                    <SelectItem value="info">ℹ️ Info (banner saja)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Judul</Label>
              <Input placeholder="Contoh: Sedang Maintenance" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Pesan</Label>
              <Textarea placeholder="Penjelasan untuk pengguna..." value={message} onChange={e => setMessage(e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <Label>Aktifkan langsung</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={resetForm} disabled={isPending}>Batal</Button>
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Menyimpan...' : editing ? 'Update' : 'Simpan'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
