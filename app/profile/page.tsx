"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { PageLayout } from "@/components/layout/page-layout";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Plus, 
  Edit, 
  Save, 
  X,
  Calendar,
  Package,
  Settings
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  created_at: string;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  last4?: string;
  brand?: string;
  is_default: boolean;
  expiry_month?: number;
  expiry_year?: number;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'Sweden'
  });

  useEffect(() => {
    fetchProfile();
    fetchPaymentMethods();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user/profile');
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      const data = await response.json();
      setProfile(data);
      setEditForm({
        full_name: data.full_name || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        postal_code: data.postal_code || '',
        country: data.country || 'Sweden'
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Failed to fetch profile");
      setLoading(false);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch('/api/user/payment-methods');
      if (!response.ok) {
        throw new Error('Failed to fetch payment methods');
      }
      const data = await response.json();
      setPaymentMethods(data);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      // Don't show error toast for payment methods as they might not be implemented yet
    }
  };

  const updateProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const updatedProfile = await response.json();
      setProfile(updatedProfile);
      setEditing(false);
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    }
  };

  const addPaymentMethod = async () => {
    // This would integrate with Stripe or similar payment processor
    toast.info("Payment method integration coming soon");
  };

  const setDefaultPaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/user/payment-methods/${methodId}/set-default`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to set default payment method');
      }

      // Update local state
      setPaymentMethods(prev => 
        prev.map(method => ({
          ...method,
          is_default: method.id === methodId
        }))
      );
      
      toast.success("Default payment method updated");
    } catch (error) {
      console.error('Error setting default payment method:', error);
      toast.error("Failed to update default payment method");
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    try {
      const response = await fetch(`/api/user/payment-methods/${methodId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete payment method');
      }

      setPaymentMethods(prev => prev.filter(method => method.id !== methodId));
      toast.success("Payment method deleted");
    } catch (error) {
      console.error('Error deleting payment method:', error);
      toast.error("Failed to delete payment method");
    }
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="pt-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2 text-lg">Manage your account information and preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="Enter your phone number"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      placeholder="Enter your address"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={editForm.city}
                        onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                        placeholder="Enter your city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Postal Code</Label>
                      <Input
                        id="postal_code"
                        value={editForm.postal_code}
                        onChange={(e) => setEditForm({ ...editForm, postal_code: e.target.value })}
                        placeholder="Enter postal code"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={editForm.country}
                      onChange={(e) => setEditForm({ ...editForm, country: e.target.value })}
                      placeholder="Enter your country"
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <Button onClick={updateProfile} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(false)}
                      className="flex-1 border-gray-300 hover:bg-gray-50"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="font-medium">{profile?.email}</p>
                    </div>
                  </div>
                  
                  {profile?.full_name && (
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Full Name</p>
                        <p className="font-medium">{profile.full_name}</p>
                      </div>
                    </div>
                  )}
                  
                  {profile?.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Phone</p>
                        <p className="font-medium">{profile.phone}</p>
                      </div>
                    </div>
                  )}
                  
                  {(profile?.address || profile?.city) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="text-sm text-gray-600">Address</p>
                        <p className="font-medium">
                          {[profile.address, profile.city, profile.postal_code, profile.country]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Member Since</p>
                      <p className="font-medium">
                        {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setEditing(true)} 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 mt-6"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                Payment Methods
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {paymentMethods.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No payment methods added yet</p>
                  <Button onClick={addPaymentMethod}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-4 h-4 text-gray-500" />
                        <div>
                          <p className="font-medium">
                            {method.brand?.toUpperCase()} •••• {method.last4}
                          </p>
                          <p className="text-sm text-gray-600">
                            Expires {method.expiry_month}/{method.expiry_year}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.is_default && (
                          <Badge variant="default" className="bg-green-600">Default</Badge>
                        )}
                        {!method.is_default && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDefaultPaymentMethod(method.id)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deletePaymentMethod(method.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button onClick={addPaymentMethod} className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Another Payment Method
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-purple-600" />
              </div>
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Link href="/profile/reservations">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-3 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <span className="font-medium">View Reservations</span>
                </Button>
              </Link>
              
              <Link href="/shop">
                <Button variant="outline" className="w-full h-24 flex flex-col gap-3 hover:bg-green-50 hover:border-green-200 transition-all duration-200">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Package className="w-6 h-6 text-green-600" />
                  </div>
                  <span className="font-medium">Browse Wines</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}