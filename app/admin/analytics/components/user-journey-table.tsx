"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { CheckCircle, XCircle, Search, Award, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserJourneyTableProps {
  users: any[];
}

const STEPS = [
  { key: 'access_requested_at', name: 'Access Requested' },
  { key: 'access_approved_at', name: 'Access Approved' },
  { key: 'first_login_at', name: 'First Login' },
  { key: 'first_product_view_at', name: 'Product Viewed' },
  { key: 'first_add_to_cart_at', name: 'Added to Cart' },
  { key: 'cart_validation_passed_at', name: 'Cart Validated' },
  { key: 'checkout_started_at', name: 'Checkout Started' },
  { key: 'reservation_completed_at', name: 'Reservation Completed' },
];

export function UserJourneyTable({ users }: UserJourneyTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCompleted, setFilterCompleted] = useState<string>("all");

  const getStatusIcon = (value: any) => {
    if (value) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-gray-300" />;
  };

  const getUserName = (user: any) => {
    if (user.profiles?.full_name) {
      return user.profiles.full_name;
    }
    if (user.profiles?.email) {
      return user.profiles.email;
    }
    return "Guest User";
  };

  const getUserEmail = (user: any) => {
    return user.profiles?.email || "N/A";
  };

  const getStepsCompleted = (user: any) => {
    if (user.has_no_events) return 0;
    return STEPS.filter(step => user[step.key]).length;
  };

  const getCompletionPercentage = (user: any) => {
    if (user.has_no_events) return 0;
    const completed = getStepsCompleted(user);
    return Math.round((completed / STEPS.length) * 100);
  };

  const getReachedStep = (user: any) => {
    if (user.has_no_events) return 'No events recorded';
    const reached = STEPS.filter(step => user[step.key]);
    return reached.length > 0 ? reached[reached.length - 1].name : 'Not started';
  };

  const getCompletionStatus = (user: any) => {
    if (user.has_no_events) {
      return { status: 'no-events', color: 'bg-gray-100 text-gray-600', label: 'No events', icon: XCircle };
    }
    if (user.reservation_completed_at) {
      return { status: 'completed', color: 'bg-green-100 text-green-800', label: 'Completed', icon: Award };
    } else if (user.checkout_started_at) {
      return { status: 'in-progress', color: 'bg-blue-100 text-blue-800', label: 'In Progress', icon: TrendingUp };
    } else if (getStepsCompleted(user) >= 3) {
      return { status: 'active', color: 'bg-yellow-100 text-yellow-800', label: 'Active', icon: TrendingUp };
    }
    return { status: 'new', color: 'bg-gray-100 text-gray-800', label: 'New', icon: TrendingUp };
  };

  const sortedAndFilteredUsers = useMemo(() => {
    if (!users) return [];
    
    let filtered = users;

    // Filter by completion status
    if (filterCompleted === "no-events") {
      filtered = filtered.filter(user => user.has_no_events);
    } else if (filterCompleted === "completed") {
      filtered = filtered.filter(user => user.reservation_completed_at);
    } else if (filterCompleted === "in-progress") {
      filtered = filtered.filter(user => user.checkout_started_at && !user.reservation_completed_at);
    } else if (filterCompleted === "active") {
      filtered = filtered.filter(user => getStepsCompleted(user) >= 3 && !user.checkout_started_at);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(user => {
        const name = getUserName(user).toLowerCase();
        const email = getUserEmail(user).toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || email.includes(searchQuery.toLowerCase());
      });
    }

    // Sort by completion percentage and reservation completed
    return filtered.sort((a, b) => {
      const aCompleted = !!a.reservation_completed_at;
      const bCompleted = !!b.reservation_completed_at;
      
      if (aCompleted !== bCompleted) {
        return bCompleted ? 1 : -1;
      }
      
      return getCompletionPercentage(b) - getCompletionPercentage(a);
    });
  }, [users, searchQuery, filterCompleted]);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">User Journeys</h3>
        <Badge variant="outline">{sortedAndFilteredUsers.length} users</Badge>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Filter by Status</label>
          <Select value={filterCompleted} onValueChange={setFilterCompleted}>
            <SelectTrigger>
              <SelectValue placeholder="All users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="no-events">No Events</SelectItem>
              <SelectItem value="completed">Completed Reservations</SelectItem>
              <SelectItem value="in-progress">In Progress (Checkout)</SelectItem>
              <SelectItem value="active">Active (3+ steps)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Search Users</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {sortedAndFilteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No users found matching your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Reached</TableHead>
                <TableHead className="text-center">Request</TableHead>
                <TableHead className="text-center">Approved</TableHead>
                <TableHead className="text-center">Login</TableHead>
                <TableHead className="text-center">Product</TableHead>
                <TableHead className="text-center">Cart</TableHead>
                <TableHead className="text-center">Validate</TableHead>
                <TableHead className="text-center">Checkout</TableHead>
                <TableHead className="text-center">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredUsers.map((user) => {
                const completionInfo = getCompletionStatus(user);
                const CompletionIcon = completionInfo.icon;
                
                return (
                  <TableRow key={user.user_id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{getUserName(user)}</div>
                        <div className="text-xs text-gray-500">{getUserEmail(user)}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={completionInfo.color} variant="outline">
                        <CompletionIcon className="w-3 h-3 mr-1" />
                        {completionInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all" 
                            style={{ width: `${getCompletionPercentage(user)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium w-12">
                          {getCompletionPercentage(user)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getStepsCompleted(user)} / {STEPS.length}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {getReachedStep(user)}
                    </TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.access_requested_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.access_approved_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.first_login_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.first_product_view_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.first_add_to_cart_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.cart_validation_passed_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.checkout_started_at)}</TableCell>
                    <TableCell className="text-center">{getStatusIcon(user.reservation_completed_at)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
}
