import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { z } from 'zod';
import { ProductBotState } from '@/lib/types';

const InputSchema = z.object({
  chatId: z.string(),
  newMessage: z.string().optional(),
  productState: z.any(), // Using any() because Zod struggles with complex recursive types in client<->server
  editProductId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }
    
    const botResponse = await productBotFlow(validation.data);

    return NextResponse.json(botResponse);

  } catch (error: any) {
    console.error('Telegram chat API failed:', error);
    return NextResponse.json({ text: `I'm sorry, an internal error occurred: ${error.message}` }, { status: 500 });
  }
}
