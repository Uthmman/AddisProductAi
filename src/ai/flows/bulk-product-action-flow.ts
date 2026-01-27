'use server';
import { ai, generate } from '@/ai/genkit';
import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';
import { getPrompts } from '@/lib/prompts-api';
import * as handlebars from 'handlebars';

handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
});

const ActionPlanSchema = z.object({
  categorySlug: z.string().describe("The slug of the category to target. Use 'all' for all products."),
  action: z.enum(['set_sale', 'add_tags', 'remove_sale']).describe('The action to perform.'),
  salePercentage: z.number().optional().describe('The sale percentage to apply (e.g., 10 for 10%). Required for set_sale.'),
  tagsToAdd: z.array(z.string()).optional().describe("An array of tags to add. Required for add_tags."),
});

export async function bulkProductActionFlow(request: string) {
  const allCategories = await wooCommerceApi.getAllProductCategories();
  
  const prompts = await getPrompts();
  const promptTemplate = prompts.bulkProductAction;
  const template = handlebars.compile(promptTemplate);
  const renderedPrompt = template({ request, categories: allCategories });

  const { output: plan } = await generate({
    prompt: renderedPrompt,
    output: { schema: ActionPlanSchema },
  });


  if (!plan) {
    throw new Error("I could not understand your request. Please try phrasing it differently.");
  }

  const targetCategoryId = plan.categorySlug === 'all' 
    ? undefined 
    : allCategories.find(c => c.slug === plan.categorySlug)?.id.toString();

  if (plan.categorySlug !== 'all' && !targetCategoryId) {
    throw new Error(`I couldn't find a category with the slug '${plan.categorySlug}'.`);
  }

  // Fetch all products for that category (up to 100)
  const { products } = await wooCommerceApi.getProducts(1, 100, targetCategoryId);

  if (products.length === 0) {
    return { response: `I found no products in the '${plan.categorySlug}' category to update.` };
  }

  const updates: any[] = [];

  for (const product of products) {
    let update: { id: number; sale_price?: string; tags?: { name: string }[] } = { id: product.id };

    switch (plan.action) {
      case 'set_sale':
        if (plan.salePercentage) {
          const regularPrice = parseFloat(product.regular_price);
          if (regularPrice > 0) {
            const salePrice = regularPrice * (1 - plan.salePercentage / 100);
            update.sale_price = salePrice.toFixed(2);
          }
        }
        break;
      
      case 'add_tags':
        if (plan.tagsToAdd) {
          const existingTags = product.tags.map(t => t.name);
          const newTags = [...new Set([...existingTags, ...plan.tagsToAdd])];
          update.tags = newTags.map(name => ({ name }));
        }
        break;

      case 'remove_sale':
        update.sale_price = '';
        break;
    }
    if (Object.keys(update).length > 1) {
      updates.push(update);
    }
  }

  if (updates.length > 0) {
    await wooCommerceApi.updateProductBatch({ update: updates });
    return { response: `Successfully updated ${updates.length} products.` };
  } else {
    return { response: "No updates were necessary for the products found." };
  }
}
