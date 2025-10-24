// components/ClientWrapper.tsx
'use client';

import { ReactNode } from 'react';
import { SessionProvider } from '@/context/SessionContext';
import { CartProvider } from '@/context/CartContext';
import BootstrapClient from '@/components/BootstrapClient'; // Assuming this also needs to be client-side

export default function ClientWrapper({ children }: { children: ReactNode }) {
  return (
    <>
      <BootstrapClient /> {/* Cargar el JS de Bootstrap primero */}
      <SessionProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </SessionProvider>
    </>
  );
}