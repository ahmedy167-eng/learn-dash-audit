import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPermissionsDialog } from '@/components/admin/UserPermissionsDialog';
import { UserDetailsDialog } from '@/components/admin/UserDetailsDialog';
import { OnlineUsersPanel } from '@/components/admin/OnlineUsersPanel';
import { ActivityFeed } from '@/components/admin/ActivityFeed';
import { MessageInbox } from '@/components/admin/MessageInbox';
import { SessionAnalytics } from '@/components/admin/SessionAnalytics';
import { StudentManagement } from '@/components/admin/StudentManagement';
import { RefreshCw, Shield, Users, Settings, Eye, GraduationCap, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'user';
  sectionsCount: number;
  studentsCount: number;
  auditsCount: number;
}

export default function Admin() {
  const { isAdmin, loading: permLoading } = usePermissions();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [permDialogOpen, setPermDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [studentCount, setStudentCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles, roles, and counts in parallel
      const [profilesRes, rolesRes, sectionsRes, studentsRes, auditsRes, messagesRes] = await Promise.all([
        supabase.from('profiles').select('user_id, email, full_name'),
        supabase.from('user_roles').select('user_id, role'),
        supabase.from('sections').select('user_id'),
        supabase.from('students').select('user_id'),
        supabase.from('virtual_audits').select('user_id'),
        supabase.from('messages').select('id').eq('recipient_type', 'admin').eq('is_read', false),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      // Count records per user
      const sectionCounts = (sectionsRes.data || []).reduce((acc, s) => {
        acc[s.user_id] = (acc[s.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const studentCounts = (studentsRes.data || []).reduce((acc, s) => {
        acc[s.user_id] = (acc[s.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const auditCounts = (auditsRes.data || []).reduce((acc, a) => {
        acc[a.user_id] = (acc[a.user_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Combine data
      const usersWithRoles: UserWithRole[] = (profilesRes.data || []).map(profile => {
        const userRole = rolesRes.data?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.user_id,
          email: profile.email || '',
          full_name: profile.full_name,
          role: (userRole?.role as 'admin' | 'user') || 'user',
          sectionsCount: sectionCounts[profile.user_id] || 0,
          studentsCount: studentCounts[profile.user_id] || 0,
          auditsCount: auditCounts[profile.user_id] || 0,
        };
      });

      setUsers(usersWithRoles);
      setStudentCount(studentsRes.data?.length || 0);
      setUnreadMessages(messagesRes.data?.length || 0);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const handleEditUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setPermDialogOpen(true);
  };

  const handleViewUser = (user: UserWithRole) => {
    setSelectedUser(user);
    setDetailsDialogOpen(true);
  };

  // Redirect non-admins
  if (!permLoading && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Monitor activity, manage users, and view analytics</p>
          </div>
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Administrators</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {users.filter(u => u.role === 'user').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{studentCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unreadMessages}</div>
            </CardContent>
          </Card>
        </div>

        {/* Activity & Analytics Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          <OnlineUsersPanel />
          <ActivityFeed />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <MessageInbox />
          <SessionAnalytics />
        </div>

        {/* Student Management */}
        <StudentManagement />

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              View and manage user permissions. Click Edit to modify a user's access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-center">Sections</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Audits</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading users...
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.full_name || 'No name'}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{user.sectionsCount}</TableCell>
                      <TableCell className="text-center">{user.studentsCount}</TableCell>
                      <TableCell className="text-center">{user.auditsCount}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <UserPermissionsDialog
        user={selectedUser}
        open={permDialogOpen}
        onOpenChange={setPermDialogOpen}
        onUpdate={fetchUsers}
      />

      <UserDetailsDialog
        user={selectedUser}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
      />
    </DashboardLayout>
  );
}
