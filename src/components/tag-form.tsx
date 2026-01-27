
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
import { Loader2, Sparkles, Terminal } from "lucide-react";
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

const functionsPhpCode = `
function register_yoast_seo_meta_for_tags() {
    $yoast_meta_keys = [
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
        '_yoast_wpseo_focuskw'
    ];

    foreach ($yoast_meta_keys as $meta_key) {
        // Unregister first to avoid conflicts if previously registered incorrectly.
        unregister_term_meta('product_tag', $meta_key);
        
        register_term_meta('product_tag', $meta_key, array(
            'type'         => 'string',
            'description'  => 'Yoast SEO meta field for product tags',
            'single'       => true,
            'show_in_rest' => true, // This is the key setting.
        ));
    }
}
add_action('init', 'register_yoast_seo_meta_for_tags');
`;


export default function TagForm({ tagId, onSuccess }: TagFormProps) {
  const { toast } = useToast();
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [seoTitle, setSeoTitle] = useState('');
  const [focusKeyphrase, setFocusKeyphrase] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isMetaAvailable, setIsMetaAvailable] = useState(true);


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
      setSaveError(null);
      setFetchError(null);
      setIsMetaAvailable(true);
      return;
    }

    const fetchTagData = async () => {
      setIsFetching(true);
      setSaveError(null);
      setFetchError(null);
      setIsMetaAvailable(true);
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
        
        if (fetchedTag.meta === undefined) {
          setIsMetaAvailable(false);
          const errorDetail = `The API returned the tag object, but the 'meta' field with Yoast data is missing. Please ensure the PHP code to register these fields has been added to your active theme's functions.php file and that all server/plugin caches have been cleared.\n\n--------------------\nDATA RECEIVED:\n--------------------\n${JSON.stringify(fetchedTag, null, 2)}`;
          setFetchError(errorDetail);
          toast({
              variant: "destructive",
              title: "Warning: SEO Fields Missing",
              description: "Editable SEO fields could not be loaded from your server. See details in the form.",
          });
        } else {
          setIsMetaAvailable(true);
          setSeoTitle(fetchedTag.meta._yoast_wpseo_title || '');
          setFocusKeyphrase(fetchedTag.meta._yoast_wpseo_focuskw || '');
          setMetaDescription(fetchedTag.meta._yoast_wpseo_metadesc || '');
        }

      } catch (error: any) {
        toast({ variant: "destructive", title: "Error Loading Tag", description: `Could not load tag data: ${error.message}` });
        setFetchError(error.message);
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
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: error.message,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const onSubmit = async (data: TagFormValues) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const url = tagId ? `/api/products/tags/${tagId}` : "/api/products/tags";
      const method = tagId ? "PUT" : "POST";
      
      const submissionData: {
          name: string;
          slug?: string;
          description?: string;
          meta?: any;
      } = { ...data };

      if (isMetaAvailable) {
        submissionData.meta = {
          _yoast_wpseo_title: seoTitle,
          _yoast_wpseo_metadesc: metaDescription,
          _yoast_wpseo_focuskw: focusKeyphrase,
        };
      }

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

      // Verification Step
      if (tagId && isMetaAvailable) {
        const verifyResponse = await fetch(`/api/products/tags/${tagId}`);
        const verifiedTag: WooTag = await verifyResponse.json();
        
        const sentDataString = JSON.stringify(submissionData.meta, null, 2);
        const receivedDataString = JSON.stringify(verifiedTag.meta, null, 2);

        if (
          verifiedTag.meta?._yoast_wpseo_title !== seoTitle ||
          verifiedTag.meta?._yoast_wpseo_metadesc !== metaDescription ||
          verifiedTag.meta?._yoast_wpseo_focuskw !== focusKeyphrase
        ) {
            const detailedError = `The server did not save the SEO data correctly. This usually means the REST API fields are not correctly registered in your active theme's functions.php file, or a caching/security plugin is interfering.\n\n--------------------\nDATA SENT:\n--------------------\n${sentDataString}\n\n--------------------\nDATA RECEIVED:\n--------------------\n${receivedDataString}`;
            setSaveError(detailedError);
            throw new Error("Verification failed. See details below.");
        }
      }

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
                            <CardDescription>Generate or edit the SEO content for this tag.</CardDescription>
                        </div>
                        <Button type="button" onClick={handleGenerateSeo} disabled={isGenerating || !isMetaAvailable}>
                            {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    { !isMetaAvailable ? (
                       <Alert variant="destructive">
                         <Terminal className="h-4 w-4" />
                         <AlertTitle>Server Configuration Required</AlertTitle>
                         <AlertDescription>
                            <p className="mb-4">Your WordPress server is not providing the editable Yoast SEO fields. To fix this, you must add a PHP snippet to your site. Here is a checklist:</p>
                            <ol className="list-decimal list-inside space-y-2 mb-4">
                                <li>
                                    <strong>Edit `functions.php`:</strong> Add the following code to your **active** WordPress theme's `functions.php` file.
                                </li>
                                <li>
                                    <strong>Clear All Caches:</strong> After saving the file, go to your WordPress admin dashboard and clear all caches from plugins like LiteSpeed, WP Rocket, etc. Also clear any server-level cache from your hosting provider.
                                </li>
                                <li>
                                    <strong>Check Security Plugins:</strong> Temporarily disable security plugins (like Wordfence) to see if they are blocking the API response.
                                </li>
                            </ol>
                           <Label>Required PHP Code</Label>
                           <Textarea
                             readOnly
                             value={functionsPhpCode.trim()}
                             className="h-64 font-mono text-xs bg-destructive/5 text-destructive-foreground mt-2 whitespace-pre-wrap"
                           />
                         </AlertDescription>
                       </Alert>
                    ) : (
                        <div className="space-y-4">
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
                    )}
                </CardContent>
            </Card>

            {saveError && (
              <Alert variant="destructive" className="mt-6">
                <AlertTitle>Save Error Details</AlertTitle>
                <AlertDescription>
                  <Textarea
                    readOnly
                    value={saveError}
                    className="h-72 font-mono text-xs bg-destructive/5 text-destructive-foreground mt-2 whitespace-pre-wrap"
                  />
                </AlertDescription>
              </Alert>
            )}

             {fetchError && (
              <Alert variant="destructive" className="mt-6">
                <AlertTitle>Fetch Error Details</AlertTitle>
                <AlertDescription>
                  <Textarea
                    readOnly
                    value={fetchError}
                    className="h-72 font-mono text-xs bg-destructive/5 text-destructive-foreground mt-2 whitespace-pre-wrap"
                  />
                </AlertDescription>
              </Alert>
            )}


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
