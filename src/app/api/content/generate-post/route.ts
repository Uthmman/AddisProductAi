import { NextRequest, NextResponse } from 'next/server';
import { generateBlogPost } from '@/ai/flows/generate-blog-post';
import { z } from 'zod';

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
    
    const aiContent = await generateBlogPost(validation.data);

    return NextResponse.json(aiContent);

  } catch (error) {
    console.error('Blog post generation failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred during AI optimization.' }, { status: 500 });
  }
}
