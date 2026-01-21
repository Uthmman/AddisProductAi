'use server';
import { ai, runPrompt } from '@/ai/genkit';
import { z } from 'zod';
import * as wooCommerceApi from '@/lib/woocommerce-api';

const ActionPlanSchema = z.object({
  categorySlug: z.string().describe("The slug of the category to target. Use 'all' for all products."),
  action: z.enum(['set_sale', 'add_tags', 'remove_sale']).describe('The action to perform.'),
  salePercentage: z.number().optional().describe('The sale percentage to apply (e.g., 10 for 10%). Required for set_sale.'),
  tagsToAdd: z.array(z.string()).optional().describe("An array of tags to add. Required for add_tags."),
});

const actionPrompt = ai.definePrompt({
  name: 'bulkActionPrompt',
  input: { schema: z.object({ request: z.string(), categories: z.any() }) },
  output: { schema: ActionPlanSchema },
  prompt: `
    You are a WooCommerce store manager bot. Your task is to understand a user's bulk action request and translate it into a structured JSON plan.

    Analyze the user's request. Identify the target category, the action to perform, and any parameters for that action (like a sale percentage or a list of tags).

    - If the user wants to set a sale, the action is 'set_sale' and you must extract the percentage.
    - If the user wants to add keywords or tags, the action is 'add_tags' and you must extract the tags.
    - If the user wants to remove a sale, the action is 'remove_sale'.
    - Find the category slug the user is referring to from the list of available categories. If they say "all products", use 'all' as the categorySlug.

    User Request:
    "{{request}}"

    Available Categories:
    {{{json categories}}}
  `,
});

export async function bulkProductActionFlow(request: string) {
  const allCategories = await wooCommerceApi.getAllProductCategories();
  
  const { output: plan } = await runPrompt(actionPrompt, { request, categories: allCategories });

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
