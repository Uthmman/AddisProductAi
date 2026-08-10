import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

export const maxDuration = 120; // Extend timeout to 120 seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '12', 10);
  const category = searchParams.get('category') || undefined;
  const tag = searchParams.get('tag') || undefined;
  const search = searchParams.get('search') || undefined;
  const orderby = searchParams.get('orderby') || undefined;
  const order = (searchParams.get('order') as 'asc' | 'desc') || undefined;

  try {
    const { products, totalPages, totalProducts } = await wooCommerceApi.getProducts(
      page, 
      perPage, 
      category, 
      tag, 
      search, 
      orderby, 
      order
    );
    return NextResponse.json({ products, totalPages, totalProducts });
  } catch (error: any) {
    console.error("API Route Error fetching products:", error.message);
    return NextResponse.json({ message: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const newProduct = await wooCommerceApi.createProduct(body);
      return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to create product' }, { status: 500 });
    }
  }
