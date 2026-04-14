"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminUser {
  id: string;
  email: string;
  username: string;
  role: string;
  subscriptionTier: string;
  isBanned: boolean;
  createdAt: string;
  subscriptionStatus: string | null;
}

interface UsersResponse {
  users: AdminUser[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

interface PlayHistoryEntry {
  id: string;
  gameId: string;
  playedAt: string;
  durationSeconds: number | null;
}

interface UserDetail {
  user: AdminUser;
  playHistory?: PlayHistoryEntry[];
}

async function fetchUsers(params: URLSearchParams): Promise<UsersResponse> {
  const res = await fetch(`/api/admin/users?${params}`);
  if (!res.ok) throw new Error("Failed to fetch users");
  return res.json();
}

async function fetchUserDetail(id: string): Promise<UserDetail> {
  const res = await fetch(`/api/admin/users/${id}`);
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

async function patchUser(id: string, data: { isBanned?: boolean; role?: string }) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update user");
  return res.json();
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const buildParams = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) p.set("search", search);
    if (roleFilter !== "all") p.set("role", roleFilter);
    if (subFilter !== "all") p.set("subscriptionStatus", subFilter);
    return p;
  }, [page, search, roleFilter, subFilter]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", page, search, roleFilter, subFilter],
    queryFn: () => fetchUsers(buildParams()),
  });

  const { data: userDetail } = useQuery({
    queryKey: ["admin-user-detail", selectedUserId],
    queryFn: () => fetchUserDetail(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { isBanned?: boolean; role?: string } }) =>
      patchUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const handleBanToggle = (user: AdminUser) => {
    mutation.mutate({ id: user.id, data: { isBanned: !user.isBanned } });
  };

  const handleRoleChange = (userId: string, role: string) => {
    mutation.mutate({ id: userId, data: { role } });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">Manage registered users, roles, and bans.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by email or username..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={subFilter} onValueChange={(v) => { setSubFilter(v); setPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Subscription" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Subscriptions</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="past_due">Past Due</SelectItem>
            <SelectItem value="canceled">Canceled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : data?.users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.subscriptionTier === "pro" ? "default" : "outline"}>
                        {user.subscriptionTier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.isBanned ? (
                        <Badge variant="destructive">Banned</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isBanned ? "outline" : "destructive"}
                          onClick={() => handleBanToggle(user)}
                          disabled={mutation.isPending}
                        >
                          {user.isBanned ? "Unban" : "Ban"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.pagination.total)} of{" "}
            {data.pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= data.pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Drawer */}
      <Dialog open={!!selectedUserId} onOpenChange={(open) => !open && setSelectedUserId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {userDetail?.user && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Username</p>
                  <p className="font-medium">{userDetail.user.username}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{userDetail.user.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Role</p>
                  <Badge variant={userDetail.user.role === "admin" ? "default" : "secondary"}>
                    {userDetail.user.role}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Subscription</p>
                  <Badge variant={userDetail.user.subscriptionTier === "pro" ? "default" : "outline"}>
                    {userDetail.user.subscriptionTier}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {userDetail.user.isBanned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">Registered</p>
                  <p>{new Date(userDetail.user.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Change Role</p>
                <Select
                  value={userDetail.user.role}
                  onValueChange={(v) => handleRoleChange(userDetail.user.id, v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant={userDetail.user.isBanned ? "outline" : "destructive"}
                  onClick={() => handleBanToggle(userDetail.user)}
                  disabled={mutation.isPending}
                  className="flex-1"
                >
                  {userDetail.user.isBanned ? "Unban User" : "Ban User"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
