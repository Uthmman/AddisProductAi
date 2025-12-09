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
import { Loader2, Sparkles, UploadCloud, X as XIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

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

type ImageState = {
  id?: number;
  src: string;
  alt: string;
  file?: File;
};

type GeneratingField = 'all' | 'name' | 'slug' | 'description' | 'short_description' | 'tags' | 'meta_data' | 'images' | null;


export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [generatingField, setGeneratingField] = useState<GeneratingField>(null);
  
  const [images, setImages] = useState<ImageState[]>([]);
  const [aiContent, setAiContent] = useState<Partial<AIProductContent & { images: { alt: string }[] }>>({});
  
  useEffect(() => {
    if (product) {
      setImages(product.images.map(img => ({ ...img, src: img.src || '', alt: img.alt || '' })));
      setAiContent({
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        slug: product.slug,
        tags: product.tags.map(t => t.name),
        meta_data: product.meta_data,
        attributes: product.attributes.map(attr => ({ name: attr.name, option: attr.options[0] })),
        images: product.images.map(img => ({ alt: img.alt })),
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
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newImageStates: ImageState[] = await Promise.all(
        newFiles.map(async file => {
          const src = await fileToBase64(file);
          return { src, alt: '', file };
        })
      );
      setImages(prev => [...prev, ...newImageStates]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setAiContent(p => {
        const newAiImages = p.images?.filter((_, i) => i !== index);
        return { ...p, images: newAiImages };
    });
  }
  
  const handleAltTextChange = (index: number, alt: string) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, alt } : img));
    setAiContent(p => {
        const newAiImages = p.images ? [...p.images] : [];
        if(newAiImages[index]) {
            newAiImages[index] = { ...newAiImages[index], alt };
        } else {
             newAiImages[index] = { alt };
        }
        return { ...p, images: newAiImages };
    });
  }

  const handleGenerate = async (values: FormValues, field: GeneratingField = 'all') => {
    if (images.length === 0) {
        toast({
            variant: "destructive",
            title: "Image Required",
            description: "Please upload at least one image before generating content.",
        });
        return;
    }

    setGeneratingField(field);
    try {
        const imagesData = await Promise.all(
            images.map(image => image.src.startsWith('data:image') ? image.src : null)
        );

        const validImagesData = imagesData.filter(d => d !== null) as string[];
        
        if (validImagesData.length === 0 && field !== null && field !== 'all' && field !== 'images' ) {
            toast({
                title: "Image data needed",
                description: "AI generation requires at least one newly uploaded image for context.",
                variant: "default",
            });
            setGeneratingField(null);
            return;
        }

        const response = await fetch('/api/products/ai-optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...values,
                images_data: validImagesData,
                price_etb: values.price_etb,
                fieldToGenerate: field,
                existingContent: aiContent
            }),
        });

        if (!response.ok) {
            throw new Error(`Failed to generate AI content for ${field}`);
        }

        const data: Partial<AIProductContent> = await response.json();
        
        setAiContent(prev => ({
          ...prev,
          ...data,
        }));
        
        if (data.images) {
            setImages(prevImages => {
                let aiImageIndex = 0;
                return prevImages.map(img => {
                    if (img.file || img.src.startsWith('data:image')) {
                        const newAlt = data.images?.[aiImageIndex]?.alt || img.alt;
                        aiImageIndex++;
                        return { ...img, alt: newAlt };
                    }
                    return img;
                });
            });
        }

        toast({
            title: "Content Generated",
            description: `AI-optimized content for ${field} has been populated.`,
        });

    } catch (error) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Generation Failed",
            description: `There was an error generating content for ${field}. Please try again.`,
        });
    } finally {
        setGeneratingField(null);
    }
  };

  const onSubmit = async () => {
    setIsSaving(true);

    try {
        const newFilesToUpload = images.filter(img => img.file);

        const uploadedImages = await Promise.all(
          newFilesToUpload.map(async (image) => {
            const base64 = await fileToBase64(image.file!);
            const response = await fetch('/api/products/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: base64, image_name: image.file!.name }),
            });
            if (!response.ok) throw new Error(`Image upload failed for ${image.file!.name}`);
            const uploaded = await response.json();
            return { ...uploaded, alt: image.alt };
          })
        );
        
        const existingImages = images.filter(img => !img.file);
        const finalImages = [...existingImages, ...uploadedImages].map((img) => ({
            id: img.id,
            src: img.src,
            alt: img.alt || aiContent.name || form.getValues('raw_name')
        }));

        const finalData = {
            name: aiContent.name || form.getValues('raw_name'),
            slug: aiContent.slug,
            regular_price: (aiContent.regular_price || form.getValues('price_etb')).toString(),
            description: aiContent.description,
            short_description: aiContent.short_description,
            tags: aiContent.tags?.map(tag => ({ name: tag })),
            images: finalImages,
            attributes: aiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
            meta_data: aiContent.meta_data,
        };

        const url = product ? `/api/products/${product.id}` : '/api/products';
        const method = product ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(finalData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to save product');
        }

        const savedProduct = await response.json();
        toast({
            title: "Success!",
            description: `Product "${savedProduct.name}" has been saved.`,
        });
        router.push('/dashboard');
        router.refresh();

    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Save Failed",
            description: error.message || "There was an error saving the product. Please try again.",
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

  const renderGenButton = (field: GeneratingField) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-accent/70 hover:text-accent"
            onClick={form.handleSubmit((values) => handleGenerate(values, field))}
            disabled={generatingField !== null}
          >
            {generatingField === field ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>AI Generate {field}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

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
                        <Label htmlFor="product-image">Product Images</Label>
                        <div className="grid grid-cols-3 gap-2">
                           {images.map((image, index) => (
                               <div key={index} className="relative aspect-square rounded-md overflow-hidden group">
                                   <Image src={image.src} alt={`Product preview ${index + 1}`} fill style={{objectFit: 'cover'}} data-ai-hint="product image"/>
                                   <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => removeImage(index)}>
                                        <XIcon className="h-4 w-4" />
                                   </Button>
                               </div>
                           ))}
                            <div className="w-full aspect-square rounded-md border-2 border-dashed border-muted-foreground/50 flex items-center justify-center relative overflow-hidden">
                               <div className="text-center text-muted-foreground p-2">
                                   <UploadCloud className="mx-auto h-8 w-8" />
                                   <p className="text-xs">Click to upload</p>
                               </div>
                               <Input id="product-image" type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleImageChange} multiple />
                           </div>
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
            <Button type="button" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={form.handleSubmit((values) => handleGenerate(values, 'all'))} disabled={generatingField !== null}>
              {generatingField === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Optimize All Fields
            </Button>
          </div>

          {/* RIGHT COLUMN: AI PREVIEW */}
          <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle>{product ? 'Product Content Preview' : 'AI Generated Content'}</CardTitle>
                    <CardDescription>Review and edit the content below. Use the ✨ icon to generate content for a specific field.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Product Name</Label>{renderGenButton('name')}</div>
                       <Input value={aiContent.name || ''} onChange={(e) => setAiContent(p => ({...p, name: e.target.value}))} placeholder="AI generated name will appear here..."/>
                   </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center"><Label>Slug</Label>{renderGenButton('slug')}</div>
                        <Input value={aiContent.slug || ''} onChange={(e) => setAiContent(p => ({ ...p, slug: e.target.value }))} placeholder="AI generated slug..." />
                    </div>
                   <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Description</Label>{renderGenButton('description')}</div>
                       <Textarea value={aiContent.description || ''} onChange={(e) => setAiContent(p => ({...p, description: e.target.value}))} rows={6} placeholder="AI generated description..."/>
                   </div>
                   <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Short Description</Label>{renderGenButton('short_description')}</div>
                       <Textarea value={aiContent.short_description || ''} onChange={(e) => setAiContent(p => ({...p, short_description: e.target.value}))} rows={4} placeholder="AI generated short description..."/>
                   </div>
                    <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Tags</Label>{renderGenButton('tags')}</div>
                       <Input value={aiContent.tags?.join(', ') || ''} onChange={(e) => setAiContent(p => ({...p, tags: e.target.value.split(',').map(t => t.trim())}))} placeholder="AI generated tags..."/>
                   </div>
                   
                   <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Product Gallery & Alt Text</Label>
                            {renderGenButton('images')}
                        </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                           {images.map((image, index) => (
                              <div key={index} className="space-y-2">
                                <Image src={image.src} alt={image.alt || `Product gallery image ${index + 1}`} width={150} height={150} className="rounded-md object-cover aspect-square" />
                                <Input 
                                  value={image.alt}
                                  onChange={(e) => handleAltTextChange(index, e.target.value)}
                                  placeholder={`Alt text for image ${index + 1}...`}
                                />
                              </div>
                           ))}
                       </div>
                   </div>

                   <div className="space-y-2">
                        <div className="flex justify-between items-center"><Label>Meta Description</Label>{renderGenButton('meta_data')}</div>
                        <Textarea value={getMetaValue('_yoast_wpseo_metadesc') || ''} onChange={(e) => setMetaValue('_yoast_wpseo_metadesc', e.target.value)} rows={3} placeholder="AI generated meta description for SEO..." />
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button type="button" size="lg" onClick={onSubmit} disabled={isSaving || generatingField !== null}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {product ? "Save Changes" : "Create Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
