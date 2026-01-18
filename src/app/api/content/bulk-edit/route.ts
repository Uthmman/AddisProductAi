import { NextRequest, NextResponse } from 'next/server';
import { bulkProductActionFlow } from '@/ai/flows/bulk-product-action-flow';
import { z } from 'zod';

const InputSchema = z.object({
  request: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = InputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: 'Invalid input', errors: validation.error.issues }, { status: 400 });
    }
    
    const result = await bulkProductActionFlow(validation.data.request);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Bulk product action failed:', error);
    return NextResponse.json({ response: `An unexpected error occurred: ${error.message}` }, { status: 500 });
  }
}
