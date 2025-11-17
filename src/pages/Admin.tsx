import { useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EditUserModal } from "@/components/admin/EditUserModal";
import UserActivityChart from "@/components/admin/UserActivityChart";
import { MaintenanceBannersTab } from "@/pages/MaintenanceBannersTab";
import { ReportsTab } from "@/components/admin/ReportsTab";
import { useMaintenanceTasks, useExecuteMaintenanceTask, useSystemHealth } from "@/hooks/useMaintenanceTasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreHorizontal, Users, FileText, Heart, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { Navigation } from "@/components/layout/Navigation";

// --- INTERFACES ---
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
  created_at: string;
}

// --- HELPER & DUMMY COMPONENTS ---
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

const MaintenanceTab = () => {
  const { data: tasks, isLoading: tasksLoading } = useMaintenanceTasks();
  const { data: health } = useSystemHealth();
  const { mutate: executeTask, isPending } = useExecuteMaintenanceTask();

  return (
    <div className="space-y-4">
      <MaintenanceBannersTab />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Maintenance Actions</CardTitle>
          <CardDescription>Run manual system maintenance tasks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={() => executeTask('clear_cache')}
              disabled={isPending}
              className="justify-start"
            >
              Clear Application Cache
            </Button>
            <Button
              variant="outline"
              onClick={() => executeTask('reindex_search')}
              disabled={isPending}
              className="justify-start"
            >
              Re-index Search Data
            </Button>
            <Button
              variant="outline"
              onClick={() => executeTask('health_check')}
              disabled={isPending}
              className="justify-start"
            >
              Run Health Checks
            </Button>
            <Button
              variant="destructive"
              onClick={() => executeTask('force_stop_jobs')}
              disabled={isPending}
              className="justify-start"
            >
              Force Stop All Jobs
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Health Status */}
      {health && health.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
            <CardDescription>Latest health check results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {health[0].details && Object.entries(health[0].details as Record<string, any>).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium capitalize">{key}</span>
                  <Badge variant={value.status === 'healthy' ? 'default' : 'destructive'}>
                    {value.status}
                  </Badge>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Last checked: {new Date(health[0].checked_at).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Maintenance Tasks</CardTitle>
          <CardDescription>History of executed maintenance tasks</CardDescription>
        </CardHeader>
        <CardContent>
          {tasksLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex-1">
                    <p className="font-medium capitalize">{task.task_type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.executed_at ? new Date(task.executed_at).toLocaleString() : 'Not executed'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      task.status === 'completed' ? 'default' :
                        task.status === 'failed' ? 'destructive' :
                          'secondary'
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No maintenance tasks executed yet
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// --- MAIN COMPONENTS ---
const AdminPage = () => {
  return (
    <div>
      <Navigation />
      <div className="md:pl-72">
        <AdminContent />
      </div>
    </div>
  );
}

const AdminContent = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, totalLikes: 0, newUsersToday: 0 });
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const processAvatarUrl = async (url: string | null) => {
    if (!url || url.startsWith('http')) return url;
    try {
      const { data, error } = await supabase.storage.from('avatars').createSignedUrl(url, 3600);
      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [usersRes, postsCountRes, likesCountRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("posts").select("id", { count: "exact", head: true }),
        supabase.from("likes").select("id", { count: "exact", head: true }),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (postsCountRes.error) throw postsCountRes.error;
      if (likesCountRes.error) throw likesCountRes.error;

      // Process users and their avatars
      const processedUsers = await Promise.all(
        usersRes.data.map(async (user) => {
          const avatar_url = await processAvatarUrl(user.avatar_url);
          return { ...user, avatar_url };
        })
      );

      setUsers(processedUsers as Profile[]);

      // Calculate stats
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleEditClick = (user: Profile) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = (updatedUser?: Profile) => {
    setIsModalOpen(false);
    setSelectedUser(null);
    if (updatedUser) {
      // Optimistically update the local state instead of refetching everything
      setUsers(currentUsers => currentUsers.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    } else {
      fetchDashboardData(); // Fallback to refetch if no updated user is provided
    }
  };

  const handleDeleteClick = (user: Profile) => {
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    const { error } = await supabase.functions.invoke("delete-user", {
      body: { user_id: userToDelete.user_id },
    });

    if (error) {
      console.error("Error deleting user:", error);
      toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
    } else {
      toast({ title: "Success", description: `User @${userToDelete.username} has been deleted.` });
      fetchDashboardData(); // Refresh the user list and stats
    }
    setUserToDelete(null);
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Users" value={stats.totalUsers.toLocaleString()} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="All registered users" />
        <StatCard title="Total Posts" value={stats.totalPosts.toLocaleString()} icon={<FileText className="h-4 w-4 text-muted-foreground" />} description="All posts created" />
        <StatCard title="Total Likes" value={stats.totalLikes.toLocaleString()} icon={<Heart className="h-4 w-4 text-muted-foreground" />} description="Across all posts and comments" />
        <StatCard title="New Users Today" value={stats.newUsersToday.toLocaleString()} icon={<UserPlus className="h-4 w-4 text-muted-foreground" />} description="Users that signed up today" />
      </div>
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Accounts</CardTitle>
              <CardDescription>Manage and view all registered users.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading
                    ? Array.from({ length: 8 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                    : users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <img src={user.avatar_url || 'https://avatar.vercel.sh/' + user.username} alt={user.username} className="h-10 w-10 rounded-full object-cover" />
                        </TableCell>
                        <TableCell className="font-medium">{user.username || "N/A"}</TableCell>
                        <TableCell>{user.display_name || "N/A"}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "destructive" : "outline"}>
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.is_verified === 'verified' ? "Yes" : "No"}</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleEditClick(user)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { /* TODO: Impersonate */ }}>Impersonate</DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(user)}>Delete</DropdownMenuItem>

                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="analytics" className="space-y-4">
          <UserActivityChart />
        </TabsContent>
        
        <TabsContent value="reports" className="space-y-4">
          <ReportsTab />
        </TabsContent>
        
        <TabsContent value="maintenance" className="space-y-4">
          <MaintenanceTab />
        </TabsContent>
      </Tabs>
      {selectedUser && (
        <EditUserModal user={selectedUser} isOpen={isModalOpen} onClose={handleCloseModal} />
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

export default AdminPage;
