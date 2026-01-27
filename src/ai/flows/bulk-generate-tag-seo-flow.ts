
'use server';
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { generateTagSeoFlow } from './generate-tag-seo-flow';
import { WooTag } from '@/lib/types';
import { getSettings } from '@/lib/settings-api';

// This flow doesn't need input.
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
            
            // We can only update the description via the API.
            // The focus keyphrase and meta description are still a manual copy-paste step for the user.
            await wooCommerceApi.updateProductTag(tag.id, {
                description: seoContent.description,
            });
            console.log(`Successfully updated tag: ${tag.name}`);
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
        message: `Successfully generated SEO descriptions for ${updatedCount} out of ${tagsToUpdate.length} targeted tags.`,
        updatedCount: updatedCount,
    };
}
