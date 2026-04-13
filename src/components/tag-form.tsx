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
import { WooTag, WooProduct } from "@/lib/types";
import { Loader2, Sparkles, Copy, CheckCircle2, Save, X, UploadCloud, Image as ImageIcon, Search, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import Link from "next/link";
import { fileToBase64, cn } from "@/lib/utils";

const TagFormSchema = z.object({
  name: z.string().min(2, "Tag name is required."),
  slug: z.string().optional(),
  description: z.string().optional(),
  seo_title: z.string().optional(),
  seo_focuskw: z.string().optional(),
  seo_metadesc: z.string().optional(),
  tag_image_src: z.string().optional(),
  thumbnail_id: z.union([z.number(), z.string()]).optional(),
});

type TagFormValues = z.infer<typeof TagFormSchema>;

type AIGeneratedContent = {
    title: string;
    description: string;
    focusKeyphrase: string;
    metaDescription: string;
};

type TagFormProps = {
  tagId: number | null;
  onSuccess?: () => void;
};

export default function TagForm({ tagId, onSuccess }: TagFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState<WooProduct[]>([]);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{id: number, src: string}[]>([]);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: { 
        name: "", 
        slug: "", 
        description: "",
        seo_title: "",
        seo_focuskw: "",
        seo_metadesc: "",
        tag_image_src: "",
        thumbnail_id: "",
    },
  });

  useEffect(() => {
    if (!tagId) {
      form.reset({ name: '', slug: '', description: '', seo_title: '', seo_focuskw: '', seo_metadesc: '', tag_image_src: '', thumbnail_id: '' });
      setHasGenerated(false);
      setGalleryImages([]);
      return;
    }

    const fetchTagData = async () => {
      setIsFetching(true);
      setHasGenerated(false);
      try {
        const response = await fetch(`/api/products/tags/${tagId}`);
        if (!response.ok) throw new Error('Tag not found');
        const fetchedTag: WooTag = await response.json();
        
        let initialImageSrc = fetchedTag.meta?._zenbaba_tag_image || '';
        let initialThumbnailId = fetchedTag.meta?.thumbnail_id || '';

        // Fetch products to populate gallery images (up to 4)
        const prodRes = await fetch(`/api/products?tag=${tagId}&per_page=10`);
        if (prodRes.ok) {
            const prodData = await prodRes.json();
            const uniqueImages: {id: number, src: string}[] = [];
            const seenSrcs = new Set();

            for (const p of (prodData.products || [])) {
                if (p.images && p.images.length > 0 && !seenSrcs.has(p.images[0].src)) {
                    uniqueImages.push({ id: p.images[0].id, src: p.images[0].src });
                    seenSrcs.add(p.images[0].src);
                    if (uniqueImages.length >= 4) break;
                }
            }
            
            setGalleryImages(uniqueImages);

            if (!initialImageSrc && uniqueImages.length > 0) {
                initialImageSrc = uniqueImages[0].src;
                initialThumbnailId = uniqueImages[0].id;
            }
        }

        form.reset({
          name: fetchedTag.name,
          slug: fetchedTag.slug,
          description: fetchedTag.description,
          seo_title: fetchedTag.meta?._yoast_wpseo_title || '',
          seo_focuskw: fetchedTag.meta?._yoast_wpseo_focuskw || '',
          seo_metadesc: fetchedTag.meta?._yoast_wpseo_metadesc || '',
          tag_image_src: initialImageSrc,
          thumbnail_id: initialThumbnailId,
        });

      } catch (error: any) {
        toast({ variant: "destructive", title: "Error Loading Tag", description: error.message });
      } finally {
        setIsFetching(false);
      }
    };

    fetchTagData();
  }, [tagId, form, toast]);

  const handleGenerateSeo = async () => {
    const tagName = form.getValues("name");
    if (!tagName) {
        toast({ variant: "destructive", title: "Tag Name Required", description: "Please enter a name for the tag first." });
        return;
    }
    
    setIsGenerating(true);
    try {
      const response = await fetch('/api/tags/ai-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagName }),
      });

      if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ message: 'Failed to generate SEO content.' }));
          toast({ variant: "destructive", title: "Generation Failed", description: errorBody.message });
          return;
      }
      const content: AIGeneratedContent = await response.json();
      
      form.setValue('description', content.description);
      form.setValue('seo_title', content.title);
      form.setValue('seo_focuskw', content.focusKeyphrase);
      form.setValue('seo_metadesc', content.metaDescription);
      
      setHasGenerated(true);
      toast({ title: 'Success!', description: 'SEO content and furniture product images suggested.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const insertGalleryHtml = () => {
    const imagesToEmbed = galleryImages.length > 0 ? galleryImages : (form.getValues('tag_image_src') ? [{ id: Number(form.getValues('thumbnail_id')), src: form.getValues('tag_image_src') }] : []);
    
    if (imagesToEmbed.length === 0) {
        toast({ variant: "destructive", description: "Add images to the gallery first." });
        return;
    }

    const size = imagesToEmbed.length > 3 ? 150 : 250;
    let html = '\n<div class="tag-furniture-gallery" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">\n';
    
    imagesToEmbed.forEach(img => {
        html += `  <a href="${img.src}" target="_blank">\n`;
        html += `    <img src="${img.src}" class="alignnone size-medium wp-image-${img.id}" alt="${form.getValues('name')}" width="${size}" height="${size}" style="object-fit: cover; border-radius: 4px;" />\n`;
        html += `  </a>\n`;
    });
    
    html += '</div>\n';

    const currentDesc = form.getValues('description') || '';
    form.setValue('description', html + currentDesc);
    toast({ description: "Gallery HTML inserted at start of description." });
  };

  const handleAutoSyncImages = async () => {
    if (!tagId) {
        toast({ variant: "destructive", title: "Action Not Available", description: "Please save the tag first before synchronizing images." });
        return;
    }

    setIsSyncing(true);
    try {
        const response = await fetch(`/api/tags/${tagId}/sync-images`, { method: 'POST' });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Sync failed.');
        }
        const result = await response.json();
        toast({ title: 'Sync Complete', description: result.message });
        
        router.refresh();
        const tagRes = await fetch(`/api/products/tags/${tagId}`);
        const updatedTag = await tagRes.json();
        form.setValue('description', updatedTag.description);
        if (updatedTag.meta?._zenbaba_tag_image) {
            form.setValue('tag_image_src', updatedTag.meta._zenbaba_tag_image);
            form.setValue('thumbnail_id', updatedTag.meta.thumbnail_id);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
        setIsSyncing(false);
    }
  };

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
        form.setValue('tag_image_src', uploaded.src);
        form.setValue('thumbnail_id', uploaded.id);
        
        if (!galleryImages.some(img => img.id === uploaded.id)) {
            setGalleryImages(prev => [{ id: uploaded.id, src: uploaded.src }, ...prev].slice(0, 4));
        }

        toast({ description: "Tag image uploaded and linked." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
    }
  };

  const fetchProductsForTag = async () => {
    if (!tagId) return;
    setIsFetchingProducts(true);
    try {
        const response = await fetch(`/api/products?tag=${tagId}&per_page=50`);
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
    form.setValue('tag_image_src', src);
    form.setValue('thumbnail_id', id);
    
    if (!galleryImages.some(img => img.id === id)) {
        setGalleryImages(prev => [{ id, src }, ...prev].slice(0, 4));
    }

    setIsImageDialogOpen(false);
    toast({ description: "Product image selected for tag." });
  };

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${fieldName} copied.` });
  };

  const onSubmit = async (data: TagFormValues) => {
    setIsSaving(true);
    try {
      const url = tagId ? `/api/products/tags/${tagId}` : "/api/products/tags";
      
      const submissionData = { 
          name: data.name,
          slug: data.slug,
          description: data.description,
          meta: {
              _yoast_wpseo_title: data.seo_title,
              _yoast_wpseo_metadesc: data.seo_metadesc,
              _yoast_wpseo_focuskw: data.seo_focuskw,
              _zenbaba_tag_image: data.tag_image_src,
              thumbnail_id: data.thumbnail_id ? parseInt(data.thumbnail_id.toString(), 10) : 0,
          }
      };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) throw new Error('Failed to save tag.');
      const savedTag: WooTag = await response.json();

      toast({ title: "Success!", description: `Tag "${savedTag.name}" saved with furniture content and images.` });
      if (onSuccess) onSuccess();
      else { router.push("/tags"); router.refresh(); }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message });
    } finally {
      setIsSaving(false);
    }
  };
  
  if (isFetching) return <div className="space-y-4 py-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-40 w-full" /><Skeleton className="h-20 w-full" /></div>;

  const currentTagImageSrc = form.watch('tag_image_src');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tag Gallery</CardTitle>
                    <CardDescription>Main icon and gallery previews.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="relative aspect-square w-full max-w-[240px] mx-auto rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                        {currentTagImageSrc ? (
                            <Image src={currentTagImageSrc} alt="Tag image" fill className="object-cover" />
                        ) : (
                            <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                        )}
                        {currentTagImageSrc && (
                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg" onClick={() => { form.setValue('tag_image_src', ''); form.setValue('thumbnail_id', ''); }}>
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    
                    {galleryImages.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                            {galleryImages.map((img, idx) => (
                                <div 
                                    key={idx} 
                                    className={cn(
                                        "relative aspect-square rounded-md overflow-hidden border cursor-pointer hover:ring-2 hover:ring-primary transition-all",
                                        currentTagImageSrc === img.src && "ring-2 ring-primary"
                                    )}
                                    onClick={() => { form.setValue('tag_image_src', img.src); form.setValue('thumbnail_id', img.id); }}
                                >
                                    <Image src={img.src} alt={`Gallery ${idx}`} fill className="object-cover" />
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 pt-2">
                        <div className="relative">
                            <Button variant="outline" className="w-full" asChild>
                                <label className="cursor-pointer">
                                    <UploadCloud className="mr-2 h-4 w-4" />
                                    Upload Custom
                                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                </label>
                            </Button>
                        </div>
                        
                        {tagId && (
                            <Dialog open={isImageDialogOpen} onOpenChange={(open) => { setIsImageDialogOpen(open); if(open) fetchProductsForTag(); }}>
                                <DialogTrigger asChild>
                                    <Button variant="secondary" className="w-full">
                                        <Search className="mr-2 h-4 w-4" />
                                        Choose from Products
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl">
                                    <DialogHeader><DialogTitle>Images from Products with this Tag</DialogTitle></DialogHeader>
                                    <ScrollArea className="h-[400px] mt-4">
                                        {isFetchingProducts ? (
                                            <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                        ) : linkedProducts.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">No furniture products currently use this tag.</p>
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
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Rustic Styles" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="slug" render={({ field }) => (
                        <FormItem><FormLabel>Slug (Optional)</FormLabel><FormControl><Input placeholder="e.g., rustic-styles" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <CardTitle>Page Description</CardTitle>
                        <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={insertGalleryHtml}>
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Insert Gallery HTML
                            </Button>
                            <Button type="button" variant="secondary" size="sm" onClick={handleAutoSyncImages} disabled={isSyncing || !tagId}>
                                {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                Sync Product Images
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={handleGenerateSeo} disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                AI Suggest Content
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormControl><Textarea placeholder="Write a description for this tag page..." {...field} rows={12} className="resize-none font-mono text-sm" /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>

            <Card className={hasGenerated ? "border-primary/50 bg-primary/5" : "bg-muted/30"}>
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        Yoast SEO Tools 
                        {hasGenerated && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="seo_title" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs uppercase font-bold text-muted-foreground">SEO Title</FormLabel>
                            <div className="relative">
                                <FormControl><Input {...field} className="pr-10" /></FormControl>
                                <Button variant="ghost" size="icon" type="button" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(field.value || '', 'SEO Title')}><Copy className="h-3 w-3" /></Button>
                            </div>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="seo_focuskw" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Focus Keyphrase</FormLabel>
                            <div className="relative">
                                <FormControl><Input {...field} className="pr-10" /></FormControl>
                                <Button variant="ghost" size="icon" type="button" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(field.value || '', 'Focus Keyphrase')}><Copy className="h-3 w-3" /></Button>
                            </div>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="seo_metadesc" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs uppercase font-bold text-muted-foreground">Meta Description</FormLabel>
                            <div className="relative">
                                <FormControl><Textarea {...field} rows={3} className="pr-10 resize-none" /></FormControl>
                                <Button variant="ghost" size="icon" type="button" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopy(field.value || '', 'Meta Description')}><Copy className="h-3 w-3" /></Button>
                            </div>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-4 border-t pt-6">
          <Button variant="outline" type="button" asChild className="w-full sm:w-auto">
            <Link href="/tags"><X className="mr-2 h-4 w-4" /> Cancel</Link>
          </Button>
          <Button type="submit" disabled={isSaving || isFetching} className="w-full sm:w-auto">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {tagId ? "Save Changes" : "Create Tag"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
