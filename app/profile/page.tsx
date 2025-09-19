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
  Settings,
  LogOut,
  Wine
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
  const [isAuthenticated, setIsAuthenticated] = useState(true);
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
        if (response.status === 401) {
          // User is not authenticated, redirect to login
          setIsAuthenticated(false);
          toast.error("Please log in to view your profile");
          setTimeout(() => {
            window.location.href = '/log-in';
          }, 1000);
          return;
        }
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
        if (response.status === 401) {
          // User is not authenticated, don't try to fetch payment methods
          return;
        }
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
    try {
      // Get user profile to get email and name
      const profileResponse = await fetch('/api/user/profile');
      if (!profileResponse.ok) {
        toast.error("Please add your profile information first");
        return;
      }
      
      const profile = await profileResponse.json();
      if (!profile.email) {
        toast.error("Email is required to add payment method");
        return;
      }

      // Redirect to Stripe setup
      const response = await fetch(
        `/api/checkout/setup?email=${encodeURIComponent(profile.email)}&name=${encodeURIComponent(profile.full_name || '')}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to setup payment method");
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Failed to setup payment method");
      }
      
    } catch (error) {
      console.error('Error adding payment method:', error);
      toast.error("Failed to add payment method");
    }
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

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to logout');
      }

      toast.success("Logged out successfully");
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error("Failed to logout");
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

  if (!isAuthenticated) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Please log in</h2>
            <p className="text-gray-600 mb-4">You need to be logged in to view your profile.</p>
            <Button onClick={() => window.location.href = '/log-in'}>
              Go to Login
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout className="pt-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {profile?.full_name || 'Profile'}
              </h1>
              <p className="text-gray-500">{profile?.email}</p>
            </div>
          </div>
          
          <Button 
            onClick={handleLogout}
            variant="outline" 
            className="text-gray-600 hover:text-red-600 hover:border-red-300"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile Information */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-gray-900">
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
                    <Button onClick={updateProfile} className="flex-1">
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setEditing(false)}
                      className="flex-1"
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
                    className="w-full mt-6"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card className="border border-gray-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-gray-900">
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
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-gray-900">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/profile/reservations">
                <Button variant="outline" className="w-full h-16 flex items-center gap-3">
                  <Package className="w-5 h-5" />
                  <span>View Reservations</span>
                </Button>
              </Link>
              
              <Link href="/shop">
                <Button variant="outline" className="w-full h-16 flex items-center gap-3">
                  <Wine className="w-5 h-5" />
                  <span>Browse Wines</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}