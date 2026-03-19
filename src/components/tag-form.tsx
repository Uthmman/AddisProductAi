"use client";

import { useState, useEffect }from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { WooTag } from "@/lib/types";
import { Loader2, Sparkles, Copy, CheckCircle2, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import Link from "next/link";

const TagFormSchema = z.object({
  name: z.string().min(2, "Tag name is required."),
  slug: z.string().optional(),
  description: z.string().optional(),
  seo_title: z.string().optional(),
  seo_focuskw: z.string().optional(),
  seo_metadesc: z.string().optional(),
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


  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: { 
        name: "", 
        slug: "", 
        description: "",
        seo_title: "",
        seo_focuskw: "",
        seo_metadesc: ""
    },
  });

  useEffect(() => {
    if (!tagId) {
      form.reset({ name: '', slug: '', description: '', seo_title: '', seo_focuskw: '', seo_metadesc: '' });
      setHasGenerated(false);
      return;
    }

    const fetchTagData = async () => {
      setIsFetching(true);
      setHasGenerated(false);
      try {
        const response = await fetch(`/api/products/tags/${tagId}`);
        if (!response.ok) {
            let message = 'Tag not found or could not be loaded.';
            try {
                const errorData = await response.json();
                message = errorData.message || message;
            } catch (e) {}
            throw new Error(message);
        }
        const fetchedTag: WooTag = await response.json();
        
        form.reset({
          name: fetchedTag.name,
          slug: fetchedTag.slug,
          description: fetchedTag.description,
          seo_title: fetchedTag.meta?._yoast_wpseo_title || '',
          seo_focuskw: fetchedTag.meta?._yoast_wpseo_focuskw || '',
          seo_metadesc: fetchedTag.meta?._yoast_wpseo_metadesc || '',
        });

      } catch (error: any) {
        toast({ variant: "destructive", title: "Error Loading Tag", description: `Could not load tag data: ${error.message}` });
      } finally {
        setIsFetching(false);
      }
    };

    fetchTagData();
  }, [tagId, form, toast]);


  const handleGenerateSeo = async () => {
    const tagName = form.getValues("name");
    if (!tagName) {
        toast({
            variant: "destructive",
            title: "Tag Name Required",
            description: "Please enter a name for the tag before generating SEO content.",
        });
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
        let message = 'Failed to generate SEO content.';
        try {
            const errorData = await response.json();
            message = errorData.message || message;
        } catch(e) {}
        throw new Error(message);
      }
      
      const content: AIGeneratedContent = await response.json();
      
      form.setValue('description', content.description);
      form.setValue('seo_title', content.title);
      form.setValue('seo_focuskw', content.focusKeyphrase);
      form.setValue('seo_metadesc', content.metaDescription);
      
      setHasGenerated(true);
      toast({ title: 'Success!', description: 'SEO content has been generated and populated.' });

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

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: `${fieldName} copied to clipboard.` });
  };

  const onSubmit = async (data: TagFormValues) => {
    setIsSaving(true);
    try {
      const url = tagId ? `/api/products/tags/${tagId}` : "/api/products/tags";
      const method = "POST"; 
      
      const submissionData = { 
          name: data.name,
          slug: data.slug,
          description: data.description,
          meta: {
              _yoast_wpseo_title: data.seo_title,
              _yoast_wpseo_metadesc: data.seo_metadesc,
              _yoast_wpseo_focuskw: data.seo_focuskw,
          }
      };

      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        let message = "Failed to save tag";
        try {
            const errorData = await response.json();
            message = errorData.message || message;
        } catch (e) {
            try {
                const text = await response.text();
                message = text || message;
            } catch (t) {}
        }
        throw new Error(message);
      }

      const savedTag: WooTag = await response.json();

      toast({
        title: "Success!",
        description: `Tag "${savedTag.name}" and SEO data have been saved.`,
      });
      
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/tags");
        router.refresh();
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };
  
    if (isFetching) {
        return (
            <div className="space-y-4 py-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        )
    }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Modern" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem><FormLabel>Slug (Optional)</FormLabel><FormControl><Input placeholder="e.g., modern" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea placeholder="The main description for the tag page..." {...field} rows={8} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
          </div>

          <div className="space-y-4">
            <Card className={hasGenerated ? "border-primary/50 bg-primary/5" : "bg-muted/30"}>
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                AI SEO Content 
                                {hasGenerated && <CheckCircle2 className="h-4 w-4 text-primary" />}
                            </CardTitle>
                            <CardDescription>Generate Yoast SEO data for this tag.</CardDescription>
                        </div>
                        <Button type="button" size="sm" onClick={handleGenerateSeo} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate Now
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="seo_title" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Yoast SEO Title</FormLabel>
                            <div className="relative">
                                <FormControl><Input {...field} className="text-sm pr-10" /></FormControl>
                                <Button variant="ghost" size="icon" type="button" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(field.value || '', 'SEO Title')}><Copy className="h-3 w-3" /></Button>
                            </div>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="seo_focuskw" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Yoast Focus Keyphrase</FormLabel>
                            <div className="relative">
                                <FormControl><Input {...field} className="text-sm pr-10" /></FormControl>
                                <Button variant="ghost" size="icon" type="button" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(field.value || '', 'Focus Keyphrase')}><Copy className="h-3 w-3" /></Button>
                            </div>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="seo_metadesc" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Yoast Meta Description</FormLabel>
                            <div className="relative">
                                <FormControl><Textarea {...field} rows={3} className="text-sm pr-10 resize-none" /></FormControl>
                                <Button variant="ghost" size="icon" type="button" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopy(field.value || '', 'Meta Description')}><Copy className="h-3 w-3" /></Button>
                            </div>
                        </FormItem>
                    )} />
                </CardContent>
            </Card>
          </div>
        </div>

        <Separator />

        <div className="flex flex-col sm:flex-row justify-end gap-4">
          <Button variant="outline" type="button" asChild className="w-full sm:w-auto">
            <Link href="/tags">
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Link>
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
