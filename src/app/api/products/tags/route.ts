import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

export async function GET(request: NextRequest) {
  try {
    const tags = await wooCommerceApi.getAllProductTags();
    return NextResponse.json(tags);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to fetch product tags' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newTag = await wooCommerceApi.createProductTag(body);
    return NextResponse.json(newTag, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Failed to create tag' }, { status: 500 });
  }
}
