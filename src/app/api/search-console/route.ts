import { NextRequest, NextResponse } from 'next/server';
import { getGscTopQueries } from '@/lib/gsc-api';


export async function GET(req: NextRequest) {
    try {
        const queries = await getGscTopQueries();
        
        if (queries === null) {
            // This case now specifically means credentials are not set, based on the lib function.
            return NextResponse.json({ error: 'Missing Google Search Console credentials in environment variables.' }, { status: 500 });
        }
        
        return NextResponse.json(queries);

    } catch (error: any) {
        // This catch block will now catch other unexpected errors, if any.
        console.error('GSC API Route Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data from Google Search Console.', details: error.message }, { status: 500 });
    }
}
