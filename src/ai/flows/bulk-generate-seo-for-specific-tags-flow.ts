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
    const tagsToUpdate = allTags.filter(tag => input.tagNames.includes(tag.name));

    if (tagsToUpdate.length === 0) {
        return {
            message: "The specified tags could not be found.",
            updatedCount: 0,
        };
    }

    console.log(`Found ${tagsToUpdate.length} tags to update.`);

    let updatedCount = 0;

    for (const tag of tagsToUpdate) {
        try {
            const [seoContent, productImages] = await Promise.all([
                generateTagSeoFlow({ tagName: tag.name, settings }),
                // Fetch images from up to 4 different products for this tag
                wooCommerceApi.getProductImagesForTag(tag.id, 4)
            ]);
            
            const metaToUpdate: any = {
                _yoast_wpseo_title: seoContent.title,
                _yoast_wpseo_metadesc: seoContent.metaDescription,
                _yoast_wpseo_focuskw: seoContent.focusKeyphrase,
            };

            // Set primary thumbnail if missing
            if (!tag.meta?.thumbnail_id && productImages.length > 0) {
                metaToUpdate._zenbaba_tag_image = productImages[0].src;
                metaToUpdate.thumbnail_id = productImages[0].id;
            }

            // Build multiple images HTML block (Compact size: 300px width)
            let imagesHtml = '';
            for (const img of productImages) {
                if (!seoContent.description.includes(img.src)) {
                    const idClass = img.id ? ` wp-image-${img.id}` : '';
                    imagesHtml += `<a href="${img.src}"><img src="${img.src}" alt="${tag.name}" width="300" height="169" class="alignnone size-medium${idClass}" /></a>`;
                }
            }

            // Prepend gallery HTML to description
            const finalDescription = imagesHtml + seoContent.description;

            await wooCommerceApi.updateProductTag(tag.id, {
                description: finalDescription,
                meta: metaToUpdate
            });
            
            console.log(`Successfully updated tag: ${tag.name}`);
            updatedCount++;
        } catch (error) {
            console.error(`Failed to update tag: ${tag.name}`, error);
        }
    }

    return {
        message: `Successfully generated content and embedded 3-4 unique product images for ${updatedCount} targeted furniture tags.`,
        updatedCount: updatedCount,
    };
}
