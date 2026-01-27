'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { Settings } from './types';
import { appCache } from '@/lib/cache';

const settingsFilePath = path.join(process.cwd(), 'src', 'lib', 'settings.json');
export const SETTINGS_CACHE_KEY = 'app_settings';


/**
 * Server-side function to read settings from settings.json.
 * It uses an in-memory cache to avoid repeated file reads.
 * This should only be used in server components, server actions, or API routes.
 */
export async function getSettings(): Promise<Partial<Settings>> {
    const cachedSettings = appCache.get<Partial<Settings>>(SETTINGS_CACHE_KEY);
    if (cachedSettings) {
        return cachedSettings;
    }

    try {
        const fileContent = await fs.readFile(settingsFilePath, 'utf8');
        const settings = JSON.parse(fileContent);
        appCache.set(SETTINGS_CACHE_KEY, settings);
        return settings;
    } catch (error: any) {
        // If the file doesn't exist, it's not a server error, just return and cache an empty object.
        if (error.code === 'ENOENT') {
            appCache.set(SETTINGS_CACHE_KEY, {});
            return {};
        }
        // For other errors (like parsing), log it and return an error response.
        console.error('Failed to read settings file:', error);
        return {}; 
    }
}
