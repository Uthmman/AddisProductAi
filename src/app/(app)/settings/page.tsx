'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, X as XIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { fileToBase64 } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SettingsSchema = z.object({
  phoneNumber: z.string().optional(),
  facebookUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  telegramUrl: z.string().url().or(z.literal('')).optional(),
  tiktokUrl: z.string().url().or(z.literal('')).optional(),
  commonKeywords: z.string().optional(),
  watermarkImageUrl: z.string().optional(),
  watermarkPlacement: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center']).default('bottom-right'),
  watermarkScale: z.number().min(5).max(100).default(40),
  watermarkOpacity: z.number().min(0).max(1).default(0.7),
  watermarkPadding: z.number().min(0).max(25).default(5),
});

type SettingsFormValues = z.infer<typeof SettingsSchema>;

export default function SettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      phoneNumber: '',
      facebookUrl: '',
      instagramUrl: '',
      telegramUrl: '',
      tiktokUrl: '',
      commonKeywords: '',
      watermarkImageUrl: '',
      watermarkPlacement: 'bottom-right',
      watermarkScale: 40,
      watermarkOpacity: 0.7,
      watermarkPadding: 5,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data: Settings = await response.json();
          // Provide defaults for new fields if they don't exist in the loaded data
          const defaults = {
             watermarkPlacement: 'bottom-right',
             watermarkScale: 40,
             watermarkOpacity: 0.7,
             watermarkPadding: 5,
          };
          form.reset({ ...defaults, ...data });
          if (data.watermarkImageUrl) {
            setWatermarkPreview(data.watermarkImageUrl);
          }
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

  const handleWatermarkChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const base64 = await fileToBase64(file);
      setWatermarkPreview(base64);
      form.setValue('watermarkImageUrl', base64);
    }
  };

  const removeWatermark = () => {
    setWatermarkPreview(null);
    form.setValue('watermarkImageUrl', '');
  };

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
        <h1 className="text-2xl sm:text-3xl font-bold font-headline mb-6">Settings</h1>
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
            {/* More skeletons */}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-bold font-headline mb-6">Settings</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                This information will be used by the AI to create links and suggest content.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="+251..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="facebookUrl" render={({ field }) => (
                    <FormItem><FormLabel>Facebook URL</FormLabel><FormControl><Input placeholder="https://facebook.com/your-page" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="instagramUrl" render={({ field }) => (
                    <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input placeholder="https://instagram.com/your-profile" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telegramUrl" render={({ field }) => (
                    <FormItem><FormLabel>Telegram URL</FormLabel><FormControl><Input placeholder="https://t.me/your-channel" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="tiktokUrl" render={({ field }) => (
                    <FormItem><FormLabel>TikTok URL</FormLabel><FormControl><Input placeholder="https://tiktok.com/@your-profile" {...field} /></FormControl><FormMessage /></FormItem>
                 )} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
              <CardDescription>Customize content generation and image watermarking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="commonKeywords" render={({ field }) => (
                  <FormItem>
                      <FormLabel>Common Keywords</FormLabel>
                      <FormControl><Textarea placeholder="zenbaba furniture, made in ethiopia, addis ababa..." {...field} /></FormControl>
                      <FormDescription>Comma-separated keywords that will be suggested on the product form.</FormDescription>
                      <FormMessage />
                  </FormItem>
              )} />
              <Separator />
              <div className="space-y-4 pt-2">
                <FormLabel>Watermark Settings</FormLabel>
                <FormDescription>Upload a watermark (PNG with transparency recommended) to apply to product images.</FormDescription>
                 <FormItem>
                    <div className="flex items-center gap-4">
                      <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center relative bg-muted/20">
                        {watermarkPreview ? (
                          <>
                            <Image src={watermarkPreview} alt="Watermark preview" fill className="object-contain p-2" />
                            <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={removeWatermark}>
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <div className="text-center text-muted-foreground p-2">
                            <UploadCloud className="mx-auto h-8 w-8" />
                          </div>
                        )}
                      </div>
                      <Input id="watermark-image" type="file" accept="image/png, image/jpeg" className="max-w-xs" onChange={handleWatermarkChange} />
                    </div>
                </FormItem>

                <FormField
                  control={form.control}
                  name="watermarkPlacement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placement</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select placement" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bottom-right">Bottom Right</SelectItem>
                          <SelectItem value="bottom-left">Bottom Left</SelectItem>
                          <SelectItem value="top-right">Top Right</SelectItem>
                          <SelectItem value="top-left">Top Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="watermarkScale"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Size: {field.value}% of image width</FormLabel>
                            <FormControl>
                                <Slider
                                    min={5} max={100} step={1}
                                    defaultValue={[field.value]}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="watermarkOpacity"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Opacity: {Math.round(field.value * 100)}%</FormLabel>
                            <FormControl>
                                <Slider
                                    min={0} max={1} step={0.05}
                                    defaultValue={[field.value]}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="watermarkPadding"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Padding: {field.value}% from edge</FormLabel>
                            <FormControl>
                                <Slider
                                    min={0} max={25} step={1}
                                    defaultValue={[field.value]}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
              </div>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
              <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save All Settings
              </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
