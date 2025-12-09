import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

interface Params {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid category ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedCategory = await wooCommerceApi.updateCategory(id, body);
    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to update category' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid category ID' }, { status: 400 });
  }

  try {
    // Note: WooCommerce requires force=true to delete a category with products.
    const deletedCategory = await wooCommerceApi.deleteCategory(id, true);
    return NextResponse.json(deletedCategory);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to delete category' }, { status: 500 });
  }
}
