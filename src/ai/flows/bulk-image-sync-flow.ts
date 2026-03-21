'use server';

/**
 * @fileOverview An AI-supported flow to synchronize furniture product images to tag descriptions.
 * 
 * - bulkImageSyncFlow - Fetches 3-4 images from linked products for every tag and prepends them to the description.
 */

import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';

const BulkImageSyncOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken."),
  updatedCount: z.number().describe("The number of tags that were updated."),
});

export async function bulkImageSyncFlow(): Promise<z.infer<typeof BulkImageSyncOutputSchema>> {
    console.log("Starting bulk image synchronization for all furniture tags...");

    const allTags = await wooCommerceApi.getAllProductTags();
    
    if (allTags.length === 0) {
        return { message: "No tags found to synchronize.", updatedCount: 0 };
    }
    
    console.log(`Found ${allTags.length} tags to process.`);

    let updatedCount = 0;

    for (const tag of allTags) {
        try {
            // Fetch up to 4 unique product images for this specific tag
            const productImages = await wooCommerceApi.getProductImagesForTag(tag.id, 4);
            
            if (productImages.length === 0) {
                console.log(`No products found for tag: ${tag.name}, skipping image sync.`);
                continue;
            }

            const currentDescription = tag.description || '';
            const metaToUpdate: any = { ...tag.meta };

            // Build the image HTML block (Compact size: 300px width)
            let imagesHtml = '';
            for (const img of productImages) {
                // Prevent adding the same image source multiple times
                if (!currentDescription.includes(img.src)) {
                    const idClass = img.id ? ` wp-image-${img.id}` : '';
                    imagesHtml += `<a href="${img.src}"><img src="${img.src}" alt="${tag.name}" width="300" height="169" class="alignnone size-medium${idClass}" /></a>`;
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
                
                updatedCount++;
                console.log(`Successfully synced images for tag: ${tag.name}`);
            }
        } catch (error) {
            console.error(`Failed to sync images for tag: ${tag.name}`, error);
        }
    }

    return {
        message: `Successfully synchronized furniture galleries for ${updatedCount} tags. Descriptions now feature up to 4 unique product images.`,
        updatedCount: updatedCount,
    };
}
