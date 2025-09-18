'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function TestSignupPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testTokenValidation = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('Testing token validation...');
      
      const token = 'b4164748-a508-4402-aed1-959920fee1b5';
      
      // Test token validation
      const validateResponse = await fetch(`/api/validate-access-token?token=${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Token validation response:', validateResponse);
      
      const validateData = await validateResponse.json();
      console.log('Token validation data:', validateData);
      
      setResult({
        step: 'Token Validation',
        status: validateResponse.status,
        data: validateData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error testing token validation:', error);
      setResult({
        step: 'Token Validation',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testCreateUser = async () => {
    setLoading(true);
    
    try {
      console.log('Testing create user...');
      
      const response = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'testpassword123'
        })
      });
      
      console.log('Create user response:', response);
      
      const data = await response.json();
      console.log('Create user data:', data);
      
      setResult(prev => ({
        ...prev,
        step: 'Create User',
        status: response.status,
        data: data,
        timestamp: new Date().toISOString()
      }));
      
    } catch (error) {
      console.error('Error testing create user:', error);
      setResult(prev => ({
        ...prev,
        step: 'Create User',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }));
    } finally {
      setLoading(false);
    }
  };

  const testWithRealToken = async () => {
    setLoading(true);
    
    try {
      console.log('Testing with real token...');
      
      const token = 'b4164748-a508-4402-aed1-959920fee1b5';
      
      // First validate token
      const validateResponse = await fetch(`/api/validate-access-token?token=${token}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const validateData = await validateResponse.json();
      console.log('Token validation:', validateData);
      
      if (!validateData.success) {
        setResult({
          step: 'Real Token Test',
          error: `Token validation failed: ${validateData.message}`,
          tokenData: validateData,
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Then try to create user with the email from token
      const createResponse = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: validateData.email,
          password: 'testpassword123'
        })
      });
      
      const createData = await createResponse.json();
      console.log('Create user with real token:', createData);
      
      setResult({
        step: 'Real Token Test',
        tokenValidation: validateData,
        createUser: createData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error testing with real token:', error);
      setResult({
        step: 'Real Token Test',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Debug Signup Process</CardTitle>
          <CardDescription>
            Test the signup process step by step to identify issues
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={testTokenValidation} disabled={loading}>
              Test Token Validation
            </Button>
            <Button onClick={testCreateUser} disabled={loading} variant="outline">
              Test Create User
            </Button>
            <Button onClick={testWithRealToken} disabled={loading} variant="secondary">
              Test With Real Token
            </Button>
          </div>
          
          {result && (
            <div className="mt-6">
              <Alert>
                <AlertDescription>
                  <strong>Step:</strong> {result.step}<br/>
                  <strong>Status:</strong> {result.status || 'N/A'}<br/>
                  <strong>Timestamp:</strong> {result.timestamp}
                </AlertDescription>
              </Alert>
              
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Results:</h3>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto text-sm max-h-96">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
