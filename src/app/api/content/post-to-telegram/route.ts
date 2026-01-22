
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getProduct } from '@/lib/woocommerce-api';
import { sendPhotoToChannel } from '@/lib/telegram-api';

const InputSchema = z.object({
  productId: z.string(),
  content: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input' }, { status: 400 });
    }

    const { productId, content } = validation.data;
    const product = await getProduct(parseInt(productId, 10));

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    if (!product.images || product.images.length === 0) {
      return NextResponse.json({ message: 'Product has no image to post' }, { status: 400 });
    }

    const imageUrl = product.images[0].src;

    await sendPhotoToChannel(imageUrl, content);

    return NextResponse.json({ message: 'Successfully posted to Telegram.' });

  } catch (error: any) {
    console.error('Failed to post to Telegram:', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
