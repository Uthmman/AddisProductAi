
import { productBotFlow } from '@/ai/flows/product-bot-flow';
import { uploadImage } from '@/lib/woocommerce-api';
import { getSettings } from '@/lib/settings-api';
import Jimp from 'jimp';
import type { Settings, ProductBotState } from './types';
import { appCache } from '@/lib/cache';


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

    // Telegram's HTML parser doesn't support <br>. Use newlines instead.
    const cleanCaption = caption.replace(/<br\s*\/?>/gi, '\n');

    try {
        const response = await fetch(`${TELEGRAM_API_URL}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: channelId,
                photo: photoUrl,
                caption: cleanCaption,
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
    // The sendPhotoToChannel function will handle cleaning the caption.
    if (photoUrls.length === 1) {
        return sendPhotoToChannel(photoUrls[0], caption);
    }

    // Telegram's HTML parser doesn't support <br>. Use newlines instead.
    const cleanCaption = caption.replace(/<br\s*\/?>/gi, '\n');

    try {
        const media = photoUrls.map((url, index) => ({
            type: 'photo',
            media: url,
            // The caption is only sent with the first photo in a media group.
            caption: index === 0 ? cleanCaption : '',
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

    // 1. Load or initialize state from cache
    const cacheKey = `product_bot_state_${chatId}`;
    let productState: ProductBotState = appCache.get<ProductBotState>(cacheKey) || { image_ids: [], image_srcs: [] };


    // 2. Handle Photo Uploads
    if (photos && photos.length > 0) {
        try {
            await sendMessage(chatId, "Processing your photo...");

            // Get the highest resolution photo
            const photo = photos[photos.length - 1];
            const fileId = photo.file_id;

            // Use Telegram API to get file path
            const fileInfo = await getFile(fileId);
            if (!fileInfo.ok) throw new Error(fileInfo.description || "Could not get file info.");

            // Download the original, clean file
            const originalDataUri = await downloadFile(fileInfo.result.file_path);

            // Apply watermark if configured
            const settings = await getSettings();
            let imageToUploadUri = originalDataUri;

            if (settings.watermarkImageUrl && settings.watermarkImageUrl.startsWith('data:image')) {
                 try {
                    console.log("Applying watermark to Telegram upload...");
                    imageToUploadUri = await applyWatermarkServerSide(originalDataUri, settings.watermarkImageUrl, settings);
                    console.log("Watermark applied successfully.");
                } catch (watermarkError) {
                    console.error("Failed to apply watermark to Telegram upload:", watermarkError);
                    await sendMessage(chatId, "I couldn't apply the watermark, but I'll proceed with the original image.");
                }
            }

            // Upload the (potentially watermarked) image to WooCommerce
            const imageName = `telegram_upload_${chatId}_${Date.now()}.jpg`;
            const wooImage = await uploadImage(imageName, imageToUploadUri);
            
            // IMPORTANT: Cache the ORIGINAL, clean data URI for the AI to use later.
            // The cache key is tied to the chat and the new image ID. It will expire in 10 minutes.
            appCache.set(`original_image_${chatId}_${wooImage.id}`, originalDataUri);

            // Update state with the new image ID and its public URL
            if (!productState.image_ids.includes(wooImage.id)) {
                productState.image_ids.push(wooImage.id);
                productState.image_srcs.push(wooImage.src);
            }

        } catch (error: any) {
            console.error("Error processing Telegram photo:", error);
            await sendMessage(chatId, `I'm sorry, I had trouble with that image. Error: ${error.message}`);
            return; // Exit if photo processing fails
        }
    }

    // If there's text and no photo, send a thinking message
    if (text && !photos) {
        await sendMessage(chatId, "Thinking...");
    }

    // 3. Call the Product Bot Flow
    try {
        // The bot needs to know if an image was just uploaded to provide the right response.
        const botFlowMessage = (photos && photos.length > 0) ? '[Image Uploaded]' : text;

        const botResponse = await productBotFlow({
            chatId: String(chatId),
            newMessage: botFlowMessage,
            productState: productState, // Pass the loaded/updated state
        });

        // 4. Send the response back to the user
        if (botResponse && botResponse.text) {
            await sendMessage(chatId, botResponse.text);
        }

        // 5. Save the updated state back to the cache
        if (botResponse && botResponse.productState) {
            // If the product was saved successfully, the state is reset.
            // Check for a success message to know when to clear the cache.
            const successKeywords = ["Success! I've updated the product", "Success! I've created the product"];
            const isSuccess = successKeywords.some(keyword => botResponse.text.includes(keyword));

            if (isSuccess) {
                appCache.del(cacheKey);
            } else {
                appCache.set(cacheKey, botResponse.productState);
            }
        }

    } catch (error: any) {
        console.error("Error in productBotFlow:", error);
        await sendMessage(chatId, "I'm sorry, I encountered an internal error. Please try again.");
    }
}

    
    