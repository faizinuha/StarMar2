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

export const MaintenanceBannersTab = () => {
  const { data: banners, isLoading } = useMaintenanceMode();
  const { mutate: setMaintenanceMode, isPending } = useSetMaintenanceMode();

  const [selectedBanner, setSelectedBanner] = useState<Partial<MaintenanceMode> | null>(null);
  const [pagePath, setPagePath] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<'info' | 'warning' | 'maintenance' | 'blocked'>('warning');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (selectedBanner) {
      setPagePath(selectedBanner.page_path || '');
      setTitle(selectedBanner.title || '');
      setMessage(selectedBanner.message || '');
      setType(selectedBanner.type || 'warning');
      setIsActive(selectedBanner.is_active || false);
    } else {
      // Reset form
      setPagePath('');
      setTitle('');
      setMessage('');
      setType('warning');
      setIsActive(false);
    }
  }, [selectedBanner]);

  const handleSave = () => {
    if (!pagePath || !title || !message) {
      // Basic validation
      alert('Page Path, Title, and Message are required.');
      return;
    }
    setMaintenanceMode({
      page_path: pagePath,
      title,
      message,
      type,
      is_active: isActive,
    });
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {banners?.map((banner) => (
                    <TableRow key={banner.id} onClick={() => setSelectedBanner(banner)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{banner.page_path}</TableCell>
                      <TableCell>
                        <Badge variant={banner.is_active ? 'default' : 'outline'}>
                          {banner.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{banner.type}</Badge></TableCell>
                      <TableCell>{banner.title}</TableCell>
                    </TableRow>
                  ))}
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
              {selectedBanner ? `Editing banner for ${selectedBanner.page_path}` : 'Use "/" for a site-wide banner.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pagePath">Page Path</Label>
              <Input id="pagePath" placeholder="/profile/username" value={pagePath} onChange={(e) => setPagePath(e.target.value)} disabled={!!selectedBanner} />
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