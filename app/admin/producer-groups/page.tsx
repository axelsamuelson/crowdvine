"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, Plus, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface ProducerGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  members?: Array<{
    id: string;
    producer_id: string;
    producers: {
      id: string;
      name: string;
      region: string;
    };
  }>;
}

interface Producer {
  id: string;
  name: string;
  region: string;
}

export default function ProducerGroupsPage() {
  const [groups, setGroups] = useState<ProducerGroup[]>([]);
  const [producers, setProducers] = useState<Producer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ProducerGroup | null>(null);
  
  // Form state
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [selectedProducerId, setSelectedProducerId] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch producer groups
      const groupsResponse = await fetch("/api/admin/producer-groups");
      const groupsData = await groupsResponse.json();
      setGroups(groupsData.groups || []);

      // Fetch all producers
      const producersResponse = await fetch("/api/crowdvine/collections");
      const producersData = await producersResponse.json();
      setProducers(producersData || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load producer groups");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    try {
      const response = await fetch("/api/admin/producer-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDescription,
        }),
      });

      if (response.ok) {
        toast.success("Producer group created");
        setShowCreateDialog(false);
        setNewGroupName("");
        setNewGroupDescription("");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create group");
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm("Are you sure you want to delete this producer group?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/producer-groups/${groupId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Producer group deleted");
        fetchData();
      } else {
        toast.error("Failed to delete group");
      }
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error("Failed to delete group");
    }
  };

  const handleAddProducer = async () => {
    if (!selectedProducerId || !selectedGroup) {
      toast.error("Please select a producer");
      return;
    }

    try {
      const response = await fetch("/api/admin/producer-groups/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: selectedGroup.id,
          producerId: selectedProducerId,
        }),
      });

      if (response.ok) {
        toast.success("Producer added to group");
        setShowAddMemberDialog(false);
        setSelectedProducerId("");
        fetchData();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add producer");
      }
    } catch (error) {
      console.error("Error adding producer:", error);
      toast.error("Failed to add producer");
    }
  };

  const handleRemoveProducer = async (groupId: string, memberId: string) => {
    try {
      const response = await fetch(`/api/admin/producer-groups/members/${memberId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Producer removed from group");
        fetchData();
      } else {
        toast.error("Failed to remove producer");
      }
    } catch (error) {
      console.error("Error removing producer:", error);
      toast.error("Failed to remove producer");
    }
  };

  // Get available producers (not already in selected group)
  const availableProducers = producers.filter(
    (p) => !selectedGroup?.members?.some((m) => m.producer_id === p.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Producer Groups</h1>
          <p className="text-sm text-gray-600 mt-1">
            Link producers together so customers can combine their wines to meet the 6-bottle requirement
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">6-Bottle Rule</p>
              <p>
                Customers must order bottles in multiples of 6 per producer (6, 12, 18, etc.). 
                By creating producer groups, you allow customers to combine bottles from linked 
                producers to meet this requirement.
              </p>
              <p className="mt-2">
                <strong>Example:</strong> If Producer A and Producer B are in the same group, 
                customers can order 3 bottles from A + 3 bottles from B = 6 total (valid).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Groups List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading producer groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2 text-gray-900">No producer groups yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first producer group to allow customers to combine bottles from different producers.
            </p>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    {group.description && (
                      <CardDescription className="mt-1">{group.description}</CardDescription>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteGroup(group.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Producers</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGroup(group);
                        setShowAddMemberDialog(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                  
                  {group.members && group.members.length > 0 ? (
                    <div className="space-y-2">
                      {group.members.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
                        >
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {member.producers.name}
                            </p>
                            <p className="text-xs text-gray-500">{member.producers.region}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveProducer(group.id, member.id)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No producers in this group yet</p>
                  )}

                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-600">
                      {group.members?.length || 0} producer{group.members?.length !== 1 ? 's' : ''} in group
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Group Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Producer Group</DialogTitle>
            <DialogDescription>
              Link producers together so customers can combine their bottles to meet the 6-bottle requirement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Southern France Partners"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="groupDescription">Description (optional)</Label>
              <Textarea
                id="groupDescription"
                placeholder="Describe this producer group..."
                value={newGroupDescription}
                onChange={(e) => setNewGroupDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGroup}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Producer Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Producer to {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Select a producer to add to this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="producer">Producer</Label>
              <Select value={selectedProducerId} onValueChange={setSelectedProducerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a producer" />
                </SelectTrigger>
                <SelectContent>
                  {availableProducers.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name} - {producer.region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProducer}>Add Producer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

