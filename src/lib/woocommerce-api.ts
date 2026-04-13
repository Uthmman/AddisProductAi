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
                message = stripHtml(await response.text());
             } catch (textError) {
                // message stays as default
             }
        }
        console.error("API Error:", message);
        throw new Error(message);
    }
    return response.json();
}

export async function getProducts(page = 1, perPage = 10, category?: string, tag?: string): Promise<{products: WooProduct[], totalPages: number, totalProducts: number}> {
  const headers = getAuthHeaders();
  const categoryParam = category ? `&category=${category}` : '';
  const tagParam = tag ? `&tag=${tag}` : '';
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products?per_page=${perPage}&page=${page}${categoryParam}${tagParam}&_embed`, { headers, cache: 'no-store' });

  if (!response.ok) {
     let message = `Failed to fetch products. Status: ${response.status}`;
    try {
        const errorBody = await response.json();
        if (errorBody.message) {
            message = stripHtml(errorBody.message);
        }
    } catch(e) {
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
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories?hide_empty=true&orderby=count&order=desc&per_page=100`, { headers, cache: 'no-store' });
    const categories: WooCategory[] = await handleResponse(response, 'Failed to fetch product categories');
    return categories.filter(c => c.slug !== 'uncategorized');
}

export async function getAllProductCategories(): Promise<WooCategory[]> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories?orderby=name&order=asc&per_page=100`, { headers, cache: 'no-store' });
    const categories: WooCategory[] = await handleResponse(response, 'Failed to fetch all product categories');
    return categories.filter(c => c.slug !== 'uncategorized');
}

export async function getProduct(id: number): Promise<WooProduct | null> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}?_embed`, { headers, cache: 'no-store' });

    if (!response.ok) {
        if (response.status === 404) return null;
        await handleResponse(response, `Failed to fetch product ${id}`);
    }

    return await response.json();
}

export async function createProduct(productData: any): Promise<WooProduct> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products`, {
        method: 'POST',
        headers,
        body: JSON.stringify(productData)
    });
    return handleResponse(response, 'Failed to create product');
}

export async function updateProduct(id: number, productData: any): Promise<WooProduct> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(productData)
    });
    return handleResponse(response, `Failed to update product ${id}`);
}

export async function deleteProduct(id: number): Promise<{id: number}> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/${id}?force=true`, {
        method: 'DELETE',
        headers
    });
    const result = await handleResponse(response, `Failed to delete product ${id}`);
    return { id: result.id };
}

export async function createCategory(categoryData: { name: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response, 'Failed to create category');
}

export async function updateCategory(id: number, categoryData: { name?: string; slug?: string; parent?: number, image?: { id?: number, src?: string } }): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(categoryData),
  });
  return handleResponse(response, `Failed to update category ${id}`);
}

export async function deleteCategory(id: number, force: boolean = true): Promise<WooCategory> {
  const headers = getAuthHeaders();
  const response = await fetch(`${WOOCOMMERCE_API_URL}/products/categories/${id}?force=${force}`, {
    method: 'DELETE',
    headers,
  });
  return handleResponse(response, `Failed to delete category ${id}`);
}

export async function uploadImage(imageName: string, imageData: string): Promise<{id: number, src: string}> {
    if(!WOOCOMMERCE_SITE_URL) {
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

    const response = await fetch(`${wpApiUrl}/media`, {
      method: 'POST',
      headers: mediaHeaders,
      body: imageBuffer
    });

    return handleResponse(response, 'Failed to upload image to WordPress media library');
}

export async function updateProductBatch(updates: { update: any[] }): Promise<any> {
    const headers = getAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_API_URL}/products/batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify(updates)
    });
    return handleResponse(response, 'Failed to batch update products');
}

export async function getAllProductTags(): Promise<WooTag[]> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag?orderby=count&order=desc&per_page=100&context=edit`, { headers, cache: 'no-store' });
    return handleResponse(response, "Failed to fetch product tags");
}

export async function getSingleProductTag(id: number): Promise<WooTag | null> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag/${id}?context=edit`, { 
        headers, 
        cache: 'no-store' 
    });

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
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
    const headers = getWordPressAuthHeaders();
    
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tagData),
    });

    return handleResponse(response, `Failed to update product tag ${id}`);
}

export async function createProductTag(tagData: { name: string; slug?: string; description?: string; meta?: { [key: string]: any } }): Promise<WooTag> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tagData),
    });
    return handleResponse(response, 'Failed to create product tag');
}

export async function deleteProductTag(id: number, force: boolean = true): Promise<WooTag> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for tag management.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/product_tag/${id}?force=${force}`, {
        method: 'DELETE',
        headers,
    });
    return handleResponse(response, `Failed to delete product tag ${id}`);
}

export async function getPosts(page = 1, perPage = 10): Promise<{posts: WooPost[], totalPages: number, totalPosts: number}> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts?per_page=${perPage}&page=${page}&context=edit`, { headers, cache: 'no-store' });

    if (!response.ok) {
        await handleResponse(response, 'Failed to fetch posts');
    }

    const totalPages = parseInt(response.headers.get('X-WP-TotalPages') || '1', 10);
    const totalPosts = parseInt(response.headers.get('X-WP-Total') || '0', 10);
    const posts: WooPost[] = await response.json();

    return { posts, totalPages, totalPosts };
}

export async function getPost(id: number): Promise<WooPost | null> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts/${id}?context=edit`, { headers, cache: 'no-store' });

    if (!response.ok) {
        if (response.status === 404) return null;
        await handleResponse(response, `Failed to fetch post ${id}`);
    }

    return await response.json();
}

export async function createPost(postData: { title: string; content: string; status: 'publish' | 'draft' }): Promise<WooPost> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for post creation.");
    const headers = getWordPressAuthHeaders();
    const wpApiUrl = `${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2`;

    const response = await fetch(`${wpApiUrl}/posts`, {
        method: 'POST',
        headers,
        body: JSON.stringify(postData),
    });

    return handleResponse(response, 'Failed to create WordPress post');
}

export async function updatePost(id: number, postData: { title?: string; content?: string; status?: string }): Promise<WooPost> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts/${id}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(postData),
    });
    return handleResponse(response, `Failed to update post ${id}`);
}

export async function deletePost(id: number): Promise<any> {
    if(!WOOCOMMERCE_SITE_URL) throw new Error("WordPress Site URL is required for posts.");
    const headers = getWordPressAuthHeaders();
    const response = await fetch(`${WOOCOMMERCE_SITE_URL}/wp-json/wp/v2/posts/${id}?force=true`, {
        method: 'DELETE',
        headers,
    });
    return handleResponse(response, `Failed to delete post ${id}`);
}

/**
 * Helper to fetch images of different products linked to a tag.
 */
export async function getProductImagesForTag(tagId: number, limit: number = 4): Promise<{id: number, src: string}[]> {
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

export async function getLatestProductImageForTag(tagId: number): Promise<{id: number, src: string} | null> {
    const images = await getProductImagesForTag(tagId, 1);
    return images.length > 0 ? images[0] : null;
}
