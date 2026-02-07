import { NextRequest, NextResponse } from 'next/server';
import { suggestProductsFlow } from '@/ai/flows/suggest-products-flow';
import { getGscAnalysis } from '@/lib/gsc-analysis-api';

export async function GET(request: NextRequest) {
  try {
    const gscAnalysis = await getGscAnalysis();

    // If GSC analysis isn't created yet, return empty suggestions.
    if (!gscAnalysis || !gscAnalysis.summary) {
       return NextResponse.json({ message: "Search Console data has not been analyzed yet. Please run the analysis on the Content > Search Insights page first." }, { status: 400 });
    }
    
    const suggestions = await suggestProductsFlow({});

    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Product suggestion failed:', error);
    if (error.message && error.message.includes('API key was reported as leaked')) {
      return NextResponse.json({ message: 'Your Google AI API key has been reported as leaked and cannot be used. Please generate a new key in Google AI Studio and update your .env.local file.' }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "An unexpected error occurred while generating suggestions." }, { status: 500 });
  }
}
