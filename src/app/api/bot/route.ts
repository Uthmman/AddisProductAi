import { Bot, webhookCallback } from "grammy";
import { appCache } from '@/lib/cache';
import { processTelegramUpdate } from '@/lib/telegram-api';

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error("TELEGRAM_BOT_TOKEN is not set. The bot cannot start.");
}

// Initialize the bot, even if the token is missing, to avoid crashing the server.
// The bot will not be able to receive messages without a token.
const bot = new Bot(token || "");

// This is the main handler that processes all incoming messages.
bot.on("message", (ctx) => {
  try {
    // Log the incoming update object for debugging on the bot page
    const logs = appCache.get<any[]>('telegram_logs') || [];
    logs.unshift({
      timestamp: new Date().toISOString(),
      received_message: ctx.update,
    });
    appCache.set('telegram_logs', logs.slice(0, 50));

    // Process the update in the background. This is crucial to prevent Telegram
    // from re-sending the webhook request if our processing takes too long (e.g., waiting for an AI response).
    processTelegramUpdate(ctx.update).catch(err => {
        console.error("Background processing failed for Telegram update:", err);
    });

  } catch (error) {
     console.error('!!! TELEGRAM WEBHOOK ERROR !!!:', error);
  }
});

// Export the webhook handler for Next.js to process POST requests from Telegram.
export const POST = webhookCallback(bot, "std/http");
