import { useState, useEffect } from 'react';
import { useMaintenanceMode, useSetMaintenanceMode, MaintenanceMode } from '@/hooks/useMaintenanceMode';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

// Available pages in the app
const AVAILABLE_PAGES = [
  { path: '/', label: 'Home (Site-wide)' },
  { path: '/explore', label: 'Explore' },
  { path: '/memes', label: 'Memes' },
  { path: '/chat', label: 'Chat' },
  { path: '/notifications', label: 'Notifications' },
  { path: '/settings', label: 'Settings' },
  { path: '/profile', label: 'Profile (All)' },
  { path: '/admin', label: 'Admin Dashboard' },
  { path: '/reelms', label: 'Reelms' },
];

export const MaintenanceBannersTab = () => {
  const { data: banners, isLoading } = useMaintenanceMode();
  const { mutate: setMaintenanceMode, isPending } = useSetMaintenanceMode();
  const queryClient = useQueryClient();

  const [selectedBanner, setSelectedBanner] = useState<Partial<MaintenanceMode> | null>(null);
  const [pagePath, setPagePath] = useState('');
  const [customPath, setCustomPath] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'maintenance' | 'blocked'>('warning');
  const [isActive, setIsActive] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBanner) {
      const isPredefined = AVAILABLE_PAGES.some(p => p.path === selectedBanner.page_path);
      if (isPredefined) {
        setPagePath(selectedBanner.page_path || '');
        setCustomPath('');
      } else {
        setPagePath('custom');
        setCustomPath(selectedBanner.page_path || '');
      }
      setTitle(selectedBanner.title || '');
      setMessage(selectedBanner.message || '');
      setType(selectedBanner.type || 'warning');
      setIsActive(selectedBanner.is_active || false);
    } else {
      setPagePath('');
      setCustomPath('');
      setTitle('');
      setMessage('');
      setType('warning');
      setIsActive(false);
    }
  }, [selectedBanner]);

  const handleSave = () => {
    const finalPath = pagePath === 'custom' ? customPath : pagePath;
    
    if (!finalPath || !title || !message) {
      toast.error('Page Path, Title, dan Message wajib diisi.');
      return;
    }
    
    setMaintenanceMode({
      page_path: finalPath,
      title,
      message,
      type,
      is_active: isActive,
    }, {
      onSuccess: () => {
        toast.success('Banner berhasil disimpan!');
        setSelectedBanner(null);
      },
      onError: (error) => {
        toast.error(`Gagal menyimpan: ${error.message}`);
      }
    });
  };

  const handleDelete = async (bannerId: string) => {
    setDeleting(bannerId);
    try {
      const { error } = await supabase
        .from('maintenance_mode')
        .delete()
        .eq('id', bannerId);
      if (error) throw error;
      toast.success('Banner berhasil dihapus!');
      queryClient.invalidateQueries({ queryKey: ['maintenance-mode'] });
      if (selectedBanner?.id === bannerId) {
        setSelectedBanner(null);
      }
    } catch (error: any) {
      toast.error(`Gagal menghapus: ${error.message}`);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Banners</CardTitle>
            <CardDescription>Manage site-wide or page-specific maintenance banners.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners && banners.length > 0 ? banners.map((banner) => (
                    <TableRow key={banner.id} onClick={() => setSelectedBanner(banner)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{banner.page_path}</TableCell>
                      <TableCell>
                        <Badge variant={banner.is_active ? 'default' : 'outline'}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{banner.type}</Badge></TableCell>
                      <TableCell>{banner.title}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(banner.id);
                          }}
                          disabled={deleting === banner.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Belum ada banner maintenance.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>{selectedBanner ? 'Edit Banner' : 'Create Banner'}</CardTitle>
            <CardDescription>
              {selectedBanner ? `Editing banner for ${selectedBanner.page_path}` : 'Pilih halaman atau masukkan path custom.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pagePath">Page Path</Label>
              <Select 
                value={pagePath} 
                onValueChange={(v) => {
                  setPagePath(v);
                  if (v !== 'custom') setCustomPath('');
                }}
                disabled={!!selectedBanner}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih halaman..." />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_PAGES.map((page) => (
                    <SelectItem key={page.path} value={page.path}>
                      {page.label}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">Custom Path...</SelectItem>
                </SelectContent>
              </Select>
              
              {pagePath === 'custom' && (
                <Input 
                  placeholder="/custom/path" 
                  value={customPath} 
                  onChange={(e) => setCustomPath(e.target.value)}
                  disabled={!!selectedBanner}
                  className="mt-2"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="System Maintenance" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="We are currently undergoing maintenance." value={message} onChange={(e) => setMessage(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Banner Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="isActive">Active</Label>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              {selectedBanner && (
                <Button variant="ghost" onClick={() => setSelectedBanner(null)} disabled={isPending}>Clear</Button>
              )}
              <Button onClick={handleSave} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Banner'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};