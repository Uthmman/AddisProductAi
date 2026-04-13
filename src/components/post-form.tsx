"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { WooPost } from "@/lib/types";
import { Loader2, Save, X, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const PostFormSchema = z.object({
  title: z.string().min(2, "Title is required."),
  content: z.string().min(10, "Content must be at least 10 characters."),
  status: z.enum(['publish', 'draft', 'pending', 'private']).default('draft'),
});

type PostFormValues = z.infer<typeof PostFormSchema>;

type PostFormProps = {
  postId: number | null;
};

export default function PostForm({ postId }: PostFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: { 
        title: "", 
        content: "",
        status: "draft",
    },
  });

  useEffect(() => {
    if (!postId) return;

    const fetchPostData = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`/api/posts/${postId}`);
        if (!response.ok) throw new Error('Post not found');
        const fetchedPost: WooPost = await response.json();
        
        form.reset({
          title: fetchedPost.title.rendered,
          content: fetchedPost.content.rendered,
          status: fetchedPost.status,
        });
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error Loading Post", description: error.message });
      } finally {
        setIsFetching(false);
      }
    };

    fetchPostData();
  }, [postId, form, toast]);

  const onSubmit = async (data: PostFormValues) => {
    setIsSaving(true);
    try {
      const url = postId ? `/api/posts/${postId}` : "/api/posts";
      const method = postId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to save post.');
      
      toast({ title: "Success!", description: `Post has been saved.` });
      router.push("/posts");
      router.refresh();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) return (
    <div className="space-y-4">
      <Loader2 className="h-8 w-8 animate-spin mx-auto mt-10" />
      <p className="text-center text-muted-foreground">Loading post content...</p>
    </div>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Post Content</CardTitle>
                <CardDescription>Write your furniture blog post. Use HTML for formatting.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="e.g., The Best Woodworking Trends in Addis Ababa" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="content" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (HTML)</FormLabel>
                    <FormControl><Textarea placeholder="<p>Welcome to Zenbaba Furniture...</p>" {...field} rows={20} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Publishing Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="publish">Published</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                
                <div className="pt-4">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/content?tab=blog">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Use AI Content Tool
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-4 border-t pt-6">
          <Button variant="outline" type="button" asChild className="w-full sm:w-auto">
            <Link href="/posts"><X className="mr-2 h-4 w-4" /> Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {postId ? "Save Changes" : "Create Post"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
