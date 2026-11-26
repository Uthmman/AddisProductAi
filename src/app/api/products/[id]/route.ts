import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { appCache } from '@/lib/cache';

export const maxDuration = 120; // Extend timeout to 120 seconds

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
  }

  const cacheKey = `product_${id}`;
  try {
    const cached = appCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const product = await wooCommerceApi.getProduct(id);
    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    appCache.set(cacheKey, product, 180);
    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch product' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { id: idStr } = await params;
  const id = parseInt(idStr, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedProduct = await wooCommerceApi.updateProduct(id, body);
    appCache.flushAll(); // Clear all caches so listings update
    return NextResponse.json(updatedProduct);
  } catch (error: any) {
    console.error(error);
    if (error.message === 'Product not found') {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred during image upload.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) {
        return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
    }

    try {
        const deletedProduct = await wooCommerceApi.deleteProduct(id);
        appCache.flushAll(); // Clear cache on delete
        return NextResponse.json(deletedProduct);
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ message: error.message || 'Failed to delete product' }, { status: 500 });
    }
}
        return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
    }

    try {
        const deletedProduct = await wooCommerceApi.deleteProduct(id);
        return NextResponse.json(deletedProduct);
    } catch (error: any) {
        console.error(error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to delete product.';
        return NextResponse.json({ message: errorMessage }, { status: 500 });
    }
}
