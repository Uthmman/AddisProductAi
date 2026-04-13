import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

interface Params {
  params: { id: string };
}

export async function GET(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid post ID' }, { status: 400 });
  }

  try {
    const post = await wooCommerceApi.getPost(id);
    if (!post) {
      return NextResponse.json({ message: 'Post not found' }, { status: 404 });
    }
    return NextResponse.json(post);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid post ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedPost = await wooCommerceApi.updatePost(id, body);
    return NextResponse.json(updatedPost);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid post ID' }, { status: 400 });
  }

  try {
    const deletedPost = await wooCommerceApi.deletePost(id);
    return NextResponse.json(deletedPost);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to delete post' }, { status: 500 });
  }
}
