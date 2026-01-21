import { NextRequest, NextResponse } from 'next/server';
import { suggestBlogTopicsFlow } from '@/ai/flows/suggest-blog-topics-flow';
import { getGscTopQueries } from '@/lib/gsc-api';

export async function GET(request: NextRequest) {
  try {
    const gscData = await getGscTopQueries();
    
    // Don't throw an error if GSC data is unavailable, just return empty.
    if (!gscData || gscData.length === 0) {
      return NextResponse.json({ topics: [] });
    }
    
    const suggestions = await suggestBlogTopicsFlow({ gscData });

    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Blog topic suggestion failed:', error);
    // This API is non-critical, so we return an empty array on failure
    // to prevent the UI from showing an error.
    return NextResponse.json({ topics: [] });
  }
}
