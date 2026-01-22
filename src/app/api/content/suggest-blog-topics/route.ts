import { NextRequest, NextResponse } from 'next/server';
import { suggestBlogTopicsFlow } from '@/ai/flows/suggest-blog-topics-flow';
import { getGscTopQueries } from '@/lib/gsc-api';

export async function GET(request: NextRequest) {
  try {
    const gscData = await getGscTopQueries();
    
    // If GSC isn't configured or returns no data, return empty topics.
    if (gscData === null || gscData.length === 0) {
      return NextResponse.json({ topics: [] });
    }
    
    const suggestions = await suggestBlogTopicsFlow({ gscData });

    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Blog topic suggestion failed:', error);
     if (error.message && error.message.includes('API key was reported as leaked')) {
      return NextResponse.json({ message: 'Your Google AI API key has been reported as leaked and cannot be used. Please generate a new key in Google AI Studio and update your .env.local file.' }, { status: 403 });
    }
    return NextResponse.json({ message: error.message || "An unexpected error occurred while generating suggestions." }, { status: 500 });
  }
}
