'use server';

/**
 * @fileOverview Defines a Genkit flow that acts as a conversational product creation bot.
 * This version is designed for a stateless environment like a Telegram bot,
 * managing conversation history in a simple in-memory cache.
 *
 * - productBotFlow - The main conversational flow.
 * - ProductBotInput - The input type, containing the chatId and new message.
 * - ProductBotOutput - The output type, containing the bot's response.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createProduct } from '@/lib/woocommerce-api';
import { Part, generate } from 'genkit';
import NodeCache from 'node-cache';

// Simple in-memory cache to store conversation history.
// TTL of 10 minutes (600 seconds) to clear old conversations.
const conversationCache = new NodeCache({ stdTTL: 600 });

// Define the structure for a single message in the conversation
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.any()), // Can store text and tool parts
});
export type Message = z.infer<typeof MessageSchema>;

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
  
  if (!newMessage && !imageId) {
    // If it's the very first message, just send the welcome text.
    return {
      text: "Hi there! I can help you create a new product. What's the name and price of the product you'd like to add? You can also upload a photo.",
    };
  }

  try {
    // Retrieve history from cache or start a new one
    const cachedHistory = conversationCache.get<Message[]>(chatId) || [];
    
    const initialHistory = cachedHistory.length === 0 
      ? [{ role: 'model' as const, content: [{ text: "Hi there! I can help you create a new product. What's the name and price of the product you'd like to add? You can also upload a photo." }] }]
      : cachedHistory;

    const historyForGenkit = initialHistory.map(m => ({
        role: m.role,
        content: m.content as Part[],
    }));
    
    // Add the new user message to the history for the API call
    let userMessage = newMessage;
    if (imageId) {
        // If an image ID is provided, add context to the user's message for the AI
        userMessage = `${newMessage || ''} [An image with ID ${imageId} has been provided for the product.]`;
    }
    historyForGenkit.push({ role: 'user', content: [{ text: userMessage }] });

    const response = await generate({
        system: `You are a helpful assistant for creating products in an e-commerce store. Your goal is to gather the necessary information from the user (product name, price, and optionally an image) and then use the available tool to create the product.

- Be conversational and friendly.
- If the user provides a product name but no price, ask for the price.
- If the user provides a price but no name, ask for the name.
- An image is optional. If the user message contains "[An image with ID ... has been provided for the product.]", you must pass this ID to the createProductTool in the 'images' array.
- Once you have both the name and the price, you MUST confirm with the user before you create the product. For example: "Great! I have the name as 'Product Name' and the price as '100'. Shall I create the product?" If an image was provided, also mention it: "I see you've attached an image as well."
- Only when the user confirms, call the 'createProductTool' with the collected 'name' and 'regular_price'. The 'regular_price' MUST be a string. If you have an imageId, pass it as \`images: [{ id: YOUR_IMAGE_ID }]\`.
- After the tool runs, your response should be based on its output. If it was successful, say "I've created the product '[Product Name]' for you as a draft."
- If the tool fails and throws an error, inform the user clearly that the creation failed and provide the error reason. For example: "I'm sorry, I couldn't create the product. The system reported an error: [error message]".`,
        history: historyForGenkit,
        tools: [createProductTool],
        model: ai.model,
    });
    
    // Save the full, updated history back to the cache
    const newHistoryForCache = response.history.map(m => ({ role: m.role, content: m.content }));
    conversationCache.set(chatId, newHistoryForCache);

    return {
      text: response.text,
    };

  } catch (error: any) {
    console.error("Genkit Flow Error:", error);
    // Return an error state that the client can handle
    return {
      text: `I'm sorry, I encountered an error and couldn't process your request. The system reported: ${error.message}`,
    };
  }
}
