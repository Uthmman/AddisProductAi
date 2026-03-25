import { NextRequest, NextResponse } from 'next/server';
import { generateTagSeoFlow } from '@/ai/flows/generate-tag-seo-flow';
import { z } from 'zod';
import { getSettings } from '@/lib/settings-api';

const InputSchema = z.object({
  tagName: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }
    
    const settings = await getSettings();
    const aiContent = await generateTagSeoFlow({ ...validation.data, settings });

    return NextResponse.json(aiContent);

  } catch (error: any) {
    console.error('Tag SEO generation failed:', error);
    
    if (error.status === 429 || error.message?.includes('429')) {
        return NextResponse.json({ 
            message: 'The AI is currently receiving too many requests. Please wait a moment and try again.',
            errorType: 'rate_limit'
        }, { status: 429 });
    }

    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
