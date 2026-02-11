import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPost } from '@/lib/woocommerce-api';

const InputSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const { title, content } = validation.data;
    
    // Create the post with 'publish' status
    const newPost = await createPost({ title, content, status: 'publish' });

    return NextResponse.json({ message: 'Successfully created post.', post: newPost });

  } catch (error: any) {
    console.error('Failed to create blog post:', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
