
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
    // We prioritize tags that have absolutely nothing (no description AND no meta) first.
    const tagsToUpdate = allTags
        .filter(tag => !tag.description?.trim() || !tag.meta?._yoast_wpseo_focuskw)
        .sort((a, b) => {
            const aEmpty = !a.description?.trim() && !a.meta?._yoast_wpseo_focuskw;
            const bEmpty = !b.description?.trim() && !b.meta?._yoast_wpseo_focuskw;
            
            // Prioritize those that are completely empty (true < false in sort if we want true first)
            if (aEmpty && !bEmpty) return -1;
            if (!aEmpty && bEmpty) return 1;
            return 0;
        });

    if (tagsToUpdate.length === 0) {
        return {
            message: "All tags already have descriptions and Yoast SEO data. No updates were needed.",
            updatedCount: 0,
        };
    }
    
    console.log(`Found ${tagsToUpdate.length} tags to update. Prioritizing completely empty tags.`);

    let updatedCount = 0;

    // Process updates in sequence
    for (const tag of tagsToUpdate) {
        try {
            const [seoContent, productImages] = await Promise.all([
                generateTagSeoFlow({ tagName: tag.name, settings }),
                // Automatically grab images from multiple unique products linked to this tag
                wooCommerceApi.getProductImagesForTag(tag.id, 4)
            ]);
            
            const metaToUpdate: any = {
                _yoast_wpseo_title: seoContent.title,
                _yoast_wpseo_metadesc: seoContent.metaDescription,
                _yoast_wpseo_focuskw: seoContent.focusKeyphrase,
            };

            // Set primary thumbnail if the tag doesn't have one
            if (!tag.meta?.thumbnail_id && productImages.length > 0) {
                metaToUpdate._zenbaba_tag_image = productImages[0].src;
                metaToUpdate.thumbnail_id = productImages[0].id;
            }

            // Build multiple images HTML block
            // Logic: if > 3 images, make them 150px square. Otherwise 250px square.
            const useSquareSmall = productImages.length > 3;
            const size = useSquareSmall ? 150 : 250;

            let imagesHtml = '';
            for (const img of productImages) {
                // Prevent adding the same image source multiple times
                if (!tag.description || !tag.description.includes(img.src)) {
                    const idClass = img.id ? ` wp-image-${img.id}` : '';
                    // Force equal height/width with object-fit: cover
                    imagesHtml += `<a href="${img.src}"><img src="${img.src}" alt="${tag.name}" width="${size}" height="${size}" style="object-fit: cover; margin-right: 10px; margin-bottom: 10px; border-radius: 4px;" class="alignnone size-medium${idClass}" /></a>`;
                }
            }

            // Prepend gallery HTML to description
            const finalDescription = imagesHtml + seoContent.description;

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
        message: `Successfully generated descriptions, linked product images, and Yoast SEO data for ${updatedCount} tags. Entries with no existing content were prioritized.`,
        updatedCount: updatedCount,
    };
}
