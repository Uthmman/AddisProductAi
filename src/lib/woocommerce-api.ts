import { WooProduct, WooCategory, WooTag, WooPost } from './types';

const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL?.replace(/\/$/, '');

/**
 * Robustly determines the WordPress site URL.
 * Prioritizes the explicit WOOCOMMERCE_SITE_URL env var,
 * but falls back to inferring it from WOOCOMMERCE_API_URL.
 */
const getSiteUrl = () => {
    const envUrl = process.env.WOOCOMMERCE_SITE_URL?.replace(/\/$/, '');
    if (envUrl) return envUrl;

    const apiUrl = process.env.WOOCOMMERCE_API_URL;
    if (apiUrl && apiUrl.includes('/wp-json/')) {
        // WordPress REST API structure is usually site.com/wp-json/wc/v3
        return apiUrl.split('/wp-json/')[0];
    }
    return '';
}

const WOOCOMMERCE_SITE_URL = getSiteUrl();

const getAuthHeaders = () => {
    const consumerKey = process.env.WOOCOMMERCE_CONSUMER_KEY;
    const consumerSecret = process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!consumerKey || consumerSecret === undefined || !WOOCOMMERCE_API_URL) {
        throw new Error("WooCommerce API credentials or URL are not configured correctly in environment variables.");
    }
    const base64Auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    return { 'Authorization': `Basic ${base64Auth}`, 'Content-Type': 'application/json' };
}

const getWordPressAuthHeaders = () => {
    const user = process.env.WORDPRESS_AUTH_USER;
    const pass = process.env.WORDPRESS_AUTH_PASS;
    if (!user || !pass) {
        throw new Error("WordPress Application Password (WORDPRESS_AUTH_USER/PASS) is not configured.");
    }
    return {
        'Authorization': `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
        'Content-Type': 'application/json'
    };
}

/**
 * Strips HTML tags from error messages returned by WordPress.
 */
function stripHtml(html: string) {
    if (typeof html !== 'string') return html;
    return html.replace(/<[^>]*>?/gm, '');
}

async function handleResponse(response: Response, errorMessage: string) {
    if (!response.ok) {
        let message = `${errorMessage}. Status: ${response.status}`;
        try {
            const errorBody = await response.json();
            if (errorBody.message) {
                message = stripHtml(errorBody.message);
            }
        } catch (e) {
            try {
                const text = await response.text();
                message = stripHtml(text).substring(0, 200);
            } catch (textError) {
                // message stays as default
            }
        }
        console.error("API Error Response:", message);
        throw new Error(message);
    }
    return response.json();
}

/**
 * Executes a fetch request with localized error handling for network failures.
 */
            async function safeFetch(url: string, options: RequestInit, errorContext: string, retries = 2) {
                let lastError: any;
                for (let attempt = 0; attempt <= retries; attempt++) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout
                        const response = await fetch(url, { ...options, signal: controller.signal });
                        clearTimeout(timeoutId);
                        return response;
                    } catch (error: any) {
                        lastError = error;
                        console.error(`Fetch error in ${errorContext} (attempt ${attempt + 1}/${retries + 1}):`, error);
                        if (attempt < retries) {
                            // Short wait before retry (1s, 2s)
                            await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
                        }
                    }
                }
                if (lastError?.name === 'AbortError') {
                    throw new Error(`Request timed out connecting to ${url}. The remote server took longer than 60s to respond.`);
                }
                if (lastError?.message === 'fetch failed' || lastError?.cause) {
                    throw new Error(`Connection failed to ${url}. Please verify your API URL and network connectivity.`);
                }
                throw lastError;
            }

export const PRODUCT_LIST_FIELDS = [
                'id', 'name', 'slug', 'permalink', 'date_created', 'date_modified',
                'type', 'status', 'featured', 'sku', 'price', 'regular_price', 'sale_price',
                'on_sale', 'stock_quantity', 'stock_status', 'images', 'attributes',
                'tags', 'categories'
            ].join(',');

            export const PRODUCT_DETAIL_FIELDS = [
                'id', 'name', 'slug', 'permalink', 'date_created', 'date_modified',
                'type', 'status', 'featured', 'catalog_visibility', 'description',
                'short_description', 'sku', 'price', 'regular_price', 'sale_price',
                'on_sale', 'stock_quantity', 'stock_status', 'images', 'attributes',
                'meta_data', 'tags', 'categories'
            ].join(',');

            export const PRODUCT_FIELDS = PRODUCT_DETAIL_FIELDS;

            export async function getProducts(
                page = 1,
                perPage = 10,
                category?: string,
                tag?: string,
                search?: string,
                orderby?: string,
                order?: 'asc' | 'desc'
            ): Promise<{ products: WooProduct[], totalPages: number, totalProducts: number }> {
                const headers = getAuthHeaders();

                const params = new URLSearchParams({
                    page: page.toString(),
                    per_page: perPage.toString(),
                    _fields: PRODUCT_LIST_FIELDS,
                });

                if (category) params.append('category', category);
                if (tag) params.append('tag', tag);
                if (search) params.append('search', search);
                if (orderby) params.append('orderby', orderby);
                if (order) params.append('order', order);

                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products?${params.toString()}`, { headers, cache: 'no-store' }, 'getProducts');

                if (!response.ok) {
                    let message = `Failed to fetch products. Status: ${response.status}`;
                    try {
                        const errorBody = await response.json();
                        if (errorBody.message) {
                            message = stripHtml(errorBody.message);
                        }
                    } catch (e) {
                        message = stripHtml(await response.text());
                    }
                    console.error("WooCommerce API Error:", message);
                    throw new Error(message);
                }

                const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
                const totalProducts = parseInt(response.headers.get('X-WP-Total') || '0', 10);
                const products: WooProduct[] = await response.json();

                return {
                    products,
                    totalPages,
                    totalProducts,
                };
            }

            export async function getTopProductCategories(): Promise<WooCategory[]> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/categories?hide_empty=true&orderby=count&order=desc&per_page=100`, { headers, cache: 'no-store' }, 'getTopProductCategories');
                const categories: WooCategory[] = await handleResponse(response, 'Failed to fetch product categories');
                return categories.filter(c => c.slug !== 'uncategorized');
            }

            export async function getAllProductCategories(): Promise<WooCategory[]> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/categories?orderby=name&order=asc&per_page=100`, { headers, cache: 'no-store' }, 'getAllProductCategories');
                const categories: WooCategory[] = await handleResponse(response, 'Failed to fetch all product categories');
                return categories.filter(c => c.slug !== 'uncategorized');
            }

            export async function getProduct(id: number): Promise<WooProduct | null> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/${id}?_fields=${PRODUCT_FIELDS}`, { headers, cache: 'no-store' }, `getProduct(${id})`);

                if (!response.ok) {
                    if (response.status === 404) return null;
                    await handleResponse(response, `Failed to fetch product ${id}`);
                }

                return await response.json();
            }

            export async function createProduct(productData: any): Promise<WooProduct> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(productData)
                }, 'createProduct');
                return handleResponse(response, 'Failed to create product');
            }

            export async function updateProduct(id: number, productData: any): Promise<WooProduct> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/${id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(productData)
                }, `updateProduct(${id})`);
                return handleResponse(response, `Failed to update product ${id}`);
            }

            /**
             * Deletes a product. 
             * force=false (default) moves it to the trash.
             * force=true deletes it permanently.
             */
            export async function deleteProduct(id: number, force: boolean = false): Promise<{ id: number }> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/${id}?force=${force}`, {
                    method: 'DELETE',
                    headers
                }, `deleteProduct(${id})`);
                const result = await handleResponse(response, `Failed to delete product ${id}`);
                return { id: result.id };
            }

            export async function createCategory(categoryData: { name: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/categories`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(categoryData),
                }, 'createCategory');
                return handleResponse(response, 'Failed to create category');
            }

            export async function updateCategory(id: number, categoryData: { name?: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(categoryData),
                }, `updateCategory(${id})`);
                return handleResponse(response, `Failed to update category ${id}`);
            }

            export async function deleteCategory(id: number, force: boolean = true): Promise<WooCategory> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}?force=${force}`, {
                    method: 'DELETE',
                    headers,
                }, `deleteCategory(${id})`);
                return handleResponse(response, `Failed to delete category ${id}`);
            }

            export async function uploadImage(imageName: string, imageData: string): Promise<{ id: number, src: string }> {
                if (!WOOCOMMERCE_SITE_URL) {
                    throw new Error("WordPress Site URL could not be determined. Please ensure WOOCOMMERCE_API_URL is correct or set WOOCOMMERCE_SITE_URL explicitly.");
                }

                const headers = getWordPressAuthHeaders();
                const wpApiUrl = `${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2`;

                const mimeTypeMatch = imageData.match(/^data:(image\/[a-z]+);base64,/);
                if (!mimeTypeMatch) {
                    throw new Error('Invalid image format. Could not determine MIME type for upload.');
                }
                const mimeType = mimeTypeMatch[1];
                const imageBuffer = Buffer.from(imageData.split(';base64,').pop()!, 'base64');

                const sanitizedImageName = imageName.replace(/[^a-zA-Z0-9._-]/g, '_');

                const mediaHeaders: any = { ...headers };
                mediaHeaders['Content-Type'] = mimeType;
                mediaHeaders['Content-Disposition'] = `attachment; filename="${sanitizedImageName}"`;

                try {
                    const response = await fetch(`${wpApiUrl}/media`, {
                        method: 'POST',
                        headers: mediaHeaders,
                        body: imageBuffer,
                        signal: AbortSignal.timeout(115000) // 115s timeout
                    });

                    return handleResponse(response, 'Failed to upload image to WordPress media library');
                } catch (error: any) {
                    if (error.name === 'TimeoutError') {
                        throw new Error("The image upload timed out. The WordPress server took too long to process the image.");
                    }
                    if (error.message.includes('fetch failed')) {
                        throw new Error(`Connection to WordPress failed. Please check if ${WOOCOMMERCE_SITE_URL} is accessible.`);
                    }
                    throw error;
                }
            }

            export async function updateProductBatch(updates: { update: any[] }): Promise<any> {
                const headers = getAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_API_URL}/products/batch`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(updates)
                }, 'updateProductBatch');
                return handleResponse(response, 'Failed to batch update products');
            }

            export async function getAllProductTags(): Promise<WooTag[]> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag?orderby=count&order=desc&per_page=100&context=edit`, { headers, cache: 'no-store' }, 'getAllProductTags');
                return handleResponse(response, "Failed to fetch product tags");
            }

            export async function getSingleProductTag(id: number): Promise<WooTag | null> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag/${id}?context=edit`, {
                    headers,
                    cache: 'no-store'
                }, `getSingleProductTag(${id})`);

                if (!response.ok) {
                    if (response.status === 404) return null;
                    await handleResponse(response, `Failed to fetch tag ${id}`);
                    return null;
                }

                return await response.json();
            }

            export async function updateProductTag(
                id: number,
                tagData: {
                    name?: string;
                    slug?: string;
                    description?: string;
                    meta?: { [key: string]: any };
                }
            ): Promise<WooTag> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
                const headers = getWordPressAuthHeaders();

                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag/${id}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(tagData),
                }, `updateProductTag(${id})`);

                return handleResponse(response, `Failed to update product tag ${id}`);
            }

            export async function createProductTag(tagData: { name: string; slug?: string; description?: string; meta?: { [key: string]: any } }): Promise<WooTag> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(tagData),
                }, 'createProductTag');
                return handleResponse(response, 'Failed to create product tag');
            }

            export async function deleteProductTag(id: number, force: boolean = true): Promise<WooTag> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag/${id}?force=${force}`, {
                    method: 'DELETE',
                    headers,
                }, `deleteProductTag(${id})`);
                return handleResponse(response, `Failed to delete product tag ${id}`);
            }

            export async function getPosts(page = 1, perPage = 10): Promise<{ posts: WooPost[], totalPages: number, totalPosts: number }> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&context=edit&_embed`, { headers, cache: 'no-store' }, 'getPosts');

                if (!response.ok) {
                    await handleResponse(response, 'Failed to fetch posts');
                }

                const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
                const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0', 10);
                const posts: WooPost[] = await response.json();

                return { posts, totalPages, totalPosts };
            }

            export async function getPost(id: number): Promise<WooPost | null> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts/${id}?context=edit&_embed`, { headers, cache: 'no-store' }, `getPost(${id})`);

                if (!response.ok) {
                    if (response.status === 404) return null;
                    await handleResponse(response, `Failed to fetch post ${id}`);
                }

                return await response.json();
            }

            export async function createPost(postData: { title: string; content: string; status: 'publish' | 'draft'; featured_media?: number }): Promise<WooPost> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for post creation.");
                const headers = getWordPressAuthHeaders();
                const wpApiUrl = `${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2`;

                const response = await safeFetch(`${wpApiUrl}/posts`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(postData),
                }, 'createPost');

                return handleResponse(response, 'Failed to create WordPress post');
            }

            export async function updatePost(id: number, postData: { title?: string; content?: string; status?: string; featured_media?: number }): Promise<WooPost> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts/${id}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(postData),
                }, `updatePost(${id})`);
                return handleResponse(response, `Failed to update post ${id}`);
            }

            export async function deletePost(id: number): Promise<any> {
                if (!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
                const headers = getWordPressAuthHeaders();
                const response = await safeFetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts/${id}?force=true`, {
                    method: 'DELETE',
                    headers,
                }, `deletePost(${id})`);
                return handleResponse(response, `Failed to delete post ${id}`);
            }

            /**
             * Helper to fetch images of different products linked to a tag.
             */
            export async function getProductImagesForTag(tagId: number, limit: number = 4): Promise<{ id: number, src: string }[]> {
                try {
                    const { products } = await getProducts(1, limit, undefined, tagId.toString());
                    if (products.length > 0) {
                        return products
                            .filter(p => p.images && p.images.length > 0)
                            .map(p => ({
                                id: p.images[0].id,
                                src: p.images[0].src
                            }));
                    }
                } catch (error) {
                    console.error(`Failed to fetch products for tag ${tagId}:`, error);
                }
                return [];
            }

            export async function getLatestProductImageForTag(tagId: number): Promise<{ id: number, src: string } | null> {
                const images = await getProductImagesForTag(tagId, 1);
                return images.length > 0 ? images[0] : null;
            }
