
"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Edit, Trash2, Sparkles, Loader2, Image as ImageIcon, RefreshCw } from "lucide-react";
import { WooTag } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export default function TagTable() {
  const [tags, setTags] = useState<WooTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingTag, setDeletingTag] = useState<WooTag | null>(null);
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [isSyncingImages, setIsSyncingImages] = useState(false);
  const [syncingTagId, setSyncingTagId] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products/tags");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch tags");
      }
      setTags(data);
    } catch (error: any) {
      console.error("Failed to fetch tags:", error);
      toast({
        title: "Error Loading Tags",
        description: error.message || "Could not load product tags.",
        variant: "destructive"
      });
      setTags([]); 
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const openDeleteDialog = (tag: WooTag) => {
    setDeletingTag(tag);
  }

  const handleDeleteTag = async () => {
    if (!deletingTag) return;

    try {
      const response = await fetch(`/api/products/tags/${deletingTag.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete tag.');
      }

      toast({
        title: 'Success!',
        description: `Tag "${deletingTag.name}" has been deleted.`,
      });
      fetchTags();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not delete tag.',
        variant: 'destructive',
      });
    } finally {
      setDeletingTag(null);
    }
  };
  
  const handleBulkGenerate = async () => {
    setIsBulkGenerating(true);
    toast({
      title: "Bulk SEO Generation Started",
      description: "AI is generating SEO content and linking product images for tags. This may take a few minutes.",
    });

    try {
      const response = await fetch('/api/tags/bulk-ai-optimize', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Bulk generation failed.');
      }
      
      const result = await response.json();
      toast({
        title: "Bulk Generation Complete",
        description: result.message,
      });

      fetchTags(); 
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Bulk Generation Failed",
        description: error.message,
      });
    } finally {
      setIsBulkGenerating(false);
    }
  }

  const handleBulkImageSync = async () => {
    setIsSyncingImages(true);
    toast({
      title: "Image Synchronization Started",
      description: "Fetching unique furniture product images (250px) for every tag and updating descriptions.",
    });

    try {
      const response = await fetch('/api/tags/bulk-image-sync', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Image sync failed.');
      }
      
      const result = await response.json();
      toast({
        title: "Image Sync Complete",
        description: result.message,
      });

      fetchTags(); 
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message,
      });
    } finally {
      setIsSyncingImages(false);
    }
  }

  const handleSingleImageSync = async (tagId: number) => {
    setSyncingTagId(tagId);
    try {
        const response = await fetch(`/api/tags/${tagId}/sync-images`, { method: 'POST' });
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Sync failed.');
        }
        const result = await response.json();
        toast({ title: 'Sync Complete', description: result.message });
        fetchTags();
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Sync Failed', description: error.message });
    } finally {
        setSyncingTagId(null);
    }
  };

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Product Tags</h1>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button asChild className="w-full sm:w-auto" variant="outline" size="sm">
                  <Link href="/tags/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Tag
                  </Link>
              </Button>
              <Button onClick={handleBulkImageSync} className="w-full sm:w-auto" variant="secondary" disabled={isSyncingImages || isLoading} size="sm">
                  {isSyncingImages ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Sync All Images
              </Button>
              <Button onClick={handleBulkGenerate} className="w-full sm:w-auto" disabled={isBulkGenerating || isLoading} size="sm">
                  {isBulkGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  Generate All SEO
              </Button>
            </div>
        </div>
  
        {isLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
        ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                        <TableHead className="w-[120px] text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {tags.length > 0 ? tags.map((tag) => (
                        <TableRow key={tag.id}>
                            <TableCell>
                                {tag.meta?._zenbaba_tag_image ? (
                                    <div className="relative w-8 h-8 rounded-sm overflow-hidden border">
                                        <Image
                                            src={tag.meta._zenbaba_tag_image}
                                            alt={tag.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 flex items-center justify-center bg-muted rounded-sm border border-dashed">
                                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="font-medium">{tag.name}</TableCell>
                            <TableCell className="hidden md:table-cell max-w-sm">
                                <div 
                                    className="truncate text-sm text-muted-foreground [&_img]:h-5 [&_img]:w-5 [&_img]:inline-block [&_img]:align-middle [&_img]:mr-1 [&_img]:rounded-sm [&_img]:object-cover" 
                                    dangerouslySetInnerHTML={{ __html: tag.description || '—' }}
                                />
                            </TableCell>
                            <TableCell className="text-right">{tag.count}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleSingleImageSync(tag.id)} disabled={syncingTagId === tag.id}>
                                                {syncingTagId === tag.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent><p>Sync Product Images</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                <Button variant="ghost" size="icon" asChild>
                                    <Link href={`/tags/${tag.id}`}>
                                      <Edit className="h-4 w-4" />
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(tag)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No tags found.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
            </div>
        )}

        <AlertDialog open={!!deletingTag} onOpenChange={() => setDeletingTag(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This will permanently delete the <strong>{deletingTag?.name}</strong> tag. This action cannot be undone.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteTag} className={buttonVariants({ variant: "destructive" })}>
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
