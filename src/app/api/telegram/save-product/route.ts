
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ProductBotState, AIProductContent, WooCategory } from '@/lib/types';
import { createProduct, updateProduct, getAllProductCategories, uploadImage } from '@/lib/woocommerce-api';
import { applyWatermarkServerSide } from '@/lib/utils';
import { getSettings } from '@/lib/settings-api';

const InputSchema = z.object({
  productState: z.any(),
  applyWatermark: z.boolean(),
  status: z.enum(['publish', 'draft']),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const { productState, applyWatermark, status } = validation.data as { productState: ProductBotState, applyWatermark: boolean, status: 'publish' | 'draft' };
    
    const [settings, availableCategories] = await Promise.all([
        getSettings(),
        getAllProductCategories()
    ]);
    
    if (!productState.aiContent) {
      return NextResponse.json({ message: "AI content has not been generated. Cannot save product." }, { status: 400 });
    }

    // 1. Upload any new images
    const processedImages = await Promise.all(
        productState.images.map(async (image) => {
            // If it already has an ID, it's an existing image.
            if (image.id) {
                return { id: image.id, alt: productState.aiContent?.images?.find(i => i.alt)?.alt || image.alt || productState.raw_name };
            }

            // It's a new image that needs to be uploaded.
            let imageToUploadUri = image.dataUri;
            if (applyWatermark && settings.watermarkImageUrl) {
                try {
                    imageToUploadUri = await applyWatermarkServerSide(image.dataUri, settings.watermarkImageUrl, settings);
                } catch (watermarkError: any) {
                   console.error("Watermark application failed:", watermarkError.message);
                   // Continue with the original image
                }
            }

            const uploadedImage = await uploadImage(image.fileName, imageToUploadUri);
            const aiAlt = productState.aiContent?.images?.find(i => i.alt)?.alt;
            
            return { id: uploadedImage.id, src: uploadedImage.src, alt: aiAlt || productState.raw_name };
        })
    );


    // 2. Prepare final product data
    const finalAiContent = productState.aiContent || {};
    
    const finalCategories = finalAiContent.categories?.map(c => {
        const existing = availableCategories.find(cat => cat.name.toLowerCase() === c.toLowerCase());
        return existing ? { id: existing.id } : { name: c };
    }) || [];

    const finalData = {
        name: finalAiContent.name || productState.raw_name,
        sku: finalAiContent.sku,
        slug: finalAiContent.slug,
        regular_price: (finalAiContent.regular_price || productState.price_etb)?.toString(),
        description: finalAiContent.description,
        short_description: finalAiContent.short_description,
        categories: finalCategories,
        tags: finalAiContent.tags?.map(tag => ({ name: tag })),
        images: processedImages,
        attributes: finalAiContent.attributes?.map(attr => ({ name: attr.name, options: [attr.option] })),
        meta_data: finalAiContent.meta_data,
        status: status,
    };
    
    // 3. Create or Update Product
    let product;
    if (productState.editProductId) {
        product = await updateProduct(productState.editProductId, finalData);
    } else {
        product = await createProduct(finalData);
    }

    const message = productState.editProductId
      ? `Success! I've updated the product '${product.name}'.`
      : `Success! I've created the product '${product.name}' as a ${status}.`;

    return NextResponse.json({ message });

  } catch (error: any) {
    console.error("Save product API failed:", error);
    return NextResponse.json({ message: `I'm sorry, I failed to save the product. The system reported an error: ${error.message}` }, { status: 500 });
  }
}
