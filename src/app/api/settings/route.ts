import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// The path to the settings file
const settingsFilePath = path.join(process.cwd(), 'src', 'lib', 'settings.json');

// GET handler to read the settings
export async function GET() {
  try {
    const fileContent = await fs.readFile(settingsFilePath, 'utf8');
    const settings = JSON.parse(fileContent);
    return NextResponse.json(settings);
  } catch (error) {
    // If the file doesn't exist or is invalid, return default settings
    console.error('Failed to read settings file:', error);
    return NextResponse.json({
      phoneNumber: "",
      facebookUrl: "",
      instagramUrl: "",
      telegramUrl: "",
      tiktokUrl: "",
      commonKeywords: "zenbaba furniture, made in ethiopia, addis ababa, sheger, modern furniture, ethiopian craft",
    }, { status: 500 });
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
    
    return NextResponse.json({ message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to save settings file:', error);
    return NextResponse.json({ message: 'Failed to save settings' }, { status: 500 });
  }
}
