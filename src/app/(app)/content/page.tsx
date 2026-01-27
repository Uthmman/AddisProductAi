

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useForm, useForm as useSocialForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy, TrendingUp, Lightbulb, RefreshCw, Terminal, Send, Share2, Bot as BotIcon, PanelLeft, FileText } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WooProduct } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const PostGeneratorSchema = z.object({
  topic: z.string().min(5, 'Please enter a topic with at least 5 characters.'),
});

const SocialPostSchema = z.object({
  productId: z.string().min(1, 'Please select a product.'),
  platform: z.string().min(1, 'Please select a platform.'),
  topic: z.string().optional(),
  tone: z.enum(['descriptive', 'playful']),
  showPrice: z.boolean().default(false),
});

type PostFormValues = z.infer<typeof PostGeneratorSchema>;
type SocialPostFormValues = z.infer<typeof SocialPostSchema>;

type BlogPost = {
  title: string;
  content: string;
};

type SocialPost = {
    content: string;
    productImage?: string;
    productName?: string;
    productId: string;
};

function BlogTopicSuggestions({ onSelectTopic }: { onSelectTopic: (topic: string) => void }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchTopics() {
    setIsLoading(true);
    setError(null);
    setTopics([]);
    if (!hasFetched) {
        setHasFetched(true);
    }
    try {
      const res = await fetch('/api/content/suggest-blog-topics');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to fetch topic suggestions.');
      }
      setTopics(data.topics || []);
    } catch (err: any) {
      setError(err.message);
      console.error("Could not load topic suggestions:", err.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (!hasFetched) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>Get Topic Ideas</CardTitle>
                <CardDescription>Let AI suggest blog topics from your search data.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button className="w-full" onClick={fetchTopics} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                    Suggest Topics
                </Button>
            </CardContent>
        </Card>
      )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Suggested Topics</CardTitle>
          <CardDescription>AI-powered suggestions based on your top search queries.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Suggested Topics</CardTitle>
                <CardDescription>AI suggestions from your search queries.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={fetchTopics} disabled={isLoading}>
                <RefreshCw className="h-4 w-4" />
            </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {error && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Suggestion Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}
        {!error && topics.length === 0 && <p className="text-sm text-muted-foreground">No topic suggestions found based on your current search data.</p>}
        {!error && topics.map((topic, index) => (
          <Button key={index} variant="outline" className="text-left justify-start h-auto py-2" onClick={() => onSelectTopic(topic)}>
            {topic}
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}


function BlogGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostGeneratorSchema),
    defaultValues: { topic: '' },
  });

  const onSubmit = async (data: PostFormValues) => {
    setIsGenerating(true);
    setGeneratedPost(null);
    try {
      const response = await fetch('/api/content/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error((await response.json()).message || 'Failed to generate post.');
      }
      
      const post = await response.json();
      setGeneratedPost(post);
      toast({ title: 'Success!', description: 'Your blog post has been generated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectTopic = (topic: string) => {
    form.setValue('topic', topic);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div>
            <Card>
                <CardHeader>
                <CardTitle>Generate a Blog Post</CardTitle>
                <CardDescription>Enter a topic, or choose a suggestion to generate a blog post optimized for SEO.</CardDescription>
                </CardHeader>
                <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="topic" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Topic</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., 'Top 5 modern furniture trends in Ethiopia'" {...field} rows={3} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <Button type="submit" disabled={isGenerating} className="w-full">
                        {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Generate Post
                    </Button>
                    </form>
                </Form>
                </CardContent>
            </Card>
             <div className="mt-8">
                <BlogTopicSuggestions onSelectTopic={handleSelectTopic} />
            </div>
        </div>
      <GeneratedContentPreview isGenerating={isGenerating} post={generatedPost} />
    </div>
  );
}

function SocialPostGenerator({ productId: defaultProductId }: { productId: string | null }) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<SocialPost | null>(null);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const form = useSocialForm<SocialPostFormValues>({
    resolver: zodResolver(SocialPostSchema),
    defaultValues: { productId: defaultProductId || '', platform: 'telegram', topic: '', tone: 'playful', showPrice: false },
  });
  
  useEffect(() => {
    if (defaultProductId) {
      form.setValue('productId', defaultProductId);
    }
  }, [defaultProductId, form]);


  useEffect(() => {
    async function fetchProducts() {
      try {
        const response = await fetch('/api/products?per_page=100');
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load products.' });
      } finally {
        setIsLoadingProducts(false);
      }
    }
    fetchProducts();
  }, [toast]);

  const onSubmit = async (data: SocialPostFormValues) => {
    setIsGenerating(true);
    setGeneratedPost(null);
    try {
      const response = await fetch('/api/content/generate-social-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error((await response.json()).message || 'Failed to generate post.');
      }
      
      const postContent = await response.json();
      
      const selectedProduct = products.find(p => p.id === parseInt(data.productId, 10));

      const postWithImage: SocialPost = {
        ...postContent,
        productImage: selectedProduct?.images?.[0]?.src,
        productName: selectedProduct?.name,
        productId: data.productId,
      };

      setGeneratedPost(postWithImage);
      toast({ title: 'Success!', description: 'Your social media post has been generated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Generate a Social Media Post</CardTitle>
          <CardDescription>Select a product and platform to generate a promotional post.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="productId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Product</FormLabel>
                  {isLoadingProducts ? <Skeleton className="h-10 w-full" /> : (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {products.map(p => (
                                <SelectItem key={p.id} value={String(p.id)}>
                                    <div className="flex items-center gap-3">
                                        <Image
                                            src={p.images?.[0]?.src || "https://picsum.photos/seed/placeholder/40/40"}
                                            alt={p.name}
                                            width={24}
                                            height={24}
                                            className="h-6 w-6 rounded-sm object-cover"
                                        />
                                        <span>{p.name}</span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="platform" render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a platform" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="telegram">Telegram</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="topic" render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic / Angle (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'New arrival', 'Limited time offer'" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="tone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select a tone" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="descriptive">Descriptive</SelectItem>
                      <SelectItem value="playful">Playful & Interactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField
                control={form.control}
                name="showPrice"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Show Price</FormLabel>
                      <FormDescription>
                        Display the price in the post. If off, the price will be omitted entirely.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isGenerating || isLoadingProducts} className="w-full">
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Post
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <GeneratedContentPreview isGenerating={isGenerating} post={generatedPost} />
    </div>
  );
}

function GeneratedContentPreview({ isGenerating, post }: { isGenerating: boolean; post: BlogPost | SocialPost | null }) {
    const { toast } = useToast();
    const [isPosting, setIsPosting] = useState(false);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ description: "Content copied to clipboard!" });
    };

    const handlePostToTelegram = async () => {
        if (!post || !('productId' in post)) return;
        
        setIsPosting(true);
        try {
            const response = await fetch('/api/content/post-to-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: post.productId,
                    content: post.content,
                }),
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to post to Telegram.');
            }
            
            toast({ title: 'Success!', description: 'Post sent to Telegram channel.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Post Failed', description: error.message });
        } finally {
            setIsPosting(false);
        }
    };


  return (
    <Card className={!post && !isGenerating ? 'hidden md:block' : ''}>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
        <CardDescription>Review the AI-generated content. You can copy it or post it directly.</CardDescription>
      </CardHeader>
      <CardContent>
        {isGenerating && (
          <div className="space-y-4 animate-pulse">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
        {post && 'title' in post && ( // Blog Post
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <div className="relative">
                <Input readOnly value={post.title} className="text-lg font-bold h-auto pr-10" />
                <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(post.title)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content (HTML)</Label>
              <div className="relative">
                <Textarea readOnly value={post.content} className="h-96" />
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopy(post.content)}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
        {post && 'content' in post && !('title' in post) && ( // Social Post
            <div className="space-y-4">
                {post.productImage && (
                    <div className="space-y-2">
                        <Label>Product Image</Label>
                        <div className="relative aspect-square w-full max-w-sm mx-auto rounded-md overflow-hidden">
                           <Image
                                src={post.productImage}
                                alt={post.productName || 'Product Image'}
                                fill
                                className="object-cover"
                                data-ai-hint="product image"
                            />
                        </div>
                    </div>
                )}
                <div className="space-y-2">
                    <Label>Post Content</Label>
                     <div className="relative">
                        <Textarea readOnly value={post.content} className="h-96 whitespace-pre-wrap pr-12" />
                        <div className="absolute top-2 right-2 flex flex-col gap-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleCopy(post.content)} disabled={isPosting}>
                                            <Copy className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Copy Content</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" onClick={handlePostToTelegram} disabled={isPosting}>
                                            {isPosting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Post to Telegram</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}

function BulkActionBot() {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [request, setRequest] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    setIsProcessing(true);
    setResponse('');
    try {
      const res = await fetch('/api/content/bulk-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
      });

      if (!res.ok) {
        throw new Error((await res.json()).response || 'Failed to process bulk action.');
      }
      
      const data = await res.json();
      setResponse(data.response);
      toast({ title: 'Success!', description: 'The bulk action has been processed.' });

    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
      toast({ variant: 'destructive', title: 'Action Failed', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Bulk Product Actions</CardTitle>
          <CardDescription>Use natural language to perform bulk edits on your products.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulk-request">Your Request</Label>
              <Textarea
                id="bulk-request"
                placeholder="e.g., Put all products in the 'Bunk Bed' category on a 15% sale."
                rows={4}
                value={request}
                onChange={(e) => setRequest(e.target.value)}
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground">
                Examples: "Add the tag 'new-arrival' to all products in the 'Office Table' category." or "Remove all sales from products in 'Sofa Table'."
              </p>
            </div>
            <Button type="submit" disabled={isProcessing || !request} className="w-full">
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Run Bulk Action
            </Button>
          </form>
        </CardContent>
      </Card>
      { (isProcessing || response) && (
        <Card>
          <CardHeader>
            <CardTitle>Bot Response</CardTitle>
            <CardDescription>The result of your bulk action request.</CardDescription>
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Processing your request...</p>
              </div>
            ) : (
              <div className="p-4 bg-muted rounded-md text-sm whitespace-pre-wrap">
                {response}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

type SearchQuery = {
    keys: string[];
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
};

function SearchInsights() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [queries, setQueries] = useState<SearchQuery[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState('30');

    useEffect(() => {
        async function fetchSearchData() {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/search-console?days=${dateRange}`);
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.error || 'Failed to fetch Search Console data.');
                }
                setQueries(data);
            } catch (err: any) {
                setError(err.message);
                toast({
                    variant: 'destructive',
                    title: 'Loading Failed',
                    description: err.message,
                });
            } finally {
                setIsLoading(false);
            }
        }
        fetchSearchData();
    }, [toast, dateRange]);

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <CardTitle className="flex items-center">
                            <TrendingUp className="mr-2 h-5 w-5" />
                            Search Insights
                        </CardTitle>
                        <CardDescription>Top search queries from Google Search Console.</CardDescription>
                    </div>
                     <Select value={dateRange} onValueChange={setDateRange}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <SelectValue placeholder="Select date range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Last 7 Days</SelectItem>
                            <SelectItem value="30">Last 30 Days</SelectItem>
                            <SelectItem value="90">Last 90 Days</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-48 text-destructive bg-destructive/10 rounded-md">
                        <p className="font-semibold">Error loading data.</p>
                        <p className="text-sm px-4 text-center">{error}</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Query</TableHead>
                                    <TableHead className="text-right">Clicks</TableHead>
                                    <TableHead className="text-right">Impressions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {queries.length > 0 ? queries.map((query) => (
                                    <TableRow key={query.keys[0]}>
                                        <TableCell className="font-medium">{query.keys[0]}</TableCell>
                                        <TableCell className="text-right">{query.clicks.toLocaleString()}</TableCell>
                                        <TableCell className="text-right">{query.impressions.toLocaleString()}</TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">No query data available for this period.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function SidebarNav({ className, onLinkClick }: { className?: string, onLinkClick?: () => void }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const activeTab = searchParams.get('tab') || 'blog';

  const navItems = [
    { value: 'blog', label: 'Blog Post', icon: FileText },
    { value: 'social', label: 'Social Media Post', icon: Share2 },
    { value: 'bulk-action', label: 'Bulk Actions', icon: BotIcon },
    { value: 'search-insights', label: 'Search Insights', icon: TrendingUp },
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


function ContentPageInner() {
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab') || 'blog';
  const productId = searchParams.get('productId');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const renderContent = () => {
    switch (tab) {
      case 'blog': return <BlogGenerator />;
      case 'social': return <SocialPostGenerator productId={productId} />;
      case 'bulk-action': return <BulkActionBot />;
      case 'search-insights': return <SearchInsights />;
      default: return <BlogGenerator />;
    }
  };

  const renderSidebar = () => <SidebarNav onLinkClick={() => setIsSheetOpen(false)} />;

  return (
    <div className="container mx-auto py-10 max-w-7xl">
      <div className="md:hidden mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold font-headline">Content Tools</h1>
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline"><PanelLeft className="mr-2 h-4 w-4" /> Menu</Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[250px] p-4">
            <SheetTitle className="sr-only">Content Tools Menu</SheetTitle>
            <SheetDescription className="sr-only">Select a content tool from the menu.</SheetDescription>
             <h2 className="text-lg font-semibold mb-4">Content Tools</h2>
             {renderSidebar()}
          </SheetContent>
        </Sheet>
      </div>

      <div className="hidden md:block space-y-0.5 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold font-headline">Content Tools</h1>
        <p className="text-muted-foreground">
            Generate blog posts, social media updates, and perform bulk actions.
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
  );
}

export default function ContentPage() {
    return (
        <Suspense>
            <ContentPageInner />
        </Suspense>
    )
}
