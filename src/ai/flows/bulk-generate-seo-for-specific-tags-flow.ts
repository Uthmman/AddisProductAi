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
    // Update if description is missing OR Yoast focus keyword is missing OR tag image is missing.
    const tagsToUpdate = allTags.filter(tag => 
        input.tagNames.includes(tag.name) && (!tag.description || !tag.meta?._yoast_wpseo_focuskw || !tag.meta?._zenbaba_tag_image)
    );

    if (tagsToUpdate.length === 0) {
        return {
            message: "The specified tags already have full SEO data and images or could not be found.",
            updatedCount: 0,
        };
    }

    console.log(`Found ${tagsToUpdate.length} tags to update.`);

    let updatedCount = 0;

    for (const tag of tagsToUpdate) {
        try {
            const [seoContent, latestImage] = await Promise.all([
                generateTagSeoFlow({ tagName: tag.name, settings }),
                (!tag.meta?._zenbaba_tag_image) ? wooCommerceApi.getLatestProductImageForTag(tag.id) : Promise.resolve(null)
            ]);
            
            const metaToUpdate: any = {
                _yoast_wpseo_title: seoContent.title,
                _yoast_wpseo_metadesc: seoContent.metaDescription,
                _yoast_wpseo_focuskw: seoContent.focusKeyphrase,
            };

            if (latestImage) {
                metaToUpdate._zenbaba_tag_image = latestImage;
            }

            await wooCommerceApi.updateProductTag(tag.id, {
                description: seoContent.description,
                meta: metaToUpdate
            });
            
            console.log(`Successfully updated tag: ${tag.name}`);
            updatedCount++;
        } catch (error) {
            console.error(`Failed to update tag: ${tag.name}`, error);
        }
    }

    return {
        message: `Successfully generated content and images for ${updatedCount} targeted tags.`,
        updatedCount: updatedCount,
    };
}
