import { promises as fs } from 'fs';
import path from 'path';
import { appCache } from '@/lib/cache';

export type PromptTemplates = {
  [key: string]: string;
};

const promptsFilePath = path.join(process.cwd(), 'src', 'lib', 'prompts.json');
export const PROMPTS_CACHE_KEY = 'app_prompts';


/**
 * Server-side function to read prompts from prompts.json.
 * It uses an in-memory cache to avoid repeated file reads.
 */
export async function getPrompts(): Promise<PromptTemplates> {
    const cachedPrompts = appCache.get<PromptTemplates>(PROMPTS_CACHE_KEY);
    if (cachedPrompts) {
        return cachedPrompts;
    }

    try {
        const fileContent = await fs.readFile(promptsFilePath, 'utf8');
        const prompts = JSON.parse(fileContent);
        appCache.set(PROMPTS_CACHE_KEY, prompts);
        return prompts;
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            console.error('prompts.json not found. Returning empty object.');
            appCache.set(PROMPTS_CACHE_KEY, {});
            return {};
        }
        console.error('Failed to read prompts file:', error);
        return {}; 
    }
}
