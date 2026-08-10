'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FloatingAddButtonProps {
  observerTargetId: string;
}

export function FloatingAddButton({ observerTargetId }: FloatingAddButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(observerTargetId);
    if (!target) {
      // If target not found immediately, show button as fallback
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show FAB when the header button is NOT visible in the viewport
        setIsVisible(!entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-56px 0px 0px 0px', // Header height offset
      }
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [observerTargetId]);

  return (
    <div
      className={cn(
        "fixed bottom-8 right-8 z-50 transition-all duration-300 transform",
        isVisible 
          ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" 
          : "translate-y-10 opacity-0 scale-75 pointer-events-none"
      )}
    >
      <Button
        asChild
        size="icon"
        className="h-14 w-14 rounded-full shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-transform"
      >
        <Link href="/products/new">
          <Plus className="h-8 w-8" />
          <span className="sr-only">New Creation</span>
        </Link>
      </Button>
    </div>
  );
}
