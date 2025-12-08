import { z } from 'zod';

export const AIContentSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  slug: z.string().optional(),
  tags: z.array(z.string()).optional(),
  meta_data: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  attributes: z.array(z.object({ name: z.string(), option: z.string() })).optional(),
  images: z.array(z.object({ alt: z.string() })).optional(),
  regular_price: z.number().optional(),
});

export const ProductFormSchema = z.object({
  // User input fields
  raw_name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  material: z.string().min(2, { message: "Material is required." }),
  price_etb: z.coerce.number().positive({ message: "Price must be a positive number." }),
  focus_keywords: z.string().optional(),
  amharic_name: z.string().optional(),
  
  // Image data (not directly in form, but part of the data model)
  image_data: z.string().optional(), // Base64 string
  image_url: z.string().url().optional(),
  image_name: z.string().optional(),
  
  // AI-generated and final product fields
  ai_content: AIContentSchema.optional(),

  // Fields for submission
  name: z.string(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  regular_price: z.string(),
  tags: z.array(z.object({ name: z.string() })).optional(),
  meta_data: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  attributes: z.array(z.object({ name: z.string(), options: z.array(z.string()) })).optional(),
  images: z.array(z.object({ id: z.number().optional(), src: z.string().optional(), alt: z.string().optional() })).optional(),
  stock_status: z.enum(['instock', 'outofstock']).default('instock'),
});

export type ProductFormValues = z.infer<typeof ProductFormSchema>;
