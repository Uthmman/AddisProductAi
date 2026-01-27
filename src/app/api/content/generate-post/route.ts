
import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/ai/flows/generate-blog-post';
import { z } from 'zod';
import { getGscTopQueries } from '@/lib/gsc-api';
import { getSettings } from '@/lib/settings-api';

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
    
    // Fetch GSC data and settings
    const [gscData, settings] = await Promise.all([
        getGscTopQueries(),
        getSettings()
    ]);
    
    const aiContent = await generateBlogPost({
      ...validation.data,
      gscData: gscData ?? undefined,
      settings: settings,
    });

    return NextResponse.json(aiContent);

  } catch (error) {
    console.error('Blog post generation failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
