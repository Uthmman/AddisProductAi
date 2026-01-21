import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { appCache } from '@/lib/cache';

// The path to the settings file
const settingsFilePath = path.join(process.cwd(), 'src', 'lib', 'settings.json');

// GET handler to read the settings
export async function GET() {
  try {
    const fileContent = await fs.readFile(settingsFilePath, 'utf8');
    const settings = JSON.parse(fileContent);
    return NextResponse.json(settings);
  } catch (error: any) {
    // If the file doesn't exist, it's not a server error, just return defaults.
    if (error.code === 'ENOENT') {
      return NextResponse.json({});
    }
    // For other errors (like parsing), log it and return an error response.
    console.error('Failed to read settings file:', error);
    return NextResponse.json({ message: 'Could not read settings file.' }, { status: 500 });
  }
}

// POST handler to update the settings
export async function POST(request: NextRequest) {
  try {
    const newSettings = await request.json();
    
    // Basic validation
    if (!newSettings || typeof newSettings !== 'object') {
      return NextResponse.json({ message: 'Invalid settings format' }, { status: 400 });
    }

    await fs.writeFile(settingsFilePath, JSON.stringify(newSettings, null, 2), 'utf8');

    // Invalidate the cache
    appCache.del('app_settings');
    
    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to save settings file:', error);
    return NextResponse.json({ message: 'Failed to save settings' }, { status: 500 });
  }
}
