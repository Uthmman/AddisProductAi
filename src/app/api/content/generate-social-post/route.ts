import { NextRequest, NextResponse } from 'next/server';
import { generateSocialMediaPost } from '@/ai/flows/generate-social-media-post';
import { z } from 'zod';
import { getProduct, getSettings } from '@/lib/woocommerce-api';

const InputSchema = z.object({
  productId: z.string(),
  platform: z.enum(['telegram']),
  topic: z.string(),
  tone: z.enum(['descriptive', 'playful']),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const { productId, platform, topic, tone } = validation.data;

    const productIdNum = parseInt(productId, 10);
    if (isNaN(productIdNum)) {
      return NextResponse.json({ message: 'Invalid Product ID' }, { status: 400 });
    }
    
    // Fetch product and settings data here, before calling the flow
    const [product, settings] = await Promise.all([
        getProduct(productIdNum),
        getSettings()
    ]);
    
    if (!product) {
       return NextResponse.json({ message: `Product with ID ${productId} not found.` }, { status: 404 });
    }
    
    const aiContent = await generateSocialMediaPost({ product, platform, topic, settings, tone });

    return NextResponse.json(aiContent);

  } catch (error: any) {
    console.error('Social post generation failed:', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
