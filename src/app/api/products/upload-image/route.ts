
import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/woocommerce-api';
import { z } from 'zod';

const UploadSchema = z.object({
  image_data: z.string(),
  image_name: z.string(),
});

async function urlToDataUri(url: string): Promise<string> {
    // For Google Photos, we need to bypass the redirect to get the actual image
    if (url.includes('googleusercontent.com')) {
        const response = await fetch(url, { redirect: 'follow' });
         if (!response.ok) {
            throw new Error(`Failed to fetch image from Google Photos URL: ${response.statusText}`);
        }
        const blob = await response.blob();
        const buffer = Buffer.from(await blob.arrayBuffer());
        return `data:${blob.type};base64,${buffer.toString('base64')}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type};base64,${buffer.toString('base64')}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = UploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    let { image_data, image_name } = validation.data;

    // If image_data is a URL, fetch it and convert to data URI
    if (image_data.startsWith('http')) {
        try {
            image_data = await urlToDataUri(image_data);
        } catch (error) {
            console.error(`Failed to convert image URL to data URI: ${image_data}`, error);
            return NextResponse.json({ message: "Could not process the provided image URL." }, { status: 400 });
        }
    }
    
    // This endpoint now directly passes the raw base64 data URI and name to the uploadImage function.
    // Watermarking is handled by the calling function (e.g., in the client or in another API route)
    // before this endpoint is called.
    const uploadedImage = await uploadImage(image_name, image_data);

    return NextResponse.json(uploadedImage);

  } catch (error: any) {
    // Log the detailed error from the underlying API call
    console.error('Image upload failed:', error);
    
    const errorMessage = error.message || 'An unexpected error occurred during image upload.';
    const statusCode = 500;

    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}

    