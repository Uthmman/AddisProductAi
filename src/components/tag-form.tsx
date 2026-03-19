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
import { Loader2, Sparkles, Copy, CheckCircle2, Save, X, UploadCloud, Image as ImageIcon, Search } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import Link from "next/link";
import { fileToBase64 } from "@/lib/utils";

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
  const [hasGenerated, setHasGenerated] = useState(false);
  const [isFetchingProducts, setIsFetchingProducts] = useState(false);
  const [linkedProducts, setLinkedProducts] = useState<WooProduct[]>([]);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);

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

        // If no image metadata is present, try to grab the latest product image automatically
        if (!initialImageSrc && tagId) {
            try {
                const prodRes = await fetch(`/api/products?tag=${tagId}&per_page=1`);
                if (prodRes.ok) {
                    const prodData = await prodRes.json();
                    if (prodData.products?.[0]?.images?.[0]) {
                        initialImageSrc = prodData.products[0].images[0].src;
                        initialThumbnailId = prodData.products[0].images[0].id;
                    }
                }
            } catch (err) {
                console.error("Failed to fetch automatic fallback image:", err);
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

      if (!response.ok) throw new Error('Failed to generate SEO content.');
      const content: AIGeneratedContent = await response.json();
      
      form.setValue('description', content.description);
      form.setValue('seo_title', content.title);
      form.setValue('seo_focuskw', content.focusKeyphrase);
      form.setValue('seo_metadesc', content.metaDescription);
      
      // If no image is set, also try to fetch the latest product image automatically
      if (!form.getValues('tag_image_src') && tagId) {
          const prodRes = await fetch(`/api/products?tag=${tagId}&per_page=1`);
          if (prodRes.ok) {
              const prodData = await prodRes.json();
              if (prodData.products?.[0]?.images?.[0]) {
                  form.setValue('tag_image_src', prodData.products[0].images[0].src);
                  form.setValue('thumbnail_id', prodData.products[0].images[0].id);
              }
          }
      }

      setHasGenerated(true);
      toast({ title: 'Success!', description: 'SEO content and fallback image generated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
      setIsGenerating(false);
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
        toast({ description: "Tag image uploaded and linked to library." });
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
    setIsImageDialogOpen(false);
    toast({ description: "Image selected and thumbnail ID captured." });
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

      if (!response.ok) {
          let errorMsg = 'Failed to save tag.';
          try {
              const errData = await response.json();
              errorMsg = errData.message || errorMsg;
          } catch (e) {
              const text = await response.text();
              errorMsg = text || errorMsg;
          }
          throw new Error(errorMsg);
      }
      const savedTag: WooTag = await response.json();

      toast({ title: "Success!", description: `Tag "${savedTag.name}" saved and thumbnail linked.` });
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
          
          {/* LEFT: BASIC INFO & IMAGE */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Tag Image</CardTitle>
                    <CardDescription>Official WooCommerce thumbnail & preview.</CardDescription>
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
                    <div className="flex flex-col gap-2">
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
                                    <DialogHeader><DialogTitle>Linked Product Images</DialogTitle></DialogHeader>
                                    <ScrollArea className="h-[400px] mt-4">
                                        {isFetchingProducts ? (
                                            <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                                        ) : linkedProducts.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">No products currently use this tag.</p>
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

          {/* RIGHT: CONTENT & SEO */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Page Description</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={handleGenerateSeo} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            AI Suggest
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem><FormControl><Textarea placeholder="Write a description for this tag page..." {...field} rows={12} className="resize-none" /></FormControl><FormMessage /></FormItem>
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
