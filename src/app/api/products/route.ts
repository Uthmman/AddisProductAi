import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { appCache } from '@/lib/cache';

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

  const cacheKey = `products_${page}_${perPage}_${category || ''}_${tag || ''}_${search || ''}_${orderby || ''}_${order || ''}`;

  try {
    const cached = appCache.get<{ products: any[]; totalPages: number; totalProducts: number }>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      });
    }

    const { products, totalPages, totalProducts } = await wooCommerceApi.getProducts(
      page, 
      perPage, 
      category, 
      tag, 
      search, 
      orderby, 
      order
    );

    const result = { products, totalPages, totalProducts };
    // Cache for 2 minutes (120 seconds)
    appCache.set(cacheKey, result, 120);

    return NextResponse.json(result, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error: any) {
    console.error("API Route Error fetching products:", error.message);
    return NextResponse.json({ message: error.message || 'Failed to fetch products' }, { status: 500 });
  }
}


export async function POST(request: NextRequest) {
    try {
      const body = await request.json();
      const newProduct = await wooCommerceApi.createProduct(body);
      // Invalidate products cache
      appCache.flushAll();
      return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
      console.error(error);
      return NextResponse.json({ message: 'Failed to create product' }, { status: 500 });
    }
  }
