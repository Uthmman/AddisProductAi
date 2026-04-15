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
            
            // Prioritize those that are completely empty
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

            // Build responsive gallery HTML block (4 per row on PC)
            let imagesHtml = '';
            if (productImages.length > 0) {
                imagesHtml = '\n<div class="zenbaba-furniture-grid" style="display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 25px;">\n';
                for (const img of productImages) {
                    const idClass = img.id ? ` wp-image-${img.id}` : '';
                    imagesHtml += `  <a href="${img.src}" target="_blank" style="width: calc(25% - 9px); min-width: 140px; text-decoration: none; display: block;">\n`;
                    imagesHtml += `    <img src="${img.src}" class="alignnone size-medium${idClass}" alt="${tag.name}" width="300" height="300" style="width: 100%; aspect-ratio: 1/1; object-fit: cover; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" />\n`;
                    imagesHtml += `  </a>\n`;
                }
                imagesHtml += '</div>\n';
            }

            // Prepend gallery grid to the AI-generated description
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
        message: `Successfully generated descriptions, responsive galleries, and Yoast SEO data for ${updatedCount} tags.`,
        updatedCount: updatedCount,
    };
}
