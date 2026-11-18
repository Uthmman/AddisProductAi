'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  FolderTree,
  Tag,
  Newspaper,
  MessageSquare,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { href: '/dashboard', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/posts', label: 'Posts', icon: Newspaper },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/bot', label: 'Chatbot', icon: MessageSquare },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/40 bg-background/95 backdrop-blur-xl sm:hidden safe-area-bottom pb-safe shadow-lg">
      <div className="flex h-14 items-center justify-around px-1">
        {mobileNavItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full py-1 text-[10px] font-medium transition-colors select-none',
                isActive
                  ? 'text-primary font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-xl transition-all',
                  isActive ? 'bg-primary/15 text-primary scale-110' : ''
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span className="truncate mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
