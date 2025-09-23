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
  Wine,
  UserPlus,
  Copy,
  Check,
  Wifi,
  WifiOff
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { PaymentMethodCard } from "@/components/ui/payment-method-card";
import DiscountCodesSection from "@/components/profile/discount-codes-section";
import { useHybridInvitationUpdates } from "@/lib/hooks/use-hybrid-invitation-updates";

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
  const [invitation, setInvitation] = useState<{
    code: string;
    signupUrl: string;
    codeSignupUrl?: string;
    expiresAt: string;
    currentUses?: number;
    maxUses?: number;
    usedBy?: string;
    usedAt?: string;
    isActive?: boolean;
  } | null>(null);
  const [usedInvitations, setUsedInvitations] = useState<Array<{
    code: string;
    usedAt: string;
    usedBy?: string;
    currentUses: number;
  }>>([]);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [discountCodes, setDiscountCodes] = useState<any[]>([]);

  // Hybrid updates (polling + webhooks)
  const { isConnected: invitationConnected, lastUpdate: invitationLastUpdate, checkStatus } = useHybridInvitationUpdates({
    invitation,
    onInvitationUpdate: (updatedInvitation) => {
      console.log('Invitation updated via hybrid system:', updatedInvitation);
      setInvitation(updatedInvitation);
      localStorage.setItem('currentInvitation', JSON.stringify(updatedInvitation));
      
      // If invitation was just used, refresh used invitations from database
      if (updatedInvitation.currentUses && updatedInvitation.currentUses > 0 && 
          invitation && (!invitation.currentUses || invitation.currentUses === 0)) {
        fetchUsedInvitations();
      }
    },
    onDiscountCodesUpdate: (codes) => {
      console.log('Discount codes updated via hybrid system:', codes);
      setDiscountCodes(codes);
    }
  });

  useEffect(() => {
    fetchProfile();
    fetchPaymentMethods();
    fetchDiscountCodes();
    fetchUsedInvitations(); // Fetch used invitations from database
    
    // Load invitation from localStorage
    const savedInvitation = localStorage.getItem('currentInvitation');
    if (savedInvitation) {
      try {
        const parsedInvitation = JSON.parse(savedInvitation);
        setInvitation(parsedInvitation);
        
        // Hybrid system will handle status updates automatically
      } catch (error) {
        console.error('Error loading invitation from localStorage:', error);
        localStorage.removeItem('currentInvitation');
      }
    }
    
    // Used invitations are now fetched from database instead of localStorage
    
    // No more polling - using realtime updates instead
    
    // Check for payment method success/cancel messages
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment_method_added') === 'true') {
      toast.success("Payment method added successfully!");
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    } else if (urlParams.get('payment_method_canceled') === 'true') {
      toast.error("Payment method setup was canceled");
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    }
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

  const fetchDiscountCodes = async () => {
    try {
      const response = await fetch('/api/discount-codes');
      if (response.ok) {
        const data = await response.json();
        setDiscountCodes(data || []);
      } else {
        console.error("Failed to load discount codes");
        setDiscountCodes([]);
      }
    } catch (error) {
      console.error('Error fetching discount codes:', error);
      setDiscountCodes([]);
    }
  };

  const fetchUsedInvitations = async () => {
    try {
      const response = await fetch('/api/invitations/used');
      if (response.ok) {
        const data = await response.json();
        setUsedInvitations(data.usedInvitations || []);
      } else {
        console.error("Failed to load used invitations");
        setUsedInvitations([]);
      }
    } catch (error) {
      console.error('Error fetching used invitations:', error);
      setUsedInvitations([]);
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

  const generateInvitation = async () => {
    setGeneratingInvite(true);
    try {
      // Refresh used invitations from database when generating new invitation
      fetchUsedInvitations();

      const response = await fetch('/api/invitations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInDays: 30 })
      });

      if (!response.ok) {
        throw new Error('Failed to generate invitation');
      }

      const data = await response.json();
      setInvitation(data.invitation);
      
      // Save invitation to localStorage
      localStorage.setItem('currentInvitation', JSON.stringify(data.invitation));
      
      toast.success("Invitation generated successfully!");
    } catch (error) {
      console.error('Error generating invitation:', error);
      toast.error("Failed to generate invitation");
    } finally {
      setGeneratingInvite(false);
    }
  };

  // Realtime updates handle status changes automatically

  const copyToClipboard = async (text: string, type: 'code' | 'url') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'code') {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } else {
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      }
      toast.success(`${type === 'code' ? 'Code' : 'URL'} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
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
      
      // Clear local state
      setIsAuthenticated(false);
      setProfile(null);
      
      // Redirect to access request page (not home) since user should re-request access
      setTimeout(() => {
        window.location.href = '/access-request';
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-medium text-gray-900">
                  Payment Methods
                </CardTitle>
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <rect width="24" height="24" rx="4" fill="#635BFF"/>
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.274 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.407-2.2 1.407-1.99 0-4.043-.921-5.827-1.845L4.717 24c1.73.921 4.351 1.685 7.552 1.685 2.508 0 4.682-.657 6.104-1.892 1.545-1.31 2.352-3.147 2.352-5.373 0-4.039-2.467-5.76-6.476-7.219z" fill="white"/>
                  </svg>
                  <span className="text-sm font-medium text-gray-600">Powered by Stripe</span>
                </div>
              </div>
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
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <PaymentMethodCard
                      key={method.id}
                      method={method}
                      onSetDefault={setDefaultPaymentMethod}
                      onDelete={deletePaymentMethod}
                    />
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

        {/* Invite Friends */}
        <Card className="border border-gray-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Invite Friends
              {invitation && (
                <div className="flex items-center gap-2 ml-auto">
                  {invitationConnected ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs">
                      <Wifi className="w-3 h-3" />
                      <span>Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-gray-400 text-xs">
                      <WifiOff className="w-3 h-3" />
                      <span>Offline</span>
                    </div>
                  )}
                </div>
              )}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Share the love and earn rewards when friends join!
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show used invitations first */}
            {usedInvitations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Previous Invitations</h4>
                {usedInvitations.map((usedInvite, index) => (
                  <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          Invitation Successful
                        </p>
                        <p className="text-xs text-green-600">
                          Used {usedInvite.currentUses} time{usedInvite.currentUses > 1 ? 's' : ''} • {new Date(usedInvite.usedAt).toLocaleDateString()}
                        </p>
                        {/* Rewards Section */}
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-200 rounded-full flex items-center justify-center">
                              <Check className="w-1.5 h-1.5 text-green-700" />
                            </div>
                            <span className="text-xs font-medium text-green-700">5% reward earned</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-gray-200 rounded-full flex items-center justify-center">
                              <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                            </div>
                            <span className="text-xs text-gray-500">10% reward pending</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current invitation section */}
            {!invitation ? (
              <div className="text-center py-6">
                <UserPlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Invite Your Friends</h3>
                <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                  Generate a unique invitation code to share with friends and family. 
                  <span className="font-medium text-gray-900"> Earn rewards when they join!</span>
                </p>
                <Button 
                  onClick={generateInvitation}
                  disabled={generatingInvite}
                  className="w-full"
                >
                  {generatingInvite ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Generate Invitation
                    </>
                  )}
                </Button>
              </div>
            ) : invitation.currentUses && invitation.currentUses > 0 ? (
              // Used invitation - minimal display
              <div className="space-y-4">
                {/* Success Status with Rewards */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-green-800">Invitation Successful!</h3>
                      <p className="text-sm text-green-600">
                        Used {invitation.currentUses} time{invitation.currentUses > 1 ? 's' : ''} • {invitation.usedAt && new Date(invitation.usedAt).toLocaleDateString()}
                      </p>
                      {/* Rewards Section */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-green-200 rounded-full flex items-center justify-center">
                            <Check className="w-2 h-2 text-green-700" />
                          </div>
                          <span className="text-xs font-medium text-green-700">5% reward earned - Account created</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center">
                            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                          </div>
                          <span className="text-xs text-gray-500">10% reward pending - Reservation made</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 text-sm">Invitation Progress</h4>
                  <div className="space-y-2">
                    {/* Step 1: Invitation Sent */}
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-700">Invitation sent</span>
                    </div>
                    
                    {/* Step 2: Account Created */}
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-700">Account created</span>
                    </div>
                    
                    {/* Step 3: Reservation Made (placeholder for future) */}
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      </div>
                      <span className="text-sm text-gray-500">Reservation made</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={generateInvitation}
                  disabled={generatingInvite}
                  className="w-full"
                >
                  {generatingInvite ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Generate New Invitation
                    </>
                  )}
                </Button>
              </div>
            ) : (
              // Active invitation - show sharing options
              <div className="space-y-4">
                {/* Status Header */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <UserPlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-blue-800">Invitation Active</h3>
                      <p className="text-sm text-blue-600">
                        Expires: {new Date(invitation.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sharing Options */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900 text-sm">Share Invitation</h4>
                  
                  {/* Invitation Code */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Invitation Code
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={invitation.code}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(invitation.code, 'code')}
                      >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Direct Signup Link */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Direct Signup Link
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={invitation.signupUrl}
                        readOnly
                        className="text-sm"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(invitation.signupUrl, 'url')}
                      >
                        {copiedUrl ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    onClick={generateInvitation}
                    disabled={generatingInvite}
                    className="flex-1"
                  >
                    {generatingInvite ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Generate New
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={() => {
                      setInvitation(null);
                      localStorage.removeItem('currentInvitation');
                      toast.success("Invitation cleared");
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>


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