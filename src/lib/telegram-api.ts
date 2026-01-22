import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { uploadImage } from '@/lib/woocommerce-api';
import { promises as fs } from 'fs';
import path from 'path';
import Jimp from 'jimp';
import type { Settings } from './types';


const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Function to send a message back to the user
export async function sendMessage(chatId: number | string, text: string) {
    if (!BOT_TOKEN) {
        console.error("TELEGRAM_BOT_TOKEN is not configured. The bot cannot send replies.");
        return;
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Telegram API Error sending message:", errorData);
        }
    } catch (error) {
        console.error("Failed to send message via Telegram:", error);
    }
}

export async function sendPhotoToChannel(photoUrl: string, caption: string) {
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!BOT_TOKEN || !channelId) {
        console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not configured.");
        throw new Error("Bot or channel is not configured for posting.");
    }

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: channelId,
                photo: photoUrl,
                caption: caption,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Telegram API Error sending photo:", errorData);
            throw new Error(errorData.description || "Failed to send photo to Telegram channel.");
        }
        return await response.json();
    } catch (error: any) {
        console.error("Failed to send photo to channel:", error);
        throw error;
    }
}

export async function sendAlbumToChannel(photoUrls: string[], caption: string) {
    const channelId = process.env.TELEGRAM_CHANNEL_ID;
    if (!BOT_TOKEN || !channelId) {
        console.error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID is not configured.");
        throw new Error("Bot or channel is not configured for posting.");
    }
    
    if (photoUrls.length === 0) {
        throw new Error("No photos provided to send to the channel.");
    }
    
    // If there's only one photo, use sendPhoto to ensure the caption is displayed correctly under the image.
    if (photoUrls.length === 1) {
        return sendPhotoToChannel(photoUrls[0], caption);
    }

    try {
        const media = photoUrls.map((url, index) => ({
            type: 'photo',
            media: url,
            // The caption is only sent with the first photo in a media group.
            caption: index === 0 ? caption : '',
            parse_mode: index === 0 ? 'HTML' : undefined,
        }));
        
        const response = await fetch(`${TELEGRAM_API_URL}/sendMediaGroup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: channelId,
                media: media.slice(0, 10), // Telegram allows a max of 10 media items per group
            }),
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Telegram API Error sending media group:", errorData);
            throw new Error(errorData.description || "Failed to send media group to Telegram channel.");
        }
        return await response.json();

    } catch (error: any) {
        console.error("Failed to send album to channel:", error);
        throw error;
    }
}


// Function to get file details from Telegram
async function getFile(fileId: string): Promise<any> {
    const response = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
    if (!response.ok) throw new Error("Failed to get file info from Telegram.");
    return response.json();
}

// Function to download a file from Telegram and convert to a data URI
async function downloadFile(filePath: string): Promise<string> {
    const response = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    if (!response.ok) throw new Error("Failed to download file from Telegram.");
    const buffer = Buffer.from(await response.arrayBuffer());
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

async function getSettingsFromFile(): Promise<Partial<Settings>> {
    const settingsFilePath = path.join(process.cwd(), 'src', 'lib', 'settings.json');
    try {
        const fileContent = await fs.readFile(settingsFilePath, 'utf8');
        return JSON.parse(fileContent);
    } catch (error) {
        console.warn('Could not read settings.json for watermarking, returning default empty object.', error);
        return {};
    }
}

async function applyWatermarkServerSide(originalImageDataUri: string, watermarkImageDataUri: string, options: Partial<Settings> = {}): Promise<string> {
    const {
        watermarkPlacement = 'bottom-right',
        watermarkScale = 40,
        watermarkOpacity = 0.7,
        watermarkPadding = 5
    } = options;

    const originalImageBuffer = Buffer.from(originalImageDataUri.split(';base64,').pop()!, 'base64');
    const originalImage = await Jimp.read(originalImageBuffer);

    const watermarkImageBuffer = Buffer.from(watermarkImageDataUri.split(';base64,').pop()!, 'base64');
    const watermarkImage = await Jimp.read(watermarkImageBuffer);

    const scale = watermarkScale / 100;
    const padding = watermarkPadding / 100;

    watermarkImage.resize(originalImage.getWidth() * scale, Jimp.AUTO);
    watermarkImage.opacity(watermarkOpacity);

    const paddingX = originalImage.getWidth() * padding;
    const paddingY = originalImage.getHeight() * padding;

    let x = 0, y = 0;

    switch (watermarkPlacement) {
        case 'bottom-right':
            x = originalImage.getWidth() - watermarkImage.getWidth() - paddingX;
            y = originalImage.getHeight() - watermarkImage.getHeight() - paddingY;
            break;
        case 'bottom-left':
            x = paddingX;
            y = originalImage.getHeight() - watermarkImage.getHeight() - paddingY;
            break;
        case 'top-right':
            x = originalImage.getWidth() - watermarkImage.getWidth() - paddingX;
            y = paddingY;
            break;
        case 'top-left':
            x = paddingX;
            y = paddingY;
            break;
        case 'center':
            x = (originalImage.getWidth() - watermarkImage.getWidth()) / 2;
            y = (originalImage.getHeight() - watermarkImage.getHeight()) / 2;
            break;
    }

    originalImage.composite(watermarkImage, x, y);

    return await originalImage.getBase64Async(Jimp.MIME_JPEG);
}


// Main processing function for incoming Telegram updates
export async function processTelegramUpdate(update: any) {
    const message = update.message;
    if (!message) {
        console.log("Received an update without a message body.", update);
        return;
    };

    const chatId = message.chat.id;
    const text = message.text;
    const photos = message.photo;

    let uploadedImageInfo: Array<{ id: number; src: string }> | undefined = undefined;

    // 1. Handle Photo Uploads
    if (photos && photos.length > 0) {
        try {
            // Acknowledge receipt
            await sendMessage(chatId, "Processing your photo...");

            // Get the highest resolution photo
            const photo = photos[photos.length - 1];
            const fileId = photo.file_id;

            // Use Telegram API to get file path
            const fileInfo = await getFile(fileId);
            if (!fileInfo.ok) throw new Error(fileInfo.description || "Could not get file info.");

            // Download the file and convert to data URI
            let dataUri = await downloadFile(fileInfo.result.file_path);

            // Apply watermark if configured
            const settings = await getSettingsFromFile();
            if (settings.watermarkImageUrl && settings.watermarkImageUrl.startsWith('data:image')) {
                 try {
                    console.log("Applying watermark to Telegram upload...");
                    dataUri = await applyWatermarkServerSide(dataUri, settings.watermarkImageUrl, settings);
                    console.log("Watermark applied successfully.");
                } catch (watermarkError) {
                    console.error("Failed to apply watermark to Telegram upload:", watermarkError);
                    // Non-fatal, just inform the user and proceed
                    await sendMessage(chatId, "I couldn't apply the watermark due to an error, but I'll proceed with the original image.");
                }
            }


            // Upload to WooCommerce
            const imageName = `telegram_upload_${chatId}_${Date.now()}.jpg`;
            const wooImage = await uploadImage(imageName, dataUri);

            uploadedImageInfo = [{ id: wooImage.id, src: wooImage.src }];
        } catch (error: any) {
            console.error("Error processing Telegram photo:", error);
            await sendMessage(chatId, `I'm sorry, I had trouble with that image. Error: ${error.message}`);
            return;
        }
    }

    // If there's text and no photo, send a thinking message
    if (text && !photos) {
        await sendMessage(chatId, "Thinking...");
    }

    // 2. Call the Product Bot Flow
    try {
        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: text,
            images: uploadedImageInfo,
        });

        // 3. Send the response back to the user
        if (botResponse && botResponse.text) {
            await sendMessage(chatId, botResponse.text);
        }

    } catch (error: any) {
        console.error("Error in productBotFlow:", error);
        await sendMessage(chatId, "I'm sorry, I encountered an internal error. Please try again.");
    }
}
