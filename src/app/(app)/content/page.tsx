'use client';

import { useState, useEffect } from 'react';
import { useForm, useForm as useSocialForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles, Copy } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WooProduct } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

const PostGeneratorSchema = z.object({
  topic: z.string().min(5, 'Please enter a topic with at least 5 characters.'),
});

const SocialPostSchema = z.object({
  productId: z.string().min(1, 'Please select a product.'),
  platform: z.string().min(1, 'Please select a platform.'),
  topic: z.string().optional(),
  tone: z.enum(['descriptive', 'playful']),
});

type PostFormValues = z.infer<typeof PostGeneratorSchema>;
type SocialPostFormValues = z.infer<typeof SocialPostSchema>;

type BlogPost = {
  title: string;
  content: string;
};

type SocialPost = {
    content: string;
};

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
      <Card>
        <CardHeader>
          <CardTitle>Generate a Blog Post</CardTitle>
          <CardDescription>Enter a topic to generate a blog post optimized for SEO.</CardDescription>
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
      <GeneratedContentPreview isGenerating={isGenerating} post={generatedPost} />
    </div>
  );
}

function SocialPostGenerator() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<SocialPost | null>(null);
  const [products, setProducts] = useState<WooProduct[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  const form = useSocialForm<SocialPostFormValues>({
    resolver: zodResolver(SocialPostSchema),
    defaultValues: { productId: '', platform: 'telegram', topic: '', tone: 'descriptive' },
  });

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
      
      const post = await response.json();
      setGeneratedPost(post);
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
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

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({ description: "Content copied to clipboard!" });
    };

  return (
    <Card className={!post && !isGenerating ? 'hidden' : ''}>
      <CardHeader>
        <CardTitle>Generated Content</CardTitle>
        <CardDescription>Review the AI-generated content. You can copy it to your clipboard.</CardDescription>
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
            <div className="space-y-2">
                <Label>Post Content</Label>
                <div className="relative">
                    <Textarea readOnly value={post.content} className="h-96 whitespace-pre-wrap" />
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopy(post.content)}><Copy className="h-4 w-4" /></Button>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}


export default function ContentPage() {
  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <h1 className="text-2xl sm:text-3xl font-bold font-headline mb-6">Content Generator</h1>
      <Tabs defaultValue="blog" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="blog">Blog Post</TabsTrigger>
          <TabsTrigger value="social">Social Media Post</TabsTrigger>
        </TabsList>
        <TabsContent value="blog">
          <BlogGenerator />
        </TabsContent>
        <TabsContent value="social">
          <SocialPostGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
