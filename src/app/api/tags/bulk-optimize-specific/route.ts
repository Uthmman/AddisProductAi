import { NextRequest, NextResponse } from 'next/server';
import { bulkGenerateSeoForSpecificTagsFlow } from '@/ai/flows/bulk-generate-seo-for-specific-tags-flow';
import { z } from 'zod';

export const maxDuration = 300;

const InputSchema = z.object({
  tagNames: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }
    
    const result = await bulkGenerateSeoForSpecificTagsFlow(validation.data);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Bulk specific tag SEO generation failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during bulk optimization.' }, { status: 500 });
  }
}
