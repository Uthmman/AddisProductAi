import { NextRequest, NextResponse } from 'next/server';
import { suggestProductsFlow } from '@/ai/flows/suggest-products-flow';
import { getGscTopQueries } from '@/lib/gsc-api';

export async function GET(request: NextRequest) {
  try {
    const gscData = await getGscTopQueries();
    
    if (!gscData || gscData.length === 0) {
      return NextResponse.json({ suggestions: [] });
    }
    
    const suggestions = await suggestProductsFlow({ gscData });

    return NextResponse.json(suggestions);

  } catch (error: any) {
    console.error('Product suggestion failed:', error);
    return NextResponse.json({ suggestions: [] });
  }
}
