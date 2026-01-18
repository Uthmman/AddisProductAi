import { config } from 'dotenv';
config();

import '@/ai/flows/generate-woocommerce-product-content.ts';
import '@/ai/flows/generate-blog-post.ts';
import '@/ai/flows/generate-social-media-post.ts';
import '@/ai/flows/product-bot-flow.ts';
import '@/ai/flows/bulk-product-action-flow.ts';
