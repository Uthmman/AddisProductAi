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
    description: string;
    focusKeyphrase: string;
    metaDescription: string;
};

type TagFormProps = {
  tagId: number | null;
  onSuccess: () => void;
};

export default function TagForm({ tagId, onSuccess }: TagFormProps) {
  const { toast } = useToast();
  const [tag, setTag] = useState<WooTag | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusKeyphrase, setFocusKeyphrase] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  useEffect(() => {
    if (!tagId) {
      setTag(null);
      form.reset({ name: '', slug: '', description: '' });
      setFocusKeyphrase('');
      setMetaDescription('');
      return;
    }

    const fetchTagData = async () => {
      setIsFetching(true);
      try {
        const response = await fetch(`/api/products/tags/${tagId}`);
        if (!response.ok) throw new Error('Failed to fetch tag data');
        const fetchedTag: WooTag = await response.json();
        setTag(fetchedTag);
        form.reset({
          name: fetchedTag.name,
          slug: fetchedTag.slug,
          description: fetchedTag.description,
        });
        setFocusKeyphrase(fetchedTag.meta?._yoast_wpseo_focuskw || '');
        setMetaDescription(fetchedTag.meta?._yoast_wpseo_metadesc || '');
      } catch (error: any) {
        toast({ variant: "destructive", title: "Error", description: `Could not load tag data: ${error.message}` });
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
      const url = tagId ? `/api/products/tags/${tagId}` : "/api/products/tags";
      const method = tagId ? "PUT" : "POST";
      
      const meta = {
        _yoast_wpseo_focuskw: focusKeyphrase,
        _yoast_wpseo_metadesc: metaDescription,
      };

      const submissionData = { ...data, meta };
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save tag");
      }

      const savedTag = await response.json();
      toast({
        title: "Success!",
        description: `Tag "${savedTag.name}" has been saved.`,
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
