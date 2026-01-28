
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PanelLeft, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MainNav } from '@/components/main-nav';

const Header = dynamic(() => import('@/components/header'), { 
  ssr: false,
  loading: () => (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <Button size="icon" variant="outline" className="sm:hidden" disabled>
        <PanelLeft className="h-5 w-5" />
        <span className="sr-only">Toggle Menu</span>
      </Button>
    </header>
  ),
});


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const storedIsCollapsed = localStorage.getItem('sidebar-collapsed');
    if (storedIsCollapsed) {
      setIsCollapsed(JSON.parse(storedIsCollapsed));
    }
  }, []);

  const toggleSidebar = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newCollapsedState));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-10 hidden flex-col border-r bg-background transition-all duration-300 sm:flex',
          isCollapsed ? 'w-16' : 'w-60'
        )}
      >
        <div className="flex h-16 items-center justify-center border-b px-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Package className="h-6 w-6 text-primary" />
            {!isCollapsed && <span className="text-lg">Addis AI</span>}
          </Link>
        </div>
        <MainNav isCollapsed={isCollapsed} />
        <div className="mt-auto flex flex-col items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="rounded-lg"
          >
            <PanelLeft className="h-5 w-5" />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </aside>
      <div
        className={cn(
          'flex flex-col transition-all duration-300',
          isCollapsed ? 'sm:pl-16' : 'sm:pl-60'
        )}
      >
        <Header />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
