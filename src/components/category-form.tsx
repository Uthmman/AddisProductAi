"use client";

import { useState, useEffect }from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { WooCategory } from "@/lib/types";
import { Loader2, UploadCloud, X as XIcon } from "lucide-react";
import { fileToBase64 } from "@/lib/utils";

const CategoryFormSchema = z.object({
  name: z.string().min(2, "Category name is required."),
  slug: z.string().optional(),
  parent: z.coerce.number().default(0),
});

type CategoryFormValues = z.infer<typeof CategoryFormSchema>;

type CategoryFormProps = {
  category: WooCategory | null;
  allCategories: WooCategory[];
  onSuccess: () => void;
};

export default function CategoryForm({ category, allCategories, onSuccess }: CategoryFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(category?.image?.src || null);
  const [imageFile, setImageFile] = useState<File | null>(null);


  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: {
      name: category?.name || "",
      slug: category?.slug || "",
      parent: category?.parent || 0,
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const base64 = await fileToBase64(file);
      setImagePreview(base64);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  }

  const onSubmit = async (data: CategoryFormValues) => {
    setIsSaving(true);
    try {
      const url = category ? `/api/products/categories/${category.id}` : "/api/products/categories";
      const method = category ? "PUT" : "POST";

      let imageData: { id?: number; src?: string } | undefined = undefined;

      if (imageFile) {
        const base64 = await fileToBase64(imageFile);
        const uploadResponse = await fetch('/api/products/upload-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_data: base64, image_name: imageFile.name }),
        });
        if (!uploadResponse.ok) throw new Error('Image upload failed.');
        const uploadedImage = await uploadResponse.json();
        imageData = { id: uploadedImage.id };
      } else if (!imagePreview && category?.image) {
        // Image was removed
        imageData = { src: '' };
      }

      const submissionData = { ...data, image: imageData };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save category");
      }

      const savedCategory = await response.json();
      toast({
        title: "Success!",
        description: `Category "${savedCategory.name}" has been saved.`,
      });
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Save Failed",
        description: error.message || "There was an error saving the category.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormItem>
          <FormLabel>Image</FormLabel>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-md border border-dashed flex items-center justify-center relative">
              {imagePreview ? (
                <>
                  <Image src={imagePreview} alt="Category preview" fill className="object-cover rounded-md" />
                  <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10" onClick={removeImage}>
                    <XIcon className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <div className="text-center text-muted-foreground p-2">
                  <UploadCloud className="mx-auto h-8 w-8" />
                </div>
              )}
            </div>
            <Input id="category-image" type="file" accept="image/*" className="max-w-xs" onChange={handleImageChange} />
          </div>
        </FormItem>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Furniture" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="slug"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Slug (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., furniture" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="parent"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parent Category</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a parent category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {allCategories
                    .filter(c => c.id !== category?.id) // Prevent selecting itself
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {category ? "Save Changes" : "Create Category"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
