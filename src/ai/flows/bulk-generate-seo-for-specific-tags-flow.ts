
import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { generateTagSeoFlow } from './generate-tag-seo-flow';
import { WooTag } from '@/lib/types';
import { getSettings } from '@/lib/settings-api';

export const BulkGenerateSeoForSpecificTagsInputSchema = z.object({
  tagNames: z.array(z.string()).describe("The names of the tags to optimize."),
});
export type BulkGenerateSeoForSpecificTagsInput = z.infer<typeof BulkGenerateSeoForSpecificTagsInputSchema>;

const BulkGenerateSeoForSpecificTagsOutputSchema = z.object({
  message: z.string().describe("A summary of the actions taken."),
  updatedCount: z.number().describe("The number of tags that were updated."),
});

export async function bulkGenerateSeoForSpecificTagsFlow(input: BulkGenerateSeoForSpecificTagsInput): Promise<z.infer<typeof BulkGenerateSeoForSpecificTagsOutputSchema>> {
    console.log(`Starting bulk SEO generation for ${input.tagNames.length} specific tags...`);

    if (input.tagNames.length === 0) {
        return { message: "No tag names provided.", updatedCount: 0 };
    }

    const [allTags, settings] = await Promise.all([
        wooCommerceApi.getAllProductTags(),
        getSettings()
    ]);

    // Find the tag objects that match the provided names.
    const tagsToUpdate = allTags.filter(tag => input.tagNames.includes(tag.name) && !tag.description);

    if (tagsToUpdate.length === 0) {
        return {
            message: "The specified tags already have descriptions or could not be found. No updates were needed.",
            updatedCount: 0,
        };
    }

    console.log(`Found ${tagsToUpdate.length} tags to update.`);

    let updatedCount = 0;

    const updatePromises = tagsToUpdate.map(async (tag: WooTag) => {
        try {
            const seoContent = await generateTagSeoFlow({ tagName: tag.name, settings });
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

    console.log(`Finished bulk generation for specific tags. Updated ${updatedCount} tags.`);

    return {
        message: `Successfully generated SEO descriptions for ${updatedCount} out of ${tagsToUpdate.length} targeted tags.`,
        updatedCount: updatedCount,
    };
}
