import { NextRequest, NextResponse } from 'next/server';
import { bulkGenerateTagSeoFlow } from '@/ai/flows/bulk-generate-tag-seo-flow';

export const maxDuration = 300; // Extend timeout for potentially long-running bulk jobs

export async function POST(request: NextRequest) {
  try {
    const result = await bulkGenerateTagSeoFlow();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Bulk Tag SEO generation failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during bulk optimization.' }, { status: 500 });
  }
}
