import { NextRequest, NextResponse } from 'next/server';
import { generateWooCommerceProductContent, GenerateWooCommerceProductContentInput } from '@/ai/flows/generate-woocommerce-product-content';
import { z } from 'zod';

const InputSchema = z.object({
  raw_name: z.string(),
  material: z.string(),
  amharic_name: z.string(),
  focus_keywords: z.string(),
  price_etb: z.number(),
  images_data: z.array(z.string()),
  availableCategories: z.array(z.object({id: z.number(), name: z.string(), slug: z.string()})),
  fieldToGenerate: z.enum([
      'all',
      'name',
      'slug',
      'description',
      'short_description',
      'tags',
      'meta_data',
      'attributes',
      'images',
      'categories',
  ]).optional(),
  existingContent: z.any().optional(),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const aiInput: GenerateWooCommerceProductContentInput = validation.data;
    
    const aiContent = await generateWooCommerceProductContent(aiInput);

    return NextResponse.json(aiContent);

  } catch (error) {
    console.error('AI optimization failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
