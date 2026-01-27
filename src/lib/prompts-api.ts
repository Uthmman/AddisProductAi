'use server';

import { promises as fs } from 'fs';
import path from 'path';

export type PromptTemplates = {
  [key: string]: string;
};

const promptsFilePath = path.join(process.cwd(), 'src', 'lib', 'prompts.json');

/**
 * Server-side function to read prompts from prompts.json.
 * This should only be used in server components, server actions, or API routes.
 */
export async function getPrompts(): Promise<PromptTemplates> {
    try {
        const fileContent = await fs.readFile(promptsFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error: any) {
        // If the file doesn't exist, it's not a server error, just return defaults.
        if (error.code === 'ENOENT') {
            console.error('prompts.json not found. Returning empty object.');
            return {};
        }
        // For other errors (like parsing), log it and return an error response.
        console.error('Failed to read prompts file:', error);
        return {}; 
    }
}
