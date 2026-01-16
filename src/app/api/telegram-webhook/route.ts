'use server';

import { config } from 'dotenv';
config();

import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow } from '@/ai/flows/product-bot-flow';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not configured.");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        const telegramResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text }),
        });

        if (!telegramResponse.ok) {
            const errorData = await telegramResponse.json();
            console.error('Telegram API Error:', telegramResponse.status, errorData.description);
        }
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}


export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        const chatId = body.message?.chat?.id;
        const text = body.message?.text;

        // If it's not a message with text, we can ignore it.
        if (!chatId || !text) {
             return NextResponse.json({ status: 'ok, no action' });
        }

        try {
            // Process the message using the AI flow
            const response = await productBotFlow({
                chatId: String(chatId),
                newMessage: text,
            });

            // Send the AI's response back to the user
            await sendTelegramMessage(chatId, response.text);

        } catch (flowError: any) {
            // If the AI flow fails, inform the user
            console.error('Error in productBotFlow:', flowError);
            await sendTelegramMessage(chatId, `I'm sorry, I encountered an internal error.`);
        }
        
        // Return a success status to Telegram.
        return NextResponse.json({ status: 'ok' });

    } catch (error: any) {
        // This catches errors in parsing the initial request from Telegram
        console.error('!!! TELEGRAM WEBHOOK MAIN ERROR !!!:', error);
        // It's crucial to still send a 200 OK response to Telegram to prevent it from retrying.
        return new NextResponse('Error', { status: 200 });
    }
}
