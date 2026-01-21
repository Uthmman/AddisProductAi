import { google } from 'googleapis';
import { NextRequest, NextResponse } from 'next/server';

function get30DaysAgo(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export async function GET(req: NextRequest) {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GSC_SITE_URL } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GSC_SITE_URL) {
        return NextResponse.json({ error: 'Missing Google Search Console credentials in environment variables.' }, { status: 500 });
    }

    try {
        const auth = new google.auth.JWT(
            GOOGLE_SERVICE_ACCOUNT_EMAIL,
            undefined,
            GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            ['https://www.googleapis.com/auth/webmasters.readonly']
        );

        const searchconsole = google.searchconsole({ version: 'v1', auth });

        const res = await searchconsole.searchanalytics.query({
            siteUrl: GSC_SITE_URL,
            requestBody: {
                startDate: get30DaysAgo(),
                endDate: getToday(),
                dimensions: ['query'],
                rowLimit: 25,
                dataState: 'all'
            },
        });

        return NextResponse.json(res.data.rows || []);

    } catch (error: any) {
        console.error('GSC API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch data from Google Search Console.', details: error.message }, { status: 500 });
    }
}
