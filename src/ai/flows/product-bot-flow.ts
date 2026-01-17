'use server';

/**
 * @fileOverview Defines a Genkit flow that acts as a conversational product creation bot.
 * This is a stateless version that does not retain conversation history to ensure stability.
 *
 * - productBotFlow - The main conversational flow.
 * - ProductBotInput - The input type, containing the chatId and new message.
 * - ProductBotOutput - The output type, containing the bot's response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createProduct } from '@/lib/woocommerce-api';

// NOTE: This is a stateless implementation. Conversation history and caching have been removed
// to resolve a persistent error with history management.

// Define the input schema for the flow
const ProductBotInputSchema = z.object({
  chatId: z.string().describe('A unique identifier for the conversation, like a Telegram chat ID.'),
  newMessage: z.string().describe('The latest message from the user.'),
  imageId: z.number().optional().nullable().describe('The ID of a recently uploaded image for the product.'),
});
export type ProductBotInput = z.infer<typeof ProductBotInputSchema>;

// Define the output schema for the flow
const ProductBotOutputSchema = z.object({
  text: z.string().describe("The bot's next text message to the user."),
});
export type ProductBotOutput = z.infer<typeof ProductBotOutputSchema>;


// The tool the AI can use to create a product
const createProductTool = ai.defineTool(
    {
        name: 'createProductTool',
        description: 'Use this tool to create a new product when you have all the necessary information (name and price).',
        inputSchema: z.object({
            name: z.string().describe('The name of the product.'),
            regular_price: z.string().describe('The price of the product as a string (e.g., "5000").'),
            images: z.array(z.object({ id: z.number() })).optional().describe('An array of image objects, each with an ID.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        try {
            console.log("Creating product with input:", input);
            const product = await createProduct({
                name: input.name,
                regular_price: String(input.regular_price), // Ensure price is a string for WooCommerce API
                images: input.images,
                type: 'simple',
                status: 'draft', // Create as draft by default
            });
            return { success: true, product };
        } catch (error: any) {
            console.error("Tool Error: Failed to create product:", error);
            // Throw a clear error to stop the flow and provide debug info.
            throw new Error(`Failed to create product in WooCommerce. Reason: ${error.message}`);
        }
    }
);


export async function productBotFlow(input: ProductBotInput): Promise<ProductBotOutput> {
  const { chatId, newMessage, imageId } = input;

  // Handle the initial call to the Mini App to get a welcome message.
  if (!newMessage && !imageId) {
    const welcomeMessage = "Hi there! I can help you create a new product. What's the name and price of the product you'd like to add? You can also upload a photo.";
    return { text: welcomeMessage };
  }

  try {
    // Combine text and image info into a single prompt for the stateless call.
    let userPrompt = newMessage;
    if (imageId) {
        userPrompt = `${newMessage || ''} [An image with ID ${imageId} has been provided for the product.]`;
    }

    const response = await ai.generate({
        prompt: userPrompt,
        system: `You are a helpful assistant for creating products in an e-commerce store. Your goal is to gather the necessary information from the user (product name, price, and optionally an image) and then use the available tool to create the product. This is a stateless interaction; you have no memory of past messages.

- If the user's message contains enough information to create a product (like a name and a price), you MUST call the 'createProductTool'.
- If the user provides only a name, ask for the price.
- If the user provides only a price, ask for the name.
- An image is optional. If the user message contains "[An image with ID ... has been provided for the product.]", you must pass this ID to the createProductTool in the 'images' array.
- After the tool runs successfully, your response must be: "I've created the product '[Product Name]' for you as a draft."
- If the tool fails and throws an error, inform the user clearly that the creation failed and provide the error reason. For example: "I'm sorry, I couldn't create the product. The system reported an error: [error message]".`,
        tools: [createProductTool],
        model: 'googleai/gemini-2.5-flash',
    });

    // Defensive check on the final response text
    const responseText = response.text;
    if (typeof responseText !== 'string') {
        console.error("Genkit response text is not a string:", responseText);
        throw new Error("Received an invalid response from the AI model.");
    }

    return {
      text: responseText,
    };

  } catch (error: any) {
    console.error("Genkit Flow Error:", error);
    // Return an error state that the client can handle
    return {
      text: `I'm sorry, I encountered an error and couldn't process your request. The system reported: ${error.message}`,
    };
  }
}
