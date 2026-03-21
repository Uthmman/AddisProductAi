
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
    
    // Filter for tags that don't have a description OR are missing Yoast focus keywords.
    const tagsToUpdate = allTags.filter(tag => !tag.description || !tag.meta?._yoast_wpseo_focuskw);

    if (tagsToUpdate.length === 0) {
        return {
            message: "All tags already have descriptions and Yoast SEO data. No updates were needed.",
            updatedCount: 0,
        };
    }
    
    console.log(`Found ${tagsToUpdate.length} tags to update.`);

    let updatedCount = 0;

    // Process updates in sequence
    for (const tag of tagsToUpdate) {
        try {
            const [seoContent, latestImage] = await Promise.all([
                generateTagSeoFlow({ tagName: tag.name, settings }),
                // Automatically grab the latest product image if the tag doesn't have one
                (!tag.meta?.thumbnail_id) ? wooCommerceApi.getLatestProductImageForTag(tag.id) : Promise.resolve(null)
            ]);
            
            const metaToUpdate: any = {
                _yoast_wpseo_title: seoContent.title,
                _yoast_wpseo_metadesc: seoContent.metaDescription,
                _yoast_wpseo_focuskw: seoContent.focusKeyphrase,
            };

            const imageSrc = latestImage?.src || tag.meta?._zenbaba_tag_image;
            const thumbId = latestImage?.id || tag.meta?.thumbnail_id;

            if (latestImage) {
                metaToUpdate._zenbaba_tag_image = latestImage.src;
                metaToUpdate.thumbnail_id = latestImage.id;
            }

            // Prepend image HTML to description
            let finalDescription = seoContent.description;
            if (imageSrc && !finalDescription.includes(imageSrc)) {
                const idClass = thumbId ? ` wp-image-${thumbId}` : '';
                const imgHtml = `<a href="${imageSrc}"><img src="${imageSrc}" alt="${tag.name}" width="986" height="531" class="alignnone size-full${idClass}" /></a>`;
                finalDescription = imgHtml + finalDescription;
            }

            await wooCommerceApi.updateProductTag(tag.id, {
                description: finalDescription,
                meta: metaToUpdate
            });
            
            console.log(`Successfully updated tag and SEO: ${tag.name}`);
            updatedCount++;
        } catch (error) {
            console.error(`Failed to update tag: ${tag.name}`, error);
        }
    }

    console.log(`Finished bulk generation. Updated ${updatedCount} tags.`);

    return {
        message: `Successfully generated descriptions, linked official thumbnails, and Yoast SEO data for ${updatedCount} out of ${tagsToUpdate.length} targeted tags.`,
        updatedCount: updatedCount,
    };
}
