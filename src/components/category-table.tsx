"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { PlusCircle, Edit, Trash2, Image as ImageIcon } from "lucide-react";
import { WooCategory } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import CategoryForm from "./category-form";
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

export default function CategoryTable() {
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WooCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<WooCategory | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products/categories?all=true");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch categories");
      }
      setCategories(data);
    } catch (error: any) {
      console.error("Failed to fetch categories:", error);
      toast({
        title: "Error",
        description: error.message || "Could not load categories.",
        variant: "destructive"
      });
      setCategories([]); // Clear categories on error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingCategory(null);
    fetchCategories(); // Refresh the list
  };
  
  const openEditDialog = (category: WooCategory) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  }

  const openNewDialog = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  }

  const openDeleteDialog = (category: WooCategory) => {
    setDeletingCategory(category);
  }

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;

    try {
      const response = await fetch(`/api/products/categories/${deletingCategory.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete category.');
      }

      toast({
        title: 'Success!',
        description: `Category "${deletingCategory.name}" has been deleted.`,
      });
      fetchCategories();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Could not delete category.',
        variant: 'destructive',
      });
    } finally {
      setDeletingCategory(null);
    }
  };
  
  const getParentCategoryName = (parentId: number) => {
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : '—';
  }

  return (
    <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline">Categories</h1>
            <Button onClick={openNewDialog} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Category
            </Button>
        </div>
  
        {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
        ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead className="w-[60px] sm:w-[80px]">Image</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Slug</TableHead>
                        <TableHead className="hidden lg:table-cell">Parent</TableHead>
                        <TableHead className="text-right">Products</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {categories.length > 0 ? categories.map((cat) => (
                        <TableRow key={cat.id}>
                            <TableCell>
                                {cat.image ? (
                                    <Image 
                                        src={cat.image.src} 
                                        alt={cat.name} 
                                        width={48} 
                                        height={48} 
                                        className="rounded-md object-cover w-12 h-12"
                                    />
                                ) : (
                                    <div className="w-12 h-12 flex items-center justify-center bg-muted rounded-md">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                )}
                            </TableCell>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell className="hidden md:table-cell">{cat.slug}</TableCell>
                            <TableCell className="hidden lg:table-cell">{cat.parent ? getParentCategoryName(cat.parent) : '—'}</TableCell>
                            <TableCell className="text-right">{cat.count}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end">
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => openDeleteDialog(cat)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No categories found.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
              </div>
            </div>
        )}
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-md w-[90%]">
                <DialogHeader>
                    <DialogTitle>{editingCategory ? 'Edit Category' : 'Create New Category'}</DialogTitle>
                </DialogHeader>
                <CategoryForm 
                    category={editingCategory} 
                    allCategories={categories}
                    onSuccess={handleFormSuccess} 
                />
            </DialogContent>
        </Dialog>

        <AlertDialog open={!!deletingCategory} onOpenChange={() => setDeletingCategory(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Are you sure you want to delete this category?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the <strong>{deletingCategory?.name}</strong> category.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteCategory} className={buttonVariants({ variant: "destructive" })}>
                    Delete
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
