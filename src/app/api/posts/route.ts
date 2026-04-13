import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '10', 10);

  try {
    const { posts, totalPages, totalPosts } = await wooCommerceApi.getPosts(page, perPage);
    return NextResponse.json({ posts, totalPages, totalPosts });
  } catch (error: any) {
    console.error("API Route Error fetching posts:", error.message);
    return NextResponse.json({ message: error.message || 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newPost = await wooCommerceApi.createPost(body);
    return NextResponse.json(newPost, { status: 201 });
  } catch (error: any) {
    console.error("API Route Error creating post:", error.message);
    return NextResponse.json({ message: error.message || 'Failed to create post' }, { status: 500 });
  }
}
