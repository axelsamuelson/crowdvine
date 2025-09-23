"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function DebugRealtimePage() {
  const [connectionStatus, setConnectionStatus] =
    useState<string>("Disconnected");
  const [messages, setMessages] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [serverStatus, setServerStatus] = useState<any>(null);

  const addMessage = (message: string) => {
    setMessages((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    addMessage("Initializing realtime connection...");

    // Test server-side connection first
    fetch("/api/debug/realtime-test")
      .then((response) => response.json())
      .then((data) => {
        setServerStatus(data);
        addMessage(`Server status: ${JSON.stringify(data)}`);
      })
      .catch((error) => {
        addMessage(`Server error: ${error.message}`);
      });

    // Test basic realtime connection
    const channel = supabase
      .channel("test-channel")
      .on("system", {}, (status) => {
        addMessage(`System status: ${status}`);
        if (status === "SUBSCRIBED") {
          setConnectionStatus("Connected");
          setIsConnected(true);
        } else if (status === "CHANNEL_ERROR") {
          setConnectionStatus("Error");
          setIsConnected(false);
        } else if (status === "TIMED_OUT") {
          setConnectionStatus("Timed Out");
          setIsConnected(false);
        } else if (status === "CLOSED") {
          setConnectionStatus("Closed");
          setIsConnected(false);
        }
      })
      .subscribe();

    return () => {
      addMessage("Cleaning up connection...");
      supabase.removeChannel(channel);
    };
  }, []);

  const testInvitationSubscription = () => {
    addMessage("Testing invitation subscription...");

    const channel = supabase
      .channel("test-invitation-subscription")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "invitation_codes",
        },
        (payload) => {
          addMessage(`Invitation update received: ${JSON.stringify(payload)}`);
        },
      )
      .on("system", {}, (status) => {
        addMessage(`Invitation subscription status: ${status}`);
      })
      .subscribe();

    // Clean up after 10 seconds
    setTimeout(() => {
      supabase.removeChannel(channel);
      addMessage("Test invitation subscription cleaned up");
    }, 10000);
  };

  const testDiscountCodesSubscription = () => {
    addMessage("Testing discount codes subscription...");

    const channel = supabase
      .channel("test-discount-codes-subscription")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "discount_codes",
        },
        (payload) => {
          addMessage(
            `Discount code insert received: ${JSON.stringify(payload)}`,
          );
        },
      )
      .on("system", {}, (status) => {
        addMessage(`Discount codes subscription status: ${status}`);
      })
      .subscribe();

    // Clean up after 10 seconds
    setTimeout(() => {
      supabase.removeChannel(channel);
      addMessage("Test discount codes subscription cleaned up");
    }, 10000);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Realtime Debug
            <Badge variant={isConnected ? "default" : "destructive"}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testInvitationSubscription} variant="outline">
              Test Invitation Subscription
            </Button>
            <Button onClick={testDiscountCodesSubscription} variant="outline">
              Test Discount Codes Subscription
            </Button>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Connection Log:</h3>
            <div className="bg-gray-100 p-4 rounded-lg max-h-96 overflow-y-auto">
              {messages.map((message, index) => (
                <div key={index} className="text-sm font-mono">
                  {message}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Server Status:</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-sm font-mono">
                {serverStatus ? (
                  <div>
                    <div>
                      Database Connection: {serverStatus.databaseConnection}
                    </div>
                    <div>
                      Realtime Status:{" "}
                      {serverStatus.realtimeStatus || "Unknown"}
                    </div>
                    <div>Message: {serverStatus.message}</div>
                    {serverStatus.error && (
                      <div className="text-red-600">
                        Error: {serverStatus.error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>Loading server status...</div>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Environment Info:</h3>
            <div className="bg-gray-100 p-4 rounded-lg">
              <div className="text-sm font-mono">
                <div>
                  NEXT_PUBLIC_SUPABASE_URL:{" "}
                  {process.env.NEXT_PUBLIC_SUPABASE_URL ? "SET" : "MISSING"}
                </div>
                <div>
                  NEXT_PUBLIC_SUPABASE_ANON_KEY:{" "}
                  {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? "SET"
                    : "MISSING"}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">
              Supabase Realtime Setup Instructions:
            </h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm space-y-2">
                <p>
                  <strong>1. Go to Supabase Dashboard:</strong>
                </p>
                <p>• Navigate to your project → Settings → API</p>
                <p>• Find "Realtime" section and enable it</p>
                <p>
                  <strong>2. Enable Replication:</strong>
                </p>
                <p>• Go to Database → Replication</p>
                <p>
                  • Enable replication for <code>invitation_codes</code> table
                </p>
                <p>
                  • Enable replication for <code>discount_codes</code> table
                </p>
                <p>
                  <strong>3. Check RLS Policies:</strong>
                </p>
                <p>• Ensure RLS policies allow SELECT operations</p>
                <p>• Users should be able to read their own data</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
