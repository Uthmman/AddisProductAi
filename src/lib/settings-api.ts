'use server';

import { promises as fs } from 'fs';
import path from 'path';
import type { Settings } from './types';

/**
 * Server-side function to read settings from settings.json.
 * This should only be used in server components, server actions, or API routes.
 */
export async function getSettings(): Promise<Partial<Settings>> {
    const settingsFilePath = path.join(process.cwd(), 'src', 'lib', 'settings.json');
    try {
        const fileContent = await fs.readFile(settingsFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error: any) {
        // If the file doesn't exist, it's not a server error, just return defaults.
        if (error.code === 'ENOENT') {
            return {};
        }
        // For other errors (like parsing), log it and return an error response.
        console.error('Failed to read settings file:', error);
        return {}; 
    }
}
