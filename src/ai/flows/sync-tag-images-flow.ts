
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

    // Build the image HTML block
    // Logic: if > 3 images, make them 150px square. Otherwise 250px wide.
    const useSquare = productImages.length > 3;
    const imgWidth = useSquare ? 150 : 250;
    const imgHeight = useSquare ? 150 : 141;

    let imagesHtml = '';
    for (const img of productImages) {
        // Prevent adding the same image source multiple times
        if (!currentDescription.includes(img.src)) {
            const idClass = img.id ? ` wp-image-${img.id}` : '';
            imagesHtml += `<a href="${img.src}"><img src="${img.src}" alt="${tag.name}" width="${imgWidth}" height="${imgHeight}" class="alignnone size-medium${idClass}" /></a>`;
        }
    }

    // If we found new images to add, update the tag
    if (imagesHtml) {
        // Set primary thumbnail if missing
        if (!tag.meta?.thumbnail_id) {
            metaToUpdate.thumbnail_id = productImages[0].id;
            metaToUpdate._zenbaba_tag_image = productImages[0].src;
        }

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
