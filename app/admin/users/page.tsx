"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
  Search,
  Edit,
  Trash2,
  UserPlus,
  Shield,
  Factory,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  type MembershipLevel,
  normalizeMembershipLevel,
} from "@/lib/membership/points-engine";

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
    if (roles.includes("user")) badges.push(<Badge key="user" variant="secondary" className="mr-1 bg-gray-100 text-gray-800 dark:bg-zinc-700 dark:text-zinc-200"><UserPlus className="w-3 h-3 mr-1" />User</Badge>);
    if (roles.includes("admin")) badges.push(<Badge key="admin" variant="default" className="bg-red-600 dark:bg-red-700 mr-1"><Shield className="w-3 h-3 mr-1" />Admin</Badge>);
    if (roles.includes("producer")) badges.push(<Badge key="producer" variant="default" className="bg-emerald-600 dark:bg-emerald-700 mr-1"><Factory className="w-3 h-3 mr-1" />Producer</Badge>);
    if (portalAccess.includes("business")) badges.push(<Badge key="business" variant="outline" className="mr-1 border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">Business</Badge>);
    if (badges.length === 0) badges.push(<Badge key="none" variant="outline" className="border-gray-300 dark:border-zinc-600 text-gray-900 dark:text-white">User</Badge>);
    return <span className="flex flex-wrap gap-1">{badges}</span>;
  };

  const getMembershipBadge = (level: string) => {
    const m = normalizeMembershipLevel(level);
    const colors: Record<MembershipLevel, string> = {
      requester: "bg-gray-300 dark:bg-zinc-700 text-gray-700 dark:text-zinc-200",
      privilege: "bg-[#2F0E15] dark:bg-rose-900/80 text-white",
      guld: "bg-[#E4CAA0] dark:bg-amber-900/50 text-gray-900 dark:text-amber-100",
      silver: "bg-emerald-800 dark:bg-emerald-700 text-white",
      brons: "bg-indigo-700 dark:bg-indigo-600 text-white",
      basic: "bg-slate-600 dark:bg-slate-600 text-white",
    };

    const labels: Record<MembershipLevel, string> = {
      requester: "Requester",
      privilege: "Privilege",
      guld: "Priority",
      silver: "Premium",
      brons: "Plus",
      basic: "Basic",
    };

    return (
      <Badge className={colors[m] ?? colors.basic}>
        {labels[m] ?? m}
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
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-300 dark:border-zinc-600 border-t-gray-900 dark:border-t-white" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Single card – same structure as /admin dashboard (e.g. Platform overview) */}
      <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 flex flex-col border border-gray-200 dark:border-[#1F1F23]">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 text-left flex items-center gap-2">
          <Users className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-50" />
          Users
        </h2>
        <div className="flex-1">
          {/* Inner box: filters – same style as dashboard inner boxes */}
          <div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl mb-4">
            <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
              <p className="text-xs text-gray-600 dark:text-zinc-400">
                Search and filter
              </p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50">
                {filteredUsers.length === users.length
                  ? `${users.length} user${users.length !== 1 ? "s" : ""}`
                  : `${filteredUsers.length} of ${users.length} users`}
              </p>
            </div>
            <div className="p-4 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <Label htmlFor="search" className="text-xs font-medium text-gray-900 dark:text-zinc-100 mb-1.5 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-zinc-400 h-4 w-4" />
                  <Input
                    id="search"
                    placeholder="By email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-9 text-sm bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>
              <div className="w-44">
                <Label htmlFor="role" className="text-xs font-medium text-gray-900 dark:text-zinc-100 mb-1.5 block">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="h-9 w-full min-w-0 text-sm border-gray-200 dark:border-zinc-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[200]" sideOffset={4}>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="producer">Producer</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* User list – same inner-box style as Recent Bookings list */}
<div className="w-full bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl">
          <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              User list
                <span className="text-xs font-normal text-gray-500 dark:text-zinc-400 ml-1">
                  ({filteredUsers.length} shown)
                </span>
              </h3>
            </div>
            <div className="p-2">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-200 dark:border-zinc-800 hover:bg-transparent dark:hover:bg-transparent">
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("email")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    User
                    {getSortIcon("email")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("role")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Role
                    {getSortIcon("role")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("membership")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Membership
                    {getSortIcon("membership")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("impact_points")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Impact Points
                    {getSortIcon("impact_points")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("invites")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Invites
                    {getSortIcon("invites")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("joined")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Joined
                    {getSortIcon("joined")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">
                  <button
                    onClick={() => handleSort("last_active")}
                    className="flex items-center hover:text-gray-900 dark:hover:text-zinc-100 transition-colors"
                  >
                    Last Active
                    {getSortIcon("last_active")}
                  </button>
                </TableHead>
                <TableHead className="text-gray-900 dark:text-zinc-100 font-medium text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow
                  key={user.id}
                  onClick={() => router.push(`/admin/users/${user.id}`)}
                  className="cursor-pointer border-gray-200 dark:border-zinc-800 transition-colors [&:hover]:bg-gray-100 dark:[&:hover]:bg-zinc-800/50"
                >
                  <TableCell className="text-gray-900 dark:text-zinc-100">
                    <div className="font-medium text-sm">{user.email}</div>
                    <div className="text-xs text-gray-500 dark:text-zinc-400">
                      {user.email_confirmed_at
                        ? "Email confirmed"
                        : "Email not confirmed"}
                    </div>
                  </TableCell>
                  <TableCell>{getRoleBadges(user)}</TableCell>
                  <TableCell>
                    {getMembershipBadge(user.membership_level)}
                  </TableCell>
                  <TableCell className="text-gray-900 dark:text-zinc-100 text-sm">
                    <span className="font-semibold">{user.impact_points}</span>
                    <span className="text-gray-500 dark:text-zinc-400 text-xs"> IP</span>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-zinc-300 text-xs">
                    <span>
                      {user.invites_used} / {user.invite_quota}
                    </span>
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-zinc-300 text-xs">
                    <div>
                      {new Date(user.created_at).toLocaleDateString()}
                    </div>
                    {user.last_sign_in_at && (
                      <div className="text-xs text-gray-500 dark:text-zinc-400">
                        Last login:{" "}
                        {new Date(user.last_sign_in_at).toLocaleDateString()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-zinc-300 text-xs">
                    {user.last_active_at ? (
                      <div>
                        {new Date(user.last_active_at).toLocaleString()}
                      </div>
                    ) : (
                      <div className="text-gray-400 dark:text-zinc-500">—</div>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                        className="h-8 rounded-lg border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-800 shadow-none hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-600 dark:bg-zinc-800/90 dark:text-zinc-100 dark:hover:border-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-white [&_svg]:!size-3.5"
                      >
                        <Edit className="mr-1" />
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg border-red-200/90 bg-white px-2.5 text-xs font-medium text-red-700 shadow-none hover:border-red-300 hover:bg-red-50 hover:text-red-800 dark:border-red-900/60 dark:bg-zinc-800/90 dark:text-red-400 dark:hover:border-red-800 dark:hover:bg-red-950/45 dark:hover:text-red-300 [&_svg]:!size-3.5"
                          >
                            <Trash2 className="mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-gray-200 bg-white text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-gray-900 dark:text-zinc-50">
                              Delete User
                            </AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
                              Are you sure you want to delete {user.email}? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="gap-2 sm:gap-2">
                            <AlertDialogCancel className="mt-0 rounded-lg border-gray-200 bg-white font-medium text-gray-800 hover:bg-gray-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser(user.id)}
                              className="rounded-lg bg-red-600 font-medium text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
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
            </div>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-gray-500 dark:text-zinc-400 text-sm">
                No users found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="border-gray-200 bg-white text-gray-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-zinc-50">
              Edit User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email</Label>
              <Input
                id="email"
                value={selectedUser?.email || ""}
                disabled
                className="bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 mt-1"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-gray-700 dark:text-gray-300">User types</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
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
                <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
                  <Checkbox
                    checked={editForm.roles.includes("admin")}
                    onCheckedChange={(checked) => {
                      const next = checked ? [...new Set([...editForm.roles, "admin"])] : editForm.roles.filter((r) => r !== "admin");
                      setEditForm({ ...editForm, roles: next.length ? next : ["user"] });
                    }}
                  />
                  <span>Admin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
                  <Checkbox
                    checked={editForm.roles.includes("producer")}
                    onCheckedChange={(checked) => {
                      const next = checked ? [...new Set([...editForm.roles, "producer"])] : editForm.roles.filter((r) => r !== "producer");
                      setEditForm({ ...editForm, roles: next.length ? next : ["user"], producer_id: checked ? editForm.producer_id : null });
                    }}
                  />
                  <span>Producer</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-900 dark:text-white">
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
              <p className="text-xs text-gray-500 dark:text-gray-400">User = B2C (pactwines.com). Business = B2B (dirtywine.se).</p>
            </div>
            {editForm.roles.includes("producer") && (
              <div className="space-y-2">
                <Label htmlFor="producer_id" className="text-gray-700 dark:text-gray-300">Linked Producer</Label>
                <Select
                  value={editForm.producer_id || "__none__"}
                  onValueChange={(value) =>
                    setEditForm({
                      ...editForm,
                      producer_id: value === "__none__" ? null : value,
                    })
                  }
                >
                  <SelectTrigger className="mt-1 w-full border-gray-200 dark:border-zinc-600">
                    <SelectValue placeholder="Select producer" />
                  </SelectTrigger>
                  <SelectContent className="z-[300]">
                    <SelectItem value="__none__">No producer linked</SelectItem>
                    {producers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Producer accounts must be linked to a producer to manage wines
                  and producer information.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="membership_level" className="text-gray-700 dark:text-gray-300">Membership Level</Label>
              <Select
                value={editForm.membership_level}
                onValueChange={(value) =>
                  setEditForm({ ...editForm, membership_level: value })
                }
              >
                <SelectTrigger className="mt-1 w-full border-gray-200 dark:border-zinc-600">
                  <SelectValue placeholder="Select membership level" />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  <SelectItem value="requester">
                    Requester (No Access)
                  </SelectItem>
                  <SelectItem value="basic">Basic (2 invites/month)</SelectItem>
                  <SelectItem value="brons">Plus (5 invites/month)</SelectItem>
                  <SelectItem value="silver">Premium (12 invites/month)</SelectItem>
                  <SelectItem value="guld">Priority (50 invites/month)</SelectItem>
                  <SelectItem value="privilege">Privilege (100 invites/month)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Requester = No platform access. Basic and above = Full access.
                Staff admin is set under User types (Admin), not membership level.
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1 rounded-lg border-gray-200 bg-white font-medium text-gray-800 hover:bg-gray-50 hover:text-gray-900 dark:border-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                className="flex-1 rounded-lg bg-zinc-900 font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
