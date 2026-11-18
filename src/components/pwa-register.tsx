"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('Service Worker registration skipped/failed:', err);
      });
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Only show if user hasn't dismissed before in this session
      if (!sessionStorage.getItem('pwa_dismissed')) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstallBanner(false);
    sessionStorage.setItem('pwa_dismissed', 'true');
  };

  if (!showInstallBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3 p-3.5 bg-background/95 backdrop-blur-xl border border-primary/25 rounded-2xl shadow-2xl">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground truncate">Install Addis Product AI</p>
          <p className="text-[11px] text-muted-foreground truncate">Add to home screen for fast offline-capable access</p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={handleInstallClick} className="h-8 px-3 rounded-lg text-xs font-bold">
            Install
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDismiss} className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
