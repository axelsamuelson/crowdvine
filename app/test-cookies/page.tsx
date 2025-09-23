"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestCookiesPage() {
  const [cookieInfo, setCookieInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchCookieInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/debug/cookies');
      const data = await response.json();
      setCookieInfo(data);
    } catch (error) {
      console.error('Error fetching cookie info:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllCookies = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await fetchCookieInfo();
    } catch (error) {
      console.error('Error clearing cookies:', error);
    }
  };

  useEffect(() => {
    fetchCookieInfo();
  }, []);

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Cookie Debug Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchCookieInfo} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh Cookie Info'}
            </Button>
            <Button onClick={clearAllCookies} variant="outline">
              Clear All Cookies
            </Button>
          </div>

          {cookieInfo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Summary</h3>
                  <p>Total Cookies: {cookieInfo.totalCookies}</p>
                  <p>Has Supabase Auth: {cookieInfo.hasSupabaseAuth ? 'Yes' : 'No'}</p>
                  <p>Has Access Cookie: {cookieInfo.hasAccessCookie ? 'Yes' : 'No'}</p>
                  <p>Is Incognito: {cookieInfo.isIncognito ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <h3 className="font-semibold">User Agent</h3>
                  <p className="text-sm text-gray-600 break-all">{cookieInfo.userAgent}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold">All Cookies</h3>
                <div className="space-y-2">
                  {cookieInfo.cookies.map((cookie: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="font-mono text-sm">{cookie.name}</span>
                      <span className="text-sm text-gray-600">
                        {cookie.hasValue ? `${cookie.value} (${cookie.length} chars)` : 'No value'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
