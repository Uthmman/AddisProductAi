"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { WooPost, WooProduct } from "@/lib/types";
import { Loader2, Save, X, Sparkles, UploadCloud, Image as ImageIcon, Search, PlusCircle, CheckCircle2, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { fileToBase64, cn } from "@/lib/utils";

const PostFormSchema = z.object({
  title: z.string().min(2, "Title is required."),
  content: z.string().min(10, "Content must be at least 10 characters."),
  status: z.enum(['publish', 'draft', 'pending', 'private']).default('draft'),
  featured_media: z.coerce.number().optional(),
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
  const [galleryImages, setGalleryImages] = useState<{id: number, src: string}[]>([]);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState<WooProduct[]>([]);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [featuredImageSrc, setFeaturedImageSrc] = useState<string | null>(null);

  const form = useForm<PostFormValues>({
    resolver: zodResolver(PostFormSchema),
    defaultValues: { 
        title: "", 
        content: "",
        status: "draft",
        featured_media: 0,
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
          featured_media: fetchedPost.featured_media || 0,
        });

        if (fetchedPost._embedded?.['wp:featuredmedia']?.[0]) {
            setFeaturedImageSrc(fetchedPost._embedded['wp:featuredmedia'][0].source_url);
        }
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error Loading Post", description: error.message });
      } finally {
        setIsFetching(false);
      }
    };

    fetchPostData();
  }, [postId, form, toast]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
        const base64 = await fileToBase64(file);
        const response = await fetch('/api/products/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_data: base64, image_name: file.name }),
        });

        if (!response.ok) throw new Error('Upload failed.');
        const uploaded = await response.json();
        
        setGalleryImages(prev => [{ id: uploaded.id, src: uploaded.src }, ...prev]);
        
        // If no featured image is set, use this one
        if (!form.getValues('featured_media')) {
            form.setValue('featured_media', uploaded.id);
            setFeaturedImageSrc(uploaded.src);
        }

        toast({ description: "Image uploaded to media library." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    }
  };

  const fetchRecentProducts = async () => {
    setIsFetchingProducts(true);
    try {
        const response = await fetch(`/api/products?per_page=50`);
        if (!response.ok) throw new Error('Failed to fetch products.');
        const data = await response.json();
        setLinkedProducts(data.products || []);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
        setIsFetchingProducts(false);
    }
  };

  const selectProductImage = (id: number, src: string) => {
    if (!galleryImages.some(img => img.id === id)) {
        setGalleryImages(prev => [{ id, src }, ...prev]);
    }
    
    if (!form.getValues('featured_media')) {
        form.setValue('featured_media', id);
        setFeaturedImageSrc(src);
    }

    setIsImageDialogOpen(false);
    toast({ description: "Product image added to post gallery." });
  };

  const insertGalleryHtml = () => {
    if (galleryImages.length === 0) {
        toast({ variant: "destructive", description: "Add images to the gallery first." });
        return;
    }

    const size = galleryImages.length > 3 ? 150 : 300;
    let html = '\n<div class="furniture-post-gallery" style="display: flex; flex-wrap: wrap; gap: 10px; margin: 20px 0;">\n';
    
    galleryImages.forEach(img => {
        html += `  <a href="${img.src}" target="_blank" style="flex: 1; min-width: ${size}px;">\n`;
        html += `    <img src="${img.src}" class="alignnone size-medium wp-image-${img.id}" alt="Furniture Craftsmanship" width="${size}" height="${size}" style="width: 100%; height: auto; object-fit: cover; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);" />\n`;
        html += `  </a>\n`;
    });
    
    html += '</div>\n';

    const currentContent = form.getValues('content');
    form.setValue('content', currentContent + html);
    toast({ description: "Gallery HTML inserted at end of content." });
  };

  const onSubmit = async (data: PostFormValues) => {
    setIsSaving(true);
    try {
      const url = postId ? `/api/posts/${postId}` : "/api/posts";
      const method = "POST"; // WP REST API often prefers POST for updates

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
                <div className="flex justify-between items-center">
                    <CardTitle>Post Content</CardTitle>
                    <Button type="button" variant="outline" size="sm" onClick={insertGalleryHtml}>
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Insert Gallery HTML
                    </Button>
                </div>
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
                    <FormControl><Textarea placeholder="<p>Welcome to Zenbaba Furniture...</p>" {...field} rows={25} className="font-mono text-sm" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Featured Image</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-muted border flex items-center justify-center">
                        {featuredImageSrc ? (
                            <Image src={featuredImageSrc} alt="Featured" fill className="object-cover" />
                        ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                        The featured image is set automatically when you add images to the gallery below.
                    </p>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Post Gallery</CardTitle>
                <CardDescription>Upload or choose product images to embed.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    {galleryImages.map((img, idx) => (
                        <div 
                            key={idx} 
                            className={cn(
                                "relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all",
                                form.getValues('featured_media') === img.id && "ring-2 ring-primary"
                            )}
                            onClick={() => { form.setValue('featured_media', img.id); setFeaturedImageSrc(img.src); }}
                        >
                            <Image src={img.src} alt={`Gallery ${idx}`} fill className="object-cover" />
                        </div>
                    ))}
                    <div className="relative aspect-square rounded-md border-2 border-dashed flex items-center justify-center hover:bg-muted cursor-pointer transition-colors">
                        <UploadCloud className="h-6 w-6 text-muted-foreground" />
                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={handleImageUpload} />
                    </div>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                    <Dialog open={isImageDialogOpen} onOpenChange={(open) => { setIsImageDialogOpen(open); if(open) fetchRecentProducts(); }}>
                        <DialogTrigger asChild>
                            <Button variant="secondary" className="w-full">
                                <Search className="mr-2 h-4 w-4" />
                                Choose from Products
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader><DialogTitle>Select Product Images</DialogTitle></DialogHeader>
                            <ScrollArea className="h-[400px] mt-4">
                                {isFetchingProducts ? (
                                    <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 p-1">
                                        {linkedProducts.flatMap(p => p.images).map((img, idx) => (
                                            <div key={idx} className="relative aspect-square cursor-pointer hover:opacity-80 transition-opacity rounded-md overflow-hidden border" onClick={() => selectProductImage(img.id, img.src)}>
                                                <Image src={img.src} alt="Product image" fill className="object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </DialogContent>
                    </Dialog>
                </div>

                <Separator />

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
                
                <div className="pt-2">
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/content?tab=blog">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Use AI Generator
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
