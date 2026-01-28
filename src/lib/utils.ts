import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { Settings } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string) {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericAmount)) {
    return 'ብር 0.00';
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'ETB',
    currencyDisplay: 'symbol',
  }).format(numericAmount).replace('ETB', 'ብር ');
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}


export function applyWatermark(originalImageSrc: string, watermarkImageSrc: string, options: Partial<Settings> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const {
      watermarkPlacement = 'bottom-right',
      watermarkScale = 40,
      watermarkOpacity = 0.7,
      watermarkPadding = 5
    } = options;


    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return reject(new Error('Could not get canvas context'));
    }

    const originalImage = new Image();
    originalImage.crossOrigin = 'anonymous';
    originalImage.onload = () => {
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;

      // Fill the background with white. This is important for JPEG conversion.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.drawImage(originalImage, 0, 0);

      const watermarkImage = new Image();
      watermarkImage.crossOrigin = 'anonymous';
      watermarkImage.onload = () => {
        
        const scale = watermarkScale / 100;
        const padding = watermarkPadding / 100;

        const watermarkWidth = originalImage.width * scale;
        const watermarkHeight = watermarkImage.height * (watermarkWidth / watermarkImage.width);
        
        const paddingX = originalImage.width * padding;
        const paddingY = originalImage.height * padding;

        let x = 0;
        let y = 0;

        switch (watermarkPlacement) {
            case 'bottom-right':
                x = originalImage.width - watermarkWidth - paddingX;
                y = originalImage.height - watermarkHeight - paddingY;
                break;
            case 'bottom-left':
                x = paddingX;
                y = originalImage.height - watermarkHeight - paddingY;
                break;
            case 'top-right':
                x = originalImage.width - watermarkWidth - paddingX;
                y = paddingY;
                break;
            case 'top-left':
                x = paddingX;
                y = paddingY;
                break;
            case 'center':
                x = (originalImage.width - watermarkWidth) / 2;
                y = (originalImage.height - watermarkHeight) / 2;
                break;
        }


        ctx.globalAlpha = watermarkOpacity;
        ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
        
        resolve(canvas.toDataURL('image/jpeg', 0.9)); // Return as high-quality JPEG
      };
      watermarkImage.onerror = () => reject(new Error('Watermark image failed to load'));
      watermarkImage.src = watermarkImageSrc;
    };
    originalImage.onerror = () => reject(new Error('Original image failed to load'));
    originalImage.src = originalImageSrc;
  });
}

export async function urlToDataUri(url: string): Promise<string> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch image from ${url}: ${response.statusText}`);
    }
    const blob = await response.blob();
    const buffer = Buffer.from(await blob.arrayBuffer());
    return `data:${blob.type};base64,${buffer.toString('base64')}`;
}
