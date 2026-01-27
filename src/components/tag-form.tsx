
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
import { Loader2, Sparkles, Terminal, Copy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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


export default function TagForm({ tagId, onSuccess }: TagFormProps) {
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSeo, setGeneratedSeo] = useState<AIGeneratedContent | null>(null);


  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: { name: "", slug: "", description: "" },
  });

  useEffect(() => {
    if (!tagId) {
      form.reset({ name: '', slug: '', description: '' });
      setGeneratedSeo(null);
      return;
    }

    const fetchTagData = async () => {
      setIsFetching(true);
      setGeneratedSeo(null);
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
    setGeneratedSeo(null);
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
      setGeneratedSeo(content);
      form.setValue('description', content.description);
      toast({ title: 'Success!', description: 'SEO content has been generated.' });

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
      const method = tagId ? "PUT" : "POST";
      
      const submissionData = { ...data };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save tag");
      }

      const savedTag: WooTag = await response.json();

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
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea placeholder="The main description for the tag page..." {...field} rows={6} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )} />
            
            <Separator />

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>SEO Content</CardTitle>
                            <CardDescription>Generate SEO content for manual entry.</CardDescription>
                        </div>
                        <Button type="button" onClick={handleGenerateSeo} disabled={isGenerating}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                     <Alert variant="default" className="mb-6">
                        <Terminal className="h-4 w-4" />
                        <AlertTitle>Manual Step Required</AlertTitle>
                        <AlertDescription>
                            The Yoast SEO plugin does not allow its tag data to be updated via the API. Please use the "Generate" button, then copy the content below and paste it into the corresponding Yoast fields in your WordPress admin dashboard for this tag.
                        </AlertDescription>
                    </Alert>
                    
                    {isGenerating && (
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    )}

                    {generatedSeo && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Yoast SEO Title</Label>
                                <div className="relative">
                                    <Input readOnly value={generatedSeo.title} />
                                    <Button variant="ghost" size="icon" type="button" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(generatedSeo.title, 'SEO Title')}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label>Yoast Focus Keyphrase</Label>
                                <div className="relative">
                                    <Input readOnly value={generatedSeo.focusKeyphrase} />
                                    <Button variant="ghost" size="icon" type="button" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(generatedSeo.focusKeyphrase, 'Focus Keyphrase')}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Yoast Meta Description</Label>
                                <div className="relative">
                                    <Textarea readOnly value={generatedSeo.metaDescription} rows={3} />
                                    <Button variant="ghost" size="icon" type="button" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopy(generatedSeo.metaDescription, 'Meta Description')}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex-shrink-0 flex justify-end pt-4 mt-4 border-t">
          <Button type="submit" disabled={isSaving || isFetching}>
            {(isSaving || isFetching) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tagId ? "Save Name & Description" : "Create Tag"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
