import { promises as fs } from 'fs';
import path from 'path';
import { appCache } from '@/lib/cache';
import type { GscAnalysisOutput } from '@/lib/types';

const analysisFilePath = path.join(process.cwd(), 'src', 'lib', 'gsc-analysis.json');
export const GSC_ANALYSIS_CACHE_KEY = 'gsc_analysis';

/**
 * Server-side function to read GSC analysis from gsc-analysis.json.
 * It uses an in-memory cache to avoid repeated file reads.
 */
export async function getGscAnalysis(): Promise<Partial<GscAnalysisOutput>> {
    const cachedAnalysis = appCache.get<Partial<GscAnalysisOutput>>(GSC_ANALYSIS_CACHE_KEY);
    if (cachedAnalysis) {
        return cachedAnalysis;
    }

    try {
        const fileContent = await fs.readFile(analysisFilePath, 'utf8');
        const analysis = JSON.parse(fileContent);
        appCache.set(GSC_ANALYSIS_CACHE_KEY, analysis);
        return analysis;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            const emptyAnalysis = {};
            await fs.writeFile(analysisFilePath, JSON.stringify(emptyAnalysis), 'utf8');
            appCache.set(GSC_ANALYSIS_CACHE_KEY, emptyAnalysis);
            return emptyAnalysis;
        }
        console.error('Failed to read gsc-analysis.json file:', error);
        return {}; 
    }
}

/**
 * Server-side function to save GSC analysis to gsc-analysis.json.
 * It also updates the in-memory cache.
 */
export async function saveGscAnalysis(analysis: GscAnalysisOutput): Promise<void> {
    try {
        await fs.writeFile(analysisFilePath, JSON.stringify(analysis, null, 2), 'utf8');
        appCache.set(GSC_ANALYSIS_CACHE_KEY, analysis);
    } catch (error) {
        console.error('Failed to save gsc-analysis.json file:', error);
        throw new Error('Failed to save GSC analysis.');
    }
}

/**
 * Checks if the GSC analysis is older than 24 hours.
 */
export async function isGscAnalysisStale(): Promise<boolean> {
    const analysis = await getGscAnalysis();
    if (!analysis || !analysis.lastAnalyzed) return true;

    const lastAnalyzedDate = new Date(analysis.lastAnalyzed);
    const now = new Date();
    const diffInHours = (now.getTime() - lastAnalyzedDate.getTime()) / (1000 * 60 * 60);

    return diffInHours >= 24;
}
