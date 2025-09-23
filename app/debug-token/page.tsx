"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DebugTokenPage() {
  const [token, setToken] = useState("b4164748-a508-4402-aed1-959920fee1b5");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testToken = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log("Testing token:", token);

      // Test token validation
      const validateResponse = await fetch(
        `/api/validate-access-token?token=${token}`,
      );
      const validateData = await validateResponse.json();

      console.log("Token validation result:", validateData);

      // Test debug endpoint
      const debugResponse = await fetch(`/api/debug/token?token=${token}`);
      const debugData = await debugResponse.json();

      console.log("Debug result:", debugData);

      setResult({
        validation: validateData,
        debug: debugData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error testing token:", error);
      setResult({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const testCreateUser = async () => {
    setLoading(true);

    try {
      console.log("Testing create user with token:", token);

      const response = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "testpassword123",
        }),
      });

      const data = await response.json();
      console.log("Create user result:", data);

      setResult((prev) => ({
        ...prev,
        createUser: data,
        createUserTimestamp: new Date().toISOString(),
      }));
    } catch (error) {
      console.error("Error testing create user:", error);
      setResult((prev) => ({
        ...prev,
        createUserError:
          error instanceof Error ? error.message : "Unknown error",
        createUserTimestamp: new Date().toISOString(),
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug Token Validation</CardTitle>
          <CardDescription>
            Test token validation and user creation for debugging
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter token to test"
              className="flex-1"
            />
            <Button onClick={testToken} disabled={loading}>
              Test Token
            </Button>
            <Button
              onClick={testCreateUser}
              disabled={loading}
              variant="outline"
            >
              Test Create User
            </Button>
          </div>

          {result && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Results:</h3>
              <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
