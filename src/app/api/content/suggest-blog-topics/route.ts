import { NextRequest, NextResponse } from 'next/server';
import { suggestBlogTopicsFlow } from '@/ai/flows/suggest-blog-topics-flow';
import { getGscAnalysis } from '@/lib/gsc-analysis-api';

export async function GET(request: NextRequest) {
  try {
    const gscAnalysis = await getGscAnalysis();
    
    // If GSC analysis isn't created yet, return an error.
    if (!gscAnalysis || !gscAnalysis.summary) {
      return NextResponse.json({ message: "Search Console data has not been analyzed yet. Please run the analysis on the Content > Search Insights page first." }, { status: 400 });
    }
    
    const suggestions = await suggestBlogTopicsFlow({});

    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Blog topic suggestion failed:', error);
    
    const errorMessage = error.message || "";
    if (errorMessage.includes('503') || errorMessage.includes('Service Unavailable') || errorMessage.includes('high demand')) {
        return NextResponse.json({ message: 'The AI service is currently overloaded or busy. Please wait a moment and try again.' }, { status: 503 });
    }
    
    if (error.status === 429 || errorMessage.includes('429')) {
        return NextResponse.json({ message: 'The AI is currently receiving too many requests. Please wait a moment and try again.' }, { status: 429 });
    }

    if (errorMessage.includes('API key was reported as leaked')) {
      return NextResponse.json({ message: 'Your Google AI API key has been reported as leaked and cannot be used. Please generate a new key in Google AI Studio and update your .env file.' }, { status: 403 });
    }
    
    return NextResponse.json({ message: "An unexpected error occurred while generating suggestions." }, { status: 500 });
  }
}
