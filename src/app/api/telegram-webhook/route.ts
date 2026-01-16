'use server';

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// The path to the log file
const logFilePath = path.join(process.cwd(), 'src', 'lib', 'telegram-log.json');

// This function will read, append, and write to the log file.
async function logTelegramMessage(message: any) {
    let logs: any[] = [];
    // Step 1: Try to read the existing log file.
    try {
        const currentLogs = await fs.readFile(logFilePath, 'utf8');
        logs = JSON.parse(currentLogs);
        if (!Array.isArray(logs)) {
           logs = []; // Reset if the file content is not an array
        }
    } catch (readError: any) {
        // If the file doesn't exist (ENOENT), that's okay. We'll create it.
        // For any other read error, log it.
        if (readError.code !== 'ENOENT') {
             console.error('!!! ERROR READING LOG FILE !!!:', readError);
        }
    }

    // Step 2: Add the new message to the array.
    logs.push({
        timestamp: new Date().toISOString(),
        received_message: message,
    });

    // Step 3: Try to write the updated array back to the file.
    try {
        await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (writeError) {
        console.error('!!! ERROR WRITING TO LOG FILE !!!:', writeError);
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Immediately try to log the message.
        await logTelegramMessage(body);
        
        // Immediately return a success response to Telegram to avoid timeouts.
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK MAIN ERROR !!!:', error);
        // Also log the main error if parsing json fails etc.
        await logTelegramMessage({ error: `Webhook main error: ${error.message}` });
        return new NextResponse('Error', { status: 200 });
    }
}
