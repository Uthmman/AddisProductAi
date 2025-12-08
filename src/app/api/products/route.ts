import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const perPage = parseInt(searchParams.get('per_page') || '10', 10);

  try {
    const { products, totalPages } = await wooCommerceApi.getProducts(page, perPage);
    return NextResponse.json({ products, totalPages });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Failed to fetch products' }, { status: 500 });
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