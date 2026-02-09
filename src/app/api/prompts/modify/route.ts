import { NextRequest, NextResponse } from 'next/server';
import { modifyPromptFlow } from '@/ai/flows/modify-prompt-flow';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ModifyPromptInputSchema = z.object({
  request: z.string(),
  originalPrompt: z.string(),
  promptKey: z.string(),
});

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
