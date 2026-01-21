import { NextRequest, NextResponse } from 'next/server';
import { generateWooCommerceProductContent, GenerateWooCommerceProductContentInput } from '@/ai/flows/generate-woocommerce-product-content';
import { z } from 'zod';
import { getGscTopQueries } from '@/lib/gsc-api';

export const dynamic = 'force-dynamic';
export const maxDuration = 120; // Extend timeout to 120 seconds

const InputSchema = z.object({
  raw_name: z.string(),
  material: z.string(),
  amharic_name: z.string(),
  focus_keywords: z.string(),
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
});

async function urlToDataUri(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
  }
  const blob = await response.blob();
  const buffer = Buffer.from(await blob.arrayBuffer());
  return `data:${blob.type};base64,${buffer.toString('base64')}`;
}


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const inputData = validation.data;

    // Convert any image URLs to data URIs on the server
    const processedImagesData = await Promise.all(
        inputData.images_data.map(async (imageData: string) => {
            if (imageData.startsWith('http')) {
                try {
                    return await urlToDataUri(imageData);
                } catch (error) {
                    console.error(`Failed to convert image URL to data URI: ${imageData}`, error);
                    return null; // Or handle the error as needed
                }
            }
            return imageData; // It's already a data URI
        })
    );
    
    const validImagesData = processedImagesData.filter(d => d !== null) as string[];

    if (validImagesData.length === 0) {
        return NextResponse.json({ message: "Could not process any of the product images." }, { status: 400 });
    }

    // Fetch GSC data and pass it to the flow
    const gscData = await getGscTopQueries();

    const aiInput: GenerateWooCommerceProductContentInput = {
        ...inputData,
        images_data: validImagesData,
        gscData: gscData ?? undefined, // Pass GSC data to the flow, ensuring it's undefined if null
    };
    
    const aiContent = await generateWooCommerceProductContent(aiInput);

    return NextResponse.json(aiContent);

  } catch (error) {
    console.error('AI optimization failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
