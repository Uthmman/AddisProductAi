"use client";

import { useState, useEffect } from "react";
import { PlusCircle, Edit } from "lucide-react";
import { WooCategory } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { useToast } from "@/hooks/use-toast";

export default function CategoryTable() {
  const [categories, setCategories] = useState<WooCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<WooCategory | null>(null);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/products/categories?all=true");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
         throw new Error("Failed to fetch categories");
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
      toast({
        title: "Error",
        description: "Could not load categories.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [toast]);

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
  
  const getParentCategoryName = (parentId: number) => {
    const parent = categories.find(c => c.id === parentId);
    return parent ? parent.name : '—';
  }

  return (
    <div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold font-headline">Categories</h1>
                <Button onClick={openNewDialog}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New Category
                </Button>
            </div>
      
            {isLoading ? (
                <p>Loading categories...</p>
            ) : (
                <div className="rounded-md border">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead className="text-right">Product Count</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {categories.length > 0 ? categories.map((cat) => (
                        <TableRow key={cat.id}>
                            <TableCell className="font-medium">{cat.name}</TableCell>
                            <TableCell>{cat.slug}</TableCell>
                            <TableCell>{cat.parent ? getParentCategoryName(cat.parent) : '—'}</TableCell>
                            <TableCell className="text-right">{cat.count}</TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={5} className="h-24 text-center">
                                No categories found.
                            </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </div>
            )}
            
            <DialogContent className="sm:max-w-[425px]">
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
    </div>
  );
}
