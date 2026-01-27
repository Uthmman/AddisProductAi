"use client";

import { useState, useEffect }from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { WooTag } from "@/lib/types";
import { Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";

const TagFormSchema = z.object({
  name: z.string().min(2, "Tag name is required."),
  slug: z.string().optional(),
  description: z.string().optional(),
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
  onSuccess: () => void;
};

const getMetaValue = (key: string, meta_data: any[] | undefined) => {
    if (!meta_data) return '';
    const meta = meta_data.find(m => m.key === key);
    return meta ? meta.value : '';
}

export default function TagForm({ tagId, onSuccess }: TagFormProps) {
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [focusKeyphrase, setFocusKeyphrase] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  useEffect(() => {
    if (!tagId) {
      form.reset({ name: '', slug: '', description: '' });
      setSeoTitle('');
      setFocusKeyphrase('');
      setMetaDescription('');
      return;
    }

    const fetchTagData = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`/api/products/tags/${tagId}`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Tag not found or could not be loaded.');
        }
        const fetchedTag: WooTag = await response.json();
        
        form.reset({
          name: fetchedTag.name,
          slug: fetchedTag.slug,
          description: fetchedTag.description,
        });
        
        setSeoTitle(getMetaValue('_yoast_wpseo_title', fetchedTag.meta_data));
        setFocusKeyphrase(getMetaValue('_yoast_wpseo_focuskw', fetchedTag.meta_data));
        setMetaDescription(getMetaValue('_yoast_wpseo_metadesc', fetchedTag.meta_data));

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
        throw new Error((await response.json()).message || 'Failed to generate SEO content.');
      }
      
      const content: AIGeneratedContent = await response.json();
      setSeoTitle(content.title || '');
      setFocusKeyphrase(content.focusKeyphrase || '');
      setMetaDescription(content.metaDescription || '');
      form.setValue('description', content.description);
      toast({ title: 'Success!', description: 'SEO content has been generated.' });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: TagFormValues) => {
    setIsSaving(true);
    try {
      const meta_data = [
        { key: '_yoast_wpseo_title', value: seoTitle },
        { key: '_yoast_wpseo_focuskw', value: focusKeyphrase },
        { key: '_yoast_wpseo_metadesc', value: metaDescription },
      ];

      const submissionData = { ...data, meta_data };
      
      const url = tagId ? `/api/products/tags/${tagId}` : '/api/products/tags';
      const method = tagId ? 'PUT' : 'POST';

      const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save tag');
      }

      const savedTag: WooTag = await response.json();
      const newTagId = savedTag.id;
      
      // Verification step
      const verifyResponse = await fetch(`/api/products/tags/${newTagId}`);
      if (!verifyResponse.ok) {
        throw new Error("Verification failed: Could not re-fetch the saved tag.");
      }
      const verifiedTag: WooTag = await verifyResponse.json();
      
      let verificationPassed = true;
      if (seoTitle !== getMetaValue('_yoast_wpseo_title', verifiedTag.meta_data)) verificationPassed = false;
      if (focusKeyphrase !== getMetaValue('_yoast_wpseo_focuskw', verifiedTag.meta_data)) verificationPassed = false;
      if (metaDescription !== getMetaValue('_yoast_wpseo_metadesc', verifiedTag.meta_data)) verificationPassed = false;
      
      if (!verificationPassed) {
          throw new Error("Verification failed. The server accepted the update, but the SEO data was not saved correctly. Please check your WordPress `functions.php` file to ensure the Yoast meta fields are registered with the REST API.");
      }

      toast({
        title: "Success!",
        description: `Tag "${verifiedTag.name}" has been saved.`,
      });
      onSuccess();
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto pr-2 sm:pr-6 py-1">
          <div className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="e.g., Modern" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem><FormLabel>Slug (Optional)</FormLabel><FormControl><Input placeholder="e.g., modern" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <Separator />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>SEO Content</CardTitle>
                            <CardDescription>Generate or edit the SEO content for this tag.</CardDescription>
                        </div>
                        <Button type="button" onClick={handleGenerateSeo} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="description" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="AI-generated description will appear here..." {...field} rows={10} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="space-y-4 pt-4">
                         <div className="space-y-2">
                            <Label>Yoast SEO Title</Label>
                            <Input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder="Generate or enter an SEO title..."/>
                        </div>
                         <div className="space-y-2">
                            <Label>Yoast Focus Keyphrase</Label>
                            <Input value={focusKeyphrase} onChange={(e) => setFocusKeyphrase(e.target.value)} placeholder="Generate or enter a focus keyphrase..."/>
                        </div>
                        <div className="space-y-2">
                            <Label>Yoast Meta Description</Label>
                            <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={3} placeholder="Generate or enter a meta description..."/>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex-shrink-0 flex justify-end pt-4 mt-4 border-t">
          <Button type="submit" disabled={isSaving || isFetching}>
            {(isSaving || isFetching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tagId ? "Save Changes" : "Create Tag"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
