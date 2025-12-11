'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from '@/lib/types';

const SettingsSchema = z.object({
  phoneNumber: z.string().optional(),
  facebookUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  telegramUrl: z.string().url().or(z.literal('')).optional(),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      phoneNumber: '',
      facebookUrl: '',
      instagramUrl: '',
      telegramUrl: '',
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data: Settings = await response.json();
          form.reset(data);
        } else {
          throw new Error('Failed to load settings');
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load your settings. Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: SettingsFormValues) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Success!',
        description: 'Your settings have been saved.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: 'There was an error saving your settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 max-w-2xl">
        <h1 className="text-3xl font-bold font-headline mb-6">Settings</h1>
        <Card>
          <CardHeader>
             <Skeleton className="h-6 w-1/3" />
             <Skeleton className="h-4 w-2/3 mt-1" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-10 w-full" />
            </div>
             <div className="flex justify-end">
                <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <h1 className="text-3xl font-bold font-headline mb-6">Settings</h1>
      <Card>
         <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            This information will be used by the AI to create outbound links in product descriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                        <Input placeholder="+251..." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="facebookUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Facebook URL</FormLabel>
                        <FormControl>
                        <Input placeholder="https://facebook.com/your-page" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="instagramUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Instagram URL</FormLabel>
                        <FormControl>
                        <Input placeholder="https://instagram.com/your-profile" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="telegramUrl"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Telegram URL</FormLabel>
                        <FormControl>
                        <Input placeholder="https://t.me/your-channel" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Settings
                    </Button>
                </div>
                </form>
            </Form>
        </CardContent>
      </Card>
    </div>
  );
}
