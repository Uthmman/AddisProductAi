import { NextRequest, NextResponse } from 'next/server';
import { getGscTopQueries } from '@/lib/gsc-api';


export async function GET(req: NextRequest) {
    try {
        const queries = await getGscTopQueries();
        
        if (queries === null) {
            // If GSC isn't configured, return an empty array instead of an error.
            return NextResponse.json([]);
        }
        
        return NextResponse.json(queries);

    } catch (error: any) {
        // This catch block will now catch other unexpected errors, if any.
        console.error('GSC API Route Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data from Google Search Console.', details: error.message }, { status: 500 });
    }
}
