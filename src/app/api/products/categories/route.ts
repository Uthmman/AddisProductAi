import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

export async function GET(request: NextRequest) {
  try {
    const categories = await wooCommerceApi.getProductCategories();
    return NextResponse.json(categories);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch product categories' }, { status: 500 });
  }
}
