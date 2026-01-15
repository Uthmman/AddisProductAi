import { config } from 'dotenv';
config(); // Load environment variables from .env or .env.local

import { NextRequest, NextResponse } from 'next/server';
import { productBotFlow } from '@/ai/flows/product-bot-flow';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: number, text: string) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("FATAL: TELEGRAM_BOT_TOKEN is not configured.");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        console.log(`Attempting to send message to chatId: ${chatId}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            // Log the detailed error from Telegram
            const errorBody = await response.json();
            console.error("Telegram API Error:", {
                statusCode: response.status,
                body: errorBody,
            });
        } else {
            console.log("Successfully sent message to Telegram.");
        }
    } catch (error) {
        console.error("Failed to send message to Telegram due to a network or fetch error:", error);
    }
}


export async function POST(request: NextRequest) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.error("Webhook received a request, but TELEGRAM_BOT_TOKEN is not set on the server.");
        return NextResponse.json({ message: "Telegram bot not configured on the server." }, { status: 500 });
    }
    
    let chatId: number | undefined;

    try {
        const body = await request.json();
        console.log("Received webhook body:", JSON.stringify(body, null, 2));

        const message = body.message || body.edited_message;
        if (!message || !message.text) {
            console.log("Webhook received a message without text content, ignoring.");
            return NextResponse.json({ status: 'ok' }); 
        }

        chatId = message.chat.id;

        // Immediately send a test message to isolate the issue.
        await sendTelegramMessage(chatId, "This is a test message.");
        return NextResponse.json({ status: 'ok' });


        // The rest of the logic is temporarily bypassed for this test.
        /*
        const userMessage = message.text;

        if (userMessage === '/start') {
            await sendTelegramMessage(chatId, "Welcome! I can help you create products. What's the name and price?");
            return NextResponse.json({ status: 'ok' });
        }
        
        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: userMessage,
        });

        await sendTelegramMessage(chatId, botResponse.text);

        return NextResponse.json({ status: 'ok' });
        */

    } catch (error: any) {
        console.error('Telegram webhook main try/catch error:', error);
        
        // This catch block might not have chatId if parsing the body fails.
        // It's better to handle the error response generically.
        return NextResponse.json({ message: "An internal error occurred." }, { status: 500 });
    }
}
