import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow, Message } from '@/ai/flows/product-bot-flow';
import { z } from 'zod';

const InputSchema = z.object({
  messages: z.array(z.object({
      role: z.enum(['user', 'bot']),
      content: z.string(),
  })),
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

  } catch (error) {
    console.error('Product bot flow failed:', error);
    return NextResponse.json({ message: 'An unexpected error occurred with the bot.' }, { status: 500 });
  }
}
