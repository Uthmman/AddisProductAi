
'use server';

import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { generateTagSeoFlow } from './generate-tag-seo-flow';
import { WooTag } from '@/lib/types';
import { getSettings } from '@/lib/settings-api';

const BulkGenerateTagSeoOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken."),
  updatedCount: z.number().describe("The number of tags that were updated."),
});

export async function bulkGenerateTagSeoFlow(): Promise<z.infer<typeof BulkGenerateTagSeoOutputSchema>> {
    console.log("Starting bulk SEO generation for tags...");

    const [allTags, settings] = await Promise.all([
        wooCommerceApi.getAllProductTags(),
        getSettings()
    ]);
    
    // Filter for tags that don't have a description.
    const tagsToUpdate = allTags.filter(tag => !tag.description);

    if (tagsToUpdate.length === 0) {
        return {
            message: "All tags already have descriptions. No updates were needed.",
            updatedCount: 0,
        };
    }
    
    console.log(`Found ${tagsToUpdate.length} tags to update.`);

    let updatedCount = 0;

    // Process updates in parallel.
    const updatePromises = tagsToUpdate.map(async (tag: WooTag) => {
        try {
            const seoContent = await generateTagSeoFlow({ tagName: tag.name, settings });
            
            // Now we can update EVERYTHING via the API
            await wooCommerceApi.updateProductTag(tag.id, {
                description: seoContent.description,
                meta: {
                    _yoast_wpseo_title: seoContent.title,
                    _yoast_wpseo_metadesc: seoContent.metaDescription,
                    _yoast_wpseo_focuskw: seoContent.focusKeyphrase,
                }
            });
            console.log(`Successfully updated tag and SEO: ${tag.name}`);
            return true;
        } catch (error) {
            console.error(`Failed to update tag: ${tag.name}`, error);
            return false;
        }
    });

    const results = await Promise.all(updatePromises);
    updatedCount = results.filter(success => success).length;

    console.log(`Finished bulk generation. Updated ${updatedCount} tags.`);

    return {
        message: `Successfully generated descriptions and Yoast SEO data for ${updatedCount} out of ${tagsToUpdate.length} targeted tags.`,
        updatedCount: updatedCount,
    };
}
