import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get('all') === 'true';

  try {
    const categories = showAll 
      ? await wooCommerceApi.getAllProductCategories()
      : await wooCommerceApi.getTopProductCategories();
      
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch product categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newCategory = await wooCommerceApi.createCategory(body);
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to create category' }, { status: 500 });
  }
}
