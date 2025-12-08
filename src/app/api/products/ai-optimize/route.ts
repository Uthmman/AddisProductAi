import { NextRequest, NextResponse } from 'next/server';
import { generateWooCommerceProductContent, GenerateWooCommerceProductContentInput } from '@/ai/flows/generate-woocommerce-product-content';
import { uploadImage } from '@/lib/woocommerce-api';
import { z } from 'zod';

const InputSchema = z.object({
  raw_name: z.string(),
  material: z.string(),
  amharic_name: z.string(),
  focus_keywords: z.string(),
  price_etb: z.number(),
  image_data: z.string(), // Base64 encoded image
  image_name: z.string(),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const { image_data, image_name, ...aiInput } = validation.data;
    
    // 1. Upload image to WordPress to get an ID (mocked for now)
    const uploadedImage = await uploadImage(image_name, image_data);

    // 2. Generate content with AI
    const contentGenerationInput: GenerateWooCommerceProductContentInput = {
      ...aiInput,
      image_data: image_data,
    };
    const aiContent = await generateWooCommerceProductContent(contentGenerationInput);

    // 3. Combine results and return to frontend
    const responsePayload = {
      ...aiContent,
      images: [{
          id: uploadedImage.id, // ID from WordPress
          src: uploadedImage.src, // URL from WordPress
          alt: aiContent.images[0]?.alt || "Product image"
      }]
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('AI optimization failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
