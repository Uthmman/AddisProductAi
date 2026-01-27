import { NextRequest, NextResponse } from 'next/server';
import { modifyPromptFlow, ModifyPromptInputSchema } from '@/ai/flows/modify-prompt-flow';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = ModifyPromptInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }

    const result = await modifyPromptFlow(validation.data);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Error modifying prompt:', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
