import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/ai/flows/generate-blog-post';
import { z } from 'zod';
import { getSettings } from '@/lib/settings-api';
import * as wooCommerceApi from '@/lib/woocommerce-api';

const InputSchema = z.object({
  topic: z.string(),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }
    
    const settings = await getSettings();
    
    // 1. Generate text content
    const aiContent = await generateBlogPost({
      ...validation.data,
      settings: settings,
    });

    // 2. Automatically find related furniture images
    const relatedImages: { id: number; src: string }[] = [];
    const seenImageIds = new Set<number>();

    if (aiContent.searchTerms && aiContent.searchTerms.length > 0) {
        try {
            // Search for products matching the AI's suggested terms
            // Take the first 2 terms to avoid over-fetching
            for (const term of aiContent.searchTerms.slice(0, 2)) {
                const searchResult = await wooCommerceApi.getProducts(1, 4, undefined, undefined, term);
                if (searchResult.products) {
                    for (const product of searchResult.products) {
                        if (product.images && product.images.length > 0) {
                            const img = product.images[0];
                            if (!seenImageIds.has(img.id)) {
                                relatedImages.push({ id: img.id, src: img.src });
                                seenImageIds.add(img.id);
                            }
                        }
                        if (relatedImages.length >= 4) break;
                    }
                }
                if (relatedImages.length >= 4) break;
            }
        } catch (searchError) {
            console.error("Failed to fetch related images:", searchError);
            // Non-fatal, proceed with text only
        }
    }

    return NextResponse.json({
        ...aiContent,
        relatedImages
    });

  } catch (error: any) {
    console.error('Blog post generation failed:', error);

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

    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
