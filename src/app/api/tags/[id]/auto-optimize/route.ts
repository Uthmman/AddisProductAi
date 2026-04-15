import { NextRequest, NextResponse } from 'next/server';
import { generateTagSeoFlow } from '@/ai/flows/generate-tag-seo-flow';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { getSettings } from '@/lib/settings-api';

/**
 * API route to automatically optimize a single product tag.
 * Performs: AI Content Generation + Image Syncing + Direct Saving.
 */
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idStr } = await params;
        const tagId = parseInt(idStr, 10);

        if (isNaN(tagId)) {
            return NextResponse.json({ message: 'Invalid tag ID' }, { status: 400 });
        }

        // 1. Fetch current tag and business settings
        const [tag, settings] = await Promise.all([
            wooCommerceApi.getSingleProductTag(tagId),
            getSettings()
        ]);

        if (!tag) {
            return NextResponse.json({ message: 'Tag not found' }, { status: 404 });
        }

        // 2. Run AI generation and fetch relevant furniture images in parallel
        const [seoContent, productImages] = await Promise.all([
            generateTagSeoFlow({ tagName: tag.name, settings }),
            wooCommerceApi.getProductImagesForTag(tag.id, 4)
        ]);

        // 3. Prepare metadata (Yoast SEO)
        const metaToUpdate: any = {
            _yoast_wpseo_title: seoContent.title,
            _yoast_wpseo_metadesc: seoContent.metaDescription,
            _yoast_wpseo_focuskw: seoContent.focusKeyphrase,
        };

        // If the tag has no main image, use the first product image found
        if (!tag.meta?.thumbnail_id && productImages.length > 0) {
            metaToUpdate._zenbaba_tag_image = productImages[0].src;
            metaToUpdate.thumbnail_id = productImages[0].id;
        }

        // 4. Build the furniture gallery HTML block
        // Adjust size based on count to keep it professional
        const size = productImages.length > 3 ? 150 : 250;
        let imagesHtml = '';
        for (const img of productImages) {
            const idClass = img.id ? ` wp-image-${img.id}` : '';
            imagesHtml += `<a href="${img.src}"><img src="${img.src}" alt="${tag.name}" width="${size}" height="${size}" style="object-fit: cover; margin-right: 10px; margin-bottom: 10px; border-radius: 4px;" class="alignnone size-medium${idClass}" /></a>`;
        }

        // Prepend images to the AI-generated description
        const finalDescription = imagesHtml + seoContent.description;

        // 5. Save the optimized tag to WordPress
        await wooCommerceApi.updateProductTag(tagId, {
            description: finalDescription,
            meta: metaToUpdate
        });

        return NextResponse.json({ 
            success: true, 
            message: `Successfully optimized and saved "${tag.name}" with ${productImages.length} images.` 
        });

    } catch (error: any) {
        console.error('Individual Tag Auto-Optimize failed:', error);
        
        // Handle AI rate limits specifically
        if (error.status === 429 || error.message?.includes('429')) {
            return NextResponse.json({ 
                message: 'The AI is currently busy. Please wait a minute and try again.',
                errorType: 'rate_limit'
            }, { status: 429 });
        }

        return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
    }
}
