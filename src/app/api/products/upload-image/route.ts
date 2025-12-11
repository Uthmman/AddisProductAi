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
    
    // Directly pass the raw base64 data URI and name to the uploadImage function
    const uploadedImage = await uploadImage(image_name, image_data);

    return NextResponse.json(uploadedImage);

  } catch (error: any) {
    // Log the detailed error from the underlying API call
    console.error('Image upload failed:', {
      message: error.message,
      statusCode: error.response?.status,
      body: error.response?.data,
    });
    
    const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred during image upload.';
    const statusCode = error.response?.status || 500;

    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
