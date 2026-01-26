import { NextRequest, NextResponse } from 'next/server';
import * as wooCommerceApi from '@/lib/woocommerce-api';

interface Params {
  params: { id: string };
}

export async function PUT(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid tag ID' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const updatedTag = await wooCommerceApi.updateProductTag(id, body);
    return NextResponse.json(updatedTag);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to update tag' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const id = parseInt(params.id, 10);
  if (isNaN(id)) {
    return NextResponse.json({ message: 'Invalid tag ID' }, { status: 400 });
  }

  try {
    const deletedTag = await wooCommerceApi.deleteProductTag(id, true);
    return NextResponse.json(deletedTag);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ message: error.message || 'Failed to delete tag' }, { status: 500 });
  }
}
