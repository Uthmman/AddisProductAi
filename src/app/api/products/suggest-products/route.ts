import { NextRequest, NextResponse } from 'next/server';
import { suggestProductsFlow } from '@/ai/flows/suggest-products-flow';
import { getGscTopQueries } from '@/lib/gsc-api';

export async function GET(request: NextRequest) {
  try {
    const gscData = await getGscTopQueries();

    // If GSC isn't configured or returns no data, return empty suggestions.
    if (gscData === null || gscData.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }
    
    const suggestions = await suggestProductsFlow({ gscData });

    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Product suggestion failed:', error);
    if (error.message && error.message.includes('API key was reported as leaked')) {
      return NextResponse.json({ message: 'Your Google AI API key has been reported as leaked and cannot be used. Please generate a new key in Google AI Studio and update your .env.local file.' }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "An unexpected error occurred while generating suggestions." }, { status: 500 });
  }
}
