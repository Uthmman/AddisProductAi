'use server';

/**
 * @fileOverview A targeted flow to synchronize images for a single product tag.
 */

import * as wooCommerceApi from '@/lib/woocommerce-api';

export async function syncTagImagesFlow(tagId: number): Promise<{success: boolean, message: string}> {
    console.log(`Starting image sync for tag ID: ${tagId}...`);

    const tag = await wooCommerceApi.getSingleProductTag(tagId);
    if (!tag) {
        throw new Error("The specified tag could not be found.");
    }

    // Fetch up to 4 unique product images for this specific tag
    const productImages = await wooCommerceApi.getProductImagesForTag(tag.id, 4);
    
    if (productImages.length === 0) {
        return { success: false, message: `No furniture products found for tag: ${tag.name}.` };
    }

    const currentDescription = tag.description || '';
    const metaToUpdate: any = { ...tag.meta };

    // Build the responsive furniture gallery HTML block (4 per row on PC)
    let imagesHtml = '';
    let newImageCount = 0;

    for (const img of productImages) {
        // Prevent adding the same image source multiple times
        if (!currentDescription.includes(img.src)) {
            newImageCount++;
        }
    }

    // If we found new images to add, update the tag
    if (newImageCount > 0) {
        imagesHtml = '\n<div class="zenbaba-furniture-grid" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 25px;">\n';
        for (const img of productImages) {
            const idClass = img.id ? ` wp-image-${img.id}` : '';
            imagesHtml += `  <a href="${img.src}" target="_blank" style="width: calc(25% - 9px); min-width: 140px; text-decoration: none; display: block;">\n`;
            imagesHtml += `    <img src="${img.src}" class="alignnone size-medium${idClass}" alt="${tag.name}" width="300" height="300" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />\n`;
            imagesHtml += `  </a>\n`;
        }
        imagesHtml += '</div>\n';

        // Set primary thumbnail if missing
        if (!tag.meta?.thumbnail_id) {
            metaToUpdate.thumbnail_id = productImages[0].id;
            metaToUpdate._zenbaba_tag_image = productImages[0].src;
        }

        // Clean existing gallery if any (optional, but here we just prepend)
        const finalDescription = imagesHtml + currentDescription;

        await wooCommerceApi.updateProductTag(tag.id, {
            description: finalDescription,
            meta: metaToUpdate
        });
        
        return { 
            success: true, 
            message: `Successfully synchronized furniture gallery for ${tag.name}. Added ${productImages.length} unique images to description.` 
        };
    }

    return { 
        success: true, 
        message: `Images for ${tag.name} are already up to date.` 
    };
}
