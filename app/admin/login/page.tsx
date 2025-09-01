'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, signUp } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // Validering
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

    try {
      const { data, error } = await signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        
        // Specifika felmeddelanden baserat på error code
        switch (error.message) {
          case 'Invalid login credentials':
            setError('Felaktig email eller lösenord');
            break;
          case 'Email not confirmed':
            setError('Email-adressen är inte bekräftad. Kontrollera din inkorg.');
            break;
          case 'Too many requests':
            setError('För många försök. Försök igen senare.');
            break;
          default:
            setError(`Inloggning misslyckades: ${error.message}`);
        }
      } else if (data?.user) {
        setSuccess('Inloggning lyckades! Omdirigerar...');
        setTimeout(() => {
          router.push('/admin');
          router.refresh();
        }, 1000);
      } else {
        setError('Inloggning misslyckades - inget användarkonto returnerades');
      }
    } catch (err) {
      console.error('Unexpected error during sign in:', err);
      setError('Ett oväntat fel uppstod. Kontrollera din internetanslutning och försök igen.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // Validering
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
      console.log('Attempting to sign up:', email);
      const { data, error } = await signUp(email, password, 'admin');
      
      if (error) {
        console.error('Sign up error:', error);
        console.error('Error object:', JSON.stringify(error, null, 2));
        
        // Specifika felmeddelanden baserat på error code
        let errorMessage = error.message || 'Okänt fel';
        
        switch (errorMessage) {
          case 'User already registered':
            setError('En användare med denna email-adress finns redan. Använd "Sign In" istället.');
            break;
          case 'Password should be at least 6 characters':
            setError('Lösenordet måste vara minst 6 tecken långt');
            break;
          case 'Unable to validate email address: invalid format':
            setError('Ange en giltig email-adress');
            break;
          case 'Signup is disabled':
            setError('Registrering är inaktiverat. Kontakta administratören.');
            break;
          default:
            if (errorMessage.includes('profiles')) {
              setError(`Database-fel: ${errorMessage}. Kontrollera att profiles-tabellen finns.`);
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
              setError('Nätverksfel. Kontrollera din internetanslutning.');
            } else {
              setError(`Registrering misslyckades: ${errorMessage}`);
            }
        }
      } else if (data?.user) {
        setSuccess('Admin-konto skapat! Kontrollera din email för bekräftelse innan inloggning.');
        // Rensa formuläret
        setEmail('');
        setPassword('');
      } else {
        setError('Registrering misslyckades - inget användarkonto returnerades');
      }
    } catch (err) {
      console.error('Unexpected error during sign up:', err);
      setError(`Ett oväntat fel uppstod: ${err}`);
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
                    {loading ? 'Signing in...' : 'Sign in'}
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
                  Create a new admin account (first time setup)
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
