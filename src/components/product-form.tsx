
"use client";

import { useEffect, useState, useTransition, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
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
import { WooProduct, AIProductContent, WooCategory, Settings, WooTag } from "@/lib/types";
import { fileToBase64, cn, applyWatermark as applyWatermarkUtil } from "@/lib/utils";
import { Loader2, Sparkles, UploadCloud, X as XIcon, Check, Save, Image as ImageIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "./ui/command";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { useGooglePicker } from "@/hooks/use-google-picker";


// Simplified schema for form validation
const FormSchema = z.object({
  raw_name: z.string().min(3, "Product name is required"),
  material: z.string().optional(),
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
  fileName?: string;
};

// Represents a category in the UI state. Can be an existing one or a new one suggested by AI.
type DisplayCategory = {
    id?: number;
    name: string;
};

type GeneratingField = 'all' | 'name' | 'description' | 'tags' | 'meta_data' | 'attributes' | 'images' | 'categories' | 'regular_price' | null;

type SaveAction = 'publish' | 'draft';


export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [generatingField, setGeneratingField] = useState<GeneratingField>(null);
  
  const [images, setImages] = useState<ImageState[]>([]);
  const [aiContent, setAiContent] = useState<Partial<AIProductContent>>({});
  const [availableCategories, setAvailableCategories] = useState<WooCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<DisplayCategory[]>([]);
  const [allTags, setAllTags] = useState<WooTag[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [applyWatermark, setApplyWatermark] = useState(true);

  const handlePickerSelect = (data: any[]) => {
    const newImages = data.map(photo => ({
      src: photo.url,
      alt: '',
    }));
    setImages(prev => [...prev, ...newImages]);
  };

  const { openPicker, isPickerLoading } = useGooglePicker({
    onSelect: handlePickerSelect,
  });


  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      raw_name: product?.name || "",
      material: product?.attributes.find(a => a.name === "Material")?.options[0] || "",
      price_etb: parseFloat(product?.price || "0"),
      focus_keywords: product?.meta_data.find(m => m.key === '_yoast_wpseo_focuskw')?.value || product?.tags.map(t => t.name).join(', ') || "",
      amharic_name: product?.meta_data.find(m => m.key === 'amharic_name')?.value || "",
    },
  });

  // Pre-fill name from URL query param for new products
  useEffect(() => {
    if (!product) { // Only run for new products
      const suggestedName = searchParams.get('name');
      if (suggestedName) {
        form.setValue('raw_name', suggestedName);
      }
    }
  }, [searchParams, product, form]);

  // Load from local storage on mount
  useEffect(() => {
     if (product) {
        form.reset({
          raw_name: product.name || "",
          material: product.attributes.find(a => a.name === "Material")?.options[0] || "",
          price_etb: parseFloat(product.price || "0"),
          focus_keywords: product?.meta_data.find(m => m.key === '_yoast_wpseo_focuskw')?.value as string || product?.tags.map(t => t.name).join(', ') || "",
          amharic_name: product.meta_data.find(m => m.key === 'amharic_name')?.value as string || "",
        });
        setImages(product.images.map(img => ({ ...img, src: img.src || '', alt: img.alt || '' })));
        setSelectedCategories(product.categories.map(cat => ({ id: cat.id, name: cat.name })));
        setAiContent({
            name: product.name,
            sku: product.sku,
            description: product.description,
            short_description: product.short_description,
            slug: product.slug,
            tags: product.tags.map(t => t.name),
            categories: product.categories.map(c => c.name),
            meta_data: product.meta_data,
            attributes: product.attributes.map(attr => ({ name: attr.name, option: attr.options[0] })),
            images: product.images.map(img => ({ alt: img.alt })),
            regular_price: parseFloat(product.regular_price)
        });
    }
  }, [product, form]);


  useEffect(() => {
    async function fetchInitialData() {
        try {
            const [categoriesResponse, settingsResponse, tagsResponse] = await Promise.all([
                fetch('/api/products/categories?all=true'),
                fetch('/api/settings'),
                fetch('/api/products/tags')
            ]);
            
            if (categoriesResponse.ok) {
                const data: WooCategory[] = await categoriesResponse.json();
                setAvailableCategories(data);
            }
             if (tagsResponse.ok) {
                const data: WooTag[] = await tagsResponse.json();
                setAllTags(data);
            }
            if (settingsResponse.ok) {
                const data: Settings = await settingsResponse.json();
                setSettings(data);
                if (!data?.watermarkImageUrl) {
                    setApplyWatermark(false);
                }
            } else {
                 console.error("Failed to fetch settings");
                 setSettings({}); // Set to empty object on failure to prevent buttons from being permanently disabled
            }

        } catch (error) {
            console.error("Failed to fetch initial data", error);
            toast({
                title: "Error",
                description: "Could not load product categories, tags, or settings.",
                variant: "destructive"
            });
            setSettings({}); // Set to empty object on error
        }
    }
    fetchInitialData();
  }, [toast]);
  

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const newImageStates: ImageState[] = await Promise.all(
        newFiles.map(async file => {
          const src = await fileToBase64(file);
          return { src, alt: '', file, fileName: file.name };
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
        // The client sends original image sources (data URI for new, URL for existing) to the AI
        const imagesData = await Promise.all(
            images.map(image => image.src)
        );
        
        const currentAiContent = {
            ...aiContent,
            categories: selectedCategories.map(c => c.name)
        };
        
        const primaryCategoryName = selectedCategories[0]?.name;
        const primaryCategory = availableCategories.find(c => c.name === primaryCategoryName);

        const response = await fetch('/api/products/ai-optimize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...values,
                images_data: imagesData,
                price_etb: values.price_etb,
                fieldToGenerate: field,
                existingContent: currentAiContent,
                availableCategories,
                settings,
                primaryCategory,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.message || `Failed to generate AI content for ${field}`);
        }

        const data: Partial<AIProductContent> = await response.json();
        
        setAiContent(prev => ({
          ...prev,
          ...data,
        }));
        
        if (data.images) {
            setImages(prevImages => {
                return prevImages.map((img, index) => ({
                    ...img,
                    alt: data.images?.[index]?.alt || img.alt
                }));
            });
        }
        
        if (data.categories) {
            const aiSelectedCategories: DisplayCategory[] = data.categories.map(catName => {
                const existing = availableCategories.find(c => c.name.toLowerCase() === catName.toLowerCase());
                return existing ? { id: existing.id, name: existing.name } : { name: catName };
            });
            setSelectedCategories(aiSelectedCategories);
        }
        
        if (data.meta_data) {
            const focusKw = data.meta_data.find(m => m.key === '_yoast_wpseo_focuskw')?.value;
            if(focusKw) {
                form.setValue('focus_keywords', focusKw);
            }
        }


        toast({
            title: "Content Generated",
            description: `AI-optimized content for ${field} has been populated.`,
        });

    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "Generation Failed",
            description: error.message || `There was an error generating content for ${field}. Please try again.`,
        });
    } finally {
        setGeneratingField(null);
    }
  };

  const onSubmit = async (action: SaveAction) => {
    setIsSaving(true);

    try {
        const newFilesToUpload = images.filter(img => img.file || (img.src && !img.id));

        const uploadedImages = await Promise.all(
          newFilesToUpload.map(async (image) => {
            if (!image.file && !image.src.startsWith('http')) throw new Error("Image file is missing.");
            
            let imageBase64;
            let imageName = image.fileName || `product-image-${Date.now()}.jpg`;

            if (image.file) {
                imageBase64 = await fileToBase64(image.file);
            } else {
                imageBase64 = image.src; // Pass URL directly to upload-image API
            }
            
            // Apply watermark on the client-side if enabled, before sending to the uploader.
            if (applyWatermark && settings?.watermarkImageUrl && !imageBase64.startsWith('http')) {
              try {
                imageBase64 = await applyWatermarkUtil(imageBase64, settings.watermarkImageUrl, settings);
              } catch (watermarkError) {
                 console.error("Client-side watermarking failed, uploading original.", watermarkError);
                 toast({
                    variant: "destructive",
                    title: "Watermark Failed",
                    description: "Could not apply watermark, uploading original image.",
                 });
              }
            }

            const response = await fetch('/api/products/upload-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image_data: imageBase64, image_name: imageName }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Image upload failed for ${imageName}`);
            }

            const uploaded = await response.json();
            return { ...uploaded, alt: image.alt };
          })
        );
        
        const existingImages = images.filter(img => img.id).map(img => ({
          id: img.id,
          src: img.src,
          alt: img.alt
        }));

        const finalImages = [...existingImages, ...uploadedImages].map((img) => ({
            id: img.id,
            src: img.src,
            alt: img.alt || aiContent.name || form.getValues('raw_name')
        }));
        
        const finalCategories = selectedCategories.map(c => {
             // If it has an ID, it's an existing category. If not, it's a new one.
            return c.id ? { id: c.id } : { name: c.name };
        });

        // Combine meta data, ensuring user-input focus keyword is included
        const userFocusKeyword = form.getValues('focus_keywords');
        let finalMetaData = aiContent.meta_data ? [...aiContent.meta_data] : [];
        
        // Remove any existing focus keyword from AI content to avoid duplicates
        finalMetaData = finalMetaData.filter(m => m.key !== '_yoast_wpseo_focuskw');
        
        // Add the user-entered one
        if (userFocusKeyword) {
            finalMetaData.push({ key: '_yoast_wpseo_focuskw', value: userFocusKeyword });
        }


        const finalData = {
            name: aiContent.name || form.getValues('raw_name'),
            sku: aiContent.sku,
            slug: aiContent.slug,
            regular_price: (aiContent.regular_price || form.getValues('price_etb')).toString(),
            description: aiContent.description,
            short_description: aiContent.short_description,
            categories: finalCategories,
            tags: aiContent.tags?.map(tag => ({ name: tag })),
            images: finalImages,
            attributes: aiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
            meta_data: finalMetaData,
            status: action,
        };

        const url = product ? `/api/products/${product.id}` : '/api/products';
        const method = product ? 'PUT' : 'POST';
        const isNewProduct = !product;

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

        // If a new product was created, check for and optimize any new tags.
        if (isNewProduct && aiContent.tags && aiContent.tags.length > 0) {
            const newTagNames = aiContent.tags.filter(tagName => 
                !allTags.some(existingTag => existingTag.name.toLowerCase() === tagName.toLowerCase())
            );

            if (newTagNames.length > 0) {
                toast({
                    title: "Optimizing new tags...",
                    description: `Found ${newTagNames.length} new tags. Generating SEO content for them in the background.`
                });

                // Fire and forget, no need to await.
                fetch('/api/tags/bulk-optimize-specific', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tagNames: newTagNames }),
                }).then(async (res) => {
                    if (res.ok) {
                        const result = await res.json();
                        if (result.updatedCount > 0) {
                            toast({
                                title: "Background Task Complete",
                                description: `Successfully generated SEO for ${result.updatedCount} new tags.`
                            });
                        }
                    }
                }).catch(err => {
                    console.error("Failed to bulk optimize new tags:", err);
                });
            }
        }
        
        toast({
            title: "Success!",
            description: `Product "${savedProduct.name}" has been saved as a ${action}.`,
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
  
  const handleCategorySelect = useCallback((category: WooCategory) => {
    setSelectedCategories(prev => {
        const isSelected = prev.some(c => c.id === category.id);
        if (isSelected) {
            return prev.filter(c => c.id !== category.id);
        } else {
            return [...prev, { id: category.id, name: category.name }];
        }
    });
  }, []);
  
  const handleAddKeyword = (keyword: string) => {
    const currentKeywords = form.getValues('focus_keywords') || '';
    const newKeywords = currentKeywords ? `${currentKeywords}, ${keyword}` : keyword;
    form.setValue('focus_keywords', newKeywords);
  };
  
  const commonKeywords = useMemo(() => {
    if (!settings?.commonKeywords) return [];
    const keywords = settings.commonKeywords.split(',').map(kw => kw.trim()).filter(Boolean);
    return [...new Set(keywords)];
  }, [settings]);



  const renderGenButton = (field: GeneratingField, label: string) => (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-accent/70 hover:text-accent hidden sm:inline-flex"
              onClick={form.handleSubmit((values) => handleGenerate(values, field))}
              disabled={generatingField !== null || settings === null}
            >
              {generatingField === field ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>AI Generate {label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="sm:hidden"
        onClick={form.handleSubmit((values) => handleGenerate(values, field))}
        disabled={generatingField !== null || settings === null}
      >
        {generatingField === field ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate
      </Button>
    </>
  );

  return (
    <Form {...form}>
      <form onSubmit={(e) => e.preventDefault()} className="pb-24 lg:pb-8">
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
                        <Label>Product Images</Label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-2">
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
                        <div className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={openPicker}
                                disabled={isPickerLoading}
                            >
                                {isPickerLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImageIcon className="mr-2 h-4 w-4" />}
                                Select from Google Photos
                            </Button>
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
                        <FormItem>
                            <FormLabel>Focus Keywords</FormLabel>
                            <FormControl><Input placeholder="e.g., handmade, ethiopian craft" {...field} /></FormControl>
                             <div className="flex flex-wrap gap-1 pt-2">
                                {commonKeywords.map((kw, index) => (
                                    <Button key={`${kw}-${index}`} type="button" size="sm" variant="outline" className="text-xs h-7" onClick={() => handleAddKeyword(kw)}>
                                        {kw}
                                    </Button>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="amharic_name" render={({ field }) => (
                        <FormItem><FormLabel>Amharic Name</FormLabel><FormControl><Input placeholder="e.g., የባህል ልብስ" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </CardContent>
            </Card>
            <Button type="button" size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" onClick={form.handleSubmit((values) => handleGenerate(values, 'all'))} disabled={generatingField !== null || settings === null}>
              {generatingField === 'all' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              AI Optimize All Fields
            </Button>
             {settings?.watermarkImageUrl && (
                <div className="flex items-center space-x-2 justify-center">
                    <Switch
                        id="watermark-toggle"
                        checked={applyWatermark}
                        onCheckedChange={setApplyWatermark}
                        disabled={!settings.watermarkImageUrl}
                    />
                    <Label htmlFor="watermark-toggle" className="cursor-pointer">Apply Watermark to Images</Label>
                </div>
            )}
          </div>

          {/* RIGHT COLUMN: AI PREVIEW */}
          <div className="lg:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle>{product ? 'Product Content Preview' : 'AI Generated Content'}</CardTitle>
                    <CardDescription>Review and edit the content below. Use the ✨ icon to generate content for specific field groups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Product Name, SKU & Slug</Label>{renderGenButton('name', 'Name, SKU & Slug')}</div>
                       <Input value={aiContent.name || ''} onChange={(e) => setAiContent(p => ({...p, name: e.target.value}))} placeholder="AI generated name will appear here..."/>
                       <Input value={aiContent.sku || ''} onChange={(e) => setAiContent(p => ({ ...p, sku: e.target.value }))} placeholder="AI generated SKU..." className="mt-2" />
                       <Input value={aiContent.slug || ''} onChange={(e) => setAiContent(p => ({ ...p, slug: e.target.value }))} placeholder="AI generated slug..." className="mt-2" />
                   </div>
                   
                   <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Regular Price (ETB)</Label>{renderGenButton('regular_price', 'Price')}</div>
                       <Input type="number" value={aiContent.regular_price || ''} onChange={(e) => setAiContent(p => ({ ...p, regular_price: parseFloat(e.target.value) || 0 }))} placeholder="AI generated price..."/>
                   </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center"><Label>Categories</Label>{renderGenButton('categories', 'Categories')}</div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-start font-normal h-auto min-h-10 text-left">
                                    <div className="flex gap-1 flex-wrap">
                                      {selectedCategories.length > 0 ? (
                                        selectedCategories.map(cat => (
                                          <Badge key={cat.id || cat.name} variant={cat.id ? "secondary" : "default"}>
                                            {cat.name}
                                            {cat.id === undefined && <span className="ml-1 text-xs">(New)</span>}
                                          </Badge>
                                        ))
                                      ) : (
                                        <span className="text-muted-foreground">Select categories...</span>
                                      )}
                                    </div>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                    <CommandInput placeholder="Search categories..." />
                                    <CommandList>
                                        <CommandEmpty>No categories found.</CommandEmpty>
                                        <CommandGroup>
                                            {availableCategories.map((category) => {
                                                const isSelected = selectedCategories.some(c => c.id === category.id);
                                                return (
                                                    <CommandItem
                                                        key={category.id}
                                                        onSelect={() => {
                                                          handleCategorySelect(category);
                                                        }}
                                                    >
                                                      <div className={cn( "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", isSelected ? "bg-primary text-primary-foreground" : "opacity-50" )}>
                                                            <Check className={cn("h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} />
                                                        </div>
                                                        <span>{category.name}</span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>

                   <div className="space-y-2">
                       <div className="flex justify-between items-center"><Label>Descriptions</Label>{renderGenButton('description', 'Descriptions')}</div>
                       <Textarea value={aiContent.description || ''} onChange={(e) => setAiContent(p => ({...p, description: e.target.value}))} rows={10} placeholder="AI generated description..."/>
                       <Textarea value={aiContent.short_description || ''} onChange={(e) => setAiContent(p => ({...p, short_description: e.target.value}))} rows={4} placeholder="AI generated short description..." className="mt-2" />
                   </div>

                   <div className="space-y-2">
                        <div className="flex justify-between items-center"><Label>SEO Content (Tags & Meta)</Label>{renderGenButton('tags', 'SEO Content')}</div>
                        <Input value={aiContent.tags?.join(', ') || ''} onChange={(e) => setAiContent(p => ({...p, tags: e.target.value.split(',').map(t => t.trim())}))} placeholder="AI generated tags..."/>
                        <Input value={getMetaValue('_yoast_wpseo_focuskw') || ''} onChange={(e) => setMetaValue('_yoast_wpseo_focuskw', e.target.value)} placeholder="AI generated focus keyphrase for SEO..." className="mt-2" />
                        <Textarea value={getMetaValue('_yoast_wpseo_metadesc') || ''} onChange={(e) => setMetaValue('_yoast_wpseo_metadesc', e.target.value)} rows={3} placeholder="AI generated meta description for SEO..." className="mt-2" />
                    </div>
                   
                   <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Product Gallery & Alt Text</Label>
                            {renderGenButton('images', 'Alt Text')}
                        </div>
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                           {images.map((image, index) => (
                              <div key={index} className="space-y-2">
                                <Image src={image.src} alt={image.alt || `Product gallery image ${index + 1}`} width={150} height={150} className="rounded-md object-cover aspect-square w-full" />
                                <Input 
                                  value={image.alt}
                                  onChange={(e) => handleAltTextChange(index, e.target.value)}
                                  placeholder={`Alt text for image ${index + 1}...`}
                                />
                              </div>
                           ))}
                       </div>
                   </div>

                </CardContent>
            </Card>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-10 border-t bg-background/95 p-4 backdrop-blur-sm lg:static lg:mt-8 lg:flex lg:justify-end lg:gap-4 lg:border-none lg:bg-transparent lg:p-0">
          <div className="flex flex-col sm:flex-row justify-end gap-4">
            <Button type="button" size="lg" variant="outline" onClick={() => onSubmit('draft')} disabled={isSaving || generatingField !== null} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save as Draft
            </Button>
            <Button type="button" size="lg" onClick={() => onSubmit('publish')} disabled={isSaving || generatingField !== null} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {product ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

    