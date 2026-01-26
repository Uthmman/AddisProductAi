"use client";

import { useState }from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { WooTag } from "@/lib/types";
import { Loader2, Sparkles, Copy, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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
  tag: WooTag | null;
  onSuccess: () => void;
};

export default function TagForm({ tag, onSuccess }: TagFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiContent, setAiContent] = useState<AIGeneratedContent | null>(null);

  const form = useForm<TagFormValues>({
    resolver: zodResolver(TagFormSchema),
    defaultValues: {
      name: tag?.name || "",
      slug: tag?.slug || "",
      description: tag?.description || "",
    },
  });

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
    setAiContent(null);
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
      setAiContent(content);
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
      const url = tag ? `/api/products/tags/${tag.id}` : "/api/products/tags";
      const method = tag ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
  
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ description: "Copied to clipboard!" });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-grow pr-6 -mr-6">
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
                            <CardDescription>Generate an SEO-friendly description for this tag page.</CardDescription>
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

                    {isGenerating && !aiContent && (
                        <div className="space-y-4 pt-4 animate-pulse">
                            <div className="space-y-2">
                                <div className="h-5 w-24 bg-muted rounded-md" />
                                <div className="h-10 w-full bg-muted rounded-md" />
                            </div>
                             <div className="space-y-2">
                                <div className="h-5 w-24 bg-muted rounded-md" />
                                <div className="h-20 w-full bg-muted rounded-md" />
                            </div>
                        </div>
                    )}

                    {aiContent && (
                        <div className="space-y-4 pt-4">
                            <Alert>
                                <Info className="h-4 w-4" />
                                <AlertTitle>Manual SEO Update Required</AlertTitle>
                                <AlertDescription>
                                    Copy the Focus Keyphrase and Meta Description below and paste them into the Yoast SEO fields for this tag in your WordPress admin.
                                </AlertDescription>
                            </Alert>
                             <div className="space-y-2">
                                <Label>Focus Keyphrase</Label>
                                <div className="relative">
                                    <Input readOnly value={aiContent.focusKeyphrase} />
                                    <Button variant="ghost" size="icon" className="absolute top-1/2 right-1 -translate-y-1/2 h-8 w-8" onClick={() => handleCopy(aiContent.focusKeyphrase)}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Meta Description</Label>
                                <div className="relative">
                                    <Textarea readOnly value={aiContent.metaDescription} rows={3} />
                                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => handleCopy(aiContent.metaDescription)}><Copy className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
        </ScrollArea>
        <div className="flex-shrink-0 flex justify-end pt-4 mt-4 border-t">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {tag ? "Save Changes" : "Create Tag"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
