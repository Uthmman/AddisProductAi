import { NextRequest, NextResponse } from 'next/server';
import { generateSocialMediaPost } from '@/ai/flows/generate-social-media-post';
import { z } from 'zod';
import { getProduct } from '@/lib/woocommerce-api';
import { getSettings } from '@/lib/settings-api';

const InputSchema = z.object({
  productId: z.string(),
  platform: z.enum(['telegram']),
  topic: z.string().optional(),
  tone: z.enum(['descriptive', 'playful']),
  showPrice: z.boolean().optional(),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const { productId, platform, topic, tone, showPrice } = validation.data;

    const productIdNum = parseInt(productId, 10);
    if (isNaN(productIdNum)) {
      return NextResponse.json({ message: 'Invalid Product ID' }, { status: 400 });
    }
    
    const [product, settings] = await Promise.all([
        getProduct(productIdNum),
        getSettings()
    ]);
    
    if (!product) {
       return NextResponse.json({ message: `Product with ID ${productId} not found.` }, { status: 404 });
    }
    
    const aiContent = await generateSocialMediaPost({ product, platform, topic, settings, tone, showPrice });

    return NextResponse.json(aiContent);

  } catch (error: any) {
    console.error('Social post generation failed:', error);

    const errorMessage = error.message || "";
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('high demand')) {
        return NextResponse.json({ message: 'The AI service is currently overloaded or busy. Please wait a moment and try again.' }, { status: 503 });
    }

    if (error.status === 429 || errorMessage.includes('429')) {
        return NextResponse.json({ 
            message: 'The AI is currently receiving too many requests. Please wait a moment and try again.',
            errorType: 'rate_limit'
        }, { status: 429 });
    }

    return NextResponse.json({ message: 'An unexpected error occurred.' }, { status: 500 });
  }
}
