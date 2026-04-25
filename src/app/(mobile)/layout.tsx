'use client';

import * as React from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground safe-bottom">
      <main className="flex-1 pb-20">
        {children}
      </main>
      {/* Bottom Padding for safety on mobile keyboards/bottom bars */}
      <Toaster />
      <SonnerToaster />
    </div>
  );
}
