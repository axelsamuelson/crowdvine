"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Plus, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AccessRequest {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  notes?: string;
}

interface InvitationCode {
  id: string;
  code: string;
  email?: string;
  created_by: string;
  used_at?: string;
  used_by?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export default function AccessControlAdmin() {
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [invitationCodes, setInvitationCodes] = useState<InvitationCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCodeEmail, setNewCodeEmail] = useState("");
  const [newCodeExpiry, setNewCodeExpiry] = useState("30");

  useEffect(() => {
    fetchAccessRequests();
    fetchInvitationCodes();
  }, []);

  const fetchAccessRequests = async () => {
    try {
      const response = await fetch('/api/admin/access-requests');
      if (!response.ok) {
        throw new Error('Failed to fetch access requests');
      }
      const data = await response.json();
      setAccessRequests(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching access requests:', error);
      toast.error("Failed to fetch access requests");
      setLoading(false);
    }
  };

  const fetchInvitationCodes = async () => {
    try {
      const response = await fetch('/api/admin/invitation-codes');
      if (!response.ok) {
        throw new Error('Failed to fetch invitation codes');
      }
      const data = await response.json();
      setInvitationCodes(data);
    } catch (error) {
      console.error('Error fetching invitation codes:', error);
      toast.error("Failed to fetch invitation codes");
    }
  };


  const updateAccessRequest = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      // Use the new simple API for updating access request status
      const response = await fetch('/api/admin/update-access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update access request');
      }

      const result = await response.json();
      if (result.success) {
        // If approved, also send approval email
        if (status === 'approved') {
          try {
            // Get the email from the access request
            const accessRequest = accessRequests.find(req => req.id === id);
            if (accessRequest) {
              const emailResponse = await fetch('/api/admin/send-approval-email', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: accessRequest.email }),
              });

              if (emailResponse.ok) {
                const emailResult = await emailResponse.json();
                if (emailResult.success) {
                  toast.success(`Access request approved and email sent to ${accessRequest.email}`);
                } else {
                  toast.success(`Access request approved, but email failed to send`);
                }
              } else {
                toast.success(`Access request approved, but email failed to send`);
              }
            }
          } catch (emailError) {
            console.error('Error sending approval email:', emailError);
            toast.success(`Access request approved, but email failed to send`);
          }
        } else {
          toast.success(`Access request ${status}`);
        }
        
        // Refresh the list
        fetchAccessRequests();
      } else {
        throw new Error(result.error || 'Failed to update access request');
      }
    } catch (error) {
      console.error('Error updating access request:', error);
      toast.error("Failed to update access request");
    }
  };

  const deleteAccessRequest = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/access-requests?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete access request');
      }

      const result = await response.json();
      if (result.success) {
        // Refresh the list
        fetchAccessRequests();
        toast.success("Access request deleted");
      } else {
        throw new Error(result.error || 'Failed to delete access request');
      }
    } catch (error) {
      console.error('Error deleting access request:', error);
      toast.error("Failed to delete access request");
    }
  };

  const createInvitationCode = async () => {
    try {
      const response = await fetch('/api/admin/invitation-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newCodeEmail || null,
          expiryDays: parseInt(newCodeExpiry),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create invitation code');
      }

      const result = await response.json();
      if (result.success) {
        toast.success("Invitation code created");
        setNewCodeEmail("");
        setNewCodeExpiry("30");
        // Refresh the list
        fetchInvitationCodes();
      } else {
        throw new Error(result.error || 'Failed to create invitation code');
      }
    } catch (error) {
      console.error('Error creating invitation code:', error);
      toast.error("Failed to create invitation code");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="w-3 h-3" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle className="w-3 h-3" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="w-3 h-3" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-gray-600">Loading access control...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Access Control</h1>
          <p className="text-gray-600 mt-2">Manage platform access requests and invitation codes</p>
        </div>

        <Tabs defaultValue="requests" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="requests">Access Requests</TabsTrigger>
            <TabsTrigger value="codes">Invitation Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Access Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accessRequests.filter(req => req.status === 'pending').map((request) => (
                    <div key={request.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{request.email}</p>
                          <p className="text-sm text-gray-500">
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                          </p>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateAccessRequest(request.id, 'approved')}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateAccessRequest(request.id, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteAccessRequest(request.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                  {accessRequests.filter(req => req.status === 'pending').length === 0 && (
                    <p className="text-center text-gray-500 py-8">No pending access requests</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Access Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {accessRequests.map((request) => (
                    <div key={request.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{request.email}</p>
                          <p className="text-sm text-gray-500">
                            Requested: {new Date(request.requested_at).toLocaleDateString()}
                            {request.reviewed_at && (
                              <> • Reviewed: {new Date(request.reviewed_at).toLocaleDateString()}</>
                            )}
                          </p>
                          {request.notes && (
                            <p className="text-sm text-gray-600 mt-1">{request.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(request.status)}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteAccessRequest(request.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Invitation Code</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email (Optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Leave empty for general use"
                      value={newCodeEmail}
                      onChange={(e) => setNewCodeEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expiry">Expiry (Days)</Label>
                    <Select value={newCodeExpiry} onValueChange={setNewCodeExpiry}>
                      <SelectTrigger>
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
                  <Button onClick={createInvitationCode} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invitation Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Invitation Codes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invitationCodes.filter(code => code.is_active).map((code) => (
                    <div key={code.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                              {code.code}
                            </code>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(code.code)}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Created: {new Date(code.created_at).toLocaleDateString()}
                            {code.email && <> • For: {code.email}</>}
                            {code.expires_at && (
                              <> • Expires: {new Date(code.expires_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <Badge variant={code.is_active ? "default" : "secondary"}>
                          {code.is_active ? "Active" : "Used"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {invitationCodes.filter(code => code.is_active).length === 0 && (
                    <p className="text-center text-gray-500 py-8">No active invitation codes</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
