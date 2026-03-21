
'use server';

/**
 * @fileOverview An AI-supported flow to synchronize furniture product images to tag descriptions.
 * 
 * - bulkImageSyncFlow - Fetches 3-4 images from linked products for every tag and prepends them to the description.
 */

import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { syncTagImagesFlow } from './sync-tag-images-flow';

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
            const result = await syncTagImagesFlow(tag.id);
            if (result.success && !result.message.includes('already up to date')) {
                updatedCount++;
            }
        } catch (error) {
            console.error(`Failed to sync images for tag: ${tag.name}`, error);
        }
    }

    return {
        message: `Successfully synchronized furniture galleries for ${updatedCount} tags. Descriptions now feature up to 4 unique product images at 250px width.`,
        updatedCount: updatedCount,
    };
}
