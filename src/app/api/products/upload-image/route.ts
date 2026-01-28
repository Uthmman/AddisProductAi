import { NextRequest, NextResponse } from 'next/server';
import { uploadImage } from '@/lib/woocommerce-api';
import { getSettings } from '@/lib/settings-api';
import { Settings } from '@/lib/types';
import Jimp from 'jimp';
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

async function applyWatermarkServerSide(originalImageDataUri: string, watermarkImageDataUri: string, options: Partial<Settings> = {}): Promise<string> {
    const {
        watermarkPlacement = 'bottom-right',
        watermarkScale = 40,
        watermarkOpacity = 0.7,
        watermarkPadding = 5
    } = options;

    const originalImageBuffer = Buffer.from(originalImageDataUri.split(';base64,').pop()!, 'base64');
    const originalImage = await Jimp.read(originalImageBuffer);

    const watermarkImageBuffer = Buffer.from(watermarkImageDataUri.split(';base64,').pop()!, 'base64');
    const watermarkImage = await Jimp.read(watermarkImageBuffer);

    const scale = watermarkScale / 100;
    const padding = watermarkPadding / 100;

    watermarkImage.resize(originalImage.getWidth() * scale, Jimp.AUTO);
    watermarkImage.opacity(watermarkOpacity);

    const paddingX = originalImage.getWidth() * padding;
    const paddingY = originalImage.getHeight() * padding;

    let x = 0, y = 0;

    switch (watermarkPlacement) {
        case 'bottom-right':
            x = originalImage.getWidth() - watermarkImage.getWidth() - paddingX;
            y = originalImage.getHeight() - watermarkImage.getHeight() - paddingY;
            break;
        case 'bottom-left':
            x = paddingX;
            y = originalImage.getHeight() - watermarkImage.getHeight() - paddingY;
            break;
        case 'top-right':
            x = originalImage.getWidth() - watermarkImage.getWidth() - paddingX;
            y = paddingY;
            break;
        case 'top-left':
            x = paddingX;
            y = paddingY;
            break;
        case 'center':
            x = (originalImage.getWidth() - watermarkImage.getWidth()) / 2;
            y = (originalImage.getHeight() - watermarkImage.getHeight()) / 2;
            break;
    }

    originalImage.composite(watermarkImage, x, y);

    return await originalImage.getBase64Async(Jimp.MIME_JPEG);
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

    // Apply watermark if configured
    const settings = await getSettings();
    if (settings.watermarkImageUrl && settings.watermarkImageUrl.startsWith('data:image')) {
        try {
            console.log("Applying watermark to uploaded image...");
            image_data = await applyWatermarkServerSide(image_data, settings.watermarkImageUrl, settings);
            console.log("Watermark applied successfully.");
        } catch (watermarkError) {
            console.error("Failed to apply watermark:", watermarkError);
            // Non-fatal, just proceed with original image. Could optionally inform the user.
        }
    }
    
    // Directly pass the raw base64 data URI and name to the uploadImage function
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
