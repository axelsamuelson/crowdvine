'use client';

import { Button } from '@/components/ui/button';

export function DebugCartButton() {
  const clearCartCookies = () => {
    // Clear cart cookies
    document.cookie = 'cartId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log('Cart cookies cleared');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={clearCartCookies}
        variant="destructive"
        size="sm"
        className="text-xs"
      >
        Clear Cart Cookies
      </Button>
    </div>
  );
}
