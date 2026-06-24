'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Package } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        toast({ title: 'Welcome back!', description: 'Redirecting...' });
        
        // Redirect to the originally intended page or dashboard
        const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
        router.push(callbackUrl);
        router.refresh();
      } else {
        const error = await res.json();
        throw new Error(error.message || 'Invalid password');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-xl border-primary/10">
      <CardHeader className="text-center space-y-1">
        <div className="flex justify-center mb-4">
          <div className="bg-primary p-3 rounded-full shadow-lg">
            <Package className="h-8 w-8 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-3xl font-headline">Zenbaba Furniture</CardTitle>
        <CardDescription className="text-sm font-medium">
          Addis Product Management AI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Security Password</Label>
            <div className="relative">
              <Input
                id="password"
                type="password"
                placeholder="Enter your access code"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10"
                autoFocus
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <Button type="submit" className="w-full h-11" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Access Dashboard'
            )}
          </Button>
        </form>
        <p className="text-[10px] text-center text-muted-foreground mt-6 uppercase tracking-widest">
          Authorized Personnel Only • Addis Ababa, Ethiopia
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
