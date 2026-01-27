
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Package,
  FolderTree,
  Settings,
  FileText,
  MessageSquare,
  Tag,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Products', icon: Package },
  { href: '/categories', label: 'Categories', icon: FolderTree },
  { href: '/tags', label: 'Tags', icon: Tag },
  { href: '/content', label: 'Content', icon: FileText },
  { href: '/bot', label: 'Chatbot', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function MainNav({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <nav className="flex flex-col items-stretch gap-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return isCollapsed ? (
            <Tooltip key={item.href} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="sr-only">{item.label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-foreground',
                isActive && 'bg-accent text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
