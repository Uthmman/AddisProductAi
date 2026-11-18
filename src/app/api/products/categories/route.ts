import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { appCache } from '@/lib/cache';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get('all') === 'true';
  const cacheKey = `categories_${showAll ? 'all' : 'top'}`;

  try {
    const cached = appCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    const categories = showAll 
      ? await wooCommerceApi.getAllProductCategories()
      : await wooCommerceApi.getTopProductCategories();
      
    appCache.set(cacheKey, categories, 600); // 10 minutes cache

    return NextResponse.json(categories, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error("API Route Error fetching categories:", error.message);
    return NextResponse.json({ message: error.message || 'Failed to fetch product categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const newCategory = await wooCommerceApi.createCategory(body);
    appCache.del('categories_all');
    appCache.del('categories_top');
    return NextResponse.json(newCategory, { status: 201 });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to create category' }, { status: 500 });
  }
}
