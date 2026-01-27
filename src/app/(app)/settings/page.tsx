
'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSearchParams, usePathname } from 'next/navigation';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UploadCloud, X as XIcon, Info, Droplet, BrainCircuit, PanelLeft, Bot, Send, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { fileToBase64 } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { appCache } from '@/lib/cache';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';


const GeneralSettingsSchema = z.object({
  phoneNumber: z.string().optional(),
  facebookUrl: z.string().url().or(z.literal('')).optional(),
  instagramUrl: z.string().url().or(z.literal('')).optional(),
  telegramUrl: z.string().url().or(z.literal('')).optional(),
  tiktokUrl: z.string().url().or(z.literal('')).optional(),
  telegramUsername: z.string().optional(),
  commonKeywords: z.string().optional(),
  aiPromptInstruction: z.string().optional(),
});

type GeneralSettingsFormValues = z.infer<typeof GeneralSettingsSchema>;


function GeneralSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(GeneralSettingsSchema),
    defaultValues: {
      phoneNumber: '',
      facebookUrl: '',
      instagramUrl: '',
      telegramUrl: '',
      tiktokUrl: '',
      telegramUsername: '',
      commonKeywords: '',
      aiPromptInstruction: '',
    },
  });

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data: Settings = await res.json();
          form.reset(data);
        } else {
          throw new Error('Failed to load settings');
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Could not load your general settings. Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSettings();
  }, [form, toast]);

  const onSubmit = async (data: GeneralSettingsFormValues) => {
    setIsSaving(true);
    try {
        // Fetch existing settings to not overwrite other sections
        const settingsRes = await fetch('/api/settings');
        const existingSettings = await settingsRes.json();

        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...existingSettings, ...data }),
        });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      toast({
        title: 'Success!',
        description: 'Your general settings have been saved.',
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
    return <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
    </div>;
  }

  return (
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
              <FormField control={form.control} name="telegramUsername" render={({ field }) => (
                  <FormItem><FormLabel>Telegram Username</FormLabel><FormControl><Input placeholder="@your_username" {...field} /></FormControl><FormDescription>Used for mentions in generated content.</FormDescription><FormMessage /></FormItem>
              )} />
                <FormField control={form.control} name="tiktokUrl" render={({ field }) => (
                  <FormItem><FormLabel>TikTok URL</FormLabel><FormControl><Input placeholder="https://tiktok.com/@your-profile" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
          </CardContent>
        </Card>

          <Card>
          <CardHeader>
            <CardTitle>Content Generation</CardTitle>
            <CardDescription>Customize common keywords and provide general guidance to the AI.</CardDescription>
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
             <FormField control={form.control} name="aiPromptInstruction" render={({ field }) => (
                <FormItem>
                    <FormLabel>AI Content Generation Guide</FormLabel>
                    <FormControl><Textarea placeholder="e.g., Always maintain a professional and helpful tone. All content should be optimized for the Ethiopian market..." {...field} rows={5} /></FormControl>
                    <FormDescription>This general instruction will be included in all AI content generation prompts to guide the AI's tone and style.</FormDescription>
                    <FormMessage />
                </FormItem>
            )} />
          </CardContent>
        </Card>
        <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save General Settings
            </Button>
        </div>
      </form>
    </Form>
  )
}

const WatermarkSettingsSchema = z.object({
  watermarkImageUrl: z.string().optional(),
  watermarkPlacement: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center']).default('bottom-right'),
  watermarkScale: z.number().min(5).max(100).default(40),
  watermarkOpacity: z.number().min(0).max(1).default(0.7),
  watermarkPadding: z.number().min(0).max(25).default(5),
});

type WatermarkSettingsFormValues = z.infer<typeof WatermarkSettingsSchema>;

function WatermarkSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);

  const form = useForm<WatermarkSettingsFormValues>({
    resolver: zodResolver(WatermarkSettingsSchema),
    defaultValues: {
      watermarkImageUrl: '',
      watermarkPlacement: 'bottom-right',
      watermarkScale: 40,
      watermarkOpacity: 0.7,
      watermarkPadding: 5,
    },
  });
  
  const watermarkSettings = form.watch([
    "watermarkPlacement",
    "watermarkScale",
    "watermarkOpacity",
    "watermarkPadding",
  ]);

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data: Settings = await res.json();
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
          description: 'Could not load your watermark settings. Please try again later.',
        });
      } finally {
        setIsLoading(false);
      }
    }
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

  const getWatermarkPosition = () => {
    const [placement, scale, , padding] = watermarkSettings;
    const style: React.CSSProperties = {
      width: `${scale}%`,
      height: 'auto',
    };

    const paddingValue = `${padding}%`;

    switch (placement) {
      case 'bottom-right': style.bottom = paddingValue; style.right = paddingValue; break;
      case 'bottom-left': style.bottom = paddingValue; style.left = paddingValue; break;
      case 'top-right': style.top = paddingValue; style.right = paddingValue; break;
      case 'top-left': style.top = paddingValue; style.left = paddingValue; break;
      case 'center': style.top = '50%'; style.left = '50%'; style.transform = 'translate(-50%, -50%)'; break;
    }
    return style;
  };
  
    const onSubmit = async (data: WatermarkSettingsFormValues) => {
    setIsSaving(true);
    try {
        const settingsRes = await fetch('/api/settings');
        const existingSettings = await settingsRes.json();
        
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...existingSettings, ...data }),
        });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      toast({
        title: 'Success!',
        description: 'Your watermark settings have been saved.',
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
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
            <CardHeader>
              <CardTitle>Watermark Settings</CardTitle>
              <CardDescription>Upload a watermark and configure its appearance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <FormItem>
                  <FormLabel>Upload Watermark</FormLabel>
                  <FormDescription>PNG with transparency recommended.</FormDescription>
                  <div className="flex items-center gap-4 pt-2">
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

                {watermarkPreview && (
                <>
                  <Separator />
                  <div className="space-y-4 pt-2">
                    <FormLabel>Watermark Preview</FormLabel>
                      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted">
                        <Image 
                          src="https://picsum.photos/seed/preview/600/400" 
                          alt="Preview background" 
                          data-ai-hint="product background"
                          fill
                          className="object-cover" 
                        />
                          <div
                          className="absolute transition-all"
                          style={{
                              ...getWatermarkPosition(),
                              opacity: watermarkSettings[2],
                          }}
                          >
                            <Image
                              src={watermarkPreview}
                              alt="Watermark"
                              width={200}
                              height={200}
                              className="w-full h-auto"
                            />
                          </div>
                      </div>
                  </div>
                  <Separator />

                  <FormField
                    control={form.control}
                    name="watermarkPlacement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placement</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                                      value={[field.value]}
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
                                      value={[field.value]}
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
                                      value={[field.value]}
                                      onValueChange={(vals) => field.onChange(vals[0])}
                                  />
                              </FormControl>
                          </FormItem>
                      )}
                  />
                </>
              )}
            </CardContent>
        </Card>
        <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Watermark Settings
            </Button>
        </div>
      </form>
    </Form>
  )
}

const promptTitles: { [key: string]: string } = {
  generateWooCommerceProductContent: "Product Content Generation Prompt",
  generateBlogPost: "Blog Post Generation Prompt",
  generateSocialMediaPost: "Social Media Post Generation Prompt",
  generateTagSeo: "Tag SEO Content Generation Prompt",
  bulkProductAction: "Bulk Product Action Prompt",
  suggestBlogTopics: "Suggest Blog Topics Prompt",
  suggestProducts: "Suggest Products Prompt",
  suggestSeoKeywords: "Suggest SEO Keywords Tool Prompt",
};


function PromptSettings() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [prompts, setPrompts] = useState<{ [key: string]: string }>({});
    const [chats, setChats] = useState<{ [key: string]: { messages: { role: string; content: string }[], input: string, isLoading: boolean } }>({});

    useEffect(() => {
        async function fetchPrompts() {
            setIsLoading(true);
            try {
                const res = await fetch('/api/prompts');
                if (res.ok) {
                    const data = await res.json();
                    setPrompts(data);
                } else {
                    throw new Error('Failed to load prompts');
                }
            } catch (error) {
                toast({
                    variant: 'destructive',
                    title: 'Error',
                    description: 'Could not load your AI prompts. Please try again later.',
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchPrompts();
    }, [toast]);
    
    const handlePromptChange = (key: string, value: string) => {
        setPrompts(p => ({ ...p, [key]: value }));
    };

    const handleChatInputChange = (key: string, newInputValue: string) => {
      setChats(prev => ({
        ...prev,
        [key]: { ...prev[key], messages: prev[key]?.messages || [], input: newInputValue, isLoading: prev[key]?.isLoading || false },
      }));
    };
  
    const handleSendMessage = async (key: string) => {
      const chat = chats[key] || { messages: [], input: '', isLoading: false };
      if (!chat.input || chat.isLoading) return;
  
      const newMessages = [...(chat.messages || []), { role: 'user', content: chat.input }];
      
      setChats(prev => ({
        ...prev,
        [key]: { messages: newMessages, input: '', isLoading: true },
      }));
  
      try {
        const res = await fetch('/api/prompts/modify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request: chat.input,
            promptKey: key,
            originalPrompt: prompts[key],
          }),
        });
  
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to get AI response.');
        
        const botResponse = data.modifiedPrompt;
        handlePromptChange(key, botResponse);
  
        setChats(prev => ({
          ...prev,
          [key]: {
            ...prev[key],
            messages: [...newMessages, { role: 'model', content: `I've updated the prompt template. Review the changes in the text area.` }],
            isLoading: false
          }
        }));
        
        toast({ description: "Prompt template updated by AI." });
  
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
        setChats(prev => ({
          ...prev,
          [key]: { ...prev[key], messages: newMessages, isLoading: false }
        }));
      }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/prompts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(prompts),
            });
            if (!response.ok) {
                throw new Error('Failed to save prompts');
            }
            toast({
                title: 'Success!',
                description: 'Your AI prompts have been saved.',
            });
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Save Failed',
                description: 'There was an error saving your prompts.',
            });
        } finally {
            setIsSaving(false);
        }
    }

    if (isLoading) {
        return <Skeleton className="h-96 w-full" />;
    }

    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                <CardTitle>AI Prompt Templates</CardTitle>
                <CardDescription>
                    Edit the underlying prompts for each AI flow, or use the AI assistant to modify them for you.
                </CardDescription>
                </CardHeader>
                <CardContent>
                <Accordion type="single" collapsible className="w-full">
                    {Object.entries(prompts).map(([key, value]) => (
                    <AccordionItem value={key} key={key}>
                        <AccordionTrigger>{promptTitles[key] || key}</AccordionTrigger>
                        <AccordionContent>
                        <Textarea
                            value={value}
                            onChange={(e) => handlePromptChange(key, e.target.value)}
                            rows={15}
                            className="font-mono text-xs bg-muted/30"
                        />
                        <div className="mt-6 border-t pt-4">
                          <h4 className="font-semibold text-sm mb-2 flex items-center"><Bot className="mr-2 h-4 w-4 text-primary"/>Prompt Assistant</h4>
                          <Card className="p-3 mb-2 max-h-48 overflow-y-auto bg-muted/30">
                              <div className="space-y-3 text-xs">
                                  {(chats[key]?.messages || []).map((msg, i) => (
                                      <div key={i} className={`flex items-start gap-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                          {msg.role === 'model' && <Avatar className="h-5 w-5"><AvatarFallback><Bot size={12}/></AvatarFallback></Avatar>}
                                          <p className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.role === 'user' ? 'bg-primary/10' : 'bg-muted'}`}>
                                              {msg.content}
                                          </p>
                                          {msg.role === 'user' && <Avatar className="h-5 w-5"><AvatarFallback><User size={12}/></AvatarFallback></Avatar>}
                                      </div>
                                  ))}
                                  {chats[key]?.isLoading && (
                                      <div className="flex items-start gap-2">
                                          <Avatar className="h-5 w-5"><AvatarFallback><Bot size={12}/></AvatarFallback></Avatar>
                                          <p className="max-w-[85%] rounded-lg px-3 py-2 bg-muted flex items-center">
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                          </p>
                                      </div>
                                  )}
                                  {(chats[key]?.messages || []).length === 0 && (
                                    <p className="text-muted-foreground text-center p-2">Ask the assistant to modify the prompt above.</p>
                                  )}
                              </div>
                          </Card>
                          <div className="flex gap-2">
                            <Input
                              value={chats[key]?.input || ''}
                              onChange={(e) => handleChatInputChange(key, e.target.value)}
                              placeholder="e.g., 'Make it more professional...'"
                              disabled={chats[key]?.isLoading || isSaving}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handleSendMessage(key);
                                  }
                              }}
                            />
                            <Button onClick={() => handleSendMessage(key)} disabled={chats[key]?.isLoading || isSaving || !(chats[key]?.input)}>
                              <Send className="h-4 w-4"/>
                            </Button>
                          </div>
                        </div>
                        </AccordionContent>
                    </AccordionItem>
                    ))}
                </Accordion>
                </CardContent>
            </Card>
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Prompts
                </Button>
            </div>
        </div>
    )
}

function SidebarNav({ className, onLinkClick }: { className?: string, onLinkClick?: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get('tab') || 'general';

  const navItems = [
    { value: 'general', label: 'General', icon: Info },
    { value: 'watermark', label: 'Watermark', icon: Droplet },
    { value: 'prompts', label: 'AI Prompts', icon: BrainCircuit },
  ];

  return (
    <nav className={cn("flex flex-col space-y-1", className)}>
      {navItems.map((item) => (
        <Link
          key={item.value}
          href={`${pathname}?tab=${item.value}`}
          onClick={onLinkClick}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            activeTab === item.value
              ? "bg-muted hover:bg-muted font-semibold"
              : "hover:bg-muted/50",
            "justify-start"
          )}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}


function SettingsPageInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'general';
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  const navTitles: {[key:string]: string} = {
    general: 'General Settings',
    watermark: 'Watermark Settings',
    prompts: 'AI Prompt Templates'
  }

  const renderContent = () => {
    switch (tab) {
      case 'general': return <GeneralSettings />;
      case 'watermark': return <WatermarkSettings />;
      case 'prompts': return <PromptSettings />;
      default: return <GeneralSettings />;
    }
  };
  
  const renderSidebar = () => <SidebarNav onLinkClick={() => setIsSheetOpen(false)} />;

  return (
    <div className="container mx-auto py-10 max-w-7xl">
        <div className="md:hidden mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold font-headline">{navTitles[tab]}</h1>
            <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
                <Button variant="outline"><PanelLeft className="mr-2 h-4 w-4" /> Menu</Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[250px] p-4">
                <SheetTitle className="sr-only">Settings Menu</SheetTitle>
                <SheetDescription className="sr-only">Select a settings section from the menu.</SheetDescription>
                <h2 className="text-lg font-semibold mb-4">Settings</h2>
                {renderSidebar()}
            </SheetContent>
            </Sheet>
        </div>

        <div className="hidden md:block space-y-0.5 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Settings</h1>
            <p className="text-muted-foreground">
                Manage your application settings, AI prompts, and more.
            </p>
        </div>
        
        <Separator className="my-6 hidden md:block" />

        <div className="flex flex-col space-y-8 md:flex-row md:space-x-12 md:space-y-0">
            <aside className="hidden md:block md:w-1/5">
            {renderSidebar()}
            </aside>
            <div className="flex-1 w-full md:max-w-4xl lg:max-w-5xl">
            {renderContent()}
            </div>
        </div>
    </div>
  )
}


export default function SettingsPage() {
    return (
        <Suspense>
            <SettingsPageInner />
        </Suspense>
    )
}
