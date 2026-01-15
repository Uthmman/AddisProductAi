import { config } from 'dotenv';
config();

import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// The path to the log file
const logFilePath = path.join(process.cwd(), 'src', 'lib', 'telegram-log.json');

async function logMessage(message: any) {
    let logs = [];
    try {
        const fileContent = await fs.readFile(logFilePath, 'utf8');
        const parsedLogs = JSON.parse(fileContent);
        if (Array.isArray(parsedLogs)) {
            logs = parsedLogs;
        }
    } catch (error) {
        // File might not exist yet, that's okay.
    }

    // Add a timestamp to the received message
    const loggedMessage = {
        ...message,
        timestamp: new Date().toISOString(),
    };

    logs.push(loggedMessage);

    try {
        await fs.writeFile(logFilePath, JSON.stringify(logs, null, 2), 'utf8');
    } catch (error) {
        console.error("!!! FAILED TO WRITE TO LOG FILE !!!", error);
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Log to console immediately to verify receipt
        console.log("--- TELEGRAM WEBHOOK RECEIVED ---");
        console.log(JSON.stringify(body, null, 2));
        console.log("---------------------------------");
        
        // Log the entire received body to the file
        await logMessage(body);

        // Respond to Telegram immediately with a 200 OK
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        console.error('!!! TELEGRAM WEBHOOK ERROR !!!:', error);
        
        // Log the error itself
        await logMessage({ error: { message: error.message, stack: error.stack } });

        // Still try to respond with a 200 OK so Telegram doesn't retry,
        // but indicate an internal error in the body for our own debugging.
        return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 200 });
    }
}
