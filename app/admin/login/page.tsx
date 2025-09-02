'use client';

import { useState } from 'react';
import { adminLogin, createAdminAccount } from '@/lib/admin-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    if (!email || !password) {
      setError('Email och lösenord krävs');
      setLoading(false);
      return;
    }

    try {
      console.log('Attempting admin login...');
      
      const result = await adminLogin(email, password);
      
      if (result?.error) {
        console.error('Admin login error:', result.error);
        setError(result.error);
      } else if (result?.success) {
        console.log('Admin login successful');
        setSuccess('Inloggning lyckades! Omdirigerar...');
        // Vänta lite och sedan omdirigera manuellt
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      }
    } catch (err: any) {
      console.error('Login error details:', err);
      
      // NEXT_REDIRECT är normalt för server actions - det betyder att redirect fungerade
      if (err?.digest?.includes('NEXT_REDIRECT')) {
        console.log('Admin login redirect successful');
        setSuccess('Inloggning lyckades! Omdirigerar...');
        // Vänta lite och sedan omdirigera manuellt
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1000);
      } else if (err?.message) {
        console.error('Login error with message:', err.message);
        setError(err.message);
      } else {
        console.error('Unexpected error during sign in:', err);
        setError('Ett oväntat fel uppstod. Kontrollera din internetanslutning och försök igen.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    if (!email || !password) {
      setError('Email och lösenord krävs');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Lösenordet måste vara minst 6 tecken långt');
      setLoading(false);
      return;
    }

    if (!email.includes('@')) {
      setError('Ange en giltig email-adress');
      setLoading(false);
      return;
    }

    try {
      console.log('Creating admin account...');
      
      const result = await createAdminAccount(email, password);
      
      if (result?.error) {
        console.error('Create account error:', result.error);
        if (result.error.includes('already been registered')) {
          setError('Ett konto med denna email-adress finns redan. Logga in istället.');
        } else {
          setError(result.error);
        }
      } else {
        console.log('Account created successfully:', result);
        setSuccess('Admin-konto skapat framgångsrikt! Du kan nu logga in.');
        
        // Rensa formuläret
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      setError('Ett oväntat fel uppstod. Kontrollera din internetanslutning och försök igen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Crowdvine Admin
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your admin account
          </p>
        </div>

        <Tabs defaultValue="signin" className="w-full" onValueChange={clearMessages}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin">
            <Card>
              <CardHeader>
                <CardTitle>Sign In</CardTitle>
                <CardDescription>
                  Enter your credentials to access the admin panel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert>
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1"
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card>
              <CardHeader>
                <CardTitle>Create Admin Account</CardTitle>
                <CardDescription>
                  Create a new admin account (direct login, no email confirmation)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignUp} className="space-y-4">
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {success && (
                    <Alert>
                      <AlertDescription>{success}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <label htmlFor="email-signup" className="block text-sm font-medium text-gray-700">
                      Email address
                    </label>
                    <Input
                      id="email-signup"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1"
                      disabled={loading}
                    />
                  </div>

                  <div>
                    <label htmlFor="password-signup" className="block text-sm font-medium text-gray-700">
                      Password (minst 6 tecken)
                    </label>
                    <Input
                      id="password-signup"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="mt-1"
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Creating account...' : 'Create Admin Account'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
