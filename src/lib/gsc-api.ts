import { google } from 'googleapis';
import { appCache } from '@/lib/cache';

function getStartDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

function getToday(): string {
    return new Date().toISOString().split('T')[0];
}

export async function getGscTopQueries(days: number = 30) {
    const { GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GSC_SITE_URL } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GSC_SITE_URL) {
        // Return null when credentials are genuinely not configured.
        console.warn('GSC credentials not found, skipping GSC data fetch.');
        return null;
    }

    const cacheKey = `gsc_queries_${days}`;
    const cached = appCache.get<any[]>(cacheKey);
    if (cached) {
        return cached;
    }

    const maxRetries = 2;
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
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
                    startDate: getStartDate(days),
                    endDate: getToday(),
                    dimensions: ['query'],
                    rowLimit: 50,
                    dataState: 'all'
                },
            });

            const rows = res.data.rows || [];
            appCache.set(cacheKey, rows, 600); // Cache for 10 minutes
            return rows;

        } catch (error: any) {
            lastError = error;
            console.error(`GSC API Error (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
            if (attempt < maxRetries) {
                await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
            }
        }
    }

    throw new Error(`Failed to fetch Google Search Console data: ${lastError?.message || 'Unknown error'}`);
}
