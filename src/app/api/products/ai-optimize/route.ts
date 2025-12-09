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
    
    // We only send the first image to the AI for content generation.
    // The image ID/SRC is no longer fetched here, it's handled on the client.
    const contentGenerationInput: GenerateWooCommerceProductContentInput = {
      ...aiInput,
      image_data: image_data,
    };
    const aiContent = await generateWooCommerceProductContent(contentGenerationInput);

    // The response only contains AI-generated text content.
    // Image data is handled client-side.
    const responsePayload = {
      ...aiContent,
       images: [{
          // The alt text is for the image that was sent to the AI.
          alt: aiContent.images[0]?.alt || "Product image"
      }]
    };
    
    return NextResponse.json(responsePayload);

  } catch (error) {
    console.error('AI optimization failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}

    