import { NextRequest, NextResponse } from 'next/server';
import { generateTagSeoFlow } from '@/ai/flows/generate-tag-seo-flow';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { getSettings } from '@/lib/settings-api';

export const maxDuration = 120; // Ensure single tag optimization has enough time for AI and WordPress

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

        // 4. Build the responsive furniture gallery HTML block
        let imagesHtml = '';
        if (productImages.length > 0) {
            imagesHtml = '\n<div class="zenbaba-furniture-grid" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 25px;">\n';
            for (const img of productImages) {
                const idClass = img.id ? ` wp-image-${img.id}` : '';
                imagesHtml += `  <a href="${img.src}" target="_blank" style="width: calc(25% - 9px); min-width: 140px; text-decoration: none; display: block;">\n`;
                imagesHtml += `    <img src="${img.src}" class="alignnone size-medium${idClass}" alt="${tag.name}" width="300" height="300" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />\n`;
                imagesHtml += `  </a>\n`;
            }
            imagesHtml += '</div>\n';
        }

        // Prepend gallery grid to the AI-generated description
        const finalDescription = imagesHtml + seoContent.description;

        // 5. Save the optimized tag to WordPress
        await wooCommerceApi.updateProductTag(tagId, {
            description: finalDescription,
            meta: metaToUpdate
        });

        return NextResponse.json({ 
            success: true, 
            message: `Successfully optimized and saved "${tag.name}" with a responsive gallery.` 
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
