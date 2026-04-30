import { useEffect, useState, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EditUserModal } from "@/components/admin/EditUserModal";
import UserActivityChart from "@/components/admin/UserActivityChart";
import { MaintenanceBannersTab } from "@/pages/MaintenanceBannersTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { BanUserDialog } from "@/components/admin/BanUserDialog";
import { BanAppealsTab } from "@/components/admin/BanAppealsTab";
import { VerificationRequestsTab } from "@/components/admin/VerificationRequestsTab";
import { ModeratorApplicationsTab } from "@/components/admin/ModeratorApplicationsTab";
import { WarnMuteDialog } from "@/components/admin/WarnMuteDialog";
import { AdminSeedContentTab } from "@/components/admin/AdminSeedContentTab";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Users, FileText, Heart, UserPlus, Search, ChevronLeft, ChevronRight, Ban, ShieldOff, AlertTriangle } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Navigation } from "@/components/layout/Navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  display_name: string | null;
  followers_count: number;
  following_count: number;
  posts_count: number;
  role: string | null;
  is_verified: string | null;
  is_banned?: boolean;
  ban_reason?: string | null;
  created_at: string;
}

const StatCard = ({ title, value, icon, description }: { title: string, value: string, icon: ReactNode, description: string }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const MaintenanceTab = () => (
  <div className="space-y-4">
    <MaintenanceBannersTab />
  </div>
);

const ITEMS_PER_PAGE = 10;

const AdminPage = () => {
  return (
    <div>
      <Navigation />
      <div className="md:pl-72">
        <AdminContent />
      </div>
    </div>
  );
};

const AdminContent = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalLikes: 0, newUsersToday: 0 });
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [userToBan, setUserToBan] = useState<Profile | null>(null);
  const [userToWarn, setUserToWarn] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentRole, setCurrentRole] = useState<'admin' | 'moderator' | null>(null);
  const { toast } = useToast();

  // Determine current user's role
  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('role').eq('user_id', user.id).single();
        if (data?.role === 'admin') setCurrentRole('admin');
        else if (data?.role === 'moderator') setCurrentRole('moderator');
      }
    };
    getRole();
  }, []);

  const processAvatarUrl = async (url: string | null) => {
    if (!url || url.startsWith('http')) return url;
    try {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(url, 3600);
      if (error) throw error;
      return data.signedUrl;
    } catch { return null; }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [usersRes, postsCountRes, likesCountRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("likes").select("id", { count: "exact", head: true }),
      ]);

      if (usersRes.error) throw usersRes.error;

      const processedUsers = await Promise.all(
        usersRes.data.map(async (user) => {
          const avatar_url = await processAvatarUrl(user.avatar_url);
          const { count: postsCount } = await supabase
            .from('posts').select('id', { count: 'exact', head: true }).eq('user_id', user.user_id);
          return { ...user, avatar_url, posts_count: postsCount || 0 };
        })
      );

      setUsers(processedUsers as Profile[]);

      const today = new Date().setHours(0, 0, 0, 0);
      const newUsersToday = usersRes.data.filter(u => new Date(u.created_at).setHours(0, 0, 0, 0) === today).length;

      setStats({
        totalUsers: usersRes.data.length,
        totalPosts: postsCountRes.count ?? 0,
        totalLikes: likesCountRes.count ?? 0,
        newUsersToday,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({ title: "Error", description: "Failed to fetch dashboard data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(user =>
      user.username?.toLowerCase().includes(query) ||
      user.display_name?.toLowerCase().includes(query) ||
      user.user_id.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const handleEditClick = (user: Profile) => { setSelectedUser(user); setIsModalOpen(true); };

  const handleCloseModal = (updatedUser?: Profile) => {
    setIsModalOpen(false);
    setSelectedUser(null);
    if (updatedUser) {
      setUsers(cur => cur.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    } else {
      fetchDashboardData();
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const { error } = await supabase.functions.invoke("delete-user", { body: { user_id: userToDelete.user_id } });
    if (error) {
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `User @${userToDelete.username} has been deleted.` });
      fetchDashboardData();
    }
    setUserToDelete(null);
  };

  const isAdmin = currentRole === 'admin';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isAdmin ? 'Admin' : 'Moderator'} Dashboard
          </h2>
          <Badge variant={isAdmin ? 'destructive' : 'secondary'} className="mt-1">
            {currentRole}
          </Badge>
        </div>
      </div>

      {/* Stats - visible to both */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="All registered users" />
        <StatCard title="Total Posts" value={stats.totalPosts.toLocaleString()} icon={<FileText className="h-4 w-4 text-muted-foreground" />} description="All posts created" />
        <StatCard title="Total Likes" value={stats.totalLikes.toLocaleString()} icon={<Heart className="h-4 w-4 text-muted-foreground" />} description="Across all posts and comments" />
        <StatCard title="New Users Today" value={stats.newUsersToday.toLocaleString()} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} description="Users that signed up today" />
      </div>

      <Tabs defaultValue={isAdmin ? "users" : "reports"} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto">
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isAdmin && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          {isAdmin && <TabsTrigger value="appeals">Ban Appeals</TabsTrigger>}
          {isAdmin && <TabsTrigger value="mod-applications">Mod Applications</TabsTrigger>}
          {isAdmin && <TabsTrigger value="maintenance">Maintenance</TabsTrigger>}
          {isAdmin && <TabsTrigger value="seed">Seed Content</TabsTrigger>}
          {!isAdmin && <TabsTrigger value="users-readonly">Users</TabsTrigger>}
        </TabsList>

        {/* Users tab - admin only full control */}
        {isAdmin && (
          <TabsContent value="users" className="space-y-4">
            <UsersTable
              loading={loading}
              users={paginatedUsers}
              filteredUsers={filteredUsers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              onEdit={handleEditClick}
              onDelete={(u) => setUserToDelete(u)}
              onBan={(u) => setUserToBan(u)}
              onWarn={(u) => setUserToWarn(u)}
              isAdmin={true}
            />
          </TabsContent>
        )}

        {/* Users read-only for moderators */}
        <TabsContent value="users-readonly" className="space-y-4">
          {!isAdmin && (
            <UsersTable
              loading={loading}
              users={paginatedUsers}
              filteredUsers={filteredUsers}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              totalPages={totalPages}
              onWarn={(u) => setUserToWarn(u)}
              isAdmin={false}
            />
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="analytics" className="space-y-4">
            <UserActivityChart />
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-4">
          <ReportsTab />
        </TabsContent>

        <TabsContent value="verification" className="space-y-4">
          <VerificationRequestsTab />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="appeals" className="space-y-4">
            <BanAppealsTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="mod-applications" className="space-y-4">
            <ModeratorApplicationsTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="maintenance" className="space-y-4">
            <MaintenanceTab />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="seed" className="space-y-4">
            <AdminSeedContentTab />
          </TabsContent>
        )}
      </Tabs>

      {selectedUser && (
        <EditUserModal user={selectedUser} isOpen={isModalOpen} onClose={handleCloseModal} />
      )}

      {userToBan && (
        <BanUserDialog isOpen={!!userToBan} onClose={() => setUserToBan(null)} userId={userToBan.user_id} username={userToBan.username} isBanned={!!userToBan.is_banned} onSuccess={fetchDashboardData} />
      )}

      {userToWarn && (
        <WarnMuteDialog isOpen={!!userToWarn} onClose={() => setUserToWarn(null)} userId={userToWarn.user_id} username={userToWarn.username} onSuccess={fetchDashboardData} />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user @{userToDelete?.username} and all of their associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">Yes, delete user</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Extracted Users Table component
interface UsersTableProps {
  loading: boolean;
  users: Profile[];
  filteredUsers: Profile[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentPage: number;
  setCurrentPage: (p: number | ((p: number) => number)) => void;
  totalPages: number;
  onEdit?: (u: Profile) => void;
  onDelete?: (u: Profile) => void;
  onBan?: (u: Profile) => void;
  onWarn?: (u: Profile) => void;
  isAdmin: boolean;
}

const UsersTable = ({ loading, users, filteredUsers, searchQuery, setSearchQuery, currentPage, setCurrentPage, totalPages, onEdit, onDelete, onBan, onWarn, isAdmin }: UsersTableProps) => (
  <Card>
    <CardHeader>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>{isAdmin ? 'Manage and view all registered users.' : 'View all registered users (read-only).'}</CardDescription>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8" />
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Avatar</TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Posts</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
              </TableRow>
            ))
            : users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <Link to={`/profile/${user.user_id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 hover:ring-primary transition-all">
                      <AvatarImage src={user.avatar_url || '/assets/NekoPaw-dark.png'} alt={user.username || ''} />
                      <AvatarFallback>{user.username?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                  </Link>
                </TableCell>
                <TableCell className="font-medium">
                  <Link to={`/profile/${user.user_id}`} className="hover:underline">{user.username || "N/A"}</Link>
                </TableCell>
                <TableCell>{user.display_name || "N/A"}</TableCell>
                <TableCell>{user.posts_count}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "destructive" : user.role === "moderator" ? "default" : "outline"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.is_banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : user.is_verified === 'verified' ? (
                    <Badge variant="default">Verified</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      {isAdmin && onEdit && (
                        <DropdownMenuItem onClick={() => onEdit(user)}>Edit Roles</DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild><Link to={`/profile/${user.user_id}`}>View Profile</Link></DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {onWarn && (
                        <DropdownMenuItem onClick={() => onWarn(user)}>
                          <AlertTriangle className="h-4 w-4 mr-2" /> Warn / Mute
                        </DropdownMenuItem>
                      )}
                      {isAdmin && onBan && (
                        <DropdownMenuItem onClick={() => onBan(user)}>
                          {user.is_banned ? (<><ShieldOff className="h-4 w-4 mr-2" /> Unban User</>) : (<><Ban className="h-4 w-4 mr-2" /> Ban User</>)}
                        </DropdownMenuItem>
                      )}
                      {isAdmin && onDelete && (
                        <DropdownMenuItem className="text-red-600" onClick={() => onDelete(user)}>Delete</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} of {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </CardContent>
  </Card>
);

export default AdminPage;
