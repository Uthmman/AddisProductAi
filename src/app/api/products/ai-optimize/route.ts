import { NextRequest, NextResponse } from 'next/server';
import { generateWooCommerceProductContent, GenerateWooCommerceProductContentInput } from '@/ai/flows/generate-woocommerce-product-content';
import { z } from 'zod';

const InputSchema = z.object({
  raw_name: z.string(),
  material: z.string(),
  amharic_name: z.string(),
  focus_keywords: z.string(),
  price_etb: z.number(),
  images_data: z.array(z.string()), // Array of Base64 encoded images
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

    // The response contains all AI-generated text content, including alt text for all images.
    return NextResponse.json(aiContent);

  } catch (error) {
    console.error('AI optimization failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
