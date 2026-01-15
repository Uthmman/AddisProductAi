'use server';

/**
 * @fileOverview Defines a Genkit flow that acts as a conversational product creation bot.
 *
 * This flow manages a conversation to gather product details (name, price) and
 * then calls the WooCommerce API to create the product.
 *
 * - productBotFlow - The main conversational flow.
 * - ProductBotInput - The input type, containing the conversation history.
 * - ProductBotOutput - The output type, containing the bot's response and creation status.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { createProduct } from '@/lib/woocommerce-api';
import { Part } from 'genkit';


// Define the structure for a single message in the conversation
const MessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.array(z.any()), // Can store text and tool parts
});
export type Message = z.infer<typeof MessageSchema>;

// Define the input schema for the flow
const ProductBotInputSchema = z.object({
  history: z.array(MessageSchema).describe('The history of the conversation so far.'),
});
export type ProductBotInput = z.infer<typeof ProductBotInputSchema>;

// Define the output schema for the flow
const ProductBotOutputSchema = z.object({
  text: z.string().describe("The bot's next text message to the user."),
  newHistory: z.array(MessageSchema).describe('The full, updated conversation history.'),
  isCreated: z.boolean().describe('Set to true only when the product has been successfully created.'),
  product: z.any().optional().describe('The created product object, if isCreated is true.'),
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
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        try {
            console.log("Creating product with input:", input);
            const product = await createProduct({
                name: input.name,
                regular_price: String(input.regular_price), // Ensure price is a string for WooCommerce API
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
  try {
    const history = (input.history || []).map(m => ({
        role: m.role,
        content: m.content as Part[],
    }));
    
    if (history.length === 0) {
        throw new Error("Cannot run bot flow with empty history.");
    }

    // The entire history EXCEPT the last message is used to initialize the chat.
    const chatHistory = history.slice(0, -1);
    const lastMessage = history[history.length - 1];

    if (lastMessage.role !== 'user') {
        throw new Error("The last message in the history must be from the user.");
    }
    
    const userMessageText = lastMessage.content.find(p => p.text)?.text || '';

    // Initialize the chat with the existing history from the client
    const chat = ai.chat({
      system: `You are a helpful assistant for creating products in an e-commerce store. Your goal is to gather the necessary information from the user (product name and price) and then use the available tool to create the product.

- Be conversational and friendly.
- If the user provides a product name but no price, ask for the price.
- If the user provides a price but no name, ask for the name.
- Once you have both the name and the price, you MUST confirm with the user before you create the product. For example: "Great! I have the name as 'Product Name' and the price as '100'. Shall I create the product?"
- Only when the user confirms, call the 'createProductTool' with the collected 'name' and 'regular_price'. The 'regular_price' MUST be a string.
- After the tool runs, your response should be based on its output. If it was successful, say "I've created the product '[Product Name]' for you as a draft."
- If the tool fails and throws an error, inform the user clearly that the creation failed and provide the error reason. For example: "I'm sorry, I couldn't create the product. The system reported an error: [error message]".`,
      history: chatHistory,
    });

    // Send the new user message to the initialized chat.
    // Genkit handles the tool-calling loop automatically.
    const response = await chat.send({
      text: userMessageText,
      tools: [createProductTool],
    });

    // Determine if the product was created in this turn
    let createdProduct = null;
    const wasCreated = response.history.some(m =>
      m.content.some(part => {
        if (part.toolResponse?.name === 'createProductTool') {
          const output = part.toolResponse.output as any;
          if (output.success) {
            createdProduct = output.product;
            return true;
          }
        }
        return false;
      })
    );

    return {
      text: response.text,
      newHistory: response.history.map(m => ({ role: m.role, content: m.content })),
      isCreated: wasCreated,
      product: createdProduct,
    };

  } catch (error: any) {
    console.error("Genkit Chat Error:", error);
    // Return an error state that the client can handle
    return {
      text: `I'm sorry, I encountered an error and couldn't process your request. The system reported: ${error.message}`,
      newHistory: input.history, // return original history on error
      isCreated: false,
    };
  }
}
