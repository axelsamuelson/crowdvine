'use client';

import { usePathname } from 'next/navigation';
import { Header } from './index';
import { Collection } from '@/lib/shopify/types';

interface ConditionalHeaderProps {
  collections: Collection[];
}

export function ConditionalHeader({ collections }: ConditionalHeaderProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith('/admin');

  if (isAdminRoute) {
    return null;
  }

  return <Header collections={collections} />;
}
