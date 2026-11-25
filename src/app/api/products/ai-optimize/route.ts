
import { NextRequest, NextResponse } from 'next/server';
import { generateWooCommerceProductContent } from '@/ai/flows/generate-woocommerce-product-content';
import { z } from 'zod';
import { getCategoryCode, getNextSku } from '@/lib/skuGenerator';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Extend timeout to 120 seconds

const InputSchema = z.object({
  raw_name: z.string(),
  material: z.string().optional().default(''),
  amharic_name: z.string().optional().default(''),
  focus_keywords: z.string().optional().default(''),
  price_etb: z.number(),
  images_data: z.array(z.string()).describe('Can be data URIs or public URLs'),
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
      'regular_price',
  ]).optional(),
  existingContent: z.any().optional(),
  settings: z.any().optional(),
  primaryCategory: z.any().optional(),
  totalImageCount: z.number(),
});

async function urlToDataUri(url: string): Promise<string> {
    if (url.includes('googleusercontent.com')) {
        const response = await fetch(url, { redirect: 'follow' });
         if (!response.ok) {
            throw new Error(`Failed to fetch image from Google Photos URL: ${response.statusText}`);
        }
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        return `data:${blob.type};base64,${buffer.toString('base64')}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type};base64,${buffer.toString('base64')}`;
}


export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(">>> AI Optimization Request Started");

  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const inputData = validation.data;

    // Resolve SKU if we are generating a new product ('all') or just the 'name'/'sku'
    let resolvedSku = inputData.existingContent?.sku;
    
    if (!resolvedSku && (inputData.fieldToGenerate === 'all' || inputData.fieldToGenerate === 'name')) {
      const categoryCode = getCategoryCode(inputData.raw_name) || 'GEN';
      
      try {
        console.time("SKU Resolution");
        resolvedSku = await getNextSku(categoryCode);
        console.timeEnd("SKU Resolution");
      } catch (firestoreError: any) {
        console.error("Firestore SKU error, leaving empty as requested:", firestoreError.message);
        // Leave SKU empty if connection fails
        resolvedSku = "";
      }
    }

    console.time("Image Processing");
    const processedImagesData = await Promise.all(
        inputData.images_data.map(async (imageData: string) => {
            if (imageData.startsWith('http')) {
                try {
                    return await urlToDataUri(imageData);
                } catch (error) {
                    console.error(`Failed to convert image URL to data URI: ${imageData}`, error);
                    return null; 
                }
            }
            return imageData;
        })
    );
    console.timeEnd("Image Processing");
    
    const validImagesData = processedImagesData.filter(d => d !== null) as string[];

    if (validImagesData.length === 0) {
        return NextResponse.json({ message: "Could not process any of the product images." }, { status: 400 });
    }

    const aiInput = {
        ...inputData,
        sku: resolvedSku,
        images_data: validImagesData,
    };
    
    console.log(">>> Calling AI model...");
    console.time("AI Generation");
    const aiContent = await generateWooCommerceProductContent(aiInput);
    console.timeEnd("AI Generation");

    console.log(`>>> Total Optimization Time: ${Date.now() - startTime}ms`);
    return NextResponse.json(aiContent);

  } catch (error: any) {
    console.error('AI optimization route error:', error);
    
    if (error.status === 429 || error.message?.includes('429')) {
        return NextResponse.json({ 
            text: 'The AI is currently receiving too many requests. Please wait a moment and try again.',
            errorType: 'rate_limit'
        }, { status: 429 });
    }

    if (error.message?.includes('payload too large') || error.status === 413) {
        return NextResponse.json({ message: 'Image size is too large. Please try using a smaller image or uploading via Google Photos.' }, { status: 413 });
    }

    // Explicit error check to match the provided image context
    const isAccessDenied = error.message?.includes('PERMISSION_DENIED') || error.code === 'permission-denied' || error.message?.includes('Database access denied');
    
    const errorMessage = isAccessDenied 
        ? "Database access denied. Please ensure your Firebase security rules are deployed. Note: This could also happen if the device's clock is out of sync or if the network is blocking Firebase."
        : (error.message || 'An unexpected error occurred during AI optimization.');

    return NextResponse.json({ message: errorMessage }, { status: error.status || 500 });
  }
}
