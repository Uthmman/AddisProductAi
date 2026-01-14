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
  content: z.string(),
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
});
export type ProductBotOutput = z.infer<typeof ProductBotOutputSchema>;


// The tool the AI can use to create a product
const createProductTool = ai.defineTool(
    {
        name: 'createProductTool',
        description: 'Use this tool to create a new product when you have all the necessary information (name and price).',
        inputSchema: z.object({
            name: z.string().describe('The name of the product.'),
            regular_price: z.string().describe('The price of the product as a string.'),
        }),
        outputSchema: z.any(),
    },
    async (input) => {
        try {
            console.log("Creating product with input:", input);
            const product = await createProduct({
                name: input.name,
                regular_price: input.regular_price,
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


// Define the main prompt for the bot
const productBotPrompt = ai.definePrompt({
    name: 'productBotPrompt',
    input: { schema: ProductBotInputSchema },
    output: { schema: ProductBotOutputSchema },
    tools: [createProductTool],
    prompt: `You are a helpful assistant for creating products in an e-commerce store. Your goal is to gather the necessary information from the user (product name and price) and then use the available tool to create the product.

- Start the conversation by greeting the user and asking what product they'd like to create.
- Be conversational and friendly.
- If the user provides a product name but no price, ask for the price.
- If the user provides a price but no name, ask for the name.
- Once you have both the name and the price, confirm with the user before you create the product. For example: "Great! I have the name as 'Product Name' and the price as '100'. Shall I create the product?"
- If the user confirms, call the 'createProductTool' with the collected 'name' and 'regular_price'.
- After calling the tool, respond to the user based on the tool's output. If successful, say "I've created the product '[Product Name]' for you as a draft." If it fails, inform the user about the error.
- If you are not calling a tool, just provide the conversational response in the 'response' field of the output JSON.

Conversation History:
{{#each messages}}
- {{role}}: {{content}}
{{/each}}
`,
});


// Define and export the main flow function
export const productBotFlow = ai.defineFlow(
  {
    name: 'productBotFlow',
    inputSchema: ProductBotInputSchema,
    outputSchema: ProductBotOutputSchema,
  },
  async (input) => {
    const llmResponse = await productBotPrompt(input);
    
    // Check if the model decided to call a tool
    if (llmResponse.toolCalls?.length > 0) {
      const toolCall = llmResponse.toolCalls[0];
      const toolResult = await createProductTool.run(toolCall.input);

      if (toolResult.success) {
        return {
          response: `I've created the product "${toolResult.product.name}" for you as a draft. You can view it in the products list.`,
          isProductCreated: true,
          product: toolResult.product,
        };
      } else {
        return {
          response: `Sorry, I encountered an error while creating the product: ${toolResult.error}`,
          isProductCreated: false,
        };
      }
    }

    // If no tool was called, it's a conversational response.
    // The model will format its response into the specified output schema.
    if (llmResponse.output?.response) {
      return {
          response: llmResponse.output.response,
          isProductCreated: false,
      };
    }
    
    // Fallback in case of an unexpected response from the model
    return {
        response: "I'm not sure how to respond to that. Can you rephrase?",
        isProductCreated: false,
    };
  }
);
