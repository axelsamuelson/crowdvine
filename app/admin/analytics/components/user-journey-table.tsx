"use client";

import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface UserJourneyTableProps {
  users: any[];
}

export function UserJourneyTable({ users }: UserJourneyTableProps) {
  const getStatusIcon = (value: any) => {
    if (value) return <CheckCircle className="w-4 h-4 text-green-600" />;
    return <XCircle className="w-4 h-4 text-gray-300" />;
  };

  const getUserName = (user: any) => {
    if (user.profiles?.first_name || user.profiles?.last_name) {
      const firstName = user.profiles.first_name || "";
      const lastName = user.profiles.last_name || "";
      return `${firstName} ${lastName}`.trim() || "No name";
    }
    return "No name";
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">User Journeys</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Access Req</TableHead>
              <TableHead>Approved</TableHead>
              <TableHead>First Login</TableHead>
              <TableHead>Product View</TableHead>
              <TableHead>Add to Cart</TableHead>
              <TableHead>Validated</TableHead>
              <TableHead>Checkout</TableHead>
              <TableHead>Completed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.slice(0, 50).map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">
                  {getUserName(user)}
                </TableCell>
                <TableCell>{getStatusIcon(user.access_requested_at)}</TableCell>
                <TableCell>{getStatusIcon(user.access_approved_at)}</TableCell>
                <TableCell>{getStatusIcon(user.first_login_at)}</TableCell>
                <TableCell>{getStatusIcon(user.first_product_view_at)}</TableCell>
                <TableCell>{getStatusIcon(user.first_add_to_cart_at)}</TableCell>
                <TableCell>{getStatusIcon(user.cart_validation_passed_at)}</TableCell>
                <TableCell>{getStatusIcon(user.checkout_started_at)}</TableCell>
                <TableCell>{getStatusIcon(user.reservation_completed_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
