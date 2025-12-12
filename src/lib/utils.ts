import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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


export function applyWatermark(originalImageSrc: string, watermarkImageSrc: string): Promise<string> {
  return new Promise((resolve, reject) => {
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

      ctx.drawImage(originalImage, 0, 0);

      const watermarkImage = new Image();
      watermarkImage.crossOrigin = 'anonymous';
      watermarkImage.onload = () => {
        // Configuration for the watermark
        const scale = 0.4; // Watermark will be 40% of the original image's width
        const padding = 0.05; // 5% padding from the corner

        const watermarkWidth = originalImage.width * scale;
        const watermarkHeight = watermarkImage.height * (watermarkWidth / watermarkImage.width);
        
        const x = originalImage.width - watermarkWidth - (originalImage.width * padding);
        const y = originalImage.height - watermarkHeight - (originalImage.height * padding);

        ctx.globalAlpha = 0.7; // Set watermark opacity
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
