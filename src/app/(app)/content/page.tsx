'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Sparkles } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const PostGeneratorSchema = z.object({
  topic: z.string().min(5, 'Please enter a topic with at least 5 characters.'),
});

type PostFormValues = z.infer<typeof PostGeneratorSchema>;

type BlogPost = {
  title: string;
  content: string;
};

export default function ContentPage() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<BlogPost | null>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostGeneratorSchema),
    defaultValues: {
      topic: '',
    },
  });

  const onSubmit = async (data: PostFormValues) => {
    setIsGenerating(true);
    setGeneratedPost(null);
    try {
      const response = await fetch('/api/content/generate-post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate post.');
      }
      
      const post = await response.json();
      setGeneratedPost(post);

      toast({
        title: 'Success!',
        description: 'Your blog post has been generated.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-bold font-headline mb-6">Content Generator</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Generate a Blog Post</CardTitle>
                    <CardDescription>
                        Enter a topic to generate a blog post optimized for SEO and engagement in the Addis Ababa market.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="topic"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Topic</FormLabel>
                                <FormControl>
                                <Textarea placeholder="e.g., 'Top 5 modern furniture trends in Ethiopia', 'How to choose the right sofa for your home in Addis Ababa'" {...field} rows={3} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isGenerating} className="w-full">
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Post
                        </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        <div className="space-y-6">
            <Card className={!generatedPost && !isGenerating ? 'hidden' : ''}>
                <CardHeader>
                    <CardTitle>Generated Content</CardTitle>
                    <CardDescription>
                        Review the AI-generated post below. You can copy it to your blog.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isGenerating && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Generating title...</p>
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-muted-foreground">Generating content...</p>
                            </div>
                        </div>
                    )}
                    {generatedPost && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Title</Label>
                                <Input readOnly value={generatedPost.title} className="text-lg font-bold h-auto"/>
                            </div>
                            <div className="space-y-2">
                                <Label>Content</Label>
                                <div
                                    className="prose prose-sm dark:prose-invert max-w-none p-3 border rounded-md h-96 overflow-y-auto bg-muted/20"
                                    dangerouslySetInnerHTML={{ __html: generatedPost.content }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
