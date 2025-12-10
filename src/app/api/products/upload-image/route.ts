import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/woocommerce-api';
import { z } from 'zod';

const UploadSchema = z.object({
  image_data: z.string(),
  image_name: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = UploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const { image_data, image_name } = validation.data;
    // Correctly await the async uploadImage function
    const uploadedImage = await uploadImage(image_name, image_data);

    return NextResponse.json(uploadedImage);

  } catch (error: any) {
    console.error('Image upload failed:', error.message);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred during image upload.' }, { status: 500 });
  }
}
