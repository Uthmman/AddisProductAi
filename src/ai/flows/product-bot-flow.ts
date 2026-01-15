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
import { z } from 'genkit';
import { createProduct } from '@/lib/woocommerce-api';
import { WooProduct } from '@/lib/types';


// Define the structure for a single message in the conversation
const MessageSchema = z.object({
  role: z.enum(['user', 'bot']),
  content: z.union([z.string(), z.array(z.any())]),
});
export type Message = z.infer<typeof MessageSchema>;

// Define the input schema for the flow
const ProductBotInputSchema = z.object({
  messages: z.array(MessageSchema).describe('The history of the conversation so far.'),
});
export type ProductBotInput = z.infer<typeof ProductBotInputSchema>;

// Define the output schema for the flow
const ProductBotOutputSchema = z.object({
  response: z.string().describe("The bot's next message to the user."),
  isProductCreated: z.boolean().describe('Set to true only when the product has been successfully created.'),
  product: z.any().optional().describe('The created product object, if isProductCreated is true.'),
  messages: z.array(MessageSchema).optional().describe("The updated conversation history including the bot's response."),
});
export type ProductBotOutput = z.infer<typeof ProductBotOutputSchema>;


// The tool the AI can use to create a product
const createProductTool = ai.defineTool(
    {
        name: 'createProductTool',
        description: 'Use this tool to create a new product when you have all the necessary information (name and price).',
        inputSchema: z.object({
            name: z.string().describe('The name of the product.'),
            regular_price: z.any().describe('The price of the product.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        try {
            console.log("Creating product with input:", input);
            const product = await createProduct({
                name: input.name,
                regular_price: input.regular_price.toString(),
                type: 'simple',
                status: 'draft', // Create as draft by default
            });
            return { success: true, product };
        } catch (error: any) {
            console.error("Failed to create product:", error);
            return { success: false, error: error.message };
        }
    }
);

// Define and export the main flow function
export const productBotFlow = ai.defineFlow(
  {
    name: 'productBotFlow',
    inputSchema: ProductBotInputSchema,
    outputSchema: ProductBotOutputSchema,
  },
  async (input): Promise<ProductBotOutput> => {
    
    // 2. Separate the NEWEST message from the history
    const historyData = [...input.messages];
    const latestUserMessage = historyData.pop();

    // 3. Map history correctly
    const history = historyData.map(m => ({
      role: m.role === 'bot' ? 'model' : 'user' as const,
      content: typeof m.content === 'string' ? [{ text: m.content }] : m.content
    }));


    try {
        // 4. Initialize Chat
        const chat = ai.chat({
            system: `You are a helpful assistant for creating products in an e-commerce store. Your goal is to gather the necessary information from the user (product name and price) and then use the available tool to create the product.

- Be conversational and friendly.
- If the user provides a product name but no price, ask for the price.
- If the user provides a price but no name, ask for the name.
- Once you have both the name and the price, confirm with the user before you create the product. For example: "Great! I have the name as 'Product Name' and the price as '100'. Shall I create the product?"
- If the user confirms, call the 'createProductTool' with the collected 'name' and 'regular_price'.
- After the tool runs, your response should be based on its output. If successful, say "I've created the product '[Product Name]' for you as a draft." If it fails, inform the user about the error.
`,
            history: history,
        });

        // 5. Send message with automatic tool execution
        const response = await chat.send({
            text: (latestUserMessage?.content as string) || "",
            tools: [createProductTool],
        });

        // 6. Check for tool execution in the history
        let createdProduct = null;
        let wasCreated = false;

        for (const msg of response.history) {
            for (const part of msg.content) {
                if (part.toolResponse?.name === 'createProductTool') {
                    const output = part.toolResponse.output as any;
                    if (output.success) {
                        wasCreated = true;
                        createdProduct = output.product;
                    }
                }
            }
        }
        
        return {
            response: response.text,
            isProductCreated: wasCreated,
            product: createdProduct,
            messages: response.history.map(m => ({
                role: m.role === 'model' ? 'bot' : 'user',
                content: m.content
              }))
        };

    } catch (error) {
        console.error("Genkit Chat Error:", error);
        return {
            response: "I encountered an error processing your request. Could you try again?",
            isProductCreated: false,
            messages: input.messages,
        };
    }
  }
);
