"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { WooTag } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import TagForm from "./tag-form";
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

export default function TagTable() {
  const [tags, setTags] = useState<WooTag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<WooTag | null>(null);
  const [deletingTag, setDeletingTag] = useState<WooTag | null>(null);
  const { toast } = useToast();

  const fetchTags = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products/tags");
      if (response.ok) {
        const data = await response.json();
        setTags(data);
      } else {
         throw new Error("Failed to fetch tags");
      }
    } catch (error) {
      console.error("Failed to fetch tags:", error);
      toast({
        title: "Error",
        description: "Could not load product tags.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingTag(null);
    fetchTags(); // Refresh the list
  };
  
  const openEditDialog = (tag: WooTag) => {
    setEditingTag(tag);
    setIsFormOpen(true);
  }

  const openNewDialog = () => {
    setEditingTag(null);
    setIsFormOpen(true);
  }

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
  
  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Product Tags</h1>
            <Button onClick={openNewDialog} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Tag
            </Button>
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
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {tags.length > 0 ? tags.map((tag) => (
                        <TableRow key={tag.id}>
                            <TableCell className="font-medium">{tag.name}</TableCell>
                            <TableCell className="hidden md:table-cell max-w-sm">
                                <p className="truncate text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: tag.description || '—' }}></p>
                            </TableCell>
                            <TableCell className="text-right">{tag.count}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(tag)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(tag)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No tags found.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
            </div>
        )}
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-2xl w-[90%] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{editingTag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
                    <DialogDescription>
                        {editingTag ? 'Edit the tag details and generate SEO content.' : 'Create a new tag. You can generate SEO content after creating.'}
                    </DialogDescription>
                </DialogHeader>
                <TagForm 
                    tag={editingTag} 
                    onSuccess={handleFormSuccess} 
                />
            </DialogContent>
        </Dialog>

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
