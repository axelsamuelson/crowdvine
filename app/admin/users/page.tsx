"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Factory,
  Mail,
  Key,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  roles?: string[];
  portal_access?: string[];
  producer_id?: string | null;
  membership_level: string;
  impact_points: number;
  invite_quota: number;
  invites_used: number;
  created_at: string;
  membership_created_at?: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  last_active_at?: string | null;
}

interface EditForm {
  roles: string[];
  portal_access: string[];
  membership_level: string;
  producer_id?: string | null;
}

interface Producer {
  id: string;
  name: string;
  region?: string;
}

export default function UsersAdmin() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditForm>({
    roles: ["user"],
    portal_access: ["user"],
    membership_level: "",
    producer_id: null,
  });
  const [producers, setProducers] = useState<Producer[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    fetchUsers();
    fetchProducers();
  }, []);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-4 h-4 ml-1" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1" />
    );
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: EditForm) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          updates: {
            roles: updates.roles,
            portal_access: updates.portal_access,
            producer_id: updates.producer_id,
            membership_level: updates.membership_level,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update user");
      }

      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update user";
      toast.error(`Failed to update user: ${errorMessage}`);
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete user");
      }

      const responseData = await response.json();

      if (responseData.warning) {
        toast.warning(responseData.message, {
          description: responseData.warning,
        });
      } else {
        toast.success(responseData.message || "User deleted successfully");
      }

      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete user";
      toast.error(`Failed to delete user: ${errorMessage}`);
    }
  };

  const fetchProducers = async () => {
    try {
      const response = await fetch("/api/admin/producers");
      if (!response.ok) {
        // Don't block Users UI if producers fetch fails
        return;
      }
      const data = await response.json();
      setProducers(data?.producers || []);
    } catch {
      // ignore
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    const roles = user.roles?.length ? user.roles : [user.role || "user"];
    const portalAccess = user.portal_access?.length ? user.portal_access : ["user"];
    setEditForm({
      roles: [...roles],
      portal_access: [...portalAccess],
      membership_level: user.membership_level || "basic",
      producer_id: user.producer_id || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = () => {
    if (!selectedUser) return;
    updateUser(selectedUser.id, editForm);
  };

  const getRoleBadges = (user: User) => {
    const roles = user.roles?.length ? user.roles : [user.role || "user"];
    const portalAccess = user.portal_access || ["user"];
    const badges: React.ReactNode[] = [];
    if (roles.includes("user")) badges.push(<Badge key="user" variant="secondary" className="mr-1"><UserPlus className="w-3 h-3 mr-1" />User</Badge>);
    if (roles.includes("admin")) badges.push(<Badge key="admin" variant="default" className="bg-red-600 mr-1"><Shield className="w-3 h-3 mr-1" />Admin</Badge>);
    if (roles.includes("producer")) badges.push(<Badge key="producer" variant="default" className="bg-emerald-600 mr-1"><Factory className="w-3 h-3 mr-1" />Producer</Badge>);
    if (portalAccess.includes("business")) badges.push(<Badge key="business" variant="outline" className="mr-1">Business</Badge>);
    if (badges.length === 0) badges.push(<Badge key="none" variant="outline">User</Badge>);
    return <span className="flex flex-wrap gap-1">{badges}</span>;
  };

  const getMembershipBadge = (level: string) => {
    const colors = {
      admin: "bg-purple-600 text-white",
      privilege: "bg-[#2F0E15] text-white",
      guld: "bg-[#E4CAA0] text-gray-900",
      silver: "bg-emerald-800 text-white",
      brons: "bg-indigo-700 text-white",
      basic: "bg-slate-600 text-white",
      requester: "bg-gray-300 text-gray-700",
    };

    const labels = {
      admin: "Admin",
      privilege: "Privilege",
      guld: "Priority",
      silver: "Premium",
      brons: "Plus",
      basic: "Basic",
      requester: "Requester",
    };

    return (
      <Badge className={colors[level as keyof typeof colors] || colors.basic}>
        {labels[level as keyof typeof labels] || level}
      </Badge>
    );
  };

  const filteredUsers = users
    .filter((user) => {
      const matchesSearch =
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.full_name &&
          user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
      const roles = user.roles?.length ? user.roles : [user.role || "user"];
      const portalAccess = user.portal_access || ["user"];
      const matchesRole = roleFilter === "all" || roles.includes(roleFilter) || (roleFilter === "business" && portalAccess.includes("business"));
      return matchesSearch && matchesRole;
    })
    .sort((a, b) => {
      if (!sortColumn) return 0;

      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "email":
          aValue = a.email.toLowerCase();
          bValue = b.email.toLowerCase();
          break;
        case "role": {
          const aRoles = a.roles?.length ? a.roles : [a.role || "user"];
          const bRoles = b.roles?.length ? b.roles : [b.role || "user"];
          aValue = aRoles.join(",").toLowerCase();
          bValue = bRoles.join(",").toLowerCase();
          break;
        }
        case "membership":
          aValue = a.membership_level.toLowerCase();
          bValue = b.membership_level.toLowerCase();
          break;
        case "impact_points":
          aValue = a.impact_points;
          bValue = b.impact_points;
          break;
        case "invites":
          aValue = a.invites_used;
          bValue = b.invites_used;
          break;
        case "joined":
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case "last_active":
          aValue = a.last_active_at
            ? new Date(a.last_active_at).getTime()
            : 0;
          bValue = b.last_active_at
            ? new Date(b.last_active_at).getTime()
            : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Users Management</h1>
        <p className="text-gray-600 mt-2">
          Manage platform users and their access permissions
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  id="search"
                  placeholder="Search by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="role">Role</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="producer">Producer</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button
                    onClick={() => handleSort("email")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    User
                    {getSortIcon("email")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("role")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Role
                    {getSortIcon("role")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("membership")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Membership
                    {getSortIcon("membership")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("impact_points")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Impact Points
                    {getSortIcon("impact_points")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("invites")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Invites
                    {getSortIcon("invites")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("joined")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Joined
                    {getSortIcon("joined")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    onClick={() => handleSort("last_active")}
                    className="flex items-center hover:text-gray-900 transition-colors"
                  >
                    Last Active
                    {getSortIcon("last_active")}
                  </button>
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <TableCell>
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-gray-500">
                      {user.email_confirmed_at
                        ? "Email confirmed"
                        : "Email not confirmed"}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadges(user)}</TableCell>
                  <TableCell>
                    {getMembershipBadge(user.membership_level)}
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-gray-900">
                      {user.impact_points}
                    </span>
                    <span className="text-gray-500 text-sm"> IP</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-700">
                      {user.invites_used} / {user.invite_quota}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    {user.last_sign_in_at && (
                      <div className="text-xs text-gray-500">
                        Last login:{" "}
                        {new Date(user.last_sign_in_at).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.last_active_at ? (
                      <div className="text-sm">
                        {new Date(user.last_active_at).toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">—</div>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive">
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete {user.email}? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No users found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={selectedUser?.email || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div className="space-y-3">
              <Label>User types</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editForm.roles.includes("user")}
                    onCheckedChange={(checked) => {
                      const nextRoles = checked ? [...new Set([...editForm.roles, "user"])] : editForm.roles.filter((r) => r !== "user");
                      const nextPortal = checked ? [...new Set([...editForm.portal_access, "user"])] : editForm.portal_access.filter((p) => p !== "user");
                      setEditForm({ ...editForm, roles: nextRoles.length ? nextRoles : ["user"], portal_access: nextPortal.length ? nextPortal : ["user"] });
                    }}
                  />
                  <span>User</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editForm.roles.includes("admin")}
                    onCheckedChange={(checked) => {
                      const next = checked ? [...new Set([...editForm.roles, "admin"])] : editForm.roles.filter((r) => r !== "admin");
                      setEditForm({ ...editForm, roles: next.length ? next : ["user"] });
                    }}
                  />
                  <span>Admin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editForm.roles.includes("producer")}
                    onCheckedChange={(checked) => {
                      const next = checked ? [...new Set([...editForm.roles, "producer"])] : editForm.roles.filter((r) => r !== "producer");
                      setEditForm({ ...editForm, roles: next.length ? next : ["user"], producer_id: checked ? editForm.producer_id : null });
                    }}
                  />
                  <span>Producer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editForm.portal_access.includes("business")}
                    onCheckedChange={(checked) => {
                      const next = checked ? [...new Set([...editForm.portal_access, "business"])] : editForm.portal_access.filter((p) => p !== "business");
                      setEditForm({ ...editForm, portal_access: next.length ? next : ["user"] });
                    }}
                  />
                  <span>Business</span>
                </label>
              </div>
              <p className="text-xs text-gray-500">User = B2C (pactwines.com). Business = B2B (dirtywine.se).</p>
            </div>
            {editForm.roles.includes("producer") && (
              <div className="space-y-2">
                <Label htmlFor="producer_id">Linked Producer</Label>
                <Select
                  value={editForm.producer_id || "__none__"}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      producer_id: value === "__none__" ? null : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select producer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No producer linked</SelectItem>
                    {producers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Producer accounts must be linked to a producer to manage wines
                  and producer information.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="membership_level">Membership Level</Label>
              <Select
                value={editForm.membership_level}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, membership_level: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select membership level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requester">
                    Requester (No Access)
                  </SelectItem>
                  <SelectItem value="basic">Basic (2 invites/month)</SelectItem>
                  <SelectItem value="brons">Plus (5 invites/month)</SelectItem>
                  <SelectItem value="silver">Premium (12 invites/month)</SelectItem>
                  <SelectItem value="guld">Priority (50 invites/month)</SelectItem>
                  <SelectItem value="privilege">Privilege (100 invites/month)</SelectItem>
                  <SelectItem value="admin">Admin (Unlimited)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Requester = No platform access. Basic and above = Full access.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button onClick={handleEditSubmit} className="flex-1">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
