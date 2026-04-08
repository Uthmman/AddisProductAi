import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { z } from 'zod';

const InputSchema = z.object({
  chatId: z.string(),
  newMessage: z.string().optional(),
  productState: z.any(),
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

    const errorMessage = error.message || "";
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('high demand')) {
        return NextResponse.json({ text: 'The AI service is currently overloaded or busy. Please wait a moment and try again.' }, { status: 503 });
    }

    if (error.status === 429 || errorMessage.includes('429')) {
        return NextResponse.json({ 
            text: 'The AI is currently receiving too many requests. Please wait a moment and try again.',
            errorType: 'rate_limit'
        }, { status: 429 });
    }

    return NextResponse.json({ text: `I'm sorry, an internal error occurred: ${error.message}` }, { status: 500 });
  }
}
