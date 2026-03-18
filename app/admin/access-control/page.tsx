"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Plus, Copy, Trash2, Link2, Shield } from "lucide-react";
import { toast } from "sonner";
import { buildInviteUrl } from "@/lib/invitation-path";

interface AccessRequest {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

interface InvitationCode {
  id: string;
  code: string;
  email?: string;
  name?: string;
  created_by: string;
  used_at?: string;
  used_by?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  invitation_type?: "consumer" | "producer" | "business";
  allowed_types?: string[];
  can_change_account_type?: boolean;
  initial_level?: string;
}

export default function AccessControlAdmin() {
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCodeEmail, setNewCodeEmail] = useState("");
  const [newCodeName, setNewCodeName] = useState("");
  const [newCodeExpiry, setNewCodeExpiry] = useState("30");
  const [newCodeTypes, setNewCodeTypes] = useState<Set<"consumer" | "producer" | "business">>(new Set(["consumer"]));
  const [newCodeCanChange, setNewCodeCanChange] = useState(false);
  const [newCodeLevel, setNewCodeLevel] = useState("basic");
  const [selectedLevels, setSelectedLevels] = useState<{
    [key: string]: string;
  }>({});

  useEffect(() => {
    fetchAccessRequests();
    fetchInvitationCodes();
  }, []);

  const fetchAccessRequests = async () => {
    try {
      const response = await fetch("/api/admin/access-requests");
      if (!response.ok) {
        throw new Error("Failed to fetch access requests");
      }
      const data = await response.json();
      setAccessRequests(data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching access requests:", error);
      toast.error("Failed to fetch access requests");
      setLoading(false);
    }
  };

  const fetchInvitationCodes = async () => {
    try {
      const response = await fetch("/api/admin/invitation-codes");
      if (!response.ok) {
        throw new Error("Failed to fetch invitation codes");
      }
      const data = await response.json();
      setInvitationCodes(data);
    } catch (error) {
      console.error("Error fetching invitation codes:", error);
      toast.error("Failed to fetch invitation codes");
    }
  };

  const updateAccessRequest = async (
    id: string,
    status: "approved" | "rejected",
    initialLevel?: string,
    notes?: string,
  ) => {
    try {
      // Use the new simple API for updating access request status
      const response = await fetch("/api/admin/update-access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, status, initialLevel }),
      });

      if (!response.ok) {
        throw new Error("Failed to update access request");
      }

      const result = await response.json();
      if (result.success) {
        // If approved, also send approval email
        if (status === "approved") {
          try {
            // Get the email from the access request
            const accessRequest = accessRequests.find((req) => req.id === id);
            if (accessRequest) {
              const emailResponse = await fetch(
                "/api/admin/send-approval-email",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ email: accessRequest.email }),
                },
              );

              if (emailResponse.ok) {
                const emailResult = await emailResponse.json();
                if (emailResult.success) {
                  toast.success(
                    `Access request approved and email sent to ${accessRequest.email}`,
                  );
                } else {
                  toast.error(
                    `Access request approved, but email failed to send: ${emailResult.error || "Unknown error"}`,
                  );
                }
              } else {
                const errorData = await emailResponse
                  .json()
                  .catch(() => ({ error: "Network error" }));
                toast.error(
                  `Access request approved, but email failed to send: ${errorData.error || "Unknown error"}`,
                );
              }
            }
          } catch (emailError) {
            console.error("Error sending approval email:", emailError);
            toast.error(
              `Access request approved, but email failed to send: ${emailError instanceof Error ? emailError.message : "Unknown error"}`,
            );
          }
        } else {
          toast.success(`Access request ${status}`);
        }

        // Refresh the list
        fetchAccessRequests();
      } else {
        throw new Error(result.error || "Failed to update access request");
      }
    } catch (error) {
      console.error("Error updating access request:", error);
      toast.error("Failed to update access request");
    }
  };

  const deleteAccessRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/access-requests?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));

        // Provide specific error messages based on status code
        if (response.status === 401) {
          toast.error("Authentication required. Please log in as admin first.");
          // Redirect to admin login
          setTimeout(() => {
            window.location.href = "/admin-auth/login";
          }, 2000);
          return;
        } else if (response.status === 403) {
          toast.error(
            "Admin access required. You don't have permission to delete access requests.",
          );
          return;
        } else if (response.status === 404) {
          toast.error(
            "Access request not found. It may have already been deleted.",
          );
          // Refresh the list to update UI
          fetchAccessRequests();
          return;
        } else {
          throw new Error(
            errorData.error || `Server error (${response.status})`,
          );
        }
      }

      const result = await response.json();
      if (result.success) {
        // Show detailed success message
        const deleted = result.deleted;
        let message = `Access request deleted successfully!`;

        if (
          deleted.accessTokens > 0 ||
          deleted.invitationCodes > 0 ||
          deleted.authUser > 0
        ) {
          message += ` Also cleaned up:`;
          const cleanupItems = [];
          if (deleted.accessTokens > 0)
            cleanupItems.push(`${deleted.accessTokens} access token(s)`);
          if (deleted.invitationCodes > 0)
            cleanupItems.push(`${deleted.invitationCodes} invitation code(s)`);
          if (deleted.authUser > 0) cleanupItems.push(`1 orphaned auth user`);

          message += ` ${cleanupItems.join(", ")}.`;
        }

        toast.success(message);

        // Refresh the list
        fetchAccessRequests();
      } else {
        throw new Error(result.error || "Failed to delete access request");
      }
    } catch (error) {
      console.error("Error deleting access request:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to delete access request: ${errorMessage}`);
    }
  };

  const createInvitationCode = async () => {
    try {
      const response = await fetch("/api/admin/invitation-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newCodeEmail || null,
          name: newCodeName || null,
          expiryDays: parseInt(newCodeExpiry),
          allowedTypes: Array.from(newCodeTypes),
          canChangeAccountType: newCodeCanChange,
          initialLevel: newCodeLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Network error" }));
        const msg = errorData.details
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || "Failed to create invitation code";
        throw new Error(msg);
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Invitation code created successfully");
        setNewCodeEmail("");
        setNewCodeName("");
        setNewCodeExpiry("30");
        setNewCodeTypes(new Set(["consumer"]));
        setNewCodeCanChange(false);
        setNewCodeLevel("basic");
        // Refresh the list
        fetchInvitationCodes();
      } else {
        throw new Error(result.error || "Failed to create invitation code");
      }
    } catch (error) {
      console.error("Error creating invitation code:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      toast.error(`Failed to create invitation code: ${errorMessage}`);
    }
  };

  const copyToClipboard = (text: string, message?: string) => {
    navigator.clipboard.writeText(text);
    toast.success(message ?? "Copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case "approved":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0B] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-gray-200 dark:border-zinc-700 border-t-gray-900 dark:border-t-zinc-100" />
          <p className="mt-4 text-sm text-gray-600 dark:text-zinc-400">Loading access control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0A0A0B] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
            <Shield className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Control</h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-0.5">
              Manage platform access requests and invitation codes
            </p>
          </div>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1 grid w-full grid-cols-2">
            <TabsTrigger
              value="requests"
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
            >
              Access Requests
            </TabsTrigger>
            <TabsTrigger
              value="codes"
              className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
            >
              Invitation Codes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6 mt-6">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Pending Access Requests</h2>
              <div className="space-y-4">
                {accessRequests
                  .filter((req) => req.status === "pending")
                  .map((request) => (
                    <div
                      key={request.id}
                      className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 space-y-3 bg-gray-50 dark:bg-zinc-900/70"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-900 dark:text-zinc-100 truncate">{request.email}</p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-shrink-0">{getStatusBadge(request.status)}</div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <Label
                          htmlFor={`level-${request.id}`}
                          className="text-xs font-medium text-gray-700 dark:text-zinc-300"
                        >
                          Initial Membership Level
                        </Label>
                        <Select
                          value={selectedLevels[request.id] || "basic"}
                          onValueChange={(value) =>
                            setSelectedLevels({ ...selectedLevels, [request.id]: value })
                          }
                        >
                          <SelectTrigger
                            id={`level-${request.id}`}
                            className="w-full text-xs border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                          >
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="brons">Plus</SelectItem>
                            <SelectItem value="silver">Premium</SelectItem>
                            <SelectItem value="guld">Priority</SelectItem>
                            <SelectItem value="privilege">Privilege</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={() =>
                            updateAccessRequest(
                              request.id,
                              "approved",
                              selectedLevels[request.id] || "basic",
                            )
                          }
                          className="rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex-1 sm:flex-initial"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateAccessRequest(request.id, "rejected")}
                          className="rounded-lg text-xs font-medium flex-1 sm:flex-initial"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAccessRequest(request.id)}
                          className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex-1 sm:flex-initial"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                {accessRequests.filter((req) => req.status === "pending").length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-zinc-400 py-8">
                    No pending access requests
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">All Access Requests</h2>
              <div className="space-y-3">
                {accessRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-zinc-100 truncate">{request.email}</p>
                      <p className="text-xs text-gray-500 dark:text-zinc-400">
                        Requested: {new Date(request.requested_at).toLocaleDateString()}
                        {request.reviewed_at && (
                          <> • Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</>
                        )}
                      </p>
                      {request.notes && (
                        <p className="text-xs text-gray-600 dark:text-zinc-400 mt-1">{request.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusBadge(request.status)}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAccessRequest(request.id)}
                        className="rounded-lg text-xs font-medium border-gray-200 dark:border-zinc-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="codes" className="space-y-6 mt-6">
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Create New Invitation Code</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium text-gray-700 dark:text-zinc-300">Name (Optional)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Name for this invitation"
                    value={newCodeName}
                    onChange={(e) => setNewCodeName(e.target.value)}
                    className="mt-1.5 text-sm border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-medium text-gray-700 dark:text-zinc-300">Email (Optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Leave empty for general use"
                    value={newCodeEmail}
                    onChange={(e) => setNewCodeEmail(e.target.value)}
                    className="mt-1.5 text-sm border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-gray-700 dark:text-zinc-300">Allowed User Types</Label>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Välj en eller flera typer som den inbjudna kan registrera sig som.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {(["consumer", "producer", "business"] as const).map((t) => (
                      <label key={t} className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={newCodeTypes.has(t)}
                          onCheckedChange={(checked) => {
                            const next = new Set(newCodeTypes);
                            if (checked) next.add(t);
                            else next.delete(t);
                            if (next.size > 0) setNewCodeTypes(next);
                          }}
                        />
                        <span className="capitalize text-xs text-gray-900 dark:text-zinc-100">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="canChange"
                    checked={newCodeCanChange}
                    onCheckedChange={(checked) => setNewCodeCanChange(!!checked)}
                  />
                  <Label htmlFor="canChange" className="cursor-pointer font-normal text-xs text-gray-700 dark:text-zinc-300">
                    Tillåt att den inbjudna kan byta kontotyp på invite-sidan
                  </Label>
                </div>
                <div>
                  <Label htmlFor="initialLevel" className="text-xs font-medium text-gray-700 dark:text-zinc-300">Initial Membership Level</Label>
                  <Select value={newCodeLevel} onValueChange={setNewCodeLevel}>
                    <SelectTrigger id="initialLevel" className="mt-1.5 text-sm border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="brons">Plus</SelectItem>
                      <SelectItem value="silver">Premium</SelectItem>
                      <SelectItem value="guld">Priority</SelectItem>
                      <SelectItem value="privilege">Privilege</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expiry" className="text-xs font-medium text-gray-700 dark:text-zinc-300">Expiry (Days)</Label>
                  <Select value={newCodeExpiry} onValueChange={setNewCodeExpiry}>
                    <SelectTrigger id="expiry" className="mt-1.5 text-sm border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={createInvitationCode}
                  className="w-full rounded-lg text-xs font-medium bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:bg-gray-800 dark:hover:bg-zinc-200"
                >
                  <Plus className="w-3.5 h-3.5 mr-2" />
                  Create Invitation Code
                </Button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-6 border border-gray-200 dark:border-[#1F1F23]">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Invitation Codes</h2>
              <div className="space-y-4">
                {invitationCodes
                  .filter((code) => code.is_active)
                  .map((code) => (
                    <div
                      key={code.id}
                      className="border border-gray-100 dark:border-zinc-800 rounded-xl p-4 bg-gray-50 dark:bg-zinc-900/70"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <code className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 px-2 py-1 rounded-lg text-xs font-mono break-all text-gray-900 dark:text-zinc-100">
                              {code.code}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(code.code, "Kod kopierad")}
                              title="Kopiera kod"
                              className="h-8 text-xs rounded-lg border-gray-200 dark:border-zinc-700"
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                copyToClipboard(
                                  buildInviteUrl(
                                    code.code.trim().replace(/\s+/g, ""),
                                    code.allowed_types ?? (code.invitation_type ? [code.invitation_type] : ["consumer"]),
                                  ),
                                  "Länk kopierad",
                                )
                              }
                              title="Kopiera länk"
                              className="h-8 text-xs rounded-lg border-gray-200 dark:border-zinc-700"
                            >
                              <Link2 className="w-3 h-3" />
                            </Button>
                          </div>
                          {code.name && (
                            <p className="font-medium text-sm text-gray-900 dark:text-zinc-100 mb-1">{code.name}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            Created: {new Date(code.created_at).toLocaleDateString()}
                            {(code.allowed_types?.length ?? 0) > 0 ? (
                              <> • Types: {code.allowed_types?.join(", ")}</>
                            ) : code.invitation_type ? (
                              <> • Type: {code.invitation_type}</>
                            ) : null}
                            {code.can_change_account_type && <> • Can change type</>}
                            {code.initial_level && <> • Level: {code.initial_level}</>}
                            {code.email && <> • For: {code.email}</>}
                            {code.expires_at && (
                              <> • Expires: {new Date(code.expires_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                          {(code.allowed_types?.length ?? 0) > 0
                            ? code.allowed_types?.map((t) => (
                                <span
                                  key={t}
                                  className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"
                                >
                                  {t}
                                </span>
                              ))
                            : code.invitation_type ? (
                                <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300">
                                  {code.invitation_type}
                                </span>
                              ) : null}
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                            Active
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                {invitationCodes.filter((code) => code.is_active).length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-zinc-400 py-8">
                    No active invitation codes
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
