"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, UserPlus, Mail, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AccessPending() {
  const router = useRouter();
  const [inviteCode, setInviteCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);

  const handleRedeemCode = async () => {
    if (!inviteCode.trim()) {
      toast.error("Please enter an invitation code");
      return;
    }

    setRedeeming(true);

    try {
      // TODO: Implement invite code redemption
      // This would validate the code and grant access
      toast.success("Invitation code redeemed! Welcome to PACT.");
      router.push("/shop");
    } catch (error) {
      toast.error("Invalid or expired invitation code");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="max-w-md w-full border-gray-200 shadow-lg">
        <CardContent className="pt-8 pb-8 px-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-light text-center text-gray-900 mb-3">
            Access Pending
          </h1>

          {/* Description */}
          <p className="text-sm text-gray-600 text-center mb-8">
            PACT is an exclusive wine community. You'll need an invitation to access the platform.
          </p>

          {/* Status */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200/50">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <UserPlus className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Your request has been received
                </p>
                <p className="text-xs text-gray-500">
                  We'll review your application and send you an invitation if approved.
                </p>
              </div>
            </div>
          </div>

          {/* Invite Code Input */}
          {!showCodeInput ? (
            <Button
              onClick={() => setShowCodeInput(true)}
              variant="outline"
              className="w-full rounded-full border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              <Mail className="w-4 h-4 mr-2" />
              I have an invitation code
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code" className="text-sm text-gray-700">
                  Invitation Code
                </Label>
                <Input
                  id="invite-code"
                  type="text"
                  placeholder="Enter your 12-character code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={12}
                  className="text-center uppercase tracking-wider font-mono"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCodeInput(false)}
                  variant="ghost"
                  className="flex-1 rounded-full"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRedeemCode}
                  disabled={redeeming || !inviteCode.trim()}
                  className="flex-1 rounded-full bg-gray-900 hover:bg-gray-800 text-white"
                >
                  {redeeming ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Redeem
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs text-gray-400 text-center mt-6">
            Questions? Contact us at{" "}
            <a href="mailto:hello@pactwines.com" className="underline hover:text-gray-600">
              hello@pactwines.com
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

