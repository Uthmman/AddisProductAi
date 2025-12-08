"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { WooProduct, AIProductContent } from "@/lib/types";
import { fileToBase64 } from "@/lib/utils";
import { Loader2, Sparkles, UploadCloud } from "lucide-react";

// Simplified schema for form validation
const FormSchema = z.object({
  raw_name: z.string().min(3, "Product name is required"),
  material: z.string().min(2, "Material is required"),
  price_etb: z.coerce.number().positive("Price must be a positive number."),
  focus_keywords: z.string().optional(),
  amharic_name: z.string().optional(),
});

type FormValues = z.infer<typeof FormSchema>;

type ProductFormProps = {
  product: WooProduct | null;
};

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(product?.images?.[0]?.src || null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [aiContent, setAiContent] = useState<Partial<AIProductContent & { images: { id?: number; src?: string; alt?: string }[] }>>({});
  
  useEffect(() => {
    if (product) {
      setAiContent({
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        slug: product.slug,
        tags: product.tags.map(t => t.name),
        meta_data: product.meta_data,
        attributes: product.attributes.map(attr => ({ name: attr.name, option: attr.options[0] })),
        images: product.images.map(img => ({ id: img.id, src: img.src, alt: img.alt })),
        regular_price: parseFloat(product.regular_price)
      });
    }
  }, [product]);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      raw_name: product?.name || "",
      material: product?.attributes.find(a => a.name === "Material")?.options[0] || "",
      price_etb: parseFloat(product?.price || "0"),
      focus_keywords: product?.tags.map(t => t.name).join(', ') || "",
      amharic_name: product?.meta_data.find(m => m.key === 'amharic_name')?.value || "",
    },
  });

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
    }
  };

  const handleGenerate = async (values: FormValues) => {
    if (!imageFile && !product?.images?.[0]?.src) {
        toast({
            variant: "destructive",
            title: "Image Required",
            description: "Please upload an image before generating content.",
        });
        return;
    }

    setIsGenerating(true);
    try {
        let imageDataUrl = imagePreview;
        let imageFileName = imageFile?.name;

        if (imageFile) {
            imageDataUrl = await fileToBase64(imageFile);
            imageFileName = imageFile.name;
        } else if(product?.images?.[0]?.src) {
            // This is a simplified approach. A real-world scenario would fetch the image and convert it.
            // For this mock, we will assume we can pass the URL and handle it on the backend, though the AI flow expects base64.
            // As a workaround, we'll tell the user to re-upload if they want to use AI on an existing image without changes.
            toast({ title: "Re-upload for AI", description: "To optimize an existing image, please re-upload it." });
            // A more robust solution might fetch the URL server-side and convert to base64.
            // We'll proceed with a placeholder to avoid breaking the flow.
            if(!imageDataUrl?.startsWith('data:image')) {
                 toast({
                    variant: "destructive",
                    title: "Image data not found",
                    description: "Please re-upload an image to use the AI feature.",
                });
                setIsGenerating(false);
                return;
            }
        }

        const response = await fetch('/api/products/ai-optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...values,
                image_data: imageDataUrl,
                image_name: imageFileName || 'product-image.jpg',
                price_etb: values.price_etb
            }),
        });

        if (!response.ok) {
            throw new Error('Failed to generate AI content');
        }

        const data = await response.json();
        setAiContent(data);
        toast({
            title: "Content Generated",
            description: "AI-optimized content has been populated for your review.",
        });

    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Generation Failed",
            description: "There was an error generating content. Please try again.",
        });
    } finally {
        setIsGenerating(false);
    }
  };

  const onSubmit = async () => {
    setIsSaving(true);
    
    // Combine original data, user edits, and AI content
    const finalData = {
        name: aiContent.name || product?.name || form.getValues('raw_name'),
        slug: aiContent.slug,
        regular_price: (aiContent.regular_price || form.getValues('price_etb')).toString(),
        description: aiContent.description || product?.description,
        short_description: aiContent.short_description || product?.short_description,
        tags: aiContent.tags?.map(tag => ({ name: tag })) || product?.tags,
        images: aiContent.images?.length ? aiContent.images.map(img => ({id: img.id, src: img.src, alt: img.alt})) : product?.images,
        attributes: aiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })) || product?.attributes,
        meta_data: aiContent.meta_data || product?.meta_data
    };

    try {
        const url = product ? `/api/products/${product.id}` : '/api/products';
        const method = product ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
        });

        if (!response.ok) {
            throw new Error('Failed to save product');
        }

        const savedProduct = await response.json();
        toast({
            title: "Success!",
            description: `Product "${savedProduct.name}" has been saved.`,
        });
        router.push('/dashboard');
        router.refresh();

    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: "There was an error saving the product. Please try again.",
        });
    } finally {
        setIsSaving(false);
    }
  };

  const getMetaValue = (key: string) => {
    const meta = aiContent.meta_data?.find(m => m.key === key);
    return meta ? meta.value : '';
  }

  const setMetaValue = (key: string, value: string) => {
    setAiContent(p => {
      const existingMeta = p.meta_data?.filter(m => m.key !== key) || [];
      return { ...p, meta_data: [...existingMeta, { key, value }] };
    });
  }


  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT COLUMN: USER INPUT */}
          <div className="lg:col-span-1 flex flex-col gap-6">
             <Card>
                <CardHeader>
                    <CardTitle>Product Details</CardTitle>
                    <CardDescription>Enter the core information for your product.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="product-image">Product Image</Label>
                        <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
                           {imagePreview ? (
                               <Image src={imagePreview} alt="Product preview" fill style={{objectFit: 'cover'}} data-ai-hint="product image"/>
                           ) : (
                               <div className="text-center text-muted-foreground p-4">
                                   <UploadCloud className="mx-auto h-12 w-12" />
                                   <p>Click to upload</p>
                               </div>
                           )}
                           <Input id="product-image" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageChange} />
                        </div>
                    </div>
                    
                    <FormField control={form.control} name="raw_name" render={({ field }) => (
                        <FormItem><FormLabel>Product Name (Raw)</FormLabel><FormControl><Input placeholder="e.g., Traditional Dress" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                     <FormField control={form.control} name="material" render={({ field }) => (
                        <FormItem><FormLabel>Material</FormLabel><FormControl><Input placeholder="e.g., Cotton" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="price_etb" render={({ field }) => (
                        <FormItem><FormLabel>Price (ETB)</FormLabel><FormControl><Input type="number" placeholder="e.g., 1500" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="focus_keywords" render={({ field }) => (
                        <FormItem><FormLabel>Focus Keywords</FormLabel><FormControl><Input placeholder="e.g., handmade, ethiopian craft" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="amharic_name" render={({ field }) => (
                        <FormItem><FormLabel>Amharic Name</FormLabel><FormControl><Input placeholder="e.g., የባህል ልብስ" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>
            <Button type="button" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={form.handleSubmit(handleGenerate)} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Optimize & Generate
            </Button>
          </div>

          {/* RIGHT COLUMN: AI PREVIEW */}
          <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle>AI Generated Content</CardTitle>
                    <CardDescription>Review and edit the AI-generated content below before saving.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                       <Label>Product Name</Label>
                       <Input value={aiContent.name || ''} onChange={(e) => setAiContent(p => ({...p, name: e.target.value}))} placeholder="AI generated name will appear here..."/>
                   </div>
                    <div className="space-y-2">
                        <Label>Slug</Label>
                        <Input value={aiContent.slug || ''} onChange={(e) => setAiContent(p => ({ ...p, slug: e.target.value }))} placeholder="AI generated slug..." />
                    </div>
                   <div className="space-y-2">
                       <Label>Description</Label>
                       <Textarea value={aiContent.description || ''} onChange={(e) => setAiContent(p => ({...p, description: e.target.value}))} rows={6} placeholder="AI generated description..."/>
                   </div>
                   <div className="space-y-2">
                       <Label>Short Description</Label>
                       <Textarea value={aiContent.short_description || ''} onChange={(e) => setAiContent(p => ({...p, short_description: e.target.value}))} rows={4} placeholder="AI generated short description..."/>
                   </div>
                    <div className="space-y-2">
                       <Label>Tags</Label>
                       <Input value={aiContent.tags?.join(', ') || ''} onChange={(e) => setAiContent(p => ({...p, tags: e.target.value.split(',').map(t => t.trim())}))} placeholder="AI generated tags..."/>
                   </div>
                   <div className="space-y-2">
                       <Label>Image Alt Text</Label>
                       <Input value={aiContent.images?.[0]?.alt || ''} onChange={(e) => setAiContent(p => ({...p, images: [{...p.images?.[0], alt: e.target.value}]}))} placeholder="AI generated image alt text..."/>
                   </div>
                   <div className="space-y-2">
                        <Label>Meta Description</Label>
                        <Textarea value={getMetaValue('_yoast_wpseo_metadesc') || ''} onChange={(e) => setMetaValue('_yoast_wpseo_metadesc', e.target.value)} rows={3} placeholder="AI generated meta description for SEO..." />
                    </div>
                    <div className="space-y-2">
                        <Label>Product Gallery</Label>
                        <div className="grid grid-cols-4 gap-2">
                            {aiContent.images?.map((image, index) => (
                                image.src && <Image key={index} src={image.src} alt={image.alt || `Product gallery image ${index + 1}`} width={100} height={100} className="rounded-md object-cover" />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button type="button" size="lg" onClick={onSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {product ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
