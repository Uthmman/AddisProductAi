import { google } from 'googleapis';

function get30DaysAgo(): string {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export async function getGscTopQueries() {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GSC_SITE_URL } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GSC_SITE_URL) {
        // Don't throw an error, just return null so the calling function can proceed without GSC data.
        console.warn('GSC credentials not found, skipping GSC data fetch.');
        return null;
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
                rowLimit: 50, // get more data for analysis
                dataState: 'all'
            },
        });

        return res.data.rows || [];

    } catch (error: any) {
        console.error('GSC API Error in lib function:', error.message);
        // Return null on error so the main process isn't blocked.
        return null;
    }
}
