import { NextRequest, NextResponse } from 'next/server';
import { getGscTopQueries } from '@/lib/gsc-api';
import { analyzeGscDataFlow } from '@/ai/flows/analyze-gsc-data-flow';
import type { GscAnalysisOutput } from '@/lib/types';
import { getGscAnalysis, saveGscAnalysis } from '@/lib/gsc-analysis-api';

export const maxDuration = 120;

// GET handler to retrieve the last saved analysis
export async function GET(request: NextRequest) {
  try {
    const analysis = await getGscAnalysis();
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Failed to get GSC analysis:', error);
    return NextResponse.json({ message: 'Could not retrieve GSC analysis.' }, { status: 500 });
  }
}

// POST handler to trigger a new analysis
export async function POST(request: NextRequest) {
  try {
    const { days } = await request.json();
    const gscData = await getGscTopQueries(days);

    if (gscData === null) {
      return NextResponse.json({ message: 'GSC is not configured on the server. Cannot perform analysis.' }, { status: 400 });
    }

    if (gscData.length === 0) {
        const emptyAnalysis: GscAnalysisOutput = {
            summary: "No query data was found for the selected period. Unable to generate an analysis.",
            keyInsights: [],
            contentOpportunities: [],
            productSuggestions: []
        };
        await saveGscAnalysis(emptyAnalysis);
        return NextResponse.json(emptyAnalysis);
    }

    const analysisResult = await analyzeGscDataFlow(gscData);

    await saveGscAnalysis(analysisResult);

    return NextResponse.json(analysisResult);
  } catch (error: any) {
    console.error('Failed to analyze GSC data:', error);
    return NextResponse.json({ message: error.message || 'An unexpected error occurred during analysis.' }, { status: 500 });
  }
}
