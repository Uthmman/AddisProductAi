'use server';

import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { generateTagSeoFlow } from './generate-tag-seo-flow';
import { WooTag } from '@/lib/types';
import { getSettings } from '@/lib/settings-api';

const BulkGenerateSeoForSpecificTagsOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken."),
  updatedCount: z.number().describe("The number of tags that were updated."),
});
type BulkGenerateSeoForSpecificTagsOutput = z.infer<typeof BulkGenerateSeoForSpecificTagsOutputSchema>;

export async function bulkGenerateSeoForSpecificTagsFlow(input: {tagNames: string[]}): Promise<BulkGenerateSeoForSpecificTagsOutput> {
    console.log(`Starting bulk SEO generation for ${input.tagNames.length} specific tags...`);

    if (input.tagNames.length === 0) {
        return { message: "No tag names provided.", updatedCount: 0 };
    }

    const [allTags, settings] = await Promise.all([
        wooCommerceApi.getAllProductTags(),
        getSettings()
    ]);

    // Find the tag objects that match the provided names.
    // Update if description is missing OR Yoast focus keyword is missing.
    const tagsToUpdate = allTags.filter(tag => 
        input.tagNames.includes(tag.name) && (!tag.description || !tag.meta?._yoast_wpseo_focuskw)
    );

    if (tagsToUpdate.length === 0) {
        return {
            message: "The specified tags already have descriptions and Yoast SEO data or could not be found. No updates were needed.",
            updatedCount: 0,
        };
    }

    console.log(`Found ${tagsToUpdate.length} tags to update.`);

    let updatedCount = 0;

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

    console.log(`Finished bulk generation for specific tags. Updated ${updatedCount} tags.`);

    return {
        message: `Successfully generated descriptions and Yoast SEO data for ${updatedCount} out of ${tagsToUpdate.length} targeted tags.`,
        updatedCount: updatedCount,
    };
}