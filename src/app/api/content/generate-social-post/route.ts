import { NextRequest, NextResponse } from 'next/server';
import { generateSocialMediaPost } from '@/ai/flows/generate-social-media-post';
import { z } from 'zod';

const InputSchema = z.object({
  productId: z.string(),
  platform: z.enum(['telegram']),
  topic: z.string(),
});


export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }
    
    const aiContent = await generateSocialMediaPost(validation.data);

    return NextResponse.json(aiContent);

  } catch (error: any) {
    console.error('Social post generation failed:', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
